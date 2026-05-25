---
id: "TEST-PLAYWRIGHT-PEOPLE"
name: "Playwright People/Agents proof"
type: "test"
status: "verified"
layer: "testing"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#test #playwright #workforce"
---

# Playwright People/Agents proof

- ID: `TEST-PLAYWRIGHT-PEOPLE`
- Type: `test`
- Status: `verified`
- Verification: `verified`
- Layer: `testing`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `docs/planning/people-agents-directory-premium-ux-task-contract.md`

## Description

Rendered proof for People/Agents table, preview, modal, and radar interactions.

## Direct Links

- Parent: [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]]
- Children: none
- Depends on: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: none
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00053` verified: missing none

## Notes

Desktop/tablet/mobile proof exists.
