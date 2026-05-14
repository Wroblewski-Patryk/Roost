# PROJECT_STATE

Last updated: 2026-05-14

## Product Snapshot
- Name: LuckySparrow Company Core
- Goal: Central backend for company projects, goals, tasks, CRM, notes,
  decisions, agents, and system events.
- Commercial model: Internal operational infrastructure.
- Current phase: v1 local and production evidence complete for the approved
  runtime plus Agent-First Company OS command surface; Google Drive owner
  import is complete for the numbered department roots.

## Product Decisions (Confirmed)
- 2026-05-07: CRM and pipelines are separate domain concepts. Pipelines are a
  shared cross-department workflow/status mechanism; CRM may use them for deals
  and relationship work, but pipeline stages are not CRM-owned.
- 2026-05-09: Company OS Stage 1 uses `Process -> Pipeline ->
  PipelineStage -> Procedure -> ProcedureStep` as the durable work definition
  graph. Existing `pipeline_stages` is extended and reused rather than
  duplicated. Human, agent, and system accountability lives in
  `company_roles`; provider-neutral resources live in `resources`; integration
  abstraction lives in `tool_adapters` and `integration_capabilities`.
- 2026-05-09: Company OS Stage 2 uses `PipelineRun -> StageRun ->
  Approval / AcceptanceCriterion / AuditLog` as the runtime evidence graph.
  Events now support nullable actor, resource, and correlation metadata so
  observable activity can be tied back to durable audit evidence.
- 2026-05-09: Company OS Stage 3 uses policy, metric, risk, control,
  knowledge item, decision log, automation rule, trigger, artifact,
  dependency, business function, and stakeholder records as the governance
  intelligence graph. Existing lightweight `decisions` and
  `automation_definitions` remain valid; Stage 3 adds structured governance
  records rather than replacing them.
- 2026-05-09: Company OS Stage 4 starts with command-shaped API surfaces
  instead of raw table CRUD. `/v1/company-os` is the supported
  workspace-scoped cockpit and collection-read layer for Stage 1-3 records,
  guarded by `company-os:read`; approval and stage execution writes are
  exposed as lifecycle-specific routes with capability gates, approval checks,
  acceptance criteria validation, events, and audit logs. Stage lifecycle
  route logic now lives in shared internal command functions so future
  automation actions can reuse the same transition behavior.
- 2026-05-09: Company OS automation must be event-driven and command-shaped.
  `automation_rules` and `triggers` observe normalized CompanyCore events,
  evaluate declarative conditions, produce action proposals, and then request
  approval or call existing lifecycle commands. Automation execution must be
  idempotency-safe and must not patch raw workflow statuses, call provider APIs
  directly, or bypass event/audit evidence.
- 2026-05-09: The first Company OS automation evaluator is
  `POST /v1/company-os/events/:id/actions/evaluate-automation-rules`, guarded
  by `company-os:automation:execute`. It supports `dry_run` and `execute`.
  It executes `request_approval`, `emit_event`, and stage lifecycle proposals
  through shared lifecycle command functions, preserving idempotency,
  automation-level proposal evidence, command-specific event/audit evidence,
  and fail-closed stable lifecycle errors.
- 2026-05-09: Stage lifecycle transition logic must be extracted into shared
  internal command functions before automation can execute `start_stage`,
  `block_stage`, `validate_stage`, or `complete_stage`. HTTP routes and the
  automation evaluator must reuse the same command service so transition
  checks, approval gates, acceptance criteria, event emission, and audit logs
  stay single-sourced.
- 2026-05-09: CompanyCore should be optimized for MCP consumption while
  keeping the HTTP API as the policy/audit boundary. MCP servers should wrap
  CompanyCore routes as tools and must not read PostgreSQL or provider secrets
  directly.
- 2026-05-14: The web console should become a human mirror of the same
  Company OS and MCP command surface available to agents. Current UI slices are
  verified foundations, not a complete product experience. The next approved
  web direction starts with `V2WEB-AGENT-001 Agent Tool Surface Workbench`,
  backed by `/v1/connection` and `/v1/mcp/manifest`, before broader definition
  editors or new command surfaces are added.
- 2026-05-14: `V2WEB-AGENT-001 Agent Tool Surface Workbench` implemented
  `/react-agent-tools` as the first human-agent web bridge. The route reuses
  `/v1/connection` and `/v1/mcp/manifest` to show MCP tools by route family,
  capability, risk level, and approval requirement.
- 2026-05-14: AGRUN-007 production rollover deployed commit
  `c5878d95a47f17745f65689c08e9e317a6465777` to the CompanyCore backend.
  Public health reports the commit/image, protected Google Drive smoke passes
  with OAuth active, and owner folder discovery returns 172 folders. The
  numbered Google Drive department roots `00`-`12` are now selected, imported,
  and mapped to operating areas. `/v1/google-drive/files` readback returned
  748 imported items, 171 folders, `unassignedCount=0`, and descendant scope
  verification `mismatches=[]`.
- 2026-05-14: Production now runs owner-console snapshot routing hotfix commit
  `a7557120b8ea4630a0b32097e66ba0d4bb012b1b`. The vanilla web shell routes
  implemented table snapshots to their correct API paths, sends Company OS
  collections through `/v1/company-os/:collection`, and skips provider
  pseudo-slugs that do not have direct collection endpoints. Signed-in
  Playwright production checks for `/dashboard`, `/data`, `/relationships`,
  `/settings/drive`, `/settings/api`, and `/areas` reported no failed requests
  and no console warnings or errors.
- 2026-05-14: `V2WEB-AGENT-002 Company OS Correlation Timeline` added a
  client-composed evidence chain to `/react-company-os` using existing recent
  event and audit log `correlationId` data from `/v1/company-os`.
- 2026-05-14: `V2WEB-AGENT-003 Operating Graph Detail` added an owner-visible
  graph panel to `/react-company-os`, connecting selected operating-area
  tables, provider table paths, Company OS resources, policies, risks,
  automation rules, recent runs, and correlation evidence from existing read
  contracts.
- 2026-05-14: `V2WEB-AGENT-020/021 Workflow Version Lineage` added explicit
  `family_id` lineage to process, pipeline, and procedure roots. Workflow
  activation copies lineage into each new active version, and rollback-draft
  creation resolves the current active target by lineage rather than mutable
  name so renamed historical workflow versions can recover through the normal
  preview and activation path.
- 2026-05-14: `V2WEB-AGENT-022/023/024 Workflow Recovery Proofs` fixed noisy
  Company OS collection fetch paths, added inline audited approval decisions
  to the workflow recovery panel, preserved local recovery state until
  activation, and verified rollback draft -> preview -> approval request ->
  approval decision -> activation in both mocked UI proof and real Docker
  Compose backend proof.
- 2026-05-14: `V2WEB-AGENT-004 Workflow-Grade Command Panels` added
  prerequisite, expected-result, recovery-guidance, and proposal/effect context
  to the existing `/react-company-os` approval, stage lifecycle, and automation
  evaluator panels without changing backend command contracts.
- 2026-05-14: `V2WEB-AGENT-005 Definition Editing Contract Decision` added
  `docs/architecture/company-os-definition-editing-contract.md`, classifying
  Company OS definition editing risk and selecting low-risk Class A definitions
  such as `standards` or `company_roles` as the first allowed editor path after
  audited backend write routes exist.
- 2026-05-14: `V2WEB-AGENT-006 Class A Definition Editor Backend Contract`
  implemented the first approved Class A write surface for `standards`:
  `company-os:definition:write`, audited create/update/archive routes, soft
  archive status, MCP manifest exposure, and integration coverage.
- 2026-05-14: The accepted UX/UI direction is a cinematic-realistic Company
  City Map. The logged-in dashboard should represent the company as a strategic
  city/value ecosystem: `GENERAL` is the central intake and orchestration
  district, the 12 departments are connected operational districts, the right
  side carries a command brief, and the bottom summarizes the value journey.
  Future web desktop/tablet/mobile and native mobile/tablet designs should
  derive from this direction with light evidence-backed gamification.
- 2026-05-14: Dashboard V2 target spec established the first inventory pattern
  and is now superseded by `docs/ux/company-city-dashboard-v3-spec.md`; the V2
  reference asset remains at `docs/ux/assets/company-city-dashboard-v2-target.png`. When generated
  visuals drift, the written spec wins for district labels, layout zones,
  responsive behavior, and shared component roles.
- 2026-05-14: Dashboard V3 supersedes the V2 department labels with the user's
  canonical department model: `00 Ogolny`, `01 Strategia`, `02 Produkt`,
  `03 Sprzedaz`, `04 Operacje`, `05 Relacje`, `06 Kadry`, `07 Finanse`,
  `08 Zasoby`, `09 Technologia`, `10 Prawo`, `11 Innowacje`,
  `12 Zarzadzanie`. The current target spec is
  `docs/ux/company-city-dashboard-v3-spec.md`, and the current target assets are
  `docs/ux/assets/company-city-dashboard-v3-target.png` and
  `docs/ux/assets/company-city-management-department-v1-target.png`.
- 2026-05-14: Google Drive remains one workspace OAuth integration for Drive,
  Docs, and Sheets rather than one configuration per Google service. The owner
  callback route is `/settings/drive`, and authenticated private-route handling
  must preserve the full callback URL until `/v1/integration-settings/google_drive/oauth/exchange`
  stores the token. Drive folder discovery must request `mimeType`; imported
  Google Docs and Sheets refresh searchable content snapshots during import so
  MCP-facing agents can discover metadata and read indexed content through the
  CompanyCore HTTP boundary.
- 2026-05-06: Agent-facing "CRUD for every table" means full
  workspace-scoped CRUD for business records where safe, and controlled
  lifecycle/action APIs for system, auth, secret, provider inbox, webhook,
  event, and audit tables. Agents must use `/v1/connection` capability
  discovery and the HTTP API; they must not write directly to PostgreSQL.
- 2026-05-04: The operating model includes a non-user fallback area
  `00. Glowny` (`main-general`) that cannot be treated as a normal removable
  company department. Imported ClickUp/Drive/company elements that cannot be
  confidently classified should land there first so operators can move them
  intentionally later.
- 2026-05-03: v1 includes a minimal owner-only web console for production
  ClickUp connection setup. A broader company operations dashboard and mobile
  app are v2 scope; mobile should follow the web product shape.
- 2026-05-03: CompanyCore should evolve toward a ClickUp-shaped operating
  model: `Workspace -> Operating Area -> Operating Folder -> Operating Table
  -> Record`, mapped to ClickUp `Team/Workspace -> Space -> Folder -> List ->
  Task`. Business tables must be assigned to an approved operating area:
  `00. Glowny` for unclassified imports plus the 12 company departments, while
  users, memberships, API keys, integration settings, provider mappings, and
  platform metadata remain system tables.
- 2026-05-03: Provider API work must check current official provider
  documentation before mapping or implementation. For ClickUp this includes
  hierarchy terminology, Custom Fields, Views, rate limits, pagination,
  webhook signatures, and permissions.
- 2026-05-03: Google Drive is approved as the next native v2 integration.
  Drive folders/files must map into the same workspace operating model as
  ClickUp so one company area can show ClickUp Lists, Drive folders/files,
  storage locations, knowledge roots, automations, and CompanyCore tables
  consistently. Google Drive uses OAuth-backed workspace integration settings,
  encrypted refresh-token material, paginated Drive file discovery, Docs/Sheets
  read/edit/create APIs, Drive Changes freshness, and CompanyCore API access
  for Jarvis, Paperclip, Aviary, and future GUI clients.
- 2026-05-14: Google Drive remains one workspace OAuth integration for Drive,
  Docs, and Sheets rather than one configuration per Google service. The owner
  callback route is `/settings/drive`; authenticated private-route handling
  must preserve callback query parameters until token exchange completes.
  Folder discovery must request `mimeType`, and imported Google Docs/Sheets
  refresh searchable content snapshots for MCP-facing agents through the
  CompanyCore HTTP boundary.
- 2026-05-03: Provider-to-operating-area mappings must be operator-editable in
  the owner console. Automatic classification is only the first pass; manual
  ClickUp List/Folder/Space and Google Drive folder assignments are persisted
  and must be preserved by future synchronization.
- 2026-05-03: ClickUp imports must expose an explicit existing-record policy
  before writing. Approved v1 modes are `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`; destructive cleanup is limited
  to `source = clickup` records in the selected ClickUp List scope and must not
  delete native/manual CompanyCore records.
- 2026-05-02: PostgreSQL is the source of truth.
- 2026-05-02: API is the only supported access layer.
- 2026-05-02: CompanyCore owns the first native integration adapter:
  ClickUp -> CompanyCore -> PostgreSQL -> event. n8n remains optional for
  orchestration only when a workflow is better outside the backend.
- 2026-05-02: v1 must include an ownership boundary: registration creates a
  workspace and an owner user, and integration settings/secrets belong to the
  workspace rather than global process state.

## Technical Baseline
- Backend: Node.js 22, Express, TypeScript.
- Frontend: backend-served owner console. The current production surface is
  still the static HTML/CSS/JavaScript console with local Phosphor icon assets,
  and UXA-009 adds a React + Vite + Tailwind CSS + DaisyUI foundation under
  `web/` with generated `public/react/` output, `/react-dashboard`,
  `/react-tasks`, and `/react-integrations` parallel workbench routes.
- Mobile: None in v1; planned from v2 based on the web product experience.
- Database: PostgreSQL with Prisma.
- Infra: Docker Compose.
- Hosting target: Coolify-compatible Docker Compose.
- Deployment shape: backend + postgres.
- Runtime services: `backend`, `postgres`.
- Background jobs / workers: lightweight in-process ClickUp maintenance
  scheduler in the backend; no separate worker tier in v1.
- Persistent storage: Docker volume `companycore_postgres`.
- Health / readiness checks: `GET /health`.
- Environment files: `.env.example`.
- Observability: minimal system events table.
- MCP / external tools: ClickUp API is called by a native CompanyCore
  integration adapter; n8n may call API endpoints for optional orchestration.
  `/v1/mcp/manifest` exposes a capability-scoped MCP bridge tool catalog for
  agent runtimes, and `npm run mcp:server` starts the first local stdio MCP
  bridge over the CompanyCore HTTP API. Owner-created MCP service keys can use
  canonical profiles such as `mcp_company_os_reader`,
  `mcp_knowledge_reader`, `mcp_memory_writer`, `mcp_event_worker`, and
  `mcp_operator`. `/react-company-os` is the current React Company OS cockpit
  and includes read-only collection previews, selected-record detail
  inspection, an MCP-oriented agent context panel, approval actions, and
  owner-facing stage lifecycle controls over the CompanyCore HTTP API.
- Auth / ownership: v1 workspace owner model with user registration, login,
  automatic workspace bootstrap, bearer auth context, workspace-scoped API key
  context, and workspace-scoped integration settings.

## Validation Commands
- Lint: Not configured.
- Typecheck: `npm run build`
- Unit tests: Not configured in v1.
- Integration tests: `npm test` with `DATABASE_URL` pointed at a disposable
  PostgreSQL database.
- E2E / smoke: `GET /health`, register owner/workspace, authenticate, create
  project, create task, configure workspace ClickUp settings, trigger native
  ClickUp sync, verify synced task and event.
- Other high-risk checks: `docker compose up -d --build`

## Deployment Contract
- Primary deploy path: Docker Compose.
- Coolify app/service layout: one backend service plus one Postgres service.
- Dockerfiles / compose paths: `Dockerfile`, `docker-compose.yml`.
- Required secrets: `DATABASE_URL`, `SEED_API_KEY`, `AUTH_TOKEN_SECRET`,
  `INTEGRATION_SECRET_KEY`, optional `PORT`; local seed may use `SEED_OWNER_EMAIL`,
  `SEED_OWNER_PASSWORD`, and `SEED_WORKSPACE_NAME`; ClickUp tokens must be
  stored as workspace integration settings, not hardcoded process globals.
- Public URLs / ports: backend on `3000`; `companycore.luckysparrow.ch` is the
  web UI domain and `api.companycore.luckysparrow.ch` is the API domain.
- Backup / restore expectation: Postgres volume backups required before
  production use.
- Rollback trigger and method: redeploy previous image/commit and preserve
  Postgres volume.

## Current Focus
- Main active objective: keep v1 post-release handoff clean, keep external
  blockers explicit, and advance the selected Agent-First Company OS V2 lane
  without reopening completed runtime scope.
- Top blockers: real Google OAuth credentials and owner consent are required
  for the first Drive import proof; upstream Paperclip/OpenJarvis source merge
  execution is blocked by external GitHub write access or an approved fork/PR
  route; auto-deploy remains unverified and manual VPS backend rollover remains
  the approved release path.
- Success criteria for this phase: source-of-truth docs and `.agents/state/*`
  agree on the accepted v1 runtime boundary, local V1 evidence gaps are closed,
  external blockers remain explicit, and the next executable task audits the
  agent command surface before any new runtime behavior is added.

## Autonomous Iteration State
- Current iteration: V2WEB-AGENT-019 Workflow Recovery Controls Web Surface
  completed.
- Current operation mode: BUILDER
- Last completed iteration: V2WEB-AGENT-019 Workflow Recovery Controls Web
  Surface.
- Last completed task: added owner-facing recovery controls for archive and
  rollback-draft commands in `/react-company-os`.
- Current task status: workflow draft create, preview, activation, readback,
  web resume, inactive historical-version archive, and rollback-draft creation
  are verified; owner-facing recovery controls are implemented and verified.
- Next required mode: BUILDER; decide V2WEB-AGENT-020 workflow version lineage
  before supporting rollback across renamed workflow versions.

## Recent Progress

- 2026-05-14: Completed V2WEB-AGENT-006 Class A Definition Editor Backend
  Contract. Added `status` to `standards`, migration
  `202605141_company_os_standard_definition_status`,
  `company-os:definition:write`, audited
  `POST/PATCH/DELETE /v1/company-os/standards`, MCP manifest exposure, API and
  database docs, and integration assertions for owner success, cross-workspace
  denial, read-only service denial, audit/event evidence, and MCP risk
  metadata. `npx prisma generate`, `npm run build`, and `npm test` against a
  disposable PostgreSQL database passed; the disposable container was removed.

- 2026-05-14: Implemented V2WEB-AGENT-007 Standards Definition Editor Web
  Surface and completed V2WEB-AGENT-007R render proof. `/react-company-os` now
  includes a narrow standards editor that reads standards, roles, and
  checklist templates and calls the audited
  `POST/PATCH/DELETE /v1/company-os/standards` route-kit functions. The panel
  includes capability-denied, loading, empty, error, success, archive, and save
  states and remains scoped to Class A standards. `npm run build`, static
  marker checks, `git diff --check`, and a bounded Playwright Chromium proof
  passed. The proof rendered `Definition editor`, `Audited Class A editor`,
  `Proof Standard`, `Create standard`, `Standard created`, and
  `Render Proof Standard`, confirmed mocked standard creation, reported zero
  relevant console issues, and left no validation-specific browser/temp
  resources.

- 2026-05-14: Completed V2WEB-AGENT-008 Versioned Workflow Definition Command
  Contract. Added
  `docs/architecture/company-os-workflow-definition-command-contract.md` and
  linked it from architecture source-of-truth docs. The contract forbids raw
  CRUD over active workflow definitions and defines draft/update, impact
  preview, approval request, activation, archive, rollback, versioning,
  runtime evidence preservation, MCP exposure, and web-editor gates for
  processes, pipelines, pipeline stages, procedures, and procedure steps.

- 2026-05-14: Completed V2WEB-AGENT-009 Workflow Definition Draft Backend
  Contract. Added migration `202605142_workflow_definition_drafts`,
  dedicated router
  `src/modules/company-os/workflow-definition-drafts.routes.ts`,
  `company-os:workflow-definition:write`, audited
  `POST/PATCH /v1/company-os/workflow-definitions/drafts` and
  `POST /v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact`,
  MCP manifest exposure, API/database docs, and integration assertions for
  owner success, idempotency, cross-workspace denial, read-only scoped/profile
  denial, audit/event evidence, and manifest metadata. `npm run build` and
  `npm test` against disposable PostgreSQL on `localhost:55433` passed; the
  validation container and TypeScript trace artifacts were removed.

- 2026-05-14: Completed V2WEB-AGENT-010 Workflow Definition Activation
  Backend Contract. Added
  `POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate`
  guarded by `company-os:workflow-definition:activate`. The route activates
  procedure drafts in its initial slice because procedures already support
  `workspaceId + name + version`; V2WEB-AGENT-011 later superseded the
  temporary process/pipeline activation blocker with explicit root versioning.
  Tests cover missing approval denial, approved activation, previous procedure
  deprecation, new active procedure version and steps, repeated activation
  denial, read-only scoped denial, MCP manifest supervision metadata, and
  audit/event evidence. `npm run build`, `npm test` against disposable
  PostgreSQL on `localhost:55434`, and `git diff --check` passed; the
  disposable container was removed.

- 2026-05-14: Completed V2WEB-AGENT-011 Process And Pipeline Workflow
  Versioning Migration Decision. Added migration
  `202605143_workflow_root_version_uniqueness`, changed Prisma schema
  uniqueness for `processes` and `pipelines` to
  `workspaceId + name + version`, and extended workflow activation to process
  and pipeline drafts. Pipeline activation deprecates the previous pipeline,
  creates a new active version, and copies/applies stages; process activation
  deprecates the previous process and creates a new active process version.
  Integration tests now cover process, pipeline, and procedure activation.
  `npx prisma generate`, `npm run build`, `npm test` against disposable
  PostgreSQL on `localhost:55436`, and `git diff --check` passed, and the
  disposable container was removed.

- 2026-05-14: Completed V2WEB-AGENT-012 Workflow Definition Draft Web Surface.
  Added typed route-kit clients for workflow draft create, impact preview, and
  activation, then added a guarded `/react-company-os` workflow command panel
  for process, pipeline, and procedure roots. The panel creates a draft from an
  existing root, previews runtime impact, shows approval reasons, supports
  approval request, and gates activation on capability plus approved approval
  evidence when required. `npm run build` passed; real-backend Playwright proof
  against disposable PostgreSQL on `localhost:55437` and
  `http://127.0.0.1:3101/react-company-os` verified desktop render, create
  draft, impact preview, approval-required state, mobile DOM render, and zero
  relevant console issues. The validation server and disposable container were
  removed.

- 2026-05-14: Completed V2WEB-AGENT-013 Workflow Draft History And Resume
  Decision and V2WEB-AGENT-014 Workflow Draft Readback And Resume Slice.
  The decision selected draft readback/resume before archive/rollback because
  web/API/MCP-created drafts need an owner-visible way to resume interrupted
  command flows. Added `GET /v1/company-os/workflow-definitions/drafts` and
  `GET /v1/company-os/workflow-definitions/drafts/:id`, kept both behind
  `company-os:workflow-definition:write`, fixed capability route ordering so
  generic Company OS collection reads do not expose draft payloads, and added a
  `/react-company-os` `Recent drafts` resume panel scoped to `status=draft`.
  `npm run build`, `npm test` against disposable PostgreSQL on
  `localhost:55438`, and Playwright proof against
  `http://127.0.0.1:3102/react-company-os` passed with zero relevant console
  issues. The validation server and disposable container were removed.

- 2026-05-14: Completed V2WEB-AGENT-015 Workflow Archive And Rollback Command
  Decision. Updated the workflow definition command architecture to select
  phased recovery commands instead of raw status mutation. The first archive
  implementation should target inactive historical root versions through
  explicit root type/root ID and preserve capability, idempotency, audit/event,
  workspace-scope, and MCP supervision boundaries. Rollback should first
  create a rollback draft that flows through existing impact preview and
  activation. No runtime code changed in this decision task; `git diff
  --check` is the validation gate.

- 2026-05-14: Completed V2WEB-AGENT-016 Workflow Historical Version Archive
  Backend Slice. Added
  `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive`
  guarded by `company-os:workflow-definition:activate`, mounted under the
  Company OS workflow definitions router, and exposed through adapter/MCP
  metadata. The route archives inactive historical root versions only, blocks
  active roots, blocks inactive roots with active runtime dependencies,
  supports idempotent replay by command key, and emits
  `workflow_definition_version_archived` plus
  `workflow_definition_version.archived` evidence. `npm run build` passed;
  `npm test` passed against disposable PostgreSQL on `localhost:55439`, and
  the validation container was removed.

- 2026-05-14: Completed V2WEB-AGENT-017 Workflow Rollback Draft Backend Slice.
  Added
  `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft`
  guarded by `company-os:workflow-definition:write`. The route rejects active
  rollback sources, requires a current active same-name root version, copies
  source root fields and children into a normal
  `workflow_definition_drafts.change_set` with `kind = rollback_to_version`,
  generates impact preview, supports idempotent replay, and emits
  `workflow_definition_rollback_draft_created` plus
  `workflow_definition_rollback_draft.created` evidence. `npm run build`
  passed; `npm test` passed against disposable PostgreSQL on
  `localhost:55440`, and the validation container was removed.

- 2026-05-14: Completed V2WEB-AGENT-018 Workflow Recovery Controls Web
  Decision and V2WEB-AGENT-019 Workflow Recovery Controls Web Surface. The
  decision keeps recovery in a dedicated panel inside the workflow command
  surface instead of mixing it with normal draft creation. Added route-kit
  clients for archive and rollback-draft commands, then added
  `/react-company-os` `Recovery controls` with inactive historical version
  selection, required recovery reason, `Archive`, and `Rollback draft`
  actions. Rollback drafts load into the existing draft preview/approval/
  activation panel. `npm run build` passed; `npm test` passed against
  disposable PostgreSQL on `localhost:55441`; Playwright proof against
  `http://127.0.0.1:3103/react-company-os` verified the recovery panel and
  rollback-draft success. The validation server and disposable container were
  removed.

- 2026-05-14: Completed V2WEB-AGENT-005 Definition Editing Contract Decision.
  Added `docs/architecture/company-os-definition-editing-contract.md` and
  linked it from architecture source-of-truth docs. The contract classifies
  Company OS editing into registry-like definitions, workflow definitions,
  execution tool definitions, governance definitions, automation definitions,
  and runtime evidence. It forbids raw runtime evidence editing, requires
  command/version/approval contracts for high-impact definitions, and selects a
  narrow Class A object such as `standards` or `company_roles` as the first
  allowed editor path after audited backend write routes exist.

- 2026-05-14: Completed V2WEB-AGENT-004 Workflow-Grade Command Panels.
  `/react-company-os` now shows command readiness preview cards for approvals,
  stage lifecycle, and automation evaluation, including prerequisites,
  expected results, and recovery guidance. Automation dry-run results now
  remain visible and show returned proposals, action kind, approval
  requirement, risk, emitted events, and audit evidence targets. No backend
  routes, schema, MCP bridge behavior, or lifecycle command behavior changed.
  `npm run build` passed, and a one-process Node mock server plus Playwright
  proof verified command preview rendering plus automation `Evaluate` POST and
  `Returned automation actions` output with no relevant page console errors.

- 2026-05-14: Completed V2WEB-AGENT-003 Operating Graph Detail.
  `/react-company-os` now shows selected operating-area tables, provider-owned
  table paths, Company OS resources, policies, risks, automation rules, recent
  runtime nodes, and relationship labels from existing read contracts. No
  backend routes, schema, MCP bridge behavior, or lifecycle command behavior
  changed. `npm run build` passed, and a one-process Node mock server plus
  Playwright render proof verified `Operating graph detail`, `Growth`,
  `ClickUp Tasks`, `ClickUp Growth list`, `Supervised command policy`,
  `Unreviewed automation execution`, `Evidence follow-up automation`,
  `Agent web proof run`, and `corr-graph-001` with no relevant page console
  errors.

- 2026-05-14: Completed V2WEB-AGENT-002 Company OS Correlation Timeline.
  `/react-company-os` now composes recent Company OS events and audit logs
  with a shared `correlationId` into one ordered owner-readable evidence chain.
  No backend routes, schema, or lifecycle command behavior changed.
  `npm run build` passed, and a temporary static SPA server plus Playwright
  fallback render proof verified `One evidence chain`, `corr-render-001`,
  `stage_completed`, `stage_run.completed`, and `Evidence payload` markers with
  no relevant page console errors.

- 2026-05-14: Captured UXD-001 Company City UX Direction Decision. Updated the
  canonical visual direction, design-system contract, design memory, decision
  register, task board, and planning queue so future dashboard and mobile work
  follows the approved Company City strategic-map direction. No runtime, API,
  schema, route, deployment, or generated asset files changed.

- 2026-05-14: Captured UXD-002 Company City Dashboard V2 Target Spec. Saved the
  current Dashboard V2 visual target under `docs/ux/assets/` and added a
  table-driven dashboard spec covering zones, 12 departments plus `GENERAL`,
  shared components, responsive rules, interactions, visual rules, and
  generated-reference corrections. No runtime, API, schema, route, or
  deployment behavior changed.

- 2026-05-14: Captured Dashboard V3 department model refinement. Generated and
  saved a Dashboard V3 target using the user's exact 13-area taxonomy plus a
  `12 Zarzadzanie` drill-down target. Updated the dashboard spec, design
  memory, visual direction, decision register, task board, and project state.
  No runtime, API, schema, route, or deployment behavior changed.

- 2026-05-14: Completed V2AGENT-006 and V2AGENT-006R. Added an agent command
  queue to the existing React Company OS cockpit using already-loaded
  approvals, stage runs, automation rules, and policies. No backend route,
  schema, or command behavior changed. `npm run build` passed. Render proof
  passed with a temporary static SPA server, mock `/v1` Company OS endpoints,
  injected owner session, and system Chrome
  `--headless=new --dump-dom --virtual-time-budget=5000`, verifying the queue
  and owner-gated action markers.

- 2026-05-11: Completed V1CLOSE-001 V1 Achievement And External Blocker
  Handoff. Added
  `docs/operations/v1-achievement-and-blocker-handoff.md` and
  `docs/planning/v1-closure-task-contracts.md`, then refreshed release
  readiness, operator handoff, active queue, task board, next steps, current
  focus, and delivery map so V1 is explicitly achieved locally and remaining
  work is external access/consent/permission blocked.

- 2026-05-11: Completed V2AGENT-005 Supervised Operator MCP Smoke Harness.
  Extended `scripts/companycore-mcp-smoke.mjs` with expected HTTP status and
  response-error checks, then added Docker API evidence that an `mcp_operator`
  key is blocked by default for
  `companycore_post_company_os_stage_runs_by_id_actions_complete` with
  `mcp_tool_requires_supervision`, and only reaches HTTP validation when
  `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator` is explicitly set.
  Validation passed with `npm run build` and
  `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
  node --test dist/tests/api.test.js"`.

- 2026-05-11: Completed V2AGENT-004 MCP Requires-Approval Bridge Guard. Added
  default `read_only` bridge behavior in `scripts/companycore-mcp-server.mjs`
  so manifest tools with `requiresApproval: true` return structured
  `mcp_tool_requires_supervision` instead of forwarding the HTTP request.
  Extended `scripts/companycore-mcp-smoke.mjs` with expected-error assertions.
  Validation passed with `npm run build`, `node
  scripts/companycore-mcp-server.mjs --print-config`, and
  `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
  node --test dist/tests/api.test.js"`. V2AGENT-005 is ready to add or
  document a controlled supervised-operator smoke path.

- 2026-05-11: Completed V2AGENT-003 Approval-Aware MCP Command Flow Design.
  Added `docs/operations/approval-aware-mcp-command-flow.md`, defining
  `read_only`, `supervised_operator`, and future `autonomous_operator` modes.
  The accepted design requires MCP tools marked `requiresApproval` to fail
  closed by default in the stdio bridge, while safe read tools continue through
  the HTTP API and CompanyCore remains the approval/event/audit boundary.
  Updated API, MCP bridge, runtime setup, command-surface audit, requirements,
  quality scenarios, risk, system health, task board, and next steps.

- 2026-05-11: Completed V2AGENT-002 MCP Company OS Reader Least-Privilege
  Correction. Removed `company-os:approval:request` and
  `company-os:approval:decide` from `mcp_company_os_reader`, then added API
  regression assertions that profile-created reader keys omit approval, stage,
  and automation write tools from the MCP manifest and receive `403` for
  approval request/decision calls. Validation passed with `npm run build` and
  `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
  node --test dist/tests/api.test.js"`. V2AGENT-003 is ready to design the
  approval-aware MCP command flow before risky unsupervised tools.

- 2026-05-11: Completed V2AGENT-001 Agent-First Company OS MCP Command Surface
  Audit. Published
  `docs/operations/v2-agent-company-os-command-surface-audit.md`, mapping
  existing Company OS lifecycle commands to MCP exposure, capabilities,
  event/audit evidence, and risks. The audit found a least-privilege mismatch
  in `mcp_company_os_reader`, so V2AGENT-002 became the next safe slice.

- 2026-05-11: Completed V2PLAN-001 V2 Product Lane Selection. Selected
  Agent-First Company OS as the next deliberate V2 lane after V1EVID-001 and
  V1EVID-002 closed local V1 evidence gaps. Updated
  `.agents/state/delivery-map.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, `.agents/state/next-steps.md`, and the
  task contract so future work starts with V2AGENT-001, an MCP/HTTP command
  surface audit. No runtime, API, schema, UI, or deployment behavior changed.

- 2026-05-11: Completed V1EVID-002 Operating Model Registry Lifecycle Smoke.
  Added `scripts/operating-model-registry-lifecycle-smoke.mjs` and
  `npm run operating-model:registry-smoke`, then ran
  `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
  npm run seed && npm run operating-model:registry-smoke"`. Trace
  `v1evid-om-1778459014284` verified folder, storage location, knowledge root,
  and automation definition create/read/update/delete, `/v1/operating-model`
  aggregate readback, deleted-resource `404` readback, and cross-workspace
  deny checks. The function coverage ledger, module confidence ledger,
  requirements matrix, quality scenarios, risk register, task board, and next
  steps were updated. No active local V1 evidence tasks remain; external
  blockers remain Google Drive owner consent/import, upstream source merge
  permissions, and deploy automation proof.

- 2026-05-11: Completed V1EVID-001 Company OS Lifecycle Trace Smoke. Added
  `scripts/company-os-lifecycle-trace-smoke.mjs` and
  `npm run company-os:trace-smoke`, then ran the local Docker command
  `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
  npm run seed && npm run company-os:trace-smoke"`. Trace
  `v1evid-1778458446081` verified approval request/decision, stage
  start/validate/complete, automation dry-run/execute, `/v1/events` readback,
  `/v1/company-os/audit-logs/:id` readback, `eventCount=8`, and
  `auditLogCount=7`. The function coverage ledger, module confidence ledger,
  requirements matrix, quality scenarios, risk register, task board, and next
  steps were updated. The first smoke attempt failed because the smoke rule
  incorrectly required `payload.status`; the script now matches the stable
  `stage_completed` event type.

- 2026-05-11: Completed V1CTRL-002 Canonical Queue Cleanup. Converted
  `docs/planning/mvp-next-commits.md` into a small active queue plus
  historical archives, added `docs/operations/v1-project-control-system.md`,
  and queued `V1EVID-001 Company OS Lifecycle Trace Smoke` as the next
  evidence-led task. Validation passed with `git diff --check` warnings only.

- 2026-05-10: Completed V1CTRL-001 Function Coverage Ledger. Added
  `docs/operations/v1-code-surface-index.md`,
  `docs/operations/v1-function-coverage-ledger.csv`, and
  `docs/operations/v1-function-coverage-audit.md` to give future agents a
  module-by-module view of code ownership, expected behavior, local evidence,
  target evidence, blockers, risk, priority, and next verification. Validation
  passed with `git diff --check` warnings only.

- 2026-05-09: Completed CCOS-019 Company OS Stage Lifecycle Command Service
  Extraction. Extracted `startStageCommand`, `blockStageCommand`,
  `validateStageCommand`, and `completeStageCommand` inside the Company OS
  route module, leaving the HTTP handlers as thin parse/auth/command/response
  wrappers. The refactor preserves existing approval checks, acceptance
  criteria gates, stable error codes, event emission, audit logs, and response
  payloads. Validation passed with `npm run build`, Docker rebuild, migration
  deploy, and `node --test 'dist/tests/**/*.test.js'`.

- 2026-05-09: Completed CCOS-020 Company OS Automation Lifecycle Proposal
  Execution. Automation evaluator execution now maps `start_stage`,
  `block_stage`, `validate_stage`, and `complete_stage` proposals to the
  shared stage lifecycle command functions after writing automation proposal
  evidence. Successful lifecycle commands return command audit references, and
  rejected commands create `automation_rule_failed` evidence with the stable
  lifecycle error. Validation passed with `npm run build`, Docker rebuild,
  migration deploy, and `node --test 'dist/tests/**/*.test.js'`.

- 2026-05-09: Completed UXA-017 React Workbench Third Route Candidate. Added
  `/react-areas` as a parallel React operating-area workbench using the
  existing `/v1/connection` contract, shared React route-kit state loading,
  DaisyUI metrics, local notice, filters, coverage cards, and table primitive.
  Validation passed with `npm run build`, Docker rebuild, seed, signed-out and
  signed-in Playwright checks for `/react-areas`, desktop/mobile overflow
  checks, and the Docker migration/test gate.

- 2026-05-09: Completed UXA-018 React Canonical Route Switch Decision.
  Decided not to replace `/tasks-adapter`, `/settings/integrations`, or
  `/areas` with their React preview counterparts yet. The React routes now
  prove shared read/filter workbench patterns, but vanilla routes still own
  typed CRUD, provider setup, Drive setup/import, relationship review, and
  provider/Drive scope mapping actions. The next slice is UXA-019, focused on
  adding mapping-parity signals to `/react-areas` without switching routes.

- 2026-05-09: Completed UXA-019 React Areas Mapping Parity Slice. Added
  provider scope, Drive folder scope, and ClickUp execution-scope signal cards
  to `/react-areas`, using only existing `/v1/connection` data and linking
  back to current owner action surfaces. Validation passed with
  `npm run build`, Docker rebuild, seed, signed-in Playwright checks for
  signal cards and action links, desktop/mobile overflow checks, and the
  Docker migration/test gate.

- 2026-05-09: Completed UXA-020 React Areas Data Contract Gap Decision.
  Decided not to add a new dedicated React areas backend read API yet. Existing
  `/v1/operating-model/external-mappings` and `/v1/google-drive/files`
  endpoints are the correct source for provider mapping and Drive folder
  ownership data. The gap is React route-kit composition, so UXA-021 will reuse
  those endpoints in `/react-areas`.

- 2026-05-09: Completed UXA-021 React Areas Relationship Data Hook. Added typed
  React route-kit loaders for `/v1/operating-model/external-mappings` and
  `/v1/google-drive/files`, loaded them in parallel with `/v1/connection`, and
  enriched `/react-areas` with real provider mapping counts, Drive ownership
  counts, and provider/Drive review queues. Validation passed with
  `npm run build`, Docker rebuild, migration deploy plus seed, focused
  signed-out/signed-in Playwright route checks, desktop/mobile overflow checks,
  and zero console errors.

- 2026-05-09: Completed UXA-022 React Areas Canonical Switch Decision. Decided
  not to replace canonical `/areas` yet. `/react-areas` now has strong
  read/review parity, but canonical `/areas` still owns direct provider mapping
  and Google Drive scope assignment controls through existing PATCH endpoints.
  UXA-023 is queued to add those write controls to React before any route
  switch.

- 2026-05-09: Completed UXA-023 React Areas Scope Assignment Controls. Added
  React route-kit clients for the existing provider mapping and Google Drive
  scope PATCH endpoints, then exposed operating-area assignment selects inside
  `/react-areas` provider and Drive review queues. Local feedback is shown
  before the workbench refreshes. Validation passed with `npm run build`,
  Docker rebuild, migration deploy plus seed, focused Playwright action checks
  against controlled local fixtures, API readback for assigned area IDs,
  desktop/mobile overflow checks, and zero console errors.

- 2026-05-09: Completed UXA-024 React Areas Canonical Switch Decision. Decided
  not to replace canonical `/areas` yet. `/react-areas` now covers read/review
  and unassigned provider/Drive scope assignment, but vanilla `/areas` still
  owns user-created area lifecycle controls, selected-area database record
  previews, and reassignment controls for already assigned provider/Drive
  items. UXA-025 is queued to add area lifecycle controls to React before any
  route switch.

- 2026-05-09: Completed UXA-025 React Areas Area Lifecycle Controls. Added
  React route-kit helpers for the existing operating area create/delete
  endpoints and exposed a lifecycle panel on `/react-areas` for user-created
  area creation plus deletion with safe reassignment. System areas remain
  protected in the React UI. Validation passed with `npm run build`, Docker
  rebuild, migration deploy plus seed, focused Playwright lifecycle action
  checks, API readback, desktop/mobile overflow checks, and zero console
  issues.

- 2026-05-09: Completed UXA-026 React Areas Selected Context Parity Decision.
  Decided not to add a new selected-area backend route. React should reuse the
  existing typed table routes `/v1/{apiSlug}` for record previews, alongside
  the current operating-model, Google Drive files, and provider mapping
  endpoints. UXA-027 is queued to load those records into the React route kit
  and render selected-area context in `/react-areas`.

- 2026-05-09: Completed UXA-027 React Areas Selected Context Data Hook. Added
  capability-filtered table record snapshot loading through existing
  `/v1/{apiSlug}` routes and rendered selected-area context in `/react-areas`
  with table counts, record previews, assigned Drive items, and assigned
  provider mappings. Validation passed with `npm run build`, Docker rebuild,
  migration deploy plus seed, focused Playwright selected-context checks,
  desktop/mobile overflow checks, and zero console issues.

- 2026-05-09: Completed UXA-028 React Areas Assigned Scope Reassignment
  Controls. Added selected-context operating-area selects for already assigned
  provider mappings and Drive items, reusing the existing React assignment
  handlers and PATCH scope endpoint helpers. Validation passed with
  `npm run build`, Docker rebuild, migration deploy plus seed, focused
  Playwright reassignment checks, API readback for target area IDs, fixture
  restoration, desktop/mobile overflow checks, and zero console issues.

- 2026-05-09: Completed UXA-029 React Areas Canonical Route Switch Decision.
  Approved switching canonical `/areas` to the React workbench after validated
  read, lifecycle, selected context, and scope reassignment parity. The
  implementation slice must keep `/react-areas` as an alias and preserve the
  vanilla code for rollback instead of deleting it.

- 2026-05-09: Completed UXA-030 React Areas Canonical Route Switch. Moved
  canonical `/areas` to the React app route handling and rendered
  `ReactAreasApp` for both `/areas` and `/react-areas`. Validation passed with
  `npm run build`, Docker rebuild, migration deploy plus seed, signed-out and
  signed-in Playwright checks for `/areas`, alias checks for `/react-areas`,
  desktop/mobile overflow checks, and zero console issues.

- 2026-05-10: Completed UXA-031 V1 Architecture Completion Audit. Published
  `docs/planning/v1-architecture-control-map.md`, a unified control map for
  current state, target state, local V1 completion boundaries, external
  blockers, implemented capability lanes, drift risks, and recommended next
  queue. The audit states that local architecture-derived V1 work is
  substantially complete for the approved Company OS, MCP, ClickUp,
  operating-model, owner UI, and agent-access scope; remaining items are
  external blockers, V2 choices, or project-control follow-up.

- 2026-05-09: Completed CCOS-001 Company OS Stage 1 Data Foundation. Audited
  current architecture and persistence, then added workspace-scoped models and
  migration SQL for company roles, processes, pipelines, enriched pipeline
  stages, procedures, procedure steps, standards, resources, tool adapters, and
  integration capabilities. The seed now creates LuckySparrow's first seven
  pipelines with roles, adapter capabilities, SOPs, stages, and resources.
  The operating model catalog now exposes the new Company OS tables, and
  pipeline stage API writes use validated `OperatingStatus`. Validation
  evidence is recorded in
  `docs/planning/company-os-stage1-task-contracts.md`.

- 2026-05-09: Completed CCOS-002 Company OS Stage 2 Runtime Evidence
  Foundation. Added workspace-scoped pipeline runs, stage runs, approvals,
  checklist templates/items, acceptance criteria, audit logs, and event
  actor/resource/correlation fields. The operating model catalog and seed
  registry now expose runtime evidence tables, and the seed adds a default
  pipeline-run evidence checklist. Targeted tests cover run, stage, approval,
  acceptance criteria, audit, and correlated event relations.

- 2026-05-09: Completed CCOS-003 Company OS Stage 3 Governance Intelligence
  Foundation. Added workspace-scoped policies, metrics, risks, controls,
  knowledge items, decision logs, automation rules, triggers, artifacts,
  dependencies, business functions, and stakeholders. The operating model
  catalog and seed registry expose the new tables; seed data creates the 12
  LuckySparrow business functions plus default deployment governance records.
  Targeted tests cover policy, metric, risk/control, knowledge, decision log,
  automation rule/trigger, artifact, dependency, business function, and
  stakeholder relations.

- 2026-05-09: Completed CCOS-004 Company OS Read API Surface. Added
  `/v1/company-os` and root compatibility aliases as a read-only cockpit and
  allowlisted collection-read API for Stage 1-3 Company OS records. Added the
  `company-os:read` capability and connection-manifest routes, plus integration
  test coverage for owner and scoped-service access.

- 2026-05-09: Completed MCP-002 CompanyCore MCP Bridge Server. Added
  `scripts/companycore-mcp-server.mjs` and `npm run mcp:server` as a thin
  stdio MCP bridge. It reads `/v1/mcp/manifest`, exposes MCP `tools/list`, and
  executes `tools/call` through the CompanyCore HTTP API with the configured
  workspace service key. Added operational setup docs in
  `docs/operations/companycore-mcp-bridge.md`.

- 2026-05-09: Completed MCP-003 MCP Agent Key Profiles. Added canonical
  backend profiles for MCP Company OS reader, knowledge reader, memory writer,
  event worker, and operator service keys. Owners can read profiles from
  `/v1/api-keys/profiles` and create a key with `profileId`; owner-console
  presets now include MCP scopes and current Google Drive capabilities.

- 2026-05-09: Completed MCP-004 Dynamic MCP Profile UI Loading. The
  owner-console API key screen now loads canonical MCP profiles from
  `/v1/api-keys/profiles`, maps them into the preset UI, keeps static presets
  only as fallback data, and creates unchanged profile keys with `profileId`.

- 2026-05-09: Completed MCP-005 MCP Bridge Runtime Smoke Harness. Added
  `scripts/companycore-mcp-smoke.mjs` and `npm run mcp:smoke` to start the
  stdio bridge, verify `initialize`, `tools/list`, and execute a safe
  `companycore_get_company_os` tool call. The integration test now creates a
  real `mcp_company_os_reader` profile key and runs the smoke against the live
  in-test API server.

- 2026-05-09: Completed MCP-006 MCP Agent Runtime Setup Guide. Added
  `docs/operations/mcp-agent-runtime-setup.md` with profile selection,
  key-creation guidance, Codex, Paperclip-style, and generic MCP runtime
  snippets, smoke instructions, prompt contract, setup checklist, and failure
  handling. Linked the guide from MCP API and bridge docs.

- 2026-05-09: Completed UXA-016 React Route Shell Extraction. Added
  `web/src/react-route-kit.tsx` for reusable connection/task types, API
  loaders, dashboard/tasks/integration state hooks, provider metrics, company
  area filtering, shell, local notice, data table, and metric card primitives.
  Existing `/react-dashboard`, `/react-tasks`, and `/react-integrations`
  routes continue to build without a canonical route switch.

- 2026-05-09: Completed CCOS-005 Company OS Dashboard Surface. Added
  `/react-company-os`, served by the backend React route allowlist, as the
  first cockpit UI on top of `/v1/company-os`. The route loads the owner
  session and Company OS cockpit data, then renders definition, runtime,
  governance, attention, collection, adapter-health, and recent-evidence
  signals using the shared React route kit.

- 2026-05-09: Completed CCOS-006 Company OS Collection Drill-Down. Extended
  `/react-company-os` with read-only collection previews for pipelines,
  approvals, audit logs, risks, and tool adapters using
  `/v1/company-os/:collection`. The drill-down keeps write workflows closed
  and uses shared React route kit state, notice, and table primitives.

- 2026-05-09: Completed CCOS-007 Company OS Collection Detail Route. Added
  selected-record inspection to `/react-company-os`, backed by
  `/v1/company-os/:collection/:id`, with idle, loading, signed-out, error, and
  ready states plus readable key fields and capped raw API evidence. The slice
  keeps lifecycle writes closed.

- 2026-05-09: Completed CCOS-008 Company OS Agent Context Panel. Added a
  read-only MCP-oriented agent operating packet to `/react-company-os`, loading
  `/v1/tasks` plus Company OS pipelines, procedures, tool adapters, policies,
  acceptance criteria, and approvals through existing API routes. The slice
  keeps lifecycle writes closed and does not add a separate permission layer.

- 2026-05-09: Completed CCOS-009 Company OS Approval Lifecycle Design.
  Documented command-shaped approval request and approval decision routes in
  the architecture and API contracts. Future Company OS writes must remain
  lifecycle-specific, emit events, append audit logs, derive workspace from
  auth, and fail closed for missing capabilities, invalid approval state,
  expired approvals, cross-workspace resources, and invalid transitions.

- 2026-05-09: Completed CCOS-010 Company OS Approval Lifecycle Backend.
  Implemented `POST /v1/company-os/approvals/request` and
  `POST /v1/company-os/approvals/:id/decision` with new capability gates,
  MCP manifest exposure, workspace/resource checks, one-time pending approval
  decisions, `approval_requested` / `approval_approved` / `approval_rejected`
  events, and `approval.requested` / `approval.decided` audit logs.

- 2026-05-09: Completed CCOS-011 Company OS Approval UI Actions. Added
  owner-facing request approval and approve/reject controls to
  `/react-company-os`, using the audited approval lifecycle command routes and
  local action feedback. The cockpit refreshes context after successful
  actions and still avoids raw table mutation.

- 2026-05-09: Completed CCOS-012 Company OS Pipeline Stage Lifecycle Design.
  Documented stage lifecycle command routes for starting, blocking,
  validating, and completing stage runs. The design requires approval
  references when risk/policy/stage/tool rules require them, acceptance
  criteria evidence before completion, command-specific events, and audit log
  entries with correlation IDs.

- 2026-05-09: Completed CCOS-013 Company OS Stage Lifecycle Backend.
  Implemented `POST /v1/company-os/pipeline-runs/:id/actions/start-stage`,
  `POST /v1/company-os/stage-runs/:id/actions/block`,
  `POST /v1/company-os/stage-runs/:id/actions/validate`, and
  `POST /v1/company-os/stage-runs/:id/actions/complete` with capability
  gates, active-stage conflict checks, approval validation, required
  acceptance criteria enforcement, `stage_started` / `stage_blocked` /
  `stage_validated` / `stage_completed` events, matching `stage_run.*` audit
  actions, and MCP manifest exposure.

- 2026-05-09: Completed CCOS-014 Company OS Stage Lifecycle UI Actions.
  Extended the shared React route kit with stage lifecycle command clients and
  added owner-facing Start, Block, Validate, and Complete controls inside the
  `/react-company-os` agent context panel. The UI loads pipeline runs,
  pipeline stages, stage runs, acceptance criteria, and approvals through
  existing Company OS collection APIs, submits lifecycle commands through the
  audited backend routes, shows local success/error feedback, and refreshes
  cockpit context after successful actions.

- 2026-05-09: Completed CCOS-015 Company OS Automation Rule Execution Design.
  Documented the automation execution boundary as event-driven trigger
  matching plus declarative condition evaluation, followed by action proposals
  that request approval or call existing lifecycle commands. The architecture
  and API docs now define dry-run versus execute behavior, first allowed
  action kinds, planned `company-os:automation:execute` capability,
  idempotency expectations, event/audit evidence, and MCP-safe exposure.

- 2026-05-09: Completed CCOS-016 Company OS Automation Rule Evaluator Backend.
  Added `company-os:automation:execute`, exposed
  `POST /v1/company-os/events/:id/actions/evaluate-automation-rules` through
  the adapter/MCP manifest, and implemented event-driven rule evaluation with
  `dry_run`, audited `execute`, idempotency checks, pending approval creation,
  informational event emission, scoped key denial, and fail-closed evidence for
  lifecycle action proposals.

- 2026-05-09: Completed CCOS-017 Company OS Automation Evaluator UI Actions.
  Extended the shared React route kit with an automation evaluator client and
  recent cockpit events in the agent context. `/react-company-os` now includes
  owner-facing evaluator controls for source event, mode, optional rule IDs,
  idempotency key, and context reason, plus local action feedback and result
  metrics for matched rules, proposals, executed actions, and audit logs.

- 2026-05-09: Completed CCOS-018 Company OS Automation Lifecycle Helper Reuse
  Design. Documented that stage lifecycle transition logic must move into a
  shared internal command service used by both HTTP routes and automation
  evaluator actions. Lifecycle action proposals remain fail-closed until that
  behavior-preserving extraction exists.

- 2026-05-09: Completed UXA-014 React Integration Map Workbench Route. Added
  `/react-integrations` as a parallel React route served by the existing React
  build. The route reads live `/v1/connection` data, shows integration
  readiness guidance, provider/data-path cards for ClickUp, Drive, API, and
  the operating model, metrics, search/coverage filters, and a 12-area
  operating coverage table that excludes only the `main-general` fallback from
  the company-area rows. Validation passed: `npm run build`,
  `npm run validate`, `git diff --check`, Browser signed-out route check,
  signed-in desktop/mobile rendered checks, `npm run owner-console:ux-smoke`
  against isolated `http://localhost:3008`, and container-scoped Prisma
  migration plus Node integration test.

- 2026-05-09: Completed UXA-013 React Workbench Canonical Route Decision.
  `/react-tasks` remains a parallel React workbench for now. The canonical
  `/tasks-adapter` route is preserved until another React workbench proves the
  route migration pattern and the next switch decision can consider parity
  with less risk. UXA-014 is activated as the next route migration slice:
  React Integration Map Workbench Route.

- 2026-05-08: Completed UXA-012 React Workbench Route Migration. Added
  `/react-tasks` as the first real React workbench route, served by the
  existing React build while preserving `/tasks-adapter` and `/data/tasks`.
  The route loads `/v1/connection` and `/v1/tasks` from the owner session,
  shows signed-out/loading/empty/error/success states, task metrics, search,
  status/source/list filters, and a reusable task table. Validation passed:
  `npm run build`, `npm run validate`, Browser signed-out route check,
  targeted signed-in desktop/mobile rendered checks, `git diff --check`,
  `npm run owner-console:ux-smoke` against isolated `http://localhost:3007`,
  and container-scoped Prisma migration plus Node integration test. The first
  owner-console smoke was invalid because it ran in parallel with the
  integration test mutating the same isolated database; rerun after reseed
  passed cleanly.

- 2026-05-08: Completed UXA-011 React Table And Notification Primitive
  Migration. Added reusable `LocalNotice` and generic `DataTable` primitives,
  rendered live operating-model preview rows on `/react-dashboard`, contained
  mobile table overflow, added `scripts/clean-react-build.mjs`, and copied
  scripts into the Docker build stage. Validation passed: `npm run build`,
  `npm run validate`, targeted rendered desktop/mobile React checks,
  `npm run owner-console:ux-smoke`, container migration and integration test,
  and `git diff --check`.

- 2026-05-08: Completed UXA-010 React Dashboard Component Migration. Added the
  `companycore` DaisyUI theme, live owner-session `/v1/connection` loading,
  signed-out/loading/error/connected states, and reusable React dashboard
  primitives while preserving the existing vanilla `/dashboard`. Validation
  passed: `npm run build`, `npm run validate`, targeted rendered desktop/mobile
  React checks, `npm run owner-console:ux-smoke`, container migration and
  integration test, and `git diff --check`.

- 2026-05-08: Completed UXA-009 React Tailwind DaisyUI Migration Foundation.
  Added React/Vite/Tailwind/DaisyUI dependencies and config, `web/` source,
  `/react-dashboard`, Docker build integration, and ignored generated
  `public/react/` assets. Validation passed: `npm run build`,
  `npm run validate`, Browser route load, targeted rendered desktop/mobile
  React checks, `npm run owner-console:ux-smoke`, container migration and
  integration test, and `git diff --check`.

- 2026-05-08: Completed UXA-008 Dashboard Iconography And UX Governance. Added
  `@phosphor-icons/web`, vendored the Phosphor bold webfont/CSS under
  `public/vendor/phosphor/bold/`, applied operational dashboard iconography,
  and documented canonical management-first UI rules plus the Tailwind/DaisyUI
  decision boundary. Validation passed: `npm run build`, `npm run validate`,
  targeted rendered checks, `npm run owner-console:ux-smoke`, container
  migration/integration test, and `git diff --check`.

- 2026-05-08: Completed UXA-007 Mobile Private Header Compression. Updated
  mobile private-shell CSS so authenticated phone routes show one compact
  topbar row with Menu, current route, and Sign out, while desktop/tablet keep
  module search and Account/API shortcuts. Validation passed: `npm run build`,
  `npm run validate`, targeted Playwright screenshots for mobile and desktop,
  `npm run owner-console:ux-smoke` against isolated `http://localhost:3006`,
  and container-scoped Prisma migration plus Node integration test in isolated
  `companycore_uxa007`.
- 2026-05-08: Completed UXA-006 Local Action Feedback Placement. Added local
  `aria-live` status slots for login, registration, ClickUp setup, and Google
  Drive setup/import; wired auth, ClickUp, and Drive handlers to local pending,
  success, and error feedback; preserved typed editor/API key local status and
  global result-panel metrics. Validation passed: `node --check public/app.js`,
  `npm run build`, `npm run validate`, Playwright local feedback checks,
  `npm run owner-console:ux-smoke` against isolated `http://localhost:3005`,
  and container-scoped Prisma migration plus Node integration test in isolated
  `companycore_uxa006`. Browser opened the route but interaction fallback was
  required because Browser failed on `locator.fill`.
- 2026-05-08: Completed UXA-005 Workbench Visual Role Cleanup. Updated shared
  CSS so dense workbench filters are quieter, repeated rows are lighter,
  selected rows use stronger non-color-only inset markers, record inspectors
  read as selected-detail surfaces, and relationship/compact rows keep readable
  boundaries without matching every panel's weight. Validation passed:
  `node --check public/app.js`, `npm run build`, `npm run validate`,
  container-scoped Prisma migration plus Node integration test in isolated
  `companycore_uxa005`, `git diff --check`, and
  `npm run owner-console:ux-smoke` against `http://localhost:3004`.
  Screenshot artifacts:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-13-50-112Z`.
- 2026-05-08: Completed UXA-004 Mobile Auth Action-First Layout. Updated
  responsive auth CSS so `/auth/login` and `/auth/register` keep desktop
  context-plus-form columns, while stacked mobile layouts put the form before
  onboarding context. Mobile screenshots confirm sign-in and create-workspace
  submit actions are visible in the first viewport. Validation passed:
  `node --check public/app.js`, `npm run build`, rendered Browser DOM check
  with zero console issues, local Playwright desktop/mobile auth screenshots,
  and `git diff --check`. Browser screenshot capture timed out, so viewport
  evidence used Playwright fallback. Artifacts:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-auth-ux-smoke\2026-05-08T20-08-09-640Z`.
- 2026-05-08: Completed UXA-003 Dashboard First-Viewport Command Polish.
  Updated `/dashboard` so the first private viewport centers on one current
  priority action, one secondary action, compact workspace/integration/data
  evidence, and the top attention items. Removed the competing health-card row,
  renamed the large launcher to secondary `Explore modules`, reduced the lower
  next-action panel from ten links to three, and removed secondary header
  shortcuts that appeared above the primary action on mobile. Validation
  passed: `node --check public/app.js`, `npm run build`, `npm run validate`,
  container-scoped Prisma migration plus Node integration test, `git diff
  --check`, and `npm run owner-console:ux-smoke` against isolated
  `http://localhost:3002`. Screenshot artifacts:
  `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-00-12-315Z`.
  Captured guardrail: use isolated compose projects for seeded UI smoke when
  the default local database has been touched by integration tests.
- 2026-05-08: Completed UXA-002 Authenticated Private Route UX Evidence
  Harness. Added `scripts/owner-console-ux-smoke.mjs`,
  `npm run owner-console:ux-smoke`, and Playwright package metadata for local
  screenshot evidence. The smoke authenticates through `/auth/login`, injects
  the local owner token into session storage before private route load, and
  captures `/dashboard`, `/data`, `/data/tasks`, `/areas`, `/relationships`,
  `/settings/drive`, and `/settings/api` at desktop `1440x960`, tablet
  `834x1112`, and mobile `390x844`. It also proves module search, data
  filtering, task editor draft state, and disabled Drive import setup without
  submitting writes. Local run passed against `http://localhost:3000`; artifacts
  are in
  `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T19-47-08-826Z`
  with zero console issues. Screenshot review confirms UXA-003 as the next
  slice: dashboard first viewport is still too panel-heavy and mobile pushes
  the primary action below the fold. Validation passed: script syntax check,
  `npm run build`, `npm run validate`, `git diff --check`, the owner-console UX
  smoke, and a container-scoped Prisma migration plus Node test run inside the
  backend service.
- 2026-05-08: Completed UXA-001 CompanyCore V1 UX/UI Audit. Added
  `docs/ux/companycore-v1-ux-ui-audit.md`, reviewed project UX contracts,
  production public/auth routes, mobile auth screenshots, local Docker runtime
  health on `http://localhost:3001`, and seeded authenticated API state
  (`52` capabilities, `13` areas, `14` tables, no ClickUp/Drive/tasks in local
  seed). The audit scored the current owner console at `3.42/5` and queued
  `UXA-002..UXA-006`, starting with an authenticated private-route evidence
  harness before dashboard and mobile-auth polish. Browser could not complete
  authenticated private clickthrough because this Browser runtime failed typing
  into `input[type=email]` and blocked `javascript:` session injection.
- 2026-05-08: Completed CCV1-061 Agent State Source-Of-Truth Sync. Replaced
  placeholder `.agents/state/*` continuation files with the current v1
  post-release focus, known blockers, health evidence, regression monitoring,
  and next-step queue. Activated AGRUN-009 as the next ready P2 analysis task
  to reconcile release automation evidence before changing deploy guidance.
  Validation passed: source-of-truth cross-check against
  `.agents/core/operating-system.md`, `.codex/context/TASK_BOARD.md`,
  `docs/planning/mvp-next-commits.md`, `docs/operations/v1-operator-handoff.md`,
  `docs/operations/v1-release-readiness.md`, and `git diff --check`.
- 2026-05-08: Completed AGRUN-009 Deploy Automation Reliability evidence
  reconciliation. Public production checks returned `200` for
  `https://api.companycore.luckysparrow.ch/health`,
  `https://api.companycore.luckysparrow.ch/v1/health`, and
  `https://companycore.luckysparrow.ch/`. `/health` reported build commit and
  image `71f3eb3b063ea68226a1736c727c52882b33f27a`. The historical planning
  note about auto-deploy commit `63348d6` is not treated as superseding
  operations truth because no matching post-deploy smoke entry exists. Manual
  VPS backend rollover remains the approved release path until a future
  push-to-running-image smoke proves reliable auto-deploy. VPS container
  inventory could not be refreshed because the available SSH key/password path
  was rejected.
- 2026-05-08: Completed AGRUN-008 Route-Level Business Editing Surfaces
  evidence reconciliation. Local source contains `renderNoteEditor`,
  `renderProjectEditor`, `renderClientEditor`, `renderTaskListEditor`, and
  `renderTaskEditor`; production
  `https://companycore.luckysparrow.ch/app.js` contains the same markers plus
  `taskEditorDueDate`. The AGRUN-COV-007 ledger row is now PASS locally and in
  production evidence. No additional UI was added because the typed editor
  slices already close the tracked route-level business editing gap.
- 2026-05-08: Completed CCV1-062 V1 Operator Runtime Pointer Refresh.
  `docs/operations/v1-operator-handoff.md` and
  `docs/operations/rollback-and-recovery.md` now reference the current public
  `/health` build/image
  `71f3eb3b063ea68226a1736c727c52882b33f27a` instead of older runtime pointers.
  The docs explicitly note that VPS Docker inventory was not refreshed because
  the available SSH key/password path was rejected, so an approved operator
  shell should refresh container inventory before an actual rollback.
- 2026-05-08: Completed CCV1-063 Historical Next Steps Refresh. Replaced stale
  early-v1 guidance in `docs/NEXT_STEPS.md` with the current accepted v1
  boundary, blocked work, and canonical queue pointers. Updated
  `docs/planning/mvp-execution-plan.md` to historical/implemented status and
  refreshed `docs/planning/planning-catalog-index.md` so AGRUN is classified
  as external-blocked, V2WEB is recorded through V2WEB-049, and Google Drive v2
  is external-blocked on owner consent/import proof. Validation passed:
  `git diff --check` and source-of-truth review.
- 2026-05-08: Completed CCV1-064 Historical Checklist Closure. Marked stale
  unchecked AGCRUD planning criteria as complete because AGCRUD-001 through
  AGCRUD-006 are done, and updated the old CCV1-009 contract from blocked to
  done using later production smoke, v1 release readiness, and operator handoff
  evidence. Validation passed: `git diff --check` and targeted planning-source
  search.
- 2026-05-08: Completed CCV1-065 Front-Door Docs Scope Refresh. Updated
  `docs/README.md`, `docs/API.md`, and `docs/DEPLOYMENT.md` so the public docs
  describe the current owner console, typed business editors, and Google Drive
  v2 foundation instead of the earlier minimal-console/backend-only scope.
  Validation passed: `git diff --check` and targeted front-door docs search.
- 2026-05-08: Completed CCV1-066 Historical Guardrail Plan Classification.
  Marked `docs/planning/auth-workspace-integration-plan.md` and
  `docs/planning/regression-prevention-plan.md` as implemented historical plans,
  refreshed their headings from pre-stability language to completed guardrail
  language, and indexed both in `docs/planning/planning-catalog-index.md`.
  Validation passed: `git diff --check` and targeted planning-source search.
- 2026-05-08: Completed CCV1-067 Tech Stack Runtime Status Refresh. Updated
  `docs/architecture/tech-stack.md` to reflect the accepted owner console,
  implemented owner/service auth, Prisma migration deploy path, `npm test`,
  ClickUp maintenance scheduler, and Google Drive v2 foundation. Validation
  passed: `git diff --check` and targeted architecture-doc search.

- 2026-05-07: Completed V2WEB-049 Table Workbench Empty State Polish.
  The `/data-table` workbench now uses actionable empty-state panels for
  unsupported table routes, protected signed-out routing, empty record lists,
  filtered-out lists, and inspector selection/creation context. The slice added
  local `New draft` and `Clear filters` actions through existing table
  workbench state without changing backend behavior, API routes, or CRUD
  semantics.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55505`,
  and local Playwright smoke against disposable Postgres on port `55504`.
  Smoke verified protected `/data/notes` sign-in feedback, empty Notes state,
  note creation, filtered-out list and inspector states, `Clear filters`,
  mobile layout, and no console/page errors or horizontal overflow. Browser
  plugin fallback note: the Browser tool was not exposed in this session.

- 2026-05-07: Completed V2WEB-048 Global Feedback Panel Polish.
  The shared `#resultPanel` now uses accessible live feedback, a tone label,
  and a bordered message box so success states read as `Success` and
  recoverable error states read as `Needs attention` while preserving existing
  result messages, sync metrics, and action behavior.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55503`,
  and local Playwright desktop/mobile feedback smoke with no unexpected console
  or page errors and no horizontal overflow. Smoke verified wrong-login error
  feedback and successful workspace creation feedback; the expected
  `401 Unauthorized` response from the wrong-login action was filtered as the
  tested failure path. Browser plugin fallback note: in-app Browser could not
  initialize because node_repl resolved Node `22.13.0` while the plugin
  requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-047 Public Entry Context Polish.
  `/` now includes public entry pills for ClickUp, Google Drive, agent-safe
  API, and operating areas plus a compact operational console card instead of
  the previous minimal Web UI status chip. The route preserves public
  sign-in/register navigation and auth behavior.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55501`,
  and local Playwright desktop/mobile `/` smoke with no console errors or
  horizontal overflow. Smoke verified public entry copy and navigation to
  `/auth/login` plus `/auth/register`. Browser plugin fallback note: in-app
  Browser could not initialize because node_repl resolved Node `22.13.0` while
  the plugin requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-046 Auth Onboarding Context Polish.
  `/auth/login` now includes an owner onboarding context panel and
  `/auth/register` now includes a workspace bootstrap context panel. The
  panels explain workspace ownership, integration setup, operating areas,
  provider imports, and agent-safe API access before the owner reaches the
  private console while preserving existing auth forms and behavior.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55499`,
  and local Playwright desktop/mobile auth smoke with no console errors or
  horizontal overflow. Smoke verified login/register context copy, navigation
  between auth routes, and successful registration redirect to `/dashboard`.
  Browser plugin fallback note: in-app Browser could not initialize because
  node_repl resolved Node `22.13.0` while the plugin requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-045 ClickUp Setup Context Polish.
  `/settings` now includes a compact ClickUp adapter command panel before the
  setup form. The panel shows ClickUp status, token readiness, workspace
  selection state, selected/saved/loaded List counts, ClickUp task count,
  import mode, and links to the local setup form, `/tasks-adapter`, and
  `/settings/integrations` through existing navigation while preserving token
  check, refresh, Workspace select, List picker, import mode, save, and sync
  controls. The ClickUp token placeholder was shortened so the mobile form
  stays readable.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55497`,
  and local Playwright desktop/mobile `/settings` smoke with no console errors
  or horizontal overflow. Smoke verified context copy, readiness/count pills,
  local setup anchor behavior, and SPA navigation to `/tasks-adapter` plus
  `/settings/integrations`. Browser plugin fallback note: in-app Browser could
  not initialize because node_repl resolved Node `22.13.0` while the plugin
  requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-044 Account Context Polish.
  `/settings/account` now includes a compact workspace command profile before
  account cards. The panel shows owner session state, workspace identity,
  ClickUp state, Drive state, API route count, active key count, scoped key
  count, operating-area count, and links to `/settings/integrations`,
  `/settings/api`, and `/areas` through existing navigation while preserving
  the account cards and readiness grid. The panel avoids exposing the raw
  missing-email fallback when the current connection payload does not include
  owner details.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55495`,
  and local Playwright desktop/mobile `/settings/account` smoke with no console
  errors or horizontal overflow. Smoke verified context copy,
  readiness/count pills, and SPA navigation to `/settings/integrations`,
  `/settings/api`, and `/areas`. Browser plugin fallback note: in-app Browser
  could not initialize because node_repl resolved Node `22.13.0` while the
  plugin requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-043 Integration Map Context Polish.
  `/settings/integrations` now includes a compact integration command map
  before provider cards. The panel shows readiness, implemented group count,
  operating-area count, ClickUp task count, Drive folder count, pipeline record
  count, API route count, Drive status, and links to `/settings`,
  `/settings/drive`, and `/settings/api` through existing navigation while
  preserving existing setup rows, filters, and the operating-area data matrix.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55493`,
  and local Playwright desktop/mobile `/settings/integrations` smoke with no
  console errors or horizontal overflow. Smoke verified context copy,
  readiness/count pills, and SPA navigation to `/settings`, `/settings/drive`,
  and `/settings/api`. Browser plugin fallback note: in-app Browser could not
  initialize because node_repl resolved Node `22.13.0` while the plugin
  requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-042 Google Drive Import Context Polish.
  `/settings/drive` now includes a compact Drive import context panel before
  OAuth setup. The panel shows OAuth client state, consent state, selected
  folder count, discovered folder count, imported item count, folder-review
  count, and links to the setup panel plus `/relationships` through existing
  navigation while preserving the OAuth form, setup guide, folder picker,
  import mode, Drive file filters, preview actions, and description editing.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55491`,
  and local Playwright desktop/mobile `/settings/drive` smoke with no console
  errors or horizontal overflow. Smoke verified context copy, OAuth/client
  readiness pills, selected/discovered/imported folder counts, setup anchor
  behavior, and SPA navigation to `/relationships`. Browser plugin fallback
  note: in-app Browser could not initialize because node_repl resolved Node
  `22.13.0` while the plugin requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-041 Operating Area Context Polish.
  `/areas` now includes a compact operating model context panel before the
  company operating map. The panel shows area count, table count, record count,
  provider mapping count, Drive item count, selected-area signal count,
  selected-area status, and links to `/relationships` plus
  `/settings/integrations` through existing SPA navigation while preserving
  the area rail, selected-area detail, filters, workbench, delete guardrails,
  assignment controls, and linked-content previews.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55489`,
  and local Playwright desktop/mobile `/areas` smoke with no console errors or
  horizontal overflow. Smoke verified context copy, area/table/record/provider
  mapping/Drive/selected-area signal pills, SPA navigation to `/relationships`,
  and SPA navigation to `/settings/integrations`. Browser plugin fallback note:
  in-app Browser could not initialize because node_repl resolved Node `22.13.0`
  while the plugin requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-040 API Agent Access Context Polish.
  `/settings/api` now includes a compact agent API context panel before the API
  summary cards and service-key workbench. The panel shows active key count,
  inactive key count, scoped key count, capability count, route count,
  write-route count, readiness state, and links into key creation plus
  `/settings/integrations` through existing SPA navigation while preserving
  scoped-key creation, copy-once raw key display, key rotation/deactivation,
  capability chips, route filters, and the route manifest list.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55487`,
  and local Playwright desktop/mobile `/settings/api` smoke with no console
  errors or horizontal overflow. Smoke verified the initial no-key context,
  `Create key` anchor behavior, scoped key creation, copy-once raw key display,
  post-create `Agent access ready` context refresh, and SPA navigation to
  `/settings/integrations`. Browser plugin fallback note: in-app Browser could
  not initialize because node_repl resolved Node `22.13.0` while the plugin
  requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-039 Relationships Mapping Context Polish.
  `/relationships` now includes a compact mapping context panel before the
  review queue. The panel shows provider mapping count, Drive folder count,
  review item count, filtered relationship visibility, mapping health, and
  links to `/areas` plus `/settings/integrations` through existing SPA
  navigation while preserving relationship filters, review rows, assign-area
  controls, and provider/Drive lists.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55485`,
  and local Playwright desktop/mobile `/relationships` smoke with no console
  errors or horizontal overflow. Smoke verified the context copy, provider and
  Drive count pills, and actions to `/areas` plus `/settings/integrations`.
  Browser plugin fallback note: in-app Browser could not initialize because
  node_repl resolved Node `22.13.0` while the plugin requires `>=22.22.0`.

- 2026-05-07: Completed V2WEB-038 Pipeline Workflow Context Polish.
  `/pipeline` now includes a compact workflow context panel before stats,
  filters, and the record feed. The panel explains that pipeline stages are
  reusable cross-department workflow infrastructure while clients, deals, and
  interactions are current CRM usage records. It shows workflow readiness,
  reusable stage count, CRM usage count, filtered visibility, implemented table
  count, and links to `/data/pipeline-stages` plus `/data/clients` through
  existing SPA navigation.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55483`,
  and local Playwright desktop/mobile `/pipeline` smoke with no console errors
  or horizontal overflow. The Playwright smoke verified workflow context copy,
  shared-stage versus CRM-usage pills, SPA navigation to
  `/data/pipeline-stages`, SPA navigation to `/data/clients`, and mobile
  first-viewport placement.

- 2026-05-07: Completed V2WEB-037 Tasks Adapter Context Polish.
  `/tasks-adapter` now includes a compact adapter context panel before task
  stats and the task table. The panel shows ClickUp connection state,
  ClickUp/local task split, selected ClickUp List count, workload health, sync
  state, and local actions to the typed task editor plus ClickUp settings while
  preserving existing filters, stats, refresh, and table behavior.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55481`,
  and local Playwright desktop/mobile `/tasks-adapter` smoke with no console
  errors or horizontal overflow. The Playwright smoke verified adapter context
  copy, ClickUp disconnected state, source/scope/workload/sync pills, SPA
  navigation to `/data/tasks`, SPA navigation to `/settings`, and first-viewport
  mobile placement.

- 2026-05-07: Completed V2WEB-036 Table Workbench Context Polish.
  `/data/:table` routes now include a compact table context panel that shows
  typed-editor versus read-only capability, API methods, write-action
  availability, loaded sources, visible field count, record/API counts, and a
  local next action. Typed modules expose `New draft`; read-only modules expose
  `Review API` through existing SPA navigation.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55479`,
  and local Playwright desktop/mobile `/data/:table` smoke with no console
  errors or horizontal overflow. The Playwright smoke verified `/data/tasks`
  typed context, `New draft` create-form entry, `/data/goals` read-only
  context, `Review API` SPA navigation, and first-viewport mobile placement.

- 2026-05-07: Completed V2WEB-035 Data Operations Index Polish. The `/data`
  module index now shows typed-editor versus read-only capability badges,
  compact API/write/area tags, and a responsive metrics/source side panel for
  each database module while preserving existing SPA route behavior.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55476`,
  and local Playwright desktop/mobile `/data` smoke with no console errors or
  horizontal overflow. The Playwright smoke verified 13 module rows, 5 typed
  editor rows, read-only badges, operation tags, task filtering, and navigation
  from `/data` to `/data/tasks`. Browser plugin validation was attempted first
  but remained blocked by the local Node REPL runtime requirement of Node
  `>=22.22.0`.

- 2026-05-07: Completed V2WEB-034 Command Bar Module Switcher Polish.
  The top command bar now uses "Jump to module", a tighter route-context style,
  and grouped module-switcher results that match the sidebar lanes: Command,
  Operate, Integrations, and Workspace. The active module is marked in the
  switcher without changing route paths or existing Enter/click navigation.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55473`,
  and local Playwright desktop/mobile command-bar smoke with no console errors
  or horizontal overflow. Browser plugin validation was attempted first but
  remained blocked by the local Node REPL runtime requirement of Node
  `>=22.22.0`.
- 2026-05-07: Completed V2WEB-033 App Shell Navigation Polish.
  The owner console sidebar now groups existing routes into Command, Operate,
  Integrations, and Workspace lanes while preserving route URLs, `data-link`,
  and `data-nav` behavior. Sidebar styles now include clearer active-route
  affordance, hover borders, and independent scrolling for constrained
  viewports. Validation passed: `node --check public/app.js`,
  `npm run build`, `git diff --check`, `npm test` against disposable Postgres
  on port `55471`, and local Playwright desktop/mobile `/dashboard` shell
  smoke with no console errors or horizontal overflow.
  Browser plugin validation was attempted first but remained blocked by the
  local Node REPL runtime requirement of Node `>=22.22.0`.
- 2026-05-07: Completed V2WEB-032 Dashboard Command Layout Polish.
  The dashboard first viewport now pairs the operational cockpit with the
  attention queue in a shared responsive command layout, keeps readiness lanes
  inside the cockpit, and uses a tighter health-card strip for workspace,
  ClickUp, API, and Drive status. Existing dashboard IDs and JavaScript state
  wiring were preserved. Validation passed: `node --check public/app.js`,
  `npm run build`, `git diff --check`, `npm test` against disposable Postgres
  on port `55469`, and local Playwright desktop/mobile `/dashboard` smoke with
  no console errors or horizontal overflow. Browser plugin validation was
  attempted first but remained blocked by the local Node REPL runtime
  requirement of Node `>=22.22.0`.
- 2026-05-07: Completed V2WEB-031 Cross-Department Pipeline Semantics.
  `/pipeline`, dashboard module metadata, module search grouping, integration
  taxonomy, and data module copy now describe pipelines as shared workflow
  infrastructure with current CRM usage records, not as a CRM-owned module.
  Source-of-truth docs now record that pipeline stages are reusable across
  departments while clients, deals, and interactions remain CRM records.
  Validation passed: `node --check public/app.js`, `npm run build`,
  `git diff --check`, `npm test` against disposable Postgres on port `55466`,
  and local Playwright desktop/mobile `/pipeline` smoke with no console errors
  or horizontal overflow. Browser plugin validation was attempted first but
  blocked by the local Node REPL runtime requirement of Node `>=22.22.0`.
- 2026-05-07: Completed V2GD-012 Drive Consent Guidance And Folder Picker.
  `/settings/drive` now explains Google OAuth consent Testing mode, test-user
  access, authorized redirect URI setup, and unverified-app behavior before the
  owner attempts sign-in. Added an owner-only
  `GET /v1/integration-settings/google_drive/folders/discover` endpoint that
  lists Drive folders through the saved OAuth token and exposes the route in
  `/v1/connection`. The web console now lets owners load Drive folders, select
  import roots with checkboxes, save the selected folders into integration
  config, and import from the checked selection while preserving manual folder
  IDs as an advanced fallback. Validation passed: `npm run build`,
  `node --check public/app.js`, `git diff --check`, `npm test` against
  disposable Postgres database `companycore_test` on port `55464`, and local
  authenticated Playwright desktop/mobile `/settings/drive` smoke with no
  console errors or mobile horizontal overflow.
- 2026-05-07: Completed V2WEB-030 Typed Tasks Editor Workbench. `/data/tasks`
  now has a typed task editor inside the reusable split record workbench:
  owners can create tasks, edit title, status, priority, due date, project,
  task-list, and description, and archive selected tasks through the existing
  Tasks API. The typed editor selector now covers Notes, Projects, Clients,
  Task Lists, and Tasks while keeping unrelated modules read-only. Refreshing
  the `tasks` table after mutations also updates the task adapter state so
  route-to-route UI stays coherent. Validation passed: `node --check
  public/app.js`, `npm run build`, `git diff --check`, `npm test` against
  disposable Postgres database `companycore_test` on port `55463`, and local
  authenticated Playwright desktop/mobile `/data/tasks` smokes that created,
  updated, archived, and reloaded real Tasks records.
- 2026-05-07: Deployed V2WEB-030 to production with manual VPS backend
  rollover after public health still reported `27479c5` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5a1904c`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:5a1904c336e9fd97e2f4a6842a886253eda56cf5`.
  Public `/health` reports commit
  `5a1904c336e9fd97e2f4a6842a886253eda56cf5`; production `app.js` includes
  `renderTaskEditor`, `taskEditorTitle`, `Create task`, and
  `taskEditorDueDate`.
- 2026-05-07: Completed V2WEB-029 Typed Task Lists Editor Workbench.
  `/data/task-lists` now has a typed task-list editor inside the reusable
  split record workbench: owners can create task lists, edit name, status,
  project linkage, and description, and archive selected task lists through
  the existing Task Lists API. The typed editor selector now covers Notes,
  Projects, Clients, and Task Lists while keeping unrelated modules read-only.
  A route-level UX hardening pass now preserves new task-list draft fields
  across background workspace refreshes and only clears the owner session on
  auth-shaped startup errors. Validation passed: `node --check public/app.js`,
  `npm run build`, `git diff --check`, `npm test` against disposable Postgres
  database `companycore_test` on port `55462`, and local authenticated
  Playwright desktop/mobile `/data/task-lists` smoke that created, updated,
  archived, and reloaded real Task Lists records.
- 2026-05-07: Deployed V2WEB-029 to production with manual VPS backend
  rollover after public health still reported `6aa94e8` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-eaad4fd`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:eaad4fd3a0e12435e0906b73691b5de77a18a1b6`.
  Public `/health` reports commit
  `eaad4fd3a0e12435e0906b73691b5de77a18a1b6`; production `app.js` includes
  `renderTaskListEditor`, `taskListEditorName`, `Create list`, and
  `updateTypedEditorDraft`.
- 2026-05-07: Completed V2WEB-028 Typed Clients Editor Workbench.
  `/data/clients` now has a typed CRM client editor inside the reusable split
  record workbench: owners can create clients, edit client name, status,
  company, email, and phone, and archive selected clients through the existing
  Clients API. The typed editor selector now covers Notes, Projects, and
  Clients while keeping unrelated modules read-only. Validation passed:
  `node --check public/app.js`, `npm run build`, `git diff --check`,
  `npm test` against disposable Postgres on port `55461`, and local
  authenticated Playwright desktop/mobile `/data/clients` smoke that created,
  updated, archived, and reloaded real Clients records.
- 2026-05-07: Deployed V2WEB-028 to production with manual VPS backend
  rollover after public health still reported `df4e7b2` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-fd4b2f3`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:fd4b2f3f32794a2538b50f76d315bcd3d1d8d135`.
  Public `/health` reports commit
  `fd4b2f3f32794a2538b50f76d315bcd3d1d8d135`; production `app.js` includes
  `renderClientEditor`, `clientEditorName`, and `Create client`.
- 2026-05-07: Completed V2WEB-027 Typed Projects Editor Workbench.
  `/data/projects` now has a typed project editor inside the reusable split
  record workbench: owners can create project workstreams, edit project name,
  status, and description, and archive selected projects through the existing
  Projects API. The typed editor selector now covers Notes and Projects while
  keeping unrelated modules read-only. Validation passed:
  `node --check public/app.js`, `npm run build`, `git diff --check`,
  `npm test` against disposable Postgres on port `55460`, and local
  authenticated Playwright desktop/mobile `/data/projects` smoke that created,
  updated, archived, and reloaded real Projects records.
- 2026-05-07: Deployed V2WEB-027 to production with manual VPS backend
  rollover after public health still reported `cf1dcf8` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9d50920`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:9d50920361aaeeaa494c795e01973d319dd859d9`.
  Public `/health` reports commit
  `9d50920361aaeeaa494c795e01973d319dd859d9`; production `app.js` includes
  `renderProjectEditor`, `projectEditorName`, and `Create project`.
- 2026-05-07: Completed V2WEB-026 Typed Notes Editor Workbench. `/data/notes`
  now has a typed note editor inside the reusable split record workbench:
  owners can create local notes, select a note to edit its content, save
  changes through `PATCH /v1/notes/:id`, and archive selected notes through the
  existing Notes API. The editor is scoped to the Notes table and is not a
  generic placeholder on unrelated modules. Validation passed:
  `node --check public/app.js`, `npm run build`, `git diff --check`,
  `npm test` against disposable Postgres on port `55459`, and local
  authenticated Playwright desktop/mobile `/data/notes` smoke that created,
  updated, archived, and reloaded real Notes records.
- 2026-05-07: Deployed V2WEB-026 to production with manual VPS backend
  rollover after public health still reported `3a96c3f` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-614e6b8`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:614e6b8f20fbfe28e6f8f4bef7234111ceb2c62c`.
  Public `/health` reports commit
  `614e6b8f20fbfe28e6f8f4bef7234111ceb2c62c`; `/data/notes` returns the SPA
  shell and production `app.js` includes `renderNoteEditor`,
  `noteEditorContent`, and `Archive selected`.
- 2026-05-07: Completed V2WEB-025 Generic Table Record Workbench. Data module
  rows now open `/data/:table`, where owners can inspect records through a
  split workbench with module stats, source/search filters, selected record
  state, readable field values, and raw JSON details. The slice is intentionally
  read/inspect only; create/edit/archive controls remain a later typed
  route-level task. Validation passed: `node --check public/app.js`,
  `npm run build`, `git diff --check`, `npm test` against disposable Postgres
  on port `55458`, and authenticated local Playwright desktop/mobile
  `/data/notes` smoke using a real note created through the API.
- 2026-05-07: Deployed V2WEB-025 to production with manual VPS backend
  rollover after public health still reported `d550579` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-0007f23`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:0007f2387ec6f162a651121f61b66a9388f03edb`.
  Production Postgres remained healthy. Public `/health` reports commit
  `0007f2387ec6f162a651121f61b66a9388f03edb`, and
  `https://companycore.luckysparrow.ch/data/notes` returns the table workbench
  shell markers `tableWorkbenchTitle` and `recordInspector`.
- 2026-05-07: Completed AGRUN-005 Scoped Agent Key Owner UI. `/settings/api`
  now includes an Agent service keys panel with least-privilege presets for
  read-only agents, memory writers, event consumers, and operators. Owners can
  create scoped keys, copy raw key material from a one-time panel only,
  refresh the list, deactivate keys, and rotate by creating a same-scope
  replacement before disabling the previous key. Validation passed:
  `node --check public/app.js`, `npm run build`, `git diff --check`,
  `npm test` against disposable Postgres on port `55457`, and authenticated
  local Playwright desktop/mobile API-settings smoke.
- 2026-05-07: Deployed AGRUN-005 to production with manual VPS backend
  rollover after public health still reported `1d9f586` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-68ef5f9`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:68ef5f99659ffd8cc1de88476aab97bcaa9bccbd`.
  Production Postgres remained healthy. Public `/health` reports commit
  `68ef5f99659ffd8cc1de88476aab97bcaa9bccbd`, and
  `https://companycore.luckysparrow.ch/settings/api` returns the Agent service
  keys panel and `agentKeyForm` shell marker.
- 2026-05-07: Completed V2WEB-024 Data Operations Index. The owner console now
  exposes `/data` as a reusable database operations entry point with 13
  CompanyCore module rows, record counts, API route coverage, area mappings,
  source labels, search, and group filtering. The slice reused the existing
  static CSS frontend baseline and added shared `workbench-*` component classes
  instead of introducing Tailwind or DaisyUI without an approved frontend build
  architecture change. Validation passed: `npm run build`,
  `node --check public/app.js`, `git diff --check`, and authenticated local
  Playwright desktop/mobile data-view smoke.
- 2026-05-07: Deployed V2WEB-024 to production with manual VPS backend
  rollover after public health still reported `b2b493b` following the GitHub
  push. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-bab9d58`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:bab9d589b7260f3e4a72a29b0f2bf907a94238ea`.
  Production Postgres remained healthy. Public `/health` reports commit
  `bab9d589b7260f3e4a72a29b0f2bf907a94238ea`, and
  `https://companycore.luckysparrow.ch/data` returns the Data Operations SPA
  shell with `Database modules` and `dataModuleList`.
- 2026-05-07: Completed V2WEB-023 Dashboard Operational Cockpit. The dashboard
  now starts with an Operational Cockpit panel that ranks the current priority,
  exposes primary and secondary next actions, and shows four operational
  readiness lanes: integrations, relationships, execution, and data model. The
  slice reuses existing dashboard signals and module routes rather than adding
  a new data source. Validation passed: `npm run build`,
  `node --check public/app.js`, `git diff --check`, and authenticated local
  Playwright desktop/mobile dashboard smoke.
- 2026-05-07: Completed V2WEB-022 Unified API Integration Setup. The owner
  console now has one clearer `/settings/integrations` API integration list for
  ClickUp, Google Drive, and CompanyCore API routes. `/settings/drive` now has
  concrete Google OAuth client ID and client secret inputs plus a save action,
  instead of only telling operators to set environment variables. Google Drive
  OAuth client credentials are stored as encrypted workspace integration secret
  material, safe API responses expose only `oauthClientConfigured` and
  `oauthTokenConfigured`, and Drive OAuth URL generation/token refresh uses the
  workspace-stored client before falling back to process env. Validation
  passed: `npm run build`, `git diff --check`, full `npm test` against
  disposable Postgres on port `55454`, and authenticated local Playwright
  desktop/mobile UI smoke.
- 2026-05-07: Completed V2GD-010 Drive Hierarchy Preview And Descriptions.
  Google Drive imports now index selected root folders plus nested folders and
  files, preserving `parentExternalId` hierarchy for agents and the owner GUI.
  Drive file records gained an editable CompanyCore `description` field and
  `PATCH /v1/google-drive/files/:id/description` with workspace and capability
  enforcement. `/settings/drive` now renders imported items as an indented
  hierarchy with latest summary/description context, preview actions for
  Docs/Sheets/images/draw.io or binary metadata, description editing, and
  Google open links. Validation passed: `npm run prisma:generate`,
  `node --check public/app.js`, `git diff --check`, `npm run build`, and
  `npm test` against disposable Postgres on port `55450`.
- 2026-05-07: Deployed V2GD-010 to production with manual VPS backend
  rollover after GitHub push did not immediately update the running image. The
  running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-7f0e090`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:7f0e09078f6b9f54db641328ea3d75830c2d2b3d`.
  Production Postgres stayed healthy and migration
  `202605071_drive_descriptions` applied during canary startup. Public health,
  `/v1/health`, web `/settings/drive`, API root, unauthenticated Drive denial,
  and protected Jarvis-key `google-drive:smoke` passed. Google Drive remains
  unconfigured until the owner completes real OAuth consent and first import.
- 2026-05-06: Implemented AGRUN-002, AGRUN-003, AGRUN-004, and local
  AGRUN-006 coverage. Service API keys now enforce route capabilities from a
  shared adapter manifest, while empty scopes, `*`, `companycore:*`, and
  legacy `adapter:*` scopes retain broad compatibility for deployed
  Jarvis/Paperclip-style keys. `/v1/connection` now reports effective
  capabilities, `scopeMode`, schema hints, and safe error behavior. Added
  `npm run agent:training-smoke` for repeatable agent onboarding and extended
  tests to cover scoped allow/deny behavior plus positive agent-event ack.
  Validation passed: `npm run build`, `node --check
  scripts/agent-training-smoke.mjs`, `git diff --check`, and `npm test`
  against a disposable Postgres container on port `55448`.
- 2026-05-06: During production smoke for AGRUN agent training, the Docker
  runtime image failed to find `scripts/agent-training-smoke.mjs` because the
  runtime stage copied `public`, `dist`, and `prisma` but not `scripts`.
  Updated the Dockerfile to copy `scripts` into the runtime image before
  redeploying.
- 2026-05-06: Deployed AGRUN-002, AGRUN-003, AGRUN-004, and AGRUN-006 runtime
  hardening to production. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-8b604d8`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:8b604d8e56f24c24f5f095815f8d52c6a84887dd`.
  Public health and web/API smokes passed. Jarvis and Paperclip production
  CompanyCore keys both passed `npm run agent:training-smoke`; `/v1/connection`
  exposed 51 effective capabilities, `scopeMode = broad`,
  `schemaVersion = 2026-05-06`, and schema metadata. A temporary scoped key was
  denied `POST /v1/notes` with `403`, and Paperclip read plus acknowledged a
  controlled pending agent event through the public API.
- 2026-05-06: Completed AGRUN-001 by adding
  `docs/operations/agent-runtime-coverage-ledger.csv` and
  `docs/planning/agent-runtime-gap-closure-plan.md`. The plan identifies the
  active post-CRUD gaps: service-key scope enforcement, machine-readable agent
  contract metadata, reusable agent training smoke, scoped key owner UI,
  positive agent-event ack smoke, Google Drive owner consent/import evidence,
  deeper route-level editing surfaces, deploy automation reliability, and
  blocked Paperclip/OpenJarvis upstream source merges. AGRUN-002 through
  AGRUN-006 are now the executable P0/P1 queue.
- 2026-05-06: Completed V2WEB-021 by adding `operating_areas.is_system`,
  marking catalog areas as system-owned through migration and bootstrap,
  exposing guarded `/v1/operating-model/areas` create/update/delete routes,
  blocking mutation of system areas including `main-general`, and reassigning
  folders, tables, provider mappings, storage locations, knowledge roots,
  automation definitions, and Drive file scope before deleting user-created
  areas. The owner console now shows protected/system status, can create a new
  area, and shows delete only for user-created areas with reassignment to
  `00. Glowny`.
- 2026-05-06: Completed AGCRUD-006 by adding
  `docs/operations/agent-companycore-api-playbook.md`, covering startup
  handshake, capability discovery, common read/write flows, soft archive
  behavior, provider/system lifecycle actions, safe error handling, and a local
  smoke sequence for a dedicated service key.
- 2026-05-06: Completed AGCRUD-005 by expanding `/v1/connection` with
  `agent-events:read` and `agent-events:ack`, adding the agent event routes to
  the adapter manifest, and documenting that provider/system tables use
  lifecycle actions such as retry, reconcile, refresh, scope, and ack instead
  of raw CRUD.
- 2026-05-06: Completed AGCRUD-004 by adding operating-model lifecycle routes
  for folders, storage locations, knowledge roots, and automation definitions;
  folder deletion is guarded when child tables exist, while registry leaf
  resources can be read, updated, and deleted through workspace-scoped APIs.
- 2026-05-06: Completed AGCRUD-003 by adding soft archive semantics for
  business deletes. `DELETE` routes now preserve rows and set lifecycle status
  to `archived` or `retired`, with a migration adding `status` to task lists,
  pipeline stages, interactions, notes, and decisions.
- 2026-05-06: Completed AGCRUD-002 by adding `GET /:id` and `PATCH /:id`
  coverage for projects, goals, targets, clients, deals, interactions, notes,
  decisions, and agents; adding `GET /:id` coverage for task lists, tasks,
  pipeline stages, and agent logs; expanding `/v1/connection` route discovery;
  and extending integration tests for same-workspace read/update and denied
  cross-workspace updates. Validation used `npm run build`, `git diff --check`,
  and `npm test` against a temporary disposable Postgres container on port
  `55432`.
- 2026-05-06: Completed AGCRUD-001 planning by adding
  `docs/planning/agent-crud-api-rollout-plan.md`, documenting the agent CRUD
  policy in `docs/API.md`, and activating AGCRUD-002 through AGCRUD-006 in the
  canonical planning queue. The plan keeps full CRUD focused on business
  records and uses controlled lifecycle actions for system/provider/security
  tables.
- 2026-05-04: Completed V2WEB-020 by adding the `00. Glowny` fallback area to
  the operating model catalog, making unclassified imports land in
  `main-general`, auto-ensuring the area for existing workspaces, and updating
  API/frontend tests and architecture docs.
- 2026-05-04: Completed V2WEB-019 by adding relationship review filters in
  `/relationships` for all, needs-review, provider, and Drive views with
  filtered summaries, empty states, preserved assignment controls, and mobile
  smoke coverage.
- 2026-05-04: Completed V2WEB-018 by adding a global module switcher in the
  private workspace topbar, backed by implemented routes and current frontend
  state, with click, Enter, Escape, empty-state, desktop, and mobile smoke
  coverage.
- 2026-05-04: Completed V2WEB-017 by adding ClickUp List tree search and
  all/selected/unselected filters in `/settings`, preserving saved List
  selections, adding filtered empty-state copy, and fixing the ClickUp panel
  enabled accessibility state.
- 2026-05-02: Created Company Core backend foundation, Prisma schema, Docker
  runtime, API key auth, minimal endpoints, ClickUp sync, event logging, and
  docs.
- 2026-05-02: Audited repository against CompanyCore v1 expectations. Confirmed
  build passes and identified planning/doc drift, missing event types,
  migration risk, plaintext API key storage, missing deployment domains, and
  incomplete route modules.
- 2026-05-02: Converted audit findings into the CCV1 task queue and task
  contracts under `docs/planning/`.
- 2026-05-02: Revised integration direction by user decision: CompanyCore v1
  should implement native ClickUp integration directly instead of requiring
  n8n workflows as the primary path.
- 2026-05-02: Revised auth/ownership direction by user decision: v1 should
  create a workspace with an owner user during registration, and workspace
  settings should own integration configuration such as ClickUp credentials.
- 2026-05-02: Added regression-prevention plan covering API contracts,
  workspace guardrail tests, migration/bootstrap safety, integration adapter
  contracts, and observability minimums.
- 2026-05-02: Completed CCV1-001 by replacing canonical architecture and
  Coolify deployment placeholders with CompanyCore-specific architecture and
  operations truth.
- 2026-05-02: Completed CCV1-011 by documenting owner email/password auth,
  workspace creation at registration, owner-only membership for v1, and
  workspace-scoped service API keys.
- 2026-05-02: Completed CCV1-014 by documenting stable API response envelopes,
  error response shape, standard error codes, and safe error redaction rules.
- 2026-05-02: Completed CCV1-015 by expanding the workspace guardrail test
  matrix for protected route types, service keys, integration settings, secret
  redaction, and native sync behavior.
- 2026-05-02: Completed CCV1-003 by adding the v1 foundation Prisma migration,
  switching Docker startup to `prisma migrate deploy`, and documenting rollback
  expectations.
- 2026-05-02: Completed CCV1-012 by adding owner registration/login,
  automatic workspace creation, bearer token auth, password hashing,
  workspace-aware API key context, workspace/auth migration, and local seed
  bootstrap.
- 2026-05-02: Completed CCV1-013 by adding workspace-scoped integration
  settings, encrypted token storage, ClickUp configuration routes, integration
  settings service helpers, and source-of-truth docs.
- 2026-05-02: Completed CCV1-017 by documenting the native integration adapter
  contract, idempotency, safe provider errors, observability fields, and
  ClickUp smoke signals.
- 2026-05-02: Completed CCV1-010 by implementing the first native pull-only
  ClickUp task sync adapter, workspace-scoped task ownership, idempotent
  `(workspace_id, source, external_id)` upsert, and safe sync events.
- 2026-05-02: Completed CCV1-004 by adding missing `client_created`,
  `deal_created`, and `note_created` events to create routes.
- 2026-05-02: Completed CCV1-005 by recording production domains, smoke
  checks, required deployment secrets, and rollback notes for preserving the
  PostgreSQL volume.
- 2026-05-02: Completed CCV1-016 by documenting migration review/testing,
  local seed, production first-owner bootstrap, credential rotation, and
  rollback/recovery policy.
- 2026-05-02: Completed CCV1-007 by adding hashed workspace service API key
  storage, transition-compatible lookup, seed hash population, and rotation
  documentation.
- 2026-05-02: Completed CCV1-006 by adding Node integration tests covering
  health, auth, workspace API keys, task scoping, ClickUp settings redaction,
  native ClickUp sync, events, and fresh `prisma migrate deploy`; removed a BOM
  from the foundation migration after the fresh migration test exposed it.
- 2026-05-02: Completed CCV1-008 by resolving DEC-001 and DEC-003, adding
  `/v1/*` route aliases without `/api`, preserving root compatibility aliases,
  and implementing workspace-scoped decisions and agent-log endpoints.
- 2026-05-02: Started CCV1-009 production verification. Public
  `GET https://api.companycore.luckysparrow.ch/health` returned healthy status,
  but `GET /v1/health` returned `401 Unauthorized`, so production is not yet
  verified against the current v1 route build. Protected smoke remains blocked
  pending deployment and production credentials.
- 2026-05-02: Completed CCV1-018 by adding owner-only adapter API key
  management so Jarvan, Aviary, and similar agents can receive workspace
  service credentials without GUI work or direct database access.
- 2026-05-02: Added production seed transition fix so existing legacy plaintext
  `SEED_API_KEY` rows are updated with `key_hash` instead of creating a
  duplicate unique key during redeploy.
- 2026-05-02: Reproduced the production startup failure in local Docker. Fixed
  runtime seed imports so `prisma/seed.ts` does not depend on uncopied `src/`
  files, and fixed the runtime image to copy the generated Prisma Client from
  the build stage. Local `docker compose up --build -d` now applies migrations,
  runs seed, starts the API, and returns `ok` for `/health` and `/v1/health`.
- 2026-05-02: Recovered production Coolify deployment. Root cause was Prisma
  `P3005` because production already had the foundation schema but no
  `_prisma_migrations` baseline. Added a one-time baseline row for
  `202605021_v1_foundation`, forced redeploy `r4hgrbmh5obfvz9v61mlbgyc` to
  commit `3f64a72`, confirmed backend logs show no pending migrations, seed
  success, and `companycore listening on port 3000`, then verified public
  `/health`, `/v1/health`, and unauthenticated `/v1/projects` negative smoke.
- 2026-05-02: Completed CCV1-019 by adding workspace ownership to projects,
  goals, targets, task lists, clients, pipeline stages, deals, interactions,
  notes, agents, and events. Protected routes for projects, goals, targets,
  clients, deals, notes, events, decisions, agent logs, and tasks now filter by
  the active workspace and reject foreign relation IDs with `not_found`.
- 2026-05-02: Deployed CCV1-019 to production with manual Coolify redeploy
  `zibcl0a0rih1vmhig3vkf4ce` at commit `1d6f21a`. Backend logs confirmed
  migration `202605028_workspace_core_records`, seed success, and server start;
  public `/health`, `/v1/health`, and unauthenticated `/v1/projects` smoke
  passed. Coolify `Auto Deploy` is enabled, but no GitHub webhook deployment
  fired after push because GitHub repository settings were not authenticated in
  the browser session.
- 2026-05-02: Completed CCV1-021 by adding `/v1/connection` and `/connection`
  so service adapters can verify API key auth, workspace identity,
  capabilities, and safe ClickUp configuration status before syncing or writing
  operational records.
- 2026-05-02: Completed CCV1-022 by expanding the connection handshake with a
  safe adapter manifest that lists canonical v1 routes, methods, capabilities,
  auth headers, and write rules for service clients.
- 2026-05-02: Completed CCV1-023 by adding workspace-scoped agents API routes,
  `agent_created` event emission, manifest capabilities for agents, and tests
  for same-workspace creation plus cross-workspace log denial.
- 2026-05-02: Deployed CCV1-022 and CCV1-023 to production. Coolify manual
  redeploy for `c564d0a` finished successfully. The `ebc660b` deployment was
  initially queued behind other server deployments, then force-started from the
  CompanyCore deployment detail page and finished successfully. Public
  `/v1/health` returned `200`; unauthenticated `/v1/agents` and
  `/v1/connection` returned `401` as expected.
- 2026-05-03: Completed CCV1-024 by adding workspace-scoped interactions API
  routes, `interaction_created` event emission, adapter manifest capabilities
  for interactions, and tests for same-workspace creation plus cross-workspace
  client relation denial.
- 2026-05-03: Completed CCV1-025 by adding workspace-scoped task list and
  pipeline stage API routes, create/update events, adapter manifest
  capabilities, and tests for same-workspace creation/update plus
  cross-workspace relation isolation.
- 2026-05-03: Completed CCV1-026 by adding an adapter smoke script that checks
  `/v1/connection`, creates an agent, task list, task, interaction, and agent
  log, then verifies expected events without printing the service API key.
- 2026-05-03: Completed protected production adapter smoke through VPS/Coolify
  access. A fresh hash-only service key for `Paperclip/Jarvis production
  adapter` was created in production DB for workspace `LuckySparrow`; key
  prefix `cc_v1_LxSo`, key id `d64ab750-b6e7-4806-96b3-8e64eadeb37d`.
  `npm run adapter:smoke` succeeded against
  `https://api.companycore.luckysparrow.ch`, creating agent, task list, task,
  interaction, agent log, and expected events. The raw key was not recorded in
  docs because raw service keys are one-time secret material.
- 2026-05-03: Wired CompanyCore environment variables into production
  Paperclip and Jarvis containers on the VPS. Paperclip has
  `COMPANYCORE_BASE_URL`, `COMPANYCORE_ADAPTER_SOURCE=paperclip`, and a
  dedicated service key with prefix `cc_v1_qUZK`. Jarvis has
  `COMPANYCORE_BASE_URL`, `COMPANYCORE_ADAPTER_SOURCE=jarvis`, and a dedicated
  service key with prefix `cc_v1_GaF4`. Both containers were recreated and both
  dedicated keys passed `npm run adapter:smoke`.
- 2026-05-03: Seeded production CompanyCore with Jarvis/Paperclip smoke
  records through the official API: a project, task list, two tasks, one
  decision, one note, and one agent. Prepared Jarvis application-side chat
  context code that reads CompanyCore via `COMPANYCORE_BASE_URL` and
  `COMPANYCORE_API_KEY`; production chat still answered that it has no
  CompanyCore access, so deployment of the prepared Jarvis runtime change is
  tracked as CCV1-028.
- 2026-05-03: Extended the prepared Jarvis runtime change for CCV1-028 with a
  native CompanyCore Data Source connector. The connector registers as
  `companycore`, verifies `/v1/connection`, syncs CompanyCore projects, task
  lists, tasks, clients, deals, interactions, notes, decisions, agents, and
  events into the Jarvis knowledge pipeline, and was locally validated with
  targeted connector/context tests.
- 2026-05-03: Completed CCV1-028 by deploying the Jarvis CompanyCore connector
  and chat context injector to production `jarvis.luckysparrow.ch`.
  `GET /v1/connectors/companycore` returned `connected=true`, manual sync
  indexed 38 CompanyCore chunks, and a production chat smoke answered from the
  seeded CompanyCore Paperclip project, including the decision, two tasks, and
  `Jarvis production chat adapter` agent.
- 2026-05-03: Added `docs/operations/jarvis-companycore-update-runbook.md`
  with the repeatable OpenJarvis update, deploy, connector smoke, and chat
  smoke procedure for the CompanyCore Data Source integration.
- 2026-05-03: Completed CCV1-029 by adding an operator-only ClickUp production
  bootstrap script and deployment doc. Operators can provide temporary
  `CLICKUP_API_TOKEN`, `CLICKUP_TEAM_ID`, and `CLICKUP_LIST_IDS` values to save
  encrypted workspace ClickUp settings through the protected API and trigger
  the first native pull sync. Continuous listening is not active yet; it
  requires an approved scheduled sync, webhook receiver, or external
  orchestration follow-up.
- 2026-05-03: Completed CCV1-031P by checking official ClickUp API docs and
  publishing the guided owner-console deployment plan. ClickUp personal tokens
  can access multiple Workspaces available to the user, so v1 owner setup must
  discover `GET /api/v2/team`, let the owner select the ClickUp Workspace, then
  discover Spaces/Folders/Lists before saving selected `listIds`.
- 2026-05-03: Audited the ClickUp owner-console plan against additional
  official ClickUp docs. Added required handling for token rate limits, stored
  token rediscovery, explicit pagination validation, and future webhook
  signature/idempotency requirements.
- 2026-05-03: Completed CCV1-031 and CCV1-032 locally by adding owner-only
  ClickUp discovery through CompanyCore, safe invalid-token and rate-limit
  error mapping, stored-token rediscovery, manifest capabilities, guided web
  console Workspace/List selection, and tests covering discovery, rate limits,
  stored-token rediscovery, protected route denial, and native sync.
- 2026-05-03: Completed CCV1-033 by manually redeploying CompanyCore in
  Coolify/VPS. Deployment `i12v0znlzq4twrl509iuqwmo` imported commit
  `b46a96071f2c5a6b8c17bc725940ba60122f658f`; the backend container now runs
  image tag `b46a96071f2c5a6b8c17bc725940ba60122f658f`. Public smoke confirmed
  `GET /health`, `/`, `/app.js`, and `/styles.css` return `200`,
  unauthenticated `/v1/connection` returns `401`, and owner login succeeds.
  A real ClickUp token was not available in-session, so first token discovery,
  settings save, and native pull sync remain an operator action through the
  deployed owner console.
- 2026-05-03: Completed CCV1-034 by auditing the current schema and code
  against the desired ClickUp-shaped operating model. Current code correctly
  enforces workspace ownership for v1 records and supports ClickUp discovery,
  but it does not yet persist CompanyCore equivalents for ClickUp Spaces,
  Folders, Lists as a general table registry, Views, Custom Fields, storage
  roots, knowledge roots, or automation scopes. Added the architecture and
  planning contract for the 12-area operating model and queued CCV1-034A
  through CCV1-034E.
- 2026-05-03: Completed CCV1-034A and CCV1-034B by implementing the operating
  model registry runtime slice. Added Prisma models and migration for
  operating areas, folders, tables, external container/field mappings, storage
  locations, knowledge roots, and automation definitions; registration and
  seed paths now create the 12 approved operating areas and first-party table
  assignments. ClickUp discovery persists Workspace/Space/Folder/List mappings
  and ClickUp Lists as operating tables. Native ClickUp task sync now preserves
  priority and attaches imported tasks to a matching `task_lists` row by
  ClickUp List ID. `npm test` passed against a disposable PostgreSQL database
  on `localhost:55432`.
- 2026-05-03: Completed CCV1-034B2, CCV1-034C, CCV1-034D, and CCV1-034E by
  adding dedicated `/v1/operating-model/*` read/write APIs, persisting ClickUp
  Workspace/List Views and Workspace/Space/Folder/List Custom Field metadata,
  and exposing scoped storage locations, knowledge roots, and automation
  definitions. Scope writes validate `areaId`, `folderId`, and `tableId`
  inside the active workspace and fail closed for foreign IDs. `npm test`
  passed against disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Completed CCV1-035 by hardening the first-run ClickUp import
  path. Native sync now supports `merge`, `skip_existing`,
  `replace_selected_lists`, and `inspect_only`; the owner console and
  production bootstrap expose the same policy; sync responses include
  `deletedCount`, `wouldCreateCount`, and `wouldUpdateCount`; and regression
  tests prove priorities/list placement, skip-existing behavior, inspect-only
  no-write behavior, and replace-selected-list deletion limited to ClickUp-owned
  tasks.
- 2026-05-03: Deployed the ClickUp first-run import policy to production.
  Auto-deploy did not immediately update the running image after push, so a
  temporary Coolify API token was used for manual deploy
  `gpos2n2ll9x301v6h3qlit8x` and then deleted. The backend image ran commit
  `0ed8c96896f7c2b754a24f35843a16e1737ba6e0`; logs showed no pending
  migrations and server start; public `/health` and `/v1/health` returned
  `200`; unauthenticated `/v1/connection` returned `401 missing_api_key`; and
  the owner console served the new ClickUp `Import mode` selector with
  `Inspect only`.
- 2026-05-03: Approved ClickUp webhooks as the next continuous update strategy
  instead of scheduled-only sync. Official ClickUp docs were reviewed for
  Create/Get/Update/Delete Webhook endpoints, user-token ownership, webhook
  health behavior, `X-Signature` HMAC SHA-256 verification, and task webhook
  payloads including `taskStatusUpdated`. Added
  `docs/planning/clickup-webhook-trigger-plan.md` and queued CCV1-036A through
  CCV1-036F to implement webhook schema/security, registration, receiver,
  task processing, agent event bridge, and production smoke.
- 2026-05-03: Improved the owner ClickUp List selection flow after real token
  testing reached Workspace discovery but did not make List selection obvious.
  The settings console now has an explicit `Load Lists` action, clearer no-list
  messaging, and `Select all` / `Clear all` controls for multiselect List
  setup before the first import.
- 2026-05-03: Fixed the production ClickUp List load failure found during real
  owner testing. ClickUp returned a non-array `required_views` value from a
  Views endpoint, which caused discovery persistence to throw
  `internal_server_error` before Lists rendered. The ClickUp client now treats
  non-array `views`/`required_views` values as empty arrays, and Workspace
  selection no longer auto-loads Lists before the owner clicks `Load Lists`.
- 2026-05-03: Added the first Dashboard data table for tasks so the owner can
  immediately verify whether ClickUp import created records. `/v1/tasks` now
  includes safe task list metadata, and the Dashboard renders title, status,
  priority, list, source, and due date with a manual refresh action.
- 2026-05-03: Fixed ClickUp settings save after real owner testing showed
  `internal_server_error` and `ClickUp is not configured for this workspace
  yet`. Root cause was the integration settings route building a Prisma upsert
  `create` payload with `encryptSecret(undefined)` when updating an existing
  setting without re-pasting the ClickUp token. The route now uses explicit
  update/create paths and preserves the encrypted secret on config-only saves.
- 2026-05-03: Production ClickUp setting inspection showed the owner-selected
  ClickUp lists and encrypted token were saved, but the integration was
  inactive (`active=false`), causing native sync to return
  `integration_not_configured`. Updated the owner console so `Save and sync`
  forces the ClickUp setting active before syncing and the Active checkbox
  refreshes button state immediately.
- 2026-05-03: Audited the first real ClickUp import through CompanyCore/Jarvis.
  Production CompanyCore contains 224 tasks total, 219 from ClickUp, all
  ClickUp tasks have `externalId` and a mapped task list, 55 ClickUp tasks have
  descriptions, 55 have priorities, and 0 currently have due dates. Missing
  descriptions/priorities appear to be provider data absence rather than import
  loss because the mapper uses `markdown_description`, `description`, then
  `text_content` from ClickUp.
- 2026-05-03: Completed CCV1-036A by adding webhook registration,
  provider-event inbox, and agent-event outbox tables, a raw-body
  `/v1/webhooks/clickup` route mounted before JSON parsing, and ClickUp HMAC
  SHA-256 signature helpers. Official ClickUp docs were checked again for
  webhook ownership, raw-body signatures, idempotency, task events, and
  task update API shape. `npm test` passed against a disposable PostgreSQL
  database on `localhost:55432`.
- 2026-05-03: Completed CCV1-036B through CCV1-036E plus CCV1-036G. The
  backend can reconcile ClickUp List webhooks from selected workspace settings,
  store returned webhook secrets encrypted, verify incoming ClickUp signatures,
  persist provider inbox rows idempotently, fetch full ClickUp task data for
  task events, update CompanyCore task records, emit internal ClickUp events,
  publish provider-neutral agent events for Paperclip/Jarvis/Aviary, and write
  supported CompanyCore edits for ClickUp-sourced tasks back to ClickUp.
  `npm test` passed against disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed the ClickUp live sync bridge to production with Coolify
  manual deploy `e12x9rc7i8071qfnrzh6u1hh` at commit
  `75df028f9dc3cab59f026fd7d2c5fef430e6d5ea`; the temporary deploy token was
  deleted. Production applied migration
  `202605032_clickup_webhook_foundation`, registered 21 active ClickUp List
  webhooks, accepted a signed production webhook smoke for a real ClickUp task,
  processed the provider inbox row, and exposed a pending
  `task_status_updated_from_clickup` agent event readable by Jarvis's
  CompanyCore API key.
- 2026-05-03: Completed the natural production ClickUp roundtrip smoke for
  CCV1-036F. A real ClickUp-sourced task (`86c5fqumu`) was patched through
  CompanyCore, which wrote the change back to ClickUp; ClickUp then delivered
  two natural signed `taskUpdated` webhooks back to CompanyCore, both verified
  and processed. The task title was restored to its original value.
- 2026-05-03: Completed CCV1-041 by comparing CompanyCore against `!template`.
  The autonomous engineering loop document and agent role updates were already
  present. Synced the remaining missing governance references into
  `.codex/context/PROJECT_STATE.md`, added a full CompanyCore docs index to
  `docs/README.md`, and recorded the task in `.codex/context/TASK_BOARD.md`.
- 2026-05-03: Completed CCV1-042 locally by extending the ClickUp API bridge
  beyond pull/import and PATCH write-back. CompanyCore now creates ClickUp
  tasks before local persistence when a task targets a ClickUp-sourced list,
  archives ClickUp-sourced tasks in ClickUp before local archival, writes
  mapped ClickUp Custom Field values, deletes individual ClickUp webhook
  registrations, and reconciles webhook health by comparing local
  registrations with ClickUp's remote webhook list. `npm test` passed against
  disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-042 to production with Coolify deployment
  `ff9gg7qsboy073lxpesyusth` at commit
  `c555c4dc3aa45438fd06a81be27e11f050f67693`. The backend image now runs
  `rnqqkhl3o3dut4qv56mlxly2_backend:c555c4dc3aa45438fd06a81be27e11f050f67693`,
  migration deploy reported no pending migrations, and public `/health` plus
  `/v1/health` returned `200`. Jarvis's CompanyCore API key verified protected
  reads for `/v1/connection`, `/v1/tasks` with 224 records,
  `/v1/integration-settings/clickup/webhooks` with 21 registrations, and
  `/v1/agent-events`; the adapter manifest exposes the new Custom Field and
  webhook-delete capabilities.
- 2026-05-03: Completed CCV1-043 locally by adding ClickUp task comment
  bridging. ClickUp `taskCommentPosted` and comment-field webhook payloads now
  create or update CompanyCore notes attached to the mapped task and emit a
  provider-neutral agent event. CompanyCore `POST /v1/notes` against a
  ClickUp-sourced task now creates a ClickUp task comment first and stores the
  returned ClickUp comment ID. Added a unique note external identity migration
  for `(workspace_id, source, external_id)`. `npm test` passed against
  disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-043 to production with Coolify deployment
  `q10fr3oviut7kkoxdkdfu0f6` at commit
  `28fc77b88722c5798ab630d0ef9d93e4a0f3dc84`. The backend image now runs
  `rnqqkhl3o3dut4qv56mlxly2_backend:28fc77b88722c5798ab630d0ef9d93e4a0f3dc84`,
  migration `202605033_clickup_note_external_identity` applied successfully,
  public `/health` and `/v1/health` returned `200`, and Jarvis's CompanyCore
  API key verified protected reads for `/v1/connection`, `/v1/notes`, and
  `/v1/agent-events`.
- 2026-05-03: Completed CCV1-044 locally by adding retry observability for the
  ClickUp provider event inbox. Failed webhook processing rows now record
  `last_error_code`, `GET /v1/integration-settings/clickup/events` returns safe
  inbox metadata without raw provider payloads, and owner users can call
  `POST /v1/integration-settings/clickup/events/retry-failed` to replay failed
  rows through the same idempotent task/comment processor. Regression coverage
  creates a failed inbox row, lists it, retries it, verifies the ClickUp task is
  recovered, and confirms `lastErrorCode` is cleared. `npm test` passed against
  disposable PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-044 to production by manually rolling over the
  backend container because Coolify's deployment queue was full with unrelated
  services. The deployed image is
  `rnqqkhl3o3dut4qv56mlxly2_backend:90c209e2a8398b7b9117ec51f72d85e97e0e80cb`.
  Startup applied migration `202605034_clickup_event_retry_observability`,
  public `/health` and `/v1/health` returned `200`, and Jarvis's CompanyCore
  API key verified `/v1/connection`,
  `/v1/integration-settings/clickup/events`, and
  `/v1/integration-settings/clickup/events?status=failed` with safe metadata.
- 2026-05-03: Completed CCV1-045 locally by adding
  `POST /v1/integration-settings/clickup/maintenance/run`. The endpoint is
  available to authenticated workspace callers, runs webhook reconciliation,
  failed-event replay, and a non-destructive ClickUp task pull fallback using
  `merge` by default. It allows `merge`, `skip_existing`, and `inspect_only`,
  but intentionally excludes `replace_selected_lists` from always-on
  maintenance. Regression coverage calls the endpoint with a service API key,
  recreates a missing selected-list webhook, syncs a fallback ClickUp task, and
  verifies no failed inbox rows remain. `npm test` passed against disposable
  PostgreSQL on `localhost:55432`.
- 2026-05-03: Deployed CCV1-045 to production by manually rolling over the
  backend container because Coolify's unrelated deployment queue remained full.
  The deployed image is
  `rnqqkhl3o3dut4qv56mlxly2_backend:ea1856dace47385ddb69645a697df5b5e3a71206`.
  Startup reported no pending migrations, public `/health` and `/v1/health`
  returned `200`, and Jarvis's CompanyCore API key verified
  `/v1/integration-settings/clickup/maintenance/run` with `inspect_only`:
  21 webhook registrations reconciled, 0 failed events retried, 219 ClickUp
  tasks inspected, and 0 failed inbox rows remained.
- 2026-05-03: Completed CCV1-046 locally by adding an in-process ClickUp
  maintenance scheduler. It starts with the backend when
  `COMPANYCORE_PUBLIC_API_BASE_URL` is configured, clamps cadence to at least 5
  minutes, and always uses `merge` so scheduled freshness never performs a
  destructive import repair.
- 2026-05-03: Deployed CCV1-046 to production by manually rolling over the
  backend container because Coolify's unrelated deployment queue remained full.
  The deployed image is
  `rnqqkhl3o3dut4qv56mlxly2_backend:419dbafb11f1558a185ddd428e67073c3a89f0f6`.
  Startup logs confirmed `clickup maintenance scheduler enabled every 15
  minutes`. Public `/health`, `/v1/health`, Jarvis-key `/v1/connection`, and
  maintenance `inspect_only` smoke passed; the smoke refreshed 21 webhook
  registrations, inspected 219 ClickUp tasks, and left 0 failed provider inbox
  rows.
- 2026-05-03: Completed CCV1-047 by adding and deploying the Paperclip
  application-side CompanyCore adapter on production Paperclip. The adapter
  reads `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`, polls
  `/v1/agent-events?targetAgent=paperclip`, creates idempotent Paperclip issues
  with `origin_kind = companycore_agent_event`, and acknowledges processed
  events through `POST /v1/agent-events/:id/ack`. Production smoke confirmed
  Paperclip `/api/health` returned `200`, the adapter log reported
  `received=1`, `created=1`, and `acked=1`, Paperclip created issue `LUC-37`
  for CompanyCore event `78569a4e-756a-4950-8aba-10f3736ba50e`, and CompanyCore
  returned 0 pending Paperclip events afterward.
- 2026-05-03: Completed CCV1-048 v1 closure audit and published
  `docs/operations/v1-release-readiness.md`. Production smoke confirmed
  CompanyCore `/health` and `/v1/health` returned `200`, service-key
  `/v1/connection` returned workspace `LuckySparrow` with ClickUp configured,
  ClickUp maintenance `inspect_only` saw 21 webhooks, 219 ClickUp tasks, and 0
  failed inbox rows, Paperclip `/api/health` returned `200`, Paperclip had one
  `companycore_agent_event` issue, and CompanyCore had 0 pending Paperclip
  events. Jarvis public connector smoke requires user Authorization, so the
  next hardening task is an authenticated Jarvis smoke rather than a
  CompanyCore runtime blocker.
- 2026-05-03: Completed CCV1-049 by running authenticated production Jarvis
  CompanyCore smoke with protected bearer access. `GET
  /v1/connectors/companycore` returned `200`, `connected=true`, and
  `auth_type=bridge`; `POST /v1/connectors/companycore/sync` returned
  `status=started`; the CompanyCore connector had indexed chunks; and chat
  answered from CompanyCore project, decision, and task records. Deployed an
  OpenJarvis context relevance improvement so CompanyCore records are ranked
  against the latest question and highlighted before full sections. Stored the
  Paperclip adapter as `integrations/paperclip/companycore-adapter.patch` and
  documented apply/validation/smoke/rollback in
  `docs/operations/paperclip-companycore-adapter-runbook.md`.
- 2026-05-03: Completed CCV1-050 by hardening Jarvis CompanyCore answer
  precision. The OpenJarvis CompanyCore context injector now filters
  smoke/test records out of ordinary business prompts unless the prompt asks
  for smoke or test data. Targeted OpenJarvis tests passed (`5 passed`), the
  production Jarvis container was rebuilt and restarted, and the authenticated
  chat smoke returned project `Paperclip AI onboarding to CompanyCore`, tasks
  `Reuse the same CompanyCore adapter path in Paperclip` and
  `Teach Jarvis to summarize CompanyCore records`, and agent
  `Jarvis production chat adapter`.
- 2026-05-03: Completed CCV1-051 by auditing and cleaning sync data hygiene.
  Production CompanyCore had 219 ClickUp tasks and 0 duplicate task external
  IDs, but repeated syncs had produced redundant `task_synced_from_clickup`
  events and smoke/test records. ClickUp sync now skips unchanged task pulls
  without emitting duplicate task sync events. OpenJarvis CompanyCore connector
  no longer indexes CompanyCore events by default; event indexing is opt-in via
  `COMPANYCORE_SYNC_EVENTS`. Production backups were created under
  `/home/codex/backups/companycore-cleanup-20260503` before cleanup. After
  cleanup, CompanyCore retained 219 ClickUp tasks, 0 duplicate ClickUp task
  external IDs, 0 smoke tasks/agents/projects, and 219 latest ClickUp task sync
  events. A production maintenance run skipped all 219 unchanged tasks and did
  not create new task sync events. Jarvis rebuilt the CompanyCore connector
  index to 259 chunks.
- 2026-05-03: Completed CCV1-052 by promoting the approved CompanyCore runtime
  slice from release candidate to v1 achieved. The final boundary records that
  CompanyCore, ClickUp, Jarvis, and Paperclip are live and smoked end to end;
  GitHub-to-Coolify auto-deploy is an external release automation blocker, not
  a v1 runtime blocker; OpenJarvis has a local unpushed connector hygiene
  commit and Paperclip has a local unpushed adapter commit plus a managed
  CompanyCore patch/runbook for durable handoff.
- 2026-05-03: Completed CCV1-053 by adding
  `docs/operations/v1-source-handoff-package.md`. The package records the
  OpenJarvis `5a426370` and Paperclip `4cfa476f` source commits, affected
  files, expected tests, production smoke checks, and rollback approach. The
  docs index was refreshed to describe the achieved v1 runtime rather than the
  early foundation state.
- 2026-05-03: Completed CCV1-054 by rebuilding and running the production
  CompanyCore backend from final v1 runtime commit `9116026`. The new
  container `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9116026` started
  successfully, reported no pending migrations, ran seed, enabled the ClickUp
  maintenance scheduler, and replaced the previous `manual-ae2c3bf` backend
  while keeping Postgres healthy. Public `/health`, `/v1/health`, web root,
  API metadata, protected `/v1/connection`, and ClickUp maintenance
  `inspect_only` smoke all passed.
- 2026-05-03: Completed CCV1-055 by rerunning full live-system smoke after the
  final runtime rollover. CompanyCore public health, v1 health, web root, API
  metadata, protected connection, and ClickUp maintenance stayed green.
  Paperclip `/api/health` returned `200`, Jarvis `/health` returned `200`,
  Jarvis's authenticated CompanyCore connector returned `connected=true`,
  `auth_type=bridge`, and `chunks=259`, a CompanyCore connector sync could be
  started, and CompanyCore had 0 pending Paperclip agent events. Added a
  learning-journal guardrail for remote smoke scripts that touch secrets.
- 2026-05-03: Completed CCV1-056 by cleaning temporary VPS artifacts created
  during the final CompanyCore runtime rollover. Removed
  `/tmp/companycore-9116026`, `/tmp/companycore-9116026.tar`, and any temporary
  Jarvis smoke files. Verified the running backend still uses
  `rnqqkhl3o3dut4qv56mlxly2_backend:9116026`, Postgres remains healthy, and
  rollback image `rnqqkhl3o3dut4qv56mlxly2_backend:ae2c3bf` is still present.
- 2026-05-03: Completed CCV1-057 by validating the Paperclip source handoff.
  In `C:\Personal\Projekty\Aplikacje\paperclip-companycore-worktree`,
  `npx --yes pnpm@9.15.4 --filter @paperclipai/server typecheck` passed and
  `npm exec --yes pnpm@9.15.4 -- vitest run server/src/__tests__/companycore-adapter.test.ts`
  passed with 3 tests. A safe branch push to
  `origin/codex/companycore-adapter-v1` failed with GitHub `403`, so upstream
  Paperclip source merge is now a permissions blocker, not an implementation
  blocker.
- 2026-05-03: Completed CCV1-058 by validating the OpenJarvis source handoff.
  Created a clean worktree from current `open-jarvis/OpenJarvis` `origin/main`,
  cherry-picked only the CompanyCore connector hygiene change, and ran
  `..\OpenJarvis\.venv\Scripts\python -m pytest tests\connectors\test_companycore.py tests\server\test_companycore_context.py -q`
  with 6 tests passing. A safe branch push to
  `origin/codex/companycore-connector-v1` failed with GitHub `403`, so
  upstream OpenJarvis source merge is now a permissions blocker, not an
  implementation blocker. The temporary clean worktree was removed.
- 2026-05-03: Completed CCV1-059 by auditing GitHub-to-Coolify auto-deploy
  capability after v1 runtime closure. `gh auth status` could not run because
  `gh` is not installed. The GitHub connector lists
  `Wroblewski-Patryk/companycore` with `admin=true`, but the available GitHub
  connector actions include repository contents, branches, refs, blobs, files,
  repository listing, and PR metadata, not webhook administration. Coolify,
  Coolify DB/Redis/realtime/proxy, CompanyCore backend, and CompanyCore
  Postgres containers are healthy. Auto-deploy remains a P2 tooling/permission
  blocker, not a v1 runtime blocker.
- 2026-05-03: Completed CCV1-060 by adding
  `docs/operations/v1-operator-handoff.md`, a single operator-facing v1
  acceptance handoff with production endpoints, accepted runtime scope, current
  backend image/container, latest smoke summary, clean data state, rollback
  pointer, residual non-runtime blockers, and next product decision options.
- 2026-05-03: Deployed the Google Drive v2 runtime hardening commit
  `a52afef4492445c87d1313324dcee8bbe82f3323` to production by manually
  rolling over the CompanyCore backend on the VPS. Coolify redeployed only
  `6731b82cd40866f3a06dc7b719cd7d13c269d5d5`, so production was missing
  the Google Drive deploy-smoke and OAuth refresh hardening commits. The new
  backend container is `backend-rnqqkhl3o3dut4qv56mlxly2-manual-a52afef`,
  running image
  `rnqqkhl3o3dut4qv56mlxly2_backend:a52afef4492445c87d1313324dcee8bbe82f3323`.
  Postgres stayed healthy, `prisma migrate deploy` reported no pending
  migrations, public `/health` and `/v1/health` returned the expected build
  metadata, and the protected Google Drive smoke passed through the Jarvis
  workspace service API key with Google Drive currently unconfigured and
  `importedFileCount=0`.
- 2026-05-03: Completed V2WEB-001 by turning the owner web console into a
  visible CompanyCore database and integration observability surface. The
  dashboard now shows the operator's 12 company areas in folder order, maps
  each area to CompanyCore tables, provider mappings, Drive files, and record
  previews, and exposes database counters. `/settings/drive` now supports
  Google Drive OAuth URL generation, authorization-code exchange, selected
  folder import, changes reconciliation, file refresh, and imported-file
  review. Desktop and mobile Playwright smoke screenshots passed; `node --check
  public/app.js`, `git diff --check`, `npm run build`, and `npm test` passed.
- 2026-05-03: Deployed V2WEB-001 to production with manual VPS backend
  rollover. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-6b4d57a`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:6b4d57a6e98159e64d9f065427e7201238b47ab5`.
  Public `/health`, `/v1/health`, web root, and `/settings/drive` returned
  `200`; protected smoke via the Jarvis/Paperclip workspace service key
  returned workspace `LuckySparrow`, 12 operating areas, 47 capabilities,
  Google Drive unconfigured, and 0 imported Drive files. Postgres remained
  healthy and no migrations were pending.
- 2026-05-03: Completed V2WEB-002 locally by adding manual provider scope
  mapping. Owners can move ClickUp provider mappings between operating areas
  from the dashboard; linked ClickUp operating tables move with List mappings,
  and manual overrides are preserved in future ClickUp structure refreshes.
  Owners can also move Google Drive folders between operating areas; existing
  descendants move with the folder and the folder-to-area rule is persisted for
  future imports. The adapter manifest now exposes
  `operating-model:mappings:write` and `google-drive:files:scope:write`.
  `node --check public/app.js`, `git diff --check`, `npm run build`, and
  `npm test` passed locally.
- 2026-05-03: Added `docs/operations/google-drive-owner-setup.md` so operators
  have a click-by-click Google Cloud and CompanyCore owner UI runbook for
  enabling Drive/Docs/Sheets APIs, OAuth consent, OAuth client credentials,
  redirect URI setup, production env vars, folder ID selection, consent, import,
  refresh, reconcile, and troubleshooting.
- 2026-05-03: Completed V2WEB-005 by adding a dedicated `/tasks-adapter`
  owner-console route for the implemented `/v1/tasks` records. The dashboard
  now links into the Tasks & adapters module instead of owning the task table,
  the route shows total, ClickUp, open, and due-soon task stats, and task table
  cells render provider-controlled values as text instead of HTML. The slice
  intentionally avoided `/tasks` as a web route because `/tasks` is still a
  protected legacy API path covered by integration tests.
- 2026-05-03: Completed V2WEB-006 by adding `/settings/integrations` as a
  taxonomy view for implemented integrations and data paths. The owner console
  now groups ClickUp/tasks, Google Drive/files, pipeline/CRM tables, and API
  capabilities, then summarizes implemented tables, records, provider mappings,
  and Drive files by operating area. Dashboard and sidebar links point to this
  route, and every action opens an existing implemented surface rather than a
  placeholder.
- 2026-05-03: Completed V2WEB-007 by adding `/pipeline` as the first dedicated
  pipeline module. The view reads existing CompanyCore snapshots for clients,
  pipeline stages, deals, and interactions, shows summary cards, renders compact
  record lists with empty states, and is linked from the sidebar, dashboard, and
  integration taxonomy. No new backend behavior or placeholder write flow was
  introduced.
- 2026-05-04: Completed V2WEB-008 by turning the dashboard into a command
  center. The signed-in landing screen now shows data-driven attention items,
  live module metadata for operating areas, tasks, pipeline, Drive, ClickUp,
  and integration taxonomy, plus a recommended next action. Signals are derived
  from existing frontend state only and link to implemented routes.
- 2026-05-04: Completed V2WEB-009 by adding `/settings/account` for owner and
  workspace context. The view shows account/workspace cards and readiness links
  for session, ClickUp, Drive, API capabilities, operating areas, and
  integrations. Direct route refresh now preserves owner user data from
  `/v1/connection`.
- 2026-05-04: Completed V2WEB-010 by adding `/relationships` as a dedicated
  review center for operating-area relationships. The view shows unassigned
  provider mappings and Drive folders in one queue, lists all implemented
  provider and Drive folder assignments, and reuses the existing scope update
  endpoints/selectors so relationship correction is no longer buried inside a
  selected area detail.
- 2026-05-04: Completed V2WEB-011 by turning `/tasks-adapter` into a basic task
  workbench. The view now supports search plus status, source, and list
  filters over existing `/v1/tasks` data, distinguishes filtered-empty state
  from no-task state, and keeps refresh/settings actions in the same surface.
- 2026-05-04: Completed V2WEB-012 by turning `/pipeline` into a searchable CRM
  workbench. The view now has a unified record feed over implemented clients,
  pipeline stages, deals, and interactions, with search, record-type filtering,
  status filtering, filtered counts, and a filter-specific empty state.
- 2026-05-04: Completed V2WEB-013 by turning the selected-area detail in
  `/areas` into a searchable workbench. The view now combines mapped tables,
  Drive items, provider mappings, and table record previews into one filtered
  feed while preserving assignment selectors for relationship correction.
- 2026-05-04: Completed V2WEB-014 by turning the `/settings/integrations`
  operating-area matrix into a searchable control map with data-type filters,
  filtered counts, and a filter-specific empty state. The matrix now counts
  provider mappings using the established `areaId` relation while preserving
  compatibility with older operating-area and table-level links.
- 2026-05-04: Completed V2WEB-015 by turning the imported files table in
  `/settings/drive` into a searchable Drive workbench with kind,
  operating-area, and scan-status filters, filtered counts, and a
  filter-specific empty state. The Google Drive panel now updates
  `aria-disabled` with its enabled state so signed-in controls are accessible.
- 2026-05-04: Completed V2WEB-016 by turning `/settings/api` into a searchable
  route workbench backed by the existing adapter manifest from
  `/v1/connection`. API route rows now show method, path, group, and
  capability context with search, method filtering, filtered counts, and a
  filter-specific empty state while preserving capability badges.
- 2026-05-06: Deployed the Agent CRUD API rollout to production with manual
  VPS backend rollover. The running backend container is
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-bf59b2f`, image
  `rnqqkhl3o3dut4qv56mlxly2_backend:bf59b2f80d9a837e05694cbb3f6417b8a7bf83c2`.
  Production Postgres stayed healthy, `prisma migrate deploy` applied
  `202605061_agent_crud_archive_status` and
  `202605062_operating_area_system_guardrails`, and public health/web/API
  smokes passed. Protected Jarvis-key smoke verified `/v1/connection` with 51
  capabilities, agent-events read/ack capabilities, manifest CRUD routes,
  user-created operating-area create/delete with reassignment, note
  create/read/update/archive, and Paperclip agent-event readback. Temporary
  VPS rollout scripts were removed, and the previous backend container remains
  stopped for rollback reference.

## Working Agreements
- Keep task board and project state synchronized.
- Keep planning docs synchronized with task board.
- Keep changes small and reversible.
- Validate touched areas before marking done.
- Keep repository artifacts in English.
- Communicate with users in their language.
- Delegate with explicit ownership and avoid overlapping subagent write scope.
- Use the default loop:
  `analyze -> select one task -> plan -> implement -> verify -> self-review -> sync knowledge`.
- Use `docs/governance/autonomous-engineering-loop.md` for process self-audit,
  one-task priority selection, seven-step evidence, and mode rotation.
- Treat deployment docs and smoke checks as part of done-state for runtime
  changes.

## Canonical Context
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/LEARNING_JOURNAL.md`
- `.agents/workflows/general.md`
- `.agents/workflows/documentation-governance.md`
- `.agents/workflows/subagent-orchestration.md`
- `.agents/workflows/user-collaboration.md`
- `.agents/workflows/world-class-delivery.md`

## Canonical Docs
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/INTEGRATIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/NEXT_STEPS.md`
- `docs/architecture/README.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/engineering/local-development.md`
- `docs/engineering/testing.md`
- `docs/governance/working-agreements.md`
- `docs/governance/world-class-product-engineering-standard.md`
- `docs/governance/autonomous-engineering-loop.md`
- `docs/governance/function-coverage-ledger-standard.md`
- `docs/governance/function-coverage-ledger-template.csv`
- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/post-deploy-smoke.md`
- `docs/operations/rollback-and-recovery.md`
- `docs/operations/service-reliability-and-observability.md`
- `docs/operations/paperclip-companycore-adapter-runbook.md`
- `docs/operations/v1-operator-handoff.md`
- `docs/operations/v1-source-handoff-package.md`
- `docs/operations/v1-release-readiness.md`
- `docs/security/secure-development-lifecycle.md`
- `docs/security/security-baseline.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/visual-direction-brief.md`
- `docs/ux/design-memory.md`
- `docs/ux/evidence-driven-ux-review.md`

## Active v1 Plan
- `docs/planning/mvp-next-commits.md`
- `docs/planning/mvp-execution-plan.md`
- `docs/planning/companycore-v1-task-contracts.md`
- `docs/planning/auth-workspace-integration-plan.md`
- `docs/planning/regression-prevention-plan.md`
- `docs/planning/open-decisions.md`
