---
id: "COMP-SHELL"
name: "Authenticated Shell component"
type: "component"
status: "verified"
layer: "frontend"
module: "shell"
feature: "cross-app"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#react #shell #navigation"
---

# Authenticated Shell component

- ID: `COMP-SHELL`
- Type: `component`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `shell`
- Feature: `cross-app`
- File: `web/src/layout/shell.tsx`

## Description

Authenticated layout shell and sidebar navigation fed by department catalog.

## Direct Links

- Parent: none
- Children: none
- Depends on: [[API-DEPARTMENTS-LIST|GET /v1/departments]], [[ROUTE-REGISTRY|React app route registry]]
- Used by: none
- UI: [[UI-SIDEBAR-DEPARTMENT-NAV|Sidebar department navigation]]
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- calls -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (verified)
- depends_on -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (partial)
- depends_on -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] (partial)
- depends_on -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] (partial)
- depends_on -> [[ROUTE-REGISTRY|React app route registry]] (partial)
- contains -> [[ROUTE-REGISTRY|React app route registry]] (partial)
- depends_on -> [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] (partial)
- depends_on -> [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]] (partial)
- depends_on -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] (partial)
- depends_on -> [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] (partial)
- depends_on -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] (partial)
- depends_on -> [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]] (partial)
- depends_on -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] (partial)
- depends_on -> [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] (partial)
- depends_on -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] (partial)
- depends_on -> [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] (partial)
- contains -> [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] (partial)
- contains -> [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] (partial)
- contains -> [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] (partial)
- contains -> [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] (partial)
- contains -> [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] (partial)
- contains -> [[UI-SIDEBAR-DEPARTMENT-NAV|Sidebar department navigation]] (partial)
- [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- `CHAIN-OPERATIONS-WORK-ITEM` Operations work item execution chain: [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[UI-OPERATIONS-TASK-CARD|Operations task card and modal]] -> [[API-OPERATIONS-CREATE-WORK-ITEM|POST /v1/operations/work-items]] -> [[FUNC-VISIBLE-WORK-ITEM-RELATIONS|visibleWorkItemRelations]] -> [[DB-TASK|Task model]] -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] -> [[API-OPERATIONS-WORK-ITEMS|GET /v1/operations/work-items]] -> [[COMP-OPERATIONS-ROUTE|OperationsRoute component]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]
- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- `TEST-BROWSER-MGMT-DEPT` Browser Management department proof: `verified`

## Evidence

- `EVID-AUTO-00014` verified: missing none

## Notes

Sidebar consumes department catalog with static fallback.
