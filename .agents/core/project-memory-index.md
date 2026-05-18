# Project Memory Index

Last updated: 2026-05-19

## Purpose

This file is the mandatory full-picture protocol for agents. It prevents the
project from drifting into repeated small fixes with no clear release progress.
Every non-trivial task must connect local code changes to the current product
state, architecture intent, module confidence, and the next release objective.

## Required Indexes

Agents must keep these indexes current enough that another Codex session can
continue from repository files alone:

- `.codex/context/PROJECT_STATE.md`: where the project is now, current phase,
  validation commands, deployment shape, and known runtime reality.
- `.codex/context/TASK_BOARD.md`: canonical task queue with `NOW`, `NEXT`,
  blockers, and done evidence.
- `.agents/core/mission-control.md`: mission block rules for multi-hour
  autonomous work.
- `.agents/state/module-confidence-ledger.md`: module-by-module confidence,
  working state, evidence, and next proof or fix.
- `.agents/state/system-health.md`: latest validation, broken journeys, stale
  checks, and environment state.
- `.agents/state/known-issues.md`: real unresolved defects, not vague concerns.
- `.agents/state/next-steps.md`: next executable tasks in priority order.
- `docs/architecture/`: current architecture truth.
- `docs/modules/` or module maps when present: implementation ownership and
  surface maps.
- `docs/planning/`: release plan and task sequencing.
- `docs/operations/`: release, deploy, smoke, rollback, and target-environment
  evidence.
- `docs/ux/`: approved visual direction, design-system rules, reusable UX
  memory, and pattern guidance. As of 2026-05-17, Roost is the target brand
  direction for the LuckySparrow operating center: cinematic dark UI,
  outline-first modular surfaces, Inter typography, indigo/blue/cyan digital
  light, subtle glow, calm system motion, and human/AI operating-center
  language. The DaisyUI `roost` theme and Roost Tailwind/CSS tokens live in
  `web/src/styles.css` and `tailwind.config.mjs`. The earlier DaisyUI
  `companycore` theme remains the current compatibility default until a scoped
  visual migration has route-level proof. Phosphor Icons remains the installed
  primary icon family; Lucide/Heroicons are direction references only unless a
  future task approves another icon set. High-level dashboard and map work
  must still preserve the accepted Company City strategic-map direction unless
  a new decision supersedes it.
- `docs/ux/web-view-creation-rules.md`: authenticated module views are tools,
  not landing pages. Future web views must start from real backend-connected
  work controls, compact scope headers, filters/selectors, primary work areas,
  detail/preview panels, and recovery states. Avoid hero sections, generic KPI
  bands, decorative badges, and explanatory first-viewport copy unless they
  directly support an operator decision.
- `docs/ux/design-memory.md`: reusable UX decisions. As of 2026-05-18,
  management rosters should use deliberate Preview actions, row-local
  management controls, guarded destructive semantics, and detail-first selected
  state on mobile/tablet. Flat management indexes should start from the
  reusable `CcDataTable` pattern: one backend-backed object per row, compact
  operational columns, explicit scope chips such as People/Agents where useful,
  and a sticky action column instead of route-local card rosters or density
  toggles. As of 2026-05-19, `CcDataTable` is the managed table primitive for
  flat indexes: it owns the filter/settings zone, min-width table zone,
  pagination/page-size zone, search, generated fixed-value filters, sortable
  headers, column visibility, first-column selection, optional bulk actions,
  row action items, page input, and 10/25/50/100/250/500 page sizes. The
  People/Agents profile pattern now also uses a dependency-free Big Five radar
  visualization in workforce preview and edit contexts, paired with exact
  numeric trait bars.
- `docs/planning/foundation-p1-hardening-task-contract.md`: first P1
  hardening wave after the 2026-05-18 application foundation audit. It adds
  `npm run test:api:local`, route/capability drift validation inside
  `npm run validate`, compatible structured API error helper adoption for
  auth/API-key/central error paths, scoped-by-default owner API key creation,
  request IDs, security headers, and basic auth/API rate limits. Full API test
  execution is verified after recovering Docker Desktop: `npm run
  test:api:local` applied all 24 migrations against disposable PostgreSQL and
  passed 6/6 API subtests, then removed the validation container.
- `docs/planning/human-agent-web-architecture-map.md`: current V2
  human-agent web direction. As of 2026-05-14, `/react-agent-tools` exposes
  the owner-visible MCP tool surface, and `/react-company-os` includes the
  correlation timeline, operating graph detail, and workflow-grade command
  panel slices.
- `docs/architecture/company-os-definition-editing-contract.md`: Company OS
  definition editing safety contract. It classifies which definitions may use
  scoped CRUD, command routes, versioning, approval, or no raw editing. As of
  2026-05-14, `standards` has the first Class A backend write contract through
  `company-os:definition:write`; the narrow web editor is implemented and
  verified.
- `docs/architecture/company-os-workflow-definition-command-contract.md`:
  workflow definition command/version contract. It blocks raw CRUD over active
  processes, pipelines, stages, procedures, and steps, and defines draft,
  impact preview, approval, activation, archive, rollback, evidence, and MCP
  exposure requirements. As of 2026-05-14, V2WEB-AGENT-009 implemented
  draft/update/impact-preview backend commands, V2WEB-AGENT-010 implemented
  approval-aware procedure activation, V2WEB-AGENT-011 added process and
  pipeline versioning plus activation, V2WEB-AGENT-012 added the guarded web
  surface for workflow draft create, impact preview, approval request, and
  activation gating, V2WEB-AGENT-013 selected draft history/readback before
  archive/rollback, V2WEB-AGENT-014 added guarded draft list/detail readback
  plus draft-only resume in `/react-company-os`, and V2WEB-AGENT-015 selected
  phased recovery commands: inactive historical-version archive first, then
  rollback-draft creation through existing preview and activation.
  V2WEB-AGENT-016 implemented the inactive historical-version archive backend
  command, and V2WEB-AGENT-017 implemented rollback-draft creation without
  direct rollback execution. V2WEB-AGENT-018 selected a dedicated web recovery
  panel, and V2WEB-AGENT-019 implemented `/react-company-os` recovery controls.
  V2WEB-AGENT-020/021 selected and implemented explicit `family_id` lineage on
  process, pipeline, and procedure roots so rollback-draft creation works
  across renamed historical versions. V2WEB-AGENT-022 fixed Company OS
  collection fetch paths, V2WEB-AGENT-023 proved the full UI recovery flow
  through inline approval decision and activation, and V2WEB-AGENT-024 repeated
  that flow against a migrated Docker Compose backend.
- `docs/architecture/organizational-architecture-bridge.md`: accepted
  long-term AI-first CompanyCore direction. As of 2026-05-15, CompanyCore is
  intended to become an organizational operating system and graph that connects
  humans, AI agents, vertical hierarchy, horizontal APQC-style process flow,
  MECE responsibility ownership, PAEI behavior profiles, governance, workflows,
  knowledge, resources, KPIs, audit, decisions, web/mobile clients, MCP, and
  Paperclip. Future work must reuse existing Company OS and operating-model
  tables before adding duplicate target-named tables. As of 2026-05-15,
  Paperclip's minimum company-building direction is also recorded there:
  CompanyCore remains a non-embedded-AI operating app, while external agents use
  API/MCP layers for Intent, Knowledge, Planning and orchestration, Tools,
  Access and autonomy, and Audit and feedback. Future Paperclip work should
  first close the business-plan/context-to-task loop through existing
  knowledge, task, ClickUp, MCP, event, approval, and audit foundations.
- `docs/architecture/unified-organizational-operating-system.md`: accepted
  unified organizational operating-system direction. As of 2026-05-16,
  CompanyCore remains non-AI organizational infrastructure, while humans and
  AI agents are both target workforce members inside one organizational model.
  The architecture now explicitly covers unified workforce membership,
  human/agent profiles, rank and role hierarchy, supervisor relationships,
  contextual visibility, recursive delegation/escalation/reporting, richer
  task lifecycle direction, and MCP/API-first organizational world-state
  exposure. Future implementation must first audit and extend current
  `users`, `agents`, `company_roles`, `business_functions`, tasks, workflow,
  approval, event, audit, API, and MCP foundations before adding broad new
  workforce or permission tables. As of 2026-05-17,
  `DMS-06-WORKFORCE-001` adds the first scoped workforce table:
  `workforce_entities`. It powers `/v1/workforce` and
  `/areas?area=06-kadry&view=directory` as a unified human/AI roster with
  generated `agent.md`, `personality.md`, and `environment.md` resources plus a
  manual Paperclip sync outbox event. It does not replace `users`, human auth,
  existing `agents`, service keys, or future RBAC/skills contracts.
  As of 2026-05-18, `PEOPLE-AGENTS-PAPERCLIP-001` extends that foundation with
  Paperclip director source-of-truth fields: hierarchy level, Big Five,
  skill/knowledge/tool indexes, authority scope, and Paperclip runtime profile.
  Seed upserts the 13 director agents from Paperclip (00 AIA plus 01-12
  department directors), links 01-12 to 00 AIA, archives old non-director seed
  workforce agents, and keeps CompanyCore/Roost as the source of truth for the
  generated markdown context. The Directory roster now defaults to active
  records and exposes director, manager, runtime, Big Five, and access-index
  scanning. The follow-up Directory table refinement moves the roster onto
  shared `CcDataTable`, removes duplicate type/density controls, and records
  sticky row actions as the reusable flat management-index pattern.
- `docs/architecture/autonomous-company-operating-system.md`: accepted
  explicit architecture boundary from 2026-05-16. CompanyCore is the company
  operating system, not an embedded AI system. Humans use responsive web UI;
  AI agents use API/MCP as external clients. Backend modules must not become
  chatbots, personality engines, monolithic AI orchestrators, or raw provider
  bypasses. The active near-term product loop is `00 Main -> 04 Operations ->
  08 Assets`, supported by shared Tailwind/DaisyUI component primitives and
  scoped task contracts.
- `docs/planning/cc-ui-001-shared-component-inventory.md`,
  `docs/planning/cc-00-001-route-proposal-lifecycle-readback-plan.md`,
  `docs/planning/cc-04-001-operations-task-model-gap-audit.md`, and
  `docs/planning/cc-08-001-assets-resource-system-spec.md`: completed first
  planning/analysis checkpoint for the owner-approved `00 Main -> 04
  Operations -> 08 Assets` loop. These files define shared UI primitive
  requirements, route proposal readback, Operations task model gaps, and the
  first Assets/resource board/read-packet contract. Next runtime work starts
  with `CC-UI-002`, then `CC-UI-003`, `CC-00-002`, `CC-04-002`, and
  `CC-08-002`. As of the same date, `CC-UI-002` has implemented the first
  shared runtime primitive, `CcButton`, in `web/src/components/cc-button.tsx`;
  future UI work should reuse it instead of direct DaisyUI button markup.
  `CC-UI-003` has also implemented `CcDataTable` in
  `web/src/components/cc-data-table.tsx`; future record/table views should use
  that primitive directly. `WEB-CORE-001` later removed the unused historical
  `web/src/react-route-kit.tsx` from the active web layer.
  `CC-00-002` has implemented verified read-only route proposal lifecycle
  readback at `GET /v1/intake/route-proposals`, exposed through `intake:read`
  and MCP as a read-risk tool. `CC-04-002` has implemented verified read-only
  Operations work item readback at `GET /v1/operations/work-items`, exposed
  through `operations:read` and MCP as a read-risk tool. `CC-08-002` has
  implemented verified read-only Assets context readback at
  `GET /v1/assets/context`, exposed through `assets:read` and MCP as a
  read-risk tool. `CC-UI-004` has completed the first selected-area UI
  adoption checkpoint: `00 Main`, `04 Operations`, and `08 Assets` consume
  those verified packets using shared `CcDataTable`/`CcButton` paths, with
  web build and desktop/mobile rendered proof. `CC-AUDIT-001` then audited the
  three priority sections against the accepted architecture and fixed the main
  UX/routing mismatch: successful auth and `/dashboard` now open
  `/areas?area=00-ogolny&view=overview`, making `00 Ogolny` the post-login
  company dashboard while keeping `/dashboard` as a compatibility alias. Next
  WEB-CORE-001 narrowed the active React web runtime to public home, auth,
  `00 General`, `04 Operations`, and `08 Assets` only. Old private web paths
  such as settings, data, relationships, tasks, pipeline, Company OS cockpit,
  and MCP catalog are no longer React app routes; backend APIs remain
  available for future rebuilds. `WEB-QA-AUDIT-001` then audited the cleaned
  web foundation. The current base is production-testable, but future
  department expansion must first implement `WEB-QA-001`: default-English i18n
  with a persistent language selector and Polish dictionary path, shared
  user-facing API error mapping, shared form field/validation primitives, and
  centralized notice/action feedback. Next V1 department work should start
  from `05 Relationships` only after that quality slice, through a scoped
  department-system task contract unless deployment smoke is selected first.
  ASSETS-FILES-003 has since deepened `08 Assets -> Files and folders` into a
  content-first workbench: Assets context exposes bounded preview text and
  structured preview metadata, Google Drive media extraction handles normal
  text/Markdown/CSV/JSON files, and editable text-file media uses the explicit
  `/v1/google-drive/files/:id/text-content` provider command instead of raw
  snapshot/table mutation. OPS-ASSETS-POLISH-001 then improved daily-use
  quality across `04 Operations` and `08 Assets`: undated tasks remain visible
  in Calendar, `Today` opens the day view, empty list selection has a clear
  state, and Assets cards/preview panels prioritize typed content previews and
  primary file actions. OPS-ASSETS-REFINE-002 then added shared selector
  search/no-match states, Calendar Workflow access and empty-selection parity,
  and Assets resource path/source/depth context beside file previews.
  OPS-ASSETS-DENSE-003 then added shared task search/priority filtering across
  Tasks and Calendar plus Assets file/folder card sorting by name, modified
  date, type, or source. OPS-ASSETS-FILTER-004 added recoverable
  filtered-empty states and clear-filter actions for Operations Tasks,
  Operations Calendar, and Assets Files/Folders. OPS-ASSETS-SMART-005 added
  shared Operations due-date scopes across Tasks/Calendar plus Assets preview
  type filtering for folders, Markdown, CSV, JSON, images, PDF, text, and
  unsupported files. ASSETS-IMAGE-PREVIEW-004 then fixed Drive image rendering
  by adding an authenticated `assets:read` preview route and frontend blob
  renderer, so images no longer rely on direct public Drive URLs. Build,
  validate, schema validation, and mocked Playwright proof passed on
  2026-05-17. ASSETS-FILES-PREMIUM-005 then polished the same workbench with
  useful one-click type filters, visible scope counts, folder path context on
  cards, and typed folder-tree icons. `npm run build:web`, `npm run validate`,
  `git diff --check`, and Playwright fallback proof passed on 2026-05-17.
  ASSETS-GDRIVE-006 then fixed a likely real-data coverage gap: Assets context
  now fetches Drive folders and non-folder Drive files separately, accepts a
  1000-item cap, the web workbench requests `limit=1000`, selected-folder
  import scans up to 50 pages per folder by default, and import refreshes
  Markdown/CSV/JSON/text snapshots through the shared Google Drive text-file
  predicate. Build, validation, schema validation, and diff hygiene passed;
  full API test execution still needs a configured validation PostgreSQL
  database.
- `docs/planning/web-foundation-quality-audit-2026-05-16.md` and
  `docs/planning/web-foundation-quality-audit-task-contract.md`: active web
  foundation quality audit. It reviewed `web/src/main.tsx`,
  `web/src/app-route-registry.ts`, `web/src/components/cc-button.tsx`,
  `web/src/components/cc-data-table.tsx`, `web/src/styles.css`, and
  `src/app.ts`, then ran Playwright fallback proof on a temporary mocked API
  server plus `npm run build:web` and `npm run build:server`. The audit found
  no route-scope blocker, no mobile overflow in the checked active path, and
  no unnamed visible controls, but it found P1 gaps for i18n, raw auth error
  codes, native-only form validation, and decentralized feedback. Treat
  `WEB-QA-001` as the next web foundation implementation before new
  department screens.
- `docs/planning/web-qa-001-implementation-plan.md` and
  `docs/planning/web-qa-001-task-contract.md`: READY implementation handoff
  for the web foundation slice. As of 2026-05-16, WEB-QA-001 is implemented
  and verified. Active React web has `web/src/i18n` English/Polish
  dictionaries, selectable/persisted locale, `<html lang>` sync,
  `web/src/api` typed errors, user-facing auth and packet error mapping,
  `CcNotice`, `CcField`, `CcTextInput`, localized auth validation, translated
  `CcDataTable` state labels, and a layout/auth/public/department/API module
  split. `main.tsx` now owns provider wrapping and route selection only.
  Browser home smoke passed; Browser form fill failed on email input, so
  Playwright fallback completed the interaction proof. Future department UI
  should reuse this foundation. A 2026-05-16 post-implementation audit is
  recorded in
  `docs/planning/web-qa-001-post-implementation-audit-2026-05-16.md`; it fixed
  locale contract extraction, planned department label localization, and API
  error normalization for string, nested, and backend `internal_server_error`
  payloads, then passed Browser, Playwright, build, and validation gates.
- `docs/planning/web-sidebar-foundation-audit-2026-05-16.md`: verified the
  authenticated sidebar foundation. `web/src/layout/shell.tsx` renders the
  CompanyCore logo/name, company/workspace selector, all `00`-`12`
  departments, disabled planned departments, active `00/04/08` module links,
  and separate expand arrows for active module view lists. Future department
  views should extend `web/src/features/departments/core-area-data.ts` plus the
  route registry through scoped task contracts.
- `docs/planning/web-shell-user-settings-operations-tasks-task-contract.md`:
  verified the next active web shell slice. The header now uses a user dropdown
  instead of department buttons, language selection sits in the authenticated
  footer with LuckySparrow attribution, workspace settings is reachable next to
  the workspace selector, `/account/settings` and `/workspace/settings` are
  private React routes, sidebar department labels hide visible numeric
  prefixes while preserving canonical order, and `04 Operations -> Tasks`
  renders real work-item records from `/v1/operations/work-items`. Production
  was manually rolled over to commit
  `02f86b613b5d69d282f554cf465e5688b251a5c0` after GitHub-to-Coolify did not
  update the running image automatically.
- `docs/planning/operations-management-board-implementation-task-contract.md`:
  verified the first Operations work-management board. `GET
  /v1/operations/work-items` now returns task lists, canonical CompanyCore
  status columns, and optional `taskListId` filtering. `PATCH
  /v1/operations/work-items/:id` updates the CompanyCore Operations work item
  through a domain adapter and reuses ClickUp writeback for ClickUp-sourced
  tasks. The web route `/areas?area=04-operacje&view=tasks` renders a
  ClickUp-like list selector, status columns, task cards, and modal edit form
  without exposing raw database table editing as the user or MCP mental model.
  `npm run validate`, API regression on PostgreSQL `127.0.0.1:55511`, and
  desktop/mobile Playwright fallback proof passed.
- `docs/planning/operations-management-board-ux-polish-task-contract.md`:
  verified the Operations board usability polish after owner review. The
  authenticated shell content is full width, the sidebar is sticky and
  independently scrollable, active sidebar subviews track the query-string
  view, `04 Operations -> Tasks` starts with `All`, status lanes have stable
  horizontal board scrolling, task cards show visual priority/due/readiness
  signals, task modal context is richer, technical blocked-action diagnostics
  are no longer shown as owner board panels, and `04 Operations -> Calendar`
  is available. `npm run build:web` and Playwright fallback desktop/mobile
  render proof passed.
- `docs/planning/operations-management-center-deepening-task-contract.md`:
  records the latest Operations management center checkpoint. `Tasks` is now
  the canonical `04 Operations` work view, the active duplicate Operations
  overview is removed from web route metadata, task lists are grouped by
  department with unassigned lists below, `PATCH /v1/operations/task-lists/:id`
  edits list metadata and department assignment through the Operations domain,
  task cards can be drag/dropped between canonical status lanes, and Calendar
  has day/week/month modes. `npm run validate` and Playwright fallback proof
  passed; API integration proof is pending rerun because local Docker/Postgres
  commands timed out during this checkpoint.
- `docs/planning/operations-canonical-department-filtering-task-contract.md`:
  records the Operations canonical department filtering checkpoint. Owner UI
  assignment and filters now use the sidebar's `00`-`12` department model
  instead of legacy backend operating-area names. Backend mappings preserve
  compatibility by resolving `departmentKey` to an operating area and storing
  the explicit canonical key in mapping raw payload.
- `docs/architecture/companycore-business-module-map.md`: accepted
  model-level module map for scaling CompanyCore as the bridge for operating
  the company. It classifies future work as native core, provider-backed,
  future adapter, or derived view, and defines canonical modules for the
  company graph, goals, work/tasks, processes/pipelines, runtime evidence,
  knowledge, storage/documents, CRM, resources, integrations, agents/MCP,
  governance, and metrics. Future UI/API/MCP work should derive from this map
  before adding new schema, provider-specific surfaces, or agent tools.
- `docs/architecture/companycore-global-business-flow.md`: accepted global
  business value-flow model. As of 2026-05-16, CompanyCore has one central
  pipeline for products, services, and hybrid delivery:
  strategic intent -> brand/market -> demand -> lead qualification ->
  discovery -> offer/agreement -> delivery planning -> product/service
  execution -> quality/acceptance -> payment -> support -> feedback ->
  improvement -> next intent. Future CRM, marketing, delivery, finance,
  feedback, AI, graph, and dashboard work should derive scoped tasks from this
  flow before adding runtime surfaces.
- `docs/architecture/department-management-systems-architecture.md` and
  `docs/ux/v1-department-management-systems-view-map.md`: accepted V1
  department management-system direction. As of 2026-05-16, every 00-12
  Company Atlas area should be treated as a department management system with
  subsystems over shared CompanyCore tables, pipelines, tasks, knowledge,
  resources, metrics, decisions, governance, and AI/MCP tools. Future
  department UI or Paperclip work should use
  `docs/ux/v1-department-system-prompt-pack.md` before generating specs or
  implementation tasks. DMS-OPS-001 is the first concrete implementation:
  `/areas?area=04-operacje&view=overview` adds a read-only Operations
  Management System board for planning, routines, controls, dependencies,
  approvals, and agent-safe handoff. It is build-verified and has
  desktop/mobile authenticated mocked-owner proof under `docs/ux/evidence/`.
  As of DMS-04-001, local database-backed proof is also complete:
  `/areas?area=04-operacje&view=overview` loaded real Company OS business
  function, procedure, procedure-step, approval, and dependency records after
  the shared React table-record loader was aligned with the existing
  `company-os:read` capability. Production route smoke for the deployed V1
  bundle is now covered by V1OPS-002.
  As of V1COS-001, `/react-company-os` also includes an area-aware department
  control map before the existing Company OS command/evidence panels. It lets
  the owner select any `00`-`12` management system and inspect subsystem
  purpose, mapped backend tables, agent handoff, first safe action, and
  blocked actions without adding new API or write authority. Local
  real-backend proof passed on `http://127.0.0.1:3219` with screenshots in
  `docs/ux/evidence/v1-company-os-area-foundation-*.png`.
  As of V1OPS-002, that foundation is also verified in production. The manual
  VPS rollover deployed commit `5f1fc71e44d09cb1780d29b2579c85023205efb9` to
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71`; public web/API health
  reported the expected commit and image. Authenticated production proof
  covered `/operations`, `/tasks-adapter`, `/data`,
  `/areas?area=04-operacje&view=overview`, `/settings/drive`, and
  `/react-company-os?area=04-operacje`; the direct AOG read for
  `01-strategia` returned `strategy-governance` with `27` nodes and `32`
  edges. Evidence lives in
  `docs/ux/evidence/production-v1-5f1fc71-2026-05-16/`.
  As of V1OPS-003, backend department-key compatibility is centralized in
  `src/operating-model/department-registry.ts`. AOG and global intake now use
  the same canonical `00`-`12` vocabulary, so `03-sprzedaz` resolves to
  `sales-crm`, `07-finanse` resolves to `finance-billing`, intake suggestions
  emit canonical keys, and non-canonical command inputs still fail closed.
  `npm run test:api` passed on validation-owned PostgreSQL `127.0.0.1:55494`.
  As of V1OPS-004, `GET /v1/operations/context` provides the read-only
  backend packet for `04 Operations`: procedures, procedure steps, approvals,
  dependencies, business functions, operational tasks, summary counts, allowed
  read actions, and blocked write actions. It is exposed through
  `operations:read` and MCP. `npm run test:api` passed on validation-owned
  PostgreSQL `127.0.0.1:55495`; production smoke remains pending after deploy.
  As of V1OPS-005, that operations context is deployed and verified in
  production at commit `9ff18820cb00bb2164904b947c2ef2a48e5d3b14`. Public
  web/API health reported the expected commit and protected
  `/v1/operations/context` returned `04-operacje`,
  `operations-administration`, `summary.procedures=7`,
  `agentPacket.mode=read_only`, and `blockedActions=4`. Previous backend
  `5f1fc71` is retained stopped as rollback.
  As of DMS-01-005A, `GET /v1/strategy/context` provides the read-only backend
  packet for `01 Strategy`: goals, targets, metrics, risks/controls, decision
  logs, decisions, strategic knowledge, Drive documents, strategic tasks,
  summary counts, allowed read actions, and blocked strategy-write actions. It
  is exposed through `strategy:read` and MCP. `npm run build:server`,
  `npm run test:api` passed on validation-owned PostgreSQL
  `127.0.0.1:55496`, and `git diff --check` passed. As of DMS-01-005B, that
  strategy context is deployed and verified in production at commit
  `5db4dd8b1fe9058d1fc78ebc957c0716ebd4822a`. Public web/API health reported
  the expected commit and protected `/v1/strategy/context` returned
  `01-strategia`, `strategy-governance`, `summary.activeMetrics=1`,
  `summary.activeRisks=1`, `agentPacket.mode=read_only`, and
  `blockedActions=4`. Previous backend `9ff1882` is retained stopped as
  rollback.
  As of DMS-V1-005, the V1 department assumption is differentiated systems,
  not identical repeated screens. Future department work must keep the shared
  CompanyCore shell, route model, auth, evidence, MCP, and safety primitives,
  but each of the 12 operating departments must define its own primary board,
  desktop layout, mobile attention queue, state model, source records, and
  Paperclip boundaries before implementation.
  As of DMS-V1-006,
  `docs/planning/dms-13-systems-v1-implementation-audit.md` is the current
  implementation audit for `00 Main` plus departments `01`-`12`. It maps each
  system to existing backend foundations, current web readiness, V1
  desktop/mobile expectations, backend gaps, Paperclip role, blocked actions,
  and first implementation slice. Future runtime work should cite the
  relevant audit section; the recommended next slice is `03 Sales` read
  packet and board, with all quote, discount, invoice, ad, and autonomous
  outreach writes still blocked.
  As of DMS-03-006, `03 Sales` has its first verified read-only management
  slice. `GET /v1/sales/context` returns a Sales Management packet over
  existing CRM, pipeline, interaction, notes, commercial exception, Finance
  handoff, task, and Drive evidence with explicit blocked quote, discount,
  invoice, ad, and autonomous outreach actions. The selected-area web route
  `/areas?area=03-sprzedaz&view=overview` renders the dedicated Sales board
  from that packet. Validation passed with server/web builds, API regression
  on validation-owned PostgreSQL `127.0.0.1:55497`, and desktop/mobile
  Playwright proof with screenshots in `docs/ux/evidence/dms-03-sales-board-*.png`.
- `docs/architecture/department-management-systems-v1-blueprint.md`:
  detailed V1 blueprint for `00 Main` plus the 12 operating department
  management systems. As of 2026-05-16, future department work should use this
  blueprint to define each system's purpose, subsystems, backend foundations,
  backend gaps, first safe implementation slice, Paperclip/agent packet,
  implementation wave, and guardrails. It also records the recommended build
  order: deepen `04 Operations`, then build read-only `01 Strategy`,
  `03 Sales`, `05 Relationships`, `02 Product And Delivery`, `08 Assets`,
  `09 Technology/AI`, `10 Legal/Standards`, `12 Executive`, `07 Finance`,
  `06 People/Agents`, and `11 Innovation/Growth`. User feedback on
  2026-05-16 renamed `06` from people-only framing to People/Agents and Roles
  so CompanyCore can manage human roles, AI-agent units, capacity, authority,
  escalation, hiring, and Paperclip agent-roster reconciliation in one place.
- `docs/planning/v1-department-systems-global-implementation-plan.md`: active
  global execution program for V1 department systems. As of 2026-05-16, it
  breaks the work into waves for global intake/Paperclip review, shared
  department shell, all department systems, pricing and discount context,
  archived-client learning, feedback loops, Paperclip proposal/evidence
  integration, QA, production smoke, and closeout. Future DMS implementation
  should pick scoped tasks from this plan rather than inventing ad hoc route
  work.
- `docs/planning/production-google-drive-index-paperclip-access-audit-task-contract.md`:
  production Drive/Paperclip evidence. As of 2026-05-16, production Google
  Drive selected-scope import and index repair are verified through protected
  CompanyCore APIs: final readback has `754` Drive records, `0` unassigned,
  `0` pending, `0` failed, `0` trashed, and `inspect_only` reports
  `wouldCreateCount=0` across the 13 selected roots. MCP exposes 15 Google
  Drive tools, and the active Paperclip Tools bridge includes Google Drive
  read/write/scope/import/reconcile scopes. Follow-up proof closed both KI-009
  and KI-010: `changes/reconcile` now initializes a first-run baseline in
  production, and Paperclip runtime `company_core_settings` has working
  knowledge/tools keys that can call CompanyCore and see Drive files. If a
  named Paperclip agent still misses files, inspect agent-level tool assignment
  or UI filters rather than rotating the global bridge key.
- `docs/planning/prod-google-drive-changes-baseline-task-contract.md`:
  implementation checkpoint for KI-009. As of 2026-05-16, the local backend
  initializes a missing Google Drive `changesPageToken` through Drive
  `changes/startPageToken`, stores the token, emits existing reconcile
  evidence, and returns `baselineInitialized=true` with zero processed changes.
  `npm run build:server`, `git diff --check`, and `npm run test:api` passed on
  portable PostgreSQL `127.0.0.1:55490`. The commit was manually rolled over
  to production as
  `rnqqkhl3o3dut4qv56mlxly2_backend:d2c9b9460a5db63703ca28f98988a2fa35d3a651`;
  public health reports that commit. First protected production reconcile
  initialized `newStartPageToken=25137`; second reconcile returned `200`
  through the stored-token path.
- `docs/planning/dms-00-global-intake-paperclip-review-contract.md`: active
  DMS-00 planning contract. It defines `00 Main` as the global intake and
  Paperclip output review surface, reusing AgentEventOutbox, provider inbox,
  CompanyCore events, tasks, Drive files, provider mappings, relationship
  graph, Company OS records, and MCP profiles. Future runtime work should
  start with DMS-00-002 source audit, then implement a read-only intake
  aggregate before write/review commands.
- `docs/planning/dms-00-intake-source-audit.md`: DMS-00 source audit and
  implementation handoff. It confirms the first global intake read model can
  reuse existing AgentEventOutbox, ProviderEventInbox, Event, Task,
  GoogleDriveFile, ExternalContainerMapping, ExternalFieldMapping, relationship
  review, approvals, risks, notes, decisions, and MCP/agent data without a
  migration. The selected first route is `GET /v1/intake`; reading intake must
  not acknowledge agent events or mutate provider state.
- `docs/planning/dms-00-global-intake-read-api-task-contract.md`: DMS-00
  backend runtime handoff. As of 2026-05-16, protected read-only
  `GET /v1/intake` exists and is exposed as `intake:read` through the adapter
  manifest, MCP manifest, and MCP-oriented agent profiles. It normalizes
  existing agent, provider, unassigned resource, approval, risk, task, and
  event records into one `00 Main` queue. `npm run test:api` passed against
  workspace-local PostgreSQL on `127.0.0.1:55476` using the existing
  `postgres` database. Web consumption is tracked by DMS-00-004.
- `docs/planning/dms-00-global-intake-web-panel-task-contract.md`: DMS-00
  owner-facing web handoff. As of 2026-05-16,
  `/areas?area=00-ogolny&view=overview` renders a read-only `00 Main`
  management panel over `/v1/intake`, including intake/MCP readiness, summary
  metrics, quick filters, owner-decision, Paperclip/agent,
  unassigned-resource, and risk/blocker queues. `npm run build:web`,
  `npm run build:server`, and Playwright real-backend proof on
  `http://127.0.0.1:3192` passed. The next safe step is a command contract for
  classify/route proposals; do not add acknowledge, approval, invoice,
  discount, delete, or provider-write actions without that contract.
- `docs/planning/dms-00-global-intake-classify-route-command-contract.md`:
  DMS-00 first write-boundary handoff. As of 2026-05-16, the selected future
  command is proposal-only `POST /v1/intake/actions/propose-route`. It may
  create auditable route/classification proposal evidence and optional owner
  follow-up work, but it must not acknowledge agent events, retry providers,
  approve work, mutate provider scope, invoice, discount, delete, or execute
  legal/ads changes. DMS-00-006 should implement this command with source
  allowlisting, canonical department validation, idempotency, API tests, and
  browser proof.
- `docs/planning/dms-00-global-intake-route-command-task-contract.md`: DMS-00
  first proposal-command implementation handoff. As of 2026-05-16,
  `POST /v1/intake/actions/propose-route` exists, creates proposal evidence
  through `Decision`, `AuditLog`, `Event`, and optional `Task`, and is exposed
  through `intake:write` in the HTTP/MCP capability map. The `00 Main` web
  panel has a `Propose route` action that normalizes old inferred department
  hints into canonical `00`-`12` keys. API tests and Playwright proof passed;
  the command still deliberately leaves source systems unchanged.
- `docs/planning/dms-money-pricing-discount-source-inventory.md`: active
  pricing and discount source handoff for Sales, Finance, Relationships,
  Innovation, and Paperclip. As of 2026-05-16, Google Drive source review
  found a strategic `499 CHF/month` Start model, a benchmarked hybrid
  `1500 CHF setup + 150 CHF/month` model, pure subscription analysis, and
  older Polish project pricing of `1700/2200 PLN`. These are not resolved into
  one canonical price policy yet. The current-client `100%` discount must be
  represented as a commercial exception with owner approval, not as missing
  revenue. Direct ClickUp source review is blocked until a callable ClickUp
  read/search tool or owner export is available. Future work should start with
  DMS-07-001 Finance spec, DMS-07-002 price-list/hourly-value read model,
  DMS-03-005 discount/commercial exception read model, and DMS-05-002 archived
  client source audit.
- `docs/planning/dms-07-finance-system-spec.md`: active Finance Management
  System handoff. As of 2026-05-16, DMS-07-001 defines the first safe Finance
  board, web shape, protected read-only `GET /v1/finance/context` target,
  pricing-model packet, hourly-value assumptions, work valuation,
  commercial-exception shape, invoice-readiness blockers, owner decisions,
  Paperclip packet, and blocked invoice/payment/discount/autonomous-pricing
  actions. Future Finance runtime should start with DMS-07-002 read-only
  pricing/hourly-value context or DMS-03-005 commercial exception read model;
  do not add invoice/payment or discount writes before their command contracts.
- `docs/planning/dms-07-finance-context-read-api-task-contract.md`: Finance
  context runtime handoff. As of 2026-05-16, DMS-07-002 implements protected
  read-only `GET /v1/finance/context`, exposes `finance:read` through
  capabilities, MCP, and agent key profiles, and verifies candidate pricing
  conflicts, `150 CHF/hour`, commercial exception inclusion, invoice blockers,
  workspace isolation, scoped-key denial, no-mutation reads, and blocked
  finance actions through `npm run test:api` on portable PostgreSQL
  `127.0.0.1:55482`. Future Finance web must consume this read model first
  and keep write actions blocked until separate command contracts exist.
- `docs/planning/dms-00-paperclip-background-output-review-proof.md`:
  Paperclip background-output review proof. As of 2026-05-16, DMS-00-007
  records the safe loop from Paperclip-like `AgentEventOutbox` through
  `GET /v1/intake`, `POST /v1/intake/actions/propose-route`, proposal
  evidence, optional department review task, and unchanged source delivery
  status. Existing API regression coverage passed again during DMS-07-002 on
  portable PostgreSQL `127.0.0.1:55482`. Repeat a fresh desktop/mobile visual
  proof before final UI signoff.
- `docs/planning/dms-shell-003-department-data-backbone-task-contract.md`:
  shared department-shell data backbone handoff. As of 2026-05-16,
  `DepartmentDataBackbone` renders graph readiness, table/record context,
  knowledge/source count, review gaps, and fallback text inside the shared
  selected-area shell. `npm run build:web`, `git diff --check`, and
  Playwright proof on `http://127.0.0.1:3212` verified `01`, `07`, and `12`
  desktop/mobile with no console/page errors or horizontal overflow.
- `docs/planning/dms-07-finance-web-board-task-contract.md`: Finance web
  board handoff. As of 2026-05-16, `/areas?area=07-finanse&view=overview`
  renders `FinanceManagementBoard` from `GET /v1/finance/context`, showing
  pricing candidates, `150 CHF/hour`, commercial exceptions, invoice blockers,
  source conflicts, and blocked finance actions. `npm run build:web`,
  `git diff --check`, and Playwright proof on `http://127.0.0.1:3213`
  verified desktop/mobile with no console/page errors or horizontal overflow.
  Finance writes remain blocked.
- `docs/planning/dms-03-commercial-exception-read-model-spec.md`: active
  Sales/Finance commercial exception handoff. As of 2026-05-16, DMS-03-005
  defines protected read-only `GET /v1/commercial-exceptions`, exception packet
  fields, status and derivation rules, current-client `100%` discount
  requirements, Paperclip guardrails, blocked discount/invoice/payment actions,
  and DMS-03-005A backend API handoff. Future implementation should derive
  candidates from existing approvals, decisions, deals, tasks, notes,
  interactions, risks, and intake/agent proposals without mutating sources.
- `docs/planning/dms-03-commercial-exception-read-api-task-contract.md`:
  commercial exception runtime handoff. As of 2026-05-16, DMS-03-005A
  implements protected read-only `GET /v1/commercial-exceptions`, exposes
  `commercial-exceptions:read` through capabilities, MCP, and agent key
  profiles, and verifies auth, scoped-key denial, workspace isolation,
  no-mutation reads, `100%` discount packet math, missing-source status, and
  blocked discount/invoice/payment/final-term actions through
  `npm run test:api` on portable PostgreSQL `127.0.0.1:55481`. Future work
  should continue with DMS-07-002 read-only Finance context before web panels
  or finance write commands.
- `docs/planning/dms-shell-001-shared-department-management-shell-task-contract.md`:
  active shared-shell handoff. As of 2026-05-16, selected-area department
  routes render through `DepartmentManagementShell`, with
  `DepartmentImprovementLoop` visible for feedback, defects, standards, and
  next work. `00 Main` intake and `04 Operations` remain special panels inside
  the shared shell. `npm run build:web`, `git diff --check`, and static SPA
  Playwright proof for desktop `00`, `01`, `04` plus mobile `04` passed. The
  next shell step is DMS-SHELL-002: department-specific subsystem registry and
  copy for `00`-`12`.
- `docs/planning/dms-shell-002-department-subsystem-registry-task-contract.md`:
  department subsystem registry handoff. As of 2026-05-16, every `00`-`12`
  selected-area shell has static management-system identity, value role, owner
  question, first safe action, agent handoff, blocked actions, and subsystem
  cards through `departmentSystemRegistry` and `DepartmentSubsystemRegistry`.
  `06 Kadry` is People/Agents And Role Management System. Browser proof passed
  for representative departments; backend department packets remain future
  scope.
- `docs/architecture/web-layer-react-ownership.md`: current web route
  ownership contract. As of 2026-05-15, user-facing web routes are React-owned
  and served from the Vite bundle in `public/react/index.html`. The legacy
  vanilla owner console files under `public/` are removed from active runtime
  ownership. As of CC-AUDIT-001, `/areas?area=00-ogolny&view=overview` is the
  canonical authenticated post-login route and `/dashboard` is a compatibility
  alias. `web/src/app-route-registry.ts` is the React route metadata source for
  groups, aliases, shell navigation, and post-auth redirect normalization.
  `/areas` remains the all-areas workbench, while
  `/areas?area=:areaKey&view=:viewId` is the canonical selected-department
  drill-down. As of V1AREA-003, selected-department capability tabs render
  area-scoped boards for goals, workflows, tasks, knowledge, resources,
  decisions, AI, and add-view planning from existing backend data. Future web
  slices must extend `web/src/` and the route registry instead of
  reintroducing page-local vanilla scripts or duplicated sidebar route maps.
- `docs/planning/v1-area-operating-graph-backend-gap-plan.md` and
  `docs/planning/aog-be-001-area-operating-graph-read-api-task-contract.md`:
  current backend connectivity source for the V1 selected-department operating
  room. As of 2026-05-15, AOG-BE-001 is locally verified: the protected
  `GET /v1/operating-graph/areas/:areaKey` aggregate exists, selected-area
  React consumption has fallback behavior, MCP exposes `operating-graph:read`,
  and `npm run test:api` passed against workspace-local PostgreSQL on
  `127.0.0.1:55476`. Future graph work should deploy/smoke the read aggregate
  first, then evaluate `Target.metricId`, goal/workflow bridges,
  workflow-task link normalization, knowledge/source link commands, and MCP
  read tooling.
- `docs/ux/v1-web-view-index-2026-05-15.md`: current V1 web UX maturity
  index. It marks `/dashboard`, `/areas?area=:areaKey&view=:viewId`, unified
  settings, `/operations`, and `/tasks-adapter` as V1 canonical. `/operations`
  is the owner supervision cockpit for clients, tasks, department files/tables,
  and AI-agent handoff. `/tasks-adapter` is the V1 tasks and delivery
  workbench for execution pressure, task create/status movement, department
  delivery-table coverage, and AI handoff readiness. Both are derived views
  over existing contracts with real backend proof. V1PROD-001/V1PROD-003
  capture production parity status for earlier V1 surfaces; operations/tasks
  production smoke remains a follow-up after deploy. Future web UX tasks should
  update this index when route maturity or production parity changes.
- `docs/planning/v1-operations-cockpit-task-contract.md`: current task and
  evidence source for V1OPS-001. As of 2026-05-16, `/operations` is locally
  verified through build, validate, API tests, and real backend Playwright
  proof that created client/task records and captured responsive screenshots.
  Future work should deepen downstream `tasks-adapter`, `data`, or
  `relationships` capability routes instead of making `/operations` a raw
  everything-editor.
- `docs/planning/v1-tasks-delivery-workbench-task-contract.md`: current task
  and evidence source for V1TASKS-001. As of 2026-05-16, `/tasks-adapter` is
  locally verified through build, validate, API tests, diff hygiene, and real
  backend Playwright proof that created `Proof delivery task`, moved it to
  `in_progress`, and captured responsive screenshots. It intentionally does
  not invent a direct task-to-area relation; future area-task ownership must be
  designed as a separate backend-backed slice.
- `docs/planning/v1-data-evidence-browser-task-contract.md`: current task and
  evidence source for V1DATA-001. As of 2026-05-16, `/data` and
  `/data/:table` are V1 foundation evidence-browser routes. They show
  department record metrics, agent-readable table context, empty-table and
  review-gap signals, selected-table owner/API/capability context, department
  coverage links, and generic record inspection. `npm run build:web` and
  Playwright real-backend proof on `http://127.0.0.1:3215` verified desktop
  `/data` and mobile `/data/procedures` with seeded Company OS evidence, no
  console/page errors, and no horizontal overflow. Future typed actions must
  stay backed by existing contracts.
- `docs/planning/v1-relationship-provenance-review-task-contract.md`: current
  task and evidence source for V1REL-001. As of 2026-05-16,
  `/relationships?area=:areaKey` is a V1 foundation provenance review route.
  It shows selected-area focus, direct/provider/inferred/review metrics,
  provenance edges with confidence/source context, review queue, unsupported
  families, and links back to area resources plus `/data`. `npm run build:web`
  passed; Playwright proof on `http://127.0.0.1:3216` verified desktop/mobile
  `/relationships?area=04-operacje` with no console/page errors or horizontal
  overflow. Future relationship fixes require explicit command contracts; do
  not add generic edge CRUD or fake links.
- `docs/planning/v1-selected-area-knowledge-depth-task-contract.md`: current
  task and evidence source for V1KNOW-001. As of 2026-05-16,
  `/areas?area=:areaKey&view=knowledge` has a V1 knowledge-readiness layer
  inside the selected-area shell. It shows Drive scope, agent packet
  readiness, descriptions, freshness, agent-readable packet, and improvement
  queue from existing Drive/knowledge/table context. `npm run build:web`
  passed; Playwright proof on `http://127.0.0.1:3217` verified desktop/mobile
  `/areas?area=04-operacje&view=knowledge` with seeded scoped Drive evidence,
  no console/page errors, and no horizontal overflow. Future knowledge writes,
  Drive edits, or autonomous source-trust decisions require explicit
  contracts.
- `docs/planning/v1-selected-area-tasks-depth-task-contract.md`: current task
  and evidence source for V1AREATASKS-001. As of 2026-05-16,
  `/areas?area=:areaKey&view=tasks` has a V1 task-execution layer inside the
  selected-area shell. It shows task evidence, execution tables, provider
  pressure, guarded ownership, execution packet, owner action queue, and
  explicit no-hidden-task-to-area-relation language. `npm run build:web`
  passed; Playwright proof on `http://127.0.0.1:3218` verified desktop/mobile
  `/areas?area=04-operacje&view=tasks` with no console/page errors or
  horizontal overflow. Future factual area task counts require a backend-backed
  ownership relation.
- `docs/ux/v1-production-canonical-discrepancy-audit-2026-05-15.md`: current
  production-to-canonical discrepancy register for the five V1 web surfaces.
  It records the original deployed screenshots, root/auth mismatches,
  signed-out private redirect evidence, and the V1PROD-002 post-deploy update.
  Production now runs `ff5e041`; public/signed-out skeleton parity is proven,
  while authenticated dashboard and selected-area screenshot parity remains
  the open private-route proof.
- `docs/ux/v1-settings-canonical-spec-2026-05-15.md`: current canonical
  source for the unified V1 settings module. It defines `/settings` as a
  contextual connector configuration surface with sections for Integrations,
  Agent keys, and MCP. As of V1SETTINGS-002 on 2026-05-15, `/settings`,
  `/settings/integrations`, `/settings/drive`, `/settings/api`, and
  `/react-agent-tools` render one React `UnifiedSettingsRoute`. Integrations
  show a provider list and the selected provider's backend-supported fields:
  credentials, active state, provider scope IDs, `syncMode`, and `importMode`.
  The provider list includes direct active/disabled switches; disabling a
  provider stops future sync/actions while existing imported CompanyCore data
  remains available. The selected provider has `Setup`, `Mapping`, and `Sync`
  tabs backed by existing ClickUp and Google Drive contracts for discovery,
  area mapping, import, reconcile, maintenance, and task sync.
  Settings must not contain badges, counters, sync/import queues, folder
  mapping, relationship review, large MCP catalogs, or dashboard-style metrics;
  those belong in dedicated work views. The
  desktop/mobile target images are
  `docs/ux/assets/companycore-v1-settings-desktop-canonical.png` and
  `docs/ux/assets/companycore-v1-settings-mobile-canonical.png`. Local proof:
  `npm run build:web`, `npm run validate`, `git diff --check`, and
  Playwright fallback screenshots
  `docs/ux/evidence/v1-settings-unified-proof-desktop.png` and
  `docs/ux/evidence/v1-settings-unified-proof-mobile.png`. Database-backed
  proof also passed: `npm run test:api` against workspace-local PostgreSQL,
  plus real backend Playwright proof that registered an owner, saved Google
  Drive OAuth client settings from `/settings/drive`, read back
  `oauthClientConfigured=true`, and captured
  `docs/ux/evidence/v1-settings-real-backend-desktop.png`,
  `docs/ux/evidence/v1-settings-drive-save-real-backend-desktop.png`, and
  `docs/ux/evidence/v1-settings-real-backend-mobile.png`.
- `docs/architecture/relationship-graph-audit-2026-05-14.md`: current
  relationship graph source audit for the pre-V2 web/backend/MCP foundation.
  Relationship APIs and UI must distinguish direct database edges,
  provider-derived hierarchy, route-inferred table-to-record links,
  needs-review items, and unsupported relation families. WEBFOUND-008A added
  read-only `GET /v1/relationships/graph` plus `relationships:read` MCP
  exposure. WEBFOUND-008B made `/relationships` consume that API, and
  WEBFOUND-009 added `/settings/integrations` readiness cards for ClickUp,
  Google Drive, relationship graph, and MCP agent access. WEBFOUND-010 added
  `/settings/api` workspace/risk/MCP tool preview before service key creation.
  WEBFOUND-011 connected `/react-agent-tools` to the canonical shell and
  removed the separate React preview navigation taxonomy from the shared React
  shell. WEBFOUND-012 added a repeatable AI-ready smoke for disposable owner
  bootstrap, MCP reader/operator profile keys, manifest visibility, HTTP/MCP
  relationship graph reads, and default guarded-command blocking. WEBFOUND-013
  approved WEBFOUND-014 visual planning while keeping direct Company City and
  gamification implementation gated on a canonical shell/map/brief/status
  plan. WEBFOUND-014 added that canonical visual implementation plan and the
  first future candidate `V2VIS-001 Shared CompanyShell And Dashboard Frame`.
  The WEBFOUND queue is complete. Do not add a
  generic edge table or fake relationship data before a concrete editable
  workflow proves the need.
- Google Drive integration memory: as of 2026-05-14, Google Drive uses one
  workspace OAuth connection for Drive, Docs, and Sheets. The callback route is
  `/settings/drive`; private-route login redirects must preserve callback query
  parameters until the backend token exchange completes. Folder discovery must
  request `mimeType`, and imports refresh searchable content snapshots for
  Google Docs and Sheets. Production now runs commit
  `c5878d95a47f17745f65689c08e9e317a6465777`; OAuth is active, protected smoke
  passes, and owner discovery returns 172 folders. The numbered department
  roots `00`-`12` have been selected, imported, and mapped; first import is no
  longer a blocker. Future Drive work should focus on freshness,
  content-quality, Docs/Sheets write, or changes reconciliation only when those
  become active scope.

If one of these files is missing, empty, stale, or still template-like, rebuild
the minimum useful version from architecture docs, context files, accepted
feedback, code, tests, and planning notes before choosing implementation work.
Every inferred row must name its source and use a cautious status.

## Architecture Refresh Protocol

When architecture, module boundaries, app flow, route ownership, data model,
runtime behavior, UX system, or deployment shape changes, the same task must
refresh the relevant indexes before it can be called done.

Minimum refresh checklist:

1. Update the canonical architecture or ADR file that owns the decision.
2. Update module maps or route/component/API ownership docs when affected.
3. Update `.codex/context/PROJECT_STATE.md` if phase, stack, deploy shape,
   validation commands, or runtime reality changed.
4. Update `.codex/context/TASK_BOARD.md` and `docs/planning/*` so the next
   task queue reflects the new architecture.
5. Update `.agents/state/module-confidence-ledger.md` for every affected
   module.
6. Update `.agents/state/system-health.md` when validation, smoke, deploy, or
   runtime status changed.
7. Record unresolved mismatches in `.agents/state/known-issues.md`.

Architecture changes left only in chat, commit messages, or scattered planning
notes are not accepted as source of truth.

## Module Confidence Ledger Protocol

Use `.agents/state/module-confidence-ledger.md` as the fast answer to:

- Which modules exist?
- Which user journeys does each module own?
- Does it work in the real app?
- What evidence proves that?
- What is blocked, broken, stale, or unverified?
- What is the next smallest proof or fix?

Before selecting a new implementation task, read the ledger and prefer work in
this order:

1. `BROKEN` or `FAIL` release-critical journeys.
2. `BLOCKED` release-critical journeys.
3. `IMPLEMENTED_NOT_VERIFIED` P0/P1 journeys.
4. `PARTIAL` journeys where evidence points to a real defect.
5. New features only after release-critical existing flows are stable or
   explicitly deferred.

Do not convert unknowns into features. First create a verification task. Create
a fix only when proof, code inspection, or a reproducible user journey shows a
real defect.

## Reality Language Rule

Agents must not report vague completion states such as "almost done", "close",
"should work", "looks good", or "probably fixed" without evidence.

Allowed completion language:

- `verified`: evidence exists and is recorded.
- `implemented, not verified`: code exists but proof is missing.
- `partially verified`: exact passing and missing scenarios are listed.
- `blocked`: exact blocker and next unblock action are listed.
- `failed`: fresh verification failed and the failure is recorded.

The user should not be the first tester of a core journey. If a task affects a
browser, mobile, API, auth, data, money, AI, or deployment flow, the agent must
run the relevant automated or manual journey proof where local access allows it.

## Real Journey Proof

For user-facing work, validation must prove the real journey, not just that code
compiled. Examples:

- create, edit, delete, and refresh the target entity when CRUD changed;
- navigate from the real entry point, not only direct route access;
- verify loading, empty, error, success, and blocked states when the action has
  those states;
- verify persistence after reload or service restart when data changes;
- verify mobile or responsive behavior when the surface is browser-facing;
- verify auth, ownership, and fail-closed behavior when data access matters.

If a journey cannot be exercised locally, record why, the residual risk, and the
next best proof. Do not mark the module as working.

## Full-Picture Mission Selection

Every autonomous run must start by answering:

- Where are we now?
- What is the final or current release objective?
- Which module or journey is the biggest blocker to that objective?
- What evidence do we already have?
- What mission or checkpoint would most increase release confidence?

Only then select one scoped mission or checkpoint. Small tasks are useful as
mission slices only when they are anchored to the release picture.

## Handoff Requirement

After substantial work, update the indexes and leave the next agent a clear
handoff:

- current objective;
- files and modules changed;
- evidence collected;
- module confidence changes;
- known broken or unverified journeys;
- next tiny task.
