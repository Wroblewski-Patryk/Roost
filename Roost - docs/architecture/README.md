# Architecture Documentation

This folder is the canonical source of truth for how the application works.

Use these files when the question is:

- what the system is
- how runtime flows work
- which entity owns which state or responsibility
- which invariants are fail-closed or non-negotiable

Do not use this folder for:

- execution plans
- rollout waves
- closure notes
- evidence packs
- module inventory
- implementation task history

Those belong elsewhere:

- `docs/planning/` for change sequencing and open work
- `docs/modules/` for code ownership and implementation deep-dives
- `docs/operations/` for runbooks, smoke checks, and evidence
- `docs/product/` for product intent and scope

## Reading Order

1. `architecture-source-of-truth.md`
2. `architecture-evidence-system.md`
3. `system-architecture.md`
4. `autonomous-company-operating-system.md`
5. `tech-stack.md`
6. `organizational-architecture-bridge.md`
7. `unified-organizational-operating-system.md`
8. `companycore-business-module-map.md`
9. `companycore-global-business-flow.md`
10. `department-management-systems-architecture.md`
11. `department-management-systems-v1-blueprint.md`
12. `company-os-definition-editing-contract.md`
13. `company-os-workflow-definition-command-contract.md`
14. any project-specific architecture or ADR files added later

## Evidence Graph

The architecture evidence graph lives under:

- `docs/architecture/nodes/`
- `docs/architecture/relations/`
- `docs/architecture/chains/`
- `docs/testing/test-map.csv`
- `docs/status/evidence-status.csv`
- `docs/graphs/`

Run `npm run architecture:graph` after changing mapped features, routes,
components, tests, docs, agents, workflows, or chain records. CSV files are the
source of truth; generated Markdown and graph exports are derived for Obsidian
and agent analysis.

## Architecture Rules

- one file should have one clear responsibility
- resolved architecture decisions belong here, not only in planning notes
- module docs may explain implementation, but they do not override this folder
- if a rule matters for runtime safety, ownership, or invariants, it must be
  explicit here
