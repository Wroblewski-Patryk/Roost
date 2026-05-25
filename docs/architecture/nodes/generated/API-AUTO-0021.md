---
id: "API-AUTO-0021"
name: "GET /v1/agent-events"
type: "api_route"
status: "implemented"
layer: "backend"
module: "agent-events"
feature: "agent-events-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# GET /v1/agent-events

- ID: `API-AUTO-0021`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `agent-events`
- Feature: `agent-events-coverage`
- File: `src/modules/agent-events/agent-events.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0001|Agent Events Coverage Expansion]]
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
- [[FEAT-AUTO-0001|Agent Events Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0001|Agent Events Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0001` Agent Events Coverage Expansion auto chain: [[API-AUTO-0021|GET /v1/agent-events]] -> [[API-AUTO-0115|POST /v1/agent-events/:id/ack]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00083` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
