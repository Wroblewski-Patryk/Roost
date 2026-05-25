---
id: "DOC-MGMT-DEPT-CONTRACT"
name: "Management department catalog task contract"
type: "documentation"
status: "verified"
layer: "planning"
module: "management"
feature: "management-department-catalog"
risk_level: "low"
completion_percent: "100"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#planning #evidence"
---

# Management department catalog task contract

- ID: `DOC-MGMT-DEPT-CONTRACT`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `planning`
- Module: `management`
- Feature: `management-department-catalog`
- File: `docs/planning/management-department-catalog-task-contract.md`

## Description

Task contract and proof for MGMT-DEPT-001.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: none
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- No outgoing relations.
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00017` verified: missing none

## Notes

Fresh task evidence from 2026-05-24.
