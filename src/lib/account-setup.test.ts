import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveAccount } from "./account-setup.ts";
import { authenticateAccount } from "./accounts.ts";
test("browser-derived salted account authenticates on Node and rejects a wrong password", async () => {
  const account = await deriveAccount(
    "testadmin",
    "Synthetic admin",
    "synthetic-password-123",
  );
  const again = await deriveAccount(
    "testadmin",
    "Synthetic admin",
    "synthetic-password-123",
  );
  assert.notEqual(account.passwordHash, again.passwordHash);
  const previous = process.env.CRM_USERS_JSON;
  process.env.CRM_USERS_JSON = JSON.stringify([account]);
  try {
    assert.equal(
      authenticateAccount("testadmin", "synthetic-password-123")?.role,
      "admin",
    );
    assert.equal(authenticateAccount("testadmin", "wrong-password"), null);
  } finally {
    if (previous === undefined) delete process.env.CRM_USERS_JSON;
    else process.env.CRM_USERS_JSON = previous;
  }
});
test("account setup rejects short passwords and malformed identity", async () => {
  await assert.rejects(deriveAccount("test", "Name", "short"));
  await assert.rejects(
    deriveAccount("invalid name", "Name", "synthetic-password-123"),
  );
});
