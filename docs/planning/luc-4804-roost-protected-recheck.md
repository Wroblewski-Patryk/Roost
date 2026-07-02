# LUC-4804 Roost Protected Recheck

## Task Contract

- Task Type: protected gate recheck
- Current Stage: verification
- Deliverable For This Stage: one bounded protected CompanyCore smoke result and blocker disposition for [LUC-261](/LUC/issues/LUC-261)
- Issue: [LUC-4804](/LUC/issues/LUC-4804)
- Parent: [LUC-261](/LUC/issues/LUC-261)
- Trigger: paused-role flow repair comment `6c93db1d-45fb-4a61-9d4d-b0595bcbed6c` reassigned this protected recheck to the active Roost PM.

## Goal

Consume the scoped protected recheck lane created after [LUC-2697](/LUC/issues/LUC-2697) detected a fresh protected gate fact, without product-code mutation, push, deploy expansion, or unrelated runtime change.

## Scope

- Read wake payload and heartbeat context for [LUC-4804](/LUC/issues/LUC-4804).
- Confirm redacted CompanyCore runtime metadata presence without exposing values.
- Run exactly one protected smoke command: `npm run aog:deploy-smoke`.
- Record the result and next blocker owner/action.

## Implementation Plan

1. Treat the latest reassignment comment as the action change: paused-role waiting becomes active Roost PM protected recheck triage.
2. Verify source-control posture and source ref before smoke.
3. Capture redacted env presence only.
4. Run one protected smoke.
5. Record proof in source-of-truth state and close the issue with a blocker disposition.

## Acceptance Criteria

- Protected smoke was run no more than once in this heartbeat.
- Credential values were not printed or inspected.
- Result includes timestamp, command, failure status, and request ID.
- [LUC-261](/LUC/issues/LUC-261) blocker state is classified with a named next owner/action.

## Definition Of Done

- Evidence packet exists in this file.
- `.codex/context/TASK_BOARD.md`, `.codex/context/PROJECT_STATE.md`, `.agents/state/active-mission.md`, and `.agents/state/system-health.md` reflect the result.
- Paperclip issue is updated to a clear final disposition.

## Result Report

- Redacted runtime metadata:
  - `COMPANYCORE_API_KEY_PRESENT=True`
  - `COMPANYCORE_BASE_URL_PRESENT=True HOST=api.roost.luckysparrow.ch`
  - `COMPANYCORE_MCP_COMMAND_MODE_PRESENT=False`
- UTC before smoke: `2026-07-01T21:29:30.1451725Z`
- Source ref: `95e654423fd7874f7d20a2c24894e59271f4caff`
- Source-control posture before this packet: shared mixed dirty worktree, `origin/main...HEAD=0 132`.
- Command: `npm run aog:deploy-smoke`
- Result: FAIL.
- Failure point: MCP manifest preflight.
- Failure detail: `status=403`, `error=invalid_api_key`, `requestId=6e753ad5-5e40-4f9e-b783-a2a7e31e85b4`.
- Deploy impact: none.
- Mutations not performed: product code, push, deploy, restart, provider mutation, runtime config mutation, credential value read, secret disclosure, browser, database, Docker, or background process.
- Decision: [LUC-261](/LUC/issues/LUC-261) remains blocked by Roost CompanyCore runtime key/scope repair, not by local product-code readiness.
- Next owner/action: runtime secret owner, Security/Ops owner, or board gate owner must provide or rotate a Roost CompanyCore service key that passes MCP manifest preflight, then create a fresh protected recheck lane or same-session approval.
