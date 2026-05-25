---
id: "API-DASHBOARD-COMMAND"
name: "GET /v1/dashboard/command"
type: "api_route"
status: "verified"
layer: "backend"
module: "dashboard"
feature: "dashboard-command"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#api #dashboard #command"
---

# GET /v1/dashboard/command

- ID: `API-DASHBOARD-COMMAND`
- Type: `api_route`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `dashboard`
- Feature: `dashboard-command`
- File: `src/modules/dashboard/dashboard.routes.ts`

## Description

Workspace-scoped command packet for dashboard signals and next actions.

## Direct Links

- Parent: [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]]
- Children: none
- Depends on: [[DB-TASK|Task model]], [[DB-WORKFORCE-ENTITY|workforce_entities model]], [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Used by: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- UI: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- API: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- Database: [[DB-TASK|Task model]], [[DB-WORKFORCE-ENTITY|workforce_entities model]], [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- reads -> [[DB-TASK|Task model]] (verified)
- reads -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] (verified)
- reads -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] (verified)
- depends_on -> [[EVENT-OPERATIONS-WORK-ITEM-CREATED|operations_work_item_created]] (partial)
- depends_on -> [[DB-TASK|Task model]] (partial)
- depends_on -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] (partial)
- depends_on -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] (partial)
- depends_on -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] (partial)
- depends_on -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]] (partial)
- [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> calls (verified)
- [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]] -> owns (partial)
- [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> calls (partial)
- [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]] -> contains (partial)
- [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> depends_on (partial)
- [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> depends_on (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]

## Tests

- `TEST-API-LOCAL` npm run test:api:local: `verified`
- `TEST-ROUTE-CAPABILITY` npm run check:route-capabilities: `verified`

## Evidence

- `EVID-AUTO-00028` verified: missing none

## Notes

Dashboard packet is read-only and routes writes through domain surfaces.
