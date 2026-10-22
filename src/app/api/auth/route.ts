import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  demoEnabled,
  encodeSession,
  sameOrigin,
  secureEqual,
  session,
} from "@/lib/auth";
import type { Role } from "@/lib/domain";
export const runtime = "nodejs";
const attempts = new Map<string, { count: number; until: number }>();
export async function GET() {
  return NextResponse.json(
    { user: await session(), demo: demoEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "طلب غير مسموح" }, { status: 403 });
  const key = "login";
  const limit = attempts.get(key);
  if (limit && limit.until > Date.now() && limit.count >= 20)
    return NextResponse.json(
      { error: "محاولات كثيرة. انتظري ١٥ دقيقة." },
      { status: 429 },
    );
  try {
    const p = await request.json();
    const role: Role = p.role === "admin" ? "admin" : "staff";
    const demo = p.demo === true && demoEnabled();
    if (!demo) {
      const expected =
        role === "admin"
          ? process.env.CRM_ADMIN_PASSWORD
          : process.env.CRM_STAFF_PASSWORD;
      if (!expected || !secureEqual(String(p.password || ""), expected)) {
        const old = attempts.get(key);
        attempts.set(key, {
          count: old && old.until > Date.now() ? old.count + 1 : 1,
          until:
            old && old.until > Date.now() ? old.until : Date.now() + 900000,
        });
        return NextResponse.json(
          { error: "بيانات الدخول غير صحيحة أو الحساب غير مُعدّ" },
          { status: 401 },
        );
      }
    }
    const user = {
      role,
      name: role === "admin" ? "مديرة الأتيليه" : "فريق الأتيليه",
      demo,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    };
    const token = encodeSession(user);
    (await cookies()).set("rojbey_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production" && !demo,
      path: "/",
      maxAge: 28800,
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "تعذّر تسجيل الدخول؛ راجعي إعدادات البيئة" },
      { status: 400 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "طلب غير مسموح" }, { status: 403 });
  (await cookies()).delete("rojbey_session");
  return NextResponse.json({ ok: true });
}
