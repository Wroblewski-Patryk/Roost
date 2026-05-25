# Task

## Header
- ID: DMS-01-005B
- Title: Production Strategy Context Smoke
- Task Type: release
- Current Stage: release
- Status: DONE
- Owner: Ops/Release + QA/Test
- Depends on: DMS-01-005A
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: `DMS-01-005A`
- Requirement Rows: `REQ-DMS-01-005B`
- Quality Scenario Rows: `QA-DMS-01-005B`
- Risk Rows: `RISK-DMS-01-005B`
- Iteration: 2026-05-16-DMS-01-005B
- Operation Mode: BUILDER
- Mission ID: V1-DMS-READ-PACKETS
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the release checkpoint.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were bootstrapped from repository sources, or confirmed not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence.

## Mission Block
- Mission objective: deploy the verified Strategy context read packet and prove it in production.
- Release objective advanced: V1 department read packets become production-usable for Paperclip and owner workflows.
- Included slices: manual VPS rollover, public web/API health checks, protected owner-auth `/v1/strategy/context` smoke, cleanup evidence, source-of-truth updates.
- Explicit exclusions: no web board, no strategy write commands, no schema changes, no provider writes.
- Checkpoint cadence: commit and push release evidence after smoke passes.
- Stop conditions: canary health failure, public health mismatch, protected route failure, unexpected mutation, or missing rollback container.
- Handoff expectation: next task can start `03 Sales` read packet or a guarded Operations command contract.

## Context
DMS-01-005A locally verified `GET /v1/strategy/context` at commit `5db4dd8`. Production currently runs the prior Operations smoke backend, so the Strategy route must be rolled out and smoked before claiming deployed readiness.

## Goal
Run the accepted manual VPS rollout path and prove production exposes the new Strategy context route safely.

## Scope
- VPS Docker backend container rollover
- Public `https://api.companycore.luckysparrow.ch/health`
- Public `https://companycore.luckysparrow.ch/health`
- Protected `GET /v1/strategy/context`
- `docs/operations/post-deploy-smoke.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/*` relevant state files
- `.agents/core/project-memory-index.md`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan
1. Confirm clean commit and archive the exact `HEAD`.
2. Build the backend image on the VPS with the current production env and labels.
3. Run canary health before replacing the active backend.
4. Replace the active backend while retaining the previous container as rollback.
5. Smoke public health and protected Strategy context.
6. Update release evidence and commit/push docs.

## Acceptance Criteria
- [x] Production health reports commit `5db4dd8`.
- [x] Protected `/v1/strategy/context` returns `01-strategia`, `strategy-governance`, and a read-only agent packet.
- [x] Previous backend is retained stopped as rollback.
- [x] Release evidence is committed and pushed.

## Validation Evidence
- Tests: public web/API health; protected owner-auth `GET /v1/strategy/context`; canary and final local container health.
- Manual checks: production now runs `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5db4dd8`; previous `manual-9ff1882` is retained stopped as rollback.
- Cleanup: local archive and VPS `/tmp` rollout artifacts removed.
- Reality status: verified

## Result Report
- Task summary: Deployed commit `5db4dd8b1fe9058d1fc78ebc957c0716ebd4822a` and proved the protected Strategy context route in production.
- Files changed: release evidence in `docs/operations/post-deploy-smoke.md` and source-of-truth state files.
- How tested: VPS canary health, final container local health, public web/API health, and protected owner-auth `/v1/strategy/context`.
- What is incomplete: Strategy web board and write commands remain future tasks; production Strategy data is sparse and needs real goal/decision curation.
- Next steps: continue with the next V1 department read packet, likely `03 Sales`, or a guarded Operations command contract if write planning becomes higher priority.
