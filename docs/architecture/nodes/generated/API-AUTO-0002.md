---
id: "API-AUTO-0002"
name: "DELETE /v1/clients/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "clients"
feature: "clients-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# DELETE /v1/clients/:id

- ID: `API-AUTO-0002`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `clients`
- Feature: `clients-coverage`
- File: `src/modules/clients/clients.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0004|Clients Coverage Expansion]]
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
- [[FEAT-AUTO-0004|Clients Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0004|Clients Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0004` Clients Coverage Expansion auto chain: [[API-AUTO-0002|DELETE /v1/clients/:id]] -> [[API-AUTO-0027|GET /v1/clients]] -> [[API-AUTO-0028|GET /v1/clients/:id]] -> [[API-AUTO-0090|PATCH /v1/clients/:id]] -> [[API-AUTO-0118|POST /v1/clients]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00064` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
