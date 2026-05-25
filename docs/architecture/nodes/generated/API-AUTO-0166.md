---
id: "API-AUTO-0166"
name: "PUT /v1/integration-settings/google_drive"
type: "api_route"
status: "implemented"
layer: "backend"
module: "integration-settings"
feature: "integration-settings-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PUT /v1/integration-settings/google_drive

- ID: `API-AUTO-0166`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `integration-settings`
- Feature: `integration-settings-coverage`
- File: `src/modules/integration-settings/integration-settings.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0015|Integration Settings Coverage Expansion]]
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
- [[FEAT-AUTO-0015|Integration Settings Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0015|Integration Settings Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0015` Integration Settings Coverage Expansion auto chain: [[API-AUTO-0007|DELETE /v1/integration-settings/clickup/webhooks/:id]] -> [[API-AUTO-0048|GET /v1/integration-settings/clickup]] -> [[API-AUTO-0049|GET /v1/integration-settings/clickup/events]] -> [[API-AUTO-0050|GET /v1/integration-settings/clickup/webhooks]] -> [[API-AUTO-0051|GET /v1/integration-settings/google_drive]] -> [[API-AUTO-0052|GET /v1/integration-settings/google_drive/folders/discover]] -> [[API-AUTO-0138|POST /v1/integration-settings/clickup/discover]] -> [[API-AUTO-0139|POST /v1/integration-settings/clickup/events/retry-failed]] -> [[API-AUTO-0140|POST /v1/integration-settings/clickup/maintenance/run]] -> [[API-AUTO-0141|POST /v1/integration-settings/clickup/webhooks/reconcile]] -> [[API-AUTO-0142|POST /v1/integration-settings/google_drive/changes/reconcile]] -> [[API-AUTO-0143|POST /v1/integration-settings/google_drive/import]] -> [[API-AUTO-0144|POST /v1/integration-settings/google_drive/oauth/authorize-url]] -> [[API-AUTO-0145|POST /v1/integration-settings/google_drive/oauth/exchange]] -> [[API-AUTO-0165|PUT /v1/integration-settings/clickup]] -> [[API-AUTO-0166|PUT /v1/integration-settings/google_drive]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00256` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
