# Task

## Header
- ID: LUC-2711
- Title: Roost runtime protected gate handoff packet from LUC-2708 review
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Ops/Release
- Depends on: LUC-2708, LUC-2700, LUC-261
- Priority: P1
- Mission ID: LUC-2711-RUNTIME-PROTECTED-GATE-HANDOFF
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] Current stage is verification because this task packages existing
  protected-runtime evidence and does not run new runtime proof.
- [x] Affected module confidence row was identified as protected target runtime
  smoke confidence.
- [x] The task improves release confidence by preserving the exact blocker
  evidence and rerun gate.

## Mission Block
- Mission objective: Package the latest Roost protected runtime gate evidence
  so the next authorized repair or rerun can proceed without rediscovering the
  blocker.
- Release objective advanced: target-runtime proof remains fail-closed but now
  has a concise DRE handoff packet.
- Included slices: source review of LUC-2708 and LUC-261, latest LUC-2700
  blocker preservation, rerun command template, unblock owner/action, and
  source-of-truth sync.
- Explicit exclusions: no protected smoke, deploy, push, restart, runtime
  mutation, production mutation, secret read, or secret value disclosure.
- Stop conditions: blocker packet published, state pointers updated, and issue
  disposition recorded.
- Handoff expectation: runtime secret owner repairs the target key scope; board
  or operator grants one fresh protected rerun approval only after repair
  evidence exists.

## Context
LUC-2708 completed the readiness and milestone review and created this DRE
follow-up as the runtime protected-gate handoff. The latest protected runtime
evidence comes from LUC-2700, which executed exactly one approved
`npm run aog:deploy-smoke` recheck and failed before application smoke at MCP
manifest preflight.

## Goal
Create a durable protected-runtime blocker packet with the latest request ID,
environment expectations without values, safe rerun command template, and named
unblock owner/action.

## Scope
- Read:
  - `docs/planning/luc-2708-roost-companycore-readiness-and-milestone-review.md`
  - `docs/planning/luc-261-full-takeover-audit-and-operating-baseline.md`
- Update:
  - `docs/planning/luc-2711-runtime-protected-gate-handoff-packet.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`

## Autonomous Loop Evidence

### 1. Analyze Current State
- LUC-2708 states local architecture/source-of-truth readiness is verified, but
  protected runtime proof remains blocked.
- LUC-2700 latest protected smoke result:
  - command: `npm run aog:deploy-smoke`
  - result: `FAIL`
  - failure point: MCP manifest preflight
  - status: `403`
  - error: `invalid_api_key`
  - request ID: `2a70da8f-f231-410b-88cf-8896bbaf3da9`
- This heartbeat had no fresh key repair evidence and no one-run protected
  rerun approval.

### 2. Select One Priority Mission Objective
- Selected task: LUC-2711 runtime protected gate handoff packet.
- Priority rationale: this is the assigned scoped DRE issue and unblocks future
  authorized repair/rerun work by removing evidence rediscovery.
- Deferred candidates: no protected smoke or repair work was attempted because
  the issue constraints explicitly prohibit rerun without fresh repair evidence
  and one-run approval.

### 3. Plan Implementation
- Publish one concise handoff packet.
- Preserve request ID and failure mode exactly.
- State environment expectations without values.
- Provide a safe rerun command template with registration disabled unless
  separately approved.
- Sync source-of-truth pointers.

### 4. Execute Implementation
- Created this packet and updated Roost state pointers.
- No runtime command that contacts the protected target was run.

### 5. Verify and Test
- Validation performed:
  - source review of LUC-2708 and LUC-261 packets
  - `git rev-parse --short HEAD`
  - current heartbeat environment presence check without values
- Result: handoff packet is complete; protected runtime proof remains blocked.

### 6. Self-Review
- Simpler option considered: close with only an issue comment. Rejected because
  the repository requires durable source-of-truth updates for meaningful state
  changes.
- Technical debt introduced: no.

### 7. Update Documentation and Knowledge
- Docs updated: yes.
- Context updated: yes.
- Learning journal updated: not applicable; no new recurring tooling pitfall was
  found.

## Protected Runtime Blocker Packet

| Field | Value |
| --- | --- |
| Latest source issue | `[LUC-2700](/LUC/issues/LUC-2700)` |
| Parent blocker context | `[LUC-261](/LUC/issues/LUC-261)` protected runtime proof |
| Review handoff source | `[LUC-2708](/LUC/issues/LUC-2708)` |
| Latest protected command | `npm run aog:deploy-smoke` |
| Latest result | `FAIL` |
| Failure point | MCP manifest preflight |
| HTTP status | `403` |
| Error | `invalid_api_key` |
| Request ID | `2a70da8f-f231-410b-88cf-8896bbaf3da9` |
| Current issue action | Handoff packet only; no protected rerun |

## Environment Expectations Without Values

The next authorized rerun environment must provide:

| Variable | Expected state | Notes |
| --- | --- | --- |
| `COMPANYCORE_BASE_URL` | present | Target API runtime base URL. Do not print the value in issue comments. |
| `COMPANYCORE_API_KEY` | present | Must be a repaired/provisioned key accepted by the target MCP manifest policy. Presence alone is not acceptance. |
| `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION` | unset or false by default | Set to true only with explicit production smoke-user registration approval. |

This LUC-2711 heartbeat observed all three variables as `unset` locally, so no
protected rerun was possible or attempted.

## Rerun Command Template

Use this only after key-scope repair evidence exists and a fresh one-run
protected rerun approval is granted:

```powershell
$env:COMPANYCORE_BASE_URL='<target-api-base-url>'
$env:COMPANYCORE_API_KEY='<repaired-approved-key>'
Remove-Item Env:\COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION -ErrorAction SilentlyContinue
npm run aog:deploy-smoke
```

If production smoke-user registration is explicitly approved for that one run,
set `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=true` in the same shell before
the command and record that approval in the issue evidence.

## Unblock Owner And Action

1. Runtime secret owner rotates or provisions a CompanyCore key accepted by the
   target runtime MCP manifest policy.
2. Runtime secret owner or backend auth owner records key-scope repair evidence
   without exposing the key value.
3. Board/operator grants a fresh one-run protected deploy-smoke approval after
   repair evidence exists.
4. DRE or assigned runtime proof owner runs exactly one `npm run
   aog:deploy-smoke` and records UTC timestamp, command, status, error or pass
   result, request ID if failed, HEAD, and scope exclusions.

## Acceptance Criteria
- [x] Latest request ID is preserved:
  `2a70da8f-f231-410b-88cf-8896bbaf3da9`.
- [x] Environment expectations are listed without secret values.
- [x] Rerun command template is included.
- [x] Unblock owner/action is named.
- [x] No protected smoke, deploy, push, restart, production mutation, or secret
  disclosure occurred.

## Validation Evidence
- Source docs reviewed:
  - `docs/planning/luc-2708-roost-companycore-readiness-and-milestone-review.md`
  - `docs/planning/luc-261-full-takeover-audit-and-operating-baseline.md`
- `git rev-parse --short HEAD` -> `a48a8ee`.
- UTC checkpoint: `2026-06-07T07:21:06.9238564Z`.
- Current heartbeat environment presence check, values not printed:
  `COMPANYCORE_API_KEY=unset`, `COMPANYCORE_BASE_URL=unset`,
  `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`.
- Protected smoke was not run because fresh key repair evidence and one-run
  approval were absent.

## Result Report
- Task summary: DRE runtime protected-gate handoff packet is complete. The
  target runtime proof remains blocked by MCP manifest `403 invalid_api_key`
  until key-scope repair and fresh one-run approval exist.
- Files changed:
  - `docs/planning/luc-2711-runtime-protected-gate-handoff-packet.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- How tested: source review and non-secret environment/HEAD checks only.
- What is incomplete: protected deploy-smoke remains blocked and was not rerun.
- Deployment impact: none.
- Next steps: runtime secret owner repairs key scope, then board/operator grants
  one fresh protected rerun approval for the next DRE/runtime proof owner.
