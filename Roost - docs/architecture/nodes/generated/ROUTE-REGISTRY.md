---
id: "ROUTE-REGISTRY"
name: "React app route registry"
type: "module"
status: "verified"
layer: "frontend"
module: "routing"
feature: "cross-app"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#routing #frontend"
---

# React app route registry

- ID: `ROUTE-REGISTRY`
- Type: `module`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `routing`
- Feature: `cross-app`
- File: `web/src/app-route-registry.ts`

## Description

Canonical React route metadata, aliases, and post-auth path normalization.

## Direct Links

- Parent: [[COMP-SHELL|Authenticated Shell component]]
- Children: none
- Depends on: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ROUTE-CAPABILITY|npm run check:route-capabilities]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> contains (partial)

## Chains

- No chain rows.

## Tests

- `TEST-ROUTE-CAPABILITY` npm run check:route-capabilities: `verified`

## Evidence

- `EVID-AUTO-00015` verified: missing none

## Notes

Route metadata is query-aware after full-function audit.
