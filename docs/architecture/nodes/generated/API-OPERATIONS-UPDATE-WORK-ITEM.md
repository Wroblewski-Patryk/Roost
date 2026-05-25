---
id: "API-OPERATIONS-UPDATE-WORK-ITEM"
name: "PATCH /v1/operations/work-items/:id"
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

# PATCH /v1/operations/work-items/:id

- ID: `API-OPERATIONS-UPDATE-WORK-ITEM`
- Type: `api_route`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `src/modules/operations/operations.routes.ts`

## Description

Domain command for updating Operations work items and responsibility/schedule fields.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: [[DB-TASK|Task model]]
- Used by: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- UI: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- API: [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- writes -> [[DB-TASK|Task model]] (partial)
- depends_on -> [[DB-TASK|Task model]] (partial)
- depends_on -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> calls (verified)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> owns (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> depends_on (partial)
- [[DB-TASK|Task model]] -> depends_on (partial)
- [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00022` verified: missing none

## Notes

PATCH response now includes responsibility/schedule readback.
