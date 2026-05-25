---
id: "API-WORKFORCE-LIST"
name: "GET /v1/workforce"
type: "api_route"
status: "verified"
layer: "backend"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#api #workforce"
---

# GET /v1/workforce

- ID: `API-WORKFORCE-LIST`
- Type: `api_route`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `src/modules/workforce/workforce.routes.ts`

## Description

People and AI agents roster read endpoint.

## Direct Links

- Parent: [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]]
- Children: none
- Depends on: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Used by: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- UI: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- reads -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] (verified)
- depends_on -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> calls (verified)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> owns (partial)
- [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> calls (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> depends_on (partial)
- [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> depends_on (partial)
- [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> depends_on (partial)
- [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]] -> depends_on (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- `TEST-API-LOCAL` npm run test:api:local: `verified`

## Evidence

- `EVID-AUTO-00032` verified: missing none

## Notes

People/Agents route has repeated local proof.
