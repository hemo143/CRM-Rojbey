import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { applyMutation } from "./mutations.ts";
import {
  seed,
  normalizePhone,
  lifecycleStatus,
  type Session,
} from "./domain.ts";
import { customerMatchesSearch } from "./workflow.ts";
import { mapSheetData, sheetOperation, sheetMutation } from "./sheets.ts";
import { saveRecord, SaveError } from "./save-client.ts";
const require = createRequire(import.meta.url);
const { createSheetWorkflow } = require("../../tests/helpers/sheets.cjs");
const user: Session = {
  id: "workflow-admin",
  role: "admin",
  name: "Synthetic workflow admin",
  demo: false,
  exp: Date.now() + 100000,
};
const payload = (action: string, fields = {}) => ({
  action,
  requestId: randomUUID(),
  ...fields,
});
for (const provider of ["local", "sheets"])
  test(`A–F ${provider}: canonical contact, duplicate detail, appointment, follow-up, conversion, exact replay and historical preservation`, () => {
    const fixture = createSheetWorkflow();
    fixture.approveSyntheticStaff();
    const local = seed();
    const read = () =>
      provider === "local" ? local : mapSheetData(fixture.call("read").data);
    const call = (p: Record<string, unknown>) => {
      if (provider === "local") return applyMutation(local, p, user);
      const op = sheetOperation(p),
        response = fixture.call(op.method, op.payload);
      if (!response.ok) {
        const e = Object.assign(Error(response.error), {
          existing: response.existing,
        });
        throw e;
      }
      return response.data;
    };
    const original = structuredClone(read().customers);
    const p = payload("customer.add", {
      name: "QA contact",
      phone: "01012345678",
      username: "qa.bridal",
      status: "جديدة",
    });
    const created = call(p),
      id = created.id;
    for (const q of [
      "QA contact",
      "01012345678",
      "+201012345678",
      "00201012345678",
      "٠١٠١٢٣٤٥٦٧٨",
      "qa.bridal",
      "@qa.bridal",
      id,
    ])
      assert.ok(
        read().customers.some(
          (c) => c.id === id && customerMatchesSearch(c, q),
        ),
        q,
      );
    assert.equal(
      read().customers.find((c) => c.id === id)?.normalizedPhone,
      "+201012345678",
    );
    for (const phone of ["01012345678", "+201012345678", "00201012345678"])
      assert.throws(
        () => call(payload("customer.add", { name: "duplicate", phone })),
        (e: any) => e.existing?.id === id && e.existing.name === "QA contact",
      );
    assert.equal(call(p).id, id);
    assert.throws(() => call({ ...p, name: "changed payload" }), /Request ID/);
    const a = payload("appointment.save", {
      customerId: id,
      date: "2026-12-12",
      time: "12:00",
      staff: "فريق اختبار",
      type: provider === "sheets" ? "زيارة أولى" : "قياس أول",
      status: "مؤكد",
    });
    const appt = call(a);
    assert.equal(call(a).id, appt.id);
    assert.equal(
      read().appointments.filter((a) => a.customerId === id).length,
      1,
    );
    const f = payload("followup.add", {
      customerId: id,
      due: "2026-12-13T14:30",
      title: "QA follow-up",
      staff: "فريق اختبار",
      notes: "QA notes",
    });
    const task = call(f);
    assert.equal(call(f).id, task.id);
    const tasks = read().followups.filter((f) => f.customerId === id);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].due, "2026-12-13T14:30");
    assert.equal(tasks[0].notes, "QA notes");
    assert.ok(tasks[0].createdAt);
    assert.ok(tasks[0].status);
    call(payload("followup.complete", { id: task.id }));
    assert.equal(read().followups.find((f) => f.id === task.id)?.done, true);
    assert.equal(
      lifecycleStatus(read().customers.find((c) => c.id === id)!),
      "New Inquiry",
    );
    call(payload("customer.update", { id, status: "تم التعاقد" }));
    assert.equal(
      lifecycleStatus(read().customers.find((c) => c.id === id)!),
      "Customer",
    );
    assert.equal(read().customers.length, original.length + 1);
    assert.ok(read().activity.filter((a) => a.customerId === id).length >= 5);
    for (const old of original)
      assert.deepEqual(
        read().customers.find((c) => c.id === old.id),
        old,
      );
  });
test("G: response lost after commit reconciles to success; definitive rejection says nothing saved; unresolved failure keeps original key", async () => {
  const d = seed(),
    p = payload("customer.add", { name: "Lost reply", phone: "01123456789" });
  const transport = async (url: any) => {
    if (String(url).includes("requestId="))
      return Response.json({
        state: "saved",
        ...d.requests![p.requestId].result,
      });
    applyMutation(d, p, user);
    throw Error("connection reset after commit");
  };
  const result = await saveRecord(p, transport as typeof fetch);
  assert.ok(result.reconciled);
  assert.equal(d.customers.filter((c) => c.name === "Lost reply").length, 1);
  await assert.rejects(
    saveRecord(payload("customer.add"), async () =>
      Response.json({ error: "invalid name", pending: false }, { status: 400 }),
    ),
    (e: any) =>
      e instanceof SaveError && !e.pending && e.message.includes("لم يتم"),
  );
  await assert.rejects(
    saveRecord(p, async () => {
      throw Error("offline");
    }),
    (e: any) => e instanceof SaveError && e.pending,
  );
});
test("G: signed Sheets transport timeout is reconciled using the actual Apps Script journal", async () => {
  const fixture = createSheetWorkflow();
  const p = payload("customer.add", {
    name: "Transport test",
    phone: "01234567890",
  });
  const op = sheetOperation(p),
    oldFetch = global.fetch;
  const previous = {
    provider: process.env.CRM_DATA_PROVIDER,
    demo: process.env.CRM_DEMO_MODE,
    url: process.env.CRM_SHEETS_URL,
    secret: process.env.CRM_SHEETS_SECRET,
  };
  Object.assign(process.env, {
    CRM_DATA_PROVIDER: "sheets",
    CRM_DEMO_MODE: "false",
    CRM_SHEETS_URL: "https://script.google.com/macros/s/synthetic/exec",
    CRM_SHEETS_SECRET: "b".repeat(64),
  });
  try {
    global.fetch = (async (_url: any, init: any) => {
      const envelope = JSON.parse(init.body),
        body = JSON.parse(envelope.body);
      const response = JSON.parse(
        fixture.context.doPost({
          postData: { contents: JSON.stringify(envelope) },
        }),
      );
      if (body.method === "customer.add") throw Error("response lost");
      return Response.json(response);
    }) as typeof fetch;
    const result = await sheetMutation(op.method, op.payload, user);
    assert.ok(result.reconciled);
    assert.equal(
      fixture
        .call("read")
        .data.customers.filter((c: any) => c.name === "Transport test").length,
      1,
    );
  } finally {
    global.fetch = oldFetch;
    for (const [key, value] of Object.entries({
      CRM_DATA_PROVIDER: previous.provider,
      CRM_DEMO_MODE: previous.demo,
      CRM_SHEETS_URL: previous.url,
      CRM_SHEETS_SECRET: previous.secret,
    }))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
test("normalization is stable for Egyptian equivalents and preserves unknown international numbers", () => {
  for (const phone of [
    "01012345678",
    "+201012345678",
    "00201012345678",
    "201012345678",
    "٠١٠ ١٢٣٤ ٥٦٧٨",
  ])
    assert.equal(normalizePhone(phone), "+201012345678");
  assert.equal(normalizePhone("+442012345678"), "+442012345678");
});
