# LUC-1001 Account Access Workforce entityAuthority Doc Link

## Header
- ID: LUC-1001
- Title: Prove Account access missing-doc-link for `src/modules/workforce/workforce.service.ts#entityAuthority`
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-997](/LUC/issues/LUC-997)
- Priority: P1
- Coverage Ledger Rows: Account access `src/modules/workforce/workforce.service.ts#entityAuthority` `missing_doc_link`
- Module Confidence Rows: Account access workforce authority doc-link confidence
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access documentation-link drift for workforce authority readback
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1001-ACCOUNT-ACCESS-WORKFORCE-ENTITYAUTHORITY-DOC-LINK
- Mission Status: VERIFIED

## Context
[LUC-997](/LUC/issues/LUC-997) already cleared the
`src/modules/workforce/workforce.service.ts#entityAuthority`
`missing_test_link` gap and moved the same symbol to `missing_doc_link`. The
remaining work is documentation stewardship only: point the exact helper to an
accepted source-of-truth document that explains the `GET /v1/workforce`
authority packet without changing runtime behavior.

## Goal
Document the workforce authority packet in an accepted API contract, link the
exact `entityAuthority` symbol to that doc, refresh generated truth, and prove
the `missing_doc_link` row is cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1001-account-access-workforce-entityauthority-doc-link.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Explicit Exclusions
- No runtime logic changes in `src/modules/workforce/workforce.service.ts` or
  workforce routes.
- No schema, migration, deploy, push, protected smoke, browser proof, or live
  credential/provider work.
- No broader workforce UX or RBAC design work.

## Proof
- Documentation change:
  - `docs/API.md` now documents the read-only workforce authority packet
    returned by `GET /v1/workforce`, including
    `human_workspace_authority` versus `profile_not_bound`, recommended
    profiles, capability samples, and fail-closed blocked actions.
  - `docs/architecture/relations/documentation-links.csv` now links
    `src/modules/workforce/workforce.service.ts#entityAuthority` to
    `docs/API.md`.

## Generated Truth Refresh
- Architecture-awareness refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `2026-07-14T00:27:58.241Z` with `2890` entities /
  `7091` relations / `16471` files.
- App-completion refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS with `1253` items / `5` flows / `1140` missing test links /
  `28` missing doc links / `9` implemented-needs-proof / `0` blocked /
  `1177` risk items.
- Project Truth apply:
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  -> PASS generated `2026-07-14T00:28:06.622Z` with public probe `pass`,
  runtime findings `0`, incomplete event chains `0`, operational gate gaps
  `0`, and first gap now
  `src/modules/workspaces/workspaces.routes.ts#requireUserAuth`
  `missing_test_link`.

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes the workforce
  `authority` packet returned by `/v1/workforce`.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `src/modules/workforce/workforce.service.ts#entityAuthority` symbol to that
  doc.
- [x] Refreshed generated truth no longer reports
  `src/modules/workforce/workforce.service.ts#entityAuthority` as
  `missing_doc_link`.

## Definition Of Done Evidence
- `DEFINITION_OF_DONE.md` reviewed: yes.
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `NO_TEMPORARY_SOLUTIONS.md` reviewed: yes.
- `DEPLOYMENT_GATE.md` reviewed: yes.
- Reality status: verified.
- Deploy impact: none.

## Result Report
- Task summary: documented the workforce authority packet in `docs/API.md`,
  linked the exact `entityAuthority` helper to that contract, and refreshed
  generated truth for the same-symbol doc-link closure.
- Files changed: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet, and
  generated docs/state outputs refreshed after verification.
- How tested: generated architecture/app-completion/project-truth refresh plus
  readback inspection for the exact helper row.
- What is incomplete: no runtime behavior remains in this lane; the next
  Project Truth gap should route to the next generated owner after refresh.
- Next steps: close the issue with the refreshed generated evidence and route
  any new first gap to the next owner instead of extending this doc-only lane.
- Decisions made: reused `docs/API.md` as the accepted source-of-truth surface
  for the workforce authority packet instead of introducing a new planning doc
  or page-local note.
