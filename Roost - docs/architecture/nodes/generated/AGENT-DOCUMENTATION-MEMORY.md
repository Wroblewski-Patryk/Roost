---
id: "AGENT-DOCUMENTATION-MEMORY"
name: "Documentation and memory lane"
type: "agent"
status: "implemented"
layer: "governance"
module: "agents"
feature: "agent-workflow"
risk_level: "medium"
completion_percent: "30"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#agent #docs"
---

# Documentation and memory lane

- ID: `AGENT-DOCUMENTATION-MEMORY`
- Type: `agent`
- Status: `implemented`
- Verification: `tested`
- Layer: `governance`
- Module: `agents`
- Feature: `agent-workflow`
- File: `.agents/workflows/responsibility-lanes.md`

## Description

Lane responsible for keeping evidence registries, docs, state, and task contracts synchronized.

## Direct Links

- Parent: [[AGENT-COORDINATOR|Coordinator agent role]]
- Children: none
- Depends on: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00335` tested: missing none

## Notes

Recorded as responsibility lane for future graph maintenance.
