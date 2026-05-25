---
id: "DOC-ARCH-EVIDENCE-SYSTEM"
name: "Architecture evidence source doc"
type: "documentation"
status: "verified"
layer: "docs"
module: "architecture"
feature: "architecture-evidence"
risk_level: "low"
completion_percent: "80"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#docs #architecture"
---

# Architecture evidence source doc

- ID: `DOC-ARCH-EVIDENCE-SYSTEM`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `docs`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `docs/architecture/architecture-evidence-system.md`

## Description

Canonical rules for the architecture evidence system.

## Direct Links

- Parent: [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]
- Children: none
- Depends on: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> documented_by (verified)
- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)
- [[CSV-NODES|Node registry CSV]] -> depends_on (partial)
- [[FEAT-AUTO-0001|Agent Events Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0002|Agent Logs Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0003|Agents Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0004|Clients Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0005|Commercial Exceptions Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0006|Company Os Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0007|Connection Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0008|Deals Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0009|Decisions Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0010|Events Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0011|Finance Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0012|Goals Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0013|Google Drive Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0014|Intake Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0015|Integration Settings Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0016|Interactions Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0017|Mcp Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0018|Notes Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0019|Operating Graph Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0020|Operating Model Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0021|Pipeline Stages Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0022|Projects Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0023|Relationships Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0024|Sales Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0025|Strategy Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0026|Targets Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0027|Task Lists Coverage Expansion]] -> depends_on (partial)
- [[FEAT-AUTO-0028|Tasks Coverage Expansion]] -> depends_on (partial)
- [[AGENT-DOCUMENTATION-MEMORY|Documentation and memory lane]] -> depends_on (partial)

## Chains

- `CHAIN-ARCH-EVIDENCE-SYSTEM` Architecture evidence generation chain: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> [[CSV-NODES|Node registry CSV]] -> [[CSV-RELATIONS|Dependency relation CSV]] -> [[CSV-CHAINS|Function chain CSV]] -> [[CSV-TESTS|Test map CSV]] -> [[TEST-ARCH-GRAPH|npm run architecture:graph]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00001` verified: missing none

## Notes

Created as source-of-truth documentation for the registry foundation.
