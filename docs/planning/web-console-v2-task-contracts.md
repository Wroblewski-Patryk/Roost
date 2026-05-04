# Web Console V2 Task Contracts

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
- Deliverable For This Stage: searchable pipeline workbench feed backed by
  implemented CRM tables.
- Goal: Make `/pipeline` useful once CRM records grow by adding a unified feed,
  search, and filters without adding backend contracts or placeholder data.
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
  - `/pipeline` supports search across visible CRM/pipeline fields.
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
