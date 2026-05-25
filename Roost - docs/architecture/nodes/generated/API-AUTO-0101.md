---
id: "API-AUTO-0101"
name: "PATCH /v1/notes/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "notes"
feature: "notes-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PATCH /v1/notes/:id

- ID: `API-AUTO-0101`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `notes`
- Feature: `notes-coverage`
- File: `src/modules/notes/notes.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0018|Notes Coverage Expansion]]
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
- [[FEAT-AUTO-0018|Notes Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0018|Notes Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0018` Notes Coverage Expansion auto chain: [[API-AUTO-0009|DELETE /v1/notes/:id]] -> [[API-AUTO-0056|GET /v1/notes]] -> [[API-AUTO-0057|GET /v1/notes/:id]] -> [[API-AUTO-0101|PATCH /v1/notes/:id]] -> [[API-AUTO-0147|POST /v1/notes]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00191` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
