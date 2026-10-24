import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes, scryptSync } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  signedEnvelope,
  mapSheetData,
  sheetCall,
  sheetOperation,
  assertLiveMode,
} from "./sheets.ts";
import { authenticateAccount, currentAccount } from "./accounts.ts";
import type { Session } from "./domain.ts";
const require = createRequire(import.meta.url);
const { mocks } = require("../../phase01/tests/google-mocks.cjs");
const {
  installObserved,
} = require("../../phase01/tests/observed-workbook.fixture.cjs");
const secret = "a".repeat(64);
const user: Session = {
  id: "test-admin",
  role: "admin",
  name: "Synthetic admin",
  demo: false,
  exp: Date.now() + 100000,
};
function fixture() {
  const { db, context: c } = mocks();
  c.Session.getEffectiveUser = () => ({
    getEmail: () => db.owner || "admin@example.test",
  });
  const cache = new Map();
  c.CacheService = {
    getScriptCache: () => ({
      get: (k: string) => cache.get(k),
      put: (k: string, v: string) => cache.set(k, v),
    }),
  };
  c.ContentService = {
    MimeType: { JSON: "json" },
    createTextOutput: (s: string) => ({ setMimeType: () => s }),
  };
  c.Utilities.Charset = { UTF_8: "utf8" };
  c.Utilities.computeHmacSha256Signature = (body: string, key: string) => [
    ...createHmac("sha256", key).update(body).digest(),
  ];
  vm.createContext(c);
  for (const name of [
    "Schema.gs",
    "Workbook.gs",
    "Setup.gs",
    "Code.gs",
    "Bridge.gs",
  ])
    vm.runInContext(
      fs.readFileSync(
        fileURLToPath(new URL(`../../phase01/${name}`, import.meta.url)),
        "utf8",
      ),
      c,
    );
  c.RB_bindSpreadsheet();
  installObserved(db, c);
  c.RB_configureObservedWorkbook();
  c.RB_createBackup();
  c.RB_setup();
  db.owner = db.actor;
  db.properties.set("RB_RENDER_ENABLED", "true");
  db.properties.set("RB_RENDER_SECRET", secret);
  db.actor = ""; // anonymous external caller has no Google identity
  function call(method: string, payload = {}, actor = user) {
    return send(signedEnvelope(method, payload, actor, secret));
  }
  function send(envelope: unknown) {
    return JSON.parse(
      c.doPost({ postData: { contents: JSON.stringify(envelope) } }),
    );
  }
  return { db, c, call, send };
}
test("Render HMAC bridge reads the same workbook, preserving imported status and empty history", () => {
  const { call, c } = fixture();
  assert.throws(() => c.RB_getData(), /هوية/); // public direct RPC still fails closed
  const reply = call("read");
  assert.equal(reply.ok, true);
  const data = mapSheetData(reply.data);
  assert.equal(data.customers[0].id, "SYNTHETIC-LEGACY-ID");
  assert.equal(data.customers[0].status, "مستورد");
  assert.equal(data.customers[0].createdAt, "");
  assert.equal(data.sheet?.lists.staff.length, 0);
  assert.equal(data.sheet?.values.appointmentDefaultType, "زيارة أولى");
  assert.throws(() => c.RB_getData(), /هوية/); // scoped identity cleared
});
test("bridge refuses tampering, expiry, repeated envelope, wrong owner and non-allowlisted methods", () => {
  const { send, call, db } = fixture();
  const envelope = signedEnvelope("read", {}, user, secret);
  assert.equal(send({ ...envelope, body: envelope.body + " " }).ok, false);
  const body = JSON.stringify({
    ...JSON.parse(envelope.body),
    at: Date.now() - 300000,
  });
  assert.equal(
    send({
      body,
      signature: createHmac("sha256", secret).update(body).digest("hex"),
    }).error,
    "RB_BRIDGE_AUTH",
  );
  assert.equal(send(envelope).ok, true);
  assert.equal(send(envelope).error, "RB_BRIDGE_REPLAY");
  assert.equal(call("RB_setup").error, "RB_BRIDGE_METHOD");
  assert.equal(call("constructor").error, "RB_BRIDGE_METHOD");
  db.owner = "another@example.test";
  assert.equal(call("read").error, "RB_BRIDGE_OWNER");
});
test("signed writes retain native journal idempotency, enforce role and attribute Render account", () => {
  const { call } = fixture();
  const payload = {
    name: "Synthetic new bride",
    requestId: "render-test-write-001",
  };
  const first = call("customer.add", payload);
  assert.equal(first.ok, true);
  assert.equal(call("customer.add", payload).data.id, first.data.id);
  const reply = call("read");
  assert.equal(reply.data.customers.length, 2);
  const logs = reply.data.activity.filter(
    (a: { id: string }) => a.id === first.data.id,
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0].actor, "Render/test-admin (admin)");
  assert.equal(
    call(
      "customer.update",
      { id: first.data.id, notes: "new", requestId: "staff-update-test" },
      { ...user, role: "staff" },
    ).error,
    "RB_BRIDGE_FORBIDDEN",
  );
  assert.equal(
    call("customer.add", { name: "No request id" }).error,
    "RB_BRIDGE_REQUEST_ID",
  );
});
test("server client signs requests, rejects demo, and preserves request IDs across ambiguous retries", async () => {
  const f = fixture();
  const old = { ...process.env },
    oldFetch = globalThis.fetch;
  process.env.CRM_DATA_PROVIDER = "sheets";
  process.env.CRM_DEMO_MODE = "false";
  process.env.CRM_SHEETS_URL = "https://script.google.com/macros/s/test/exec";
  process.env.CRM_SHEETS_SECRET = secret;
  try {
    globalThis.fetch = async (_url, init) =>
      new Response(JSON.stringify(f.send(JSON.parse(String(init?.body)))));
    const operation = sheetOperation({
      action: "customer.add",
      name: "Synthetic network",
      requestId: "network-request-001",
      ignored: "never passed",
    });
    assert.equal("ignored" in operation.payload, false);
    const first = await sheetCall(operation.method, operation.payload, user);
    assert.equal(
      (await sheetCall(operation.method, operation.payload, user)).id,
      first.id,
    );
    await assert.rejects(sheetCall("read", {}, { ...user, demo: true }));
    process.env.CRM_DEMO_MODE = "true";
    assert.throws(() => assertLiveMode(user));
    process.env.CRM_DEMO_MODE = "false";
    globalThis.fetch = async () => {
      throw Error("timeout");
    };
    await assert.rejects(
      sheetCall(operation.method, operation.payload, user),
      (e: unknown) => (e as { pending: boolean }).pending === true,
    );
  } finally {
    globalThis.fetch = oldFetch;
    for (const k of Object.keys(process.env))
      if (!(k in old)) delete process.env[k];
    Object.assign(process.env, old);
  }
});
test("individual accounts derive role on server and revoke sessions after credential configuration changes", () => {
  const old = process.env.CRM_USERS_JSON;
  const salt = randomBytes(16).toString("hex");
  process.env.CRM_USERS_JSON = JSON.stringify([
    {
      id: "tester",
      name: "Synthetic staff",
      role: "staff",
      passwordHash: `scrypt:${salt}:${scryptSync("test-password-only", salt, 64).toString("hex")}`,
    },
  ]);
  try {
    assert.equal(authenticateAccount("tester", "wrong"), null);
    assert.equal(authenticateAccount("missing", "wrong"), null);
    const account = authenticateAccount("tester", "test-password-only")!;
    assert.equal(account.role, "staff");
    const session = { ...user, ...account };
    assert.equal(currentAccount(session), true);
    process.env.CRM_USERS_JSON = "[]";
    assert.equal(currentAccount(session), false);
  } finally {
    if (old === undefined) delete process.env.CRM_USERS_JSON;
    else process.env.CRM_USERS_JSON = old;
  }
});

test("signed appointment and follow-up workflow uses native sheet IDs, cancellation and approved roster", () => {
  const { call, db } = fixture();
  // Synthetic approval for this test only; real staff roster remains deferred.
  db.active
    .getSheetByName("القوائم والإعدادات")
    .getRange(2, 11)
    .setValue("Synthetic approved staff");
  const appointment = {
    customerId: "SYNTHETIC-LEGACY-ID",
    date: "2026-12-01",
    time: "11:00",
    staff: "Synthetic approved staff",
    requestId: "bridge-appointment-001",
  };
  const first = call("appointment.add", appointment);
  assert.equal(first.ok, true);
  assert.match(
    call("appointment.add", {
      ...appointment,
      requestId: "bridge-appointment-002",
    }).error,
    /نفس التوقيت/,
  );
  assert.equal(
    call("appointment.update", {
      ...appointment,
      id: first.data.id,
      status: "ملغي",
      requestId: "bridge-cancel-001",
    }).ok,
    true,
  );
  assert.equal(
    call("appointment.add", {
      ...appointment,
      requestId: "bridge-appointment-003",
    }).ok,
    true,
  );
  const task = call("followup.add", {
    customerId: appointment.customerId,
    staff: appointment.staff,
    due: appointment.date,
    title: "Synthetic task",
    requestId: "bridge-task-001",
  });
  assert.equal(task.ok, true);
  assert.equal(
    call("followup.complete", {
      id: task.data.id,
      requestId: "bridge-task-complete-001",
    }).ok,
    true,
  );
  const data = mapSheetData(call("read").data);
  assert.equal(data.appointments.length, 2);
  assert.equal(data.appointments[0].duration, undefined);
  assert.equal(data.appointments[0].status, "ملغي");
  assert.equal(data.followups[0].done, true);
});

test("appointment and task activity is linked to the customer profile rather than the entity ID", () => {
  const { call, db } = fixture();
  db.active
    .getSheetByName("القوائم والإعدادات")
    .getRange(2, 11)
    .setValue("Synthetic approved staff");
  const customerId = "SYNTHETIC-LEGACY-ID";
  call("appointment.add", {
    customerId,
    date: "2030-12-01",
    time: "11:00",
    staff: "Synthetic approved staff",
    requestId: "profile-appointment-log-001",
  });
  const task = call("followup.add", {
    customerId,
    due: "2030-12-01",
    staff: "Synthetic approved staff",
    title: "Synthetic profile task",
    requestId: "profile-task-log-001",
  });
  call("followup.complete", {
    id: task.data.id,
    requestId: "profile-task-done-001",
  });
  const data = mapSheetData(call("read").data);
  const actions = data.activity
    .filter((a) => a.customerId === customerId)
    .map((a) => a.text);
  assert.ok(actions.includes("حجز موعد"));
  assert.ok(actions.includes("إضافة متابعة"));
  assert.ok(actions.includes("إكمال متابعة"));
});

test("customer commands forward original wedding, source, residence and dress fields without defaults", () => {
  const operation = sheetOperation({
    action: "customer.update",
    id: "original-customer-id",
    requestId: "original-fields-001",
    wedding: "أكتوبر بدون سنة",
    source: "Instagram",
    city: "Synthetic residence",
    dress: "TEST-01",
    createdAt: "fabricated",
  });
  assert.equal(operation.payload.wedding, "أكتوبر بدون سنة");
  assert.equal(operation.payload.city, "Synthetic residence");
  assert.equal(operation.payload.dress, "TEST-01");
  assert.equal("createdAt" in operation.payload, false);
  assert.equal("channel" in operation.payload, false);
});
