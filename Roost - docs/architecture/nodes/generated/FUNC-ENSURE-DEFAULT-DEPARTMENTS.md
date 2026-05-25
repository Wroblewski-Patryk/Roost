---
id: "FUNC-ENSURE-DEFAULT-DEPARTMENTS"
name: "ensureDefaultDepartments"
type: "function"
status: "verified"
layer: "backend"
module: "departments"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "80"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#function #departments"
---

# ensureDefaultDepartments

- ID: `FUNC-ENSURE-DEFAULT-DEPARTMENTS`
- Type: `function`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `departments`
- Feature: `management-department-catalog`
- File: `src/modules/departments/departments.routes.ts`

## Description

Ensures canonical default departments exist per workspace.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Used by: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- UI: none
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00058` verified: missing none

## Notes

Runs before department list/create flows.
