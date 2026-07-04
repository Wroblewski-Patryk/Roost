# LUC-22 Roost Local Architecture And Repo Preflight

## Header

- ID: [LUC-22](/LUC/issues/LUC-22)
- Title: 11 Innowacje - Roost local architecture and repo preflight
- Task Type: research
- Current Stage: verification
- Status: DONE
- Owner: Roost Product Manager
- Depends on: [LUC-19](/LUC/issues/LUC-19) Stage 1 Local Autonomy Expansion
- Priority: P1
- Mission ID: LUC-22
- Mission Status: VERIFIED

## Process Self-Audit

- All seven autonomous loop steps were represented: analyze, select, plan,
  execute, verify, self-review, update source of truth.
- This was a single-lane coordinator/PM preflight. No subagent delegation was
  used because the task explicitly prohibited code changes until architecture
  and Git state were recorded.
- Stage 0 guard checked: this issue belongs to the Stage 1 Controlled
  Activation Dry Run goal, so preflight evidence collection is in scope.
- Architecture source reviewed before implementation selection:
  `docs/architecture/README.md` and
  `docs/architecture/architecture-source-of-truth.md`.
- No code, schema, migration, runtime server, browser, database, Docker,
  provider, secret, protected smoke, push, deploy, restart, rollback, or
  production mutation was performed.

## Goal

Establish Roost's local architecture/source-of-truth and repository readiness
posture before any implementation expansion, then recommend the smallest safe
next local slice.

## Scope

In scope:

- Read the canonical architecture entry points.
- Inspect current Git branch, dirty state, HEAD, and divergence.
- Run narrow non-runtime evidence gates.
- Record next local slice and explicit protected-action gates.

Out of scope:

- Product code changes.
- Architecture rewrites.
- Commit, push, deploy, rollback, restart, or production mutation.
- Secret value reads, protected smoke, live provider actions, or destructive
  cleanup.

## Architecture Fit

The required architecture files confirm the current Roost/CompanyCore boundary:

- `docs/architecture/` is the canonical architecture authority.
- Approved entries are implementation constraints, not loose suggestions.
- CompanyCore/Roost is an API-first organizational operating system:
  PostgreSQL is the source of truth, humans use web UI, and AI agents use
  API/MCP as external clients.
- Workspace scoping applies to business data, service API keys, integration
  settings, and integration sync state.
- ClickUp and Google Drive remain provider integrations inside the approved
  architecture, not standalone source-of-truth replacements.
- Future Process Core / Workflow Core work must reuse shared Company OS
  capabilities and preserve Roost as source of truth with Paperclip as an
  external supervised execution layer.

Fit/conflict status: fits. No architecture conflict was found that requires a
decision before the next local evidence slice.

## Git State

Observed on 2026-07-04:

- Branch: `main...origin/main [ahead 2]`.
- HEAD: `65987e86eb99ec2d11eb957ae7fd93124094f7da`.
- Divergence: `origin/main...HEAD = 0 2`.
- Dirty files before this packet:
  - `.agents/state/active-mission.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/TASK_BOARD.md`
- Diff stat before this packet: `3 files changed, 40 insertions(+)`.

Source-control decision: no commit created. The task scope is preflight and the
worktree already contained state-file edits before this packet. Push/deploy are
explicitly out of scope.

## Validation Evidence

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
- `git diff --check`: PASS with LF-to-CRLF warnings only for existing state
  files.

## Recommended Next Local Slice

Recommended next owner/path: [LUC-23](/LUC/issues/LUC-23) Technology evidence
gate should run the smallest local verification slice that proves the current
Roost checkout without product expansion:

1. Re-read this packet plus the architecture source-of-truth files.
2. Confirm the same Git branch/dirty/divergence posture.
3. Run `npm run architecture:status`.
4. Run `npm run check:route-capabilities`.
5. If Docker/Linux runtime is available, run `npm run test:api:local` against a
   disposable local PostgreSQL database.
6. If Docker/Linux runtime is not available, record the local runtime blocker
   and do not replace it with mock-only evidence.

Do not start frontend/backend product repair from aggregate missing-test-link
counts alone. Select implementation only when a concrete failed gate,
unverified route/journey, owner gap, reproduced regression, or approved
product slice exists.

## Explicit Gates

- Docker/Linux runtime: required for `npm run test:api:local`; if unavailable,
  record as an environment blocker, not product failure.
- Push/deploy/restart/rollback: prohibited until a release issue names target
  resource, source ref, rollback path, approval, and smoke evidence.
- Secrets: do not read or expose values. Only report presence/absence or secret
  refs when explicitly in scope.
- Protected smoke: requires fresh same-session approval plus valid runtime
  credential/base-url facts.
- Production: no mutation or protected probe from this preflight lane.

## Definition Of Done Check

Applicable completion items are satisfied:

- Architecture source reviewed and fit/conflict status recorded.
- Git branch, dirty state, HEAD, and divergence recorded.
- Narrow local verification commands passed.
- Next local slice and verification commands recommended.
- Protected-action gates recorded.
- `DEFINITION_OF_DONE.md` and `INTEGRATION_CHECKLIST.md` reviewed; runtime
  integration items are not applicable because this task did not change code or
  runtime behavior.

## Result Report

Task summary: verified Roost's local architecture and repository preflight for
Stage 1 activation. Roost is locally safe to continue with evidence-gated
verification work, not broad product expansion.

Files changed:

- `docs/planning/luc-22-roost-local-architecture-and-repo-preflight.md`
- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.agents/state/active-mission.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`

Residual risk: the worktree remains dirty and ahead of origin. Any future
source-control or release action needs a separately scoped repository/release
lane.
