import { readFileSync, writeFileSync } from "node:fs";
const sources = [
  "Schema.gs",
  "Workbook.gs",
  "Setup.gs",
  "Code.gs",
  "Bridge.gs",
];
const banner =
  "/** ROJBEY consolidated Apps Script. Use INSTEAD OF the separate .gs files.\n * Keep Index.html separately. Start on a private test copy. Bridge disabled by default.\n * Never install both combined and separate sources in the same project. */\n";
writeFileSync(
  "phase01/install/ROJBEY_ALL_IN_ONE.gs",
  banner +
    sources
      .map(
        (n) =>
          "\n// ===== " + n + " =====\n" + readFileSync("phase01/" + n, "utf8"),
      )
      .join("\n"),
);
