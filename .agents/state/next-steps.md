# Next Steps

Last updated: 2026-05-17

## NOW

1. Continue V1 department systems with `DMS-NEXT-004` Relationships Management
   read packet and board, unless deployment smoke is selected first.
   - Source:
     `docs/planning/companycore-00-04-08-operating-loop-plan.md`.
   - `CC-UI-001`, `CC-00-001`, `CC-04-001`, and `CC-08-001` are now complete
     as planning/analysis checkpoints with task contracts and diff hygiene.
   - `CC-UI-002` shared action/button primitive and `CC-UI-003` shared
     table/list primitive are complete.
   - `CC-00-002` route proposal lifecycle readback API is complete and
     verified with `npm run test:api` against disposable PostgreSQL.
   - `CC-04-002` Operations task read model v1 is complete and verified with
     `npm run test:api` against disposable PostgreSQL.
   - `CC-08-002` Assets context read API is complete and verified with
     `npm run test:api` against disposable PostgreSQL.
   - `CC-UI-004` selected-area UI adoption is complete and verified:
     `00 Main` consumes route proposal lifecycle readback, `04 Operations`
     consumes Operations work items, and `08 Assets` consumes Assets context
     through shared `CcDataTable`/`CcButton` paths.
   - `CC-AUDIT-001` architecture/UX audit is complete and verified:
     successful auth and `/dashboard` now open
     `/areas?area=00-ogolny&view=overview`, so `00 Ogolny` is the company
     dashboard after login. Evidence screenshots live under
     `docs/ux/evidence/cc-audit-001-*.png`.
   - `WEB-CORE-001` web cleanup is complete and verified: the active web
     runtime now contains only public home, auth, `00 General`, `04
     Operations`, and `08 Assets`; old private workbench paths are no longer
     React app routes while backend APIs remain available.
    - `WEB-QA-001` is complete and verified: active React web now has
      default-English i18n, selectable/persisted Polish, `<html lang>` sync,
      typed API errors, friendly auth and packet errors, shared notice feedback,
      shared form fields, localized validation, translated table states, and a
      layout/auth/department/API module split. Its post-implementation audit
      also fixed locale contract extraction, planned department label
      localization, and API error normalization for string, nested, and backend
      `internal_server_error` payloads.
    - `WEB-SIDEBAR-001` is complete and verified: authenticated sidebar now
      shows logo/name, company/workspace selector, all `00`-`12` departments,
      disabled planned modules, active `00/04/08` dashboard links, and separate
      expand arrows for active module view lists.
    - `OPS-BOARD-001` is complete and verified: `04 Operations -> Tasks` now
      uses the Operations work-item packet as a list board with task-list
      selection, canonical CompanyCore status columns, task cards, and a modal
      edit form backed by `PATCH /v1/operations/work-items/:id`.
    - `OPS-BOARD-UX-001` is complete and verified: the authenticated shell is
      full width for management views, the sidebar scrolls independently, the
      Operations board starts with `All`, uses stable status lanes, shows
      visual priority/due/readiness signals, hides technical blocked-action
      diagnostics from the owner board, and adds the first calendar view.
    - `OPS-MGMT-002` is complete with partial database-test confidence:
      Operations now has one canonical task board, department-grouped task
      lists, editable list metadata and department assignment, drag/drop status
      movement, and day/week/month calendar modes. `npm run validate` and
      Playwright proof passed; rerun `npm run test:api` when local
      Docker/PostgreSQL validation is healthy.
    - `OPS-DEPT-FILTER-001` is complete with partial database-test confidence:
      Operations now displays and assigns task lists through canonical
      `00`-`12` departments instead of legacy operating-area names, and board
      plus Calendar filters support multi-list checkbox selection.
    - `ASSETS-FOLDERS-002` is complete with partial database-test confidence:
      `08 Assets -> Files and folders` now uses root folder source filters,
      renders a collapsible Drive folder/file tree, and edits folder name,
      parent, and root-only department assignment through
      `PATCH /v1/assets/folders/:id`. Rerun `npm run test:api` when local
      PostgreSQL validation is configured, then production-smoke the real Drive
      tree after deploy.
    - `OPS-ASSETS-POLISH-001` is complete and verified locally: Operations
      Calendar keeps undated tasks visible, `Today` opens day mode, empty list
      selection has a clear state, and Assets files/folders has stronger file
      cards plus a content-first preview panel. `npm run build:web`, `npm run
      validate`, `git diff --check`, and mocked desktop/mobile Playwright
      proof passed.
    - `OPS-ASSETS-REFINE-002` is complete and verified locally: the shared
      selector now supports search/no-match states, Operations Calendar has
      Workflow access and empty-selection parity, and Assets previews show
      resource path/source/depth context. `npm run build:web`, `npm run
      validate`, `git diff --check`, and mocked Playwright proofs passed.
    - `OPS-ASSETS-DENSE-003` is complete and verified locally: Tasks and
      Calendar share one task text/priority filter, and Assets files/folders
      can sort visible cards by name, modified date, type, or source.
    - `OPS-ASSETS-FILTER-004` is complete and verified locally: Operations
      Tasks/Calendar and Assets Files/Folders now have recoverable
      filtered-empty states with clear-filter actions.
    - `OPS-ASSETS-SMART-005` is complete and verified locally: Operations
      Tasks/Calendar now share due-date scope filtering, and Assets
      Files/Folders can filter by preview type including folders, Markdown,
      CSV, JSON, images, PDF, text, and unsupported files.
   - CompanyCore remains the company operating system; AI agents remain
     external API/MCP clients.
   - Keep writes behind explicit command contracts, audit/events, and API
     tests.
   - Next department work must first reintroduce any needed web surface through
     the route registry, a task contract, and the same selected-area packet
     pattern instead of restoring old page-local workbenches.

## NEXT

1. Unified Organizational OS backend program after current active work.
   - Source:
     `docs/planning/unified-org-backend-implementation-program.md`.
   - Do not move it ahead of the current DMS/web queue unless the owner
     explicitly switches focus.
   - First execution sequence:
     `UOS-BE-001 Current Backend Capability Audit`,
     `UOS-BE-002 Organizational Contract Types`,
     `UOS-BE-010 Workforce Read Packet Without Migration`,
     `UOS-BE-011 People/Agents Authority Packet For 06`,
     and `UOS-BE-012 Workforce Schema Decision`.
   - Goal: make the backend expose one organizational world state for humans
     and AI agents, then let web/mobile/MCP consume the same contracts without
     duplicating HR, agent, task, permission, or department subsystems.
2. Backend-first implementation rules for the UOS program.
   - Start with audits, read packets, and DTO contracts before migrations.
   - Add schema only after read packet evidence proves the exact need.
   - Add frontend only where active `00`, `04`, or `08` routes need it to
     consume a verified backend contract.
   - Add MCP tools/resources only from the same API contracts, with capability
     filtering, blocked actions, approval metadata, events, and audit.
3. Canonical Department Settings module.
   - Source:
     `docs/planning/operations-canonical-department-filtering-task-contract.md`.
   - Goal: expose owner-facing workspace settings for canonical departments:
     display name, hierarchy/order number, icon, description, and resource
     ownership rules, while preserving backend operating-area compatibility.
4. Use the CompanyCore business module map during upcoming product intake.
   - Source: `docs/architecture/companycore-business-module-map.md`.
   - Apply it before settings, Drive, ClickUp, CRM, pipeline, knowledge,
     resource, or agent work so each slice is classified as native core,
     provider-backed, future adapter, or derived view.
   - This is a planning guardrail, not a runtime task that displaces the next
     production proof.
4. Use the CompanyCore global business flow during upcoming CRM, marketing,
   delivery, finance, support, feedback, graph, dashboard, or AI-agent intake.
   - Source: `docs/architecture/companycore-global-business-flow.md`.
   - Map the request to the 13-stage value pipeline before adding runtime
     surfaces.
   - Start with read models and visualization before adding write behavior,
     billing/payment commands, survey flows, or generic graph relations.
5. Use the department management systems architecture before generating or
   implementing department views.
   - Source: `docs/architecture/department-management-systems-architecture.md`.
   - Detailed blueprint:
     `docs/architecture/department-management-systems-v1-blueprint.md`.
   - View map: `docs/ux/v1-department-management-systems-view-map.md`.
   - Prompt pack: `docs/ux/v1-department-system-prompt-pack.md`.
   - Generate one department spec at a time, then implement one read-only
     department shell before adding writes.
6. Review and apply the Department Management Systems V1 Blueprint.
   - Source:
     `docs/architecture/department-management-systems-v1-blueprint.md`.
   - It defines `00 Main` orchestration, the 12 operating department systems,
     implementation waves, backend gap register, Paperclip/agent packets, and
     recommended build order.
   - Recommended order after user review: deepen `04 Operations`, then build
     read-only `01 Strategy`, `03 Sales`, `05 Relationships`, and
     `02 Product And Delivery` systems.
7. Use the V1 Department Systems Global Implementation Plan.
   - Source:
     `docs/planning/v1-department-systems-global-implementation-plan.md`.
   - Follow its waves and task IDs for web, backend, Paperclip, QA,
     production, and closeout work.
8. Plan the minimum company control loop command layer.
   - Source:
     `docs/architecture/department-management-systems-v1-blueprint.md`.
   - `00 Main` is the global intake for owner ideas, client requests,
     documents, tasks, risks, bugs, opportunities, Paperclip background
     outputs, feedback, and improvement signals.
   - First backend implementation is `GET /v1/intake`; first web
     implementation is the verified `00 Main` read-only panel. DMS-00-006 now
     implements proposal-only classification and routing; the next AI-facing
     proof is DMS-00-007.
9. Implement pricing, discounts, current client work, and archived clients from
   the completed inventory.
   - Source:
     `docs/planning/dms-money-pricing-discount-source-inventory.md`.
   - Use `DMS-07-001`, `DMS-03-005`, `DMS-03-006`, and `DMS-05-002` as the
     next scoped steps. Keep agents in analysis/proposal mode until pricing,
     invoice, payment, and discount write contracts are explicit.
10. Production smoke for the locally verified V1 routes is complete.
   - Source:
     `docs/planning/v1-production-smoke-rollout-task-contract.md`.
   - Production now runs
     `5f1fc71e44d09cb1780d29b2579c85023205efb9`; authenticated smoke covered
     `/operations`, `/tasks-adapter`, AOG, settings, `/data`, `04 Operacje`,
     and `/react-company-os`.
11. AOG-BE-002 through AOG-BE-006 backend graph follow-ups.
   - After deployed AOG read proof is complete, plan and implement:
     `Target.metricId`,
     goal/workflow bridge, normalized workflow-task links, knowledge/source
     link contract, and read-only MCP exposure. Keep write relations
     command-shaped and avoid generic edge CRUD.
12. AGRUN-010 Upstream Agent Source Merge Execution.
   - Blocked until upstream write access or an approved fork/PR route exists.
13. Production push-to-running-image smoke after the next deploy.
   - Build metadata restoration is implemented locally; after deploy, compare
     public `/health` `build.commit` with the pushed commit before claiming
     auto-deploy proof.
14. Production AOG/settings smoke.
   - After the next deploy, compare public `/health` build metadata with the
     pushed commit.
   - Smoke `/v1/operating-graph/areas/01-strategia` and authenticated settings
     before raising production confidence.
15. V1 operations route-depth slices.
   - Deepen one existing-contract workbench from the operations cockpit:
     compatibility alias cleanup, then one department-specific read model or
     safe command contract.
16. Production smoke for locally verified V1 command surfaces.
   - After the next deploy, compare public `/health` build metadata with the
     pushed commit.
   - Smoke `/v1/operating-graph/areas/01-strategia`, authenticated settings,
     authenticated `/operations`, and authenticated `/tasks-adapter`.
17. V1AREA capability actions.
   - Add create/edit/filter actions only where an existing backend contract
     already supports the selected capability safely.
18. Resume broader department sequencing after `WEB-QA-001` and the
    `00 -> 04 -> 08`
    checkpoint.
   - `03 Sales` is locally verified. The broader next sequence remains
     `05 Relationships`, `02 Product And Delivery`, `09 Technology/AI`, and
     `10 Legal/Standards`, unless the owner updates the focus again.

## LATER

1. V1X-PAPERCLIP-ASSISTANT-001 Paperclip corner assistant concept.
   - Source:
     `docs/planning/v1x-paperclip-corner-assistant-task-contract.md`.
   - Future V1.x candidate: a small virtual helper/communicator in the corner
     of the CompanyCore panel, exposing Paperclip as a supervised conversation
     and integration bridge for ClickUp, Google Drive, and later providers.
   - Keep it out of active implementation until a UX spec, architecture
     decision, permission model, and AI-safety test plan exist.
2. ACF-UX-002 Company City Dashboard / Gamified Strategic Map.
   - Deferred to V2 readiness gate.
3. ACF-OPS-001 Auto-Deploy Proof Or Manual Path Acceptance.
4. ACF-QA-001 Lint And Split Test Gates.
5. AGRUN-010 Upstream Agent Source Merge Execution, blocked until upstream
   write access or an approved fork/PR route exists.

## Selection Rules

- Pick one bounded mission objective for each autonomous iteration; use small
  checkpoint tasks inside that mission when useful.
- Prefer tasks that reduce blocker risk, regression risk, or unclear source of
  truth.
- Do not start new feature work when a P0/P1 regression or release blocker is
  unresolved.
- Keep this file synchronized with `.codex/context/TASK_BOARD.md` and
  `docs/planning/mvp-next-commits.md`.
