import {
  SheetCallError,
  sheetsEnabled,
  sheetCall,
  sheetMutation,
  sheetOperation,
  mapSheetData,
} from "@/lib/sheets";
import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/auth";
import { repository } from "@/lib/repository";
import {
  applyMutation,
  requestKey,
  DuplicateContactError,
} from "@/lib/mutations";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const user = await session();
  if (!user)
    return NextResponse.json({ error: "سجّلي الدخول أولًا" }, { status: 401 });
  try {
    const requestId = new URL(request.url).searchParams.get("requestId");
    if (requestId) {
      requestKey({ requestId });
      const status = sheetsEnabled()
        ? await sheetCall("request.status", { requestId }, user)
        : await repository().mutate((data) => {
            const saved = data.requests?.[requestId];
            return saved?.actor === (user.id || `${user.role}:${user.name}`)
              ? { state: "saved", ...saved.result }
              : { state: "not_found" };
          });
      return NextResponse.json(status, { headers });
    }
    const data = sheetsEnabled()
      ? mapSheetData(await sheetCall("read", {}, user))
      : await repository().read();
    // Durable request receipts are server-only, never part of the directory payload.
    const { requests: _receipts, ...publicData } = data;
    return NextResponse.json(publicData, { headers });
  } catch {
    console.error(JSON.stringify({ event: "crm.read.failure" }));
    return NextResponse.json(
      { error: "تعذّر قراءة البيانات؛ راجعي إعداد مصدر البيانات" },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  const user = await session();
  if (!user)
    return NextResponse.json(
      { error: "سجّلي الدخول أولًا", pending: false },
      { status: 401 },
    );
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "طلب غير مسموح", pending: false },
      { status: 403 },
    );
  let requestId = "",
    action = "",
    writing = false;
  const started = Date.now();
  try {
    const p = await request.json();
    action = [
      "customer.add",
      "customer.update",
      "appointment.save",
      "followup.add",
      "followup.complete",
    ].includes(p.action)
      ? p.action
      : "unsupported";
    if (p.action === "customer.update" && user.role !== "admin")
      return NextResponse.json(
        { error: "تعديل ملف العميلة متاح للمديرة فقط", pending: false },
        { status: 403 },
      );
    requestId = requestKey(p);
    console.info(
      JSON.stringify({ event: "crm.write.start", requestId, action }),
    );
    let result;
    if (sheetsEnabled()) {
      const operation = sheetOperation(p);
      writing = true;
      result = await sheetMutation(operation.method, operation.payload, user);
    } else {
      writing = true;
      result = await repository().mutate((data) =>
        applyMutation(data, p, user),
      );
    }
    console.info(
      JSON.stringify({
        event: "crm.write.saved",
        requestId,
        action,
        durationMs: Date.now() - started,
      }),
    );
    return NextResponse.json(result, { headers });
  } catch (error) {
    const existing =
      error instanceof DuplicateContactError
        ? error.existing
        : error instanceof SheetCallError
          ? error.existing
          : undefined;
    // I/O failures are uncertain. Validation errors are raised before the atomic save.
    const pending =
      error instanceof SheetCallError
        ? error.pending
        : writing && !!(error as NodeJS.ErrnoException)?.code;
    console.error(
      JSON.stringify({
        event: "crm.write.failure",
        requestId,
        action,
        code: existing ? "duplicate" : pending ? "uncertain" : "rejected",
        durationMs: Date.now() - started,
      }),
    );
    return NextResponse.json(
      {
        error: pending
          ? "تعذّر تأكيد الحفظ؛ تحققي من حالة الطلب قبل إعادة المحاولة"
          : error instanceof Error
            ? error.message
            : "تعذّر حفظ البيانات",
        pending: !!pending,
        existing,
      },
      { status: existing ? 409 : pending ? 503 : 400, headers },
    );
  }
}
