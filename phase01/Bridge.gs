/** Optional server-to-server bridge. Disabled until an administrator enables it.
 * No credentials in URLs, source, responses or logs. Requests are HMAC signed.
 */
var RB_RENDER_CONTEXT_ = null;
function RB_enableRenderBridge() {
  rbAdmin_();
  rbReady_();
  const props = rbProps_();
  let secret = props.getProperty("RB_RENDER_SECRET");
  if (!secret) {
    secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    props.setProperty("RB_RENDER_SECRET", secret);
  }
  if (!/^[a-f0-9]{64}$/.test(secret)) throw Error("Bridge secret must be 64 hex characters");
  props.setProperty("RB_RENDER_ENABLED", "true");
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput("<div dir='rtl'><p>انسخي القيمة إلى CRM_SHEETS_SECRET في Render فقط. لا ترسليها في المحادثة.</p><textarea readonly style='width:95%;height:80px'>" + secret + "</textarea><p>نشر الجسر: Execute as Me، والوصول Anyone. الطلبات تحتاج توقيعًا سريًا؛ GET لا يعرض بيانات.</p></div>").setWidth(560).setHeight(240),
    "Render bridge secret"
  );
  return { ok: true, secretShownPrivately: true };
}
function rbRenderSignature_(body, secret) {
  return Utilities.computeHmacSha256Signature(body, secret, Utilities.Charset.UTF_8)
    .map((b) => (b & 255).toString(16).padStart(2, "0")).join("");
}
function rbRenderEqual_(a, b) {
  if (typeof a !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < b.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function doPost(event) {
  let result;
  try {
    const props = rbProps_();
    const secret = props.getProperty("RB_RENDER_SECRET");
    if (props.getProperty("RB_RENDER_ENABLED") !== "true" || !/^[a-f0-9]{64}$/.test(secret || "")) throw Error("RB_BRIDGE_AUTH");
    const raw = event && event.postData && event.postData.contents;
    if (!raw || raw.length > 100000) throw Error("RB_BRIDGE_AUTH");
    const envelope = JSON.parse(raw);
    if (typeof envelope.body !== "string" || !rbRenderEqual_(envelope.signature, rbRenderSignature_(envelope.body, secret))) throw Error("RB_BRIDGE_AUTH");
    const request = JSON.parse(envelope.body);
    if (request.version !== 1 || !Number.isFinite(request.at) || Math.abs(Date.now() - request.at) > 120000 || !/^[a-zA-Z0-9_-]{16,100}$/.test(request.nonce || "")) throw Error("RB_BRIDGE_AUTH");
    const actor = request.actor;
    if (!actor || !["admin", "staff"].includes(actor.role) || typeof actor.id !== "string" || !/^[a-zA-Z0-9_.@-]{1,100}$/.test(actor.id) || !rbString_(actor.name, 120)) throw Error("RB_BRIDGE_AUTH");
    const owner = rbString_(Session.getEffectiveUser().getEmail(), 320).toLowerCase();
    if (!owner || owner !== props.getProperty("RB_ADMIN_EMAIL")) throw Error("RB_BRIDGE_OWNER");
    // Cache is best effort replay protection. Durable request IDs protect writes independently.
    rbLocked_(() => {
      const cache = CacheService.getScriptCache(), key = "render:" + request.nonce;
      if (cache.get(key)) throw Error("RB_BRIDGE_REPLAY");
      cache.put(key, "1", 300);
    });
    const methods = {
      read: RB_getData,
      "customer.add": RB_addCustomer,
      "customer.update": RB_updateCustomer,
      "appointment.add": RB_addAppointment,
      "appointment.update": RB_updateAppointment,
      "followup.add": RB_addFollowup,
      "followup.complete": RB_completeTask,
    };
    if (!Object.prototype.hasOwnProperty.call(methods, request.method)) throw Error("RB_BRIDGE_METHOD");
    if (request.method === "customer.update" && actor.role !== "admin") throw Error("RB_BRIDGE_FORBIDDEN");
    if (request.method !== "read" && (!request.payload || !/^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/.test(request.payload.requestId || ""))) throw Error("RB_BRIDGE_REQUEST_ID");
    RB_RENDER_CONTEXT_ = { owner: owner, actor: "Render/" + actor.id + " (" + actor.role + ")" };
    result = { ok: true, data: methods[request.method](request.payload) };
  } catch (error) {
    const message = String(error && error.message || "RB_BRIDGE_FAILED");
    result = { ok: false, error: message };
  } finally {
    RB_RENDER_CONTEXT_ = null;
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
