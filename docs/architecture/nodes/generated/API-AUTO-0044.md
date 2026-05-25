---
id: "API-AUTO-0044"
name: "GET /v1/google-drive/files"
type: "api_route"
status: "implemented"
layer: "backend"
module: "google-drive"
feature: "google-drive-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# GET /v1/google-drive/files

- ID: `API-AUTO-0044`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `google-drive`
- Feature: `google-drive-coverage`
- File: `src/modules/google-drive/google-drive.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0013|Google Drive Coverage Expansion]]
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
- [[FEAT-AUTO-0013|Google Drive Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0013|Google Drive Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0013` Google Drive Coverage Expansion auto chain: [[API-AUTO-0044|GET /v1/google-drive/files]] -> [[API-AUTO-0045|GET /v1/google-drive/files/:id/content]] -> [[API-AUTO-0096|PATCH /v1/google-drive/docs/:id]] -> [[API-AUTO-0097|PATCH /v1/google-drive/files/:id/description]] -> [[API-AUTO-0098|PATCH /v1/google-drive/files/:id/scope]] -> [[API-AUTO-0099|PATCH /v1/google-drive/files/:id/text-content]] -> [[API-AUTO-0135|POST /v1/google-drive/docs]] -> [[API-AUTO-0136|POST /v1/google-drive/sheets]] -> [[API-AUTO-0164|PUT /v1/google-drive/sheets/:id/values]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00106` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
