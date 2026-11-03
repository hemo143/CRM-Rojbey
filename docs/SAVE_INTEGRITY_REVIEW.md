# ROJBEY CRM save integrity and contact consistency repair

Source: `render-sheets-bridge` at `e90c3e0db9f64f3316ad130e92c72ef46f95ecff`.

## Delivery status

Implementation and isolated end-to-end verification are available in this branch. **Not deployed to Render or Google Apps Script; no production records, environment variables, plans, or GitHub merge targets were changed.** The repository was inspected through the connected GitHub account. This environment has no connected Render/Apps Script administration session. Historical deployment messages are not evidence of the current live configuration.

## Root causes and fixes

| Problem | Evidence in the original source | Repair |
| --- | --- | --- |
| Save appears to fail after it succeeded | `page.tsx` awaited `load()` inside the mutation success path; a failed GET propagated into the form's save-error handler. `Index.html` similarly mixed write and refresh. | A committed save remains successful; refresh failures are separate and explicitly say not to save again. |
| Slow/uncertain Sheets saves | `rbWrite_` synchronously rebuilt the derived dashboard after committing the entity and request journal. The bridge fetch timed out at 30 seconds. | Remove the dashboard rebuild from the save response path. Render metrics use fresh source rows; the Sheet's derived dashboard remains manually refreshable with `RB_refreshDashboard`. Actual live latency has not been measured. |
| Focus can change while staff type | The modal focus effect depended on busy state; a late login/load or save transition could rerun cleanup and steal input focus. | Keep the focus trap tied to modal lifetime and read busy state through a ref. |
| Retrying or double-clicking risks duplicate operations | React busy state alone is not a synchronous guard. Local API mutations ignored request IDs entirely. Ambiguous browser network failures were not reconciled, and pending requests only lived in memory. | Synchronous ref lock plus disabled save button; durable local receipts in the same atomic JSON save; existing locked Sheets journal retained. Check actor-scoped request status against the actual persisted entity. Preserve unresolved request/payload in tab-scoped session storage for reload recovery. |
| A committed row can leave the journal PENDING | Entity write, activity append, and journal finalization are separate Google operations. An audit/finalization failure left later writes blocked even when the record existed. | Request reconciliation checks entity ID and Last Request ID under the same script lock, completes the audit/journal, and reports success for the original committed write. A request ID reused for different data still fails. |
| Egyptian duplicate checking is inconsistent | Original Node normalization only removed formatting; Apps Script additionally handled `00`, but neither equated Egyptian local `01…` and international `+201…`. | Identical canonical rules in both server paths; local, +20, 0020, Arabic and Persian digits match. New/explicitly changed phone values are stored canonically; historical unchanged phone displays are preserved. |
| Duplicate warning gives no usable record | Node threw only generic text. Sheets returned an ID embedded in an error string. | Structured existing contact ID/name/phone, HTTP 409 in the real API, and an action to open that profile. The old separate-person duplicate bypass is removed. No automatic merges/deletions. |
| Search cannot find a known phone | Frontend searched a previously fetched snapshot; formatting was not canonical; filters could hide a committed contact. | Fetch fresh no-store data on search/view changes, protect against out-of-order reads, reset filters after saves, and use the same normalization as duplicate checking. Name, ID, Instagram username (with/without @), and Egyptian phone variants work. Search deliberately crosses lifecycle views so an existing contact is discoverable. |
| Customer/inquiry terminology suggests two identities | The source already stored one `customers` collection; both navigation entries used it, but Customers was unfiltered and there was no explicit conversion action. No second inquiry database was found. | Explicit filtered lifecycle views and a same-ID Convert to Customer action. Retain historical vocabulary and unknown statuses. |
| Follow-up metadata incomplete | Existing Sheet has task status/created timestamp, but Node mapping discarded them. Form accepted only a date; notes had no field. | Preserve status/created timestamp, accept Cairo date/time, add notes with a backup-gated optional Sheet column, retain legacy date-only records and customer ID links. |
| History lacks context | Existing unified activity collection linked appointments/tasks via entity IDs, but customer updates logged a generic event. | Retain existing linkage and add status transitions/conversion and note/message-change events; display reverse chronological customer history. Messages remain unintegrated; no fabricated message events. |

These are confirmed code paths and reproduced isolated failures. They explain the client's symptoms, but the exact production incident has not been tied to a live request ID/log because production access was unavailable. No separate duplicate-check/search database or Sheets data cache was found in the inspected code.

## Contact model and compatibility

`customers` remains the one primary contact collection/table and its existing `Customer ID` is the stable foreign key for appointments, tasks, notes, messages and activity. `lifecycle_status` is a normalized application projection of the existing stored `status` field, rather than a competing status column. Local writes persist that projection as well; Sheets retains its historical Arabic status vocabulary.

| Stored Arabic status | lifecycle_status |
| --- | --- |
| جديدة | New Inquiry |
| قيد التواصل / تم التواصل | Contacted |
| مهتمة | Qualified |
| موعد مؤكد / حجزت موعد | Appointment Booked |
| تمت الزيارة | Visited |
| تم التعاقد | Customer |
| مغلقة / غير مهتمة | Lost / Not Interested |

New Inquiries filters to New Inquiry. Customers filters to Customer, while keeping unknown historical statuses visible rather than silently excluding legacy records. The existing status filter can explicitly show intermediate/lost contacts in Customers, so those stages remain accessible without guessing a search term. A global search can find all contacts regardless of view. Convert to Customer updates `status` to `تم التعاقد` on the existing ID, respecting the existing admin update permission. Historical or customized vocabularies are not rewritten, and no status is inferred from payments or appointment attendance. The existing observed workbook already supplies the lifecycle vocabulary; a differently configured workbook must explicitly approve its converted status before conversion can be used.

`normalizedPhone` is returned consistently from current phone values. An optional `Normalized Phone` Sheet column stores it on new/explicit phone writes after the additive upgrade. Existing rows are not backfilled, and matching always normalizes current source phone values rather than trusting a potentially stale helper cell. Without the optional column, new/changed phone values still persist canonically in the existing phone column.

Follow-ups retain `Task ID` and `Customer ID`, title, due date/time, staff, status and creation timestamp. Optional notes use the new `ملاحظات المتابعة` column. Date-only historical values still work. Follow-up date/times are stored as Cairo wall time, not silently converted into another timezone. Editing/replaying records preserves their IDs and original created timestamps.

## QA results

All data used below is synthetic and isolated. The Sheets tests execute the actual `.gs` sources and HMAC bridge against local Google service/workbook test doubles; browser tests use that same source through a test transport. A separate browser test exercises the real Next API and its local atomic repository. These tests do not prove live Google authorization, live Sheets persistence, or cross-account real Google lock behavior.

| Requested case | Result and evidence |
| --- | --- |
| A — one-click new contact | PASS: one UI request creates one row; immediate listing/search by name, local/+20/0020 phone, username and ID. Both storage implementations tested. |
| B — duplicate | PASS: equivalent phone forms return the original ID/name/phone; open-profile action works; record count unchanged. Real API returns 409. |
| C — appointment | PASS: one linked appointment; shown in profile and appointments; replay returns same ID; required fields and conflicts still validated. |
| D — follow-up | PASS: one linked task with date/time, status, staff, notes and created timestamp; visible in profile/list; completion retains history. |
| E — inquiry conversion | PASS: status changes on the same contact ID; no new contact; customer view shows converted contact. |
| F — rapid save | PASS: two synchronous form submits yield one HTTP write; concurrent direct API deliveries with the same request ID return one backend ID. Payload/key mismatch is rejected. |
| G — failure states | PASS: validation rejection explicitly says nothing saved; dropped response after commit reconciles to success; failed refresh still reports saved; wholly unresolved response remains pending. Reload recovery replays the original request ID without another row. |

Final verification:

- `npm test`: 22 passed.
- `CHROMIUM_PATH=/tmp/chromium node --test phase01/tests/*.test.cjs`: 38 passed, including 3 real Chromium sidebar tests against the simulated Apps Script transport.
- `CHROMIUM_PATH=/tmp/chromium npm run test:e2e`: 15 passed, including A–G, concurrent real API delivery, reload recovery, and intermediate-status visibility.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:production`: passed against isolated local data, including restart persistence and access controls.
- `npm run test:sheets-production`: passed for isolated production-mode account/configuration guards. This script does not call live Google.

The test harness uses Webpack for the dev test server because Turbopack's ephemeral filesystem cache was unstable in this managed environment. Production build configuration is unchanged. Chromium was supplied locally through a temporary npm package; no browser/runtime dependency was added to the application lockfile.

## Production rollout prerequisites

1. Review this diff and test on a private copy of the bound Sheet/project. Record the actual current Apps Script deployment/version and Render revision first; this report does not assume they match the repository.
2. Review the additive schema: only `Normalized Phone` on customers and `ملاحظات المتابعة` on tasks. No IDs, source columns, formulas, or old row values are changed. Take a verified current `RB_createBackup` while edits are paused, then run `RB_upgradeContactMetadata` on the private copy. That function refuses a missing/stale backup. It does not automatically backfill old data. Do not run `RB_setup` as an improvised migration.
3. Install the rebuilt consolidated `phase01/install/ROJBEY_ALL_IN_ONE.gs` and updated `Index.html` on the private project, using the existing signed bridge boundary. Do not place split `.gs` sources alongside the consolidated file. Deploy a new version of the existing bridge only after review; preserve properties, authentication, and the intended bound Sheet.
4. Run A–G against that real private Sheet from the Render test deployment, verify source rows/IDs and real staff accounts, then approve production rollout. Keep the verified backup and previous code/deployment version for rollback. No existing real customers should be used as destructive test fixtures.
5. Apply the same reviewed additive upgrade and coordinated Apps Script/Render code release to production. Do not switch providers, enable demo against real data, replace account arrays, or change secrets to make a test pass.

Known limits: the local JSON repository is single-process only (unchanged architectural limit). Use Sheets' script lock for the configured Sheets provider; manual Sheet edits and another Apps Script project are outside that lock. Unresolved pending payloads live in tab-scoped session storage and are removed on success/definite rejection; they contain the form data, never account credentials, and should not be copied into support logs. If the tab is destroyed and its storage is lost, an administrator must reconcile the journal before manually recreating an uncertain operation. No new integration, automation, outbound message, financial feature, or automatic historical deduplication was added.

## Every changed file

- `playwright.config.ts`
- `phase01/Bridge.gs`
- `phase01/Code.gs`
- `phase01/Index.html`
- `phase01/Schema.gs`
- `phase01/Setup.gs`
- `phase01/install/ROJBEY_ALL_IN_ONE.gs`
- `phase01/tests/phase01.test.cjs`
- `phase01/tests/ui.test.cjs`
- `scripts/test-production.mjs`
- `src/app/api/crm/route.ts`
- `src/app/page.tsx`
- `src/lib/domain.test.ts`
- `src/lib/domain.ts`
- `src/lib/mutations.ts`
- `src/lib/save-client.ts`
- `src/lib/save-integrity.test.ts`
- `src/lib/sheets.ts`
- `src/lib/workflow.ts`
- `tests/admin-workflow.spec.ts`
- `tests/crm.spec.ts`
- `tests/helpers/sheets.cjs`
- `tests/save-integrity.spec.ts`
- `docs/SAVE_INTEGRITY_REVIEW.md`
