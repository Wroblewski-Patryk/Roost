---
id: "API-AUTO-0108"
name: "PATCH /v1/operations/task-lists/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "operations"
feature: "operations-work-items"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PATCH /v1/operations/task-lists/:id

- ID: `API-AUTO-0108`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `operations`
- Feature: `operations-work-items`
- File: `src/modules/operations/operations.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]
- Children: none
- Depends on: none
- Used by: none
- UI: none
- API: none
- Database: [[DB-TASK|Task model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]]
- Agent: none

## Relations

- writes -> [[DB-TASK|Task model]] (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> owns (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> contains (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00198` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
