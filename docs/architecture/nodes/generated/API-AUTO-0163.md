---
id: "API-AUTO-0163"
name: "POST /v1/workforce/:id/actions/sync"
type: "api_route"
status: "implemented"
layer: "backend"
module: "workforce"
feature: "people-agents-directory"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# POST /v1/workforce/:id/actions/sync

- ID: `API-AUTO-0163`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `workforce`
- Feature: `people-agents-directory`
- File: `src/modules/workforce/workforce.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]]
- Children: none
- Depends on: none
- Used by: none
- UI: none
- API: none
- Database: [[DB-WORKFORCE-ENTITY|workforce_entities model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]]
- Agent: none

## Relations

- writes -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> owns (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> contains (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00253` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
