---
id: "DOC-DMS-ARCH"
name: "Department management systems architecture"
type: "documentation"
status: "verified"
layer: "docs"
module: "departments"
feature: "cross-app"
risk_level: "low"
completion_percent: "100"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#architecture #departments"
---

# Department management systems architecture

- ID: `DOC-DMS-ARCH`
- Type: `documentation`
- Status: `verified`
- Verification: `verified`
- Layer: `docs`
- Module: `departments`
- Feature: `cross-app`
- File: `docs/architecture/department-management-systems-architecture.md`

## Description

Architecture source for department management systems.

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
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> depends_on (partial)
- [[DOC-ARCH-SOURCE-OF-TRUTH|Architecture source of truth]] -> contains (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)
- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]] -> depends_on (partial)
- [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]] -> depends_on (partial)
- [[FEAT-ASSETS-CONTEXT|Assets Context Workbench]] -> depends_on (partial)

## Chains

- No chain rows.

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00018` verified: missing none

## Notes

Existing department-system architecture source.
