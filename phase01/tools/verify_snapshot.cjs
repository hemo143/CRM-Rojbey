// Private local verification using the uploaded snapshot + Google mocks. NOT a Google test.
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
const { mocks } = require("../tests/google-mocks.cjs");
const file = process.argv[2];
if (!file) throw Error("Pass a private snapshot path outside Git");
const snapshot = JSON.parse(fs.readFileSync(file, "utf8")),
  f = mocks();
f.db.active.sheets = [];
for (const item of snapshot.sheets) {
  const s = f.db.active.insertSheet(item.name);
  s.maxRows = Math.max(100, item.rows.length + 10);
  s.maxCols = Math.max(26, ...item.rows.map((r) => r.length));
  for (let i = 0; i < item.rows.length; i++) {
    const values = item.rows[i].map((v) =>
      v && v.__xlsx_date
        ? new Date(v.__xlsx_date)
        : v === null
          ? ""
          : typeof v === "string" && /^[\s\u0000-\u001f]*[=+@-]/.test(v)
            ? "'" + v
            : v,
    );
    if (values.some((v) => v !== ""))
      s.getRange(i + 1, 1, 1, values.length).setValues([values]);
  }
}
vm.createContext(f.context);
for (const source of ["Schema.gs", "Workbook.gs", "Setup.gs", "Code.gs"])
  vm.runInContext(
    fs.readFileSync(path.resolve(__dirname, "..", source), "utf8"),
    f.context,
  );
const c = f.context;
c.RB_bindSpreadsheet();
const customerSheet = f.db.active.getSheetByName("العملاء"),
  catalog = f.db.active.getSheetByName("القوائم والإعدادات");
const hash = (rows) =>
  createHash("sha256").update(JSON.stringify(rows)).digest("hex");
const count = customerSheet.getLastRow() - 1,
  columns = customerSheet.getLastColumn();
const before = hash(
  customerSheet.getRange(1, 1, count + 1, columns).getValues(),
);
const catalogRows = catalog.getLastRow();
const catalogBefore = hash(catalog.getRange(1, 1, catalogRows, 10).getValues());
const totalBefore = c.rbFingerprint_(f.db.active);
c.RB_configureObservedWorkbook();
assert.equal(
  c.rbFingerprint_(f.db.active),
  totalBefore,
  "Profile must not alter cells",
);
c.RB_createBackup();
const setup = c.RB_setup();
assert.equal(
  hash(customerSheet.getRange(1, 1, count + 1, columns).getValues()),
  before,
  "Original customer cells must remain unchanged",
);
assert.equal(
  hash(catalog.getRange(1, 1, catalogRows, 10).getValues()),
  catalogBefore,
  "Original list cells must remain unchanged",
);
const data = c.RB_getData();
assert.equal(data.customers.length, count);
assert.equal(customerSheet.getLastColumn(), 20);
assert.equal(data.config.lists.staff.length, 0);
assert.equal(data.stats.newInquiries, 0);
assert.ok(
  data.customers.every(
    (x) => x.status === "مستورد" && !x.createdAt && !x.updatedAt,
  ),
);
console.log(
  JSON.stringify({
    scope:
      "private uploaded snapshot through local Google mocks; not live Google",
    pass: true,
    customers_preserved: count,
    original_customer_columns_preserved: columns,
    original_catalog_columns_preserved: 10,
    no_automatic_merges: true,
    no_historical_timestamps_invented: true,
    default_appointment_type: data.config.values.appointmentDefaultType,
    staff_roster_requires_manual_review: setup.missingLists.includes("staff"),
  }),
);
