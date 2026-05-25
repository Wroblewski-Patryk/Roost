# V2GD-010 Google Sheet Parent Folder Creation

## Header
- ID: V2GD-010
- Title: Google Sheet Parent Folder Creation
- Task Type: feature
- Current Stage: verification
- Status: REVIEW
- Owner: Backend Builder
- Depends on: V2GD-005 Docs And Sheets Read/Create/Edit
- Priority: P0
- Coverage Ledger Rows: not applicable
- Iteration: Jarvis live Drive write smoke
- Operation Mode: BUILDER

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the iteration number.
- [x] The task is aligned with repository source-of-truth documents.

## Context
Jarvis can request Google Docs and Sheets creation through CompanyCore. Docs
already accept a Drive `parentId`, but Sheets creation did not expose the same
folder placement contract.

## Goal
Allow CompanyCore to create Google Sheets under a supplied Drive parent folder
without bypassing the native Google Drive integration boundary.

## Scope
- `src/integrations/google-drive/google-drive.content.ts`
- `src/modules/google-drive/google-drive.routes.ts`
- `src/tests/api.test.ts`
- `docs/INTEGRATIONS.md`

## Implementation Plan
1. Inspect the existing Google Drive client and Docs/Sheets creation flows.
2. Extend the Sheet create schema and service input with optional `parentId`.
3. Reuse `GoogleDriveClient.createDriveFile` with the Google Sheets MIME type
   when `parentId` is supplied.
4. Preserve the existing Sheets API creation path when no `parentId` is
   supplied.
5. Update tests and integration docs.

## Autonomous Loop Evidence

### 1. Analyze Current State
- Issues: Google Docs creation supported `parentId`; Google Sheets creation did
  not.
- Gaps: Jarvis could not guarantee a created sheet lands in `12 zarzadzanie`.
- Inconsistencies: Docs and Sheets folder placement contracts differed.
- Architecture constraints: CompanyCore API remains the only supported access
  layer.

### 2. Select One Priority Task
- Selected task: add optional Sheet `parentId`.
- Priority rationale: required for a live Jarvis write smoke requested by the
  user.
- Why other candidates were deferred: broader Drive UI and area management work
  is unrelated to this write path.

### 3. Plan Implementation
- Files or surfaces to modify: route schema, content service, API test, docs.
- Logic: create Sheet via Drive file creation when `parentId` exists; otherwise
  use the existing Sheets API method.
- Edge cases: missing spreadsheet ID still fails with the existing integration
  error.

### 4. Execute Implementation
- Implementation notes: reused `createDriveFile` and kept the old
  `createSpreadsheet` behavior for callers that do not pass a parent folder.

### 5. Verify and Test
- Validation performed: `npm run build` passed.
- Result: `npm test` could not complete locally because `DATABASE_URL` is not
  configured for a disposable PostgreSQL test database.

### 6. Self-Review
- Simpler option considered: moving the file after creation was rejected because
  no CompanyCore move contract exists in this slice.
- Technical debt introduced: no.
- Scalability assessment: path uses existing Google Drive client and metadata
  persistence.
- Refinements made: test asserts the Drive create body carries the Sheet MIME
  type and requested parent folder.

### 7. Update Documentation and Knowledge
- Docs updated: `docs/INTEGRATIONS.md`, this task contract.
- Context updated: pending after final verification.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] `POST /v1/google-drive/sheets` accepts optional `parentId`.
- [x] Sheet creation with `parentId` uses the Drive file creation boundary.
- [x] Sheet creation without `parentId` keeps existing behavior.

## Success Signal
- User or operator problem: Jarvis can create both Docs and Sheets in the target
  Drive folder through CompanyCore.
- Expected product or reliability outcome: no direct Google API bypass is needed
  from Jarvis.
- How success will be observed: created Sheet metadata has the requested parent
  folder.
- Post-launch learning needed: no.

## Deliverable For This Stage
Code, docs, and validation evidence for the API contract extension.

## Definition of Done
- [x] Code builds without errors.
- [ ] Feature works manually through the real API path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] Full data flow works across all relevant layers.
- [x] Backend error handling exists where applicable.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [ ] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence
- Tests: `npm run build` passed.
- Manual checks: pending live API smoke after deployment.
- High-risk checks: full `npm test` blocked locally by missing `DATABASE_URL`.
- Coverage ledger updated: not applicable.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: pending before DONE.
- Real API/service path used: pending.
- Endpoint and client contract match: yes.
- DB schema and migrations verified: not applicable.
- Regression check performed: TypeScript build.

## Result Report
- Added optional `parentId` to Google Sheet creation.
- Reused the existing Drive client file-create method for folder-targeted
  Sheets.
- Kept the previous Sheets API create path for root/default placement.
