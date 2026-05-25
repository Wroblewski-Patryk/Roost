---
id: "API-DEPARTMENTS-UPDATE"
name: "PATCH /v1/departments/:id"
type: "api_route"
status: "verified"
layer: "backend"
module: "departments"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "80"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#api #departments #write"
---

# PATCH /v1/departments/:id

- ID: `API-DEPARTMENTS-UPDATE`
- Type: `api_route`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `departments`
- Feature: `management-department-catalog`
- File: `src/modules/departments/departments.routes.ts`

## Description

Workspace-scoped department update endpoint for names, descriptions, position, status, icons, and linked views.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Used by: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- UI: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- API: [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- writes -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- depends_on -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- depends_on -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> owns (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> depends_on (partial)
- [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00011` verified: missing none

## Notes

Covered by route/capability validation and browser proof scope; deeper API assertions later.
