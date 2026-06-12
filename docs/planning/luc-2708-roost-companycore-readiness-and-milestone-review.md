# Task

## Header
- ID: LUC-2708
- Title: Roost CompanyCore readiness and milestone review
- Task Type: coordination
- Current Stage: verification
- Status: DONE
- Owner: Roost Project Manager
- Priority: P1
- Mission ID: LUC-2708-READINESS-MILESTONE-REVIEW
- Mission Status: DONE

## Goal
Review Roost/CompanyCore readiness, source-of-truth status, blocker chain,
environment assumptions, and next thin milestone issues so local work remains
ready for eventual VPS execution without assuming current VPS access.

## Scope
- `AGENTS.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/active-mission.md`
- `.agents/state/next-steps.md`
- `.agents/state/module-confidence-ledger.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/mvp-execution-plan.md`
- `docs/planning/luc-261-full-takeover-audit-and-operating-baseline.md`
- `docs/planning/luc-1214-roost-delivery-lanes-coordination-plan.md`

## Implementation Plan
1. Read the assigned Paperclip heartbeat context and confirm no pending comment
   delta changes the issue objective.
2. Re-read Roost coordinator startup files, active mission, queue, confidence
   ledger, and milestone planning sources.
3. Run the smallest non-protected continuity proof that is appropriate for a
   PM readiness review.
4. Publish a readiness and milestone packet with works/fails/unknown evidence,
   next thin milestone lanes, and explicit owner handoff.
5. Sync mission, board, project state, next steps, and module confidence.

## Acceptance Criteria
- [x] Review states the current readiness status with evidence-backed language.
- [x] Protected runtime assumptions are separated from local readiness.
- [x] Next thin milestone lanes are owner-scoped and do not require guessing.
- [x] Source-of-truth files are updated with the review outcome.
- [x] Issue can close without leaving a fake `in_progress` liveness path.

## Definition Of Done
- [x] Relevant canonical files were read.
- [x] Non-protected architecture continuity proof passed.
- [x] No protected smoke, deploy, push, restart, production mutation, or secret
  disclosure was performed.
- [x] Residual risks and unblock owners are explicit.
- [x] Follow-up work is routed into concrete thin lanes.

## Known-State Review

| Area | Current evidence | Status | Next action |
| --- | --- | --- | --- |
| Local architecture gate | `npm run architecture:status` passed on 2026-06-07 with `GREEN`, graph `452/761/34`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass `yes`. | verified | Keep as release gate on every implementation checkpoint. |
| Source-of-truth continuity | `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`, `.agents/state/active-mission.md`, `.agents/state/next-steps.md`, and `docs/planning/luc-261-full-takeover-audit-and-operating-baseline.md` all point to the same protected-runtime blocker pattern. | verified | Append this `LUC-2708` review and keep queue leaner in future cleanup. |
| Protected runtime gate | Latest protected deploy-smoke recheck from `LUC-2700` failed at MCP manifest preflight with `status=403`, `error=invalid_api_key`, `requestId=2a70da8f-f231-410b-88cf-8896bbaf3da9`. Environment presence check in this heartbeat showed `COMPANYCORE_API_KEY=present`, `COMPANYCORE_BASE_URL=present`, `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`, but presence is not acceptance. | blocked | Runtime secret owner repairs/provisions a key accepted by target MCP manifest policy; board/operator grants one fresh protected rerun approval. |
| Broad implementation readiness | `LUC-1214` parent coordination is closed with child planning lanes integrated. `PROCESS-CORE-002` remains the next useful non-protected audit lane. | implemented but not verified at runtime | Start a scoped architecture/backend audit lane before migrations, API/MCP writes, or UI implementation. |
| Test/release proof posture | `LUC-1216` planning exists for QA/release proof, and module confidence shows local route/test confidence with protected provider/live proof separated. | partially verified | Create a QA release-proof ladder issue that reruns local checks and names exact provider/protected gaps without consuming protected smoke. |
| VPS/deploy assumption | No current VPS access or restart/deploy permission is assumed in this issue. Coolify/VPS work remains governed by protected gates and runtime owner approval. | blocked for protected deploy proof | Keep local work ready; do not claim production readiness until protected smoke passes on target runtime. |

## Next Thin Milestone Lanes

| Lane | Owner | Scope | Acceptance proof |
| --- | --- | --- | --- |
| `[LUC-2709](/LUC/issues/LUC-2709)` Process Core workflow gap audit | Technical Solution Architect + Core Backend Engineer | Convert the `PROCESS-CORE-002` planning packet into a current-state coverage matrix over workflows, approvals, evidence, resources, workforce, capabilities, and MCP exposure. No migrations or write tools. | Audit table with `covered`, `partial`, `missing`, `deferred`; recommended read-packet sequence; architecture alignment note. |
| `[LUC-2710](/LUC/issues/LUC-2710)` QA local readiness ladder | QA and Verification Engineer | Define and run the smallest local proof set that keeps Roost ready while protected smoke remains blocked. Include architecture status, static checks, and high-risk API/web commands only when local prerequisites are healthy. | Pass/fail proof with exact commands, skipped checks with reason, and no protected target mutation. |
| `[LUC-2711](/LUC/issues/LUC-2711)` Runtime protected gate handoff | Deployment and Reliability Engineer + runtime secret owner | Keep the latest invalid-key evidence packaged for the next authorized target-runtime repair. Do not rerun protected smoke without fresh key-scope evidence and one-run approval. | Blocker packet with latest `403 invalid_api_key` request id, required env presence without values, and rerun command template. |

## Validation Evidence
- `npm run architecture:status` -> PASS (`GREEN`; graph `452` nodes,
  `761` relations, `34` chains; evidence queue `0`; chain worklist `0`;
  delta `0/0/0`; all gates pass `yes`).
- `git rev-parse --short HEAD` -> `a48a8ee`.
- UTC checkpoint: `2026-06-07T07:16:26.0592787Z`.
- Environment presence check, values not printed:
  `COMPANYCORE_API_KEY=present`, `COMPANYCORE_BASE_URL=present`,
  `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`.
- `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`, and
  `NO_TEMPORARY_SOLUTIONS.md` were reviewed for closure fit. Runtime feature
  DoD items are not applicable because this is a coordination/readiness review.

## Result Report
- Task summary: Roost/CompanyCore local readiness remains verified for
  architecture/source-of-truth continuity, while target protected runtime proof
  remains blocked by key acceptance at the MCP manifest policy.
- Files changed:
  - `docs/planning/luc-2708-roost-companycore-readiness-and-milestone-review.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
- Commands run:
  - `npm run architecture:status`
  - `git diff --stat`
  - `git diff --name-status`
  - `git rev-parse --short HEAD`
  - environment presence check for CompanyCore smoke variables without values
- What is incomplete: protected deploy-smoke is still blocked and was not rerun
  in this heartbeat because there was no fresh key repair evidence or one-run
  approval.
- Delegated follow-up issues:
  - `[LUC-2709](/LUC/issues/LUC-2709)` Process Core workflow gap audit.
  - `[LUC-2710](/LUC/issues/LUC-2710)` QA local readiness ladder.
  - `[LUC-2711](/LUC/issues/LUC-2711)` Runtime protected gate handoff packet.
- Deployment impact: none. No deploy, push, restart, protected smoke, runtime
  mutation, production mutation, database migration, or secret disclosure.
- Residual risk: active queue files still contain historical noise; future PM
  cleanup should compact `NOW` to the current release blockers and next thin
  lanes without losing historical evidence.
