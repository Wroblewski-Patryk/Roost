---
id: "PAGE-00-GENERAL"
name: "/areas?area=00-ogolny&view=overview"
type: "page"
status: "verified"
layer: "frontend"
module: "dashboard"
feature: "dashboard-command"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#page #dashboard"
---

# /areas?area=00-ogolny&view=overview

- ID: `PAGE-00-GENERAL`
- Type: `page`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `dashboard`
- Feature: `dashboard-command`
- File: `web/src/app-route-registry.ts`

## Description

Canonical authenticated post-login General dashboard route.

## Direct Links

- Parent: [[COMP-SHELL|Authenticated Shell component]]
- Children: none
- Depends on: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- API: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- Database: none
- Tests: [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- renders -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] (verified)
- calls -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] (partial)
- depends_on -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]

## Tests

- `TEST-PLAYWRIGHT-DASHBOARD` Dashboard Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00257` verified: missing none

## Notes

Dashboard alias redirects/normalizes here.
