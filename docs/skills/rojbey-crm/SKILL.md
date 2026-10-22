---
name: rojbey-crm
description: Working reference for the ROJBEY Bridal CRM project (Arabic RTL CRM on Google Sheets + Apps Script, Meta Facebook/Instagram integration plan). Use when the user asks about ROJBEY CRM, its phases, Apps Script, Meta/webhook setup, or project status.
---


## Purpose
Use this file as the working reference for the ROJBEY Bridal CRM project. Preserve the distinction between completed artifacts, prototype functionality, planned work, and verified live integration.

## Brand and UX
- Brand: ROJBEY bridal / wedding dress business.
- Preferred CRM interface: Arabic, right-to-left (RTL).
- Use ROJBEY brand identity and the supplied logo rather than generic branding.
- Dropdown fields requested: lead source, service, status, staff member, appointment, dress, payment, and follow-up.
- Dress silhouettes/models named by the user: A-Line, Mermaid, Princess, Satin.

## Roadmap
### Phase 01 — Google Sheets Automation
A proof-of-concept kit was created with:
- Google Sheets import workbook.
- Apps Script source (`Code.gs`).
- HTML CRM prototype.
- Search and filters.
- Add-customer workflow.
- Appointment booking with conflict checking.
- Follow-ups.
- Dashboard.
- Project history records indicate 1,465 records in the package at the time it was prepared.

Important: A prototype or source file is not proof of live deployment. Real operation requires deploying Apps Script and connecting it to the intended Google Sheet, then testing actual writes and reads.

### Phase 02 — Cloud CRM / Mobile App
Planned future phase. Do not claim it is implemented unless a later artifact or explicit confirmation proves it.

## Available project files
See `README_AR.txt` for the complete file inventory. Key assets:
- `ROJBEY_CRM_Google_Sheets_Import.xlsx`
- `Code.gs`
- `ROJBEY_Interactive_CRM_Demo.html`
- `ROJBEY_Private_Live_CRM_Demo_V2.html`
- `ROJBEY_CRM_Executive_Presentation_V2.pptx`
- `ROJBEY_Bridal_CRM_Client_Presentation.pptx`
- `ROJBEY_CRM_Phase01_Live_POC_Kit.zip`
- `ROJBEY_CRM_Skills_Meta_Integration.docx`

## Meta integration — recorded configuration
- Business Portfolio: Rojbey
- Business ID: `2311862379172681`
- System user: `Rojbey`
- System user ID: `61595898561948`
- Facebook Page: `Rojbey Egypt`
- Page ID: `488255714378573`
- Instagram handle: `@rojbey.egypt`
- Instagram account ID recorded in project notes: `17841472687701828`
- Developer App: `Rojbey`
- App ID: `2377182716443542`
- Last recorded status: app Unpublished; business verification Unverified.
- Permissions shown as “Ready for testing” included `pages_manage_metadata`, `pages_messaging`, and `pages_read_engagement`. Reconfirm actual availability and suitability in Meta before relying on them.
- System-user token generation previously showed “No permissions available”; a later flow showed a Page token. Root cause is not confirmed.

## Scope and guardrails
- CRM integration intent: organize eligible incoming Facebook and Instagram inquiries, identify the source, associate conversations with customers where possible, record follow-up status, preserve history, and avoid duplicate records.
- Automated replies, WhatsApp integration, and unapproved outbound messaging were excluded from the initial scope.
- Webhooks, signature validation, duplicate-event handling, and CRM destination integration are planned/require verification; do not claim they are live without test evidence.
- Do not recreate existing Meta assets unless necessary.
- Do not change working configurations without a clear reason.
- Keep confirmed settings separate from assumptions and planned steps.

## Security
- Never store access tokens, app secrets, passwords, or private customer information in this skill or ordinary project notes.
- A Page Access Token appeared in a prior screenshot. Revoke it and generate a replacement before using the integration.
- Do not place the replacement token in this ZIP or upload it to ChatGPT.
- Use only the minimum required permissions.

## Next verification sequence
1. Revoke the token exposed in the prior screenshot.
2. Confirm the correct app and assets are assigned to the system user.
3. Resolve the system-user token permission issue using the actual required permissions for the intended use case.
4. Generate a new token securely and keep it out of documents.
5. Confirm Apps Script is deployed and connected to the real Google Sheet.
6. Test CRM read/write operations with non-sensitive test data.
7. Configure and test Meta webhooks only after permissions and app configuration are verified.
8. Test incoming Facebook and Instagram events, duplicate delivery handling, and customer/conversation mapping.
9. Record evidence and update the project status before treating any feature as production-ready.

## Reference files (load only when needed)
- references/README_AR.txt — full file inventory and recorded status (Arabic)
- references/STATUS_CHECKLIST.txt — what is built vs. what still needs live verification
- references/Code.gs — Apps Script source for Phase 01
- references/ROJBEY_CRM_Skills_Meta_Integration.docx — Meta setup reference
- references/ROJBEY_Interactive_CRM_Demo.html — small interactive prototype
