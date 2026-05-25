---
id: "FUNC-SERIALIZE-DEPARTMENT"
name: "serializeDepartment"
type: "function"
status: "verified"
layer: "backend"
module: "departments"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#function #departments"
---

# serializeDepartment

- ID: `FUNC-SERIALIZE-DEPARTMENT`
- Type: `function`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `departments`
- Feature: `management-department-catalog`
- File: `src/modules/departments/departments.routes.ts`

## Description

Serializes department records with linked view summaries and first enabled href.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Used by: [[API-DEPARTMENTS-LIST|GET /v1/departments]], [[API-DEPARTMENTS-CREATE|POST /v1/departments]], [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]]
- UI: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> depends_on (partial)
- [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> depends_on (partial)
- [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00059` verified: missing none

## Notes

Used by all department responses.
