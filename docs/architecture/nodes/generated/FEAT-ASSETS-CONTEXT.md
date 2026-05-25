---
id: "FEAT-ASSETS-CONTEXT"
name: "Assets Context Workbench"
type: "feature"
status: "verified"
layer: "full-stack"
module: "assets"
feature: "assets-context"
risk_level: "medium"
completion_percent: "85"
verification_status: "tested"
last_verified_at: "2026-05-17"
tags: "#feature #assets #drive"
---

# Assets Context Workbench

- ID: `FEAT-ASSETS-CONTEXT`
- Type: `feature`
- Status: `verified`
- Verification: `tested`
- Layer: `full-stack`
- Module: `assets`
- Feature: `assets-context`
- File: `docs/planning/cc-08-002-assets-context-read-api-task-contract.md`

## Description

08 Assets file/folder/context workbench over Google Drive, previews, resources, and knowledge metadata.

## Direct Links

- Parent: none
- Children: [[API-ASSETS-CONTEXT|GET /v1/assets/context]], [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]], [[COMP-ASSETS-ROUTE|AssetsRoute component]], [[UI-ASSETS-FILE-PREVIEW|Assets file preview]]
- Depends on: [[DOC-DMS-ARCH|Department management systems architecture]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- API: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]], [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]]
- Docs: [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- owns -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (partial)
- owns -> [[API-AUTO-0026|GET /v1/assets/files/:id/preview]] (partial)
- owns -> [[API-AUTO-0089|PATCH /v1/assets/folders/:id]] (partial)
- contains -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (partial)
- contains -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] (partial)
- contains -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] (partial)
- contains -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] (partial)
- depends_on -> [[DOC-DMS-ARCH|Department management systems architecture]] (partial)
- contains -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] (partial)
- contains -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] (partial)
- contains -> [[SVC-AUTO-0001|Integration Settings.Service]] (partial)
- contains -> [[CLS-AUTO-0001|Clickup.Client]] (partial)
- contains -> [[CLS-AUTO-0002|Errors]] (partial)
- contains -> [[CLS-AUTO-0003|Google Drive.Client]] (partial)
- contains -> [[API-AUTO-0026|GET /v1/assets/files/:id/preview]] (partial)
- contains -> [[API-AUTO-0089|PATCH /v1/assets/folders/:id]] (partial)
- contains -> [[DB-AUTO-0026|google_drive_content_snapshots model]] (partial)
- contains -> [[INT-AUTO-0001|Clickup.Client]] (partial)
- contains -> [[INT-AUTO-0002|Clickup.Maintenance Scheduler]] (partial)
- contains -> [[INT-AUTO-0003|Clickup.Mapper]] (partial)
- contains -> [[INT-AUTO-0004|Clickup.Sync]] (partial)
- contains -> [[INT-AUTO-0005|Clickup.Webhooks]] (partial)
- contains -> [[INT-AUTO-0006|Webhook Signature]] (partial)
- contains -> [[INT-AUTO-0007|Errors]] (partial)
- contains -> [[INT-AUTO-0008|Google Drive.Auth]] (partial)
- contains -> [[INT-AUTO-0009|Google Drive.Client]] (partial)
- contains -> [[INT-AUTO-0010|Google Drive.Content]] (partial)
- contains -> [[INT-AUTO-0011|Google Drive.Sync]] (partial)
- contains -> [[INT-AUTO-0012|Integration Settings.Service]] (partial)
- contains -> [[INT-AUTO-0013|Secrets]] (partial)
- contains -> [[CRON-AUTO-0001|Clickup.Maintenance Scheduler]] (partial)
- contains -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] (partial)
- contains -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]] (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- No test rows.

## Evidence

- `EVID-ASSETS-001` tested: missing none

## Notes

Production Drive content/write/freshness samples remain separate proof.
