# Legacy Archive Policy

Status: template

## Purpose

Legacy archive folders are historical reference material, not runtime source.
They must not be treated as active application code during quality, security,
architecture, localization, or feature audits unless the task explicitly says
so.

## Archive Folder Naming

Use a clearly documented archive folder such as:

- `!oldCode/`
- `legacy/`
- `archive/`
- another repository-approved path named in this document

## Rules

- Do not import or reference archive files from runtime code.
- Do not copy legacy code into active source without a normal implementation
  task, architecture review, and validation.
- Exclude archive paths from ad hoc quality searches unless the task is about
  archive migration, comparison, or removal.
- Do not add new archival material without owner approval and a documented
  retention reason.
- Archive cleanup requires explicit owner approval when files may still be
  useful as historical reference.

## Audit Exclusions

Keep the canonical local exclusion list in one repository-approved place, such
as `.quality-auditignore`, `.eslintignore`, tooling config, or this document.

## Agent Rule

When agents search, refactor, or audit the repository, they should state whether
archive folders were included or excluded whenever that choice affects the
result.
