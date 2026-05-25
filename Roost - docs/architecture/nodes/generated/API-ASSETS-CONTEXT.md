---
id: "API-ASSETS-CONTEXT"
name: "GET /v1/assets/context"
type: "api_route"
status: "verified"
layer: "backend"
module: "assets"
feature: "assets-context"
risk_level: "medium"
completion_percent: "85"
verification_status: "tested"
last_verified_at: "2026-05-17"
tags: "#api #assets #drive"
---

# GET /v1/assets/context

- ID: `API-ASSETS-CONTEXT`
- Type: `api_route`
- Status: `verified`
- Verification: `tested`
- Layer: `backend`
- Module: `assets`
- Feature: `assets-context`
- File: `src/modules/assets/assets.routes.ts`

## Description

Assets context packet for Drive files, resources, knowledge, and readiness.

## Direct Links

- Parent: [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]]
- Children: none
- Depends on: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Used by: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- UI: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- API: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- reads -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] (verified)
- depends_on -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] (partial)
- [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> calls (verified)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> owns (partial)
- [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> calls (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)
- [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> depends_on (partial)
- [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> depends_on (partial)
- [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> depends_on (partial)
- [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> depends_on (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- `TEST-API-LOCAL` npm run test:api:local: `verified`

## Evidence

- `EVID-AUTO-00038` tested: missing none

## Notes

Full API regression for low-limit case exists but latest full API run was pending in ASSETS-GDRIVE-006 note.
