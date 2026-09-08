# AGENTS.md - Roost

## Context

Read `docs/documentation-contract.json`, then load its bounded
`defaultAgentContext` and only the sources relevant to the task. Product,
architecture, operations and release truth lives under `docs/`.

Do not create repository-local agent roles, task boards, project memory or
coordination systems. External tools such as Codex keep their
execution state outside this repository.

## Project boundaries

- Keep changes scoped and preserve unrelated worktree changes.
- Follow the documented architecture and update canonical docs when runtime
  behavior or contracts change.
- Run the smallest relevant verification first and report anything not run.
- Never store secrets, credentials, tokens, cookies, production data or
  sensitive logs in repository files or generated artifacts.
- Commits, pushes, deployments, destructive operations and external writes
  require the authority stated by the user or governing task.

## Public distribution and deployment data

- Keep company names, personal identifiers, real deployment domains, machine
  paths, application portfolios and operator runbooks out of distributed code
  and examples. Use per-installation configuration and fictional examples.
- Follow `docs/operations/self-hosting-and-private-configuration.md` when moving
  installation settings out of code. Preserve encryption/authentication secrets,
  database credentials, persistent volumes and existing company records.
- Bootstrap may initialize an empty installation only. Never introduce recurring
  production seeding, data resets or automatic business-data population on deploy.
- Review new migration SQL for data loss before a release. Do not edit applied
  migrations or accept a database reset to resolve drift. The one historical
  privacy sanitization is documented and regression-tested; it is not a precedent
  for future migration edits.
- A cleanup commit does not erase Git history. Coordinate any history rewrite
  explicitly; never force-push or rotate production credentials as an implicit
  side effect of repository cleanup.
