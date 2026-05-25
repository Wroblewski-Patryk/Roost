---
id: "COMP-PEOPLE-AGENTS-ROUTE"
name: "PeopleAgentsRoute component"
type: "component"
status: "verified"
layer: "frontend"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#react #workforce"
---

# PeopleAgentsRoute component

- ID: `COMP-PEOPLE-AGENTS-ROUTE`
- Type: `component`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `web/src/features/departments/people-agents-route.tsx`

## Description

React People/Agents Directory management surface.

## Direct Links

- Parent: [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]]
- Children: none
- Depends on: [[API-WORKFORCE-LIST|GET /v1/workforce]], [[COMP-CC-DATA-TABLE|CcDataTable component]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]]
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]]
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- calls -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (verified)
- uses -> [[COMP-CC-DATA-TABLE|CcDataTable component]] (verified)
- depends_on -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (partial)
- depends_on -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] (partial)
- depends_on -> [[COMP-CC-DATA-TABLE|CcDataTable component]] (partial)
- contains -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] (partial)
- depends_on -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] (partial)
- depends_on -> [[FEAT-MANAGED-TABLE|Shared Managed Table]] (partial)
- [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> renders (verified)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> depends_on (partial)
- [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> depends_on (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- `TEST-PLAYWRIGHT-PEOPLE` People/Agents Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00034` verified: missing none

## Notes

Premium table, preview, and modal proof exists.
