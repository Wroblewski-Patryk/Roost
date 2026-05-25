---
id: "WORKFLOW-NEW-FEATURE-REGISTRY-GATE"
name: "New feature registry gate"
type: "workflow"
status: "implemented"
layer: "governance"
module: "architecture"
feature: "architecture-evidence"
risk_level: "high"
completion_percent: "60"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#workflow #done-gate"
---

# New feature registry gate

- ID: `WORKFLOW-NEW-FEATURE-REGISTRY-GATE`
- Type: `workflow`
- Status: `implemented`
- Verification: `tested`
- Layer: `governance`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `docs/architecture/architecture-evidence-system.md`

## Description

Every new feature must update CSV nodes, relations, chains, tests, evidence, and generated graph before done.

## Direct Links

- Parent: [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]
- Children: none
- Depends on: [[CSV-NODES|Node registry CSV]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[CSV-NODES|Node registry CSV]] (partial)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00339` tested: missing none

## Notes

Task template was not structurally rewritten; future tasks must reference this gate.
