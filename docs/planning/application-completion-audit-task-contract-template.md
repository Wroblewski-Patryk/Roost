# Application Completion Audit Task Contract Template

Use this template when the project needs a broad but bounded audit that answers
"what remains before this application is product-grade?"

Copy the sections below into a dated task contract or planning artifact. Keep
the audit read-only unless the user explicitly approves fixes in the same
iteration.

## Header

- ID: APP-AUDIT-001
- Title: Application Completion Audit Bundle
- Task Type: research
- Current Stage: planning
- Status: READY
- Owner: Planner + QA/Test + Security + Frontend Builder + Ops/Release
- Depends on:
- Priority: P1
- Coverage Ledger Rows:
- Module Confidence Rows:
- Requirement Rows:
- Quality Scenario Rows:
- Risk Rows:
- Iteration:
- Operation Mode: TESTER
- Mission ID: APP-AUDIT-001
- Mission Status: PLANNED

## Mission Block

- Mission objective: Audit the application from product, architecture,
  backend, API, data, UX, security, operations, testing, and documentation
  angles, then publish the highest-value finish queue.
- Release objective advanced:
- Included slices:
- Explicit exclusions: no feature changes, no deploy, no production mutation
  unless explicitly approved.
- Checkpoint cadence: one audit artifact plus state/queue updates.
- Stop conditions: unavailable required credentials, evidence of a P0 outage,
  destructive action needed, or audit scope no longer read-only.
- Handoff expectation: the next agent starts with the first prioritized finish
  task unless the user selects another finding.

## Audit Scope

Review these surfaces when they exist:

- product docs and MVP scope
- architecture source of truth and module boundaries
- backend services, data model, migrations, and jobs
- API contracts, auth, validation, and error behavior
- frontend routes, data fetching, loading/empty/error/success states
- mobile and responsive behavior
- accessibility and keyboard/touch paths
- security, privacy, secrets, ownership, and abuse controls
- operations, deployment, rollback, monitoring, and health checks
- automated tests, manual smoke checks, and release evidence
- documentation drift and stale planning files

## Process Self-Audit

- [ ] All seven autonomous loop steps are planned.
- [ ] No loop step is being skipped.
- [ ] Exactly one audit mission is selected.
- [ ] Operation mode is `TESTER` or otherwise justified.
- [ ] The audit is aligned with source-of-truth documents.
- [ ] Missing, stale, or template-like state rows are identified.
- [ ] Production or sensitive checks are read-only unless explicitly approved.

## Implementation Plan

1. Read source-of-truth docs, state files, planning queues, and recent handoffs.
2. Run available build, typecheck, test, lint, or smoke commands.
3. Inspect runtime surfaces manually where automated coverage is weak.
4. Sample production or staging only through approved read-only paths.
5. Classify findings by product, UX, security, data, maintainability, ops, QA,
   and docs.
6. Publish a prioritized finish queue with smallest executable tasks.
7. Update canonical state files so future agents can continue from the audit.

## Findings Format

| Priority | Area | Finding | Evidence | User impact | Next smallest task |
| --- | --- | --- | --- | --- | --- |
| P0/P1/P2 | product/ux/security/data/ops/qa/docs | | | | |

## Validation Evidence

- Commands:
- Manual checks:
- Browser or UI checks:
- API or service checks:
- High-risk checks:
- Checks not run and why:
- Reality status: verified | partially verified | blocked | failed

## Finish Queue Output

Group next tasks by priority:

- `NOW`: release-blocking or highest-confidence tasks.
- `NEXT`: important but not blocking the next safe step.
- `PIPELINE`: useful follow-up once the current queue is clear.

Each task should include:

- owner role
- target files or surfaces
- acceptance criteria
- validation path
- residual risk

## Definition of Done

- [ ] Audit covers product, architecture, backend/API, data, UI/UX,
      accessibility, security, operations, testing, and documentation.
- [ ] Audit includes fresh evidence or clearly marks where evidence is missing.
- [ ] Findings are prioritized and actionable.
- [ ] A finish queue is written to the canonical planning/state files.
- [ ] No destructive or production write action was performed without approval.
