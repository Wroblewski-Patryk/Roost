# V1OPS-001 Operations Cockpit React View Task Contract

## Header
- ID: V1OPS-001
- Title: Operations cockpit React view
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder + QA/Test
- Depends on: V1AREA-001, V1SETTINGS-002, AOG-BE-001
- Priority: P1
- Module Confidence Rows: WEB-V1-OPERATIONS
- Requirement Rows: REQ-V1OPS-001
- Risk Rows: RISK-V1OPS-001
- Iteration: 2026-05-16 V1 web mission
- Operation Mode: BUILDER
- Mission ID: V1-WEB-OPERATIONS-COCKPIT
- Mission Status: DONE

## Process Self-Audit
- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode is BUILDER for this implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] Affected module confidence, requirement, and risk rows were identified.
- [x] The task improves release confidence by turning V1 web into a practical owner operations surface.

## Mission Block
- Mission objective: add one V1 operations perspective that combines clients,
  tasks, tables, department files, and AI-agent handoff in one workbench.
- Release objective advanced: the owner can manage the company from one view
  while Paperclip/Jarvis get clearer context through existing APIs and MCP
  boundaries.
- Included slices: route registry, React route, live data aggregation,
  client quick-create, task quick-create, department file/table lens, agent
  readiness and handoff queue, responsive proof.
- Explicit exclusions: new database tables, generic workflow automation,
  production deploy, direct external provider writes beyond existing API
  contracts, unsupervised agent execution.
- Checkpoint cadence: implement one route and verify it end-to-end locally.
- Stop conditions: missing backend contract for a write, build failure, API
  regression, browser proof with horizontal overflow, or architecture drift.
- Handoff expectation: next slices can deepen CRM, task, Drive, or agent panels
  without changing this derived-view ownership.

## Context

The user asked for a V1 web surface that makes CompanyCore useful for running
the company: clients, tasks, table visibility, department file structures, and
AI-agent supervision should be visible together. The business module map says
this should be a derived view over native core and provider-backed modules, not
a new provider-led subsystem.

Design source: `docs/ux/assets/companycore-v1-operations-cockpit-concept.png`.

## Goal

Implement `/operations` as the first V1 operations cockpit that answers:

- which clients and tasks need attention;
- which department has table/file coverage;
- what files and tables are available for agents;
- what Paperclip/Jarvis can safely read or propose next;
- what the owner can create immediately.

## Scope

- `src/app.ts`
- `web/src/app-route-registry.ts`
- `web/src/main.tsx`
- `docs/ux/v1-web-view-index-2026-05-15.md`
- `.codex/context/TASK_BOARD.md`
- `docs/planning/mvp-next-commits.md`
- `.agents/state/*`
- `.codex/context/PROJECT_STATE.md`

## Implementation Plan

1. Add `/operations` to the React-served route list and route registry.
2. Build one React route using existing owner API contracts:
   `/v1/connection`, `/v1/clients`, `/v1/tasks`, `/v1/google-drive/files`,
   `/v1/agents`, `/v1/agent-events`, `/v1/company-os`, and table APIs.
3. Add client and task quick-create forms backed by existing POST routes.
4. Show lanes for CRM, delivery, department files/tables, and AI handoff.
5. Verify build, API tests, real backend route proof, responsive screenshots,
   no horizontal overflow, and cleanup.
6. Update source-of-truth state and evidence.

## Acceptance Criteria

- [x] `/operations` renders in the authenticated React shell.
- [x] The route loads real owner data from existing backend APIs.
- [x] The owner can create a client from the cockpit.
- [x] The owner can create a task from the cockpit.
- [x] The cockpit shows department file/table coverage from real workspace
      state.
- [x] The cockpit shows AI-agent readiness/handoff context without granting new
      authority.
- [x] Desktop and mobile proof shows no horizontal overflow.

## Definition of Done

- [x] Code builds without errors.
- [x] `npm run test:api` passes.
- [x] Real UI proof covers loading, ready, success, and responsive states.
- [x] No fake data, mock-only behavior, or temporary bypass remains.
- [x] Source-of-truth files reflect the implemented state and evidence.
- [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` are checked.

## Result Report

Status: done.

Implemented `/operations` as a V1 Operations Cockpit route in the React shell.
The route aggregates existing owner API contracts for workspace connection,
clients, tasks, Google Drive files, agent records, agent events, Company OS,
and table record snapshots. It adds owner quick-create forms for clients and
tasks through existing `POST /v1/clients` and `POST /v1/tasks` routes, a
department file/table evidence lens, area coverage, owner direction queue, and
AI-agent handoff/readiness context without adding new agent authority.

Validation:

- `npm run build:web` passed.
- `DATABASE_URL=postgresql://companycore@127.0.0.1:55476/postgres?schema=public npm run build` passed.
- `DATABASE_URL=postgresql://companycore@127.0.0.1:55476/postgres?schema=public npm run test:api` passed.
- `DATABASE_URL=postgresql://companycore@127.0.0.1:55476/postgres?schema=public npm run validate` passed.
- Real backend Playwright proof on `http://127.0.0.1:3161/operations`
  registered a fresh owner, opened the route, verified the four cockpit lanes,
  created `Proof Company Sp. z o.o.` as a client, created `Proof operations
  task`, and verified success notices and rendered records.
- Responsive proof captured desktop and mobile screenshots with no horizontal
  overflow:
  `docs/ux/evidence/v1-operations-cockpit-real-backend-desktop.png` and
  `docs/ux/evidence/v1-operations-cockpit-real-backend-mobile.png`.

Architecture and quality review:

- The route is a derived view over existing native and provider-backed modules,
  aligned with `docs/architecture/companycore-business-module-map.md`.
- No schema tables, provider-specific duplicate screens, fake data, or
  temporary bypasses were introduced.
- The quick-create actions reuse existing protected API contracts.
- Browser proof used Playwright fallback because the in-app Browser plugin is
  not reliably available for this local session's owner-auth form flow.
