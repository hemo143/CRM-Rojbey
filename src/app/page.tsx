"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  channels,
  statuses,
  cairoDate,
  type Data,
  type Customer,
  type Appointment,
  type Session,
} from "@/lib/domain";
type View =
  | "dashboard"
  | "customers"
  | "leads"
  | "appointments"
  | "followups"
  | "messages"
  | "staff";
const navigation: [View, string, string][] = [
  ["dashboard", "نظرة عامة", "◈"],
  ["customers", "العميلات", "◯"],
  ["leads", "الاستفسارات الجديدة", "◇"],
  ["appointments", "المواعيد", "▦"],
  ["followups", "المتابعات", "✓"],
  ["messages", "المحادثات", "⋯"],
  ["staff", "الفريق والصلاحيات", "⌘"],
];
const staffNames = ["فريق الأتيليه", "مديرة الأتيليه"];
const number = (n: number) => new Intl.NumberFormat("ar-EG").format(n);
const dateLabel = (date: string) =>
  date
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeZone: "Africa/Cairo",
      }).format(new Date(date + "T12:00:00+02:00"))
    : "—";
function Mark() {
  return (
    <div className="brand">
      <span className="diamond">R</span>
      <div>
        <span className="wordmark">ROJBEY</span>
        <small>مساحة الأتيليه</small>
      </div>
    </div>
  );
}
export default function Home() {
  const [user, setUser] = useState<Session | null>(null),
    [demo, setDemo] = useState(false),
    [loading, setLoading] = useState(true),
    [data, setData] = useState<Data | null>(null),
    [view, setView] = useState<View>("dashboard"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [channel, setChannel] = useState(""),
    [profile, setProfile] = useState<string | null>(null),
    [modal, setModal] = useState<
      "customer" | "appointment" | "followup" | null
    >(null),
    [editing, setEditing] = useState<Customer | Appointment | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const res = await fetch("/api/crm");
    const body = await res.json();
    if (!res.ok) throw Error(body.error);
    setData(body);
  }
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth");
        const a = await r.json();
        setUser(a.user);
        setDemo(a.demo);
        if (a.user) await load();
      } catch {
        setError("تعذّر تحميل البيانات. أعيدي المحاولة.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        setModal(null);
        return;
      }
      if (e.key !== "Tab") return;
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"] button:not(:disabled), [role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea',
        ),
      );
      const first = elements[0],
        last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [modal, busy]);
  async function logout() {
    try {
      const response = await fetch("/api/auth", { method: "DELETE" });
      if (!response.ok) throw Error("تعذّر تسجيل الخروج");
      setUser(null);
      setData(null);
      setProfile(null);
      setError("");
      setView("dashboard");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: f.get("role"),
          password: f.get("password"),
          demo: f.get("demo") === "true",
        }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setUser(b.user);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const action =
      modal === "customer"
        ? editing
          ? "customer.update"
          : "customer.add"
        : modal === "appointment"
          ? "appointment.save"
          : "followup.add";
    try {
      await mutate({ ...f, action, ...(editing ? { id: editing.id } : {}) });
      setModal(null);
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function mutate(p: Record<string, unknown>) {
    const r = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error);
    await load();
    setNotice("تم حفظ التغييرات.");
  }
  function open(
    kind: "customer" | "appointment" | "followup",
    item: Customer | Appointment | null = null,
  ) {
    setError("");
    setEditing(item);
    setModal(kind);
  }
  const today = cairoDate(),
    customer = (id: string) => data?.customers.find((c) => c.id === id),
    selected = data?.customers.find((c) => c.id === profile),
    upcoming =
      data?.appointments
        .filter((a) => a.status === "مؤكد" && a.date >= today)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)) || [],
    due = data?.followups.filter((t) => !t.done && t.due <= today) || [],
    filtered =
      data?.customers.filter(
        (c) =>
          (view !== "leads" || c.status === "جديدة") &&
          (!search ||
            [c.name, c.phone, c.username].some((v) =>
              v.toLowerCase().includes(search.toLowerCase()),
            )) &&
          (!status || c.status === status) &&
          (!channel || c.channel === channel),
      ) || [];
  if (loading)
    return <main className="loading">جارٍ تجهيز مساحة الأتيليه…</main>;
  if (!user)
    return (
      <main className="login">
        <section className="login-story">
          <Mark />
          <div>
            <p className="eyebrow">THE ATELIER · CAIRO</p>
            <h1>
              كل تفصيلة.
              <br />
              <em>في مكانها.</em>
            </h1>
            <p>
              مساحة هادئة للفريق.
              <br />
              من أول تواصل، إلى آخر بروفة.
            </p>
            <div className="thread" />
          </div>
          <small>ثمينة في كل تفاصيلها.</small>
        </section>
        <section className="login-form">
          <p className="eyebrow">WELCOME TO ROJBEY</p>
          <h2>أهلًا بعودتك.</h2>
          <p className="muted">سجّلي الدخول لمتابعة يوم الأتيليه.</p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <form onSubmit={login}>
            <label>
              الحساب
              <select name="role">
                <option value="admin">مديرة الأتيليه</option>
                <option value="staff">فريق الأتيليه</option>
              </select>
            </label>
            {demo ? (
              <>
                <input type="hidden" name="demo" value="true" />
                <div className="demo-note">
                  نسخة تجريبية ببيانات وهمية. اختيار الدور هنا للتجربة فقط؛ لا
                  تستخدميها لبيانات العميلات الحقيقية.
                </div>
              </>
            ) : (
              <label>
                كلمة المرور
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "جارٍ الدخول…"
                : demo
                  ? "دخول النسخة التجريبية ←"
                  : "دخول الأتيليه ←"}
            </button>
          </form>
          <small className="muted">
            {demo
              ? "البيانات محفوظة محليًا على خادم التجربة."
              : "الحسابات تُضبط من متغيرات البيئة بواسطة مسؤول النظام."}
          </small>
        </section>
      </main>
    );
  return (
    <div className="shell">
      <aside className="sidebar">
        <Mark />
        <p className="nav-label">إدارة الأتيليه</p>
        <nav>
          {navigation
            .filter(([id]) => id !== "staff" || user.role === "admin")
            .map(([id, label, icon]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                onClick={() => {
                  setView(id);
                  setProfile(null);
                  setNotice("");
                  setError("");
                }}
              >
                <span className="nav-icon">{icon}</span>
                {label}
                {id === "followups" && due.length > 0 && (
                  <span className="nav-count">{number(due.length)}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="connection-dot" />
          مصدر البيانات: محلي<small>Google Sheets غير متصل</small>
          <div className="user">
            <span className="avatar">ر</span>
            <div>
              {user.name}
              <small>
                {user.demo
                  ? "حساب تجريبي"
                  : user.role === "admin"
                    ? "مديرة النظام"
                    : "موظفة"}
              </small>
            </div>
          </div>
          <button className="text-button" onClick={logout}>
            تسجيل الخروج ←
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            مساحة العمل{" "}
            <span className="muted">
              / {navigation.find((n) => n[0] === view)?.[1]}
            </span>
          </span>
          <span className="today">
            {new Intl.DateTimeFormat("ar-EG", {
              dateStyle: "full",
              timeZone: "Africa/Cairo",
            }).format(new Date())}
          </span>
          <button className="text-button mobile-logout" onClick={logout}>
            خروج ←
          </button>
        </header>
        {user.demo && (
          <div className="demo-banner">
            وضع تجريبي · بيانات وهمية محفوظة محليًا · غير متصل بـGoogle Sheets
            أو Meta
          </div>
        )}
        <main className="content">
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="إغلاق التنبيه" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}
          {selected ? (
            <>
              <button className="text-button" onClick={() => setProfile(null)}>
                → العودة إلى {navigation.find((n) => n[0] === view)?.[1]}
              </button>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">THE BRIDE · CUSTOMER PROFILE</p>
                  <h1>{selected.name}</h1>
                  <p className="muted">
                    ملف العميلة وتفاصيل رحلتها مع الأتيليه.
                  </p>
                </div>
                {user.role === "admin" && (
                  <button
                    className="outline"
                    onClick={() => open("customer", selected)}
                  >
                    تعديل الملف
                  </button>
                )}
              </div>
              <div className="profile-grid">
                <section className="panel">
                  <h2>تفاصيل العميلة</h2>
                  <dl>
                    {[
                      ["الموبايل", selected.phone],
                      ["قناة التواصل", selected.channel],
                      ["اسم المستخدم", selected.username],
                      ["Meta Contact ID", selected.metaContactId],
                      ["حالة الاستفسار", selected.status],
                      ["الموظفة", selected.staff],
                      ["الخدمة", selected.service],
                      ["قصة الفستان", selected.model],
                      ["آخر رسالة", selected.lastMessage],
                      ["تاريخ آخر رسالة", selected.lastMessageAt],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  <h3>الملاحظات</h3>
                  <p className="prewrap">
                    {selected.notes || "لا توجد ملاحظات حتى الآن."}
                  </p>
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <h2>المواعيد والمتابعات</h2>
                    <button
                      className="text-button"
                      onClick={() => open("appointment")}
                    >
                      + موعد
                    </button>
                  </div>
                  {data?.appointments
                    .filter((a) => a.customerId === selected.id)
                    .map((a) => (
                      <div className="list-row" key={a.id}>
                        <div>
                          {a.type}
                          <small>
                            {dateLabel(a.date)} · {a.time} · {a.staff}
                          </small>
                        </div>
                        <span className="badge">{a.status}</span>
                      </div>
                    ))}
                  {data?.followups
                    .filter((t) => t.customerId === selected.id)
                    .map((t) => (
                      <div className="list-row" key={t.id}>
                        <div>
                          {t.title}
                          <small>{dateLabel(t.due)}</small>
                        </div>
                        <span>{t.done ? "مكتملة" : "بانتظار المتابعة"}</span>
                      </div>
                    ))}
                  <button className="outline" onClick={() => open("followup")}>
                    إضافة متابعة
                  </button>
                  <h3>سجل النشاط</h3>
                  {data?.activity
                    .filter((a) => a.customerId === selected.id)
                    .map((a) => (
                      <div key={a.id} className="activity">
                        <span>{a.text}</span>
                        <small>
                          {a.actor} ·{" "}
                          {new Date(a.at).toLocaleString("ar-EG", {
                            timeZone: "Africa/Cairo",
                          })}
                        </small>
                      </div>
                    ))}
                  {!data?.activity.some(
                    (a) => a.customerId === selected.id,
                  ) && <p className="muted">سيظهر النشاط الجديد هنا.</p>}
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ROJBEY · ATELIER MANAGEMENT</p>
                  <h1>
                    {view === "dashboard"
                      ? "يوم جديد في الأتيليه."
                      : navigation.find((n) => n[0] === view)?.[1]}
                  </h1>
                  <p className="muted">
                    {view === "dashboard"
                      ? "كل عميلة لها حكاية. وكل موعد يستحق العناية."
                      : view === "customers"
                        ? "تفاصيل صغيرة، وعلاقة تستمر."
                        : view === "appointments"
                          ? "مساحة لكل عروس. ووقت لكل تفصيلة."
                          : view === "followups"
                            ? "التواصل في وقته يصنع الفارق."
                            : "مساحة الفريق، على إيقاع الأتيليه."}
                  </p>
                </div>
                {!["messages", "staff"].includes(view) && (
                  <button
                    className="primary"
                    onClick={() =>
                      open(
                        view === "appointments"
                          ? "appointment"
                          : view === "followups"
                            ? "followup"
                            : "customer",
                      )
                    }
                  >
                    +{" "}
                    {view === "appointments"
                      ? "موعد جديد"
                      : view === "followups"
                        ? "متابعة جديدة"
                        : "إضافة عميلة"}
                  </button>
                )}
              </div>
              {view === "dashboard" && (
                <>
                  <div className="stats">
                    {[
                      [
                        "إجمالي العميلات",
                        data?.customers.length || 0,
                        "ملفات في مساحة الأتيليه",
                      ],
                      [
                        "الاستفسارات الجديدة",
                        data?.customers.filter((c) => c.status === "جديدة")
                          .length || 0,
                        "بداية حكاية جديدة",
                      ],
                      [
                        "مواعيد اليوم",
                        data?.appointments.filter(
                          (a) => a.date === today && a.status === "مؤكد",
                        ).length || 0,
                        "لحظات تستحق العناية",
                      ],
                      ["متابعات مستحقة", due.length, "اليوم وما قبله"],
                    ].map(([title, value, detail], i) => (
                      <section
                        key={String(title)}
                        className={"stat " + (i === 0 ? "stat-dark" : "")}
                      >
                        <span>{title}</span>
                        <strong>{number(Number(value))}</strong>
                        <small>{detail}</small>
                        <span className="stat-index">0{i + 1}</span>
                      </section>
                    ))}
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">THE FITTING CALENDAR</p>
                          <h2>المواعيد القادمة</h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setView("appointments")}
                        >
                          كل المواعيد ←
                        </button>
                      </div>
                      {upcoming.slice(0, 5).map((a) => (
                        <button
                          key={a.id}
                          className="appointment-row"
                          onClick={() => setProfile(a.customerId)}
                        >
                          <span className="time">
                            {a.time}
                            <small>{dateLabel(a.date)}</small>
                          </span>
                          <div>
                            <strong>{customer(a.customerId)?.name}</strong>
                            <small>
                              {a.type} · {a.staff}
                            </small>
                          </div>
                          <span className="badge">{a.status}</span>
                          <span>←</span>
                        </button>
                      ))}
                      {!upcoming.length && (
                        <Empty text="لا توجد مواعيد قادمة. أضيفي أول موعد." />
                      )}
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">A THOUGHTFUL FOLLOW-UP</p>
                          <h2>تحتاج اهتمامك</h2>
                        </div>
                        <span className="circle-number">
                          {number(due.length)}
                        </span>
                      </div>
                      {due.slice(0, 5).map((t) => (
                        <div className="followup-row" key={t.id}>
                          <button
                            aria-label={"إكمال " + t.title}
                            className="check"
                            onClick={() =>
                              mutate({
                                action: "followup.complete",
                                id: t.id,
                              }).catch((e) => setError(e.message))
                            }
                          >
                            ✓
                          </button>
                          <button
                            className="row-link"
                            onClick={() => setProfile(t.customerId)}
                          >
                            <strong>{customer(t.customerId)?.name}</strong>
                            <small>{t.title}</small>
                            <small>{dateLabel(t.due)}</small>
                          </button>
                        </div>
                      ))}
                      {!due.length && (
                        <Empty text="كل المتابعات المستحقة مكتملة." />
                      )}
                    </section>
                  </div>
                  <section className="panel">
                    <div className="section-heading">
                      <h2>آخر العميلات</h2>
                      <button
                        className="text-button"
                        onClick={() => setView("customers")}
                      >
                        عرض الكل ←
                      </button>
                    </div>
                    <CustomerTable
                      customers={data?.customers.slice(0, 5) || []}
                      onSelect={setProfile}
                    />
                  </section>
                </>
              )}
              {(view === "customers" || view === "leads") && (
                <section className="panel">
                  <div className="filters">
                    <label className="search">
                      <span className="sr-only">البحث عن عميلة</span>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحثي بالاسم، الموبايل أو اسم المستخدم…"
                      />
                    </label>
                    <select
                      aria-label="فلترة الحالة"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">كل الحالات</option>
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      aria-label="فلترة القناة"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                    >
                      <option value="">كل القنوات</option>
                      {channels.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <small>{number(filtered.length)} عميلة</small>
                  </div>
                  <CustomerTable customers={filtered} onSelect={setProfile} />
                </section>
              )}
              {view === "appointments" && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>دفتر المواعيد</h2>
                    <small className="muted">
                      توقيت القاهرة · منع التعارض حسب الموظفة والعميلة
                    </small>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "العميلة",
                            "التاريخ والوقت",
                            "نوع الموعد",
                            "الموظفة",
                            "المدة",
                            "الحالة",
                            "",
                          ].map((h, i) => (
                            <th key={i}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...(data?.appointments || [])]
                          .sort((a, b) =>
                            (a.date + a.time).localeCompare(b.date + b.time),
                          )
                          .map((a) => (
                            <tr key={a.id}>
                              <td>
                                <button
                                  className="name-link"
                                  onClick={() => setProfile(a.customerId)}
                                >
                                  {customer(a.customerId)?.name}
                                </button>
                              </td>
                              <td>
                                {dateLabel(a.date)}
                                <small dir="ltr">{a.time}</small>
                              </td>
                              <td>{a.type}</td>
                              <td>{a.staff}</td>
                              <td>{number(a.duration)} دقيقة</td>
                              <td>
                                <span className="badge">{a.status}</span>
                              </td>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => open("appointment", a)}
                                >
                                  تعديل
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!data?.appointments.length && (
                      <Empty text="لا توجد مواعيد حتى الآن." />
                    )}
                  </div>
                </section>
              )}
              {view === "followups" && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>المتابعات</h2>
                    <small className="muted">مرتبة حسب تاريخ الاستحقاق</small>
                  </div>
                  {[...(data?.followups || [])]
                    .sort(
                      (a, b) =>
                        Number(a.done) - Number(b.done) ||
                        a.due.localeCompare(b.due),
                    )
                    .map((t) => (
                      <div
                        className={
                          "followup-row " + (t.done ? "completed" : "")
                        }
                        key={t.id}
                      >
                        <button
                          className="check"
                          disabled={t.done || busy}
                          aria-label={"إكمال " + t.title}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await mutate({
                                action: "followup.complete",
                                id: t.id,
                              });
                            } catch (e) {
                              setError((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {t.done ? "✓" : ""}
                        </button>
                        <button
                          className="row-link"
                          onClick={() => setProfile(t.customerId)}
                        >
                          <strong>
                            {customer(t.customerId)?.name} · {t.title}
                          </strong>
                          <small>
                            {t.staff} · {dateLabel(t.due)}
                          </small>
                        </button>
                        <span className="badge">
                          {t.done
                            ? "مكتملة"
                            : t.due <= today
                              ? "مستحقة"
                              : "قادمة"}
                        </span>
                      </div>
                    ))}
                  {!data?.followups.length && (
                    <Empty text="لا توجد متابعات حتى الآن." />
                  )}
                </section>
              )}
              {view === "messages" && (
                <section className="panel integration">
                  <div className="integration-symbol">⋯</div>
                  <p className="eyebrow">CONVERSATIONS · NEXT CHAPTER</p>
                  <h2>كل المحادثات. في مكان واحد.</h2>
                  <p>
                    ربط Facebook وInstagram مخطط لمرحلة لاحقة.
                    <br />
                    لا يتم استقبال رسائل أو إرسال ردود من هذه النسخة.
                  </p>
                  <div className="integration-channels">
                    <span>Instagram · غير متصل</span>
                    <span>Facebook · غير متصل</span>
                  </div>
                  <small className="muted">
                    يتطلب إعداد صلاحيات Meta وWebhooks واختبارها قبل التشغيل.
                  </small>
                </section>
              )}
              {view === "staff" && (
                <section className="panel">
                  <h2>أدوار الفريق</h2>
                  <p className="muted">
                    نسخة أولية بحسابين وظيفيين. إدارة حساب مستقل لكل موظفة لم
                    تُنفّذ بعد.
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>الصلاحية</th>
                          <th>مديرة الأتيليه</th>
                          <th>الفريق</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["عرض الملفات والمواعيد", "متاح", "متاح"],
                          ["إضافة عميلة ومواعيد ومتابعات", "متاح", "متاح"],
                          ["تعديل ملف العميلة", "متاح", "غير متاح"],
                          ["عرض إعدادات الصلاحيات", "متاح", "غير متاح"],
                        ].map((row) => (
                          <tr key={row[0]}>
                            {row.map((cell) => (
                              <td key={cell}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="demo-note">
                    {user.demo
                      ? "اختيار الدور في النسخة التجريبية مفتوح. لا يمثل مصادقة مناسبة لبيانات حقيقية."
                      : "تُضبط كلمات مرور الحسابات من البيئة. استخدام الإنترنت العام يحتاج HTTPS ومراجعة أمنية وإدارة هويات فردية."}
                  </p>
                </section>
              )}
            </>
          )}
          <footer className="footer">
            ROJBEY · ثمينة في كل تفاصيلها.
            <span>مساحة الفريق · النسخة الأولية</span>
          </footer>
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">ATELIER DETAILS</p>
                <h2 id="modal-title">
                  {modal === "customer"
                    ? editing
                      ? "تعديل ملف العميلة"
                      : "حكاية جديدة في الأتيليه"
                    : modal === "appointment"
                      ? editing
                        ? "تعديل الموعد"
                        : "موعد خاص جديد"
                      : "إضافة متابعة"}
                </h2>
              </div>
              <button
                className="close"
                aria-label="إغلاق"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <form onSubmit={save}>
              <div className="form-grid">
                {modal === "customer" ? (
                  <>
                    {[
                      ["name", "اسم العميلة", "text"],
                      ["phone", "الموبايل", "tel"],
                      ["username", "اسم المستخدم", "text"],
                      ["metaContactId", "Meta Contact ID", "text"],
                    ].map(([name, label, type]) => (
                      <label key={name}>
                        {label}
                        <input
                          autoFocus={name === "name"}
                          name={name}
                          type={type}
                          required={name === "name"}
                          maxLength={name === "name" ? 120 : 100}
                          defaultValue={
                            editing
                              ? (editing as Customer)[name as keyof Customer]
                              : name === "staff"
                                ? user.name
                                : ""
                          }
                        />
                      </label>
                    ))}
                    <Select
                      name="staff"
                      label="الموظفة"
                      values={staffNames}
                      value={(editing as Customer)?.staff || user.name}
                    />
                    <Select
                      name="channel"
                      label="قناة التواصل"
                      values={[...channels]}
                      value={(editing as Customer)?.channel}
                    />
                    <Select
                      name="status"
                      label="حالة الاستفسار"
                      values={[...statuses]}
                      value={(editing as Customer)?.status}
                    />
                    <Select
                      name="service"
                      label="الخدمة"
                      values={["إيجار", "شراء", "لم تحدد"]}
                      value={(editing as Customer)?.service}
                    />
                    <Select
                      name="model"
                      label="قصة الفستان"
                      values={[
                        "A-Line",
                        "Mermaid",
                        "Princess",
                        "Satin",
                        "لم تحدد",
                      ]}
                      value={(editing as Customer)?.model}
                    />
                    <label>
                      تاريخ آخر رسالة
                      <input
                        name="lastMessageAt"
                        type="date"
                        defaultValue={(editing as Customer)?.lastMessageAt}
                      />
                    </label>
                    <label className="full">
                      آخر رسالة
                      <textarea
                        name="lastMessage"
                        maxLength={2000}
                        defaultValue={(editing as Customer)?.lastMessage}
                      />
                    </label>
                    <label className="full">
                      الملاحظات
                      <textarea
                        name="notes"
                        maxLength={4000}
                        defaultValue={(editing as Customer)?.notes}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="full">
                      العميلة
                      <select
                        name="customerId"
                        required
                        defaultValue={
                          (editing as Appointment)?.customerId || profile || ""
                        }
                      >
                        <option value="" disabled>
                          اختاري العميلة
                        </option>
                        {data?.customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {modal === "appointment" ? (
                      <>
                        <label>
                          التاريخ
                          <input
                            autoFocus
                            type="date"
                            name="date"
                            required
                            defaultValue={
                              (editing as Appointment)?.date || today
                            }
                          />
                        </label>
                        <label>
                          الوقت · القاهرة
                          <input
                            type="time"
                            name="time"
                            required
                            defaultValue={
                              (editing as Appointment)?.time || "12:00"
                            }
                          />
                        </label>
                        <label>
                          المدة بالدقائق
                          <input
                            type="number"
                            name="duration"
                            min="15"
                            max="240"
                            step="15"
                            required
                            defaultValue={
                              (editing as Appointment)?.duration || 60
                            }
                          />
                        </label>
                        <Select
                          name="type"
                          label="نوع الموعد"
                          values={["قياس أول", "بروفة", "استلام", "استشارة"]}
                          value={(editing as Appointment)?.type}
                        />
                        <Select
                          name="status"
                          label="الحالة"
                          values={["مؤكد", "مكتمل", "ملغي"]}
                          value={(editing as Appointment)?.status}
                        />
                        <Select
                          name="staff"
                          label="الموظفة"
                          values={staffNames}
                          value={(editing as Appointment)?.staff || user.name}
                        />
                        <label className="full">
                          ملاحظات
                          <textarea
                            name="notes"
                            maxLength={1000}
                            defaultValue={(editing as Appointment)?.notes}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="full">
                          المهمة
                          <input
                            name="title"
                            autoFocus
                            required
                            maxLength={500}
                          />
                        </label>
                        <label>
                          تاريخ المتابعة
                          <input
                            name="due"
                            type="date"
                            required
                            defaultValue={today}
                          />
                        </label>
                        <Select
                          name="staff"
                          label="الموظفة"
                          values={staffNames}
                          value={user.name}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="form-actions">
                <button className="primary" disabled={busy}>
                  {busy ? "جارٍ الحفظ…" : "حفظ التفاصيل"}
                </button>
                <button
                  type="button"
                  className="outline"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}
function Select({
  name,
  label,
  values,
  value,
}: {
  name: string;
  label: string;
  values: string[];
  value?: string;
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={value || values[0]}>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
}
function CustomerTable({
  customers,
  onSelect,
}: {
  customers: Customer[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {["العميلة", "قناة التواصل", "الخدمة", "الحالة", "الموظفة", ""].map(
              (h, i) => (
                <th key={i}>{h}</th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>
                <button className="name-link" onClick={() => onSelect(c.id)}>
                  {c.name}
                </button>
                <small dir="ltr">
                  {c.phone || c.username || "لا يوجد رقم مسجل"}
                </small>
              </td>
              <td>{c.channel}</td>
              <td>{c.service || "—"}</td>
              <td>
                <span
                  className={"badge " + (c.status === "جديدة" ? "new" : "")}
                >
                  {c.status}
                </span>
              </td>
              <td>{c.staff || "—"}</td>
              <td>
                <button
                  className="text-button"
                  onClick={() => onSelect(c.id)}
                  aria-label={"فتح ملف " + c.name}
                >
                  ←
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!customers.length && <Empty text="لا توجد عميلات تطابق البحث." />}
    </div>
  );
}
