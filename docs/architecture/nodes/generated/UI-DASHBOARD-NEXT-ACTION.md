---
id: "UI-DASHBOARD-NEXT-ACTION"
name: "Dashboard next action panel"
type: "ui_element"
status: "verified"
layer: "frontend"
module: "dashboard"
feature: "dashboard-command"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#ui #dashboard"
---

# Dashboard next action panel

- ID: `UI-DASHBOARD-NEXT-ACTION`
- Type: `ui_element`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `dashboard`
- Feature: `dashboard-command`
- File: `web/src/features/departments/general-dashboard.tsx`

## Description

Dashboard panel for cross-department next actions and blocked action clarity.

## Direct Links

- Parent: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- Children: none
- Depends on: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]], [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- Used by: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- UI: [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]]
- API: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- Database: [[DB-TASK|Task model]], [[DB-WORKFORCE-ENTITY|workforce_entities model]], [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]]
- Docs: [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] (partial)
- depends_on -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] (partial)
- [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> contains (partial)
- [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> depends_on (partial)
- [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]] -> contains (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]

## Tests

- `TEST-PLAYWRIGHT-DASHBOARD` Dashboard Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00030` verified: missing none

## Notes

Does not perform assignment writes from dashboard context.
