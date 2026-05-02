# New Project Bootstrap

Use this checklist when initializing a new repository from this template.

## 1) Project Identity

- Rename the folder to the target project name.
- Make sure the new project does not inherit the template repository's `.git`
  directory. Start a fresh repository for the app instead.
- Fill `.codex/context/PROJECT_STATE.md` with:
  - product name
  - goal
  - current phase
  - exact stack
  - hosting target
  - deployment shape
- Update:
  - `docs/product/overview.md`
  - `docs/product/product.md`
  - `docs/product/mvp_scope.md`

## 2) Governance Baseline

- Confirm repository language rules in
  `docs/governance/language-policy.md`.
- Confirm docs placement rules in
  `docs/governance/repository-structure-policy.md`.
- Confirm delegation rules in
  `docs/governance/subagent-delegation-policy.md`.
- Tailor `docs/governance/working-agreements.md` to project reality.
- Keep AI/user communication in the user's language.

## 3) Architecture and Delivery Baseline

- Fill:
  - `docs/architecture/system-architecture.md`
  - `docs/architecture/tech-stack.md`
- Tailor `.agents/workflows/general.md` with:
  - actual stack
  - architecture rules
  - UI rules
  - deployment rules
  - validation rules
- Keep `.claude/` and `.codex/` files aligned with the same workflow contract.

## 4) Validation Baseline

- Write the real validation commands in `.codex/context/PROJECT_STATE.md`.
- Confirm `DEFINITION_OF_DONE.md`, `INTEGRATION_CHECKLIST.md`,
  `NO_TEMPORARY_SOLUTIONS.md`, `AI_TESTING_PROTOCOL.md`, and
  `DEPLOYMENT_GATE.md` match the project risk profile.
- Define the minimum merge bar:
  - lint
  - typecheck
  - unit tests
  - integration tests
  - smoke or E2E checks
  - stack-specific high-risk checks
- For AI features, define repeatable multi-turn test scenarios for memory,
  context stability, adversarial input, prompt injection, data leakage, and
  unauthorized access.
- Tailor `.githooks/pre-commit` if the stack needs additional local checks.
- Confirm the local git hook path once per clone:
  `git config core.hooksPath .githooks`

## 5) Planning Initialization

- Create first real tasks in `.codex/context/TASK_BOARD.md`.
- Fill:
  - `docs/planning/mvp-execution-plan.md`
  - `docs/planning/mvp-next-commits.md`
  - `docs/planning/open-decisions.md`
- Keep task scope small, testable, and reversible.
- Keep `NOW` short. Recommended maximum: 3 tasks.
- When a new detailed wave plan is created, activate the first executable tasks
  in canonical queue files in the same setup cycle.

## 6) Deployment Baseline

- Treat Coolify on VPS as the default deployment target unless the project says
  otherwise.
- Keep `DEPLOYMENT_GATE.md` as the release blocker list.
- Tailor:
  - `docs/operations/coolify-vps-deployment-contract.md`
  - `docs/operations/post-deploy-smoke.md`
  - `docs/operations/rollback-and-recovery.md`
- Define:
  - runtime services
  - ports
  - env files and secret ownership
  - persistent volumes
  - background jobs or workers
  - health endpoints
  - backup and restore expectations
- If the app is containerized, create the actual Dockerfiles and compose files
  in the repository and record their canonical paths in `PROJECT_STATE.md`.

## 7) UX/UI Baseline

- For UX-heavy work, tailor:
  - `docs/ux/ux-ui-mcp-collaboration.md`
  - `docs/ux/stitch-mcp-playbook.md`
  - `docs/ux/canonical-visual-implementation-workflow.md`
  - `docs/ux/background-and-decorative-asset-strategy.md`
- Confirm the approved design source policy:
  - Figma first for implementation context
  - Stitch optional for ideation only unless explicitly approved
- Require task-level evidence for:
  - states
  - responsiveness
  - accessibility
  - parity
- If the product depends on painterly or image-rich art direction, define the
  background and decorative asset strategy before implementation begins.

## 8) First Execution Cycle

- Pick one `NOW` task that maps to a `READY` task on the board.
- Plan the change.
- Implement the smallest useful slice.
- Run relevant validation.
- Review whether architecture, docs parity, deployment docs, or task breakdown
  should improve.
- Update task, state, and planning files in the same cycle.

## Definition of Ready

Project is ready when:
- project state is filled with real stack, hosting target, and validation
  commands
- product and architecture baseline docs are filled with real content
- first executable tasks exist in both planning docs and task board
- canonical queue is actionable, not only documented
- workflow and delegation rules are explicit
- deployment contract and smoke checklist exist
- Definition of Done, integration checklist, AI testing protocol, no-temporary
  solutions rule, and deployment gate are active
- the plan -> execute -> test -> review -> deploy-aware loop is operational
