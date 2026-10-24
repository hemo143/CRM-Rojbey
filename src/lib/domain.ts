export const statuses = [
  "جديدة",
  "قيد التواصل",
  "موعد مؤكد",
  "تم التعاقد",
  "مغلقة",
] as const;
export const channels = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "زيارة الأتيليه",
  "ترشيح",
] as const;
export type Status = (typeof statuses)[number];
export type Customer = {
  id: string;
  name: string;
  phone: string;
  channel: string;
  source?: string;
  wedding?: string;
  city?: string;
  dress?: string;
  updatedAt?: string;
  username: string;
  metaContactId: string;
  lastMessage: string;
  lastMessageAt: string;
  notes: string;
  status: string;
  staff: string;
  service: string;
  model: string;
  createdAt: string;
};
export type Appointment = {
  id: string;
  customerId: string;
  date: string;
  time: string;
  duration?: number;
  staff: string;
  type: string;
  status: string;
  notes: string;
};
export type Followup = {
  id: string;
  customerId: string;
  due: string;
  title: string;
  staff: string;
  done: boolean;
  cancelled?: boolean;
};
export type Activity = {
  id: string;
  customerId: string;
  at: string;
  actor: string;
  text: string;
};
export type Data = {
  customers: Customer[];
  appointments: Appointment[];
  followups: Followup[];
  activity: Activity[];
  sheet?: {
    lists: Record<string, string[]>;
    values: Record<string, string>;
    warnings: Record<string, number>;
  };
};
export type Role = "admin" | "staff";
export type Session = {
  role: Role;
  name: string;
  demo: boolean;
  exp: number;
  id?: string;
  credentialVersion?: string;
};
export const cairoDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function validDate(s: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function normalizePhone(s: string): string {
  return s
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/[\s()-]/g, "");
}
export function requireCustomer(data: Data, id: string) {
  const customer = data.customers.find((c) => c.id === id);
  if (!customer) throw Error("العميلة غير موجودة");
  return customer;
}
export function validateCustomer(
  data: Data,
  p: Record<string, unknown>,
  id?: string,
) {
  const name = text(p.name, 120),
    phone = normalizePhone(text(p.phone, 30));
  if (!name) throw Error("اسم العميلة مطلوب");
  if (phone && !/^\+?\d{7,15}$/.test(phone)) throw Error("رقم الهاتف غير صحيح");
  if (
    phone &&
    data.customers.some((c) => normalizePhone(c.phone) === phone && c.id !== id)
  )
    throw Error("رقم الهاتف مسجل بالفعل");
  const status = text(p.status) || "جديدة";
  if (!statuses.includes(status as Status))
    throw Error("حالة العميلة غير صحيحة");
  const channel = text(p.channel) || "زيارة الأتيليه";
  if (!channels.includes(channel as (typeof channels)[number]))
    throw Error("القناة غير صحيحة");
  return {
    name,
    phone,
    channel,
    username: text(p.username, 100),
    metaContactId: text(p.metaContactId, 100),
    lastMessage: text(p.lastMessage, 2000),
    lastMessageAt: text(p.lastMessageAt, 40),
    notes: text(p.notes, 4000),
    status: status as Status,
    staff: text(p.staff, 80),
    service: text(p.service, 50),
    model: text(p.model, 50),
  };
}
export function validateAppointment(
  data: Data,
  p: Record<string, unknown>,
  id?: string,
) {
  const customerId = text(p.customerId);
  requireCustomer(data, customerId);
  const date = text(p.date),
    time = text(p.time),
    staff = text(p.staff, 80),
    duration = Number(p.duration ?? 60);
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !staff)
    throw Error("اختاري تاريخًا ووقتًا وموظفة بصورة صحيحة");
  if (!Number.isInteger(duration) || duration < 15 || duration > 240)
    throw Error("المدة من ١٥ إلى ٢٤٠ دقيقة");
  const minutes = (s: string) =>
    Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const start = minutes(time);
  if (start + duration > 1440) throw Error("الموعد يجب أن ينتهي في نفس اليوم");
  const status = text(p.status) || "مؤكد";
  if (!["مؤكد", "ملغي", "مكتمل"].includes(status))
    throw Error("حالة الموعد غير صحيحة");
  if (
    status !== "ملغي" &&
    data.appointments.some(
      (a) =>
        a.id !== id &&
        a.status !== "ملغي" &&
        a.date === date &&
        (a.staff === staff || a.customerId === customerId) &&
        start < minutes(a.time) + (a.duration || 60) &&
        start + duration > minutes(a.time),
    )
  )
    throw Error("الموعد يتعارض مع موعد آخر للموظفة أو العميلة");
  return {
    customerId,
    date,
    time,
    staff,
    duration,
    type: text(p.type, 80) || "قياس",
    notes: text(p.notes, 1000),
    status: status as Appointment["status"],
  };
}
export function seed(): Data {
  const date = cairoDate();
  return {
    customers: [
      {
        id: "demo-1",
        name: "عروس تجريبية ١",
        phone: "",
        channel: "Instagram",
        username: "demo.bride",
        metaContactId: "",
        lastMessage: "أرغب في حجز موعد خاص للقياس.",
        lastMessageAt: date,
        notes: "بيانات تجريبية فقط. تفضّل قصة A-Line.",
        status: "جديدة",
        staff: "فريق الأتيليه",
        service: "إيجار",
        model: "A-Line",
        createdAt: new Date().toISOString(),
      },
      {
        id: "demo-2",
        name: "عروس تجريبية ٢",
        phone: "",
        channel: "زيارة الأتيليه",
        username: "",
        metaContactId: "",
        lastMessage: "",
        lastMessageAt: "",
        notes: "بيانات تجريبية فقط.",
        status: "موعد مؤكد",
        staff: "فريق الأتيليه",
        service: "شراء",
        model: "Mermaid",
        createdAt: new Date().toISOString(),
      },
    ],
    appointments: [
      {
        id: "demo-appt",
        customerId: "demo-2",
        date,
        time: "14:00",
        duration: 60,
        staff: "فريق الأتيليه",
        type: "قياس أول",
        status: "مؤكد",
        notes: "",
      },
    ],
    followups: [
      {
        id: "demo-task",
        customerId: "demo-1",
        due: date,
        title: "تأكيد الموعد المناسب للقياس",
        staff: "فريق الأتيليه",
        done: false,
      },
    ],
    activity: [],
  };
}
