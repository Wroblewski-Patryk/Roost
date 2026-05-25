---
id: "API-AUTO-0112"
name: "PATCH /v1/task-lists/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "task-lists"
feature: "task-lists-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PATCH /v1/task-lists/:id

- ID: `API-AUTO-0112`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `task-lists`
- Feature: `task-lists-coverage`
- File: `src/modules/task-lists/task-lists.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0027|Task Lists Coverage Expansion]]
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
- [[FEAT-AUTO-0027|Task Lists Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0027|Task Lists Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0027` Task Lists Coverage Expansion auto chain: [[API-AUTO-0018|DELETE /v1/task-lists/:id]] -> [[API-AUTO-0083|GET /v1/task-lists]] -> [[API-AUTO-0084|GET /v1/task-lists/:id]] -> [[API-AUTO-0112|PATCH /v1/task-lists/:id]] -> [[API-AUTO-0156|POST /v1/task-lists]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00202` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
