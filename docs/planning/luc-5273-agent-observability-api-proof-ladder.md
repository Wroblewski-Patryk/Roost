# LUC-5273 Agent Observability API Proof Ladder

- Task Type: QA verification / local API proof ladder
- Current Stage: verification
- Deliverable For This Stage: evidence-backed status for one agent observability API journey
- Date: 2026-06-20
- Issue: [LUC-5273](/LUC/issues/LUC-5273)
- Parent: [LUC-5264](/LUC/issues/LUC-5264)

## Goal

Verify the smallest coherent agent observability API journey from the
[LUC-5264](/LUC/issues/LUC-5264) known-state signal without changing runtime
code or touching protected runtime gates.

## Scope

- Selected journey: Agent Events read/ack observability chain.
- Architecture entities:
  - `FEAT-AUTO-0001` Agent Events Coverage Expansion
  - `API-AUTO-0021` `GET /v1/agent-events`
  - `API-AUTO-0115` `POST /v1/agent-events/:id/ack`
  - `CHAIN-AUTO-0001` `GET /v1/agent-events` -> `POST /v1/agent-events/:id/ack`
- Runtime files inspected:
  - `src/app.ts`
  - `src/modules/agent-events/agent-events.routes.ts`
  - `src/modules/agent-logs/agent-logs.routes.ts`
  - `src/modules/agents/agents.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
- Evidence sources:
  - `docs/graphs/architecture-health.json`
  - `docs/status/architecture-health-dashboard.json`
  - `docs/status/task-synchronization-report.md`
  - `docs/status/architecture-dependency-report.md`
  - `docs/status/architecture-ownership-report.md`

## Implementation Plan

1. Read the parent [LUC-5264](/LUC/issues/LUC-5264) known-state comment and
   current graph/status reports.
2. Select one agent observability API journey from the broad
   `implementation_without_tests=1162` signal.
3. Run the smallest local proof commands:
   - `npm run test:api:local`
   - `npm run check:route-capabilities`
   - `npm run architecture:status`
4. Check cleanup and source-control status.
5. Record the result in project memory and close the issue with residual risk.

## Acceptance Criteria

- One named API journey has evidence-backed status.
- Commands and results are recorded.
- Affected files and architecture entities are recorded.
- Cleanup status, source-control status, deploy impact, residual risk, and next
  owner are recorded.
- If a real behavior gap appears, create a focused repair issue.

## Result Report

Status: verified.

Selected journey: Agent Events read/ack chain for agent observability. The
journey verifies that pending agent events can be listed and acknowledged
within the active workspace, that delivery status persists as `delivered`, that
service keys without `agent-events:ack` fail closed, and that the adapter
manifest exposes the ack route with the correct capability.

Evidence from existing assertions in `src/tests/api.test.ts`:

- Google Drive change reconciliation creates `google_drive_file_changed` and
  `google_drive_file_removed` outbox events, `GET /v1/agent-events?targetAgent=paperclip`
  returns pending events, and `POST /v1/agent-events/:id/ack` persists
  `deliveryStatus = delivered`.
- ClickUp sync creates task status/comment agent events, `GET /v1/agent-events`
  returns those events, and ack succeeds.
- A scoped service key without ack scope receives `403 forbidden` for
  `POST /v1/agent-events/:id/ack`.
- `/v1/connection` adapter manifest exposes `POST /v1/agent-events/:id/ack`
  with capability `agent-events:ack`.

## Verification

Commands run:

```powershell
$env:COMPANYCORE_TEST_DB_CONTAINER='companycore-luc-5273-postgres'
$env:COMPANYCORE_TEST_DB_PORT='55473'
npm run test:api:local
```

Result: PASS. The command completed server build, web build, all `31`
migrations, seed, and `7/7` API subtests. `CompanyCore v1 protected API flow`
duration was `51585.1904ms`; total test duration was `56154.3004ms`.

```powershell
npm run check:route-capabilities
```

Result: PASS with `checkedManifestRoutes=180`, `checkedRouteFiles=35`, and
`status=ok`.

```powershell
npm run architecture:status
```

Result: PASS. Architecture status was `GREEN`; graph `454` nodes / `765`
relations / `35` chains; evidence queue `0`; chain worklist `0`; delta
`0/0/0`; all gates pass `yes`.

Cleanup checks:

```powershell
docker ps -a --filter "name=companycore-luc-5273-postgres" --format "{{.Names}} {{.Status}}"
Get-Process chrome-headless-shell -ErrorAction SilentlyContinue
```

Result: no validation DB container rows and no `chrome-headless-shell` process
rows.

## Source Control

Initial source-control state was already dirty before this proof, including
state/context docs and one untracked
`docs/planning/luc-5263-integration-settings-api-journey-proof.md`. Those
pre-existing changes were left untouched. This issue adds this evidence packet
and updates current project state files only.

No commit, push, deploy, restart, protected smoke, production mutation,
credential access, or secret disclosure occurred.

## Definition Of Done

- Local API behavior proof: PASS.
- Route/capability drift proof: PASS.
- Architecture status proof: PASS.
- Cleanup proof: PASS.
- Documentation/project memory update: completed in this packet and state docs.
- Repair issue: not created because no defect was found.

## Residual Risk

This is local API proof only. Browser proof and protected production/runtime
proof remain separate approval/credential-gated lanes. The broader
`implementation_without_tests=1162` signal remains confidence debt and should
continue to be handled through named journey proof ladders, not broad test
churn.
