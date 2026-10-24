// Synthetic workbook + actual Apps Script source, not live Google integration.
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const { createHmac, randomUUID } = require("node:crypto");
const { mocks } = require("../../phase01/tests/google-mocks.cjs");
const {
  installObserved,
} = require("../../phase01/tests/observed-workbook.fixture.cjs");
exports.createSheetWorkflow = () => {
  const { db, context: c } = mocks(),
    secret = "b".repeat(64),
    cache = new Map();
  c.Session.getEffectiveUser = () => ({ getEmail: () => db.owner });
  c.CacheService = {
    getScriptCache: () => ({
      get: (k) => cache.get(k),
      put: (k, v) => cache.set(k, v),
    }),
  };
  c.ContentService = {
    MimeType: { JSON: "json" },
    createTextOutput: (s) => ({ setMimeType: () => s }),
  };
  c.Utilities.Charset = { UTF_8: "utf8" };
  c.Utilities.computeHmacSha256Signature = (s, key) => [
    ...createHmac("sha256", key).update(s).digest(),
  ];
  vm.createContext(c);
  for (const name of [
    "Schema.gs",
    "Workbook.gs",
    "Setup.gs",
    "Code.gs",
    "Bridge.gs",
  ])
    vm.runInContext(
      readFileSync(resolve(__dirname, "../../phase01", name), "utf8"),
      c,
    );
  c.RB_bindSpreadsheet();
  installObserved(db, c);
  c.RB_configureObservedWorkbook();
  c.RB_createBackup();
  c.RB_setup();
  db.owner = db.actor;
  db.actor = "";
  db.properties.set("RB_RENDER_ENABLED", "true");
  db.properties.set("RB_RENDER_SECRET", secret);
  const actor = {
    id: "workflow-admin",
    role: "admin",
    name: "Synthetic workflow admin",
  };
  const call = (method, payload = {}) => {
    const body = JSON.stringify({
      version: 1,
      at: Date.now(),
      nonce: randomUUID(),
      actor,
      method,
      payload,
    });
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    return JSON.parse(
      c.doPost({ postData: { contents: JSON.stringify({ body, signature }) } }),
    );
  };
  return {
    call,
    approveSyntheticStaff() {
      const t = c.rbTable_("lists");
      t.sheet.getRange(2, t.map["الموظفات"] + 1).setValue("فريق اختبار");
    },
  };
};
