# MVP Next Commits

Keep this file short and execution-focused. The active queue must stay
synchronized with `.codex/context/TASK_BOARD.md`.

## Active Queue

### NOW

- [ ] UX100-W04 Tasks/Pipeline Operating Pressure Summaries:
      make delivery and pipeline pressure visible from real state after W03
      provenance labels are verified.

### NEXT

- [ ] AGRUN-010 Upstream Agent Source Merge Execution:
      still blocked until upstream write access or an approved fork/PR route
      exists.
- [ ] Restore build commit/image metadata in production health:
      future deployability improvement so push-to-running-image proof can be
      captured without privileged Coolify inspection.

### DEFERRED TO V2

- [ ] ACF-UX-002 Company City Dashboard / Gamified Strategic Map:
      keep the approved visual direction as V2 target after the web/backend/MCP
      foundation readiness gate passes.

### BLOCKED

- [ ] AGRUN-010 Upstream Agent Source Merge Execution:
      blocked until upstream write access or an approved fork/PR route exists.
- [ ] KI-002 GitHub-to-Coolify Auto-Deploy Proof:
      blocked until deploy automation evidence can be produced with approved
      provider or VPS access.

## Historical Completed Queue

The section below is retained as execution evidence. It is not the active
queue. Future work must start from `Active Queue`, `.codex/context/TASK_BOARD.md`,
and `docs/operations/v1-function-coverage-ledger.csv`.

- [x] UX100-W03 Relationship/Data Provenance And AI Safety Labels:
      added existing-state-derived provenance and AI readiness labels to
      relationship graph rows, review rows, data modules, table context cards,
      record rows, and record inspectors. `npm run check:public-js`, `npm run
      validate`, `git diff --check`, `npm run test:api` on portable
      PostgreSQL `localhost:55475`, and Playwright fallback at desktop,
      tablet, and mobile all passed.
- [x] ACF-DOC-001 Coverage Ledger Reconciliation:
      stale Drive first-import blocker language was reconciled across
      architecture, function-coverage audit, project-control, system-health,
      active queue, and state files. Remaining Drive gaps are now framed as
      target-safe content/write/freshness samples, not first-import blockers.
- [x] WEBFOUND-002/003/004 Workspace And Sidebar Foundation:
      added owner workspace list/create/select API, `/auth/me` workspace
      readback, area inventory API, shell workspace selector/create controls,
      expandable area resource sidebar, and mobile/tablet drawer backdrop.
      `npm test` passed against disposable PostgreSQL on `localhost:55453`;
      Playwright owner-shell smoke passed at desktop, tablet, and mobile.
- [x] ACF-PROD-001 Operating Model Data Completion Decision:
      decided not to seed fake projects, storage locations, knowledge roots,
      or automation definitions before V2. Empty containers are accepted
      foundation-ready states when future UI labels them honestly and uses real
      owner creation/import flows.
- [x] WEBFOUND-005 Sidebar Area Tree Hardening:
      added accessible area/resource labels, active-area state, visible focus,
      Escape close for workspace-create and mobile drawer, scroll lock, and
      focus return. `npm test` passed on disposable PostgreSQL
      `localhost:55455`; responsive Playwright smoke passed on isolated
      `http://127.0.0.1:3107`.
- [x] WEBFOUND-007 Relationship Graph Audit:
      classified implemented, inferred, unsupported, and missing relationship
      families across schema, operating-model routes, and current web
      surfaces. Published
      `docs/architecture/relationship-graph-audit-2026-05-14.md` and selected
      a read-only relationship graph API as the next safe implementation.
- [x] WEBFOUND-008A Relationship Graph Read API:
      added `GET /v1/relationships/graph`, `relationships:read`, MCP manifest
      exposure, and profile access for MCP reader/operator presets. `npm run
      build` passed; `npm test` passed against disposable PostgreSQL on
      `localhost:55457`, covering confidence labels, review items, unsupported
      families, and manifest visibility.
- [x] WEBFOUND-008B Relationship Workbench Upgrade:
      `/relationships` now consumes the graph API, shows confidence labels for
      direct, provider-hierarchy, route-inferred, needs-review, and unsupported
      relationship states, and preserves existing provider/Drive assignment
      controls. `node --check public/app.js`, `npm run build`, `npm test`, and
      Playwright desktop/mobile render proof passed.
- [x] WEBFOUND-009 Integration Readiness Dashboard:
      `/settings/integrations` now shows readiness for ClickUp, Google Drive,
      relationship graph, and MCP agents from real connection, graph, API key,
      and manifest state. `node --check public/app.js`, `npm run build`,
      `npm test`, and Playwright desktop/tablet/mobile render proof passed.
- [x] WEBFOUND-010 MCP Key Workspace Clarity:
      `/settings/api` now previews active workspace, selected risk, selected
      scopes, MCP tool exposure, supervised tools, relationship graph
      availability, missing MCP base scopes, and tool families before a key is
      created. `node --check public/app.js`, `npm run build`, `npm test`, and
      Playwright desktop/tablet/mobile render proof passed.
- [x] WEBFOUND-011 Agent Tool Surface In Canonical Shell:
      canonical shell sidebar/topbar/module search now expose `Agent tools`,
      module search opens the backend-served React route safely, and React
      shell navigation now uses canonical CompanyCore destinations instead of
      React preview route taxonomy. `node --check public/app.js`,
      `npm run build`, `npm test`, and Playwright desktop/tablet/mobile route
      proof passed.
- [x] WEBFOUND-012 AI-Ready Smoke Pack:
      added `npm run ai-ready:smoke`, which registers a disposable owner,
      creates MCP reader/operator profile keys, verifies manifest visibility,
      reads the relationship graph through HTTP and MCP bridge paths, and
      verifies a risky stage-complete MCP tool returns
      `mcp_tool_requires_supervision` by default. `node --check`, `npm test`
      on disposable PostgreSQL `localhost:55462`, and
      `npm run ai-ready:smoke` against `http://127.0.0.1:3112` passed.
- [x] WEBFOUND-013 V2 UX Readiness Review:
      reviewed WEBFOUND-002 through WEBFOUND-012 and recorded GO for
      WEBFOUND-014 visual planning while keeping direct Company
      City/gamification implementation gated on a canonical
      shell/map/brief/status plan. Review:
      `docs/ux/v2-ux-readiness-review-2026-05-14.md`.
- [x] WEBFOUND-014 V2 Visual Implementation Plan:
      added `docs/ux/v2-visual-implementation-plan-2026-05-14.md`, defining
      the canonical V2 shell, Company City dashboard composition, command
      brief, status strip, responsive behavior, state model, route migration,
      visual asset strategy, validation plan, and first future code candidate
      `V2VIS-001 Shared CompanyShell And Dashboard Frame`.
- [x] ACF-MAINT-001 Large File Modularization:
      extracted the vanilla relationship workbench from `public/app.js` into
      `public/relationship-workbench.js`; `public/app.js` dropped from 6527 to
      6224 lines. `node --check`, `npm run build`, `npm test` on disposable
      PostgreSQL `localhost:55464`, and Playwright `/relationships` proof on
      `http://127.0.0.1:3113` passed.
- [x] V2VIS-001 Shared CompanyShell And Dashboard Frame:
      added the dashboard Company map frame from real workspace,
      operating-area, relationship, integration, task, and MCP state; fixed
      shared query-preserving `data-link` navigation for area deep links.
      `node --check`, `git diff --check`, `npm test` on disposable PostgreSQL
      `localhost:55465`, and Playwright fallback dashboard proof on
      `http://127.0.0.1:3000` passed at desktop `1366x900`, tablet
      `834x1112`, and mobile `390x844` with no overflow, no clipped cards,
      no console issues, and no failed requests.
- [x] V2VIS-002 Route Frame Convergence And Usability Repair:
      published a 100-item route-frame audit, added a reusable vanilla route
      command strip, converted the shared React shell from header-only chrome
      into a company command shell with desktop rail and mobile shortcut rail,
      and verified representative vanilla/React routes at desktop, tablet,
      and mobile with no overflow, no failed requests, no console issues, and
      zero unnamed visible controls. `node --check public/app.js`,
      `npm run build`, `git diff --check`, and `npm test` passed against
      disposable PostgreSQL on `localhost:55468`.
- [x] V2VIS-003 Areas Route Body UX Polish:
      published a 100-item `/areas` route-body audit, added an area command
      summary, review/coverage command cards, earlier filters, anchored major
      sections, coverage framing, and mobile density polish. `npm run build`,
      `git diff --check`, and `npm test` passed against disposable PostgreSQL
      on `localhost:55469`; Playwright verified `/areas` on desktop, tablet,
      and mobile with no overflow, no failed requests, no console issues, four
      command cards, and zero unnamed visible controls.
- [x] V2VIS-004 Settings API Route Body UX Polish:
      published a 100-item `/settings/api` route-body audit, added
      agent-access safety command summary, active/scoped/broad key signals,
      MCP exposure and supervision command cards, route-body anchors, and
      responsive command grid. `node --check public/app.js`, `npm run build`,
      `git diff --check`, and `npm test` passed against disposable PostgreSQL
      on `localhost:55470`; Playwright verified `/settings/api` on desktop,
      tablet, and mobile with no overflow, no failed requests, no console
      issues, four command cards, and zero unnamed visible controls. Real
      create-key proof showed a visible raw `cc_v1_` key and one active key row.
- [x] V2VIS-005 Settings Drive Route Body UX Polish:
      published a 100-item `/settings/drive` route-body audit, added a Drive
      import command summary, OAuth/selection/import/area-review command
      cards, stable setup/folder/import anchors, and responsive command grid.
      `node --check public/app.js`, `npm run build`, `git diff --check`, and
      `npm test` passed against disposable PostgreSQL on `localhost:55471`;
      Playwright verified `/settings/drive` on desktop, tablet, and mobile
      with no overflow, no failed requests, no console issues, four command
      cards, working folder-picker anchor, and zero unnamed visible controls.
- [x] ACF-MAINT-002 Google Drive Workbench Context Extraction:
      extracted the Drive command summary/context renderer from
      `public/app.js` into `public/google-drive-workbench.js`, loaded it before
      the main app script, and preserved the verified `/settings/drive`
      behavior. `node --check public/app.js`, `node --check
      public/google-drive-workbench.js`, `npm run build`, `git diff --check`,
      and `npm test` passed against disposable PostgreSQL on `localhost:55472`;
      Playwright verified desktop and mobile Drive route render with the
      module loaded, four command cards, no overflow, no failed requests, and
      no console issues.
- [x] ACF-QA-001 Validation Gate Entrypoints:
      added `npm run check:public-js`, `npm run test:api`, kept `npm test` as
      the compatibility wrapper, and made `npm run validate` run the public JS
      static gate before build. Updated testing docs and project validation
      commands. `npm run check:public-js`, `npm run validate`, `git diff
      --check`, and `npm run test:api` passed against disposable PostgreSQL on
      `localhost:55473`.
- [x] ACF-OPS-001 Auto-Deploy Proof Or Manual Path Acceptance Refresh:
      latest pushed commit was `ece93b1`; public web/API `/health` returned
      `200`, but both responses reported `build.commit="unknown"` and
      `build.image="unknown"`. Updated deployment docs and KI-002 so
      GitHub-to-Coolify auto-deploy remains unverified, while manual
      VPS/Coolify backend rollover remains the accepted release path until
      comparable commit/image metadata or equivalent Coolify evidence exists.
- [x] UX100-001 Web App UX100 Audit Atlas And Execution Plan:
      published `docs/ux/web-app-ux100-audit-and-execution-plan-2026-05-15.md`
      with 100 cross-app UX audit findings and 100 execution steps covering
      shell, dashboard, areas, relationships, data, tasks, pipeline,
      integrations, Drive, API, MCP tools, Company OS, account, auth, errors,
      performance, and governance. Activated UX100-W01 as the next ready
      implementation wave.
- [x] UX100-W01 Dashboard Command Brief And Mobile First Viewport:
      added a dashboard owner decision board above the Company map, deriving
      owner priority, blockers, next action, AI readiness, company context, and
      top blockers from existing workspace state. `npm run check:public-js`,
      `npm run validate`, `git diff --check`, and `npm run test:api` passed
      against disposable PostgreSQL on `localhost:55474`; Playwright verified
      `/dashboard` at desktop, tablet, and mobile with four decision metrics,
      at least one decision item, 13 map cards, no overflow, no console
      issues, no failed requests, and zero unnamed visible controls.
- [x] UX100-W02 Shell Decision Brief And Mobile Quick Actions:
      extended the existing route command strip with state-derived route
      decision signals and added a five-action mobile/tablet quick rail for
      Map, Brief, Data, Tasks, and Settings. `npm run check:public-js`,
      `npm run validate`, `git diff --check`, and `npm run test:api` passed
      against portable PostgreSQL on `localhost:55475`; Playwright verified
      six private routes at desktop, tablet, and mobile with no overflow, no
      console issues, no failed requests, route decision signals present,
      hidden desktop quick rail, visible tablet/mobile quick rail, and zero
      unnamed visible controls.
- [x] ACF-SEC-001 Production Secret And CORS Hardening:
      production now fails closed when required secret env vars are absent or
      still use committed development placeholder values; production CORS is
      restricted to `COMPANYCORE_ALLOWED_ORIGINS` or the documented
      CompanyCore web/API domains. `npm test` passed against disposable
      PostgreSQL on `localhost:55452`.
- [x] ACF-UX-001 Mobile Overflow And Focus Accessibility Fix:
      `/settings/api` and `/react-company-os` passed signed-in desktop/mobile
      Playwright fallback checks with `horizontalOverflow=false`,
      `unnamedFocusableCount=0`, no console warnings/errors, and no relevant
      failed requests; `npm test` passed against disposable PostgreSQL on
      `localhost:55451`.
- [x] AGRUN-007 Google Drive Owner Consent And First Import:
      production runs `c5878d95a47f17745f65689c08e9e317a6465777`; OAuth is
      active; discovery found 172 folders; 13 numbered department root folders
      (`00`-`12`) were selected, imported, and mapped to operating areas;
      readback returned 748 imported Drive items, 171 folders,
      `unassignedCount=0`, and descendant scope verification
      `mismatches=[]`.
- [x] V2WEB-AGENT-015 Workflow Archive And Rollback Command Decision:
      selected phased recovery commands. Archive should first support inactive
      historical workflow versions by explicit root type/root ID; rollback
      should first create a rollback draft that flows through existing preview
      and activation.
- [x] V2WEB-AGENT-016 Workflow Historical Version Archive Backend Slice:
      added the first workflow recovery command for inactive historical root
      versions, with active-version and active-runtime-dependency blocking,
      idempotent replay, audit/event evidence, read-only denial, and MCP
      manifest metadata. `npm test` passed on disposable PostgreSQL
      `localhost:55439`.
- [x] V2WEB-AGENT-017 Workflow Rollback Draft Backend Slice:
      added rollback-draft creation from historical workflow roots without
      direct rollback execution. The route generates impact preview, records
      rollback source metadata in the draft change set, emits audit/event
      evidence, denies read-only sessions, and is idempotent. `npm test`
      passed on disposable PostgreSQL `localhost:55440`.
- [x] V2WEB-AGENT-018 Workflow Recovery Controls Web Decision:
      selected a dedicated `Recovery controls` panel inside the existing
      workflow command surface, keeping recovery separate from normal draft
      creation.
- [x] V2WEB-AGENT-019 Workflow Recovery Controls Web Surface:
      added route-kit clients and `/react-company-os` recovery controls for
      archive and rollback-draft commands. `npm run build` passed; `npm test`
      passed on disposable PostgreSQL `localhost:55441`; Playwright proof
      verified rollback-draft interaction on `http://127.0.0.1:3103`.
- [x] V2WEB-AGENT-020 Workflow Version Lineage Decision:
      decided that rollback across renamed workflow versions requires explicit
      root lineage rather than name matching.
- [x] V2WEB-AGENT-021 Workflow Version Lineage Implementation:
      added `family_id` lineage to process, pipeline, and procedure roots,
      copied it during activation, and resolved rollback-draft active targets
      by family. `npx prisma generate`, `npm run build`, and `npm test` passed
      against disposable PostgreSQL on `localhost:55442`.
- [x] V2WEB-AGENT-022 Company OS Collection Fetch Alignment:
      changed shared table-record path resolution so Company OS collection
      slugs use `/v1/company-os/:collection` instead of generic `/v1/:slug`.
      `npm run build` passed; Playwright mock render proof verified
      `/react-company-os` with `badGeneric=[]`, `notFound=[]`, and
      `consoleErrors=[]`.
- [x] V2WEB-AGENT-023 Workflow Recovery End-To-End Activation Proof:
      added an inline audited approval decision action to the workflow command
      panel and kept local recovery state intact until activation. `npm run
      build` passed; Playwright proof verified rollback draft, preview,
      approval request, approval decision, and activation with calls
      `rollback-draft`, `preview`, `request-approval`, `approve`, and
      `activate:approval-recovery-1`.
- [x] V2WEB-AGENT-024 Workflow Recovery Real Backend Proof:
      repeated the rollback recovery journey against a disposable Docker
      Compose backend on `http://127.0.0.1:3104`. The proof used a migrated and
      seeded PostgreSQL stack, created a historical version setup, then used
      `/react-company-os` for rollback draft, preview, approval request,
      approval decision, and activation. Console errors were `[]`; screenshot:
      `C:\Users\wrobl\AppData\Local\Temp\companycore-v2web024-real-backend-recovery-proof.png`.

- [x] V2PLAN-001 V2 Product Lane Selection:
      selected Agent-First Company OS as the next deliberate V2 lane after
      V1EVID-001 and V1EVID-002 closed local V1 evidence gaps. Updated
      `.agents/state/delivery-map.md` and canonical queues so the next task is
      an MCP/HTTP command-surface audit, not broad feature work.
- [x] V2AGENT-001 Agent-First Company OS MCP Command Surface Audit:
      published `docs/operations/v2-agent-company-os-command-surface-audit.md`,
      mapping existing Company OS lifecycle commands to MCP exposure,
      capabilities, evidence, and risks. The audit found
      `mcp_company_os_reader` has approval write scopes despite being
      documented as read-only, so V2AGENT-002 is the next safe slice.
- [x] V2AGENT-002 MCP Company OS Reader Least-Privilege Correction:
      removed approval write scopes from `mcp_company_os_reader` and added
      regression assertions that profile-created reader keys omit approval,
      stage, and automation write tools from the MCP manifest and receive
      `403` for approval request/decision calls. `npm run build` and Docker
      `node --test dist/tests/api.test.js` passed.
- [x] V2AGENT-003 Approval-Aware MCP Command Flow Design:
      added `docs/operations/approval-aware-mcp-command-flow.md`, defining
      fail-closed default bridge behavior for `requiresApproval` tools,
      supervised-only execution mode, evidence requirements, and V2AGENT-004
      as the next implementation slice.
- [x] V2AGENT-004 MCP Requires-Approval Bridge Guard:
      added the default fail-closed guard in
      `scripts/companycore-mcp-server.mjs`, extended the MCP smoke harness for
      expected blocked calls, and verified safe-read pass plus
      `mcp_tool_requires_supervision` blocked risky-tool behavior in the Docker
      API test gate.
- [x] V2AGENT-005 Supervised Operator MCP Smoke Harness:
      extended `scripts/companycore-mcp-smoke.mjs` with expected HTTP status
      and response-error checks, then added Docker API evidence that an
      `mcp_operator` key still gets `mcp_tool_requires_supervision` by default
      and only reaches HTTP validation when
      `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator` is explicit.
- [x] V2AGENT-006 Agent Command Queue Cockpit Slice:
      added an agent command queue to `/react-company-os` from already-loaded
      approvals, stage runs, automation rules, and policies. `npm run build`
      passed; V2AGENT-006R closed rendered proof.
- [x] V2AGENT-006R Agent Command Queue Render Proof:
      verified `/react-company-os` with a temporary static SPA server, mock
      `/v1` Company OS endpoints, injected owner session, and system Chrome
      `--headless=new --dump-dom --virtual-time-budget=5000`.
- [x] V2WEB-ARCH-001 Human-Agent Web Architecture Map:
      added `docs/planning/human-agent-web-architecture-map.md`, mapping the
      approved Company OS and MCP architecture into web responsibilities and
      selecting Agent Tool Surface Workbench as the first human-agent UI
      bridge.
- [x] V2WEB-AGENT-001 Agent Tool Surface Workbench:
      added `/react-agent-tools`, typed MCP manifest loading, route-family
      grouping, risk/supervision badges, guardrails, and current
      auth/transport context using existing `/v1/connection` and
      `/v1/mcp/manifest`. `npm run build` and Browser plugin render/filter
      proof passed.
- [x] V2WEB-AGENT-002 Company OS Correlation Timeline:
      added a client-composed correlation timeline to `/react-company-os`
      using existing recent event and audit log `correlationId` data from
      `/v1/company-os`. `npm run build` and Playwright fallback render proof
      passed.
- [x] V2WEB-AGENT-003 Operating Graph Detail:
      added an operating graph detail panel to `/react-company-os`, connecting
      selected operating-area tables, provider table paths, Company OS
      resources, policies, risks, automation rules, recent runs, and
      correlation evidence from existing read contracts. `npm run build` and
      Playwright render proof passed.
- [x] V2WEB-AGENT-004 Workflow-Grade Command Panels:
      added approval, stage lifecycle, and automation command preview cards
      with prerequisites, expected result, recovery guidance, and automation
      proposal/effect evidence. Fixed automation dry-run result visibility.
      `npm run build` and Playwright render/interaction proof passed.
- [x] V2WEB-AGENT-005 Definition Editing Contract Decision:
      added `docs/architecture/company-os-definition-editing-contract.md`,
      classifying which Company OS definition objects can use scoped CRUD,
      command routes, versioning, approval, or no raw editing. The first
      allowed editor path is a low-risk Class A object such as `standards` or
      `company_roles`, after audited backend write routes exist.
- [x] V2WEB-AGENT-006 Class A Definition Editor Backend Contract:
      added `company-os:definition:write`, audited
      `POST/PATCH/DELETE /v1/company-os/standards`, soft archive status for
      standards, MCP manifest exposure with destructive archive supervision,
      and integration coverage for owner success, cross-workspace denial,
      read-only scoped denial, audit/event evidence, and manifest metadata.
      `npx prisma generate`, `npm run build`, and `npm test` against a
      disposable PostgreSQL database passed.
- [x] V2WEB-AGENT-007 Standards Definition Editor Web Surface:
      implemented the narrow `/react-company-os` standards editor using the
      audited backend routes, local capability-denied/save/archive notices,
      standard relation reads, and generated React bundle output. `npm run
      build`, static marker checks, and `git diff --check` passed.
- [x] V2WEB-AGENT-007R Standards Editor Render Proof:
      Playwright Chromium proof rendered `/react-company-os`, verified
      `Definition editor`, `Audited Class A editor`, `Proof Standard`,
      `Create standard`, `Standard created`, and `Render Proof Standard`,
      confirmed mocked `POST /v1/company-os/standards`, and reported zero
      relevant browser console issues with cleanup checks passing.
- [x] V2WEB-AGENT-008 Versioned Workflow Definition Command Contract:
      added
      `docs/architecture/company-os-workflow-definition-command-contract.md`,
      defining workflow draft/update, impact preview, approval, activation,
      archive, rollback, versioning, runtime evidence preservation, MCP
      exposure, and web-editor gates before any process/pipeline/procedure
      editor can ship.
- [x] V2WEB-AGENT-009 Workflow Definition Draft Backend Contract:
      added migration `202605142_workflow_definition_drafts`,
      `company-os:workflow-definition:write`, audited draft create/update and
      impact-preview routes, MCP manifest exposure, API/database docs, and
      integration coverage for owner success, idempotency, cross-workspace
      denial, read-only denial, audit/event evidence, and manifest metadata.
      `npm run build` and `npm test` against disposable PostgreSQL on
      `localhost:55433` passed; the disposable container was removed.
- [x] V2WEB-AGENT-010 Workflow Definition Activation Backend Contract:
      added supervised activation route
      `POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate`
      initially for procedure drafts, guarded by
      `company-os:workflow-definition:activate`, approved draft validation,
      stale-version rejection, previous-version deprecation, new active
      procedure version creation, procedure step copy/apply, audit/event
      evidence, MCP manifest supervision metadata, and denial coverage.
      `npm run build`, `npm test` against disposable PostgreSQL on
      `localhost:55434`, and `git diff --check` passed; the disposable
      container was removed.
- [x] V2WEB-AGENT-011 Process And Pipeline Workflow Versioning Migration
      Decision: added migration
      `202605143_workflow_root_version_uniqueness`, changed process/pipeline
      uniqueness to `workspaceId + name + version`, and extended workflow
      activation to process and pipeline drafts. Pipeline activation copies or
      applies stages; process activation creates a new active process version.
      Integration tests now cover process, pipeline, and procedure activation.
      `npx prisma generate`, `npm run build`, `npm test` against disposable
      PostgreSQL on `localhost:55436`, and `git diff --check` passed; the
      disposable container was removed.
- [x] V2WEB-AGENT-012 Workflow Definition Draft Web Surface:
      added typed route-kit clients for workflow draft create, impact preview,
      and activation, then added a guarded `/react-company-os` panel for
      process, pipeline, and procedure roots. The panel creates a draft from an
      existing root, previews runtime impact, shows approval reasons, supports
      approval request, and gates activation on
      `company-os:workflow-definition:activate` plus approved approval ID when
      required. `npm run build` passed; real-backend Playwright proof on
      `http://127.0.0.1:3101/react-company-os` verified desktop render, create
      draft, impact preview, approval-required state, mobile DOM render, and
      zero relevant console issues.
- [x] V2WEB-AGENT-013 Workflow Draft History And Resume Decision:
      selected draft readback/resume before archive/rollback because web/API/MCP
      draft creation needs an owner-visible way to resume interrupted command
      flows after reload or agent handoff.
- [x] V2WEB-AGENT-014 Workflow Draft Readback And Resume Slice:
      added guarded workflow draft list/detail routes, route-kit loader, and a
      `/react-company-os` `Recent drafts` resume panel scoped to `status=draft`.
      API tests prove owner readback, cross-workspace isolation, read-only
      denial, and manifest exposure. `npm run build`, `npm test` against
      disposable PostgreSQL on `localhost:55438`, and Playwright resume proof
      against `http://127.0.0.1:3102/react-company-os` passed.
- [x] UXD-001 Company City UX Direction Decision:
      captured the user-approved cinematic-realistic Company City Map direction
      as canonical UX memory. Future dashboard and high-level map surfaces
      should treat the company as a strategic city/value ecosystem with
      `GENERAL` as the central intake district, 12 connected departments, a
      command brief, value journey, responsive web/mobile behavior, and light
      evidence-backed gamification.
- [x] UXD-002 Company City Dashboard V2 Target Spec:
      generated and saved the current Dashboard V2 visual target, then added
      `docs/ux/company-city-dashboard-v3-spec.md` with a zone table, operating
      district model, shared component inventory, responsive rules,
      interaction rules, visual rules, and known reference corrections so
      future UI work has a stable source of truth.
- [x] UXD-003 Company City Dashboard V3 Department Model:
      refined the Dashboard target around the user's canonical department list
      and saved `docs/ux/assets/company-city-dashboard-v3-target.png` plus the
      first drill-down target
      `docs/ux/assets/company-city-management-department-v1-target.png` for
      `12 Zarzadzanie`.
- [x] V1CLOSE-001 V1 Achievement And External Blocker Handoff:
      added `docs/operations/v1-achievement-and-blocker-handoff.md` and
      `docs/planning/v1-closure-task-contracts.md`, making the V1 achievement
      boundary and remaining external blockers recoverable from repository
      state.
- [x] V1EVID-001 Company OS Lifecycle Trace Smoke:
      added `scripts/company-os-lifecycle-trace-smoke.mjs` and
      `npm run company-os:trace-smoke`, then ran the local Docker command
      `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
      npm run seed && npm run company-os:trace-smoke"`.
      Trace `v1evid-1778458446081` verified approval request/decision, stage
      start/validate/complete, automation dry-run/execute, `/v1/events`
      readback, `/v1/company-os/audit-logs/:id` readback, `eventCount=8`, and
      `auditLogCount=7`.
- [x] V1EVID-002 Operating Model Registry Lifecycle Smoke:
      added `scripts/operating-model-registry-lifecycle-smoke.mjs` and
      `npm run operating-model:registry-smoke`, then ran
      `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
      npm run seed && npm run operating-model:registry-smoke"`.
      Trace `v1evid-om-1778459014284` verified folder, storage location,
      knowledge root, and automation definition create/read/update/delete,
      `/v1/operating-model` aggregate readback, deleted-resource `404`
      readback, and cross-workspace deny checks.
- [x] MCP-004 Dynamic MCP Profile UI Loading:
      owner console now loads backend canonical MCP key profiles from
      `/v1/api-keys/profiles`, keeps static presets only as fallback data, and
      creates unchanged profile keys with `profileId`.
- [x] MCP-005 MCP Bridge Runtime Smoke Harness:
      added `npm run mcp:smoke`, a repeatable stdio bridge smoke that verifies
      `initialize`, `tools/list`, and a safe `companycore_get_company_os`
      `tools/call`; integration tests run it with a real profile-created MCP
      key.
- [x] MCP-006 MCP Agent Runtime Setup Guide:
      added profile-to-runtime setup documentation for Codex, Paperclip-style,
      and generic MCP-compatible agents, including secret handling, smoke
      checks, prompt contract, and failure recovery.
- [x] MCP-003 MCP Agent Key Profiles:
      added canonical backend MCP key profiles, owner-only
      `/v1/api-keys/profiles`, `profileId` creation support, current MCP/Drive
      scopes in owner-console presets, and profile coverage in integration
      tests.
- [x] MCP-002 CompanyCore MCP Bridge Server:
      added the first thin stdio MCP bridge server. It reads
      `/v1/mcp/manifest`, exposes CompanyCore routes through `tools/list`, and
      calls the HTTP API through `tools/call` using a workspace-scoped service
      key.
- [x] MCP-001 MCP Bridge Manifest Foundation:
      expose a capability-scoped `/v1/mcp/manifest` tool catalog and include
      the same MCP-friendly manifest in `/v1/connection`, so agent runtimes can
      wrap CompanyCore routes as MCP tools without bypassing API policies,
      approvals, events, or audit logs.
- [x] CCOS-001 Company OS Stage 1 Data Foundation:
      audit current architecture/data/integration state, then add the
      workspace-scoped data foundation for processes, pipelines, enriched
      pipeline stages, procedures, procedure steps, company roles, resources,
      tool adapters, integration capabilities, standards, LuckySparrow seed
      data, targeted relation tests, and architecture/database docs.
- [x] CCOS-002 Company OS Stage 2 Runtime Evidence Foundation:
      add pipeline runs, stage runs, approvals, checklists, acceptance
      criteria, audit log, and event correlation using the CCOS-001 foundation.
- [x] CCOS-003 Company OS Stage 3 Governance Intelligence Foundation:
      add policy, metric/KPI, risk, control, knowledge item, decision log,
      automation rule, trigger, artifact, dependency, business function, and
      stakeholder foundations.
- [x] CCOS-004 Company OS Read API Surface:
      expose Stage 1-3 Company OS records through a scoped read-only API,
      add the `company-os:read` capability and connection-manifest routes,
      and cover owner/scoped-service access in integration tests.
- [x] CCOS-005 Company OS Dashboard Surface:
      added `/react-company-os` as the first React cockpit on
      `/v1/company-os`, with definition/runtime/governance metrics, attention
      queues, adapter health, and recent evidence.
- [x] CCOS-006 Company OS Collection Drill-Down:
      added read-only `/react-company-os` collection previews for pipelines,
      approvals, audit logs, risks, and tool adapters through
      `/v1/company-os/:collection`.
- [x] CCOS-007 Company OS Collection Detail Route:
      added selected-record inspection inside `/react-company-os`, backed by
      `/v1/company-os/:collection/:id`, with local idle/loading/error states,
      readable key fields, and capped raw API evidence while keeping lifecycle
      writes closed.
- [x] CCOS-008 Company OS Agent Context Panel:
      added a read-only MCP-oriented agent operating packet inside
      `/react-company-os`, loading `/v1/tasks` plus Company OS pipelines,
      procedures, tool adapters, policies, acceptance criteria, and approvals
      through existing API routes.
- [x] CCOS-009 Company OS Approval Lifecycle Design:
      documented command-shaped approval request and approval decision routes,
      fail-closed lifecycle rules, event/audit requirements, and future
      pipeline/stage action direction without exposing raw table mutations.
- [x] CCOS-010 Company OS Approval Lifecycle Backend:
      implemented `POST /v1/company-os/approvals/request` and
      `POST /v1/company-os/approvals/:id/decision` with capability gates,
      workspace checks, event/audit evidence, MCP manifest exposure, and
      integration tests.
- [x] CCOS-011 Company OS Approval UI Actions:
      added owner-facing request approval and approve/reject controls in
      `/react-company-os`, using the command-shaped backend routes with local
      action feedback and context refresh.
- [x] CCOS-012 Company OS Pipeline Stage Lifecycle Design:
      documented command-shaped start, block, validate, and complete stage
      routes with approval references, acceptance criteria gates, event names,
      audit actions, and invalid-transition failure rules.
- [x] CCOS-013 Company OS Stage Lifecycle Backend:
      implemented audited start-stage, block, validate, and complete stage
      lifecycle routes with capability gates, approval checks, acceptance
      criteria validation, event/audit evidence, and MCP manifest exposure.
- [x] CCOS-014 Company OS Stage Lifecycle UI Actions:
      added owner-facing start, block, validate, and complete controls to
      `/react-company-os` using shared React route-kit clients and the audited
      lifecycle command routes.
- [x] UXA-016 React Route Shell Extraction:
      extract shared React route helpers before adding a third workbench so
      `web/src/main.tsx` does not keep growing as a monolith.
      Added `web/src/react-route-kit.tsx` for shared route state hooks, API
      loaders, shell, notices, metrics, and table primitives while preserving
      existing React route behavior.
- [x] UXA-015 React Canonical Route Switch Readiness:
      after UXA-014, decide whether a React route can safely become canonical
      or whether remaining adapter/editor affordances need another slice.
      Decision: do not switch canonical routes yet; extract the shared React
      shell and primitives before the next workbench migration.
- [x] UXA-014 React Integration Map Workbench Route:
      migrate the integration map overview into a parallel React workbench
      route using live `/v1/connection` data, DaisyUI primitives, and clear
      provider/data-path states while preserving `/settings/integrations`.
      Added `/react-integrations`, provider/data-path cards, readiness
      guidance, metrics, filters, and a 12-area coverage table. Passed build,
      validate, Browser signed-out check, targeted signed-in desktop/mobile
      rendered checks, owner-console smoke, and container integration tests.
- [x] UXA-013 React Workbench Canonical Route Decision:
      decide whether the task workbench can replace the canonical
      `/tasks-adapter` route now or should remain a parallel React preview
      until one more workbench proves parity. Decision: keep `/react-tasks`
      parallel for now and migrate one more React workbench before considering
      a canonical route switch.
- [x] UXA-012 React Workbench Route Migration:
      migrate one high-value workbench route into React using the approved
      dashboard, table, and local-notification primitives while preserving
      vanilla fallback routes. Added `/react-tasks`, live `/v1/tasks`
      loading, task metrics, search/status/source/list filters, reusable table
      rendering, signed-out/loading/empty/error/success states, and links back
      to `/data/tasks` plus `/tasks-adapter`. Passed build, validate, Browser
      signed-out check, targeted signed-in desktop/mobile rendered checks,
      owner-console smoke, and container integration tests.
- [x] UXA-011 React Table And Notification Primitive Migration:
      create reusable React/DaisyUI table and local notification primitives for
      the next workbench migration while preserving existing vanilla routes.
      Added `LocalNotice`, generic `DataTable`, live operating-model preview
      rows, migration ledger reuse, React build-output cleanup, Docker build
      stage script copy, and passed build, validate, rendered React checks,
      owner-console smoke, and container integration tests.
- [x] UXA-010 React Dashboard Component Migration:
      migrate the dashboard command surface into reusable React components,
      starting with app-shell-safe primitives for command panel, attention rows,
      module launcher, notifications, and table foundation. Current stage:
      implementation on `/react-dashboard` with the existing vanilla
      `/dashboard` preserved. Added the `companycore` DaisyUI theme, live
      owner-session `/v1/connection` loading, dashboard primitives, explicit
      signed-out/loading/error/connected states, and passed build, validate,
      rendered React checks, owner-console smoke, and container integration
      tests.
- [x] UXA-009 React Tailwind DaisyUI Migration Foundation:
      introduce an explicit React + Vite + Tailwind + DaisyUI frontend
      foundation as a reversible architecture slice while preserving backend
      APIs, auth, deployment shape, and owner-console flows. Added `web/`,
      Vite/Tailwind/DaisyUI config, `/react-dashboard`, Docker build
      integration, ignored generated `public/react/`, and passed build,
      validate, rendered React checks, owner-console smoke, and container
      integration tests.
- [x] UXA-008 Dashboard Iconography And UX Governance:
      add local Phosphor icon assets, apply consistent dashboard operational
      iconography, and document canonical CompanyCore management-UI rules.
      Tailwind/DaisyUI are not currently installed, so any DaisyUI adoption is
      treated as a separate architecture/build-pipeline decision. Added
      vendored Phosphor bold assets, dashboard icons, management-first UX
      rules, and passed build, validate, targeted rendered checks,
      owner-console smoke, and container integration tests.
- [x] UXA-007 Mobile Private Header Compression:
      reduce authenticated mobile topbar height by keeping Menu, current route,
      and Sign out visible while moving module jumping to the existing drawer
      and preserving desktop/tablet topbar behavior. Mobile topbar now renders
      as one compact row, desktop module search remains visible, and isolated
      owner-console smoke passed at `http://localhost:3006`.
- [x] UXA-006 Local Action Feedback Placement:
      add local success/error/status placement for auth, provider setup, Drive
      import, typed editors, and API key lifecycle while preserving the global
      result panel for cross-route outcomes. Added local `aria-live` status
      slots for auth, ClickUp, and Google Drive actions, preserved typed editor
      and API key local feedback, and verified local feedback plus private-route
      smoke against isolated `http://localhost:3005`.
- [x] UXA-005 Workbench Visual Role Cleanup:
      reduce equal-weight panel fatigue across dense workbenches by clarifying
      command, filter, list, selected-detail, and feedback roles. Made filter
      surfaces quieter, repeated rows lighter, selected rows/details stronger,
      and verified private workbench screenshots at desktop/tablet/mobile.
- [x] UXA-004 Mobile Auth Action-First Layout:
      reorder mobile `/auth/login` and `/auth/register` so the form comes
      before onboarding context while desktop keeps the two-column layout.
      Verified mobile login/register form-first screenshots and desktop
      two-column auth preservation.
- [x] UXA-003 Dashboard First-Viewport Command Polish:
      tighten `/dashboard` so the first viewport has one dominant next action,
      visible blocker state, and quieter secondary module exploration. Moved
      readiness evidence into the cockpit, capped visible attention items,
      made modules secondary exploration, reduced the lower next-action panel
      to three links, and verified desktop/tablet/mobile screenshots.
- [x] UXA-002 Authenticated Private Route UX Evidence Harness:
      create or document an approved local authenticated screenshot path for
      the private owner-console routes, then capture desktop/tablet/mobile
      evidence without writing test data to production. Added
      `owner-console:ux-smoke`, captured all priority private routes at
      desktop/tablet/mobile, and recorded zero console issues in the local
      report.
- [x] UXA-001 CompanyCore V1 UX/UI Audit:
      audited the public/auth owner entry, local seeded runtime state, private
      route implementation patterns, and UX source-of-truth docs; published
      `docs/ux/companycore-v1-ux-ui-audit.md` and queued `UXA-002..UXA-006`.
- [x] CCV1-067 Tech Stack Runtime Status Refresh:
      update `docs/architecture/tech-stack.md` so it reflects implemented auth,
      tests, migrations, owner console, ClickUp scheduler, and Google Drive v2
      foundation instead of older planned/foundation wording.
- [x] CCV1-066 Historical Guardrail Plan Classification:
      classify auth/workspace and regression-prevention planning docs as
      implemented historical guardrail plans, so they no longer read as active
      pre-v1-stability work.
- [x] CCV1-065 Front-Door Docs Scope Refresh:
      refresh `docs/README.md`, `docs/API.md`, and `docs/DEPLOYMENT.md` so
      they describe the current owner console and Google Drive v2 foundation
      instead of the earlier minimal-console/backend-only scope.
- [x] CCV1-064 Historical Checklist Closure:
      close stale unchecked AGCRUD planning criteria and the old blocked
      CCV1-009 contract using later accepted production and agent-runtime
      evidence.
- [x] CCV1-063 Historical Next Steps Refresh:
      replace stale `docs/NEXT_STEPS.md` v1 foundation guidance with current
      post-release status, blocked work, and canonical queue pointers; update
      the planning catalog so historical plans are not mistaken for active v1
      work.
- [x] CCV1-062 V1 Operator Runtime Pointer Refresh:
      refresh operator handoff and rollback docs to reference the current
      public `/health` build/image `71f3eb3b063ea68226a1736c727c52882b33f27a`
      and record that VPS Docker inventory still needs an approved operator
      shell before rollback.
- [x] AGRUN-008 Route-Level Business Editing Surfaces:
      reconcile whether the typed Notes, Projects, Clients, Task Lists, and
      Tasks editor workbenches already close the route-level business editing
      gap; if not, select exactly one remaining implemented route slice.
- [x] CCV1-061 Agent State Source-Of-Truth Sync:
      replace placeholder `.agents/state/*` continuation files with current v1
      post-release focus, known blockers, health evidence, and the next
      executable queue item.

- [x] AGRUN-002 Service Key Scope Enforcement:
      enforce `api_keys.scopes` per route capability, keep owner bearer-token
      access intact, preserve existing production agent compatibility through
      an explicit broad-scope decision or migration, and test denied/allowed
      scoped-key behavior.
- [x] AGRUN-003 Machine-Readable Agent Contract:
      extend the `/v1/connection` agent contract with route payload/error
      metadata so agents can learn supported writes without guessing from prose
      docs.
- [x] AGRUN-004 Reusable Agent Training Smoke:
      add a secret-safe script and package command that proves connection,
      create/read/update/archive, agent-log write, and fail-closed behavior
      locally and in production.
- [x] AGCRUD-002 Business Read/Update API Completion:
      add missing single-record read and update routes for first-party
      business APIs, keep workspace guardrails, update the adapter manifest,
      and cover the behavior in integration tests.
- [x] AGCRUD-003 Business Archive/Delete Policy And Slice:
      document safe archive/delete semantics for business records, then
      implement one guarded deletion/archive slice.
- [x] V2WEB-020 Main Operating Area Foundation
- [x] V2WEB-019 Relationship Review Filters
- [x] V2WEB-018 Global Module Switcher
- [x] V2WEB-017 ClickUp List Tree Filters
- [x] V2WEB-016 API Workbench Filters
- [x] V2WEB-015 Google Drive Files Workbench Filters
- [x] V2WEB-014 Integration Matrix Filters
- [x] V2WEB-013 Operating Area Workbench Filters
- [x] V2WEB-012 Pipeline Workbench Filters
- [x] V2WEB-011 Task Workbench Filters
- [x] V2WEB-010 Relationship Review Center
- [x] V2WEB-009 Account Settings View
- [x] V2WEB-008 Dashboard Command Center
- [x] V2WEB-007 Dedicated Pipeline View
- [x] V2WEB-006 Settings Integration Taxonomy View
- [x] V2WEB-005 Dedicated Tasks Adapter View
- [x] V2WEB-004 Dedicated Operating Areas View
- [x] V2WEB-002 Manual Provider Scope Mapping
- [x] V2WEB-001 Operating Map And Google Drive Console
- [x] V2GD-001 Google Drive Architecture And Queue
- [x] V2GD-002 Google Drive Persistence Foundation
- [x] V2GD-003 Google Drive Provider Client And OAuth Settings
- [x] V2GD-004 Folder Discovery And File Import
- [x] V2GD-005 Docs And Sheets Read/Create/Edit
- [x] V2GD-006 Drive Changes Freshness
- [x] V2GD-007 Google Drive Deploy Smoke Hardening
- [x] V2GD-008 Google Drive OAuth Runtime Hardening
- [x] V2GD-009 Google Drive Production Rollover Smoke
- [x] V2GD-010 Drive Hierarchy Preview And Descriptions
- [x] V2GD-011 Drive Setup Operator Instructions
- [x] V2WEB-022 Unified API Integration Setup
- [x] V2WEB-023 Dashboard Operational Cockpit
- [x] V2WEB-024 Data Operations Index
- [x] V2WEB-025 Generic Table Record Workbench
- [x] V2WEB-026 Typed Notes Editor Workbench
- [x] V2WEB-027 Typed Projects Editor Workbench
- [x] V2WEB-028 Typed Clients Editor Workbench
- [x] V2WEB-029 Typed Task Lists Editor Workbench
- [x] V2WEB-030 Typed Tasks Editor Workbench
- [x] V2GD-012 Drive Consent Guidance And Folder Picker
- [x] V2WEB-031 Cross-Department Pipeline Semantics
- [x] V2WEB-032 Dashboard Command Layout Polish
- [x] V2WEB-033 App Shell Navigation Polish
- [x] V2WEB-034 Command Bar Module Switcher Polish
- [x] V2WEB-035 Data Operations Index Polish
- [x] V2WEB-036 Table Workbench Context Polish
- [x] V2WEB-037 Tasks Adapter Context Polish
- [x] V2WEB-038 Pipeline Workflow Context Polish
- [x] V2WEB-039 Relationships Mapping Context Polish
- [x] V2WEB-040 API Agent Access Context Polish
- [x] V2WEB-041 Operating Area Context Polish
- [x] V2WEB-042 Google Drive Import Context Polish
- [x] V2WEB-043 Integration Map Context Polish
- [x] V2WEB-044 Account Context Polish
- [x] V2WEB-045 ClickUp Setup Context Polish
- [x] V2WEB-046 Auth Onboarding Context Polish
- [x] V2WEB-047 Public Entry Context Polish
- [x] V2WEB-048 Global Feedback Panel Polish
- [x] V2WEB-049 Table Workbench Empty State Polish
- [x] AGRUN-005 Scoped Agent Key Owner UI
- [x] CCV1-009P Protected production smoke for adapter CRUD
- [x] CCV1-027 Paperclip and Jarvis production env wiring
- [x] CCV1-029 ClickUp production bootstrap slot
- [x] CCV1-030 Minimal owner ClickUp web console
- [x] CCV1-031P ClickUp owner console deployment plan
- [x] CCV1-028 Deploy Jarvis application-side CompanyCore Data Source and chat context
- [x] CCV1-031 ClickUp Discovery Backend
- [x] CCV1-032 Guided Owner Console
- [x] CCV1-033 Production deploy and smoke for guided ClickUp owner console
- [x] CCV1-034 ClickUp-shaped operating model architecture and implementation
      plan
- [x] CCV1-034A Operating Model Registry Schema
- [x] CCV1-034B ClickUp Structure Persistence
- [x] CCV1-034B2 ClickUp Views And Custom Fields Persistence
- [x] CCV1-034C Registry-Backed Table API Contract
- [x] CCV1-034D Storage And Knowledge Roots
- [x] CCV1-034E Automation Scope Registry
- [x] CCV1-035 ClickUp First-Run Import Policy And Launch Audit
- [x] CCV1-036 ClickUp Webhook Trigger Architecture Plan
- [x] CCV1-037 ClickUp List Selection UX Fix
- [x] CCV1-038 Dashboard Task Table
- [x] CCV1-039 ClickUp Config-Only Save Fix
- [x] CCV1-040 ClickUp Save-And-Sync Activation Fix
- [x] CCV1-036A Webhook Schema And Security Foundation
- [x] CCV1-036B ClickUp Webhook Registration
- [x] CCV1-036C ClickUp Webhook Receiver And Inbox
- [x] CCV1-036D Task Event Processor
- [x] CCV1-036E Agent Event Bridge
- [x] CCV1-036G CompanyCore To ClickUp Write-Back
- [x] CCV1-036F Production Webhook Smoke
- [x] CCV1-042 ClickUp Full API Bridge Completion
- [x] CCV1-043 ClickUp Task Comment Bridge
- [x] CCV1-044 ClickUp Provider Event Retry And Health
- [x] CCV1-045 ClickUp Maintenance Freshness Run
- [x] CCV1-046 ClickUp Maintenance Scheduler
- [x] CCV1-047 Paperclip Application-Side CompanyCore Adapter
- [x] CCV1-048 V1 Closure Audit
- [x] CCV1-049 Authenticated Jarvis Smoke And Managed Paperclip Source Path
- [x] CCV1-050 Jarvis CompanyCore Answer Precision Hardening
- [x] CCV1-051 Clean Sync Data Hygiene
- [x] CCV1-052 V1 Launch Boundary And Source Handoff
- [x] CCV1-053 V1 Source Handoff Package
- [x] CCV1-054 Final V1 Runtime Rollover Smoke
- [x] CCV1-055 Full V1 Live System Smoke
- [x] CCV1-056 V1 Post-Release Artifact Cleanup
- [x] CCV1-057 Paperclip Source Handoff Validation
- [x] CCV1-058 OpenJarvis Source Handoff Validation
- [x] CCV1-059 GitHub Auto-Deploy Capability Audit
- [x] CCV1-060 V1 Operator Handoff

## Historical Mixed Queue

- [x] CCOS-015 Company OS Automation Rule Execution Design:
      design how automation rules and triggers observe Company OS lifecycle
      events and request approved follow-up actions without bypassing policy,
      approval, event, or audit boundaries.
- [x] CCOS-016 Company OS Automation Rule Evaluator Backend:
      implement the first command-shaped automation evaluator route that
      evaluates an existing Company OS event against active triggers/rules,
      supports dry-run versus execute mode, and records fail-closed event/audit
      evidence without raw table mutation.
- [x] CCOS-017 Company OS Automation Evaluator UI Actions:
      expose owner-facing dry-run and execute controls for the audited
      automation evaluator inside `/react-company-os`, including local
      feedback and context refresh, without adding raw automation table
      mutation.
- [x] CCOS-018 Company OS Automation Lifecycle Helper Reuse Design:
      design how the automation evaluator should reuse stage lifecycle command
      logic for start, block, validate, and complete proposals without
      duplicating transition checks or bypassing approval/audit/event behavior.
- [x] CCOS-019 Company OS Stage Lifecycle Command Service Extraction:
      extract the existing stage lifecycle route logic into shared internal
      command functions while preserving current HTTP behavior, stable errors,
      events, audit logs, and tests.
- [x] CCOS-020 Company OS Automation Lifecycle Proposal Execution:
      enable automation evaluator lifecycle proposals to call the shared stage
      lifecycle command functions while preserving idempotency, approval
      checks, stable errors, events, audit logs, and fail-closed evidence.
- [x] UXA-017 React Workbench Third Route Candidate:
      migrate the next workbench only after UXA-016 reduces React route
      duplication and verifies existing routes still render.
- [x] UXA-018 React Canonical Route Switch Decision:
      decide whether `/react-areas`, `/react-tasks`, or `/react-integrations`
      can safely replace the matching canonical vanilla route, or whether
      another parity slice is required first.
- [x] UXA-019 React Areas Mapping Parity Slice:
      add relationship/provider scope signals and explicit current-action
      links to `/react-areas` so the React areas workbench moves closer to
      canonical `/areas` parity without replacing it yet.
- [x] UXA-020 React Areas Data Contract Gap Decision:
      decide whether React areas should gain a dedicated read API for provider
      mappings and Drive folder ownership before any canonical `/areas`
      replacement work.
- [x] UXA-021 React Areas Relationship Data Hook:
      reuse existing operating-model external mappings and Google Drive file
      endpoints in the React route kit, then enrich `/react-areas` with real
      mapping counts and review queues.
- [x] UXA-022 React Areas Canonical Switch Decision:
      decide whether `/react-areas` can replace canonical `/areas` after
      relationship data parity, or whether explicit React write controls are
      required first.
- [x] UXA-023 React Areas Scope Assignment Controls:
      add provider mapping and Drive item operating-area assignment controls to
      `/react-areas` using existing PATCH endpoints and local action feedback.
- [x] UXA-024 React Areas Canonical Switch Decision:
      decide whether `/react-areas` can now replace canonical `/areas` after
      read, review, and scope-assignment parity.
- [x] UXA-025 React Areas Area Lifecycle Controls:
      add user-created operating area create/delete controls to `/react-areas`
      using existing operating-model area endpoints before any canonical route
      switch.
- [x] UXA-026 React Areas Selected Context Parity Decision:
      decide the smallest safe selected-area context parity slice for
      `/react-areas`, including record previews and reassignment controls for
      already assigned provider/Drive items.
- [x] UXA-027 React Areas Selected Context Data Hook:
      load selected table record previews in the React route kit through
      existing `/v1/{apiSlug}` endpoints and render selected-area context in
      `/react-areas`.
- [x] UXA-028 React Areas Assigned Scope Reassignment Controls:
      add reassignment controls for already assigned provider mappings and
      Drive items in the `/react-areas` selected context.
- [x] UXA-029 React Areas Canonical Route Switch Decision:
      decide whether `/react-areas` can replace canonical `/areas` after
      read, lifecycle, selected context, and reassignment parity.
- [x] UXA-030 React Areas Canonical Route Switch:
      serve the validated React areas workbench at canonical `/areas` while
      preserving `/react-areas` as an alias.
- [x] UXA-031 V1 Architecture Completion Audit:
      audit the current V1 implementation against the approved Company OS
      architecture and identify whether architecture-derived local V1 blockers
      remain.
- [x] V1CTRL-001 Function Coverage Ledger:
      create a module-by-module confidence ledger for API, UI, MCP,
      integration, operations, and docs surfaces so future work is derived from
      verified gaps instead of ad hoc fixes.
- [x] V1CTRL-002 Canonical Queue Cleanup:
      reduce active queue noise and align `NOW`/`NEXT` with the function
      coverage ledger so old completed tasks, external blockers, and future V2
      ideas are not mistaken for active implementation work.
- [x] AGRUN-005 Scoped Agent Key Owner UI:
      expose scoped agent key creation, copy-once raw key display, rotation or
      deactivation, and capability presets in `/settings/api`.
- [x] AGRUN-006 Agent Event Ack Positive Smoke:
      create a controlled pending agent event, read it through a target service
      key, acknowledge it, verify it no longer appears as pending, and record
      production smoke evidence.
- [x] AGRUN-007 Google Drive Owner Consent And First Import:
      production evidence verified active OAuth, selected numbered-root import,
      748 Drive items, 171 folders, `unassignedCount=0`, and descendant scope
      `mismatches=[]`.
- [x] AGRUN-008 Route-Level Business Editing Surfaces:
      closed by evidence reconciliation; the typed editor workbenches for
      Notes, Projects, Clients, Task Lists, and Tasks are present locally and
      in production `app.js`.
- [x] AGRUN-009 Deploy Automation Reliability:
      audit whether current Coolify auto-deploy reliably updates production or
      document a one-command approved rollover path. First reconcile the
      current source-of-truth drift: this file contains a historical note about
      a successful auto-deploy, while operations docs still classify manual
      rollover as the approved path and auto-deploy tooling as unresolved.
- [x] AGCRUD-004 Registry Resource Lifecycle API:
      complete scoped lifecycle APIs for storage locations, knowledge roots,
      automation definitions, and operating folders.
- [x] AGCRUD-005 Provider/System Lifecycle Manifest:
      expose provider and system lifecycle actions to agents without raw
      system-table CRUD.
- [x] AGCRUD-006 Agent CompanyCore API Playbook:
      publish the agent read/write onboarding guide and smoke flow.
- [x] V2WEB-021 User-Created Area Deletion Guardrails:
      define system/user-created area metadata, protect `00. Glowny`, and only
      then expose safe delete controls for user-created areas.
- [ ] Continue v2 web console polish after main operating area foundation:
      deeper
      module editing surfaces should become route-level slices only when their
      data path is already implemented.
- [x] Source handoff package: document the OpenJarvis
      `5a426370` connector hygiene commit and the Paperclip `4cfa476f`
      adapter commit for managed upstream handoff.
- [ ] Blocked source merge execution: push or upstream the OpenJarvis
      CompanyCore connector hygiene change after write access or a fork/PR
      route is available.
- [ ] Blocked source merge execution: push or upstream the Paperclip
      `4cfa476f` adapter commit after write access or a fork/PR route is
      available.
- [x] Optional release automation evidence reconciliation: confirm whether the
      historical note about pushed commit `63348d6` supersedes the operations
      docs, or update the note so manual rollover remains the explicit approved
      path.

## Historical Pipeline Archive

- [x] 74. AGRUN-002 Service Key Scope Enforcement
- [x] 75. AGRUN-003 Machine-Readable Agent Contract
- [x] 76. AGRUN-004 Reusable Agent Training Smoke
- [x] 77. AGRUN-005 Scoped Agent Key Owner UI
- [x] 78. AGRUN-006 Agent Event Ack Positive Smoke
- [x] 79. AGRUN-007 Google Drive Owner Consent And First Import
- [x] 80. AGRUN-008 Route-Level Business Editing Surfaces
- [x] 81. AGRUN-009 Deploy Automation Reliability
- [ ] 82. AGRUN-010 Upstream Agent Source Merge Execution
- [x] 69. AGCRUD-002 Business Read/Update API Completion
- [x] 70. AGCRUD-003 Business Archive/Delete Policy And Slice
- [x] 71. AGCRUD-004 Registry Resource Lifecycle API
- [x] 72. AGCRUD-005 Provider/System Lifecycle Manifest
- [x] 73. AGCRUD-006 Agent CompanyCore API Playbook
- [x] 67. V2WEB-020 Main Operating Area Foundation
- [x] 68. V2WEB-021 User-Created Area Deletion Guardrails
- [x] 69. V2WEB-024 Data Operations Index
- [x] 70. V2WEB-025 Generic Table Record Workbench
- [x] 71. V2WEB-026 Typed Notes Editor Workbench
- [x] 72. V2WEB-027 Typed Projects Editor Workbench
- [x] 73. V2WEB-028 Typed Clients Editor Workbench
- [x] 74. V2WEB-029 Typed Task Lists Editor Workbench
- [x] 75. V2WEB-030 Typed Tasks Editor Workbench
- [x] 76. V2GD-012 Drive Consent Guidance And Folder Picker
- [x] 77. V2WEB-031 Cross-Department Pipeline Semantics
- [x] 78. V2WEB-032 Dashboard Command Layout Polish
- [x] 79. V2WEB-033 App Shell Navigation Polish
- [x] 80. V2WEB-034 Command Bar Module Switcher Polish
- [x] 66. V2WEB-019 Relationship Review Filters
- [x] 65. V2WEB-018 Global Module Switcher
- [x] 49. V2WEB-002 Manual Provider Scope Mapping
- [x] 50. V2WEB-003 Main Branch Web Console Shell Reconciliation
- [x] 51. V2WEB-004 Dedicated Operating Areas View
- [x] 52. V2WEB-005 Dedicated Tasks Adapter View
- [x] 53. V2WEB-006 Settings Integration Taxonomy View
- [x] 54. V2WEB-007 Dedicated Pipeline View
- [x] 55. V2WEB-008 Dashboard Command Center
- [x] 56. V2WEB-009 Account Settings View
- [x] 57. V2WEB-010 Relationship Review Center
- [x] 58. V2WEB-011 Task Workbench Filters
- [x] 59. V2WEB-012 Pipeline Workbench Filters
- [x] 60. V2WEB-013 Operating Area Workbench Filters
- [x] 61. V2WEB-014 Integration Matrix Filters
- [x] 62. V2WEB-015 Google Drive Files Workbench Filters
- [x] 63. V2WEB-016 API Workbench Filters
- [x] 64. V2WEB-017 ClickUp List Tree Filters
- [x] 48. V2WEB-001 Operating Map And Google Drive Console
- [x] 39. V2GD-001 Google Drive Architecture And Queue
- [x] 40. V2GD-002 Google Drive Persistence Foundation
- [x] 41. V2GD-003 Google Drive Provider Client And OAuth Settings
- [x] 42. V2GD-004 Folder Discovery And File Import
- [x] 43. V2GD-005 Docs And Sheets Read/Create/Edit
- [x] 44. V2GD-006 Drive Changes Freshness
- [x] 45. V2GD-007 Google Drive Deploy Smoke Hardening
- [x] 46. V2GD-008 Google Drive OAuth Runtime Hardening
- [x] 47. V2GD-009 Google Drive Production Rollover Smoke
- [x] 47a. V2GD-010 Drive Hierarchy Preview And Descriptions
- [x] 1. CCV1-031 ClickUp Discovery Backend
- [x] 2. CCV1-032 Guided Owner Console
- [x] 3. CCV1-033 Production deploy and smoke for guided ClickUp owner console
- [x] 4. CCV1-034 ClickUp-shaped operating model architecture
- [x] 5. CCV1-034A Operating Model Registry Schema
- [x] 6. CCV1-034B ClickUp Structure Persistence
- [x] 7. CCV1-034C Registry-Backed Table API Contract
- [x] 8. CCV1-034B2 ClickUp Views And Custom Fields Persistence
- [x] 9. CCV1-034D Storage And Knowledge Roots
- [x] 10. CCV1-034E Automation Scope Registry
- [x] 11. CCV1-035 ClickUp First-Run Import Policy And Launch Audit
- [x] 12. CCV1-036 ClickUp Webhook Trigger Architecture Plan
- [x] 13. CCV1-036A Webhook Schema And Security Foundation
- [x] 14. CCV1-036B ClickUp Webhook Registration
- [x] 15. CCV1-036C ClickUp Webhook Receiver And Inbox
- [x] 16. CCV1-036D Task Event Processor
- [x] 17. CCV1-036E Agent Event Bridge
- [x] 18. CCV1-036G CompanyCore To ClickUp Write-Back
- [x] 19. CCV1-036F Production Webhook Smoke
- [x] 20. CCV1-042 ClickUp Full API Bridge Completion
- [x] 21. CCV1-043 ClickUp Task Comment Bridge
- [x] 22. CCV1-044 ClickUp Provider Event Retry And Health
- [x] 23. CCV1-045 ClickUp Maintenance Freshness Run
- [x] 24. CCV1-046 ClickUp Maintenance Scheduler
- [x] 25. CCV1-047 Paperclip Application-Side CompanyCore Adapter
- [x] 26. CCV1-048 V1 Closure Audit
- [x] 27. CCV1-049 Authenticated Jarvis Smoke And Managed Paperclip Source Path
- [x] 28. CCV1-050 Jarvis CompanyCore Answer Precision Hardening
- [x] 29. CCV1-051 Clean Sync Data Hygiene
- [x] 30. CCV1-052 V1 Launch Boundary And Source Handoff
- [x] 31. CCV1-053 V1 Source Handoff Package
- [x] 32. CCV1-054 Final V1 Runtime Rollover Smoke
- [x] 33. CCV1-055 Full V1 Live System Smoke
- [x] 34. CCV1-056 V1 Post-Release Artifact Cleanup
- [x] 35. CCV1-057 Paperclip Source Handoff Validation
- [x] 36. CCV1-058 OpenJarvis Source Handoff Validation
- [x] 37. CCV1-059 GitHub Auto-Deploy Capability Audit
- [x] 38. CCV1-060 V1 Operator Handoff


## Historical Group Queue

- [x] CCV1-A (docs and planning): CCV1-001, CCV1-002, CCV1-005
- [x] CCV1-B (workspace and auth): CCV1-011, CCV1-012, CCV1-013, CCV1-007
- [x] CCV1-C (regression prevention): CCV1-014, CCV1-015, CCV1-016, CCV1-017
- [x] CCV1-D (runtime foundation): CCV1-003, CCV1-004, CCV1-006, CCV1-010
- [x] CCV1-E (completion): CCV1-008, CCV1-009

The group queue is historical. Current active and blocked work is represented
in `NOW`, `NEXT`, `PIPELINE`, and `.codex/context/TASK_BOARD.md`.

## Refill Rules

- Keep `NOW` small. Recommended maximum: 3 tasks.
- Move tasks from `NEXT` to `NOW` only when the current active slot is free.
- Use `PIPELINE` only when a larger execution wave needs continuity beyond
  `NEXT`.
- Use `GROUP QUEUE` when the project executes larger waves as grouped batches
  with explicit commit ranges.
- Keep this file synchronized with `.codex/context/TASK_BOARD.md`.
- When publishing a new execution plan, activate the first executable tasks in
  `NOW` and `NEXT` in the same turn.
- Before reporting that no work is queued, verify both:
  - active canonical queue sections
  - background or historical unchecked checklists outside the canonical queue,
    clearly labeled as non-active if found.
