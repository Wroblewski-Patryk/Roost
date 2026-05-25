---
id: "COMP-ASSETS-ROUTE"
name: "AssetsRoute component"
type: "component"
status: "verified"
layer: "frontend"
module: "assets"
feature: "assets-context"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-17"
tags: "#react #assets"
---

# AssetsRoute component

- ID: `COMP-ASSETS-ROUTE`
- Type: `component`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `assets`
- Feature: `assets-context`
- File: `web/src/features/departments/assets-route.tsx`

## Description

React Assets workbench over files, folders, previews, filters, and context.

## Direct Links

- Parent: [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]]
- Children: none
- Depends on: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[UI-ASSETS-FILE-PREVIEW|Assets file preview]]
- API: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]]
- Docs: [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- calls -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (verified)
- depends_on -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (partial)
- depends_on -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] (partial)
- contains -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] (partial)
- depends_on -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] (partial)
- [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> renders (verified)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> depends_on (partial)
- [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> depends_on (partial)
- [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> depends_on (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- `TEST-PLAYWRIGHT-ASSETS` Assets Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00040` verified: missing none

## Notes

Rendered proof exists for Assets files/folders filters and preview workbench.
