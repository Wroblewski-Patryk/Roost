---
id: "API-DEPARTMENTS-LIST"
name: "GET /v1/departments"
type: "api_route"
status: "verified"
layer: "backend"
module: "departments"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#api #departments #management"
---

# GET /v1/departments

- ID: `API-DEPARTMENTS-LIST`
- Type: `api_route`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `departments`
- Feature: `management-department-catalog`
- File: `src/modules/departments/departments.routes.ts`

## Description

Workspace-scoped department catalog read endpoint.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Used by: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]], [[COMP-SHELL|Authenticated Shell component]]
- UI: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- reads -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (verified)
- depends_on -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- depends_on -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] (partial)
- depends_on -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> calls (verified)
- [[COMP-SHELL|Authenticated Shell component]] -> calls (verified)
- [[TEST-API-LOCAL|npm run test:api:local]] -> covers (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> owns (partial)
- [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> calls (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> depends_on (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> depends_on (partial)
- [[UI-SIDEBAR-DEPARTMENT-NAV|Sidebar department navigation]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- `TEST-API-LOCAL` npm run test:api:local: `verified`
- `TEST-ROUTE-CAPABILITY` npm run check:route-capabilities: `verified`

## Evidence

- `EVID-AUTO-00009` verified: missing none

## Notes

Fresh evidence from MGMT-DEPT-001; dedicated API subtests remain follow-up.
