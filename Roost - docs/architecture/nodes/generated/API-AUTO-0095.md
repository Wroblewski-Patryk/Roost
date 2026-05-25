---
id: "API-AUTO-0095"
name: "PATCH /v1/goals/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "goals"
feature: "goals-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PATCH /v1/goals/:id

- ID: `API-AUTO-0095`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `goals`
- Feature: `goals-coverage`
- File: `src/modules/goals/goals.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0012|Goals Coverage Expansion]]
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
- [[FEAT-AUTO-0012|Goals Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0012|Goals Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0012` Goals Coverage Expansion auto chain: [[API-AUTO-0006|DELETE /v1/goals/:id]] -> [[API-AUTO-0042|GET /v1/goals]] -> [[API-AUTO-0043|GET /v1/goals/:id]] -> [[API-AUTO-0095|PATCH /v1/goals/:id]] -> [[API-AUTO-0134|POST /v1/goals]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00157` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
