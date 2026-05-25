---
id: "DOC-DESIGN-MEMORY"
name: "Design memory"
type: "documentation"
status: "verified"
layer: "docs"
module: "ux"
feature: "cross-app"
risk_level: "low"
completion_percent: "95"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#ux #design-memory"
---

# Design memory

- ID: `DOC-DESIGN-MEMORY`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `docs`
- Module: `ux`
- Feature: `cross-app`
- File: `docs/ux/design-memory.md`

## Description

Reusable UX decisions and shared patterns.

## Direct Links

- Parent: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Children: none
- Depends on: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Used by: [[COMP-CC-DATA-TABLE|CcDataTable component]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- [[COMP-CC-DATA-TABLE|CcDataTable component]] -> depends_on (partial)
- [[FEAT-MANAGED-TABLE|Shared Managed Table]] -> depends_on (partial)
- [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] -> contains (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00046` verified: missing none

## Notes

Records managed-table and complex management view pattern.
