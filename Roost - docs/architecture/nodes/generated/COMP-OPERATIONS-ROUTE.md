---
id: "COMP-OPERATIONS-ROUTE"
name: "OperationsRoute component"
type: "component"
status: "verified"
layer: "frontend"
module: "operations"
feature: "operations-work-items"
risk_level: "medium"
completion_percent: "88"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#react #operations"
---

# OperationsRoute component

- ID: `COMP-OPERATIONS-ROUTE`
- Type: `component`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `web/src/features/departments/operations-route.tsx`

## Description

React Operations management board and calendar surface.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]], [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]], [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]], [[COMP-CC-DATA-TABLE|CcDataTable component]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]]
- API: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- calls -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] (verified)
- calls -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] (verified)
- calls -> [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] (verified)
- depends_on -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] (partial)
- depends_on -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] (partial)
- depends_on -> [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] (partial)
- depends_on -> [[DB-TASK|Task model]] (partial)
- depends_on -> [[COMP-CC-DATA-TABLE|CcDataTable component]] (partial)
- contains -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] (partial)
- depends_on -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] (partial)
- [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> renders (verified)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> depends_on (partial)
- [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> depends_on (partial)
- [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- `TEST-PLAYWRIGHT-OPS` Operations Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00024` verified: missing none

## Notes

Rendered proof exists for assignment/schedule and dashboard packet.
