---
id: "CSV-NODES"
name: "Node registry CSV"
type: "registry"
status: "implemented"
layer: "docs"
module: "architecture"
feature: "architecture-evidence"
risk_level: "medium"
completion_percent: "30"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#csv #registry"
---

# Node registry CSV

- ID: `CSV-NODES`
- Type: `registry`
- Status: `implemented`
- Verification: `tested`
- Layer: `docs`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `docs/architecture/nodes/nodes.csv`

## Description

Canonical registry for all mapped project elements.

## Direct Links

- Parent: [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]
- Children: none
- Depends on: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Used by: [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] (partial)
- [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> reads (verified)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> contains (partial)
- [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> depends_on (partial)
- [[CSV-RELATIONS|Dependency relation CSV]] -> depends_on (partial)
- [[CSV-CHAINS|Function chain CSV]] -> depends_on (partial)
- [[CSV-TESTS|Test map CSV]] -> depends_on (partial)
- [[TEST-ARCH-GRAPH|npm run architecture:graph]] -> depends_on (partial)
- [[FUNC-GENERATE-ARCH-GRAPH|generateArchitectureGraph]] -> depends_on (partial)
- [[WORKFLOW-NEW-FEATURE-REGISTRY-GATE|New feature registry gate]] -> depends_on (partial)

## Chains

- `CHAIN-ARCH-EVIDENCE-SYSTEM` Architecture evidence generation chain: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> [[CSV-NODES|Node registry CSV]] -> [[CSV-RELATIONS|Dependency relation CSV]] -> [[CSV-CHAINS|Function chain CSV]] -> [[CSV-TESTS|Test map CSV]] -> [[TEST-ARCH-GRAPH|npm run architecture:graph]]

## Tests

- `TEST-ARCH-GRAPH` npm run architecture:graph: `tested`

## Evidence

- `EVID-AUTO-00003` tested: missing none

## Notes

Seeded with high-value active surfaces; not yet exhaustive.
