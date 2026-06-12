# Task

## Header
- ID: LUC-2814
- Title: Non-secret CompanyCore MCP key repair evidence
- Task Type: security
- Current Stage: verification
- Status: DONE
- Owner: Security and Privacy Auditor
- Depends on: LUC-261, LUC-2700, LUC-2584, LUC-2711
- Priority: P1
- Mission ID: LUC-2814-COMPANYCORE-MCP-KEY-REPAIR-EVIDENCE
- Mission Status: PRESENT_IN_CONFIG_BEHAVIOR_UNKNOWN

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] Current stage is verification because this task verifies whether a
  non-secret key repair fact exists.
- [x] Affected module confidence row was identified as protected runtime MCP
  adapter/key acceptance.
- [x] This task improves release confidence by preserving the exact non-secret
  blocker and rerun conditions.

## Mission Block
- Mission objective: Determine whether this heartbeat contains non-secret
  evidence that the target runtime CompanyCore key has been repaired and is
  accepted by `/v1/mcp/manifest`.
- Release objective advanced: protected deploy-smoke remains fail-closed
  because this heartbeat has no CompanyCore target credentials or secret-store
  metadata that can prove repair.
- Included slices: issue context read, prior classification/handoff review,
  non-secret environment presence check, MCP profile/policy source review,
  syntax checks for MCP bridge/smoke scripts, and source-of-truth sync.
- Explicit exclusions: no protected deploy smoke, deploy, push, restart,
  production mutation, key rotation, secret read, secret value print, or
  secret persistence.
- Stop conditions: evidence packet published, source-of-truth pointers updated,
  and Paperclip issue disposition set to blocked with a named owner/action.
- Handoff expectation: runtime secret owner provisions or repairs an
  MCP-profile CompanyCore key and records non-secret acceptance evidence before
  LUC-261 or LUC-2700 consumes a fresh protected deploy-smoke approval.
- Delegated blocker:
  `[LUC-2815](/LUC/issues/LUC-2815)` assigned to Deployment & Reliability
  Engineer for target binding metadata and narrow manifest acceptance evidence.

## Context
LUC-2814 was assigned after LUC-2700 and LUC-2584 narrowed the Roost protected
runtime blocker to CompanyCore MCP manifest authorization. The latest protected
target failure remains:

- command: `npm run aog:deploy-smoke`
- failure point: MCP manifest preflight
- status: `403`
- error: `invalid_api_key`
- request ID: `2a70da8f-f231-410b-88cf-8896bbaf3da9`

This task does not authorize another protected deploy smoke. Its scope is only
to provide non-secret repair evidence or name the exact remaining credential
owner/action.

## Goal
Close the security evidence lane with one of the accepted classifications:

- `implemented and verified` if an MCP-capable key acceptance fact exists;
- `present in config, behavior unknown` if metadata exists but no target
  acceptance fact exists;
- `blocked by error` when the repair fact is absent and the credential owner
  action is still required.

## Scope
- Read:
  - Paperclip heartbeat context for LUC-2814
  - `docs/planning/luc-2584-companycore-mcp-invalid-api-key-classification.md`
  - `docs/planning/luc-2711-runtime-protected-gate-handoff-packet.md`
  - `docs/operations/mcp-agent-runtime-setup.md`
  - `src/auth/agent-key-profiles.ts`
  - `src/auth/capabilities.ts`
  - `scripts/companycore-mcp-server.mjs`
  - `scripts/companycore-mcp-smoke.mjs`
- Update:
  - `docs/planning/luc-2814-non-secret-companycore-mcp-key-repair-evidence.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
  - `docs/planning/mvp-next-commits.md`

## Autonomous Loop Evidence

### 1. Analyze Current State
- LUC-2584 verifies the local bridge and smoke scripts fail closed at
  `/v1/mcp/manifest`.
- LUC-2711 preserves the latest protected target failure as
  `403 invalid_api_key` with request ID
  `2a70da8f-f231-410b-88cf-8896bbaf3da9`.
- `docs/operations/mcp-agent-runtime-setup.md` states MCP runtimes should use
  an MCP profile key and maps manifest `HTTP 403` to missing `mcp:read` or
  manifest policy denial.
- `src/auth/agent-key-profiles.ts` includes MCP profiles whose base scopes
  include `connection:read` and `mcp:read`.
- `src/auth/capabilities.ts` maps `GET /v1/mcp/manifest` to `mcp:read`.

### 2. Select One Priority Mission Objective
- Selected task: LUC-2814 non-secret CompanyCore MCP key repair evidence.
- Priority rationale: LUC-261 and LUC-2700 should not consume another
  protected deploy-smoke approval until this repair evidence exists.

### 3. Plan Implementation
- Check this heartbeat for target CompanyCore credential presence without
  printing values.
- If key/base URL are present, run the narrowest manifest-policy preflight that
  returns only status and counts.
- If key/base URL or metadata are absent, classify the issue as blocked and
  name the exact owner/action.
- Sync source-of-truth files and close the Paperclip issue accordingly.

### 4. Execute Implementation
- Read issue context and prior blocker packets.
- Checked environment variable presence without printing values.
- Inspected exposed environment names for CompanyCore, Roost, MCP, Coolify, and
  secret-related variables without printing values.
- Did not run protected deploy smoke or any target manifest call because
  `COMPANYCORE_API_KEY` and `COMPANYCORE_BASE_URL` were absent.

### 5. Verify and Test
- Non-secret presence proof at `2026-06-07T13:07:32.2472166Z`:
  - `COMPANYCORE_API_KEY_PRESENT=false`
  - `COMPANYCORE_BASE_URL_PRESENT=false`
  - `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`
- Exposed environment-name scan found no `COMPANYCORE_*`, `ROOST_*`, or target
  MCP credential variables in this heartbeat. It did show unrelated secret-like
  variables, but values were not printed.
- Syntax checks:
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- `git rev-parse --short HEAD` -> `a48a8ee`

### 6. Self-Review
- A narrow target `/v1/mcp/manifest` acceptance probe would have been the right
  non-mutating proof if key/base URL were present.
- Because this heartbeat lacks both values and exposes no non-secret
  secret-version metadata, claiming repair would be unsupported.
- No workaround, bypass, deploy, or runtime mutation was introduced.

### 7. Update Documentation and Knowledge
- This packet records the evidence and blocker.
- Context, task board, active mission, next steps, module confidence, and active
  queue pointers were updated.
- Learning journal was not updated because no new recurring tooling pitfall was
  found.

## Security Determination

| Surface | Evidence | Classification |
| --- | --- | --- |
| Local MCP profile policy | MCP profiles include `mcp:read`; manifest route requires `mcp:read`. | implemented and verified by source inspection |
| Current heartbeat target binding | `COMPANYCORE_API_KEY_PRESENT=false`; `COMPANYCORE_BASE_URL_PRESENT=false`; no exposed `COMPANYCORE_*` metadata. | missing |
| Target runtime acceptance | Latest accepted protected evidence remains MCP manifest `403 invalid_api_key`; no newer acceptance fact exists in this heartbeat. | blocked by error |
| Protected deploy-smoke rerun readiness | No non-secret key repair fact and no fresh one-run approval are present. | blocked by error |

## Blocker Decision

LUC-2814 cannot provide `implemented and verified` repair evidence in this
heartbeat. There is no target CompanyCore key/base URL in the run environment,
no non-secret secret-version or profile metadata visible locally, and no fresh
target manifest acceptance fact after the latest `403 invalid_api_key` failure.

The evidence-backed disposition is:

`blocked by error`: runtime secret owner/Security must provision or repair a
CompanyCore service key from an MCP-capable profile such as
`mcp_company_os_reader` or `mcp_event_worker`, bind it to the target runtime,
and record non-secret proof that `/v1/mcp/manifest` accepts the key.

## Required Unblock Evidence

Before LUC-261 or LUC-2700 consumes another protected deploy-smoke approval,
record all of the following without secret values:

1. Target environment name.
2. Key profile id, for example `mcp_company_os_reader` or `mcp_event_worker`.
3. Confirmation that the effective scopes include `mcp:read`.
4. Rotation or binding timestamp.
5. `/v1/mcp/manifest` acceptance result with status `200`, UTC timestamp,
   request ID if available, and tool count or profile-visible route count.
6. Confirmation that no raw key was printed, logged, or persisted.

## Delegated Follow-Up

Created `[LUC-2815](/LUC/issues/LUC-2815)` for the Deployment & Reliability
Engineer to inspect target runtime binding metadata and, if authorized key/base
URL context is available, run only the narrow non-mutating
`/v1/mcp/manifest` acceptance preflight. LUC-2815 explicitly forbids protected
deploy smoke, deploy, restart, push, production mutation, key value exposure,
and unrelated runtime changes.

## Continuation Checkpoint

### 2026-06-08 blocker-resolution integration
- Trigger: `issue_blockers_resolved` after
  `[LUC-2815](/LUC/issues/LUC-2815)` reached `done`.
- Child classification from `[LUC-2815](/LUC/issues/LUC-2815)`:
  `present in config, behavior unknown`.
- Integrated child evidence:
  - Coolify project `LuckySparrow`, production environment, Roost app
    `rnqqkhl3o3dut4qv56mlxly2` / id `20`, repo `Wroblewski-Patryk/Roost`,
    branch `main`.
  - Public health for `https://api.roost.luckysparrow.ch/health` returned
    `status: ok`, service `companycore`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, UTC
    `2026-06-07T22:49:07.8890370Z`.
  - Unauthenticated `/v1/mcp/manifest` returned `401 Unauthorized`, request id
    `6a12e225-c5c4-41a0-991a-7028b4b2e943`, proving the endpoint is live and
    fail-closed without credentials.
  - Current runtime still lacks `COMPANYCORE_API_KEY` and
    `COMPANYCORE_BASE_URL`, so no key-bearing manifest `200` acceptance
    preflight ran.
- Security integration decision: `[LUC-2814](/LUC/issues/LUC-2814)` can close
  under the accepted `present in config, behavior unknown` outcome. This is not
  MCP-capable key repair evidence and must not be used to authorize protected
  deploy-smoke. `[LUC-261](/LUC/issues/LUC-261)` and
  `[LUC-2700](/LUC/issues/LUC-2700)` remain blocked until runtime secret
  owner/Security records MCP profile id, effective `mcp:read`, binding
  timestamp, and target `/v1/mcp/manifest` status `200` acceptance evidence.

## Acceptance Criteria
- [x] Non-secret current credential presence was checked.
- [x] Existing MCP policy/profile source was inspected.
- [x] No secret values were printed, persisted, or screenshotted.
- [x] Protected deploy smoke was not run.
- [x] Final disposition names the exact credential owner/action.

## Result Report
- Task summary: LUC-2814 cannot prove a repaired MCP-capable CompanyCore key in
  the original heartbeat. After `[LUC-2815](/LUC/issues/LUC-2815)` completed,
  target deployment config and endpoint liveness are present, but authenticated
  MCP manifest behavior remains unknown because no key-bearing manifest `200`
  acceptance fact exists. Final classification:
  `present in config, behavior unknown`.
- Files changed:
  - `docs/planning/luc-2814-non-secret-companycore-mcp-key-repair-evidence.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/module-confidence-ledger.md`
  - `docs/planning/mvp-next-commits.md`
- Verification:
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
  - non-secret env presence check -> CompanyCore key/base URL absent
- Commit: not committed; this heartbeat produced docs/state evidence inside an
  already dirty shared Roost worktree.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: exact target secret state cannot be proven until the runtime
  secret owner supplies non-secret metadata or a narrow manifest acceptance
  fact.
- Next owner: runtime secret owner/Security records MCP profile id, effective
  `mcp:read`, binding timestamp, and non-secret `/v1/mcp/manifest` status
  `200` acceptance evidence before any fresh protected deploy-smoke approval is
  consumed.
