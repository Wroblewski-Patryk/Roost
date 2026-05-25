---
id: "UI-PEOPLE-AGENTS-TABLE"
name: "People/Agents managed table"
type: "ui_element"
status: "verified"
layer: "frontend"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#ui #table #workforce"
---

# People/Agents managed table

- ID: `UI-PEOPLE-AGENTS-TABLE`
- Type: `ui_element`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `web/src/features/departments/people-agents-route.tsx`

## Description

Managed CcDataTable roster for human and agent workforce entities.

## Direct Links

- Parent: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- Children: none
- Depends on: [[COMP-CC-DATA-TABLE|CcDataTable component]], [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Used by: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- UI: [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]]
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]]
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[COMP-CC-DATA-TABLE|CcDataTable component]] (partial)
- depends_on -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> contains (partial)
- [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> depends_on (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- `TEST-PLAYWRIGHT-PEOPLE` People/Agents Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00035` verified: missing none

## Notes

Current reusable management-table proof source.
