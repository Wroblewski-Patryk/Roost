# LUC-5220 Process Core API Journey Proof

Status: DONE
Task type: QA verification
Current stage: verification
Last updated: 2026-06-20
Owner: QA/Test
Parent: [LUC-5218](/LUC/issues/LUC-5218)

## Goal

Reduce the persistent Roost `implementation_without_tests` confidence debt by
proving one narrow implemented CompanyCore journey that was not part of the
recent Strategy, Finance, Assets preview, or Relationships proof rungs.

## Selected Slice

Selected journey: Process Core read-only coverage packet,
`GET /v1/process-core/coverage`.

Architecture entities and paths:

- `FEAT-AUTO-0029` - Process Core Coverage Expansion.
- `src/modules/process-core/process-core.routes.ts`.
- `src/auth/capabilities.ts` (`process-core:read`).
- `src/mcp/manifest.ts` (`companycore_get_process_core_coverage`).
- `src/tests/api.test.ts` Process Core assertions.

Reason:

- `docs/status/architecture-risk-hotspots-report.json` ranks
  `FEAT-AUTO-0029` as the highest implemented hotspot (`risk_score=720`).
- The route is explicitly present in the current
  `implementation_without_tests` signal through `docs/graphs/architecture-health.json`.
- Older proof packet
  `docs/planning/luc-3545-first-proof-ladder-from-implementation-without-tests.md`
  recorded this journey as partially verified because Docker was unavailable;
  this heartbeat could complete that missing local integration rung.

## Scope

Allowed scope:

- Select and prove one read-only local API journey.
- Run disposable local PostgreSQL through the project-native test harness.
- Run route/capability and architecture status checks.
- Record cleanup evidence.

Explicit exclusions:

- No production smoke, deploy, push, restart, live-account mutation, credential
  access, secret disclosure, schema change, migration authoring, browser proof,
  or runtime feature change.

## Expected Behavior

`GET /v1/process-core/coverage` must:

- deny unauthenticated access;
- return a workspace-scoped read-only coverage packet for an authenticated owner;
- report counts for workflow definitions, runtime, governance/evidence,
  assets/knowledge, and workforce records;
- expose the `process-core:read` route and MCP tool metadata;
- preserve read-only behavior with no audit/event mutation from the read;
- remain hidden/denied for scoped credentials without `process-core:read`.

## Verification Evidence

| Check | Result |
| --- | --- |
| `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5220-postgres COMPANYCORE_TEST_DB_PORT=55420 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | PASS. Built server/web, applied `31` migrations to disposable PostgreSQL, seeded data, and ran `node --test dist/tests/api.test.js`: `7/7` subtests passed, including `CompanyCore v1 protected API flow` (`duration_ms=25793.4685`, total `29057.5133ms`). |
| `npm run check:route-capabilities` | PASS: `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| `npm run architecture:status` | PASS: `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup: `docker ps -a --filter "name=^/companycore-luc-5220-postgres$" --format "{{.Names}} {{.Status}}"` | PASS: no validation DB container remained. |
| Cleanup: `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` | PASS: no browser validation process was present. |

## Classification

Reality status: verified.

The Process Core API journey is locally verified for protected read-only
behavior, workspace-scoped counts, no-mutation read posture,
route/capability/MCP exposure, and scoped credential denial. No defect or
repair child issue is warranted from this proof.

## Integration And Safety Notes

- Existing systems reused: project-native `scripts/test-api-local.mjs`,
  existing API assertions, existing route/capability checker, existing
  architecture status gate.
- No workaround, temporary bypass, duplicated logic, architecture change, or
  product/runtime change was introduced.
- Deploy impact: none.
- Push status: not needed for this QA-only evidence packet.
- Residual risk: browser proof for any UI that consumes Process Core coverage
  and protected production proof remain separate future gates.

## Result Report

Task summary: completed the next QA proof rung from the current
`implementation_without_tests=1162` signal by proving the high-risk Process
Core read-only coverage packet locally.

Files changed:

- `docs/planning/luc-5220-process-core-api-journey-proof.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`
- `.codex/context/TASK_BOARD.md`

What is incomplete: no runtime defect remains for this selected journey.
Production/protected target smoke and browser proof are intentionally outside
this issue.
