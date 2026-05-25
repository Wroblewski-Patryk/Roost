---
id: "API-OPERATIONS-CREATE-WORK-ITEM"
name: "POST /v1/operations/work-items"
type: "api_route"
status: "verified"
layer: "backend"
module: "operations"
feature: "operations-work-items"
risk_level: "high"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#api #operations #write #events"
---

# POST /v1/operations/work-items

- ID: `API-OPERATIONS-CREATE-WORK-ITEM`
- Type: `api_route`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `src/modules/operations/operations.routes.ts`

## Description

Domain command for creating Operations work items with relation checks, optional ClickUp writeback, and event evidence.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: [[DB-TASK|Task model]]
- Used by: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- UI: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- API: [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- writes -> [[DB-TASK|Task model]] (verified)
- emits -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] (verified)
- depends_on -> [[DB-TASK|Task model]] (partial)
- depends_on -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> calls (verified)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> owns (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> depends_on (partial)
- [[DB-TASK|Task model]] -> depends_on (partial)
- [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00021` verified: missing none

## Notes

Creates operations_work_item_created event; provider writeback can fail closed.
