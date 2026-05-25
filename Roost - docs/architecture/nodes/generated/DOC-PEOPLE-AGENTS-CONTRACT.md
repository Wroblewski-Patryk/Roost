---
id: "DOC-PEOPLE-AGENTS-CONTRACT"
name: "People/Agents premium UX contract"
type: "documentation"
status: "verified"
layer: "planning"
module: "workforce"
feature: "people-agents-directory"
risk_level: "low"
completion_percent: "100"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#planning #evidence"
---

# People/Agents premium UX contract

- ID: `DOC-PEOPLE-AGENTS-CONTRACT`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `planning`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `docs/planning/people-agents-directory-premium-ux-task-contract.md`

## Description

Task and proof source for People/Agents premium table and profile slice.

## Direct Links

- Parent: [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]]
- Children: none
- Depends on: none
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- No outgoing relations.
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00036` verified: missing none

## Notes

Fresh proof from 2026-05-19.
