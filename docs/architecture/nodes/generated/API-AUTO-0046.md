---
id: "API-AUTO-0046"
name: "GET /v1/intake"
type: "api_route"
status: "implemented"
layer: "backend"
module: "intake"
feature: "intake-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# GET /v1/intake

- ID: `API-AUTO-0046`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `intake`
- Feature: `intake-coverage`
- File: `src/modules/intake/intake.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0014|Intake Coverage Expansion]]
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
- [[FEAT-AUTO-0014|Intake Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0014|Intake Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0014` Intake Coverage Expansion auto chain: [[API-AUTO-0046|GET /v1/intake]] -> [[API-AUTO-0047|GET /v1/intake/route-proposals]] -> [[API-AUTO-0137|POST /v1/intake/actions/propose-route]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00108` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
