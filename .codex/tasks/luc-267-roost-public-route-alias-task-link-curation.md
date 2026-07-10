# LUC-267 Roost Public Route Alias Task-Link Curation

## Header

- ID: [LUC-267](/LUC/issues/LUC-267)
- Parent: [LUC-262](/LUC/issues/LUC-262)
- Title: 04 Operacje - Roost Public Route Alias Task-Link Curation
- Task Type: documentation and architecture-memory curation
- Current Stage: verification
- Deliverable For This Stage: task-link source-of-truth entry and generated
  task-synchronization readback for the public readiness/build-info aliases.
- Owner: Documentation Steward
- Priority: P1

## Goal

Curate the three public readiness/build-info route alias entities exposed by
the LUC-262 task-sync report so they link back to the existing route repair and
evidence lineage instead of remaining implementation-without-task gaps.

## Scope

In scope:

- `src/app.ts#/api/build-info`
- `src/app.ts#/ready`
- `src/app.ts#/v1/ready`
- `docs/status/task-synchronization-report.md`
- Generated architecture-awareness readback files touched by the scanner.

Out of scope:

- Runtime behavior changes.
- Protected smoke, secret access, provider actions, push, deploy, restart,
  rollback, or production mutation.

## Architecture Links

- `api_endpoint:use-api-build-info:36fe7c3255`
- `api_endpoint:use-ready:cd82f6ee50`
- `api_endpoint:use-v1-ready:035c4febde`
- `src/app.ts#/api/build-info`
- `src/app.ts#/ready`
- `src/app.ts#/v1/ready`

## Implementation Plan

1. Read LUC-262 and LUC-267 context and confirm the three target entities.
2. Record this task contract with explicit architecture links to the alias
   entities.
3. Regenerate the architecture-awareness index and task-sync report.
4. Verify the actionable implementation-without-task count no longer lists the
   three aliases.
5. Update source-of-truth state and close LUC-267 with evidence.

## Acceptance Criteria

- The three route alias entities are linked to this task contract.
- `docs/status/task-synchronization-report.md` reports `0` actionable
  implementation entities without task links, or records a deliberate
  deferral with reason.
- No runtime, production, provider, protected, or secret-bearing action occurs.

## Definition Of Done

- Task-link curation exists in a scanner-consumed task source.
- Generated readback proves the LUC-262 gap changed.
- Project/task state records the local-only evidence and residual risk.

## Result Report

Status: DONE locally.

Files changed:

- `.codex/tasks/luc-267-roost-public-route-alias-task-link-curation.md`
- `docs/graphs/architecture-awareness.json`
- `docs/graphs/architecture-awareness.csv`
- `docs/graphs/architecture-proof-register.csv`
- `docs/graphs/architecture-graph.md`
- `docs/graphs/architecture-graph.mmd`
- `docs/graphs/architecture-health.json`
- `docs/status/architecture-awareness-report.md`
- `docs/status/architecture-dependency-report.md`
- `docs/status/architecture-ownership-report.md`
- `docs/status/task-synchronization-report.md`

Verification:

- Architecture-awareness regeneration PASS at `2026-07-10T01:12:23.222Z`
  with `2818` entities, `6620` relations, `16449` files, and overrides
  `34/33`.
- `docs/status/task-synchronization-report.md` now reports `0` actionable
  tasks without architecture links, `0` raw tasks without architecture links,
  `0` actionable implementation entities without task links, `0` raw
  implementation entities without task links, `0` classified task-linkage
  noise, and `0` verified entities without proof evidence.
- Graph readback shows three `documents` relations from
  `task:luc-267-roost-public-route-alias-task-link-curation:fbf174e3ba` to:
  `api_endpoint:use-api-build-info:36fe7c3255`,
  `api_endpoint:use-ready:cd82f6ee50`, and
  `api_endpoint:use-v1-ready:035c4febde`.
- `git diff --check` PASS with LF-to-CRLF warnings only for generated
  architecture/status artifacts.

No product code, runtime behavior, browser, Docker, database, protected smoke,
credential access, secret disclosure, push, deploy, restart, provider action,
or production mutation occurred.

Residual risk:

- This closes only the LUC-262 task-link gap for the three public route alias
  entities. It does not close source-control disposition for the generated
  packet or app-completion proof-link/proof-target curation.
