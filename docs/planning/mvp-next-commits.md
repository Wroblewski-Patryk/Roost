# MVP Next Commits

Keep this file short and execution-focused. The active queue must stay
synchronized with `.codex/context/TASK_BOARD.md`.

## Active Queue

### NOW

- [ ] Continue V1 department systems with `DMS-NEXT-004` Relationships
      Management read packet and board, unless deployment smoke is selected
      first. The owner-approved `00 Main -> 04 Operations ->
      08 Assets` checkpoint is complete through shared primitives, verified
      backend packets, selected-area UI adoption, CC-AUDIT-001 post-login
      dashboard proof, WEB-CORE-001 active web cleanup, and WEB-QA-001
      language/error/form foundation. `04 Operations` also has the verified
      list-board UX polish plus OPS-MGMT-002 deepening: one canonical task
      board route, department-grouped task lists, list metadata/department
      editing, drag/drop status movement, and day/week/month calendar modes.
      OPS-DEPT-FILTER-001 also aligns Operations assignment/filtering to the
      canonical `00`-`12` departments and adds multi-list checkbox filters for
      the board/calendar.
      `npm run validate` and Playwright proof passed; `npm run test:api`
      should be rerun when Docker/PostgreSQL validation is healthy.
      CompanyCore remains the operating system; AI agents remain external
      API/MCP clients. Do not restore old private workbench screens without a
      scoped task contract.

### NEXT

- [x] Runtime checkpoint completed for `DMS-06-WORKFORCE-001`:
      `06 People & Agents` now has `workforce_entities`, `/v1/workforce`,
      generated markdown resources, manual Paperclip sync queue, capability
      manifest/profile updates, seed/register backfill, operating-model catalog
      entries, and an active `/areas?area=06-kadry&view=directory` UI.
      Validation: Prisma generate, local-url Prisma validate,
      `npm run build:server`, `npm run build:web`, `npm run validate`,
      `git diff --check`, and Playwright fallback desktop/mobile proof passed.
      Full `npm run test:api` remains pending until PostgreSQL validation is
      available.
- [x] Planning checkpoint completed for the first `00 -> 04 -> 08` wave:
      `CC-UI-001`, `CC-00-001`, `CC-04-001`, and `CC-08-001` are documented
      and verified with `git diff --check`.
- [x] Runtime checkpoint completed for `CC-UI-002`: shared `CcButton` exists
      and has minimal route-kit/web adoption with web build and smoke proof.
- [x] Runtime checkpoint completed for `CC-UI-003`: shared `CcDataTable`
      exists with compatibility wrapper, pagination-ready API, state handling,
      row actions, density, and mobile mode with web build and smoke proof.
- [x] Runtime checkpoint completed for `CC-00-002`: route proposal lifecycle
      readback API exists at `GET /v1/intake/route-proposals`, is exposed
      through `intake:read` and MCP as a read-risk tool, and is verified with
      `npm run test:api` against disposable PostgreSQL.
- [x] Runtime checkpoint completed for `CC-04-002`: Operations work item read
      model exists at `GET /v1/operations/work-items`, is exposed through
      `operations:read` and MCP as a read-risk tool, and is verified with
      `npm run test:api` against disposable PostgreSQL.
- [x] Runtime checkpoint completed for `CC-08-002`: Assets context read API
      exists at `GET /v1/assets/context`, is exposed through `assets:read` and
      MCP as a read-risk tool, and is verified with `npm run test:api` against
      disposable PostgreSQL.
- [x] Runtime checkpoint completed for `CC-UI-004`: selected-area UI consumes
      the verified `00`, `04`, and `08` read packets using shared
      `CcDataTable`/`CcButton` paths. `npm run build:web` passed; Playwright
      rendered desktop `00`, desktop `04`, desktop `08`, and mobile `08`
      with no console/page errors or horizontal overflow. Evidence:
      `docs/ux/evidence/cc-ui-004-00-desktop.png`,
      `docs/ux/evidence/cc-ui-004-04-desktop.png`,
      `docs/ux/evidence/cc-ui-004-08-desktop.png`, and
      `docs/ux/evidence/cc-ui-004-08-mobile.png`.
- [x] Architecture/UX audit checkpoint completed for `CC-AUDIT-001`:
      `00 Ogolny` is now the canonical post-login dashboard at
      `/areas?area=00-ogolny&view=overview`, `/dashboard` is a compatibility
      alias into that same view, and rendered proof covered login, alias,
      desktop `04`, desktop `08`, and mobile `08`. Evidence:
      `docs/ux/evidence/cc-audit-001-post-login-00-dashboard.png`,
      `docs/ux/evidence/cc-audit-001-dashboard-alias-00.png`,
      `docs/ux/evidence/cc-audit-001-04-operations.png`,
      `docs/ux/evidence/cc-audit-001-08-assets-desktop.png`, and
      `docs/ux/evidence/cc-audit-001-08-assets-mobile.png`.
- [x] Web cleanup checkpoint completed for `WEB-CORE-001`: active React web
      now contains only public home, owner auth, `00 General`, `04 Operations`,
      and `08 Assets`. Old private paths such as settings, data,
      relationships, tasks, pipeline, Company OS, and MCP tools are no longer
      React app routes. Backend APIs remain untouched for future rebuilds.
      Validation: `npm run build:web`, `npm run build:server`, Playwright
      route proof, removed-route proof, and `git diff --check`.
- [x] Web quality audit checkpoint completed for `WEB-QA-AUDIT-001`:
      `docs/planning/web-foundation-quality-audit-2026-05-16.md` records the
      current web base as production-testable but not ready for broad new
      department expansion until i18n, user-facing error mapping, shared form
      primitives, and centralized notices are implemented. Validation:
      source review, Playwright fallback proof on a temporary mocked API
      server, `npm run build:web`, and `npm run build:server`.
- [x] Runtime checkpoint completed for `WEB-QA-001`: active React web now has
      default-English i18n, selectable/persisted Polish, `<html lang>` sync,
      typed API errors, friendly auth and packet error messages, shared notice
      feedback, shared form fields, localized auth validation, translated table
      states, and a layout/auth/department/API module split. Validation:
      `npm run build:web`, `npm run build:server`, `npm run validate`,
      Browser home smoke, and Playwright fallback proof for language switching,
      reload persistence,
      auth errors without raw codes, field `aria-invalid`/`aria-describedby`,
      post-login `00 General`, Operations error, and mobile `08 Assets`.
- [x] Post-implementation audit completed for `WEB-QA-001`: fixed locale
      contract extraction, planned department label localization, and API
      error normalization for backend string, nested, and
      `internal_server_error` payloads. Validation: Browser home smoke,
      Playwright fallback on temporary port `3236` for old route cleanup,
      auth, private redirect, 00/04/08 journeys, desktop/tablet/mobile
      overflow/accessibility smoke, `npm run build:web`,
      `npm run build:server`, and `npm run validate`.
- [ ] Continue V1 department systems after the `00 -> 04 -> 08` loop has the
      next planning/runtime checkpoint. `03 Sales` read packet and board is
      complete locally; the broader sequence remains `05 Relationships`,
      `02 Product And Delivery`, `09 Technology/AI`, and `10 Legal/Standards`,
      with writes behind explicit command contracts.
- [ ] Unified Organizational OS backend program after current active work:
      use `docs/planning/unified-org-backend-implementation-program.md` as the
      execution map for turning the accepted unified human/AI workforce and
      organizational world-state architecture into backend contracts. Do not
      move it ahead of the current DMS/web queue unless the owner explicitly
      switches focus. First sequence: `UOS-BE-001` current backend capability
      audit, `UOS-BE-002` organizational contract types, `UOS-BE-010`
      workforce read packet without migration, `UOS-BE-011` People/Agents
      authority packet for `06`, and `UOS-BE-012` workforce schema decision.
- [ ] Use the CompanyCore business module map during upcoming product intake:
      `docs/architecture/companycore-business-module-map.md` now classifies
      future work as native core, provider-backed, future adapter, or derived
      view. Apply it before settings, Drive, ClickUp, CRM, pipeline,
      knowledge, resource, or agent slices so new UI/API/MCP/provider work
      scales from the company operating model rather than provider-led screens.
- [ ] Use the CompanyCore global business flow during upcoming CRM, marketing,
      delivery, finance, support, feedback, graph, dashboard, or AI-agent
      intake:
      `docs/architecture/companycore-global-business-flow.md` defines the
      13-stage flow from strategic intent through brand, demand, discovery,
      offer, delivery, acceptance, payment, support, feedback, and improvement.
      Start with read models and visualization before write behavior.
- [ ] Use the department management systems architecture before generating or
      implementing department views:
      `docs/architecture/department-management-systems-architecture.md`,
      `docs/architecture/department-management-systems-v1-blueprint.md`,
      `docs/planning/v1-department-systems-global-implementation-plan.md`,
      `docs/ux/v1-department-management-systems-view-map.md`, and
      `docs/ux/v1-department-system-prompt-pack.md` define each 00-12 area as
      a scalable management system with subsystems, shared components, and
      Paperclip/AI packets. Generate one department spec at a time.
- [ ] AOG-BE-002 Target metric relation:
      add optional `Target.metricId` after AOG-BE-001 proves the target/metric
      read model, preserving existing `Target.metric` text compatibility.
- [ ] AOG-BE-003 Goal/workflow bridge:
      add the minimal durable connection between goals/targets and
      process/pipeline roots after the read model proves ownership.
- [ ] AOG-BE-004 Workflow task link normalization:
      normalize runtime workflow-to-task evidence instead of relying only on
      JSON `linkedTaskIds`.
- [ ] AOG-BE-005 Knowledge/source link contract:
      connect knowledge items, Drive files, and snapshots to supported graph
      target families with guarded command-shaped writes later.
- [ ] AOG-BE-006 Area operating graph MCP read tool:
      expose the verified area operating graph as a read-only MCP tool for
      Jarvis and Paperclip.
- [ ] AGRUN-010 Upstream Agent Source Merge Execution:
      still blocked until upstream write access or an approved fork/PR route
      exists.
- [ ] Production push-to-running-image smoke after the next deploy:
      build metadata restoration is implemented locally; compare public
      `/health` `build.commit` with the pushed commit before claiming
      auto-deploy proof.
- [ ] Production AOG/settings smoke after the next deploy:
      compare `/health` metadata with the pushed commit, then smoke
      `/v1/operating-graph/areas/01-strategia` and authenticated settings.
### FUTURE V1.X

- [ ] V1X-PAPERCLIP-ASSISTANT-001 Paperclip corner assistant concept:
      preserve the owner idea for a future V1.x virtual helper in the corner of
      the CompanyCore panel. It should be evaluated as a messenger-style
      Paperclip bridge and future integration entry point for ClickUp, Google
      Drive, and later providers. Do not implement until a design spec,
      architecture/security review, permission model, and AI-safety test plan
      exist.

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

- [x] DMS-03-006 Sales Management context and board:
      implemented protected read-only `GET /v1/sales/context`, exposed
      `sales:read` through capabilities, MCP manifest, and read-oriented MCP
      key profiles, and rendered `/areas?area=03-sprzedaz&view=overview` as a
      dedicated Sales Management board over clients, deals, stages,
      interactions, follow-up work, notes, commercial exceptions,
      current-client work, Drive evidence, and Finance handoff context.
      Quote, discount, invoice, ad, and autonomous outreach writes remain
      blocked. Validation passed with `npm run build:server`,
      `npm run build:web`, `npm run test:api` against validation-owned
      PostgreSQL on `127.0.0.1:55497`, and Playwright desktop/mobile proof on
      `http://127.0.0.1:3220` with no console/page errors or horizontal
      overflow. Evidence:
      `docs/ux/evidence/dms-03-sales-board-desktop.png` and
      `docs/ux/evidence/dms-03-sales-board-mobile.png`.
      Task contract:
      `docs/planning/dms-03-sales-context-and-board-task-contract.md`.

- [x] DMS-V1-006 13 department systems V1 implementation audit:
      `docs/planning/dms-13-systems-v1-implementation-audit.md` covers
      `00 Main` plus all 12 department systems with current backend reuse,
      current web readiness, V1 desktop/mobile expectations, backend gaps,
      Paperclip boundaries, blocked actions, first implementation slices,
      cross-system backend gaps, and recommended build order. Task contract:
      `docs/planning/dms-13-systems-v1-implementation-audit-task-contract.md`.

- [x] V1OPS-002 Production V1 smoke after Company OS area foundation:
      production was manually rolled over to
      `5f1fc71e44d09cb1780d29b2579c85023205efb9`; public web/API `/health`
      returned `200` with expected commit and image; authenticated production
      smoke covered `/operations`, `/tasks-adapter`, `/data`,
      `/areas?area=04-operacje&view=overview`, `/settings/drive`, and
      `/react-company-os?area=04-operacje`; direct AOG smoke returned
      `strategy-governance` with `27` nodes and `32` edges. Desktop/mobile
      proof reported no console/page errors, failed non-font requests, or
      horizontal overflow. Evidence:
      `docs/ux/evidence/production-v1-5f1fc71-2026-05-16/`.
      Task contract:
      `docs/planning/v1-production-smoke-rollout-task-contract.md`.

- [x] V1OPS-003 V1 Operations compatibility alias cleanup:
      centralized backend canonical `00`-`12` department keys, backend area
      aliases, and intake hint terms in
      `src/operating-model/department-registry.ts`; AOG selected-area reads
      now resolve `03-sprzedaz` to `sales-crm` and `07-finanse` to
      `finance-billing` before numeric fallback; global intake suggestions
      emit canonical keys such as `07-finanse` and `00-ogolny`; invalid
      non-canonical route proposals like `07-finance` remain rejected.
      Validation passed with `npm run build:server`, `npm run test:api`
      against validation-owned PostgreSQL on `127.0.0.1:55494`, and
      `git diff --check`. Validation PostgreSQL and temporary artifacts were
      cleaned up. Task contract:
      `docs/planning/v1-operations-compatibility-alias-cleanup-task-contract.md`.

- [x] V1OPS-004 V1 Operations context read API:
      protected read-only `GET /v1/operations/context` now returns the
      `04-operacje` Operations Management packet with procedures, procedure
      steps, approvals, dependencies, business functions, operational tasks,
      summary counts, allowed read actions, and blocked write actions. The
      route is exposed through `operations:read`, MCP manifest tooling, and
      read-oriented MCP key profiles. Validation passed with
      `npm run build:server`, `npm run test:api` against validation-owned
      PostgreSQL on `127.0.0.1:55495`, and `git diff --check`. Validation
      PostgreSQL and temporary artifacts were cleaned up. Task contract:
      `docs/planning/v1-operations-context-read-api-task-contract.md`.

- [x] V1OPS-005 Production operations context smoke:
      manual VPS rollover deployed commit
      `9ff18820cb00bb2164904b947c2ef2a48e5d3b14`; production now runs
      `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882`, with
      `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5f1fc71` retained stopped as
      rollback. Public web/API health returned the expected commit. Protected
      `GET /v1/operations/context` returned `04-operacje`,
      `operations-administration`, `summary.procedures=7`,
      `agentPacket.mode=read_only`, and `blockedActions=4`. Temporary local
      and VPS rollout artifacts were removed. Task contract:
      `docs/planning/v1ops-production-operations-context-smoke-task-contract.md`.

- [x] DMS-01-005A Strategy context read API:
      protected read-only `GET /v1/strategy/context` now returns the
      `01-strategia` Strategy Management packet with goals, targets, metrics,
      risks/controls, decisions, decision logs, strategic knowledge, Drive
      documents, strategic tasks, summary counts, allowed read actions, and
      blocked write actions. The route is exposed through `strategy:read`,
      MCP manifest tooling, and read-oriented MCP key profiles. Validation
      passed with `npm run build:server`, `npm run test:api` against
      validation-owned PostgreSQL on `127.0.0.1:55496`, and
      `git diff --check`. Validation PostgreSQL and temporary artifacts were
      cleaned up. Task contract:
      `docs/planning/v1-strategy-context-read-api-task-contract.md`.

- [x] DMS-01-005B Production Strategy context smoke:
      manual VPS rollover deployed commit
      `5db4dd8b1fe9058d1fc78ebc957c0716ebd4822a`; production now runs
      `backend-rnqqkhl3o3dut4qv56mlxly2-manual-5db4dd8`, with
      `backend-rnqqkhl3o3dut4qv56mlxly2-manual-9ff1882` retained stopped as
      rollback. Public web/API health returned the expected commit. Protected
      `GET /v1/strategy/context` returned `01-strategia`,
      `strategy-governance`, `summary.activeMetrics=1`,
      `summary.activeRisks=1`, `agentPacket.mode=read_only`, and
      `blockedActions=4`. Temporary local and VPS rollout artifacts were
      removed. Task contract:
      `docs/planning/v1-strategy-production-smoke-task-contract.md`.

- [x] DMS-V1-005 Differentiated department management systems analysis:
      updated the DMS architecture, UX view map, and global implementation
      plan so the 12 operating departments are no longer planned as identical
      screens. They now share shell/auth/evidence/MCP/safety primitives, but
      each department requires a specific primary board, workflow vocabulary,
      desktop UX, mobile review mode, state model, source records, and agent
      boundaries. Task contract:
      `docs/planning/dms-differentiated-department-systems-analysis-task-contract.md`.

- [x] V1COS-001 Company OS area-aware foundation:
      `/react-company-os` now connects Company OS evidence and guarded
      command context to the `00`-`12` department management systems through a
      department selector, subsystem context, mapped table preview, agent
      handoff, first safe action, and blocked actions. `npm run build:web`,
      `git diff --check`, embedded PostgreSQL migration deploy on
      `127.0.0.1:55483`, and Playwright real-backend proof on
      `http://127.0.0.1:3219` passed for desktop/mobile with no console/page
      errors or horizontal overflow. Evidence:
      `docs/ux/evidence/v1-company-os-area-foundation-desktop.png` and
      `docs/ux/evidence/v1-company-os-area-foundation-mobile.png`.
      Task contract:
      `docs/planning/v1-company-os-area-foundation-task-contract.md`.

- [x] PROD-GDRIVE-002 Production Google Drive changes baseline:
      implemented first-run baseline initialization for
      `POST /v1/integration-settings/google_drive/changes/reconcile` when no
      stored `changesPageToken` exists. `npm run build:server`,
      `git diff --check`, and `npm run test:api` passed against portable
      PostgreSQL on `127.0.0.1:55490`. Production was manually rolled over to
      `d2c9b9460a5db63703ca28f98988a2fa35d3a651`; public health reported that
      commit, first protected reconcile returned `200` with
      `baselineInitialized=true`, second reconcile returned `200` through the
      stored-token path, and Drive index remained `754` records with no
      unassigned/pending/failed/trashed rows.
      Task contract:
      `docs/planning/prod-google-drive-changes-baseline-task-contract.md`.

- [x] PROD-PAPERCLIP-001 Paperclip runtime Drive visibility proof:
      production Paperclip `company_core_settings` is configured with
      CompanyCore base URL, knowledge key, and tools key. Knowledge-key calls
      to `/v1/connection`, `/v1/mcp/manifest`, and `/v1/google-drive/files`
      returned `200`; tools-key calls to `/v1/connection` and
      `/v1/google-drive/files` returned `200`. Paperclip has 1282 CompanyCore
      tool assignments across 36 agents, including 12 distinct Google Drive
      tools. Follow-up only if a named agent/screen still misses files:
      inspect agent-level tool assignment or UI/filter behavior.

- [x] DMS-03-005A Commercial exception read API:
      implemented protected read-only `GET /v1/commercial-exceptions`,
      `commercial-exceptions:read`, MCP exposure, Paperclip-safe profile
      access, API docs, and regression coverage for auth, workspace isolation,
      no mutation on read, `100%` discount packet math, missing-source status,
      and blocked actions. `npm run build:server`, `git diff --check`, and
      `npm run test:api` passed against portable PostgreSQL on
      `127.0.0.1:55481`.
      Task contract:
      `docs/planning/dms-03-commercial-exception-read-api-task-contract.md`.
- [x] DMS-07-002 Finance context read API:
      implemented protected read-only `GET /v1/finance/context`,
      `finance:read`, MCP exposure, Paperclip-safe profile access, API docs,
      and regression coverage for candidate pricing conflicts, `150 CHF/hour`,
      `100%` commercial exception inclusion, invoice-readiness blockers,
      workspace isolation, no mutation on read, and blocked finance actions.
      `npm run build:server`, `git diff --check`, and `npm run test:api`
      passed against portable PostgreSQL on `127.0.0.1:55482`.
      Task contract:
      `docs/planning/dms-07-finance-context-read-api-task-contract.md`.
- [x] DMS-00-007 Paperclip background output review proof:
      documented and verified the safe loop from Paperclip-like
      `AgentEventOutbox` through `GET /v1/intake`,
      `POST /v1/intake/actions/propose-route`, proposal evidence, optional
      department review task, and unchanged source delivery status. Existing
      API regression coverage passed again during the DMS-07-002 gate on
      portable PostgreSQL `127.0.0.1:55482`.
      Task contract:
      `docs/planning/dms-00-paperclip-background-output-review-proof-task-contract.md`.
- [x] DMS-SHELL-003 Department data backbone:
      added a shared data-backbone section to selected-area department shells,
      showing operating graph readiness, tables, records, knowledge/source
      count, review gaps, and fallback text. `npm run build:web`,
      `git diff --check`, and Playwright proof on local backend
      `http://127.0.0.1:3212` passed for `01-strategia`, `07-finanse`, and
      `12-zarzadzanie` on desktop/mobile with no console/page errors or
      horizontal overflow.
      Task contract:
      `docs/planning/dms-shell-003-department-data-backbone-task-contract.md`.
- [x] DMS-07-003 Read-only Finance web board:
      rendered `/areas?area=07-finanse&view=overview` from
      `GET /v1/finance/context`, showing pricing candidates, `150 CHF/hour`,
      commercial exceptions, invoice blockers, source conflicts, and blocked
      finance actions without quote/discount/invoice/payment writes.
      `npm run build:web`, `git diff --check`, and Playwright proof on
      `http://127.0.0.1:3213` passed for desktop/mobile with no console/page
      errors or horizontal overflow.
      Task contract:
      `docs/planning/dms-07-finance-web-board-task-contract.md`.
- [x] DMS-04-001 Operations real-data proof:
      fixed the shared React table-record loader so Company OS collections
      covered by `company-os:read` load through `/v1/company-os/:collection`,
      then proved `/areas?area=04-operacje&view=overview` against a real local
      backend on `http://127.0.0.1:3214`. The proof registered an owner,
      seeded a business function, procedure, procedure step, approval, and
      dependency, and verified the Operations board on desktop/mobile with no
      console/page errors or horizontal overflow.
      Evidence:
      `docs/ux/evidence/dms-ops-real-data-desktop.png` and
      `docs/ux/evidence/dms-ops-real-data-mobile.png`.
      Task contract:
      `docs/planning/operations-management-system-v1-task-contract.md`.
- [x] V1DATA-001 Evidence browser V1 workbench:
      rebuilt `/data` and `/data/:table` into a V1 foundation evidence browser
      with department record metrics, agent-readable table context,
      empty-table and review-gap signals, selected-table owner/API/capability
      context, department coverage links, and generic record inspection.
      `npm run build:web` passed. Playwright real-backend proof on
      `http://127.0.0.1:3215` verified desktop `/data` and mobile
      `/data/procedures` with no console/page errors or horizontal overflow.
      Evidence:
      `docs/ux/evidence/v1-data-evidence-browser-desktop.png` and
      `docs/ux/evidence/v1-data-evidence-browser-mobile.png`.
      Task contract:
      `docs/planning/v1-data-evidence-browser-task-contract.md`.
- [x] V1REL-001 Area relationship provenance review:
      rebuilt `/relationships?area=04-operacje` into a V1 foundation
      provenance review with selected-area focus, direct/provider/inferred/
      review metrics, agent-readable edge evidence, review queue, unsupported
      families, and links back to area resources and `/data`. `npm run
      build:web`, `git diff --check`, and Playwright real-backend proof on
      `http://127.0.0.1:3216` passed for desktop/mobile with no console/page
      errors or horizontal overflow.
      Evidence:
      `docs/ux/evidence/v1-relationship-provenance-desktop.png` and
      `docs/ux/evidence/v1-relationship-provenance-mobile.png`.
      Task contract:
      `docs/planning/v1-relationship-provenance-review-task-contract.md`.
- [x] V1KNOW-001 Selected-area knowledge depth:
      deepened `/areas?area=04-operacje&view=knowledge` with Drive scope,
      agent packet readiness, description coverage, freshness/review signals,
      agent-readable packet list, and improvement queue inside the existing
      selected-area shell. `npm run build:web`, `git diff --check`, and
      Playwright real-backend proof on `http://127.0.0.1:3217` passed for
      desktop/mobile with no console/page errors or horizontal overflow.
      Evidence:
      `docs/ux/evidence/v1-area-knowledge-depth-desktop.png` and
      `docs/ux/evidence/v1-area-knowledge-depth-mobile.png`.
      Task contract:
      `docs/planning/v1-selected-area-knowledge-depth-task-contract.md`.
- [x] V1AREATASKS-001 Selected-area tasks depth:
      deepened `/areas?area=04-operacje&view=tasks` with task evidence,
      execution tables, provider pressure, guarded ownership model, execution
      packet, owner action queue, and explicit no-hidden-task-to-area-relation
      language. `npm run build:web`, `git diff --check`, and Playwright
      real-backend proof on `http://127.0.0.1:3218` passed for desktop/mobile
      with no console/page errors or horizontal overflow.
      Evidence:
      `docs/ux/evidence/v1-area-tasks-depth-desktop.png` and
      `docs/ux/evidence/v1-area-tasks-depth-mobile.png`.
      Task contract:
      `docs/planning/v1-selected-area-tasks-depth-task-contract.md`.
- [x] DMS-07-001 Finance system spec:
      defined the Finance Management System board, first safe web shape,
      protected read-only `GET /v1/finance/context` target, pricing model and
      hourly-value packet, commercial exception and invoice-readiness shapes,
      owner decisions, Paperclip packet, and blocked invoice/payment/discount
      actions. `git diff --check` passed.
      Task contract:
      `docs/planning/dms-07-finance-system-spec-task-contract.md`.
- [x] DMS-03-005 Discount/commercial exception read model:
      defined protected read-only `GET /v1/commercial-exceptions`, exception
      packet fields, status/derivation rules, current-client `100%` discount
      requirements, Paperclip guardrails, blocked finance actions, and backend
      API handoff. `git diff --check` passed.
      Task contract:
      `docs/planning/dms-03-commercial-exception-read-model-task-contract.md`.
- [x] DMS-SHELL-002 Department Subsystem Registry:
      added a typed 13-department registry, rendered it inside the shared
      selected-area shell, and gave each department system name, value role,
      owner question, agent handoff, first safe action, blocked actions, and
      three subsystem cards. `npm run build:web` and `git diff --check`
      passed. Playwright proof on `http://127.0.0.1:3211` verified
      `01-strategia`, `06-kadry`, `07-finanse`, and `12-zarzadzanie` with no
      console errors or horizontal overflow.
      Task contract:
      `docs/planning/dms-shell-002-department-subsystem-registry-task-contract.md`.
- [x] DMS-00-006 First Safe Global Intake Route Command:
      implemented proposal-only `POST /v1/intake/actions/propose-route`,
      `intake:write`, MCP exposure, API tests, and the `00 Main` web
      `Propose route` affordance. Validation passed with
      `npm run build:server`, `npm run build:web`, and `npm run test:api`
      against `postgresql://postgres@127.0.0.1:55480/postgres`; Playwright
      proof on `http://127.0.0.1:3210` created a proposal while the source
      agent event remained `pending`.
      Task contract:
      `docs/planning/dms-00-global-intake-route-command-task-contract.md`.
- [x] DMS-00-005 Global Intake Classify/Route Command Contract:
      defined `POST /v1/intake/actions/propose-route` as the first safe future
      command layer for `00 Main`. The contract covers source allowlist,
      canonical department keys, status vocabulary, idempotency, frontend
      states, Paperclip proposal boundaries, and explicit blocks for
      acknowledge, approval, provider-write, invoice, discount, delete, legal,
      and ads behavior. `git diff --check` passed.
      Task contract:
      `docs/planning/dms-00-global-intake-classify-route-command-contract.md`.
- [x] DMS-MONEY-001 Pricing/Hourly-Value/Discount Source Inventory:
      inventoried Drive-backed pricing and client sources, separated current
      strategic `499 CHF/month`, benchmarked hybrid `1500 CHF setup + 150
      CHF/month`, pure subscription, and older Polish project pricing evidence,
      and mapped current CompanyCore reuse plus backend gaps before Sales or
      Finance writes. Direct ClickUp source review remains blocked because no
      callable ClickUp search/read tool was exposed in this session. `git diff
      --check` passed.
      Task contract:
      `docs/planning/dms-money-pricing-discount-source-inventory-task-contract.md`.
- [x] DMS-SHELL-001 Shared Department Management Shell:
      extracted `DepartmentManagementShell` and `DepartmentImprovementLoop`
      for selected-area department routes while preserving `00 Main` intake
      and `04 Operations` special panels. `npm run build:web` and `git diff
      --check` passed. Playwright static SPA proof verified desktop `00`, `01`,
      and `04` plus mobile `04`, with markers present, no horizontal overflow,
      and no console/page errors.
      Task contract:
      `docs/planning/dms-shell-001-shared-department-management-shell-task-contract.md`.
- [x] DMS-00-003 Global Intake Read API:
      protected `GET /v1/intake` aggregates existing agent events, provider
      inbox rows, unassigned Drive/provider resources, approvals, high risks,
      tasks, and events into one read-only `00 Main` queue with normalized
      family, status, risk, suggested department, evidence, allowed action, and
      blocked action metadata. `intake:read` is exposed through capabilities,
      adapter manifest, MCP manifest, and MCP-oriented profiles. `npm run
      test:api` passed against workspace-local PostgreSQL on
      `127.0.0.1:55476` using the existing `postgres` database.
      Task contract:
      `docs/planning/dms-00-global-intake-read-api-task-contract.md`.
- [x] DMS-00-004 Global Intake Web Panel:
      `/areas?area=00-ogolny&view=overview` now renders a read-only `00 Main`
      intake panel over `/v1/intake`, with MCP readiness, summary metrics,
      quick filters, owner decision, Paperclip/agent, unassigned-resource, and
      risk/blocker queues, plus routing controls that only change existing
      selected-area views. `npm run build:web` and `npm run build:server`
      passed. Playwright real-backend proof on `http://127.0.0.1:3192`
      verified desktop/mobile markers, clicked `Tasks` to
      `/areas?area=00-ogolny&view=tasks`, and found no console errors,
      framework overlay, or horizontal overflow.
      Task contract:
      `docs/planning/dms-00-global-intake-web-panel-task-contract.md`.
- [x] V1OPS-001 Operations Cockpit React view:
      `/operations` now gives the owner one V1 supervision cockpit for clients,
      tasks, department files/tables, and AI-agent handoff. It uses existing
      owner APIs and table snapshots, adds client/task quick-create actions,
      and keeps agent authority read-only/supervised. `npm run build:web`,
      `npm run build`, `npm run validate`, and `npm run test:api` passed
      against workspace-local PostgreSQL on `127.0.0.1:55476`. Real backend
      Playwright proof registered an owner, created a proof client and proof
      task, verified success states, and captured desktop/mobile evidence:
      `docs/ux/evidence/v1-operations-cockpit-real-backend-desktop.png` and
      `docs/ux/evidence/v1-operations-cockpit-real-backend-mobile.png`.
      Task contract:
      `docs/planning/v1-operations-cockpit-task-contract.md`.
- [x] V1TASKS-001 Tasks and Delivery V1 workbench:
      `/tasks-adapter` now renders a V1 delivery workbench with execution
      pressure, task metrics, department delivery-table coverage, AI handoff
      readiness, all-task filters, inline task creation, and quick task status
      movement through existing protected task routes. `npm run build:web`,
      `npm run validate`, `npm run test:api`, and `git diff --check` passed
      against workspace-local PostgreSQL on `127.0.0.1:55476`. Real backend
      Playwright proof created `Proof delivery task`, moved it to
      `in_progress`, and captured desktop/mobile evidence:
      `docs/ux/evidence/v1-tasks-delivery-real-backend-desktop.png` and
      `docs/ux/evidence/v1-tasks-delivery-real-backend-mobile.png`.
      Task contract:
      `docs/planning/v1-tasks-delivery-workbench-task-contract.md`.
- [x] V1SETTINGS-002 Unified settings React implementation:
      `/settings`, `/settings/integrations`, `/settings/drive`,
      `/settings/api`, and `/react-agent-tools` now render one unified React
      settings module with Integrations, Agent keys, and MCP sections.
      Provider setup uses existing backend contracts for credentials, active
      state, scope IDs, `syncMode`, `importMode`, mapping, discovery, and
      sync/import/reconcile actions. `npm run build:web`, `npm run validate`,
      `git diff --check`, and `npm run test:api` passed. Playwright fallback
      verified desktop/mobile settings routes, and real backend proof saved
      Google Drive OAuth client credentials from `/settings/drive` and read
      back `oauthClientConfigured=true`. Task contract:
      `docs/planning/v1-settings-react-implementation-task-contract.md`.
- [x] AOG-BE-001 Area operating graph read API:
      `GET /v1/operating-graph/areas/:areaKey` aggregates existing data into
      connected goals, targets, metrics, workflows, tasks, knowledge, Drive
      sources, provider mappings, edge confidence, evidence, and gaps. MCP
      exposes it through `operating-graph:read`, and the selected-area React
      view consumes it with fallback. `npm run test:api` passed against
      workspace-local PostgreSQL on `127.0.0.1:55476`. Task contract:
      `docs/planning/aog-be-001-area-operating-graph-read-api-task-contract.md`.
- [x] REACT-WEB-002 ClickUp setup React workflow:
      closed by V1SETTINGS-002. ClickUp setup/discovery/list policy and
      maintenance/task sync controls live inside the unified settings module.
- [x] REACT-WEB-003 Google Drive OAuth/folder-selection React workflow:
      closed by V1SETTINGS-002 for settings scope. Drive OAuth client
      settings, folder IDs, selected folder policy, folder discovery/mapping,
      import, and reconcile controls live inside the unified settings module.

- [x] ORG-MOD-001 CompanyCore Business Module Map:
      published `docs/architecture/companycore-business-module-map.md` as the
      scalable model-level module map for CompanyCore as the bridge for
      operating the company. The map defines canonical modules for company
      graph, goals, work/tasks, processes/pipelines, runtime evidence,
      knowledge, storage/documents, CRM, resources, integrations, agents/MCP,
      governance, and metrics, and requires future work to classify modules as
      native core, provider-backed, future adapter, or derived view before
      implementation. `git diff --check` passed.
- [x] ORG-FLOW-001 CompanyCore Global Business Flow:
      published `docs/architecture/companycore-global-business-flow.md` as the
      central company value-flow model for products, services, and hybrid
      delivery. The flow connects strategic intent, brand, demand, lead
      qualification, discovery, offer/agreement, delivery planning, execution,
      quality/acceptance, payment, support, feedback, improvement, and next
      intent, with dependency tree, stage contracts, operating-area mapping,
      AI/MCP guardrails, metrics, and future implementation candidates.
      `git diff --check` passed.
- [x] DMS-ARCH-001 Department Management Systems Architecture:
      published `docs/architecture/department-management-systems-architecture.md`,
      `docs/ux/v1-department-management-systems-view-map.md`, and
      `docs/ux/v1-department-system-prompt-pack.md`. The docs define every
      00-12 Company Atlas area as a department management system with
      subsystems over shared CompanyCore modules, plus public/private view
      list, component layout, per-department route inventory, and reusable
      prompts for specs, visual concepts, implementation plans, and AI-agent
      packets. `git diff --check` passed.
- [x] DMS-OPS-001 04 Operations Management System V1 Read Model:
      implemented a dedicated read-only Operations Management System panel for
      `/areas?area=04-operacje&view=overview`, corrected DMS docs to the
      current Company Atlas numbering where `04` is Operacje, and validated
      with `npm run build` plus `git diff --check`. Playwright authenticated
      mocked-owner proof saved desktop/mobile screenshots with no horizontal
      overflow. Disposable Docker/Postgres proof timed out before port `55479`
      became available, so database-backed target smoke remains a follow-up.
- [x] DMS-00-001 Global Intake And Paperclip Output Review Contract:
      published `docs/planning/dms-00-global-intake-paperclip-review-contract.md`
      as the planning contract for `00 Main` intake, Paperclip output review,
      candidate families, review statuses, row shape, backend/MCP surfaces,
      web panel requirements, routing heuristics, and future write guardrails.
      Task contract:
      `docs/planning/dms-00-global-intake-paperclip-review-task-contract.md`.
- [x] DMS-00-002 Intake Source Audit:
      published `docs/planning/dms-00-intake-source-audit.md` with source
      readiness for AgentEventOutbox, ProviderEventInbox, events, tasks, Drive
      files, external mappings, relationship review items, approvals, risks,
      notes, decisions, and MCP/agent context. The audit selected top-level
      `GET /v1/intake` as the first no-migration read-only aggregate.
      Task contract:
      `docs/planning/dms-00-intake-source-audit-task-contract.md`.
- [x] V1UX-CANON-001 Simple V1 Dashboard Canonical Design:
      published the V1 area-first Company Atlas direction, sitemap,
      component boundaries, Tailwind/DaisyUI style rules, pixel-perfect
      implementation plan, and generated canonical concept images. The
      current desktop/mobile implementation targets are
      `docs/ux/assets/companycore-v1-area-first-dashboard-desktop-canonical.png`
      and
      `docs/ux/assets/companycore-v1-area-first-dashboard-mobile-canonical.png`.
      `git diff --check` and manual image review passed.
- [x] V1AREA-001 Area-First Dashboard Pixel-Perfect Implementation:
      `/dashboard` now serves the React area-first Company Atlas shell with
      canonical 00-12 LuckySparrow areas, expanded `01 Strategia`, area
      capability tabs, CSS/SVG atlas board, right decision rail, progressive
      path, mobile summary, horizontal area selector, and five-item mobile
      bottom nav. `npm run check:public-js`, `npm run build:server`, `npm run
      build:web`, `npm run validate`, and `git diff --check` passed.
      Playwright fallback verified desktop `1366x900`, tablet `834x1112`,
      and mobile `390x844` screenshots in `docs/ux/evidence/` with no
      overflow and no console/page errors. Follow-up local proof on
      2026-05-15 ran `npm run test:api` against workspace-local PostgreSQL and
      verified selected-area routes against a real backend owner session.
- [x] V1AREA-003 Area Detail Capability Tabs:
      `/areas?area=:areaKey&view=:viewId` now gives every area capability tab a
      distinct area-scoped board for records, tables, providers, Drive proof,
      MCP tools, guardrails, and next safe actions, using existing backend data
      already loaded by the selected-department route. `npm run build:web`,
      `npm run validate`, `git diff --check`, and Playwright fallback tab
      proof passed. Evidence screenshots:
      `docs/ux/evidence/v1-area-detail-tabs-desktop.png` and
      `docs/ux/evidence/v1-area-detail-tabs-mobile.png`.
- [x] V1AREA-004 Area Detail UX Polish:
      refined the selected-department view with a connected operating flow,
      lighter capability board hierarchy, tighter mobile density, and
      active-tab accessibility state. `npm run build:web`, `npm run validate`,
      `git diff --check`, and Playwright fallback tab proof passed. Evidence:
      `docs/ux/evidence/v1-area-detail-polish-desktop.png` and
      `docs/ux/evidence/v1-area-detail-polish-mobile.png`.
- [x] V1WEB-002 Five Canonical Web Surfaces:
      `/` is now public home, `/auth/login` and `/auth/register` share the
      public layout, and `/dashboard` plus selected-area detail remain private
      atlas-layout surfaces. Desktop/mobile canonical images for all five
      surfaces were refreshed in `docs/ux/assets/`; dashboard tablet proof was
      captured in `docs/ux/evidence/companycore-v1-dashboard-tablet-proof.png`.
- [x] V1PROD-001 Production Canonical Parity Audit:
      captured production desktop/mobile public screenshots plus signed-out
      private route screenshots under
      `docs/ux/evidence/production-compare-2026-05-15/`. Production health
      reports `b716f02`, so `/`, login, and registration do not yet match the
      local V1 canonical targets because the current V1 web layer is not
      deployed. Discrepancy register:
      `docs/ux/v1-production-canonical-discrepancy-audit-2026-05-15.md`.
- [x] V1PROD-002 Deploy V1 Canonical Web Layer:
      deployed commit `ff5e04192db93a53280fab58bcd8f47cba30f554` to
      production through the manual VPS rollover path. Public web/API health
      now report the deployed commit and image
      `rnqqkhl3o3dut4qv56mlxly2_backend:ff5e041`; production `/` renders the
      V1 public home; login/register render the V1 public auth layout; signed
      out dashboard/area routes redirect to login. Screenshot proof:
      `docs/ux/evidence/production-v1-ff5e041-2026-05-15/`.
- [x] V1PROD-003 Authenticated V1 Production Parity:
      deployed commit `1dafe910ff612e027b686f09e2a488600f6e60d4` to
      production through the manual VPS rollover path. Public web/API health
      report image `rnqqkhl3o3dut4qv56mlxly2_backend:1dafe91`. Authenticated
      production Playwright proof verified `/dashboard`,
      `/areas?area=01-strategia&view=overview`, and
      `/areas?area=01-strategia&view=ai` on desktop/mobile with no overflow,
      no console errors, no failed requests, and no empty unmatched-area state.
      `01 Strategia` now resolves backend context with `8 TABLES`, Drive
      evidence, and provider mappings. Screenshot proof:
      `docs/ux/evidence/production-auth-v1-1dafe91-2026-05-15/`.
- [x] V1SETTINGS-001 Unified V1 Settings Canonical Design:
      published the unified settings IA and desktop/mobile canonical targets
      for one settings module spanning Integrations, Agent keys, and MCP.
      Integrations use a provider list plus contextual backend-supported
      fields, active/disabled provider switches, and provider tabs for
      `Setup`, `Mapping`, and `Sync`. Badges, counters, review queues, and
      large tool catalogs belong in dedicated work views.
      Targets:
      `docs/ux/assets/companycore-v1-settings-desktop-canonical.png` and
      `docs/ux/assets/companycore-v1-settings-mobile-canonical.png`.
- [x] UX100-W03 Relationship/Data Provenance And AI Safety Labels:
      added existing-state-derived provenance and AI readiness labels to
      relationship graph rows, review rows, data modules, table context cards,
      record rows, and record inspectors. `npm run check:public-js`, `npm run
      validate`, `git diff --check`, `npm run test:api` on portable
      PostgreSQL `localhost:55475`, and Playwright fallback at desktop,
      tablet, and mobile all passed.
- [x] UX100-W04 Tasks/Pipeline Operating Pressure Summaries:
      added existing-state-derived operating pressure summaries to
      `/tasks-adapter` and `/pipeline`, including overdue/due-soon/open/high
      priority task pressure and stage/usage/deal/touchpoint pipeline pressure.
      `npm run check:public-js`, `npm run validate`, `git diff --check`,
      `npm run test:api` on portable PostgreSQL `localhost:55475`, and
      Playwright fallback at desktop, tablet, and mobile all passed.
- [x] UX100-W05 Company OS And MCP Tools Alignment:
      added a shared agent-authority bridge to `/react-company-os` and
      `/react-agent-tools`, aligning pending approvals, blocked runtime,
      Company OS risk, visible MCP tools, supervised tools, and destructive
      authority around one approval-first vocabulary. `npm run build`,
      `git diff --check`, `npm run test:api` on portable PostgreSQL
      `localhost:55475`, and Playwright fallback at desktop, tablet, and
      mobile all passed.
- [x] ACF-OPS-002 Build Metadata Health Restoration:
      restored source-level build metadata wiring for production health by
      deriving safe metadata from `SOURCE_COMMIT`, Coolify/container runtime
      variables, and explicit `COMPANYCORE_BUILD_*` overrides. `npm run build`,
      `git diff --check`, and `npm run test:api` on portable PostgreSQL
      `localhost:55475` passed, including a production health regression test.
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
