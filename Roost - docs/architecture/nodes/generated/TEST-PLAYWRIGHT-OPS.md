---
id: "TEST-PLAYWRIGHT-OPS"
name: "Playwright Operations render proof"
type: "test"
status: "verified"
layer: "testing"
module: "operations"
feature: "operations-work-items"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#test #playwright #operations"
---

# Playwright Operations render proof

- ID: `TEST-PLAYWRIGHT-OPS`
- Type: `test`
- Status: `verified`
- Verification: `verified`
- Layer: `testing`
- Module: `operations`
- Feature: `operations-work-items`
- File: `docs/planning/dashboard-operations-workforce-foundation-task-contract.md`

## Description

Rendered proof for Operations task assignment and schedule state.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- API: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]]
- Database: [[DB-TASK|Task model]]
- Tests: none
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00051` verified: missing none

## Notes

Validation server and browser processes cleaned up after proof.
