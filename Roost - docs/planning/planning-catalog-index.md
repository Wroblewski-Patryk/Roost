# Planning Catalog Index

Use this file when the repository accumulates many planning files and needs a
clear distinction between active, historical, blocked, and superseded plans.

## Purpose

This index prevents agents from treating every old planning file as active
work.

Canonical queue sources should still remain:

- `docs/planning/mvp-execution-plan.md`
- `docs/planning/mvp-next-commits.md`

## Classification Legend

- `queued`
  explicitly owned by the current canonical queue
- `implemented`
  delivered and closed in canonical queues or closure notes
- `external-blocked`
  implementation mostly complete, waiting on production-only evidence or
  external dependency
- `superseded`
  historical or replaced by newer canonical planning artifacts

## Active Catalog

| Planning file | Classification | Canonical ownership | Notes |
| --- | --- | --- | --- |
| `docs/planning/mvp-execution-plan.md` | implemented | `CCV1-001..CCV1-009` | Historical v1 foundation plan; production verification is closed by later smoke and handoff evidence. |
| `docs/planning/auth-workspace-integration-plan.md` | implemented | `CCV1-011..CCV1-013`, `CCV1-007`, `CCV1-010` | Historical auth/workspace/integration architecture plan delivered by the CCV1 runtime queue. |
| `docs/planning/regression-prevention-plan.md` | implemented | `CCV1-014..CCV1-017`, `CCV1-006` | Historical regression guardrail plan delivered before v1 acceptance and extended by later AGCRUD/AGRUN work. |
| `docs/planning/agent-runtime-gap-closure-plan.md` | implemented/partially external-blocked | `AGRUN-002..AGRUN-010` | Agent runtime hardening and Google Drive owner consent/import are complete; upstream agent source merge execution remains externally blocked. |
| `docs/planning/agent-crud-api-rollout-plan.md` | implemented | `AGCRUD-001..AGCRUD-006` | Completed and deployed agent CRUD rollout. |
| `docs/planning/web-console-v2-task-contracts.md` | implemented | `V2WEB-001..V2WEB-049` | Historical completed web-console slices, including typed business editors and route/context polish. |
| `docs/ux/companycore-v1-ux-ui-audit.md` | implemented | `UXA-001..UXA-007` | Completed UX/UI audit implementation wave for owner-console polish after v1 runtime acceptance; future UX work must be queued separately. |
| `docs/planning/v1-area-first-pixel-perfect-task-contract.md` | implemented | `V1AREA-001` | Runtime implementation is partially verified: `/dashboard` now serves the React area-first Company Atlas; database-backed `test:api` still needs local `DATABASE_URL`. |
| `docs/planning/v1-area-first-pixel-perfect-implementation-plan.md` | implemented | `V1AREA-001` | First implementation slice delivered the shell/frame foundation, data adapter, desktop/mobile dashboard, and screenshot evidence. Future V1AREA-002 should be queued separately. |
| `docs/planning/v1-area-first-dashboard-implementation-paths.md` | implemented | `V1AREA-001` | User paths informed the implemented dashboard; deeper area route convergence remains future work. |
| `docs/planning/google-drive-v2-task-contracts.md` | implemented | `V2GD-001..V2GD-012`, `AGRUN-007` | Server-side Google Drive v2, consent guidance, and production owner consent/import proof are delivered. |
| `docs/NEXT_STEPS.md` | implemented | v1 handoff | Human-readable next-step summary only; canonical execution remains in task board, agent state, and next commits. |

## Rules

- update this index only when planning volume is large enough to justify it
- do not treat `superseded` items as active execution sources
- when a plan is completed or replaced, update this index in the same planning
  maintenance task
