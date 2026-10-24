// Real production Next server, synthetic accounts, no outbound Google requests.
import { spawn } from "node:child_process";
import { randomBytes, scryptSync, pbkdf2Sync } from "node:crypto";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3201";
const password = randomBytes(24).toString("hex");
const accounts = ["admin", "staff"].map((role) => {
  const salt = randomBytes(16).toString("hex");
  return {
    id: role,
    role,
    name: `Synthetic ${role}`,
    passwordHash:
      role === "staff"
        ? `pbkdf2-sha256:600000:${salt}:${pbkdf2Sync(password, Buffer.from(salt, "hex"), 600000, 32, "sha256").toString("hex")}`
        : `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  };
});
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3201",
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: "production",
      CRM_DATA_PROVIDER: "sheets",
      CRM_DEMO_MODE: "false",
      CRM_SESSION_SECRET: randomBytes(48).toString("hex"),
      CRM_USERS_JSON: JSON.stringify(accounts),
      CRM_SHEETS_URL: "",
      CRM_SHEETS_SECRET: "",
      CRM_APP_ORIGIN: origin,
    },
    stdio: "ignore",
  },
);
async function request(path, payload, cookie) {
  return fetch(origin + path, {
    method: payload ? "POST" : "GET",
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await request("/api/auth")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, "server startup");
  assert.equal((await request("/api/crm")).status, 401);
  const setup = await request("/setup-account");
  assert.ok(
    !(await setup.text()).includes('name="username"'),
    "setup form hidden outside demo mode",
  );
  assert.equal(
    (await request("/api/auth", { demo: true, role: "admin" })).status,
    401,
  );
  const staff = await request("/api/auth", {
    username: "staff",
    password,
    role: "admin",
  });
  assert.equal(staff.status, 200);
  assert.equal((await staff.clone().json()).user.role, "staff");
  const cookie = staff.headers.get("set-cookie").split(";")[0];
  assert.match(staff.headers.get("set-cookie"), /Secure/);
  assert.equal(
    (
      await request(
        "/api/crm",
        {
          action: "customer.update",
          id: "synthetic",
          requestId: "production-test-001",
        },
        cookie,
      )
    ).status,
    403,
  );
  // Missing Google configuration must fail closed, without local data or a Google request.
  const read = await request("/api/crm", undefined, cookie);
  assert.equal(read.status, 503);
  const body = await read.json();
  assert.ok(!("customers" in body));
  assert.equal(
    (
      await fetch(origin + "/api/crm", {
        method: "POST",
        headers: { Origin: "https://wrong.example", Cookie: cookie },
        body: "{}",
      })
    ).status,
    403,
  );
  console.log(
    "PASS: production Sheets login, server-derived roles, CSRF, demo refusal and fail-closed data (no Google access)",
  );
} finally {
  server.kill("SIGTERM");
}
