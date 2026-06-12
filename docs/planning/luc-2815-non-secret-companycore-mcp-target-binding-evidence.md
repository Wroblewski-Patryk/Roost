# Task

## Header
- ID: LUC-2815
- Title: Non-secret CompanyCore MCP target binding evidence
- Task Type: operations
- Current Stage: verification
- Status: DONE
- Owner: Deployment and Reliability Engineer
- Parent: [LUC-2814](/LUC/issues/LUC-2814)
- Priority: P1
- Mission ID: LUC-2815-COMPANYCORE-MCP-TARGET-BINDING-EVIDENCE
- Mission Status: VERIFIED_WITH_RESIDUAL_BLOCKER

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] Current stage is verification because this task checks target binding
  evidence without mutating runtime state.
- [x] Affected module confidence row was identified as protected runtime MCP
  adapter/key acceptance.
- [x] This task improves release confidence by preserving the exact
  non-secret blocker and avoiding an unauthorized protected deploy smoke.

## Mission Block
- Mission objective: Provide non-secret target-runtime evidence for the Roost
  CompanyCore MCP key binding, or name the exact remaining owner/action.
- Release objective advanced: [LUC-2814](/LUC/issues/LUC-2814) and
  [LUC-261](/LUC/issues/LUC-261) should not consume another protected
  deploy-smoke approval until target manifest acceptance evidence exists.
- Included slices: issue context read, prior evidence review, non-secret
  environment presence check, visible binding metadata check, MCP bridge/smoke
  source review, syntax checks, and source-of-truth sync.
- Explicit exclusions: no protected deploy smoke, deploy, restart, push,
  production mutation, key rotation, secret read, secret print, secret
  persistence, or unrelated runtime change.
- Stop conditions: evidence packet published, source-of-truth pointers updated,
  and Paperclip issue disposition set to blocked with a named owner/action.
- Handoff expectation: runtime secret owner/Security provides a Roost
  CompanyCore target key binding and non-secret `/v1/mcp/manifest` acceptance
  evidence.

## Continuation Checkpoint

### 2026-06-07T22:49:14Z child-source-facts integration
- Trigger: `issue_children_completed` wake after
  [LUC-2969](/LUC/issues/LUC-2969) completed.
- Child output:
  `docs/planning/luc-2969-companycore-mcp-target-binding-source-facts.md`.
- Integrated classification: `present in config, behavior unknown`.
- Target source facts from [LUC-2969](/LUC/issues/LUC-2969):
  - Coolify project `LuckySparrow`, uuid `d1203xzl7e8csh848aj031xp`
  - environment `production`, uuid `y106ybhx7fsfupe1jb012zm5`
  - Roost app `Roost`, uuid `rnqqkhl3o3dut4qv56mlxly2`, id `20`
  - GitHub App source, repo `Wroblewski-Patryk/Roost`, branch `main`
  - app updated/last-online metadata `2026-06-07T22:44:30.000000Z` /
    `2026-06-07 22:44:30`
- Target runtime liveness rechecked by DRE:
  - `GET https://api.roost.luckysparrow.ch/health` -> `status: ok`,
    `service: companycore`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, image `unknown`, UTC
    `2026-06-07T22:49:07.8890370Z`
- Manifest guard rechecked by DRE without credentials:
  - `curl.exe -s -o NUL -D - https://api.roost.luckysparrow.ch/v1/mcp/manifest`
    -> `HTTP/1.1 401 Unauthorized`, request id
    `6a12e225-c5c4-41a0-991a-7028b4b2e943`, date
    `Sun, 07 Jun 2026 22:49:14 GMT`
- Current runtime still lacks key-bearing proof:
  - `COMPANYCORE_API_KEY_PRESENT=false`
  - `COMPANYCORE_BASE_URL_PRESENT=false`
  - `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`
  - `COMPANYCORE_MCP_MANIFEST_PATH=unset`
  - `COMPANYCORE_MCP_COMMAND_MODE=unset`
  - UTC `2026-06-07T22:48:53.2723848Z`
- Syntax checks rerun:
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- Protected smoke: not run.
- Deployment mutation: none.
- Secret exposure: none.

## Context
[LUC-2815](/LUC/issues/LUC-2815) was delegated from
[LUC-2814](/LUC/issues/LUC-2814) after the Security/Privacy lane could not see
CompanyCore target credentials or target secret metadata. The latest accepted
protected target failure remains:

- command: `npm run aog:deploy-smoke`
- failure point: MCP manifest preflight
- status: `403`
- error: `invalid_api_key`
- request ID: `2a70da8f-f231-410b-88cf-8896bbaf3da9`

This task does not authorize `npm run aog:deploy-smoke`. It allows only a
narrow non-mutating `/v1/mcp/manifest` preflight if approved key/base URL
context is available.

## Goal
Close the DRE evidence lane with one of the accepted classifications:

- `implemented and verified` if the target `/v1/mcp/manifest` accepts the
  repaired key and non-secret evidence is recorded;
- `present in config, behavior unknown` if Roost binding metadata exists but no
  manifest acceptance fact exists;
- `blocked by error` when target binding evidence and credential owner action
  remain unavailable.

## Scope
- Read:
  - Paperclip heartbeat context for [LUC-2815](/LUC/issues/LUC-2815)
  - `docs/planning/luc-2814-non-secret-companycore-mcp-key-repair-evidence.md`
  - `docs/operations/mcp-agent-runtime-setup.md`
  - `scripts/companycore-mcp-server.mjs`
  - `scripts/companycore-mcp-smoke.mjs`
  - `src/auth/agent-key-profiles.ts`
  - `src/auth/capabilities.ts`
- Update:
  - `docs/planning/luc-2815-non-secret-companycore-mcp-target-binding-evidence.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`

## Autonomous Loop Evidence

### 1. Analyze Current State
- [LUC-2814](/LUC/issues/LUC-2814) already verified that the local MCP profile
  policy includes MCP-capable profiles and that the manifest route requires
  `mcp:read`.
- [LUC-2700](/LUC/issues/LUC-2700) remains the latest protected target proof:
  target MCP manifest preflight rejected the approved key path with
  `403 invalid_api_key`.
- The current [LUC-2815](/LUC/issues/LUC-2815) heartbeat has no comment delta
  and no broader thread fetch requirement.

### 2. Select One Priority Mission Objective
- Selected task: [LUC-2815](/LUC/issues/LUC-2815) non-secret target binding
  evidence.
- Priority rationale: this is the delegated DRE blocker for
  [LUC-2814](/LUC/issues/LUC-2814), which blocks protected proof for
  [LUC-261](/LUC/issues/LUC-261).

### 3. Plan Implementation
- Check the current runtime for `COMPANYCORE_API_KEY` and
  `COMPANYCORE_BASE_URL` presence without printing values.
- If both are present, run only a non-mutating manifest acceptance preflight.
- If they are absent, inspect visible environment names for non-secret Roost
  binding metadata and classify the lane without probing secrets.
- Record source/syntax proof and final blocker.

### 4. Execute Implementation
- Read [LUC-2815](/LUC/issues/LUC-2815) heartbeat context.
- Checked target key/base URL presence without printing values.
- Inspected visible environment variable names for CompanyCore, Roost, MCP,
  Coolify, secret, key, base URL, and deploy indicators without printing
  values.
- Reviewed the MCP bridge/smoke source path and key-profile source.
- Did not run a target manifest call because `COMPANYCORE_API_KEY` and
  `COMPANYCORE_BASE_URL` are absent.
- Did not use the visible generic Coolify token because this heartbeat exposes
  no Roost Coolify project/resource binding. The only visible resource
  identifiers are Soar-scoped, so broad enumeration would not be Roost target
  binding evidence.

### 5. Verify and Test
- Non-secret presence proof at `2026-06-07T13:12:04.6446214Z`:
  - `COMPANYCORE_API_KEY_PRESENT=false`
  - `COMPANYCORE_BASE_URL_PRESENT=false`
  - `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`
  - `COMPANYCORE_MCP_MANIFEST_PATH=unset`
  - `COMPANYCORE_MCP_COMMAND_MODE=unset`
- Visible environment-name scan found:
  - no `COMPANYCORE_*` variables
  - no `ROOST_*` variables
  - no Roost-specific Coolify project/resource variables
  - generic `COOLIFY_*` credentials and Soar-scoped Coolify resource ids only
- Syntax checks:
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- `git rev-parse --short HEAD` -> `a48a8ee`

### 6. Self-Review
- A narrow target `/v1/mcp/manifest` acceptance probe would be the correct
  proof if key/base URL were present.
- Because this heartbeat has no CompanyCore target binding or Roost Coolify
  resource metadata, a manifest acceptance claim would be unsupported.
- No workaround, bypass, protected deploy smoke, deploy, restart, production
  mutation, or secret exposure occurred.

### 7. Update Documentation and Knowledge
- This packet records the DRE target-binding evidence and blocker.
- Context, task board, active mission, next steps, module confidence, and active
  queue pointers were updated.
- Learning journal was not updated because no new recurring tooling pitfall was
  found.

## DRE Determination

| Surface | Evidence | Classification |
| --- | --- | --- |
| Current heartbeat target env binding | `COMPANYCORE_API_KEY_PRESENT=false`; `COMPANYCORE_BASE_URL_PRESENT=false`. | missing |
| Roost target deployment metadata | [LUC-2969](/LUC/issues/LUC-2969) found Coolify project `LuckySparrow`, production env, Roost app `rnqqkhl3o3dut4qv56mlxly2` / id `20`, repo `Wroblewski-Patryk/Roost`, branch `main`. | present in config |
| Target runtime liveness | Public health returns `status: ok`, service `companycore`, build commit `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`. | verified |
| MCP endpoint guard | Unauthenticated `/v1/mcp/manifest` returns `401 Unauthorized`, request id `6a12e225-c5c4-41a0-991a-7028b4b2e943`. | verified fail-closed guard |
| Non-mutating manifest preflight | Not run because key/base URL are absent. | blocked by error |
| MCP bridge/smoke source path | Syntax checks passed; bridge preflights manifest with `X-API-Key`. | implemented and verified by source/syntax inspection |
| Latest target acceptance fact | Latest accepted proof remains `403 invalid_api_key`, request ID `2a70da8f-f231-410b-88cf-8896bbaf3da9`. | blocked by error |

## Final Classification

`present in config, behavior unknown`

Roost target deployment metadata now exists through the completed
[LUC-2969](/LUC/issues/LUC-2969) source-facts lane, and DRE rechecked public
CompanyCore liveness plus the unauthenticated manifest guard. However, no
key-bearing manifest acceptance fact exists: the current runtime still lacks
`COMPANYCORE_API_KEY` and `COMPANYCORE_BASE_URL`, the target app env-name
metadata does not prove an MCP profile id or effective `mcp:read`, and the
latest protected target behavior remains `403 invalid_api_key`.

## Residual Blocker Decision

[LUC-2815](/LUC/issues/LUC-2815) cannot provide `implemented and verified`
target manifest acceptance evidence in this heartbeat. The run lacks
CompanyCore key/base URL context and therefore cannot run the allowed
key-bearing non-mutating manifest acceptance preflight. The only current
key-bearing target behavior fact remains the prior `403 invalid_api_key`
manifest failure.

The evidence-backed disposition is:

`present in config, behavior unknown`: runtime secret owner/Security must bind
or identify a Roost target CompanyCore service key created from an MCP-capable
profile, confirm effective `mcp:read` scope without exposing the raw key, and
record non-secret `/v1/mcp/manifest` acceptance evidence.

## Required Unblock Evidence

Before [LUC-2814](/LUC/issues/LUC-2814), [LUC-261](/LUC/issues/LUC-261), or a
future gate recheck consumes a fresh protected deploy-smoke approval, record
all of the following without secret values:

1. Target environment name.
2. Key profile id, for example `mcp_company_os_reader` or `mcp_event_worker`.
3. Confirmation that effective scopes include `mcp:read`.
4. Rotation or binding timestamp.
5. `/v1/mcp/manifest` acceptance result with status `200`, UTC timestamp,
   request ID if available, and tool count or profile-visible route count.
6. Confirmation that no raw key was printed, logged, or persisted.

## Acceptance Criteria
- [x] Target key/base URL presence was checked without values.
- [x] Visible non-secret runtime binding metadata was checked.
- [x] No secret values were printed, persisted, or screenshotted.
- [x] Protected deploy smoke was not run.
- [x] Final disposition names the exact credential owner/action.

## Result Report
- Task summary: [LUC-2815](/LUC/issues/LUC-2815) now has target deployment
  binding source facts from [LUC-2969](/LUC/issues/LUC-2969), so the accepted
  classification is `present in config, behavior unknown`. The current runtime
  still has no CompanyCore target key/base URL and no key-bearing manifest
  `200` acceptance fact; latest key-bearing target behavior remains the prior
  MCP manifest `403 invalid_api_key`.
- Files changed:
  - `docs/planning/luc-2815-non-secret-companycore-mcp-target-binding-evidence.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Verification:
  - non-secret env presence check -> CompanyCore key/base URL absent
  - child source-facts packet -> Roost Coolify target deployment metadata
    present
  - public health -> `status: ok`, service `companycore`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`
  - unauthenticated manifest guard -> `401 Unauthorized`, request id
    `6a12e225-c5c4-41a0-991a-7028b4b2e943`
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- Commit: not committed; this heartbeat produced docs/state evidence inside an
  already dirty shared Roost worktree.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: exact target secret state remains unknown until the runtime
  secret owner/Security supplies MCP profile id, effective `mcp:read`, binding
  timestamp, and a narrow manifest status `200` acceptance fact.
- Next owner: runtime secret owner/Security provides the repaired Roost
  CompanyCore MCP key binding acceptance evidence. [LUC-2815](/LUC/issues/LUC-2815)
  is complete for its accepted `present in config, behavior unknown`
  classification.
