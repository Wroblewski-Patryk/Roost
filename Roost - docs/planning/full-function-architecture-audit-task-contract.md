# Full Function Architecture Audit Task Contract

## Header
- ID: FULL-FUNCTION-ARCH-AUDIT-001
- Title: Active Function Architecture Audit And Repair
- Task Type: fix
- Current Stage: verification
- Status: DONE
- Owner: QA/Test + Backend Builder + Frontend Builder + Security + Ops/Release
- Depends on: current local working tree and recent Dashboard/Operations/Workforce foundation changes
- Priority: P1
- Coverage Ledger Rows: not applicable
- Module Confidence Rows: active web, dashboard, operations, workforce, assets, foundation hardening
- Requirement Rows: new audit evidence row if runtime or docs change
- Quality Scenario Rows: release confidence, route ownership, auth/data ownership, responsive active routes
- Risk Rows: deployment proof remains separate unless local validation exposes a deploy blocker
- Iteration: 2026-05-20 full-function audit
- Operation Mode: TESTER
- Mission ID: FULL-FUNCTION-ARCH-AUDIT-001
- Mission Status: VERIFIED

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the task intent: broad verification and defect repair.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed for long-running work.
- [x] Missing or template-like state tables were checked; active mission was refreshed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified or marked not applicable.
- [x] The task or mission improves release confidence, not only local code appearance.

## Mission Block
- Mission objective: Verify active CompanyCore functions against architecture
  and fix confirmed defects or drift found by the audit.
- Release objective advanced: local production-testable confidence for active
  00 General, 04 Operations, 06 People/Agents, 08 Assets, route/API/security
  foundation, and recent Dashboard/Operations changes.
- Included slices: source-of-truth review, route/API/capability/MCP review,
  frontend route/UX review, security/ops validation review, parent validation,
  minimal confirmed fixes, and source-of-truth evidence updates.
- Explicit exclusions: production deploy, new department features, broad
  redesign, provider write workflows, pricing/payment writes, and external
  identity mapping.
- Checkpoint cadence: after lane reports, after any fix, after validation, and
  before final handoff.
- Stop conditions: architecture decision required, external credentials needed,
  production-only proof required, or defect requires a larger approved slice.
- Handoff expectation: clear list of validated functions, fixes made, tests
  run, residual risk, and next checkpoint.

## Responsibility Lanes

| Lane | Owner | Source docs/state | Owned files/surfaces | Output | Validation/proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Coordinator | Active chat | AGENTS, active mission, task board | Integration, fixes, final acceptance | Mission packet and final report | Parent validation gate | VERIFIED |
| Backend/API | Subagent Gauss | Architecture, API routes, Prisma, MCP | Read-only backend/API audit | Findings and suggested fixes | Source refs and command suggestions | VERIFIED |
| Frontend/UX | Subagent Maxwell | Web ownership, UX docs, React code | Read-only frontend/route audit | Findings and suggested fixes | Source refs and rendered proof suggestions | VERIFIED |
| QA/Security/Ops | Subagent Hooke | Test scripts, middleware, ops docs | Read-only gate/security audit | Findings and residual risks | Gate list and cleanup notes | VERIFIED |
| Implementation | Active chat | Confirmed findings | Minimal changed files only | Repairs for confirmed defects | Re-run affected gates | VERIFIED |
| Documentation/Memory | Active chat | State and planning docs | Task/state evidence | Updated durable memory | Diff and report | VERIFIED |

### Lane Checks
- [x] `.agents/state/active-mission.md` was created or refreshed for broad work.
- [x] `.agents/workflows/responsibility-lanes.md` was reviewed.
- [x] Every important responsibility from source docs has an owner or explicit omission.
- [x] No two write lanes own the same file or shared registry.
- [x] Each lane has expected output and validation/proof.
- [x] Missing or unclear ownership was recorded in `.agents/state/responsibility-learning.md`.
- [x] Process eval will be recorded in `.agents/state/agent-evals.md`.

## Context
The active app has recently changed Dashboard, Operations work-item creation
and scheduling, People/Agents management UX, the shell, route registry, and
capability exposure. The owner asked for a full function check and repair
against architecture.

## Goal
Produce a high-confidence local verification pass over active functions and
repair any confirmed architecture mismatch or functional defect found during
the audit.

## Scope
- Backend: `src/app.ts`, `src/modules/**`, `src/auth/**`, `src/mcp/**`,
  `prisma/schema.prisma`, migrations, and API tests.
- Frontend: `web/src/app-route-registry.ts`, `web/src/main.tsx`,
  `web/src/layout/**`, active department routes, shared components, and typed
  API/client contracts.
- Validation: `scripts/check-route-capabilities.mjs`,
  `scripts/test-api-local.mjs`, package scripts, build/test gates, security
  middleware, and process cleanup.
- Docs/state: active mission, task board, project state, system health,
  module confidence, requirements/risk updates only where the audit changes
  project truth.

## Implementation Plan
1. Inspect source-of-truth state, architecture, task board, active routes, API
   routes, capabilities, MCP manifest, tests, and validation scripts.
2. Run delegated read-only lane audits in parallel.
3. Run parent validation gates locally.
4. Fix confirmed defects or architecture drift only when the correct path is
   clear and scoped.
5. Re-run affected gates and update source-of-truth evidence.

## Acceptance Criteria
- [x] Active backend/API route and capability surfaces have no confirmed P0/P1
      architecture drift in the checked local scope.
- [x] Active React routes and aliases match the approved route ownership.
- [x] Required validation gates pass or failures are recorded with exact
      blocker and residual risk.
- [x] Confirmed defects found during the audit are fixed or explicitly blocked
      by a decision/target dependency.
- [x] State docs record the audit outcome, changed files, tests, and next
      checkpoint.

## Definition of Done
- [x] Code builds without errors.
- [x] Relevant active functions work through automated gates or rendered proof.
- [x] No mock, placeholder, fake, or temporary path is introduced.
- [x] Backend/client contracts match for touched paths.
- [x] Migrations and schema are verified where relevant.
- [x] Security and ownership behavior remains fail-closed where relevant.
- [x] Changes are documented in source-of-truth state.
- [x] `DEFINITION_OF_DONE.md` was checked before status changes to `DONE`.

## Validation Evidence
- Tests: `npm run validate`; unsafe `DATABASE_URL` refusal proof; `npm run test:api:local`; `git diff --check`.
- Manual checks: Playwright static rendered proof for Dashboard command-packet error semantics and Operations true-empty task-list state.
- Screenshots/logs: shell output recorded in this task session; no screenshot artifact was retained because the proof used DOM assertions.
- High-risk checks: route/capability drift, API local test runner, auth/API
  protected route ownership, React route ownership.
- Reality status: verified.

## Result Report
- Task summary: Coordinated backend/API, frontend/UX, and QA/security/ops lane audits; fixed confirmed P0/P1/P2 drift in test database safety, API key scope confirmation, MCP operator Operations writes, dashboard/operations packet semantics, route ownership docs, dashboard loading/error empty-state behavior, query-aware route metadata, disabled dashboard cards, and Operations true-empty list state.
- Files changed: `scripts/test-api-local.mjs`, `src/tests/api.test.ts`, `src/modules/api-keys/api-keys.routes.ts`, `src/middleware/api-error.ts`, `src/auth/agent-key-profiles.ts`, `src/modules/dashboard/dashboard.routes.ts`, `src/modules/operations/operations.routes.ts`, `web/src/app-route-registry.ts`, `web/src/features/departments/general-dashboard.tsx`, `web/src/features/departments/operations-route.tsx`, `web/src/i18n/messages.ts`, `web/src/types.ts`, `docs/architecture/web-layer-react-ownership.md`, and state/task evidence files.
- How tested: `npm run validate`; unsafe `DATABASE_URL` refusal proof; `npm run test:api:local` with 26 migrations and 6/6 API tests; Playwright static DOM proof; `git diff --check`; cleanup checks for validation database container and `chrome-headless-shell`.
- What is incomplete: Production deploy smoke, provider credential workflows, and end-to-end Coolify webhook proof remain separate target-environment work.
- Next steps: production/deploy smoke after the next push or continue with the next planned department slice only after release evidence is selected.
- Decisions made: Local full-function audit scope excludes production-only provider/deploy proof; broad `adapter:*` key creation now requires explicit full-access confirmation.
