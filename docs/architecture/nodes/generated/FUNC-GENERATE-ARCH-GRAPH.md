---
id: "FUNC-GENERATE-ARCH-GRAPH"
name: "generateArchitectureGraph"
type: "function"
status: "implemented"
layer: "tooling"
module: "architecture"
feature: "architecture-evidence"
risk_level: "medium"
completion_percent: "80"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#function #tooling #graph"
---

# generateArchitectureGraph

- ID: `FUNC-GENERATE-ARCH-GRAPH`
- Type: `function`
- Status: `implemented`
- Verification: `tested`
- Layer: `tooling`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `scripts/generate-architecture-graph.mjs`

## Description

Reads CSV registries, validates graph references, and writes generated graph artifacts.

## Direct Links

- Parent: [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]
- Children: none
- Depends on: [[CSV-NODES|Node registry CSV]]
- Used by: [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[CSV-NODES|Node registry CSV]] (partial)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> contains (partial)
- [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00062` tested: missing none

## Notes

Initial validation command added.
