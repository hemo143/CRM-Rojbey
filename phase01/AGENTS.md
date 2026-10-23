# Phase 01 implementation

Read README.md and docs/AUDIT.md before edits. This folder targets Google Sheets + Apps Script only. The Next.js/Render demo is a separate historical artifact; do not expand Phase 02 to satisfy Phase 01.

Keep existing sheet records, original fields, formulas, stable IDs and historical vocabularies. Require a reviewed schema and verified backup before schema/validation changes on any nonempty file. No automatic deduplication, clearing, ID backfills, transaction inference or secret logging. Never infer live access from an HTML demo or a local test. No outbound messages or triggers without explicit authorization.

Source files: Code.gs, Schema.gs, Setup.gs, Workbook.gs, optional Bridge.gs, Index.html and appsscript.json are a single bound Apps Script project. Duplicating old constants/functions beside them in a Google project is unsafe. Installation and review must begin on a private test copy; see docs/DEPLOYMENT.md.

Run `node --test phase01/tests/*.test.cjs` from the repository root. This uses local Google service test doubles and Chromium with a simulated google.script.run bridge. Tests require root npm dependencies and /usr/bin/chromium (or CHROMIUM_PATH). Passing them does not demonstrate Google authorization, real dropdown appearance, live persistence, concurrency across real accounts, or a verified Google backup/restore. Preserve these distinctions in reports.

No live Sheet or Apps Script deployment has been audited from this environment. The uploaded XLSX schema was audited offline; read docs/WORKBOOK_AUDIT.md. Live access and business/financial rules remain prerequisites for production claims. The user deferred staff roster approval; preserve historical assignments and do not auto-promote them.

The user explicitly authorized connecting the Render web CRM to this sheet. Bridge.gs is an optional signed server bridge for that scope; read ../docs/RENDER_SHEETS.md. The historical user-access deployment and owner-executed signed bridge are different modes. Never expose owner access without the authenticated doPost boundary. Rebuild the consolidated installer with `node scripts/build-apps-script.mjs` after .gs changes.
