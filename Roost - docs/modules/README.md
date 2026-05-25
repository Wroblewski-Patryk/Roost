# Modules Documentation

Use one file per major module, bounded context, or feature slice in this
folder when the repository grows beyond a simple single-surface app.

## Role Of This Folder

`docs/modules/` explains:

- where the code lives
- which routes, jobs, services, or UI surfaces a module owns
- which dependencies it uses
- which tests verify it

It does not replace `docs/architecture/` as the canonical source of runtime
behavior.

## Canonical Files

- `system-modules.md`
  repository-wide module map
- `module-doc-status-index.md`
  deep-dive coverage tracker
- `module-deep-dive-template.md`
  canonical template for new module documentation

## Usage Rules

- create deep-dives only for real modules or feature areas
- keep module docs implementation-facing
- when a module doc references behavior or invariants, link back to
  `docs/architecture/`
