---
id: "CONFIG-PACKAGE-JSON"
name: "package.json scripts"
type: "config"
status: "verified"
layer: "tooling"
module: "cross-app"
feature: "cross-app"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#config #scripts"
---

# package.json scripts

- ID: `CONFIG-PACKAGE-JSON`
- Type: `config`
- Status: `verified`
- Verification: `verified`
- Layer: `tooling`
- Module: `cross-app`
- Feature: `cross-app`
- File: `package.json`

## Description

Project command registry for build, validation, tests, and architecture graph generation.

## Direct Links

- Parent: none
- Children: [[TEST-API-LOCAL|npm run test:api:local]], [[TEST-ROUTE-CAPABILITY|npm run check:route-capabilities]], [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Depends on: none
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-ARCH-GRAPH|npm run architecture:graph]]
- Docs: [[DOC-TESTING|Testing documentation]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- contains -> [[TEST-API-LOCAL|npm run test:api:local]] (partial)
- contains -> [[TEST-ROUTE-CAPABILITY|npm run check:route-capabilities]] (partial)
- contains -> [[TEST-ARCH-GRAPH|npm run architecture:graph]] (partial)
- [[TEST-API-LOCAL|npm run test:api:local]] -> depends_on (partial)
- [[TEST-ROUTE-CAPABILITY|npm run check:route-capabilities]] -> depends_on (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00057` verified: missing none

## Notes

architecture:graph command added in this mission.
