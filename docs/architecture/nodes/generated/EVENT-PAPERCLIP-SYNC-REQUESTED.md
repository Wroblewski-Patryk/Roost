---
id: "EVENT-PAPERCLIP-SYNC-REQUESTED"
name: "paperclip_agent_config_sync_requested"
type: "event"
status: "verified"
layer: "backend"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "80"
verification_status: "verified"
last_verified_at: "2026-05-18"
tags: "#event #paperclip #workforce"
---

# paperclip_agent_config_sync_requested

- ID: `EVENT-PAPERCLIP-SYNC-REQUESTED`
- Type: `event`
- Status: `verified`
- Verification: `verified`
- Layer: `backend`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `src/modules/workforce/workforce.routes.ts`

## Description

Outbox event queued for manual Paperclip workforce sync.

## Direct Links

- Parent: [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]]
- Children: none
- Depends on: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Used by: [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]]
- UI: none
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> depends_on (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00337` verified: missing none

## Notes

Worker consumption remains separate future proof.
