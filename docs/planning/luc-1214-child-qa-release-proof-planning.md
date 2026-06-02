# Task

## Header
- ID: LUC-1214-CHILD-QA-RELEASE-PROOF-PLAN
- Title: QA and release proof planning for unverified and partial Roost journeys
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: QA/Test
- Depends on: module-confidence and requirements evidence files
- Priority: P1
- Mission ID: LUC-1214-DELIVERY-LANES-PLAN
- Mission Status: IN_PROGRESS

## Goal
Plan the minimal local proof matrix required before any production gate for unverified/partial critical journeys.

## Exact Scope
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/requirements-verification-matrix.md`
- `docs/operations/post-deploy-smoke.md`
- QA planning packet output only

## Forbidden Actions
- No runtime/prod gate execution
- No deploy/protected smoke rerun
- No implementation changes in app code

## Validation / Proof
- Journey-by-journey proof matrix with owner, command/path, and pass criteria
- Separation between local proof and production-gated proof
- Explicit blocker ownership for blocked proofs

## Acceptance Criteria
- `docs/planning/luc-1216-qa-release-proof-plan.md` contains both local and production-gated proof ladders for all targeted unverified/partial critical rows.
- Each proof row names owner, proof command/path, and pass criteria.
- Residual blockers include named owner/action and are visible in the lane report.

## Expected Report Back
- Objective status
- Files changed
- Planned proofs and risk coverage
- Residual risks and hard blockers
- Recommended order for running proofs

## Residual-Risk Reporting
Call out proof gaps where users could become first testers if not handled before release.

## Lane Report
- Objective status: completed in planning scope.
- Files changed: `docs/planning/luc-1216-qa-release-proof-plan.md`.
- Planned proofs and risk coverage: local proof ladder and production-gated proof ladder are defined with owners, commands/paths, and pass criteria.
- Residual risks and hard blockers:
  - `LUC-261` protected smoke remains blocked on runtime key scope and board one-run approval.
  - `WEB-V1-PROD-PARITY` requires deploy-time authenticated route evidence.
- Recommended order for running proofs: see the ordered execution block in `docs/planning/luc-1216-qa-release-proof-plan.md`.
