---
id: "DB-TASK"
name: "Task model"
type: "database_model"
status: "verified"
layer: "database"
module: "operations"
feature: "operations-work-items"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#database #tasks"
---

# Task model

- ID: `DB-TASK`
- Type: `database_model`
- Status: `verified`
- Verification: `verified`
- Layer: `database`
- Module: `operations`
- Feature: `operations-work-items`
- File: `prisma/schema.prisma`

## Description

Task persistence with Operations responsibility and schedule fields.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]], [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]], [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]]
- Used by: [[COMP-OPERATIONS-ROUTE|OperationsRoute component]]
- UI: none
- API: [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]]
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] (partial)
- depends_on -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] (partial)
- depends_on -> [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] (partial)
- [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> reads (verified)
- [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> writes (verified)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> reads (verified)
- [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] -> writes (partial)
- [[API-AUTO-0073|GET /v1/operations/context]] -> reads (partial)
- [[API-AUTO-0108|PATCH /v1/operations/task-lists/:id]] -> writes (partial)
- [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> depends_on (partial)
- [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> depends_on (partial)
- [[API-OPERATIONS-UPDATE-WORK-ITEM|PATCH /v1/operations/work-items/:id]] -> depends_on (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)
- [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> depends_on (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> depends_on (partial)
- [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> depends_on (partial)

## Chains

- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00023` verified: missing none

## Notes

Migration and API tests verified locally.
