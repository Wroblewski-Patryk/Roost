---
id: "API-AUTO-0086"
name: "GET /v1/tasks/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "tasks"
feature: "tasks-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# GET /v1/tasks/:id

- ID: `API-AUTO-0086`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `tasks`
- Feature: `tasks-coverage`
- File: `src/modules/tasks/tasks.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0028|Tasks Coverage Expansion]]
- Children: none
- Depends on: none
- Used by: none
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: none

## Relations

- No outgoing relations.
- [[FEAT-AUTO-0028|Tasks Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0028|Tasks Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0028` Tasks Coverage Expansion auto chain: [[API-AUTO-0019|DELETE /v1/tasks/:id]] -> [[API-AUTO-0085|GET /v1/tasks]] -> [[API-AUTO-0086|GET /v1/tasks/:id]] -> [[API-AUTO-0113|PATCH /v1/tasks/:id]] -> [[API-AUTO-0157|POST /v1/tasks]] -> [[API-AUTO-0158|POST /v1/tasks/:id/clickup/custom-fields/:fieldId]] -> [[API-AUTO-0159|POST /v1/tasks/sync/clickup]] -> [[API-AUTO-0160|POST /v1/tasks/sync/clickup/native]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00148` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
