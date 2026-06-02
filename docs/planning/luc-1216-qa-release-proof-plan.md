# Task

## Header
- ID: LUC-1216
- Title: QA and release proof planning for unverified Roost journeys
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: QA/Test
- Depends on: `.agents/state/module-confidence-ledger.md`, `.agents/state/requirements-verification-matrix.md`, `docs/operations/post-deploy-smoke.md`
- Priority: P1
- Mission ID: LUC-1214-DELIVERY-LANES-PLAN
- Mission Status: IN_PROGRESS

## Goal
Define the smallest release-proof ladder so users are not first testers on P0/P1 partial or blocked journeys.

## Scope
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/requirements-verification-matrix.md`
- `docs/operations/post-deploy-smoke.md`
- Planning outputs only (no runtime execution)

## Acceptance Criteria
- A journey-by-journey proof matrix exists for unverified/partial release-critical rows with owner, command/path, and explicit pass criteria.
- Local pre-release proofs are explicitly separated from production-gated proofs.
- Blocked proofs (`LUC-261`, `WEB-V1-PROD-PARITY`) include named unblock owner and required unblock action.
- The plan defines a minimal proof execution order that prevents end users from becoming first testers on P0/P1 journeys.

## Local Proof Ladder (Pre-Release)

| Order | Journey / Requirement | Current state | Required local proof | Pass criteria | Owner |
| --- | --- | --- | --- | --- | --- |
| 1 | `OPS-MGMT-002` + `OPS-DEPT-FILTER-001` | PARTIAL | `npm run test:api` on healthy PostgreSQL + targeted route smoke for `/areas?area=04-operacje&view=tasks` and `/areas?area=04-operacje&view=calendar` | API suite passes and task/calendar routes match canonical behavior with no console/request errors | Backend + Frontend + QA |
| 2 | `ASSETS-FILES-001` + `ASSETS-FOLDERS-002` | PARTIAL | `npm run test:api` + targeted static/interactive smoke for `/areas?area=08-zasoby&view=files` | API regressions pass; file/folder tree, previews, and folder edit command behavior work without overflow or broken requests | Backend + Frontend + QA |
| 3 | `ASSETS-GDRIVE-006` / `REQ-ASSETS-GDRIVE-006` | PARTIAL | Re-run Drive-context regression in `npm run test:api` and confirm low-limit folder+non-folder behavior | Regression proves folder rows do not hide non-folder files at low limits | Backend + QA |
| 4 | `REQ-DMS-06-WORKFORCE-001` | partially verified | `npm run test:api` + focused `06 People & Agents` smoke | Workforce API and directory journey pass with no regression in manual sync queue handling | Backend + Frontend + QA |
| 5 | `WEB-V1-PROD-PARITY` | BLOCKED | No local substitute; requires deploy-time proof | Local gate cannot close this row; keep blocked until production parity evidence is captured | Frontend + Ops + QA |

## Production-Gated Proofs

| Order | Journey | Command / path | Pass criteria | Blocker owner if blocked |
| --- | --- | --- | --- | --- |
| P1 | Runtime health and revision parity | `GET /health` on web/API targets | Target environment is healthy and reports expected commit/image metadata | Ops/Release |
| P2 | Authenticated route parity (`WEB-V1-PROD-PARITY`) | Owner-session route screenshots: `/dashboard`, `/areas?area=01-strategia&view=overview`, `/areas?area=04-operacje&view=tasks`, `/areas?area=08-zasoby&view=files` | No horizontal overflow, no failed requests (except approved font noise), no console errors, and route content matches local verified behavior | Frontend + QA |
| P3 | Protected adapter gate (`LUC-261`) | One approved same-session `npm run adapter:smoke` or `npm run aog:deploy-smoke` per board gate | `/v1/connection` succeeds with valid key scope; proof archived with UTC timestamp and request id | Runtime secret owner + board/operator |
| P4 | Drive dataset proof in production | `/v1/assets/context` + `/v1/google-drive/files` with owner-approved access | File/folder counts and preview availability align with expected imported Drive dataset | Backend + QA + Ops |

## Release Risk Coverage
- High risk if skipped: protected gate auth (`LUC-261`), production parity (`WEB-V1-PROD-PARITY`), partial Ops/Assets flows currently awaiting full API rerun.
- Medium risk if skipped: workforce regression coverage after schema/route evolution.
- Low risk in this lane: architecture-only accepted rows (`PROCESS-CORE-001`, `ONTOLOGY-001`) remain intentionally outside runtime release gating.

## Recommended Execution Order
1. Re-establish healthy validation PostgreSQL and run `npm run test:api` once as the shared local gate for Ops/Assets/Workforce partial rows.
2. Run focused route smokes for `04 Operations`, `08 Assets`, and `06 People & Agents` to close UI-level residuals after API gate.
3. After deploy, run production health + authenticated parity capture.
4. Execute one board-approved protected adapter smoke for `LUC-261`.
5. Capture final release disposition: `verified`, `blocked`, or `partially verified` with explicit owner/action.

## Result Report
- Task summary: planning-only QA release-proof matrix for P0/P1 unverified or partial journeys.
- Files changed: this planning packet and child-lane packet/parent-integration status updates.
- Validation performed: source-of-truth review for module confidence, requirements matrix, and post-deploy smoke contract.
- Residual blockers: `LUC-261` remains externally gated by key scope and one-run board approval; `WEB-V1-PROD-PARITY` requires deploy-time authenticated evidence.

## Continuation Checkpoint (2026-06-01, source_scoped_recovery_action)
- Wake metadata reported `issue status: blocked`, but this child lane remains `DONE` in planning scope and has complete acceptance-criteria coverage.
- No new comments or requirements changed the lane output; no runtime/protected/deploy actions were executed in this checkpoint.
- Disposition recommendation: keep `LUC-1216` as `done` and treat blocking state as parent-integration tracking drift unless new QA planning scope is explicitly added.
