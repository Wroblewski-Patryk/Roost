---
id: "API-AUTO-0015"
name: "DELETE /v1/pipeline-stages/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "pipeline-stages"
feature: "pipeline-stages-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# DELETE /v1/pipeline-stages/:id

- ID: `API-AUTO-0015`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `pipeline-stages`
- Feature: `pipeline-stages-coverage`
- File: `src/modules/pipeline-stages/pipeline-stages.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0021|Pipeline Stages Coverage Expansion]]
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
- [[FEAT-AUTO-0021|Pipeline Stages Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0021|Pipeline Stages Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0021` Pipeline Stages Coverage Expansion auto chain: [[API-AUTO-0015|DELETE /v1/pipeline-stages/:id]] -> [[API-AUTO-0074|GET /v1/pipeline-stages]] -> [[API-AUTO-0075|GET /v1/pipeline-stages/:id]] -> [[API-AUTO-0109|PATCH /v1/pipeline-stages/:id]] -> [[API-AUTO-0153|POST /v1/pipeline-stages]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00077` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
