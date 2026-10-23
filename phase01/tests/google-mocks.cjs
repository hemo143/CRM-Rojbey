// Test doubles, NOT Google integration. All names/records here are synthetic.
const { randomUUID, createHash } = require("node:crypto");
class Range {
  constructor(sheet, row, col, n = 1, m = 1) {
    Object.assign(this, { sheet, row, col, n, m });
    if (row < 1 || col < 1 || n < 1 || m < 1) throw Error("invalid range");
  }
  cell(i, j) {
    return this.sheet.cell(this.row + i, this.col + j);
  }
  getValues() {
    return Array.from({ length: this.n }, (_, i) =>
      Array.from({ length: this.m }, (_, j) => this.cell(i, j).value),
    );
  }
  getDisplayValues() {
    return this.getValues().map((r) =>
      r.map((v) => (v instanceof Date ? v.toISOString() : String(v ?? ""))),
    );
  }
  getFormulas() {
    return Array.from({ length: this.n }, (_, i) =>
      Array.from({ length: this.m }, (_, j) => this.cell(i, j).formula || ""),
    );
  }
  getDataValidations() {
    return Array.from({ length: this.n }, (_, i) =>
      Array.from(
        { length: this.m },
        (_, j) => this.cell(i, j).validation || null,
      ),
    );
  }
  setValues(values) {
    if (values.length !== this.n || values.some((r) => r.length !== this.m))
      throw Error("wrong dimensions");
    this.sheet.db.maybeFail(this, "before");
    values.forEach((r, i) =>
      r.forEach((v, j) => {
        const cell = this.cell(i, j);
        if (typeof v === "string" && v.startsWith("'")) {
          cell.value = v.slice(1);
          cell.formula = "";
        } else if (typeof v === "string" && v.startsWith("=")) {
          cell.value = v === "=1+1" ? 2 : "formula-result";
          cell.formula = v;
        } else {
          cell.value = v;
          cell.formula = "";
        }
      }),
    );
    this.sheet.db.maybeFail(this, "after");
    return this;
  }
  setValue(v) {
    return this.setValues([[v]]);
  }
  getValue() {
    return this.getValues()[0][0];
  }
  setDataValidation(v) {
    for (let i = 0; i < this.n; i++)
      for (let j = 0; j < this.m; j++) this.cell(i, j).validation = v;
    return this;
  }
  getSheet() {
    return this.sheet;
  }
  getRow() {
    return this.row;
  }
  getColumn() {
    return this.col;
  }
  getNumRows() {
    return this.n;
  }
  getNumColumns() {
    return this.m;
  }
  getA1Notation() {
    return `${this.row}:${this.col}:${this.n}:${this.m}`;
  }
  setBackground() {
    return this;
  }
  setFontColor() {
    return this;
  }
  setFontWeight() {
    return this;
  }
  setNumberFormat() {
    return this;
  }
  setWrapStrategy() {
    return this;
  }
  createFilter() {
    if (this.sheet.filter) throw Error("filter exists");
    this.sheet.filter = true;
    return this;
  }
}
class Sheet {
  constructor(db, name) {
    this.db = db;
    this.name = name;
    this.cells = {};
    this.maxRows = 100;
    this.maxCols = 26;
    this.filter = false;
  }
  cell(r, c) {
    if (r > this.maxRows || c > this.maxCols) throw Error("outside grid");
    return (
      this.cells[r + "," + c] ||
      (this.cells[r + "," + c] = { value: "", formula: "" })
    );
  }
  getRange(...args) {
    return new Range(this, ...args);
  }
  getName() {
    return this.name;
  }
  getLastRow() {
    return Math.max(
      0,
      ...Object.entries(this.cells)
        .filter(([, v]) => (v.value !== "" && v.value !== null) || v.formula)
        .map(([k]) => Number(k.split(",")[0])),
    );
  }
  getLastColumn() {
    return Math.max(
      0,
      ...Object.entries(this.cells)
        .filter(([, v]) => (v.value !== "" && v.value !== null) || v.formula)
        .map(([k]) => Number(k.split(",")[1])),
    );
  }
  getDataRange() {
    return this.getRange(
      1,
      1,
      Math.max(1, this.getLastRow()),
      Math.max(1, this.getLastColumn()),
    );
  }
  getMaxRows() {
    return this.maxRows;
  }
  getMaxColumns() {
    return this.maxCols;
  }
  getFilter() {
    return this.filter ? {} : null;
  }
  insertRowsAfter(row, count) {
    this.maxRows += count;
    return this;
  }
  insertColumnsAfter(col, count) {
    this.maxCols += count;
    return this;
  }
  setFrozenRows() {
    return this;
  }
  setRightToLeft() {
    return this;
  }
  setColumnWidths() {
    return this;
  }
  setRowHeightsForced() {
    return this;
  }
  hideColumns() {
    return this;
  }
}
class NamedRange {
  constructor(name, range) {
    this.name = name;
    this.range = range;
  }
  getName() {
    return this.name;
  }
  getRange() {
    return this.range;
  }
}
class Spreadsheet {
  constructor(db, id, name = "Isolated test spreadsheet") {
    this.db = db;
    this.id = id;
    this.name = name;
    this.sheets = [];
    this.named = [];
    this.zone = "Africa/Cairo";
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name;
  }
  getSheets() {
    return this.sheets;
  }
  getSheetByName(n) {
    return this.sheets.find((s) => s.name === n) || null;
  }
  insertSheet(name) {
    if (this.getSheetByName(name)) throw Error("duplicate sheet");
    const s = new Sheet(this.db, name);
    this.sheets.push(s);
    return s;
  }
  getSpreadsheetTimeZone() {
    return this.zone;
  }
  setSpreadsheetTimeZone(z) {
    this.zone = z;
    return this;
  }
  getNamedRanges() {
    return this.named;
  }
  setNamedRange(name, range) {
    const old = this.named.find((n) => n.name === name);
    if (old) old.range = range;
    else this.named.push(new NamedRange(name, range));
  }
  getActiveRange() {
    return this.activeRange;
  }
  copy(name) {
    const out = new Spreadsheet(this.db, randomUUID(), name);
    out.zone = this.zone;
    for (const s of this.sheets) {
      const target = out.insertSheet(s.name);
      target.maxRows = s.maxRows;
      target.maxCols = s.maxCols;
      target.filter = s.filter;
      for (const [key, c] of Object.entries(s.cells))
        target.cells[key] = {
          ...c,
          value: c.value instanceof Date ? new Date(c.value) : c.value,
        };
    }
    this.named.forEach((n) => {
      const r = n.range;
      out.setNamedRange(
        n.name,
        new Range(out.getSheetByName(r.sheet.name), r.row, r.col, r.n, r.m),
      );
    });
    this.db.books.set(out.id, out);
    return out;
  }
}
function mocks() {
  const db = {
    books: new Map(),
    properties: new Map(),
    actor: "admin@example.test",
    failure: null,
    held: false,
    lockCount: 0,
    maybeFail(range, stage) {
      if (this.failure && this.failure(range, stage)) {
        this.failure = null;
        throw Error("injected failure");
      }
    },
  };
  db.active = new Spreadsheet(db, "test-main");
  db.books.set("test-main", db.active);
  db.active.insertSheet("Sheet1");
  const props = {
    getProperty: (k) => db.properties.get(k) || null,
    setProperty(k, v) {
      db.properties.set(k, String(v));
      return this;
    },
  };
  const ui = {
    ButtonSet: { YES_NO: "yesno" },
    Button: { YES: "yes" },
    alert: () => "yes",
    showSidebar() {},
    showModalDialog() {},
    createMenu() {
      const menu = {
        addItem: () => menu,
        addSeparator: () => menu,
        addToUi() {},
      };
      return menu;
    },
  };
  const context = {
    Date,
    JSON,
    Set,
    Map,
    console,
    PropertiesService: { getScriptProperties: () => props },
    Session: { getActiveUser: () => ({ getEmail: () => db.actor }) },
    LockService: {
      getScriptLock: () => ({
        waitLock() {
          if (db.held) throw Error("lock contention");
          db.held = true;
          db.lockCount++;
        },
        releaseLock() {
          db.held = false;
        },
      }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => db.active,
      openById(id) {
        if (!db.books.has(id)) throw Error("not accessible");
        return db.books.get(id);
      },
      flush() {},
      WrapStrategy: { CLIP: "CLIP" },
      getUi: () => ui,
      newDataValidation() {
        let range,
          allow = true;
        const builder = {
          requireValueInRange(r) {
            range = r;
            return builder;
          },
          setAllowInvalid(v) {
            allow = v;
            return builder;
          },
          setHelpText() {
            return builder;
          },
          build() {
            return {
              getCriteriaType: () => "VALUE_IN_RANGE",
              getAllowInvalid: () => allow,
              getCriteriaValues: () => [range],
            };
          },
        };
        return builder;
      },
    },
    ScriptApp: { getProjectTriggers: () => [] },
    HtmlService: {
      createHtmlOutputFromFile: () => ({
        setTitle() {
          return this;
        },
        addMetaTag() {
          return this;
        },
      }),
      createHtmlOutput: () => ({
        setWidth() {
          return this;
        },
        setHeight() {
          return this;
        },
      }),
    },
    Utilities: {
      getUuid: randomUUID,
      DigestAlgorithm: { SHA_256: "SHA_256" },
      computeDigest: (_, s) =>
        Array.from(createHash("sha256").update(s).digest()),
      base64EncodeWebSafe: (a) => Buffer.from(a).toString("base64url"),
      formatDate(date, zone, pattern) {
        const p = Object.fromEntries(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: zone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          })
            .formatToParts(date)
            .map((p) => [p.type, p.value]),
        );
        if (pattern === "yyyy-MM-dd") return `${p.year}-${p.month}-${p.day}`;
        if (pattern === "HH:mm") return `${p.hour}:${p.minute}`;
        return date.toISOString();
      },
    },
  };
  return { db, context };
}
module.exports = { mocks, Range, Sheet };
