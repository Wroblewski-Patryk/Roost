---
id: "COMP-GENERAL-DASHBOARD"
name: "GeneralDashboard component"
type: "component"
status: "verified"
layer: "frontend"
module: "dashboard"
feature: "dashboard-command"
risk_level: "medium"
completion_percent: "88"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#react #dashboard"
---

# GeneralDashboard component

- ID: `COMP-GENERAL-DASHBOARD`
- Type: `component`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `dashboard`
- Feature: `dashboard-command`
- File: `web/src/features/departments/general-dashboard.tsx`

## Description

React 00 General dashboard command center consuming dashboard packet.

## Direct Links

- Parent: [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]]
- Children: none
- Depends on: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]], [[COMP-SHELL|Authenticated Shell component]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]]
- API: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- Database: [[DB-TASK|Task model]], [[DB-WORKFORCE-ENTITY|workforce_entities model]], [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]]
- Docs: [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- calls -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] (verified)
- depends_on -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] (partial)
- depends_on -> [[COMP-SHELL|Authenticated Shell component]] (partial)
- contains -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] (partial)
- depends_on -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] (partial)
- [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> renders (verified)
- [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]] -> contains (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> depends_on (partial)
- [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> depends_on (partial)
- [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> depends_on (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]

## Tests

- `TEST-PLAYWRIGHT-DASHBOARD` Dashboard Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00029` verified: missing none

## Notes

Loading/error states fixed during full-function architecture audit.
