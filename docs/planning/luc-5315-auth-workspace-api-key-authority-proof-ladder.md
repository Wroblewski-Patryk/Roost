# LUC-5315 Auth Workspace API-Key Authority Proof Ladder

## Goal

Verify the first focused local QA proof-ladder slice for [LUC-5315](/LUC/issues/LUC-5315): Auth / Workspace / API-key authority boundaries.

## Scope

- Task type: QA verification.
- Current stage: verification.
- Deliverable for this stage: local evidence packet and issue disposition.
- In scope: `src/modules/auth/auth.routes.ts`, `src/modules/workspaces/workspaces.routes.ts`, `src/modules/api-keys/api-keys.routes.ts`, `src/auth/api-key.middleware.ts`, `src/auth/capabilities.ts`, `src/tests/api.test.ts`, and related route/capability exposure.
- Out of scope: protected production smoke, live credential use, provider mutation, deploy, push, restart, production mutation, secret disclosure, feature code, schema changes, migration authoring, and browser proof.

## Implementation Plan

1. Confirm the auth/workspace/API-key route and test surface.
2. Run the smallest sufficient local API authority proof against a disposable database.
3. Run route/capability and architecture status drift checks.
4. Verify disposable runtime cleanup.
5. Record durable evidence and final disposition.

## Acceptance Criteria

- Local API proof passes against a disposable test database.
- Proof covers owner auth, workspace scoping, service API-key capability boundaries, missing-scope denial, and cross-workspace isolation where covered by existing assertions.
- Route/capability and architecture status checks pass.
- No validation-owned database container or headless browser process remains.
- No repair issue is warranted unless proof finds a concrete defect.

## Proof

- Command: `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5315-postgres COMPANYCORE_TEST_DB_PORT=55515 npm run test:api:local`
- Result: PASS.
- Evidence:
  - server build PASS
  - web build PASS
  - Prisma migrate deploy PASS with all `31` migrations applied to disposable PostgreSQL `companycore_test` at `127.0.0.1:55515`
  - seed PASS
  - Node API tests PASS: `7/7`
  - `CompanyCore v1 protected API flow` PASS in `14731.1928ms`
  - full test duration `24818.2781ms`

Authority behavior covered by the existing protected API flow:

- Owner registration/login creates and returns workspace context.
- Bearer owner auth can access same-workspace protected routes.
- Workspace membership is required for bearer auth and denied when invalid.
- Owner-created service API keys are workspace-scoped.
- Service API keys use `X-API-Key` and expose workspace/capability context through `/v1/connection`.
- Scoped service keys expose only allowed capabilities and MCP tools.
- Missing-scope service keys deny protected reads/writes with `403 forbidden`.
- Read-only service profiles deny write, approval, workflow, automation, note-write, and agent-event ack actions.
- Service keys cannot create additional API keys.
- Cross-workspace data reads/lists in the same API flow remain isolated to the active workspace.

Key assertion locations inspected:

- `src/auth/api-key.middleware.ts` enforces bearer token membership, `X-API-Key` lookup, active key requirement, workspace requirement, and request capability matching.
- `src/auth/capabilities.ts` defines the route-to-capability contract and `X-API-Key` service header.
- `src/modules/api-keys/api-keys.routes.ts` restricts API-key management to user auth and current workspace.
- `src/modules/workspaces/workspaces.routes.ts` restricts workspace listing/selection to user membership.
- `src/tests/api.test.ts` lines around `6100-6311` assert scoped-key capability exposure and fail-closed denials; later assertions cover service-key connection manifest, service-key API-key creation denial, and cross-workspace isolation.

## Drift Checks

- `npm run check:route-capabilities`: PASS
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`
- `npm run architecture:status`: PASS
  - `Architecture Status: GREEN`
  - graph `454` nodes / `765` relations / `35` chains
  - evidence queue `0`
  - chain worklist `0`
  - delta nodes `0`, relations `0`, chains `0`
  - all gates pass `yes`

## Cleanup Evidence

- `docker ps -a --filter name=^/companycore-luc-5315-postgres$ --format "{{.Names}} {{.Status}}"`: no output.
- `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue`: no output.
- No browser proof, dev server, watcher, deploy, protected smoke, credential access, secret disclosure, or live provider action was started.

## Result Report

Status: verified done.

The Auth / Workspace / API-key authority slice is locally verified through existing API regression coverage and green route/architecture checks. No defect was found and no repair child issue is warranted. Protected production/key proof remains a separate approval/credential-gated lane.
