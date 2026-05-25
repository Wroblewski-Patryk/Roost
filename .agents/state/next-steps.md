# Next Steps

Last updated: 2026-05-24

## NOW

1. Keep `ARCH-EVID-002` in green-state maintenance mode.
   - Source:
     `docs/planning/architecture-evidence-system-foundation-task-contract.md`.
   - Current state is verified: `npm run architecture:refresh` and `npm run
     validate` pass; graph is `442/753/34` (nodes/relations/chains); evidence
     queue is `0`; chain hardening worklist is `0`; chain coverage gate is
     `33/33` features (100%); CSV contract, command-contract, report-presence,
     proof-bundle, and doc-baseline gates pass.
   - Next slice: keep this as a release gate and only open focused follow-up
     tasks when a new gap appears in generated status artifacts.

1. Continue V1 department systems with `DMS-NEXT-004` Relationships Management
   read packet and board, unless deployment smoke is selected first.
   - Source:
     `docs/planning/companycore-00-04-08-operating-loop-plan.md`.
   - `00 -> 04 -> 08` loop foundations are complete and verified; next
     executable functional slice remains `05 Relationships` with system-level
     read packet + board semantics.
   - CompanyCore remains the company operating system; AI agents remain
     external API/MCP clients.
   - Keep writes behind explicit command contracts, audit/events, and API
     tests.

1. Production-smoke `PEOPLE-AGENTS-PAPERCLIP-001` after redeploy.
   - Source:
     `docs/planning/people-agents-paperclip-directors-task-contract.md`.
   - Local verification passed, including the follow-up Directory management
     UX/table slices and managed `CcDataTable` controls. After deploy, smoke
     that the owner appears as
     `Patryk Wroblewski`, the 13 Paperclip director agents appear as active
     workforce records, old non-director seed agents are archived, row-local
     Preview/Duplicate/Edit/Archive/Delete controls are sticky and work,
     Preview opens a profile modal, New/Edit/Duplicate open the refined form
     modal, archive/delete use DaisyUI confirmation modals, table search,
     quick filters, generated column filters, sorting, column visibility, row
     selection, page-size changes, next/previous pagination, and page input
     work, Big Five radar charts render in Preview and New/Edit, and
     `/people-agents` opens the improved active Directory table with one row
     per workforce entity and visible People/Agents scope chips. Also verify
     `/workforce` serves the same React route instead of a protected JSON API
     response.

## NEXT

1. PUBLIC-HOME-ROOST-001 follow-up: replace placeholder mark with owner
   final SVG logo without changing the approved brand system contract.

1. Deploy and smoke `DMS-06-WORKFORCE-001` when the next release window opens.
   - Source:
     `docs/planning/people-agents-workforce-v1-task-contract.md`.
   - Local implementation is complete with partial database-test confidence:
     `workforce_entities`, `/v1/workforce`, generated markdown resources,
     capability manifest/profile updates, seed/register backfill, and
     `/areas?area=06-kadry&view=directory`.
   - Before declaring target verified, run migrations, rerun full
     `npm run test:api` with a healthy PostgreSQL validation database, smoke
     the real owner UI, and verify Paperclip consumes the queued
     `paperclip_agent_config_sync_requested` event in a separate integration
     task.

1. Decide and implement external identity mapping before ClickUp assignee or
   Google Drive sharing writes.
   - Source:
     `docs/planning/user-identity-integration-mapping-audit-2026-05-18.md`.
   - Goal: make ClickUp user IDs, Google Drive permission IDs/emails, future
     provider accounts, internal humans, AI agents, external collaborators,
     and client employees converge through one CompanyCore identity-resolution
     layer.
   - First execution sequence:
     `UIM-BE-001 External Identity Mapping Schema Decision`,
     `UIM-BE-002 External Identity Read API`,
     `UIM-BE-003 ClickUp Assignee Import`,
     `UIM-BE-004 Task Assignment Command`,
     `UIM-BE-005 Google Drive Permission Import`,
     and `UIM-BE-006 Google Drive Share Command`.
   - Do not add provider-specific assignee/share fields directly to `tasks` or
     `google_drive_files` before this decision, because that would fragment
     the future people/client/agent model.

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
3. Department catalog hardening after `MGMT-DEPT-001`.
   - Source:
     `docs/planning/management-department-catalog-task-contract.md`.
   - Goal: add dedicated `/v1/departments` API regression assertions and decide
     whether custom departments remain linked-view shells or gain their own
     department-specific read packets before any custom-department writes are
     added.
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
19. Production smoke `08 Assets -> Files and folders` after the next deploy.
   - Source:
     `docs/planning/assets-files-folders-premium-audit-task-contract.md`.
     `docs/planning/assets-google-drive-sync-coverage-task-contract.md`.
   - Verify real Drive folder density, file count coverage after the
     folder/file split, type filters, image previews, Markdown previews, and
     card path context in production before deeper file/folder work.
   - Rerun full `npm run test:api` first when a validation PostgreSQL
     `DATABASE_URL` is available.

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
