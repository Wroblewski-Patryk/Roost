---
id: "DB-GOOGLE-DRIVE-FILE"
name: "google_drive_files model"
type: "database_model"
status: "verified"
layer: "database"
module: "assets"
feature: "assets-context"
risk_level: "medium"
completion_percent: "85"
verification_status: "tested"
last_verified_at: "2026-05-17"
tags: "#database #assets #drive"
---

# google_drive_files model

- ID: `DB-GOOGLE-DRIVE-FILE`
- Type: `database_model`
- Status: `verified`
- Verification: `tested`
- Layer: `database`
- Module: `assets`
- Feature: `assets-context`
- File: `prisma/schema.prisma`

## Description

Imported Google Drive file/folder persistence used by Assets context.

## Direct Links

- Parent: [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]]
- Children: none
- Depends on: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Used by: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- UI: none
- API: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> reads (verified)
- [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> reads (verified)
- [[API-AUTO-0026|GET /v1/assets/files/:id/preview]] -> reads (partial)
- [[API-AUTO-0089|PATCH /v1/assets/folders/:id]] -> writes (partial)
- [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> depends_on (partial)
- [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> depends_on (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)
- [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> depends_on (partial)

## Chains

- `CHAIN-DASHBOARD-COMMAND` Dashboard command packet chain: [[PAGE-00-GENERAL|/areas?area=00-ogolny&view=overview]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-GENERAL-DASHBOARD|GeneralDashboard component]] -> [[API-DASHBOARD-COMMAND|GET /v1/dashboard/command]] -> [[FUNC-DASHBOARD-RISK-RANK|riskRank]] -> [[DB-TASK|Task model]] -> [[DB-WORKFORCE-ENTITY|workforce_entities model]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[UI-DASHBOARD-NEXT-ACTION|Dashboard next action panel]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-DASHBOARD|Playwright dashboard render proof]] -> [[DOC-DASHBOARD-CONTRACT|Dashboard operations workforce foundation contract]]
- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00039` tested: missing none

## Notes

Drive first import is complete; content/write/freshness proof remains follow-up.
