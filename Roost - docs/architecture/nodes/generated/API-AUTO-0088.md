---
id: "API-AUTO-0088"
name: "PATCH /v1/agents/:id"
type: "api_route"
status: "implemented"
layer: "backend"
module: "agents"
feature: "agents-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# PATCH /v1/agents/:id

- ID: `API-AUTO-0088`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `agents`
- Feature: `agents-coverage`
- File: `src/modules/agents/agents.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0003|Agents Coverage Expansion]]
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
- [[FEAT-AUTO-0003|Agents Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0003|Agents Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0003` Agents Coverage Expansion auto chain: [[API-AUTO-0001|DELETE /v1/agents/:id]] -> [[API-AUTO-0024|GET /v1/agents]] -> [[API-AUTO-0025|GET /v1/agents/:id]] -> [[API-AUTO-0088|PATCH /v1/agents/:id]] -> [[API-AUTO-0117|POST /v1/agents]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00150` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
