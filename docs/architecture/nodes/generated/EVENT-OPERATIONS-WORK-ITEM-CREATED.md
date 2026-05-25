---
id: "EVENT-OPERATIONS-WORK-ITEM-CREATED"
name: "operations_work_item_created"
type: "event"
status: "verified"
layer: "backend"
module: "operations"
feature: "operations-work-items"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#event #operations"
---

# operations_work_item_created

- ID: `EVENT-OPERATIONS-WORK-ITEM-CREATED`
- Type: `event`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `src/modules/operations/operations.routes.ts`

## Description

Event emitted when an Operations work item is created.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]]
- Used by: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- UI: none
- API: [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] (partial)
- [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> emits (verified)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00026` verified: missing none

## Notes

Covered by API tests according to DMS foundation evidence.
