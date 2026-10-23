/** Schema contract: original columns remain in place; unknown columns are preserved. */
const RB = {
  CUSTOMERS: "العملاء",
  APPTS: "المواعيد",
  TASKS: "المتابعات",
  LOG: "سجل العمليات",
  ZONE: "Africa/Cairo",
};
const CHEAD = [
  "Customer ID",
  "الاسم",
  "رقم الهاتف",
  "تاريخ الفرح (أصلي)",
  "مكان السكن",
  "مصدر العميلة",
  "كود الفستان",
  "الملاحظات",
  "الموظفة",
  "حالة العميلة",
  "نوع الخدمة",
  "موديل الفستان",
  "تاريخ الإضافة",
  "آخر تعديل",
];
const AHEAD = [
  "Appointment ID",
  "Customer ID",
  "اسم العميلة",
  "التاريخ",
  "الوقت",
  "نوع الموعد",
  "الموظفة",
  "الحالة",
  "الملاحظات",
  "تاريخ الإنشاء",
];
const THEAD = [
  "Task ID",
  "Customer ID",
  "اسم العميلة",
  "المهمة",
  "الموظفة",
  "تاريخ الاستحقاق",
  "الحالة",
  "تاريخ الإنشاء",
];
const RB_SCHEMA = {
  customers: {
    name: RB.CUSTOMERS,
    aliases: ["Customers", "customers"],
    headers: CHEAD,
    extra: ["Last Request ID"],
    id: "Customer ID",
    fields: {
      id: "Customer ID",
      name: "الاسم",
      phone: "رقم الهاتف",
      wedding: "تاريخ الفرح (أصلي)",
      city: "مكان السكن",
      source: "مصدر العميلة",
      dress: "كود الفستان",
      notes: "الملاحظات",
      staff: "الموظفة",
      status: "حالة العميلة",
      service: "نوع الخدمة",
      model: "موديل الفستان",
      createdAt: "تاريخ الإضافة",
      updatedAt: "آخر تعديل",
    },
  },
  appointments: {
    name: RB.APPTS,
    aliases: ["Appointments", "appointments"],
    headers: AHEAD,
    extra: ["Last Request ID"],
    id: "Appointment ID",
    fields: {
      id: "Appointment ID",
      customerId: "Customer ID",
      name: "اسم العميلة",
      date: "التاريخ",
      time: "الوقت",
      type: "نوع الموعد",
      staff: "الموظفة",
      status: "الحالة",
      notes: "الملاحظات",
      createdAt: "تاريخ الإنشاء",
    },
  },
  tasks: {
    name: RB.TASKS,
    aliases: ["Follow-ups", "Tasks", "tasks"],
    headers: THEAD,
    extra: ["Last Request ID"],
    id: "Task ID",
    fields: {
      id: "Task ID",
      customerId: "Customer ID",
      name: "اسم العميلة",
      title: "المهمة",
      staff: "الموظفة",
      due: "تاريخ الاستحقاق",
      status: "الحالة",
      createdAt: "تاريخ الإنشاء",
    },
  },
  log: {
    name: RB.LOG,
    aliases: ["Activity Log"],
    headers: ["التاريخ", "العملية", "المرجع", "المستخدم"],
    extra: ["Request ID"],
  },
  requests: {
    name: "سجل الطلبات",
    aliases: [],
    headers: [
      "Request ID",
      "Action",
      "Entity ID",
      "Payload Hash",
      "State",
      "Created At",
      "Actor",
    ],
    extra: [],
  },
  settings: {
    name: "إعدادات النظام",
    aliases: ["Setup", "Settings"],
    headers: ["المفتاح", "القيمة", "الوصف"],
    extra: [],
  },
  lists: {
    name: "القوائم المنسدلة",
    aliases: ["Validation_Lists"],
    headers: [
      "المصادر",
      "حالات العميلات",
      "الخدمات",
      "الموديلات",
      "الموظفات",
      "أنواع المواعيد",
      "حالات المواعيد",
      "حالات المتابعات",
    ],
    extra: [],
  },
  dashboard: {
    name: "لوحة الإدارة",
    aliases: ["Dashboard"],
    headers: ["Metric ID", "المؤشر", "القيمة", "التعريف", "آخر تحديث"],
    extra: [],
  },
};
const RB_LISTS = {
  source: {
    header: "المصادر",
    entity: "customers",
    field: "source",
    range: "RB_SOURCE",
  },
  status: {
    header: "حالات العميلات",
    entity: "customers",
    field: "status",
    range: "RB_CUSTOMER_STATUS",
  },
  service: {
    header: "الخدمات",
    entity: "customers",
    field: "service",
    range: "RB_SERVICE",
  },
  model: {
    header: "الموديلات",
    entity: "customers",
    field: "model",
    range: "RB_MODEL",
  },
  staff: {
    header: "الموظفات",
    entity: "customers",
    field: "staff",
    range: "RB_STAFF",
  },
  appointmentType: {
    header: "أنواع المواعيد",
    entity: "appointments",
    field: "type",
    range: "RB_APPOINTMENT_TYPE",
  },
  appointmentStatus: {
    header: "حالات المواعيد",
    entity: "appointments",
    field: "status",
    range: "RB_APPOINTMENT_STATUS",
  },
  taskStatus: {
    header: "حالات المتابعات",
    entity: "tasks",
    field: "status",
    range: "RB_TASK_STATUS",
  },
};
const RB_DEFAULTS = {
  customerNew: [
    "جديدة",
    "حالة البداية الموروثة من الكود؛ راجعي توافقها مع القاموس الحالي",
  ],
  appointmentConfirmed: ["مؤكد", "حالة الموعد المحجوز"],
  appointmentCancelled: ["ملغي", "الموعد بهذه الحالة لا يحجز التوقيت"],
  taskOpen: ["جديدة", "حالة مهمة جديدة"],
  taskComplete: ["مكتملة", "حالة مهمة مكتملة"],
  appointmentDefaultType: [
    "زيارة",
    "نوع الموعد الافتراضي الموروث؛ يمكن تغييره",
  ],
  allowedEmails: [
    "",
    "بريد الموظفات المصرّح لهن، مفصول بفواصل؛ مديرة الإعداد مسموحة دائمًا",
  ],
};
function rbProps_() {
  return PropertiesService.getScriptProperties();
}
function rbString_(value, max) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .slice(0, max || 4000);
}
function rbSafe_(value) {
  const s = String(value === null || value === undefined ? "" : value);
  return /^[\s\u0000-\u001f]*[=+@-]/.test(s) ? "'" + s : s;
}
function rbActor_() {
  const email = rbString_(
    Session.getActiveUser().getEmail(),
    320,
  ).toLowerCase();
  if (!email)
    throw Error(
      "هوية Google غير متاحة. افتحي الواجهة بحساب مخوّل، وانشري التنفيذ بهوية المستخدم الذي يصل للتطبيق.",
    );
  return email;
}
function rbSpreadsheet_() {
  const id = rbProps_().getProperty("RB_SPREADSHEET_ID");
  if (!id)
    throw Error(
      "شغّلي RB_bindSpreadsheet من محرر المشروع المرتبط بالشيت أولًا.",
    );
  return SpreadsheetApp.openById(id);
}
function rbName_(key) {
  const raw = rbProps_().getProperty("RB_SHEET_MAP");
  const map = raw ? JSON.parse(raw) : {};
  return map[key] || RB_SCHEMA[key].name;
}
function rbTable_(key, optional) {
  const s = rbSpreadsheet_().getSheetByName(rbName_(key));
  if (!s) {
    if (optional) return null;
    throw Error("التبويب غير موجود: " + rbName_(key));
  }
  const count = s.getLastColumn();
  const heads = count
    ? s
        .getRange(1, 1, 1, count)
        .getDisplayValues()[0]
        .map((v) => rbString_(v))
    : [];
  const map = {};
  heads.forEach((h, i) => {
    if (h) {
      if (map[h] !== undefined)
        throw Error("عنوان عمود مكرر في " + s.getName() + ": " + h);
      map[h] = i;
    }
  });
  return { sheet: s, headers: heads, map: map };
}
function rbCheckTable_(key, table, withExtras) {
  const schema = RB_SCHEMA[key];
  const missing = schema.headers
    .concat(withExtras ? schema.extra : [])
    .filter((h) => table.map[h] === undefined);
  if (missing.length)
    throw Error(
      "مخطط غير متوافق في " + table.sheet.getName() + ": " + missing.join("، "),
    );
}
function rbRows_(key) {
  const t = rbTable_(key);
  rbCheckTable_(key, t, true);
  if (t.sheet.getLastRow() < 2) return [];
  const values = t.sheet
    .getRange(2, 1, t.sheet.getLastRow() - 1, t.headers.length)
    .getValues();
  return values
    .map((r, i) => {
      const raw = {};
      t.headers.forEach((h, j) => {
        if (h) raw[h] = r[j];
      });
      return { row: i + 2, raw: raw };
    })
    .filter((r) =>
      Object.keys(r.raw).some((k) => r.raw[k] !== "" && r.raw[k] !== null),
    );
}
function rbRecords_(key) {
  const fields = RB_SCHEMA[key].fields;
  return rbRows_(key).map((row) => {
    const out = {
      _row: row.row,
      _request: rbString_(row.raw["Last Request ID"]),
    };
    Object.keys(fields).forEach((field) => {
      const value = row.raw[fields[field]];
      if (value instanceof Date) {
        out[field] = Utilities.formatDate(
          value,
          rbSpreadsheet_().getSpreadsheetTimeZone(),
          field === "time"
            ? "HH:mm"
            : field === "date" || field === "due"
              ? "yyyy-MM-dd"
              : "yyyy-MM-dd'T'HH:mm:ssXXX",
        );
      } else out[field] = rbString_(value);
    });
    return out;
  });
}
function rbConfig_() {
  const c = {};
  rbRows_("settings").forEach((r) => {
    const key = rbString_(r.raw["المفتاح"]);
    if (c[key] !== undefined) throw Error("إعداد مكرر: " + key);
    c[key] = rbString_(r.raw["القيمة"]);
  });
  Object.keys(RB_DEFAULTS).forEach((k) => {
    if (!c[k]) {
      if (k === "allowedEmails") c[k] = "";
      else throw Error("إعداد مطلوب: " + k);
    }
  });
  const lists = {};
  const rows = rbRows_("lists");
  Object.keys(RB_LISTS).forEach((k) => {
    lists[k] = [
      ...new Set(
        rows.map((r) => rbString_(r.raw[RB_LISTS[k].header])).filter(Boolean),
      ),
    ];
  });
  return { values: c, lists: lists };
}
function rbAuthorize_() {
  const actor = rbActor_();
  if (actor === rbProps_().getProperty("RB_ADMIN_EMAIL")) return actor;
  const table = rbTable_("settings", true);
  if (!table) throw Error("حساب غير مصرح");
  const allowed = rbConfig_()
    .values.allowedEmails.split(/[,;\n]/)
    .map((v) => v.trim().toLowerCase());
  if (allowed.indexOf(actor) < 0) throw Error("حساب غير مصرح");
  return actor;
}
function rbAdmin_() {
  const actor = rbActor_();
  if (actor !== rbProps_().getProperty("RB_ADMIN_EMAIL"))
    throw Error("هذه العملية لمديرة الإعداد فقط");
  return actor;
}
function rbLocked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
function rbReady_() {
  Object.keys(RB_SCHEMA).forEach((k) => rbCheckTable_(k, rbTable_(k), true));
  if (rbSpreadsheet_().getSpreadsheetTimeZone() !== RB.ZONE)
    throw Error(
      "راجعي المنطقة الزمنية للشيت؛ يجب أن تكون Africa/Cairo. لا نغير توقيت بيانات موجودة تلقائيًا.",
    );
}
function rbFind_(key, id) {
  const records = rbRecords_(key).filter((r) => r.id === id);
  if (records.length !== 1)
    throw Error(
      records.length
        ? "معرّف مكرر؛ يلزم تدقيق البيانات"
        : "السجل غير موجود: " + id,
    );
  return records[0];
}
function rbDateValid_(s) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
function rbToday_() {
  return Utilities.formatDate(new Date(), RB.ZONE, "yyyy-MM-dd");
}
function rbPhone_(value) {
  return rbString_(value, 100)
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[\s().-]/g, "")
    .replace(/^00/, "+");
}
function rbChoice_(config, key, value, old) {
  if (
    value &&
    config.lists[key].length &&
    config.lists[key].indexOf(value) < 0 &&
    value !== old
  )
    throw Error("قيمة غير موجودة في قائمة " + RB_LISTS[key].header);
  return value;
}
function rbHash_(value) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(value),
    ),
  ).replace(/=+$/, "");
}
function rbCanonical_(value) {
  if (Array.isArray(value)) return value.map(rbCanonical_);
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((k) => {
        if (k !== "requestId") out[k] = rbCanonical_(value[k]);
      });
    return out;
  }
  return value;
}
function rbPlan_(key, row, patch, requestId) {
  const t = rbTable_(key);
  let values = new Array(t.headers.length).fill("");
  if (row) {
    const range = t.sheet.getRange(row, 1, 1, t.headers.length);
    const old = range.getValues()[0],
      formulas = range.getFormulas()[0];
    values = old.map(
      (v, i) => formulas[i] || (typeof v === "string" ? rbSafe_(v) : v),
    );
  }
  Object.keys(patch).forEach((h) => {
    if (t.map[h] === undefined) throw Error("عمود غير موجود: " + h);
    const old = values[t.map[h]];
    if (
      old instanceof Date && patch[h] instanceof Date
        ? old.getTime() !== patch[h].getTime()
        : String(old) !== String(patch[h])
    )
      values[t.map[h]] = patch[h];
  });
  if (requestId) values[t.map["Last Request ID"]] = requestId;
  return {
    table: t,
    row: row || Math.max(2, t.sheet.getLastRow() + 1),
    values: values,
  };
}
function rbApply_(plan) {
  const s = plan.table.sheet;
  if (plan.row > s.getMaxRows())
    s.insertRowsAfter(s.getMaxRows(), plan.row - s.getMaxRows());
  if (plan.values.length > s.getMaxColumns())
    s.insertColumnsAfter(
      s.getMaxColumns(),
      plan.values.length - s.getMaxColumns(),
    );
  plan.table.sheet
    .getRange(plan.row, 1, 1, plan.values.length)
    .setValues([plan.values]);
  SpreadsheetApp.flush();
}
function rbAppend_(key, object) {
  rbApply_(rbPlan_(key, null, object, null));
}
