---
id: "FUNC-VISIBLE-WORK-ITEM-RELATIONS"
name: "visibleWorkItemRelations"
type: "function"
status: "verified"
layer: "backend"
module: "operations"
feature: "operations-work-items"
risk_level: "high"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#function #operations #security"
---

# visibleWorkItemRelations

- ID: `FUNC-VISIBLE-WORK-ITEM-RELATIONS`
- Type: `function`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `src/modules/operations/operations.routes.ts`

## Description

Validates related project, goal, target, list, users, and workforce entity are visible to the workspace before write.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: [[DB-TASK|Task model]]
- Used by: [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]], [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]]
- UI: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- API: [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]], [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DB-TASK|Task model]] (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> depends_on (partial)
- [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00060` verified: missing none

## Notes

Fail-closed relation guard for Operations writes.
