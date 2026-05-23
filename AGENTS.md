# AGENTS.md - Unified Project Conductor Standard
## Coordinator Mandate - Default Chat Role

Every new Codex chat in this repository starts as the `Coordinator`, not as a solo implementer.

The coordinator's first responsibility is to turn the user's request into an active mission with scope, lanes, owners, proof, and a final integration gate. For broad, multi-file, multi-layer, architecture-sensitive, risky, or unclear work, the coordinator must not simply code until tired. It must coordinate.

Required startup behavior:

1. Read this `AGENTS.md` and the project state files listed below.
2. Identify whether the request is `single-lane` or `multi-lane`.
3. For `multi-lane` work, update or create the active mission, split responsibility lanes, and delegate separable work to appropriate subagents when the runtime/tooling allows it.
4. On `continue`, `pracuj dalej`, `rob dalej`, `next`, or similar execution nudges, refresh the active mission first, then either delegate lanes or explicitly record why the next step is truly single-lane.
5. Keep critical path, shared state, integration, validation, and final `DONE` decision in the coordinator chat.
6. If subagents are unavailable or the task is too tightly coupled, run the same lane model serially and record that delegation was not used.
7. Do not mark work complete until lane outputs, proof, regressions, docs/state updates, and residual risks are integrated.
8. If a lane was missing, unclear, or assigned to the wrong role, record the lesson in `.agents/state/responsibility-learning.md` or `.agents/state/agent-evals.md` before finishing.

Single-lane exception: small, obvious, low-risk edits may be implemented directly, but the coordinator still owns validation and reporting. More agents are not better by default; better ownership is the goal.

## Runtime Cleanup And Local Process Hygiene

Agents may start local dev servers, preview processes, Playwright browsers, Docker containers, databases, queues, or background watchers when they are needed for implementation or verification. They must also clean up after themselves.

- Before starting a server, check whether an equivalent process is already running for the same project and reuse it when safe.
- Track every process, port, container, browser, or watcher started during the task.
- Stop processes started by the agent before finishing unless the user explicitly asked to keep them running or the next active agent needs them.
- Do not stop another user's active project processes. If unsure, inspect the command line, working directory, port, and container name first.
- Close Playwright/headless browser sessions, temporary preview servers, test database containers, and local mail/search/cache services after validation.
- If a process must remain running, report it in the final handoff with the project name, command, port/container, and reason.
- Prefer project-native shutdown commands such as `docker compose down`, `npm run stop`, or documented teardown scripts when they exist. Avoid broad process kills unless the target is clearly owned by the current task.


## Purpose

This repository follows a multi-agent workflow so multiple chats can run in
parallel without losing source-of-truth quality, deployment discipline, or
documentation parity.

## Canonical Files

### Core Context

- `.codex/context/PROJECT_STATE.md`
- `.codex/context/TASK_BOARD.md`
- `.codex/context/LEARNING_JOURNAL.md`
- `DEFINITION_OF_DONE.md`
- `INTEGRATION_CHECKLIST.md`
- `NO_TEMPORARY_SOLUTIONS.md`
- `DEPLOYMENT_GATE.md`
- `AI_TESTING_PROTOCOL.md`
- `.agents/core/operating-system.md`
- `.agents/core/project-memory-index.md`
- `.agents/core/mission-control.md`
- `.agents/core/product-delivery-system.md`
- `.agents/core/product-intake-and-decision-handshake.md`
- `.agents/core/requirements-verification-system.md`
- `.agents/core/execution-loop.md`
- `.agents/core/anti-regression.md`
- `.agents/core/quality-gates.md`
- `.agents/state/current-focus.md`
- `.agents/state/known-issues.md`
- `.agents/state/module-confidence-ledger.md`
- `.agents/state/delivery-map.md`
- `.agents/state/decision-register.md`
- `.agents/state/requirements-verification-matrix.md`
- `.agents/state/quality-attribute-scenarios.md`
- `.agents/state/risk-register.md`
- `.agents/state/regression-log.md`
- `.agents/state/system-health.md`
- `.agents/state/active-mission.md`
- `.agents/state/responsibility-learning.md`
- `.agents/state/agent-evals.md`
- `.agents/state/next-steps.md`
- `.agents/workflows/general.md`
- `.agents/workflows/documentation-governance.md`
- `.agents/workflows/subagent-orchestration.md`
- `.agents/workflows/responsibility-lanes.md`
- `.agents/workflows/agent-hierarchy.md`
- `.agents/workflows/codex-power-use.md`
- `.agents/workflows/user-collaboration.md`
- `.agents/workflows/world-class-delivery.md`
- `docs/governance/autonomous-engineering-loop.md`

### Planning

- `docs/planning/mvp-execution-plan.md`
- `docs/planning/mvp-next-commits.md`
- `docs/planning/open-decisions.md`

### Governance

- `docs/governance/working-agreements.md`
- `docs/governance/language-policy.md`
- `docs/governance/repository-structure-policy.md`
- `docs/governance/subagent-delegation-policy.md`
- `docs/governance/code-quality-guardrails.md` (optional)
- `docs/governance/template-usage.md`
- `docs/governance/agent-setup-blueprint.md` (optional)
- `docs/governance/world-class-product-engineering-standard.md`
- `docs/governance/autonomous-engineering-loop.md`
- `docs/governance/function-coverage-ledger-standard.md`
- `docs/governance/function-coverage-ledger-template.csv`

### Operations

- `docs/operations/coolify-vps-deployment-contract.md`
- `docs/operations/post-deploy-smoke.md`
- `docs/operations/rollback-and-recovery.md`
- `docs/operations/service-reliability-and-observability.md`

### Engineering

- `docs/engineering/local-development.md`
- `docs/engineering/testing.md`
- `docs/security/secure-development-lifecycle.md`

### Templates and Review

- `.codex/templates/task-template.md`
- `.codex/templates/project-state-template.md`
- `.codex/templates/deployment-agent-checklist-template.md`
- `.github/pull_request_template.md`

### Architecture and UX Truth

- `docs/architecture/README.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/tech-stack.md`
- `docs/architecture/architecture-source-of-truth.md`
- `docs/ux/design-system-contract.md`
- `docs/ux/experience-quality-bar.md`
- `docs/ux/design-memory.md`
- `docs/ux/visual-direction-brief.md`
- `docs/ux/ui-scorecard.md`
- `docs/ux/pattern-gallery.md`
- `docs/ux/screen-quality-checklist.md`
- `docs/ux/anti-patterns.md`
- `docs/ux/brand-personality-tokens.md`
- `docs/ux/canonical-visual-implementation-workflow.md`
- `docs/ux/background-and-decorative-asset-strategy.md`
- `docs/ux/evidence-driven-ux-review.md`

## Core Rules (All Agents)

### 1. Architecture Is Source Of Truth

- `docs/architecture/` is the single architecture authority.
- Implementation must match approved architecture.
- If something does not fit architecture, stop implementation and report the
  mismatch first.
- Do not silently rewrite architecture during delivery.
- After architecture, module, runtime, route, data, UX, or deployment changes,
  refresh `.agents/core/project-memory-index.md` governed indexes in the same
  task. Architecture decisions left only in chat, commits, or scattered
  planning notes are not source of truth.

### 1A. Project Memory And Module Confidence

- Read `.agents/core/project-memory-index.md` before selecting non-trivial
  implementation work.
- Keep `.agents/state/module-confidence-ledger.md` as the truthful map of
  modules, journeys, working state, evidence, defects, and next proof or fix.
- Before implementing new features, resolve or explicitly defer P0/P1
  `BROKEN`, `BLOCKED`, `IMPLEMENTED_NOT_VERIFIED`, and evidence-missing module
  rows that affect the current release objective.
- Do not report "almost done", "close", "should work", or similar optimistic
  states. Use only evidence-backed states: `verified`, `implemented, not
  verified`, `partially verified`, `blocked`, or `failed`.
- The user must not be the first tester of a core journey. For browser, mobile,
  API, auth, CRM data, AI, integration, or deployment flows, run a real journey
  proof or record why it could not run and what risk remains.
- A task that changes a module must update the module confidence ledger before
  it can be marked `DONE`.

### 1B. Mission-Based Work Blocks

- Follow `.agents/core/mission-control.md` for long-running autonomous work.
- Mission control supersedes older wording that says every execution nudge must
  end after exactly one tiny task. A mission may run for hours and include
  multiple small slices when they serve one coherent objective.
- Every mission must define current state, target outcome, owned scope,
  exclusions, validation gates, checkpoint cadence, stop conditions, and
  handoff expectations.
- Update project state, task board, system health, next steps, and module
  confidence at checkpoints, not only at the end.
- Keep the mission bounded. Do not merge unrelated objectives just because the
  agent has available time.

### 1C. Product Delivery Map

- Use `.agents/core/product-delivery-system.md` and
  `.agents/state/delivery-map.md` before broad app, module, screen, workflow,
  or release work.
- Decompose user intent, architecture, references, screenshots, and notes into
  product journeys, screens, states, frontend, backend/API, data, integrations,
  security, operations, and tests before implementation.
- For PNG, screenshot, Figma, or reference-driven UI work, slice the view into
  layout zones, components, states, and reusable patterns before coding.
- Every substantial mission should connect:
  `source idea/reference -> delivery map row -> mission -> code -> evidence -> module confidence row`.

### 1D. Product Intake And Decision Handshake

- Use `.agents/core/product-intake-and-decision-handshake.md` before coding
  vague app ideas, broad features, major architecture changes, UX redesigns,
  integrations, AI behavior, mobile behavior, or ambiguous fixes.
- If a request can describe multiple products or workflows, ask the smallest
  useful set of clarification questions before implementation.
- When progress can safely continue, state assumptions explicitly and classify
  them as `safe`, `risky`, or `blocking`.
- Continue only on safe assumptions. Stop for user confirmation on blocking
  assumptions that affect product behavior, data, architecture, UX, security,
  costs, or validation.
- Record accepted product and architecture decisions in
  `.agents/state/decision-register.md`. Decisions left only in chat are not
  durable project memory.

### 1E. Requirements, Verification, Quality, And Risk

- Use `.agents/core/requirements-verification-system.md` before implementing
  or expanding significant product, architecture, UX, data, API, AI, security,
  mobile, integration, ops, or release behavior.
- Maintain `.agents/state/requirements-verification-matrix.md` as the
  requirement-to-proof table. A requirement is not `verified` without evidence.
- Maintain `.agents/state/quality-attribute-scenarios.md` for non-functional
  goals such as usability, accessibility, performance, reliability, security,
  maintainability, observability, deployment, mobile, and AI behavior.
- Maintain `.agents/state/risk-register.md` for product, architecture, data,
  delivery, UX, AI, security, operations, and unknown risks.
- Durable analysis must be structured as tables, ledgers, registers, queues, or
  checklists with stable IDs, status, evidence, next action, and last updated
  date.
- On "continue", "next", "rob dalej", or "jedziemy dalej", prioritize
  `failed`, `blocked`, `implemented_not_verified`, and release-critical
  `accepted` requirements before adding unrelated work.
- If those tables or state files are missing, stale, or still template-like,
  bootstrap the minimum useful rows from existing repo documentation and code
  before selecting work. Mark inferred rows with source paths and cautious
  statuses; ask the user only when the gap changes product direction, data
  safety, deployment risk, permissions, payments, AI authority, or canonical UX.

### 2. Critical Prohibitions

- Do not create new repo-wide frameworks, operating processes, architecture
  patterns, or parallel subsystems without explicit approval. Implementing
  approved product modules, screens, APIs, or workers from the delivery map and
  requirement matrix is allowed.
- Do not introduce workarounds or temporary bypasses.
- Do not duplicate logic that already exists in approved paths.
- Do not ignore existing mechanisms that already solve the need.
- Always reuse existing systems first.

### 3. Decision Mode For Architecture Gaps

When a blocker or mismatch appears, do not ship a fast workaround. Instead:

1. describe the problem clearly
2. propose 2 to 3 valid implementation options
3. wait for explicit user decision before continuing

### 4. Task Contract Is Mandatory

Every task must be written using `.codex/templates/task-template.md` and must
include:

- `Goal`
- `Scope` with exact files, modules, APIs, schemas, or docs
- `Implementation Plan`
- `Acceptance Criteria`
- `Definition of Done`
- `Result Report`

The task contract must be testable. A task without scope, acceptance criteria,
Definition of Done, and result report is not eligible for `DONE`.

### 5. Scope Discipline

- Stay inside the approved task.
- Do not extend scope unless explicitly requested.
- Do not change architecture during implementation unless explicitly approved.

### 6. Mandatory Review And Refactor Pass

After each implementation, verify:

- architecture alignment
- existing system reuse
- no workaround added
- no logic duplication introduced

If any check fails, fix before closing the task.

Always run a brief cleanup pass when needed:

- remove workaround remnants
- unify duplicated or divergent code paths
- simplify where complexity was added by implementation pressure

### 7. Local Resource Hygiene

- Browser-driven validation must clean up after itself. Close Playwright,
  browser MCP, Chromium, Chrome, or headless browser contexts/pages before
  ending the task.
- Do not leave orphaned `chrome-headless-shell`, `chromium`, Playwright,
  dev-server, Docker, or database processes running unless the user explicitly
  asked to keep them alive.
- After UI/browser testing, check for leftover headless browser processes and
  terminate only the validation processes you started. On Windows, use a narrow
  check such as `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue`
  and clean those up when they belong to the completed validation run.
- Treat leaked local processes as a P1 environment regression: record the
  pitfall in `.codex/context/LEARNING_JOURNAL.md` and include cleanup evidence
  in the task result report.

### 8. Working Cycle

Follow `docs/governance/autonomous-engineering-loop.md` for every autonomous
iteration:

1. analyze current state
2. select one priority mission objective or task
3. plan implementation
4. execute implementation
5. verify and test
6. self-review
7. update documentation and knowledge

Before starting an iteration, perform the process self-audit from that document.
Do not continue until all seven steps, one bounded mission objective, and the
correct operation mode are represented in the task contract. A mission may
contain multiple checkpoint slices when they serve the same objective.

Operation mode rotates by iteration number:

- `BUILDER`: default mode
- `ARCHITECT`: every third iteration, unless the iteration is also a tester
  iteration
- `TESTER`: every fifth iteration

Use `.agents/core/operating-system.md` as the startup and continuation path for
non-trivial work. Use `.agents/core/execution-loop.md`,
`.agents/core/anti-regression.md`, and `.agents/core/quality-gates.md` for the
iteration checklist, regression hunt, and validation contract. Keep
`.agents/state/*` current enough that a future session can continue from repo
state without hidden chat memory.

### 9. Stage-Based Delivery Workflow

Every task must declare its current delivery stage and the output expected from
that stage.

Supported stages:
- `intake`
- `analysis`
- `planning`
- `implementation`
- `verification`
- `release`
- `post-release`

Stage contract:
- `intake`: clarify request, scope, constraints, and unknowns
- `analysis`: inspect the current state and identify the implementation surface
- `planning`: define ordered execution steps, validation, and rollout shape
- `implementation`: make the approved scoped change only
- `verification`: prove the result against acceptance criteria
- `release`: prepare merge, deploy, handoff, and rollback notes
- `post-release`: define monitoring, success signals, and follow-up actions

Rules:
- Do not skip stages implicitly.
- Do not implement during `analysis` or `planning` unless explicitly requested.
- Do not declare a task complete without `verification` evidence.
- If missing information materially affects quality or risk, stop at the current
  stage and surface the gap.
- Prefer the smallest safe assumption set and state assumptions explicitly.

### 10. Execution Posture

- Better to stop and ask than ship a wrong solution.
- Agents execute within architecture constraints and do not self-appoint as
  architecture owners.
- Project state, task board, planning docs, and governance docs are source of
  truth unless the repository defines additional canonical files.
- Do not leave resolved architecture decisions only in planning docs or
  closure notes.
- When the repository uses `docs/modules/`, keep them implementation-facing and
  linked back to architecture instead of redefining runtime truth.
- When a project has an established visual system, reuse existing shared
  patterns before creating new component variants or page-local styles.
- When a project has no strong visual direction yet, establish one early and
  keep it consistent across surfaces.
- When a canonical screenshot, mockup, or approved screen image exists, treat
  it as a specification instead of loose inspiration.
- For screenshot-driven UX/UI work, close one surface at a time and require an
  explicit `95%` parity judgment before moving to dependent surfaces.
- When user notes modify a canonical visual, treat the visual plus those notes
  as the active merged spec.
- If user notes conflict with each other or with an approved interpretation,
  stop and ask for a decision before implementing.
- Do not silently lower visual fidelity by replacing needed image assets,
  illustrations, or textured backgrounds with generic gradients.
- Treat mobile, tablet, and desktop as distinct experience surfaces with
  different density, navigation, and input expectations.
- All repository artifacts must be written in English.
- AI communication with end users should follow the user's language.
- Never reference sibling repositories or `!template` paths from project docs.
- Keep root minimal. Project documentation belongs in `docs/`.
- Every meaningful change updates at least one relevant source-of-truth file:
  - `.codex/context/TASK_BOARD.md`
  - `.codex/context/PROJECT_STATE.md`
  - `.codex/context/LEARNING_JOURNAL.md` when a recurring pitfall is confirmed
  - `docs/planning/*`
  - project docs or ADRs when behavior, scope, or architecture changed
- Keep commits tiny, single-purpose, and reversible.
- Before creating a commit, run local quality gates proactively:
  - lint
  - typecheck
  - tests
  - stack-specific high-risk checks
- Do not create a commit when required quality gates fail, unless the user
  explicitly approves a temporary exception.
- Run relevant validation for changed scope, or explain why it could not run.
- Do not mark a task done without acceptance-criteria evidence.
- Do not mark a task done without validating `DEFINITION_OF_DONE.md`.
- Do not accept integrated runtime work without validating
  `INTEGRATION_CHECKLIST.md`.
- Do not ship placeholders, mock-only behavior, fake data, "for now" fixes, or
  temporary bypasses. Follow `NO_TEMPORARY_SOLUTIONS.md`.
- Deliver features as vertical slices across UI, logic, API, DB, validation,
  error handling, and tests.
- For AI-assisted, auth-sensitive, or money-impacting flows, include adversarial
  and fail-closed validation before completion.
- AI systems must be tested against prompt injection, data leakage, and
  unauthorized access before deployment.
- AI features must pass multi-step scenarios from `AI_TESTING_PROTOCOL.md`
  before completion.
- When a recurring environment or tooling pitfall is discovered, record it in
  `.codex/context/LEARNING_JOURNAL.md` in the same task.
- Before saying "nothing is planned" or "no tasks are queued", run a planning
  source-of-truth cross-check:
  - Tier 1: active canonical planning files
  - Tier 2: background or historical unchecked checklists, clearly labeled as
    non-active if they are not part of the canonical queue
- When active work is unclear in a medium or large project, use the function
  coverage ledger model in
  `docs/governance/function-coverage-ledger-standard.md` to turn module
  confidence gaps into explicit planning rows before inventing new features.
- Treat the function coverage ledger as an index of product confidence, not a
  replacement for tests, architecture docs, or the task board.
- If a project has an active coverage ledger, derive follow-up tasks in this
  order:
  - `V1_BLOCKER` or equivalent release blockers
  - `REQUIRES_IMPLEMENTATION_REVIEW`
  - `IMPLEMENTED_NEEDS_EVIDENCE` for `P0`
  - `IMPLEMENTED_NOT_VERIFIED` for `P0/P1`
  - `P1/P2` scope decisions or deferrals
- Do not convert every `PARTIAL` or evidence-missing ledger row into feature
  work. Plan verification first, then create a narrow fix only when proof or
  code inspection finds a real defect.
- Follow the default delivery loop:
  - analyze current state
  - select one priority mission objective or task
  - plan implementation
  - execute implementation
  - verify and test
  - self-review
  - update documentation and knowledge
  - repeat
- Follow `.agents/workflows/user-collaboration.md` when a task involves
  ambiguous intent, user-authored visual notes, blocker decisions, or a handoff
  between planning and execution.
- Follow `.agents/workflows/world-class-delivery.md` for substantial product,
  runtime, release, UX, security, or AI work.
- For substantial changes, define why the work matters, the smallest safe
  slice, the success signal, the main failure mode, and the rollback or recovery
  path.
- For deployable services or important journeys, use
  `docs/operations/service-reliability-and-observability.md` to define SLIs,
  SLOs, health checks, alert routes, and error-budget posture when appropriate.
- For auth, AI, money, secrets, permissions, integrations, or user-data work,
  use `docs/security/secure-development-lifecycle.md`.
- After launch or deploy, capture what was learned from smoke checks, incidents,
  metrics, or user feedback before declaring the loop complete.

## Agent Catalog

- Planner: `.agents/prompts/planner.md` or `.claude/agents/planner.agent.md`
- Product Docs: `.agents/prompts/product-docs.md` or
  `.claude/agents/product-docs.agent.md`
- Backend Builder: `.agents/prompts/backend-builder.md` or
  `.claude/agents/backend-builder.agent.md`
- Frontend Builder: `.agents/prompts/frontend-builder.md` or
  `.claude/agents/frontend-builder.agent.md`
- QA/Test: `.agents/prompts/qa-test.md` or
  `.claude/agents/qa-test.agent.md`
- Security: `.agents/prompts/security-auditor.md` or
  `.claude/agents/security-auditor.agent.md`
- DB/Migrations: `.agents/prompts/db-migrations.md` or
  `.claude/agents/db-migrations.agent.md`
- Ops/Release: `.agents/prompts/ops-release.md` or
  `.claude/agents/ops-release.agent.md`
- Code Review: `.agents/prompts/code-reviewer.md`
- Codex Documentation Agent: `.codex/agents/documentation-agent.md`
- Codex Planning Agent: `.codex/agents/planning-agent.md`
- Codex Execution Agent: `.codex/agents/execution-agent.md`
- Codex Review Agent: `.codex/agents/review-agent.md`
- Codex AI Red Team Agent: `.codex/agents/ai-red-team-agent.md`

## Trigger Intent

If the user sends a short execution nudge (`rob`, `dzialaj`, `start`, `go`,
`next`, `lecimy`):
1. Read `.agents/core/operating-system.md` and refresh `.agents/state/*`.
2. Read `docs/planning/mvp-next-commits.md` and `.codex/context/TASK_BOARD.md`.
3. Take the first `NOW` item that maps to a `READY` or `IN_PROGRESS` task.
4. If planning docs, board, and `.agents/state/next-steps.md` drift, sync them
   before implementation.
5. Refresh `.agents/state/active-mission.md` and define a mission block or
   continue the active mission block.
6. Execute the next coherent checkpoint or set of tightly related slices.
7. Run relevant checks and real journey proofs.
8. Update task, project state, planning files, module confidence, and
   `.agents/state/*`.
9. Return mission status, files changed, tests run, deployment impact, residual
   risk, and next checkpoint.

If a new execution wave or detailed implementation plan is published:
1. activate the first executable tasks in canonical queue files in the same
   turn
2. update `NOW` and `NEXT`
3. if useful for larger waves, also update `PIPELINE` and `GROUP QUEUE`
4. do not leave a new plan without an actionable canonical queue

## Workflow Contract

1. Product and architecture truth live in `docs/`.
2. Planning work translates truth into executable tasks and a small `NOW`
   queue.
3. Builder agents implement one scoped task at a time.
4. QA, Security, and Review agents validate before completion.
5. After validation, check for cleaner architecture or smaller follow-up tasks.
6. Refresh priorities and repeat with the next smallest valuable task.

All tasks must also respect the stage-based delivery workflow above:
- declare `Task Type`
- declare `Current Stage`
- declare `Deliverable For This Stage`
- keep output aligned to the active stage only

Documentation-governance rule:
- Use `.agents/workflows/documentation-governance.md` to decide whether new
  truth belongs in architecture, modules, planning, operations, or UX docs.
- Use `docs/governance/function-coverage-ledger-standard.md` when a release,
  handoff, incident, or stalled queue needs a module-by-module confidence map.
  Store active release ledgers under `docs/operations/` and derive executable
  tasks into `docs/planning/` plus `.codex/context/TASK_BOARD.md`.

## Subagent Contract (Codex)

- The active chat is the coordinator and remains accountable for task framing,
  integration, validation, source-of-truth updates, and final `DONE`.
- Delegate only independent or clearly bounded subtasks.
- Keep critical-path blocking work local.
- Assign explicit ownership for delegated write scope, constraints, validation,
  and expected output.
- Avoid overlapping file ownership between parallel workers.
- Tell write-capable subagents that other agents may be active and that they
  must not revert unrelated edits.
- Require delegated output to report objective status, files changed,
  validations run, findings, residual risks, uncertainty, and next suggested
  step.
- Treat delegated output as evidence, not approval.
- Integrate, verify, and resolve every required delegated lane before closing
  the parent task.
- Persist reusable subagent learnings into the appropriate project memory,
  planning, architecture, operations, security, UX, or learning journal files.
- Follow `.agents/workflows/subagent-orchestration.md`.
- Use `.agents/workflows/responsibility-lanes.md` to select, brief, and review
  lanes before broad work.

## UX/UI Contract

For UX/UI tasks, always include:
- design source reference (Figma link/node or approved snapshot)
- existing design-system pattern reused, or clear justification for a new
  shared pattern
- expected states (`loading`, `empty`, `error`, `success`)
- responsive checks (`desktop`, `tablet`, `mobile`)
- accessibility checks
- parity evidence in task or review notes
- evidence that the screen answers the key user questions quickly: what matters
  now, what is blocked, and what the next action is

Design-source policy:
- Primary source: Figma MCP for implementation context.
- Secondary source: Stitch MCP for ideation or draft exploration only.
- Stitch-only output cannot be the sole source of truth for final
  implementation unless the repository explicitly documents an approved
  exception workflow.
- For pixel-close implementation from screenshots, approved mockups, or
  canonical images, use `docs/ux/canonical-visual-implementation-workflow.md`
  and record the active spec, the mismatch list, and the parity judgment.
- Work through shared shell and layout dependencies before polishing route
  modules that depend on them.
- Capture a fresh screenshot after each meaningful surface slice and compare it
  to the active spec before opening a new visual lane.
- Use `docs/ux/evidence-driven-ux-review.md` for full-route clickthroughs,
  broad UX audits, or UI work that needs to turn screenshots into actionable
  implementation slices.
- Do not expose raw backend, provider, or validation errors directly to end
  users when a user-language recovery message and action can be provided.
- Keep feedback local to the action whenever possible: loading, error, and
  success states should appear where the user acted.
- If the repository has project UX docs, follow them. Otherwise record the
  design source directly in task notes or PR notes.
- If the repository has a documented design-system contract, agents must reuse
  existing shared patterns before introducing new visual variants.
- Record approved reusable UI patterns and verified UX learnings in
  `docs/ux/design-memory.md` when they should influence future work.
- Use the UX starter docs to keep direction explicit:
  - `docs/ux/visual-direction-brief.md` for product visual thesis
  - `docs/ux/ui-scorecard.md` for review quality scoring
  - `docs/ux/pattern-gallery.md` for screen-level reuse
  - `docs/ux/screen-quality-checklist.md` before calling a flow polished
  - `docs/ux/anti-patterns.md` to avoid recurring mistakes
  - `docs/ux/brand-personality-tokens.md` for consistent experience character
  - `docs/ux/canonical-visual-implementation-workflow.md` for pixel-close
    delivery from approved visuals
  - `docs/ux/background-and-decorative-asset-strategy.md` for image-rich
    decorative fidelity

## Deployment Contract

This template assumes VPS hosting with Coolify as the default deployment path.

Every deployable project should define:
- hosting target and topology in `.codex/context/PROJECT_STATE.md`
- deployment contract in `docs/operations/coolify-vps-deployment-contract.md`
- post-deploy smoke in `docs/operations/post-deploy-smoke.md`
- rollback procedure in `docs/operations/rollback-and-recovery.md`
- reliability and observability expectations in
  `docs/operations/service-reliability-and-observability.md`
- real env examples for every runtime surface
- health endpoints or equivalent readiness checks

If the project does not use Coolify, keep the same contract but document the
alternative deploy surface explicitly.

## Optional Deep-Dive Docs

When a repository grows beyond a small single-surface app, add:
- `docs/modules/README.md`
- `docs/modules/system-modules.md`
- `docs/modules/module-deep-dive-template.md`
- `docs/modules/module-doc-status-index.md`

These files help agents keep code ownership, routes, and test surfaces mapped
without overloading architecture docs.

## Template Usage Mode

This repository bootstrap is maintained in manual mode:
- start from this repository bootstrap package
- rename the project folder
- open it in Codex
- finalize project details through conversation and targeted file updates

## Pre-Commit Quality Gate

Use the validation commands recorded in `.codex/context/PROJECT_STATE.md` as the
required pre-commit contract.

## Template Sync: App Creation, Feedback, And Handoff

- Use `docs/governance/app-creation-playbook.md` and `.codex/templates/app-blueprint-template.md` before broad implementation of a new app, major module, dashboard, tool, website, game, or product surface.
- Use `docs/governance/user-feedback-loop.md` and `.codex/templates/user-feedback-item-template.md` when user feedback changes behavior, UX, visual direction, copy, priority, architecture, validation, or future screen decisions.
- For substantial or multi-session work, finish with a concise handoff packet from `.codex/templates/handoff-packet-template.md`.
