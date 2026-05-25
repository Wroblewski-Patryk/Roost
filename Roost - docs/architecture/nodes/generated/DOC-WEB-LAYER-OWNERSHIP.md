---
id: "DOC-WEB-LAYER-OWNERSHIP"
name: "Web layer React ownership"
type: "documentation"
status: "verified"
layer: "docs"
module: "web"
feature: "cross-app"
risk_level: "low"
completion_percent: "95"
verification_status: "verified"
last_verified_at: "2026-05-20"
tags: "#architecture #web"
---

# Web layer React ownership

- ID: `DOC-WEB-LAYER-OWNERSHIP`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `docs`
- Module: `web`
- Feature: `cross-app`
- File: `docs/architecture/web-layer-react-ownership.md`

## Description

Canonical ownership contract for active React web routes.

## Direct Links

- Parent: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Children: none
- Depends on: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Used by: [[COMP-SHELL|Authenticated Shell component]], [[ROUTE-REGISTRY|React app route registry]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- [[ROUTE-REGISTRY|React app route registry]] -> depends_on (partial)
- [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] -> contains (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00019` verified: missing none

## Notes

Updated during full-function architecture audit.
