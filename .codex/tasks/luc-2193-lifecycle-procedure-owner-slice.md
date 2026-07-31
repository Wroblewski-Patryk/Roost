# LUC-2193 Lifecycle Procedure Owner Slice

## Header

- ID: LUC-2193
- Title: Publish typed lifecycle procedure owner slice
- Task Type: feature
- Current Stage: implementation
- Deliverable For This Stage: tested local API/UI vertical slice for
  `PROC-SH-APPLICATION-LIFECYCLE` v1.0
- Status: IN_REVIEW
- Owner: Integration Domain Engineer / coordinator
- Depends on: LUC-2192 (verified)
- Priority: P0
- Module Confidence Rows: Lifecycle procedure publication architecture;
  Authenticated lifecycle procedure owner journey; Authenticated lifecycle
  procedure publication
- Requirement Rows: REQ-LUC-1895-001; REQ-LUC-2192-001
- Quality Scenario Rows: QA-LUC-1895-001
- Risk Rows: RISK-LUC-1895-001
- Iteration: implementation checkpoint after approved architecture
- Operation Mode: BUILDER
- Mission ID: LUC-2193
- Mission Status: IN_PROGRESS

## Process Self-Audit

- [x] All seven autonomous loop steps are planned.
- [x] No loop step is being skipped.
- [x] Exactly one priority task is selected.
- [x] Operation mode matches this implementation iteration.
- [x] The task is aligned with repository source-of-truth documents.
- [x] `.agents/core/project-memory-index.md` was reviewed.
- [x] `.agents/core/mission-control.md` was reviewed.
- [x] Existing state rows are current enough to execute.
- [x] Affected module confidence rows were identified.
- [x] Affected requirement, quality scenario, and risk rows were identified.
- [x] The task advances the protected Product Map release objective.

## Mission Block

- Mission objective: implement the approved lifecycle-procedure definition,
  strict projection v2 protocol, composed owner read model, and truthful UI.
- Release objective advanced: produce one exact local Roost candidate for the
  existing protected LUC-1910 release chain.
- Included slices: idempotent seed/backfill, strict ingress and stored-packet
  validation, workspace-scoped read assembly, API response, UI states, focused
  automated/API/browser proof, documentation and project memory.
- Explicit exclusions: Paperclip producer changes, Paperclip writes, new
  workflow engine, Prisma migration, push, deploy, restart, credentials,
  protected production smoke, or release approval.
- Checkpoint cadence: contract/schema; assembler/API; UI; proof and closure.
- Stop conditions: architecture mismatch, cross-workspace disclosure, required
  migration, unrelated dirty-tree conflict, or protected-action dependency.
- Handoff expectation: exact candidate and evidence to LUC-1910; no deploy from
  this task.

## Responsibility Lanes

| Lane | Owner | Scope | Output | Proof | Status |
| --- | --- | --- | --- | --- | --- |
| Coordinator / Integration | Active chat | seed, schemas, service, routes, integration, state | integrated vertical slice | focused backend/API checks | IN_PROGRESS |
| Frontend / UX | Read-only subagent, coordinator integrates | existing Product Map types/route/tests | bounded UI change recommendation | responsive/state/a11y matrix | IN_PROGRESS |
| QA / Security | Read-only subagent, coordinator integrates | contract and test surface | negative-path verification matrix | auth/isolation/schema/audit checks | IN_PROGRESS |
| Architecture | LUC-2192 | canonical contract | approved mapping | verified architecture packet | COMPLETE |
| Documentation / Memory | Active chat | task and canonical state | synchronized evidence | focused diff/readback | PLANNED |
| Ops / Release | LUC-1910 | push/deploy/rollback/production | protected release proof | independent gates | EXCLUDED |

## Context

LUC-2192 selected existing Company OS `Procedure`/`ProcedureStep` ownership plus
composition on `GET /v1/product-map/projection`. The current runtime still
accepts arbitrary packet JSON, lacks the v1.0 definition/read model, and uses a
drifting public state vocabulary.

## Goal

An authenticated workspace owner reads the exact lifecycle procedure and safe
read-only Paperclip execution evidence, while malformed, private, unsupported,
unauthorized, and cross-workspace inputs fail closed before disclosure or
persistence.

## Scope

- `prisma/seed.ts` or a reused seed helper
- `src/modules/product-map/*`
- focused Product Map server/API tests
- `web/src/features/departments/product-map-*`
- task, requirement, risk, module-confidence, health, planning, and project
  state entries directly affected by LUC-2193

## Implementation Plan

1. Express the canonical 18-stage definition and strict v2 transport schemas.
2. Seed/reconcile the Procedure and steps idempotently with existing models.
3. Compose a workspace-scoped read model with safe links and audit facts.
4. Align the owner UI to server states and render definition/evidence safely.
5. Prove ingress denial, authorization/isolation, state handling, browser
   responsiveness/accessibility, and architecture consistency.
6. Review and update repository/Paperclip evidence.

## Acceptance Criteria

- [ ] Owner read returns procedure ID `PROC-SH-APPLICATION-LIFECYCLE` and
  version `1.0` with exactly 18 ordered stages.
- [ ] Packet schema `2.0` is strict at every object boundary; unknown/private
  fields and v1 packets are rejected before persistence.
- [ ] Unauthenticated, unauthorized, and cross-workspace reads disclose no
  procedure facts.
- [ ] Current, stale, conflict, source-only, unavailable, loading, and error
  states remain distinct and never promote readiness improperly.
- [x] Evidence links and audit correlation are server-derived and inspectable
  without secrets/private payloads.
- [ ] Desktop, tablet, mobile, keyboard, and accessibility proof passes.

## Definition of Done

- [ ] Build and focused automated/API/browser checks pass.
- [ ] Existing Product Map route and Company OS models are reused.
- [ ] No migration, duplicate engine, mock path, provider write, or Paperclip
  mutation is introduced.
- [ ] Architecture, integration, security, and repository DoD are reviewed.
- [ ] Canonical state and task evidence are updated.
- [ ] Worktree is clean at one exact candidate commit, with push held for the
  protected release chain.

## Validation Evidence

- Tests: `npm run build:server` passed; `npm run test:api:local` passed 8/8,
  including the protected Product Map API flow and fixture cleanup.
- Audit-correlation proof: two reads of one accepted snapshot returned its
  persisted server-owned correlation; a second accepted snapshot returned a
  different persisted correlation; logical restore preserved that value.
- Ingress/privacy proof: a top-level `auditCorrelation` override was rejected
  with no snapshot, receipt, quarantine, or state mutation; the owner response
  contained none of the tested API key, private payload, or attacker
  correlation values.
- Manual/API checks: covered through the real HTTP routes in the disposable
  PostgreSQL API journey.
- Browser/responsive/accessibility: pending final slice proof; no UI code was
  changed by this review correction.
- Architecture gates: existing lifecycle publication contract remains
  unchanged; no architecture mapping change was introduced by this correction.
- Resource cleanup: fixture port `55432` not listening; zero
  `chrome-headless-shell` processes.
- Reality status: durable correlation defect fixed and returned for independent
  review; the broader slice is not promoted or deployed.

## Result Report

The review finding is fixed without adding a request-correlation fallback:
`acceptProjection` creates the server-owned correlation internally, the active
snapshot must contain it to qualify as a supported packet, and the read model
returns that persisted value. The candidate remains uncommitted and unpushed
inside the wider in-progress LUC-2193 packet; protected release work remains
excluded.
