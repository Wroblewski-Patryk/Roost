# Architecture Documentation

This folder is the canonical source of truth for how the application works.
It is the architecture segment of the project's Obsidian-friendly `docs/`
vault: early architecture notes, owner thoughts, assumptions, diagrams, and
rough models may start here before they harden into implementation contracts.
All architecturally important project decisions must be recorded here when
they become accepted direction, so future agents can build from durable
project truth instead of chat memory.

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
9. `process-core-workflow-core-architecture.md`
10. `business-ontology-import-strategy.md`
11. `companycore-global-business-flow.md`
12. `department-management-systems-architecture.md`
13. `department-management-systems-v1-blueprint.md`
14. `company-os-definition-editing-contract.md`
15. `company-os-workflow-definition-command-contract.md`
16. any project-specific architecture or ADR files added later

## Maturity-Aware Reading

Agents must read this folder according to the application's maturity level:

- early-stage projects: treat `docs/architecture/` as the product and
  architecture assumption space; extract intent, open questions, candidate
  models, and first safe slices before coding
- growing projects: separate approved architecture from exploratory notes,
  then turn stable owner intent into task contracts, risks, decisions, and
  verification rows
- mature projects: treat approved architecture docs as implementation
  constraints; do not reinterpret or bypass them without an explicit decision

The whole `docs/` root is the Obsidian vault, not only this architecture
folder. Prefer Markdown, stable relative links, small focused notes, and
source-of-truth indexes over tool-specific formats that make the vault hard to
browse.

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
- if a decision changes what the product is, how it is structured, who owns
  state, or how agents should create it, record that decision here before
  relying on it in implementation
