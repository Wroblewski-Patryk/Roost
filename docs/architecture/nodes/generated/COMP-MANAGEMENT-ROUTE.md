---
id: "COMP-MANAGEMENT-ROUTE"
name: "ManagementRoute component"
type: "component"
status: "verified"
layer: "frontend"
module: "management"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#react #management #departments"
---

# ManagementRoute component

- ID: `COMP-MANAGEMENT-ROUTE`
- Type: `component`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `management`
- Feature: `management-department-catalog`
- File: `web/src/features/departments/management-route.tsx`

## Description

React route surface for 12 Management department administration.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[API-DEPARTMENTS-LIST|GET /v1/departments]], [[API-DEPARTMENTS-CREATE|POST /v1/departments]], [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]], [[COMP-CC-DATA-TABLE|CcDataTable component]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]]
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- calls -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (verified)
- calls -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] (verified)
- uses -> [[COMP-CC-DATA-TABLE|CcDataTable component]] (partial)
- depends_on -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (partial)
- depends_on -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] (partial)
- depends_on -> [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]] (partial)
- depends_on -> [[COMP-CC-DATA-TABLE|CcDataTable component]] (partial)
- contains -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] (partial)
- depends_on -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] (partial)
- depends_on -> [[FEAT-MANAGED-TABLE|Shared Managed Table]] (partial)
- [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> renders (verified)
- [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> covers (verified)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> depends_on (partial)
- [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> depends_on (partial)
- [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- `TEST-BROWSER-MGMT-DEPT` Browser Management department proof: `verified`

## Evidence

- `EVID-AUTO-00013` verified: missing none

## Notes

Browser proof validated custom department creation and sidebar/table readback.
