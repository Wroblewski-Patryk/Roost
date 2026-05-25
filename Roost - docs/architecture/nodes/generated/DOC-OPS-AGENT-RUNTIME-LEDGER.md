---
id: "DOC-OPS-AGENT-RUNTIME-LEDGER"
name: "Operations agent runtime coverage ledger"
type: "documentation"
status: "verified"
layer: "operations"
module: "assets"
feature: "assets-context"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#docs #operations #evidence"
---

# Operations agent runtime coverage ledger

- ID: `DOC-OPS-AGENT-RUNTIME-LEDGER`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `operations`
- Module: `assets`
- Feature: `assets-context`
- File: `docs/operations/agent-runtime-coverage-ledger.csv`

## Description

Production smoke evidence ledger for provider runtime journeys including Drive import/freshness baseline.

## Direct Links

- Parent: [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]]
- Children: none
- Depends on: [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00341` verified: missing none

## Notes

AGRUN-COV-006 captures real owner consent and production scoped Drive import/readback evidence.
