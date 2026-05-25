---
id: "API-AUTO-0132"
name: "POST /v1/deals"
type: "api_route"
status: "implemented"
layer: "backend"
module: "deals"
feature: "deals-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# POST /v1/deals

- ID: `API-AUTO-0132`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `deals`
- Feature: `deals-coverage`
- File: `src/modules/deals/deals.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0008|Deals Coverage Expansion]]
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
- [[FEAT-AUTO-0008|Deals Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0008|Deals Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0008` Deals Coverage Expansion auto chain: [[API-AUTO-0004|DELETE /v1/deals/:id]] -> [[API-AUTO-0036|GET /v1/deals]] -> [[API-AUTO-0037|GET /v1/deals/:id]] -> [[API-AUTO-0093|PATCH /v1/deals/:id]] -> [[API-AUTO-0132|POST /v1/deals]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00222` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
