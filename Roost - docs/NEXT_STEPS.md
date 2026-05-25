# Next Steps

Last updated: 2026-05-08

## Current Baseline

CompanyCore v1 is achieved for the approved runtime scope. The live system
includes owner/workspace auth, workspace-scoped API keys, ClickUp import and
sync/write-back, signed ClickUp webhooks, scheduled ClickUp maintenance,
Jarvis CompanyCore context, Paperclip CompanyCore agent events, agent CRUD
routes, route-level service-key scopes, machine-readable `/v1/connection`
metadata, reusable agent smoke, and typed owner-console business editors.

Current production public `/health` reports build/image:

```text
71f3eb3b063ea68226a1736c727c52882b33f27a
```

Manual VPS backend rollover remains the approved release path until a future
push-to-running-image smoke proves GitHub-to-Coolify auto-deploy is reliable.

## Canonical Queue

Use these files as the active source of truth:

- `.codex/context/TASK_BOARD.md`
- `.agents/state/next-steps.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/planning-catalog-index.md`

## Ready Work

No ready v1 runtime or agent-runtime task remains.

## Blocked Work

- AGRUN-007 Google Drive Owner Consent And First Import:
  blocked until real OAuth credentials and owner consent/import action are
  available.
- AGRUN-010 Upstream Agent Source Merge Execution:
  blocked until Paperclip/OpenJarvis upstream write access or an approved
  fork/PR route exists.

## Next Decision

The next move should be an explicit product or operations decision:

- choose the next v2 company operations dashboard slice
- provide Google OAuth credentials and owner consent for the first Drive import
- provide an upstream/fork route for Paperclip and OpenJarvis handoff
- invest in GitHub/Coolify auto-deploy tooling and record a reliable
  push-to-running-image smoke

## Do Not Reopen As V1

- Owner registration/login and workspace bootstrap
- Workspace-scoped integration settings and secret storage
- Prisma migration production entrypoint
- Native ClickUp adapter foundation
- Required v1 events
- API key hardening and scoped service-key enforcement
- Endpoint and integration test foundation
- Typed Notes, Projects, Clients, Task Lists, and Tasks owner-console editors

These are already delivered or superseded by later accepted runtime evidence.
