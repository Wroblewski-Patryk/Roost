# LUC-5240 Company OS API Journey Proof

Status: DONE
Task type: QA verification
Current stage: verification
Last updated: 2026-06-20
Owner: QA/Test
Parent: [LUC-5233](/LUC/issues/LUC-5233)

## Goal

Reduce the recurring Roost `implementation_without_tests` confidence debt by
selecting and proving one narrow implemented CompanyCore journey from the fresh
[LUC-5233](/LUC/issues/LUC-5233) generated architecture-health artifacts.

## Selected Slice

Selected journey: Company OS command/read API coverage centered on
`GET /v1/company-os` and the guarded Company OS command routes.

Architecture entities and paths:

- `FEAT-AUTO-0006` - Company Os Coverage Expansion.
- `src/modules/company-os/company-os.routes.ts`.
- `src/modules/company-os/workflow-definition-drafts.routes.ts`.
- `src/auth/capabilities.ts` Company OS read/write/activation scopes.
- `src/tests/api.test.ts` Company OS assertions.

Reason:

- The fresh parent baseline reports `implementation_without_tests=1162` and
  `actionable_implementation_without_tests=1153`.
- Recent proof rungs already covered Strategy, Finance, Assets preview,
  Relationships, Process Core, Operating Model, and a separate Dashboard
  command slice.
- `docs/status/architecture-risk-hotspots-top.csv` ranks
  `FEAT-AUTO-0006` as the next implemented hotspot after the already-proved
  Process Core and Operating Model targets.
- The selected route is locally safe to prove with the existing isolated API
  harness and does not require protected production access.

## Scope

Allowed scope:

- Select and prove one local API journey.
- Use disposable local PostgreSQL through the project-native test harness.
- Run route/capability and architecture status checks.
- Record cleanup evidence.

Explicit exclusions:

- No protected smoke, deploy, push, restart, production mutation, credential
  access, secret disclosure, runtime feature implementation, schema change,
  migration authoring, or browser proof.

## Expected Behavior

The Company OS API journey must:

- return an authenticated workspace-scoped Company OS snapshot and collection
  readback;
- support guarded approval request and decision behavior with audit/event
  evidence;
- enforce pipeline run task-link, knowledge-link, stage lifecycle, automation
  evaluation, standard definition, workflow draft, activation, archive, and
  rollback behavior;
- fail closed for cross-workspace and under-scoped API key access;
- expose Company OS capabilities through the route manifest and MCP manifest.

## Verification Evidence

| Check | Result |
| --- | --- |
| Initial `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5240-postgres COMPANYCORE_TEST_DB_PORT=55440 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | TIMED OUT at the tool boundary after `184s`; follow-up cleanup check found no matching Roost test Node process and the validation container was gone before rerun. |
| Rerun `COMPANYCORE_TEST_DB_CONTAINER=companycore-luc-5240-postgres COMPANYCORE_TEST_DB_PORT=55440 COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP=0 npm run test:api:local` | PASS. Built server/web, applied `31` migrations to disposable PostgreSQL, seeded data, and ran `node --test dist/tests/api.test.js`: `7/7` subtests passed, including `CompanyCore v1 protected API flow` (`duration_ms=142091.5877`, total `150606.5177ms`). |
| `npm run check:route-capabilities` | PASS: `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`. |
| `npm run architecture:status` | PASS: `GREEN`, graph `454/765/35`, evidence queue `0`, chain worklist `0`, delta `0/0/0`, all gates pass. |
| Cleanup: `docker ps -a --filter "name=^/companycore-luc-5240-postgres$" --format "{{.Names}} {{.Status}}"` | PASS: no validation DB container remained after the passing run. |
| Cleanup: `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` | PASS: no browser validation process was present. |

## Classification

Reality status: verified.

The Company OS API journey is locally verified for protected workspace-scoped
read behavior, guarded command behavior, workflow definition lifecycle,
approval/audit/event evidence, route/capability consistency, MCP exposure, and
scoped-key fail-closed behavior. No defect or repair child issue is warranted
from this proof.

## Integration And Safety Notes

- Existing systems reused: project-native `scripts/test-api-local.mjs`,
  existing API assertions, existing route/capability checker, and existing
  architecture status gate.
- No workaround, temporary bypass, duplicated logic, architecture change, or
  product/runtime change was introduced.
- Deploy impact: none.
- Push status: not needed for this QA-only evidence packet.
- Residual risk: browser proof for any UI consuming Company OS data and
  protected production proof remain separate future gates.

## Result Report

Task summary: completed the next QA proof rung from the fresh
[LUC-5233](/LUC/issues/LUC-5233) `implementation_without_tests=1162` signal by
proving the Company OS API journey locally after skipping already-covered
Strategy, Finance, Assets preview, Relationships, Process Core, Operating
Model, and Dashboard command slices.

Files changed:

- `docs/planning/luc-5240-company-os-api-journey-proof.md`
- `.agents/state/active-mission.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `docs/planning/mvp-next-commits.md`

What is incomplete: no runtime defect remains for this selected journey.
Production/protected target smoke and browser proof are intentionally outside
this issue.
