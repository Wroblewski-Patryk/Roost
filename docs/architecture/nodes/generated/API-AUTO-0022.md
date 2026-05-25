---
id: "API-AUTO-0022"
name: "GET /v1/agent-logs"
type: "api_route"
status: "implemented"
layer: "backend"
module: "agent-logs"
feature: "agent-logs-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# GET /v1/agent-logs

- ID: `API-AUTO-0022`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `agent-logs`
- Feature: `agent-logs-coverage`
- File: `src/modules/agent-logs/agent-logs.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0002|Agent Logs Coverage Expansion]]
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
- [[FEAT-AUTO-0002|Agent Logs Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0002|Agent Logs Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0002` Agent Logs Coverage Expansion auto chain: [[API-AUTO-0022|GET /v1/agent-logs]] -> [[API-AUTO-0023|GET /v1/agent-logs/:id]] -> [[API-AUTO-0116|POST /v1/agent-logs]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00084` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
