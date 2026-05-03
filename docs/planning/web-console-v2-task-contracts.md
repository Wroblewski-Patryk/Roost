# Web Console V2 Task Contracts

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
