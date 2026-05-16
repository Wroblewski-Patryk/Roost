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
2. `system-architecture.md`
3. `tech-stack.md`
4. `organizational-architecture-bridge.md`
5. `companycore-business-module-map.md`
6. `companycore-global-business-flow.md`
7. `department-management-systems-architecture.md`
8. `company-os-definition-editing-contract.md`
9. `company-os-workflow-definition-command-contract.md`
10. any project-specific architecture or ADR files added later

## Architecture Rules

- one file should have one clear responsibility
- resolved architecture decisions belong here, not only in planning notes
- module docs may explain implementation, but they do not override this folder
- if a rule matters for runtime safety, ownership, or invariants, it must be
  explicit here
