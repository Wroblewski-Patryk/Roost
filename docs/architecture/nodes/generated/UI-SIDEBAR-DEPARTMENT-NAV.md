---
id: "UI-SIDEBAR-DEPARTMENT-NAV"
name: "Sidebar department navigation"
type: "ui_element"
status: "verified"
layer: "frontend"
module: "shell"
feature: "cross-app"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#ui #navigation"
---

# Sidebar department navigation

- ID: `UI-SIDEBAR-DEPARTMENT-NAV`
- Type: `ui_element`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `shell`
- Feature: `cross-app`
- File: `web/src/layout/shell.tsx`

## Description

Sidebar navigation over department catalog and route registry.

## Direct Links

- Parent: [[COMP-SHELL|Authenticated Shell component]]
- Children: none
- Depends on: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[UI-SIDEBAR-DEPARTMENT-NAV|Sidebar department navigation]]
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00272` verified: missing none

## Notes

Custom departments appear after reload when linked to existing views.
