import { currentAccount } from "./accounts";
import { sheetsEnabled } from "./sheets";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import type { Session } from "./domain";
function developmentSecret() {
  const dir = process.env.CRM_DATA_DIR || path.join(process.cwd(), ".data");
  const file = path.join(dir, "session-secret");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    return readFileSync(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    try {
      writeFileSync(file, randomBytes(32).toString("hex"), {
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    return readFileSync(file, "utf8");
  }
}
export const demoEnabled = () =>
  !sheetsEnabled() &&
  (process.env.CRM_DEMO_MODE === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.CRM_DEMO_MODE !== "false"));
function secret() {
  const s = process.env.CRM_SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s.length < 32))
    throw Error("CRM_SESSION_SECRET يجب أن يحتوي على ٣٢ حرفًا على الأقل");
  return s || developmentSecret();
}
function sign(s: string) {
  return createHmac("sha256", secret()).update(s).digest("base64url");
}
export function encodeSession(s: Session) {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return body + "." + sign(body);
}
export async function session(): Promise<Session | null> {
  const value = (await cookies()).get("rojbey_session")?.value;
  if (!value) return null;
  try {
    const [body, sig] = value.split(".");
    const expected = sign(body);
    if (!sig || !secureEqual(sig, expected)) return null;
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    if (
      !["admin", "staff"].includes(s.role) ||
      s.exp < Date.now() ||
      (s.demo && !demoEnabled())
    )
      return null;
    if (
      sheetsEnabled() &&
      (process.env.CRM_DEMO_MODE !== "false" || s.demo || !currentAccount(s))
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
export function secureEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected =
    process.env.CRM_APP_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    `${new URL(request.url).protocol}//${request.headers.get("host")}`;
  return !!origin && origin === expected;
}
