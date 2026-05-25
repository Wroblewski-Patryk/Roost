---
id: "DOC-ASSETS-CONTEXT-CONTRACT"
name: "Assets context task contract"
type: "documentation"
status: "verified"
layer: "planning"
module: "assets"
feature: "assets-context"
risk_level: "low"
completion_percent: "100"
verification_status: "verified"
last_verified_at: "2026-05-17"
tags: "#planning #evidence"
---

# Assets context task contract

- ID: `DOC-ASSETS-CONTEXT-CONTRACT`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `planning`
- Module: `assets`
- Feature: `assets-context`
- File: `docs/planning/cc-08-002-assets-context-read-api-task-contract.md`

## Description

Task and proof source for Assets context read model and workbench.

## Direct Links

- Parent: [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]]
- Children: none
- Depends on: none
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- No outgoing relations.
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)
- [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]] -> depends_on (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00042` verified: missing none

## Notes

Historical proof source for Assets context API.
