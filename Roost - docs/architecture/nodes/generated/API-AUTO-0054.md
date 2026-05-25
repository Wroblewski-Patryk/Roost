---
id: "API-AUTO-0054"
name: "GET /v1/interactions/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "interactions"
feature: "interactions-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# GET /v1/interactions/:id

- ID: `API-AUTO-0054`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `interactions`
- Feature: `interactions-coverage`
- File: `src/modules/interactions/interactions.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0016|Interactions Coverage Expansion]]
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
- [[FEAT-AUTO-0016|Interactions Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0016|Interactions Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0016` Interactions Coverage Expansion auto chain: [[API-AUTO-0008|DELETE /v1/interactions/:id]] -> [[API-AUTO-0053|GET /v1/interactions]] -> [[API-AUTO-0054|GET /v1/interactions/:id]] -> [[API-AUTO-0100|PATCH /v1/interactions/:id]] -> [[API-AUTO-0146|POST /v1/interactions]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00116` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
