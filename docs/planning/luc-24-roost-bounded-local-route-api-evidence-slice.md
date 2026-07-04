# LUC-24 Roost Bounded Local Route/API Evidence Slice

## Header

- ID: [LUC-24](/LUC/issues/LUC-24)
- Title: 11 Innowacje - Roost bounded local route/API evidence slice
- Task Type: verification
- Current Stage: verification
- Status: DONE
- Owner: Roost Product Manager
- Depends on: [LUC-19](/LUC/issues/LUC-19) Stage 1 Local Autonomy Expansion
- Priority: P1
- Mission ID: LUC-24
- Mission Status: VERIFIED

## Process Self-Audit

- All seven autonomous loop steps were represented: analyze, select, plan,
  execute, verify, self-review, update source of truth.
- This was a single-lane PM evidence slice. No subagent delegation was used
  because the issue requested one bounded local route/API proof and no product
  implementation.
- Stage 0 guard checked: this issue belongs to the Stage 1 Controlled
  Activation Dry Run goal and is an assigned Stage 1 local evidence child.
- Architecture source reviewed before selecting proof:
  `docs/architecture/README.md` and
  `docs/architecture/architecture-source-of-truth.md`.
- No code, schema, migration, browser, provider, secret, protected smoke, push,
  deploy, restart, rollback, or production mutation was performed.

## Goal

Produce one inspectable Roost local route/API evidence slice so
[LUC-19](/LUC/issues/LUC-19) can decide the next Stage 1 local action.

## Scope

In scope:

- Reuse the [LUC-22](/LUC/issues/LUC-22) preflight recommendation.
- Pick one smallest useful local route/API slice.
- Run local verification commands that do not require secrets or production.
- Record Docker/Linux runtime availability for the DB-backed API harness.

Out of scope:

- Product feature work or route repair.
- Broad architecture refresh or architecture rewrite.
- Protected smoke, secret value reads, production probes, push, deploy,
  restart, rollback, or provider mutation.
- Mock-only replacement for the Docker-backed `npm run test:api:local` gate.

## Architecture Fit

Fit/conflict status: fits.

The selected slice matches the approved Roost/CompanyCore direction:

- API-first CompanyCore foundation.
- Public readiness/build metadata routes expose safe runtime status.
- Protected API routes remain fail-closed without credentials.
- AI agents and external clients use API/MCP as external clients, not embedded
  backend decision makers.

## Selected Slice

Selected route/API slice: public readiness and build metadata aliases plus a
protected-route negative check.

Why this is the smallest useful slice:

- It is a route/API behavior already mapped by the architecture and route
  manifest gates.
- It does not need Docker, production access, secrets, or provider state.
- It proves both safe public API exposure and protected API fail-closed
  behavior in one short-lived local server run.
- It avoids opening product implementation from aggregate missing-test-link
  counts alone.

Routes checked:

- `GET /health`
- `GET /v1/health`
- `GET /ready`
- `GET /v1/ready`
- `GET /api/build-info`
- `GET /v1/connection` without an API key

## Git State

Observed on 2026-07-04:

- Branch: `main...origin/main [ahead 2]`.
- HEAD: `65987e86eb99ec2d11eb957ae7fd93124094f7da`.
- Divergence: `origin/main...HEAD = 0 2`.
- Dirty state before the packet already included local state/context files and
  the [LUC-22](/LUC/issues/LUC-22) planning packet.

Source-control decision: no commit created. The scope is local evidence and
documentation in a shared dirty/ahead worktree. Push/deploy are explicitly out
of scope.

## Validation Evidence

- Docker/Linux runtime availability: unavailable.
  - `docker info --format '{{.ServerVersion}}'` failed because the
    `dockerDesktopLinuxEngine` named pipe was missing.
  - `npm run test:api:local` was not run because the required disposable
    PostgreSQL Docker runtime was unavailable.
- `npm run architecture:status`: PASS.
  - `GREEN`
  - `454` nodes / `765` relations / `35` chains
  - evidence queue `0`
  - chain worklist `0`
  - delta `nodes=0`, `relations=0`, `chains=0`
  - all gates pass `yes`
- `npm run check:route-capabilities`: PASS.
  - `checkedManifestRoutes=180`
  - `checkedRouteFiles=35`
  - `status=ok`
- `npm run build:server`: PASS.
- Local short-lived built-app route probe: PASS.
  - `/health`: `200`, service `companycore`, build metadata present.
  - `/v1/health`: `200`, service `companycore`, build metadata present.
  - `/ready`: `200`, service `companycore`, build metadata present.
  - `/v1/ready`: `200`, service `companycore`, build metadata present.
  - `/api/build-info`: `200`, service `companycore`, build metadata present.
  - `/v1/connection`: `401`, error `missing_api_key`.
- Browser/process cleanup: no Playwright/browser was started; narrow
  `chrome-headless-shell` process check returned no process output.
- Runtime cleanup: the local server was closed inside the probe command.

## Definition Of Done Check

Applicable completion items are satisfied:

- Architecture source reviewed and fit/conflict status recorded.
- One bounded route/API slice selected and justified.
- Local verification commands and pass/fail outcomes recorded.
- Docker/Linux DB-backed runtime gate recorded as unavailable rather than
  replaced by mock evidence.
- No temporary solution, placeholder path, product repair, or architecture
  bypass introduced.
- `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`, and
  `NO_TEMPORARY_SOLUTIONS.md` reviewed; integrated feature items are not
  applicable because this task changed no runtime behavior.

## Result Report

Task summary: verified one Roost local public-readiness/build-info API slice
and protected-route fail-closed behavior for Stage 1 local autonomy expansion.

Files changed:

- `docs/planning/luc-24-roost-bounded-local-route-api-evidence-slice.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/active-mission.md`
- `.agents/state/next-steps.md`
- `.agents/state/system-health.md`
- `.agents/state/module-confidence-ledger.md`

No-impact statement:

- No push, deploy, restart, rollback, production probe, protected smoke,
  secret value read, provider mutation, paid/noisy automation, or destructive
  cleanup occurred.

Residual risk:

- Docker/Linux runtime is unavailable in the current local environment, so the
  DB-backed `npm run test:api:local` harness remains unrun in this heartbeat.
  That is an environment gate, not a product-code failure.

Next owner/action:

- [LUC-19](/LUC/issues/LUC-19) can inspect this packet and decide whether the
  next Stage 1 Roost action should be a Docker/QVE runtime follow-up, a
  source-control closure lane for the local evidence packets, or an owner-gated
  protected proof. Do not open broad product implementation from this slice
  alone.
