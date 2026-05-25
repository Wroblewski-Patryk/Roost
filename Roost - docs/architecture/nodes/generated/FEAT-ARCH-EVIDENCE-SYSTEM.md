---
id: "FEAT-ARCH-EVIDENCE-SYSTEM"
name: "Architecture Evidence System"
type: "feature"
status: "implemented"
layer: "governance"
module: "architecture"
feature: "architecture-evidence"
risk_level: "medium"
completion_percent: "45"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#architecture #evidence #obsidian #graph"
---

# Architecture Evidence System

- ID: `FEAT-ARCH-EVIDENCE-SYSTEM`
- Type: `feature`
- Status: `implemented`
- Verification: `tested`
- Layer: `governance`
- Module: `architecture`
- Feature: `architecture-evidence`
- File: `docs/architecture/architecture-evidence-system.md`

## Description

Obsidian-first CSV registry and generated graph system for architecture evidence.

## Direct Links

- Parent: none
- Children: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]], [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]], [[CSV-NODES|Node registry CSV]], [[CSV-RELATIONS|Dependency relation CSV]], [[CSV-CHAINS|Function chain CSV]], [[CSV-TESTS|Test map CSV]]
- Depends on: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- documented_by -> [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] (verified)
- contains -> [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] (partial)
- contains -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] (partial)
- contains -> [[CSV-NODES|Node registry CSV]] (partial)
- contains -> [[CSV-RELATIONS|Dependency relation CSV]] (partial)
- contains -> [[CSV-CHAINS|Function chain CSV]] (partial)
- contains -> [[CSV-TESTS|Test map CSV]] (partial)
- depends_on -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- contains -> [[TEST-ARCH-GRAPH|npm run architecture:graph]] (partial)
- contains -> [[FUNC-GENERATE-ARCH-GRAPH|generateArchitectureGraph]] (partial)
- contains -> [[PIPE-AUTO-0001|Adapter Smoke]] (partial)
- contains -> [[PIPE-AUTO-0002|Agent Training Smoke]] (partial)
- contains -> [[PIPE-AUTO-0003|Build Architecture Chain Hardening Worklist]] (partial)
- contains -> [[PIPE-AUTO-0004|Build Architecture Evidence Worklist]] (partial)
- contains -> [[PIPE-AUTO-0005|Build Architecture Health Dashboard]] (partial)
- contains -> [[PIPE-AUTO-0006|Check Architecture Chain Coverage]] (partial)
- contains -> [[PIPE-AUTO-0007|Check Architecture Chain Integrity]] (partial)
- contains -> [[PIPE-AUTO-0008|Check Architecture Evidence Gate]] (partial)
- contains -> [[PIPE-AUTO-0009|Check Architecture Node Integrity]] (partial)
- contains -> [[PIPE-AUTO-0010|Check Route Capabilities]] (partial)
- contains -> [[PIPE-AUTO-0011|Clean React Build]] (partial)
- contains -> [[PIPE-AUTO-0012|Clickup Production Bootstrap]] (partial)
- contains -> [[PIPE-AUTO-0013|Company Os Lifecycle Trace Smoke]] (partial)
- contains -> [[PIPE-AUTO-0014|Companycore Ai Ready Smoke]] (partial)
- contains -> [[PIPE-AUTO-0015|Companycore Mcp Smoke]] (partial)
- contains -> [[PIPE-AUTO-0016|Google Drive Production Smoke]] (partial)
- contains -> [[PIPE-AUTO-0017|Operating Model Registry Lifecycle Smoke]] (partial)
- contains -> [[PIPE-AUTO-0018|Owner Console Ux Smoke]] (partial)
- contains -> [[PIPE-AUTO-0019|Sync Architecture Chains]] (partial)
- contains -> [[PIPE-AUTO-0020|Sync Architecture Evidence Status]] (partial)
- contains -> [[PIPE-AUTO-0021|Sync Architecture Extended Registry]] (partial)
- contains -> [[PIPE-AUTO-0022|Sync Architecture Feature Coverage]] (partial)
- contains -> [[PIPE-AUTO-0023|Sync Architecture Node Verification]] (partial)
- contains -> [[PIPE-AUTO-0024|Sync Architecture Registry]] (partial)
- contains -> [[PIPE-AUTO-0025|Check Architecture Connectivity]] (partial)
- contains -> [[PROMPT-ARCH-GRAPH-CHECK|Architecture graph check prompt]] (partial)
- contains -> [[WORKFLOW-AGENT-FUNCTION-CHECK|Systemic function verification workflow]] (partial)
- contains -> [[WORKFLOW-NEW-FEATURE-REGISTRY-GATE|New feature registry gate]] (partial)
- contains -> [[PIPE-AUTO-0026|Build Architecture Impact Index]] (partial)
- contains -> [[PIPE-AUTO-0027|Check Architecture Node Catalog Consistency]] (partial)
- contains -> [[PIPE-AUTO-0028|Build Architecture Dead Nodes Report]] (partial)
- contains -> [[PIPE-AUTO-0029|Build Architecture Roadmap]] (partial)
- contains -> [[PIPE-AUTO-0030|Check Architecture Relation Integrity]] (partial)
- contains -> [[PIPE-AUTO-0031|Build Architecture Delta Report]] (partial)
- contains -> [[PIPE-AUTO-0032|Check Architecture Csv Contract]] (partial)
- contains -> [[PIPE-AUTO-0033|Check Architecture Doc Baseline]] (partial)
- contains -> [[PIPE-AUTO-0034|Check Architecture Node Links]] (partial)
- contains -> [[PIPE-AUTO-0035|Check Architecture Node Artifacts]] (partial)
- contains -> [[PIPE-AUTO-0036|Check Architecture Report Presence]] (partial)
- contains -> [[PIPE-AUTO-0037|Check Architecture Delta Zero]] (partial)
- contains -> [[PIPE-AUTO-0038|Sync Architecture Doc Baseline]] (partial)
- contains -> [[PIPE-AUTO-0039|Build Architecture Registry Catalog]] (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-ARCH-EVIDENCE-SYSTEM` Architecture evidence generation chain: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] -> [[CSV-NODES|Node registry CSV]] -> [[CSV-RELATIONS|Dependency relation CSV]] -> [[CSV-CHAINS|Function chain CSV]] -> [[CSV-TESTS|Test map CSV]] -> [[TEST-ARCH-GRAPH|npm run architecture:graph]]

## Tests

- `TEST-ARCH-GRAPH` npm run architecture:graph: `tested`

## Evidence

- `EVID-ARCH-001` tested: missing none

## Notes

Foundation exists; full repository coverage remains next checkpoint.
