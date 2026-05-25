---
id: "SCRIPT-ARCH-GRAPH-GENERATOR"
name: "Architecture graph generator"
type: "script"
status: "implemented"
layer: "tooling"
module: "architecture"
feature: "architecture-evidence"
risk_level: "medium"
completion_percent: "75"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#tooling #validation #graph"
---

# Architecture graph generator

- ID: `SCRIPT-ARCH-GRAPH-GENERATOR`
- Type: `script`
- Status: `implemented`
- Verification: `tested`
- Layer: `tooling`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `scripts/generate-architecture-graph.mjs`

## Description

Validates CSV registries and generates Obsidian Markdown, Mermaid, JSON, and summary output.

## Direct Links

- Parent: [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]
- Children: none
- Depends on: [[CSV-NODES|Node registry CSV]], [[CSV-RELATIONS|Dependency relation CSV]], [[CSV-CHAINS|Function chain CSV]], [[CSV-TESTS|Test map CSV]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- reads -> [[CSV-NODES|Node registry CSV]] (verified)
- reads -> [[CSV-RELATIONS|Dependency relation CSV]] (verified)
- reads -> [[CSV-CHAINS|Function chain CSV]] (verified)
- depends_on -> [[CSV-NODES|Node registry CSV]] (partial)
- depends_on -> [[CSV-RELATIONS|Dependency relation CSV]] (partial)
- depends_on -> [[CSV-CHAINS|Function chain CSV]] (partial)
- depends_on -> [[CSV-TESTS|Test map CSV]] (partial)
- depends_on -> [[FUNC-GENERATE-ARCH-GRAPH|generateArchitectureGraph]] (partial)
- [[TEST-ARCH-GRAPH|npm run architecture:graph]] -> executes (verified)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-ARCH-EVIDENCE-SYSTEM` Architecture evidence generation chain: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> [[CSV-NODES|Node registry CSV]] -> [[CSV-RELATIONS|Dependency relation CSV]] -> [[CSV-CHAINS|Function chain CSV]] -> [[CSV-TESTS|Test map CSV]] -> [[TEST-ARCH-GRAPH|npm run architecture:graph]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00002` tested: missing none

## Notes

Validates IDs, relation targets, chain nodes, test links, and evidence links.
