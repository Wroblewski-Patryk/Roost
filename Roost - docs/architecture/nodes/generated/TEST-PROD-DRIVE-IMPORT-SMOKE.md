---
id: "TEST-PROD-DRIVE-IMPORT-SMOKE"
name: "Production Drive import and freshness smoke"
type: "test"
status: "verified"
layer: "testing"
module: "assets"
feature: "assets-context"
risk_level: "high"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#test #production #drive"
---

# Production Drive import and freshness smoke

- ID: `TEST-PROD-DRIVE-IMPORT-SMOKE`
- Type: `test`
- Status: `verified`
- Verification: `verified`
- Layer: `testing`
- Module: `assets`
- Feature: `assets-context`
- File: `docs/operations/agent-runtime-coverage-ledger.csv`

## Description

Production-safe proof of owner OAuth folder discovery scoped import and context readback for Drive freshness baseline.

## Direct Links

- Parent: [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]]
- Children: none
- Depends on: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: [[COMP-ASSETS-ROUTE|AssetsRoute component]]
- API: [[API-ASSETS-CONTEXT|GET /v1/assets/context]]
- Database: [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]]
- Tests: none
- Docs: [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-ASSETS-CONTEXT` Assets context chain: [[PAGE-08-ASSETS-FILES|/areas?area=08-zasoby&view=files]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-ASSETS-ROUTE|AssetsRoute component]] -> [[UI-ASSETS-FILE-PREVIEW|Assets file preview]] -> [[API-ASSETS-CONTEXT|GET /v1/assets/context]] -> [[DB-GOOGLE-DRIVE-FILE|google_drive_files model]] -> [[TEST-API-LOCAL|npm run test:api:local]] -> [[TEST-PLAYWRIGHT-ASSETS|Playwright Assets proof]] -> [[TEST-PROD-DRIVE-IMPORT-SMOKE|Production Drive import and freshness smoke]] -> [[DOC-ASSETS-CONTEXT-CONTRACT|Assets context task contract]] -> [[DOC-OPS-AGENT-RUNTIME-LEDGER|Operations agent runtime coverage ledger]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00340` verified: missing none

## Notes

Evidence sourced from AGRUN-COV-006 production smoke and imported-scope readback.
