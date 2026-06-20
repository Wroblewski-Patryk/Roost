# LUC-5235 Dashboard Command API Journey Proof

Status: DONE
Task type: QA verification
Current stage: verification
Last updated: 2026-06-20
Owner: QA/Test
Parent: [LUC-5230](/LUC/issues/LUC-5230)

## Goal

Reduce the remaining Roost `implementation_without_tests` confidence signal by
selecting and proving one named release-relevant CompanyCore journey after the
recent Strategy, Finance, Assets preview, Relationships, Process Core, and
Operating Model proof rungs.

## Selected Slice

Selected journey: General Dashboard command-center read model,
`GET /v1/dashboard/command`, used by `/areas?area=00-ogolny&view=overview`.

Architecture entities and paths:

- `FEAT-DASHBOARD-COMMAND` - Dashboard command-center read model.
- `API-DASHBOARD-COMMAND` - `GET /v1/dashboard/command`.
- `COMP-GENERAL-DASHBOARD` - web consumer for the General dashboard.
- `src/modules/dashboard/dashboard.routes.ts`.
- `web/src/features/departments/general-dashboard.tsx`.
- `src/tests/api.test.ts` dashboard command assertions.

Reason:

- The fresh [LUC-5230](/LUC/issues/LUC-5230) baseline still reports
  `implementation_without_tests=1162`, actionable `1153`.
- Recent proof rungs already covered Strategy, Finance, Assets preview,
  Relationships, Process Core, and Operating Model.
- The General Dashboard command packet is release-relevant because it is the
  owner-facing command-center read model for what matters now, what is blocked,
  and which department queue should receive attention first.
- The selected route is locally safe to prove through the existing isolated API
  harness and does not require protected production access.

## Scope

Allowed scope:

- Select and prove one local API journey.
- Use disposable local PostgreSQL through the project-native test harness.
- Run route/capability and architecture status checks.
- Record cleanup evidence.

Explicit exclusions:

- No production smoke, deploy, push, restart, live-account mutation,
  credential access, secret disclosure, schema change, migration authoring,
  browser proof, or runtime feature change.

## Expected Behavior

`GET /v1/dashboard/command` must:

- require authenticated workspace access through the protected API flow;
- return an owner-facing summary with open work, pending approvals, workforce,
  and Drive signals;
- expose department health signals that route attention to relevant department
  work, including Operations when work pressure exists;
- surface next actions such as approval review when pending approvals exist;
- keep the dashboard read-only by returning blocked actions for writes that
  belong to domain-specific routes;
- return an agent packet with `mode: "read_only_command_center"`;
- remain registered consistently in route/capability checks.

## Verification Evidence

| Check | Result |
| --- | --- |
| `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5235-postgres COMPANYCORE_TEST_DB_PORT=55435 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | PASS. Built server/web, applied `31` migrations to disposable PostgreSQL, seeded data, and ran `node --test dist/tests/api.test.js`: `7/7` subtests passed, including `CompanyCore v1 protected API flow` (`duration_ms=48773.019`, total `54318.5218ms`). Existing assertions covered `GET /v1/dashboard/command` status `200`, summary fields, Operations department signal, `review_approvals` next action, blocked actions, and `agentPacket.mode = read_only_command_center`. |
| `npm run check:route-capabilities` | PASS: `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| `npm run architecture:status` | PASS: `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup: `docker ps -a --filter "name=^/companycore-luc-5235-postgres$" --format "{{.Names}} {{.Status}}"` | PASS: no validation DB container remained. |
| Cleanup: `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` | PASS: no browser validation process was present. |

## Classification

Reality status: verified.

The Dashboard command API journey is locally verified for authenticated
workspace-scoped summary behavior, department signal exposure, actionable
approval review guidance, read-only blocked-action posture, agent packet mode,
and route/capability consistency. No defect or repair child issue is warranted
from this proof.

## Integration And Safety Notes

- Existing systems reused: project-native `scripts/test-api-local.mjs`,
  existing API assertions, existing route/capability checker, and existing
  architecture status gate.
- No workaround, temporary bypass, duplicated logic, architecture change, or
  product/runtime change was introduced.
- Deploy impact: none.
- Push status: not needed for this QA-only evidence packet.
- Residual risk: browser proof for the General Dashboard UI and protected
  production proof remain separate future gates.

## Result Report

Task summary: completed the focused QA proof-ladder selection requested by
[LUC-5235](/LUC/issues/LUC-5235) by selecting and proving the General Dashboard
command-center API journey from the remaining
`implementation_without_tests=1162` signal.

Files changed:

- `docs/planning/luc-5235-dashboard-command-api-journey-proof.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`

What is incomplete: no runtime defect remains for this selected journey.
Browser proof for `/areas?area=00-ogolny&view=overview` and protected
production proof are intentionally outside this issue.
