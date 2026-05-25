---
id: "UI-OPERATIONS-TASK-CARD"
name: "Operations task card and modal"
type: "ui_element"
status: "verified"
layer: "frontend"
module: "operations"
feature: "operations-work-items"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#ui #operations #tasks"
---

# Operations task card and modal

- ID: `UI-OPERATIONS-TASK-CARD`
- Type: `ui_element`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `web/src/features/departments/operations-route.tsx`

## Description

Task card and modal controls for Operations work item inspection and edits.

## Direct Links

- Parent: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- Children: none
- Depends on: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]], [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]]
- Used by: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- UI: [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]]
- API: [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] (partial)
- depends_on -> [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> contains (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- `TEST-PLAYWRIGHT-OPS` Operations Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00025` verified: missing none

## Notes

Validated in rendered proof for assignment and schedule fields.
