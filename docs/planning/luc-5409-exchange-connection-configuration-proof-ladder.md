# LUC-5409 Exchange Connection Configuration Proof Ladder

## Goal

Run one focused QA proof ladder from the [LUC-5407](/LUC/issues/LUC-5407)
app-completion confidence debt without repeating the fresh Account access,
Subscription/Entitlement, Dashboard overview, or User configuration proof
lanes.

## Scope

- Selected flow: `Exchange connection and configuration`.
- Primary app-completion item:
  `docs/architecture/nodes/generated/MW-AUTO-0001.md` (`Api Key.Middleware`),
  marked `implemented_needs_proof` with configuration gate.
- Runtime surfaces inspected:
  - `src/modules/connection/connection.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
  - `scripts/test-api-local.mjs`
- Out of scope: live exchange/provider mutation, production smoke, protected
  credential use, browser proof, push, deploy, restart, schema changes, and
  product-code edits.

## Implementation Plan

1. Confirm the current app-completion flow summary and avoid proof duplication.
2. Map the selected flow to concrete routes, capabilities, and existing test
   assertions.
3. Run the smallest local proof that exercises the selected adapter connection
   posture.
4. Run route/capability and architecture status gates.
5. Confirm validation-owned local resources were cleaned up.
6. Record whether a repair issue is warranted.

## Acceptance Criteria

- The selected flow is named and justified from current app-completion debt.
- Verification covers local connection configuration behavior without secrets
  or live provider mutation.
- Route/capability and architecture gates pass.
- Local validation resources are cleaned up.
- A clear repair/no-repair decision is recorded.

## Definition Of Done

- Evidence is recorded in this packet and source-of-truth state files.
- [LUC-5409](/LUC/issues/LUC-5409) has a final Paperclip disposition.
- No unrelated files are reverted, staged, committed, pushed, or deployed.

## Result Report

- Status: `verified`.
- Selected proof: `Exchange connection and configuration`, interpreted as the
  internal CompanyCore adapter connection and configuration manifest path, not
  a live trading exchange operation.
- Why this slice: it is the smallest non-repeated app-completion flow after
  recent proof of Account access, Subscription/Entitlement, Dashboard overview,
  and User configuration.
- Mapping:
  - `GET /v1/connection`
  - `connection:read`
  - `src/modules/connection/connection.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
- Local API proof:
  `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5409-postgres`
  `COMPANYCORE_TEST_DB_PORT=55509`
  `COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local`
  passed. The run built server and web assets, applied all `31` migrations to a
  disposable PostgreSQL database, seeded data, and passed `7/7` node test
  subtests.
- Behavior covered by the selected proof:
  - `/v1/connection` returns `service=companycore`, `apiVersion=v1`,
    `status=ok`, and workspace-bound auth context.
  - The default operating model is ensured and returns `13` system operating
    areas with expected system-table metadata.
  - Broad service keys expose adapter capabilities including `connection:read`,
    `company-os:read`, `mcp:read`, operating-model scopes, Google Drive scopes,
    and task write scopes.
  - The adapter manifest exposes `/v1/connection`, operating-model,
    Google Drive, Company OS, process-core, MCP, task, project, goal, and
    integration-settings routes with stable auth/error guidance.
  - The MCP manifest is generated from the same capability posture.
  - Integration configuration readback is redacted and reports ClickUp and
    Google Drive as unconfigured without requiring live provider secrets.
  - Scoped service-key behavior includes `/v1/connection` access and rejects
    unsupported owner/provider actions through the broader protected API flow.
- Additional gates:
  - `npm run check:route-capabilities` passed with `180` manifest routes and
    `35` route files.
  - `npm run architecture:status` passed: `GREEN`, graph `454` nodes /
    `765` relations / `35` chains, evidence queue `0`, chain worklist `0`,
    delta `0/0/0`, all gates pass.
- Cleanup:
  - `docker ps -a --filter "name=^/companycore-luc-5409-postgres$"` returned
    no container.
  - `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned
    no process.
- Repair decision: no product repair issue is warranted for the selected local
  adapter connection/configuration posture.
- Residual risk: browser proof for the visible connection/settings surfaces
  and protected production proof remain separate future gates owned by release
  or browser-QA lanes.
- Source control: not committed in this QA heartbeat because the workspace
  already carries same-wave source-of-truth and evidence state. Source-control
  closure remains owned by the explicit closure lane.
- Push/deploy impact: none.
