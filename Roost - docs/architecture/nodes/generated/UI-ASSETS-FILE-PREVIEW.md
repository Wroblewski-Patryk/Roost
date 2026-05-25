---
id: "UI-ASSETS-FILE-PREVIEW"
name: "Assets file preview"
type: "ui_element"
status: "verified"
layer: "frontend"
module: "assets"
feature: "assets-context"
risk_level: "medium"
completion_percent: "85"
verification_status: "verified"
last_verified_at: "2026-05-17"
tags: "#ui #assets #preview"
---

# Assets file preview

- ID: `UI-ASSETS-FILE-PREVIEW`
- Type: `ui_element`
- Status: `verified`
- Verification: `verified`
- Layer: `frontend`
- Module: `assets`
- Feature: `assets-context`
- File: `web/src/features/departments/assets-route.tsx`

## Description

Assets preview panel for typed Drive and resource content.

## Direct Links

- Parent: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- Children: none
- Depends on: [[COMP-ASSETS-ROUTE|AssetsRoute component]], [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Used by: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- UI: [[UI-ASSETS-FILE-PREVIEW|Assets file preview]]
- API: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]]
- Docs: [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] (partial)
- depends_on -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (partial)
- [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> contains (partial)
- [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> depends_on (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- `TEST-PLAYWRIGHT-ASSETS` Assets Playwright proof: `verified`

## Evidence

- `EVID-AUTO-00041` verified: missing none

## Notes

Image preview and type filters have local proof.
