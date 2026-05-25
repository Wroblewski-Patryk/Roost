---
id: "DOC-OPS-WORK-ITEM-CONTRACT"
name: "Operations foundation task contract"
type: "documentation"
status: "verified"
layer: "planning"
module: "operations"
feature: "operations-work-items"
risk_level: "low"
completion_percent: "100"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#planning #evidence"
---

# Operations foundation task contract

- ID: `DOC-OPS-WORK-ITEM-CONTRACT`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `planning`
- Module: `operations`
- Feature: `operations-work-items`
- File: `docs/planning/dashboard-operations-workforce-foundation-task-contract.md`

## Description

Task and proof source for dashboard, operations work item, responsibility, and schedule foundation.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
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
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00027` verified: missing none

## Notes

Fresh evidence from 2026-05-20 foundation slice.
