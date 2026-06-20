# LUC-5156 Strategy API Journey Proof

## Task Contract

- Task Type: QA verification / narrow route journey proof
- Current Stage: verification
- Deliverable For This Stage: focused local proof for one release-relevant route/API journey selected from the `implementation_without_tests` confidence signal
- Goal: prove one current Roost route/API journey locally without converting the aggregate missing-test signal into broad test-generation work.
- Scope:
  - Read `docs/planning/luc-5150-known-state-evidence-and-architecture-baseline.md`.
  - Read `docs/graphs/architecture-health.json`.
  - Select one release-relevant route/API journey with current product value.
  - Run the smallest safe local verification for that journey.
  - Record commands, outputs, cleanup evidence, and residual risk.
- Out of Scope:
  - No product/runtime code changes.
  - No schema or migration authoring.
  - No protected smoke, deploy, push, restart, production mutation, credential access, or secret disclosure.
  - No broad missing-test or mount-proxy test-generation lane.

## Selected Journey

| Item | Selection |
| --- | --- |
| Journey | `01 Strategy` read-only owner/agent context packet |
| User or release value | Owners and Paperclip agents must be able to inspect goals, targets, metrics, risks, decisions, knowledge, Drive evidence, tasks, allowed actions, and blocked actions before proposing strategy work. |
| API route | `GET /v1/strategy/context` |
| Web route using the packet | `/areas?area=01-strategia&view=overview` via `web/src/features/departments/strategy-route.tsx` |
| Affected server files | `src/modules/strategy/strategy.routes.ts`, `src/app.ts`, `src/auth/capabilities.ts`, `src/mcp/manifest.ts`, `src/tests/api.test.ts` |
| Affected web files | `web/src/main.tsx`, `web/src/features/departments/strategy-route.tsx`, `web/src/app-route-registry.ts` |
| Architecture-health context | `docs/graphs/architecture-health.json` reports `implementation_without_tests=1162`, including API mount and route/module entities. Prior curation says this is journey-proof debt, not broad test-generation work. |

## Why This Journey

The current known-state packet for [LUC-5150](/LUC/issues/LUC-5150) shows green architecture/task synchronization but no feature journey proof in that heartbeat. `01 Strategy` is release-relevant because it is a core owner decision surface and a read-only agent context packet with authority boundaries. The route already has focused assertions inside the existing protected API flow, so a scoped local API proof gives high confidence without starting a browser server or duplicating prior broad proof ladders.

## Verification Evidence

| Check | Command / Evidence | Result |
| --- | --- | --- |
| Source checkpoint | `git rev-parse HEAD` -> `7da0f0862367af9c1234cbcf3cce9b5cd1a9ab64` | verified |
| Disposable database | Docker `postgres:16-alpine`, container `companycore-luc-5156-postgres`, port `55461`, database `companycore_test` | verified |
| Server build | `npm run build:server` with `DATABASE_URL=postgresql://companycore:companycore@127.0.0.1:55461/companycore_test?schema=public` and `NODE_ENV=test` | PASS |
| Migration replay | `npm run prisma:migrate:deploy` | PASS, `31` migrations applied |
| Seed | `npm run seed` | PASS |
| Focused API journey proof | `node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js` | PASS, `1` test, duration `14172.2855ms` |
| Route/capability drift | `npm run check:route-capabilities` | PASS, `checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok` |
| Container cleanup | `docker rm -f companycore-luc-5156-postgres`; follow-up `docker ps -a --filter "name=^/companycore-luc-5156-postgres$" --format "{{.Names}}"` returned no rows | verified |
| Browser cleanup | `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` returned no rows | verified; no browser was started |

## Assertions Covered By The Focused Flow

The selected test flow directly exercises `GET /v1/strategy/context` through the real Express/Prisma path and covers:

- unauthenticated denial;
- authenticated owner success;
- department identity `01-strategia`;
- backend area mapping `strategy-governance`;
- packet shape for goals, targets, metrics, risks, decisions, knowledge, Drive files, tasks, and read-only agent packet;
- workspace isolation;
- MCP route visibility for `strategy:read`;
- scoped-key denial when `strategy:read` is absent.

## Classification

`verified`.

The `01 Strategy` context API journey is locally verified for this proof slice. No defect was found, so no repair child issue is warranted. The aggregate `implementation_without_tests=1162` signal remains a journey-proof selection signal, not a broad missing-test implementation task.

## Result Report

- Files changed by this issue: this planning/evidence packet and source-of-truth state updates only.
- Runtime changes: none.
- Local processes started: validation-owned PostgreSQL container `companycore-luc-5156-postgres`.
- Cleanup: validation container removed; no matching container remained; no `chrome-headless-shell` process remained.
- Commit status: not committed; evidence-only state update should be batched with source-control closure.
- Push status: held; no push performed.
- Deploy impact: none.
- Residual risk: this was an API journey proof, not a fresh desktop/mobile browser proof for `/areas?area=01-strategia&view=overview`; protected production proof remains under the existing approval/credential gate.
- Process class: regression evidence loop and delivery gap loop.
