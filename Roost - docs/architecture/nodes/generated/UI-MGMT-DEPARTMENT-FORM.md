---
id: "UI-MGMT-DEPARTMENT-FORM"
name: "Department catalog form"
type: "ui_element"
status: "verified"
layer: "frontend"
module: "management"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#ui #form #management"
---

# Department catalog form

- ID: `UI-MGMT-DEPARTMENT-FORM`
- Type: `ui_element`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `management`
- Feature: `management-department-catalog`
- File: `web/src/features/departments/management-route.tsx`

## Description

Owner form for creating/editing department records and linked views.

## Direct Links

- Parent: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- Children: none
- Depends on: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]], [[API-DEPARTMENTS-CREATE|POST /v1/departments]]
- Used by: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- UI: [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]]
- API: [[API-DEPARTMENTS-CREATE|POST /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] (partial)
- depends_on -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> contains (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> depends_on (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- `TEST-BROWSER-MGMT-DEPT` Browser Management department proof: `verified`

## Evidence

- `EVID-AUTO-00016` verified: missing none

## Notes

Browser proof created and linked a custom department.
