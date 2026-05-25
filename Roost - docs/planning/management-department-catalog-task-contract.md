# MGMT-DEPT-001 - Management Department Catalog

## Header
- ID: MGMT-DEPT-001
- Title: Management department catalog, sidebar source, and linked views
- Task Type: feature
- Current Stage: verification
- Status: DONE
- Owner: Backend Builder + Frontend Builder + QA/Test
- Priority: P1
- Mission ID: MGMT-DEPT-001
- Mission Status: VERIFIED
- Operation Mode: BUILDER

## Goal

Make `12 Management` the owner-facing place for managing workspace
departments. The same department catalog must drive the authenticated sidebar,
allow editing department labels and linked views, and allow adding custom
departments without pretending that every custom department already owns a
dedicated backend module.

## Scope

- `prisma/schema.prisma`
- `prisma/migrations/202605241_workspace_departments/migration.sql`
- `src/modules/departments/departments.routes.ts`
- `src/app.ts`
- `src/auth/capabilities.ts`
- `src/auth/agent-key-profiles.ts`
- `src/mcp/manifest.ts`
- `scripts/check-route-capabilities.mjs`
- `web/src/app-route-registry.ts`
- `web/src/features/departments/core-area-data.ts`
- `web/src/features/departments/management-route.tsx`
- `web/src/layout/shell.tsx`
- `web/src/main.tsx`
- `web/src/types.ts`
- `web/src/i18n/messages.ts`

## Implementation Plan

1. Add a workspace-scoped department catalog table with system defaults plus
   custom department support.
2. Expose `/v1/departments` for reading, creating, and updating departments.
3. Add capability manifest coverage for department catalog read/write.
4. Add `12 Management -> Departments` as the management surface.
5. Make the authenticated sidebar read department rows from the catalog, with
   the static department list as fallback.
6. Let users link approved existing views to each department from a controlled
   list.

## Acceptance Criteria

- [x] `12 Management` opens a department table.
- [x] The table shows the system departments and linked views.
- [x] The owner can create a custom department.
- [x] The owner can edit a department name, description, icon, order, and
      linked views.
- [x] Sidebar reads the same department catalog and shows custom departments
      after reload.
- [x] Linked views point only to existing approved module surfaces.
- [x] API routes are capability-covered and pass route drift validation.

## Validation Evidence

- `npm run prisma:generate`: passed.
- `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/companycore npx prisma validate`: passed.
- `npm run build:server`: passed.
- `npm run build:web`: passed.
- `npm run validate`: passed, including route/capability drift check.
- `npm run test:api:local`: passed with all 27 migrations and 6/6 API subtests.
- Browser plugin rendered proof on `http://127.0.0.1:3351/areas?area=12-zarzadzanie&view=departments`:
  - logged in through the real UI;
  - rendered the Management department table;
  - created `13 Marketing Lab`;
  - linked `Operations tasks` and `Assets files and folders`;
  - reloaded and verified the custom department in sidebar and table;
  - console warnings/errors were empty.
- `git diff --check`: passed with line-ending warnings only.

## Result Report

`12 Management` now owns the department catalog. The first version intentionally
separates department identity from module ownership: custom departments can
exist immediately and link to existing shared views, while future dedicated
department modules can be added through explicit task contracts.

## Residual Risk

- Custom departments currently link to existing module views; they do not yet
  create department-specific backend read packets.
- API coverage is exercised through migration/full API smoke and rendered UI
  proof; a dedicated `/v1/departments` subtest can be added in the next testing
  hardening slice.
