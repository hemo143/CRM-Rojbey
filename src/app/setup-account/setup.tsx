"use client";
import { useState, useEffect, type FormEvent } from "react";
import Brand from "../brand";
import { deriveAccount } from "@/lib/account-setup";
export default function AccountSetup() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState("");
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setResult("");
    if (data.get("password") !== data.get("confirm")) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setBusy(true);
    try {
      const account = await deriveAccount(
        String(data.get("username") || ""),
        String(data.get("name") || ""),
        String(data.get("password") || ""),
      );
      setResult(JSON.stringify([account]));
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تجهيز الحساب");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main style={{ maxWidth: 600, margin: "8vh auto", padding: 24 }}>
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}
      >
        <Brand />
      </div>
      <section className="panel">
        <h1>إعداد حساب الإدارة</h1>
        <p>
          اختار بيانات الدخول اللي هتستخدمها في الـCRM. كلمة المرور تُعالج داخل
          متصفحك فقط، ولا تُرسل إلى الموقع أو تُحفظ فيه.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!ready && <p>يلزم تفعيل JavaScript لتجهيز الحساب داخل المتصفح.</p>}
        <form onSubmit={generate}>
          <fieldset
            disabled={!ready || busy}
            style={{
              display: "grid",
              gap: 16,
              border: 0,
              padding: 0,
              margin: 0,
              minWidth: 0,
            }}
          >
            <label>
              اسم الدخول
              <input
                name="username"
                defaultValue="admin"
                dir="ltr"
                required
                pattern="[A-Za-z0-9_.@\-]{1,100}"
                autoComplete="username"
              />
            </label>
            <label>
              الاسم الظاهر
              <input
                name="name"
                defaultValue="مديرة الأتيليه"
                required
                maxLength={120}
              />
            </label>
            <label>
              كلمة المرور
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={1024}
                autoComplete="new-password"
              />
            </label>
            <label>
              تأكيد كلمة المرور
              <input
                name="confirm"
                type="password"
                required
                minLength={12}
                maxLength={1024}
                autoComplete="new-password"
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "جارٍ التجهيز…" : "تجهيز إعداد الحساب"}
            </button>
          </fieldset>
        </form>
        {result && (
          <div style={{ marginTop: 24 }}>
            <p role="status">
              الإعداد جاهز. احتفظ باسم الدخول وكلمة المرور في مدير كلمات المرور؛
              لا ترسلهم في المحادثة.
            </p>
            <label>
              إعداد CRM_USERS_JSON
              <textarea
                value={result}
                readOnly
                dir="ltr"
                rows={6}
                spellCheck={false}
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
            <p>
              انسخ محتوى المربع إلى قيمة CRM_USERS_JSON في إعدادات Render. هذه
              الخطوة تجهّز الحساب فقط؛ لن يبدأ الدخول قبل حفظ الإعداد وتفعيل
              الاتصال بالشيت.
            </p>
          </div>
        )}
        <p className="muted">
          لا حاجة لبيانات عميلات أو مفاتيح اتصال في هذه الصفحة.
        </p>
      </section>
    </main>
  );
}
