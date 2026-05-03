# V1 Source Handoff Package

Last updated: 2026-05-03

## Purpose

CompanyCore v1 is live across CompanyCore, ClickUp, OpenJarvis, and Paperclip.
This document records the remaining source handoff package so production
behavior is reproducible from managed repositories instead of relying on a
one-off deployed source tree.

This is not a runtime blocker. It is the release hygiene package for the two
external applications that consume CompanyCore.

## Current Runtime Truth

- CompanyCore is deployed from `Wroblewski-Patryk/companycore` `main` at
  `c00a92b`.
- OpenJarvis production has the CompanyCore connector and chat context hygiene
  deployed.
- Paperclip production has the CompanyCore agent-event adapter deployed.
- CompanyCore production health checks pass on `/health` and `/v1/health`.
- CompanyCore production contains 219 ClickUp tasks, 0 duplicate ClickUp task
  external IDs, and one retained latest `task_synced_from_clickup` event per
  ClickUp task after cleanup.

## OpenJarvis Handoff

### Commit

- Local commit: `5a426370 feat: refine companycore connector hygiene`
- Repository checkout: `C:\Personal\Projekty\Aplikacje\OpenJarvis`
- Current status: local branch is ahead of `origin/main` by 2 commits and has
  unrelated uncommitted local changes. Do not push blindly from this checkout.
- Handoff validation: the CompanyCore connector hygiene change was
  cherry-picked onto a clean worktree from current `origin/main` on
  2026-05-03. Targeted tests passed. A safe branch push to
  `codex/companycore-connector-v1` was attempted and rejected by GitHub with
  `403`, so upstream merge execution requires write access or an approved
  fork/PR route.

### Files

- `src/openjarvis/connectors/companycore.py`
- `src/openjarvis/server/companycore_context.py`
- `tests/connectors/test_companycore.py`
- `tests/server/test_companycore_context.py`

### Behavior

- Registers CompanyCore as a Jarvis Data Source connector.
- Reads CompanyCore through `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`.
- Indexes CompanyCore business records into Jarvis knowledge.
- Excludes CompanyCore events from default indexing unless
  `COMPANYCORE_SYNC_EVENTS=1`.
- Ranks CompanyCore chat context against the latest user question.
- Filters smoke/test CompanyCore records out of ordinary business prompts.

### Validation

Run from the OpenJarvis checkout:

```powershell
.\.venv\Scripts\python -m pytest tests\connectors\test_companycore.py tests\server\test_companycore_context.py -q
```

Expected result from the v1 deployment session:

- `6 passed`

Latest handoff validation:

- Clean worktree from current OpenJarvis `origin/main`.
- CompanyCore connector hygiene change cherry-picked cleanly.
- `..\OpenJarvis\.venv\Scripts\python -m pytest tests\connectors\test_companycore.py tests\server\test_companycore_context.py -q`
  passed with 6 tests.
- `git push origin codex/companycore-connector-v1:codex/companycore-connector-v1`
  failed with GitHub `403` for `open-jarvis/OpenJarvis`.

### Handoff Rule

Create a clean OpenJarvis branch from the intended upstream base, cherry-pick
only the CompanyCore connector hygiene commit or replay the four listed files,
then rerun targeted tests before opening a PR or pushing to the managed branch.

## Paperclip Handoff

### Commit

- Local commit: `4cfa476f feat: add companycore adapter poller`
- Repository checkout:
  `C:\Personal\Projekty\Aplikacje\paperclip-companycore-worktree`
- Current status: local `master` is ahead of `origin/master` by 1 commit.
- Managed patch in CompanyCore:
  `integrations/paperclip/companycore-adapter.patch`
- Handoff validation: Paperclip typecheck and adapter tests passed on
  2026-05-03. A safe branch push to
  `codex/companycore-adapter-v1` was attempted and rejected by GitHub with
  `403`, so upstream merge execution requires write access or an approved
  fork/PR route.

### Files

- `server/src/services/companycore-adapter.ts`
- `server/src/index.ts`
- `server/src/__tests__/companycore-adapter.test.ts`

### Behavior

- Reads `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY`.
- Polls `GET /v1/agent-events?targetAgent=paperclip`.
- Creates or finds idempotent Paperclip issues using
  `companycore_agent_event` origin identity.
- Acknowledges CompanyCore events only after Paperclip persistence succeeds.
- Keeps API key material out of logs.

### Validation

Run from the Paperclip checkout:

```bash
npx --yes pnpm@9.15.4 --filter @paperclipai/server typecheck
npm exec --yes pnpm@9.15.4 -- vitest run server/src/__tests__/companycore-adapter.test.ts
```

Expected result from the v1 deployment session:

- Paperclip server typecheck passed.
- CompanyCore adapter test passed.

Latest handoff validation:

- `npx --yes pnpm@9.15.4 --filter @paperclipai/server typecheck` passed.
- `npm exec --yes pnpm@9.15.4 -- vitest run server/src/__tests__/companycore-adapter.test.ts`
  passed with 3 tests.
- `git push origin HEAD:refs/heads/codex/companycore-adapter-v1` failed with
  GitHub `403` for `paperclipai/paperclip`.

### Handoff Rule

Prefer applying the managed patch to a clean Paperclip checkout:

```bash
git am -3 /path/to/companycore/integrations/paperclip/companycore-adapter.patch
```

After applying, rerun the validation commands and production smoke before the
next Paperclip upgrade.

## Production Smoke To Repeat After Handoff

- `GET https://api.companycore.luckysparrow.ch/health` returns `200`.
- `GET https://api.companycore.luckysparrow.ch/v1/health` returns `200`.
- Jarvis authenticated `GET /v1/connectors/companycore` returns
  `connected=true`.
- Jarvis authenticated CompanyCore sync finishes without connector error.
- A normal Jarvis chat prompt about CompanyCore uses durable business records,
  not smoke/test records.
- `GET https://paperclip.luckysparrow.ch/api/health` returns `200`.
- Paperclip consumes exactly one CompanyCore agent event per origin event and
  acknowledges it through CompanyCore.

## Rollback

- OpenJarvis: redeploy the previous OpenJarvis image or revert the four
  CompanyCore connector/context files.
- Paperclip: redeploy the previous Paperclip image or revert the adapter
  commit while preserving the Paperclip database volume.
- CompanyCore: no runtime change is required for this handoff package. Pending
  agent events remain available because acknowledgement is at-least-once.
