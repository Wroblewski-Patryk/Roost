---
id: "FEAT-OPERATIONS-WORK-ITEMS"
name: "Operations Work Items"
type: "feature"
status: "verified"
layer: "full-stack"
module: "operations"
feature: "operations-work-items"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#feature #operations #tasks"
---

# Operations Work Items

- ID: `FEAT-OPERATIONS-WORK-ITEMS`
- Type: `feature`
- Status: `verified`
- Verification: `verified`
- Layer: `full-stack`
- Module: `operations`
- Feature: `operations-work-items`
- File: `docs/planning/dashboard-operations-workforce-foundation-task-contract.md`

## Description

Operations work-management packet and domain commands for tasks, responsibility, schedule, and evidence.

## Direct Links

- Parent: none
- Children: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]], [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]], [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]], [[DB-TASK|Task model]], [[COMP-OPERATIONS-ROUTE|OperationsRoute component]], [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]]
- Depends on: [[DOC-DMS-ARCH|Department management systems architecture]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- API: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]], [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- owns -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] (partial)
- owns -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] (partial)
- owns -> [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] (partial)
- owns -> [[API-AUTO-0073|GET /v1/operations/context]] (partial)
- owns -> [[API-AUTO-0108|PATCH /v1/operations/task-lists/:id]] (partial)
- contains -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] (partial)
- contains -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] (partial)
- contains -> [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] (partial)
- contains -> [[DB-TASK|Task model]] (partial)
- contains -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] (partial)
- contains -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] (partial)
- depends_on -> [[DOC-DMS-ARCH|Department management systems architecture]] (partial)
- contains -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]] (partial)
- contains -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] (partial)
- contains -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] (partial)
- contains -> [[API-AUTO-0073|GET /v1/operations/context]] (partial)
- contains -> [[API-AUTO-0108|PATCH /v1/operations/task-lists/:id]] (partial)
- contains -> [[PAGE-AUTO-0006|/operations]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-OPS-001` verified: missing none

## Notes

Provider calendar creation and recurrence execution remain blocked future commands.
