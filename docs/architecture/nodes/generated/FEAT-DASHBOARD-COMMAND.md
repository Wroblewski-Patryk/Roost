---
id: "FEAT-DASHBOARD-COMMAND"
name: "Dashboard Command Packet"
type: "feature"
status: "verified"
layer: "full-stack"
module: "dashboard"
feature: "dashboard-command"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#feature #dashboard"
---

# Dashboard Command Packet

- ID: `FEAT-DASHBOARD-COMMAND`
- Type: `feature`
- Status: `verified`
- Verification: `verified`
- Layer: `full-stack`
- Module: `dashboard`
- Feature: `dashboard-command`
- File: `docs/planning/dashboard-operations-workforce-foundation-task-contract.md`

## Description

Read-only command center packet over tasks, approvals, risks, workforce, assets, integrations, and next actions.

## Direct Links

- Parent: none
- Children: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]], [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]], [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]]
- Depends on: [[DOC-DMS-ARCH|Department management systems architecture]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]]
- API: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- Database: [[DB-TASK|Task model]], [[DB-WORKFORCE-ENTITY|workforce_entities model]], [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]], [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]]
- Docs: [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- owns -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] (partial)
- contains -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] (partial)
- contains -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] (partial)
- contains -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] (partial)
- depends_on -> [[DOC-DMS-ARCH|Department management systems architecture]] (partial)
- contains -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]] (partial)
- contains -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] (partial)
- contains -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] (partial)
- contains -> [[PAGE-AUTO-0002|/areas]] (partial)
- contains -> [[PAGE-AUTO-0005|/dashboard]] (partial)
- contains -> [[PAGE-AUTO-0008|/react-dashboard]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]

## Tests

- No test rows.

## Evidence

- `EVID-DASH-001` verified: missing none

## Notes

Dashboard remains read-only for assignment/calendar writes.
