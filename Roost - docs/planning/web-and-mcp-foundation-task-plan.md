# Web And MCP Foundation Task Plan

Last updated: 2026-05-14

## Purpose

This plan turns the foundation architecture in
`docs/architecture/web-and-mcp-foundation-before-v2.md` into executable work.
It keeps Company City, game-like visuals, gamification, and native mobile app
work deferred until the web/backend/MCP foundation is complete.

## Active Objective

Build an owner-grade web and backend foundation that lets a user manage one or
many company workspaces, understand operating areas and synced resources, fix
relationship gaps, and safely expose the right MCP tools to AI agents.

## NOW

No active WEBFOUND task remains. The WEBFOUND queue is complete through the
V2 visual implementation plan. Continue from the active global queue in
`docs/planning/mvp-next-commits.md` and `.codex/context/TASK_BOARD.md`.

## COMPLETED QUEUE HANDOFF

### Next non-WEBFOUND task: ACF-MAINT-001 Large File Modularization

- Start only after confirming the user wants to leave the WEBFOUND/V2 planning
  lane and switch to maintainability work.

## DONE

### WEBFOUND-001 Operating Model Data Completion Decision

- Source: APP-AUDIT-001 finding ACF-009 and ACF-010.
- Result: no fake seed data before V2. Empty projects, storage locations,
  knowledge roots, and automation definitions are accepted foundation-ready
  states when UI labels them honestly and future flows populate them with real
  owner-created or imported data.
- Task contract: `docs/planning/acf-prod-001-task-contract.md`.

### WEBFOUND-002 Workspace Switch API Contract

- Goal: make multi-company ownership explicit without weakening workspace
  isolation.
- Scope:
  - `GET /v1/workspaces`
  - `POST /v1/workspaces`
  - `POST /v1/workspaces/:id/actions/select`
  - `/auth/me` response enrichment
  - tests for owner membership, token workspace, and cross-workspace denial
- Acceptance:
  - owner can list visible workspaces;
  - owner can create a second workspace with operating model seeded;
  - owner can select a workspace and receive a new token scoped to it;
  - protected APIs continue deriving workspace only from auth context.

### WEBFOUND-003 Workspace Selector UI

- Goal: add the workspace selector at the top of the authenticated shell.
- Scope:
  - owner web shell
  - local loading/error/success states
  - no route-local workaround
- Acceptance:
  - active workspace is visible on desktop/tablet/mobile;
  - switching workspace refreshes connection, operating model, integrations,
    data counts, and MCP context;
  - creating a workspace does not leak or merge data from the previous one.

### WEBFOUND-004 Area Resource Inventory API

- Goal: make each operating area expandable into real resource families.
- Scope:
  - per-area aggregate counts for tables, folders, mappings, Drive files,
    storage locations, knowledge roots, automation definitions, tasks,
    approvals, and agent events where existing relations allow it.
- Acceptance:
  - output is workspace-scoped;
  - counts match existing read endpoints for representative seeded data;
  - missing relation types are explicitly marked unsupported rather than faked.

### WEBFOUND-002/003/004 Verification Evidence

- `npm test` passed against disposable PostgreSQL on `localhost:55453`.
- Playwright owner-shell smoke passed against isolated
  `http://127.0.0.1:3106`.
- Covered desktop `1366x900`, tablet `834x1112`, and mobile `390x844`.
- Verified register/bootstrap, workspace create/select, switch back to the
  original workspace, 13 sidebar operating areas, no horizontal overflow, no
  relevant console errors, no failed requests, and drawer close via backdrop.

### WEBFOUND-005 Sidebar Area Tree Hardening

- Added accessible area/resource labels, active-area state, visible focus,
  Escape close for workspace-create and mobile drawer, body scroll lock while
  the drawer is open, and focus return after close.
- `npm test` passed against disposable PostgreSQL on `localhost:55455`.
- Playwright smoke passed against isolated `http://127.0.0.1:3107`, verifying
  13 area summaries, 52 resource-family labels, active area state, Escape and
  backdrop close behavior, no overflow, no console issues, and no failed
  requests.

### WEBFOUND-007 Relationship Graph Audit

- Source review classified workspace, operating area, provider mapping, Drive,
  registry, business object, resource, integration, and agent-event
  relationships.
- Result: next work should implement a read-only relationship graph API before
  expanding UI. The graph must label `direct`, `provider_hierarchy`,
  `route_inferred`, `needs_review`, and `unsupported` edges and must not add a
  generic edge table yet.
- Audit: `docs/architecture/relationship-graph-audit-2026-05-14.md`.
- Task contract: `docs/planning/webfound-007-task-contract.md`.

### WEBFOUND-008A Relationship Graph Read API

- Added `GET /v1/relationships/graph` as a workspace-scoped read-only graph
  endpoint with nodes, edges, review items, unsupported families, summary
  counts, and edge confidence labels.
- Added `relationships:read` capability, MCP manifest exposure, and profile
  access for MCP reader/operator presets.
- `npm run build` passed.
- `npm test` passed against disposable PostgreSQL on `localhost:55457`; the
  validation container was removed after the run.
- Task contract: `docs/planning/webfound-008a-task-contract.md`.

### WEBFOUND-008B Relationship Workbench Upgrade

- `/relationships` now consumes `GET /v1/relationships/graph` and shows
  direct, provider-hierarchy, route-inferred, needs-review, and unsupported
  relationship states.
- Existing provider and Drive assignment controls remain the only relationship
  fix actions.
- `node --check public/app.js`, `npm run build`, and `npm test` passed.
- Playwright fallback rendered desktop and mobile `/relationships` with no
  overflow, no console issues, and no failed requests.
- Task contract: `docs/planning/webfound-008b-task-contract.md`.

### WEBFOUND-009 Integration Readiness Dashboard

- `/settings/integrations` now shows a readiness dashboard for ClickUp,
  Google Drive, relationship graph, and MCP agents using existing real
  connection, graph, API key, and manifest state.
- Added a relationship graph integration group and an MCP group that reports
  active/scoped key state plus exposed MCP tools.
- `node --check public/app.js`, `npm run build`, and `npm test` passed against
  disposable PostgreSQL on `localhost:55459`.
- Playwright fallback rendered `/settings/integrations` on
  `http://127.0.0.1:3109` at desktop `1366x900`, tablet `820x1000`, and
  mobile `390x844`, with no overflow, console issues, or failed requests.
- Screenshots:
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound009-desktop-1778786342057.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound009-tablet-1778786342057.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound009-mobile-1778786342057.png`
- Task contract: `docs/planning/webfound-009-task-contract.md`.

### WEBFOUND-010 MCP Key Workspace Clarity

- `/settings/api` now shows workspace-scoped agent access context and a live
  key preview before creation.
- The preview updates on preset and scope changes and reports risk, scope
  count, MCP tool count, read/write/destructive exposure, supervised tools,
  relationship graph availability, missing MCP base scopes, tool families, and
  recommended profile usage.
- Existing one-time raw key reveal behavior remains unchanged.
- `node --check public/app.js`, `npm run build`, and `npm test` passed against
  disposable PostgreSQL on `localhost:55460`.
- Playwright fallback rendered `/settings/api` on
  `http://127.0.0.1:3110` at desktop `1366x900`, tablet `820x1000`, and
  mobile `390x844`, verified preset and scope-preview updates, and reported no
  overflow, console issues, or failed requests.
- Screenshots:
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound010-desktop-1778786927486.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound010-tablet-1778786927486.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound010-mobile-1778786927486.png`
- Task contract: `docs/planning/webfound-010-task-contract.md`.

### WEBFOUND-011 Agent Tool Surface In Canonical Shell

- The canonical vanilla shell now exposes `Agent tools` from the integrations
  sidebar, topbar, and module switcher.
- Module switcher entries can open backend-served React routes through
  full-page navigation instead of forcing them through the vanilla SPA router.
- The shared React shell now shows canonical CompanyCore destinations instead
  of a separate React preview route taxonomy.
- `node --check public/app.js`, `npm run build`, and `npm test` passed against
  disposable PostgreSQL on `localhost:55461`.
- Playwright fallback started on `/dashboard`, opened `/react-agent-tools` from
  the canonical sidebar, verified MCP tool content and canonical nav markers,
  verified the old React-only nav labels were gone, returned to
  `/settings/api`, and rendered desktop `1366x900`, tablet `820x1000`, and
  mobile `390x844` with no overflow, console issues, or relevant failed
  requests. A transient `net::ERR_ABORTED` from full-page navigation was
  observed once and excluded from the rerun because it was the browser
  cancelling the previous page request during intentional navigation.
- Screenshots:
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound011-desktop-1778789017817.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound011-tablet-1778789017817.png`
  - `C:\Users\wrobl\AppData\Local\Temp\companycore-webfound011-mobile-1778789017817.png`
- Task contract: `docs/planning/webfound-011-task-contract.md`.

### WEBFOUND-012 AI-Ready Smoke Pack

- Added `scripts/companycore-ai-ready-smoke.mjs` and `npm run
  ai-ready:smoke`.
- The smoke registers a disposable owner/workspace, creates
  `mcp_company_os_reader` and `mcp_operator` profile keys, verifies
  `/v1/mcp/manifest`, verifies `/v1/relationships/graph` through HTTP,
  calls `companycore_get_relationships_graph` through the stdio MCP bridge,
  and verifies the operator stage-complete MCP tool remains fail-closed by
  default with `mcp_tool_requires_supervision`.
- `node --check scripts/companycore-ai-ready-smoke.mjs` passed.
- `npm test` passed against disposable PostgreSQL on `localhost:55462`.
- `npm run ai-ready:smoke` passed against `http://127.0.0.1:3112`.
- Smoke summary: reader manifest `21` tools; relationship graph `62` nodes,
  `61` edges, `0` review items, `3` unsupported families; MCP graph tool
  returned HTTP `200`; guarded tool returned `mcp_tool_requires_supervision`.
- Task contract: `docs/planning/webfound-012-task-contract.md`.

### WEBFOUND-013 V2 UX Readiness Review

- Reviewed WEBFOUND-002 through WEBFOUND-012 foundation evidence.
- Decision: GO for WEBFOUND-014 V2 Visual Implementation Plan, not direct V2
  implementation.
- The foundation is ready for canonical visual planning because workspace
  selection, area navigation, relationship graph, integration readiness, MCP
  key clarity, agent tool access, and AI-ready MCP smoke all have recorded
  evidence.
- Direct Company City map or gamification implementation remains gated on
  WEBFOUND-014 producing the canonical shell/map/brief/status plan with
  desktop, tablet, and mobile behavior.
- Review: `docs/ux/v2-ux-readiness-review-2026-05-14.md`.
- Task contract: `docs/planning/webfound-013-task-contract.md`.

### WEBFOUND-014 V2 Visual Implementation Plan

- Added `docs/ux/v2-visual-implementation-plan-2026-05-14.md`.
- Defined the canonical V2 authenticated shell: company rail, command bar,
  main city/workbench content, right command brief, and status strip.
- Defined desktop, tablet, and mobile layout behavior.
- Defined Company City dashboard first-viewport composition using real
  operating area, relationship, integration, MCP, approval, task, and status
  signals.
- Defined shared component contract, state model, visual asset strategy, route
  migration order, implementation guardrails, validation plan, and first future
  code candidate `V2VIS-001 Shared CompanyShell And Dashboard Frame`.
- Direct implementation remains split into future tasks and must start with a
  bounded shell/dashboard slice, not broad route rewrites or gamification.
- Task contract: `docs/planning/webfound-014-task-contract.md`.

## PIPELINE

| Order | ID | Task | Main Surface | Verification |
| --- | --- | --- | --- | --- |
| 1 | WEBFOUND-005 | Sidebar Area Tree | Web shell | Desktop/tablet/mobile screenshots, no overflow, active workspace and active area visible. |
| 2 | WEBFOUND-006 | Mobile/Tablet Navigation Proof | Web shell | Drawer/focus/keyboard checks; route smoke. |
| 3 | WEBFOUND-007 | Relationship Graph Audit | Docs/API/UI | Relationship matrix from existing mappings and resources. |
| 4 | WEBFOUND-008A | Relationship Graph Read API | API/MCP | Workspace-scoped graph returns nodes, edges, confidence labels, review items, and unsupported families. |
| 5 | WEBFOUND-008B | Relationship Workbench Upgrade | `/relationships`, `/areas` | Owner can see direct/inferred/provider-derived/unsupported links and next fixes. |
| 6 | WEBFOUND-009 | Integration Readiness Dashboard | `/settings/integrations` | ClickUp/Drive/mapping/sync health visible in one panel. |
| 7 | WEBFOUND-010 | MCP Key Workspace Clarity | `/settings/api`, `/react-agent-tools` | Key workspace, scopes, risk, and MCP tools visible before creation. |
| 8 | WEBFOUND-011 | Agent Tool Surface In Canonical Shell | React routes | No permanent separate React nav; shared shell route smoke. |
| 9 | WEBFOUND-012 | AI-Ready Smoke Pack | API/MCP | Scoped key, manifest, relationship read, and command guard proof. |
| 10 | WEBFOUND-013 | V2 UX Readiness Review | Docs/UX/QA | Gate confirms foundation complete or lists blockers. |
| 11 | WEBFOUND-014 | V2 Visual Implementation Plan | UX planning | Company City/gameification implementation starts only after readiness gate. |

## Explicit Deferrals

- Native mobile app: V2.
- Company City map implementation: V2 readiness gate.
- Gamification mechanics: V2 readiness gate; only real readiness/status signals
  may appear before then.
- Non-owner workspace roles and invitations: deferred unless multi-workspace
  owner flow exposes a hard blocker.
