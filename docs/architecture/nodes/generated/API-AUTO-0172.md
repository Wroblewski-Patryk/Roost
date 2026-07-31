---
id: "API-AUTO-0172"
name: "POST /v1/product-map/projection/ingest"
type: "api_route"
status: "implemented"
layer: "backend"
module: "product-map"
feature: "product-map-coverage"
risk_level: "medium"
completion_percent: "0"
verification_status: "tested"
last_verified_at: "2026-07-31"
tags: "#api #auto-scaffold #missing"
---

# POST /v1/product-map/projection/ingest

- ID: `API-AUTO-0172`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `product-map`
- Feature: `product-map-coverage`
- File: `src/modules/product-map/product-map-projection.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0030|Product Map Coverage Expansion]]
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
- [[FEAT-AUTO-0030|Product Map Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0030|Product Map Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0030` Product Map Coverage Expansion auto chain: [[API-AUTO-0171|GET /v1/product-map/projection]] -> [[API-AUTO-0172|POST /v1/product-map/projection/ingest]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00453` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
