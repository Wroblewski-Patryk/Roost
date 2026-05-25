---
id: "FEAT-MANAGED-TABLE"
name: "Shared Managed Table"
type: "feature"
status: "verified"
layer: "frontend"
module: "shared-ui"
feature: "managed-table"
risk_level: "medium"
completion_percent: "95"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#feature #shared-ui #table"
---

# Shared Managed Table

- ID: `FEAT-MANAGED-TABLE`
- Type: `feature`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `shared-ui`
- Feature: `managed-table`
- File: `docs/planning/shared-managed-table-component-task-contract.md`

## Description

Reusable table pattern with filters, settings, rows, pagination, column visibility, selection, and row actions.

## Direct Links

- Parent: none
- Children: [[COMP-CC-DATA-TABLE|CcDataTable component]]
- Depends on: [[DOC-DESIGN-MEMORY|Design memory]]
- Used by: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]], [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]]
- UI: [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]]
- API: none
- Database: none
- Tests: [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]]
- Docs: [[DOC-SHARED-TABLE-CONTRACT|Shared managed table task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- contains -> [[COMP-CC-DATA-TABLE|CcDataTable component]] (partial)
- depends_on -> [[DOC-DESIGN-MEMORY|Design memory]] (partial)
- contains -> [[DOC-SHARED-TABLE-CONTRACT|Shared managed table task contract]] (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> depends_on (partial)
- [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00044` verified: missing none

## Notes

Adopted by People/Agents and useful for management catalog.
