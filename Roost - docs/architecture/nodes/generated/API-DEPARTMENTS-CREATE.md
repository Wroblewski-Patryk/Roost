---
id: "API-DEPARTMENTS-CREATE"
name: "POST /v1/departments"
type: "api_route"
status: "verified"
layer: "backend"
module: "departments"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#api #departments #write"
---

# POST /v1/departments

- ID: `API-DEPARTMENTS-CREATE`
- Type: `api_route`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `departments`
- Feature: `management-department-catalog`
- File: `src/modules/departments/departments.routes.ts`

## Description

Workspace-scoped custom department create endpoint.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Used by: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- UI: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- API: [[API-DEPARTMENTS-CREATE|POST /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- writes -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (verified)
- depends_on -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- depends_on -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> calls (verified)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> owns (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> depends_on (partial)
- [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> depends_on (partial)
- [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- `TEST-API-LOCAL` npm run test:api:local: `verified`

## Evidence

- `EVID-AUTO-00010` verified: missing none

## Notes

Browser proof created 13 Marketing Lab through UI.
