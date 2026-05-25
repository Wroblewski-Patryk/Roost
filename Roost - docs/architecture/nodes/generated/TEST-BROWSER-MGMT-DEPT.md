---
id: "TEST-BROWSER-MGMT-DEPT"
name: "Browser rendered department catalog proof"
type: "test"
status: "verified"
layer: "testing"
module: "management"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#test #browser #management"
---

# Browser rendered department catalog proof

- ID: `TEST-BROWSER-MGMT-DEPT`
- Type: `test`
- Status: `verified`
- Verification: `verified`
- Layer: `testing`
- Module: `management`
- Feature: `management-department-catalog`
- File: `docs/planning/management-department-catalog-task-contract.md`

## Description

Rendered proof for creating a custom department through the UI.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- API: [[API-DEPARTMENTS-CREATE|POST /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: none
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- covers -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] (verified)
- depends_on -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00050` verified: missing none

## Notes

Browser plugin rendered proof for 13 Marketing Lab.
