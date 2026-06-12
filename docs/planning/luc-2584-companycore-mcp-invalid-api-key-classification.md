# Task

## Header
- ID: LUC-2584
- Title: CompanyCore MCP invalid API key blocker classification
- Task Type: release
- Current Stage: verification
- Status: DONE
- Owner: Runtime & Adapter Engineer
- Depends on: LUC-261, LUC-2700, LUC-2711
- Priority: P1
- Mission ID: LUC-2584-MCP-INVALID-API-KEY-CLASSIFICATION
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] Current stage is verification because this task classifies existing
  protected-runtime evidence and adapter contract state.
- [x] Affected module confidence row was identified as protected runtime MCP
  adapter/key confidence.
- [x] This task improves release confidence by naming the exact blocker class,
  unblock owner, and legal rerun condition.

## Mission Block
- Mission objective: Classify why the approved `COMPANYCORE_API_KEY` path is
  rejected by the target runtime MCP manifest policy without reading or
  exposing secret values.
- Release objective advanced: LUC-261 remains fail-closed, but the blocker is
  now classified as target runtime key-scope/profile rejection at MCP manifest
  preflight rather than an unknown adapter failure.
- Included slices: issue context read, local MCP bridge contract inspection,
  non-secret environment presence check, latest LUC-261/LUC-2700/LUC-2711
  evidence review, source-of-truth sync, and Paperclip issue disposition.
- Explicit exclusions: no protected smoke, deploy, restart, push, production
  mutation, key rotation, secret read, secret print, or secret persistence.
- Stop conditions: classification packet published, state pointers updated,
  and issue status updated with final disposition.
- Handoff expectation: runtime secret owner repairs/provisions an MCP-profile
  CompanyCore key accepted by the target manifest policy, then board/operator
  grants one fresh protected rerun approval.

## Context
LUC-261 is blocked after repeated approved protected deploy-smoke rechecks
failed at CompanyCore MCP manifest preflight. LUC-2584 was restored from a
stale blocked posture so the Runtime & Adapter lane could classify the
`invalid_api_key` blocker without consuming another protected smoke attempt.

The latest protected target evidence recorded on the issue context was the
2026-06-06 recheck:

- command: `npm run aog:deploy-smoke`
- result: `FAIL`
- failure point: MCP manifest preflight
- HTTP status: `403`
- error: `invalid_api_key`
- request ID: `ad41ee0d-8d06-406b-9983-750c6ab1f547`

The newer LUC-2700/LUC-2711 handoff packet also records the same failure class
with request ID `2a70da8f-f231-410b-88cf-8896bbaf3da9` from 2026-06-07.

## Goal
Close the classification lane with exact non-secret evidence, owner/action for
unblock, and a decision about whether LUC-261 can safely receive a fresh
one-run protected smoke approval.

## Scope
- Read:
  - `docs/operations/mcp-agent-runtime-setup.md`
  - `scripts/companycore-mcp-server.mjs`
  - `scripts/companycore-mcp-smoke.mjs`
  - `package.json`
  - `docs/planning/luc-2711-runtime-protected-gate-handoff-packet.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
- Update:
  - `docs/planning/luc-2584-companycore-mcp-invalid-api-key-classification.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`

## Autonomous Loop Evidence

### 1. Analyze Current State
- The MCP bridge sends `X-API-Key` to `${COMPANYCORE_BASE_URL}/v1/mcp/manifest`
  and fails before tool discovery if the manifest response is not successful.
- The smoke harness classifies a manifest preflight `403` as "api key accepted
  but lacks permission or policy denies manifest."
- The runtime setup guide maps `CompanyCore MCP manifest failed with HTTP 403`
  to a key lacking `mcp:read`, with recovery to recreate the key from an MCP
  profile or add the explicit capability.
- Current heartbeat environment presence check showed:
  - `COMPANYCORE_API_KEY=unset`
  - `COMPANYCORE_BASE_URL=unset`
  - `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`
  - `COMPANYCORE_MCP_MANIFEST_PATH=unset`
  - `COMPANYCORE_MCP_COMMAND_MODE=unset`
- Because no target key/base URL were present locally and no fresh one-run
  approval was in this wake, no protected rerun was legal or possible.

### 2. Select One Priority Mission Objective
- Selected task: LUC-2584 runtime/key-path classification.
- Priority rationale: LUC-261 and LUC-2700 are blocked by this exact protected
  runtime gate and need a non-ambiguous owner/action before another rerun is
  useful.
- Deferred candidates: protected smoke, deploy, restart, push, key rotation,
  and backend auth changes were all outside this issue's authority.

### 3. Plan Implementation
- Inspect the local MCP adapter contract and smoke classification logic.
- Compare that contract against the recorded protected target failure.
- Classify the key path using the evidence standard.
- Update source-of-truth state and close the Paperclip issue.

### 4. Execute Implementation
- Published this classification packet.
- Updated project state, task board, active mission, next steps, and module
  confidence pointers.
- Did not touch runtime code or secret-bearing configuration.

### 5. Verify and Test
- Validation performed:
  - source inspection of MCP runtime setup and bridge/smoke scripts
  - non-secret environment presence check
  - `node --check scripts/companycore-mcp-server.mjs`
  - `node --check scripts/companycore-mcp-smoke.mjs`
  - `git diff --check`
- Result: classification packet is verified for docs/state scope.

### 6. Self-Review
- Simpler option considered: issue comment only. Rejected because Roost source
  of truth requires durable docs/state sync for meaningful blocker changes.
- Technical debt introduced: no.
- Architecture alignment: preserved CompanyCore as API/MCP boundary and did
  not bypass auth, provider, or runtime secret controls.

### 7. Update Documentation and Knowledge
- Docs updated: yes.
- Context updated: yes.
- Learning journal updated: not applicable; this repeated runtime key blocker
  was already known and no new tooling pitfall was found.

## Classification

| Surface | Evidence | Classification |
| --- | --- | --- |
| Local MCP bridge implementation | `scripts/companycore-mcp-server.mjs` requires `COMPANYCORE_API_KEY`, sends it as `X-API-Key`, and aborts tool discovery when `/v1/mcp/manifest` is not successful. | implemented and verified |
| Local MCP smoke classification | `scripts/companycore-mcp-smoke.mjs` preflights `/v1/mcp/manifest`; for `403`, it reports accepted key/policy denial semantics. | implemented and verified |
| Runtime setup contract | `docs/operations/mcp-agent-runtime-setup.md` states manifest `HTTP 403` likely means the key lacks `mcp:read`; recovery is MCP-profile key recreation or explicit capability repair. | implemented and verified |
| Current heartbeat secret path | `COMPANYCORE_API_KEY` and `COMPANYCORE_BASE_URL` are unset in this run. | present in config, behavior unknown |
| Target runtime `COMPANYCORE_API_KEY` path | Latest authorized target smoke evidence reached MCP manifest preflight and returned `403 invalid_api_key`, with request IDs recorded above. Secret value was not inspected. | blocked by error |

## Blocker Decision

The blocker is not classified as a local MCP bridge bug. The local bridge and
smoke scripts use the documented CompanyCore API-key header and fail closed at
manifest preflight. The protected target runtime evidence shows the currently
approved key path is rejected by target runtime manifest authorization before
MCP tools can be listed.

The most specific evidence-backed classification is:

`blocked by error`: target runtime `COMPANYCORE_API_KEY` is absent from this
heartbeat and the last approved target-runtime key path was rejected by
CompanyCore MCP manifest policy as `403 invalid_api_key`.

Likely cause from the documented contract:

- key lacks `mcp:read`, or
- key was not created from an MCP-capable profile such as
  `mcp_company_os_reader`, `mcp_event_worker`, or another approved MCP profile,
  or
- target runtime secret binding still points at an old/revoked/wrong-workspace
  key.

This lane cannot distinguish those three without secret-owner metadata or an
authorized protected rerun, and it must not inspect raw secret values.

## Unblock Owner And Action

1. Runtime secret owner or Security/Privacy owner verifies the target runtime
   secret binding metadata without exposing the raw key.
2. Runtime secret owner rotates/provisions a CompanyCore service key from an
   approved MCP profile with `mcp:read` and the route capabilities needed for
   the intended smoke.
3. Runtime secret owner records non-secret evidence: profile id, capability
   family such as `mcp:read`, target environment, rotation/provision timestamp,
   and confirmation that the runtime binding was updated.
4. Board/operator grants one fresh same-session protected rerun approval on
   `[LUC-261](/LUC/issues/LUC-261)` or the current gate recheck issue after
   the repair fact exists.
5. DRE/runtime proof owner runs exactly one `npm run aog:deploy-smoke` and
   records UTC timestamp, HEAD, command, result, request ID if failed, and
   scope exclusions.

## Approval Decision For LUC-261

`[LUC-261](/LUC/issues/LUC-261)` should not receive another protected smoke
approval based only on this classification. A fresh one-run approval is safe
only after a non-secret key-scope repair fact exists. Repeating the same
protected command before that fact would only re-consume the gate and reproduce
the known `403 invalid_api_key` blocker.

## Acceptance Criteria
- [x] Classification recorded for local adapter implementation:
  `implemented and verified`.
- [x] Classification recorded for current heartbeat secret path:
  `present in config, behavior unknown` because the variables are unset here.
- [x] Classification recorded for target runtime key path:
  `blocked by error`.
- [x] Exact non-secret evidence inspected and listed.
- [x] Recommended unblock owner/action named.
- [x] LUC-261 approval decision recorded.

## Validation Evidence
- Source files reviewed:
  - `docs/operations/mcp-agent-runtime-setup.md`
  - `scripts/companycore-mcp-server.mjs`
  - `scripts/companycore-mcp-smoke.mjs`
  - `package.json`
  - `docs/planning/luc-2711-runtime-protected-gate-handoff-packet.md`
- Commands:
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
  - `git diff --check` -> PASS with line-ending warnings only
- Current HEAD: `a48a8ee`
- UTC checkpoint: `2026-06-07T09:30:25.0350030Z`
- Protected smoke: not run. No fresh key repair evidence or one-run approval
  was present, and current heartbeat target env vars were unset.

## Integration Evidence
- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: not applicable for this docs/state
  classification; protected target API use was explicitly out of scope.
- Endpoint and client contract match: yes for inspected adapter path
  `/v1/mcp/manifest` through `X-API-Key`.
- DB schema and migrations verified: not applicable.
- Regression check performed: syntax checks for MCP bridge/smoke scripts plus
  diff hygiene.

## Result Report
- Task summary: LUC-2584 is complete for classification scope. The local MCP
  adapter path is implemented and verified by source/syntax inspection; the
  current heartbeat has no CompanyCore target secret vars; the target runtime
  key path remains blocked by `403 invalid_api_key` at MCP manifest preflight.
- Files changed:
  - `docs/planning/luc-2584-companycore-mcp-invalid-api-key-classification.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
- Commit: not committed; this heartbeat produced docs/state classification
  inside an already dirty Roost worktree with unrelated active changes.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: the exact secret metadata cannot be proven by this lane
  without secret-owner evidence; parent protected proof remains blocked.
- Next owner: runtime secret owner or Security/Privacy owner repairs/provisions
  the MCP-capable key and records non-secret repair evidence.
