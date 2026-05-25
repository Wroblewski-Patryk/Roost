---
id: "FEAT-PEOPLE-AGENTS-DIRECTORY"
name: "People and Agents Directory"
type: "feature"
status: "verified"
layer: "full-stack"
module: "workforce"
feature: "people-agents-directory"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#feature #workforce #agents"
---

# People and Agents Directory

- ID: `FEAT-PEOPLE-AGENTS-DIRECTORY`
- Type: `feature`
- Status: `verified`
- Verification: `verified`
- Layer: `full-stack`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `docs/planning/people-agents-directory-premium-ux-task-contract.md`

## Description

Unified People/Agents roster with management table, preview, generated files, and Paperclip director source-of-truth fields.

## Direct Links

- Parent: none
- Children: [[API-WORKFORCE-LIST|GET /v1/workforce]], [[DB-WORKFORCE-ENTITY|workforce_entities model]], [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]], [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]]
- Depends on: [[DOC-UNIFIED-ORG|Unified organizational operating system architecture]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]]
- API: [[API-WORKFORCE-LIST|GET /v1/workforce]]
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]], [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]]
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- owns -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (partial)
- owns -> [[API-AUTO-0020|DELETE /v1/workforce/:id]] (partial)
- owns -> [[API-AUTO-0087|GET /v1/workforce/:id]] (partial)
- owns -> [[API-AUTO-0114|PATCH /v1/workforce/:id]] (partial)
- owns -> [[API-AUTO-0161|POST /v1/workforce]] (partial)
- owns -> [[API-AUTO-0162|POST /v1/workforce/:id/actions/delete]] (partial)
- owns -> [[API-AUTO-0163|POST /v1/workforce/:id/actions/sync]] (partial)
- contains -> [[API-WORKFORCE-LIST|GET /v1/workforce]] (partial)
- contains -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] (partial)
- contains -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] (partial)
- contains -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] (partial)
- depends_on -> [[DOC-UNIFIED-ORG|Unified organizational operating system architecture]] (partial)
- contains -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] (partial)
- contains -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] (partial)
- contains -> [[SVC-AUTO-0003|Workforce.Service]] (partial)
- contains -> [[API-AUTO-0020|DELETE /v1/workforce/:id]] (partial)
- contains -> [[API-AUTO-0087|GET /v1/workforce/:id]] (partial)
- contains -> [[API-AUTO-0114|PATCH /v1/workforce/:id]] (partial)
- contains -> [[API-AUTO-0161|POST /v1/workforce]] (partial)
- contains -> [[API-AUTO-0162|POST /v1/workforce/:id/actions/delete]] (partial)
- contains -> [[API-AUTO-0163|POST /v1/workforce/:id/actions/sync]] (partial)
- contains -> [[PAGE-AUTO-0007|/people-agents]] (partial)
- contains -> [[PAGE-AUTO-0009|/workforce]] (partial)
- contains -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)

## Chains

- `CHAIN-PEOPLE-AGENTS-DIRECTORY` People/Agents Directory chain: [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-PEOPLE-AGENTS-ROUTE|PeopleAgentsRoute component]] -> [[UI-PEOPLE-AGENTS-TABLE|People/Agents managed table]] -> [[API-WORKFORCE-LIST|GET /v1/workforce]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] -> [[EVENT-PAPERCLIP-SYNC-REQUESTED|paperclip_agent_config_sync_requested]]

## Tests

- No test rows.

## Evidence

- `EVID-WF-001` verified: missing none

## Notes

Production smoke remains separate after deploy.
