# Web Console V2 Task Contracts

## V2WEB-ARCH-001 Human-Agent Web Architecture Map

- Task Type: research/planning
- Current Stage: analysis
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: source-backed architecture-to-web analysis for a
  human owner console that mirrors the same Company OS and MCP command surface
  available to agents.
- Goal: Stop treating the current UI as finished polish and define the next
  product direction for giving the owner visibility and safe edit/action paths
  over the same graph agents inspect through MCP.
- Scope:
  - `docs/architecture/system-architecture.md`
  - `docs/architecture/tech-stack.md`
  - `src/auth/capabilities.ts`
  - `src/mcp/manifest.ts`
  - `src/modules/company-os/company-os.routes.ts`
  - `src/modules/operating-model/operating-model.routes.ts`
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/human-agent-web-architecture-map.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
- Implementation Plan:
  - Inspect the approved Company OS, operating-model, MCP, and React route-kit
    contracts.
  - Compare what agents can discover and call through MCP with what the owner
    can currently inspect and operate through web.
  - Identify gaps without proposing raw CRUD over command-protected runtime
    objects.
  - Select the smallest next web slice that increases human/agent parity while
    reusing existing APIs.
- Acceptance Criteria:
  - [x] Analysis distinguishes verified current UI slices from product-quality
    gaps.
  - [x] Analysis maps architecture concepts to backend/API, MCP, and web
    responsibilities.
  - [x] Analysis names functional gaps and a prioritized next web slice.
  - [x] Analysis avoids proposing direct database access or raw lifecycle CRUD.
- Definition of Done:
  - Source-backed planning artifact exists.
  - Canonical queue points at the next executable slice.
  - `git diff --check` passes.
- Validation Evidence:
  - Source review covered architecture docs, capability manifest, MCP manifest,
    Company OS routes, operating-model routes, and current React route-kit/UI.
  - `docs/planning/human-agent-web-architecture-map.md` created with
    architecture-to-web mapping, gap table, and priority plan.
- Result Report:
  - Created the human-agent architecture map.
  - Selected `V2WEB-AGENT-001 Agent Tool Surface Workbench` as the next
    smallest safe implementation slice.
  - No runtime code, backend route, database schema, or UI behavior was changed
    in this analysis task.

## V2WEB-AGENT-001 Agent Tool Surface Workbench

- Task Type: frontend
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: owner-visible React workbench for the same MCP
  tool surface agents receive.
- Goal: Let the owner inspect agent authority before handing out or using MCP
  credentials by showing tools, route families, capabilities, risk levels, and
  approval/supervision flags in web.
- Scope:
  - `src/app.ts`
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
- Implementation Plan:
  - Reuse existing `/v1/connection` and `/v1/mcp/manifest`; do not add new
    backend routes or schema.
  - Add typed MCP manifest/tool models and a React route-kit state hook.
  - Add `/react-agent-tools` to the backend React route allowlist.
  - Render manifest summary, route-family cards, tool table, risk badges,
    `requiresApproval` markers, guardrails, and auth/transport context.
  - Add dashboard/shell navigation entry points to the workbench.
- Acceptance Criteria:
  - [x] `/react-agent-tools` renders from the backend React route allowlist.
  - [x] The workbench reads `/v1/connection` and `/v1/mcp/manifest`.
  - [x] Tools are grouped by route family and summarized by read/write/
    destructive/supervised categories.
  - [x] Tool rows show name, description, route, capability, risk, and
    `requiresApproval` state.
  - [x] The route uses existing APIs only; no backend schema change is added.
- Definition of Done:
  - [x] `npm run build` passes.
  - [x] Render proof passes for `/react-agent-tools`.
  - [x] Interaction proof passes for route-family filtering.
  - [x] `git diff --check` passes.
  - [x] Source-of-truth planning/state files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - Browser plugin render proof against temporary static SPA server with mock
    `/v1/connection` and `/v1/mcp/manifest`: passed.
  - Render markers found: `MCP tools visible to agents`, `requires approval`,
    `destructive`,
    `companycore_post_company_os_stage_runs_by_id_actions_complete`, and
    `All route families`.
  - Interaction proof: selected the `company-os` route family; the stage-run
    MCP tool remained visible and the project delete tool was hidden.
  - Console health: no relevant browser errors or warnings in the proof tab.
- Result Report:
  - Added `McpManifest`, `McpTool`, and `AgentToolSurfaceState` types plus
    `loadMcpManifest` and `useAgentToolSurfaceState` in the React route kit.
  - Added `/react-agent-tools` workbench with summary metrics, route-family
    cards, tool catalog table, guardrails, and current auth/transport context.
  - Added `/react-agent-tools` to the backend React route allowlist and to
    React shell/dashboard module navigation.
  - No new backend API, database schema, or MCP bridge behavior was added.
  - Next step: build the Company OS correlation timeline so event/audit/
    approval/stage evidence reads as one human chain.

## V2WEB-AGENT-002 Company OS Correlation Timeline

- Task Type: frontend
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: human-readable Company OS evidence chain in the
  cockpit, built from existing event and audit correlation data.
- Goal: Let the owner inspect one correlated Company OS action chain without
  jumping between recent event and audit tables.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Reuse existing `/v1/company-os` recent `events` and `auditLogs`.
  - Add typed correlation/resource fields to the React Company OS record type.
  - Build correlation ID options from recent event/audit evidence.
  - Render event and audit records in timestamp order with actor, resource,
    kind, and safe payload preview.
  - Keep this client-composed slice no-schema and no-new-route.
- Acceptance Criteria:
  - [x] Company OS cockpit shows a correlation timeline when recent evidence
    has a shared `correlationId`.
  - [x] Timeline includes both events and audit logs in timestamp order.
  - [x] Timeline exposes actor, resource, record kind, timestamp, and payload
    preview.
  - [x] Empty/no-correlation state is explicit.
  - [x] No backend route or database schema is added.
- Definition of Done:
  - [x] `npm run build` passes.
  - [x] Render proof passes for `/react-company-os` with correlated evidence.
  - [x] `git diff --check` passes.
  - [x] Source-of-truth planning/state files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - Render proof with temporary static SPA server and mock `/v1/company-os`
    passed using Playwright fallback after the in-app Browser panel reported
    no active browser pane.
  - Proof markers found: `One evidence chain`, `corr-render-001`,
    `stage_completed`, `stage_run.completed`, and `Evidence payload`.
  - Console health: no relevant Playwright page errors or warnings.
- Result Report:
  - Added correlation/resource fields to `CompanyOsRecord`.
  - Added `CompanyOsCorrelationTimeline` to `/react-company-os`.
  - Timeline groups recent events and audit logs by `correlationId`, lets the
    owner select a chain, and displays ordered event/audit evidence with
    payload details.
  - No backend route, database schema, or MCP behavior changed.

## V2WEB-AGENT-003 Operating Graph Detail

- Task Type: frontend
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: owner-readable operating graph detail inside
  `/react-company-os`, composed from existing connection and Company OS reads.
- Goal: Connect operating areas, provider tables, Company OS resources,
  policies, risks, automations, and recent runs in one cockpit section without
  adding backend/schema scope.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Reuse existing `/v1/connection`, `/v1/company-os`, and
    `/v1/company-os/:collection` reads.
  - Extend the existing Company OS agent context loader with `resources` and
    `risks`.
  - Add an operating graph detail panel to `/react-company-os`.
  - Show selected operating-area tables, provider table paths, resource links,
    policies, risks, automation rules, and recent runtime nodes where existing
    IDs and included relations allow it.
  - Keep edits out of scope; no raw lifecycle CRUD or new backend contract.
- Acceptance Criteria:
  - [x] `/react-company-os` renders an `Operating graph detail` section.
  - [x] The section shows selected operating-area tables and provider-owned
    table paths from `/v1/connection`.
  - [x] The section shows Company OS resources, policies, risks, automation
    rules, and recent runs from existing Company OS collection reads.
  - [x] The section labels known process, pipeline, stage, provider, resource,
    or correlation relationships when records include them.
  - [x] No backend route, schema, or lifecycle command behavior is changed.
- Definition of Done:
  - [x] `npm run build` passes.
  - [x] Render proof passes for `/react-company-os` with graph markers.
  - [x] `git diff --check` passes.
  - [x] Source-of-truth planning/state files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - One-process Node mock server plus Playwright render proof passed for
    `/react-company-os`.
  - Proof markers found: `Operating graph detail`, `Growth`, `ClickUp Tasks`,
    `ClickUp Growth list`, `Supervised command policy`,
    `Unreviewed automation execution`, `Evidence follow-up automation`,
    `Agent web proof run`, and `corr-graph-001`.
  - Console health: no relevant Playwright page errors or warnings.
- Result Report:
  - Added resource and risk records to the Company OS agent context loader.
  - Added `CompanyOsOperatingGraphDetail` to `/react-company-os`.
  - The panel now gives the owner one graph-oriented read of area/table,
    provider, resource, guardrail, automation, runtime, and correlation context.
  - No backend route, database schema, MCP behavior, or command behavior
    changed.

## V2WEB-AGENT-004 Workflow-Grade Command Panels

- Task Type: frontend
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: stronger owner-facing command context for
  existing approval, stage lifecycle, and automation evaluator panels in
  `/react-company-os`.
- Goal: Make command execution less opaque by showing prerequisites, expected
  result, recovery guidance, and proposal/effect evidence before or immediately
  after owner actions.
- Scope:
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Reuse existing command routes; do not add backend routes, schema, or raw
    runtime CRUD.
  - Add reusable command preview cards for approval, stage lifecycle, and
    automation context.
  - Show selected prerequisites, expected result, and recovery guidance near
    command forms.
  - Expand automation result rendering with returned proposals, action kind,
    approval requirement, risk, and evidence targets.
  - Preserve local action feedback and existing command submit behavior.
- Acceptance Criteria:
  - [x] `/react-company-os` shows command readiness preview cards.
  - [x] Approval, stage, and automation command areas show expected result and
    recovery guidance.
  - [x] Automation evaluation result keeps returned proposal/effect evidence
    visible after dry-run.
  - [x] No backend route, schema, MCP behavior, or lifecycle command behavior
    changes.
- Definition of Done:
  - [x] `npm run build` passes.
  - [x] Render proof passes for command preview markers.
  - [x] Automation interaction proof passes for proposal/effect result output.
  - [x] `git diff --check` passes.
  - [x] Source-of-truth planning/state files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - One-process Node mock server plus Playwright render/interation proof
    passed for `/react-company-os`.
  - Proof verified the page renders command readiness preview content, clicks
    the automation `Evaluate` button, sends the expected POST to
    `/v1/company-os/events/:id/actions/evaluate-automation-rules`, and then
    renders `Returned automation actions`, `request_approval`, and
    `Evidence target` with no relevant page console errors.
  - `git diff --check`: passed with LF/CRLF warnings only.
- Result Report:
  - Added reusable command preview cards with prerequisite, expected-result,
    and recovery-guidance sections.
  - Added approval, stage lifecycle, and automation preview context above the
    existing command forms.
  - Expanded automation result UI with returned proposals, action kind,
    approval requirement, risk, emitted events, and audit evidence targets.
  - Fixed the automation dry-run UX so the returned proposal result remains
    visible instead of being reset by an immediate cockpit refresh.
  - No backend route, database schema, MCP behavior, or command behavior
    changed.

## V2WEB-AGENT-005 Definition Editing Contract Decision

- Task Type: architecture/product
- Current Stage: verification
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: architecture decision that blocks casual raw CRUD
  for Company OS definition objects and selects the first safe editor class.
- Goal: Decide which Company OS definitions can gain scoped write contracts,
  command routes, versioning, or approval before any process, pipeline,
  procedure, policy, or automation-rule editor is built.
- Scope:
  - `docs/architecture/company-os-definition-editing-contract.md`
  - `docs/architecture/README.md`
  - `docs/architecture/architecture-source-of-truth.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Review current Company OS definition models, read APIs, runtime command
    boundaries, and architecture direction.
  - Classify definition objects by write risk and required route shape.
  - Document what can use scoped CRUD, what requires command routes, what needs
    versioning/approval, and what must never be raw-edited.
  - Select the next safe implementation slice.
- Acceptance Criteria:
  - [x] Architecture doc distinguishes definition objects from runtime evidence.
  - [x] Architecture doc classifies write shapes for roles/standards,
    workflow definitions, tools/capabilities, governance, and automation.
  - [x] Architecture doc forbids raw runtime evidence editing.
  - [x] Architecture doc selects the first safe editor class.
  - [x] Canonical queue points at the next implementation slice.
- Definition of Done:
  - [x] Architecture source-of-truth files reference the new contract.
  - [x] `git diff --check` passes.
  - [x] Source-of-truth planning/state files are updated.
- Validation Evidence:
  - Source review covered Prisma Company OS definition/runtime models,
    `/v1/company-os` read-only collection routes, existing lifecycle command
    routes, `docs/API.md`, and `docs/architecture/system-architecture.md`.
  - Added `docs/architecture/company-os-definition-editing-contract.md`.
  - `git diff --check`: passed with LF/CRLF warnings only.
- Result Report:
  - Classified Company OS definition editing into six classes:
    registry-like definitions, workflow definitions, execution tool
    definitions, governance definitions, automation definitions, and runtime
    evidence.
  - Selected a narrow Class A editor as the first allowed implementation path,
    such as `company_roles` or `standards`, after backend audited scoped write
    routes exist.
  - Confirmed workflow, governance, and automation editors need command routes,
    approval/versioning, and impact/dry-run evidence before web editing.

## V2WEB-AGENT-006 Class A Definition Editor Backend Contract

- Task Type: backend/API
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: first audited scoped write contract for a
  low-risk Class A Company OS definition object before any web editor.
- Goal: Add a safe `standards` definition write surface that can be reflected
  in web and MCP without opening broad raw CRUD over Company OS definitions.
- Scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/202605141_company_os_standard_definition_status/migration.sql`
  - `src/auth/capabilities.ts`
  - `src/mcp/manifest.ts`
  - `src/modules/company-os/company-os.routes.ts`
  - `src/tests/api.test.ts`
  - `docs/API.md`
  - `docs/DATABASE.md`
  - `docs/architecture/company-os-definition-editing-contract.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Select `standards` as the first Class A object because it is lower-risk
    than role/permission editing.
  - Add a `status` field and migration so archive behavior is soft and
    relation-safe.
  - Add `company-os:definition:write` and MCP/connection manifest routes.
  - Add audited create, update, and archive routes for standards with
    workspace-scoped relation checks.
  - Cover owner success, cross-workspace denial, scoped service denial, audit
    evidence, event evidence, and MCP manifest exposure in integration tests.
- Acceptance Criteria:
  - [x] Standards can be created, updated, read, and archived by an owner.
  - [x] Optional owner role and checklist links are workspace-scoped.
  - [x] Cross-workspace updates return `404`.
  - [x] Scoped read-only service keys receive `403` for definition writes.
  - [x] MCP/connection manifests expose the new capability only to keys that
    have it, with destructive archive marked as requiring approval.
  - [x] Runtime evidence and higher-risk definition objects remain outside
    this editor contract.
- Definition of Done:
  - [x] `npx prisma generate` passes.
  - [x] `npm run build` passes.
  - [x] `npm test` passes against a disposable PostgreSQL database.
  - [x] Test database/container cleanup is complete.
  - [x] Source-of-truth planning, architecture, API, database, and state files
    are updated.
- Validation Evidence:
  - `npx prisma generate`: passed.
  - `npm run build`: passed.
  - Host `npm test` without env failed before tests because this shell had no
    `DATABASE_URL`; rerun with disposable PostgreSQL succeeded.
  - Disposable PostgreSQL proof:
    `DATABASE_URL=postgresql://companycore:companycore@localhost:55432/companycore_test?schema=public npm test`
    passed, applying migration
    `202605141_company_os_standard_definition_status` and passing
    `dist/tests/api.test.js`.
  - Cleanup: `docker rm -f companycore-test-postgres-v2web006` completed and
    follow-up `docker ps -a --filter name=companycore-test-postgres-v2web006`
    returned no container.
  - Resource hygiene: final check found older route-smoke
    `chrome-headless-shell` processes from earlier browser validation. Parent
    `node scripts/route-smoke.mjs` processes and browser children were
    terminated/attempted; remaining stale PIDs reported "no running task
    instance" via `taskkill`. The pitfall is recorded in
    `.codex/context/LEARNING_JOURNAL.md`.
- Result Report:
  - Added `status OperatingStatus @default(active)` to `Standard` plus the
    production migration for soft archive behavior.
  - Added `company-os:definition:write` and manifest entries for
    `POST/PATCH/DELETE /v1/company-os/standards`.
  - Added audited standard create/update/archive routes that emit
    `standard_created`, `standard_updated`, and `standard_archived` events and
    append corresponding audit logs with correlation IDs.
  - Extended integration tests for owner success, readback, update, archive,
    cross-workspace denial, read-only profile denial, scoped key denial, and
    MCP manifest risk/approval metadata.
  - Updated API, database, and architecture documentation so the implemented
    backend contract is recoverable from source-of-truth files.

## V2WEB-AGENT-007 Standards Definition Editor Web Surface

- Task Type: frontend/backend-integration
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: narrow owner web editor for the audited
  `standards` definition write contract, with clean render proof closed by
  V2WEB-AGENT-007R.
- Goal: Reflect the first safe Class A Company OS definition editor in the web
  console without opening broad raw CRUD over workflow, governance,
  automation, approval, event, or audit-log objects.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `public/react/assets/*`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `.codex/context/LEARNING_JOURNAL.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add typed route-kit client functions for creating, updating, and
    archiving standards through the audited backend routes.
  - Extend Company OS records with standard relation and evidence fields used
    by the editor.
  - Add a `CompanyOsStandardsEditor` panel to `/react-company-os` that reuses
    existing shell, table, notice, badge, and form patterns.
  - Show loading, empty, error, success, archive, and capability-denied states
    locally in the standards panel.
  - Keep the panel scoped to `standards` only; do not add raw editors for
    roles, workflows, governance, automation, runtime evidence, events, or
    audit logs.
- Acceptance Criteria:
  - [x] `/react-company-os` contains a standards definition editor panel.
  - [x] The panel reads `standards`, `company-roles`, and
    `checklist-templates` through existing Company OS collection reads.
  - [x] Owner sessions with `company-os:definition:write` can submit create,
    update, and archive requests through the audited route-kit functions.
  - [x] Sessions without `company-os:definition:write` see a local
    capability-denied message and disabled editor controls.
  - [x] The form exposes standard name, category, status, owner role,
    checklist, description, and validation method.
  - [x] Workflow, governance, automation, runtime evidence, events, and audit
    logs remain read-only or command-only.
  - [x] Rendered browser proof confirms the panel and create interaction in a
    live route.
- Definition of Done:
  - [x] `npm run build` passes.
  - [x] Static bundle/source marker check finds the new editor labels in
    source and generated React assets.
  - [x] `git diff --check` passes.
  - [x] Browser proof passes without leaving validation browser, server, or
    temporary profile resources behind.
  - [x] Source-of-truth planning and state files record the partial
    verification honestly.
- Validation Evidence:
  - `npm run build`: passed after adding the standards editor and after the
    `Standard name` accessibility label refinement.
  - Static marker check found `Definition editor`, `Audited Class A editor`,
    `Create standard`, `Save standard`, and
    `company-os:definition:write` in source/generated React output.
  - `git diff --check`: passed with LF/CRLF warnings only.
  - Playwright/Chrome render proof attempts reached the new route markers in
    at least one Chromium run, but did not produce a clean, bounded PASS:
    Firefox was not installed, system Chrome/Playwright runs timed out, and
    one earlier isolated Chrome profile required cleanup. This is now split
    into V2WEB-AGENT-007R rather than being hidden inside a DONE status.
  - Follow-up Chrome dump-DOM proof with injected session also timed out.
    Validation-specific Chrome child PIDs tied to
    `%TEMP%\cc-standards-dump-U0vPUH` were terminated/attempted; Windows
    reported two renderer PIDs as no running task instances, and the temporary
    profile directory was removed successfully afterward.
  - V2WEB-AGENT-007R later passed with Playwright Chromium after launching
    with `--disable-crash-reporter` and
    `--disable-features=Crashpad,CalculateNativeWinOcclusion`: rendered
    `Definition editor`, `Audited Class A editor`, `Proof Standard`,
    `Create standard`, `Standard created`, and `Render Proof Standard`; the
    mocked `POST /v1/company-os/standards` was called; relevant browser console
    issues were `0`.
- Result Report:
  - Added route-kit typed API clients:
    `createCompanyOsStandard`, `updateCompanyOsStandard`, and
    `archiveCompanyOsStandard`.
  - Added `CompanyOsStandardsEditor` to the Company OS cockpit after the
    operating graph detail, using the verified backend routes from
    V2WEB-AGENT-006.
  - Added local notices for capability denial and save/archive outcomes.
  - Added form controls and table actions for standard definition creation,
    update, and soft archive.
  - Kept the editor scoped to Class A `standards`; higher-risk definition and
    runtime evidence objects remain outside the write surface.

## V2WEB-AGENT-007R Standards Editor Render Proof

- Task Type: QA/frontend
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: clean rendered route proof for the standards
  editor, including resource cleanup evidence.
- Goal: Close the remaining verification gap for V2WEB-AGENT-007 before the
  standards editor can move to DONE.
- Scope:
  - `/react-company-os`
  - `web/src/main.tsx`
  - generated `public/react/assets/*`
  - local browser/server validation resources
  - `.agents/state/system-health.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.codex/context/TASK_BOARD.md`
- Implementation Plan:
  - Use a bounded mock `/v1` server or route-smoke path that serves the built
    React bundle and returns owner data with
    `company-os:definition:write`.
  - Verify desktop render markers for `Definition editor`,
    `Audited Class A editor`, `Proof Standard`, and `Create standard`.
  - Verify one create interaction renders a local success notice and the
    returned standard row.
  - Re-check that no validation Chrome/Chromium/Playwright server or temporary
    browser profile remains.
- Acceptance Criteria:
  - [x] Render proof passes for `/react-company-os`.
  - [x] Create interaction proof passes through the mocked
    `POST /v1/company-os/standards` route.
  - [x] No relevant browser console errors are emitted.
  - [x] Validation resources are closed and cleanup evidence is recorded.
- Definition of Done:
  - [x] V2WEB-AGENT-007 can be moved from `IMPLEMENTED_NOT_VERIFIED` to
    `DONE`.
  - [x] System health, module confidence, requirement matrix, and task board
    are updated with evidence.
- Result Report:
  - Render proof passed for `/react-company-os` with a bounded mock `/v1`
    server and Playwright Chromium.
  - Verified desktop markers: `Definition editor`, `Audited Class A editor`,
    `Proof Standard`, `Create standard`, `Standard created`, and
    `Render Proof Standard`.
  - Verified create interaction through mocked
    `POST /v1/company-os/standards`; the returned standard row and success
    notice remained visible.
  - Relevant browser console issues: `0`.
  - Cleanup proof found no matching validation Chrome/Node processes and no
    validation-specific temp profiles/artifacts after the run.

## V2WEB-AGENT-008 Versioned Workflow Definition Command Contract

- Task Type: architecture/backend-design
- Current Stage: verification
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: canonical architecture contract for workflow
  definition command/version/impact-preview behavior before any broader
  definition editor.
- Goal: Prevent process, pipeline, stage, procedure, and procedure-step editors
  from becoming raw CRUD over active agent behavior.
- Scope:
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `docs/architecture/company-os-definition-editing-contract.md`
  - `docs/architecture/README.md`
  - `docs/architecture/architecture-source-of-truth.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `.agents/state/system-health.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `.agents/core/project-memory-index.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Inspect current workflow definition models and Company OS read/command
    routes.
  - Define the future command surface for workflow definition drafts, impact
    preview, approval request, activation, archive, and rollback.
  - Define draft shape, activation rules, impact preview requirements, data
    model direction, MCP exposure, and web editor gates.
  - Link the new contract from architecture source-of-truth docs.
  - Update planning and state ledgers with the completed decision.
- Acceptance Criteria:
  - [x] Contract explicitly covers `processes`, `pipelines`,
    `pipeline_stages`, `procedures`, and `procedure_steps`.
  - [x] Contract blocks generic raw CRUD over active workflow definitions.
  - [x] Contract defines draft/update, impact preview, approval, activation,
    archive, and rollback command families.
  - [x] Contract defines approval/version/evidence/MCP expectations.
  - [x] Architecture indexes link to the new source-of-truth file.
- Definition of Done:
  - [x] Source review is complete.
  - [x] Architecture docs are updated.
  - [x] Planning and state files are synchronized.
  - [x] `git diff --check` passes.
- Validation Evidence:
  - Source review covered Prisma workflow definition models, Company OS
    collection reads, existing lifecycle commands, API docs, and the definition
    editing contract.
  - Added
    `docs/architecture/company-os-workflow-definition-command-contract.md`.
  - Linked the contract from architecture reading order and required source of
    truth files.
- Result Report:
  - Published the workflow definition command contract.
  - Chose command grouping around workflow definition drafts instead of raw
    per-table CRUD.
  - Required impact preview before activation and approval for active
    production-impacting changes.
  - Required activation to create a new version and preserve runtime evidence.
  - Kept workflow definition editors blocked until backend command routes and
    tests exist.

## V2WEB-AGENT-009 Workflow Definition Draft Backend Contract

- Task Type: backend/API
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: audited backend draft and impact-preview command
  slice for workflow definitions, with activation still blocked.
- Goal: Let owners and supervised agents prepare workflow definition changes
  safely before any process, pipeline, or procedure editor can mutate active
  behavior.
- Scope:
  - `prisma/migrations/202605142_workflow_definition_drafts/migration.sql`
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - `src/modules/company-os/company-os.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/auth/agent-key-profiles.ts`
  - `src/mcp/manifest.ts`
  - `src/tests/api.test.ts`
  - `docs/API.md`
  - `docs/DATABASE.md`
  - `package.json`
  - canonical planning and state files.
- Implementation Plan:
  - Add a workspace-scoped workflow definition draft table and root type enum.
  - Add a dedicated capability and MCP manifest route exposure.
  - Implement create, update, and impact-preview routes for process,
    pipeline, and procedure roots.
  - Preserve idempotency, cross-workspace denial, audit/event evidence, and
    read-only scoped denial.
  - Keep activation, rollback, and web editing out of this slice.
- Acceptance Criteria:
  - [x] Draft create stores root, version, change set, risk, actor, source,
    and idempotency evidence.
  - [x] Repeated create with the same workspace idempotency key returns the
    original draft.
  - [x] Draft update is workspace-scoped and audited.
  - [x] Impact preview returns affected counts, changed fields, approval
    requirement, approval reasons, duplicate-name risk, and target version.
  - [x] Read-only profile/scoped keys cannot create or preview drafts.
  - [x] MCP and connection manifests expose the write tools only when the
    caller has `company-os:workflow-definition:write`.
- Definition of Done:
  - [x] Migration is applied in integration validation.
  - [x] Backend build passes.
  - [x] API integration test passes against disposable PostgreSQL.
  - [x] API/database docs and source-of-truth ledgers are updated.
  - [x] Temporary validation container and TypeScript trace artifacts are
    removed.
- Validation Evidence:
  - `npm run build` passed.
  - `npm test` passed against disposable PostgreSQL
    `companycore-test-postgres-v2web009` on `localhost:55433`; migrations
    applied through `202605142_workflow_definition_drafts`.
  - The disposable validation container was removed.
- Result Report:
  - Added `workflow_definition_drafts` as the draft ledger for future
    workflow definition editing.
  - Added audited draft create/update/impact-preview command routes.
  - Added `company-os:workflow-definition:write` to capability and MCP
    manifests, including read-only denial coverage.
  - Hardened server build by running TypeScript with an explicit Node stack
    size because the expanded Prisma/Express/test graph exceeded the default
    Windows process stack.
  - Activation and web editing remain queued as V2WEB-AGENT-010.

## V2WEB-AGENT-010 Workflow Definition Activation Backend Contract

- Task Type: backend/architecture
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: approval-aware procedure activation command
  before mutating broader workflow definitions.
- Goal: Activate approved workflow definition drafts without raw CRUD,
  preserving version evidence, rollback metadata, runtime safety, and
  audit/event trails.
- Scope:
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - Prisma workflow definition tables and migrations if schema support is
    required.
  - `src/tests/api.test.ts`
  - `docs/API.md`
  - `docs/DATABASE.md`
- Implementation Plan:
  - Inspect whether `processes`, `pipelines`, and `procedures` can support
    true activated versions with their current unique constraints and
    relations.
  - If the current schema cannot represent activation safely, stop in
    decision mode and document valid migration options.
  - If safe, add activation route, approval validation, version mutation,
    rollback metadata, audit/event evidence, MCP manifest exposure, and
    integration tests.
- Acceptance Criteria:
  - [x] Activation refuses drafts without required approval evidence.
  - [x] Activation does not mutate active workflow definitions unless the
    versioning model is explicit and tested.
  - [x] Activation emits audit/event evidence and records rollback context.
  - [x] Cross-workspace and read-only callers fail closed.
  - [x] Integration validation proves success and denial paths.
- Definition of Done:
  - [x] Architecture gap is resolved or explicitly escalated.
  - [x] Backend implementation and tests pass, if implementation is approved.
  - [x] API/database docs and canonical state are updated.
- Result Report:
  - Implemented activation for `procedure` drafts only in this initial slice
    because procedures already support `workspaceId + name + version`.
  - Process and pipeline activation initially failed closed until their
    versioning schema changed; V2WEB-AGENT-011 later superseded that blocker
    with explicit `workspaceId + name + version` root uniqueness.
  - Activation validates approved workflow-draft approval, stale base version,
    workspace-scoped relations, and step order.
  - Activation deprecates the previous procedure, creates a new active
    procedure version, copies or applies steps, marks the draft active, and
    emits `workflow_definition_draft_activated` plus audit evidence with
    rollback candidate context.
  - `npm run build`, `npm test` against disposable PostgreSQL on
    `localhost:55434`, and `git diff --check` passed. The disposable
    validation container was removed.

## V2WEB-AGENT-011 Process And Pipeline Workflow Versioning Migration Decision

- Task Type: backend/architecture
- Current Stage: verification
- Status: DONE
- Owner: Planner / Backend Builder
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: process and pipeline versioning migration plus
  activation support.
- Goal: Remove the remaining activation blocker without weakening the
  workflow definition command contract.
- Scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - `src/tests/api.test.ts`
  - API/database docs and canonical state files.
- Implementation Plan:
  - Inspect current `processes` and `pipelines` uniqueness and relation
    constraints.
  - Choose between unique constraint migration, dedicated version tables, or
    keeping those root types blocked until a larger model migration.
  - If implementation is safe, add migration, activation support, and tests.
  - If implementation is not safe in this slice, record the decision and keep
    fail-closed behavior.
- Acceptance Criteria:
  - [x] Process and pipeline activation path is either implemented with tests
    or explicitly deferred with a source-of-truth reason.
  - [x] No route performs raw mutation of active workflow definitions.
  - [x] Runtime evidence preservation and rollback context are covered.
- Definition of Done:
  - [x] Decision is recorded in architecture/state docs.
  - [x] If code changes, build and integration tests pass.
  - [x] Canonical queue advances to the next safe slice.
- Result Report:
  - Added migration `202605143_workflow_root_version_uniqueness` and updated
    Prisma schema so `processes` and `pipelines` use
    `workspaceId + name + version` uniqueness.
  - Extended workflow activation to `process` and `pipeline` drafts in
    addition to `procedure` drafts.
  - Pipeline activation deprecates the previous pipeline, creates a new active
    version, and copies or applies pipeline stages.
  - Process activation deprecates the previous process and creates a new
    active process version.
  - Integration tests now cover process, pipeline, and procedure activation,
    required approval, stale-safe versioning behavior, MCP metadata, and
    audit/event evidence.
  - `npx prisma generate`, `npm run build`, `npm test` against disposable
    PostgreSQL on `localhost:55436`, and `git diff --check` passed; the
    disposable container was removed.

## V2WEB-AGENT-012 Workflow Definition Draft Web Surface

- Task Type: frontend/backend-integration
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: guarded owner web surface for workflow drafts,
  impact preview, and activation status without broad raw editing.
- Goal: Let the owner inspect and operate the workflow definition command
  surface from `/react-company-os` with the same safeguards as MCP/API.
- Scope:
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/ux/*` where reusable patterns are affected
  - API/state docs if frontend behavior changes user-facing contract.
- Implementation Plan:
  - Add typed route-kit helpers for workflow draft create, preview, and
    activate.
  - Add a narrow cockpit panel that starts from existing process, pipeline,
    and procedure records and shows preview/approval/activation states.
  - Do not expose raw editing of child stage/step fields beyond a bounded
    draft payload.
  - Run build and browser render/interaction proof.
- Acceptance Criteria:
  - [x] Owner can create a draft from an existing workflow root.
  - [x] Owner can preview impact and see approval reasons.
  - [x] Activation controls are gated by capability and approval requirement.
  - [x] Empty, loading, error, success, denied, and mobile states are covered.
  - [x] Browser proof verifies render and one command interaction.
- Definition of Done:
  - [x] Build passes.
  - [x] Browser proof passes with cleanup evidence.
  - [x] State/docs are updated.
- Result Report:
  - Added typed route-kit clients for workflow draft create, impact preview,
    and activation.
  - Added a guarded `/react-company-os` workflow command surface for process,
    pipeline, and procedure roots.
  - The surface creates a draft from an existing root, previews runtime impact,
    shows approval reasons, can request approval, and disables activation when
    the capability or approved approval ID is missing.
  - `npm run build` passed. Real-backend Playwright proof against a disposable
    PostgreSQL database and `http://127.0.0.1:3101/react-company-os` verified
    desktop render, create draft, impact preview, approval-required state,
    mobile DOM render, and zero relevant console issues.

## V2WEB-AGENT-013 Workflow Draft History And Resume Decision

- Task Type: architecture/frontend-decision
- Current Stage: planning
- Status: DONE
- Owner: Planner / Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: decision on whether draft history/readback and
  resume should precede archive/rollback commands.
- Goal: Decide the next safe workflow cockpit slice after the first guarded
  draft panel.
- Scope:
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/*`
- Decision:
  - Implement draft history/readback and resume before archive/rollback UI.
  - Reason: workflow drafts can be created by web, API, or MCP agents and may
    require approval before activation. Without readback, an owner cannot
    resume an interrupted command flow after reload or after an agent-created
    draft.
  - Constraint: the cockpit resume queue should show only `status=draft`
    records. Activated drafts remain API history, not resumable work.
- Acceptance Criteria:
  - [x] Decision names the operator problem.
  - [x] Decision selects the smallest safe next slice.
  - [x] Decision explicitly defers archive/rollback.
- Result Report:
  - Selected V2WEB-AGENT-014 Workflow Draft Readback And Resume Slice.

## V2WEB-AGENT-014 Workflow Draft Readback And Resume Slice

- Task Type: frontend/backend-integration
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder / Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: workspace-scoped draft readback and web resume
  for in-progress workflow drafts.
- Goal: Let owners resume existing workflow drafts in `/react-company-os`
  without broad raw editing or exposing draft payloads to read-only sessions.
- Scope:
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/tests/api.test.ts`
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - API/database/architecture docs and canonical state.
- Implementation Plan:
  - Add guarded `GET` list/detail draft routes with root type, status, and
    limit filters.
  - Keep draft readback under `company-os:workflow-definition:write` because
    draft payloads include proposed change sets and preview details.
  - Add route-kit loading and cockpit `Recent drafts` resume controls scoped
    to `status=draft`.
  - Prove API capability behavior and rendered resume behavior.
- Acceptance Criteria:
  - [x] Owner can list and read workspace workflow drafts.
  - [x] Cross-workspace draft detail returns `404` and foreign draft list is
    empty.
  - [x] Read-only profile/scoped keys cannot list workflow drafts.
  - [x] Cockpit shows resumable `draft` records and reloads a selected draft.
  - [x] Build, API test, render proof, and cleanup pass.
- Result Report:
  - Added `GET /v1/company-os/workflow-definitions/drafts` and
    `GET /v1/company-os/workflow-definitions/drafts/:id`.
  - Added route-kit draft loader and a `Recent drafts` resume panel in the
    workflow command surface.
  - Fixed capability route ordering so workflow draft readback is not captured
    by generic Company OS collection reads.
  - `npm run build` passed; `npm test` passed against disposable PostgreSQL on
    `localhost:55438`; Playwright proof against
    `http://127.0.0.1:3102/react-company-os` verified draft-only history,
    resume click, and zero relevant console issues.

## V2WEB-AGENT-015 Workflow Archive And Rollback Command Decision

- Task Type: architecture/backend-decision
- Current Stage: planning
- Status: DONE
- Owner: Planner / Backend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: smallest safe command contract for workflow
  archive and rollback.
- Goal: Decide how to add recovery commands without bypassing draft preview,
  approval, activation, audit, event, and version evidence.
- Scope:
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `.agents/state/*`
- Decision:
  - Implement archive and rollback as phased command routes, not raw status
    mutation.
  - First archive slice: explicit
    `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive`
    for inactive historical versions only.
  - First rollback slice: explicit
    `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft`
    that creates a rollback draft from the selected historical version and then
    relies on existing impact preview and activation.
  - Direct active archive and direct rollback execution remain deferred until a
    migration/replacement plan is modeled and tested.
- Acceptance Criteria:
  - [x] Decision names allowed and deferred recovery behavior.
  - [x] Decision preserves preview, approval, audit/event, stale-version, and
    MCP supervision boundaries.
  - [x] Next implementation task is narrow and executable.
  - [x] Runtime code is not changed in this decision task.
- Definition of Done:
  - [x] Architecture contract records the command shape.
  - [x] Canonical queues point to the next implementation slice.
  - [x] `git diff --check` passes.
- Result Report:
  - Selected V2WEB-AGENT-016 Workflow Historical Version Archive Backend Slice.
  - Rollback-draft creation remains the next likely backend slice after archive.

## V2WEB-AGENT-016 Workflow Historical Version Archive Backend Slice

- Task Type: backend/security
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder / QA-Test
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: first workflow recovery command for inactive
  historical root versions.
- Goal: Allow safe archive of inactive workflow root versions without hiding
  active production behavior or bypassing workspace, capability, audit/event,
  idempotency, and MCP supervision boundaries.
- Scope:
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - `src/modules/company-os/company-os.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/tests/api.test.ts`
  - `docs/API.md`
  - architecture/planning/state files.
- Implementation Plan:
  - Add explicit archive route under
    `/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive`.
  - Require `company-os:workflow-definition:activate` through adapter manifest
    capability matching.
  - Block active versions, already archived versions, and inactive versions
    with active runtime dependencies.
  - Emit event/audit evidence and support idempotent replay by command key.
  - Extend integration tests for owner success, fail-closed states, read-only
    denial, and MCP manifest metadata.
- Acceptance Criteria:
  - [x] Safe inactive historical workflow version can be archived.
  - [x] Active workflow root archive returns `409`.
  - [x] Inactive workflow root with active runtime dependencies returns `409`.
  - [x] Idempotent replay returns the original archive evidence.
  - [x] Read-only profile/scoped keys cannot archive workflow definitions.
  - [x] Audit/event evidence and MCP manifest metadata are verified.
  - [x] Build/test and cleanup pass.
- Result Report:
  - Added `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive`.
  - Added `workflow_definition_version.archived` audit evidence and
    `workflow_definition_version_archived` event evidence.
  - `npm run build` passed.
  - `npm test` passed against disposable PostgreSQL on `localhost:55439`.
  - The validation container was removed after the test run.
  - Next slice: V2WEB-AGENT-017 Workflow Rollback Draft Backend Slice.

## V2WEB-AGENT-017 Workflow Rollback Draft Backend Slice

- Task Type: backend/security
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder / QA-Test
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: rollback-draft creation from a historical
  workflow root version.
- Goal: Let owners or supervised agents prepare rollback without bypassing
  draft preview, approval, stale-version, audit, event, idempotency, and MCP
  boundaries.
- Scope:
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - `src/auth/capabilities.ts`
  - `src/tests/api.test.ts`
  - `docs/API.md`
  - `docs/DATABASE.md`
  - architecture/planning/state files.
- Implementation Plan:
  - Add explicit rollback-draft route under
    `/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft`.
  - Require `company-os:workflow-definition:write`.
  - Block active rollback sources and missing active same-name target versions.
  - Copy source root fields and children into `changeSet` with
    `kind = rollback_to_version`.
  - Generate impact preview and create a normal `workflow_definition_drafts`
    row against the current active root.
  - Extend integration tests for owner success, idempotency, fail-closed
    states, read-only denial, audit/event evidence, and MCP manifest metadata.
- Acceptance Criteria:
  - [x] Historical root can create a rollback draft against the current active
    same-name root.
  - [x] Active source root returns `409`.
  - [x] Repeated idempotency key returns the existing draft.
  - [x] Read-only profile/scoped keys cannot create rollback drafts.
  - [x] Audit/event evidence and MCP manifest metadata are verified.
  - [x] Build/test and cleanup pass.
- Result Report:
  - Added `POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft`.
  - Rollback drafts now store `changeSet.kind = rollback_to_version` and source
    root/version metadata.
  - `npm run build` passed.
  - `npm test` passed against disposable PostgreSQL on `localhost:55440`.
  - The validation container was removed after the test run.
  - Next slice should move recovery controls into the web cockpit only after
    the owner-facing UX states are designed.

## V2WEB-AGENT-018 Workflow Recovery Controls Web Decision

- Task Type: frontend/UX-decision
- Current Stage: planning
- Status: DONE
- Owner: Planner / Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: smallest safe owner-facing recovery UI.
- Goal: Decide how archive and rollback-draft controls should enter
  `/react-company-os` without mixing normal draft creation with recovery.
- Scope:
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/*`
- Decision:
  - Add a dedicated `Recovery controls` panel inside the existing workflow
    command surface.
  - Keep normal draft create/preview/activate as the primary path.
  - Show only inactive historical versions for recovery source selection.
  - Expose archive and rollback-draft as separate commands with a required
    recovery reason.
  - A rollback-draft must load into the existing draft/preview/activation
    panel rather than activating directly.
- Acceptance Criteria:
  - [x] Decision keeps recovery separate from normal draft creation.
  - [x] Decision names visible states and blocked actions.
  - [x] Decision selects a narrow implementation slice.
- Result Report:
  - Selected V2WEB-AGENT-019 Workflow Recovery Controls Web Surface.

## V2WEB-AGENT-019 Workflow Recovery Controls Web Surface

- Task Type: frontend/backend-integration
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder / QA-Test
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: web controls for verified workflow archive and
  rollback-draft commands.
- Goal: Let owners trigger safe recovery commands from `/react-company-os`
  while preserving backend command gates and draft activation flow.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - docs and canonical state.
- Implementation Plan:
  - Add route-kit clients for archive and rollback-draft commands.
  - Add a `Recovery controls` panel scoped to inactive historical versions.
  - Require a recovery reason and keep archive/rollback-draft as separate
    actions.
  - Load created rollback drafts into the existing preview/activation panel.
  - Verify build, API regression suite, rendered rollback-draft interaction,
    and cleanup.
- Acceptance Criteria:
  - [x] Recovery panel renders in the workflow command surface.
  - [x] Archive action is available only when activation capability exists and
    the selected historical version is not already archived.
  - [x] Rollback draft action creates a draft and preserves existing preview /
    approval / activation flow.
  - [x] Build, test, rendered proof, and cleanup pass.
- Result Report:
  - Added typed archive and rollback-draft route-kit functions.
  - Added `/react-company-os` recovery controls with historical version
    selection, recovery reason, archive, and rollback-draft buttons.
  - `npm run build` passed.
  - `npm test` passed against disposable PostgreSQL on `localhost:55441`.
  - Playwright proof against `http://127.0.0.1:3103/react-company-os` verified
    `Recovery controls`, clicked `Rollback draft`, and observed
    `Rollback draft created`; screenshot:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-v2web019-proof\workflow-recovery-controls-rollback-draft.png`.
  - Render proof console captured pre-existing generic collection `404`s from
    operating graph `/v1/{collection}` fetches; no new recovery endpoint failed.

## V2WEB-AGENT-020 Workflow Version Lineage Decision

- Task Type: architecture/data-decision
- Current Stage: done
- Status: DONE
- Owner: Planner / Backend Builder
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: decision on whether renamed-version rollback
  needs explicit workflow root lineage before support is considered complete.
- Goal: Remove name matching from rollback target selection so recovery remains
  safe when owners rename process, pipeline, or procedure versions.
- Scope:
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `.agents/state/decision-register.md`
  - `.agents/state/risk-register.md`
  - canonical queue files
- Implementation Plan:
  - Review the rollback-draft active target lookup and activation versioning
    model.
  - Decide between name matching, separate lineage tables, or root-local
    lineage IDs.
  - Select the smallest architecture-aligned implementation slice.
- Acceptance Criteria:
  - [x] Decision explicitly rejects mutable name matching as the long-term
        rollback target mechanism.
  - [x] Decision names how activation preserves lineage.
  - [x] Follow-up implementation is concrete and testable.
- Decision:
  - Add root-local `family_id` lineage to process, pipeline, and procedure
    roots.
  - Activation must copy `family_id` from the previous root into the new active
    root.
  - Rollback-draft creation must resolve the active target by workspace, root
    type, and `family_id`, not by name.
- Definition of Done:
  - Architecture contract updated.
  - Decision register updated.
  - Risk register updated or closed by implementation.
- Validation Evidence:
  - Source review found rollback target lookup still matched historical root
    `name`.
  - DEC-013 records the accepted lineage decision.
- Result Report:
  - Decision completed and immediately implemented in V2WEB-AGENT-021.

## V2WEB-AGENT-021 Workflow Version Lineage Implementation

- Task Type: backend/data
- Current Stage: done
- Status: DONE
- Owner: Backend Builder / QA-Test
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: migration, activation copy, rollback lookup, and
  regression proof for renamed-version rollback.
- Goal: Let owners and supervised agents create rollback drafts from renamed
  historical workflow versions without bypassing preview, approval, audit, or
  activation gates.
- Scope:
  - `prisma/schema.prisma`
  - `prisma/migrations/202605144_workflow_root_family_lineage/migration.sql`
  - `src/modules/company-os/workflow-definition-drafts.routes.ts`
  - `src/tests/api.test.ts`
  - `docs/API.md`
  - `docs/DATABASE.md`
  - `docs/architecture/company-os-workflow-definition-command-contract.md`
  - `.agents/state/*`
  - `.codex/context/*`
- Implementation Plan:
  - Add `family_id` to process, pipeline, and procedure roots and backfill
    existing rows to their root IDs.
  - Copy root lineage during procedure, process, and pipeline activation raw
    inserts.
  - Replace rollback active target lookup by name with lookup by `family_id`.
  - Add regression coverage for rollback from a renamed historical pipeline.
  - Run generation, build, integration tests, diff check, and cleanup.
- Acceptance Criteria:
  - [x] Existing rows receive stable root lineage.
  - [x] New active versions preserve previous root lineage.
  - [x] Rollback-draft creation resolves active target by lineage.
  - [x] Renamed historical pipeline rollback creates a normal draft against
        the current active root.
  - [x] Documentation and state files reflect the new source of truth.
- Definition of Done:
  - `npx prisma generate` passes.
  - `npm run build` passes.
  - `npm test` passes against disposable PostgreSQL.
  - `git diff --check` passes.
  - Disposable Docker resources are removed.
- Validation Evidence:
  - `npx prisma generate`: passed.
  - `npm run build`: passed.
  - `npm test` with
    `postgresql://companycore:companycore@localhost:55442/companycore_test?schema=public`:
    passed; migrations applied through
    `202605144_workflow_root_family_lineage`.
  - Integration test now asserts activated pipeline `familyId` matches the
    historical root and that rollback draft from renamed pipeline v1 targets
    the active v2 root with target version 3.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
  - Cleanup: removed `companycore-test-postgres-v2web021`; no
    `chrome-headless-shell` validation process remained.
- Result Report:
  - Added stable workflow root lineage and closed renamed-version rollback
    risk without direct rollback execution.
  - Next step: V2WEB-AGENT-022 Company OS Collection Fetch Alignment for the
    pre-existing generic collection `404`s seen in the recovery render proof.

## V2WEB-AGENT-022 Company OS Collection Fetch Alignment

- Task Type: frontend/reliability
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder / QA-Test
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: shared route-kit path fix and clean render
  request proof for Company OS collection fetches.
- Goal: Stop `/react-company-os` and shared table-record previews from
  requesting generic `/v1/{collection}` routes for Company OS collection slugs.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `.agents/state/*`
  - `.codex/context/*`
  - `docs/planning/*`
- Implementation Plan:
  - Add one shared helper that maps Company OS collection slugs to
    `/v1/company-os/:collection`.
  - Use the helper in table-record snapshot loading.
  - Use the helper for displayed table API paths so the UI reflects the real
    route.
  - Verify build and rendered request behavior.
- Acceptance Criteria:
  - [x] Company OS table slugs no longer request generic `/v1/:slug` routes.
  - [x] `/react-company-os` render proof has no generic Company OS requests.
  - [x] Render proof has no 404s and no console errors under the mocked API.
  - [x] UI path labels show `/v1/company-os/:collection` for Company OS
        tables.
- Definition of Done:
  - `npm run build` passes.
  - Render/request proof passes.
  - Source-of-truth state files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - Playwright mock render proof for `/react-company-os`: passed with
    `badGeneric=[]`, `notFound=[]`, and `consoleErrors=[]`.
  - Proof screenshot:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-v2web022-proof-final.png`.
- Result Report:
  - Added `tableRecordApiPath()` to route-kit and used it for table-record
    snapshots plus visible table API labels.
  - Closed KI-004.
  - Next step: V2WEB-AGENT-023 Workflow Recovery End-To-End Activation Proof.

## V2WEB-AGENT-023 Workflow Recovery End-To-End Activation Proof

- Task Type: frontend/verification
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder / QA-Test
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: owner-cockpit proof that rollback recovery can
  proceed through approval decision and activation without API-only steps.
- Goal: Ensure recovery controls are usable as one coherent workflow, not just
  isolated backend commands.
- Scope:
  - `web/src/main.tsx`
  - `.agents/state/*`
  - `.codex/context/*`
  - `docs/planning/*`
- Implementation Plan:
  - Exercise the recovery UI from rollback draft creation to activation.
  - Fix any local-state or missing-action defects that prevent the flow.
  - Preserve existing backend command boundaries and audited approval decision
    routes.
  - Verify with build and Playwright interaction proof.
- Acceptance Criteria:
  - [x] Recovery panel can create a rollback draft.
  - [x] Draft can be previewed and show approval requirement.
  - [x] User can request approval from the workflow panel.
  - [x] User can approve the requested approval through an audited UI action.
  - [x] User can activate the draft with the approved approval ID.
  - [x] No API-only step is required in the proof.
- Definition of Done:
  - `npm run build` passes.
  - Rendered interaction proof passes.
  - State and planning docs are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - Playwright mock interaction proof for `/react-company-os`: passed with
    calls `rollback-draft`, `preview`, `request-approval`, `approve`, and
    `activate:approval-recovery-1`.
  - Proof reported `notFound=[]`, `consoleErrors=[]`, final draft `active`,
    and final approval `approved`.
  - Screenshot:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-v2web023-recovery-activation-proof.png`.
- Result Report:
  - Added inline `Approve requested approval` action in the workflow recovery
    panel using the existing audited approval decision route.
  - Removed premature parent reloads after approval request/decision so local
    draft and approval state survive until activation.
  - Next step: V2WEB-AGENT-024 real-backend proof if local Docker/database
    access is available.

## V2WEB-AGENT-024 Workflow Recovery Real Backend Proof

- Task Type: verification
- Current Stage: done
- Status: DONE
- Owner: QA-Test / Backend Builder
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: real-backend browser proof for the workflow
  recovery activation path.
- Goal: Confirm the recovery UI works against migrated PostgreSQL and actual
  backend routes, not only mocked responses.
- Scope:
  - Docker Compose disposable stack
  - `/react-company-os`
  - workflow draft, approval, approval decision, and activation routes
  - `.agents/state/*`
  - `.codex/context/*`
  - `docs/planning/*`
- Implementation Plan:
  - Start isolated Docker Compose project on a non-default backend port.
  - Let the backend run migrations and seed data.
  - Create a historical workflow version setup through backend commands.
  - Use the real owner cockpit to create rollback draft, preview, request
    approval, approve, and activate.
  - Capture proof and clean up Compose resources.
- Acceptance Criteria:
  - [x] Disposable backend health is green.
  - [x] `/react-company-os` is loaded with a real owner session.
  - [x] Recovery flow calls real backend routes through the UI.
  - [x] Activation succeeds and the UI shows success.
  - [x] No browser console errors occur.
  - [x] Compose containers, network, and volume are removed.
- Definition of Done:
  - Docker image build passes.
  - Backend health passes.
  - Browser proof passes.
  - Compose cleanup passes.
- Validation Evidence:
  - `docker compose -p companycore-v2web024 up -d --build`: passed.
  - `http://127.0.0.1:3104/health`: returned `status=ok`.
  - Real-backend Playwright proof: passed with `consoleErrors=[]`.
  - Proof screenshot:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-v2web024-real-backend-recovery-proof.png`.
  - Cleanup: `docker compose -p companycore-v2web024 down -v` removed
    backend, Postgres, network, and volume.
- Result Report:
  - Workflow recovery is verified locally through backend lineage, web
    controls, approval decision, activation, mock UI proof, and real-backend
    UI proof.
  - No local Company OS workflow recovery task remains ready.

## UXA-022 React Areas Canonical Switch Decision

- Task Type: architecture/frontend-decision
- Current Stage: done
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: decision on whether `/react-areas` can replace
  canonical `/areas` after relationship data parity, or whether explicit React
  write controls are required first.
- Goal: Avoid switching the owner to a React route before the canonical area
  workflow's read, review, and scope-editing responsibilities are fully covered.
- Scope:
  - `public/app.js`
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Compare canonical `/areas` responsibilities with `/react-areas` after
    UXA-021.
  - Decide whether route replacement is safe now.
  - If not safe, name the smallest missing parity slice.
  - Do not change runtime routes in this decision task.
- Acceptance Criteria:
  - [x] Decision explicitly approves or rejects a canonical route switch.
  - [x] Decision names remaining read/write/action parity gaps.
  - [x] Next implementation task is concrete if the switch is rejected.
  - [x] No runtime route switch is performed in this decision task.
- Decision:
  - Do not switch canonical `/areas` to `/react-areas` yet.
  - `/react-areas` now has strong read parity after UXA-021: it loads
    connection data, external provider mappings, and Google Drive files from
    existing API contracts, then exposes metrics, filters, review queues, and
    action links.
  - Canonical `/areas` still owns write/action parity through bound scope
    editors:
    `PATCH /v1/operating-model/external-mappings/:id/scope` and
    `PATCH /v1/google-drive/files/:id/scope`.
  - Switching now would remove the operator's direct reassignment controls for
    provider and Drive ownership from the canonical areas workflow.
  - The next safe slice is UXA-023 React Areas Scope Assignment Controls.
- Definition of Done:
  - Source review is recorded.
  - `git diff --check` passes.
  - Canonical queue files agree on the next task.
- Validation Evidence:
  - Source review:
    - `public/app.js` binds `[data-mapping-scope]` and `[data-drive-scope]`
      controls to `updateExternalMappingScope` and `updateGoogleDriveFileScope`.
    - `web/src/main.tsx` renders `/react-areas` read/filter/review queues and
      links back to canonical routes, but does not yet expose equivalent
      assignment controls.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Decision: keep canonical `/areas` on the vanilla owner console for now.
  - Reason: React has read/review parity, but not direct scope-assignment write
    controls.
  - Next step: UXA-023 React Areas Scope Assignment Controls.

## UXA-023 React Areas Scope Assignment Controls

- Task Type: frontend
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: add provider mapping and Drive item
  operating-area assignment controls to `/react-areas` using existing PATCH
  endpoints and local action feedback.
- Goal: Close the remaining `/areas` canonical switch blocker by giving the
  React areas workbench direct, audited owner controls for scope reassignment.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add React route-kit client functions for existing provider and Drive scope
    PATCH routes.
  - Add select controls in `/react-areas` review queues for assigning an
    operating area.
  - Use local pending/success/error feedback and reload the areas state after a
    successful assignment.
  - Preserve canonical `/areas` until this write parity is validated.
- Acceptance Criteria:
  - [x] Provider mapping rows can be assigned to an area from `/react-areas`.
  - [x] Drive file/folder rows can be assigned to an area from `/react-areas`.
  - [x] Successful assignment reloads React area data.
  - [x] Errors are shown locally and do not expose raw backend errors.
  - [x] No backend route or schema is added.
- Definition of Done:
  - `npm run build` passes.
  - Focused `/react-areas` rendered/action check passes.
  - `git diff --check` passes.
  - Source-of-truth planning/state files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    npm run seed"`: passed.
  - Focused Playwright action check: passed with local owner-session login,
    controlled local provider/Drive fixtures, provider scope assignment,
    Drive scope assignment, API readback for assigned `areaId`, zero console
    errors, and no desktop/mobile horizontal overflow.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Added React route-kit clients for existing provider and Drive scope PATCH
    endpoints.
  - Added assignment selects to provider and Drive review queues on
    `/react-areas`.
  - Added local success/error feedback and delayed reload after successful
    assignment so feedback remains visible.
  - Preserved backend routes, database schema, and canonical `/areas`.
  - Next step: UXA-024 React Areas Canonical Switch Decision.

## UXA-024 React Areas Canonical Switch Decision

- Task Type: architecture/frontend-decision
- Current Stage: done
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: decide whether `/react-areas` can now replace
  canonical `/areas` after read, review, and scope-assignment parity.
- Goal: Switch only if the React route preserves the operator's real area
  workflow and does not remove setup or edit capabilities still owned by
  vanilla routes.
- Scope:
  - `public/app.js`
  - `src/app.ts`
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Compare canonical `/areas` with `/react-areas` after UXA-023.
  - Decide whether direct canonical route replacement is safe.
  - If safe, queue the smallest route-switch slice.
  - If not safe, name the exact remaining parity gap.
- Acceptance Criteria:
  - [x] Decision explicitly approves or rejects the route switch.
  - [x] Decision names remaining risks or the exact switch scope.
  - [x] Next task is concrete and small.
  - [x] No runtime route switch is performed in this decision task.
- Definition of Done:
  - Source review is recorded.
  - `git diff --check` passes.
  - Canonical queue files agree on the next task.
- Decision:
  - Do not switch canonical `/areas` to `/react-areas` yet.
  - React now covers read/review and unassigned provider/Drive scope assignment
    after UXA-023, but canonical `/areas` still owns operating-area lifecycle
    and selected-area operational context.
  - Remaining parity gaps:
    - user-created operating area create/delete/reassign controls from
      `createOperatingArea` and `deleteSelectedArea`;
    - selected-area database table and record preview context from
      `state.selectedAreaKey`, `state.databaseTables`, and
      `loadDatabaseSnapshot`;
    - reassignment controls for already assigned provider mappings and Drive
      folders shown inside the selected area context.
  - The next safe slice is UXA-025 React Areas Area Lifecycle Controls.
- Validation Evidence:
  - Source review:
    - `public/app.js` still owns selected-area lifecycle and context through
      `createOperatingArea`, `deleteSelectedArea`, `state.selectedAreaKey`,
      `state.databaseTables`, `loadDatabaseSnapshot`, and selected-area scope
      editors.
    - `web/src/main.tsx` now renders area read/review signals and unassigned
      provider/Drive assignment controls, but does not expose user-created area
      lifecycle controls or selected-area record previews.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Rejected the route switch for this iteration.
  - Preserved canonical `/areas` unchanged.
  - Queued UXA-025 as the next concrete parity slice.

## UXA-025 React Areas Area Lifecycle Controls

- Task Type: frontend
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: add user-created operating area create/delete
  controls to `/react-areas` using existing operating-model area endpoints.
- Goal: Close the lifecycle parity gap that blocks replacing canonical
  `/areas` with the React workbench.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Confirm the existing create/delete area API contract before editing.
  - Add typed React route-kit client helpers for area create/delete only if the
    existing endpoints already support the required lifecycle operations.
  - Add compact create and delete/reassign controls to `/react-areas`, with
    system areas protected from deletion.
  - Show local loading, success, and recovery feedback near the action.
  - Refresh the workbench after successful lifecycle actions.
- Acceptance Criteria:
  - [x] A user-created operating area can be created from `/react-areas`.
  - [x] A user-created operating area can be deleted with a safe reassignment
    target.
  - [x] System areas cannot be deleted from the React UI.
  - [x] Existing backend routes and database schema are reused.
  - [x] Runtime route switch is not included in this implementation slice.
- Definition of Done:
  - `npm run build` passes.
  - Focused signed-in `/react-areas` lifecycle check passes.
  - `git diff --check` passes.
  - Canonical queue files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && npm run seed"`:
    passed.
  - Focused Playwright lifecycle smoke: created a unique user area, verified it
    through `/v1/operating-model/areas`, deleted it through the React UI with
    reassignment, confirmed it disappeared from the API, confirmed system areas
    expose no delete button, checked desktop/mobile overflow, and captured zero
    console issues.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Added React route-kit helpers for `POST /v1/operating-model/areas` and
    `DELETE /v1/operating-model/areas/:id`.
  - Added a `/react-areas` lifecycle panel for creating user-created operating
    areas and deleting them with safe reassignment.
  - Preserved canonical `/areas`, backend routes, and database schema.

## UXA-026 React Areas Selected Context Parity Decision

- Task Type: architecture/frontend-decision
- Current Stage: done
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: decide the smallest safe data/UI slice for
  selected-area context parity in `/react-areas`.
- Goal: Close the next blocker before canonical `/areas` can be replaced:
  selected-area record previews and reassignment controls for already assigned
  provider/Drive items.
- Scope:
  - `public/app.js`
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Compare canonical selected-area context with the current React workbench.
  - Identify whether existing endpoints already expose table record preview
    evidence and assigned provider/Drive reassignment data.
  - Queue the smallest implementation slice without switching canonical routes.
- Acceptance Criteria:
  - [x] Decision names the exact next parity gap and source contract.
  - [x] No new backend route is proposed if existing APIs cover the slice.
  - [x] Next task is concrete, small, and verifiable.
  - [x] Canonical `/areas` remains unchanged.
- Definition of Done:
  - Source review is recorded.
  - `git diff --check` passes.
  - Canonical queue files agree on the next task.
- Decision:
  - Do not add a new selected-area backend route yet.
  - The canonical `/areas` selected context composes existing data contracts:
    `/v1/operating-model` for areas/tables/mappings, `/v1/google-drive/files`
    for Drive ownership, and typed table routes `/v1/{apiSlug}` for record
    previews.
  - The next smallest safe implementation slice is UXA-027 React Areas
    Selected Context Data Hook: load per-table record previews in the React
    route kit and render a selected-area context panel with table counts,
    record previews, assigned Drive items, and assigned provider mappings.
  - Reassignment controls for already assigned provider/Drive items can follow
    after the selected context exists; the existing PATCH scope endpoints
    remain the source contract for that later write slice.
- Validation Evidence:
  - Source review:
    - `public/app.js` uses `loadDatabaseSnapshot` to fetch `/v1/${table.apiSlug}`
      for every operating table after `/v1/operating-model` loads.
    - `public/app.js` selected context combines `state.selectedAreaKey`,
      table record counts, Drive files, provider mappings, and compact record
      previews.
    - `web/src/react-route-kit.tsx` already loads connection, provider
      mappings, and Drive files for `/react-areas`; it does not yet load table
      records.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Selected existing typed table APIs as the record preview source contract.
  - Preserved canonical `/areas`, backend routes, and database schema.
  - Queued UXA-027 as the next concrete implementation slice.

## UXA-027 React Areas Selected Context Data Hook

- Task Type: frontend
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: load selected table record previews in the React
  route kit and render selected-area context in `/react-areas`.
- Goal: Bring React `/react-areas` closer to canonical `/areas` parity by
  showing the operator what records, tables, Drive items, and provider mappings
  belong to the selected operating area.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add a typed route-kit loader that fetches records for operating table
    `apiSlug` values using existing `/v1/{apiSlug}` routes.
  - Include the table record snapshot in `AreasWorkbenchState`.
  - Add selected-area state and a context panel in `/react-areas`.
  - Render table counts, record previews, assigned provider mappings, and
    assigned Drive items without adding write controls yet.
- Acceptance Criteria:
  - [x] `/react-areas` loads table record previews through existing typed table
    endpoints.
  - [x] Selecting an area shows table counts, record previews, assigned Drive
    items, and assigned provider mappings.
  - [x] No new backend route or schema change is added.
  - [x] Canonical `/areas` remains unchanged.
- Definition of Done:
  - `npm run build` passes.
  - Focused signed-in `/react-areas` selected-context smoke passes.
  - `git diff --check` passes.
  - Canonical queue files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && npm run seed"`:
    passed.
  - Focused Playwright selected-context smoke: verified `/react-areas` renders
    selected context, table/record/Drive/provider metrics, table and record
    panels, 12 inspect-area options, selectable area state, no desktop/mobile
    horizontal overflow, and zero console issues.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Added capability-filtered table record snapshot loading in the React route
    kit using existing `/v1/{apiSlug}` routes.
  - Added a selected-area context panel to `/react-areas`.
  - Preserved canonical `/areas`, backend routes, and database schema.

## UXA-028 React Areas Assigned Scope Reassignment Controls

- Task Type: frontend
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: add reassignment controls for already assigned
  provider mappings and Drive items in the `/react-areas` selected context.
- Goal: Close the remaining selected-context write parity gap before any
  canonical `/areas` route switch decision.
- Scope:
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Reuse existing React scope assignment handlers and PATCH endpoint helpers.
  - Add compact operating-area select controls to assigned provider mappings
    and assigned Drive items inside selected context.
  - Preserve read-only record previews and do not switch canonical routes.
  - Verify reassignment through API readback and rendered refresh.
- Acceptance Criteria:
  - [x] Already assigned provider mappings can be reassigned from selected
    context.
  - [x] Already assigned Drive items can be reassigned from selected context.
  - [x] Existing PATCH endpoints are reused.
  - [x] No new backend route or schema change is added.
  - [x] Canonical `/areas` remains unchanged.
- Definition of Done:
  - `npm run build` passes.
  - Focused signed-in `/react-areas` reassignment smoke passes.
  - `git diff --check` passes.
  - Canonical queue files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && npm run seed"`:
    passed.
  - Focused Playwright reassignment smoke: moved an assigned provider mapping
    and an assigned Drive item from selected context to another operating area,
    verified both through API readback, restored fixtures to the source area,
    checked desktop/mobile overflow, and captured zero console issues.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Added operating-area reassignment selects to assigned provider mappings and
    assigned Drive items in selected context.
  - Reused existing React assignment handlers and PATCH scope endpoint helpers.
  - Preserved canonical `/areas`, backend routes, and database schema.

## UXA-029 React Areas Canonical Route Switch Decision

- Task Type: architecture/frontend-decision
- Current Stage: done
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: decide whether `/react-areas` can replace
  canonical `/areas` after read, lifecycle, selected context, and reassignment
  parity.
- Goal: Switch only if React now preserves the operator's real area workflow
  without losing setup, lifecycle, record preview, or scope editing capability.
- Scope:
  - `public/app.js`
  - `src/app.ts`
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Compare canonical `/areas` with `/react-areas` after UXA-028.
  - Decide whether a direct route replacement is safe.
  - If safe, queue the smallest route allowlist/switch slice.
  - If not safe, name the remaining parity blocker precisely.
- Acceptance Criteria:
  - [x] Decision explicitly approves or rejects the route switch.
  - [x] Decision names remaining risks or the exact switch scope.
  - [x] Next task is concrete and small.
  - [x] No runtime route switch is performed in this decision task.
- Definition of Done:
  - Source review is recorded.
  - `git diff --check` passes.
  - Canonical queue files agree on the next task.
- Decision:
  - Approve switching canonical `/areas` to the React areas workbench.
  - React now covers the required operator workflow: area read/review signals,
    unassigned scope assignment, user-created area create/delete with
    reassignment, selected-area table/record/Drive/provider context, and
    reassignment controls for already assigned provider/Drive items.
  - The switch must be the smallest route slice only: serve React for `/areas`,
    keep `/react-areas` as a parallel alias, and update React route detection so
    both paths render the same workbench.
  - Do not remove vanilla area implementation code in this slice; preserving it
    keeps rollback simple while canonical traffic moves to React.
- Validation Evidence:
  - Source review:
    - `src/app.ts` currently serves `/areas` through `webAppRoutes` and
      `/react-areas` through `reactAppRoutes`.
    - `web/src/main.tsx` currently renders `ReactAreasApp` only for
      `/react-areas`.
    - UXA-025 through UXA-028 added and validated lifecycle, selected context,
      record previews, and assigned scope reassignment parity.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Approved the canonical route switch.
  - Preserved rollback by keeping `/react-areas` alias and not deleting vanilla
    implementation code.
  - Queued UXA-030 as the route-switch implementation slice.

## UXA-030 React Areas Canonical Route Switch

- Task Type: frontend/routing
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: serve React areas workbench at canonical
  `/areas` while preserving `/react-areas` as an alias.
- Goal: Make the validated React areas workbench the canonical operating-area
  route without broad deletion or unrelated route changes.
- Scope:
  - `src/app.ts`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Move `/areas` from vanilla web route handling to React route handling.
  - Render `ReactAreasApp` for both `/areas` and `/react-areas`.
  - Keep the `/react-areas` alias for comparison and rollback.
  - Verify signed-out and signed-in `/areas` plus `/react-areas`.
- Acceptance Criteria:
  - [x] `/areas` serves the React areas workbench.
  - [x] `/react-areas` still serves the React areas workbench.
  - [x] No unrelated canonical routes are switched.
  - [x] Vanilla implementation code is not deleted.
- Definition of Done:
  - `npm run build` passes.
  - Focused signed-out and signed-in `/areas` route smoke passes.
  - Focused `/react-areas` alias smoke passes.
  - `git diff --check` passes.
  - Canonical queue files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy && npm run seed"`:
    passed.
  - Focused Playwright route-switch smoke: verified signed-out `/areas` owner
    session state, signed-in `/areas` React workbench, signed-in
    `/react-areas` alias, selected context, lifecycle panel, React document
    title, no desktop/mobile overflow, and zero console issues.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Moved `/areas` from vanilla web route handling to React route handling.
  - Rendered `ReactAreasApp` for both `/areas` and `/react-areas`.
  - Preserved `/react-areas` as an alias and kept vanilla implementation code
    in place for rollback.

## UXA-031 V1 Architecture Completion Audit

- Task Type: architecture/release-readiness
- Current Stage: done
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: ARCHITECT
- Deliverable For This Stage: audit the current V1 implementation against the
  approved Company OS architecture and identify whether any architecture-derived
  V1 blockers remain.
- Goal: Establish whether this workstream can honestly report that all
  architecture-derived V1 steps are complete, or name the exact remaining
  blocker before that claim is made.
- Scope:
  - `docs/architecture/system-architecture.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Compare completed CCOS, MCP, AGRUN, and UXA slices against the current
    architecture and V1 readiness docs.
  - Separate completed work, blocked external dependencies, and true local V1
    blockers.
  - If no local V1 blockers remain, record the completion statement and next
    release-readiness action.
  - If a blocker remains, queue exactly one small implementation task.
- Acceptance Criteria:
  - [x] Audit lists completed architecture-derived V1 capabilities.
  - [x] Audit lists external blockers separately from local implementation
    blockers.
  - [x] Audit states whether "all architecture-derived local V1 steps are
    complete" is currently true.
  - [x] Next task is concrete and small.
- Definition of Done:
  - Source review is recorded.
  - `git diff --check` passes.
  - Canonical state files agree on the next task.
- Validation Evidence:
  - Source review covered `docs/architecture/system-architecture.md`,
    `.codex/context/PROJECT_STATE.md`, `.codex/context/TASK_BOARD.md`,
    `.agents/state/current-focus.md`, `.agents/state/known-issues.md`,
    `docs/planning/mvp-next-commits.md`,
    `docs/operations/v1-release-readiness.md`,
    `docs/operations/v1-operator-handoff.md`, `package.json`, Prisma models,
    route definitions, and React route ownership.
  - Published `docs/planning/v1-architecture-control-map.md` as the unified V1
    control map.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Local architecture-derived V1 implementation is substantially complete for
    the approved Company OS, MCP, ClickUp, operating-model, owner UI, and
    agent-access scope.
  - Remaining V1 issues are external blockers or project-control follow-up,
    not unimplemented local runtime subsystems.
  - Queued `V1CTRL-001 Function Coverage Ledger` as the next concrete step to
    prevent future circular work.

## V1CTRL-001 Function Coverage Ledger

- Task Type: architecture/release-readiness
- Current Stage: done
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: create a module-by-module function coverage
  ledger that classifies API, UI, MCP, integration, operations, and docs
  surfaces by implementation and evidence status.
- Goal: Give future agents a confidence index so follow-up tasks come from
  verified gaps instead of repeated ad hoc fixes.
- Scope:
  - `docs/operations/v1-function-coverage-ledger.csv`
  - `docs/planning/v1-architecture-control-map.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Use `docs/governance/function-coverage-ledger-standard.md`.
  - List major V1 modules and surfaces.
  - Classify each as implemented, verified, needs evidence, partial, blocked,
    or deferred.
  - Derive only one next task from real `V1_BLOCKER` or evidence gaps.
- Acceptance Criteria:
  - [x] Ledger exists under `docs/operations/`.
  - [x] Ledger separates local gaps, evidence gaps, external blockers, and V2
    deferrals.
  - [x] `TASK_BOARD` and `mvp-next-commits` use the ledger as the next source
    of executable work.
  - [x] No runtime code is changed.
- Definition of Done:
  - Ledger follows the repository standard.
  - `git diff --check` passes.
  - Canonical state files agree on the next task.
- Validation Evidence:
  - Reviewed `docs/governance/function-coverage-ledger-standard.md`,
    architecture docs, Prisma schema/model groups, API route ownership,
    React/static route ownership, MCP bridge scripts, integration services,
    tests, operations docs, and canonical state files.
  - Added `docs/operations/v1-code-surface-index.md`,
    `docs/operations/v1-function-coverage-ledger.csv`, and
    `docs/operations/v1-function-coverage-audit.md`.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Created the code-surface index, function coverage ledger, and human-readable
    audit report needed to inspect full V1 implementation coverage.
  - Classified implemented, evidence-missing, externally blocked, and V2
    deferred capabilities across API, UI, MCP, integrations, operations,
    documentation, security, and agent surfaces.
  - Queued `V1CTRL-002 Canonical Queue Cleanup` as the next small control task
    so future work starts from the ledger instead of stale historical queues.

## V1CTRL-002 Canonical Queue Cleanup

- Task Type: planning/source-of-truth
- Current Stage: done
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: reduce active queue noise and align
  `NOW`/`NEXT` with the coverage-ledger-derived work stream.
- Goal: Prevent old completed tasks, external blockers, and future V2 ideas
  from being mistaken for active V1 implementation work.
- Scope:
  - `docs/planning/mvp-next-commits.md`
  - `docs/operations/v1-project-control-system.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/v1-architecture-control-map.md`
- Implementation Plan:
  - Make the active queue small and explicit.
  - Keep blocked external work in `Blocked`, not `NOW`.
  - Move ledger-derived evidence tasks into the next executable lane.
  - Preserve historical completed task evidence without making it look active.
- Acceptance Criteria:
  - [x] `NOW` and `NEXT` contain only the current small executable queue.
  - [x] External blockers remain visible but are not mixed into active work.
  - [x] The next evidence tasks come from
    `docs/operations/v1-function-coverage-ledger.csv`.
  - [x] No runtime code is changed.
- Definition of Done:
  - Canonical queue files agree on one next task.
  - Historical task evidence remains discoverable.
  - `git diff --check` passes.
- Validation Evidence:
  - Converted `docs/planning/mvp-next-commits.md` to an explicit active queue
    plus historical archive sections.
  - Added `docs/operations/v1-project-control-system.md` so future agents can
    classify implemented work, evidence gaps, local gaps, external blockers,
    V2 expansion, and historical evidence before coding.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - The active queue now points to `V1EVID-001` as the next executable proof
    task after this cleanup.
  - Historical completed tasks remain in the planning file but are no longer
    presented as active `NOW` work.
  - The control system now explains how to avoid looped work by verifying
    ledger gaps before creating implementation tasks.

## V1EVID-001 Company OS Lifecycle Trace Smoke

- Task Type: verification/evidence
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: one repeatable local trace that exercises
  Company OS approval, stage lifecycle, automation evaluation, event readback,
  and audit readback.
- Process Self-Audit:
  - Analyze current state: V1CTRL-002 queued V1EVID-001 from the function
    coverage ledger; Company OS command routes already existed but needed one
    current local trace.
  - Select one priority objective: only the Company OS lifecycle evidence gap
    was selected.
  - Plan implementation: add a focused smoke script that uses existing HTTP
    command routes and readback APIs, then update evidence ledgers.
  - Execute implementation: added
    `scripts/company-os-lifecycle-trace-smoke.mjs` and
    `npm run company-os:trace-smoke`.
  - Verify and test: build passed; local Docker migrations, seed, and trace
    smoke passed.
  - Self-review: no Company OS runtime behavior, schema, or architecture
    contract was changed; the first smoke failure was fixed in the smoke rule
    by matching stable event type instead of an unstable payload field.
  - Update documentation and knowledge: function ledger, module confidence,
    requirements, quality scenarios, risk register, project state, task board,
    system health, and next steps were updated.
- Goal: Convert the highest-risk implemented-but-needs-evidence Company OS
  rows in `docs/operations/v1-function-coverage-ledger.csv` into current
  behavior proof before opening broad V2 work.
- Scope:
  - existing `src/modules/company-os/` routes and command behavior
  - existing integration tests or a new focused smoke test if needed
  - `docs/operations/v1-function-coverage-ledger.csv`
  - `.agents/state/system-health.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
- Implementation Plan:
  - Reuse existing Company OS lifecycle APIs and test helpers where possible.
  - Create or run a focused trace for approval request/decision, stage
    start/validate/complete, automation evaluator, event readback, and audit
    readback.
  - Update ledger rows from evidence-missing to current local evidence when
    the trace passes.
  - Create a narrow implementation task only if the trace exposes a real
    defect.
- Acceptance Criteria:
  - [x] Trace proves approval lifecycle read/write behavior.
  - [x] Trace proves stage lifecycle transition behavior.
  - [x] Trace proves automation evaluator behavior or records a precise defect.
  - [x] Trace proves event and audit readback for the lifecycle action chain.
  - [x] Ledger and system health are updated with evidence.
- Definition of Done:
  - [x] Relevant validation command passes or the precise failing defect is logged.
  - [x] No unrelated runtime changes are made.
  - [x] Canonical state files agree on the next task after the trace.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build backend`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    npm run seed && npm run company-os:trace-smoke"`:
    passed.
  - Trace summary: `v1evid-1778458446081`, workspace
    `d05e2919-ba00-4c34-a065-7e6126bc2c06`, approval
    `006e46a1-f5a9-453a-9803-f77c705dcd4a`, pipeline run
    `56a67d17-5535-4b3c-9663-d27eb5968ab0`, stage run
    `ce70b2ee-faca-4406-8bc8-b137df1f1feb`, automation rule
    `325fadde-ce79-4d3b-a49c-2540f60969d4`, `eventCount=8`,
    `auditLogCount=7`.
  - Event types verified: `approval_requested`, `approval_approved`,
    `stage_started`, `stage_validated`, `stage_completed`,
    `v1_lifecycle_followup_needed`.
  - Audit actions verified: `approval.requested`, `stage_run.completed`,
    `automation_rule.matched`.
- Result Report:
  - Added a repeatable focused Company OS lifecycle trace smoke.
  - Confirmed approval, stage, automation, event, and audit evidence through
    the existing HTTP API boundary and local Docker Postgres runtime.
  - Updated canonical evidence and state files.
  - Next step: V1EVID-002 Operating Model Registry Lifecycle Smoke.

## V1EVID-002 Operating Model Registry Lifecycle Smoke

- Task Type: verification/evidence
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Operation Mode: BUILDER
- Deliverable For This Stage: one repeatable local Docker trace that exercises
  operating folder, storage location, knowledge root, and automation
  definition lifecycle APIs.
- Process Self-Audit:
  - Analyze current state: V1EVID-001 closed the Company OS lifecycle evidence
    gap; the active function ledger still listed operating-model registry
    lifecycle rows as needing current local evidence.
  - Select one priority objective: only the registry lifecycle evidence gap was
    selected.
  - Plan implementation: add a focused smoke script that uses existing
    operating-model HTTP routes and verifies aggregate readback plus
    cross-workspace deny behavior.
  - Execute implementation: added
    `scripts/operating-model-registry-lifecycle-smoke.mjs` and
    `npm run operating-model:registry-smoke`.
  - Verify and test: build passed; local Docker migrations, seed, and registry
    smoke passed.
  - Self-review: no operating-model runtime behavior, schema, or architecture
    contract was changed; the smoke reuses existing API routes.
  - Update documentation and knowledge: function ledger, module confidence,
    requirements, quality scenarios, risk register, project state, task board,
    system health, and next steps were updated.
- Goal: Convert operating model registry lifecycle evidence rows in
  `docs/operations/v1-function-coverage-ledger.csv` into current local proof.
- Scope:
  - existing `src/modules/operating-model/operating-model.routes.ts` behavior
  - `scripts/operating-model-registry-lifecycle-smoke.mjs`
  - `package.json`
  - `docs/operations/v1-function-coverage-ledger.csv`
  - `.agents/state/*`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Acceptance Criteria:
  - [x] Trace proves folder create/read/update/delete.
  - [x] Trace proves storage location create/read/update/delete.
  - [x] Trace proves knowledge root create/read/update/delete.
  - [x] Trace proves automation definition create/read/update/delete.
  - [x] Trace proves aggregate readback and cross-workspace deny behavior.
  - [x] Ledger and system health are updated with evidence.
- Definition of Done:
  - [x] Relevant validation command passes.
  - [x] No unrelated runtime changes are made.
  - [x] Canonical state files agree on the next task after the trace.
- Validation Evidence:
  - `npm run build`: passed.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
  - `docker compose up -d --build backend`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    npm run seed && npm run operating-model:registry-smoke"`: passed.
  - Trace summary: `v1evid-om-1778459014284`, workspace
    `736c3ec6-ab45-4a58-9f6a-627a4e9325f4`, area
    `da140d91-bfe0-410c-affa-fb20688c4210`, folder
    `39e88db5-260f-43e4-bbf7-12738a1db57b`, storage
    `2b7c0a1c-e458-4e6f-8309-a8035ce26725`, knowledge root
    `8c95d04b-610d-458c-8b9a-4f9779f2d1a8`, automation definition
    `107737b7-a273-4897-8b48-84abeac9c48f`.
  - Verified operations: `folder:create/read/update/delete`,
    `storage-location:create/read/update/delete`,
    `knowledge-root:create/read/update/delete`,
    `automation-definition:create/read/update/delete`, aggregate readback,
    deleted-resource `404` readback, and cross-workspace deny.
- Result Report:
  - Added a repeatable focused operating-model registry lifecycle smoke.
  - Confirmed registry lifecycle APIs through the existing HTTP API boundary
    and local Docker Postgres runtime.
  - Updated canonical evidence and state files.
  - Next step: V2PLAN-001 V2 Product Lane Selection.

## V2PLAN-001 V2 Product Lane Selection

- Task Type: planning
- Current Stage: planning
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: ARCHITECT
- Mission ID: V2PLAN
- Mission Status: VERIFIED
- Coverage Ledger Rows: DOCS-002, DOCS-004, SEC-003, MCP-001, MCP-002,
  CCOS-API-001, AUTO-001
- Requirement Rows: REQ-V2-001, REQ-CCOS-005
- Quality Scenario Rows: QA-V2-001, QA-CCOS-003
- Risk Rows: RISK-V2-001, RISK-CCOS-003
- Deliverable For This Stage: select one deliberate V2 lane after local V1
  evidence closure and publish the next executable task without changing
  runtime behavior.
- Process Self-Audit:
  - Analyze current state: `.codex/context/TASK_BOARD.md`,
    `docs/planning/mvp-next-commits.md`, `.agents/state/next-steps.md`,
    `.agents/state/module-confidence-ledger.md`, and
    `.codex/context/PROJECT_STATE.md` all show V1EVID-001 and V1EVID-002 as
    verified with no active local V1 evidence task remaining.
  - Select one priority objective: choose the next product lane and prevent
    broad V2 work from reopening completed V1 runtime scope.
  - Plan implementation: update delivery map, active queues, decision record,
    and planning evidence only.
  - Execute implementation: selected Agent-First Company OS as the V2 lane and
    queued V2AGENT-001 as an MCP/HTTP command-surface audit.
  - Verify and test: source-of-truth inspection and `git diff --check`.
  - Self-review: no runtime, API, schema, UI, deployment, or architecture
    ownership changes were introduced.
  - Update documentation and knowledge: delivery map, task board,
    next-commits, next steps, project state, current focus, open decisions,
    requirements, quality scenarios, risk register, and this task contract.
- Mission Block:
  - Mission objective: turn the post-V1 state into one selected V2 lane.
  - Release objective advanced: V1 remains scoped and verified locally while
    V2 starts from a command-bound agent lane.
  - Included slices: lane selection, active queue update, delivery-map update,
    requirement/risk/quality rows.
  - Explicit exclusions: no code, schema, API, UI, deployment, provider, or MCP
    runtime changes.
  - Stop conditions: any new runtime behavior or external credential-dependent
    work.
  - Handoff expectation: future agents start with V2AGENT-001.
- Goal: Choose the next deliberate V2 product lane after local V1 evidence gaps
  are closed.
- Scope:
  - `.agents/state/delivery-map.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `.agents/state/next-steps.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `docs/planning/open-decisions.md`
  - `.agents/state/requirements-verification-matrix.md`
  - `.agents/state/quality-attribute-scenarios.md`
  - `.agents/state/risk-register.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Decision:
  - Selected lane: Agent-First Company OS.
  - Rationale: the freshest local V1 proof is the policy-bound Company OS
    command path plus MCP bridge direction. The next safe expansion is to map
    existing HTTP lifecycle commands, capabilities, events, audit logs, and MCP
    manifest coverage before adding new agent behavior.
  - Deferred lanes: Operational Cockpit until command coverage is mapped;
    Provider Adapter Expansion until external credentials or a non-credential
    design slice is selected; Data Quality And Coverage remains a maintenance
    rule for every slice rather than a separate feature lane.
- Acceptance Criteria:
  - [x] One V2 lane is selected.
  - [x] Active queue no longer points at V2PLAN-001.
  - [x] Next task is a scoped analysis task, not broad implementation.
  - [x] External blockers remain separate from local V1 completion.
  - [x] Requirement, quality, and risk state files record the decision.
- Definition of Done:
  - [x] Source-of-truth docs agree on the selected V2 lane.
  - [x] No runtime behavior changed.
  - [x] The next executable task is visible in the canonical queue.
  - [x] `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` were reviewed.
- Validation Evidence:
  - Source-of-truth inspection: V1EVID-001 and V1EVID-002 are in Done; no
    active local V1 evidence tasks remain.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
  - Code/runtime validation: not applicable; planning-only task.
- Result Report:
  - Selected Agent-First Company OS as the next V2 lane.
  - Updated the delivery map and active queues.
  - Added V2 planning requirement, quality, and risk rows.
  - Next step: V2AGENT-001 Agent-First Company OS MCP Command Surface Audit.

## V2AGENT-001 Agent-First Company OS MCP Command Surface Audit

- Task Type: research/analysis
- Current Stage: analysis
- Status: DONE
- Owner: Planner
- Priority: P1
- Operation Mode: BUILDER
- Mission ID: V2AGENT
- Mission Status: VERIFIED
- Coverage Ledger Rows: MCP-001, MCP-002, CONN-001, CCOS-API-001,
  APPROVAL-001, STAGE-001, AUTO-001, AUDIT-001, SEC-003
- Deliverable For This Stage: command-surface audit that maps existing Company
  OS HTTP lifecycle commands to MCP manifest/tool coverage, capability gates,
  event/audit proof, and documentation gaps.
- Goal: Select the first safe Agent-First Company OS implementation slice
  without adding runtime behavior before the command surface is mapped.
- Scope:
  - `src/modules/company-os/company-os.routes.ts`
  - `src/modules/mcp/mcp.routes.ts`
  - `src/mcp/manifest.ts`
  - `src/auth/capabilities.ts`
  - `scripts/companycore-mcp-server.mjs`
  - `docs/API.md`
  - `docs/operations/mcp-agent-runtime-setup.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/module-confidence-ledger.md`
  - `docs/operations/v1-function-coverage-ledger.csv`
- Acceptance Criteria:
  - [x] Existing Company OS lifecycle command routes are inventoried.
  - [x] Each route is classified as MCP-exposed, HTTP-only, unsafe to expose,
    or documentation-only.
  - [x] Required capability, event, audit, and approval evidence is named.
  - [x] First implementation slice is selected only if existing evidence shows
    it can stay inside the approved HTTP policy boundary.
  - [x] No runtime behavior changes are made during the audit.
- Validation Evidence:
  - Source review covered Company OS routes, MCP manifest generation,
    capability routes, MCP bridge behavior, profile scopes, API docs, MCP
    runtime docs, API tests, and the V1 function coverage ledger.
  - Published
    `docs/operations/v2-agent-company-os-command-surface-audit.md`.
  - Found `V2AGENT-GAP-001`: `mcp_company_os_reader` is documented as
    read-only but includes approval request and decision write scopes.
- Result Report:
  - Existing Company OS lifecycle commands are already command-shaped and
    MCP-discoverable through the adapter manifest.
  - Risky tools are marked `requiresApproval` in the manifest, but the stdio
    bridge treats that as metadata and forwards calls when the key has scope.
  - First safe implementation slice is V2AGENT-002, correcting the read-only
    MCP Company OS reader profile before broader agent command work.

## V2AGENT-002 MCP Company OS Reader Least-Privilege Correction

- Task Type: fix/security
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Priority: P1
- Operation Mode: BUILDER
- Mission ID: V2AGENT
- Mission Status: VERIFIED
- Requirement Rows: REQ-MCP-001
- Quality Scenario Rows: QA-MCP-001
- Risk Rows: RISK-MCP-001
- Deliverable For This Stage: remove approval write scopes from the read-only
  MCP Company OS reader profile and verify the profile cannot see or call
  approval write tools.
- Goal: Make the documented read-only MCP Company OS reader profile actually
  read-only before broader Agent-First Company OS command work.
- Scope:
  - `src/auth/agent-key-profiles.ts`
  - `src/tests/api.test.ts`
  - `docs/operations/v2-agent-company-os-command-surface-audit.md`
  - canonical state files and planning queue
- Acceptance Criteria:
  - [x] `mcp_company_os_reader` does not include
    `company-os:approval:request`.
  - [x] `mcp_company_os_reader` does not include
    `company-os:approval:decide`.
  - [x] Profile-created reader key manifest omits approval write tools.
  - [x] Profile-created reader key direct approval request returns `403`.
  - [x] `mcp_operator` remains the supervised profile for risky command tools.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build backend`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test dist/tests/api.test.js"`: passed.
  - The API test verifies profile scopes, profile-created key scopes, MCP
    manifest filtering, direct approval request `403`, and direct approval
    decision `403`.
- Result Report:
  - Removed approval write scopes from `mcp_company_os_reader`.
  - Added regression assertions around profile scopes, MCP manifest exposure,
    and route denial.
  - Updated MCP command-surface audit, requirements, quality scenarios, risk,
    module confidence, system health, project state, and queues.
  - Next step: V2AGENT-003 Approval-Aware MCP Command Flow Design.

## V2AGENT-003 Approval-Aware MCP Command Flow Design

- Task Type: design/security
- Current Stage: planning
- Status: DONE
- Owner: Security
- Priority: P1
- Operation Mode: ARCHITECT
- Mission ID: V2AGENT
- Mission Status: VERIFIED
- Requirement Rows: REQ-MCP-002
- Risk Rows: RISK-MCP-002
- Deliverable For This Stage: design how MCP tools marked `requiresApproval`
  should be handled before unsupervised agent use.
- Goal: Prevent risky MCP command execution from relying on manifest metadata
  alone.
- Scope:
  - `src/mcp/manifest.ts`
  - `scripts/companycore-mcp-server.mjs`
  - `docs/API.md`
  - `docs/operations/companycore-mcp-bridge.md`
  - `docs/operations/mcp-agent-runtime-setup.md`
  - `docs/operations/v2-agent-company-os-command-surface-audit.md`
- Acceptance Criteria:
  - [x] Decide whether risky tools remain supervised-only or require an
    approval reference/token before forwarding.
  - [x] Define required evidence before and after risky tool calls.
  - [x] Define bridge behavior for tools with `requiresApproval`.
  - [x] Select the next implementation slice or explicitly defer runtime
    changes.
- Decision:
  - MCP tools with `requiresApproval: true` must fail closed by default in the
    stdio bridge.
  - Safe read tools continue to call the HTTP API.
  - Risky tools are supervised-only unless a future approved autonomous design
    exists.
  - The HTTP API remains the source of approval, transition, event, and audit
    truth.
- Validation Evidence:
  - Added `docs/operations/approval-aware-mcp-command-flow.md`.
  - Updated MCP bridge and runtime setup docs to point to the approved flow.
  - Updated API docs to classify `requiresApproval` tools as supervised-only
    until the bridge guard is implemented and verified.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Closed the design gap found in V2AGENT-001.
  - Added REQ-MCP-003 and QA-MCP-002 for the implementation proof.
  - Next step: V2AGENT-004 MCP Requires-Approval Bridge Guard.

## V2AGENT-004 MCP Requires-Approval Bridge Guard

- Task Type: fix/security
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder
- Priority: P1
- Operation Mode: BUILDER
- Mission ID: V2AGENT
- Mission Status: VERIFIED
- Requirement Rows: REQ-MCP-003
- Quality Scenario Rows: QA-MCP-002
- Risk Rows: RISK-MCP-002
- Deliverable For This Stage: make the stdio MCP bridge fail closed by default
  for tools whose manifest entry has `requiresApproval: true`.
- Goal: Prevent risky MCP tool calls from being forwarded just because a
  high-scope key has the route capability.
- Scope:
  - `scripts/companycore-mcp-server.mjs`
  - `scripts/companycore-mcp-smoke.mjs`
  - `docs/operations/approval-aware-mcp-command-flow.md`
  - `docs/operations/companycore-mcp-bridge.md`
  - `docs/operations/mcp-agent-runtime-setup.md`
  - relevant tests/state files
- Acceptance Criteria:
  - [x] Safe read MCP smoke still passes.
  - [x] Default risky `requiresApproval` tool call returns a structured blocked
    result without forwarding the HTTP request.
  - [x] Supervised override is explicit and documented.
  - [x] Regression evidence is recorded.
- Validation Evidence:
  - `npm run build`: passed.
  - `node scripts/companycore-mcp-server.mjs --print-config`: passed and
    reported default `commandMode: "read_only"`.
  - `docker compose up -d --build backend`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test dist/tests/api.test.js"`: passed.
  - The API test runs one safe `companycore_get_company_os` MCP smoke and one
    expected-error smoke for
    `companycore_post_company_os_stage_runs_by_id_actions_complete`, verifying
    `mcp_tool_requires_supervision` in default mode.
- Result Report:
  - Added the default fail-closed guard to the stdio MCP bridge.
  - Extended the MCP smoke harness with expected-error checks.
  - Preserved safe read calls through the HTTP API.
  - Updated state files and planning queues.
  - Next step: V2AGENT-005 Supervised Operator MCP Smoke Harness.

## V2AGENT-005 Supervised Operator MCP Smoke Harness

- Task Type: verification/security
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Operation Mode: TESTER
- Mission ID: V2AGENT
- Mission Status: VERIFIED
- Deliverable For This Stage: add or document a controlled smoke path for
  `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator`.
- Goal: Prove supervised mode deliberately forwards a controlled risky MCP
  command only under explicit operator configuration.
- Scope:
  - `scripts/companycore-mcp-smoke.mjs`
  - `src/tests/api.test.ts`
  - `docs/operations/approval-aware-mcp-command-flow.md`
  - `docs/operations/companycore-mcp-bridge.md`
  - canonical state files
- Acceptance Criteria:
  - [x] Smoke path sets `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator`
    explicitly.
  - [x] Smoke uses a controlled high-scope key and disposable Company OS data.
  - [x] Smoke proves default mode blocks the same tool.
  - [x] Smoke proves supervised mode forwards or reaches HTTP validation as
    designed.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build backend`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    node --test dist/tests/api.test.js"`: passed.
  - The Docker API test creates an `mcp_operator` key, proves default mode
    blocks
    `companycore_post_company_os_stage_runs_by_id_actions_complete` with
    `mcp_tool_requires_supervision`, then reruns the same tool with
    `COMPANYCORE_MCP_COMMAND_MODE=supervised_operator` and verifies the call
    reaches HTTP validation as `409 invalid_stage_transition` on controlled
    disposable test data.
- Result Report:
  - Extended the MCP smoke harness with expected HTTP status and response-error
    checks.
  - Added a supervised-operator MCP smoke regression to the protected API flow.
  - Preserved the default fail-closed guard for risky MCP tools.
  - Updated MCP bridge and approval-flow documentation plus canonical state
    ledgers.

## V2AGENT-006 Agent Command Queue Cockpit Slice

- Task Type: frontend
- Current Stage: verification
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: BUILDER
- Mission ID: V2AGENT
- Mission Status: VERIFIED
- Requirement Rows: REQ-V2-001, REQ-CCOS-005
- Quality Scenario Rows: QA-V2-001, QA-CCOS-003
- Risk Rows: RISK-V2-001, RISK-CCOS-003
- Deliverable For This Stage: add an agent command queue view to the existing
  Company OS cockpit using already-loaded Company OS context.
- Goal: Make the next policy-bound agent actions visible to the owner before
  adding any new autonomous command behavior.
- Scope:
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/delivery-map.md`
  - `.agents/state/system-health.md`
- Acceptance Criteria:
  - [x] Company OS cockpit shows an agent command queue derived from pending
    approvals, blocked or failed stage runs, active automation rules, and
    approval-enforcing policies.
  - [x] Queue items make the risk, current blocker, and next owner action
    scannable without introducing new backend routes.
  - [x] Existing lifecycle controls remain unchanged.
  - [x] Focused rendered check passes.
- Validation Evidence:
  - `npm run build`: passed.
  - Focused rendered check: passed with a temporary static SPA server,
    mock `/v1` Company OS endpoints, injected owner session token, and system
    Chrome `--headless=new --dump-dom --virtual-time-budget=5000`.
  - Rendered markers verified: `Company OS cockpit`, `Agent command queue`,
    `Owner-gated next actions`, `agent.proposed_action`, blocked-stage
    recovery guidance, and automation dry-run guidance.
  - Cleanup: validation-owned port `4192` was released; Docker was not
    running. Headless cleanup was attempted; Windows reported some
    `chrome-headless-shell` PIDs as not terminable because no running task
    instance existed, and a separate non-CompanyCore route-smoke parent was
    left untouched.
- Result Report:
  - Added `AgentCommandQueueItem`, `agentCommandQueue`, and
    `AgentCommandQueue` to the existing React Company OS cockpit.
  - Queue items are derived from already-loaded approvals, stage runs,
    automation rules, and policies.
  - No backend route, schema, or command behavior changed.
  - V2AGENT-006R completed the focused rendered UI proof.

## V2AGENT-006R Agent Command Queue Render Proof

- Task Type: verification
- Current Stage: verification
- Status: DONE
- Owner: QA/Test
- Priority: P1
- Operation Mode: TESTER
- Mission ID: V2AGENT
- Mission Status: VERIFIED
- Requirement Rows: REQ-V2-001
- Quality Scenario Rows: QA-V2-001
- Risk Rows: RISK-V2-001
- Deliverable For This Stage: prove `/react-company-os` renders the new agent
  command queue without relying on the timed-out Playwright harness.
- Goal: Close the rendered evidence gap left by V2AGENT-006.
- Scope:
  - temporary local validation server only
  - `docs/planning/web-console-v2-task-contracts.md`
  - canonical state files
- Acceptance Criteria:
  - [x] Render proof loads `/react-company-os`.
  - [x] Render proof injects an owner session and mock Company OS data.
  - [x] Render proof verifies the agent command queue and owner-gated action
    markers.
  - [x] No backend, schema, or production data is mutated.
- Validation Evidence:
  - System Chrome `--headless=new --dump-dom --virtual-time-budget=5000`
    against a temporary static SPA server with mock `/v1` endpoints: passed.
  - Verified markers: `Company OS cockpit`, `Agent command queue`,
    `Owner-gated next actions`, `agent.proposed_action`, blocked-stage
    recovery guidance, and automation dry-run guidance.
  - Cleanup: temporary script, Chrome profile, static server, checked ports
    `4193..4195`, checked Docker, and checked `chrome-headless-shell`.
- Result Report:
  - Replaced the failing Playwright proof path with a deterministic Chrome
    dump-DOM proof for this focused signed-in UI state.
  - V2AGENT-006 is now verified.

## UXA-021 React Areas Relationship Data Hook

- Task Type: frontend
- Current Stage: done
- Status: DONE
- Owner: Frontend Builder
- Priority: P1
- Operation Mode: TESTER
- Deliverable For This Stage: `/react-areas` loads existing provider mapping
  and Google Drive file data through the React route kit, then exposes real
  mapping counts and review queues without adding backend APIs.
- Process Self-Audit:
  - Analyze current state: UXA-020 confirmed existing
    `/v1/operating-model/external-mappings` and `/v1/google-drive/files`
    routes are the approved data contracts.
  - Select exactly one priority task: UXA-021 only.
  - Plan implementation: add typed React loaders/state, enrich area rows and
    signals, and keep canonical `/areas` plus `/relationships` unchanged.
  - Execute implementation: added typed route-kit loaders/state and enriched
    `/react-areas` with real relationship evidence.
  - Verify and test: build, Docker rebuild/seed, focused rendered checks, and
    diff check passed.
  - Self-review: no backend route, schema, or canonical route switch was mixed
    into this frontend slice.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, and this contract updated.
- Goal: Move `/react-areas` closer to canonical area parity by showing real
  provider mapping and Drive ownership evidence from existing API contracts.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add typed `ExternalContainerMapping` and `GoogleDriveFileRecord` loaders
    that call the existing endpoints with the owner session token.
  - Load connection, external mappings, and Drive files in parallel inside
    `useAreasWorkbenchState`.
  - Enrich area rows with provider mapping counts, Drive folder/file counts,
    unmapped provider counts, and unmapped Drive counts.
  - Add compact review queues to `/react-areas` that link back to current
    canonical owner action routes.
  - Preserve canonical vanilla routes and avoid backend changes.
- Acceptance Criteria:
  - [x] `/react-areas` state uses existing external mapping and Drive file
    endpoints.
  - [x] Area metrics include real provider mapping and Drive file/folder counts.
  - [x] `/react-areas` shows provider and Drive review queues from live API
    data.
  - [x] No backend route or schema is added.
  - [x] Build and focused rendered checks pass.
- Definition of Done:
  - `npm run build` passes.
  - Focused `/react-areas` rendered check passes for signed-out and signed-in
    paths.
  - Desktop and mobile checks have no horizontal overflow.
  - `git diff --check` passes.
  - Source-of-truth planning/state files are updated.
- Validation Evidence:
  - `npm run build`: passed.
  - `docker compose up -d --build`: passed.
  - `docker compose exec -T backend sh -lc "npm run prisma:migrate:deploy &&
    npm run seed"`: passed.
  - Focused Playwright route check: passed for signed-out `/react-areas`,
    signed-in `/react-areas`, provider/Drive signals, provider/Drive review
    queues, 12 area rows, desktop/mobile no horizontal overflow, and zero
    console errors.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Added typed React route-kit loaders for
    `/v1/operating-model/external-mappings` and `/v1/google-drive/files`.
  - `useAreasWorkbenchState` now loads connection, external mappings, and
    Drive files in parallel.
  - `/react-areas` now shows real provider mapping counts, Drive item counts,
    relationship review signal cards, and provider/Drive queues for records
    missing operating-area ownership.
  - Preserved backend contracts and canonical vanilla owner action routes.
  - Next step: UXA-022 React Areas Canonical Switch Decision.


## UXA-020 React Areas Data Contract Gap Decision

- Task Type: architecture/frontend-decision
- Current Stage: done
- Deliverable For This Stage: decision on whether `/react-areas` needs a new
  backend read API before parity work continues.
- Goal: Avoid inventing a duplicate backend contract if existing
  operating-model and Drive endpoints already expose the mapping data needed
  for React areas parity.
- Scope:
  - `public/app.js`
  - `src/modules/operating-model/operating-model.routes.ts`
  - `src/modules/google-drive/google-drive.routes.ts`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Decision:
  - Do not create a new dedicated React areas read API yet.
  - Existing backend contracts already expose the required read surfaces:
    `/v1/operating-model/external-mappings` for provider mappings and
    `/v1/google-drive/files` for Drive file/folder ownership.
  - The current gap is frontend data composition: `/react-areas` loads
    `/v1/connection` only, while the vanilla `/areas` and `/relationships`
    surfaces also load operating-model mappings and Drive files.
  - The next implementation slice should add route-kit loaders/state for
    external mappings and Drive files, then enrich `/react-areas` with real
    mapping counts and review queues.
- Implementation Plan:
  - Inspect vanilla data flow for mapping and Drive ownership signals.
  - Confirm existing backend routes and capabilities cover read needs.
  - Record a no-new-API decision.
  - Queue a small frontend implementation slice that reuses existing routes.
- Acceptance Criteria:
  - [x] Decision states whether a new API is approved.
  - [x] Existing endpoint reuse path is named.
  - [x] Next task has a concrete implementation scope.
  - [x] No backend route is added in this decision task.
- Validation Evidence:
  - Source review:
    - `public/app.js` loads `/v1/operating-model`, `/v1/google-drive/files`,
      and uses `externalMappings` plus Drive folders for relationships and
      area context.
    - `src/modules/operating-model/operating-model.routes.ts` exposes
      `GET /v1/operating-model/external-mappings`.
    - Existing tests and API docs already reference operating-model and Drive
      scope routes.
  - `git diff --check`: passed with LF/CRLF normalization warnings only.
- Result Report:
  - Decision: no new backend read API for React areas yet.
  - Reason: existing operating-model and Google Drive read endpoints are the
    correct source of truth.
  - Next step: UXA-021 React Areas Relationship Data Hook.

## UXA-016 React Route Shell Extraction

- Task Type: refactor/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: shared React route kit for existing parallel
  React workbenches without changing route behavior.
- Process Self-Audit:
  - Analyze current state: `web/src/main.tsx` owned route-specific logic plus
    shared connection types, API loaders, route state hooks, shell, notices,
    metric cards, and data table primitives.
  - Select exactly one priority task: UXA-016 only.
  - Plan implementation: extract shared code into a reusable module and keep
    current route rendering intact.
  - Execute implementation: added `web/src/react-route-kit.tsx` and delegated
    existing route helpers/primitives from `main.tsx`.
  - Verify and test: `npm run build` passed; targeted Playwright signed-out
    route smoke passed against Vite base `/react`.
  - Self-review: no route switch, UX redesign, or new workbench was mixed into
    this refactor.
  - Update documentation and knowledge: task board, next commits, next steps,
    project state, and this contract updated.
- Goal: Reduce `web/src/main.tsx` growth before adding another React
  workbench, so future Company OS and agent-facing screens can reuse the same
  route state and shell primitives.
- Scope:
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
- Implementation Plan:
  - Add a shared React route kit for connection/task types, API loaders, route
    state hooks, provider metrics, shell, notices, metric cards, and data
    table primitive.
  - Delegate existing `main.tsx` shared helpers to the route kit.
  - Preserve `/react-dashboard`, `/react-tasks`, and `/react-integrations`
    behavior.
  - Run the React build gate and diff check.
- Acceptance Criteria:
  - Shared React route helpers exist outside `main.tsx`.
  - Existing React routes still build.
  - No canonical route is switched.
  - No new workbench behavior is introduced.
- Definition of Done:
  - `npm run build` passes.
  - Targeted signed-out React route smoke passes.
  - `git diff --check` passes.
  - Source-of-truth planning/state files are updated.
- Result Report:
  - Added `web/src/react-route-kit.tsx`.
  - Delegated dashboard/tasks/integrations state hooks, connection metrics,
    provider status, company-area filtering, shell, local notice, data table,
    and metric card primitives from `main.tsx`.
  - Preserved existing React routes and visual behavior.
  - `npm run build` passed.
  - Targeted Playwright signed-out smoke passed for `/react-dashboard`,
    `/react-tasks`, and `/react-integrations` through Vite dev server base
    `/react`.

## UXA-015 React Canonical Route Switch Readiness

- Task Type: planning/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: canonical route switch readiness decision after
  two parallel React workbench migrations.
- Process Self-Audit:
  - Analyze current state: `/react-tasks` and `/react-integrations` are live
    and validated as parallel React workbenches; canonical vanilla routes still
    own full setup/editor affordances.
  - Select exactly one priority task: UXA-015 only.
  - Plan implementation: compare React route parity against canonical route
    responsibilities and choose the next safe migration step.
  - Execute implementation: recorded the decision and activated UXA-016.
  - Verify and test: documentation consistency and source-of-truth queue
    alignment are the validation surface for this planning task.
  - Self-review: confirmed that switching canonical routes now would trade
    proven setup/editor depth for visual polish before parity is complete.
  - Update documentation and knowledge: task board, next commits, next steps,
    project state, and this contract updated.
- Goal: Decide whether CompanyCore can safely point a canonical route to React
  now, or whether the React migration needs a shared-shell refactor first.
- Scope:
  - `docs/planning/web-console-v2-task-contracts.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
- Implementation Plan:
  - Review UXA-012 and UXA-014 evidence.
  - Compare React read/orientation parity with canonical route setup/editor
    responsibilities.
  - Record route-switch decision and activate the next safe task.
- Acceptance Criteria:
  - Decision is explicit and testable.
  - Decision explains why a canonical route is or is not switched now.
  - Next executable task is activated in canonical queue files.
- Definition of Done:
  - Planning/state files agree on the decision and next task.
  - `git diff --check` passes.
- Result Report:
  - Decision: do not switch a canonical route to React yet.
  - Rationale: `/react-tasks` and `/react-integrations` prove the React
    read/orientation workbench pattern, but the vanilla canonical routes still
    own broader setup/editor affordances. Switching now would be premature.
  - Next task: UXA-016 React Route Shell Extraction, to reduce
    `web/src/main.tsx` growth and prepare cleaner future migrations.

## UXA-014 React Integration Map Workbench Route

- Task Type: frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: a parallel React integration map workbench route
  that uses live `/v1/connection` data, the `companycore` DaisyUI theme,
  Phosphor icons, local states, metrics, filters, and reusable table/list
  primitives while preserving `/settings/integrations`.
- Process Self-Audit:
  - Analyze current state: `/react-dashboard` and `/react-tasks` are live
    parallel React routes; `/settings/integrations` remains the canonical
    vanilla integration map.
  - Select exactly one priority task: UXA-014 only.
  - Plan implementation: add one parallel route, reuse `/v1/connection`, and
    avoid replacing canonical routes in this slice.
  - Execute implementation: added `/react-integrations`, provider/data-path
    cards, readiness notice, metrics, filters, and operating-area coverage
    table.
  - Verify and test: build/validate, Browser route check, signed-in rendered
    desktop/mobile checks, owner-console smoke, and container integration test
    passed.
  - Self-review: confirmed existing `/settings/integrations` and backend API
    contracts remain unchanged.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, design memory, and this contract updated.
- Goal: Give owners a clearer React-based integration map that explains
  provider readiness, implemented data paths, and operating-area coverage.
- Scope:
  - `src/app.ts`
  - `web/src/main.tsx`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Serve the React SPA for `/react-integrations`.
  - Route React by pathname so existing React dashboard/tasks stay intact.
  - Load live `/v1/connection` data from the owner session.
  - Render provider readiness, implemented data groups, and operating-area
    coverage using shared DaisyUI primitives.
  - Add search and type filters for operating-area integration coverage rows.
  - Keep canonical setup actions linked to `/settings/integrations`,
    `/settings`, `/settings/drive`, `/settings/api`, and `/areas`.
- Acceptance Criteria:
  - `/react-integrations` renders from the React build and uses
    `data-theme="companycore"`.
  - Signed-in users see live workspace, integration, capability, and operating
    model signals from `/v1/connection`.
  - Signed-out, loading, empty, error, and success/readiness states are local
    and explicit.
  - Search and type filters update operating-area rows without a page reload.
  - Desktop and mobile layouts have no document-level horizontal overflow.
  - Existing `/settings/integrations` behavior remains available.
- Definition of Done:
  - `npm run build` and `npm run validate` pass.
  - Targeted desktop/mobile rendered checks verify `/react-integrations`.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Container-scoped Prisma migration and Node integration test pass.
  - `git diff --check` passes.
- Result Report:
  - Added `/react-integrations` as a parallel React route served by the
    existing React build.
  - Loaded live `/v1/connection` data from the owner session.
  - Added integration readiness guidance with local action placement.
  - Added provider/data-path cards for ClickUp tasks, Google Drive files,
    agent-safe API, and the operating model.
  - Added operating-area coverage filters and a reusable `DataTable` view for
    12 company areas, excluding only the `main-general` fallback from the
    company-area table.
  - Preserved `/settings/integrations` as the canonical vanilla integration
    map.
  - Validation passed: `npm run build`, `npm run validate`, `git diff --check`,
    Browser signed-out route check, targeted signed-in desktop/mobile rendered
    checks, `npm run owner-console:ux-smoke` against isolated
    `http://localhost:3008`, and container-scoped Prisma migration plus Node
    integration test.
  - Rendered evidence: `/react-integrations` title is `CompanyCore React
    Integrations`, `data-theme="companycore"` is applied, signed-in
    desktop/mobile checks showed 4 integration/data groups, 1 table, 12
    operating-area rows, search empty/recovery behavior, no document-level
    horizontal overflow, and zero targeted console issues.

## UXA-013 React Workbench Canonical Route Decision

- Task Type: planning/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: canonical route decision for the React task
  workbench migration after UXA-012.
- Process Self-Audit:
  - Analyze current state: `/react-tasks` is live and validated as a parallel
    React read/filter workbench; `/tasks-adapter` remains the canonical vanilla
    task adapter route.
  - Select exactly one priority task: UXA-013 only.
  - Plan implementation: compare route parity and choose whether to switch the
    canonical route or keep a parallel route.
  - Execute implementation: recorded the route strategy decision and activated
    the next migration slice.
  - Verify and test: documentation consistency and source-of-truth queue
    alignment are the validation surface for this decision task.
  - Self-review: confirmed that switching `/tasks-adapter` now would remove
    canonical adapter affordances before a second React workbench proves the
    migration pattern.
  - Update documentation and knowledge: task board, next commits, next steps,
    project state, and this contract updated.
- Goal: Avoid a premature canonical route switch while keeping React migration
  moving through evidence-backed workbench slices.
- Scope:
  - `docs/planning/web-console-v2-task-contracts.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
- Implementation Plan:
  - Review UXA-012 evidence and the current `/tasks-adapter` role.
  - Decide whether `/react-tasks` should replace `/tasks-adapter` now.
  - Record the decision and activate the next route migration.
- Acceptance Criteria:
  - Route decision is explicit.
  - Decision explains why the canonical route is or is not switched now.
  - Next executable React workbench migration is activated.
- Definition of Done:
  - Planning/state files agree on the decision and next task.
  - `git diff --check` passes.
- Result Report:
  - Decision: keep `/react-tasks` as a parallel React workbench for now.
  - Rationale: UXA-012 proved the React table/filter pattern with live
    `/v1/tasks` data, but `/tasks-adapter` still carries the canonical adapter
    context and should not be replaced until another React workbench proves
    route-level parity and the route-switch pattern is less risky.
  - Next task: UXA-014 React Integration Map Workbench Route.

## UXA-012 React Workbench Route Migration

- Task Type: frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: a parallel React task workbench route that uses
  the approved React shell, DaisyUI theme, local notification, metric, filter,
  and table primitives with live `/v1/tasks` data while preserving the current
  vanilla `/tasks-adapter` and `/data/tasks` routes.
- Process Self-Audit:
  - Analyze current state: UXA-011 delivered reusable React/DaisyUI table and
    local-notification primitives on `/react-dashboard`; the canonical task
    workbench still lives in the vanilla owner console.
  - Select exactly one priority task: UXA-012 only.
  - Plan implementation: add one parallel React workbench route and reuse the
    existing task API instead of changing backend contracts.
  - Execute implementation: added `/react-tasks`, live task loading, filters,
    metrics, table rendering, and links to the existing canonical editors.
  - Verify and test: build/validate, Browser signed-out check, targeted
    signed-in desktop/mobile rendered checks, owner-console smoke, and
    container-scoped integration test passed.
  - Self-review: confirmed backend contracts and vanilla task routes remain
    unchanged.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, design memory, and this contract updated.
- Goal: Move the React migration from dashboard proof-of-value into a real
  workbench surface that helps an owner inspect company tasks quickly.
- Scope:
  - `src/app.ts`
  - `web/src/main.tsx`
  - `web/src/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Serve the React SPA for `/react-tasks` without changing existing vanilla
    routes.
  - Route the React entry by `window.location.pathname` so `/react-dashboard`
    stays intact and `/react-tasks` renders a workbench.
  - Load `/v1/connection` and `/v1/tasks` in parallel from the owner session.
  - Reuse the shared shell, local notice, metric-card, and table primitives.
  - Add task-specific search, status, source, and list filters.
  - Keep editing actions linked to the existing typed task editor at
    `/data/tasks` and adapter fallback at `/tasks-adapter`.
- Acceptance Criteria:
  - `/react-tasks` renders from the React build and uses the `companycore`
    DaisyUI theme.
  - Signed-in users see live task rows from `/v1/tasks`.
  - Signed-out, loading, empty, error, and success states are explicit and
    local to the workbench surface.
  - Search and select filters update visible rows without a page reload.
  - Desktop and mobile layouts have no document-level horizontal overflow.
  - Existing `/dashboard`, `/react-dashboard`, `/tasks-adapter`, and
    `/data/tasks` behavior remains available.
- Definition of Done:
  - `npm run build` and `npm run validate` pass.
  - Targeted desktop/mobile rendered checks verify `/react-tasks`.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Container-scoped Prisma migration and Node integration test pass.
  - `git diff --check` passes.
- Result Report:
  - Added `/react-tasks` as a parallel React workbench route served by the
    existing React build without changing `/tasks-adapter` or `/data/tasks`.
  - Routed the React entry by `window.location.pathname` so `/react-dashboard`
    remains the dashboard and `/react-tasks` renders the task workbench.
  - Loaded `/v1/connection` and `/v1/tasks` in parallel from the owner session.
  - Reused shared `Shell`, `LocalNotice`, `MetricCard`, and `DataTable`
    primitives for the task route.
  - Added task search plus status, source, and list filters.
  - Added task metrics for total, open, ClickUp, due-soon, and list groups.
  - Kept create/edit actions linked to `/data/tasks` and adapter fallback
    linked to `/tasks-adapter`.
  - Validation passed: `npm run build`, `npm run validate`, `git diff --check`,
    Browser signed-out route check with no console errors, targeted
    desktop/mobile signed-in rendered checks, `npm run owner-console:ux-smoke`
    against isolated `http://localhost:3007`, and container-scoped Prisma
    migration plus Node integration test.
  - Rendered evidence: `/react-tasks` title is `CompanyCore React Tasks`,
    `data-theme="companycore"` is applied, signed-in desktop/mobile checks
    showed 1 live task row after creating an isolated test record through
    `/v1/tasks`, search empty state appeared for a non-matching query, search
    recovered the row for `verification`, and no document-level horizontal
    overflow or targeted console issues were detected.

## UXA-011 React Table And Notification Primitive Migration

- Task Type: architecture/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: reusable React/DaisyUI local notification and
  table primitives rendered on `/react-dashboard` with live operating-model
  preview data, while preserving existing vanilla routes.
- Process Self-Audit:
  - Analyze current state: UXA-010 added the `companycore` DaisyUI theme and
    reusable React dashboard primitives.
  - Select exactly one priority task: UXA-011 only.
  - Plan implementation: add primitives that can be reused by future workbench
    migrations before moving a full vanilla route.
  - Execute implementation: added reusable `LocalNotice`, generic `DataTable`,
    live operating-model preview rows, and a React build-output cleaner.
  - Verify and test: build/validate, rendered React checks, owner-console
    smoke, and container integration test passed.
  - Self-review: confirmed existing vanilla routes and backend APIs remain
    unchanged.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, design memory, and learning journal updated.
- Goal: Prepare the React migration path for dense workbench screens by
  establishing reusable table and local notification primitives.
- Scope:
  - `package.json`
  - `Dockerfile`
  - `scripts/clean-react-build.mjs`
  - `web/src/main.tsx`
  - `web/src/styles.css`
  - `.codex/context/LEARNING_JOURNAL.md`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Add a reusable local notification primitive with `info`, `success`,
    `warning`, and `error` tones.
  - Add a generic reusable table primitive with columns, rows, empty state, and
    optional row actions.
  - Render operating-area/table preview rows from `/v1/connection` data.
  - Keep copy focused on company management: ownership, source, table count,
    and next action.
  - Preserve existing `/dashboard` and backend behavior.
- Acceptance Criteria:
  - `/react-dashboard` shows reusable local notification primitives.
  - `/react-dashboard` shows a reusable DaisyUI table fed by live operating
    model data.
  - Empty/error states are represented by the same primitives.
  - Desktop and mobile layouts have no horizontal overflow.
  - Existing owner-console smoke continues to pass.
- Definition of Done:
  - `npm run build` and `npm run validate` pass.
  - Targeted desktop/mobile rendered checks verify table and notification
    primitives.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Container-scoped Prisma migration and Node integration test pass.
  - `git diff --check` passes.
- Result Report:
  - Added reusable React/DaisyUI `LocalNotice` with info, success, warning, and
    error tones.
  - Added generic reusable `DataTable` with column definitions, rows, empty
    state, and internal horizontal scrolling for mobile safety.
  - Rendered live operating-area/table preview rows from `/v1/connection`.
  - Reused the table primitive for the React migration readiness ledger.
  - Added `scripts/clean-react-build.mjs` and wired `build:web` to clean
    generated `public/react/` output before Vite builds.
  - Updated Docker build stage to copy `scripts/` before `npm run build`.
  - Validation passed: `npm run build`, `npm run validate`, `git diff --check`,
    targeted desktop/mobile rendered React checks, `npm run owner-console:ux-smoke`,
    and container-scoped Prisma migration plus Node integration test.
  - Rendered evidence: `/react-dashboard` showed 2 local notices, 1 table
    primitive, 6 live table rows, `companycore` theme, no desktop/mobile
    horizontal overflow, and zero targeted console issues.

## UXA-010 React Dashboard Component Migration

- Task Type: architecture/frontend
- Current Stage: done
- Operation Mode: ARCHITECT
- Deliverable For This Stage: a React dashboard command surface that uses the
  approved Tailwind + DaisyUI theme foundation, reusable dashboard primitives,
  live owner-session connection loading, and clear loading/empty/error/success
  states on `/react-dashboard` while preserving the existing `/dashboard`.
- Process Self-Audit:
  - Analyze current state: UXA-009 added the React/Vite/Tailwind/DaisyUI
    foundation and `/react-dashboard` proof route.
  - Select exactly one priority task: UXA-010 only.
  - Plan implementation: build reusable dashboard components and theme tokens
    first, then wire the route to live `/v1/connection` data.
  - Execute implementation: added a `companycore` DaisyUI theme, reusable
    React dashboard primitives, and live `/v1/connection` loading.
  - Verify and test: build/validate, rendered React route checks, existing
    owner-console smoke, and container integration tests passed.
  - Self-review: confirmed the existing vanilla `/dashboard` and backend API
    behavior remain unchanged.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, and design memory updated.
- Goal: Start the real dashboard migration by turning the framework proof route
  into a reusable, theme-backed management dashboard surface.
- Scope:
  - `web/src/main.tsx`
  - `web/src/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Define a `companycore` DaisyUI theme and apply it to the React route.
  - Split the React route into dashboard primitives: shell, status alert,
    command panel, attention queue, readiness metrics, module launcher, and
    migration table.
  - Load owner connection data from `sessionStorage` token via `/v1/connection`.
  - Render no-session, loading, error, and connected states with local recovery
    actions.
  - Preserve the current vanilla `/dashboard` route during this slice.
- Acceptance Criteria:
  - `/react-dashboard` uses the custom DaisyUI theme and Tailwind tokens.
  - React dashboard primitives render from structured data instead of one
    monolithic component.
  - Signed-in users see live workspace/integration/operating-area signals from
    `/v1/connection`.
  - Signed-out, loading, error, and connected states are explicit and local to
    the dashboard action area.
  - Existing `/dashboard` and owner-console smoke continue to pass.
- Definition of Done:
  - `npm run build` and `npm run validate` pass.
  - Targeted desktop/mobile rendered checks verify `/react-dashboard`.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Container-scoped Prisma migration and Node integration test pass.
  - `git diff --check` passes.
- Result Report:
  - Added a custom DaisyUI `companycore` theme with CompanyCore colors,
    radius, and low-noise light surface behavior.
  - Replaced the single React proof component with reusable dashboard
    primitives: shell, state panel, command panel, metric cards, attention
    queue, module launcher, and migration table.
  - Wired `/react-dashboard` to live owner-session data from `/v1/connection`
    using `companycoreOwnerToken` from `sessionStorage`.
  - Added explicit signed-out, loading, error, and connected states.
  - Preserved the existing vanilla `/dashboard` route and owner-console smoke
    contract.
  - Validation passed: `npm run build`, `npm run validate`, `git diff --check`,
    targeted desktop/mobile rendered React checks, `npm run owner-console:ux-smoke`,
    and container-scoped Prisma migration plus Node integration test.
  - Rendered evidence: `/react-dashboard` title is `CompanyCore React
    Dashboard`, `data-theme="companycore"` is applied, desktop/mobile show live
    `LuckySparrow` workspace data, 4 module links, 4 migration table rows, 13
    Phosphor icons, no horizontal overflow, and zero targeted console issues.

## UXA-009 React Tailwind DaisyUI Migration Foundation

- Task Type: architecture/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: a small migration foundation that introduces a
  React + Vite + Tailwind + DaisyUI frontend shell without changing backend,
  auth, database, provider, or production deployment behavior beyond serving
  the built frontend assets.
- Process Self-Audit:
  - Analyze current state: UXA-008 confirmed the current web console is a
    vanilla static frontend served from `public/`.
  - Select exactly one priority task: UXA-009 only after UXA-008 closure.
  - Plan implementation: introduce the framework foundation as a reversible
    frontend architecture slice before migrating every route.
  - Execute implementation: added React/Vite/Tailwind/DaisyUI build files,
    route serving, Docker build integration, and a framework-backed route.
  - Verify and test: build/validate, Browser route load, targeted
    desktop/mobile React checks, owner-console smoke, and integration test.
  - Self-review: confirmed backend API/auth/provider/database behavior was not
    changed and generated `public/react/` assets are ignored.
  - Update documentation and knowledge: tech stack, design-system contract,
    planning/state files, and learning journal.
- Goal: Prepare CompanyCore for reusable dashboard, table, notification,
  filter, shell, and workbench components through an explicit frontend
  framework foundation.
- Scope:
  - `package.json`
  - `package-lock.json`
  - `vite.config.*`
  - `tailwind.config.*`
  - `postcss.config.*`
  - `src/web/*` or an approved equivalent frontend source directory
  - `public/` serving boundary if needed
  - `Dockerfile` only if frontend build output must be copied differently
  - `docs/architecture/tech-stack.md`
  - `docs/ux/design-system-contract.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/*`
- Implementation Plan:
  - Add React + Vite + Tailwind + DaisyUI dependencies and config.
  - Preserve the backend Express API and auth model.
  - Keep existing routes usable while establishing the new component shell.
  - Start with shared primitives for app shell, buttons, alert/toast feedback,
    module links, dashboard panels, and table foundations.
  - Validate build, static serving, owner-console smoke, and no regression in
    login/dashboard navigation.
- Acceptance Criteria:
  - The project has an explicit React/Vite frontend build path.
  - Tailwind and DaisyUI are configured through project-level config files.
  - The app can still serve the owner console through the backend.
  - At least one private route proves the new framework shell/component path
    without breaking existing owner workflows.
  - UX docs explain how DaisyUI components should be wrapped/reused instead of
    scattered as page-local classes.
- Definition of Done:
  - `npm run build` and `npm run validate` pass.
  - Relevant frontend build command passes.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Targeted rendered checks prove login/dashboard still load and at least one
    React component path renders.
  - `git diff --check` passes.
- Result Report:
  - Added React, React DOM, Vite, Tailwind CSS, DaisyUI, and React type
    dependencies.
  - Added `web/` as the React source root and Vite output to generated,
    ignored `public/react/` assets.
  - Added `/react-dashboard` as a backend-served framework foundation route.
  - Updated Docker build to generate and copy built React assets from the
    build stage.
  - Added a DaisyUI-backed React proof route with app shell, local alert,
    stats, steps, badges, and table primitives.
  - Validation passed: `npm run build`, `npm run validate`, `git diff --check`,
    Browser route load with no console errors, targeted desktop/mobile React
    route checks, `npm run owner-console:ux-smoke`, and container-scoped Prisma
    migration plus Node integration test.
  - React rendered evidence: owner session detected on desktop/mobile,
    DaisyUI primary button and success alert rendered, 3 table rows rendered,
    no horizontal overflow, and targeted console issues were empty.

## UXA-008 Dashboard Iconography And UX Governance

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: local Phosphor icon assets, dashboard icon
  treatment, and canonical CompanyCore management-UI rules that help owners
  understand their company structure, blockers, and next action quickly.
- Process Self-Audit:
  - Analyze current state: confirmed the web console is a vanilla static
    frontend and that Tailwind/DaisyUI are not installed in `package.json`.
  - Select exactly one priority task: UXA-008 only.
  - Plan implementation: add Phosphor locally, reuse existing dashboard panels
    and layout primitives, and document the canonical icon/component strategy.
  - Execute implementation: scoped to dashboard iconography, local asset
    wiring, and UX source-of-truth updates.
  - Verify and test: build/validate, rendered dashboard checks, responsive
    screenshots, and owner-console smoke against an isolated local runtime.
  - Self-review: confirm no runtime architecture, auth, API, database, or
    provider behavior changed.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, and reusable UX memory.
- Goal: Make the dashboard more intuitive as a company-management command
  surface by using consistent operational icons and by documenting the UI rules
  future work must follow.
- Scope:
  - `package.json`
  - `package-lock.json`
  - `public/index.html`
  - `public/styles.css`
  - `public/app.js`
  - `public/vendor/phosphor/bold/*`
  - `docs/ux/design-system-contract.md`
  - `docs/ux/visual-direction-brief.md`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Add `@phosphor-icons/web` and vendor the bold webfont/CSS into `public/`
    so the dashboard does not depend on a CDN.
  - Link the local Phosphor stylesheet before the app stylesheet.
  - Add icon containers to dashboard readiness evidence, operational steps,
    attention rows, and module-launch links using management-specific
    metaphors.
  - Keep existing panel/layout architecture and responsive behavior.
  - Document canonical CompanyCore UI principles, including when DaisyUI or a
    Tailwind migration would require an explicit architecture decision.
- Acceptance Criteria:
  - Dashboard uses consistent Phosphor icons to clarify integrations,
    relationships, execution, data, and module destinations.
  - Icons are decorative where text already names the action, with accessible
    labels preserved in visible text.
  - Responsive dashboard layouts remain stable on desktop and mobile.
  - UX docs define management-first visual hierarchy, icon rules, component
    reuse rules, and DaisyUI/Tailwind decision boundaries.
- Definition of Done:
  - `npm run build` and `npm run validate` pass.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Targeted rendered checks prove local Phosphor font loading, visible
    dashboard icon coverage, desktop/mobile stability, and no console errors.
  - `git diff --check` passes.
- Result Report:
  - Added `@phosphor-icons/web` and vendored the local bold Phosphor webfont
    and stylesheet under `public/vendor/phosphor/bold/`.
  - Linked the local Phosphor stylesheet before the app stylesheet.
  - Added icon containers to dashboard readiness evidence, operational steps,
    attention rows, and module-launch destinations.
  - Documented CompanyCore's management-first UX rules, Phosphor iconography
    rules, and the Tailwind/DaisyUI architecture boundary.
  - Validation passed: `npm run build`, `npm run validate`, `git diff --check`,
    targeted desktop/mobile rendered checks, `npm run owner-console:ux-smoke`
    against isolated `http://localhost:3000`, and container-scoped Prisma
    migration plus Node integration test.
  - Rendered evidence: Phosphor font loaded on desktop/mobile, dashboard showed
    20 Phosphor icons on desktop, mobile showed no horizontal overflow, and
    console issues were empty in targeted checks.

## UXA-007 Mobile Private Header Compression

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: private mobile routes start with a compact
  command header that preserves drawer navigation, current-route identity, and
  sign-out access while giving the first viewport back to route content.
- Process Self-Audit:
  - Analyze current state: reviewed mobile owner-console screenshots from
    UXA-006 and existing topbar/sidebar implementation.
  - Select exactly one priority task: UXA-007 only.
  - Plan implementation: reuse the existing drawer and topbar; make mobile CSS
    reduce topbar density instead of adding a new navigation system.
  - Execute implementation: scoped to shared private-shell CSS plus queue/state
    docs.
  - Verify and test: syntax/build, desktop preservation, mobile screenshot
    smoke, private-route smoke, and no horizontal overflow.
  - Self-review: confirm no auth, API, route, data, or architecture behavior
    changed.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, and design memory if the pattern should be reused.
- Goal: Make mobile private routes feel more action-first by reducing repeated
  header controls that push page content down.
- Scope:
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - On mobile private routes, keep the topbar to Menu, route identity, and
    Sign out.
  - Hide the module search and Account/API quick links on mobile because the
    drawer already carries route navigation.
  - Preserve desktop/tablet topbar behavior.
  - Validate mobile dashboard/settings first viewport and the owner-console UX
    smoke.
- Acceptance Criteria:
  - Mobile private topbar is one compact row.
  - Mobile users can still open the drawer and sign out.
  - Desktop/tablet topbar behavior is unchanged.
  - Mobile route content starts materially earlier, with no horizontal
    overflow or text overlap.
- Definition of Done:
  - `npm run build` and `npm run validate` pass.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Targeted Playwright screenshots prove mobile dashboard/settings header
    compression and desktop dashboard preservation.
  - `git diff --check` passes.
- Result Report:
  - Compressed the authenticated mobile topbar to Menu, route identity, and
    Sign out.
  - Hid mobile module search and Account/API quick links because the drawer
    already provides route navigation.
  - Preserved desktop/tablet module search and Account/API actions.
  - Verified mobile topbar height at `70px`, no mobile horizontal overflow,
    drawer transform at `matrix(1, 0, 0, 1, 0, 0)` after opening, and desktop
    module switcher display as `block`.
  - Validation passed: `npm run build`, `npm run validate`, targeted
    Playwright screenshots, `npm run owner-console:ux-smoke` against isolated
    `http://localhost:3006`, and container-scoped Prisma migration plus Node
    integration test.

## UXA-001 CompanyCore V1 UX/UI Audit

- Task Type: design/research
- Current Stage: verification
- Deliverable For This Stage: evidence-driven UX/UI audit and implementation
  plan for owner-console polish.
- Goal: Evaluate CompanyCore v1 from the owner's point of view and translate
  the findings into a small implementation queue.
- Scope:
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
- Implementation Plan:
  - Review project UX contracts, design memory, scorecard, screen checklist,
    and anti-patterns.
  - Inspect public/auth routes in the Browser plugin on production.
  - Start a local Docker runtime on a non-production port and inspect seeded
    authenticated API state.
  - Audit private screens from source, local API state, and existing UX
    patterns when authenticated Browser entry is blocked.
  - Publish a prioritized UX implementation queue.
- Acceptance Criteria:
  - Audit identifies current strengths, user-facing problems, severity, and
    implementation slices.
  - Audit includes production/browser evidence and local runtime evidence.
  - Authenticated screenshot limitation is recorded honestly instead of hidden.
  - Canonical queue files point at the first executable UX slice.
- Definition of Done:
  - `git diff --check` passes.
  - Browser evidence covers public entry, login, register, and mobile auth.
  - Local runtime health and seeded authenticated API state are recorded.
  - Project state, task board, next-commits, and agent state are updated.
- Result Report:
  - Added `docs/ux/companycore-v1-ux-ui-audit.md`.
  - Scored the current owner console average at `3.42/5`.
  - Identified P0 issues in dashboard command focus and mobile auth action
    order.
  - Queued the next implementation wave as `UXA-002..UXA-006`.
  - Browser could not complete authenticated private-route clickthrough because
    this Browser runtime failed typing into `input[type=email]` and blocked
    `javascript:` session injection; the next task explicitly creates an
    approved authenticated evidence path.

## UXA-002 Authenticated Private Route UX Evidence Harness

- Task Type: qa/design-tooling
- Current Stage: done
- Deliverable For This Stage: approved local authenticated screenshot and
  interaction smoke for private owner-console UX review.
- Goal: Unblock evidence-driven private-route polish without production writes
  or Browser security-policy bypasses.
- Scope:
  - `scripts/owner-console-ux-smoke.mjs`
  - `package.json`
  - `package-lock.json`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `.agents/state/known-issues.md`
- Implementation Plan:
  - Add a local Playwright smoke script that authenticates through
    `/auth/login`, seeds the owner token into session storage before page load,
    and captures private routes without submitting write actions.
  - Cover `/dashboard`, `/data`, `/data/tasks`, `/areas`, `/relationships`,
    `/settings/drive`, and `/settings/api` at desktop, tablet, and mobile
    viewports.
  - Add desktop interaction proof for the module switcher, data filter, typed
    tasks editor draft state, and disabled Drive import setup control.
  - Save screenshots and a JSON report outside the repository by default.
  - Update planning and state files so UXA-003 can start from real private-route
    evidence.
- Acceptance Criteria:
  - Private-route screenshots exist for all priority routes at desktop, tablet,
    and mobile.
  - Smoke proves signed-in hydration and fails on page errors, console
    warnings/errors, missing signed-in state, or enabled Drive import without
    setup.
  - Interaction proof covers navigation/module switcher, one filter, one
    editor draft state, and one disabled setup form state.
  - The workflow does not create production users, write production data, or
    rely on `javascript:` URL injection.
- Definition of Done:
  - `node --check scripts/owner-console-ux-smoke.mjs` passes.
  - `npm run owner-console:ux-smoke` passes against local Docker runtime on
    `http://localhost:3000`.
  - `git diff --check` passes.
  - Task board, next steps, project state, system health, and UX audit evidence
    are updated.
- Result Report:
  - Added `scripts/owner-console-ux-smoke.mjs` and the
    `owner-console:ux-smoke` package command.
  - Added Playwright as a dev dependency in package metadata for the local UX
    evidence workflow.
  - Local run passed against `http://localhost:3000`.
  - Artifacts were written to
    `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T19-47-08-826Z`.
  - Captured all seven private routes at `1440x960`, `834x1112`, and `390x844`,
    plus desktop interaction screenshots for module search, data filtering,
    tasks editor draft state, and disabled Drive import.
  - Console issues were empty, and all signed-in/private-route assertions
    passed.
  - Screenshot observations confirm UXA-003: the dashboard first viewport is
    still too panel-heavy and mobile dashboard pushes the primary action below
    the fold.

## UXA-003 Dashboard First-Viewport Command Polish

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: a tighter `/dashboard` first viewport that makes
  the current priority, blockers, and next action dominant before secondary
  module exploration.
- Process Self-Audit:
  - Analyze current state: UXA-002 screenshots and v1 UX audit reviewed.
  - Select exactly one priority task: UXA-003 only.
  - Plan implementation: reuse the existing command center, attention queue,
    readiness lanes, summary cards, and module launch patterns.
  - Execute implementation: scoped to dashboard markup, dashboard render logic,
    shared CSS, and source-of-truth docs.
  - Verify and test: build, syntax check, integration test, and authenticated UX
    smoke with desktop/tablet/mobile screenshots.
  - Self-review: confirm no architecture/API/backend behavior changed and no
    duplicate dashboard mechanism was introduced.
  - Update documentation and knowledge: task board, project state, next steps,
    and UX memory if the refined pattern should be reused.
- Goal: Make the owner dashboard answer "what matters now, what is blocked, and
  what should I click next" within the first viewport.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Move workspace, ClickUp, Drive, and data readiness evidence into a compact
    strip inside the existing cockpit instead of presenting separate competing
    health cards immediately below it.
  - Keep the attention queue beside the cockpit on desktop and stacked below it
    on mobile, but cap visible attention items so the first screen remains
    decisive.
  - Turn the large module launcher into a secondary exploration section below
    the command decision area.
  - Reduce the lower next-action panel to a short continuation path instead of
    a directory of equal-weight buttons.
  - Tighten dashboard mobile spacing so the dominant action appears earlier
    without hiding context.
- Acceptance Criteria:
  - First viewport shows one dominant current-priority action and one secondary
    action.
  - Blocker count and reason are visible without scrolling on desktop and near
    the top on mobile.
  - Module launch grid reads as secondary exploration, not a competing command
    center.
  - Lower next-action panel has no more than three action links.
  - Desktop, tablet, and mobile screenshots show no overlap, horizontal
    overflow, or developer-looking diagnostic text.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Integration test command passes against the local Docker backend service.
  - `npm run owner-console:ux-smoke` passes and records desktop/tablet/mobile
    screenshots for `/dashboard`.
  - `git diff --check` passes.
- Validation Evidence:
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - `npm run validate` passed.
  - Container-scoped Prisma migration plus Node integration test passed inside
    the backend service.
  - `npm run owner-console:ux-smoke` passed against isolated local compose
    project `companycore_uxa003` at `http://localhost:3002`.
  - Screenshot artifacts:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-00-12-315Z`.
- Result Report:
  - Moved workspace, ClickUp, Google Drive, and data readiness evidence into a
    compact cockpit strip.
  - Removed the competing first-viewport health-card row.
  - Limited visible attention rows to the top three signals with a concise
    overflow note when more signals exist.
  - Renamed the module launcher to secondary `Explore modules` context and
    moved it below the command decision area.
  - Reduced the lower next-action panel from ten links to three continuation
    links.
  - Removed secondary header shortcuts that appeared above the primary action
    on mobile.
  - Updated design memory with the refined command-center pattern and captured
    a local smoke isolation guardrail in the learning journal.

## UXA-004 Mobile Auth Action-First Layout

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: mobile `/auth/login` and `/auth/register` show
  the form before onboarding context while preserving desktop two-column auth.
- Process Self-Audit:
  - Analyze current state: UX audit P0 mobile auth finding and existing auth
    context pattern reviewed.
  - Select exactly one priority task: UXA-004 only.
  - Plan implementation: keep existing auth markup and desktop pattern; use
    responsive ordering and spacing only.
  - Execute implementation: scoped to auth CSS plus source-of-truth docs.
  - Verify and test: syntax/build, rendered public auth screenshots, and
    regression checks.
  - Self-review: confirm auth logic, routes, validation, and copy remain stable.
  - Update documentation and knowledge: task board, project state, next steps,
    and design memory when the responsive pattern should guide future auth work.
- Goal: Let returning owners reach sign-in and account creation fields before
  static onboarding context on phone-sized screens.
- Scope:
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Keep desktop auth as context panel plus form in the current two-column
    layout.
  - On responsive stacked layouts, order `.auth-card` before
    `.auth-context-card`.
  - Tighten mobile auth spacing enough that the primary form and submit action
    appear early without hiding context below.
  - Verify login and register at mobile and desktop widths.
- Acceptance Criteria:
  - Mobile login shows the sign-in form before onboarding context.
  - Mobile register shows account creation fields before onboarding context.
  - Desktop login/register preserve the existing two-column layout.
  - Required fields, submit buttons, links, focus styling, and auth route
    redirects remain intact.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Rendered screenshots verify mobile login/register and desktop auth.
  - `git diff --check` passes.
- Validation Evidence:
  - Browser plugin page identity and DOM check passed for
    `http://localhost:3003/auth/login`; console warnings/errors were empty.
  - Browser screenshot capture timed out, so rendered viewport evidence fell
    back to local Playwright screenshots.
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - Local Playwright auth smoke passed for desktop `1440x960` and mobile
    `390x844`.
  - Screenshot artifacts:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-auth-ux-smoke\2026-05-08T20-08-09-640Z`.
- Result Report:
  - Added responsive ordering so `.auth-card` appears before
    `.auth-context-card` when the auth grid stacks.
  - Preserved desktop login/register as two-column context plus form layouts.
  - Tightened mobile auth spacing and context-card padding.
  - Verified mobile login and register show their forms before context and keep
    submit buttons visible inside the first viewport.

## UXA-005 Workbench Visual Role Cleanup

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: BUILDER
- Deliverable For This Stage: dense owner-console workbenches have clearer
  visual roles for filters, lists, selected details, compact rows, and
  relationship review items.
- Process Self-Audit:
  - Analyze current state: v1 UX audit P1 dense-workbench finding and existing
    workbench design memory reviewed.
  - Select exactly one priority task: UXA-005 only.
  - Plan implementation: reuse existing `workbench-*`, filter-bar,
    `record-list`, `record-inspector`, `relationship-row`, and `compact-row`
    patterns instead of adding route-local variants.
  - Execute implementation: scoped to shared CSS plus source-of-truth docs.
  - Verify and test: syntax/build, authenticated smoke screenshots, and
    regression checks for desktop/tablet/mobile.
  - Self-review: confirm no route behavior, auth, API, or data contract
    changed.
  - Update documentation and knowledge: task board, project state, next steps,
    and design memory when the role cleanup becomes reusable guidance.
- Goal: Reduce equal-weight panel fatigue across dense routes so operators can
  scan filters, lists, selected details, and remediation rows faster.
- Scope:
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Make filter surfaces quieter than content surfaces.
  - Reduce repeated list-row shadow/weight and give list zones a distinct
    quiet background.
  - Strengthen selected-row and selected-detail treatment without relying only
    on color.
  - Keep compact relationship/area rows lightweight and readable.
  - Validate `/data`, `/data/tasks`, `/areas`, and `/relationships` through the
    authenticated UX smoke screenshots.
- Acceptance Criteria:
  - Filters are visually quieter than lists/details.
  - Selected rows/details are stronger and do not rely only on color.
  - Repeated rows use less shadow and clearer hover/focus states.
  - No new page-local component family is introduced.
  - Desktop/tablet/mobile screenshots show no overlap or horizontal overflow.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Container-scoped integration test passes.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project and captures the priority workbench routes.
  - `git diff --check` passes.
- Validation Evidence:
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - `npm run validate` passed.
  - Container-scoped Prisma migration plus Node integration test passed inside
    isolated compose project `companycore_uxa005`.
  - `npm run owner-console:ux-smoke` passed against isolated local compose
    project `companycore_uxa005` at `http://localhost:3004`.
  - Screenshot artifacts:
    `C:\Users\wrobl\AppData\Local\Temp\companycore-ux-smoke\2026-05-08T20-13-50-112Z`.
  - `git diff --check` passed.
- Result Report:
  - Made shared filter bars quieter with a low-emphasis background and border.
  - Reduced repeated workbench row weight by removing raised hover shadows and
    using subtle inset state markers.
  - Gave record lists a quiet list-zone background and strengthened selected
    rows with a non-color-only left inset.
  - Strengthened selected-detail/inspector treatment with a distinct border,
    soft surface, and light depth.
  - Made relationship and compact rows lighter while preserving readable row
    boundaries.
  - Updated design memory with reusable visual-role guidance for dense
    workbenches.

## UXA-006 Local Action Feedback Placement

- Task Type: design/frontend
- Current Stage: done
- Operation Mode: TESTER
- Deliverable For This Stage: auth, provider setup, Drive import, typed editor,
  and API-key lifecycle actions keep status/error/success feedback close to the
  action while the global result panel remains available for cross-route
  outcomes and result metrics.
- Process Self-Audit:
  - Analyze current state: reviewed existing `showResult`, auth forms,
    ClickUp setup, Google Drive setup/import, typed editor status helpers, and
    API key lifecycle status.
  - Select exactly one priority task: UXA-006 only.
  - Plan implementation: add local status slots where feedback was still only
    global, and reuse existing `form-note` tone classes instead of creating a
    new notification system.
  - Execute implementation: scoped to public HTML, frontend JS, shared CSS, and
    source-of-truth docs.
  - Verify and test: syntax/build, rendered Playwright feedback checks,
    authenticated owner-console smoke, and container integration tests.
  - Self-review: confirm auth, provider, Drive, API key, and typed editor
    feedback still uses approved existing mechanisms with no raw backend
    errors exposed.
  - Update documentation and knowledge: task board, project state, next steps,
    system health, UX audit, and design memory.
- Goal: Reduce user uncertainty after form and setup actions by placing
  immediate feedback next to the action that caused it.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `docs/ux/companycore-v1-ux-ui-audit.md`
  - `docs/planning/mvp-next-commits.md`
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
- Implementation Plan:
  - Add local `aria-live` status slots for login, registration, ClickUp setup,
    and Google Drive setup/import.
  - Add a shared `setLocalStatus` helper and use it before, after, and on error
    for auth, ClickUp, and Drive actions.
  - Keep `showResult` for broad cross-route outcomes and sync/import metrics.
  - Preserve existing local feedback for typed editors and API key lifecycle
    actions.
  - Validate desktop/mobile rendered behavior plus private-route smoke.
- Acceptance Criteria:
  - Auth errors appear next to the auth form as well as in global feedback.
  - ClickUp setup and Drive setup/import actions have local status feedback.
  - Empty local status slots are hidden and do not add layout noise.
  - Typed editor and API key local status behavior is preserved.
  - Global result panel still handles cross-route outcomes and metric payloads.
- Definition of Done:
  - `node --check public/app.js` passes.
  - `npm run build` and `npm run validate` pass.
  - Rendered Playwright checks prove local auth feedback and hidden empty
    ClickUp/Drive status slots.
  - `npm run owner-console:ux-smoke` passes against an isolated local compose
    project.
  - Container-scoped Prisma migration plus Node integration test passes.
  - `git diff --check` passes.
- Validation Evidence:
  - `node --check public/app.js` passed.
  - `npm run build` passed.
  - `npm run validate` passed.
  - Browser path opened `http://localhost:3005/auth/login`, but interaction
    fallback was required because Browser failed on `locator.fill` with a
    virtual clipboard/runtime error.
  - Playwright fallback confirmed invalid login renders
    `Email or password is incorrect.` in `#loginStatus` with
    `form-note local-status is-error`; the only console event was the expected
    `401` from the intentional failed login.
  - Playwright fallback confirmed `#clickupActionStatus` and
    `#googleDriveActionStatus` exist and stay hidden while empty.
  - `npm run owner-console:ux-smoke` passed against isolated local compose
    project `companycore_uxa006` at `http://localhost:3005`; artifacts:
    `.tmp/uxa006-owner-console-rerun`.
  - Container-scoped Prisma migration plus Node integration test passed inside
    isolated compose project `companycore_uxa006`.
- Result Report:
  - Added local live-status slots for login, registration, ClickUp setup, and
    Google Drive setup/import surfaces.
  - Added shared local status helpers and wired auth, ClickUp, and Drive action
    handlers to pending/success/error feedback.
  - Preserved the global result panel for broader outcomes and sync/import
    metric details.
  - Preserved existing typed editor and API-key lifecycle local feedback.
  - Recorded the reusable local action feedback rule in design memory.

## V2WEB-049 Table Workbench Empty State Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: the table workbench shows actionable empty states
  for unsupported tables, signed-out access, empty record lists, filtered-out
  lists, and inspector selection.
- Goal: Make route-level business editing surfaces feel intentional even when
  no records are loaded yet, so operators know the next action without reading
  raw table context.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a reusable table-workbench empty state helper with title, message, and
    optional local action.
  - Replace generic table record and inspector empty notes with actionable
    states for unsupported, signed-out, no-records, filtered, and select-record
    conditions.
  - Add a clear-filters action and a new-draft action through existing table
    workbench state.
  - Style the empty state as a compact reusable panel that works inside lists
    and inspector surfaces.
  - Validate syntax/build, tests, and desktop/mobile table workbench rendering.
- Acceptance Criteria:
  - Empty record lists explain whether the table has no records or filters are
    hiding matches.
  - Typed editable tables offer `New draft` from the empty record-list state.
  - Filtered-out lists offer `Clear filters` and update the table view.
  - Inspector empty state explains selection or creation without raw backend
    language.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies table empty, filtered, and inspector states,
    responsive layout, and no console errors.
- Result Report:
  - Added a reusable table-workbench empty state helper with title, message,
    and optional local action.
  - Replaced generic `/data-table` record-list and inspector notes with
    actionable states for unsupported table routes, protected signed-out
    routing, empty record lists, filtered-out lists, and selection/creation
    context.
  - Added local `New draft` and `Clear filters` actions through existing table
    workbench state; no backend behavior, API routes, or CRUD semantics were
    changed.
  - Added compact empty-state styling that works inside record lists and
    inspector panels on desktop and mobile.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55505`.
  - Passed local Playwright smoke against disposable Postgres on port `55504`;
    smoke verified protected `/data/notes` sign-in feedback, new-workspace
    empty Notes state, `New draft`, note creation, filtered-out record-list and
    inspector states, `Clear filters`, mobile layout, and no console/page
    errors or horizontal overflow.
  - Browser plugin fallback was required because the Browser tool was not
    exposed in this session.

## V2WEB-048 Global Feedback Panel Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: the shared `#resultPanel` shows clearer action
  feedback for success and error states.
- Goal: Make global action feedback easier to scan across auth, ClickUp,
  Google Drive, CRUD, and API workflows without changing backend behavior.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an accessible live region and tone label to the shared result panel.
  - Update `showResult` to mark success versus attention states on the panel.
  - Style success/error result states with the existing compact panel language.
  - Preserve existing result messages, sync metrics, and action behavior.
  - Validate syntax/build, tests, and desktop/mobile feedback rendering.
- Acceptance Criteria:
  - Success feedback shows a `Success` tone label and readable message box.
  - Error feedback shows a `Needs attention` tone label and readable message
    box.
  - Existing sync/detail metrics still render inside the result panel.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies error and success feedback states,
    responsive layout, and no console errors.
- Result Report:
  - Added an accessible live region, tone label, and bordered message box to
    the shared `#resultPanel`.
  - Updated `showResult` so success feedback shows `Success` and error
    feedback shows `Needs attention` while preserving existing result messages,
    sync metrics, and action behavior.
  - Added tone-aware success/error styling using the existing compact panel
    language.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55503`.
  - Passed local Playwright desktop/mobile smoke for wrong-login error feedback
    and successful workspace creation feedback; smoke verified tone labels,
    message boxes, no horizontal overflow, and no unexpected console/page
    errors. The expected `401 Unauthorized` response from the wrong-login
    action was filtered as the tested failure path.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-047 Public Entry Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/` shows a stronger public entry context for
  CompanyCore v1 before owner login or workspace creation.
- Goal: Make the public landing route explain the operational console, core
  integration surfaces, and agent API value before the user chooses sign-in or
  registration.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add public entry pills for ClickUp, Drive, agent API, and operating areas.
  - Replace the minimal Web UI status chip with a compact operational console
    card.
  - Preserve public sign-in/register navigation and auth behavior.
  - Validate syntax/build, tests, and desktop/mobile public-entry rendering.
- Acceptance Criteria:
  - `/` explains the operational console and core integration surfaces before
    auth.
  - `Sign in` and `Create account` keep navigating to existing auth routes.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies public entry context, auth navigation,
    responsive layout, and no console errors.
- Result Report:
  - Added public entry pills for ClickUp, Google Drive, agent-safe API, and
    operating areas.
  - Replaced the minimal Web UI status chip with a compact operational console
    card.
  - Preserved public sign-in/register navigation and auth behavior.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55501`.
  - Passed local Playwright desktop/mobile `/` smoke with no console errors or
    horizontal overflow; smoke verified public entry copy and navigation to
    `/auth/login` plus `/auth/register`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-046 Auth Onboarding Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/auth/login` and `/auth/register` show compact
  onboarding context panels beside the owner forms.
- Goal: Make the public entry screens explain the workspace, integration,
  operating-area, and agent API context before an owner signs in or creates a
  workspace.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a static owner onboarding context panel beside the login form.
  - Add a static workspace bootstrap context panel beside the registration
    form.
  - Style both panels with the established compact context-panel visual
    language and responsive single-column collapse.
  - Preserve existing login, registration, form validation, and navigation
    behavior.
  - Validate syntax/build, tests, and desktop/mobile auth rendering.
- Acceptance Criteria:
  - `/auth/login` explains owner onboarding before sign-in.
  - `/auth/register` explains workspace bootstrap before account creation.
  - Existing auth form submissions and auth navigation continue to work.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies login/register context, auth navigation,
    successful registration, responsive layout, and no console errors.
- Result Report:
  - Added owner onboarding context to `/auth/login`.
  - Added workspace bootstrap context to `/auth/register`.
  - Reused the compact context-panel visual language with responsive
    single-column collapse while preserving existing auth forms and behavior.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55499`.
  - Passed local Playwright desktop/mobile auth smoke with no console errors or
    horizontal overflow; smoke verified login/register context copy, navigation
    between auth routes, and successful registration redirect to `/dashboard`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-045 ClickUp Setup Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings` shows a compact ClickUp adapter
  command panel before the ClickUp setup form.
- Goal: Make the ClickUp setup screen immediately explain connection status,
  token readiness, selected workspace/list scope, import mode, synced ClickUp
  task count, and next actions before the owner works through the form.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a ClickUp context slot above the existing setup form.
  - Render ClickUp status, token readiness, workspace selection state,
    selected/saved/loaded List counts, ClickUp task count, and import mode from
    existing frontend state.
  - Add local actions to the setup form, task adapter, and integration map
    through existing SPA navigation.
  - Preserve the existing token check, refresh, Workspace select, List picker,
    import mode, save, and sync controls.
  - Validate syntax, build, tests, and desktop/mobile `/settings` rendering.
- Acceptance Criteria:
  - `/settings` explains the ClickUp adapter command state before the setup
    form.
  - `Setup form`, `Review tasks`, and `Integration map` navigate through the
    SPA to existing dedicated surfaces or the local setup anchor.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies ClickUp context, all actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic ClickUp adapter command panel to `/settings`.
  - Added ClickUp status, token readiness, workspace selection, selected/saved/
    loaded List counts, ClickUp task count, and import mode pills plus actions
    to the setup form, task review, and integration map.
  - Shortened the ClickUp token placeholder so the mobile form stays readable.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55497`.
  - Passed local Playwright desktop/mobile `/settings` smoke with no console
    errors or horizontal overflow; smoke verified context copy,
    readiness/count pills, local setup anchor behavior, and SPA navigation to
    `/tasks-adapter` plus `/settings/integrations`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-044 Account Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/account` shows a compact workspace
  command profile before account cards.
- Goal: Make the account screen immediately explain owner session readiness,
  workspace identity, integration readiness, API route exposure, service key
  state, and operating-area coverage before the owner scans readiness links.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an account context slot above the existing owner/workspace cards.
  - Render owner session state, workspace name, ClickUp state, Drive state,
    API route count, active key count, scoped key count, and operating-area
    count from existing frontend state.
  - Add local actions to the integration map, agent API settings, and
    operating areas through existing SPA navigation.
  - Preserve existing owner/workspace cards and readiness grid.
  - Validate syntax, build, tests, and desktop/mobile `/settings/account`
    rendering.
- Acceptance Criteria:
  - `/settings/account` explains workspace command profile before account
    cards.
  - `Integration map`, `Agent API`, and `Operating areas` navigate through the
    SPA to existing dedicated surfaces.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies account context, all actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic workspace command profile to `/settings/account`.
  - Added owner session, ClickUp state, Drive state, API route, active key,
    scoped key, and operating-area pills plus actions to the integration map,
    agent API settings, and operating areas.
  - Kept the context panel from exposing the raw missing-email fallback when
    owner details are not returned by the current connection payload.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55495`.
  - Passed local Playwright desktop/mobile `/settings/account` smoke with no
    console errors or horizontal overflow; smoke verified context copy,
    readiness/count pills, and SPA navigation to `/settings/integrations`,
    `/settings/api`, and `/areas`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-043 Integration Map Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/integrations` shows a compact
  integration command map before provider group cards.
- Goal: Make the integration map immediately explain provider APIs, operating
  areas, ClickUp tasks, Drive folders, pipeline records, and agent API routes
  before the owner scans integration cards or setup rows.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an integration command context slot above the existing integration
    group grid.
  - Render readiness, implemented group count, operating-area count, ClickUp
    task count, Drive folder count, pipeline record count, API route count,
    and Drive status from existing frontend state.
  - Add local actions to ClickUp setup, Drive setup, and agent API settings
    through existing SPA navigation.
  - Preserve existing integration group cards, provider setup rows, integration
    filters, and operating-area data matrix.
  - Validate syntax, build, tests, and desktop/mobile
    `/settings/integrations` rendering.
- Acceptance Criteria:
  - `/settings/integrations` explains the integration command map before the
    provider group cards.
  - `ClickUp setup`, `Drive setup`, and `Agent API` navigate through the SPA to
    the existing dedicated setup surfaces.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies integration context, all actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic integration command map to `/settings/integrations`.
  - Added readiness, implemented group, operating-area, ClickUp task, Drive
    folder, pipeline record, API route, and Drive status pills plus actions to
    ClickUp setup, Drive setup, and agent API settings.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55493`.
  - Passed local Playwright desktop/mobile `/settings/integrations` smoke with
    no console errors or horizontal overflow; smoke verified context copy,
    readiness/count pills, and SPA navigation to `/settings`,
    `/settings/drive`, and `/settings/api`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the plugin requires `>=22.22.0`.

## V2WEB-042 Google Drive Import Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/drive` shows a compact Drive import
  context panel before OAuth setup.
- Goal: Make the Google Drive settings screen immediately explain OAuth client
  readiness, consent state, selected/discovered folders, imported items, and
  folder review needs before the owner follows the detailed setup guide.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a Drive import context slot above the existing Drive setup panel.
  - Render OAuth client state, consent state, selected folder count,
    discovered folder count, imported item count, folder review count, and
    Drive setup status from existing client state.
  - Add local actions to Drive setup and relationship review through existing
    page anchors and SPA navigation.
  - Preserve existing OAuth form, setup guide, folder picker, import mode,
    Drive file filters, preview actions, and description editing.
  - Validate syntax, build, tests, and desktop/mobile `/settings/drive`
    rendering.
- Acceptance Criteria:
  - `/settings/drive` explains Drive import readiness before OAuth setup.
  - `Setup Drive` moves context to the existing Drive setup panel.
  - `Review folders` navigates to `/relationships` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies Drive context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic Drive import context panel to `/settings/drive`.
  - Added OAuth client, consent, selected folder, discovered folder, imported
    item, and folder-review pills plus actions to setup and review folders.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55491`.
  - Passed local Playwright desktop/mobile `/settings/drive` smoke with no
    console errors or horizontal overflow; smoke verified context copy,
    OAuth/client readiness pills, selected/discovered/imported folder counts,
    setup anchor behavior, and SPA navigation to `/relationships`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-041 Operating Area Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/areas` shows a compact operating model context
  panel before the company operating map.
- Goal: Make the operating-area screen immediately explain how the selected
  company area fits into tables, records, Drive files, provider mappings, and
  agent-readable context before the owner scans the area rail and workbench.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an operating model context slot above the existing operating map.
  - Render area count, table count, record count, provider mapping count,
    Drive item count, selected-area signal count, and selected-area status.
  - Add local actions to relationship review and the integration map through
    existing SPA navigation.
  - Preserve existing area rail, selected-area detail, filters, workbench,
    delete guardrails, assignment controls, and linked-content previews.
  - Validate syntax, build, tests, and desktop/mobile `/areas` rendering.
- Acceptance Criteria:
  - `/areas` explains company-area context before the operating map.
  - `Review mappings` navigates to `/relationships` through the SPA.
  - `Integration map` navigates to `/settings/integrations` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies area context, both actions, responsive layout,
    and no console errors.
- Result Report:
  - Added a dynamic operating model context panel to `/areas`.
  - Added area, table, record, provider mapping, Drive item, and selected-area
    signal pills plus actions to review mappings and open the integration map.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55489`.
  - Passed local Playwright desktop/mobile `/areas` smoke with no console
    errors or horizontal overflow; smoke verified context copy, inventory
    pills, selected-area status, and SPA navigation to `/relationships` plus
    `/settings/integrations`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-040 API Agent Access Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/settings/api` shows a compact agent API
  command context panel above API cards and key management.
- Goal: Make the API settings screen immediately explain whether agent access
  is ready, how many scoped service keys exist, and how much route/capability
  surface is available before the owner creates or hands off a key.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add an API context slot above the existing API summary cards.
  - Render active key count, inactive key count, scoped key count, capability
    count, route count, and write-route count from existing client state.
  - Add local actions for key creation and integration map review.
  - Preserve existing scoped-key form, copy-once raw key behavior, key list,
    capability chips, route filters, and route list.
  - Validate syntax, build, tests, and desktop/mobile `/settings/api`
    rendering.
- Acceptance Criteria:
  - `/settings/api` explains agent API readiness before key management.
  - `Create key` moves focus context to the existing key form without a new
    backend path.
  - `Integration map` navigates to `/settings/integrations` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies API context, both actions, responsive layout,
    and no console errors.
- Result Report:
  - Added a dynamic agent API context panel to `/settings/api`.
  - Added active/inactive/scoped key, capability, route, and write-route pills
    plus actions to create a key and open the integration map.
  - Fixed context refresh after scoped key creation so the panel updates from
    `No active keys` to `Agent access ready` with current key counts.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55487`.
  - Passed local Playwright desktop/mobile `/settings/api` smoke with no
    console errors or horizontal overflow; smoke verified initial context,
    create-key anchor behavior, scoped key creation, copy-once raw key display,
    post-create context refresh, and SPA navigation to `/settings/integrations`.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-039 Relationships Mapping Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/relationships` shows a compact mapping context
  panel before the review queue.
- Goal: Make the relationship review center immediately explain provider and
  Drive area mapping health, what needs review, and where the owner should go
  next to fix operating-area context.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a relationship context slot above the existing review queue.
  - Render mapping health, provider mapping count, Drive folder count, review
    item count, and filtered visibility.
  - Add local actions to open the operating area map and integration map
    through existing SPA navigation.
  - Preserve existing relationship filters, review queue rows, assign-area
    controls, and provider/Drive lists.
  - Validate syntax, build, tests, and desktop/mobile `/relationships`
    rendering.
- Acceptance Criteria:
  - `/relationships` explains provider/Drive area mapping before the review
    queue.
  - `Open area map` navigates to `/areas` through the SPA.
  - `Integration map` navigates to `/settings/integrations` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies relationship context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic mapping context panel to `/relationships`.
  - Added provider mapping, Drive folder, review item, and visible relationship
    pills plus actions to `/areas` and `/settings/integrations`.
  - Passed `node --check public/app.js`, `npm run build`, `git diff --check`,
    and `npm test` against disposable Postgres on port `55485`.
  - Passed local Playwright desktop/mobile `/relationships` smoke with no
    console errors or horizontal overflow; smoke verified context copy, pills,
    and both SPA navigation actions.
  - Browser plugin fallback was required because node_repl resolved Node
    `22.13.0` while the Browser plugin requires `>=22.22.0`.

## V2WEB-038 Pipeline Workflow Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/pipeline` shows a compact workflow context
  panel before stats, filters, and the record feed.
- Goal: Make the pipeline screen immediately explain that pipeline stages are
  reusable cross-department workflow infrastructure while clients, deals, and
  interactions are the current CRM usage records.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a pipeline context slot above the stats strip.
  - Render workflow readiness, reusable stage count, CRM usage record count,
    visible filtered count, and implemented table count.
  - Add local actions to open pipeline stages and CRM client records in the Data
    workbench through existing SPA navigation.
  - Preserve existing pipeline stats, filters, feed, and list sections.
  - Validate syntax, build, tests, and desktop/mobile `/pipeline` rendering.
- Acceptance Criteria:
  - `/pipeline` explains shared stages versus CRM usage before the stats strip.
  - `Open stages` navigates to `/data/pipeline-stages` through the SPA.
  - `Open CRM records` navigates to `/data/clients` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies pipeline context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic workflow context panel to `/pipeline`.
  - Added shared-stage versus CRM-usage copy, workflow status, context pills,
    and actions to `/data/pipeline-stages` and `/data/clients`.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55483`.
  - Local Playwright `/pipeline` smoke passed on desktop `1440x960` and mobile
    `390x844`: workflow context rendered, shared-stage versus CRM-usage copy
    and pills were visible, `Open stages` navigated through the SPA to
    `/data/pipeline-stages`, `Open CRM records` navigated through the SPA to
    `/data/clients`, there were no console errors, and there was no horizontal
    overflow. Browser plugin validation was attempted first but remained
    blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-037 Tasks Adapter Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/tasks-adapter` shows a compact adapter context
  panel before task counts and the task table.
- Goal: Make the ClickUp/CompanyCore task adapter screen communicate source
  status, selected ClickUp scope, current workload health, and the right next
  action before the owner scans the task table.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a reusable adapter-context slot above the task stats strip.
  - Render ClickUp connection status, ClickUp/local record split, selected List
    count, open/due workload signal, and sync state.
  - Add local actions to open the typed task editor and ClickUp configuration
    through existing SPA navigation.
  - Preserve existing task stats, filters, table rendering, and refresh
    behavior.
  - Validate syntax, build, tests, and desktop/mobile `/tasks-adapter`
    rendering.
- Acceptance Criteria:
  - `/tasks-adapter` shows adapter status and source/scope context before task
    stats.
  - `Open task editor` navigates to `/data/tasks` through the SPA.
  - `Configure ClickUp` navigates to `/settings` through the SPA.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies adapter context, both actions, responsive
    layout, and no console errors.
- Result Report:
  - Added a dynamic adapter context panel to `/tasks-adapter`.
  - Added source split, selected ClickUp List count, workload health, sync
    state, and actions to `/data/tasks` and `/settings`.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55481`.
  - Local Playwright `/tasks-adapter` smoke passed on desktop `1440x960` and
    mobile `390x844`: adapter context rendered, ClickUp disconnected state was
    visible, source/scope/workload/sync pills rendered, `Open task editor`
    navigated through the SPA to `/data/tasks`, `Configure ClickUp` navigated
    through the SPA to `/settings`, there were no console errors, and there was
    no horizontal overflow. Browser plugin validation was attempted first but
    remained blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-036 Table Workbench Context Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/data/:table` workbench shows a compact table
  context panel with capability, API, source, field, and primary action
  information.
- Goal: Make the table-detail workbench feel like a continuation of the Data
  operations center, so owners can understand editability, source coverage, and
  next action before scanning records or opening the inspector.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a reusable table-context slot above the table workbench panel.
  - Render typed-editor versus read-only capability, API methods, write action
    availability, sources, visible field count, and loaded record count.
  - Provide a local `New draft` action for typed modules and an API review link
    for read-only modules.
  - Preserve existing table filters, record selection, typed editors, and route
    paths.
  - Validate syntax, build, tests, and desktop/mobile `/data/:table` rendering.
- Acceptance Criteria:
  - `/data/tasks` shows a typed-editor context panel and a `New draft` action
    that opens the create form without leaving the route.
  - A read-only module shows read-only/API review context instead of implying
    an editor exists.
  - Dynamic links in the new panel use existing SPA navigation behavior.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies typed and read-only table context states,
    `New draft`, API-review navigation, and responsive layout with no console
    errors.
- Result Report:
  - Added a dynamic table context panel above `/data/:table` workbenches.
  - Added typed/read-only capability status, API/write/source/field pills,
    loaded-record/API route counts, `New draft` for typed modules, and `Review
    API` for read-only modules.
  - Moved the context panel above the stats strip so mobile users see table
    meaning and primary action before secondary counts.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55479`.
  - Local Playwright `/data/:table` smoke passed on desktop `1440x960` and
    mobile `390x844`: `/data/tasks` rendered typed context with `New draft`,
    the new-draft action opened the create-task editor, `/data/goals` rendered
    read-only context with `Review API`, the review link navigated through the
    SPA to `/settings/api`, there were no console errors, and there was no
    horizontal overflow. Browser plugin validation was attempted first but
    remained blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-035 Data Operations Index Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: `/data` database module index communicates
  editability, API coverage, record/source counts, and next action without
  changing existing routes.
- Goal: Make the database operations center easier to scan so the owner and
  agents can quickly choose the right module, understand whether it is editable,
  and open the existing table workbench.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Reuse the existing `workbench-index-row` pattern instead of adding a
    page-local list component.
  - Add row-level capability status for typed editors versus read-only modules.
  - Add compact operational tags for API coverage, write actions, and mapped
    area.
  - Move metrics, provider/source metadata, and the open action into a
    responsive side panel.
  - Validate syntax, build, tests, and desktop/mobile `/data` rendering.
- Acceptance Criteria:
  - `/data` rows show whether a module has a typed editor or is read-only.
  - Rows still navigate through the existing `data-link` SPA route behavior.
  - API coverage, write action availability, mapped area, records, routes, and
    sources are visible without opening a module.
  - Desktop and mobile layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local browser smoke verifies `/data` row statuses, filtering/navigation, and
    responsive layout with no console errors.
- Result Report:
  - Updated database module rows with capability badges, operational tags, a
    compact metrics/source side panel, and preserved route navigation.
  - Extended the reusable workbench index CSS pattern with editable/read-only
    status styling and mobile-safe stacking.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55476`.
  - Local Playwright `/data` smoke passed on desktop `1440x960` and mobile
    `390x844`: 13 module rows rendered, 5 typed-editor rows were marked,
    read-only badges rendered, operation tags rendered, the `tasks` filter
    narrowed the list, `/data/tasks` navigation worked, there were no console
    errors, and there was no horizontal overflow. Browser plugin validation was
    attempted first but remained blocked because its Node REPL requires Node
    `>=22.22.0` while this workstation exposes Node `22.13.0`.

## V2WEB-034 Command Bar Module Switcher Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: top command bar and module switcher use the same
  semantic lane model as the sidebar and expose clearer active-module context.
- Goal: Make cross-module navigation feel intentional and fast from every
  screen without changing route behavior or adding backend state.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Rename the topbar search affordance from "Open module" to "Jump to module",
    replace long workspace-name eyebrow text with stable current-module copy,
    and tighten route title styling.
  - Align module switcher groups with sidebar lanes: Command, Operate,
    Integrations, and Workspace.
  - Render grouped search results with group headings and active-module state.
  - Validate syntax, build, tests, and desktop/mobile command-bar rendering.
- Acceptance Criteria:
  - Module switcher results are grouped by the same job-family labels as the
    sidebar.
  - The current module is marked as selected in the switcher result list.
  - Enter-first-result navigation and click navigation keep using existing
    route paths.
  - Desktop and mobile topbar layouts render without horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local Playwright smoke verifies module search/open behavior on desktop and
    mobile with no console errors or horizontal overflow.
- Result Report:
  - Updated topbar copy to "Jump to module", changed the signed-in eyebrow to
    "Current module", and tightened route title chrome.
  - Aligned `moduleRoutes` groups to Command, Operate, Integrations, and
    Workspace.
  - Added grouped switcher result headings and active-result state while
    preserving the same navigation paths.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55473`.
  - Local Playwright command-bar smoke passed on desktop `1440x960` and mobile
    `390x844`: "Jump to module" rendered, grouped results appeared, active
    Dashboard result was marked selected, Enter navigation opened API settings,
    there were no console errors, and no horizontal overflow. Browser plugin
    validation was attempted first but remained blocked because its Node REPL
    requires Node `>=22.22.0` while this workstation exposes Node `22.13.0`.

## V2WEB-033 App Shell Navigation Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: owner console navigation is grouped into
  command, operate, integration, and workspace lanes without changing route
  behavior.
- Goal: Make the application shell feel like a usable operating center across
  all screens by reducing sidebar scanning cost and making active navigation
  state clearer.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Group existing sidebar routes into semantic sections while preserving all
    hrefs and `data-nav` attributes.
  - Improve active, hover, and scroll behavior through shared sidebar styles.
  - Keep mobile drawer behavior compatible with the existing menu button.
  - Validate syntax, build, tests, and desktop/mobile navigation rendering.
- Acceptance Criteria:
  - Sidebar links are grouped by operational purpose.
  - Existing route navigation and active-route highlighting still work.
  - Sidebar can scroll independently when viewport height is constrained.
  - Mobile drawer remains usable with no horizontal overflow.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local Playwright smoke verifies `/dashboard` shell rendering on desktop and
    mobile with no console errors or horizontal overflow.
- Result Report:
  - Grouped sidebar navigation into Command, Operate, Integrations, and
    Workspace sections.
  - Added reusable sidebar-section styling, clearer active route affordance,
    hover border, and independent sidebar scrolling.
  - Preserved all route URLs, `data-link`, and `data-nav` attributes.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55471`.
  - Local `/dashboard` Playwright shell smoke passed on desktop `1440x960` and
    mobile `390x844`: four sidebar groups rendered, active dashboard route was
    preserved, there were no console errors, and no horizontal overflow.
    Browser plugin validation was attempted first but remained blocked because
    its Node REPL requires Node `>=22.22.0` while this workstation exposes Node
    `22.13.0`.

## V2WEB-032 Dashboard Command Layout Polish

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dashboard first viewport behaves more like an
  operational command center by pairing priority, readiness lanes, and the
  attention queue in one scan path.
- Goal: Make the owner console dashboard answer "what matters now, what is
  blocked, and where do I click next" faster without adding new backend
  behavior.
- Scope:
  - `public/index.html`
  - `public/styles.css`
  - `docs/ux/design-memory.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Place the operational cockpit and attention queue in a shared responsive
    dashboard command layout.
  - Keep readiness lanes inside the cockpit and move workspace/provider status
    cards into a tighter health strip.
  - Preserve existing IDs and JavaScript data wiring so dashboard behavior,
    links, and attention ranking remain unchanged.
  - Validate syntax, build, tests, and desktop/mobile dashboard render.
- Acceptance Criteria:
  - Desktop dashboard first viewport shows current priority, readiness lanes,
    and attention items side by side without layout overflow.
  - Mobile stacks the same cockpit, attention queue, and health strip in a
    readable order without horizontal scrolling.
  - Existing dashboard links and dynamic text still render from current state.
  - No new backend endpoints, tables, or placeholder-only data are introduced.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Local Playwright smoke verifies `/dashboard` on desktop and mobile with no
    console errors or horizontal overflow.
- Result Report:
  - Added a reusable `dashboard-command-layout` that pairs the cockpit and
    attention queue on desktop and stacks cleanly on mobile.
  - Reused existing `command-focus`, `command-panel`, `operational-step`,
    `summary-card`, and `button-link` patterns instead of introducing a new UI
    system.
  - Tightened the dashboard health cards through a `health-grid` variant while
    preserving existing workspace, ClickUp, API, and Drive state wiring.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55469`.
  - Local `/dashboard` Playwright smoke passed on desktop `1440x960` and mobile
    `390x844`: the command layout rendered once, attention queue stayed in the
    cockpit scan path, there were no console errors, and no horizontal
    overflow. Browser plugin validation was attempted first but remained
    blocked because its Node REPL requires Node `>=22.22.0` while this
    workstation exposes Node `22.13.0`.

## V2WEB-031 Cross-Department Pipeline Semantics

- Task Type: product/frontend/docs
- Current Stage: done
- Deliverable For This Stage: owner console and source-of-truth docs describe
  pipelines as shared workflow infrastructure rather than a CRM-owned module.
- Goal: Keep CompanyCore domain language aligned with the product decision that
  CRM can use pipelines, but pipelines must be usable by every department.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `docs/architecture/system-architecture.md`
  - `docs/API.md`
  - `docs/DATABASE.md`
  - `docs/ux/design-memory.md`
  - `.codex/context/LEARNING_JOURNAL.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Update `/pipeline`, module-switcher, dashboard, and integration taxonomy
    copy to say shared pipeline plus current CRM usage records.
  - Move `pipeline-stages` UI grouping from CRM to workflow while keeping
    routes, table names, and API contracts stable.
  - Record the confirmed domain boundary in architecture, API, database, UX,
    planning, task-board, and project-state docs.
- Acceptance Criteria:
  - `/pipeline` no longer presents pipelines as CRM-owned.
  - CRM clients/deals/interactions remain visible as current consumers of the
    shared pipeline workbench.
  - No API route, database table, or persisted slug is renamed in this slice.
  - Validation covers frontend syntax, build, tests, and a browser smoke.
- Definition of Done:
  - `node --check public/app.js`, `npm run build`, `git diff --check`, and
    `npm test` pass.
  - Desktop and mobile `/pipeline` smoke confirm the corrected copy renders
    without console errors or horizontal overflow.
- Result Report:
  - Reworded dashboard, module switcher, integration taxonomy, and `/pipeline`
    copy around shared pipeline infrastructure and current CRM usage records.
  - Moved Pipeline route search grouping and `pipeline-stages` catalog grouping
    from CRM to Workflow.
  - Updated architecture, API, database, UX, project-state, task-board, and
    next-commits docs with the cross-department pipeline decision.
  - Validation passed: `node --check public/app.js`, `npm run build`,
    `git diff --check`, and `npm test` against disposable Postgres database
    `companycore_test` on port `55466`.
  - Local `/pipeline` Playwright smoke passed on desktop `1440x960` and mobile
    `390x844`: corrected shared-workflow copy rendered, search input accepted
    text, there were no console errors, and no horizontal overflow. Browser
    plugin validation was attempted first but blocked because its Node REPL
    requires Node `>=22.22.0` while this workstation exposes Node `22.13.0`.

## V2WEB-020 Main Operating Area Foundation

- Task Type: backend/frontend
- Current Stage: done
- Deliverable For This Stage: workspace operating model includes immutable
  `00. Glowny` fallback area for unclassified ClickUp/Drive/company elements.
- Goal: Give ClickUp Lists and other imported records without a clear company
  department a stable home instead of forcing them into an unrelated internal
  department.
- Scope:
  - `src/operating-model/catalog.ts`
  - `src/modules/connection/connection.routes.ts`
  - `src/modules/operating-model/operating-model.routes.ts`
  - `src/tests/api.test.ts`
  - `public/app.js`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `main-general` as position `0` in the operating-area catalog.
  - Make unclassified provider names fall back to `main-general`.
  - Ensure existing workspaces receive the new area during connection and
    operating-model reads.
  - Update frontend area metadata/order so `00. Glowny` appears first.
  - Update tests from 12 to 13 areas and verify unknown ClickUp lists map to
    the new fallback area.
- Acceptance Criteria:
  - New and existing workspaces expose `main-general` / `00. Glowny` first.
  - Unknown ClickUp List names classify to `main-general`.
  - Existing business table mappings remain in their current operating areas.
  - Connection and operating-model endpoints keep returning the full hierarchy.
  - Delete-area UX is not shipped in this slice and remains planned separately.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Production smoke confirms `/v1/connection`, `/v1/operating-model`, and the
    frontend bundle include the main area behavior.
- Result Report:
  - Added `main-general` / `00. Główny` as position `0` in the operating-area
    catalog.
  - Unclassified provider names now fall back to `main-general`; explicit
    operations and AI/Jarvis names still classify to their specific areas.
  - Existing workspaces receive the new area during `/v1/connection` and
    `/v1/operating-model` reads.
  - Updated frontend area metadata and copy from a strict 12-area model to
    `00` fallback plus 12 company departments.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, and `npm test`.

## V2WEB-019 Relationship Review Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable relationship review filters backed by
  existing provider mappings and imported Google Drive folders.
- Goal: Make `/relationships` usable as the correction surface for misplaced
  ClickUp/Drive elements by letting an operator quickly narrow the review queue
  and supporting lists without changing backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and source/status controls to the Relationships view.
  - Filter the review queue, provider mapping list, and Drive folder list from
    already loaded frontend state.
  - Keep existing assignment controls and update the relationship summary to
    show filtered versus loaded relationships.
  - Preserve empty states for signed-out, no data, and filtered no-match cases.
  - Validate syntax, build, tests, local browser smoke, and production smoke.
- Acceptance Criteria:
  - `/relationships` supports search across provider mapping, Drive folder,
    provider/source, entity type, and assigned area names.
  - Source/status filter supports all, needs review, provider mappings, and
    Drive folders.
  - Review queue and supporting lists update without reloading and preserve
    existing area assignment controls.
  - Summary reflects filtered relationship count and unresolved review count.
  - Responsive layout remains usable on desktop and mobile.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies relationship search, source/status filtering,
    filtered empty state, assignment control persistence, and mobile layout.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added search and source/status filters to `/relationships` for all,
    needs-review, provider mapping, and Drive folder views.
  - The review queue, provider mapping list, and Drive folder list now filter
    from existing frontend state while preserving area assignment controls.
  - Relationship summary now reports filtered count versus loaded count and
    unresolved review count.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, `npm test`, and local Playwright relationship-filter
    smoke.

## V2WEB-018 Global Module Switcher

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable module switcher in the private
  workspace topbar backed by implemented web console routes.
- Goal: Make the growing v2 web console easier to use by letting an operator
  quickly find and open existing modules, settings, and review surfaces without
  memorizing sidebar structure.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a compact search input and result menu to the private workspace
    topbar.
  - Build result rows from existing implemented routes only.
  - Include current state hints such as tasks, mappings, Drive files, selected
    ClickUp Lists, and API routes where available.
  - Support mouse selection, Enter-to-open, Escape-to-close, and filtered empty
    state.
  - Validate syntax, build, tests, desktop/mobile route rendering, and
    production smoke.
- Acceptance Criteria:
  - Signed-in users can search and open Dashboard, Areas, Relationships,
    Tasks, Pipeline, Account, Integrations, ClickUp, Drive, and API surfaces.
  - Result descriptions reflect existing frontend state and do not invent data.
  - Empty state appears when no module matches the query.
  - Keyboard Enter opens the first filtered result and Escape closes the menu.
  - Layout remains usable on desktop and mobile topbar widths.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies search, click navigation, Enter navigation, Escape
    close, empty state, and mobile layout.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added a private topbar module switcher that searches implemented console
    routes and opens modules without a full page reload.
  - Result rows include existing state hints for areas, relationships, tasks,
    pipeline records, ClickUp Lists, Drive files, and API routes.
  - Keyboard support covers Enter-to-open and Escape-to-close, with filtered
    empty-state copy and mobile viewport containment.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, `npm test`, and local Playwright module-switcher smoke.

## V2WEB-017 ClickUp List Tree Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable ClickUp List selection tree backed by
  implemented ClickUp discovery data.
- Goal: Make `/settings` usable when a ClickUp Workspace has many Spaces,
  Folders, and Lists by adding local list-selection filters without changing
  ClickUp backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and selected-state controls above the ClickUp List tree.
  - Filter existing discovered ClickUp Lists client-side by Space, Folder, and
    List name.
  - Preserve existing checkbox selection, select all, clear all, save, and sync
    behavior.
  - Update list summary and empty states to distinguish no loaded Lists from no
    filter matches.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings` supports search across ClickUp Space, Folder, and List names.
  - Selected-state filtering shows all, selected, or unselected Lists without
    reloading.
  - Summary reflects filtered count versus loaded count and selected count.
  - Empty state explains when filters hide all loaded Lists.
  - Existing list checkbox selection and save/sync enablement still work.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies list search, selected filtering, filtered empty
    state, checkbox persistence, and save enablement on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added a searchable ClickUp List filter bar in `/settings` with search
    across Space, Folder, and List names plus all/selected/unselected filters.
  - Preserved existing selected List IDs, select-all, clear, save, and sync
    enablement while updating the summary to show visible versus loaded Lists.
  - Fixed the ClickUp setup panel enabled state so `aria-disabled` matches the
    active controls for browser automation and assistive technology.
  - Validation passed: `node --check public/app.js`, `git diff --check`,
    `npm run build`, `npm test`, and local Playwright ClickUp list filter
    smoke.

## V2WEB-016 API Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable API route workbench backed by the
  implemented adapter manifest returned by `/v1/connection`.
- Goal: Make `/settings/api` useful for agents, adapters, and internal tools by
  showing implemented API routes as searchable workbench rows instead of only
  static capability badges.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Store the existing `adapterManifest` from `/v1/connection` in frontend
    state.
  - Add search and method filters to `/settings/api`.
  - Flatten implemented adapter manifest route groups into one route workbench.
  - Preserve the existing capability badge list.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings/api` supports search across route group, method, path, and
    capability.
  - Method filtering updates route rows without reloading.
  - Summary reflects filtered count versus total implemented API routes.
  - Empty state explains when filters hide all API routes.
  - Existing capability badges still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies API search, method filtering, filtered empty state,
    and capability badges on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Stored the existing `adapterManifest` from `/v1/connection` in frontend
    state.
  - Added a searchable route workbench to `/settings/api`.
  - Added method filtering for implemented API manifest routes.
  - Flattened adapter manifest route groups into readable route rows with
    method, path, group, and capability context.
  - Preserved the existing capability badge list.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified API route search, method filtering, filtered
    empty state, and capability badges on desktop.

## V2WEB-015 Google Drive Files Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable imported Drive file table backed by
  implemented Google Drive metadata.
- Goal: Make `/settings/drive` usable after importing many folders and files by
  adding local filters without changing Google Drive backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search, kind, operating-area, and scan-status controls above the
    imported Drive files table.
  - Filter existing `/v1/google-drive/files` data client-side.
  - Keep Drive folder assignment selectors in the filtered table rows.
  - Update summary and empty states to distinguish no imported files from no
    filter matches.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings/drive` supports search across file name, kind, area, scan
    status, and modified date.
  - Kind, operating-area, and scan-status filters update the table without
    reloading.
  - Summary reflects filtered count versus total imported Drive items.
  - Empty state explains when filters hide all imported Drive items.
  - Existing folder assignment selectors still render in filtered rows.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies search, kind filtering, scan filtering, filtered
    empty state, and folder assignment selectors on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added Drive file search plus kind, operating-area, and scan-status filters
    to `/settings/drive`.
  - Filtered existing `/v1/google-drive/files` data client-side without
    changing backend contracts.
  - Updated Drive file summary to show filtered count versus total imported
    Drive items.
  - Added a filter-specific empty state when no imported Drive item matches the
    current controls.
  - Preserved folder assignment selectors in filtered table rows.
  - Corrected the Google Drive panel `aria-disabled` state so signed-in filter
    controls are accessible and browser-testable.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified Drive search, folder filtering, scan filtering,
    filtered empty state, and folder assignment selectors on desktop.

## V2WEB-014 Integration Matrix Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable integration operating-area matrix
  backed by implemented workspace data.
- Goal: Make `/settings/integrations` usable as a control-map view when the
  company has many areas, mappings, Drive folders, and records.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and data-type controls to the operating-area data map.
  - Filter existing area rows client-side by area label, table names, provider
    mappings, Drive files, and record counts.
  - Keep implemented integration/data group cards visible.
  - Use the established `areaId` mapping relation when counting provider
    mappings.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/settings/integrations` supports search across operating-area matrix rows.
  - Data-type filtering shows only rows with tables, records, mappings, or
    Drive items as selected.
  - Matrix summary reflects filtered count versus total operating areas.
  - Empty state explains when filters hide all matrix rows.
  - Existing integration group cards and "Correct mapping" link still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies matrix search, data-type filtering, filtered empty
    state, and the provider mapping count on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added integration matrix search and data-type filters to
    `/settings/integrations`.
  - Filtered existing operating-area rows client-side by area labels, table
    names, provider mappings, Drive files, and selected metric type.
  - Updated the matrix summary to show filtered count versus total operating
    areas.
  - Added a filter-specific empty state when no operating-area row matches the
    current controls.
  - Corrected provider mapping counts in the matrix by honoring the established
    `areaId` relation, with compatibility for older `operatingAreaId` and
    table-level mappings.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified matrix search, provider-mapping type filtering,
    filtered empty state, and mapping count on desktop.

## V2WEB-013 Operating Area Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable selected-area workbench feed backed by
  implemented operating model data.
- Goal: Make `/areas` easier to use as the place where owners browse one
  business area and correct provider or Drive relationships without hunting
  through separate columns.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search and content-type controls to the selected area detail.
  - Normalize existing area tables, Drive files, provider mappings, and table
    record previews into one local area workbench feed.
  - Preserve existing columns and relationship assignment selectors.
  - Reuse current scope editor endpoints for Drive folders and provider
    mappings inside the workbench feed.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/areas` supports search across visible selected-area content.
  - Content-type filtering updates the selected-area workbench without reloading.
  - Summary reflects filtered count versus total selected-area workbench items.
  - Empty state explains when filters hide all selected-area items.
  - Existing area columns and assignment selectors still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies area search, type filtering, empty filtered state,
    and existing assignment selectors on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added selected-area search and content-type filters to `/areas`.
  - Added a unified area workbench feed over existing mapped tables, Drive
    items, provider mappings, and table record previews.
  - Reused current Drive and provider mapping scope editors inside the
    workbench feed so relationship correction remains available from the
    selected business area.
  - Updated selected-area summary to show filtered count versus total
    workbench items.
  - Added a filter-specific empty state when no selected-area item matches the
    current controls.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified area search, mapping type filtering, filtered
    empty state, Drive assignment selector, and provider mapping selector on
    desktop.

## V2WEB-012 Pipeline Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: searchable shared pipeline workbench feed backed
  by implemented pipeline stage and CRM usage tables.
- Goal: Make `/pipeline` useful once shared pipeline and CRM usage records grow
  by adding a unified feed, search, and filters without adding backend
  contracts or placeholder data.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search, record-type, and status controls to `/pipeline`.
  - Normalize existing `clients`, `pipeline-stages`, `deals`, and
    `interactions` records into one local workbench feed.
  - Keep the existing overview cards and type-specific lists visible.
  - Update summary and empty states to distinguish no records from no filter
    matches.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/pipeline` supports search across visible shared pipeline and CRM usage
    fields.
  - Record-type and status filters update the feed without reloading.
  - Summary reflects filtered count versus total implemented records.
  - Empty state explains when filters hide all pipeline records.
  - Existing pipeline overview lists still render from implemented tables.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies filters and filtered feed rows on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added pipeline search plus record-type and status filters to `/pipeline`.
  - Added a unified workbench feed normalized from existing `clients`,
    `pipeline-stages`, `deals`, and `interactions` records.
  - Updated pipeline summary to show filtered count versus total implemented
    records.
  - Added a filter-specific empty state when no pipeline record matches the
    current controls.
  - Kept the existing overview cards and type-specific lists intact.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified search, type filtering, status filtering,
    filtered empty state, and matching filtered feed rows on desktop.

## V2WEB-011 Task Workbench Filters

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: task workbench controls for searching and
  filtering implemented task records.
- Goal: Make `/tasks-adapter` usable once ClickUp imports many tasks by adding
  local search and filters without changing backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add search, status, source, and list filters to `/tasks-adapter`.
  - Filter the existing `/v1/tasks` data client-side.
  - Update summary and empty states to distinguish no tasks from no filter
    matches.
  - Keep refresh and ClickUp settings actions in the same workbench surface.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - `/tasks-adapter` supports search by title/status/list/source.
  - Status, source, and task-list filters update the table without reloading.
  - Summary reflects filtered count versus total count.
  - Empty state explains when filters hide all tasks.
  - Existing task refresh still works.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies filters and filtered table rows on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added task search plus status, source, and task-list filters to
    `/tasks-adapter`.
  - Implemented client-side filtering against existing `/v1/tasks` data only.
  - Updated task summary to show filtered count versus total count.
  - Added a filter-specific empty state when no task matches the current
    controls.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified search, source filtering, empty filtered state,
    and matching filtered rows on desktop.

## V2WEB-010 Relationship Review Center

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/relationships` owner-console view
  for reviewing and correcting implemented provider and Drive area
  assignments.
- Goal: Make relationship correction a first-class workflow so owners can
  quickly move ClickUp mappings and Drive folders into the right operating
  area.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/relationships` to authenticated frontend and Express web routes.
  - Add signed-in navigation and dashboard links for relationship review.
  - Render a review queue for unmapped provider mappings and unassigned Drive
    folders.
  - Render all implemented provider and Drive relationships with existing area
    selectors.
  - Reuse existing scope update endpoints and validation.
- Acceptance Criteria:
  - Signed-in navigation includes `Relationships`.
  - `/relationships` shows a review queue when mappings or Drive folders need
    assignment.
  - Owners can use the existing area selectors from this route.
  - Empty states are clear when everything is mapped.
  - Existing `/areas` mapping controls still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/relationships`, queue rows, assignment selectors,
    and dashboard links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/relationships` to authenticated frontend and Express web routes.
  - Added sidebar, dashboard module, and next-action links to the relationship
    review center.
  - Added a review queue for unassigned provider mappings and Drive folders.
  - Added provider mapping and Drive folder lists that reuse the existing area
    selectors and scope update endpoints.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified `/relationships`, queue rows, provider rows,
    Drive rows, assignment selectors, active navigation, and dashboard links.

## V2WEB-009 Account Settings View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/settings/account` owner-console view
  for signed-in user and workspace context.
- Goal: Complete the first Settings information architecture with account,
  integrations, ClickUp, Drive, and API surfaces backed by implemented data.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/settings/account` to authenticated frontend and Express web routes.
  - Add signed-in navigation and settings links to account settings.
  - Render user, workspace, session, and integration readiness using existing
    connection state only.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes `Account`.
  - `/settings/account` renders owner and workspace context after sign-in.
  - Account settings link to implemented integration and API settings routes.
  - Existing settings routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/settings/account`, account cards, and settings
    links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/settings/account` to the authenticated frontend route list, signed
    in navigation, topbar actions, dashboard actions, and Express web app route
    allowlist.
  - Rendered owner name/email, workspace name/id, session readiness, and links
    to implemented settings surfaces using existing connection state.
  - Updated connection hydration so the owner user returned by `/v1/connection`
    is available after direct route refresh.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified `/settings/account`, owner/workspace cards,
    readiness links, and active navigation on desktop.

## V2WEB-008 Dashboard Command Center

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dashboard command-center polish that surfaces
  attention items, module counts, and the next recommended action from
  implemented data.
- Goal: Make the signed-in landing screen immediately usable as the company
  control point instead of a static link hub.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a dashboard attention panel that uses existing task, Drive,
    integration, and mapping state.
  - Add live module metadata to dashboard module links.
  - Add a recommended next action message based on implemented readiness gaps.
  - Keep all actions linked to existing routes.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Dashboard explains what matters now after sign-in.
  - Attention items are data-driven and have links to existing implemented
    routes.
  - Module links show useful counts rather than generic descriptions only.
  - The next action updates when ClickUp, Drive, mapping, task, or pipeline data
    is available.
  - Existing module routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies dashboard attention items, module metadata, and
    route links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added a dashboard command-center attention panel driven by existing
    ClickUp, Drive, task, pipeline, and operating-model state.
  - Added live module metadata to dashboard links for areas, tasks, pipeline,
    Drive, ClickUp, and integration taxonomy.
  - Added a recommended next action that prioritizes connection gaps, unmapped
    provider mappings, unassigned Drive folders, due tasks, and empty pipeline
    data.
  - Kept every action linked to an existing implemented route.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified dashboard attention items, module metadata,
    next-action copy, active navigation, and route links on desktop.

## V2WEB-007 Dedicated Pipeline View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/pipeline` owner-console route that
  reuses implemented CompanyCore shared pipeline and CRM usage tables.
- Goal: Add the first pipeline module surface using existing clients,
  pipeline stages, deals, and interactions data without adding new backend
  behavior.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/pipeline` to authenticated web routes and signed-in navigation.
  - Render shared pipeline and CRM usage summary cards from existing database
    snapshots.
  - Render compact lists for stages, deals, clients, and interactions.
  - Link dashboard and integration taxonomy to the implemented pipeline view.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes `Pipeline`.
  - `/pipeline` renders existing implemented shared pipeline and CRM usage
    records.
  - Empty states are clear when no shared pipeline or CRM usage records exist.
  - No placeholder provider integration or unimplemented pipeline write flow is
    introduced.
  - Existing `/settings/integrations`, `/tasks-adapter`, `/areas`, and
    settings routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/pipeline`, summary cards, record lists, and
    dashboard links on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/pipeline` to the authenticated frontend route list, signed-in
    navigation, dashboard links, integration taxonomy links, and Express web
    app route allowlist.
  - Added pipeline summary cards for clients, stages, deals, and interactions
    using existing CompanyCore table snapshots.
  - Added compact lists for implemented pipeline stages, deals, clients, and
    interactions with clear empty states.
  - Introduced no new backend contracts, provider integrations, or unimplemented
    write flows.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/pipeline`, summary cards, record lists,
    active navigation, and dashboard links.

## V2WEB-006 Settings Integration Taxonomy View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/settings/integrations` owner-console
  route that groups already implemented integrations and data paths by data
  type and company operating area.
- Goal: Make Settings usable as a control center for implemented integrations
  without adding unimplemented provider behavior or changing backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/settings/integrations` to authenticated web routes and navigation.
  - Render implemented integration/data groups for tasks, Drive files, API
    capabilities, and pipeline/CRM data.
  - Render an operating-area matrix showing existing tables, provider mappings,
    and Drive files per area.
  - Link each group to the already implemented module/configuration route.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes an integration taxonomy entry.
  - `/settings/integrations` shows only implemented data paths.
  - Integration groups link to existing routes instead of placeholder pages.
  - The area matrix reflects the current operating model and imported Drive or
    provider mapping data.
  - Existing `/settings`, `/settings/drive`, `/settings/api`,
    `/tasks-adapter`, and `/areas` routes still render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/settings/integrations` and dashboard links render
    on desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/settings/integrations` to the authenticated frontend route list,
    signed-in navigation, dashboard module links, and Express web app route
    allowlist.
  - Added integration group cards for implemented task, Drive, pipeline/CRM,
    and API data paths only.
  - Added an operating-area matrix that summarizes implemented tables,
    database records, provider mappings, and Drive records per area.
  - Linked every group to an existing implemented route instead of a
    placeholder module.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/settings/integrations`, active
    navigation, integration cards, area rows, and dashboard links.

## V2WEB-005 Dedicated Tasks Adapter View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/tasks-adapter` owner-console route that
  reuses the implemented `/v1/tasks` data path and keeps dashboard as a
  summary/navigation surface.
- Goal: Move task and ClickUp adapter data toward the target module
  architecture without inventing new backend contracts.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/tasks-adapter` to authenticated web routes and signed-in navigation.
  - Move the existing implemented task table out of dashboard into the new
    route.
  - Add compact task summary cards for total, ClickUp, open, and due-soon
    records.
  - Keep links back to ClickUp settings so adapter configuration remains
    discoverable.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes `Tasks & adapters`.
  - `/tasks-adapter` renders the implemented task records from `/v1/tasks`.
  - Dashboard links to `/tasks-adapter` but no longer owns the task table
    surface.
  - Direct refresh of `/tasks-adapter` returns the SPA shell.
  - Legacy API `/tasks` remains protected API-compatible.
  - Task table rendering does not inject provider-controlled fields as HTML.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/tasks-adapter` and `/dashboard` render on
    desktop.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/tasks-adapter` to the authenticated frontend route list and Express
    web app route allowlist.
  - Moved the implemented task table out of the dashboard into a dedicated
    Tasks & adapters view.
  - Added total, ClickUp, open, and due-soon task stat cards.
  - Preserved legacy protected API `/tasks` by avoiding a web route collision;
    the GUI reads the implemented `/v1/tasks` endpoint.
  - Replaced provider-controlled task table HTML injection with text-node cell
    rendering.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/tasks-adapter` route rendering,
    active navigation, task rows, summary stats, and dashboard module links.

## UXA-019 React Areas Mapping Parity Slice

- Task Type: frontend
- Current Stage: done
- Deliverable For This Stage: mapping/action parity signals on
  `/react-areas`, without replacing canonical `/areas`.
- Goal: Move the React areas workbench closer to canonical parity by exposing
  provider scope, Drive folder scope, and ClickUp execution-scope signals with
  explicit links to the current owner actions.
- Scope:
  - `web/src/main.tsx`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Inspect the current `/v1/connection` data available to React areas.
  - Add mapping signal cards using existing area/table/provider, ClickUp, Drive,
    and capability data.
  - Link each signal to the current canonical action surface:
    `/relationships`, `/settings/drive`, `/settings`, and `/areas`.
  - Preserve canonical `/areas` and avoid adding backend endpoints in this
    slice.
  - Validate build, Docker runtime, signed-in `/react-areas`, desktop/mobile
    overflow, and integration tests.
- Acceptance Criteria:
  - [x] `/react-areas` shows provider scope mapping signal.
  - [x] `/react-areas` shows Drive folder scope signal.
  - [x] `/react-areas` shows ClickUp execution scope signal.
  - [x] Signals link to existing canonical owner actions.
  - [x] No canonical route replacement is performed.
  - [x] Desktop and mobile render without horizontal overflow.
- Definition of Done:
  - `npm run build`, Docker rebuild, Docker seed, targeted Playwright route
    checks, Docker migration/test gate, and `git diff --check` pass.
  - Project state, task board, next-steps, system health, and next-commits docs
    are updated.
- Result Report:
  - Added mapping parity signal cards to `/react-areas`.
  - Preserved canonical `/areas` and all existing vanilla mapping/editing
    routes.
  - `npm run build` passed.
  - Docker rebuild, seed, signed-in Playwright checks, desktop/mobile overflow
    checks, and Docker migration/test gate passed.

## UXA-018 React Canonical Route Switch Decision

- Task Type: architecture/frontend-decision
- Current Stage: done
- Deliverable For This Stage: canonical route switch decision after three
  parallel React workbenches.
- Goal: Decide whether `/react-areas`, `/react-tasks`, or
  `/react-integrations` can safely replace the matching canonical vanilla
  route now, or whether another parity slice is required first.
- Scope:
  - `public/app.js`
  - `web/src/main.tsx`
  - `web/src/react-route-kit.tsx`
  - `docs/planning/web-console-v2-task-contracts.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
- Decision:
  - Do not switch any canonical vanilla route to React yet.
  - `/react-tasks` has strong read/filter parity, but canonical task work still
    depends on `/data/tasks` for create/update/archive.
  - `/react-integrations` has strong readiness and coverage parity, but
    canonical integration management still depends on `/settings`,
    `/settings/drive`, `/relationships`, and scope-editing controls.
  - `/react-areas` has strong read/coverage parity, but canonical `/areas`
    still owns operating-area selection context and provider/Drive scope
    mapping affordances through shared vanilla state.
  - The next safe slice is a focused React areas parity task that adds
    relationship/provider scope signals and explicit links to current mapping
    actions before any route replacement.
- Implementation Plan:
  - Compare each React workbench to its canonical vanilla counterpart.
  - Identify missing action and setup ownership for each candidate.
  - Record the no-switch decision and the reason in planning/state docs.
  - Queue the smallest parity slice that can move one route closer to
    replacement without breaking current owner workflows.
- Acceptance Criteria:
  - [x] Decision names whether a canonical route switch is approved.
  - [x] Decision evaluates `/react-tasks`, `/react-integrations`, and
    `/react-areas`.
  - [x] Decision records missing parity risks.
  - [x] Next task is a concrete small implementation slice.
  - [x] No runtime route switch is performed in this decision task.
- Validation Evidence:
  - Source review:
    - `public/app.js` still owns typed data editors, provider setup,
      relationship review, Drive setup/import, and scope-editing controls.
    - `web/src/main.tsx` owns React read/filter workbench surfaces for tasks,
      integrations, Company OS, and areas.
  - `git diff --check`: pending final check.
- Result Report:
  - Decision: keep `/tasks-adapter`, `/settings/integrations`, and `/areas`
    canonical for now.
  - Reason: React routes are safe read/inspection workbenches, but canonical
    owner workflows still depend on vanilla edit/setup/mapping controls.
  - Next step: UXA-019 React Areas Mapping Parity Slice.

## UXA-017 React Workbench Third Route Candidate

- Task Type: frontend
- Current Stage: done
- Deliverable For This Stage: parallel React `/react-areas` workbench backed
  by existing owner connection data.
- Goal: Prove the shared React route kit can support a third dense management
  route before making any canonical route switch decision.
- Scope:
  - `web/src/react-route-kit.tsx`
  - `web/src/main.tsx`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `.agents/state/current-focus.md`
  - `.agents/state/next-steps.md`
  - `.agents/state/system-health.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add a route-kit state hook for operating-area workbench loading.
  - Add `/react-areas` to the backend static React route allowlist.
  - Build a React operating-area surface with signed-out, loading, error, and
    ready states.
  - Reuse shared Shell, MetricCard, LocalNotice, and DataTable primitives.
  - Verify signed-out and signed-in route rendering, desktop/mobile overflow,
    build, Docker runtime, and integration tests.
- Acceptance Criteria:
  - `/react-areas` renders through the backend route allowlist.
  - Signed-out state routes the owner to login.
  - Signed-in state reads live `/v1/connection` data.
  - The page exposes operating-area metrics, readiness, filters, coverage
    cards, and a table of area/table/provider ownership.
  - The current vanilla `/areas` route remains available.
  - Desktop and mobile render without horizontal overflow or route-level
    console/API failures.
- Definition of Done:
  - `npm run build`, Docker rebuild, targeted Playwright route checks, Docker
    migration/test gate, and `git diff --check` pass.
  - Project state, task board, next-steps, system health, and next-commits docs
    are updated.
- Result Report:
  - Added `/react-areas` as a parallel React operating-area workbench.
  - Added `useAreasWorkbenchState` to the shared React route kit.
  - Added route-level signed-out/loading/error/ready states, metrics,
    readiness notice, coverage cards, filters, and table rendering.
  - Preserved canonical vanilla `/areas`.
  - `npm run build` passed.
  - Docker rebuild, seed, signed-out/signed-in Playwright checks, desktop and
    mobile overflow checks, and Docker migration/test gate passed.

## V2WEB-004 Dedicated Operating Areas View

- Task Type: design/frontend
- Current Stage: done
- Deliverable For This Stage: dedicated `/areas` owner-console route that
  reuses the existing operating-map data and manual mapping controls without
  changing backend contracts.
- Goal: Move the 12-area company operating map toward the target information
  architecture by giving operating areas their own module view while keeping
  the dashboard focused on summary and navigation.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/web-console-v2-task-contracts.md`
- Implementation Plan:
  - Add `/areas` to the authenticated web route allowlist and signed-in
    navigation.
  - Move the existing operating-map panel into a dedicated `/areas` view,
    preserving all DOM IDs used by current render and mapping logic.
  - Replace the dashboard embedded map with a concise module launch panel that
    links to the new route.
  - Validate JavaScript syntax, build, integration tests, and desktop/mobile
    route rendering.
- Acceptance Criteria:
  - Signed-in navigation includes `Operating areas` as its own route.
  - `/areas` renders the existing 12-area operating map and manual mapping
    controls.
  - Dashboard remains a summary surface with a clear link to `/areas`.
  - Existing `/settings`, `/settings/drive`, and `/settings/api` routes still
    render.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Browser smoke verifies `/dashboard` and `/areas` render on desktop and
    mobile.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/areas` to the authenticated frontend route list and Express web
    app route allowlist.
  - Moved the existing operating map into a dedicated Operating Areas view
    without changing backend contracts or duplicating mapping logic.
  - Replaced the dashboard embedded map with a module launch panel linking to
    Operating Areas, ClickUp settings, and Google Drive.
  - Preserved the existing manual provider/Drive area selectors because the
    original operating-map DOM IDs remain single-owner in the new route.
  - Verified direct `/areas` refresh returns `index.html` instead of falling
    through to protected API auth.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Playwright smoke verified desktop `/areas`, desktop `/dashboard`, and
    mobile sidebar behavior.

## V2WEB-002 Manual Provider Scope Mapping

- Task Type: frontend/backend-integration
- Current Stage: done
- Deliverable For This Stage: editable provider-to-operating-area mapping in
  the owner web console, with API support for ClickUp mappings and Google Drive
  folders.
- Goal: Let the operator correct automatic integration mapping so ClickUp
  Lists/Folders/Spaces and Google Drive parent folders can be assigned to the
  right company area after import.
- Scope:
  - `public/app.js`
  - `public/styles.css`
  - `src/modules/operating-model/operating-model.routes.ts`
  - `src/modules/google-drive/google-drive.routes.ts`
  - `src/modules/connection/connection.routes.ts`
  - `src/operating-model/clickup-structure.ts`
  - `src/tests/api.test.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add owner API endpoints for updating an external provider mapping scope and
    a Google Drive file/folder scope.
  - Preserve manual ClickUp area overrides during future structure refreshes.
  - Persist Google Drive folder-to-area mappings in integration settings so
    future imports keep the selected area.
  - Add compact area selectors in the dashboard provider mapping and Drive
    folder lists.
  - Cover the new manifest capabilities, ClickUp mapping scope update, and
    Drive folder descendant update in integration tests.
- Acceptance Criteria:
  - An owner can move a ClickUp List mapping to another operating area.
  - The linked ClickUp operating table moves with the mapping.
  - Future ClickUp structure refreshes preserve the manual area override.
  - An owner can move a Google Drive folder to another operating area.
  - Existing Drive descendants move with the folder and the folder mapping is
    persisted for future imports.
  - Jarvis/Paperclip can discover the new write capabilities through
    `/v1/connection`.
- Definition of Done:
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` pass.
  - Dashboard controls use the existing operating-map design system.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `PATCH /v1/operating-model/external-mappings/:id/scope`.
  - Added `PATCH /v1/google-drive/files/:id/scope`.
  - Added adapter manifest capabilities for provider mapping writes and Drive
    file scope writes.
  - Added dashboard selectors for ClickUp provider mappings and Google Drive
    folders.
  - ClickUp manual area overrides are stored in mapping raw data and table
    sync policy, then preserved during structure refreshes.
  - Google Drive folder area choices update descendants and persist an
    `operatingScopeMappings` entry for future imports.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.

## V2WEB-001 Operating Map And Google Drive Console

- Task Type: frontend/backend-routing
- Current Stage: done
- Deliverable For This Stage: owner web console that exposes the 12 company
  areas, mapped CompanyCore tables, live database counts, ClickUp/Drive
  provider mappings, and Google Drive connection actions.
- Goal: Let an owner see how CompanyCore is filling the company database after
  ClickUp and Google Drive are connected.
- Scope:
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
  - `src/app.ts`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
  - `docs/planning/mvp-next-commits.md`
- Implementation Plan:
  - Add `/settings/drive` to the web app route allowlist.
  - Extend the dashboard with a 12-area company operating map that follows the
    provided folder-style visual reference.
  - Read `/v1/connection`, `/v1/operating-model`, `/v1/tasks`, and
    `/v1/google-drive/files` into one dashboard state.
  - Show CompanyCore table counts, provider mappings, Drive files, and record
    previews per operating area.
  - Add a Google Drive settings screen for OAuth URL generation, authorization
    code exchange, folder import, change reconciliation, and imported-file
    review.
  - Keep raw tokens and API keys out of UI output and docs.
- Acceptance Criteria:
  - Owner dashboard shows all 12 company areas.
  - Selecting an area updates tables, Drive files, mappings, and database
    preview without a page reload.
  - Google Drive settings support OAuth URL generation, code exchange, import,
    reconcile, and file refresh actions.
  - The web app can deep-link to `/settings/drive`.
  - Build and tests pass.
- Definition of Done:
  - `git diff --check`, `npm run build`, and `npm test` pass.
  - Browser smoke verifies dashboard and Drive settings render.
  - Project state, task board, and next-commits docs are updated.
- Result Report:
  - Added `/settings/drive` to the web app route allowlist and top navigation.
  - Added a dashboard operating map with 12 company areas in the operator's
    folder order: Strategy, Product, Sales, Operations, Relationships, People,
    Finance, Assets, Technology, Legal, Innovation, and Management.
  - Dashboard now combines the operating model, table counts, provider
    mappings, Drive files, and record previews from protected CompanyCore APIs.
  - Added Google Drive settings UI for OAuth URL generation, authorization-code
    exchange, folder import, change reconciliation, file refresh, and imported
    file review.
  - Verified desktop and mobile browser rendering with Playwright screenshots.
  - `node --check public/app.js`, `git diff --check`, `npm run build`, and
    `npm test` passed.
  - Deployed to production as backend image
    `rnqqkhl3o3dut4qv56mlxly2_backend:6b4d57a6e98159e64d9f065427e7201238b47ab5`.
  - Production public smoke passed for `/health`, `/v1/health`, web root, and
    `/settings/drive`.
  - Production protected smoke returned workspace `LuckySparrow`, 12 operating
    areas, 47 capabilities, Google Drive unconfigured, and 0 imported Drive
    files.
