---
id: "WORKFLOW-AGENT-FUNCTION-CHECK"
name: "Systemic function verification workflow"
type: "workflow"
status: "implemented"
layer: "governance"
module: "architecture"
feature: "architecture-evidence"
risk_level: "high"
completion_percent: "60"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#workflow #agent #verification"
---

# Systemic function verification workflow

- ID: `WORKFLOW-AGENT-FUNCTION-CHECK`
- Type: `workflow`
- Status: `implemented`
- Verification: `tested`
- Layer: `governance`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `docs/architecture/architecture-evidence-system.md`

## Description

Agent workflow for checking function status through registry, dependencies, chain, tests, side effects, and docs.

## Direct Links

- Parent: [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]
- Children: none
- Depends on: [[CSV-CHAINS|Function chain CSV]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[CSV-CHAINS|Function chain CSV]] (partial)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00338` tested: missing none

## Notes

Workflow is documented and registry-backed; automation depth is next checkpoint.
