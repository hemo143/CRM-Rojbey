const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const { mocks } = require("./google-mocks.cjs");
const root = path.resolve(__dirname, "..");
function setup(prepare) {
  const { db, context } = mocks();
  vm.createContext(context);
  for (const name of ["Schema.gs", "Setup.gs", "Code.gs"])
    vm.runInContext(fs.readFileSync(path.join(root, name), "utf8"), context, {
      filename: name,
    });
  context.RB_bindSpreadsheet();
  if (prepare) prepare(db, context);
  context.RB_setup();
  return { db, c: context };
}
function add(c, p = {}) {
  return c.RB_addCustomer({
    name: "Synthetic test customer",
    phone: "٠١٠ ١٢٣٤ ٥٦٧٨",
    staff: "Test staff",
    requestId: "customer-request-001",
    ...p,
  });
}
function appointment(c, customerId, p = {}) {
  return c.RB_addAppointment({
    customerId,
    date: "2026-11-01",
    time: "12:00",
    staff: "Test staff",
    type: "زيارة",
    requestId: "appt-request-001",
    ...p,
  });
}
function task(c, customerId, p = {}) {
  return c.RB_addFollowup({
    customerId,
    title: "Synthetic test task",
    staff: "Test staff",
    due: "2026-01-01",
    requestId: "task-request-001",
    ...p,
  });
}
function raw(db, sheet, row, col) {
  return db.active.getSheetByName(sheet).getRange(row, col).getValue();
}
function legacy(db, c) {
  const headers = vm.runInContext("CHEAD", c);
  const sheet = db.active.insertSheet("العملاء");
  sheet
    .getRange(1, 1, 1, headers.length + 1)
    .setValues([[...headers, "حقل أصلي إضافي"]]);
  sheet
    .getRange(2, 1, 1, headers.length + 1)
    .setValues([
      [
        "legacy-id",
        "Historical customer",
        "01000000000",
        "raw original date",
        "Original city",
        "Existing source",
        "Existing-code",
        "Original notes",
        "Existing staff",
        "جديدة",
        "Existing service",
        "Existing model",
        "Historical date",
        "Historical change",
        "=1+1",
      ],
    ]);
}
test("empty setup: schema contract, no seed customers, idempotent headers and no triggers", () => {
  const { db, c } = setup();
  assert.equal(c.RB_getData().customers.length, 0);
  const n = db.active.sheets.length;
  c.RB_createBackup();
  c.RB_setup();
  assert.equal(db.active.sheets.length, n);
  assert.equal(db.active.getSheetByName("العملاء").getLastColumn(), 15);
  assert.equal(c.RB_audit().projectTriggers.length, 0);
});
test("non-empty setup requires a verified backup and preserves values/formulas/extra columns", () => {
  const { db, context } = mocks();
  vm.createContext(context);
  for (const f of ["Schema.gs", "Setup.gs", "Code.gs"])
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), context);
  const c = context;
  c.RB_bindSpreadsheet();
  legacy(db, c);
  const original = db.active
    .getSheetByName("العملاء")
    .getRange(2, 1, 1, 15)
    .getValues()[0];
  assert.throws(() => c.RB_setup(), /RB_createBackup/);
  assert.equal(db.active.sheets.length, 2);
  const backup = c.RB_createBackup();
  assert.equal(backup.verified, true);
  c.RB_setup();
  assert.deepEqual(
    db.active.getSheetByName("العملاء").getRange(2, 1, 1, 15).getValues()[0],
    original,
  );
  assert.equal(
    db.active.getSheetByName("العملاء").getRange(2, 15).getFormulas()[0][0],
    "=1+1",
  );
  assert.equal(db.active.getSheetByName("العملاء").getLastColumn(), 16);
});
test("stale backup cannot authorize setup; unknown schema or likely equivalent tab stops without changes", () => {
  const { db, c } = setup();
  c.RB_createBackup();
  db.active.getSheetByName("العملاء").getRange(2, 2).setValue("External edit");
  assert.throws(() => c.RB_setup(), /لا تطابق/);
  const first = mocks();
  vm.createContext(first.context);
  for (const f of ["Schema.gs", "Setup.gs", "Code.gs"])
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), first.context);
  first.context.RB_bindSpreadsheet();
  first.db.active.insertSheet("Customers");
  const n = first.db.active.sheets.length;
  assert.throws(() => first.context.RB_setup(), /مكافئ/);
  assert.equal(first.db.active.sheets.length, n);
});
test("required customer name, phone normalization, duplicate decision and no silent merge", () => {
  const { c } = setup();
  assert.throws(() => add(c, { name: "" }), /مطلوب/);
  const first = add(c);
  assert.ok(first.id.startsWith("RB-"));
  assert.throws(
    () => add(c, { requestId: "customer-request-002", phone: "010-1234-5678" }),
    /RB_DUPLICATE/,
  );
  const second = add(c, {
    requestId: "customer-request-003",
    phone: "010-1234-5678",
    confirmSeparateCustomer: true,
  });
  assert.notEqual(first.id, second.id);
  assert.equal(c.RB_getData().customers.length, 2);
});
test("customer edit preserves identity, created timestamp, unknown formula and original phone display", () => {
  const { db, c } = setup((db, c) => {
    legacy(db, c);
    c.RB_createBackup();
  });
  const before = c.RB_getData().customers[0];
  c.RB_updateCustomer({
    id: "legacy-id",
    notes: "Updated test note",
    requestId: "update-request-001",
  });
  const after = c.RB_getData().customers[0];
  assert.equal(after.id, before.id);
  assert.equal(after.createdAt, before.createdAt);
  assert.equal(after.phone, "01000000000");
  assert.equal(
    db.active.getSheetByName("العملاء").getRange(2, 15).getFormulas()[0][0],
    "=1+1",
  );
  assert.equal(after.notes, "Updated test note");
});
test("validation objects in the local Google mock cover existing and empty rows and configurable lists accept valid/reject invalid values", () => {
  const { db, c } = setup((db, c) => {
    legacy(db, c);
    c.RB_createBackup();
  });
  const t = db.active.getSheetByName("العملاء");
  assert.ok(t.getRange(2, 6).getDataValidations()[0][0]);
  assert.ok(t.getRange(50, 6).getDataValidations()[0][0]);
  assert.ok(db.active.getNamedRanges().find((n) => n.name === "RB_SOURCE"));
  assert.throws(
    () => add(c, { source: "Unsupported source", staff: "Existing staff" }),
    /قائمة/,
  );
  const id = add(c, { source: "Existing source", staff: "Existing staff" }).id;
  assert.ok(id);
});
test("appointments reference customer IDs, reject invalid IDs/time/date and equal-slot conflicts, cancelled slot is reusable", () => {
  const { c } = setup(),
    id = add(c).id;
  assert.throws(() => appointment(c, "absent"), /غير موجود/);
  assert.throws(() => appointment(c, id, { date: "2026-02-30" }), /التاريخ/);
  assert.throws(() => appointment(c, id, { time: "25:00" }), /التاريخ/);
  const appt = appointment(c, id);
  assert.throws(
    () => appointment(c, id, { requestId: "appt-request-002" }),
    /موعد/,
  );
  c.RB_updateAppointment({
    id: appt.id,
    customerId: id,
    date: "2026-11-01",
    time: "12:00",
    staff: "Test staff",
    status: "ملغي",
    type: "زيارة",
    requestId: "appt-edit-request-001",
  });
  appointment(c, id, { requestId: "appt-request-003" });
  appointment(c, id, { requestId: "appt-request-004", time: "13:00" });
  assert.equal(c.RB_getData().appointments.length, 3);
});
test("follow-up preserves relationship, classifies overdue, and completion retains history without duplicate logs", () => {
  const { c } = setup(),
    id = add(c).id;
  const created = task(c, id);
  assert.throws(
    () => task(c, id, { requestId: "task-request-bad", due: "not-a-date" }),
    /التاريخ/,
  );
  let d = c.RB_getData();
  assert.equal(d.stats.overdueTasks, 1);
  assert.equal(d.tasks[0].customerId, id);
  c.RB_completeTask({ id: created.id, requestId: "complete-task-001" });
  d = c.RB_getData();
  assert.equal(d.tasks.length, 1);
  assert.equal(d.stats.completedTasks, 1);
  assert.equal(d.stats.overdueTasks, 0);
  const count = d.activity.length;
  c.RB_completeTask({ id: created.id, requestId: "complete-task-002" });
  assert.equal(c.RB_getData().activity.length, count);
});
test("idempotency replays completed operations and rejects reusing request ID with different payload", () => {
  const { c } = setup();
  const a = add(c),
    b = add(c);
  assert.equal(a.id, b.id);
  assert.equal(b.replayed, true);
  assert.equal(c.RB_getData().customers.length, 1);
  assert.throws(() => add(c, { name: "different" }), /عملية مختلفة/);
});
test("failure after primary write recovers without duplicating entity or audit; unrelated writes are blocked", () => {
  const { db, c } = setup();
  db.failure = (r, s) =>
    r.sheet.name === "العملاء" && r.row === 2 && s === "after";
  assert.throws(() => add(c), /RB_PENDING/);
  assert.throws(
    () => add(c, { requestId: "customer-request-other" }),
    /معلّقة/,
  );
  const result = add(c);
  assert.ok(result.id);
  const data = c.RB_getData();
  assert.equal(data.customers.length, 1);
  assert.equal(
    data.activity.filter((a) => a.action === "إضافة عميلة").length,
    1,
  );
  assert.equal(db.held, false);
});
test("audit-log failure recovers with same request ID; exact task retry does not duplicate tasks", () => {
  const { db, c } = setup(),
    id = add(c).id;
  db.failure = (r, s) => r.sheet.name === "سجل العمليات" && s === "before";
  assert.throws(() => task(c, id), /RB_PENDING/);
  const a = task(c, id),
    b = task(c, id);
  assert.equal(a.id, b.id);
  assert.equal(c.RB_getData().tasks.length, 1);
  assert.equal(
    c.RB_getData().activity.filter((a) => a.action === "إضافة متابعة").length,
    1,
  );
});
test("formula injection including leading whitespace/control, minus, plus and @ is stored as text", () => {
  const { db, c } = setup();
  for (const [i, value] of [
    '=IMPORTXML("x")',
    " -1+1",
    "\t@SUM(1)",
    "+danger",
  ].entries()) {
    add(c, { name: value, phone: "", requestId: "injection-request-" + i });
  }
  const t = db.active.getSheetByName("العملاء");
  assert.ok(
    t
      .getRange(2, 2, 4, 1)
      .getFormulas()
      .every((r) => r[0] === ""),
  );
  assert.equal(c.RB_getData().customers.length, 4);
});
test("read operations do not set up schema or write logs, and anonymous/unauthorized users fail closed", () => {
  const { db, c } = setup();
  const before = c.RB_getData().activity.length;
  c.RB_health();
  c.RB_getData();
  assert.equal(c.RB_getData().activity.length, before);
  db.actor = "other@example.test";
  assert.throws(() => c.RB_getData(), /مصرح/);
  db.actor = "";
  assert.throws(() => c.RB_getData(), /هوية/);
});
test("script lock serializes script writes and is released on validation errors; real Google concurrency remains untested", () => {
  const { db, c } = setup();
  assert.throws(() => add(c, { name: "" }));
  assert.equal(db.held, false);
  db.held = true;
  assert.throws(() => add(c), /contention/);
  db.held = false;
  add(c);
  assert.ok(db.lockCount > 1);
});
test("dashboard upserts correct known metrics and zeroes disappeared groups", () => {
  const { db, c } = setup(),
    id = add(c).id;
  task(c, id);
  const rows = db.active
    .getSheetByName("لوحة الإدارة")
    .getDataRange()
    .getValues();
  const map = new Map(rows.slice(1).map((r) => [r[0], r[2]]));
  assert.equal(map.get("customers"), 1);
  assert.equal(map.get("overdueTasks"), 1);
  assert.equal(map.get("openTasks"), 1);
  db.active
    .getSheetByName("القوائم المنسدلة")
    .getRange(3, 2)
    .setValue("قيد الدراسة");
  c.RB_createBackup();
  c.RB_refreshValidation();
  c.RB_updateCustomer({
    id,
    status: "قيد الدراسة",
    requestId: "status-change-request",
  });
  const after = db.active
    .getSheetByName("لوحة الإدارة")
    .getDataRange()
    .getValues();
  assert.equal(after.find((r) => r[0] === "status:جديدة")[2], 0);
});
test("reordered headers are mapped by name; literals resembling formulas stay literals on unrelated edits", () => {
  const { db, c } = setup();
  const sheet = db.active.getSheetByName("العملاء");
  const headers = sheet.getRange(1, 1, 1, 15).getValues()[0];
  [headers[1], headers[4]] = [headers[4], headers[1]];
  sheet.getRange(1, 1, 1, 15).setValues([headers]);
  const id = add(c).id;
  assert.equal(raw(db, "العملاء", 2, 5), "Synthetic test customer");
  sheet.getRange(1, 16).setValue("Original text field");
  sheet.getRange(2, 16).setValue("'=literal text, not a formula");
  c.RB_updateCustomer({
    id,
    notes: "changed",
    requestId: "literal-update-001",
  });
  assert.equal(sheet.getRange(2, 16).getFormulas()[0][0], "");
  assert.equal(
    sheet.getRange(2, 16).getValue(),
    "=literal text, not a formula",
  );
});
test("pending operation can be recovered by admin from its persisted marker without reconstructing personal payload", () => {
  const { db, c } = setup();
  db.failure = (r, s) => r.sheet.name === "سجل العمليات" && s === "before";
  assert.throws(() => add(c), /RB_PENDING/);
  const recovered = c.RB_recoverPending("customer-request-001");
  assert.ok(recovered.id);
  assert.equal(c.RB_getData().customers.length, 1);
  assert.equal(
    c.RB_getData().activity.filter((a) => a.action === "إضافة عميلة").length,
    1,
  );
});
test("pending request before primary write cannot be falsely recovered as successful", () => {
  const { db, c } = setup();
  db.failure = (r, s) =>
    r.sheet.name === "العملاء" && r.row === 2 && s === "before";
  assert.throws(() => add(c), /RB_PENDING/);
  assert.throws(
    () => c.RB_recoverPending("customer-request-001"),
    /غير موجود|دليل/,
  );
  assert.equal(c.RB_getData().customers.length, 0);
  add(c);
  assert.equal(c.RB_getData().customers.length, 1);
});
test("recovery after audit append does not log the original operation twice", () => {
  const { db, c } = setup();
  db.failure = (r, s) => r.sheet.name === "سجل العمليات" && s === "after";
  assert.throws(() => add(c), /RB_PENDING/);
  add(c);
  assert.equal(
    c.RB_getData().activity.filter((a) => a.action === "إضافة عميلة").length,
    1,
  );
});
test("read-only audit reports duplicate headers; setup does not alter malformed sheet", () => {
  const { db, c } = setup();
  const s = db.active.getSheetByName("العملاء");
  s.getRange(1, 16).setValue("الاسم");
  const report = c.RB_audit();
  assert.ok(
    report.sheets
      .find((x) => x.name === "العملاء")
      .duplicateHeaders.includes("الاسم"),
  );
  assert.ok(report.schema.find((x) => x.key === "customers").error);
  assert.throws(() => c.RB_setup(), /مكرر/);
});
test("directly adopted historical customer keeps original fields and never invents a creation timestamp", () => {
  const { db, c } = setup();
  const s = db.active.getSheetByName("العملاء");
  s.getRange(2, 2).setValue("Synthetic historical row");
  s.getRange(2, 4).setValue("Unparsed historical wedding text");
  db.active.activeRange = s.getRange(2, 2);
  c.RB_adoptSelectedCustomer();
  const row = c.RB_getData().customers[0];
  assert.ok(row.id);
  assert.equal(row.createdAt, "");
  assert.equal(row.wedding, "Unparsed historical wedding text");
  assert.equal(row.name, "Synthetic historical row");
});
test("new entity IDs cannot be supplied by clients and request identifiers cannot inject formulas", () => {
  const { c } = setup();
  assert.throws(() => add(c, { id: "=danger" }), /يولّده النظام/);
  assert.throws(() => add(c, { requestId: "-unsafe-request" }), /Request ID/);
  assert.equal(c.RB_getData().customers.length, 0);
});
test("editing a historical unchanged short phone is allowed without silently rewriting it", () => {
  const { db, c } = setup();
  const sheet = db.active.getSheetByName("العملاء");
  sheet.getRange(2, 1).setValue("legacy-short");
  sheet.getRange(2, 2).setValue("Synthetic old customer");
  sheet.getRange(2, 3).setValue("123");
  c.RB_updateCustomer({
    id: "legacy-short",
    phone: "123",
    notes: "changed note only",
    requestId: "unchanged-phone-001",
  });
  assert.equal(c.RB_getData().customers[0].phone, "123");
});
test("request payload hash and historical identifiers that resemble formulas remain plain text", () => {
  const { db, c } = setup();
  const t = db.active.getSheetByName("العملاء");
  t.getRange(2, 1).setValue("'=historical-id");
  t.getRange(2, 2).setValue("Synthetic identifier test");
  c.rbHash_ = () => "-test-hash";
  c.RB_updateCustomer({
    id: "=historical-id",
    notes: "updated",
    requestId: "hash-text-test-001",
  });
  const journal = db.active.getSheetByName("سجل الطلبات");
  assert.equal(journal.getRange(2, 3).getFormulas()[0][0], "");
  assert.equal(journal.getRange(2, 4).getFormulas()[0][0], "");
  assert.equal(c.RB_getData().customers[0].id, "=historical-id");
});
test("adopting an already identified customer returns its existing ID without making a second identity", () => {
  const { db, c } = setup();
  const id = add(c).id;
  db.active.activeRange = db.active.getSheetByName("العملاء").getRange(2, 2);
  const result = c.RB_adoptSelectedCustomer();
  assert.equal(result.id, id);
  assert.equal(c.RB_getData().customers.length, 1);
});
test("audit detects ambiguous historical IDs and numeric phone cells without changing data", () => {
  const { db, c } = setup();
  const s = db.active.getSheetByName("العملاء");
  s.getRange(2, 1, 2, 3).setValues([
    ["duplicate-id", "Synthetic A", 123],
    ["duplicate-id", "Synthetic B", 123],
  ]);
  const audit = c.RB_audit();
  assert.equal(audit.dataQuality.duplicateCustomerIdGroups, 1);
  assert.equal(audit.dataQuality.numericPhoneCells, 2);
  assert.equal(audit.dataQuality.duplicatePhoneGroups, 1);
  assert.equal(c.RB_getData().warnings.duplicateCustomerIds, 1);
  assert.throws(
    () =>
      c.RB_updateCustomer({
        id: "duplicate-id",
        notes: "must not choose first",
        requestId: "duplicate-edit-001",
      }),
    /مكرر/,
  );
});
test("legacy health/stats fields remain compatible without generating unlabeled dashboard metrics", () => {
  const { db, c } = setup();
  add(c);
  const d = c.RB_getData();
  assert.equal(d.stats.appointments, d.appointments.length);
  assert.equal(d.stats.tasks, d.stats.openTasks);
  assert.equal(c.RB_health().name, db.active.getName());
  const rows = db.active
    .getSheetByName("لوحة الإدارة")
    .getDataRange()
    .getValues()
    .slice(1);
  assert.ok(rows.every((r) => r[1]));
});
test("an existing named range used for another location is not overwritten", () => {
  const { db, c } = setup();
  const lists = db.active.getSheetByName("القوائم المنسدلة");
  lists.getRange(2, 1).setValue("Synthetic source");
  db.active.setNamedRange("RB_SOURCE", lists.getRange(10, 1));
  c.RB_createBackup();
  assert.throws(() => c.RB_refreshValidation(), /لغرض آخر/);
  assert.equal(
    db.active.getNamedRanges().find((n) => n.name === "RB_SOURCE").range.row,
    10,
  );
});
