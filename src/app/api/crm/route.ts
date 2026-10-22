import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { session, sameOrigin } from "@/lib/auth";
import { repository } from "@/lib/repository";
import {
  requireCustomer,
  text,
  validDate,
  validateCustomer,
  validateAppointment,
} from "@/lib/domain";
export const runtime = "nodejs";
export async function GET() {
  if (!(await session()))
    return NextResponse.json({ error: "سجّلي الدخول أولًا" }, { status: 401 });
  try {
    return NextResponse.json(await repository().read(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "تعذّر قراءة البيانات؛ راجعي إعداد مصدر البيانات" },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  const user = await session();
  if (!user)
    return NextResponse.json({ error: "سجّلي الدخول أولًا" }, { status: 401 });
  if (!sameOrigin(request))
    return NextResponse.json({ error: "طلب غير مسموح" }, { status: 403 });
  try {
    const p = await request.json();
    if (p.action === "customer.update" && user.role !== "admin")
      return NextResponse.json(
        { error: "تعديل ملف العميلة متاح للمديرة فقط" },
        { status: 403 },
      );
    const result = await repository().mutate((data) => {
      let customerId = "",
        message = "";
      const id = randomUUID();
      if (p.action === "customer.add") {
        const customer = {
          ...validateCustomer(data, p),
          id,
          createdAt: new Date().toISOString(),
        };
        data.customers.unshift(customer);
        customerId = id;
        message = "إضافة ملف عميلة";
      } else if (p.action === "customer.update") {
        const c = requireCustomer(data, text(p.id));
        Object.assign(c, validateCustomer(data, p, c.id));
        customerId = c.id;
        message = "تعديل ملف العميلة";
      } else if (p.action === "appointment.save") {
        const existing = p.id
          ? data.appointments.find((a) => a.id === p.id)
          : undefined;
        if (p.id && !existing) throw Error("الموعد غير موجود");
        const appointment = {
          ...validateAppointment(data, p, existing?.id),
          id: existing?.id || id,
        };
        if (existing) Object.assign(existing, appointment);
        else data.appointments.push(appointment);
        customerId = appointment.customerId;
        message = existing ? "تعديل موعد" : "حجز موعد";
      } else if (p.action === "followup.add") {
        customerId = text(p.customerId);
        requireCustomer(data, customerId);
        const title = text(p.title, 500),
          due = text(p.due);
        if (!title || !validDate(due))
          throw Error("اكتبي المهمة وتاريخ المتابعة");
        data.followups.push({
          id,
          customerId,
          title,
          due,
          staff: text(p.staff, 80) || user.name,
          done: false,
        });
        message = "إضافة متابعة";
      } else if (p.action === "followup.complete") {
        const task = data.followups.find((t) => t.id === p.id);
        if (!task) throw Error("المتابعة غير موجودة");
        task.done = true;
        customerId = task.customerId;
        message = "إكمال متابعة";
      } else throw Error("عملية غير مدعومة");
      data.activity.unshift({
        id: randomUUID(),
        customerId,
        at: new Date().toISOString(),
        actor: user.name,
        text: message,
      });
      return { ok: true, id };
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "تعذّر حفظ البيانات" },
      { status: 400 },
    );
  }
}
