# Task

## Header
- ID: LUC-261
- Title: [Roost] Full takeover audit and operating baseline
- Task Type: research
- Current Stage: verification
- Status: BLOCKED
- Owner: Planner
- Priority: P1
- Mission ID: LUC-261-TAKEOVER-BASELINE
- Mission Status: VERIFIED

## Goal
Create a durable, evidence-backed takeover baseline so future Roost execution can continue from repository state without hidden chat context.

## Scope
- `AGENTS.md`
- `.agents/state/active-mission.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/next-steps.md`
- `docs/planning/luc-101-roost-takeover-readiness-known-state-baseline.md`
- `docs/planning/luc-183-intake-readiness-scan-note.md`
- `docs/planning/luc-187-canonical-docs-root-and-takeover-handoff.md`
- `docs/planning/luc-190-activation-readiness-review-after-scm-cleanup.md`

## Implementation Plan
1. Re-read canonical mission, board, and state files.
2. Reconcile active readiness signals versus queue and activation gates.
3. Publish one takeover operating baseline packet with explicit disposition and next lane.
4. Sync source-of-truth state files to reference this baseline.

## Autonomous Loop Evidence

### 1. Analyze Current State
- The latest durable checkpoint before this issue was `LUC-190` (`2026-05-26`) with readiness `GO` only for a narrow protected-proof lane.
- Roost remains activation-gated for broad implementation.
- Canonical documentation root is pinned to repository `docs/**`.

### 2. Select One Priority Mission Objective
- Selected task: publish and sync full takeover audit baseline for `LUC-261`.
- Priority rationale: this issue is the current heartbeat scope and governs takeover continuity quality.

### 3. Plan Implementation
- Use only documentation/state updates.
- Do not mutate runtime, secrets, deploy surfaces, or production systems.

### 4. Execute Implementation
- Compiled the baseline status and mandatory next executable lane from canonical files.
- Synced mission/task/project memory with this issue outcome.

### 5. Verify and Test
- Verification performed: source review parity across mission, board, state, and planning handoff packets.
- Result: consistent; no architecture mismatch discovered.

### 6. Self-Review
- Simpler option considered: leave only a short comment. Rejected because it would not create durable repository memory.
- Technical debt introduced: no.

### 7. Update Documentation and Knowledge
- Docs updated: yes.
- Context updated: yes.
- Learning journal updated: not applicable.

## Acceptance Criteria
- [x] Baseline packet records current takeover status with concrete evidence.
- [x] Canonical state files reference this issue outcome.
- [x] Next executable lane is explicit and activation-safe.

## Deliverable For This Stage
Verified takeover operating baseline with synchronized source-of-truth updates.

## Validation Evidence
- Tests: not applicable (documentation/state-only checkpoint).
- Manual checks:
  - `Get-Content .agents/state/active-mission.md`
  - `Get-Content .codex/context/TASK_BOARD.md`
  - `Get-Content .codex/context/PROJECT_STATE.md`
  - `Get-Content .agents/state/next-steps.md`
- Reality status: verified

## Result Report
- Task summary: takeover baseline publication is complete, and the issue remains blocked on the protected runtime proof lane.
- Files changed:
  - `docs/planning/luc-261-full-takeover-audit-and-operating-baseline.md`
  - `.agents/state/active-mission.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/next-steps.md`
- What is incomplete: protected runtime proof lane still requires approved secure key injection.
- Next steps:
  1. Run `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<key> npm run aog:deploy-smoke`.
  2. Keep `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION` disabled unless explicitly approved.
- Decisions made:
  - `LUC-261` disposition is `blocked` until the protected deploy-smoke proof is executed with approved secure credentials.
  - Broader implementation remains activation-gated pending approved protected-proof execution.

## Continuation Addendum (2026-05-27)

- Heartbeat objective: execute the first protected proof lane after baseline publication.
- Commands run:
  - `npm run architecture:status` -> PASS (`452/761/34`, queues `0`, all gates pass).
  - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke` -> FAIL: `[aog-deploy-smoke] COMPANYCORE_API_KEY is required.`
- Outcome: protected proof lane is blocked only by secure key injection, not by runtime reachability or architecture health.
- Unblock owner/action:
  1. Portfolio Director/Board or runtime secret owner provides approved secure `COMPANYCORE_API_KEY`.
  2. Rerun `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<key> npm run aog:deploy-smoke`.
  3. Keep `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=true` disabled unless explicit approval is granted.

## Continuation Addendum (2026-05-27, heartbeat recheck)

- Heartbeat objective: verify whether protected deploy-smoke prerequisites are now present in runtime.
- Commands run:
  - PowerShell environment presence check:
    - `COMPANYCORE_API_KEY_PRESENT=False`
    - `COMPANYCORE_BASE_URL_PRESENT=False`
- Outcome: protected smoke remains blocked before execution because required secure inputs are still absent in this runtime.
- Unblock owner/action:
  1. Portfolio Director/Board or runtime secret owner provides secure runtime presence proof and one-time authorization for protected smoke.
  2. Run exactly once:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<key> npm run aog:deploy-smoke`
  3. Record result with UTC timestamp and resulting next blocker/state.

## Continuation Addendum (2026-05-27, resume delta follow-up)

- Wake delta claimed prior run reached protected smoke and failed on MCP manifest `HTTP 403`.
- This resumed heartbeat attempted concrete forensic continuation, including direct manifest-probe prep.
- Runtime check in the current heartbeat:
  - `HAS_KEY=False`
  - `KEY_LEN=0`
  - `HAS_URL=False`
- Result: this session cannot execute protected smoke or reproduce/fix the reported `403` because secure env injection is not currently present.
- Refined blocker:
  - Blocker class: secret-presence volatility across heartbeats for protected verification lane.
  - Current required proof cannot be completed without same-session secure injection plus immediate command execution.
- Unblock owner/action:
  1. Runtime secret owner or Portfolio/Board provides one authorized same-session secret injection window.
  2. In that same session run:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<key> npm run aog:deploy-smoke`
  3. If it fails with `HTTP 403` again, run direct probe immediately in-session:
     `Invoke-WebRequest https://api.roost.luckysparrow.ch/v1/mcp/manifest -Headers @{ 'X-API-Key' = $env:COMPANYCORE_API_KEY; 'Accept'='application/json' }`
     and capture status/body class (without secret values) to route either key-scope repair or backend auth-policy fix.

## Continuation Addendum (2026-05-27, protected smoke with present credentials)

- Heartbeat objective: execute the protected deploy-smoke lane immediately after runtime presence proof.
- Commands run:
  - Runtime presence proof:
    - `UTC=2026-05-27T19:15:26Z`
    - `COMPANYCORE_API_KEY_PRESENT=True`
    - `COMPANYCORE_BASE_URL_PRESENT=True`
  - Protected smoke:
    - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
    - Result: FAIL during MCP smoke with
      `[companycore-mcp-smoke] tools/list failed: CompanyCore MCP manifest failed with HTTP 403.`
      followed by `[aog-deploy-smoke] MCP smoke failed.`
- Outcome: the prior missing-secret blocker is cleared; current blocker is protected manifest authorization/scope for this runtime key.
- Unblock owner/action:
  1. Runtime secret owner or Portfolio/Board validates the deployed key profile has required MCP read scope for manifest/tools list.
  2. Re-run exactly once:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
  3. Record UTC timestamp plus pass/fail and next blocker (if any).

## Continuation Addendum (2026-05-27, protected smoke confirmation rerun)

- Heartbeat objective: confirm whether the MCP 403 blocker is transient or reproducible before disposition.
- Commands run:
  - Runtime presence proof:
    - `UTC=2026-05-27T19:17:27Z`
    - `COMPANYCORE_API_KEY_PRESENT=True`
    - `COMPANYCORE_BASE_URL_PRESENT=True`
  - Protected smoke rerun:
    - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
    - Result: FAIL with the same MCP authorization error:
      `[companycore-mcp-smoke] tools/list failed: CompanyCore MCP manifest failed with HTTP 403.`
      followed by `[aog-deploy-smoke] MCP smoke failed.`
- Outcome: blocker is reproducible and unchanged; issue stays `blocked` on runtime key authorization scope for MCP manifest/tools list.
- Unblock owner/action:
  1. Runtime secret owner or Portfolio/Board validates or rotates runtime key scope/profile for MCP manifest access.
  2. Re-run exactly once:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
  3. Record UTC timestamp, result, and next blocker (if any).

## Continuation Addendum (2026-05-27, successful-run handoff closure checkpoint)

- Heartbeat objective: close this run with definitive runtime-gate status and handoff-ready disposition.
- Commands run:
  - `npm run architecture:status` -> PASS (`452/761/34`, queues `0`, delta `0/0/0`, all gates pass `yes`).
  - Runtime presence proof:
    - `UTC=2026-05-27T19:18:51Z`
    - `COMPANYCORE_API_KEY_PRESENT=True`
    - `COMPANYCORE_BASE_URL_PRESENT=True`
  - Protected smoke:
    - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
    - Result: FAIL with unchanged MCP authorization error
      `[companycore-mcp-smoke] tools/list failed: CompanyCore MCP manifest failed with HTTP 403.`
      and `[aog-deploy-smoke] MCP smoke failed.`
- Outcome: architecture and takeover baseline remain verified; protected runtime proof remains externally blocked by key authorization scope.
- Final disposition for this heartbeat: `blocked`.
- Unblock owner/action:
  1. Runtime secret owner or Portfolio/Board validates/rotates MCP key scope/profile for manifest/tools-list access.
  2. Authorize exactly one rerun of
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`.
  3. Capture UTC timestamp and next blocker/result in canonical state files.

## Continuation Addendum (2026-05-27, direct-manifest probe confirmation)

- Heartbeat objective: execute protected smoke immediately when runtime key is present and classify the repeated blocker in the same session.
- Commands run:
  - `npm run architecture:status` -> PASS (`452/761/34`, queues `0`, all gates pass `yes`).
  - Runtime presence proof:
    - `UTC=2026-05-27T19:23:59.6433754Z`
    - `HAS_KEY=True`
    - `KEY_LEN=30`
    - `HAS_URL=True`
    - `BASE_URL=https://api.roost.luckysparrow.ch`
  - Protected smoke:
    - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
    - Result: FAIL with unchanged MCP manifest authorization error:
      `[companycore-mcp-smoke] tools/list failed: CompanyCore MCP manifest failed with HTTP 403.`
  - Direct manifest probe in the same session:
    - `Invoke-WebRequest https://api.roost.luckysparrow.ch/v1/mcp/manifest -Headers @{ 'X-API-Key' = $env:COMPANYCORE_API_KEY; 'Accept'='application/json' }`
    - Result: `STATUS=403`.
- Outcome: blocker remains reproducible with a present key and direct probe evidence, which narrows cause to key-profile authorization/scope or backend auth policy rather than env volatility.
- Final disposition for this heartbeat: `blocked`.
- Unblock owner/action:
  1. Runtime secret owner or Portfolio/Board validates/rotates the runtime key profile for MCP manifest/tools-list access.
  2. Authorize one rerun of
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
     in the same secret-injected session.
 3. Record UTC timestamp and whether blocker clears or persists.

## Continuation Addendum (2026-05-27, MCP smoke diagnostic hardening)

- Heartbeat objective: leave concrete unblock acceleration while protected rerun remains authorization-gated.
- Changes made:
  - `scripts/companycore-mcp-smoke.mjs` now performs a direct manifest preflight before bridge startup and emits structured auth diagnostics on failure:
    - HTTP status
    - `x-request-id` (if provided)
    - `www-authenticate` (if provided)
    - parsed response body
  - Added explicit failure classification hints for `401` vs `403` to separate key rejection from profile/policy denial.
  - Success output now includes `manifestPreflightStatus` and `manifestPreflightRequestId`.
- Verification run:
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS.
- Outcome: next authorized protected rerun will produce actionable backend/security debugging evidence in one pass instead of generic `tools/list failed` output.
- Disposition for this heartbeat: `in_progress` (live continuation path exists: authorized protected rerun with improved diagnostics).

## Continuation Addendum (2026-05-27, finish-successful-run handoff proof)

- Heartbeat objective: execute one authorized same-session protected rerun and close with definitive blocker classification.
- Commands run:
  - Runtime presence proof:
    - `UTC=2026-05-27T19:27:34.1549319Z`
    - `HAS_KEY=True`
    - `KEY_LEN=30`
    - `HAS_URL=True`
  - `npm run architecture:status` -> PASS (`452/761/34`, queues `0`, all gates pass `yes`).
  - Protected rerun:
    - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch npm run aog:deploy-smoke`
    - Result: FAIL in MCP preflight with structured evidence:
      - `status=403`
      - `requestId=028c433d-32cd-46c7-a1e8-a735cd560e53`
      - body `error=invalid_api_key`
      - body `message="The API key is invalid."`
- Outcome: blocker class is now explicit key invalidation/rejection on target runtime, not a generic MCP tools-list failure.
- Final disposition for this heartbeat: `blocked`.
- Unblock owner/action:
  1. Runtime secret owner rotates/provisions a valid `COMPANYCORE_API_KEY` for `https://api.roost.luckysparrow.ch`.
  2. Re-run exactly once in the same session:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<new-key> npm run aog:deploy-smoke`.
  3. If failure persists, route `requestId` plus exact status/body to backend auth owner for policy-level triage.

## Continuation Addendum (2026-05-27, heartbeat continuation evidence refresh)

- Heartbeat objective: execute concrete protected rerun in current session and persist latest blocker evidence.
- Commands run:
  - Runtime presence proof:
    - `UTC=2026-05-27T19:27:56.0347897Z`
    - `HAS_KEY=True`
    - `KEY_LEN=30`
    - `HAS_URL=True`
    - `BASE_URL=https://api.roost.luckysparrow.ch`
  - Protected rerun:
    - `npm run aog:deploy-smoke`
    - Result: FAIL in manifest preflight with decisive auth payload:
      - `status=403`
      - `requestId=528d4005-eb98-4d3f-8e10-a6727da862e9`
      - body `error=invalid_api_key`
      - body `message="The API key is invalid."`
- Outcome: blocker remains external and specifically classified as invalid runtime API key on target MCP manifest path.
- Final disposition for this heartbeat: `blocked`.
- Unblock owner/action:
  1. Runtime secret owner rotates/provisions a valid target-runtime `COMPANYCORE_API_KEY`.
  2. Execute one approved same-session rerun:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<new-key> npm run aog:deploy-smoke`.
  3. If still failing, escalate to backend auth owner with `requestId`, `status`, and response body classification.

## Continuation Addendum (2026-05-27, post-resume prerequisite recheck)

- Heartbeat objective: execute the protected smoke lane again in this resumed session.
- Commands run:
  - Runtime presence proof:
    - `UTC=2026-05-27T19:30:17.8496608Z`
    - `HAS_KEY=False`
    - `KEY_LEN=0`
    - `HAS_URL=False`
    - `BASE_URL=`
  - `npm run architecture:status` -> PASS (`452/761/34`, queues `0`, all gates pass `yes`).
- Outcome: protected rerun could not execute in this heartbeat because approved runtime secrets are absent in-session; architecture baseline remains verified and unchanged.
- Final disposition for this heartbeat: `blocked`.
- Unblock owner/action:
  1. Runtime secret owner or Portfolio/Board provides a same-session authorized secret injection window for target runtime.
  2. Execute exactly once in that same session:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<valid-key> npm run aog:deploy-smoke`.
  3. Record UTC presence proof and rerun result (`pass` or exact `status/requestId/body`) in canonical state files.

## Continuation Addendum (2026-05-27, board control-loop sync)

## Continuation Addendum (2026-05-28, cancellation-reason confirmation)

- Heartbeat objective: confirm cancellation reason before any new protected rerun and leave durable blocked-state continuity.
- Commands run:
  - `npm run architecture:status` -> PASS (`452/761/34`, queues `0`, all gates pass `yes`).
- Governance confirmation:
  - Board control-loop gate `a029bb67-d7eb-4a38-9385-cd19d664aebd` remains authoritative.
  - No fresh one-run rerun approval and no fresh accepted key-scope evidence were provided in this heartbeat.
  - Protected rerun was intentionally not executed.
- Final disposition for this heartbeat: `blocked`.
- Unblock owner/action:
  1. Portfolio/Board or runtime secret owner provides explicit one-run approval and valid key-scope evidence.
  2. Run exactly once in the same session:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<valid-key> npm run aog:deploy-smoke`.
  3. Persist UTC pass/fail evidence and next blocker classification.

- Trigger: board comment `a029bb67-d7eb-4a38-9385-cd19d664aebd` (2026-05-27T19:27:38.070Z).
- Decision: canceled repeated protected-smoke wake loop for `LUC-261`.
- Accepted latest evidence remains failed on CompanyCore MCP manifest/tools-list `HTTP 403` under invalid key classification.
- Gate policy update:
  1. keep `LUC-261` blocked under Portfolio/Board credential ownership,
  2. do not rerun protected smoke from assignment/recovery alone,
  3. permit exactly one rerun only when fresh accepted credential scope/permission evidence exists or explicit one-run operator approval is granted.
- No product/deploy/production/secret/project-code mutation was executed in this sync.

## Continuation Addendum (2026-05-27, issue-continuation wake governance check)

- Trigger: Paperclip resume delta (`issue_continuation_needed`) for `LUC-261` with `fallbackFetchNeeded=false` and no new issue comments in this batch.
- Wake-delta audit result:
  - no fresh operator one-run approval was provided,
  - no fresh accepted credential scope/permission evidence was provided,
  - therefore protected rerun was intentionally not executed in this heartbeat under the board control-loop gate.
- Governing gate: board sync comment `a029bb67-d7eb-4a38-9385-cd19d664aebd` remains authoritative (`do not rerun protected smoke from assignment/recovery alone`).
- Final disposition for this heartbeat: `blocked`.
- Unblock owner/action:
  1. Portfolio/Board or runtime secret owner provides one explicit authorized rerun window and valid key-scope evidence.
  2. Execute exactly once in the same session:
     `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<valid-key> npm run aog:deploy-smoke`.
  3. Persist UTC proof with pass/fail and next blocker classification.
