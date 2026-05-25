---
id: "FUNC-DASHBOARD-RISK-RANK"
name: "riskRank"
type: "function"
status: "verified"
layer: "backend"
module: "dashboard"
feature: "dashboard-command"
risk_level: "medium"
completion_percent: "80"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#function #dashboard"
---

# riskRank

- ID: `FUNC-DASHBOARD-RISK-RANK`
- Type: `function`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `dashboard`
- Feature: `dashboard-command`
- File: `src/modules/dashboard/dashboard.routes.ts`

## Description

Ranks active risks for dashboard command packet severity.

## Direct Links

- Parent: [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]]
- Children: none
- Depends on: none
- Used by: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- UI: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- API: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- Database: none
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- No outgoing relations.
- [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]] -> contains (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> depends_on (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00061` verified: missing none

## Notes

Part of dashboard command summary derivation.
