# Project Memory Index

Last updated: 2026-05-16

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
  memory, and pattern guidance. As of 2026-05-14, high-level dashboard and map
  work must preserve the accepted Company City strategic-map direction unless a
  new decision supersedes it.
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
  desktop/mobile authenticated mocked-owner proof under `docs/ux/evidence/`;
  database-backed target smoke remains pending because disposable Docker
  startup timed out in the local session.
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
  ownership. `/dashboard` is the canonical authenticated post-login route, and
  `web/src/app-route-registry.ts` is the React route metadata source for
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
