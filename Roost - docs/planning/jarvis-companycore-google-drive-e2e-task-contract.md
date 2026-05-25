# JARVIS-GDRIVE-001 Jarvis CompanyCore Google Drive E2E

## Header
- ID: JARVIS-GDRIVE-001
- Title: Jarvis CompanyCore Google Drive Docs and Sheets write path
- Task Type: fix | release
- Current Stage: post-release
- Status: DONE
- Owner: Backend Builder + Ops/Release
- Depends on: Drive import organization deploy and Jarvis agent smoke
- Priority: P0
- Module Confidence Rows: Google Drive integration; Ops / release
- Requirement Rows: REQ-JARVIS-GDRIVE-001
- Risk Rows: RISK-JARVIS-GDRIVE-001
- Iteration: 2026-05-15
- Operation Mode: BUILDER
- Mission ID: JARVIS-GDRIVE-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] Affected module confidence rows were identified.
- [x] The task improves release confidence for an existing integration blocker.

## Mission Block
- Mission objective: make Jarvis able to create, update, and read Google Docs
  and Sheets through CompanyCore without direct Google API access.
- Release objective advanced: production CompanyCore Google Drive write path
  for Jarvis.
- Included slices: CompanyCore route contract, Sheets folder placement,
  Google OAuth decrypt error handling, local validation, production deploy
  plan, and production smoke plan.
- Explicit exclusions: direct Jarvis-to-Google API calls; printing or storing
  raw API keys, OAuth tokens, or runtime secrets.
- Checkpoint cadence: after code validation, after deploy, after protected
  smoke, after Jarvis agent handoff.
- Stop conditions: invalid production OAuth secret cannot be decrypted; Jarvis
  runtime lacks a valid CompanyCore API key; production write smoke fails.
- Handoff expectation: Jarvis agent receives exact smoke scenario and must
  create/read the two required files through CompanyCore.

## 2026-05-15 Continuation
- Owner Google Drive OAuth re-consent is complete in production; the active
  Google Drive setting decrypts successfully and has refresh/access tokens.
- New release slice: organize Drive folder discovery and `/settings/drive`
  import selection so owners can see selected root folders, included
  descendants, imported folders, and direct imported item counts before import.
- Validation: `npm run validate` passed. `npm test` reached the build gate but
  stopped before API tests because this host has no `DATABASE_URL`.
- Next release gate: deploy the import organization patch, run protected Drive
  smoke, then hand the exact Docs/Sheets create/readback scenario to the Jarvis
  agent.
- Result: production commit `b716f02` is deployed. Public health reports the
  `b716f02` image, protected Google Drive smoke passes, owner folder discovery
  proves `12. Zarządzanie` is selected/imported, and a Jarvis-key
  CompanyCore-only smoke created and read back the required Doc and Sheet in
  that folder.

## Context
Jarvis already has CompanyCore tools. A previous production test showed
`POST /v1/google-drive/sheets` rejected `parentId`, while
`POST /v1/google-drive/docs` returned `internal_server_error`. Production
logs now show the Docs 500 came from Google OAuth secret decryption failure,
not from the Docs API contract itself.

## Goal
CompanyCore must expose a correct, safe Drive/Docs/Sheets API contract for
Jarvis and provide an evidence-backed deploy and smoke plan for the required
`12. Zarządzanie` folder test.

## Scope
- `src/modules/google-drive/google-drive.routes.ts`
- `src/integrations/google-drive/google-drive.content.ts`
- `src/integrations/integration-settings.service.ts`
- `src/tests/api.test.ts`
- `docs/INTEGRATIONS.md`
- `docs/planning/jarvis-companycore-google-drive-e2e-task-contract.md`
- production CompanyCore health/log/smoke checks

## Implementation Plan
1. Verify local CompanyCore and OpenJarvis contracts for `parentId`, tool
   allowlists, and CompanyCore-only Google access.
2. Change CompanyCore Sheets creation to accept `parentId` and create the file
   through Drive `files.create` with spreadsheet MIME type.
3. Keep Sheet values writes on the Sheets API after file creation.
4. Convert undecryptable stored Google OAuth secrets into controlled
   `integration_invalid_token` errors instead of raw 500s.
5. Validate build and static gates locally; run DB-backed API tests when a
   local PostgreSQL is available.
6. Deploy CompanyCore through the accepted manual VPS/Coolify path.
7. Run production health, logs, protected CompanyCore smoke, and Jarvis
   handoff smoke.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: local CompanyCore did not accept `parentId` for sheet creation and
  created sheets through Sheets `spreadsheets.create`, which cannot place files
  in the target Drive folder in the current contract.
- Gaps: production `/health` returned `build.commit="unknown"`, so deployed
  revision could not be proven from public metadata.
- Inconsistencies: OpenJarvis already passes `parentId` for Sheets; CompanyCore
  local code did not accept it.
- Architecture constraints: Jarvis must use CompanyCore HTTP routes and must
  not call Google APIs directly.

### 2. Select One Priority Mission Objective
- Selected task: restore CompanyCore Google Drive write contract for Jarvis.
- Priority rationale: the required Docs/Sheets proof is blocked by production
  contract and OAuth runtime failures.
- Deferred: broad Drive sync freshness and UI polish.

### 3. Plan Implementation
- Files or surfaces to modify: Google Drive route schema, content service,
  OAuth secret error handling, integration tests, integration docs.
- Logic: Drive creates Docs/Sheets with optional parent; Sheets values update
  remains a Sheets API write.
- Edge cases: missing `parentId`, invalid OAuth secret, provider write failure,
  content refresh after provider write.

### 4. Execute Implementation
- Implementation notes: `createGoogleSheet` now uses
  `GoogleDriveClient.createDriveFile` with spreadsheet MIME type and optional
  `parentId`; tests assert the parent folder is passed to Drive.

### 5. Verify and Test
- Validation performed:
  - `npm run build`: passed.
  - `npm run validate`: passed.
  - `git diff --check`: passed.
  - `npm run test:api`: blocked before tests because this desktop session has
    no `DATABASE_URL`.
  - Docker validation attempt timed out before a local PostgreSQL could be
    started.
- Production checks performed:
  - public `/health` and `/v1/health` returned `200` but build metadata was
    `unknown`.
  - production logs showed Docs 500 root cause:
    stored Google Drive OAuth secret could not be decrypted.
  - after deploy, public `/health` and `/v1/health` returned build commit
    `669c1c8`, protected Google Drive smoke passed, and a protected content
    refresh returned controlled `401 integration_invalid_token`.
  - a Coolify recovery probe found only the current `INTEGRATION_SECRET_KEY`
    candidate, and it does not decrypt existing Google Drive or ClickUp
    integration secrets.
  - Jarvis agent smoke used CompanyCore only, found folder
    `12. Zarzadzanie` with externalId
    `1U1GMpy0erVETPDA9ciRb7l1gVbSJfaff`, and received
    `401 integration_invalid_token` for both required file creations.
  - commit `fb6aca9` was deployed to production; public `/health` and
    `/v1/health` report `fb6aca9`.
  - the deployed reconnect fix allows Google Drive OAuth URL generation and
    code exchange to proceed even when old ciphertext cannot be decrypted.
  - the current Jarvis container key was registered in CompanyCore without
    exposing the raw key, and protected Google Drive smoke passes with that
    Jarvis key.
  - required Doc/Sheet write smoke with the Jarvis key still returns
    `401 integration_invalid_token`, so the remaining blocker is owner Google
    OAuth re-consent rather than CompanyCore contract or Jarvis key wiring.

### 6. Self-Review
- Simpler option considered: keep Sheets `spreadsheets.create` and move the file
  later. Rejected because the accepted contract requires CompanyCore-controlled
  folder placement during Drive file creation.
- Technical debt introduced: no.
- Scalability assessment: this keeps all provider writes inside the existing
  Google Drive adapter.
- Refinements made: undecryptable Google OAuth now maps to a controlled
  integration error instead of `internal_server_error`.

### 7. Update Documentation and Knowledge
- Docs updated: this task contract and `docs/INTEGRATIONS.md`.
- Context updated: `.codex/context/PROJECT_STATE.md`,
  `.codex/context/TASK_BOARD.md`, `.agents/state/*`, and
  `docs/operations/post-deploy-smoke.md`.
- Learning journal updated: not applicable yet; no new recurring pitfall beyond
  existing deploy metadata and DB availability gaps.

## Acceptance Criteria
- [x] `POST /v1/google-drive/docs` accepts `parentId` and creates a Google Doc
  in folder `1U1GMpy0erVETPDA9ciRb7l1gVbSJfaff`.
- [x] `POST /v1/google-drive/sheets` accepts `parentId` and creates a Google
  Sheet through Drive `files.create` with spreadsheet MIME type.
- [x] Sheet values are written through Sheets API after creation.
- [ ] `GET /v1/google-drive/files/:id/content` reads both created files through
  CompanyCore content snapshots.
- [ ] Jarvis creates `Protokół Wielkiej Narady Spinaczy` and
  `Budżet Na Kawę I Inne Poważne Excely` through CompanyCore.
- [ ] Both files physically appear in Google Drive folder `12. Zarządzanie`.
- [x] Production smoke passes without printing raw secrets for health,
  connection, and failure classification; real write/read remains blocked by
  `integration_invalid_token`.

## Success Signal
- User or operator problem: Jarvis can use CompanyCore as the company Google
  Drive boundary for Docs/Sheets.
- Expected product or reliability outcome: CompanyCore returns file IDs/links
  and readable content snapshots for Jarvis-created Docs/Sheets.
- How success will be observed: production Jarvis tool calls create/read the
  two required files in the target folder.
- Post-launch learning needed: yes.

## Deliverable For This Stage
Code fix, local validation evidence, production blocker evidence, and deploy
plus smoke plan.

## Constraints
- Use CompanyCore as the only Google API boundary for Jarvis.
- Do not print or document raw API keys, OAuth tokens, cookies, or passwords.
- Do not add temporary bypasses or direct Jarvis Google access.

## Definition of Done
- [x] Code builds without errors.
- [ ] Feature works manually through the real production CompanyCore API.
- [x] No mock, placeholder, fake, or temporary data/path remains in delivered
  behavior.
- [x] Backend error handling exists for invalid stored OAuth.
- [ ] Production Docs/Sheets write and read smoke passes.
- [x] Changes are documented in the relevant source of truth.
- [ ] `DEFINITION_OF_DONE.md` was checked before status changes to `DONE`.

## Validation Evidence
- Tests: `npm run build` passed; `npm run validate` passed; `git diff --check`
  passed; `npm run test:api` blocked by missing `DATABASE_URL`.
- Manual checks: public production health returned `200`; production logs were
  inspected without exposing secrets; Jarvis agent smoke confirmed folder
  visibility through CompanyCore and write failure classification as
  `401 integration_invalid_token`.
- High-risk checks: secret material was not printed in logs or docs.
- Module confidence ledger updated: pending after deploy/smoke.
- Requirements matrix updated: pending after deploy/smoke.
- Risk register updated: pending after deploy/smoke.
- Reality status: blocked.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: pending final close.
- Real API/service path used: planned for production smoke.
- Endpoint and client contract match: partially verified in source and tests.
- DB schema and migrations verified: no schema change.
- Error state verified: production log root cause identified; code now maps the
  decrypt failure to controlled integration error.
- Regression check performed: static build and diff checks.

## Security / Privacy Evidence
- Data classification: Google Drive OAuth and CompanyCore API keys are secrets.
- Trust boundaries: Jarvis -> CompanyCore -> Google APIs.
- Permission or ownership checks: CompanyCore API key capabilities include
  `google-drive:docs:write` and `google-drive:sheets:write`.
- Secret handling: no raw secrets recorded.
- Fail-closed behavior: undecryptable OAuth returns `integration_invalid_token`.
- Residual risk: existing production OAuth ciphertext may require restoring the
  correct `INTEGRATION_SECRET_KEY` or owner re-consent before writes can pass.

## Deployment / Ops Evidence
- Deploy impact: medium.
- Env or secret changes: no code-required secret change, but production OAuth
  decrypt failure may require secret restoration or owner OAuth re-consent.
- Health-check impact: none.
- Smoke steps updated: use this task contract plus post-deploy smoke.
- Rollback note: redeploy previous backend image/container if health or
  protected routes fail.
- `DEPLOYMENT_GATE.md` reviewed: pending final close.

## Result Report
- Task summary: CompanyCore Sheets creation contract was corrected for Drive
  folder placement; OAuth decrypt failures are now controlled integration
  errors; commit `669c1c8` is deployed to production.
- Files changed: listed in Scope.
- How tested: build, validate, diff check; production health/log inspection.
- What is incomplete: real Jarvis-to-CompanyCore Docs/Sheets smoke is blocked
  by production `integration_invalid_token`.
- Next steps: complete owner Google OAuth re-consent from `/settings/drive`,
  then hand exact smoke to Jarvis agent.
- Decisions made: Jarvis remains forbidden from direct Google API writes.
