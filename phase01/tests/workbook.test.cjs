const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
const { mocks } = require("./google-mocks.cjs");
const { installObserved } = require("./observed-workbook.fixture.cjs");
function fixture() {
  const f = mocks();
  vm.createContext(f.context);
  for (const source of ["Schema.gs", "Workbook.gs", "Setup.gs", "Code.gs"])
    vm.runInContext(
      fs.readFileSync(path.resolve(__dirname, "..", source), "utf8"),
      f.context,
    );
  f.context.RB_bindSpreadsheet();
  installObserved(f.db, f.context);
  return { ...f, c: f.context };
}
test("observed catalog must be selected explicitly; default setup refuses creating duplicate list sheet", () => {
  const { c, db } = fixture();
  assert.throws(() => c.RB_setup(), /مكافئ/);
  assert.equal(db.active.getSheetByName("القوائم المنسدلة"), null);
});
test("profile selects existing catalog without changing any cells; backup remains required", () => {
  const { c, db } = fixture();
  const before = c.rbFingerprint_(db.active);
  c.RB_configureObservedWorkbook();
  assert.equal(c.rbFingerprint_(db.active), before);
  assert.throws(() => c.RB_setup(), /RB_createBackup/);
});
test("setup preserves all 19 original customer columns and all 10 catalog columns", () => {
  const { c, db } = fixture(),
    s = db.active.getSheetByName("العملاء"),
    lists = db.active.getSheetByName("القوائم والإعدادات");
  const row = s.getRange(2, 1, 1, 19).getValues()[0],
    catalog = lists.getRange(1, 1, 8, 10).getValues();
  c.RB_configureObservedWorkbook();
  c.RB_createBackup();
  const result = c.RB_setup();
  assert.deepEqual(s.getRange(2, 1, 1, 19).getValues()[0], row);
  assert.deepEqual(lists.getRange(1, 1, 8, 10).getValues(), catalog);
  assert.equal(s.getLastColumn(), 20);
  assert.equal(lists.getRange(1, 11).getValue(), "الموظفات");
  assert.equal(db.active.getSheetByName("القوائم المنسدلة"), null);
  assert.ok(result.missingLists.includes("staff"));
  assert.equal(c.RB_getData().stats.newInquiries, 0);
  assert.equal(c.RB_getData().customers[0].status, "مستورد");
  assert.equal(c.RB_getData().customers[0].createdAt, "");
  assert.equal(
    c.RB_getData().config.values.appointmentDefaultType,
    "زيارة أولى",
  );
});
test("historical staff are not promoted into an approved roster; assignments require review", () => {
  const { c, db } = fixture();
  c.RB_configureObservedWorkbook();
  c.RB_createBackup();
  c.RB_setup();
  assert.equal(c.RB_getData().config.lists.staff.length, 0);
  assert.throws(
    () =>
      c.RB_addAppointment({
        customerId: "SYNTHETIC-LEGACY-ID",
        date: "2026-12-01",
        time: "12:00",
        staff: "Unreviewed historical staff",
        requestId: "profile-appt-001",
      }),
    /الموظفات المعتمدات/,
  );
  db.active
    .getSheetByName("القوائم والإعدادات")
    .getRange(2, 11)
    .setValue("Approved synthetic staff");
  c.RB_createBackup();
  c.RB_refreshValidation();
  const result = c.RB_addAppointment({
    customerId: "SYNTHETIC-LEGACY-ID",
    date: "2026-12-01",
    time: "12:00",
    staff: "Approved synthetic staff",
    requestId: "profile-appt-002",
  });
  assert.ok(result.id);
});
test("new communication fields persist and existing catalog validation is used", () => {
  const { c } = fixture();
  c.RB_configureObservedWorkbook();
  c.RB_createBackup();
  c.RB_setup();
  const id = c.RB_addCustomer({
    name: "Synthetic new inquiry",
    channel: "Instagram DM",
    username: "synthetic.user",
    metaContactId: "synthetic-id",
    lastMessage: "Synthetic message",
    lastMessageAt: "2026-10-24",
    requestId: "profile-customer-001",
  }).id;
  const r = c.RB_getData().customers.find((c) => c.id === id);
  assert.equal(r.username, "synthetic.user");
  assert.equal(r.channel, "Instagram DM");
  assert.equal(r.lastMessage, "Synthetic message");
  assert.throws(
    () =>
      c.RB_updateCustomer({
        id,
        channel: "Unsupported channel",
        requestId: "profile-channel-002",
      }),
    /قائمة/,
  );
});
test("observed cancelled tasks remain retained but do not count open or overdue", () => {
  const { c, db } = fixture();
  c.RB_configureObservedWorkbook();
  c.RB_createBackup();
  c.RB_setup();
  db.active
    .getSheetByName("القوائم والإعدادات")
    .getRange(2, 11)
    .setValue("Approved synthetic staff");
  const id = c.RB_addFollowup({
    customerId: "SYNTHETIC-LEGACY-ID",
    staff: "Approved synthetic staff",
    title: "Synthetic cancelled task",
    due: "2026-01-01",
    requestId: "cancel-task-001",
  }).id;
  db.active.getSheetByName("المتابعات").getRange(2, 7).setValue("ملغاة");
  const data = c.RB_getData();
  assert.equal(data.stats.openTasks, 0);
  assert.equal(data.stats.overdueTasks, 0);
  assert.equal(data.stats.cancelledTasks, 1);
  assert.equal(data.tasks.length, 1);
  assert.throws(
    () => c.RB_completeTask({ id, requestId: "complete-cancelled-001" }),
    /ملغاة/,
  );
});
test("mapped existing catalog still refuses a second canonical catalog tab", () => {
  const { c, db } = fixture();
  db.active.insertSheet("القوائم المنسدلة");
  c.RB_configureObservedWorkbook();
  assert.throws(() => c.RB_setup(), /مكافئ/);
});
