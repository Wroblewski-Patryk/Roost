# Task

## Header
- ID: LUC-1217
- Title: Product and UX planning for next useful owner workflow
- Task Type: design
- Current Stage: planning
- Status: DONE
- Owner: Product Docs
- Depends on: `LUC-1214` parent coordination plan and Process Core architecture
- Priority: P1
- Mission ID: LUC-1214-DELIVERY-LANES-PLAN
- Mission Status: CHECKPOINTED

## Goal
Define the next owner-facing workflow slice that is useful now, safe under current permissions, and ready for implementation handoff.

## Scope
- `docs/architecture/process-core-workflow-core-architecture.md`
- `docs/ux/experience-quality-bar.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/visual-direction-brief.md`
- Planning output only (no code/runtime/deploy changes)

## Implementation Plan
1. Select one highest-value owner workflow that can be delivered without risky write-side expansion.
2. Define product intent, user questions, success signal, and non-goals.
3. Define UX state model (`loading`, `empty`, `error`, `success`) and responsive/accessibility checks.
4. Define handoff-ready acceptance criteria and explicit open decisions.

## Deliverable For This Stage
A planning packet that names the chosen owner workflow, why it is next, and the exact implementation contract for Product, UX, Frontend, Backend, and QA lanes.

## Selected Workflow
Owner Workflow Candidate Chosen: **Workflow Activation Readiness Board** (`00 General` + selected operating area context).

Why this one now:
- It answers the core owner question quickly: what is blocked right now and what action should be taken next.
- It reuses existing read-side foundations (AOG/read packets, module context, readiness signals) instead of introducing new risky write behavior.
- It aligns with the accepted Process Core direction (workflow, stage, evidence, approvals) and can be expanded incrementally.

## Product Contract
- Primary user question: "Which workflow is closest to activation, what is blocked, and what should I do next?"
- Required output:
  - prioritized readiness list
  - blocker reason classification
  - explicit next action per workflow
  - evidence freshness timestamp
- Non-goals for first slice:
  - no workflow writes
  - no migration
  - no runtime automation side effects

## UX Contract
- Reused patterns:
  - existing owner dashboard decision cards
  - existing table/list primitives
  - existing alert and status chips
- Required states:
  - `loading`: skeleton board with last-known timestamp
  - `empty`: no candidate workflows with action "define first workflow"
  - `error`: user-language recovery with retry action
  - `success`: ranked readiness list with blockers and next action
- Responsive checks:
  - desktop: full board + side context
  - tablet: compressed summary + expandable rows
  - mobile: single-column action-first cards
- Accessibility checks:
  - keyboard row focus and action triggers
  - semantic headings and table labels
  - status color never as sole signal

## Acceptance Criteria
- [x] One owner workflow was selected and justified against value/risk.
- [x] The workflow includes state model (`loading`, `empty`, `error`, `success`).
- [x] The workflow includes desktop/tablet/mobile and accessibility planning checks.
- [x] The packet stays planning-only and does not introduce implementation work.

## Open Decisions For Coordinator
1. Confirm whether first implementation slice should live in `00 General` only or in `00 + selected area`.
2. Confirm whether blocker severity taxonomy uses existing labels only or adds a dedicated "activation-gate" label.
3. Confirm whether evidence freshness SLA is same-day or rolling 24h.

## Validation Evidence
- Planning proof: source-of-truth review and planning packet completed.
- Runtime/build/test proof: not applicable (planning-only issue).
- Reality status: verified (planning artifact complete).

## Result Report
- Task summary: Produced dedicated `LUC-1217` product/UX planning packet for next useful owner workflow.
- Files changed: this planning file + canonical state pointers.
- What is incomplete: implementation lanes are intentionally not started.
- Next steps: coordinator requests confirmation on open decisions, then spins worker-ready implementation child issues.

## Continuation Checkpoint (2026-06-01, finish_successful_run_handoff)
- Wake replay type: handoff confirmation with no new comments (`0/0`).
- Action taken: revalidated child packet closure contract and acceptance
  criteria continuity; no new planning scope was required.
- Disposition: `DONE` (planning lane remains complete; implementation remains
  intentionally out of scope).

## Continuation Checkpoint (2026-06-01, source_scoped_recovery_action)
- Wake replay type: status-recovery replay with no new comments (`0/0`), where
  wake metadata reported `blocked`.
- Action taken: reconciled wake-status drift against canonical planning
  evidence in this packet (`Status: DONE`, planning scope complete, no pending
  implementation lane under this issue).
- Disposition: `DONE` (keep this issue closed unless new planning scope is
  explicitly assigned).
