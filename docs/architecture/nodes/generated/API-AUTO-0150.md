---
id: "API-AUTO-0150"
name: "POST /v1/operating-model/folders"
type: "api_route"
status: "implemented"
layer: "backend"
module: "operating-model"
feature: "operating-model-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# POST /v1/operating-model/folders

- ID: `API-AUTO-0150`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `operating-model`
- Feature: `operating-model-coverage`
- File: `src/modules/operating-model/operating-model.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0020|Operating Model Coverage Expansion]]
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
- [[FEAT-AUTO-0020|Operating Model Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0020|Operating Model Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0020` Operating Model Coverage Expansion auto chain: [[API-AUTO-0010|DELETE /v1/operating-model/areas/:id]] -> [[API-AUTO-0011|DELETE /v1/operating-model/automation-definitions/:id]] -> [[API-AUTO-0012|DELETE /v1/operating-model/folders/:id]] -> [[API-AUTO-0013|DELETE /v1/operating-model/knowledge-roots/:id]] -> [[API-AUTO-0014|DELETE /v1/operating-model/storage-locations/:id]] -> [[API-AUTO-0059|GET /v1/operating-model]] -> [[API-AUTO-0060|GET /v1/operating-model/area-inventory]] -> [[API-AUTO-0061|GET /v1/operating-model/areas]] -> [[API-AUTO-0062|GET /v1/operating-model/automation-definitions]] -> [[API-AUTO-0063|GET /v1/operating-model/automation-definitions/:id]] -> [[API-AUTO-0064|GET /v1/operating-model/external-fields]] -> [[API-AUTO-0065|GET /v1/operating-model/external-mappings]] -> [[API-AUTO-0066|GET /v1/operating-model/folders]] -> [[API-AUTO-0067|GET /v1/operating-model/folders/:id]] -> [[API-AUTO-0068|GET /v1/operating-model/knowledge-roots]] -> [[API-AUTO-0069|GET /v1/operating-model/knowledge-roots/:id]] -> [[API-AUTO-0070|GET /v1/operating-model/storage-locations]] -> [[API-AUTO-0071|GET /v1/operating-model/storage-locations/:id]] -> [[API-AUTO-0072|GET /v1/operating-model/tables]] -> [[API-AUTO-0102|PATCH /v1/operating-model/areas/:id]] -> [[API-AUTO-0103|PATCH /v1/operating-model/automation-definitions/:id]] -> [[API-AUTO-0104|PATCH /v1/operating-model/external-mappings/:id/scope]] -> [[API-AUTO-0105|PATCH /v1/operating-model/folders/:id]] -> [[API-AUTO-0106|PATCH /v1/operating-model/knowledge-roots/:id]] -> [[API-AUTO-0107|PATCH /v1/operating-model/storage-locations/:id]] -> [[API-AUTO-0148|POST /v1/operating-model/areas]] -> [[API-AUTO-0149|POST /v1/operating-model/automation-definitions]] -> [[API-AUTO-0150|POST /v1/operating-model/folders]] -> [[API-AUTO-0151|POST /v1/operating-model/knowledge-roots]] -> [[API-AUTO-0152|POST /v1/operating-model/storage-locations]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00240` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
