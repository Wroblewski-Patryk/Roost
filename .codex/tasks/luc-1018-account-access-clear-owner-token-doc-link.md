# LUC-1018 Account Access clearOwnerToken Doc Link

## Header
- ID: LUC-1018
- Title: Prove Account access missing-doc-link for `web/src/api/auth-token.ts#clearOwnerToken`
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: not applicable
- Priority: P1
- Coverage Ledger Rows: Account access `web/src/api/auth-token.ts#clearOwnerToken` `missing_doc_link`
- Module Confidence Rows: Account access frontend auth-token clearOwnerToken doc-link confidence
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access frontend auth-token documentation-link drift
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1018-ACCOUNT-ACCESS-CLEAROWNERTOKEN-DOC-LINK
- Mission Status: VERIFIED

## Context
Project Truth advanced to `web/src/api/auth-token.ts#clearOwnerToken`
`missing_doc_link` after [LUC-1015](/LUC/issues/LUC-1015) cleared the previous
workspace-route doc-link gap. The helper already has route-level auth proof in
existing Account access evidence, so this lane is documentation stewardship
only: connect the exact frontend token-reset helper to accepted source-of-truth
auth contract language without changing runtime behavior.

## Goal
Document the frontend session-token reset contract, link the exact
`clearOwnerToken` symbol to that accepted doc, refresh generated truth, and
prove the `missing_doc_link` row is cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1018-account-access-clear-owner-token-doc-link.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Explicit Exclusions
- No runtime logic changes in `web/src/api/auth-token.ts`, auth pages, or API
  routes.
- No schema, migration, deploy, push, protected smoke, browser proof, or live
  credential/provider work.
- No broader frontend auth-state redesign or token-storage migration.

## Proof
- Documentation change:
  - `docs/API.md` documents the frontend auth-token storage contract for
    `ownerToken`, `setOwnerToken`, `clearOwnerToken`, and `isSignedIn`,
    including sessionStorage key ownership and stale-token removal on sign-out
    or auth reset.
  - `docs/architecture/relations/documentation-links.csv` links
    `web/src/api/auth-token.ts#clearOwnerToken` to `docs/API.md`.

## Generated Truth Refresh
- Architecture-awareness refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `2026-07-14T02:04:24.823Z` with `2898` entities /
  `7144` relations / `16476` files.
- App-completion refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `1254` items / `5` flows / `1131` missing test links /
  `27` missing doc links / `9` implemented-needs-proof / `0` blocked /
  `1167` risk items. The exact helper now reads `hasDoc=true` and no longer
  carries `missing_doc_link`.
- Project Truth apply:
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  -> PASS generated `2026-07-14T02:05:32.013Z` with public probe `pass`,
  runtime findings `0`, incomplete event chains `0`, operational gate gaps
  `0`, and first gap advanced from the same symbol `missing_doc_link` to the
  same symbol `implemented_needs_proof`.

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes frontend bearer-token
  session storage and the clear-on-sign-out/reset behavior.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `web/src/api/auth-token.ts#clearOwnerToken` symbol to that doc.
- [x] Refreshed generated truth no longer reports
  `web/src/api/auth-token.ts#clearOwnerToken` as `missing_doc_link`.

## Definition Of Done Evidence
- `DEFINITION_OF_DONE.md` reviewed: yes.
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `NO_TEMPORARY_SOLUTIONS.md` reviewed: yes.
- `DEPLOYMENT_GATE.md` reviewed: yes.
- Reality status: verified.
- Deploy impact: none.

## Result Report
- Task summary: documented the frontend auth-token session-storage contract in
  `docs/API.md`, linked the exact `clearOwnerToken` helper to that accepted
  doc, and refreshed generated truth until the same-symbol `missing_doc_link`
  gap cleared.
- Files changed: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet, and
  the source-of-truth/generated outputs refreshed after verification.
- How tested: generated architecture/app-completion/project-truth refresh plus
  readback inspection for the exact helper row.
- What is incomplete: no further Documentation Steward work remains in this
  lane, but the same helper still needs proof-routing as
  `implemented_needs_proof`.
- Next steps: close the issue with the refreshed generated evidence and route
  the new first gap `web/src/api/auth-token.ts#clearOwnerToken`
  `implemented_needs_proof` to QA Regression Lead + Project Manager.
- Decisions made: reuse `docs/API.md` as the accepted source-of-truth surface
  for frontend auth-token behavior instead of introducing a new planning or UX
  doc.
