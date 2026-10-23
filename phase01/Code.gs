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
