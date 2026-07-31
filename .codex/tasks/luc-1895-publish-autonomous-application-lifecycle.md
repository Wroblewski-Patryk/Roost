# LUC-1895 - Publish Autonomous Application Lifecycle

## Header

- ID: LUC-1895
- Title: Publish `PROC-SH-APPLICATION-LIFECYCLE` on the authenticated owner surface
- Task Type: feature / release
- Current Stage: verification / release
- Status: BLOCKED
- Owner: Coordinator, then Technical Solution Architect and Release owners
- Depends on: the procedure-contract repair lane and [LUC-1910](/LUC/issues/LUC-1910)
- Priority: P1
- Module Confidence Rows: Lifecycle procedure publication; Product Map protected release preflight
- Requirement Rows: REQ-LUC-1895-001; REQ-LUC-1923-001
- Quality Scenario Rows: QA-LUC-1895-001; QA-LUC-1923-001
- Risk Rows: RISK-LUC-1895-001; RISK-LUC-1923-001
- Iteration: 1
- Operation Mode: BUILDER
- Mission ID: LUC-1895-AUTHENTICATED-LIFECYCLE-PUBLICATION
- Mission Status: BLOCKED

## Process Self-Audit

- [x] The seven-step loop is represented by the audit, contract correction,
      delegated QA/Security and Ops lanes, repository updates, and blocker
      handoff.
- [x] Exactly one objective is selected: truthful publication of the versioned
      lifecycle procedure.
- [x] Architecture, project memory, mission control, delivery, requirements,
      anti-regression, quality, deployment, and rollback sources were reviewed.
- [x] The affected module, requirement, quality, and risk rows are identified.
- [x] No production or credential action was inferred from local readiness.

## Mission Block

- Mission objective: publish the canonical lifecycle as a stable authenticated
  owner procedure without duplicating Paperclip execution state.
- Release objective advanced: the previous repository-write blocker is cleared,
  the current implementation mismatch and release blockers are now explicit.
- Included slices: repository/API/UI contract audit, focused automated proof,
  public health/provenance readback, migration/rollback review, and durable
  blocker routing.
- Explicit exclusions: no push, deploy, restart, credential use, protected
  browser smoke, database mutation, or Paperclip-to-Roost write expansion.
- Checkpoint cadence: one evidence packet per materially changed candidate or
  blocker state.
- Stop conditions: missing stable procedure contract, unknown rollback image,
  unproven capacity, unresolved credential incident, or missing protected proof.
- Handoff expectation: architecture selects the existing-system mapping;
  implementation and independent proof land before the governed release gate.

## Responsibility Lanes

| Lane | Owner | Output | Validation / Proof | Status |
| --- | --- | --- | --- | --- |
| Coordinator | Active chat | Integrated audit, source-of-truth updates, blocker graph | Parent evidence review | complete |
| Architecture | Technical Solution Architect | Select the stable procedure mapping without a second workflow engine | Architecture and authority-boundary review | delegated / blocking |
| QA and Security | Read-only audit lane | Acceptance and disclosure-gap report | Focused web and server tests | complete |
| Ops and Release | Read-only audit lane | Candidate, migration, rollback, capacity, and authorization report | Public health and repository provenance | complete |
| Documentation and Memory | Coordinator | This task contract and state updates | Link/path and diff checks | complete |

## Context

The canonical source remains
`docs/governance/autonomous-application-business-lifecycle.md`, procedure ID
`PROC-SH-APPLICATION-LIFECYCLE`, version `1.0`. The local candidate contains an
authenticated Product Map projection, but that projection is an offering and
release map rather than the required procedure record.

## Goal

Return the stable procedure ID and version through an authenticated,
workspace-scoped owner surface or governed API while preserving source,
freshness, evidence, gate, conflict, supersession, audit, and authority facts.

## Scope

- canonical lifecycle source and its owner-facing mapping;
- `GET /v1/product-map/projection` only if architecture selects it as the
  procedure publication surface;
- the existing Company OS `Procedure` / `ProcedureStep` model and versioned
  workflow-definition mechanism as the preferred reuse candidate;
- authenticated owner UI, focused API/UI/security tests, and release evidence;
- the existing [LUC-1910](/LUC/issues/LUC-1910) protected Product Map release
  chain.

## Implementation Plan

1. Have the architecture owner select one non-duplicating mapping:
   extend the exact Product Map packet with a typed procedure projection, map
   the canonical record through the existing Company OS procedure foundation,
   or expose a dedicated read model backed by that foundation.
2. Define an exact allowlisted payload schema; reject unknown/private fields
   before persistence.
3. Expose stable procedure identity, semantic version, stages, owner, source
   SHA/version, observation/verification time, evidence, gate state, conflicts,
   supersession, and linked offerings/releases/decisions/KPIs.
4. Correct the backend/frontend conflict-state contract and expose safe audit
   correlation.
5. Add authenticated, unauthorized, cross-workspace, stale/conflict/
   unavailable, no-secret/private-data, audit, responsive, and accessibility
   proof.
6. Rebuild the exact candidate release packet, then execute the protected
   [LUC-1910](/LUC/issues/LUC-1910) gate once.

## Acceptance Criteria

- [ ] Authenticated owner read returns
      `PROC-SH-APPLICATION-LIFECYCLE` version `1.0`.
- [ ] Lifecycle stages, accountable owner, source/version/SHA,
      observed/verified time, freshness, evidence, gate state, conflict, and
      supersession are inspectable.
- [ ] Offerings, releases, decisions, KPIs, and Paperclip evidence links are
      present without copying Paperclip execution authority.
- [ ] Unknown/private packet fields are rejected before persistence.
- [ ] Unauthorized and cross-workspace reads disclose no procedure facts.
- [ ] Stale, conflicting, out-of-order, quarantined, and unavailable states
      fail closed and render truthfully.
- [ ] Desktop, tablet, mobile, keyboard, and accessibility evidence exists.
- [ ] Exact deployed SHA and non-unknown relaunchable image are recorded after
      the governed release and monitoring window.

## Definition Of Done

- [ ] The real authenticated UI/API journey passes.
- [ ] Focused automated, security, privacy, audit, responsive, deployment,
      rollback, and monitoring evidence is attached.
- [ ] Repository and deployed procedure versions agree.
- [ ] No parallel workflow engine, provider-write expansion, placeholder,
      private-data path, or temporary bypass exists.
- [ ] `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`,
      `NO_TEMPORARY_SOLUTIONS.md`, and `DEPLOYMENT_GATE.md` pass.

## Validation Evidence

- Focused web Product Map tests: PASS, `3/3`.
- Focused projection envelope/retention tests: PASS, `4/4`.
- Candidate build from the wake audit: PASS for server and web.
- `git diff --check`: PASS before this documentation update.
- Public web/API roots: HTTP `200`.
- Public health: `status=ok`, deployed commit
  `070b150f5477d701d462485aad8b91450d0c3d71`, image `unknown`.
- Candidate: `e6fa42a871af92f9206972e0202e6297cd9a4337`,
  `98` commits ahead, `448` files changed.
- Migration delta: two additive Product Map projection/admission migrations;
  production backup/restore and current-volume proof are still missing.
- Reality status: implemented, not verified for Product Map; blocked for the
  required lifecycle procedure publication.

## Security / Privacy Evidence

- Existing route authentication, least-privilege ingress/read capability split,
  workspace binding, replay/idempotency, admission control, and read-only
  Paperclip boundary are present.
- Blocking mismatch: ingress currently accepts
  `z.record(z.unknown())`, persists it as JSON, and returns it to the owner
  client. This does not prove the exact-packet/no-private-data requirement.
- Blocking mismatch: audit correlation is stored but not exposed or tested on
  the owner read.

## Deployment / Ops Evidence

- Deploy impact: high.
- Production promotion is `NO-GO`.
- The current public source rollback reference is `070b150f...`, but the live
  image is `unknown`; no exact relaunchable rollback image is proven.
- Current capacity, deployment-in-progress state, and database backup are not
  proven.
- The candidate includes two database migrations, so migration impact is not
  `none`.
- No push, deploy, restart, credential access, protected smoke, or production
  mutation occurred.

## Result Report

- Task summary: cleared the obsolete read-only-repository blocker, disproved
  the claim that the current Product Map alone satisfies the lifecycle
  procedure acceptance, and routed the remaining work through explicit
  architecture and release blockers.
- Files changed: task and project state documentation only.
- How tested: focused tests, source inspection, repository provenance,
  migration diff, and public health readback.
- What is incomplete: stable procedure ID/version contract, exact allowlisted
  packet, owner procedure UI/API proof, responsive/audit evidence, protected
  release, rollback, and monitoring.
- Next steps: resolve the architecture/implementation child first; then rebuild
  the exact candidate and let [LUC-1910](/LUC/issues/LUC-1910) execute the
  protected release chain.
- Decisions made: `NO-GO`; keep Paperclip-to-Roost read-only; do not deploy the
  current 98-commit candidate as proof of this procedure issue.
