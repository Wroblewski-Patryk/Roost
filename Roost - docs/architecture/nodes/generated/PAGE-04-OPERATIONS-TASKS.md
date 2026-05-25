---
id: "PAGE-04-OPERATIONS-TASKS"
name: "/areas?area=04-operacje&view=tasks"
type: "page"
status: "verified"
layer: "frontend"
module: "operations"
feature: "operations-work-items"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#page #operations"
---

# /areas?area=04-operacje&view=tasks

- ID: `PAGE-04-OPERATIONS-TASKS`
- Type: `page`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `web/src/app-route-registry.ts`

## Description

Operations tasks page.

## Direct Links

- Parent: [[COMP-SHELL|Authenticated Shell component]]
- Children: none
- Depends on: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- API: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- renders -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] (verified)
- calls -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] (partial)
- depends_on -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- `TEST-PLAYWRIGHT-OPS` Operations Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00258` verified: missing none

## Notes

Canonical Operations path.
