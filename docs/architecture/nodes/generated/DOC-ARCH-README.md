---
id: "DOC-ARCH-README"
name: "Architecture README"
type: "documentation"
status: "verified"
layer: "docs"
module: "architecture"
feature: "cross-app"
risk_level: "low"
completion_percent: "100"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#architecture #docs"
---

# Architecture README

- ID: `DOC-ARCH-README`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `docs`
- Module: `architecture`
- Feature: `cross-app`
- File: `docs/architecture/README.md`

## Description

Defines architecture documentation ownership and reading order.

## Direct Links

- Parent: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Children: none
- Depends on: [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- contains -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- depends_on -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00008` verified: missing none

## Notes

Updated to include the evidence system.
