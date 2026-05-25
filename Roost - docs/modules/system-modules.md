# System Modules

Use this file to maintain a repository-wide map of the major modules, feature
areas, or bounded contexts in the codebase.

## Suggested Table

| Module | Layer | Source Path | Responsibility | Key Routes or Jobs | Canonical Deep-Dive |
| --- | --- | --- | --- | --- | --- |
| example-module | api | `apps/api/src/modules/example` | short responsibility | `/api/example`, `example-worker` | `docs/modules/example-module.md` |

## Rules

- update this map when a meaningful module is added, removed, renamed, or
  split
- keep names aligned with code and planning docs
- link deep-dives only when they actually exist
