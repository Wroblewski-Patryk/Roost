# Architecture Map Status

Last updated: 2026-07-28

## Purpose

Track whether architecture maps, graph registries, chains, modules, and
pipeline docs are current enough to guide implementation.

## Status

| Area | Status | Evidence | Next action |
| --- | --- | --- | --- |
| Architecture docs | current | `docs/architecture/` is the approved source; `npm run architecture:refresh` completed on 2026-07-28 with the doc baseline synchronized. | Keep architecture decisions in `docs/architecture/` and rerun the gate after meaningful changes. |
| Native graph registry | verified | `docs/status/architecture-health-dashboard.md`: `455` nodes / `769` relations / `35` chains, evidence queue `0`, chain worklist `0`, all gates passing. | Open a focused repair only if a native gate or delta becomes non-zero. |
| Architecture awareness | current with curation debt | `docs/status/architecture-awareness-report.md` generated `2026-07-28T04:34:31.651Z`: `3150` entities / `8604` relations / `16539` files, no owner/disconnected/doc-link/task-link implementation gaps. | Treat the `12` historical task-artifact linkage gaps and broad inferred missing-test inventory as curation signals, not user-facing defects. |
| User-flow and Project Truth maps | verified | `docs/status/app-completion-index.md` reports `46` items / `4` flows / zero gaps; `docs/status/project-truth-index.md` is `known_and_routable` with `0` total gaps. | Rebuild in dependency order after meaningful code/docs changes: awareness, app completion, then Project Truth. |
| Runtime/readiness projection | verified within read-only scope | `docs/status/operational-readiness-index.md` records complete event/runtime/app-completion gates and passing public web/build-info/API health/readiness probes. | Keep authenticated, provider-write, deploy, and production-browser evidence in their separately gated owner lanes. |
| History separation | current | Current truth is indexed in state/status/release files; older LUC packets remain historical evidence and are superseded by LUC-2024 for PM known-state routing. | Do not route new work from superseded aggregate counts without a fresh generated regression. |

## Rule

If an agent cannot find the affected function chain or module owner within a
few minutes, treat that as a documentation/graph gap and create a repair task.
