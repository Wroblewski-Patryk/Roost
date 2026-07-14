# LUC-1034 Account Access isSignedIn Doc Link

## Header
- ID: LUC-1034
- Title: Prove Account access missing-doc-link for `web/src/api/auth-token.ts#isSignedIn`
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: not applicable
- Priority: P1
- Coverage Ledger Rows: Account access `web/src/api/auth-token.ts#isSignedIn` `missing_doc_link`
- Module Confidence Rows: Account access frontend auth-token isSignedIn doc-link confidence
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access frontend auth-token documentation-link drift
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1034-ACCOUNT-ACCESS-ISSIGNEDIN-DOC-LINK
- Mission Status: VERIFIED

## Context
Project Truth advanced to `web/src/api/auth-token.ts#isSignedIn`
`missing_doc_link` after [LUC-1028](/LUC/issues/LUC-1028) cleared the previous
`GET /v1/projects` proof gap and [LUC-1022](/LUC/issues/LUC-1022) completed the
neighboring `clearOwnerToken` proof lane. The accepted auth API contract in
`docs/API.md` already describes that signed-in UI state comes from the current
session token; this lane closes the missing exact symbol-to-doc relation and
refreshes generated truth without changing frontend runtime behavior.

## Goal
Link the exact `isSignedIn` helper to the accepted frontend auth-token
documentation, refresh generated truth, and prove the `missing_doc_link` row is
cleared.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1034-account-access-issignedin-doc-link.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Explicit Exclusions
- No runtime logic changes in `web/src/api/auth-token.ts`, auth pages, shell,
  or API routes.
- No schema, migration, deploy, push, protected smoke, browser proof, or live
  credential/provider work.
- No broader frontend auth-state redesign or token-storage migration.

## Proof
- Documentation change:
  - `docs/API.md` already documents that `web/src/api/auth-token.ts#isSignedIn`
    derives signed-in UI state from the presence of the
    `companycoreOwnerToken` session token instead of a separate cached flag.
  - `docs/architecture/relations/documentation-links.csv` links
    `web/src/api/auth-token.ts#isSignedIn` to `docs/API.md`.

## Generated Truth Refresh
- Architecture-awareness refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `2026-07-14T03:04:05.881Z` with `2911` entities /
  `7177` relations / `16481` files and materialized the exact
  `docs/API.md -> web/src/api/auth-token.ts#isSignedIn` documentation relation.
- App-completion refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS now reports `1264` items / `5` flows / `1141` missing test links /
  `26` missing doc links / `9` implemented-needs-proof / `0` blocked /
  `1176` risk items. The exact helper now reads `hasDoc=true` and no longer
  carries `missing_doc_link`.
- Project Truth apply:
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  -> PASS generated `2026-07-14T03:05:10.652Z` with public probe `pass`,
  runtime findings `0`, incomplete event chains `0`, operational gate gaps
  `0`, and first gap advanced from `web/src/api/auth-token.ts#isSignedIn`
  `missing_doc_link` to the same symbol `implemented_needs_proof`.
- Architecture status:
  `npm run architecture:status` -> PASS (`GREEN`, `454/765/35`, evidence queue
  `0`, chain worklist `0`).

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes frontend signed-in UI
  state as token-derived session state.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `web/src/api/auth-token.ts#isSignedIn` symbol to that doc.
- [x] Refreshed generated truth no longer reports
  `web/src/api/auth-token.ts#isSignedIn` as `missing_doc_link`.

## Definition Of Done Evidence
- `DEFINITION_OF_DONE.md` reviewed: yes.
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `NO_TEMPORARY_SOLUTIONS.md` reviewed: yes.
- `DEPLOYMENT_GATE.md` reviewed: yes.
- Reality status: verified.
- Deploy impact: none.

## Result Report
- Task summary: linked the exact `web/src/api/auth-token.ts#isSignedIn` helper
  to the accepted auth API contract in `docs/API.md`, refreshed generated
  truth, and cleared the dispatched `missing_doc_link` row.
- Files changed: `docs/architecture/relations/documentation-links.csv`, this
  task packet, generated architecture/status outputs under `docs/`, and the
  source-of-truth state files refreshed after verification.
- How tested: architecture-awareness refresh, app-completion refresh, Project
  Truth apply, `npm run architecture:status`, and exact-row readback from the
  refreshed indexes.
- What is incomplete: no further Documentation Steward work remains for
  `isSignedIn`, but the same helper is now the first routed
  `implemented_needs_proof` gap.
- Next steps: close the issue with the refreshed generated evidence and route
  `web/src/api/auth-token.ts#isSignedIn` `implemented_needs_proof` to QA
  Regression Lead + Project Manager.
- Decisions made: reused the existing `docs/API.md` auth-token contract instead
  of creating a new planning or UX documentation surface for this same-file
  helper.
