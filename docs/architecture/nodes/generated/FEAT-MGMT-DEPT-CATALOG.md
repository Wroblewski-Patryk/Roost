---
id: "FEAT-MGMT-DEPT-CATALOG"
name: "Management Department Catalog"
type: "feature"
status: "verified"
layer: "full-stack"
module: "management"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#feature #management #departments"
---

# Management Department Catalog

- ID: `FEAT-MGMT-DEPT-CATALOG`
- Type: `feature`
- Status: `verified`
- Verification: `verified`
- Layer: `full-stack`
- Module: `management`
- Feature: `management-department-catalog`
- File: `docs/planning/management-department-catalog-task-contract.md`

## Description

Owner-facing workspace department catalog with editable system departments and custom linked-view departments.

## Direct Links

- Parent: none
- Children: [[API-DEPARTMENTS-LIST|GET /v1/departments]], [[API-DEPARTMENTS-CREATE|POST /v1/departments]], [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]], [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]], [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]], [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]]
- Depends on: [[DOC-DMS-ARCH|Department management systems architecture]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]], [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- owns -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (partial)
- owns -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] (partial)
- owns -> [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]] (partial)
- contains -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (partial)
- contains -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] (partial)
- contains -> [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]] (partial)
- contains -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- contains -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] (partial)
- contains -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] (partial)
- depends_on -> [[DOC-DMS-ARCH|Department management systems architecture]] (partial)
- contains -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]] (partial)
- contains -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] (partial)
- contains -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] (partial)
- contains -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-MGMT-001` verified: missing none

## Notes

Custom departments are linked-view shells; dedicated backend packets remain future scope.
