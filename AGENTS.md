# AGENTS.md - Roost

## Context

Read `docs/documentation-contract.json`, then load its bounded
`defaultAgentContext` and only the sources relevant to the task. Product,
architecture, operations and release truth lives under `docs/`.

The durable starting set is intentionally small:

- `docs/product/product.md` defines what Roost is and why it exists.
- `docs/product/requirements.md` contains the current accepted requirements.
- `docs/implementation.md` contains the current implementation state, the
  outcome being delivered and its end-to-end acceptance gates.
- architecture, operations and evidence documents are loaded only for the
  component being changed.

Versioned technical documents are protocol/evidence records. Their historical
"next atom" or "stop after this slice" statements are not the current work
queue and never override `docs/implementation.md`.

Do not create repository-local agent roles, task boards, project memory or
coordination systems. External tools such as Codex keep their
execution state outside this repository.

## Delivery behavior

- One implementation owner carries the current outcome in
  `docs/implementation.md` through coding, integration, verification and the
  required demonstration. Internal substeps and multiple reviewable commits
  are allowed; they are not handoff boundaries.
- Do not stop after producing a proposal, source-only contract, migration,
  adapter or mocked test when the accepted outcome requires a working
  integration. Continue through the remaining technical work and repair failed
  checks within the same task.
- Resolve ordinary reversible technical choices from the accepted requirements,
  current architecture, inspected code and test evidence. Do not ask the owner
  to choose implementation details already determined by those sources.
- A larger-than-expected implementation, failing test, missing adapter,
  migration requirement, Docker/database problem or architecture correction is
  work to solve, not a reason to bounce the task between conversations.
- Stop for owner input only when progress requires an unavailable login/2FA or
  secret, an unapproved irreversible action against real data, a genuine
  contradiction in accepted business intent, or an unavailable external
  service with no safe technical alternative. Prepare everything possible
  before reporting that dependency and ask one concrete question.
- Report progress at the end-to-end gates defined in `docs/implementation.md`,
  not by counting internal atoms, contracts or files.

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
