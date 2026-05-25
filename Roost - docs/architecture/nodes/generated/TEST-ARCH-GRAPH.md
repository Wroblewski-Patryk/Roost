---
id: "TEST-ARCH-GRAPH"
name: "npm run architecture:graph"
type: "test"
status: "implemented"
layer: "testing"
module: "architecture"
feature: "architecture-evidence"
risk_level: "medium"
completion_percent: "80"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#test #architecture #graph"
---

# npm run architecture:graph

- ID: `TEST-ARCH-GRAPH`
- Type: `test`
- Status: `implemented`
- Verification: `tested`
- Layer: `testing`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `scripts/generate-architecture-graph.mjs`

## Description

Architecture registry validation and graph generation command.

## Direct Links

- Parent: [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]
- Children: none
- Depends on: [[CSV-NODES|Node registry CSV]], [[CSV-RELATIONS|Dependency relation CSV]], [[CSV-CHAINS|Function chain CSV]], [[CSV-TESTS|Test map CSV]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- executes -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] (verified)
- depends_on -> [[CSV-NODES|Node registry CSV]] (partial)
- depends_on -> [[CSV-RELATIONS|Dependency relation CSV]] (partial)
- depends_on -> [[CSV-CHAINS|Function chain CSV]] (partial)
- depends_on -> [[CSV-TESTS|Test map CSV]] (partial)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)
- [[CONFIG-PACKAGE-JSON|package.json scripts]] -> contains (partial)

## Chains

- `CHAIN-ARCH-EVIDENCE-SYSTEM` Architecture evidence generation chain: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> [[CSV-NODES|Node registry CSV]] -> [[CSV-RELATIONS|Dependency relation CSV]] -> [[CSV-CHAINS|Function chain CSV]] -> [[CSV-TESTS|Test map CSV]] -> [[TEST-ARCH-GRAPH|npm run architecture:graph]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00049` tested: missing none

## Notes

Runs generator and validates relation targets.
