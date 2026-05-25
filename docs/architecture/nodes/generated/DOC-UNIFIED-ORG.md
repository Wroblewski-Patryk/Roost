---
id: "DOC-UNIFIED-ORG"
name: "Unified organizational operating system architecture"
type: "documentation"
status: "verified"
layer: "docs"
module: "architecture"
feature: "cross-app"
risk_level: "low"
completion_percent: "100"
verification_status: "verified"
last_verified_at: "2026-05-19"
tags: "#architecture #organization #agents"
---

# Unified organizational operating system architecture

- ID: `DOC-UNIFIED-ORG`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `docs`
- Module: `architecture`
- Feature: `cross-app`
- File: `docs/architecture/unified-organizational-operating-system.md`

## Description

Architecture source for unified human/AI workforce model.

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

- depends_on -> [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] (partial)
- [[FEAT-PEOPLE-AGENTS-DIRECTORY|People and Agents Directory]] -> depends_on (partial)
- [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00037` verified: missing none

## Notes

Existing source for humans and AI agents as workforce members.
