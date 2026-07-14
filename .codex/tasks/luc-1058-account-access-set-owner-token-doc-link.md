# LUC-1058 Account Access setOwnerToken Doc Link

## Header
- ID: LUC-1058
- Title: Prove Account access missing-doc-link for `web/src/api/auth-token.ts#setOwnerToken`
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: not applicable
- Priority: P1
- Coverage Ledger Rows: Account access `web/src/api/auth-token.ts#setOwnerToken` `missing_doc_link`
- Module Confidence Rows: Account access frontend auth-token setOwnerToken doc-link confidence
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access frontend auth-token documentation-link drift
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1058-ACCOUNT-ACCESS-SETOWNERTOKEN-DOC-LINK
- Mission Status: VERIFIED

## Context
Project Truth advanced to `web/src/api/auth-token.ts#setOwnerToken`
`missing_doc_link` after [LUC-1043](/LUC/issues/LUC-1043) closed the sibling
`ownerToken` proof gap. The accepted auth API contract in `docs/API.md`
already documents that `setOwnerToken` writes the session-scoped
`companycoreOwnerToken` bearer token after auth or workspace selection, so
this lane only needs the exact symbol-to-doc relation plus generated truth
refresh.

## Goal
Link the exact `setOwnerToken` helper to the accepted frontend auth-token
documentation, refresh generated truth, and prove the `missing_doc_link` row is
cleared.

## Scope
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1058-account-access-set-owner-token-doc-link.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Explicit Exclusions
- No runtime logic changes in `web/src/api/auth-token.ts`, frontend auth flows,
  shell code, or API routes.
- No schema, migration, deploy, push, protected smoke, browser proof, or live
  credential/provider work.
- No broader auth-token storage redesign or session handling change.

## Proof
- Documentation change:
  - `docs/API.md` already documents that
    `web/src/api/auth-token.ts#setOwnerToken` stores the current bearer token in
    `window.sessionStorage` key `companycoreOwnerToken` after successful auth or
    workspace selection.
  - `docs/architecture/relations/documentation-links.csv` now links
    `web/src/api/auth-token.ts#setOwnerToken` to `docs/API.md`.

## Generated Truth Refresh
- Architecture-awareness refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `2026-07-14T05:36:53.993Z` with `2934` entities /
  `7226` relations / `16491` files and materialized the exact
  `docs/API.md -> web/src/api/auth-token.ts#setOwnerToken` documentation
  relation plus the new task/state trace.
- App-completion refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS now reports `1283` items / `5` flows / `1160` missing test links /
  `24` missing doc links / `9` implemented-needs-proof / `0` blocked /
  `1193` risk items. The exact helper now reads `hasDoc=true` and no longer
  carries `missing_doc_link`.
- Project Truth apply:
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  -> PASS generated `2026-07-14T05:36:53.989Z` with public probe `pass`,
  runtime findings `0`, incomplete event chains `0`, operational gate gaps
  `0`, and first gap advanced from `web/src/api/auth-token.ts#setOwnerToken`
  `missing_doc_link` to the same symbol `implemented_needs_proof`.
- Architecture status:
  `npm run architecture:status` -> PASS (`GREEN`, `454/765/35`, evidence queue
  `0`, chain worklist `0`).

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes frontend bearer
  token writes to session storage after auth or workspace selection.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `web/src/api/auth-token.ts#setOwnerToken` symbol to that doc.
- [x] Refreshed generated truth no longer reports
  `web/src/api/auth-token.ts#setOwnerToken` as `missing_doc_link`.

## Definition Of Done Evidence
- `DEFINITION_OF_DONE.md` reviewed: yes.
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `NO_TEMPORARY_SOLUTIONS.md` reviewed: yes.
- `DEPLOYMENT_GATE.md` reviewed: yes.
- Reality status: verified.
- Deploy impact: none.

## Result Report
- Task summary: added the exact `web/src/api/auth-token.ts#setOwnerToken`
  helper-to-doc relation, added the durable task/state packet for the helper,
  refreshed generated truth, and cleared the dispatched `missing_doc_link`
  row.
- Files changed: `docs/architecture/relations/documentation-links.csv`, this
  task packet, generated architecture/status outputs under `docs/`, and the
  source-of-truth state files refreshed after verification.
- How tested: architecture-awareness refresh, app-completion refresh, Project
  Truth apply, `npm run architecture:status`, and exact-row readback from the
  refreshed indexes.
- What is incomplete: no further Documentation Steward work remains for
  `setOwnerToken`, but the same helper is now the first routed
  `implemented_needs_proof` gap.
- Next steps: close the issue with the refreshed generated evidence and route
  `web/src/api/auth-token.ts#setOwnerToken` `implemented_needs_proof` to QA
  Regression Lead + Project Manager.
- Decisions made: reused the existing `docs/API.md` auth-token contract
  instead of creating a new planning or UX documentation surface for this same
  file helper.
