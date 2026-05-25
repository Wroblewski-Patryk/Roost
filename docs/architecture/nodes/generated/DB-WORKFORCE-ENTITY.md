---
id: "DB-WORKFORCE-ENTITY"
name: "workforce_entities model"
type: "database_model"
status: "verified"
layer: "database"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#database #workforce"
---

# workforce_entities model

- ID: `DB-WORKFORCE-ENTITY`
- Type: `database_model`
- Status: `verified`
- Verification: `verified`
- Layer: `database`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `prisma/schema.prisma`

## Description

Unified human/AI roster model.

## Direct Links

- Parent: [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]]
- Children: none
- Depends on: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Used by: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- UI: none
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> reads (verified)
- [[API-WORKFORCE-LIST|GET /v1/workforce]] -> reads (verified)
- [[API-AUTO-0020|DELETE /v1/workforce/:id]] -> writes (partial)
- [[API-AUTO-0087|GET /v1/workforce/:id]] -> reads (partial)
- [[API-AUTO-0114|PATCH /v1/workforce/:id]] -> writes (partial)
- [[API-AUTO-0161|POST /v1/workforce]] -> writes (partial)
- [[API-AUTO-0162|POST /v1/workforce/:id/actions/delete]] -> writes (partial)
- [[API-AUTO-0163|POST /v1/workforce/:id/actions/sync]] -> writes (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> depends_on (partial)
- [[API-WORKFORCE-LIST|GET /v1/workforce]] -> depends_on (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> depends_on (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00033` verified: missing none

## Notes

Extended by Paperclip director indexes.
