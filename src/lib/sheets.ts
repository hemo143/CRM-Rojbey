import { createHmac, randomUUID } from "node:crypto";
import type { Data, Session } from "./domain.ts";

export const sheetsEnabled = () => process.env.CRM_DATA_PROVIDER === "sheets";
export function assertLiveMode(user?: Session | null) {
  if (
    sheetsEnabled() &&
    (process.env.CRM_DEMO_MODE !== "false" || (user && user.demo))
  )
    throw Error("يجب إيقاف وضع التجربة قبل الاتصال ببيانات الشيت");
}
export function signedEnvelope(
  method: string,
  payload: unknown,
  user: Session,
  secret: string,
) {
  if (!/^[a-f0-9]{64}$/.test(secret))
    throw Error("CRM_SHEETS_SECRET غير مُعدّ");
  const body = JSON.stringify({
    version: 1,
    at: Date.now(),
    nonce: randomUUID(),
    method,
    payload,
    actor: { id: user.id, role: user.role, name: user.name },
  });
  return {
    body,
    signature: createHmac("sha256", secret).update(body).digest("hex"),
  };
}
export class SheetCallError extends Error {
  pending: boolean;
  constructor(message: string, pending: boolean) {
    super(message);
    this.pending = pending;
  }
}
export async function sheetCall(
  method: string,
  payload: unknown,
  user: Session,
) {
  assertLiveMode(user);
  if (!user.id || user.demo) throw Error("يلزم حساب فردي للدخول إلى الشيت");
  const url = process.env.CRM_SHEETS_URL || "";
  if (
    !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(
      url,
    )
  )
    throw Error("CRM_SHEETS_URL غير مُعدّ");
  const envelope = signedEnvelope(
    method,
    payload,
    user,
    process.env.CRM_SHEETS_SECRET || "",
  );
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(envelope),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new SheetCallError(
      "تعذّر تأكيد العملية من الشيت. أعيدي نفس الطلب دون تغيير التفاصيل.",
      method !== "read",
    );
  }
  if (!response.ok)
    throw new SheetCallError(
      "تعذّر الاتصال بالشيت؛ راجعي إعداد النشر",
      method !== "read",
    );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new SheetCallError(
      "رد Google غير صالح؛ راجعي صلاحية نشر الجسر",
      method !== "read",
    );
  }
  if (result.ok !== true)
    throw new SheetCallError(
      typeof result.error === "string"
        ? result.error
        : "تعذّر تنفيذ العملية في الشيت",
      typeof result.error === "string" &&
        result.error.startsWith("RB_PENDING:"),
    );
  return result.data;
}
type Row = Record<string, string>;
type NativeData = {
  customers: Row[];
  appointments: Row[];
  tasks: Row[];
  activity: Row[];
  config: { lists: Record<string, string[]>; values: Record<string, string> };
  warnings: Record<string, number>;
};
export function mapSheetData(raw: NativeData): Data {
  // Preserve vocabulary and blank historical timestamps. Never seed/merge/backfill.
  if (
    !raw ||
    !Array.isArray(raw.customers) ||
    !raw.config?.lists ||
    !raw.config.values
  )
    throw Error("مخطط استجابة الشيت غير متوافق");
  if (raw.warnings?.customersWithoutIds || raw.warnings?.duplicateCustomerIds)
    throw Error(
      "يلزم مراجعة معرّفات العميلات في الشيت قبل عرض ملفات قابلة للتعديل",
    );
  const values = raw.config.values;
  return {
    customers: raw.customers.map((r) => ({
      ...r,
      id: r.id,
      name: r.name,
      phone: r.phone,
      channel: r.channel,
      source: r.source,
      username: r.username,
      metaContactId: r.metaContactId,
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      notes: r.notes,
      status: r.status,
      staff: r.staff,
      service: r.service,
      model: r.model,
      createdAt: r.createdAt,
    })),
    appointments: raw.appointments.map((r) => ({
      ...r,
      id: r.id,
      customerId: r.customerId,
      date: r.date,
      time: r.time,
      staff: r.staff,
      type: r.type,
      status: r.status,
      notes: r.notes,
    })),
    followups: raw.tasks.map((r) => ({
      ...r,
      id: r.id,
      customerId: r.customerId,
      due: r.due,
      title: r.title,
      staff: r.staff,
      done: r.status === values.taskComplete,
      cancelled: !!values.taskCancelled && r.status === values.taskCancelled,
    })),
    activity: raw.activity.map((r, i) => ({
      id: `sheet-log-${i}`,
      customerId: r.id,
      at: r.at,
      actor: r.actor,
      text: r.action,
    })),
    sheet: { lists: raw.config.lists, values, warnings: raw.warnings },
  };
}
export function sheetOperation(p: Record<string, unknown>) {
  if (
    typeof p.requestId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/.test(p.requestId)
  )
    throw Error("يلزم معرّف طلب ثابت لحفظ العملية");
  const methods: Record<string, string> = {
    "customer.add": "customer.add",
    "customer.update": "customer.update",
    "appointment.save": p.id ? "appointment.update" : "appointment.add",
    "followup.add": "followup.add",
    "followup.complete": "followup.complete",
  };
  const action = typeof p.action === "string" ? p.action : "";
  if (!Object.hasOwn(methods, action)) throw Error("عملية غير مدعومة");
  const allowed = action.startsWith("customer.")
    ? [
        "name",
        "phone",
        "source",
        "channel",
        "username",
        "metaContactId",
        "lastMessage",
        "lastMessageAt",
        "notes",
        "status",
        "staff",
        "service",
        "model",
      ]
    : action === "appointment.save"
      ? ["customerId", "date", "time", "staff", "type", "status", "notes"]
      : action === "followup.add"
        ? ["customerId", "title", "due", "staff"]
        : [];
  const payload: Record<string, unknown> = { requestId: p.requestId };
  if (p.id) payload.id = p.id;
  for (const key of allowed) if (Object.hasOwn(p, key)) payload[key] = p[key];
  return { method: methods[action], payload };
}
