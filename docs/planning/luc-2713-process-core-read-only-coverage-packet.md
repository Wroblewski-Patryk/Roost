# Task

## Header
- ID: LUC-2713
- Title: Roost Process Core read-only coverage packet
- Task Type: backend feature
- Current Stage: verification
- Status: DONE
- Owner: Core Backend Engineer
- Priority: P1
- Parent: [LUC-2709](/LUC/issues/LUC-2709)
- Mission ID: LUC-2713-PROCESS-CORE-READ-ONLY-COVERAGE
- Mission Status: VERIFIED_DONE

## Goal
Implement the first read-only Process Core backend packet from the
[LUC-2709](/LUC/issues/LUC-2709) audit: `GET /v1/process-core/coverage` under
`process-core:read`, with MCP visibility and API assertions for authorization,
workspace isolation, and no runtime mutation.

## Scope
- `src/modules/process-core/process-core.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `src/tests/api.test.ts`
- `scripts/check-route-capabilities.mjs`
- `docs/planning/luc-2713-process-core-read-only-coverage-packet.md`
- Source-of-truth state files touched in this checkpoint

## Implementation Plan
1. Reuse the existing Express router, API-key capability manifest, and MCP
   manifest generation path.
2. Add a GET-only Process Core coverage packet that aggregates current
   workspace-scoped Process Core model counts and static target coverage rows.
3. Add `process-core:read` to the canonical capability list, route manifest,
   low-risk MCP reader profiles, and MCP route descriptions.
4. Add API assertions for unauthenticated denial, workspace-scoped counts,
   no audit/event mutation, read-only API exposure, MCP/profile visibility, and
   scoped API-key denial.
5. Run the smallest relevant quality gates and record any environment blocker.

## Acceptance Criteria
- [x] `GET /v1/process-core/coverage` exists and is protected.
- [x] The route is read-only and exposes no write capability.
- [x] The packet reports current model counts, target coverage statuses,
      unsupported target fields, and next recommended read packets.
- [x] `process-core:read` is present in the adapter route manifest and MCP
      manifest.
- [x] API assertions were added for auth, workspace isolation, no mutation, and
      MCP/profile visibility.
- [x] API assertions were executed against disposable local PostgreSQL.

## Definition Of Done
- [x] No schema migration, seed data, UI, write route, provider mutation,
      protected smoke, deploy, push, restart, production mutation, or secret
      disclosure was performed.
- [x] `npm run build` passes.
- [x] `npm run check:route-capabilities` passes.
- [x] `git diff --check` passes with line-ending warnings only.
- [x] `npm run test:api:local` passes, or an authorized validation
      `DATABASE_URL` proof replaces Docker-backed local API execution.

## Validation Evidence
- `npm run check:route-capabilities` -> PASS
  (`checkedManifestRoutes=180`, `checkedRouteFiles=35`, `status=ok`).
- `npm run build` -> PASS (`build:server` TypeScript compile and `build:web`
  Vite build).
- `git diff --check` -> PASS with line-ending normalization warnings only.
- `npm run test:api:local` -> BLOCKED because Docker Desktop Linux engine is
  unavailable:
  `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file
  specified.`
- 2026-06-15 rerun: Docker Desktop Linux engine available (`28.3.2`);
  `npm run test:api:local` -> PASS. The command built server/web, applied all
  `31` migrations to disposable PostgreSQL `companycore_test`, seeded data,
  and ran `7/7` API subtests successfully. Cleanup probe
  `docker ps -a --filter "name=^/companycore-test-postgres$"` returned no
  rows after the run.

## Result Report
- Task summary: implemented the read-only Process Core coverage packet and
  wired it into the existing API/MCP capability system.
- Files changed:
  - `src/modules/process-core/process-core.routes.ts`
  - `src/app.ts`
  - `src/auth/capabilities.ts`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
  - `scripts/check-route-capabilities.mjs`
  - `docs/planning/luc-2713-process-core-read-only-coverage-packet.md`
- Deployment impact: none; no deploy or protected target smoke.
- What is incomplete: nothing remains for the read-only coverage packet.
- Next owner/action: no follow-up on [LUC-2713](/LUC/issues/LUC-2713);
  future Process Core schema or write-tool decisions must use this packet and
  the [LUC-2709](/LUC/issues/LUC-2709) audit as input.
