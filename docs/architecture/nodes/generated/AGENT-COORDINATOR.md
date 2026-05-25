---
id: "AGENT-COORDINATOR"
name: "Coordinator agent role"
type: "agent"
status: "verified"
layer: "governance"
module: "agents"
feature: "agent-workflow"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#agent #coordinator #governance"
---

# Coordinator agent role

- ID: `AGENT-COORDINATOR`
- Type: `agent`
- Status: `verified`
- Verification: `verified`
- Layer: `governance`
- Module: `agents`
- Feature: `agent-workflow`
- File: `AGENTS.md`

## Description

Default coordinator role that owns mission framing, lanes, integration, validation, and final done decision.

## Direct Links

- Parent: none
- Children: none
- Depends on: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: none

## Relations

- depends_on -> [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]] (partial)
- depends_on -> [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] (partial)
- depends_on -> [[SCRIPT-ARCH-GRAPH-GENERATOR|Architecture graph generator]] (partial)
- depends_on -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- depends_on -> [[DOC-ARCH-README|Architecture README]] (partial)
- depends_on -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]] (partial)
- depends_on -> [[DOC-DMS-ARCH|Department management systems architecture]] (partial)
- depends_on -> [[DOC-OPS-WORK-ITEM-CONTRACT|Operations foundation task contract]] (partial)
- depends_on -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]] (partial)
- depends_on -> [[DOC-PEOPLE-AGENTS-CONTRACT|People/Agents premium UX contract]] (partial)
- depends_on -> [[DOC-UNIFIED-ORG|Unified organizational operating system architecture]] (partial)
- depends_on -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] (partial)
- depends_on -> [[DOC-SHARED-TABLE-CONTRACT|Shared managed table task contract]] (partial)
- depends_on -> [[TEST-API-LOCAL|npm run test:api:local]] (partial)
- depends_on -> [[TEST-ROUTE-CAPABILITY|npm run check:route-capabilities]] (partial)
- depends_on -> [[TEST-ARCH-GRAPH|npm run architecture:graph]] (partial)
- depends_on -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] (partial)
- depends_on -> [[TEST-PLAYWRIGHT-OPS|Playwright Operations render proof]] (partial)
- depends_on -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] (partial)
- depends_on -> [[TEST-PLAYWRIGHT-PEOPLE|Playwright People/Agents proof]] (partial)
- depends_on -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] (partial)
- depends_on -> [[DOC-TESTING|Testing documentation]] (partial)
- depends_on -> [[AGENT-COORDINATOR|Coordinator agent role]] (partial)
- depends_on -> [[CONFIG-PACKAGE-JSON|package.json scripts]] (partial)
- depends_on -> [[FEAT-AUTO-0001|Agent Events Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0002|Agent Logs Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0003|Agents Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0004|Clients Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0005|Commercial Exceptions Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0006|Company Os Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0007|Connection Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0008|Deals Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0009|Decisions Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0010|Events Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0011|Finance Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0012|Goals Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0013|Google Drive Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0014|Intake Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0015|Integration Settings Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0016|Interactions Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0017|Mcp Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0018|Notes Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0019|Operating Graph Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0020|Operating Model Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0021|Pipeline Stages Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0022|Projects Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0023|Relationships Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0024|Sales Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0025|Strategy Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0026|Targets Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0027|Task Lists Coverage Expansion]] (partial)
- depends_on -> [[FEAT-AUTO-0028|Tasks Coverage Expansion]] (partial)
- depends_on -> [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] (partial)
- depends_on -> [[PAGE-04-OPERATIONS-TASKS|/areas?area=04-operacje&view=tasks]] (partial)
- depends_on -> [[PAGE-06-PEOPLE-AGENTS|/areas?area=06-kadry&view=directory]] (partial)
- depends_on -> [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] (partial)
- depends_on -> [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] (partial)
- depends_on -> [[UI-SIDEBAR-DEPARTMENT-NAV|Sidebar department navigation]] (partial)
- depends_on -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] (partial)
- depends_on -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]] (partial)
- contains -> [[AGENT-DOCUMENTATION-MEMORY|Documentation and memory lane]] (partial)
- depends_on -> [[AGENT-DOCUMENTATION-MEMORY|Documentation and memory lane]] (partial)
- depends_on -> [[PROMPT-ARCH-GRAPH-CHECK|Architecture graph check prompt]] (partial)
- depends_on -> [[WORKFLOW-AGENT-FUNCTION-CHECK|Systemic function verification workflow]] (partial)
- depends_on -> [[WORKFLOW-NEW-FEATURE-REGISTRY-GATE|New feature registry gate]] (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00056` verified: missing none

## Notes

Subagents were not spawned in this task because runtime tool policy allows spawning only on explicit user request.
