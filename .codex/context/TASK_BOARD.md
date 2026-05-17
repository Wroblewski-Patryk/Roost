# TASK_BOARD

## Ready

- DMS-NEXT-004 Relationships Management read packet and board.
  - Stage: planning
  - Owner: Product Docs + Backend Builder + Frontend Builder
  - Priority: P1
  - Source: `docs/planning/dms-13-systems-v1-implementation-audit.md`
  - Goal: implement the next post-Sales department slice for `05 Relacje` by
    creating a source-backed relationships/client-success context over
    clients, interactions, archived clients, satisfaction/feedback signals,
    relationship provenance, improvement opportunities, and blocked outreach
    or promise-making actions.
- DMS-NEXT-002 Differentiated department implementation slice.
  - Stage: planning
  - Owner: Product Docs + Frontend Builder + Backend Builder
  - Priority: P1
  - Source: `docs/architecture/department-management-systems-v1-blueprint.md`
  - Goal: select the next department implementation task using the
    differentiated-system contract. Recommended next runtime slice remains
    `03 Sales` read packet or board, but it must define Sales-specific
    pipeline/offer/follow-up/mobile states instead of copying a generic area
    panel.
- DMS-NEXT-001 Department systems user review and implementation sequence.
  - Stage: planning
  - Owner: Product Docs + Frontend Builder + Backend Builder
  - Priority: P1
  - Source: `docs/architecture/department-management-systems-v1-blueprint.md`
  - Goal: review the detailed `00 Main` plus 12-department blueprint with the
    owner, then create the first executable department-specific task contract.
    Recommended sequence after review: deepen `04 Operations`, then read-only
    `01 Strategy`, `03 Sales`, `05 Relationships`, and `02 Product And
    Delivery`.
- DMS-MIN-001 Global intake and Paperclip output review.
  - Stage: planning
  - Owner: Product Docs + Backend Builder + Frontend Builder
  - Priority: P1
  - Source: `docs/architecture/department-management-systems-v1-blueprint.md`
  - Goal: make `00 Main` the review/router for unclassified owner, client,
    provider, and Paperclip-created items before broad background automation.
    Start with a read-only review queue and classification/routing model.
## In Progress

- No active implementation task is currently in progress after the
  OPS-MGMT-002 Operations management center deepening checkpoint.

## Blocked

- AGRUN-010 Upstream Agent Source Merge Execution
  - Stage: planning
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: external GitHub write access or an approved fork/PR route for
    Paperclip and OpenJarvis source handoff.
- CCV1-057B Paperclip upstream branch push
  - Stage: release
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: GitHub returned `403` for pushing
    `codex/companycore-adapter-v1` to `paperclipai/paperclip` as
    `Wroblewski-Patryk`. The adapter commit is validated locally and remains
    available as `4cfa476f` plus the managed CompanyCore patch.
- CCV1-058B OpenJarvis upstream branch push
  - Stage: release
  - Owner: Ops/Release
  - Priority: P2
  - Blocked by: GitHub returned `403` for pushing
    `codex/companycore-connector-v1` to `open-jarvis/OpenJarvis` as
    `Wroblewski-Patryk`. The connector change was replayed on clean
    `origin/main`, validated with 6 targeted tests, and remains available as
    the documented OpenJarvis source handoff.

## Backlog

- UOS-BE-001 Current Backend Capability Audit.
  - Stage: analysis
  - Owner: Product Docs + Backend Builder + AI Integration
  - Priority: P1
  - Source:
    `docs/planning/unified-org-backend-implementation-program.md`
  - Queue position: after current DMS/web active queue.
  - Goal: map current Prisma schema, route modules, capability scopes, MCP
    manifest entries, agent key profiles, department packets, tasks,
    workflows, approvals, events, audit, resources, and knowledge to the
    unified organizational operating-system target before any schema work.
  - Acceptance: produce
    `docs/planning/uos-backend-current-capability-audit.md` with supported,
    partial, missing, blocked, read-model, schema, command, MCP, web, and
    mobile implications.
- UOS-BE-002 Organizational Contract Types.
  - Stage: planning
  - Owner: Product Docs + Backend Builder + Frontend Builder + AI Integration
  - Priority: P1
  - Source:
    `docs/planning/unified-org-backend-implementation-program.md`
  - Queue position: after `UOS-BE-001`.
  - Goal: define stable backend DTO/domain vocabulary for actor,
    workforceMember, humanProfile, agentProfile, rank, role, department,
    supervisor, authorityContext, visibilityScope, workloadState, and
    blockedAction so backend, web, future mobile, and MCP share one language.
  - Acceptance: create `docs/planning/uos-organizational-contract-types.md`
    without runtime code changes.
- UOS-BE-010 Workforce Read Packet Without Migration.
  - Stage: implementation
  - Owner: Backend Builder + QA/Test + AI Integration
  - Priority: P1
  - Source:
    `docs/planning/unified-org-backend-implementation-program.md`
  - Queue position: after `UOS-BE-002`.
  - Goal: expose read-only `GET /v1/workforce/context` by composing current
    users, agents, company roles, service-key profile summaries, capabilities,
    business functions, operating areas, events, and agent logs; add
    `workforce:read` and MCP read exposure.
  - Acceptance: API tests prove owner auth, service key auth, scoped denial,
    workspace isolation, MCP manifest exposure, no mutation, and no secret
    leakage.
- UOS-BE-011 People/Agents Authority Packet For `06`.
  - Stage: implementation
  - Owner: Backend Builder + QA/Test + AI Integration
  - Priority: P1
  - Source:
    `docs/planning/unified-org-backend-implementation-program.md`
  - Queue position: after `UOS-BE-010`.
  - Goal: expose read-only `GET /v1/people-agents/context` over workforce,
    roles, agent profiles, service-key profile summaries, allowed tools,
    escalation targets, permission risks, and blocked authority actions for
    future `06 People/Agents And Roles`.
  - Acceptance: read packet answers who exists, what role/authority they have,
    what is missing, and what remains blocked; no hiring, agent creation,
    key-minting, or permission edits.
- UOS-BE-012 Workforce Schema Decision.
  - Stage: planning
  - Owner: Product Docs + Backend Builder + DB/Migrations + AI Integration
  - Priority: P1
  - Source:
    `docs/planning/unified-org-backend-implementation-program.md`
  - Queue position: after `UOS-BE-011`.
  - Goal: decide whether to continue read-model-only, add
    `workforce_members`/`human_profiles`/`agent_profiles`, or add a narrower
    rank/supervisor layer after read packet evidence.
  - Acceptance: create `docs/planning/uos-workforce-schema-decision.md` and
    record the accepted migration direction before any schema change.
- AOG-BE-002 Target metric relation.
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P1
  - Source: `docs/planning/v1-area-operating-graph-backend-gap-plan.md`
  - Goal: add optional `Target.metricId` while preserving the existing
    `Target.metric` display field.
- AOG-BE-003 Goal/workflow bridge.
  - Stage: planning
  - Owner: Backend Builder + Product Docs
  - Priority: P1
  - Source: `docs/planning/v1-area-operating-graph-backend-gap-plan.md`
  - Goal: add the minimal durable relation between goals/targets and
    process/pipeline roots after the AOG-BE-001 read model proves ownership.
- AOG-BE-004 Workflow task link normalization.
  - Stage: planning
  - Owner: Backend Builder
  - Priority: P1
  - Source: `docs/planning/v1-area-operating-graph-backend-gap-plan.md`
  - Goal: normalize workflow-run task evidence instead of relying on JSON-only
    `linkedTaskIds`.
- AOG-BE-005 Knowledge/source link contract.
  - Stage: planning
  - Owner: Backend Builder + Product Docs
  - Priority: P1
  - Source: `docs/planning/v1-area-operating-graph-backend-gap-plan.md`
  - Goal: connect knowledge items, Drive files, and snapshots to supported
    operating graph target families with guarded command-shaped writes later.
- AOG-BE-006 Area operating graph MCP read tool.
  - Stage: planning
  - Owner: Backend Builder + AI Integration
  - Priority: P1
  - Source: `docs/planning/v1-area-operating-graph-backend-gap-plan.md`
  - Goal: expose the verified area operating graph as a read-only MCP tool for
    Jarvis and Paperclip.
- ACF-UX-002 Company City Dashboard / Gamified Strategic Map.
  - Stage: planning
  - Owner: Frontend Builder + Product Docs
  - Priority: P1
  - Source: `docs/ux/company-city-dashboard-v3-spec.md`
  - Goal: deferred V2 visual/game-like dashboard direction after the
    web/backend/MCP foundation readiness gate passes.
- Future v2 OAuth browser consent UI and token refresh hardening after core
  server-side API slices are complete.
- Future v2 dashboard surfaces that show ClickUp Lists, Drive folders/files,
  storage locations, knowledge roots, automations, and CompanyCore tables as
  one company operating area.
- Upstream OpenJarvis/Paperclip source merge execution and blocked GitHub
  auto-deploy webhook administration task.

## Done

- OPS-LIST-FILTER-001 Operations list select-all sticky control.
  - Evidence:
    `docs/planning/operations-list-select-all-sticky-task-contract.md` records
    the scoped interaction slice. The Operations list rail no longer shows the
    helper text under `All`, the select-all row is sticky at the top of the
    rail, and empty selection is now a real user-selected state rather than an
    automatic fallback to all lists.
  - Validation: `npm run build:web`; `git diff --check`; Playwright fallback
    with a mocked Operations packet verified the helper text is gone, the
    control has `position: sticky`, initial all-selected state, uncheck hides
    task cards and shows `0 selected lists`, recheck restores task cards and
    the `All` heading, no horizontal overflow, and no console/page errors.

- OPS-DND-001 Operations drag-and-drop drop target feedback.
  - Evidence:
    `docs/planning/operations-dnd-drop-target-feedback-task-contract.md`
    records the scoped interaction slice. `04 Operations -> Tasks` now dims
    the dragged task card, highlights the hovered target status column, and
    renders a localized `Drop here` placeholder before the owner releases the
    card. The drop still uses the existing
    `/v1/operations/work-items/:id` status update command.
  - Validation: `npm run validate`; `git diff --check`; Playwright fallback on
    a Vite mocked Operations packet verified hover placeholder/highlight,
    `PATCH { "status": "done" }`, task movement into the target column, no
    horizontal overflow, and no console/page errors. No
    `chrome-headless-shell` validation process remained.

- WEB-THEME-001 Brand theme foundation.
  - Evidence:
    `docs/planning/web-brand-theme-foundation-task-contract.md` records the
    scoped theme slice. `web/src/styles.css` now defines the DaisyUI
    `companycore` palette, Tailwind font/color/radius/spacing/shadow tokens,
    reusable `cc-*` utilities, global focus styling, and outline-first
    primitive tuning for buttons, forms, badges, menus, tabs, and cards.
    `web/index.html` loads Inter and Sora while keeping Phosphor Icons as the
    primary icon system. UX source-of-truth docs record the visual direction
    and icon policy.
  - Validation: `npm run build:web`; `git diff --check`; Playwright Vite render
    proof saved `docs/ux/evidence/web-theme-001-public-home-desktop.png` and
    verified Inter body font, Sora heading font, `9px` button radius, no
    horizontal overflow, and no console/page errors. No
    `chrome-headless-shell` validation process remained.

- OPS-BOARD-UX-001 Operations management board UX polish.
  - Evidence:
    `docs/planning/operations-management-board-ux-polish-task-contract.md`
    records the full-width layout and task-board polish slice. The
    authenticated content wrapper now uses available width instead of
    `max-w-7xl`, the sidebar is sticky/full-height and scrollable, Operations
    sidebar subviews highlight the actual active view, `04 Operations` exposes
    a `Calendar` subview, and the task board starts with a virtual `All` list.
    The board now uses stable horizontally scrollable status lanes, visual
    priority badges, due/readiness chips, richer task modal context, and no
    visible technical `Blocked write actions` section in the owner work
    surface.
  - Validation: `npm run build:web`; Playwright fallback on temporary mocked
    API port `3248` verified desktop board `All`/`Review`, absence of the
    technical blocked-actions panel, modal opening, desktop calendar rendering,
    mobile board rendering, and no console/page errors. Browser plugin was
    available but had no active Codex browser pane. Temporary mock server
    processes were stopped.

- OPS-BOARD-001 Operations list board and work item editing.
  - Evidence:
    `docs/planning/operations-management-board-implementation-task-contract.md`
    records the backend/frontend slice. `GET /v1/operations/work-items` now
    returns task lists, canonical status columns, and `taskListId` filtering;
    `PATCH /v1/operations/work-items/:id` updates CompanyCore work items
    through the Operations adapter with ClickUp writeback reuse when relevant;
    `operations:write` is available as a domain capability, not a raw table
    editing concept. The `04 Operations -> Tasks` web view now renders a
    ClickUp-like list selector, status columns, task cards, and a modal edit
    form. `todo` is no longer normalized to `backlog`.
  - Validation: `npm run validate`; `npm run test:api` against
    validation-owned PostgreSQL on `127.0.0.1:55511`; Playwright fallback on
    temporary mocked API port `3244` verified the list/status board, no
    `backlog` label, modal edit/save interaction, desktop/mobile rendering, no
    console warnings/errors, and no mobile horizontal overflow. Temporary
    PostgreSQL and mock server processes were stopped and validation temp
    directories were removed. Production was manually rolled over to commit
    `849b74c06f8f04364b2a08662a66e45c45ffafcf`; public web/API health report
    the expected commit and `/areas?area=04-operacje&view=tasks` serves
    `index-SR5I21Wt.js`.

- WEB-SHELL-OPS-001 Shell user menu, settings routes, and Operations tasks.
  - Evidence:
    `docs/planning/web-shell-user-settings-operations-tasks-task-contract.md`
    records the active shell cleanup and Operations task-table slice. The
    authenticated header no longer shows department buttons; it now exposes a
    user dropdown with account/settings/sign-out actions. The sidebar keeps
    canonical department ordering while hiding visible numeric prefixes.
    Workspace settings is reachable next to the workspace selector, language
    selection moved to the authenticated footer, and `/account/settings` plus
    `/workspace/settings` are private React routes. The Operations Tasks view
    now renders records from `/v1/operations/work-items` through the shared
    table path.
  - Validation: `npm run build:web`; `npm run build:server`;
    `npm run validate`; Playwright fallback on temporary mocked API port
    `3139` verified the Operations task table, user dropdown, sidebar label
    cleanup, removed header department nav, footer attribution, and both
    settings routes. Production was manually rolled over to commit
    `02f86b613b5d69d282f554cf465e5688b251a5c0`; public web/API health report
    the expected commit and `/` serves `index-RfhYEq4o.js`. No
    validation-owned browser or port processes remained.

- UOS-000 Unified Organizational OS backend program queue alignment.
  - Evidence:
    `docs/planning/unified-org-backend-implementation-program.md` defines the
    backend-first execution waves and task contracts for turning the accepted
    unified human/AI workforce and organizational world-state architecture
    into implementation work. The program is queued after the current
    DMS/web work and starts with `UOS-BE-001`, `UOS-BE-002`, `UOS-BE-010`,
    `UOS-BE-011`, and `UOS-BE-012`, preserving the current active queue.
  - Validation: source-of-truth queue update and `git diff --check`.

- WEB-QA-001 Web language, message, and form foundation.
  - Evidence: active React web now has default-English i18n with Polish
    selectable and persisted, `<html lang>` synchronization, typed API client
    errors, user-facing error mapping, shared `CcNotice`, shared `CcField` and
    `CcTextInput`, auth validators, localized auth field and submit errors,
    translated shared table state labels, and a module split for layout, auth,
    public home, department views, API, hooks, and shared types. `main.tsx`
    now owns provider wrapping and route selection only. Task contract:
    `docs/planning/web-qa-001-task-contract.md`.
  - Validation: `npm run build:web`; `npm run build:server`; Browser plugin
    home smoke passed but Browser form fill failed on email input, so
    Playwright fallback completed the interaction proof on a temporary mocked
    API server at `http://127.0.0.1:3235`. Proof covered default English,
    Polish switch, language persistence, `<html lang>` update, friendly
    invalid-login and duplicate-registration messages without raw codes,
    password validation with `aria-invalid` and `aria-describedby`, login
    redirect to `00 General`, friendly Operations packet error, mobile `08
    Assets` with no horizontal overflow, and zero unnamed visible controls.
    Expected negative-test network statuses were `401`, `409`, and `500`;
    no page errors occurred. Temporary server was stopped and no
    `chrome-headless-shell` process remained.
  - Post-audit: 2026-05-16 audit report
    `docs/planning/web-qa-001-post-implementation-audit-2026-05-16.md`
    fixed locale contract extraction, planned department label localization,
    and API error normalization for string, nested, and backend
    `internal_server_error` payloads. Additional proof passed on temporary
    port `3236`: Browser home smoke, Playwright old-route `404`, auth,
    private redirect, 00/04/08 packet journey, desktop/tablet/mobile overflow
    checks, zero unnamed visible controls, `npm run build:web`,
    `npm run build:server`, and `npm run validate`.

- WEB-SIDEBAR-001 Department sidebar foundation.
  - Evidence:
    `docs/planning/web-sidebar-foundation-audit-2026-05-16.md` records the
    sidebar contract: CompanyCore logo/name, company/workspace selector,
    all `00`-`12` departments, disabled planned departments, active
    `00/04/08` module dashboard links, and separate expand arrows for
    active departments with more than one planned view.
  - Validation: `npm run build:web`; Playwright fallback on temporary port
    `3237` verified logo, workspace selector, all departments, exactly three
    expand buttons, disabled `05 Relationships` without a link, Operations
    subview expansion, 04 dashboard click-through, desktop/mobile no
    horizontal overflow, server cleanup, and no validation-owned
    `chrome-headless-shell`.

- ORG-ARCH-002 Unified organizational operating system architecture.
  - Evidence:
    `docs/architecture/unified-organizational-operating-system.md` records the
    expanded CompanyCore direction as a non-AI organizational world state and
    operational source of truth for a unified human/AI workforce. Existing
    architecture docs now link that direction from the reading order,
    source-of-truth contract, system architecture, autonomous Company OS
    boundary, organizational bridge, business module map, and DMS blueprint.
    Front-door `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, and
    `docs/README.md` also point to the new direction.
    It maps current `users`, `agents`, `company_roles`, `business_functions`,
    tasks, workflow runs, approvals, events, audit logs, capabilities, and
    MCP/API foundations to target workforce, hierarchy, task recursion,
    permissions, contextual visibility, and organizational world-state gaps.
  - Validation: source review of current architecture, Prisma schema, task,
    pipeline, permission, and MCP foundations; `git diff --check`.
  - Task contract:
    `docs/planning/unified-organizational-operating-system-architecture-task-contract.md`.

- WEB-QA-AUDIT-001 Web foundation quality audit.
  - Evidence:
    `docs/planning/web-foundation-quality-audit-2026-05-16.md` audits the
    cleaned active web layer for route ownership, responsive readiness,
    form validation, error/notification behavior, language readiness,
    accessibility smoke, and scalable next implementation order. It records
    the base as production-testable but not ready for broad new department
    expansion until i18n, shared errors, shared forms, and notices are
    centralized. Task contract:
    `docs/planning/web-foundation-quality-audit-task-contract.md`.
  - Validation: source review of `web/src/main.tsx`,
    `web/src/app-route-registry.ts`, shared components, and `src/app.ts`;
    Playwright fallback against a temporary mocked API server on
    `http://127.0.0.1:3234`; `npm run build:web`; `npm run build:server`.
    Proof covered public home, native auth form validation, raw negative API
    error display, login redirect to `00 General`, `00/04/08` packet states,
    mobile `08 Assets` with no horizontal overflow, removed old route
    behavior, `html lang="en"`, and lack of a language switcher. The temporary
    server was closed and no validation-owned `chrome-headless-shell` process
    remained.

- WEB-CORE-001 Web core surface cleanup.
  - Evidence: `web/src/main.tsx` now renders only public home, owner login,
    owner registration, `00 General`, `04 Operations`, and `08 Assets`.
    `web/src/app-route-registry.ts` now exposes only the active route set plus
    compatibility aliases. `src/app.ts` no longer serves old private
    workbench paths as React app routes. Backend API files were not removed.
    Task contract:
    `docs/planning/web-core-surface-cleanup-task-contract.md`.
  - Validation: `npm run build:web`; `npm run build:server`; Playwright proof
    against a temporary static React server covered `/`, `/auth/login`,
    login -> `/areas?area=00-ogolny&view=overview`, `/dashboard` alias,
    desktop `04 Operations`, desktop `08 Assets`, mobile `08 Assets` with no
    horizontal overflow, and removed `/settings/api` React-route behavior.
    `git diff --check` passed with line-ending warnings only; port `3231` was
    closed and no validation-owned `chrome-headless-shell` process remained.

- CC-AUDIT-001 00/04/08 architecture and UX audit.
  - Evidence: `docs/planning/cc-00-04-08-architecture-ux-audit.md`
    records delivered scope and gaps for `00 Ogolny`, `04 Operations`, and
    `08 Assets`. `web/src/app-route-registry.ts` now makes
    `/areas?area=00-ogolny&view=overview` the canonical post-auth dashboard,
    preserves valid private query-string routes, and keeps `/dashboard` as a
    compatibility alias. `web/src/main.tsx` redirects `/dashboard` into
    `00 Ogolny` and points atlas/dashboard links there.
  - Validation: `npm run build:web`; `npm run build:server`; Playwright
    fallback rendered login -> `00 Ogolny`, `/dashboard` -> `00 Ogolny`,
    desktop `04 Operations`, desktop `08 Assets`, and mobile `08 Assets`
    against a temporary static React server with mocked already-verified read
    packets. No console/page errors or mobile horizontal overflow were found.
    Screenshots: `docs/ux/evidence/cc-audit-001-post-login-00-dashboard.png`,
    `docs/ux/evidence/cc-audit-001-dashboard-alias-00.png`,
    `docs/ux/evidence/cc-audit-001-04-operations.png`,
    `docs/ux/evidence/cc-audit-001-08-assets-desktop.png`, and
    `docs/ux/evidence/cc-audit-001-08-assets-mobile.png`. `git diff --check`
    passed with line-ending warnings only; no validation-owned
    `chrome-headless-shell` process or port `3227` server remained.
- CC-UI-004 00/04/08 read-packet UI adoption.
  - Evidence: selected-area UI now consumes the verified read packets for
    `00 Main` route proposals, `04 Operations` work items, and `08 Assets`
    resources. The panels reuse shared `CcDataTable`/`CcButton` paths and keep
    writes blocked behind future command contracts.
  - Validation: `npm run build:web`; Playwright rendered
    `/areas?area=00-ogolny&view=overview`,
    `/areas?area=04-operacje&view=overview`,
    `/areas?area=08-zasoby&view=overview`, and mobile `08 Assets` through a
    temporary local static server with mocked API packet responses for the
    already verified endpoints. No console/page errors or horizontal overflow
    were found. `git diff --check` passed with line-ending warnings only; no
    validation-owned `chrome-headless-shell` process remained.
  - Evidence screenshots:
    `docs/ux/evidence/cc-ui-004-00-desktop.png`,
    `docs/ux/evidence/cc-ui-004-04-desktop.png`,
    `docs/ux/evidence/cc-ui-004-08-desktop.png`,
    `docs/ux/evidence/cc-ui-004-08-mobile.png`.
  - Task contract:
    `docs/planning/cc-ui-004-00-04-08-read-packet-ui-adoption-task-contract.md`.

- CC-08-002 Assets context read API.
  - Evidence: `GET /v1/assets/context` now exposes a protected read-only
    `08 Assets` packet over Drive files/folders, content snapshots, Resource
    records, Knowledge Roots, Knowledge Items, operating-area scope, resource
    taxonomy, AI-readiness labels, relations, cleanup summary, and blocked
    provider actions. It is exposed through `assets:read` and MCP as a
    read-risk tool.
  - Validation: `npm run build:server`; `npm run test:api` against disposable
    PostgreSQL on `127.0.0.1:55500`; validation-owned PostgreSQL stopped and
    port closed.
  - Task contract:
    `docs/planning/cc-08-002-assets-context-read-api-task-contract.md`.

- CC-04-002 Operations task read model v1.
  - Evidence: `GET /v1/operations/work-items` now exposes a protected
    read-only Operations work item packet over current tasks, hierarchy,
    pipeline/stage/procedure evidence, dependencies, notes, events, agent log
    evidence, project resources, scoped Operations Drive files, readiness gaps,
    and blocked actions. It is exposed through `operations:read` and MCP as a
    read-risk tool.
  - Validation: `npm run build:server`; `npm run test:api` against disposable
    PostgreSQL on `127.0.0.1:55499`; validation-owned PostgreSQL stopped and
    port closed.
  - Task contract:
    `docs/planning/cc-04-002-operations-work-item-read-model-task-contract.md`.

- CC-00-002 Route proposal lifecycle readback API.
  - Evidence: `GET /v1/intake/route-proposals` now exposes read-only route
    proposal lifecycle state from current `Decision`, optional `Task`,
    `AuditLog`, and `Event` records. The route is available under
    `intake:read`, appears in the MCP manifest as a read-risk tool, and
    returns proposal evidence, effects, blocked actions, summary, and
    read-only agent packet without acknowledging events, mutating providers,
    approving proposals, discounting, invoicing, deleting, or executing
    commercial/legal actions.
  - Validation: `npm run build:server`; `npm run test:api` against disposable
    PostgreSQL on `127.0.0.1:55498`; validation-owned PostgreSQL stopped and
    port closed.
  - Task contract:
    `docs/planning/cc-00-002-route-proposal-lifecycle-readback-api-task-contract.md`.

- CC-UI-003 Shared data table/list primitive.
  - Evidence: `web/src/components/cc-data-table.tsx` adds `CcDataTable` with
    loading, empty, error, density, pagination-ready controls, row actions,
    and optional mobile card behavior. `web/src/react-route-kit.tsx` keeps the
    existing `DataTable` export as a compatibility wrapper over the new
    primitive.
  - Validation: `npm run build:web`; `npx tsx -e` static render check;
    Playwright local `/auth/login` route smoke with no console/page errors and
    no horizontal overflow; `git diff --check`.
  - Task contract:
    `docs/planning/cc-ui-003-shared-data-table-list-primitive-task-contract.md`.

- CC-UI-002 Shared action/button primitive.
  - Evidence: `web/src/components/cc-button.tsx` adds `CcButton` over DaisyUI
    `btn` with variants, size, icons, loading, disabled reason, href/button
    behavior, and accessible labels. `web/src/react-route-kit.tsx` and
    `web/src/main.tsx` adopt it in the shared notice and generic state panel.
  - Validation: `npm run build:web`; `npx tsx -e` static render check;
    Playwright local `/auth/login` route smoke with no console/page errors and
    no horizontal overflow; `git diff --check`.
  - Task contract:
    `docs/planning/cc-ui-002-shared-action-button-primitive-task-contract.md`.

- CC-UI-001 Shared component inventory for CompanyCore management UI.
  - Evidence: `docs/planning/cc-ui-001-shared-component-inventory.md`
    records current Shell, notice/state, table, card, button, badge, tab, and
    form reuse/gaps from `web/src/main.tsx`, `web/src/react-route-kit.tsx`,
    and `web/src/styles.css`. It defines the next shared primitives:
    `CcButton`, `CcDataTable`, `CcStatePanel`, `CcCard`, `CcBadge`,
    `CcTabs`, `CcField`, and `CcToolbar`.
  - Validation: `git diff --check` passed.
  - Task contract:
    `docs/planning/cc-ui-001-shared-component-inventory-task-contract.md`.

- CC-00-001 Route proposal lifecycle readback plan.
  - Evidence:
    `docs/planning/cc-00-001-route-proposal-lifecycle-readback-plan.md`
    maps current intake route proposals to `Decision`, optional `Task`,
    `AuditLog`, and `Event` readback, lifecycle states, UI requirements,
    API/MCP constraints, and blocked actions.
  - Validation: `git diff --check` passed.
  - Task contract:
    `docs/planning/cc-00-001-route-proposal-lifecycle-readback-task-contract.md`.

- CC-04-001 Operations task model gap audit.
  - Evidence:
    `docs/planning/cc-04-001-operations-task-model-gap-audit.md` compares the
    owner target Operations task model with current Task, Project, TaskList,
    Pipeline, Stage, Procedure, Operations context, and UI coverage, and
    recommends `CC-04-002` as a read-model-first runtime slice.
  - Validation: `git diff --check` passed.
  - Task contract:
    `docs/planning/cc-04-001-operations-task-model-gap-audit-task-contract.md`.

- CC-08-001 Assets/resource system spec.
  - Evidence:
    `docs/planning/cc-08-001-assets-resource-system-spec.md` defines the first
    `08 Assets` board, resource taxonomy, AI-readiness labels, desktop/tablet/
    mobile layout, blocked provider actions, and agent packet over existing
    Google Drive, Resource, and knowledge foundations.
  - Validation: `git diff --check` passed.
  - Task contract:
    `docs/planning/cc-08-001-assets-resource-system-spec-task-contract.md`.

- DMS-03-006 Sales Management context and board.
  - Evidence:
    Protected read-only `GET /v1/sales/context` now returns the `03-sprzedaz`
    Sales Management packet over clients, deals, stages, interactions,
    follow-up work, notes, commercial exceptions, current-client work, Drive
    evidence, and Finance handoff context. The route is exposed through
    `sales:read`, MCP manifest tooling, and read-oriented MCP key profiles.
    `/areas?area=03-sprzedaz&view=overview` renders the dedicated Sales
    Management board from that packet while quote, discount, invoice, ad, and
    autonomous outreach writes remain blocked.
  - Validation:
    `npm run build:server`; `npm run build:web`; `npm run test:api` against
    validation-owned PostgreSQL on `127.0.0.1:55497`; Playwright desktop and
    mobile proof on `http://127.0.0.1:3220` with no console/page errors or
    horizontal overflow.
  - Evidence:
    `docs/ux/evidence/dms-03-sales-board-desktop.png` and
    `docs/ux/evidence/dms-03-sales-board-mobile.png`.
  - Task contract:
    `docs/planning/dms-03-sales-context-and-board-task-contract.md`.

- DMS-V1-006 13 Department Systems V1 Implementation Audit.
  - Evidence:
    `docs/planning/dms-13-systems-v1-implementation-audit.md` maps `00 Main`
    plus all 12 operating department systems to current backend foundations,
    current web readiness, V1 desktop/mobile expectations, missing backend
    gaps, Paperclip boundaries, blocked actions, and first implementation
    slices. The audit names `03 Sales` as the recommended next read-packet
    slice while keeping high-risk writes blocked.
  - Validation:
    source review and `git diff --check`.
  - Task contract:
    `docs/planning/dms-13-systems-v1-implementation-audit-task-contract.md`.

- DMS-V1-005 Differentiated Department Management Systems Analysis.
  - Evidence:
    The DMS architecture now states that the 12 operating departments share
    CompanyCore shell, auth, evidence, MCP, and safety primitives, but each
    department must have its own management board, workflow vocabulary,
    desktop UX, mobile attention queue, state model, source records, and
    Paperclip boundaries. The UX map defines department-specific board
    requirements for Strategy, Product/Delivery, Sales, Operations,
    Relationships, People/Agents, Finance, Assets, Technology/AI, Legal,
    Innovation, and Executive.
  - Validation:
    source review and `git diff --check`.
  - Task contract:
    `docs/planning/dms-differentiated-department-systems-analysis-task-contract.md`.

- DMS-01-005B Production Strategy Context Smoke.
  - Evidence:
    Manual VPS rollover deployed commit
    `5db4dd8b1fe9058d1fc78ebc957c0716ebd4822a`. Production now runs
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5db4dd8`; previous backend
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882` is retained stopped as
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882-previous-5db4dd8`.
    Public web/API health returned the expected commit. Protected
    `/v1/strategy/context` returned `01-strategia`, `strategy-governance`,
    `summary.activeMetrics=1`, `summary.activeRisks=1`,
    `agentPacket.mode=read_only`, and `blockedActions=4`.
  - Validation:
    canary local health, final local health, public web/API health, protected
    owner-auth route smoke, and local/VPS rollout artifact cleanup.
  - Task contract:
    `docs/planning/v1-strategy-production-smoke-task-contract.md`.

- DMS-01-005A Strategy Management System Read Packet API.
  - Evidence:
    Protected read-only `GET /v1/strategy/context` now returns the
    `01-strategia` Strategy Management packet with goals, targets, metrics,
    risks/controls, decision logs, decisions, strategic knowledge, Drive
    documents, tasks, summary counts, and a read-only agent handoff. The route
    is exposed through `strategy:read`, MCP manifest tooling, and read-oriented
    MCP key profiles.
  - Validation:
    `npm run build:server`; `npm run test:api` with validation-owned
    PostgreSQL on `127.0.0.1:55496`; `git diff --check`; validation
    PostgreSQL and temporary artifacts cleaned up.
  - Task contract:
    `docs/planning/v1-strategy-context-read-api-task-contract.md`.

- V1OPS-005 Production Operations Context Smoke.
  - Evidence:
    Manual VPS rollover deployed commit
    `9ff18820cb00bb2164904b947c2ef2a48e5d3b14`. Production now runs
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882`; previous backend
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71` is retained stopped as
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71-previous-9ff1882`.
    Public web/API health returned the expected commit. Protected
    `/v1/operations/context` returned `04-operacje`,
    `operations-administration`, `summary.procedures=7`,
    `agentPacket.mode=read_only`, and `blockedActions=4`.
  - Validation:
    canary local health, final local health, public web/API health, protected
    owner-auth route smoke, and local/VPS rollout artifact cleanup.
  - Task contract:
    `docs/planning/v1ops-production-operations-context-smoke-task-contract.md`.

- V1OPS-004 V1 Operations Context Read API.
  - Evidence:
    Protected read-only `GET /v1/operations/context` now returns the
    `04-operacje` Operations Management packet with procedures, procedure
    steps, approvals, dependencies, business functions, operational tasks,
    summary counts, and read-only agent handoff. The route is exposed through
    `operations:read`, MCP manifest tooling, and read-oriented MCP key
    profiles.
  - Validation:
    `npm run build:server`; `npm run test:api` with validation-owned
    PostgreSQL on `127.0.0.1:55495`; `git diff --check`; validation
    PostgreSQL and temporary artifacts cleaned up.
  - Task contract:
    `docs/planning/v1-operations-context-read-api-task-contract.md`.

- V1OPS-003 V1 Operations Compatibility Alias Cleanup.
  - Evidence:
    `src/operating-model/department-registry.ts` now centralizes canonical
    `00`-`12` department keys, backend area keys, aliases, and intake hint
    terms. AOG selected-area reads resolve `03-sprzedaz` to `sales-crm` and
    `07-finanse` to `finance-billing` before numeric fallback. Global intake
    suggestions use canonical department keys and scored hints so finance-heavy
    Paperclip/pricing signals route to `07-finanse`, while generic signals
    fall back to `00-ogolny`.
  - Validation:
    `npm run build:server`; `npm run test:api` with validation-owned
    PostgreSQL on `127.0.0.1:55494`; `git diff --check`; validation
    PostgreSQL and temporary artifacts cleaned up.
  - Task contract:
    `docs/planning/v1-operations-compatibility-alias-cleanup-task-contract.md`.

- V1OPS-002 Production V1 smoke after Company OS area foundation.
  - Evidence:
    Production was manually rolled over to commit
    `5f1fc71e44d09cb1780d29b2579c85023205efb9` with running container
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71`; previous backend
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-d2c9b94` is retained stopped as
    rollback. Public web/API `/health` returned `200` with the expected commit
    and image. Authenticated production smoke verified `/operations`,
    `/tasks-adapter`, `/data`, `/areas?area=04-operacje&view=overview`,
    `/settings/drive`, and `/react-company-os?area=04-operacje`; direct AOG
    smoke returned `strategy-governance` with `27` nodes and `32` edges.
  - Validation: `npm run build`, `git diff --check`, VPS canary health,
    public health, authenticated desktop/mobile Playwright proof, no
    console/page errors, no non-font failed requests, no horizontal overflow,
    remote/local rollout artifact cleanup, and no leftover validation browser
    processes.
  - Evidence directory:
    `docs/ux/evidence/production-v1-5f1fc71-2026-05-16/`.
  - Task contract:
    `docs/planning/v1-production-smoke-rollout-task-contract.md`.

- V1COS-001 Company OS Area-Aware V1 Foundation.
  - Evidence:
    `/react-company-os` now renders a department control map that connects
    Company OS governance/runtime evidence to the `00`-`12` department
    management systems. The selected department shows subsystem purpose,
    mapped backend tables, agent handoff, first safe action, and blocked
    actions while preserving the existing Company OS command and evidence
    panels.
  - Validation: `npm run build:web`, `git diff --check`, embedded PostgreSQL
    migration deploy on `127.0.0.1:55483`, and Playwright real-backend proof
    on `http://127.0.0.1:3219/react-company-os?area=04-operacje`. The proof
    registered a fresh owner, verified Operations, clicked `06`, verified
    `People/Agents And Role Management System`, and found no console/page
    errors or horizontal overflow. Validation backend and PostgreSQL were
    stopped.
  - Task contract:
    `docs/planning/v1-company-os-area-foundation-task-contract.md`.

- PROD-GDRIVE-002 Production Google Drive changes baseline.
  - Evidence:
    `POST /v1/integration-settings/google_drive/changes/reconcile` now
    initializes a missing Drive changes page token through
    `changes/startPageToken`, stores it, emits existing reconcile evidence, and
    returns `baselineInitialized=true` with zero processed changes. Production
    was manually rolled over to commit
    `d2c9b9460a5db63703ca28f98988a2fa35d3a651`; public API/web health report
    that commit. First protected production reconcile returned `200` with
    `baselineInitialized=true` and stored `newStartPageToken=25137`; second
    reconcile returned `200` through the stored-token path. Drive index stayed
    `754` total with `0` unassigned, `0` pending, `0` failed, and `0` trashed.
  - Validation: `npm run build:server`, `git diff --check`, and
    `npm run test:api` passed against portable PostgreSQL on
    `127.0.0.1:55490`; manual VPS canary and production rollover passed;
    temporary VPS env/source/rollout files were removed. Previous backend was
    retained stopped as rollback container
    `backend-rnqqkhl3o3dut4qv56mlxly2-000111041002-previous-d2c9b94`.
  - Task contract:
    `docs/planning/prod-google-drive-changes-baseline-task-contract.md`.

- PROD-GDRIVE-001 Production Google Drive Index And Paperclip Access Audit.
  - Evidence:
    Production Google Drive index was repaired through protected API routes.
    The selected 13 Drive roots now have no missing create candidates in
    `inspect_only`; `/v1/google-drive/files` reports `754` indexed records,
    `0` unassigned, `0` pending, `0` failed, and `0` trashed. Six unassigned
    records encountered during the audit were assigned by parent folder scope.
    MCP manifest exposes 15 Google Drive tools, and the active Paperclip Tools
    production bridge has Google Drive read/write/scope/import/reconcile
    scopes. Follow-up Paperclip runtime proof confirmed the bridge is
    configured in Paperclip `company_core_settings`: knowledge-key calls to
    `/v1/connection`, `/v1/mcp/manifest`, and `/v1/google-drive/files`
    returned `200`; tools-key calls to `/v1/connection` and
    `/v1/google-drive/files` returned `200`; and Paperclip has 1282
    CompanyCore tool assignments across 36 agents, including 12 distinct
    Google Drive tools.
  - Validation: production API/web health checks returned `200`; production
    Drive `inspect_only` returned `wouldCreateCount=0`; MCP manifest readback
    returned 146 tools. `changes/reconcile` returned `422 sync_failed`, so
    changes-polling freshness remains a follow-up rather than a completed
    proof.
  - Task contract:
    `docs/planning/production-google-drive-index-paperclip-access-audit-task-contract.md`.

- V1REL-001 Area relationship provenance review.
  - Evidence:
    `/relationships?area=04-operacje` now renders
    `RelationshipProvenanceReview` over the existing relationship graph read
    model, with area focus, direct/provider/inferred/review metrics,
    agent-readable provenance edges, review queue, unsupported families, and
    links back to selected-area resources plus `/data`.
  - Validation: `npm run build:web`, `git diff --check`, and Playwright
    real-backend proof on `http://127.0.0.1:3216` for desktop/mobile
    `/relationships?area=04-operacje`. No console/page errors or horizontal
    overflow were observed. Validation backend and PostgreSQL were stopped.
  - Task contract:
    `docs/planning/v1-relationship-provenance-review-task-contract.md`.

- V1KNOW-001 Selected-area knowledge depth.
  - Evidence:
    `/areas?area=04-operacje&view=knowledge` now renders a knowledge evidence
    readiness panel inside the selected-area shell, including Drive scope,
    agent packet readiness, description coverage, freshness/review signals,
    an agent-readable packet list, and an improvement queue.
  - Validation: `npm run build:web`, `git diff --check`, and Playwright
    real-backend proof on `http://127.0.0.1:3217` for desktop/mobile
    `/areas?area=04-operacje&view=knowledge`. No console/page errors or
    horizontal overflow were observed. Validation backend and PostgreSQL were
    stopped.
  - Task contract:
    `docs/planning/v1-selected-area-knowledge-depth-task-contract.md`.

- V1AREATASKS-001 Selected-area tasks depth.
  - Evidence:
    `/areas?area=04-operacje&view=tasks` now renders a task execution panel
    inside the selected-area shell, including task evidence, execution tables,
    provider pressure, guarded ownership model, execution packet, owner action
    queue, and explicit no-hidden-task-to-area-relation language.
  - Validation: `npm run build:web`, `git diff --check`, and Playwright
    real-backend proof on `http://127.0.0.1:3218` for desktop/mobile
    `/areas?area=04-operacje&view=tasks`. No console/page errors or horizontal
    overflow were observed. Validation backend and PostgreSQL were stopped.
  - Task contract:
    `docs/planning/v1-selected-area-tasks-depth-task-contract.md`.

- DMS-07-003 Read-Only Finance Web Board.
  - Evidence:
    `/areas?area=07-finanse&view=overview` now renders
    `FinanceManagementBoard` from `GET /v1/finance/context`, including pricing
    candidates, hourly value, commercial exceptions, invoice blockers, source
    conflicts, and blocked finance actions.
  - Validation: `npm run build:web`, `git diff --check`, and Playwright proof
    on `http://127.0.0.1:3213` for desktop/mobile Finance board. No
    console/page errors or horizontal overflow were observed. Validation
    backend and PostgreSQL were stopped.
  - Task contract:
    `docs/planning/dms-07-finance-web-board-task-contract.md`.

- DMS-SHELL-003 Department Data Backbone.
  - Evidence:
    `web/src/main.tsx` now renders `DepartmentDataBackbone` inside the shared
    department shell, using existing operating graph status, table/record
    context, Drive/source count, and review gaps with fallback text.
  - Validation: `npm run build:web`, `git diff --check`, and Playwright proof
    on `http://127.0.0.1:3212` for `01-strategia`, `07-finanse`, and
    `12-zarzadzanie` on desktop/mobile. No console/page errors or horizontal
    overflow were observed. Validation backend and PostgreSQL were stopped.
  - Task contract:
    `docs/planning/dms-shell-003-department-data-backbone-task-contract.md`.

- DMS-00-007 Paperclip Background Output Review Proof.
  - Evidence:
    `docs/planning/dms-00-paperclip-background-output-review-proof.md`
    records the verified loop from Paperclip-like `AgentEventOutbox` to
    `GET /v1/intake`, `POST /v1/intake/actions/propose-route`, proposal
    `Decision`/`AuditLog`/`Event`/optional `Task`, and unchanged source
    delivery status.
  - Validation: existing API regression coverage in `src/tests/api.test.ts`
    passed again during the DMS-07-002 gate with `npm run test:api` against
    portable PostgreSQL on `127.0.0.1:55482`.
  - Task contract:
    `docs/planning/dms-00-paperclip-background-output-review-proof-task-contract.md`.

- DMS-07-002 Finance Context Read API.
  - Evidence:
    `src/modules/finance/finance.routes.ts` implements protected read-only
    `GET /v1/finance/context`, reusing commercial exception context and
    exposing candidate pricing models, hourly-value assumptions, work
    valuations, invoice-readiness blockers, payment source context, finance
    risks, source conflicts, agent packet, and blocked actions.
  - Validation: `npm run build:server`, `git diff --check`, and
    `npm run test:api` passed against portable PostgreSQL on
    `127.0.0.1:55482`. The API test covers auth, scoped-key denial, MCP
    exposure, candidate pricing conflicts, `150 CHF/hour`, `100%` exception
    inclusion, invoice blockers, workspace isolation, and no mutation on read.
  - Task contract:
    `docs/planning/dms-07-finance-context-read-api-task-contract.md`.

- DMS-03-005A Commercial Exception Read API.
  - Evidence:
    `src/modules/commercial-exceptions/commercial-exceptions.routes.ts`
    implements protected read-only `GET /v1/commercial-exceptions`; the route
    is mounted in `src/app.ts`, exposed through
    `commercial-exceptions:read`, included in MCP manifests and agent key
    profiles, and documented in `docs/API.md`.
  - Validation: `npm run build:server`, `git diff --check`, and
    `npm run test:api` passed against portable PostgreSQL on
    `127.0.0.1:55481`. The API test covers unauthenticated denial, scoped-key
    denial, MCP exposure, workspace isolation, no mutation on read, `100%`
    discount packet values, missing-source status, and blocked actions.
  - Task contract:
    `docs/planning/dms-03-commercial-exception-read-api-task-contract.md`.

- DMS-03-005 Discount/Commercial Exception Read Model Spec.
  - Evidence:
    `docs/planning/dms-03-commercial-exception-read-model-spec.md` defines
    protected read-only `GET /v1/commercial-exceptions`, query parameters,
    packet fields, status rules, derivation rules from existing CompanyCore
    sources, current-client `100%` discount requirements, Paperclip
    guardrails, blocked actions, and implementation handoff.
  - Validation: source review of DMS money inventory, Finance spec, DMS
    blueprint, current Prisma foundations, and `git diff --check` passed.
  - Task contract:
    `docs/planning/dms-03-commercial-exception-read-model-task-contract.md`.

- DMS-07-001 Finance System Spec.
  - Evidence:
    `docs/planning/dms-07-finance-system-spec.md` defines the
    `07 Finance And Billing Management System` V1 board, first safe web
    shape, protected read-only `GET /v1/finance/context` target, pricing model
    packet, hourly-value assumptions, work valuation, commercial exceptions,
    invoice-readiness blockers, owner decisions, Paperclip packet, and blocked
    invoice/payment/discount/autonomous-pricing actions.
  - Validation: source review of DMS blueprint, pricing inventory, global
    plan, current code references, and `git diff --check` passed.
  - Task contract:
    `docs/planning/dms-07-finance-system-spec-task-contract.md`.

- DMS-SHELL-002 Department Subsystem Registry.
  - Evidence: `web/src/main.tsx` now defines a typed registry for all `00`-`12`
    department systems and renders `DepartmentSubsystemRegistry` inside the
    shared shell. Each department has system name, value role, owner question,
    first safe action, agent handoff, blocked actions, and three subsystem
    cards. `web/src/styles.css` adds the shared registry styling.
  - Validation: `npm run build:web` and `git diff --check` passed.
    Playwright real-backend proof on `http://127.0.0.1:3211` verified
    `01-strategia`, `06-kadry`, `07-finanse`, and `12-zarzadzanie`, with no
    console errors or horizontal overflow. Temporary validation backend and
    PostgreSQL processes were stopped.
  - Task contract:
    `docs/planning/dms-shell-002-department-subsystem-registry-task-contract.md`.

- DMS-00-006 First Safe Global Intake Route Command.
  - Evidence: `POST /v1/intake/actions/propose-route` now validates source
    allowlist, workspace ownership, canonical department keys, and idempotency;
    creates proposal evidence through `Decision`, `AuditLog`, `Event`, and
    optional `Task`; exposes `intake:write` in capabilities/MCP; and adds a
    `Propose route` action to the `00 Main` web panel.
  - Validation: `npm run build:server`, `npm run build:web`, and
    `npm run test:api` passed with
    `DATABASE_URL=postgresql://postgres@127.0.0.1:55480/postgres`.
    Playwright browser proof on `http://127.0.0.1:3210` created a route
    proposal from `/areas?area=00-ogolny&view=overview`, found no console
    errors or horizontal overflow, and confirmed the source agent event
    remained `pending`. Temporary validation backend and PostgreSQL processes
    were stopped.
  - Task contract:
    `docs/planning/dms-00-global-intake-route-command-task-contract.md`.

- DMS-00-005 Global Intake Classify/Route Command Contract.
  - Evidence:
    `docs/planning/dms-00-global-intake-classify-route-command-contract.md`
    defines `POST /v1/intake/actions/propose-route`, payload and response
    shapes, status vocabulary, source-model allowlist, department-key
    validation, idempotency, frontend states, Paperclip proposal boundaries,
    and explicit blocked actions for acknowledge, approval, provider-write,
    invoice, discount, delete, legal, and ads behavior.
  - Validation: source review of the current intake route and command-shaped
    CompanyCore patterns; `git diff --check` passed.
  - Next task: DMS-00-006 first safe global intake route/classification
    command.

- DMS-SHELL-001 Shared Department Management Shell.
  - Evidence: `web/src/main.tsx` now renders selected-area department views
    through `DepartmentManagementShell`, with `DepartmentImprovementLoop` as a
    shared zone for feedback, defects, standards, and next work. `00 Main` and
    `04 Operations` keep their dedicated special panels inside the shared
    shell. `web/src/react-route-kit.tsx` now uses unique shell navigation keys
    for duplicate route hrefs across route groups.
  - Validation: `npm run build:web` and `git diff --check` passed. Playwright
    static SPA proof on `http://127.0.0.1:3206` verified desktop
    `/areas?area=01-strategia&view=overview`,
    `/areas?area=04-operacje&view=overview`,
    `/areas?area=00-ogolny&view=overview`, and mobile
    `/areas?area=04-operacje&view=overview`; required shell/intake/operations
    markers were present, there was no horizontal overflow, and console/page
    errors were empty. Temporary validation ports `3204`, `3205`, and `3206`
    were stopped after proof.
  - Task contract:
    `docs/planning/dms-shell-001-shared-department-management-shell-task-contract.md`.

- DMS-MONEY-001 Pricing/Hourly-Value/Discount Source Inventory.
  - Evidence:
    `docs/planning/dms-money-pricing-discount-source-inventory.md` inventories
    Drive-backed pricing and client sources, separates conflicting commercial
    models, records the 100 percent discount case as a required commercial
    exception, maps current CompanyCore reuse, and lists backend gaps for
    service offers, pricing models, labor rates, estimates, discount policies,
    invoice drafts, and archived-client learning.
  - Validation: Google Drive connector search/fetch reviewed `Business plan`,
    the Swiss pricing benchmark, `2. Zalozenia`, and related offer/project
    pointers. Repo source review covered Prisma clients/deals/interactions,
    API docs, intake tests, and ClickUp/Drive adapter foundations. Direct
    ClickUp source review is blocked because no callable ClickUp search/read
    tool was exposed in this session. `git diff --check` passed.
  - Task contract:
    `docs/planning/dms-money-pricing-discount-source-inventory-task-contract.md`.

- DMS-00-004 Global Intake Web Panel.
  - Evidence: `/areas?area=00-ogolny&view=overview` now renders a dedicated
    `00 Main Management System` panel over the verified `/v1/intake` API. The
    panel shows read-only intake/MCP readiness, summary counts, quick filters,
    owner decision, Paperclip/agent, unassigned-resource, and risk/blocker
    queues, plus a routing packet that only changes existing selected-area
    views.
  - Validation: `npm run build:web` and `npm run build:server` passed.
    Playwright real-backend proof on `http://127.0.0.1:3192` logged in the
    seeded owner, verified desktop and mobile route markers, clicked the panel
    `Tasks` control to `/areas?area=00-ogolny&view=tasks`, and reported no
    console errors, no framework overlay, and no horizontal overflow. Browser
    plugin invocation was attempted first and fell back to Playwright because
    no active Codex browser pane was available.
  - Task contract:
    `docs/planning/dms-00-global-intake-web-panel-task-contract.md`.

- DMS-00-003 Global Intake Read API.
  - Evidence: protected `GET /v1/intake` now aggregates existing
    AgentEventOutbox, ProviderEventInbox, GoogleDriveFile,
    ExternalContainerMapping, ExternalFieldMapping, Approval, Risk, Task, and
    Event records into one read-only `00 Main` intake queue with normalized
    family, status, risk, suggested department, evidence, allowed action, and
    blocked action metadata. `intake:read` is exposed through capabilities,
    adapter manifest, MCP manifest, and MCP-oriented agent key profiles.
  - Validation: `npm run build:server` passed. `npm run test:api` passed
    against workspace-local PostgreSQL on `127.0.0.1:55476` using the existing
    `postgres` database. `npm run typecheck` is not available in
    `package.json`. API regression coverage was added in `src/tests/api.test.ts`
    for authentication, workspace isolation, Paperclip filtering, provider
    failures, unassigned resources, high-risk rows, MCP exposure, and no
    mutation on read.
  - Task contract:
    `docs/planning/dms-00-global-intake-read-api-task-contract.md`.

- DMS-00-002 Intake Source Audit.
  - Evidence:
    `docs/planning/dms-00-intake-source-audit.md` maps current CompanyCore
    sources into DMS-00 intake families and confirms the first read-only
    aggregate can be implemented without a migration. It selects top-level
    `GET /v1/intake` and lists DMS-00-003 implementation files/tests.
  - Validation: code/schema source review and `git diff --check` passed.
  - Task contract:
    `docs/planning/dms-00-intake-source-audit-task-contract.md`.

- DMS-00-001 Global Intake And Paperclip Output Review Contract.
  - Evidence:
    `docs/planning/dms-00-global-intake-paperclip-review-contract.md` defines
    intake candidate families, review statuses, priority/risk/agent-authority
    vocabulary, intake row and summary shapes, proposed backend/MCP surfaces,
    `00 Main` web panel requirements, routing heuristics, and future write
    guardrails.
  - Validation: source review and `git diff --check` passed.
  - Task contract:
    `docs/planning/dms-00-global-intake-paperclip-review-task-contract.md`.

- DMS-V1-000 V1 Department Systems Global Implementation Plan.
  - Evidence:
    `docs/planning/v1-department-systems-global-implementation-plan.md` now
    defines the full V1 execution program for web, backend, Paperclip,
    department shells, all department systems, pricing/discounts, archived
    clients, feedback, QA, production smoke, and closeout.
  - Validation: source-of-truth review and `git diff --check` passed.
  - Task contract:
    `docs/planning/v1-department-systems-global-implementation-plan-task-contract.md`.

- DMS-BLUEPRINT-001 Department Management Systems V1 Blueprint.
  - Evidence: `docs/architecture/department-management-systems-v1-blueprint.md`
    now defines the shared department contract, shared web layout, backend
    reuse rules, backend expansion principles, `00 Main` orchestration, all
    12 operating department systems, implementation waves, recommended build
    order, backend gap register, acceptance criteria for future department
    specs, and guardrails for high-risk finance/legal/ads/AI writes.
  - Validation: source-of-truth review and `git diff --check` passed.
  - Task contract:
    `docs/planning/department-management-systems-v1-blueprint-task-contract.md`.

- DMS-OPS-001 04 Operations Management System V1 Read Model.
  - Evidence: `/areas?area=04-operacje&view=overview` now renders a dedicated
    Operations Management System board as the first management surface for
    authenticated owners. The board derives planning, routines, controls,
    dependencies, approvals, business functions, and AI handoff signals from
    existing selected-area tables and links to existing Company OS, agent
    tools, and API scope routes. The shared table-record loader now treats
    Company OS collections as readable when the owner has `company-os:read`,
    so department tables backed by `/v1/company-os/:collection` load real
    records instead of false zero-count states.
  - Validation: `npm run build`, `npm run build:web`, and `git diff --check`
    passed. Playwright authenticated mocked-owner proof verified
    desktop/mobile markers and no horizontal overflow, with screenshots in
    `docs/ux/evidence/dms-ops-management-system-desktop.png` and
    `docs/ux/evidence/dms-ops-management-system-mobile.png`. Playwright
    real-backend proof on `http://127.0.0.1:3214` registered an owner, seeded
    real Company OS records for business function, procedure, procedure step,
    approval, and dependency, and verified `/areas?area=04-operacje&view=overview`
    on desktop/mobile with screenshots in
    `docs/ux/evidence/dms-ops-real-data-desktop.png` and
    `docs/ux/evidence/dms-ops-real-data-mobile.png`.
  - Task contract:
    `docs/planning/operations-management-system-v1-task-contract.md`.

- V1DATA-001 Evidence browser V1 workbench.
  - Evidence: `/data` and `/data/:table` now render a V1 foundation evidence
    browser with department record metrics, agent-readable table context,
    empty-table and review-gap signals, selected-table owner/API/capability
    context, department coverage links, and generic record inspection.
    `/data` is marked `v1-foundation` in `web/src/app-route-registry.ts`.
  - Validation: `npm run build:web` passed. Playwright real-backend proof on
    `http://127.0.0.1:3215` registered an owner, seeded Company OS evidence
    records, and verified desktop `/data` plus mobile `/data/procedures` with
    no console/page errors or horizontal overflow. Screenshots:
    `docs/ux/evidence/v1-data-evidence-browser-desktop.png` and
    `docs/ux/evidence/v1-data-evidence-browser-mobile.png`.
  - Task contract:
    `docs/planning/v1-data-evidence-browser-task-contract.md`.

- DMS-ARCH-001 Department Management Systems Architecture And V1 View Map.
  - Evidence: `docs/architecture/department-management-systems-architecture.md`
    defines each 00-12 Company Atlas area as a department management system
    over shared CompanyCore tables, pipelines, tasks, knowledge, resources,
    metrics, decisions, governance, and AI/MCP tools.
    `docs/ux/v1-department-management-systems-view-map.md` lists public,
    private, support workbench, and all 13 department system routes.
    `docs/ux/v1-department-system-prompt-pack.md` provides reusable prompts
    for UX specs, visual concepts, implementation plans, and Paperclip/AI
    packets.
  - Validation: source-of-truth review and `git diff --check` passed.
  - Task contract:
    `docs/planning/department-management-systems-architecture-task-contract.md`.

- V1TASKS-001 Tasks and Delivery V1 workbench.
  - Evidence: `/tasks-adapter` is now a V1 canonical route that loads
    workspace, task, Company OS, and MCP context; shows execution pressure,
    department delivery-table coverage, AI handoff readiness, all-task
    filters, inline task creation, and quick task status movement through
    existing protected task routes.
  - Validation: `npm run build:web`, `npm run validate`, `npm run test:api`,
    and `git diff --check` passed against workspace-local PostgreSQL on
    `127.0.0.1:55476`. Real backend Playwright proof on
    `http://127.0.0.1:3162/tasks-adapter` registered a fresh owner, created
    `Proof delivery task`, moved it to `in_progress`, verified success states,
    and captured desktop/mobile screenshots with no horizontal overflow:
    `docs/ux/evidence/v1-tasks-delivery-real-backend-desktop.png` and
    `docs/ux/evidence/v1-tasks-delivery-real-backend-mobile.png`.
  - Task contract:
    `docs/planning/v1-tasks-delivery-workbench-task-contract.md`.

- ORG-FLOW-001 CompanyCore Global Business Flow.
  - Evidence: `docs/architecture/companycore-global-business-flow.md` defines
    one 13-stage company value pipeline for products, services, and hybrid
    delivery from strategic intent, brand, demand, lead qualification,
    discovery, offer/agreement, delivery planning, execution,
    quality/acceptance, payment, support, feedback, and improvement back to
    next intent. It includes a dependency tree, stage contracts,
    operating-area mapping, relationship model, AI/MCP guardrails, metrics,
    visualization levels, and future implementation candidates.
  - Validation: source-of-truth review and `git diff --check` passed.
  - Task contract:
    `docs/planning/companycore-global-business-flow-task-contract.md`.

- V1OPS-001 Operations Cockpit React view.
  - Evidence: `/operations` is served by the React app, registered as a V1
    canonical command route, and aggregates existing owner contracts for
    workspace connection, clients, tasks, Google Drive files, agents, agent
    events, Company OS, and table record snapshots. The route includes client
    and task quick-create forms, department file/table evidence, area coverage,
    owner direction queue, and AI-agent handoff/readiness context.
  - Validation: `npm run build:web`, `npm run build`, `npm run validate`, and
    `npm run test:api` passed against workspace-local PostgreSQL on
    `127.0.0.1:55476`. Real backend Playwright proof on
    `http://127.0.0.1:3161/operations` registered a fresh owner, rendered the
    four cockpit lanes, created a proof client and proof task, verified success
    states, and captured desktop/mobile screenshots with no horizontal
    overflow:
    `docs/ux/evidence/v1-operations-cockpit-real-backend-desktop.png` and
    `docs/ux/evidence/v1-operations-cockpit-real-backend-mobile.png`.
  - Task contract:
    `docs/planning/v1-operations-cockpit-task-contract.md`.

- AOG-BE-001 Area operating graph read API.
  - Evidence: `GET /v1/operating-graph/areas/:areaKey` is implemented in
    `src/modules/operating-graph/operating-graph.routes.ts`, mounted in
    `src/app.ts`, exposed through `operating-graph:read` in capabilities and
    MCP manifest, consumed by selected-area React fallback logic, documented in
    `docs/API.md`, and covered in `src/tests/api.test.ts`.
  - Validation: `npm run test:api` passed against workspace-local PostgreSQL
    on `127.0.0.1:55476`, including build, migrations, protected API flow,
    AOG regressions, MCP exposure, and Google Drive OAuth refresh regression.
    `npm run validate` and `git diff --check` also passed in this mission.
  - Task contract:
    `docs/planning/aog-be-001-area-operating-graph-read-api-task-contract.md`.

- V1SETTINGS-002 Unified settings React implementation.
  - Evidence: `/settings`, `/settings/integrations`, `/settings/drive`,
    `/settings/api`, and `/react-agent-tools` now render one
    `UnifiedSettingsRoute` with sections for Integrations, Agent keys, and
    MCP. Integrations expose ClickUp and Google Drive provider rows, direct
    active/disabled switches, Setup/Mapping/Sync tabs, backend-backed
    credential and scope fields, `syncMode`, `importMode`, provider discovery,
    mapping, and sync/import/reconcile actions through existing contracts.
    `web/src/app-route-registry.ts` now marks settings entry routes as V1
    canonical and prevents `/settings` from resolving as the old ClickUp
    bridge route.
  - Validation: `npm run build:web`, `npm run validate`, `git diff --check`,
    and `npm run test:api` passed. Playwright fallback with mocked owner API
    verified desktop `/settings` Mapping and mobile `/settings/drive` Sync.
    A real backend Playwright proof on `http://127.0.0.1:3160` registered an
    owner, opened `/settings`, saved Google Drive OAuth client credentials from
    `/settings/drive`, read back `oauthClientConfigured=true` from
    `/v1/integration-settings/google_drive`, and captured desktop/mobile
    screenshots:
    `docs/ux/evidence/v1-settings-unified-proof-desktop.png`,
    `docs/ux/evidence/v1-settings-unified-proof-mobile.png`,
    `docs/ux/evidence/v1-settings-real-backend-desktop.png`,
    `docs/ux/evidence/v1-settings-drive-save-real-backend-desktop.png`, and
    `docs/ux/evidence/v1-settings-real-backend-mobile.png`.
  - Task contract:
    `docs/planning/v1-settings-react-implementation-task-contract.md`.

- REACT-WEB-002 ClickUp setup React workflow.
  - Evidence: closed by V1SETTINGS-002. ClickUp setup, token preservation,
    team/list/space/folder IDs, discovery, area mapping, maintenance run, and
    task sync controls now live inside the unified V1 settings Integrations
    section instead of a ClickUp-only root settings route.
  - Validation: covered by V1SETTINGS-002 build and Playwright proof.

- REACT-WEB-003 Google Drive OAuth/folder-selection React workflow.
  - Evidence: closed by V1SETTINGS-002 for the settings-scope portion. Google
    Drive client credentials, root/shared/selected folder IDs,
    `changesPageToken`, sync policy, folder discovery, folder-area mapping,
    import, and reconcile controls now live inside the unified V1 settings
    Integrations section. Existing imported CompanyCore data remains available
    when the provider is disabled.
  - Validation: covered by V1SETTINGS-002 build and Playwright proof.

- ORG-MOD-001 CompanyCore Business Module Map.
  - Evidence: `docs/architecture/companycore-business-module-map.md` now
    defines CompanyCore as the bridge for operating the company through
    canonical modules for company graph, goals, work/tasks,
    processes/pipelines, runtime evidence, knowledge, storage/documents, CRM,
    resources, integrations, agents/MCP, governance, and metrics. Future work
    must classify modules as native core, provider-backed, future adapter, or
    derived view before adding schema, UI, API, MCP, or provider-specific
    behavior.
  - Validation: `git diff --check` passed.
  - Task contract:
    `docs/planning/companycore-business-module-map-task-contract.md`.

- V1PROD-003 Authenticated V1 production parity and selected-area data match.
  - Evidence: commit `1dafe910ff612e027b686f09e2a488600f6e60d4`
    was pushed and deployed through the accepted manual VPS rollover path.
    Public web/API `/health` report image
    `rnqqkhl3o3dut4qv56mlxly2_backend:1dafe91`. Authenticated production
    Playwright proof verified `/dashboard`,
    `/areas?area=01-strategia&view=overview`, and
    `/areas?area=01-strategia&view=ai` on desktop/mobile with no horizontal
    overflow, no console errors, no failed requests, and no empty unmatched
    backend-area state. `01 Strategia` now resolves backend operating context
    with `8 TABLES`, Drive evidence, and provider mappings.
  - Validation: `npm run validate`, `git diff --check`, VPS Docker image
    build, canary health, final routed container health, public web/API health,
    and authenticated production screenshot proof passed.
  - Evidence directory:
    `docs/ux/evidence/production-auth-v1-1dafe91-2026-05-15/`.
  - Task contract:
    `docs/planning/v1-production-authenticated-parity-task-contract.md`.

- PAPERCLIP-ARCH-001 Paperclip Company-Building Architecture Direction.
  - Evidence: `docs/architecture/organizational-architecture-bridge.md` now
    records Paperclip as a supervised external company-building execution
    agent over CompanyCore, with the minimal loop `business plan / owner
    intent -> knowledge and operating graph -> gap and task analysis -> work
    items -> execution -> feedback/evidence/next gaps`.
    `docs/architecture/system-architecture.md` now defines agent-facing
    Knowledge, Tools, Access, and Audit layers over the existing API/MCP
    boundary.
  - Validation: `git diff --check` passed.
  - Task contract:
    `docs/planning/paperclip-company-building-architecture-task-contract.md`.

- V1PROD-002 Deploy V1 canonical web layer and rerun parity.
  - Evidence: commit `ff5e04192db93a53280fab58bcd8f47cba30f554` was pushed to
    `origin/codex/companycore-local-port-3102` and deployed through the
    approved manual VPS rollover path. Public web/API `/health` report
    `ff5e04192db93a53280fab58bcd8f47cba30f554` and image
    `rnqqkhl3o3dut4qv56mlxly2_backend:ff5e041`. Production `/` now serves the
    V1 public home; `/auth/login` and `/auth/register` serve V1 public auth
    layouts; signed-out `/dashboard` and selected-area routes redirect to
    login.
  - Validation: `npm run validate`, `git diff --check`, Docker image build,
    canary local health, public web/API health, and production Playwright
    desktop/mobile screenshot proof passed. `npm run test:api` was not run
    because local Docker commands timed out; no migration or backend API
    contract changed in this release.
  - Evidence directory:
    `docs/ux/evidence/production-v1-ff5e041-2026-05-15/`.
  - Task contract:
    `docs/planning/v1-production-canonical-deploy-task-contract.md`.
  - Residual risk: authenticated production dashboard and selected-area visual
    parity still needs an owner-session screenshot pass.

- V1PROD-001 Production Canonical Parity Audit.
  - Evidence: production screenshots and route report were captured under
    `docs/ux/evidence/production-compare-2026-05-15/`. Public web/API health
    reported `build.commit="b716f02"` while the current V1 canonical web
    implementation is in the local `9b575e2` working tree. Production `/`
    redirects to `/auth/login`, login/register still use the old auth layout,
    and private routes correctly redirect signed-out users to login.
  - Discrepancy register:
    `docs/ux/v1-production-canonical-discrepancy-audit-2026-05-15.md`.
  - Result: production parity is blocked by deploy drift; the next task is
    V1PROD-002 release and rerun of authenticated production screenshot
    comparison.
  - Task contract:
    `docs/planning/v1-production-canonical-parity-audit-task-contract.md`.

- V1WEB-INDEX-001 Web View UX Maturity Index.
  - Evidence: `docs/ux/v1-web-view-index-2026-05-15.md` now classifies active
    web routes as `V1 canonical`, `V1 foundation`, `V0 rebuild`,
    `V0 compatibility`, or `V2 deferred`. It records canonical sources,
    desktop/mobile target images, rebuild direction, owner journeys, and
    recommended build order. The React route registry now carries matching
    lightweight `uxStage`, canonical source, and rebuild-note metadata.
  - Validation: `git diff --check` passed.
  - Task contract:
    `docs/planning/v1-web-view-index-task-contract.md`.

- V1AREA-002 Area Detail Canonical View.
  - Evidence: `/areas?area=:areaKey&view=:viewId` now opens a canonical
    selected-department view from the Company Atlas model while `/areas`
    remains the all-areas workbench. The view reuses the atlas shell and shows
    department identity, capability navigation, observe/decide/execute/delegate
    board, selected capability focus, tables/records/knowledge/provider
    evidence, and ownership/AI decision rail. Current canonical targets are
    `docs/ux/assets/companycore-v1-area-detail-desktop-canonical.png` and
    `docs/ux/assets/companycore-v1-area-detail-mobile-canonical.png`.
  - Validation: `npm run build:web`, `npm run validate`, and `git diff
    --check` passed. Playwright fallback against `http://127.0.0.1:3138`
    verified `/areas?area=01-strategia&view=overview` on desktop `1366x900`
    and `/areas?area=01-strategia&view=ai` on mobile `390x844` with no
    horizontal overflow, console errors, or page errors.
  - Task contract:
    `docs/planning/v1-area-detail-canonical-task-contract.md`.

- V1AREA-003 Area Detail Capability Tabs.
  - Evidence: `/areas?area=:areaKey&view=:viewId` now renders distinct
    area-scoped capability boards for `overview`, `goals`, `workflows`,
    `tasks`, `knowledge`, `resources`, `decisions`, `ai`, and `add-view`.
    Each board is derived from existing connection data, readable area tables,
    table record snapshots, Drive scope, provider mappings, and MCP manifest
    context; no new backend route or fake data contract was introduced.
  - Validation: `npm run build:web`, `npm run validate`, and `git diff
    --check` passed. Playwright fallback against `http://127.0.0.1:3144`
    clicked every desktop capability tab and verified mobile AI tab rendering
    at `390x844` with no horizontal overflow, console errors, or page errors.
    Screenshots:
    `docs/ux/evidence/v1-area-detail-tabs-desktop.png` and
    `docs/ux/evidence/v1-area-detail-tabs-mobile.png`.
  - Task contract:
    `docs/planning/v1-area-detail-capability-tabs-task-contract.md`.

- V1AREA-004 Area Detail UX Polish.
  - Evidence: the selected-department view now has a calmer connected
    operating flow, lighter capability boards, improved mobile density, and
    explicit active-tab accessibility state while keeping the same backend data
    contracts.
  - Validation: `npm run build:web`, `npm run validate`, and `git diff
    --check` passed. Playwright fallback against `http://127.0.0.1:3146`
    clicked every desktop capability tab and verified mobile AI tab rendering
    at `390x844` with no horizontal overflow, console errors, or page errors.
    Screenshots:
    `docs/ux/evidence/v1-area-detail-polish-desktop.png` and
    `docs/ux/evidence/v1-area-detail-polish-mobile.png`.
  - Task contract:
    `docs/planning/v1-area-detail-ux-polish-task-contract.md`.

- V1WEB-002 Five Canonical Web Surfaces.
  - Evidence: `/` is now the public CompanyCore home route, `/auth/login` and
    `/auth/register` share the public layout, and `/dashboard` remains the
    private post-login Company Atlas. The selected-area route remains private
    on `/areas?area=:areaKey&view=:viewId`.
  - Canonical images: refreshed desktop/mobile targets for public home, login,
    registration, dashboard, and selected-area detail under `docs/ux/assets/`.
  - Validation: `npm run build:web`, `npm run validate`, and `git diff
    --check` passed. Playwright fallback against `http://127.0.0.1:3148`
    rendered all five canonical views in desktop and mobile, plus dashboard
    tablet proof at `834x1112`, with no horizontal overflow, blank page,
    console errors, or page errors. Public home/login/register screenshots
    were refreshed again after the mobile public-nav refinement.
  - Task contract:
    `docs/planning/v1-web-five-canonical-surfaces-task-contract.md`.

- V1SETTINGS-001 Unified V1 Settings Canonical Design.
  - Evidence: the settings IA now uses sections for Integrations, Agent keys,
    and MCP. Integrations are contextual by provider and expose
    backend-supported credentials, active state, scope IDs, `syncMode`, and
    `importMode`; provider rows expose an active/disabled switch for pausing
    future sync/actions while preserving imported CompanyCore data. The
    selected provider exposes `Setup`, `Mapping`, and `Sync` tabs. Badges,
    counters, review queues, and large tool catalogs belong in dedicated work
    views.
  - Canonical images:
    `docs/ux/assets/companycore-v1-settings-desktop-canonical.png` and
    `docs/ux/assets/companycore-v1-settings-mobile-canonical.png`.
  - Spec:
    `docs/ux/v1-settings-canonical-spec-2026-05-15.md`.
  - Task contract:
    `docs/planning/v1-settings-canonical-design-task-contract.md`.

- REACT-WEB-LAYOUT-001 Authenticated Layout Foundation.
  - Evidence: `web/src/app-route-registry.ts` now owns React route groups,
    canonical hrefs, aliases, prefix matching, shell navigation metadata, and
    post-auth redirect normalization. Owner login/register default to
    `/dashboard` while preserving safe pending private routes. Shared React
    shell navigation is registry-derived, and `ReactApp` uses a component map
    instead of repeated manual route branching.
  - Validation: `npm run build:web`, `npm run validate`, and `git diff
    --check` passed. Playwright fallback against local backend
    `http://127.0.0.1:3137` verified login -> `/dashboard`; `/dashboard`,
    `/`, `/react-dashboard`, `/areas`, `/react-areas`, `/settings/api`, and
    `/react-agent-tools` rendered with no route-level error panel and no
    horizontal overflow; mobile `/dashboard` at `390x844` had no horizontal
    overflow. Validation server and headless browser processes were cleaned up.
  - Task contract:
    `docs/planning/react-web-layout-foundation-task-contract.md`.

- JARVIS-GDRIVE-001 Jarvis CompanyCore Google Drive E2E.
  - Evidence: production commit `b716f02` is deployed and public health reports
    image `rnqqkhl3o3dut4qv56mlxly2_backend:b716f02`. Owner Google Drive OAuth
    decrypts successfully with refresh/access tokens present. Protected
    `npm run google-drive:smoke` passed with `googleDriveActive=true` and 748
    imported files. Owner folder discovery returned 174 folders, 13 selected
    roots, 173 included folders, and target folder `12. Zarządzanie`
    externalId `1U1GMpy0erVETPDA9ciRb7l1gVbSJfaff` selected/imported.
  - Jarvis-key smoke: using Jarvis' CompanyCore key only, CompanyCore created
    Google Doc `Protokół Wielkiej Narady Spinaczy` and Google Sheet
    `Budżet Na Kawę I Inne Poważne Excely` in folder `12. Zarządzanie`.
    CompanyCore returned file IDs/external IDs/links and read back both file
    contents through `/v1/google-drive/files/:id/content`.
  - Validation: `npm run validate` and `git diff --check` passed. Local
    `npm test` reached the build gate but stopped before API tests because
    this host has no `DATABASE_URL`.
  - Task contract:
    `docs/planning/jarvis-companycore-google-drive-e2e-task-contract.md`.

- GD-IMPORT-UX-001 Google Drive folder import organization.
  - Evidence: `/v1/integration-settings/google_drive/folders/discover` now
    returns organized folder metadata including path, depth, parent,
    selected/included/imported state, child/descendant counts, and direct
    imported item counts. `/settings/drive` now shows searchable root-folder
    selection, selected-scope filtering, imported/included badges, and scoped
    save/import actions.
  - Validation: production owner-token discovery smoke returned the target
    `12. Zarządzanie` folder with `selected=true`, `imported=true`, and
    `directImportedItemCount=3`.

- REACT-WEB-001 React web layer consolidation.
  - Evidence: all user-facing web routes are now served through the React/Vite
    bundle instead of `public/index.html`. Removed active vanilla web files:
    `public/app.js`, `public/styles.css`, `public/index.html`,
    `public/relationship-workbench.js`, and
    `public/google-drive-workbench.js`.
  - Validation: `npm run validate` passed. Playwright signed-out proof covered
    auth pages and private-route login redirects. Playwright signed-in
    mocked-backend proof covered `/dashboard`, `/areas`, `/tasks-adapter`,
    `/settings/integrations`, `/react-agent-tools`, `/relationships`, `/data`,
    `/pipeline`, `/settings/api`, `/settings/drive`, `/settings/account`, and
    `/settings` with no old vanilla scripts, no old public shell, no console
    errors, no route error panels, and no horizontal overflow.
  - Residual risk: full ClickUp setup and full Google Drive OAuth/folder
    selection need dedicated React rebuild slices; current React routes expose
    real backend status and safe actions without copying the legacy vanilla
    forms.
  - Task contract:
    `docs/planning/react-web-consolidation-task-contract.md`.

- V1AUTH-001 Owner auth redirect flow.
  - Evidence: private React routes with missing owner sessions now redirect to
    `/auth/login` instead of rendering a dead-end signed-out panel. Stale or
    invalid owner tokens are cleared and invalid dashboard bootstrap responses
    no longer show the generic dashboard load error. Login/register preserves
    the pending private route and opens React-owned routes through a full-page
    React shell redirect after authentication.
  - Deployment: pushed and manually rolled over production to commit
    `c62d662`, image `rnqqkhl3o3dut4qv56mlxly2_backend:c62d662`, running
    container `backend-rnqqkhl3o3dut4qv56mlxly2-manual-c62d662`.
  - Validation: `npm run validate`, `git diff --check`, local Playwright
    stale-token and post-login pending-route proofs, plus production
    Playwright missing-session and stale-token checks passed.
  - Task contract:
    `docs/planning/v1auth-001-owner-auth-redirect-task-contract.md`.

- V1AREA-001 premium production manual rollover to `1acb709`.
  - Evidence: after pushing the premium Company Atlas polish, public health
    still reported `79d8d0e`, so the approved archive-based manual VPS rollover
    built `rnqqkhl3o3dut4qv56mlxly2_backend:1acb709`, started
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-1acb709`, verified public
    web/API `/health` with `build.commit="1acb709"`, and verified public
    `/dashboard` serves `index-wbA5Pvhk.js` plus `index-B1Wcb5DB.css`.

- V1AREA-001 production manual rollover to `df99969`.
  - Evidence: Coolify redeploy did not update the running image; public
    `/health` still reported `fb6aca9`. The approved archive-based manual VPS
    rollover built `rnqqkhl3o3dut4qv56mlxly2_backend:df99969`, started
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-df99969`, verified container
    health, then stopped and retained the previous
    `backend-rnqqkhl3o3dut4qv56mlxly2-manual-fb6aca9-previous-df99969`
    rollback container. Public web/API `/health` now report
    `build.commit="df99969"`, and public `/dashboard` serves
    `index-0as746Hb.js` plus `index-Dafh8u4t.css`.

- V1AREA-001 Area-First Dashboard Pixel-Perfect Implementation.
  - Evidence: `/dashboard` now serves the React V1 area-first Company Atlas
    view. The implementation adds a dashboard-local area-first shell with
    canonical 00-12 LuckySparrow areas, expanded `01 Strategia`, area
    capability tabs, quiet command/search/status header, CSS/SVG atlas board,
    selected-area state, right `Today` decision rail, progressive path,
    mobile app bar, mobile company summary, horizontal area selector, and
    five-item mobile bottom nav. The view derives area labels/status/table
    counts, integration readiness, capabilities, workspace, and MCP scope from
    `/v1/connection` instead of static UI records.
    The latest premium parity pass added the final sidebar owner footer,
    subtle atlas/card material accents, visible desktop owner context in the
    first viewport, and a shorter mobile bottom nav with refreshed desktop and
    mobile evidence screenshots.
  - Changed files: `src/app.ts`, `web/src/main.tsx`, `web/src/styles.css`,
    generated `public/react/*`, and screenshot evidence in
    `docs/ux/evidence/`.
  - Validation: `npm run check:public-js`, `npm run build:server`,
    `npm run build:web`, `npm run validate`, and `git diff --check` passed.
    Playwright fallback verified the built `/dashboard` route with a
    controlled owner session and mocked `/v1/connection` at desktop
    `1366x900`, tablet `834x1112`, and mobile `390x844`: no horizontal
    overflow, no console/page errors, 13 area rows, 12 orbit nodes plus
    center, selected `01 Strategia`, hidden desktop mobile controls, mobile
    summary present, desktop sidebar hidden on tablet/mobile, and five mobile
    nav items. A follow-up fidelity pass flattened the desktop topbar to the
    canonical 71px bar, converted the atlas to circular icon nodes, moved the
    content row to the first viewport, and reduced the mobile orbit density.
    A later executive-panel pass aligned the selected-area panel with the
    canonical CEO overview: health banner, four area-signal tiles, Jarvis
    read-only readiness, primary strategy-review CTA, open-area link, MECE
    accountability note, and a `Today` rail with priority/decision/AI/proof
    groups. The latest parity continuation pass tightened the mobile appbar,
    `Dzialy` strip, mobile atlas heading/breadcrumb, four-metric summary,
    desktop sidebar density, and desktop progressive path icon/detail anatomy
    against the active canonical references.
    Screenshots:
    `docs/ux/evidence/v1-area-dashboard-desktop-1366x900.png`,
    `docs/ux/evidence/v1-area-dashboard-tablet-834x1112.png`, and
    `docs/ux/evidence/v1-area-dashboard-mobile-390x844.png`.
  - Follow-up validation: `npm run test:api` passed against workspace-local
    PostgreSQL on `127.0.0.1:55476`; real backend Playwright proof verified
    selected-area desktop/mobile routes with screenshots
    `docs/ux/evidence/v1-area-real-backend-selected-area-desktop.png` and
    `docs/ux/evidence/v1-area-real-backend-selected-area-mobile.png`.
  - Task contract:
    `docs/planning/v1-area-first-pixel-perfect-task-contract.md`.

- V2GD-010 Google Sheet Parent Folder Creation.
  - Evidence: deployed commit `669c1c8` to production through manual VPS
    rollover. Public `/health` and `/v1/health` report `build.commit` as
    `669c1c8`. CompanyCore protected Google Drive smoke passes for connection,
    capabilities, active Drive config, and 748 imported files. The route now
    accepts `parentId`; Sheets creation uses Drive `files.create` with MIME
    type `application/vnd.google-apps.spreadsheet`, then writes values through
    Sheets API.
  - Remaining blocker: real Docs/Sheets content read/write is blocked by
    invalid stored Google Drive OAuth secret, tracked as JARVIS-GDRIVE-001.

- V1UX-CANON-001 Simple V1 Dashboard Canonical Design.
  - Evidence: published the V1 area-first Company Atlas direction, current UI
    audit, sitemap, component boundaries, Tailwind/DaisyUI style rules,
    pixel-perfect implementation plan, and generated canonical concept images.
    The current V1 implementation targets are
    `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
    and
    `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`.
    `git diff --check` and manual image review passed.
  - Task contract:
    `docs/planning/v1-simple-dashboard-canonical-design-task-contract.md`.

- ACF-OPS-002 Build Metadata Health Restoration.
  - Evidence: restored source-level production build metadata wiring by
    deriving `build.commit` from `COMPANYCORE_BUILD_COMMIT`, `SOURCE_COMMIT`,
    or common Git commit env vars, and deriving `build.image` from
    `COMPANYCORE_BUILD_IMAGE`, Coolify/container variables, or `HOSTNAME`.
    `docker-compose.coolify.yml` now passes `SOURCE_COMMIT` and
    `COOLIFY_CONTAINER_NAME` into backend build/runtime metadata fields.
    `npm run build`, `git diff --check`, and `npm run test:api` passed against
    portable PostgreSQL on `localhost:55475`, including a production health
    regression test that verified safe Coolify metadata appears in `/health`.
  - Task contract:
    `docs/planning/acf-ops-002-build-metadata-health-task-contract.md`.

- UX100-W05 Company OS And MCP Tools Alignment.
  - Evidence: added a shared React agent-authority bridge to
    `/react-company-os` and `/react-agent-tools`. The Company OS cockpit now
    summarizes pending approvals, blocked runtime, high risks, and MCP handoff;
    the MCP tools surface now summarizes visible tools, supervised tools,
    Company OS risk, and destructive authority using the same approval-first
    vocabulary. `npm run build`, `git diff --check`, and `npm run test:api`
    passed against portable PostgreSQL on `localhost:55475`. Playwright
    fallback verified both routes on `http://127.0.0.1:3124` at desktop
    `1366x900`, tablet `834x1112`, and mobile `390x844` with bridge,
    approval, and MCP markers present, no horizontal overflow, no console
    issues, no failed requests, and zero unnamed visible controls.
  - Task contract:
    `docs/planning/ux100-w05-company-os-mcp-alignment-task-contract.md`.

- UX100-W04 Tasks/Pipeline Operating Pressure Summaries.
  - Evidence: added task and pipeline operating-pressure summaries derived
    from existing task status, due dates, priorities, sources, selected ClickUp
    lists, pipeline stages, clients, deals, and interactions. `/tasks-adapter`
    now shows overdue, due-soon, open, high-priority, source, and next-action
    pressure. `/pipeline` now shows stage, usage, deal, touchpoint, and
    relationship-follow-up pressure. `npm run check:public-js`, `npm run
    validate`, `git diff --check`, and `npm run test:api` passed against
    portable PostgreSQL on `localhost:55475`. Playwright fallback verified
    `/tasks-adapter` and `/pipeline` on `http://127.0.0.1:3123` at desktop
    `1366x900`, tablet `834x1112`, and mobile `390x844` with pressure cards
    and next-action blocks present, no horizontal overflow, no console issues,
    no failed requests, and zero unnamed visible controls. Portable database,
    temporary QA script, and headless browser processes were cleaned up.
  - Task contract:
    `docs/planning/ux100-w04-tasks-pipeline-pressure-task-contract.md`.

- UX100-W03 Relationship/Data Provenance And AI Safety Labels.
  - Evidence: added relationship and data provenance/readiness labels derived
    from existing confidence, source, API route, typed-editor, and operating
    area state. `/relationships` now distinguishes CompanyCore graph,
    provider hierarchy, route-inferred, owner-review, and unsupported families
    with AI-safe/review/blocked labels. `/data` and `/data/:slug` now show
    module, table, record-row, and inspector provenance plus AI readiness.
    `npm run check:public-js`, `npm run validate`, `git diff --check`, and
    `npm run test:api` passed against portable PostgreSQL on
    `localhost:55475`. Playwright fallback verified `/relationships`,
    `/data`, `/data/tasks`, and `/data/clients` on
    `http://127.0.0.1:3122` at desktop `1366x900`, tablet `834x1112`, and
    mobile `390x844` with provenance/AI labels present, no horizontal
    overflow, no console issues, no failed requests, and zero unnamed visible
    controls. Portable database and browser validation processes were cleaned
    up.
  - Task contract:
    `docs/planning/ux100-w03-relationship-data-provenance-task-contract.md`.

- UX100-W02 Shell Decision Brief And Mobile Quick Actions.
  - Evidence: extended the existing authenticated route command strip with
    state-derived route decision titles, what-matters text, blocked/review
    signal, and tone; added a shared five-action mobile/tablet quick rail for
    Map, Brief, Data, Tasks, and Settings without creating a second shell.
    `npm run check:public-js`, `npm run validate`, `git diff --check`, and
    `npm run test:api` passed against portable PostgreSQL on
    `localhost:55475`. Playwright fallback verified `/dashboard`, `/areas`,
    `/relationships`, `/data/tasks`, `/settings/api`, and `/settings/drive`
    on `http://127.0.0.1:3121` at desktop `1366x900`, tablet `834x1112`,
    and mobile `390x844` with route command titles/signals/tones, hidden
    desktop quick rail, visible five-action tablet/mobile quick rail, no
    horizontal overflow, no console issues, no failed requests, and zero
    unnamed visible controls. Validation server, portable database, and
    headless browser processes were cleaned up.
  - Task contract:
    `docs/planning/ux100-w02-shell-decision-brief-task-contract.md`.

- UX100-W01 Dashboard Command Brief And Mobile First Viewport.
  - Evidence: added a dashboard owner decision board above the Company map,
    deriving priority, blocker count, next action, AI readiness, company
    context, and top blockers from existing workspace state. `npm run
    check:public-js`, `npm run validate`, `git diff --check`, and `npm run
    test:api` passed against disposable PostgreSQL on `localhost:55474`.
    Playwright fallback verified `/dashboard` on `http://127.0.0.1:3120` at
    desktop `1366x900`, tablet `834x1112`, and mobile `390x844` with four
    decision metrics, at least one decision item, 13 map cards, no horizontal
    overflow, no console issues, no failed requests, and zero unnamed visible
    controls. Validation server, database, and headless browser processes were
    cleaned up.
  - Task contract:
    `docs/planning/ux100-w01-dashboard-command-brief-task-contract.md`.

- UX100-001 Web App UX100 Audit Atlas And Execution Plan.
  - Evidence: published
    `docs/ux/web-app-ux100-audit-and-execution-plan-2026-05-15.md` with 100
    cross-app UX audit findings and 100 execution steps mapped to owner,
    company-operation, and AI/MCP safety outcomes. Selected the first
    implementation waves UX100-W01 through UX100-W05 and activated UX100-W01
    as the next ready task. `git diff --check` and row-count sanity checks
    passed.
  - Task contract:
    `docs/planning/ux100-001-web-app-audit-atlas-task-contract.md`.

- ACF-OPS-001 Auto-Deploy Proof Or Manual Path Acceptance Refresh.
  - Evidence: latest pushed commit was `ece93b1`; public web and API
    `/health` both returned `200`, but both reported `build.commit="unknown"`
    and `build.image="unknown"`. Updated deployment docs and KI-002 so
    GitHub-to-Coolify auto-deploy remains unverified, while manual
    VPS/Coolify backend rollover remains the accepted release path until
    commit/image metadata or equivalent Coolify evidence is available. `git
    diff --check` passed.
  - Task contract:
    `docs/planning/acf-ops-001-deploy-path-acceptance-task-contract.md`.

- ACF-QA-001 Validation Gate Entrypoints.
  - Evidence: added `npm run check:public-js`, `npm run test:api`, kept
    `npm test` as a compatibility wrapper, and made `npm run validate` run the
    public JS static check before build. Updated project-state validation
    commands and testing docs. `npm run check:public-js`, `npm run validate`,
    `git diff --check`, and `npm run test:api` passed against disposable
    PostgreSQL on `localhost:55473`; validation container was removed.
  - Task contract:
    `docs/planning/acf-qa-001-validation-gates-task-contract.md`.

- ACF-MAINT-002 Google Drive Workbench Context Extraction.
  - Evidence: added `public/google-drive-workbench.js` as the route-local
    module for Drive command summary/context rendering, loaded it before
    `public/app.js`, and reduced `renderGoogleDriveContext()` to a module
    delegation. `node --check public/app.js`, `node --check
    public/google-drive-workbench.js`, `npm run build`, `git diff --check`,
    and `npm test` passed against disposable PostgreSQL on `localhost:55472`.
    Playwright fallback verified `/settings/drive` on
    `http://127.0.0.1:3119` at desktop `1366x900` and mobile `390x844` with
    the module loaded, four command cards, no horizontal overflow, no console
    issues, and no failed requests.
  - Task contract:
    `docs/planning/acf-maint-002-google-drive-workbench-extraction-task-contract.md`.

- V2VIS-005 Settings Drive Route Body UX Polish.
  - Evidence: published
    `docs/ux/settings-drive-route-body-usability-audit-2026-05-15.md` with
    100 route-body findings; added `/settings/drive` Drive import command
    summary, OAuth/selection/import/area-review command cards, stable anchors
    for setup, folder selection, and imported files, plus responsive command
    grid CSS. `node --check public/app.js`, `npm run build`, `git diff
    --check`, and `npm test` passed against disposable PostgreSQL on
    `localhost:55471`. Playwright fallback verified `/settings/drive` on
    `http://127.0.0.1:3118` at desktop `1366x900`, tablet `834x1112`, and
    mobile `390x844` with no horizontal overflow, no console issues, no failed
    requests, four command cards, working folder-picker anchor, and zero
    unnamed visible controls.
  - Task contract:
    `docs/planning/v2vis-005-settings-drive-route-body-polish-task-contract.md`.

- V2VIS-003 Areas Route Body UX Polish.
  - Evidence: published `docs/ux/areas-route-body-usability-audit-2026-05-15.md`
    with 100 route-body findings; added `/areas` area command summary,
    review/coverage command cards, earlier filters, anchors for review queues,
    selected context, lifecycle, coverage, and table sections, plus mobile
    density CSS. `npm run build`, `git diff --check`, and `npm test` passed
    against disposable PostgreSQL on `localhost:55469`. Playwright fallback
    verified `/areas` on `http://127.0.0.1:3116` at desktop `1366x900`,
    tablet `834x1112`, and mobile `390x844` with no horizontal overflow, no
    console issues, no failed requests, four command cards, and zero unnamed
    visible controls.
  - Task contract:
    `docs/planning/v2vis-003-areas-route-body-polish-task-contract.md`.

- V2VIS-004 Settings API Route Body UX Polish.
  - Evidence: published
    `docs/ux/settings-api-route-body-usability-audit-2026-05-15.md` with 100
    route-body findings; added `/settings/api` agent-access safety command
    summary, active/scoped/broad key signals, MCP exposure and supervision
    command cards, route-body anchors, and responsive command grid. `node
    --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` passed against disposable PostgreSQL on `localhost:55470`.
    Playwright fallback verified `/settings/api` on
    `http://127.0.0.1:3117` at desktop `1366x900`, tablet `834x1112`, and
    mobile `390x844` with no horizontal overflow, no console issues, no failed
    requests, four command cards, and zero unnamed visible controls. Real
    create-key proof showed visible raw `cc_v1_` key and one active key row.
  - Task contract:
    `docs/planning/v2vis-004-settings-api-route-body-polish-task-contract.md`.

- ORG-ARCH-001 Organizational Architecture Bridge Memory Update.
  - Evidence: added
    `docs/architecture/organizational-architecture-bridge.md`, linked it from
    architecture source-of-truth docs, mapped the user's target concepts to the
    current database model in `docs/DATABASE.md`, and recorded DEC-015,
    CCORE-DM-007, and REQ-ORG-ARCH-001. `git diff --check` passed.
  - Task contract:
    `docs/planning/org-arch-001-organizational-architecture-bridge-task-contract.md`.

- V2VIS-002 Route Frame Convergence And Usability Repair.
  - Evidence: published `docs/ux/route-frame-usability-audit-2026-05-15.md`
    with 100 route-frame findings; added the vanilla route command strip;
    converted the shared React shell from header-only navigation into a
    company command shell with desktop command rail, grouped navigation,
    workspace status, compact topbar, and mobile shortcut rail. `node --check
    public/app.js`, `npm run build`, `git diff --check`, and `npm test`
    passed against disposable PostgreSQL on `localhost:55468`. Playwright
    fallback verified `/dashboard`, `/data/tasks`, `/settings/drive`,
    `/settings/api`, `/areas`, `/react-agent-tools`, and `/react-company-os`
    at desktop `1366x900`, tablet `834x1112`, and mobile `390x844` with no
    horizontal overflow, no console issues, no failed requests, and zero
    unnamed visible controls.
  - Task contract:
    `docs/planning/v2vis-002-route-frame-convergence-task-contract.md`.

- ACF-UX-003 Authenticated Shell Usability Repair.
  - Evidence: sidebar IA now uses company-management lanes (`Command`,
    `Company areas`, `Workbenches`, `Integrations & agents`, `Workspace`);
    the topbar is a compact command bar with command search and desktop
    status; dashboard duplicate page title is removed; React route header
    language now matches the canonical CompanyCore shell. `node --check
    public/app.js`, `npm run build`, and `npm test` passed against disposable
    PostgreSQL on `localhost:55467`. Playwright fallback verified desktop
    `1366x900`, tablet `834x1112`, and mobile `390x844` with no horizontal
    overflow, no console issues, no failed requests, mobile drawer open, and
    final mobile/tablet topbar height `65px`.
  - Task contract:
    `docs/planning/acf-ux-003-shell-usability-repair-task-contract.md`.

- PROD-HOTFIX-001 Coolify Restart Loop API Key Hash Fallback.
  - Evidence: public health returned `503` after deploy and local production
    config import reproduced the likely restart-loop condition when
    `API_KEY_HASH_SECRET` was omitted. `src/config/env.ts` now falls back to
    required non-placeholder `AUTH_TOKEN_SECRET` for API key hashing when the
    separate hash secret is not configured. `git diff --check`,
    `npm run build`, and `npm test` passed against disposable PostgreSQL on
    `localhost:55466`, including a new production fallback regression test.
    Coolify runtime inspection then found empty values for `AUTH_TOKEN_SECRET`,
    `API_KEY_HASH_SECRET`, and `INTEGRATION_SECRET_KEY`; all three were
    populated with non-placeholder production values. Redeploy
    `l1i1ylihrss3d7xoxk4psu2n` finished, backend logs showed
    `companycore listening on port 3000`, and public web/API `/health`
    returned `200`.
  - Task contract: `docs/planning/prod-hotfix-001-task-contract.md`.

- ACF-PROD-001 Operating Model Data Completion Decision.
  - Result: accepted deferral for fake seed data. Empty projects, storage
    locations, knowledge roots, and automation definitions are valid
    foundation-ready states when future UI labels them honestly and uses real
    owner creation/import flows.
  - Task contract: `docs/planning/acf-prod-001-task-contract.md`.

- WEBFOUND-002/003/004 Workspace And Sidebar Foundation.
  - Evidence: `npm test` passed against disposable PostgreSQL on
    `localhost:55453`; Playwright owner-shell smoke passed against isolated
    `http://127.0.0.1:3106` with desktop `1366x900`, tablet `834x1112`, and
    mobile `390x844`. Smoke verified register/bootstrap, workspace create,
    workspace switch back, 13 sidebar operating areas, no horizontal overflow,
    no relevant console errors, no failed requests, and mobile/tablet drawer
    close via backdrop.
  - Task contract: `docs/planning/webfound-002-004-task-contract.md`.

- WEBFOUND-005 Sidebar Area Tree Hardening.
  - Evidence: `node --check public/app.js`, `git diff --check`, and
    `npm test` passed against disposable PostgreSQL on `localhost:55455`;
    Playwright smoke passed against isolated `http://127.0.0.1:3107`, proving
    13 area summaries, 52 resource-family labels, active area state,
    workspace-create Escape close, mobile Escape close, backdrop close, no
    overflow, no console issues, and no failed requests.
  - Task contract: `docs/planning/webfound-005-task-contract.md`.

- WEBFOUND-007 Relationship Graph Audit.
  - Evidence: source review classified implemented, inferred, unsupported,
    and missing relationship families across Prisma schema, operating model
    routes, and current owner web surfaces. `git diff --check` passed.
  - Audit: `docs/architecture/relationship-graph-audit-2026-05-14.md`.
  - Task contract: `docs/planning/webfound-007-task-contract.md`.

- WEBFOUND-008A Relationship Graph Read API.
  - Evidence: `npm run build` passed; `npm test` passed against disposable
    PostgreSQL on `localhost:55457`, covering relationship graph shape,
    direct/provider-hierarchy/route-inferred confidence labels, review items,
    unsupported families, `relationships:read` profile scope, and MCP manifest
    exposure. Validation container `companycore-test-postgres-webfound008a`
    was removed.
  - Task contract: `docs/planning/webfound-008a-task-contract.md`.

- WEBFOUND-008B Relationship Workbench Upgrade.
  - Evidence: `node --check public/app.js`, `npm run build`, and `npm test`
    passed against disposable PostgreSQL on `localhost:55458`; Playwright
    fallback rendered `/relationships` on `http://127.0.0.1:3108`, verifying
    graph markers, route-inferred filter state, desktop `1366x900`, mobile
    `390x844`, no overflow, no console issues, and no failed requests.
  - Task contract: `docs/planning/webfound-008b-task-contract.md`.

- WEBFOUND-009 Integration Readiness Dashboard.
  - Evidence: `node --check public/app.js`, `npm run build`, and `npm test`
    passed against disposable PostgreSQL on `localhost:55459`; Playwright
    fallback rendered `/settings/integrations` on
    `http://127.0.0.1:3109`, verifying readiness markers for ClickUp, Google
    Drive, relationship graph, MCP agents, scoped API access, desktop
    `1366x900`, tablet `820x1000`, mobile `390x844`, no overflow, no console
    issues, and no failed requests.
  - Task contract: `docs/planning/webfound-009-task-contract.md`.

- WEBFOUND-010 MCP Key Workspace Clarity.
  - Evidence: `node --check public/app.js`, `npm run build`, and `npm test`
    passed against disposable PostgreSQL on `localhost:55460`; Playwright
    fallback rendered `/settings/api` on `http://127.0.0.1:3110`, verifying
    workspace agent access context, key preview markers, preset risk update,
    missing MCP base-scope warning after scope edit, desktop `1366x900`,
    tablet `820x1000`, mobile `390x844`, no overflow, no console issues, and
    no failed requests.
  - Task contract: `docs/planning/webfound-010-task-contract.md`.

- WEBFOUND-011 Agent Tool Surface In Canonical Shell.
  - Evidence: `node --check public/app.js`, `npm run build`, and `npm test`
    passed against disposable PostgreSQL on `localhost:55461`; Playwright
    fallback opened `/react-agent-tools` from the canonical `/dashboard`
    sidebar on `http://127.0.0.1:3111`, verified MCP tool markers,
    canonical React header destinations, removal of old React-only nav labels,
    return to `/settings/api`, desktop `1366x900`, tablet `820x1000`, mobile
    `390x844`, no overflow, no console issues, and no relevant failed
    requests.
  - Task contract: `docs/planning/webfound-011-task-contract.md`.

- WEBFOUND-012 AI-Ready Smoke Pack.
  - Evidence: added `npm run ai-ready:smoke`; `node --check
    scripts/companycore-ai-ready-smoke.mjs` passed; `npm test` passed against
    disposable PostgreSQL on `localhost:55462`; `npm run ai-ready:smoke`
    passed against `http://127.0.0.1:3112`, proving disposable owner
    bootstrap, MCP reader/operator profile key creation, manifest visibility,
    HTTP and MCP relationship graph reads, and default fail-closed
    `mcp_tool_requires_supervision` behavior for the stage-complete MCP tool.
  - Task contract: `docs/planning/webfound-012-task-contract.md`.

- WEBFOUND-013 V2 UX Readiness Review.
  - Evidence: `docs/ux/v2-ux-readiness-review-2026-05-14.md` reviewed
    WEBFOUND-002 through WEBFOUND-012 and recorded GO for WEBFOUND-014 visual
    planning while keeping direct Company City/gamification implementation
    gated on a canonical shell/map/brief/status plan.
  - Task contract: `docs/planning/webfound-013-task-contract.md`.

- WEBFOUND-014 V2 Visual Implementation Plan.
  - Evidence: `docs/ux/v2-visual-implementation-plan-2026-05-14.md` defines
    the canonical V2 shell, Company City dashboard composition, command brief,
    status strip, responsive behavior, state model, visual asset strategy,
    route migration order, validation plan, and first future code candidate
    `V2VIS-001 Shared CompanyShell And Dashboard Frame`.
  - Task contract: `docs/planning/webfound-014-task-contract.md`.

- ACF-MAINT-001 Large File Modularization.
  - Evidence: extracted the vanilla relationship workbench from `public/app.js`
    into `public/relationship-workbench.js`; `public/app.js` dropped from
    6527 to 6224 lines. `node --check public/app.js`, `node --check
    public/relationship-workbench.js`, `npm run build`, and `npm test` passed
    against disposable PostgreSQL on `localhost:55464`; Playwright fallback
    verified `/relationships` on `http://127.0.0.1:3113` with the extracted
    module loaded, graph markers rendered, no overflow, no console issues, and
    no failed requests.
  - Task contract: `docs/planning/acf-maint-001-task-contract.md`.

- V2VIS-001 Shared CompanyShell And Dashboard Frame.
  - Evidence: added a dashboard Company map frame using real workspace,
    operating-area, relationship, integration, task, and MCP state; fixed
    shared `data-link` query preservation so map cards deep-link to selected
    areas. `node --check public/app.js`, `node --check
    public/relationship-workbench.js`, `git diff --check`, and `npm test`
    passed against disposable PostgreSQL on `localhost:55465`. Browser plugin
    invocation was blocked by no active Codex browser pane, so Playwright
    fallback verified `http://127.0.0.1:3000/dashboard` at desktop
    `1366x900`, tablet `834x1112`, and mobile `390x844`: 13 area cards, 4
    status pills, no overflow, no clipped cards, no console issues, no failed
    requests, desktop map-card click to `/areas?area=main-general`, and
    `/relationships` still loaded after ACF-MAINT-001.
  - Task contract: `docs/planning/v2vis-001-task-contract.md`.

- ACF-DOC-001 Coverage Ledger Reconciliation.
  - Evidence: stale Google Drive first-import blocker language was reconciled
    in architecture, function-coverage audit, project-control, system-health,
    active queue, and state files. Targeted source review preserves future
    Drive content/write/freshness proof gaps without reopening first import.
  - Task contract: `docs/planning/acf-doc-001-task-contract.md`.

- ACF-SEC-001 Production Secret And CORS Hardening.
  - Evidence: `npm run build` passed; `npm test` passed against disposable
    PostgreSQL on `localhost:55452`, including missing production secret
    rejection, development placeholder secret rejection, production CORS
    allow/deny behavior, and the existing protected API flow.
  - Task contract: `docs/planning/acf-sec-001-task-contract.md`.

- ACF-UX-001 Mobile Overflow And Focus Accessibility Fix.
  - Evidence: `npm run build` passed; signed-in Playwright fallback checked
    `/settings/api` and `/react-company-os` at desktop `1440x960` and mobile
    `390x844` with `horizontalOverflow=false`, `unnamedFocusableCount=0`, no
    console warnings/errors, and no relevant failed requests; `npm test`
    passed against disposable PostgreSQL on `localhost:55451`.
  - Task contract: `docs/planning/acf-ux-001-task-contract.md`.

- APP-AUDIT-001 Application Completion Audit Bundle.
  - Evidence: `npm run build` passed; `npm test` passed against disposable
    PostgreSQL on `localhost:55450`; production protected API sample passed;
    production signed-in Playwright route audit covered 12 routes at desktop
    and mobile with no failed requests or console warnings/errors. Findings
    and finish queue are recorded in
    `docs/operations/application-completion-audit-2026-05-14.md`.

- PROD-HOTFIX-001 Owner Console Snapshot Routing.
  - Evidence: production now runs commit
    `a7557120b8ea4630a0b32097e66ba0d4bb012b1b`; public `/health` and
    `/v1/health` report that commit; signed-in Playwright route checks for
    `/dashboard`, `/data`, `/relationships`, `/settings/drive`,
    `/settings/api`, and `/areas` reported no failed requests and no console
    warnings or errors.

- AGRUN-007 Google Drive Owner Consent And First Import.
  - Evidence: production runs commit
    `c5878d95a47f17745f65689c08e9e317a6465777`; OAuth is active; folder
    discovery found 172 folders; 13 numbered department roots (`00`-`12`) were
    selected and imported; `/v1/google-drive/files` readback returned 748
    imported Drive items, including 171 folders; all imported items have an
    operating-area assignment and descendant scope verification reported
    `mismatches=[]`.

- V2WEB-AGENT-009 Workflow Definition Draft Backend Contract.
- V2WEB-AGENT-010 Workflow Definition Activation Backend Contract.
- V2WEB-AGENT-011 Process And Pipeline Workflow Versioning Migration Decision.
- V2WEB-AGENT-012 Workflow Definition Draft Web Surface.
- V2WEB-AGENT-013 Workflow Draft History And Resume Decision.
- V2WEB-AGENT-014 Workflow Draft Readback And Resume Slice.
- V2WEB-AGENT-015 Workflow Archive And Rollback Command Decision.
- V2WEB-AGENT-016 Workflow Historical Version Archive Backend Slice.
- V2WEB-AGENT-017 Workflow Rollback Draft Backend Slice.
- V2WEB-AGENT-018 Workflow Recovery Controls Web Decision.
- V2WEB-AGENT-019 Workflow Recovery Controls Web Surface.
- V2WEB-AGENT-020 Workflow Version Lineage Decision.
- V2WEB-AGENT-021 Workflow Version Lineage Implementation.
- V2WEB-AGENT-022 Company OS Collection Fetch Alignment.
- V2WEB-AGENT-023 Workflow Recovery End-To-End Activation Proof.
- V2WEB-AGENT-024 Workflow Recovery Real Backend Proof.
- V2WEB-AGENT-008 Versioned Workflow Definition Command Contract.
- V2WEB-AGENT-007R Standards Editor Render Proof.
- V2WEB-AGENT-007 Standards Definition Editor Web Surface.
- UXD-003 Company City Dashboard V3 Department Model.
- UXD-002 Company City Dashboard V2 Target Spec.
- UXD-001 Company City UX Direction Decision.
- V2WEB-AGENT-006 Class A Definition Editor Backend Contract.
- V2WEB-AGENT-005 Definition Editing Contract Decision.
- V2WEB-AGENT-004 Workflow-Grade Command Panels.
- V2WEB-AGENT-003 Operating Graph Detail.
- V2WEB-AGENT-002 Company OS Correlation Timeline.
- V2WEB-AGENT-001 Agent Tool Surface Workbench.
- V2WEB-ARCH-001 Human-Agent Web Architecture Map.
- V2AGENT-006R Agent Command Queue Render Proof.
- V2AGENT-006 Agent Command Queue Cockpit Slice.
- V1CLOSE-001 V1 Achievement And External Blocker Handoff.
- V2AGENT-005 Supervised Operator MCP Smoke Harness.
- V2AGENT-004 MCP Requires-Approval Bridge Guard.
- V2AGENT-003 Approval-Aware MCP Command Flow Design.
- V2AGENT-002 MCP Company OS Reader Least-Privilege Correction.
- V2AGENT-001 Agent-First Company OS MCP Command Surface Audit.
- V2PLAN-001 V2 Product Lane Selection.
- V1EVID-002 Operating Model Registry Lifecycle Smoke.
- V1EVID-001 Company OS Lifecycle Trace Smoke.
- V1CTRL-002 Canonical Queue Cleanup.
- V1CTRL-001 Function Coverage Ledger.
- UXA-031 V1 Architecture Completion Audit.
- UXA-030 React Areas Canonical Route Switch.
- UXA-029 React Areas Canonical Route Switch Decision.
- UXA-028 React Areas Assigned Scope Reassignment Controls.
- UXA-027 React Areas Selected Context Data Hook.
- UXA-026 React Areas Selected Context Parity Decision.
- UXA-025 React Areas Area Lifecycle Controls.
- UXA-024 React Areas Canonical Switch Decision.
- UXA-023 React Areas Scope Assignment Controls.
- UXA-022 React Areas Canonical Switch Decision.
- UXA-021 React Areas Relationship Data Hook.
- UXA-020 React Areas Data Contract Gap Decision.
- UXA-019 React Areas Mapping Parity Slice.
- UXA-018 React Canonical Route Switch Decision.
- UXA-017 React Workbench Third Route Candidate.
- CCOS-020 Company OS Automation Lifecycle Proposal Execution.
- CCOS-019 Company OS Stage Lifecycle Command Service Extraction.
- CCOS-018 Company OS Automation Lifecycle Helper Reuse Design.
- CCOS-017 Company OS Automation Evaluator UI Actions.
- CCOS-016 Company OS Automation Rule Evaluator Backend.
- CCOS-015 Company OS Automation Rule Execution Design.
- CCOS-014 Company OS Stage Lifecycle UI Actions.
- CCOS-013 Company OS Stage Lifecycle Backend.
- CCOS-012 Company OS Pipeline Stage Lifecycle Design.
- CCOS-011 Company OS Approval UI Actions.
- CCOS-010 Company OS Approval Lifecycle Backend.
- CCOS-009 Company OS Approval Lifecycle Design.
- CCOS-008 Company OS Agent Context Panel.
- CCOS-007 Company OS Collection Detail Route.
- CCOS-006 Company OS Collection Drill-Down.
- CCOS-005 Company OS Dashboard Surface.
- UXA-016 React Route Shell Extraction.
- MCP-006 MCP Agent Runtime Setup Guide.
- MCP-005 MCP Bridge Runtime Smoke Harness.
- MCP-004 Dynamic MCP Profile UI Loading.
- MCP-001 MCP Bridge Manifest Foundation.
- MCP-002 CompanyCore MCP Bridge Server.
- MCP-003 MCP Agent Key Profiles.
- CCOS-001 Company OS Stage 1 Data Foundation.
- CCOS-002 Company OS Stage 2 Runtime Evidence Foundation.
- CCOS-003 Company OS Stage 3 Governance Intelligence Foundation.
- CCOS-004 Company OS Read API Surface.
- UXA-015 React Canonical Route Switch Readiness.
- UXA-014 React Integration Map Workbench Route.
- UXA-013 React Workbench Canonical Route Decision.
- UXA-012 React Workbench Route Migration.
- UXA-011 React Table And Notification Primitive Migration.
- UXA-010 React Dashboard Component Migration.
- UXA-009 React Tailwind DaisyUI Migration Foundation.
- UXA-008 Dashboard Iconography And UX Governance.
- UXA-007 Mobile Private Header Compression.
- UXA-006 Local Action Feedback Placement.
- UXA-005 Workbench Visual Role Cleanup.
- UXA-004 Mobile Auth Action-First Layout.
- UXA-003 Dashboard First-Viewport Command Polish.
- UXA-002 Authenticated Private Route UX Evidence Harness.
- UXA-001 CompanyCore V1 UX/UI Audit.
- CCV1-067 Tech Stack Runtime Status Refresh.
- CCV1-066 Historical Guardrail Plan Classification.
- CCV1-065 Front-Door Docs Scope Refresh.
- CCV1-064 Historical Checklist Closure.
- CCV1-063 Historical Next Steps Refresh.
- CCV1-062 V1 Operator Runtime Pointer Refresh.
- AGRUN-008 Route-Level Business Editing Surfaces.
- AGRUN-009 Deploy Automation Reliability.
- CCV1-061 Agent State Source-Of-Truth Sync.
- V2WEB-049 Table Workbench Empty State Polish.
- V2WEB-048 Global Feedback Panel Polish.
- V2WEB-047 Public Entry Context Polish.
- V2WEB-046 Auth Onboarding Context Polish.
- V2WEB-045 ClickUp Setup Context Polish.
- V2WEB-044 Account Context Polish.
- V2WEB-043 Integration Map Context Polish.
- V2WEB-042 Google Drive Import Context Polish.
- V2WEB-041 Operating Area Context Polish.
- V2WEB-040 API Agent Access Context Polish.
- V2WEB-039 Relationships Mapping Context Polish.
- V2WEB-038 Pipeline Workflow Context Polish.
- V2WEB-037 Tasks Adapter Context Polish.
- V2WEB-036 Table Workbench Context Polish.
- V2WEB-035 Data Operations Index Polish.
- V2WEB-034 Command Bar Module Switcher Polish.
- V2WEB-033 App Shell Navigation Polish.
- V2WEB-032 Dashboard Command Layout Polish.
- V2WEB-031 Cross-Department Pipeline Semantics.
- V2GD-012 Drive Consent Guidance And Folder Picker.
- V2WEB-030 Typed Tasks Editor Workbench.
- V2WEB-029 Typed Task Lists Editor Workbench.
- V2WEB-028 Typed Clients Editor Workbench.
- V2WEB-027 Typed Projects Editor Workbench.
- V2WEB-026 Typed Notes Editor Workbench.
- V2WEB-025 Generic Table Record Workbench.
- AGRUN-005 Scoped Agent Key Owner UI.
- V2WEB-024 Data Operations Index.
- V2WEB-023 Dashboard Operational Cockpit.
- V2WEB-022 Unified API Integration Setup.
- V2GD-011 Drive Setup Operator Instructions.
- AGRUN-001 Agent Runtime Gap Plan.
- AGRUN-006 Agent Event Ack Positive Smoke.
- AGRUN-004 Reusable Agent Training Smoke.
- AGRUN-003 Machine-Readable Agent Contract.
- AGRUN-002 Service Key Scope Enforcement.
- V2WEB-021 User-Created Area Deletion Guardrails.
- AGCRUD-006 Agent CompanyCore API Playbook.
- AGCRUD-005 Provider/System Lifecycle Manifest.
- AGCRUD-004 Registry Resource Lifecycle API.
- AGCRUD-003 Business Archive/Delete Policy And Slice.
- AGCRUD-002 Business Read/Update API Completion.
- AGCRUD-001 Agent CRUD Capability Matrix.
- Initialize `companycore` from `!template`.
- Add Express/TypeScript/Prisma backend foundation.
- Add PostgreSQL schema for CompanyCore v1 entities.
- Add API key auth using `X-API-Key`.
- Add minimal endpoints required for v1.
- Add event creation for project/task/goal/target lifecycle events.
- Add initial ClickUp-shaped task sync endpoint.
- Add Dockerfile and Docker Compose.
- Add handoff documentation.
- Validate build and Docker smoke flow.
- Audit current repository architecture against CompanyCore v1 expectations.
- CCV1-002 Real planning queue and task contracts.
- CCV1-001 Canonical architecture and deployment docs alignment.
- CCV1-011 Workspace ownership and auth architecture contract.
- CCV1-014 API contract and error response standard.
- CCV1-015 Workspace guardrail test matrix.
- CCV1-003 Prisma migration baseline and deployment entrypoint.
- CCV1-012 Registration, login, and workspace bootstrap.
- CCV1-013 Workspace-scoped integration settings and secret storage.
- CCV1-017 Integration adapter contract and observability minimum.
- CCV1-010 Native ClickUp integration contract and first adapter slice.
- CCV1-004 Complete required v1 event emission.
- CCV1-005 Deployment domain documentation and smoke checklist.
- CCV1-016 Migration safety and seed/bootstrap policy.
- CCV1-007 API key hardening plan and implementation.
- CCV1-006 Endpoint test foundation.
- CCV1-008 Missing module route decision and minimal route slice.
- CCV1-018 Owner-managed adapter API keys.
- CCV1-009 Production deployment recovery and public smoke.
- CCV1-019 Database/API workspace coverage for core records.
- CCV1-021 Adapter connection handshake for Paperclip and Jarvis.
- CCV1-022 Adapter manifest for service clients.
- CCV1-023 Workspace-scoped agents API.
- CCV1-024 Workspace-scoped interactions API.
- CCV1-025 Task list and pipeline stage API.
- CCV1-026 Adapter smoke script.
- CCV1-009P Protected production smoke for adapter CRUD.
- CCV1-027 Paperclip and Jarvis production env wiring.
- CCV1-029 ClickUp production bootstrap slot.
- CCV1-030 Minimal owner ClickUp web console.
- CCV1-031P ClickUp owner console deployment plan.
- CCV1-028 Jarvis application-side CompanyCore Data Source deployment.
- CCV1-031 ClickUp Discovery Backend.
- CCV1-032 Guided Owner Console.
- CCV1-033 Production deploy and smoke for guided ClickUp owner console.
- CCV1-034 ClickUp-shaped operating model architecture and implementation plan.
- CCV1-034A Operating Model Registry Schema.
- CCV1-034B ClickUp Structure Persistence.
- CCV1-034B2 ClickUp Views and Custom Fields Persistence.
- CCV1-034C Registry-Backed Table API Contract.
- CCV1-034D Storage and Knowledge Roots.
- CCV1-034E Automation Scope Registry.
- CCV1-035 ClickUp first-run import policy and launch audit.
- CCV1-036 ClickUp webhook trigger architecture plan.
- CCV1-037 ClickUp list selection UX fix.
- CCV1-038 Dashboard task table.
- CCV1-039 ClickUp config-only save fix.
- CCV1-040 ClickUp save-and-sync activation fix.
- CCV1-036A Webhook Schema And Security Foundation.
- CCV1-036B ClickUp Webhook Registration.
- CCV1-036C ClickUp Webhook Receiver And Inbox.
- CCV1-036D Task Event Processor.
- CCV1-036E Agent Event Bridge.
- CCV1-036G CompanyCore to ClickUp write-back.
- CCV1-036F Production Webhook Smoke.
- CCV1-041 Template Agent Governance Sync.
- CCV1-042 ClickUp Full API Bridge Completion.
- CCV1-043 ClickUp Task Comment Bridge.
- CCV1-044 ClickUp Provider Event Retry And Health.
- CCV1-045 ClickUp Maintenance Freshness Run.
- CCV1-046 ClickUp Maintenance Scheduler.
- CCV1-047 Paperclip Application-Side CompanyCore Adapter.
- CCV1-048 V1 Closure Audit.
- CCV1-049 Authenticated Jarvis Smoke And Managed Paperclip Source Path.
- CCV1-050 Jarvis CompanyCore Answer Precision Hardening.
- CCV1-051 Clean Sync Data Hygiene.
- CCV1-052 V1 Launch Boundary And Source Handoff.
- CCV1-053 V1 Source Handoff Package.
- CCV1-054 Final V1 Runtime Rollover Smoke.
- CCV1-055 Full V1 Live System Smoke.
- CCV1-056 V1 Post-Release Artifact Cleanup.
- CCV1-057 Paperclip Source Handoff Validation.
- CCV1-058 OpenJarvis Source Handoff Validation.
- CCV1-059 GitHub Auto-Deploy Capability Audit.
- CCV1-060 V1 Operator Handoff.
- V2GD-001 Google Drive Architecture And Queue.
- V2GD-002 Google Drive Persistence Foundation.
- V2GD-003 Google Drive Provider Client And OAuth Settings.
- V2GD-004 Folder Discovery And File Import.
- V2GD-005 Docs And Sheets Read/Create/Edit.
- V2GD-006 Drive Changes Freshness.
- V2GD-007 Google Drive Deploy Smoke Hardening.
- V2GD-008 Google Drive OAuth Runtime Hardening.
- V2GD-009 Google Drive Production Rollover Smoke.
- V2GD-010 Drive Hierarchy Preview And Descriptions.
- V2WEB-001 Operating Map And Google Drive Console.
- V2WEB-002 Manual Provider Scope Mapping.
- V2WEB-003 Main Branch Web Console Shell Reconciliation.
- CCV1-020 GitHub webhook auto-deploy completion.
- V2WEB-004 Dedicated Operating Areas View.
- V2WEB-005 Dedicated Tasks Adapter View.
- V2WEB-006 Settings Integration Taxonomy View.
- V2WEB-007 Dedicated Pipeline View.
- V2WEB-008 Dashboard Command Center.
- V2WEB-009 Account Settings View.
- V2WEB-010 Relationship Review Center.
- V2WEB-011 Task Workbench Filters.
- V2WEB-012 Pipeline Workbench Filters.
- V2WEB-013 Operating Area Workbench Filters.
- V2WEB-014 Integration Matrix Filters.
- V2WEB-015 Google Drive Files Workbench Filters.
- V2WEB-016 API Workbench Filters.
- V2WEB-017 ClickUp List Tree Filters.
- V2WEB-018 Global Module Switcher.
- V2WEB-019 Relationship Review Filters.
- V2WEB-020 Main Operating Area Foundation.
