---
id: "PROMPT-ARCH-GRAPH-CHECK"
name: "Architecture graph check prompt"
type: "prompt"
status: "implemented"
layer: "governance"
module: "architecture"
feature: "architecture-evidence"
risk_level: "medium"
completion_percent: "20"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#prompt #agent-workflow"
---

# Architecture graph check prompt

- ID: `PROMPT-ARCH-GRAPH-CHECK`
- Type: `prompt`
- Status: `implemented`
- Verification: `tested`
- Layer: `governance`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `docs/architecture/architecture-evidence-system.md`

## Description

Reusable instruction for future agents: inspect registry chain before answering whether a function works.

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

- `EVID-AUTO-00336` tested: missing none

## Notes

Future prompt file can be split if agent workflows need a dedicated prompt pack.
