---
id: "PAGE-08-ASSETS-FILES"
name: "/areas?area=08-zasoby&view=files"
type: "page"
status: "verified"
layer: "frontend"
module: "assets"
feature: "assets-context"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-17"
tags: "#page #assets"
---

# /areas?area=08-zasoby&view=files

- ID: `PAGE-08-ASSETS-FILES`
- Type: `page`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `assets`
- Feature: `assets-context`
- File: `web/src/app-route-registry.ts`

## Description

Assets files/folders page.

## Direct Links

- Parent: [[COMP-SHELL|Authenticated Shell component]]
- Children: none
- Depends on: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- API: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]]
- Docs: [[DOC-WEB-LAYER-OWNERSHIP|Web layer React ownership]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- renders -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] (verified)
- calls -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (partial)
- depends_on -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- `TEST-PLAYWRIGHT-ASSETS` Assets Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00260` verified: missing none

## Notes

Files/folders workbench proof exists.
