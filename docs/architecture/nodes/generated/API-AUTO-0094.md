---
id: "API-AUTO-0094"
name: "PATCH /v1/decisions/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "decisions"
feature: "decisions-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PATCH /v1/decisions/:id

- ID: `API-AUTO-0094`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `decisions`
- Feature: `decisions-coverage`
- File: `src/modules/decisions/decisions.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0009|Decisions Coverage Expansion]]
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
- [[FEAT-AUTO-0009|Decisions Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0009|Decisions Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0009` Decisions Coverage Expansion auto chain: [[API-AUTO-0005|DELETE /v1/decisions/:id]] -> [[API-AUTO-0038|GET /v1/decisions]] -> [[API-AUTO-0039|GET /v1/decisions/:id]] -> [[API-AUTO-0094|PATCH /v1/decisions/:id]] -> [[API-AUTO-0133|POST /v1/decisions]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00156` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
