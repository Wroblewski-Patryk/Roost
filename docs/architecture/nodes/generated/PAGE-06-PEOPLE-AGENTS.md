---
id: "PAGE-06-PEOPLE-AGENTS"
name: "/areas?area=06-kadry&view=directory"
type: "page"
status: "verified"
layer: "frontend"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#page #workforce"
---

# /areas?area=06-kadry&view=directory

- ID: `PAGE-06-PEOPLE-AGENTS`
- Type: `page`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `web/src/app-route-registry.ts`

## Description

People/Agents Directory route.

## Direct Links

- Parent: [[COMP-SHELL|Authenticated Shell component]]
- Children: none
- Depends on: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- renders -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] (verified)
- calls -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (partial)
- depends_on -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- `TEST-PLAYWRIGHT-PEOPLE` People/Agents Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00259` verified: missing none

## Notes

Aliases /people-agents and /workforce.
