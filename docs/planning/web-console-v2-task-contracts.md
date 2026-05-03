# Web Console V2 Task Contracts

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
  reuses implemented CompanyCore CRM/pipeline tables.
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
  - Render CRM/pipeline summary cards from existing database snapshots.
  - Render compact lists for stages, deals, clients, and interactions.
  - Link dashboard and integration taxonomy to the implemented pipeline view.
  - Validate syntax, build, tests, local route rendering, and production smoke.
- Acceptance Criteria:
  - Signed-in navigation includes `Pipeline`.
  - `/pipeline` renders existing implemented CRM/pipeline records.
  - Empty states are clear when no CRM/pipeline records exist.
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
