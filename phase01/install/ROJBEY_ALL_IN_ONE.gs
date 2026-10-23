/** ROJBEY consolidated Apps Script. Use INSTEAD OF the separate .gs files.
 * Keep Index.html separately. Start on a private test copy. Bridge disabled by default.
 * Never install both combined and separate sources in the same project. */

// ===== Schema.gs =====
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
    extra: [
      "قناة التواصل",
      "Meta Contact ID",
      "Username",
      "آخر رسالة",
      "تاريخ آخر رسالة",
      "Last Request ID",
    ],
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
      channel: "قناة التواصل",
      metaContactId: "Meta Contact ID",
      username: "Username",
      lastMessage: "آخر رسالة",
      lastMessageAt: "تاريخ آخر رسالة",
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
    aliases: ["Validation_Lists", "القوائم والإعدادات"],
    headers: [
      "المصادر",
      "حالات العميلات",
      "الخدمات",
      "الموديلات",
      "الموظفات",
      "أنواع المواعيد",
      "حالات المواعيد",
      "حالات المتابعات",
      "قنوات التواصل",
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
  channel: {
    header: "قنوات التواصل",
    entity: "customers",
    field: "channel",
    range: "RB_CHANNEL",
  },
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
  taskCancelled: ["", "حالة متابعة ملغاة اختيارية؛ لا تُحسب مفتوحة أو متأخرة"],
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
  if (typeof RB_RENDER_CONTEXT_ !== "undefined" && RB_RENDER_CONTEXT_) return RB_RENDER_CONTEXT_.owner;
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
function rbProfile_() {
  return rbProps_().getProperty("RB_WORKBOOK_PROFILE") === "rojbey-2026-export";
}
function rbHeader_(key, header) {
  const raw = rbProps_().getProperty("RB_LIST_HEADER_MAP");
  return key === "lists" && raw ? JSON.parse(raw)[header] || header : header;
}
function rbHeaders_(key) {
  return RB_SCHEMA[key].headers.map((h) => rbHeader_(key, h));
}
function rbListHeader_(key) {
  return rbHeader_("lists", RB_LISTS[key].header);
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
  const missing = rbHeaders_(key)
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
      if (k === "allowedEmails" || k === "taskCancelled") c[k] = "";
      else throw Error("إعداد مطلوب: " + k);
    }
  });
  const lists = {};
  const rows = rbRows_("lists");
  Object.keys(RB_LISTS).forEach((k) => {
    lists[k] = [
      ...new Set(
        rows.map((r) => rbString_(r.raw[rbListHeader_(k)])).filter(Boolean),
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
    rbProfile_() &&
    key === "staff" &&
    value &&
    value !== old &&
    !config.lists.staff.length
  )
    throw Error(
      "قائمة الموظفات المعتمدات فارغة. راجعي الأسماء التاريخية وأضيفي الأسماء المعتمدة يدويًا قبل الإسناد.",
    );
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

function rbTaskOpen_(task, config) {
  return (
    task.status !== config.values.taskComplete &&
    (!config.values.taskCancelled ||
      task.status !== config.values.taskCancelled)
  );
}


// ===== Workbook.gs =====
/** Explicit opt-in profile for the inspected XLSX structure. Contains no customer data. */
const RB_OBSERVED_CATALOG_HEADERS = [
  "مصدر العميلة",
  "نوع الخدمة",
  "موديل الفستان",
  "حالة العميلة",
  "نوع الموعد",
  "حالة الموعد",
  "حالة المتابعة",
  "حالة الفستان",
  "حالة الدفع",
  "قناة التواصل",
];
const RB_OBSERVED_HEADER_MAP = {
  المصادر: "مصدر العميلة",
  "حالات العميلات": "حالة العميلة",
  الخدمات: "نوع الخدمة",
  الموديلات: "موديل الفستان",
  "أنواع المواعيد": "نوع الموعد",
  "حالات المواعيد": "حالة الموعد",
  "حالات المتابعات": "حالة المتابعة",
  "قنوات التواصل": "قناة التواصل",
};
function RB_configureObservedWorkbook() {
  rbAdmin_();
  return rbLocked_(() => {
    const ss = rbSpreadsheet_();
    const catalog = ss.getSheetByName("القوائم والإعدادات");
    if (!catalog)
      throw Error("تبويب القوائم والإعدادات غير موجود؛ لا ينطبق ملف التعريف.");
    const heads = catalog
      .getRange(1, 1, 1, catalog.getLastColumn())
      .getDisplayValues()[0]
      .map((v) => rbString_(v));
    if (RB_OBSERVED_CATALOG_HEADERS.some((h) => heads.indexOf(h) < 0))
      throw Error(
        "عناوين القوائم مختلفة عن النسخة المفحوصة. راجعي المخطط قبل الربط.",
      );
    const customers = rbTable_("customers");
    const required = CHEAD.concat([
      "قناة التواصل",
      "Meta Contact ID",
      "Username",
      "آخر رسالة",
      "تاريخ آخر رسالة",
    ]);
    if (required.some((h) => customers.map[h] === undefined))
      throw Error("مخطط العميلات مختلف عن النسخة المفحوصة.");
    const properties = rbProps_();
    const raw = properties.getProperty("RB_SHEET_MAP");
    const map = raw ? JSON.parse(raw) : {};
    if (map.lists && map.lists !== "القوائم والإعدادات")
      throw Error("توجد خريطة قوائم أخرى؛ لم يتم استبدالها.");
    const previous = properties.getProperty("RB_LIST_HEADER_MAP");
    if (
      previous &&
      JSON.stringify(JSON.parse(previous)) !==
        JSON.stringify(RB_OBSERVED_HEADER_MAP)
    )
      throw Error("توجد خريطة أعمدة أخرى؛ راجعيها يدويًا.");
    map.lists = "القوائم والإعدادات";
    properties.setProperty("RB_SHEET_MAP", JSON.stringify(map));
    properties.setProperty(
      "RB_LIST_HEADER_MAP",
      JSON.stringify(RB_OBSERVED_HEADER_MAP),
    );
    properties.setProperty("RB_WORKBOOK_PROFILE", "rojbey-2026-export");
    return {
      ok: true,
      sheetValuesChanged: false,
      catalog: "القوائم والإعدادات",
      note: "ملف التعريف مضبوط فقط. يلزم تدقيق حي ونسخة احتياطية متحققة قبل RB_setup. أسماء الموظفات التاريخية لا تُعتمد تلقائيًا.",
    };
  });
}
function rbCheckPreflight_(key, table) {
  if (!rbProfile_() || key !== "lists") return rbCheckTable_(key, table, false);
  const missing = rbHeaders_(key).filter(
    (h) => h !== "الموظفات" && table.map[h] === undefined,
  );
  if (missing.length)
    throw Error("مخطط القوائم غير متوافق: " + missing.join("، "));
}


// ===== Setup.gs =====
/** Read-only audit, verified backup, conservative schema preparation and dropdowns. */
function rbSnapshot_(ss) {
  return {
    timezone: ss.getSpreadsheetTimeZone(),
    sheets: ss.getSheets().map((sheet) => {
      const range = sheet.getDataRange(),
        values = range.getValues(),
        formulas = range.getFormulas(),
        validations = range.getDataValidations();
      return {
        name: sheet.getName(),
        rows: sheet.getLastRow(),
        columns: sheet.getLastColumn(),
        cells: values.map((r, i) =>
          r.map((v, j) =>
            formulas[i][j]
              ? { formula: formulas[i][j] }
              : v instanceof Date
                ? { date: v.toISOString() }
                : v,
          ),
        ),
        validations: validations.map((r) =>
          r.map((v) =>
            v
              ? {
                  type: String(v.getCriteriaType()),
                  allow: v.getAllowInvalid(),
                  values: v.getCriteriaValues().map((x) =>
                    x && typeof x.getA1Notation === "function"
                      ? {
                          sheet: x.getSheet().getName(),
                          range: x.getA1Notation(),
                        }
                      : x instanceof Date
                        ? x.toISOString()
                        : x,
                  ),
                }
              : null,
          ),
        ),
      };
    }),
    namedRanges: ss
      .getNamedRanges()
      .map((n) => ({
        name: n.getName(),
        sheet: n.getRange().getSheet().getName(),
        range: n.getRange().getA1Notation(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
function rbFingerprint_(ss) {
  return rbHash_(rbSnapshot_(ss));
}
function RB_createBackup() {
  rbAdmin_();
  return rbLocked_(() => {
    const ss = rbSpreadsheet_(),
      before = rbFingerprint_(ss);
    const copy = ss.copy(
      "ROJBEY Backup " +
        Utilities.formatDate(new Date(), RB.ZONE, "yyyy-MM-dd HH-mm-ss"),
    );
    const after = rbFingerprint_(ss),
      copied = rbFingerprint_(copy);
    if (before !== after || before !== copied)
      throw Error(
        "تم إنشاء نسخة لكن التحقق لم يكتمل؛ لا تشغّلي setup. توقفي عن التعديل أثناء النسخ وأعيدي المحاولة.",
      );
    rbProps_().setProperty(
      "RB_BACKUP",
      JSON.stringify({
        id: copy.getId(),
        fingerprint: before,
        createdAt: new Date().toISOString(),
      }),
    );
    return {
      ok: true,
      backupId: copy.getId(),
      verified: true,
      verifiedScope:
        "cell values, formulas, timezone, sheet names, validations, named ranges",
    };
  });
}
function rbRequireBackup_() {
  const ss = rbSpreadsheet_();
  if (
    !ss.getSheets().some((s) => s.getLastRow() > 0) &&
    !ss.getNamedRanges().length
  )
    return;
  const raw = rbProps_().getProperty("RB_BACKUP");
  if (!raw)
    throw Error(
      "يلزم تشغيل RB_createBackup والتحقق من نسخة حديثة قبل تغيير المخطط أو إعداد القوائم.",
    );
  const backup = JSON.parse(raw);
  if (
    backup.id === ss.getId() ||
    rbFingerprint_(ss) !== backup.fingerprint ||
    rbFingerprint_(SpreadsheetApp.openById(backup.id)) !== backup.fingerprint
  )
    throw Error(
      "النسخة الاحتياطية لا تطابق الحالة الحالية. أنشئي نسخة جديدة مع إيقاف التعديلات مؤقتًا.",
    );
}
function rbExisting_(key) {
  const t = rbTable_(key, true);
  if (!t || t.sheet.getLastRow() < 2) return [];
  rbCheckTable_(key, t, false);
  const rows = t.sheet
    .getRange(2, 1, t.sheet.getLastRow() - 1, t.headers.length)
    .getValues();
  return rows.map((row) => {
    const out = {};
    t.headers.forEach((h, i) => {
      out[h] = row[i];
    });
    return out;
  });
}
function rbPreflight_() {
  const ss = rbSpreadsheet_();
  const targets = Object.keys(RB_SCHEMA).map(rbName_);
  if (new Set(targets).size !== targets.length)
    throw Error(
      "خريطة التبويبات تربط جدولين بنفس التبويب؛ توقفي وراجعي RB_SHEET_MAP",
    );
  Object.keys(RB_SCHEMA).forEach((key) => {
    const t = rbTable_(key, true);
    if (t && t.sheet.getLastRow() > 0) rbCheckPreflight_(key, t);
    const aliases = [RB_SCHEMA[key].name]
      .concat(RB_SCHEMA[key].aliases)
      .filter((name) => name !== rbName_(key) && ss.getSheetByName(name));
    if (aliases.length)
      throw Error(
        "يوجد تبويب مكافئ محتمل: " +
          aliases.join("، ") +
          ". راجعي التدقيق واضبطي RB_SHEET_MAP بدل إنشاء نسخة مكررة.",
      );
  });
  if (
    ss.getSpreadsheetTimeZone() !== RB.ZONE &&
    ss.getSheets().some((s) => s.getLastRow() > 0)
  )
    throw Error(
      "توقيت الشيت الحالي ليس Africa/Cairo. يلزم مراجعة أثر تغييره على التواريخ أولًا؛ لم يتم تعديل الملف.",
    );
}
function RB_audit() {
  rbAdmin_();
  const ss = rbSpreadsheet_();
  const sheets = ss.getSheets().map((s) => {
    const range = s.getDataRange(),
      values = range.getValues(),
      formulas = range.getFormulas(),
      validations = range.getDataValidations();
    const headers = s.getLastColumn()
      ? s.getRange(1, 1, 1, s.getLastColumn()).getDisplayValues()[0]
      : [];
    const dup = headers.filter((h, i) => h && headers.indexOf(h) !== i);
    const typeCounts = { text: 0, number: 0, date: 0, boolean: 0, blank: 0 };
    values.slice(1).forEach((r) =>
      r.forEach((v) => {
        typeCounts[
          v instanceof Date
            ? "date"
            : v === ""
              ? "blank"
              : typeof v === "number"
                ? "number"
                : typeof v === "boolean"
                  ? "boolean"
                  : "text"
        ]++;
      }),
    );
    return {
      name: s.getName(),
      dataRows: Math.max(0, s.getLastRow() - 1),
      headers: headers,
      duplicateHeaders: [...new Set(dup)],
      formulaCells: formulas.reduce((n, r) => n + r.filter(Boolean).length, 0),
      validatedCells: validations.reduce(
        (n, r) => n + r.filter(Boolean).length,
        0,
      ),
      types: typeCounts,
    };
  });
  const schema = Object.keys(RB_SCHEMA).map((key) => {
    try {
      const t = rbTable_(key, true);
      return {
        key: key,
        name: rbName_(key),
        exists: !!t,
        missing: t
          ? rbHeaders_(key).filter((h) => t.map[h] === undefined)
          : rbHeaders_(key),
        extraRequired: t
          ? RB_SCHEMA[key].extra.filter((h) => t.map[h] === undefined)
          : RB_SCHEMA[key].extra,
        possibleAliases: RB_SCHEMA[key].aliases.filter((n) =>
          ss.getSheetByName(n),
        ),
      };
    } catch (error) {
      return { key: key, name: rbName_(key), error: error.message };
    }
  });
  return {
    readOnly: true,
    dataQuality: rbQualityAudit_(),
    timezone: ss.getSpreadsheetTimeZone(),
    sheets: sheets,
    schema: schema,
    namedRanges: ss.getNamedRanges().map((n) => ({
      name: n.getName(),
      sheet: n.getRange().getSheet().getName(),
      range: n.getRange().getA1Notation(),
    })),
    projectTriggers: ScriptApp.getProjectTriggers().map((t) => ({
      handler: t.getHandlerFunction(),
      event: String(t.getEventType()),
    })),
    note: "لا يتضمن التقرير قيم عميلات؛ مراجعة معاني الأعمدة والقوائم ومسارات البيع والإيجار مطلوبة قبل التشغيل.",
  };
}
function RB_showAudit() {
  const text = JSON.stringify(RB_audit(), null, 2);
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(
      '<html dir="rtl"><body><h2>تدقيق للقراءة فقط</h2><pre dir="ltr" id="report"></pre><script>document.getElementById("report").textContent=' +
        JSON.stringify(text).replace(/</g, "\\u003c") +
        ";</script></body></html>",
    )
      .setWidth(800)
      .setHeight(550),
    "ROJBEY Audit",
  );
}
function RB_setup() {
  const actor = rbAdmin_();
  return rbLocked_(() => {
    rbPreflight_();
    rbRequireBackup_();
    const ss = rbSpreadsheet_();
    const observed = {};
    Object.keys(RB_LISTS).forEach((k) => {
      const spec = RB_LISTS[k],
        field = RB_SCHEMA[spec.entity].fields[spec.field];
      observed[k] = [
        ...new Set(
          rbExisting_(spec.entity)
            .map((r) => rbString_(r[field]))
            .filter(Boolean),
        ),
      ];
    });
    observed.staff = [
      ...new Set(
        observed.staff
          .concat(
            rbExisting_("appointments").map((r) => rbString_(r["الموظفة"])),
            rbExisting_("tasks").map((r) => rbString_(r["الموظفة"])),
          )
          .filter(Boolean),
      ),
    ];
    if (!ss.getSheets().some((s) => s.getLastRow() > 0))
      ss.setSpreadsheetTimeZone(RB.ZONE);
    Object.keys(RB_SCHEMA).forEach((key) => {
      const schema = RB_SCHEMA[key];
      let t = rbTable_(key, true);
      if (!t) {
        ss.insertSheet(rbName_(key));
        t = rbTable_(key);
      }
      if (t.sheet.getLastRow() === 0)
        t.sheet
          .getRange(1, 1, 1, rbHeaders_(key).length)
          .setValues([rbHeaders_(key)]);
      t = rbTable_(key);
      (rbProfile_() && key === "lists"
        ? schema.extra.concat("الموظفات")
        : schema.extra
      ).forEach((h) => {
        if (t.map[h] === undefined) {
          if (t.headers.length + 1 > t.sheet.getMaxColumns())
            t.sheet.insertColumnsAfter(t.sheet.getMaxColumns(), 1);
          t.sheet.getRange(1, t.headers.length + 1).setValue(h);
          t = rbTable_(key);
        }
      });
      const s = t.sheet;
      if (s.getMaxRows() < 2)
        s.insertRowsAfter(s.getMaxRows(), 2 - s.getMaxRows());
      s.setFrozenRows(1);
      s.setRightToLeft(true);
      s.getRange(1, 1, 1, t.headers.length)
        .setBackground("#16171C")
        .setFontColor("#F7F3EA")
        .setFontWeight("bold");
      s.setColumnWidths(1, t.headers.length, 160);
      s.getRange(2, 1, s.getMaxRows() - 1, t.headers.length).setWrapStrategy(
        SpreadsheetApp.WrapStrategy.CLIP,
      );
      s.setRowHeightsForced(2, s.getMaxRows() - 1, 26);
      if (!s.getFilter())
        s.getRange(1, 1, s.getMaxRows(), t.headers.length).createFilter();
      if (schema.fields) {
        ["id", "customerId", "phone"]
          .filter((f) => schema.fields[f])
          .forEach((f) =>
            s
              .getRange(2, t.map[schema.fields[f]] + 1, s.getMaxRows() - 1, 1)
              .setNumberFormat("@"),
          );
        const internal = t.map["Last Request ID"];
        if (internal !== undefined) s.hideColumns(internal + 1);
      }
    });
    const ls = rbTable_("lists"),
      settings = rbTable_("settings"),
      currentSettings = rbRows_("settings");
    const settingsMap = {
      customerNew: "status",
      appointmentConfirmed: "appointmentStatus",
      appointmentCancelled: "appointmentStatus",
      taskOpen: "taskStatus",
      taskComplete: "taskStatus",
      taskCancelled: "taskStatus",
      appointmentDefaultType: "appointmentType",
    };
    Object.keys(RB_LISTS).forEach((k) => {
      const col = ls.map[rbListHeader_(k)];
      if (
        ls.sheet.getLastRow() < 2 ||
        !ls.sheet
          .getRange(2, col + 1, ls.sheet.getMaxRows() - 1, 1)
          .getDisplayValues()
          .some((r) => rbString_(r[0]))
      ) {
        const values = rbProfile_() && k === "staff" ? [] : observed[k].slice();
        if (!values.length) {
          Object.keys(settingsMap)
            .filter((s) => settingsMap[s] === k)
            .forEach((s) => {
              if (RB_DEFAULTS[s][0] && values.indexOf(RB_DEFAULTS[s][0]) < 0)
                values.push(RB_DEFAULTS[s][0]);
            });
        }
        if (values.length)
          ls.sheet
            .getRange(2, col + 1, values.length, 1)
            .setValues(values.map((v) => [rbSafe_(v)]));
      }
    });
    Object.keys(RB_DEFAULTS).forEach((k) => {
      if (!currentSettings.some((r) => r.raw["المفتاح"] === k)) {
        const listKey = settingsMap[k],
          defaultValue =
            rbProfile_() && k === "appointmentDefaultType"
              ? "زيارة أولى"
              : rbProfile_() && k === "taskCancelled"
                ? "ملغاة"
                : RB_DEFAULTS[k][0];
        const options = listKey
          ? ls.sheet
              .getRange(
                2,
                ls.map[rbListHeader_(listKey)] + 1,
                ls.sheet.getMaxRows() - 1,
                1,
              )
              .getDisplayValues()
              .map((r) => rbString_(r[0]))
          : [];
        rbAppend_("settings", {
          المفتاح: k,
          القيمة:
            listKey && options.indexOf(defaultValue) < 0 ? "" : defaultValue,
          الوصف: RB_DEFAULTS[k][1],
        });
      }
    });
    const validations = rbValidation_();
    let needsConfiguration = [];
    try {
      rbConfig_();
      rbDashboard_();
    } catch (error) {
      needsConfiguration = [String(error.message)];
    }
    rbLog_("تجهيز النظام بعد نسخة احتياطية", "setup", actor, "");
    return {
      ok: true,
      needsConfiguration: needsConfiguration,
      missingLists: validations.missingLists,
      note: "لم يتم تعديل أو دمج سجلات العميلات الأصلية. راجعي تقرير التدقيق والقوائم قبل التشغيل.",
    };
  });
}
function rbValidation_() {
  const ss = rbSpreadsheet_(),
    table = rbTable_("lists"),
    named = ss.getNamedRanges();
  const bindings = [];
  Object.keys(RB_LISTS).forEach((k) => {
    const spec = RB_LISTS[k],
      col = table.map[rbListHeader_(k)] + 1;
    const values = table.sheet
      .getRange(2, col, table.sheet.getMaxRows() - 1, 1)
      .getDisplayValues();
    let end = 0;
    values.forEach((r, i) => {
      if (rbString_(r[0])) end = i + 1;
    });
    if (!end) return;
    const range = table.sheet.getRange(2, col, end, 1);
    const existing = named.find((n) => n.getName() === spec.range);
    if (
      existing &&
      (existing.getRange().getSheet().getName() !== table.sheet.getName() ||
        existing.getRange().getColumn() !== col ||
        existing.getRange().getRow() !== 2 ||
        existing.getRange().getNumColumns() !== 1)
    )
      throw Error("Named Range موجود لغرض آخر: " + spec.range);
    bindings.push({ key: k, spec: spec, range: range });
  });
  bindings.forEach((b) => {
    ss.setNamedRange(b.spec.range, b.range);
    const validation = SpreadsheetApp.newDataValidation()
      .requireValueInRange(b.range, true)
      .setAllowInvalid(true)
      .setHelpText(
        "القائمة من " +
          table.sheet.getName() +
          ". القيم التاريخية محفوظة؛ الواجهة تتحقق من القيم الجديدة.",
      )
      .build();
    const targets = [{ key: b.spec.entity, field: b.spec.field }];
    if (b.key === "staff")
      targets.push(
        { key: "appointments", field: "staff" },
        { key: "tasks", field: "staff" },
      );
    targets.forEach((target) => {
      const t = rbTable_(target.key);
      t.sheet
        .getRange(
          2,
          t.map[RB_SCHEMA[target.key].fields[target.field]] + 1,
          t.sheet.getMaxRows() - 1,
          1,
        )
        .setDataValidation(validation);
    });
  });
  return {
    listsConfigured: bindings.map((b) => b.key),
    missingLists: Object.keys(RB_LISTS).filter(
      (k) => !bindings.some((b) => b.key === k),
    ),
  };
}
function RB_refreshValidation() {
  const actor = rbAdmin_();
  return rbLocked_(() => {
    rbPreflight_();
    rbRequireBackup_();
    const result = rbValidation_();
    rbLog_("تحديث القوائم المنسدلة", "validation", actor, "");
    return Object.assign({ ok: true }, result);
  });
}
/** Metadata-only quality checks that also work before adding internal columns. */
function rbQualityAudit_() {
  try {
    const customers = rbExisting_("customers"),
      appointments = rbExisting_("appointments"),
      tasks = rbExisting_("tasks");
    const ids = customers
      .map((r) => rbString_(r["Customer ID"]))
      .filter(Boolean);
    const phones = customers
      .map((r) => rbPhone_(r["رقم الهاتف"]))
      .filter(Boolean);
    const duplicateGroups = (values) =>
      new Set(values.filter((v, i) => values.indexOf(v) !== i)).size;
    return {
      customersWithoutIds: customers.filter((r) => !rbString_(r["Customer ID"]))
        .length,
      duplicateCustomerIdGroups: duplicateGroups(ids),
      duplicatePhoneGroups: duplicateGroups(phones),
      numericPhoneCells: customers.filter(
        (r) => typeof r["رقم الهاتف"] === "number",
      ).length,
      orphanAppointments: appointments.filter(
        (r) => ids.indexOf(rbString_(r["Customer ID"])) < 0,
      ).length,
      orphanTasks: tasks.filter(
        (r) => ids.indexOf(rbString_(r["Customer ID"])) < 0,
      ).length,
      note: "أعداد فقط؛ لا تصحيح أو حذف أو دمج تلقائي، ولا استدلال على كود البلد.",
    };
  } catch (error) {
    return { incomplete: true, error: error.message };
  }
}


// ===== Code.gs =====
/** Operational Phase 01 extension. All writes target the explicitly bound spreadsheet. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("ROJBEY CRM")
    .addItem("فتح CRM داخل الشيت", "RB_openSidebar")
    .addItem("تدقيق بدون تعديل", "RB_showAudit")
    .addSeparator()
    .addItem("ربط المشروع بالشيت الحالي", "RB_bindSpreadsheet")
    .addItem("إنشاء نسخة احتياطية والتحقق منها", "RB_createBackup")
    .addItem("تجهيز النظام بعد التدقيق", "RB_setup")
    .addItem("تحديث القوائم المنسدلة", "RB_refreshValidation")
    .addItem("تحديث لوحة الإدارة", "RB_refreshDashboard")
    .addItem("اعتماد صف عميلة محدد", "RB_adoptSelectedCustomer")
    .addToUi();
}
function doGet() {
  if (rbProps_().getProperty("RB_RENDER_ENABLED") === "true")
    return HtmlService.createHtmlOutput("ROJBEY server bridge. Open the CRM on Render.");
  return rbHtml_();
}
function rbHtml_() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("ROJBEY | Bridal CRM")
    .addMetaTag("viewport", "width=device-width,initial-scale=1");
}
function RB_openSidebar() {
  SpreadsheetApp.getUi().showSidebar(rbHtml_());
}
function RB_bindSpreadsheet() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw Error("شغّلي الربط من مشروع Apps Script المرتبط بالشيت.");
  const actor = rbActor_(),
    props = rbProps_();
  if (
    props.getProperty("RB_ADMIN_EMAIL") &&
    props.getProperty("RB_ADMIN_EMAIL") !== actor
  )
    throw Error("الربط لمديرة الإعداد فقط");
  if (
    props.getProperty("RB_SPREADSHEET_ID") &&
    props.getProperty("RB_SPREADSHEET_ID") !== active.getId()
  )
    throw Error("المشروع مربوط بملف آخر؛ لا نبدّل بيانات التشغيل تلقائيًا");
  props.setProperty("RB_SPREADSHEET_ID", active.getId());
  props.setProperty("RB_ADMIN_EMAIL", actor);
  return { ok: true };
}
function RB_health() {
  rbAuthorize_();
  const s = rbSpreadsheet_();
  return {
    ok: true,
    bound: true,
    name: s.getName(),
    timezone: s.getSpreadsheetTimeZone(),
    configured: Object.keys(RB_SCHEMA).every(
      (k) => !!s.getSheetByName(rbName_(k)),
    ),
  };
}
function rbLog_(action, id, actor, requestId) {
  if (
    requestId &&
    rbRows_("log").some((r) => r.raw["Request ID"] === requestId)
  )
    return;
  rbAppend_("log", {
    التاريخ: new Date(),
    العملية: rbSafe_(action),
    المرجع: rbSafe_(id),
    المستخدم: rbSafe_(actor),
    "Request ID": requestId || "",
  });
}
function rbWrite_(action, p, planner) {
  const authorized = rbAuthorize_();
  const actor = typeof RB_RENDER_CONTEXT_ !== "undefined" && RB_RENDER_CONTEXT_ ? RB_RENDER_CONTEXT_.actor : authorized;
  return rbLocked_(() => {
    rbReady_();
    if (!p || typeof p !== "object") throw Error("طلب غير صحيح");
    const requestId = rbString_(p.requestId || Utilities.getUuid(), 100);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/.test(requestId))
      throw Error("Request ID غير صحيح");
    if (
      ["إضافة عميلة", "حجز موعد", "إضافة متابعة"].includes(action) &&
      p.id !== undefined
    )
      throw Error("المعرّف الجديد يولّده النظام؛ لا ترسلي id عند الإضافة");
    const hash = rbHash_(rbCanonical_(p));
    const entries = rbRows_("requests");
    const matches = entries.filter((r) => r.raw["Request ID"] === requestId);
    if (matches.length > 1) throw Error("سجل طلبات غير سليم");
    let entry = matches[0];
    if (
      entry &&
      (entry.raw.Action !== action ||
        entry.raw["Payload Hash"] !== hash ||
        entry.raw.Actor !== actor)
    )
      throw Error("Request ID مستخدم لعملية مختلفة");
    if (entry && !["DONE", "PENDING"].includes(entry.raw.State))
      throw Error("حالة طلب غير صالحة؛ يلزم تدقيق سجل الطلبات");
    if (entry && entry.raw.State === "DONE")
      return {
        ok: true,
        id: rbString_(entry.raw["Entity ID"]),
        replayed: true,
      };
    if (
      entries.some(
        (r) => r.raw.State === "PENDING" && r.raw["Request ID"] !== requestId,
      )
    )
      throw Error(
        "توجد عملية معلّقة. أعيدي نفس الطلب الأصلي أو اتبعي إجراء الاستعادة قبل عمليات جديدة.",
      );
    const id = entry
      ? rbString_(entry.raw["Entity ID"])
      : p.id
        ? rbString_(p.id)
        : "RB-" + Utilities.getUuid();
    const prepared = planner(id, requestId);
    if (prepared.alreadyComplete && !entry)
      return { ok: true, id: prepared.existingId || id, alreadyComplete: true };
    if (!entry) {
      rbAppend_("requests", {
        "Request ID": requestId,
        Action: action,
        "Entity ID": rbSafe_(id),
        "Payload Hash": rbSafe_(hash),
        State: "PENDING",
        "Created At": new Date(),
        Actor: actor,
      });
      entry = rbRows_("requests").find(
        (r) => r.raw["Request ID"] === requestId,
      );
    }
    try {
      if (prepared.plan) rbApply_(prepared.plan);
      rbLog_(action, id, actor, requestId);
      const table = rbTable_("requests");
      table.sheet.getRange(entry.row, table.map.State + 1).setValue("DONE");
      SpreadsheetApp.flush();
    } catch (error) {
      throw Error(
        "RB_PENDING: قد تكون الكتابة تمت. لا تعيدي إدخال السجل. أعيدي الطلب بنفس Request ID: " +
          requestId,
      );
    }
    let warning = "";
    try {
      rbDashboard_();
    } catch (error) {
      warning = "تم حفظ العملية؛ تحديث لوحة الإدارة يحتاج إعادة المحاولة.";
    }
    return { ok: true, id: id, requestId: requestId, warning: warning };
  });
}
function rbCustomerPatch_(p, old, config) {
  const patch = {};
  const fields = RB_SCHEMA.customers.fields;
  [
    "name",
    "phone",
    "wedding",
    "city",
    "source",
    "dress",
    "notes",
    "staff",
    "status",
    "service",
    "model",
    "channel",
    "metaContactId",
    "username",
    "lastMessage",
    "lastMessageAt",
  ].forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(p, k)) {
      const value = rbString_(
        p[k],
        k === "notes"
          ? 4000
          : k === "lastMessage"
            ? 2000
            : k === "name"
              ? 120
              : 200,
      );
      if (
        ["source", "staff", "status", "service", "model", "channel"].indexOf(
          k,
        ) >= 0
      )
        rbChoice_(config, k, value, old && old[k]);
      if (!old || value !== old[k]) patch[fields[k]] = rbSafe_(value);
    }
  });
  const name = p.name !== undefined ? rbString_(p.name, 120) : old && old.name;
  if (!name) throw Error("اسم العميلة مطلوب");
  const phone =
    p.phone !== undefined ? rbString_(p.phone, 100) : old && old.phone;
  const normalized = rbPhone_(phone);
  const phoneChanged =
    !old || (p.phone !== undefined && rbString_(p.phone, 100) !== old.phone);
  if (phoneChanged && phone && !/^\+?\d{7,15}$/.test(normalized))
    throw Error(
      "رقم الهاتف غير صحيح؛ لن نخمن كود البلد أو نصحّح سجلًا قديمًا تلقائيًا",
    );
  if (phoneChanged && normalized) {
    const duplicate = rbRecords_("customers").filter(
      (c) => c.id !== (old && old.id) && rbPhone_(c.phone) === normalized,
    );
    if (duplicate.length && !p.confirmSeparateCustomer)
      throw Error(
        "RB_DUPLICATE: نفس الهاتف موجود في السجل " +
          (duplicate[0].id || "صف بلا معرّف") +
          ". افتحي السجل أولًا. إذا كانت عميلة مختلفة فعلًا، أكدي إنشاء سجل مستقل.",
      );
    if (duplicate.length && p.confirmSeparateCustomer !== true)
      throw Error("تأكيد السجل المستقل غير صحيح");
  }
  return patch;
}
function RB_addCustomer(p) {
  return rbWrite_("إضافة عميلة", p, (id, requestId) => {
    const old = rbRecords_("customers").find((c) => c.id === id);
    if (old) {
      if (old._request === requestId) return {};
      throw Error("معرّف عميلة موجود مسبقًا");
    }
    const config = rbConfig_();
    const patch = rbCustomerPatch_(p, null, config);
    patch["Customer ID"] = id;
    patch["حالة العميلة"] =
      patch["حالة العميلة"] ||
      rbSafe_(rbChoice_(config, "status", config.values.customerNew));
    patch["تاريخ الإضافة"] = new Date();
    patch["آخر تعديل"] = new Date();
    return { plan: rbPlan_("customers", null, patch, requestId) };
  });
}
function RB_updateCustomer(p) {
  if (!p || !p.id) throw Error("Customer ID مطلوب");
  return rbWrite_("تعديل عميلة", p, (id, requestId) => {
    const c = rbFind_("customers", id);
    if (c._request === requestId) return {};
    const patch = rbCustomerPatch_(p, c, rbConfig_());
    patch["آخر تعديل"] = new Date();
    return { plan: rbPlan_("customers", c._row, patch, requestId) };
  });
}
function RB_addAppointment(p) {
  return rbAppointment_("حجز موعد", p, false);
}
function RB_updateAppointment(p) {
  if (!p || !p.id) throw Error("Appointment ID مطلوب");
  return rbAppointment_("تعديل موعد", p, true);
}
function rbAppointment_(action, p, editing) {
  return rbWrite_(action, p, (id, requestId) => {
    const old = rbRecords_("appointments").find((a) => a.id === id);
    if (old && old._request === requestId) return {};
    if (editing && !old) throw Error("الموعد غير موجود");
    if (!editing && old) throw Error("معرّف موعد موجود");
    const c = rbFind_("customers", rbString_(p.customerId));
    const config = rbConfig_();
    const date = rbString_(p.date),
      time = rbString_(p.time),
      staff = rbChoice_(
        config,
        "staff",
        rbString_(p.staff || c.staff),
        old && old.staff,
      ),
      type = rbChoice_(
        config,
        "appointmentType",
        rbString_(p.type || config.values.appointmentDefaultType),
        old && old.type,
      ),
      status = rbChoice_(
        config,
        "appointmentStatus",
        rbString_(p.status || config.values.appointmentConfirmed),
        old && old.status,
      );
    if (
      !rbDateValid_(date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      !staff
    )
      throw Error("التاريخ والوقت والموظفة مطلوبون بقيم صحيحة");
    if (
      status !== config.values.appointmentCancelled &&
      rbRecords_("appointments").some(
        (a) =>
          a.id !== id &&
          a.date === date &&
          a.time === time &&
          (a.staff === staff || a.customerId === c.id) &&
          a.status !== config.values.appointmentCancelled,
      )
    )
      throw Error("يوجد موعد لنفس الموظفة أو العميلة في نفس التوقيت");
    const patch = {
      "Appointment ID": rbSafe_(id),
      "Customer ID": rbSafe_(c.id),
      "اسم العميلة": rbSafe_(c.name),
      التاريخ: date,
      الوقت: time,
      "نوع الموعد": rbSafe_(type),
      الموظفة: rbSafe_(staff),
      الحالة: rbSafe_(status),
      الملاحظات: rbSafe_(rbString_(p.notes, 1500)),
    };
    if (!old) patch["تاريخ الإنشاء"] = new Date();
    return { plan: rbPlan_("appointments", old && old._row, patch, requestId) };
  });
}
function RB_addFollowup(p) {
  return rbWrite_("إضافة متابعة", p, (id, requestId) => {
    const old = rbRecords_("tasks").find((t) => t.id === id);
    if (old && old._request === requestId) return {};
    if (old) throw Error("معرّف متابعة موجود");
    const c = rbFind_("customers", rbString_(p.customerId));
    const config = rbConfig_(),
      title = rbString_(p.title, 1000),
      due = rbString_(p.due),
      staff = rbChoice_(config, "staff", rbString_(p.staff || c.staff));
    if (!title || !rbDateValid_(due) || !staff)
      throw Error("المهمة والتاريخ والموظفة مطلوبون");
    return {
      plan: rbPlan_(
        "tasks",
        null,
        {
          "Task ID": rbSafe_(id),
          "Customer ID": rbSafe_(c.id),
          "اسم العميلة": rbSafe_(c.name),
          المهمة: rbSafe_(title),
          الموظفة: rbSafe_(staff),
          "تاريخ الاستحقاق": due,
          الحالة: rbSafe_(
            rbChoice_(config, "taskStatus", config.values.taskOpen),
          ),
          "تاريخ الإنشاء": new Date(),
        },
        requestId,
      ),
    };
  });
}
function RB_completeTask(input) {
  const p = typeof input === "string" ? { id: input } : input;
  if (!p || !p.id) throw Error("Task ID مطلوب");
  return rbWrite_("إكمال متابعة", p, (id, requestId) => {
    const t = rbFind_("tasks", id);
    if (t._request === requestId) return {};
    const taskConfig = rbConfig_();
    const done = taskConfig.values.taskComplete;
    if (
      taskConfig.values.taskCancelled &&
      t.status === taskConfig.values.taskCancelled
    )
      throw Error("المتابعة ملغاة؛ لا يتم تحويلها إلى مكتملة تلقائيًا");
    if (t.status === done) return { alreadyComplete: true };
    return {
      plan: rbPlan_("tasks", t._row, { الحالة: rbSafe_(done) }, requestId),
    };
  });
}
function RB_getData() {
  rbAuthorize_();
  return rbLocked_(() => {
    rbReady_();
    const config = rbConfig_(),
      customers = rbRecords_("customers"),
      appointments = rbRecords_("appointments"),
      tasks = rbRecords_("tasks"),
      today = rbToday_();
    const invalidDates =
      appointments.filter((a) => !rbDateValid_(a.date)).length +
      tasks.filter((t) => !rbDateValid_(t.due)).length;
    const linked = new Set(customers.map((c) => c.id).filter(Boolean));
    const publicRows = (rows) =>
      rows.map((row) => {
        const out = Object.assign({}, row);
        delete out._row;
        delete out._request;
        return out;
      });
    return {
      customers: publicRows(customers),
      appointments: publicRows(appointments),
      tasks: publicRows(tasks),
      activity: rbRows_("log").map((r) => ({
        at:
          r.raw["التاريخ"] instanceof Date
            ? r.raw["التاريخ"].toISOString()
            : rbString_(r.raw["التاريخ"]),
        action: rbString_(r.raw["العملية"]),
        id: rbString_(r.raw["المرجع"]),
        actor: rbString_(r.raw["المستخدم"]),
      })),
      config: config,
      today: today,
      stats: Object.assign(
        {
          appointments: appointments.length,
          tasks: tasks.filter((t) => rbTaskOpen_(t, config)).length,
        },
        rbMetrics_(customers, appointments, tasks, config, today),
      ),
      warnings: {
        customersWithoutIds: customers.filter((c) => !c.id).length,
        duplicateCustomerIds: new Set(
          customers
            .filter(
              (c, i) => c.id && customers.findIndex((x) => x.id === c.id) !== i,
            )
            .map((c) => c.id),
        ).size,
        invalidDates: invalidDates,
        orphanAppointments: appointments.filter(
          (a) => !linked.has(a.customerId),
        ).length,
        orphanTasks: tasks.filter((t) => !linked.has(t.customerId)).length,
      },
      source: "Google Sheets",
      profile: rbProfile_(),
    };
  });
}
function rbMetrics_(customers, appointments, tasks, config, today) {
  const done = config.values.taskComplete,
    cancelled = config.values.appointmentCancelled;
  return {
    customers: customers.length,
    newInquiries: customers.filter(
      (c) => c.status === config.values.customerNew,
    ).length,
    appointmentsToday: appointments.filter(
      (a) => a.date === today && a.status !== cancelled,
    ).length,
    upcomingAppointments: appointments.filter(
      (a) => rbDateValid_(a.date) && a.date > today && a.status !== cancelled,
    ).length,
    openTasks: tasks.filter((t) => rbTaskOpen_(t, config)).length,
    tasksToday: tasks.filter((t) => rbTaskOpen_(t, config) && t.due === today)
      .length,
    overdueTasks: tasks.filter(
      (t) => rbTaskOpen_(t, config) && rbDateValid_(t.due) && t.due < today,
    ).length,
    completedTasks: tasks.filter((t) => t.status === done).length,
    cancelledTasks: config.values.taskCancelled
      ? tasks.filter((t) => t.status === config.values.taskCancelled).length
      : 0,
  };
}
function rbDashboard_() {
  const config = rbConfig_(),
    customers = rbRecords_("customers"),
    appointments = rbRecords_("appointments"),
    tasks = rbRecords_("tasks");
  const metrics = rbMetrics_(
    customers,
    appointments,
    tasks,
    config,
    rbToday_(),
  );
  const labels = {
    customers: "إجمالي العميلات",
    newInquiries: "استفسارات بالحالة الجديدة",
    appointmentsToday: "مواعيد اليوم",
    upcomingAppointments: "مواعيد بعد اليوم",
    openTasks: "متابعات مفتوحة",
    tasksToday: "متابعات اليوم",
    overdueTasks: "متابعات متأخرة",
    completedTasks: "متابعات مكتملة",
    cancelledTasks: "متابعات ملغاة",
  };
  const rows = Object.keys(metrics).map((k) => ({
    id: k,
    label: labels[k],
    value: metrics[k],
    definition:
      k === "newInquiries"
        ? "عدد الحالة " +
          config.values.customerNew +
          " حاليًا؛ ليس تقرير فترة تاريخية"
        : "من سجلات الشيت الحالي؛ التواريخ Africa/Cairo",
  }));
  ["source", "status"].forEach((field) => {
    const counts = {};
    customers.forEach((c) => {
      const value = c[field] || "غير مسجل";
      counts[value] = (counts[value] || 0) + 1;
    });
    Object.keys(counts).forEach((v) =>
      rows.push({
        id: field + ":" + v,
        label: (field === "source" ? "المصدر: " : "الحالة: ") + v,
        value: counts[v],
        definition: "عدد العميلات الحالي حسب القيمة المسجلة",
      }),
    );
  });
  const current = rbRows_("dashboard");
  current
    .filter(
      (r) =>
        /^(source|status):/.test(rbString_(r.raw["Metric ID"])) &&
        !rows.some((m) => m.id === r.raw["Metric ID"]),
    )
    .forEach((r) =>
      rows.push({
        id: r.raw["Metric ID"],
        label: r.raw["المؤشر"],
        value: 0,
        definition: "لا توجد سجلات حالية لهذه القيمة",
      }),
    );
  rows.forEach((m) => {
    const prior = current.find((r) => r.raw["Metric ID"] === m.id);
    rbApply_(
      rbPlan_(
        "dashboard",
        prior && prior.row,
        {
          "Metric ID": rbSafe_(m.id),
          المؤشر: rbSafe_(m.label),
          القيمة: m.value,
          التعريف: rbSafe_(m.definition),
          "آخر تحديث": new Date(),
        },
        null,
      ),
    );
  });
}
function RB_refreshDashboard() {
  const actor = rbAuthorize_();
  return rbLocked_(() => {
    rbReady_();
    rbDashboard_();
    rbLog_("تحديث لوحة الإدارة", "dashboard", actor, "");
    return { ok: true };
  });
}
function RB_adoptSelectedCustomer() {
  rbAuthorize_();
  const s = rbSpreadsheet_(),
    range = s.getActiveRange();
  if (
    !range ||
    range.getSheet().getName() !== rbName_("customers") ||
    range.getRow() < 2 ||
    range.getNumRows() !== 1
  )
    throw Error("حددي صف عميلة واحدًا في تبويب العملاء");
  const row = range.getRow();
  const response = SpreadsheetApp.getUi().alert(
    "اعتماد صف عميلة",
    "سيُضاف معرّف ثابت لهذا الصف فقط، مع الحفاظ على بقية الحقول. لا يتم دمج بيانات. هل تتابعين؟",
    SpreadsheetApp.getUi().ButtonSet.YES_NO,
  );
  if (response !== SpreadsheetApp.getUi().Button.YES)
    return { ok: false, cancelled: true };
  return rbWrite_(
    "اعتماد صف عميلة",
    { row: row, requestId: Utilities.getUuid() },
    (id, requestId) => {
      const c = rbRecords_("customers").find((v) => v._row === row);
      if (!c) throw Error("الصف فارغ");
      if (c.id) return { alreadyComplete: true, existingId: c.id };
      rbCustomerPatch_(c, null, rbConfig_());
      const patch = { "Customer ID": id, "آخر تعديل": new Date() };
      return { plan: rbPlan_("customers", row, patch, requestId) };
    },
  );
}
/** Admin recovery only when the entity proves the primary write already committed. */
function RB_recoverPending(requestId) {
  const actor = rbAdmin_();
  return rbLocked_(() => {
    rbReady_();
    const matches = rbRows_("requests").filter(
      (r) => r.raw["Request ID"] === requestId,
    );
    if (matches.length !== 1) throw Error("طلب غير موجود أو مكرر");
    const entry = matches[0];
    if (entry.raw.State === "DONE") return { ok: true, replayed: true };
    if (entry.raw.State !== "PENDING") throw Error("حالة غير متوقعة");
    const kinds = {
      "إضافة عميلة": "customers",
      "تعديل عميلة": "customers",
      "اعتماد صف عميلة": "customers",
      "حجز موعد": "appointments",
      "تعديل موعد": "appointments",
      "إضافة متابعة": "tasks",
      "إكمال متابعة": "tasks",
    };
    const key = kinds[entry.raw.Action];
    if (!key) throw Error("نوع عملية غير معروف");
    const record = rbFind_(key, entry.raw["Entity ID"]);
    if (record._request !== requestId)
      throw Error(
        "لا يوجد دليل كافٍ على اكتمال الكتابة. لم يُحذف أو يُعتمد الطلب؛ أعيدي الطلب الأصلي أو قارني النسخة الاحتياطية بمساعدة المسؤول.",
      );
    rbLog_(entry.raw.Action, record.id, entry.raw.Actor, requestId);
    const table = rbTable_("requests");
    table.sheet.getRange(entry.row, table.map.State + 1).setValue("DONE");
    rbLog_("استعادة عملية معلقة", record.id, actor, "");
    rbDashboard_();
    return { ok: true, id: record.id };
  });
}


// ===== Bridge.gs =====
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
