# Task

## Header
- ID: LUC-3497
- Title: CompanyCore runtime binding facts for LUC-2971
- Task Type: release
- Current Stage: verification
- Status: DONE_WITH_RESIDUAL_BLOCKER
- Owner: Deployment and Reliability Engineer
- Depends on: [LUC-2971](/LUC/issues/LUC-2971), [LUC-2700](/LUC/issues/LUC-2700), [LUC-261](/LUC/issues/LUC-261)
- Priority: P1
- Mission ID: LUC-3497-COMPANYCORE-RUNTIME-BINDING-FACTS
- Mission Status: VERIFIED_WITH_RESIDUAL_BLOCKER

## Process Self-Audit
- [x] All seven autonomous loop steps are represented.
- [x] Exactly one priority task is selected.
- [x] Current stage is verification because this task discovers non-secret runtime binding facts without mutating runtime state.
- [x] Affected module confidence row is protected runtime MCP adapter/key acceptance.
- [x] The task improves release confidence by separating runtime target facts from missing MCP key/profile acceptance facts.

## Mission Block
- Mission objective: Discover non-secret Roost CompanyCore runtime binding facts needed by [LUC-2971](/LUC/issues/LUC-2971).
- Release objective advanced: keep [LUC-2700](/LUC/issues/LUC-2700) and [LUC-261](/LUC/issues/LUC-261) fail-closed until real key-bearing MCP manifest `200` evidence exists.
- Included slices: Paperclip issue context read, local env-name presence check, read-only Coolify project/app/env-name metadata, public target health, unauthenticated MCP manifest guard, MCP bridge/smoke syntax checks, architecture continuity proof, and source-of-truth sync.
- Explicit exclusions: no protected deploy smoke, deploy, push, restart, production mutation, key rotation, secret value print, secret persistence, or unrelated runtime change.
- Stop conditions: evidence packet published, source-of-truth state updated, and Paperclip issue disposition set with exact residual owner/action.
- Handoff expectation: runtime secret owner or Security must provide non-secret MCP key/profile acceptance facts before a fresh protected smoke approval is consumed.

## Context
[LUC-3497](/LUC/issues/LUC-3497) was assigned because [LUC-2971](/LUC/issues/LUC-2971) cannot prove key-bearing `/v1/mcp/manifest` acceptance without runtime binding facts. The missing work is DRE-owned runtime/service binding discovery, not secret disclosure or protected deploy-smoke execution.

## Goal
Give [LUC-2971](/LUC/issues/LUC-2971) enough non-secret runtime facts to attempt or validate key-bearing MCP manifest acceptance, or name the exact remaining missing input and owner/action.

## Scope
- Read:
  - Paperclip heartbeat context for [LUC-3497](/LUC/issues/LUC-3497)
  - Current local environment variable names and presence only
  - Coolify project, environment, application, and application env-name metadata
  - `https://api.roost.luckysparrow.ch/health`
  - `https://api.roost.luckysparrow.ch/v1/mcp/manifest` without a key
  - `scripts/companycore-mcp-server.mjs`
  - `scripts/companycore-mcp-smoke.mjs`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
- Update:
  - `docs/planning/luc-3497-companycore-runtime-binding-facts-for-luc-2971.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`

## Autonomous Loop Evidence

### 1. Analyze Current State
- [LUC-2971](/LUC/issues/LUC-2971) is blocked because no Roost `COMPANYCORE_API_KEY`, `COMPANYCORE_BASE_URL`, MCP profile id/label, effective `mcp:read`, binding timestamp, or key-bearing manifest `200` fact was available to Security.
- Prior source-facts packets found Coolify target config and live public health, but no MCP-profile key acceptance fact.
- This DRE heartbeat has Paperclip and Coolify access, but local Roost MCP runtime env names remain absent.

### 2. Select One Priority Mission Objective
- Selected task: [LUC-3497](/LUC/issues/LUC-3497) runtime binding fact discovery.
- Priority rationale: it is the direct child blocker under [LUC-2971](/LUC/issues/LUC-2971), which blocks the protected runtime gate.

### 3. Plan Implementation
- Inspect only non-secret runtime binding sources.
- Use filtered Coolify reads and record keys/names/metadata only.
- Use public health and unauthenticated manifest guard as liveness and fail-closed proof.
- Do not run protected deploy smoke or key-bearing smoke without an available approved key binding.

### 4. Execute Implementation
- Read Paperclip heartbeat context for [LUC-3497](/LUC/issues/LUC-3497).
- Checked local env presence for CompanyCore, Roost, MCP, Paperclip, and Coolify names without printing secret values.
- Queried Coolify project/application metadata read-only.
- Queried Roost application env-name metadata read-only and recorded variable names only.
- Queried public health and unauthenticated MCP manifest guard.
- Ran MCP bridge and smoke script syntax checks.
- Ran architecture continuity proof.

### 5. Verify and Test
- Paperclip context:
  - Issue id: `6318b52e-f265-4907-be17-be80ee2d9bf6`
  - Identifier: [LUC-3497](/LUC/issues/LUC-3497)
  - Ancestors: [LUC-2971](/LUC/issues/LUC-2971), [LUC-2700](/LUC/issues/LUC-2700), [LUC-261](/LUC/issues/LUC-261)
  - Comments: `0`
  - Blockers: `0`
- Local env-name presence at `2026-06-11T15:21:58.1565222Z`:
  - `COMPANYCORE_BASE_URL=unset`
  - `COMPANYCORE_API_KEY=unset`
  - `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`
  - `COMPANYCORE_MCP_MANIFEST_PATH=unset`
  - `COMPANYCORE_MCP_COMMAND_MODE=unset`
  - `COMPANYCORE_MCP_PROFILE_ID=unset`
  - `COMPANYCORE_MCP_PROFILE_LABEL=unset`
  - `ROOST_COMPANYCORE_APP_ID=unset`
  - `ROOST_COMPANYCORE_BASE_URL=unset`
  - `COOLIFY_BASE_URL=present`
  - `COOLIFY_API_TOKEN=present`
  - `COOLIFY_SOAR_*` resource ids are present, but no Roost-specific Coolify resource id is prebound locally.
- Coolify read-only target metadata:
  - Project: `LuckySparrow`, uuid `d1203xzl7e8csh848aj031xp`, id `10`
  - Environment: `production`, uuid `y106ybhx7fsfupe1jb012zm5`, id `12`
  - Roost app: `Roost`, uuid `rnqqkhl3o3dut4qv56mlxly2`
  - App description: `Database + API + Integrations`
  - Build pack: `dockercompose`
  - Compose file: `/docker-compose.coolify.yml`
  - Repo: `Wroblewski-Patryk/Roost`
  - Branch: `main`
  - Status: `running:unknown`
  - Server status: `true`
  - Last online: `2026-06-11 15:20:31`
  - Updated: `2026-06-11T15:20:31.000000Z`
- Roost app env-name metadata:
  - Count: `32`
  - Present runtime names include `SERVICE_PASSWORD_POSTGRES`, `SERVICE_PASSWORD_API_KEY`, `SERVICE_FQDN_BACKEND`, `SERVICE_URL_BACKEND`, `SERVICE_FQDN_BACKEND_3000`, `SERVICE_URL_BACKEND_3000`, `AUTH_TOKEN_SECRET`, `API_KEY_HASH_SECRET`, `INTEGRATION_SECRET_KEY`, `COMPANYCORE_ALLOWED_ORIGINS`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `COMPANYCORE_PUBLIC_API_BASE_URL`, `SOURCE_COMMIT`, `COOLIFY_CONTAINER_NAME`, and `COMPANYCORE_API_HOSTS` plus preview equivalents.
  - No env name `COMPANYCORE_API_KEY`.
  - No env name `COMPANYCORE_BASE_URL`.
  - No env name `COMPANYCORE_MCP_MANIFEST_PATH`.
  - No env name `COMPANYCORE_MCP_COMMAND_MODE`.
  - No env name `COMPANYCORE_MCP_PROFILE_ID` or `COMPANYCORE_MCP_PROFILE_LABEL`.
  - No env name or metadata proving `mcp_company_os_reader`, `mcp_event_worker`, effective `mcp:read`, or binding timestamp for a target MCP key.
- Public runtime health:
  - `GET https://api.roost.luckysparrow.ch/health` -> `200`
  - Body reports `status: ok`, `service: companycore`, `name: LuckySparrow Company Core`, build commit `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, image `unknown`.
- Unauthenticated manifest guard:
  - `GET https://api.roost.luckysparrow.ch/v1/mcp/manifest` without a key -> `401 Unauthorized`
  - Request id: `1cd3357c-6b4b-4e91-b657-3865636b73cb`
  - Classification: verified fail-closed endpoint protection, not key-bearing acceptance.
- Source/syntax checks:
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
  - Source scan confirms `mcp_company_os_reader` and `mcp_event_worker` profiles exist and include `mcp:read` in code/docs, but no target binding metadata proves a runtime key currently uses either profile.
- Architecture continuity:
  - `npm run architecture:status` -> PASS
  - Status: `GREEN`
  - Graph: `452` nodes / `761` relations / `34` chains
  - Evidence queue: `0`
  - Chain worklist: `0`
  - Delta: `0/0/0`
  - All gates pass: `yes`
- Source revision:
  - `git rev-parse --short HEAD` -> `a48a8ee`
  - Worktree remains pre-existing mixed dirty state on `main...origin/main [ahead 12]`.

### 6. Self-Review
- Target runtime, project, environment, app, repo, branch, app status, env-name inventory, health, and unauthenticated guard are now current.
- The target runtime is present in config and live.
- There is still no non-secret evidence of an MCP-profile key binding, effective `mcp:read`, key binding timestamp, or key-bearing manifest `200`.
- Running protected deploy smoke or key-bearing smoke would be invalid in this heartbeat because no approved key binding is available.

### 7. Update Documentation and Knowledge
- This packet records the current DRE evidence.
- Active mission, module confidence, next steps, system health, task board, and project state were updated.
- Learning journal was not updated because no recurring project pitfall was confirmed.

## Security Determination

| Surface | Evidence | Classification |
| --- | --- | --- |
| Target project/environment | Coolify `LuckySparrow` production, project uuid `d1203xzl7e8csh848aj031xp`, environment uuid `y106ybhx7fsfupe1jb012zm5`. | present in config |
| Target Roost application | Coolify app `Roost`, uuid `rnqqkhl3o3dut4qv56mlxly2`, repo `Wroblewski-Patryk/Roost`, branch `main`, compose `/docker-compose.coolify.yml`, status `running:unknown`, server status `true`. | present in config |
| Public runtime liveness | `/health` returns `200` with `status: ok`, service `companycore`, build commit `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`. | verified |
| MCP endpoint protection | Unauthenticated `/v1/mcp/manifest` returns `401 Unauthorized`, request id `1cd3357c-6b4b-4e91-b657-3865636b73cb`. | verified fail-closed guard |
| MCP source capability | Code/docs include MCP profiles with `mcp:read`, and MCP smoke scripts send `X-API-Key` to `/v1/mcp/manifest`. | implemented and verified by source/syntax inspection |
| Local DRE binding | `COMPANYCORE_API_KEY`, `COMPANYCORE_BASE_URL`, MCP path/command/profile metadata, and Roost-specific runtime binding env names are unset. | missing |
| Coolify env-name binding | Roost app has runtime env names, but none proving `COMPANYCORE_API_KEY`, `COMPANYCORE_BASE_URL`, MCP profile id/label, effective `mcp:read`, or binding timestamp for a target MCP key. | missing |
| Key-bearing manifest acceptance | No key-bearing request was legal or possible in this heartbeat; no target manifest `200` acceptance fact exists. | blocked |

## Final Classification

`present in config, behavior unknown`

The Roost CompanyCore target runtime is identifiable and live, but [LUC-2971](/LUC/issues/LUC-2971) still lacks the non-secret MCP key/profile binding facts required to prove key-bearing `/v1/mcp/manifest` acceptance.

## Required Unblock Evidence

Runtime secret owner or Security must provide all of the following without exposing secret values:

1. Target runtime URL: expected `https://api.roost.luckysparrow.ch`.
2. MCP key profile id or label, for example `mcp_company_os_reader` or `mcp_event_worker`.
3. Confirmation that effective scopes include `mcp:read`.
4. Key rotation or binding timestamp.
5. Key-bearing `/v1/mcp/manifest` result with status `200`, UTC timestamp, request id if available, and tool count or profile-visible route count.
6. Confirmation that the raw key was not printed, logged, committed, or persisted.

## Acceptance Criteria
- [x] Non-secret runtime binding sources were inspected.
- [x] Effective target runtime, project, environment, app, repo, branch, and liveness were recorded.
- [x] Base-url/key/profile binding presence was checked without printing secret values.
- [x] A key-bearing request was not sent because no approved key binding was available.
- [x] The remaining owner/action for [LUC-2971](/LUC/issues/LUC-2971) is explicit.

## Definition of Done
- [x] Evidence packet published.
- [x] No protected deploy smoke, deploy, restart, push, production mutation, key rotation, or secret disclosure occurred.
- [x] Validation evidence is reproducible from commands and read-only endpoints.
- [x] Source-of-truth state files updated.
- [x] Residual blocker names owner/action.

## Result Report
- Task summary: [LUC-3497](/LUC/issues/LUC-3497) discovered current non-secret CompanyCore runtime binding facts for [LUC-2971](/LUC/issues/LUC-2971). Target config and liveness are verified, but MCP key/profile acceptance remains unproven.
- Files changed:
  - `docs/planning/luc-3497-companycore-runtime-binding-facts-for-luc-2971.md`
  - `.agents/state/active-mission.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
- Verification:
  - Paperclip heartbeat context read -> PASS
  - local env-name presence check -> missing Roost CompanyCore key/base/profile binding names
  - Coolify project/app/env-name metadata read -> target present, no MCP key/profile binding names
  - public health -> `200`, `status: ok`
  - unauthenticated manifest -> `401 Unauthorized`, request id `1cd3357c-6b4b-4e91-b657-3865636b73cb`
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
  - `npm run architecture:status` -> PASS
- Commit: not committed; the shared Roost worktree is already mixed with unrelated active changes and previous planning/state packets.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: target runtime may have a valid MCP key outside DRE-visible metadata, but this issue cannot prove it without non-secret profile/binding and manifest `200` evidence.
- Next owner/action: runtime secret owner or Security provides MCP profile id/label, effective `mcp:read`, binding timestamp, and key-bearing `/v1/mcp/manifest` status `200` evidence without exposing the key.
