# AGENTS.md - Roost

## Context

Read `docs/documentation-contract.json`, then load its bounded
`defaultAgentContext` and only the sources relevant to the task. Read exact
acceptance clauses from `docs/product/requirements.md` for the task's IDs;
read the full registry for whole-product coverage work. Product,
architecture, operations and release truth lives under `docs/`.

The durable starting set is intentionally small:

- `docs/product/product.md` defines what Roost is and why it exists.
- `docs/product/requirements-index.md` routes to the relevant sections of the
  canonical `docs/product/requirements.md` registry.
- `docs/implementation.md` contains the current implementation state, the
  outcome being delivered and its end-to-end acceptance gates.
- architecture, operations and evidence documents are loaded only for the
  component being changed.

Versioned technical documents are protocol/evidence records. Their historical
"next atom" or "stop after this slice" statements are not the current work
queue and never override `docs/implementation.md`.

For implementation, integration, verification, release or delivery-status work
that advances the objective in `docs/implementation.md`, use the
`roost-runtime-delivery` repository skill. The skill is the operating method;
the canonical documents remain the source of product and implementation truth.
For a status answer, run `npm run codex:status` and read `docs/implementation.md`;
report inspected proof, unknowns and the active gate separately. Requirement
coverage is not implementation completion.

Use `roost-gate-design` when asked to define or refine a future Roost delivery
gate. For an authorized company capability spanning product surfaces, use
`roost-capability-slice` alongside `roost-runtime-delivery`. Use
`roost-independent-acceptance` for a separately owned review of a claimed
Roost outcome. Use `roost-model-qualification` only for an authorized managed
model-admission or routing task. These skills do not authorize a new gate or
change accepted product requirements.
For external Codex thread coordination, use `roost-program-steering` when it is
installed; its output remains subordinate to the canonical documents here.

Do not create repository-local agent roles, task boards, project memory or
coordination systems. External tools such as Codex keep their
execution state outside this repository.

## Delivery behavior

- Before assigning a gate, inspect the actual target and existing adapters. A
  missing deployment provider or other substantial new capability needs its
  own bounded outcome and estimate; do not hide it inside "complete the gate".
  The owner approves the outcome, permitted effects and time/token/cost/attempt
  limits before execution. No budget increases itself.
- Scope safety and proof to the task's real effect. Roost owner/agent task flow
  does not inherit application push, deployment, backup or product-readiness
  gates. Preserve Roost's own business-data recovery requirement; use
  application release and data safeguards when a separately authorized task
  actually changes that application or its production data.
- One implementation owner carries the currently authorized gate in
  `docs/implementation.md` through coding, integration, verification and the
  required demonstration. Internal substeps and multiple reviewable commits
  are allowed; they are not handoff boundaries.
- Within the approved scope and budget, do not stop after producing a proposal,
  source-only contract, migration, adapter or mocked test when the accepted
  outcome requires a working integration. Repair ordinary failed checks within
  that task.
- Resolve ordinary reversible technical choices from the accepted requirements,
  current architecture, inspected code and test evidence. Do not ask the owner
  to choose implementation details already determined by those sources.
- Resolve ordinary defects inside the approved scope. If work exposes an
  unplanned provider, material architecture change, repeated ineffective
  attempt or exhausted budget, stop at a safe checkpoint. Preserve evidence,
  diagnose the actual cause and return a smaller revised proposal for owner
  approval. Do not invent failure scenarios or recheck unaffected evidence.
- Also stop when progress requires an unavailable login/2FA or secret, an
  unapproved irreversible real-data action, a contradiction in accepted
  business intent, or an unavailable service without a safe alternative.
  Complete independent safe preparation before asking one concrete question.
- Report progress at the end-to-end gates defined in `docs/implementation.md`,
  not by counting internal atoms, contracts or files. State verified capability,
  failed or unrun checks, remaining path, and budget used or unavailable.
- One user task authorizes exactly one delivery gate unless the user explicitly
  names a wider range. Complete that gate autonomously, record its evidence and
  stop at its boundary. Never begin the next gate merely because context,
  time or account usage remains; the owner checks available usage and issues a
  new task before the next gate starts.

## Codex orchestration

- The root agent is the single implementation owner and remains accountable for
  the complete outcome, integration, verification and truthful report.
- Delegate only independent, bounded work with an explicit question, owned file
  surface and expected evidence. Keep dependent steps in the root agent.
- Agents may implement separate non-overlapping components in parallel only
  after their boundaries are explicit. Never assign two agents to edit the same
  mutable files or let a subagent create a competing plan or source of truth.
- Treat subagent output as unverified input. The root agent inspects every
  resulting diff, reconciles it with accepted requirements and reruns the
  material checks before accepting it.
- Use subagents when parallelism or independent review materially improves the
  result, not to repeat the same investigation or manufacture activity.
- Before claiming a gate complete, run `npm run codex:check`, the relevant
  component checks and the native or production proof required by that gate.
  A source file, passing mock, commit or subagent statement alone is never
  completion evidence.
- At a completed gate boundary, leave the repository recoverable and clean when
  the task authorizes commits. Push or deploy only when the current gate and
  user authority require it. Report the next gate without starting it.
- An agent may propose a skill improvement when a repeated, evidenced workflow
  failure shows a reusable gap. One owner changes the skill in a separate
  non-overlapping scope after checking whether the durable fix belongs in code,
  tests or canonical docs. Validate the revised skill on a realistic task;
  agents do not silently rewrite their own operating rules mid-gate.

## Project boundaries

- Codex builds Roost and its Worker. Roost is not a company portfolio project;
  the connected local agent uses Roost for assigned company work and must not
  receive Roost source-development tasks.
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
