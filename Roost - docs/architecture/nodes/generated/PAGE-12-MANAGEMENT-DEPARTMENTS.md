---
id: "PAGE-12-MANAGEMENT-DEPARTMENTS"
name: "/areas?area=12-zarzadzanie&view=departments"
type: "page"
status: "verified"
layer: "frontend"
module: "management"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#page #management"
---

# /areas?area=12-zarzadzanie&view=departments

- ID: `PAGE-12-MANAGEMENT-DEPARTMENTS`
- Type: `page`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `management`
- Feature: `management-department-catalog`
- File: `web/src/app-route-registry.ts`

## Description

Management department catalog page.

## Direct Links

- Parent: [[COMP-SHELL|Authenticated Shell component]]
- Children: none
- Depends on: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- renders -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] (verified)
- calls -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (partial)
- depends_on -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- `TEST-BROWSER-MGMT-DEPT` Browser Management department proof: `verified`

## Evidence

- `EVID-AUTO-00261` verified: missing none

## Notes

Browser proof created custom department here.
