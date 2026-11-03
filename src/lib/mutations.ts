import { createHash, randomUUID } from "node:crypto";
import {
  DuplicateContactError,
  requireCustomer,
  text,
  validDate,
  validateCustomer,
  validateAppointment,
  type Data,
  type Session,
} from "./domain.ts";
export { DuplicateContactError };
export function requestKey(p: Record<string, unknown>) {
  const key = text(p.requestId, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/.test(key))
    throw Error("يلزم معرّف طلب ثابت لحفظ العملية");
  return key;
}
const canonical = (p: unknown): unknown =>
  Array.isArray(p)
    ? p.map(canonical)
    : p && typeof p === "object"
      ? Object.fromEntries(
          Object.entries(p)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, canonical(v)]),
        )
      : p;
export function applyMutation(
  data: Data,
  p: Record<string, unknown>,
  user: Session,
) {
  const key = requestKey(p),
    actor = user.id || `${user.role}:${user.name}`;
  const hash = createHash("sha256")
    .update(JSON.stringify(canonical(p)))
    .digest("hex");
  const previous = data.requests?.[key];
  if (previous) {
    if (previous.actor !== actor || previous.hash !== hash)
      throw Error("Request ID مستخدم لعملية مختلفة");
    return { ...previous.result, replayed: true };
  }
  let customerId = "",
    message = "";
  let id: string = randomUUID();
  const now = new Date().toISOString();
  if (p.action === "customer.add") {
    const c = { ...validateCustomer(data, p), id, createdAt: now };
    data.customers.unshift(c);
    customerId = id;
    message = "إنشاء استفسار";
  } else if (p.action === "customer.update") {
    const c = requireCustomer(data, text(p.id));
    const oldStatus = c.status,
      oldNotes = c.notes,
      oldMessage = c.lastMessage;
    Object.assign(c, validateCustomer(data, { ...c, ...p }, c.id), {
      updatedAt: now,
    });
    id = c.id;
    customerId = c.id;
    message =
      oldStatus !== c.status
        ? `تغيير الحالة: ${oldStatus} ← ${c.status}${c.status === "تم التعاقد" ? " · تحويل إلى عميلة" : ""}`
        : "تعديل ملف العميلة";
    if (oldNotes !== c.notes) message += " · تحديث الملاحظات";
    if (oldMessage !== c.lastMessage) message += " · تحديث الرسالة";
  } else if (p.action === "appointment.save") {
    const old = p.id ? data.appointments.find((a) => a.id === p.id) : undefined;
    if (p.id && !old) throw Error("الموعد غير موجود");
    const a = { ...validateAppointment(data, p, old?.id), id: old?.id || id };
    if (old) Object.assign(old, a);
    else data.appointments.push(a);
    id = a.id;
    customerId = a.customerId;
    message = old ? "تعديل موعد" : "حجز موعد";
  } else if (p.action === "followup.add") {
    customerId = text(p.customerId);
    requireCustomer(data, customerId);
    const title = text(p.title, 500),
      due = text(p.due, 40),
      staff = text(p.staff, 80) || user.name;
    if (
      !title ||
      !validDate(due.slice(0, 10)) ||
      (due.length > 10 &&
        !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(due))
    )
      throw Error("اكتبي المهمة وتاريخ ووقت المتابعة");
    data.followups.push({
      id,
      customerId,
      title,
      due,
      staff,
      notes: text(p.notes, 4000),
      status: "جديدة",
      createdAt: now,
      done: false,
    });
    message = "إضافة متابعة";
  } else if (p.action === "followup.complete") {
    const task = data.followups.find((t) => t.id === p.id);
    if (!task) throw Error("المتابعة غير موجودة");
    if (task.cancelled) throw Error("المتابعة ملغاة");
    task.done = true;
    task.status = "مكتملة";
    id = task.id;
    customerId = task.customerId;
    message = "إكمال متابعة";
  } else throw Error("عملية غير مدعومة");
  data.activity.unshift({
    id: randomUUID(),
    customerId,
    at: now,
    actor: user.name,
    text: message,
  });
  const result = { ok: true, id };
  (data.requests ||= {})[key] = { actor, hash, result };
  return result;
}
