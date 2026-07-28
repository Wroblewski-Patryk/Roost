# LUC-2145 Product Map Retention and Quarantine Repair

## Header

- Task Type: backend/frontend corrective implementation
- Current Stage: implementation
- Status: IN_PROGRESS
- Owner: Coordinator / Engineering Delivery Lead
- Priority: P1
- Mission ID: LUC-2145
- Mission Status: IN_PROGRESS

## Process Self-Audit

- [x] One priority objective selected: repair the Product Map projection contract.
- [x] Architecture, memory index, mission control, requirements, risks, and state ledgers reviewed.
- [x] Separate retention and read-model/UI lanes have explicit ownership; coordination and evidence remain with the coordinator.

## Goal

Preserve one-year projection audit history and show quarantined/out-of-order state without allowing it to promote Product Map readiness.

## Scope

- Projection persistence cleanup and focused tests.
- Projection read API and Product Map presentation/tests.
- Product Map architecture and state evidence.

Excluded: publisher activation, credentials, deploy, production mutation, or Paperclip changes.

## Responsibility Lanes

| Lane | Owner | Output | Validation |
| --- | --- | --- | --- |
| Retention | `projection_retention` | Correct bounded cleanup semantics and focused proof | Targeted server/API test |
| Read contract/UI | `quarantine_contract` | Distinct conflict/quarantined states with no readiness promotion | Targeted API/web test |
| Coordination | EDL | Integration, architecture/state updates, review and final proof | Combined scoped validation |

## Acceptance Criteria

- [ ] Audit evidence is retained for one year; 30-day packets/receipts and 90-day quarantine cleanup remain bounded and safe.
- [ ] API and UI distinguish current, stale, conflict, quarantined, empty, and unavailable; conflict/quarantined do not promote readiness.
- [ ] Focused tests pass, architecture/state truth is refreshed, and no protected action occurs.

## Definition of Done

- [ ] Architecture alignment and existing-system reuse reviewed.
- [ ] Focused API and web validation pass.
- [ ] Relevant project state and issue evidence are updated.
- [ ] Parent release handoff names the exact committed proof.

## Result Report

Pending integrated lane outputs and verification.
