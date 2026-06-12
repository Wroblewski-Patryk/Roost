# Task

## LUC-3521 DRE Runtime Evidence Update

- UTC: `2026-06-11T16:54:45.9690037Z`
- Source issue: [LUC-3521](/LUC/issues/LUC-3521)
- Evidence packet:
  `docs/planning/luc-3521-key-bearing-mcp-manifest-runtime-evidence-for-luc-2971.md`
- Key source: Coolify Roost application env endpoint,
  `SERVICE_PASSWORD_API_KEY`, consumed in memory only.
- Raw key printed: `false`
- Target: `https://api.roost.luckysparrow.ch/v1/mcp/manifest`
- Key-bearing manifest result: `200`
- Request id: `38b406b0-71f4-4a76-a907-450ccbd44004`
- Service: `companycore`
- Schema version: `2026-05-09`
- Auth: `api_key`, workspace-scoped `true`, capability-scoped `true`
- Manifest size: `179` tools, `79` unique capabilities
- Production MCP bridge smoke: `npm run mcp:smoke` PASS with manifest
  preflight `200`, request id `0790b8f5-cef5-480b-9b43-8ec53db32d48`,
  `179` tools, and safe read tool `companycore_get_company_os` status `200`.
- Updated classification: key-bearing target `/v1/mcp/manifest` acceptance is
  now verified by DRE runtime proof. Remaining protected deploy-smoke work is
  separate and still requires fresh approval before
  [LUC-2700](/LUC/issues/LUC-2700) runs `npm run aog:deploy-smoke`.

## LUC-2971 Security Acceptance Update

- UTC: `2026-06-11T16:58:07.1343748Z`
- Trigger: `issue_children_completed` after
  `[LUC-3521](/LUC/issues/LUC-3521)` reached `done`.
- Security decision: accept the DRE runtime proof as the requested key-bearing
  MCP manifest acceptance evidence for `[LUC-2971](/LUC/issues/LUC-2971)`.
- Accepted target runtime: `https://api.roost.luckysparrow.ch`
- Accepted key source label: Coolify Roost `SERVICE_PASSWORD_API_KEY`, consumed
  in memory only.
- Effective scope evidence: `/v1/mcp/manifest` returned `200` through
  API-key auth with workspace-scoped `true`, capability-scoped `true`, `179`
  visible tools, and production MCP bridge smoke succeeded with manifest
  preflight `200` plus safe read tool status `200`.
- Binding/proof timestamp: `2026-06-11T16:54:45.9690037Z`.
- Manifest request id: `38b406b0-71f4-4a76-a907-450ccbd44004`.
- MCP bridge smoke request id:
  `0790b8f5-cef5-480b-9b43-8ec53db32d48`.
- Raw key handling: child packet states the raw key was not printed, logged in
  the evidence packet, committed, or persisted; it was injected only into the
  command process and removed afterward.
- Residual caveat: the evidence names the Coolify key source rather than a
  product-level MCP profile id such as `mcp_company_os_reader`. This does not
  block the LUC-2971 acceptance objective because key-bearing manifest access is
  verified, but the runtime gate owner should preserve the caveat when deciding
  the separately approval-gated `[LUC-2700](/LUC/issues/LUC-2700)` protected
  deploy-smoke rerun.
- Final LUC-2971 classification: `implemented and verified`.

## Header
- ID: LUC-2971
- Title: Key-bearing MCP manifest acceptance evidence for LUC-2700
- Task Type: security
- Current Stage: verification
- Status: IMPLEMENTED_AND_VERIFIED
- Owner: Security and Privacy Auditor
- Depends on: LUC-2700, LUC-261, LUC-2814, LUC-2968
- Priority: P1
- Mission ID: LUC-2971-KEY-BEARING-MCP-MANIFEST-ACCEPTANCE

## Mission Block
- Mission objective: Prove whether the Roost target runtime accepts a
  key-bearing request to `/v1/mcp/manifest` before LUC-2700 consumes another
  protected deploy-smoke approval.
- Included slices: issue context read, prior blocker packet review,
  non-secret environment presence check, direct manifest probe scaffold, MCP
  source/syntax verification, and Paperclip disposition.
- Exclusions: no protected deploy smoke, deploy, push, restart, production
  mutation, key rotation, secret read beyond process environment presence,
  secret value print, or secret persistence.
- Final disposition: implemented and verified after DRE runtime proof from
  `[LUC-3521](/LUC/issues/LUC-3521)` established key-bearing target
  `/v1/mcp/manifest` status `200`.

## Goal
Produce non-secret acceptance evidence for the repaired MCP key path, or record
the exact non-secret reason that acceptance could not be proven.

## Scope
- Read:
  - Paperclip heartbeat context for LUC-2971
  - `docs/planning/luc-2814-non-secret-companycore-mcp-key-repair-evidence.md`
  - `docs/planning/luc-2815-non-secret-companycore-mcp-target-binding-evidence.md`
  - `docs/planning/luc-2969-companycore-mcp-target-binding-source-facts.md`
  - `scripts/companycore-mcp-smoke.mjs`
  - `scripts/companycore-mcp-server.mjs`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
- Update:
  - `docs/planning/luc-2971-key-bearing-mcp-manifest-acceptance-evidence.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`

## Evidence

### Runtime Binding Presence
- UTC: `2026-06-07T22:59:34.9705771Z`
- `COMPANYCORE_BASE_URL`: `unset`
- `COMPANYCORE_API_KEY`: `unset`
- `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION`: `unset`
- `COMPANYCORE_MCP_MANIFEST_PATH`: `unset`
- `COMPANYCORE_MCP_COMMAND_MODE`: `unset`
- `COMPANYCORE_MCP_PROFILE_ID`: `unset`
- `COMPANYCORE_MCP_PROFILE_LABEL`: `unset`
- `COMPANYCORE_API_KEY_PROFILE`: `unset`
- `COMPANYCORE_API_KEY_PROFILE_ID`: `unset`
- `COMPANYCORE_API_KEY_BOUND_AT`: `unset`

Visible environment-name scan found generic Paperclip variables and generic /
Soar-scoped Coolify variables only. It did not expose Roost target
`COMPANYCORE_*`, `ROOST_*`, or MCP profile metadata names. No secret values
were printed.

### Manifest Acceptance Probe
- UTC: `2026-06-07T22:59:34.9927655Z`
- Target runtime fallback used for classification:
  `https://api.roost.luckysparrow.ch`
- Manifest path: `/v1/mcp/manifest`
- API key present: `false`
- Request sent: `false`
- HTTP status: `n/a`
- Request id: `n/a`
- Accepted: `false`
- Effective `mcp:read`: `false`
- Classification: `blocked_by_missing_key`

The key-bearing target request was not sent because no key was available in the
heartbeat environment. This is safer than sending an unauthenticated request and
misclassifying it as key-bearing proof.

### Source And Syntax Verification
- `src/auth/agent-key-profiles.ts` includes MCP-capable profiles whose base
  scopes include `mcp:read`.
- `src/mcp/manifest.ts` produces a capability-filtered manifest and marks MCP
  access as API-key, workspace-scoped, and capability-scoped.
- `scripts/companycore-mcp-smoke.mjs` preflights `/v1/mcp/manifest` with
  `X-API-Key` and records status plus request id without printing the key.
- `node --check scripts/companycore-mcp-server.mjs` -> PASS
- `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- `git rev-parse --short HEAD` -> `a48a8ee`

## Security Determination

| Surface | Evidence | Classification |
| --- | --- | --- |
| MCP policy/source path | MCP profiles include `mcp:read`; manifest route is capability-filtered. | implemented and verified by source/syntax inspection |
| Current key binding | `COMPANYCORE_API_KEY` and target binding metadata are absent in this heartbeat. | missing |
| Key-bearing target manifest acceptance | No key-bearing request could be sent; no status `200` exists for this run. | blocked by missing key |
| LUC-2700 protected rerun readiness | Missing MCP profile id, effective `mcp:read`, binding timestamp, and manifest `200` acceptance fact. | blocked |

## Required Unblock Evidence
Runtime secret owner or Security must provide all of the following without
secret values before LUC-2700 consumes a fresh protected deploy-smoke approval:

1. Target runtime name or URL.
2. MCP profile id or label, such as `mcp_company_os_reader` or
   `mcp_event_worker`.
3. Confirmation that effective scopes include `mcp:read`.
4. Key rotation or binding timestamp.
5. Key-bearing `/v1/mcp/manifest` result with status `200`, UTC timestamp,
   request id if available, and tool count or profile-visible route count.
6. Confirmation that no raw key was printed, logged, committed, or persisted.

## Result Report
- Task summary: LUC-2971 did not prove key-bearing manifest acceptance because
  the Security heartbeat had no Roost CompanyCore key/base URL binding or
  non-secret profile metadata. The correct disposition is blocked, not done.
- Files changed:
  - `docs/planning/luc-2971-key-bearing-mcp-manifest-acceptance-evidence.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/active-mission.md`
- Verification:
  - non-secret env presence check -> no target key/base URL/profile metadata
  - key-bearing manifest probe -> not sent because key was absent
  - `node --check scripts/companycore-mcp-server.mjs` -> PASS
  - `node --check scripts/companycore-mcp-smoke.mjs` -> PASS
- Commit: not committed; shared Roost worktree is already dirty with unrelated
  multi-lane state, planning, generated architecture, and Process Core changes.
- Push status: not needed.
- Deploy impact: none.
- Residual risk: target runtime may have a repaired key elsewhere, but this
  agent cannot prove it without an available key-binding fact.
- Next owner/action: runtime secret owner or Security must bind/provide a
  Roost MCP-capable CompanyCore key and rerun only the narrow non-mutating
  manifest acceptance probe.

## Continuation Checkpoint

### 2026-06-11 child-evidence integration
- Trigger: `issue_children_completed` after
  `[LUC-3497](/LUC/issues/LUC-3497)` reached `done`.
- Child output:
  `docs/planning/luc-3497-companycore-runtime-binding-facts-for-luc-2971.md`.
- Integrated DRE evidence:
  - Coolify project `LuckySparrow`, uuid `d1203xzl7e8csh848aj031xp`, id `10`.
  - Coolify environment `production`, uuid `y106ybhx7fsfupe1jb012zm5`, id `12`.
  - Roost app `Roost`, uuid `rnqqkhl3o3dut4qv56mlxly2`, repo
    `Wroblewski-Patryk/Roost`, branch `main`, compose
    `/docker-compose.coolify.yml`, status `running:unknown`, server status
    `true`, last online `2026-06-11 15:20:31`.
  - Public health:
    `GET https://api.roost.luckysparrow.ch/health` -> `200`, body reports
    `status: ok`, service `companycore`, build commit
    `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`.
  - Unauthenticated manifest guard:
    `GET https://api.roost.luckysparrow.ch/v1/mcp/manifest` without a key ->
    `401 Unauthorized`, request id
    `1cd3357c-6b4b-4e91-b657-3865636b73cb`.
  - Roost Coolify env-name metadata includes runtime service, auth, CORS,
    Google OAuth, public API base URL, source commit, container, and host names,
    but no `COMPANYCORE_API_KEY`, `COMPANYCORE_BASE_URL`,
    `COMPANYCORE_MCP_MANIFEST_PATH`, `COMPANYCORE_MCP_COMMAND_MODE`,
    `COMPANYCORE_MCP_PROFILE_ID`, or `COMPANYCORE_MCP_PROFILE_LABEL`.
  - DRE validation: `node --check scripts/companycore-mcp-server.mjs` PASS,
    `node --check scripts/companycore-mcp-smoke.mjs` PASS, and
    `npm run architecture:status` PASS.
- Current Security heartbeat presence proof at
  `2026-06-11T15:25:41.8355438Z`:
  - `COMPANYCORE_BASE_URL=unset`
  - `COMPANYCORE_API_KEY=unset`
  - `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=unset`
  - MCP path, command-mode, profile, and binding metadata names unset.
- Security integration decision: target runtime is present in config and live,
  and endpoint protection is verified fail-closed. Key-bearing behavior remains
  unknown because no key-bearing request can be legally or technically sent in
  this heartbeat. No `/v1/mcp/manifest` status `200` acceptance fact exists for
  `[LUC-2700](/LUC/issues/LUC-2700)`.
- Final classification after child integration:
  `present in config, behavior unknown / blocked by missing key-bearing
  acceptance evidence`.
- Required next owner/action remains runtime secret owner or Security:
  provide MCP profile id/label, effective `mcp:read`, key binding timestamp,
  and key-bearing target `/v1/mcp/manifest` status `200` evidence without
  exposing the raw key.
