---
id: "TEST-ROUTE-CAPABILITY"
name: "npm run check:route-capabilities"
type: "test"
status: "verified"
layer: "testing"
module: "cross-app"
feature: "cross-app"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#test #capabilities"
---

# npm run check:route-capabilities

- ID: `TEST-ROUTE-CAPABILITY`
- Type: `test`
- Status: `verified`
- Verification: `verified`
- Layer: `testing`
- Module: `cross-app`
- Feature: `cross-app`
- File: `scripts/check-route-capabilities.mjs`

## Description

Static route/capability drift validation.

## Direct Links

- Parent: none
- Children: none
- Depends on: [[CONFIG-PACKAGE-JSON|package.json scripts]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: [[DOC-TESTING|Testing documentation]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[CONFIG-PACKAGE-JSON|package.json scripts]] (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)
- [[CONFIG-PACKAGE-JSON|package.json scripts]] -> contains (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00048` verified: missing none

## Notes

Included in npm run validate.
