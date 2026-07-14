# LUC-1015 Account Access Workspace requireUserAuth Doc Link

## Header
- ID: LUC-1015
- Title: Prove Account access missing-doc-link for `src/modules/workspaces/workspaces.routes.ts#requireUserAuth`
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Product Docs
- Depends on: [LUC-1010](/LUC/issues/LUC-1010)
- Priority: P1
- Coverage Ledger Rows: Account access `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` `missing_doc_link`
- Module Confidence Rows: Account access workspace route user-auth doc-link confidence
- Requirement Rows: not applicable
- Quality Scenario Rows: not applicable
- Risk Rows: Account access documentation-link drift for workspace user-auth guard
- Iteration: 1
- Operation Mode: TESTER
- Mission ID: LUC-1015-ACCOUNT-ACCESS-WORKSPACES-REQUIREUSERAUTH-DOC-LINK
- Mission Status: VERIFIED

## Context
[LUC-1010](/LUC/issues/LUC-1010) already cleared the
`src/modules/workspaces/workspaces.routes.ts#requireUserAuth`
`missing_test_link` gap and moved the same symbol to `missing_doc_link`. The
remaining work is documentation stewardship only: point the exact helper to an
accepted source-of-truth document that explains the owner-only workspace list,
create, and select guard without changing runtime behavior.

## Goal
Document the workspace user-auth guard in an accepted API contract, link the
exact `requireUserAuth` symbol to that doc, refresh generated truth, and prove
the `missing_doc_link` row is cleared.

## Scope
- `docs/API.md`
- `docs/architecture/relations/documentation-links.csv`
- `.codex/tasks/luc-1015-account-access-workspaces-requireuserauth-doc-link.md`
- generated architecture/app-completion/project-truth outputs under `docs/`
- relevant source-of-truth state files updated for this doc-link closure

## Explicit Exclusions
- No runtime logic changes in `src/modules/workspaces/workspaces.routes.ts` or
  auth middleware.
- No schema, migration, deploy, push, protected smoke, browser proof, or live
  credential/provider work.
- No broader workspace UX or RBAC design work.

## Proof
- Documentation change:
  - `docs/API.md` now documents the owner-only workspace switching contract for
    `GET /v1/workspaces`, `POST /v1/workspaces`, and
    `POST /v1/workspaces/:id/actions/select`, including bearer-user-only
    access, fail-closed API-key denial, membership checks, and fresh
    workspace-scoped token issuance.
  - `docs/architecture/relations/documentation-links.csv` now links
    `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` to
    `docs/API.md`.

## Generated Truth Refresh
- Architecture-awareness refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-architecture-awareness-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `2026-07-14T01:34:48.409Z` with `2897` entities /
  `7133` relations / `16476` files.
- App-completion refresh:
  `node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-app-completion-index.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost`
  -> PASS generated `2026-07-14T01:35:40.058Z` with `1254` items / `5` flows /
  `1131` missing test links / `28` missing doc links /
  `8` implemented-needs-proof / `0` blocked / `1167` risk items.
- Project Truth apply:
  `ROOST_PUBLIC_URL=https://roost.luckysparrow.ch ROOST_API_PUBLIC_URL=https://api.roost.luckysparrow.ch node C:/Personal/Projekty/Aplikacje/Paperclip_Softwarehouse/scripts/build-project-truth-indexes.mjs --project Roost --root C:/Personal/Projekty/Aplikacje/Roost --apply`
  -> PASS generated `2026-07-14T01:35:57.823Z` with public probe `pass`,
  runtime findings `0`, incomplete event chains `0`, operational gate gaps
  `0`, and first gap advanced to
  `web/src/api/auth-token.ts#clearOwnerToken` `missing_doc_link`.

## Acceptance Criteria
- [x] An accepted source-of-truth doc explicitly describes the owner-only
  workspace guard for list/create/select routes.
- [x] `docs/architecture/relations/documentation-links.csv` links the exact
  `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` symbol to that
  doc.
- [x] Refreshed generated truth no longer reports
  `src/modules/workspaces/workspaces.routes.ts#requireUserAuth` as
  `missing_doc_link`.

## Definition Of Done Evidence
- `DEFINITION_OF_DONE.md` reviewed: yes.
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- `NO_TEMPORARY_SOLUTIONS.md` reviewed: yes.
- `DEPLOYMENT_GATE.md` reviewed: yes.
- Reality status: verified.
- Deploy impact: none.

## Result Report
- Task summary: documented the workspace owner-only auth guard in `docs/API.md`
  linked the exact `requireUserAuth` helper to that contract, and refreshed
  generated truth until the same-symbol doc-link gap cleared.
- Files changed: `docs/API.md`,
  `docs/architecture/relations/documentation-links.csv`, this task packet, and
  the source-of-truth/generated outputs refreshed after verification.
- How tested: generated architecture/app-completion/project-truth refresh plus
  readback inspection for the exact helper row.
- What is incomplete: no further work remains in this doc-link lane; the next
  routed gap is the Account access frontend auth-token helper family.
- Next steps: close the issue with the refreshed generated evidence and route
  the new first gap `web/src/api/auth-token.ts#clearOwnerToken` to Docs Memory
  Lead + Project Manager instead of extending this workspace helper lane.
- Decisions made: reused `docs/API.md` as the accepted source-of-truth surface
  for the workspace guard instead of introducing a new planning doc or route-
  local note.
