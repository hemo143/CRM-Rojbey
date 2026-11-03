// No optimistic claim of failure after a write: reconcile using its durable request ID.
export type SavePayload = Record<string, unknown> & { requestId: string };
export class SaveError extends Error {
  pending: boolean;
  existing?: { id: string; name: string; phone: string };
  constructor(
    message: string,
    pending: boolean,
    existing?: SaveError["existing"],
  ) {
    super(message);
    this.pending = pending;
    this.existing = existing;
  }
}
export async function saveRecord(
  payload: SavePayload,
  transport: typeof fetch = fetch,
) {
  let response: Response | undefined;
  try {
    response = await transport("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(75000),
    });
    const body = await response.json();
    if (response.ok && body.ok === true) return body;
    if (body.pending === false)
      throw new SaveError(
        "فشل الحفظ — لم يتم إنشاء أو تعديل أي سجل. " + (body.error || ""),
        false,
        body.existing,
      );
  } catch (error) {
    if (error instanceof SaveError) throw error;
  }
  // A timeout, dropped response, malformed reply, or proxy error is not proof of failure.
  try {
    const check = await transport(
      `/api/crm?requestId=${encodeURIComponent(payload.requestId)}`,
      { cache: "no-store", signal: AbortSignal.timeout(45000) },
    );
    const result = await check.json();
    if (check.ok && result.state === "saved")
      return { ok: true, id: result.id, reconciled: true };
  } catch {
    /* The original key remains pinned until resolved. */
  }
  throw new SaveError(
    "تعذّر تأكيد الحفظ بعد. تحققي أو أعيدي نفس الطلب بأمان؛ لا تدخلي السجل مرة أخرى.",
    true,
  );
}
