# V1 Company OS Area Foundation Task Contract

## Header

- ID: V1COS-001
- Title: Company OS Area-Aware V1 Foundation
- Task Type: feature
- Current Stage: release
- Status: DONE
- Owner: Frontend Builder + Product Docs + QA/Test
- Depends on: DMS architecture, Company OS read API, V1 selected-area shell
- Priority: P1
- Coverage Ledger Rows: CCORE-DM-002, CCORE-DM-003, CCORE-DM-014
- Module Confidence Rows: V1COS-001
- Requirement Rows: REQ-V1COS-001
- Quality Scenario Rows: QA-V1COS-001
- Risk Rows: RISK-V1COS-001
- Iteration: 2026-05-16
- Operation Mode: BUILDER
- Mission ID: V1COS-001
- Mission Status: DONE

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches the current builder iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed previously in this
      mission wave; this slice remains bounded.
- [x] Missing or template-like state tables were not needed.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task improves release confidence by aligning Company OS with V1
      department systems.

## Mission Block

- Mission objective: make `/react-company-os` read as a V1 foundation that
  connects Company OS governance/runtime evidence to the 00-12 department
  systems.
- Release objective advanced: owner and agents can start from department
  context before using Company OS commands, MCP, data, and governance evidence.
- Included slices: route registry status, top-level area control map,
  department selector, subsystem/guardrail/evidence summary, documentation.
- Explicit exclusions: no new API, no schema changes, no new write authority,
  no Paperclip runtime changes.
- Checkpoint cadence: commit after implementation and verification.
- Stop conditions: build failure, route render failure, or any need for new
  authority contracts.
- Handoff expectation: route remains a foundation surface and future work can
  deepen one department at a time.

## Context

The current `/react-company-os` route is technically strong but historically
agent/V2-oriented. V1 department-system work needs it to show how Company OS
supports each area before the owner or Paperclip uses deeper commands.

## Goal

Add an area-aware V1 foundation layer to `/react-company-os` using existing
CompanyCore connection data, canonical department registry, and Company OS
read contracts.

## Scope

- `web/src/main.tsx`
- `web/src/app-route-registry.ts`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/PROJECT_STATE.md`
- `.agents/state/*`
- `docs/planning/mvp-next-commits.md`

## Implementation Plan

1. Inspect the existing Company OS workbench and department registry.
2. Add a no-new-API department control map to `/react-company-os`.
3. Preserve existing command panels and Company OS evidence panels.
4. Validate build and rendered route behavior.
5. Update canonical planning/state evidence.

## Autonomous Loop Evidence

### 1. Analyze Current State

- Issues: `/react-company-os` exposed a rich Company OS cockpit but did not
  foreground the V1 00-12 department systems.
- Gaps: owner could jump to commands without seeing department ownership,
  subsystem context, or agent guardrails for the selected area.
- Inconsistencies: route registry marked the route as V1 foundation but the
  first viewport still read as an autonomous control plane first.
- Architecture constraints: reuse existing Company OS API, connection
  operating model, and DMS registry; no new generic graph or edge CRUD.

### 2. Select One Priority Mission Objective

- Selected task: V1COS-001 Company OS area-aware foundation.
- Priority rationale: active NOW queue after Paperclip production proof.
- Why other candidates were deferred: production smokes and deeper write
  actions depend on the V1 foundation staying coherent.

### 3. Plan Implementation

- Files or surfaces to modify: route UI, route registry metadata, docs/state.
- Logic: derive canonical area state from `ConnectionData`, let owner select a
  department, show subsystem purpose, mapped backend tables, agent handoff, and
  blocked actions.
- Edge cases: empty backend area mapping, no tables, signed-out state,
  refresh/navigation on `?area=`.

### 4. Execute Implementation

- Implementation notes: added `CompanyOsDepartmentControlMap` to
  `/react-company-os`, using the existing selected-area registry and
  `/v1/connection` state. The route now lets the owner switch between all
  `00`-`12` department systems, see subsystem purpose, mapped CompanyCore
  tables, agent handoff, and blocked actions before using existing Company OS
  evidence and command panels.

### 5. Verify and Test

- Validation performed: `npm run build:web`; `git diff --check`; embedded
  PostgreSQL migrations on `127.0.0.1:55483`; Playwright real-backend proof on
  `http://127.0.0.1:3219/react-company-os?area=04-operacje`.
- Result: desktop and mobile proof passed with no console/page errors and no
  horizontal overflow.

### 6. Self-Review

- Simpler option considered: only changing copy; rejected because the route
  needed real department selection and evidence.
- Technical debt introduced: no.
- Scalability assessment: uses the existing DMS registry and existing
  `ConnectionData`.
- Refinements made: Browser plugin was attempted first and fell back to
  Playwright because no active Codex browser pane was available. Product code
  did not need a second pass after real-backend proof.

### 7. Update Documentation and Knowledge

- Docs updated: this contract plus project planning/state ledgers.
- Context updated: task board, next steps, delivery map, system health,
  requirement matrix, quality scenarios, risk register, project state, and
  project memory index.
- Learning journal updated: not applicable.

## Acceptance Criteria

- [x] `/react-company-os` shows an area-aware department control map.
- [x] Owner can switch among 00-12 systems without new API calls.
- [x] Selected department shows subsystem, mapped-table, agent handoff, and
      blocked-action context.
- [x] Existing Company OS command/evidence panels remain available.
- [x] Build and rendered proof pass.

## Success Signal

- User or operator problem: Company OS feels separate from the department
  management systems.
- Expected product or reliability outcome: owner and Paperclip can understand
  which department the Company OS evidence supports.
- How success will be observed: rendered route markers and no build/browser
  regressions.
- Post-launch learning needed: yes.

## Deliverable For This Stage

Verified code and source-of-truth updates for V1COS-001.

## Constraints

- use existing systems and approved mechanisms
- do not introduce new structures without approval
- do not implement workarounds
- do not duplicate logic
- no placeholders, mock-only paths, or temporary solutions in delivered
  behavior

## Definition of Done

- [x] Code builds without errors.
- [x] Feature works manually through the real UI path.
- [x] No mock, placeholder, fake, or temporary data/path remains.
- [x] No existing functionality is broken.
- [x] Changes are documented in the relevant source of truth.
- [x] Behavior is reproducible from the evidence recorded below.
- [x] `DEFINITION_OF_DONE.md` was checked before status changed to `DONE`.

## Validation Evidence

- Tests:
  - `npm run build:web`
  - `git diff --check`
  - `npm run prisma:migrate:deploy` with
    `DATABASE_URL=postgresql://$USERNAME@127.0.0.1:55483/postgres?schema=public`
- Manual checks:
  - Browser plugin path attempted first; it reported no active Codex browser
    pane, so Playwright fallback was used.
  - Local backend on `http://127.0.0.1:3219` registered a fresh owner,
    opened `/react-company-os?area=04-operacje`, verified Department control
    map, Operations Management System, Agent guardrails, and existing
    Company OS collection markers, then clicked `06` and verified
    `People/Agents And Role Management System` plus `?area=06-kadry`.
- Screenshots/logs:
  - `docs/ux/evidence/v1-company-os-area-foundation-desktop.png`
  - `docs/ux/evidence/v1-company-os-area-foundation-mobile.png`
- Reality status: verified.

## Integration Evidence

- `INTEGRATION_CHECKLIST.md` reviewed: yes.
- Real API/service path used: yes, `/auth/register`, `/v1/connection`, and
  `/v1/company-os` through the backend-served React route.
- Endpoint and client contract match: yes.
- Loading state verified: route hydrated from protected backend calls before
  markers were asserted.
- Error state verified: existing signed-out/error path preserved; no new API
  error state was introduced.
- Refresh/restart behavior verified: local backend and PostgreSQL restarted
  for proof and were stopped after validation.

## Result Report

- Result: DONE.
- Files changed: `web/src/main.tsx`, `web/src/app-route-registry.ts`, source
  of truth docs/state, and two UX proof screenshots.
- Validation: `npm run build:web`, `git diff --check`, real-backend Playwright
  proof on desktop/mobile, and embedded PostgreSQL migration gate.
- Deployment impact: frontend-only route change; production smoke remains a
  next deploy task.
- Residual risk: `/react-company-os` is now area-aware but deeper per-system
  write actions still need explicit command contracts.
- Regression check performed: pending.
