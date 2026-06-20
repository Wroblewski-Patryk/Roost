# LUC-5131 Protected Target Proof Checklist

## Header

- ID: LUC-5131
- Title: Protected target proof lane after local known-state baseline
- Task Type: release
- Current Stage: verification
- Status: PARTIALLY_VERIFIED_BLOCKED_ON_KEY_INJECTION
- Owner: Ops/Release
- Depends on: LUC-5123 local known-state baseline
- Priority: P1
- Coverage Ledger Rows: `AUTH-003`, `AUTH-004`, `KEY-002`, `MCP-002`, `CONN-002`, `CCOS-DEF-001`, `CCOS-DEF-002`, `CCOS-DEF-003`, `CCOS-API-001`, `CCOS-API-002`, `CCOS-AGENT-001`, `APPROVAL-001`, `APPROVAL-002`, `STAGE-001` through `STAGE-004`, `AUTO-001`, `AUTO-002`, `EVENT-001`, `AUDIT-001`, `OM-003` through `OM-006`, `UI-DASH-001`, `UI-TASKS-001`, `UI-INTEG-001`, `UI-DATA-001`, `DRIVE-003` through `DRIVE-005`, `AGENT-002`, `AGENT-003`, `BUS-004`, `BUS-005`, `OPS-005`, `OPS-006`, `SEC-001` through `SEC-003`
- Module Confidence Rows: protected production proof and release readiness rows in `.agents/state/module-confidence-ledger.md`
- Mission ID: LUC-5131-PROTECTED-TARGET-PROOF-CHECKLIST
- Mission Status: PARTIALLY_VERIFIED

## Goal

Define the smallest target-environment proof package that can turn Roost's
local known-state baseline into protected target readiness evidence without
running production-sensitive commands in this planning heartbeat.

## Scope

Reviewed:

- `docs/operations/v1-function-coverage-ledger.csv`
- `docs/operations/post-deploy-smoke.md`
- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/rollback-and-recovery.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/module-confidence-ledger.md`
- `package.json`

Explicit exclusions:

- No protected smoke execution.
- No push, deploy, restart, production mutation, or secret access.
- No owner credential, service key, Coolify credential, or API key readback.
- No broad source-control or runtime code change.

## Current State

Local evidence is healthy enough to request target proof:

- `npm run architecture:status` PASS on 2026-06-20 with `GREEN`, graph
  `454 nodes / 765 relations / 35 chains`, evidence queue `0`, chain worklist
  `0`, delta `0/0/0`, and all gates passing.
- `HEAD` during this packet: `04a2e7c3`.
- Branch state during this packet: `main...origin/main [ahead 66]`.

Coverage ledger caveat:

- `docs/operations/v1-function-coverage-ledger.csv` imports imperfectly through
  PowerShell CSV parsing for some rows after `AUTH-003`; raw line review was
  used as the source for target evidence gaps.
- The raw ledger still clearly records protected/target gaps across MCP,
  Company OS, approval/stage/automation, event/audit, selected operating-model
  CRUD, owner UI, Drive content/write/freshness, agent registry/logs, business
  CRUD, rollback inventory, auto-deploy, and security/adversarial checks.

## Approved Run Checkpoint

On 2026-06-20, approval `58e52ef3-6664-446a-9a7b-0dd46207ee6e` was accepted
for one read-only protected target proof run:

- public health/API/CORS/unauthenticated denial;
- target `mcp:smoke`;
- target `aog:deploy-smoke` with registration disabled;
- owner UI read-only proof only if an approved owner session path is available.

Runtime credential facts during the approved heartbeat:

- `COMPANYCORE_API_KEY` was not injected.
- `COMPANYCORE_BASE_URL` was not injected.
- `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION` was not set.

Result: public read-only target checks were executed and passed. Credentialed
protected service-key checks were not executed because the required approved
key was not available in the heartbeat environment.

## Target Proof Package

### Safe Local Preconditions

These checks do not require target secrets or production mutation:

1. Source state readback:
   - `git status --short --branch`
   - `git rev-parse --short HEAD`
2. Architecture baseline:
   - `npm run architecture:status`
3. Route/capability drift gate before any release action:
   - `npm run check:route-capabilities`
4. Build gate before any deploy or target rerun:
   - `npm run build`
5. If a commit will be released, use the normal pre-release contract:
   - migration review if schema changed
   - relevant local tests before push/deploy

### Safe Public Target Checks

These are public read-only checks and can run without credential access, but
they should still be recorded as target evidence:

1. `GET https://api.roost.luckysparrow.ch/health`
   - Expect `200`, `status=ok`, and build metadata when available.
2. `GET https://roost.luckysparrow.ch/`
   - Expect owner web shell or intentional public entry response.
3. `GET https://api.roost.luckysparrow.ch/`
   - Expect API metadata response.
4. CORS preflight from `https://roost.luckysparrow.ch` to
   `https://api.roost.luckysparrow.ch`.
5. Unauthenticated protected-route denial:
   - sample `GET /v1/connection` without credentials.
   - Expect `401` or documented deny response with no private data.

### Protected Read-Only Target Checks

These require a fresh approved `COMPANYCORE_API_KEY` or equivalent approved
workspace service key. They must not print or persist key material.

1. MCP/service-key smoke:
   - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<injected> npm run mcp:smoke`
   - Proves `MCP-002`, `CONN-002`, route metadata sampling, and fail-closed
     service-key behavior.
2. AOG deploy smoke:
   - `COMPANYCORE_BASE_URL=https://api.roost.luckysparrow.ch COMPANYCORE_API_KEY=<injected> npm run aog:deploy-smoke`
   - Keep `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION` unset unless the board
     explicitly approves smoke user creation on target.
3. Company OS read packet:
   - Protected read of Company OS definition/collection/agent context routes
     through the existing API or MCP profile.
   - Proves `CCOS-DEF-001`, `CCOS-DEF-003`, `CCOS-API-002`, and
     `CCOS-AGENT-001` without raw CRUD.
4. Event and audit readback:
   - Protected read of relevant event/audit endpoints after a target-safe
     read-only command or existing evidence event.
   - Proves target visibility for `EVENT-001` and `AUDIT-001` without creating
     a new production mutation in the read-only lane.

### Protected Owner UI Checks

These require fresh approved owner session access or a board-approved
first-owner/bootstrap path. They should use screenshots and console/network
logs, but no credential capture.

1. Owner login or approved bootstrap works.
2. `/areas?area=00-ogolny&view=overview` renders the protected owner shell.
3. `/settings/api` shows API key/MCP profile readiness without exposing raw
   secrets.
4. Company OS cockpit or current equivalent route renders read-only context if
   still part of the deployed route set.
5. Desktop and mobile checks record:
   - no console errors
   - no failed non-font requests
   - no horizontal overflow
   - no raw backend/provider errors shown to the user

### Optional Target-Safe Mutation Samples

Run only with explicit approval that names allowed mutation scope, cleanup, and
rollback/recovery expectations:

1. Company OS lifecycle command sample:
   - approval request/decision, stage start/block/validate/complete, and
     automation dry-run/execute if a disposable or pre-approved target record
     exists.
   - Proves `APPROVAL-001`, `APPROVAL-002`, `STAGE-001` through `STAGE-004`,
     `AUTO-001`, and `AUTO-002`.
2. Operating model lifecycle sample:
   - folder, storage location, knowledge root, and automation definition CRUD
     only against approved disposable records.
   - Proves `OM-003` through `OM-006`.
3. Drive target-safe sample:
   - Docs/Sheets content readback, changes reconcile, or create/edit only
     against approved non-sensitive test files.
   - Proves `DRIVE-003`, `DRIVE-004`, and `DRIVE-005`.
4. Agent and business CRUD sample:
   - agent registry/logs and CRM/business records only if the release objective
     needs those rows now.

## Approval Request Needed

Protected execution should wait for board/operator approval that provides or
confirms:

- Target base URL: `https://api.roost.luckysparrow.ch`
- Credential path: approved injection of `COMPANYCORE_API_KEY` or owner session
  material without exposing secret values in logs or issue comments.
- Whether this heartbeat may run read-only protected checks only, or also the
  optional target-safe mutation samples.
- Whether smoke user creation is allowed by setting
  `COMPANYCORE_DEPLOY_SMOKE_ALLOW_REGISTRATION=true`.
- Rollback owner and current rollback pointer confirmation before any deploy or
  state-changing target sample.

Recommended first approval is read-only only:

1. Public health/API/CORS/unauthenticated-denial checks.
2. `npm run mcp:smoke` against `https://api.roost.luckysparrow.ch`.
3. `npm run aog:deploy-smoke` with registration disabled.
4. Protected owner UI read-only route proof if approved owner session access is
   available.

## Acceptance Criteria

- [x] Protected gates are separated from safe local checks.
- [x] Smallest first target package is read-only by default.
- [x] Mutating target samples are separated as optional approval-gated work.
- [x] No protected smoke, push, deploy, restart, production mutation, or secret
      access occurred in this heartbeat.
- [x] Approval path is required before protected execution.

## Validation Evidence

### Approved Public Target Evidence

- UTC timestamp: `2026-06-20T15:03:52Z`.
- Source checkpoint: `HEAD=6a35f973`; branch
  `main...origin/main [ahead 68]`.
- `GET https://api.roost.luckysparrow.ch/health` returned `200 OK` with
  `status=ok`, `service=companycore`, build commit
  `5c6fff326d47b442763c0d78b52bf9306ce3bd9a`, and image `unknown`.
  Request ID: `76cebdd2-0407-4d19-8730-c84a3b904e5e`.
- `GET https://roost.luckysparrow.ch/` returned `200 OK` and served the
  Roost owner web shell HTML titled `Roost | LuckySparrow Operating Center`.
  Request ID: `1114a140-2009-4202-a9f3-c0dfad35a02d`.
- `GET https://api.roost.luckysparrow.ch/` returned `200 OK` with API
  metadata for web `https://roost.luckysparrow.ch`, API
  `https://api.roost.luckysparrow.ch`, health `/health`, and version `v1`.
  Request ID: `90b42a7e-33c7-4748-aad6-a01ab35277a2`.
- CORS preflight `OPTIONS https://api.roost.luckysparrow.ch/v1/connection`
  from origin `https://roost.luckysparrow.ch` returned `204 No Content` with
  `Access-Control-Allow-Origin: https://roost.luckysparrow.ch`,
  `Access-Control-Allow-Headers: X-API-Key`, and standard API methods.
  Request ID: `b6783e4c-7071-4aa7-ab85-5b1f6ff6f0f1`.
- Unauthenticated `GET https://api.roost.luckysparrow.ch/v1/connection`
  returned `401 Unauthorized` with `error=missing_api_key` and no private
  data. Request ID: `3bfb5640-462b-4611-8139-bc6db3bf33c2`.
- `npm run architecture:status` PASS:
  - `GREEN`
  - `454 nodes / 765 relations / 35 chains`
  - evidence queue `0`
  - chain worklist `0`
  - delta `0/0/0`
  - all gates pass `yes`

### Planning Evidence

- `npm run architecture:status` PASS:
  - `GREEN`
  - `454 nodes / 765 relations / 35 chains`
  - evidence queue `0`
  - chain worklist `0`
  - delta `0/0/0`
  - all gates pass `yes`
- `git status --short --branch` reported `main...origin/main [ahead 66]`.
- `git rev-parse --short HEAD` reported `04a2e7c3`.
- Timestamp: `2026-06-20T14:08:08.7621294Z`.

## Result Report

- Task summary: produced a protected target proof checklist and identified the
  smallest safe first package as public/read-only checks plus approved
  service-key MCP/AOG smoke, with target mutations kept out of the first run.
- Files changed: this planning packet plus source-of-truth state updates in
  this same heartbeat.
- How tested: approved public target checks passed and local architecture
  status remained green.
- What is incomplete: credentialed protected target checks remain blocked
  because the approved `COMPANYCORE_API_KEY` was not injected into the
  heartbeat environment. `mcp:smoke`, `aog:deploy-smoke`, and owner UI
  read-only proof were not executed.
- Next steps: runtime secret owner or board operator injects the approved
  `COMPANYCORE_API_KEY` for one same-scope read-only continuation; rerun only
  target `mcp:smoke` and `aog:deploy-smoke` with registration disabled, then
  record pass/fail evidence.
