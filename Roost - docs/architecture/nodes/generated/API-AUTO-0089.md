---
id: "API-AUTO-0089"
name: "PATCH /v1/assets/folders/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "assets"
feature: "assets-context"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PATCH /v1/assets/folders/:id

- ID: `API-AUTO-0089`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `assets`
- Feature: `assets-context`
- File: `src/modules/assets/assets.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]]
- Children: none
- Depends on: none
- Used by: none
- UI: none
- API: none
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]]
- Agent: none

## Relations

- writes -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> owns (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00151` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
