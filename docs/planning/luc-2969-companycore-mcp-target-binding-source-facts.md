# Task

## Header
- ID: LUC-2969
- Title: CompanyCore MCP target binding source facts
- Task Type: security
- Current Stage: verification
- Status: DONE
- Owner: Security and Privacy Auditor
- Parent: [LUC-2815](/LUC/issues/LUC-2815)
- Priority: P1
- Mission ID: LUC-2969-COMPANYCORE-MCP-TARGET-BINDING-SOURCE-FACTS
- Mission Status: VERIFIED_WITH_RESIDUAL_BLOCKER

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] Current stage is verification because this task determines non-secret
  target-binding facts without mutating runtime state.
- [x] Affected module confidence row was identified as protected runtime MCP
  adapter/key acceptance.
- [x] This task improves release confidence by separating target deployment
  binding facts from missing MCP-profile key acceptance facts.

## Mission Block
- Mission objective: Provide Security-owned non-secret source facts for the
  Roost CompanyCore MCP target runtime binding.
- Release objective advanced: [LUC-2815](/LUC/issues/LUC-2815),
  [LUC-2814](/LUC/issues/LUC-2814), [LUC-261](/LUC/issues/LUC-261), and
  [LUC-2700](/LUC/issues/LUC-2700) keep the protected runtime gate fail-closed
  until a real MCP manifest acceptance fact exists.
- Included slices: issue context read, prior blocker packet review, local env
  presence check, Coolify project/application/env-name metadata read, public
  health read, unauthenticated manifest guard read, MCP bridge/smoke syntax
  checks, and source-of-truth sync.
- Explicit exclusions: no protected deploy smoke, deploy, restart, push,
  production mutation, key rotation, secret value print, secret persistence, or
  unrelated runtime change.
- Stop conditions: source-facts packet published, state pointers updated, and
  Paperclip issue disposition set to done with residual blocker returned to
  [LUC-2815](/LUC/issues/LUC-2815).
- Handoff expectation: runtime secret owner/Security must still provide
  non-secret MCP-profile key acceptance evidence before any fresh protected
  deploy-smoke approval is consumed.

## Context
[LUC-2969](/LUC/issues/LUC-2969) was assigned after the earlier DRE and CINO
checks found no Roost/CompanyCore target runtime binding in their heartbeat
environments. The requested output is narrower than a protected smoke: identify
source facts for the target binding, without printing secret values or mutating
the target runtime.

Latest accepted protected target failure remains:

- command: `npm run aog:deploy-smoke`
- failure point: MCP manifest preflight
- status: `403`
- error: `invalid_api_key`
- request ID: `2a70da8f-f231-410b-88cf-8896bbaf3da9`

## Goal
Close with one accepted classification:

- `implemented and verified` if target `/v1/mcp/manifest` accepts an
  MCP-capable CompanyCore key;
- `present in config, behavior unknown` if Roost target binding metadata
  exists but no manifest acceptance fact exists;
- `blocked by error` if the binding owner/action remains unavailable.

## Scope
- Read:
  - Paperclip heartbeat context for [LUC-2969](/LUC/issues/LUC-2969)
  - `docs/planning/luc-2815-non-secret-companycore-mcp-target-binding-evidence.md`
  - `docs/planning/luc-2814-non-secret-companycore-mcp-key-repair-evidence.md`
  - `docs/operations/companycore-mcp-bridge.md`
  - `docs/operations/coolify-vps-deployment-contract.md`
  - `scripts/companycore-mcp-server.mjs`
  - `scripts/companycore-mcp-smoke.mjs`
- Update:
  - `docs/planning/luc-2969-companycore-mcp-target-binding-source-facts.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `.codex/context/TASK_BOARD.md`

## Autonomous Loop Evidence

### 1. Analyze Current State
- [LUC-2815](/LUC/issues/LUC-2815) previously had no Roost target metadata in
  its heartbeat environment.
- This heartbeat exposes generic Coolify API access and no local
  `COMPANYCORE_*` or `ROOST_*` binding values.
- The repository deployment contract says Roost/CompanyCore deploys to Coolify
  under `roost.luckysparrow.ch` and `api.roost.luckysparrow.ch`.

### 2. Select One Priority Mission Objective
- Selected task: [LUC-2969](/LUC/issues/LUC-2969) source facts for target
  binding.
- Priority rationale: this is the Security source-facts child for the
  [LUC-2815](/LUC/issues/LUC-2815) protected runtime blocker.

### 3. Plan Implementation
- Check current heartbeat env names without printing values.
- Use read-only Coolify metadata to identify target project, environment,
  application, repo, branch, status, and variable names only.
- Do not read, quote, or persist secret values.
- Do not run protected deploy smoke or mutate target runtime.

### 4. Execute Implementation
- Read Paperclip heartbeat context for [LUC-2969](/LUC/issues/LUC-2969).
- Checked local env names for `COMPANYCORE_*`, `ROOST_*`, `COOLIFY_*`, and
  `PAPERCLIP_*`; secret-like values were redacted in command output.
- Queried Coolify project and application metadata read-only.
- Queried Roost application env-name metadata read-only.
- Queried public health and unauthenticated manifest guard.
- Ran syntax checks for MCP bridge and smoke scripts.
- No protected deploy smoke, deploy, restart, production mutation, key
  rotation, or secret value persistence occurred.

### 5. Verify and Test
- Local heartbeat env at runtime:
  - `COMPANYCORE_API_KEY_PRESENT=false`
  - `COMPANYCORE_BASE_URL_PRESENT=false`
  - `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`
  - `COMPANYCORE_MCP_MANIFEST_PATH=unset`
  - `COMPANYCORE_MCP_COMMAND_MODE=unset`
- Visible local binding names:
  - no local `COMPANYCORE_*`
  - no local `ROOST_*`
  - generic `COOLIFY_*` credentials present
  - only Soar-scoped local Coolify resource IDs were prebound in env
- Coolify read-only metadata:
  - project: `LuckySparrow`, uuid `d1203xzl7e8csh848aj031xp`
  - environment: `production`, uuid `y106ybhx7fsfupe1jb012zm5`
  - Roost app: `Roost`, uuid `rnqqkhl3o3dut4qv56mlxly2`, id `20`
  - app status: `running:unknown`
  - app source: GitHub App, repo `Wroblewski-Patryk/Roost`, branch `main`
  - app updated/last-online metadata: `2026-06-07T22:44:30.000000Z` /
    `2026-06-07 22:44:30`
- Roost app env-name metadata:
  - present target/runtime names include `SERVICE_PASSWORD_POSTGRES`,
    `SERVICE_PASSWORD_API_KEY`, `SERVICE_FQDN_BACKEND`,
    `SERVICE_URL_BACKEND`, `AUTH_TOKEN_SECRET`, `API_KEY_HASH_SECRET`,
    `INTEGRATION_SECRET_KEY`, `COMPANYCORE_ALLOWED_ORIGINS`,
    `COMPANYCORE_PUBLIC_API_BASE_URL`, `SOURCE_COMMIT`,
    `COOLIFY_CONTAINER_NAME`, and `COMPANYCORE_API_HOSTS`
  - no app env name `COMPANYCORE_API_KEY`
  - no app env name `COMPANYCORE_BASE_URL`
  - no app env name `COMPANYCORE_MCP_MANIFEST_PATH`
  - no app env name `COMPANYCORE_MCP_COMMAND_MODE`
  - no app env name or metadata proving an MCP profile id such as
    `mcp_company_os_reader` or `mcp_event_worker`
- Public health:
  - `GET https://api.roost.luckysparrow.ch/health` returned `status: ok`,
    `service: companycore`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, image `unknown`
- Unauthenticated manifest guard:
  - `GET https://api.roost.luckysparrow.ch/v1/mcp/manifest` without a key
    returned `401`, proving the endpoint is protected but not proving key
    acceptance.
- Syntax checks:
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- Source revision:
  - `git rev-parse --short HEAD` -> `a48a8ee`

### 6. Self-Review
- Coolify target binding metadata is now present in config.
- The target app variable names do not include an agent-runtime
  `COMPANYCORE_API_KEY` / `COMPANYCORE_BASE_URL` binding, and no variable name
  proves an MCP-capable profile key has been provisioned.
- The public runtime is alive, but liveness is not MCP acceptance.
- The correct classification is `present in config, behavior unknown` with the
  protected gate still blocked for actual manifest `200` acceptance evidence.

### 7. Update Documentation and Knowledge
- This packet records the source facts.
- Active mission, module confidence, next steps, system health, and task board
  pointers were updated.
- Learning journal was not updated because no recurring tooling pitfall was
  confirmed.

## Security Determination

| Surface | Evidence | Classification |
| --- | --- | --- |
| Roost target deployment binding | Coolify project `LuckySparrow`, production env, app `Roost` uuid `rnqqkhl3o3dut4qv56mlxly2`, repo `Wroblewski-Patryk/Roost`, branch `main`. | present in config |
| Target runtime liveness | Public health returns `status: ok`, service `companycore`, build commit `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`. | verified |
| MCP endpoint protection | Unauthenticated `/v1/mcp/manifest` returns `401`. | verified fail-closed guard |
| MCP-capable key binding | Roost app env-name metadata does not include `COMPANYCORE_API_KEY`, `COMPANYCORE_BASE_URL`, or MCP profile id metadata. | missing as a source fact |
| Target MCP acceptance | No target key was available; no manifest `200` result exists in this heartbeat. Latest protected result remains `403 invalid_api_key`. | behavior unknown / still blocked upstream |

## Final Classification

`present in config, behavior unknown`

Roost target binding metadata exists in Coolify, and public CompanyCore health
is live. However, this heartbeat still cannot prove MCP-profile key acceptance:
no local or Coolify app env-name metadata provides `COMPANYCORE_API_KEY`,
`COMPANYCORE_BASE_URL`, MCP manifest path, command mode, MCP profile id,
effective `mcp:read`, rotation timestamp, or `/v1/mcp/manifest` status `200`
evidence.

## Required Unblock Evidence

Before [LUC-2815](/LUC/issues/LUC-2815), [LUC-2814](/LUC/issues/LUC-2814),
[LUC-261](/LUC/issues/LUC-261), or [LUC-2700](/LUC/issues/LUC-2700) consumes a
fresh protected deploy-smoke approval, record all of the following without
secret values:

1. Target environment name and app id/uuid.
2. MCP key profile id, for example `mcp_company_os_reader` or
   `mcp_event_worker`.
3. Confirmation that effective scopes include `mcp:read`.
4. Rotation or binding timestamp.
5. `/v1/mcp/manifest` acceptance result with status `200`, UTC timestamp,
   request ID if available, and tool count or profile-visible route count.
6. Confirmation that no raw key was printed, logged, or persisted.

## Acceptance Criteria
- [x] Target binding source facts were checked without secret values.
- [x] Existing Roost Coolify target app metadata was identified.
- [x] App env-name metadata was checked for MCP binding names.
- [x] No protected deploy smoke, deploy, restart, production mutation, or key
  rotation was performed.
- [x] Final classification names residual owner/action.

## Result Report
- Task summary: [LUC-2969](/LUC/issues/LUC-2969) found Roost target deployment
  binding facts in Coolify but did not find any non-secret MCP-profile key
  acceptance fact. Classification is `present in config, behavior unknown`.
- Files changed:
  - `docs/planning/luc-2969-companycore-mcp-target-binding-source-facts.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `.codex/context/TASK_BOARD.md`
- Verification:
  - Paperclip heartbeat context read -> PASS
  - local env-name scan -> no `COMPANYCORE_*` / `ROOST_*`
  - Coolify project/application/env-name metadata read -> Roost app binding
    present; no `COMPANYCORE_API_KEY` or MCP profile env name
  - public health -> `status: ok`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`
  - unauthenticated manifest -> `401`
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- Commit: not committed; this heartbeat produced docs/state evidence inside an
  already dirty shared Roost worktree.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: exact target secret/key acceptance remains unknown until a
  runtime secret owner/Security records non-secret MCP-profile manifest
  acceptance evidence.
- Next owner: runtime secret owner/Security provides MCP key profile id,
  effective `mcp:read`, binding timestamp, and `/v1/mcp/manifest` status `200`
  evidence without exposing the raw key.
