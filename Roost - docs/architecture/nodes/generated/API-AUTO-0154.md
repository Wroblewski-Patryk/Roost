---
id: "API-AUTO-0154"
name: "POST /v1/projects"
type: "api_route"
status: "implemented"
layer: "backend"
module: "projects"
feature: "projects-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# POST /v1/projects

- ID: `API-AUTO-0154`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `projects`
- Feature: `projects-coverage`
- File: `src/modules/projects/projects.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0022|Projects Coverage Expansion]]
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
- [[FEAT-AUTO-0022|Projects Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0022|Projects Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0022` Projects Coverage Expansion auto chain: [[API-AUTO-0016|DELETE /v1/projects/:id]] -> [[API-AUTO-0076|GET /v1/projects]] -> [[API-AUTO-0077|GET /v1/projects/:id]] -> [[API-AUTO-0110|PATCH /v1/projects/:id]] -> [[API-AUTO-0154|POST /v1/projects]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00244` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
