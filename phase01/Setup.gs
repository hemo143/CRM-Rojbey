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
