---
id: "COMP-CC-DATA-TABLE"
name: "CcDataTable component"
type: "component"
status: "verified"
layer: "frontend"
module: "shared-ui"
feature: "managed-table"
risk_level: "medium"
completion_percent: "95"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#react #component #table"
---

# CcDataTable component

- ID: `COMP-CC-DATA-TABLE`
- Type: `component`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `shared-ui`
- Feature: `managed-table`
- File: `web/src/components/cc-data-table.tsx`

## Description

Reusable managed table primitive for flat management indexes.

## Direct Links

- Parent: [[FEAT-MANAGED-TABLE|Shared Managed Table]]
- Children: none
- Depends on: [[DOC-DESIGN-MEMORY|Design memory]]
- Used by: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]], [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]], [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- UI: [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]], [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]]
- API: none
- Database: none
- Tests: [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]]
- Docs: [[DOC-SHARED-TABLE-CONTRACT|Shared managed table task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-DESIGN-MEMORY|Design memory]] (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> uses (verified)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> uses (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> depends_on (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> depends_on (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> depends_on (partial)
- [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> depends_on (partial)
- [[FEAT-MANAGED-TABLE|Shared Managed Table]] -> contains (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00043` verified: missing none

## Notes

Future flat management indexes must reuse this primitive.
