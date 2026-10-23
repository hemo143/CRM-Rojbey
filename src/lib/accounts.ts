import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import type { Role, Session } from "./domain.ts";
type Account = { id: string; name: string; role: Role; passwordHash: string };
function accounts(): Account[] {
  const rows: unknown = JSON.parse(process.env.CRM_USERS_JSON || "[]");
  if (!Array.isArray(rows) || !rows.length)
    throw Error("الحسابات الفردية غير مُعدّة");
  const ids = new Set();
  for (const r of rows) {
    if (
      !r ||
      !/^[A-Za-z0-9_.@-]{1,100}$/.test(r.id) ||
      ids.has(r.id) ||
      typeof r.name !== "string" ||
      !r.name.trim() ||
      !["admin", "staff"].includes(r.role) ||
      !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(r.passwordHash)
    )
      throw Error("إعداد الحسابات غير صالح");
    ids.add(r.id);
  }
  return rows;
}
export function accountVersion() {
  return createHash("sha256")
    .update(process.env.CRM_USERS_JSON || "")
    .digest("hex");
}
export function authenticateAccount(id: unknown, password: unknown) {
  const rows = accounts();
  const account = rows.find((r) => r.id === id);
  if (typeof password !== "string" || password.length > 1024) return null;
  const [, salt, hash] = (
    account?.passwordHash || `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`
  ).split(":");
  const actual = scryptSync(password, salt, 64);
  if (!timingSafeEqual(actual, Buffer.from(hash, "hex")) || !account)
    return null;
  return {
    id: account.id,
    name: account.name,
    role: account.role,
    credentialVersion: accountVersion(),
  };
}
export function currentAccount(s: Session) {
  if (!s.id || s.credentialVersion !== accountVersion()) return false;
  return accounts().some(
    (a) => a.id === s.id && a.role === s.role && a.name === s.name,
  );
}
