# Agent Setup Blueprint

This optional document helps repositories that want a clearer map of how
different agent roles should collaborate.

## Recommended Agent Roles

### 1) Planner Agent
- Purpose: maintain canonical planning files and keep the execution queue
  actionable.
- Trigger: after docs, product, or architecture changes.
- Output: updated queue, sequencing notes, and next small executable tasks.

### 2) Product Docs Agent
- Purpose: convert requirement discussion into repository truth.
- Trigger: requirement change, scope decision, or policy clarification.
- Output: docs updates, acceptance criteria, open assumptions, and architecture
  or design-system change proposals when needed.

### 3) Build Agent (Backend)
- Purpose: implement backend, API, and runtime slices from plan.
- Trigger: approved executable task.
- Output: tiny scoped change, tests, and short implementation note.

### 4) Build Agent (Frontend/UX)
- Purpose: implement UI, responsive behavior, and interaction flows from plan.
- Trigger: approved UX or frontend task.
- Output: tiny scoped change, UI validation, parity note if relevant, and
  explicit reuse of existing shared patterns unless a new shared pattern was
  approved.
- The agent should also follow the project's visual direction brief, avoid
  documented UX anti-patterns, and record reusable visual learnings.

### 5) QA and Test Agent
- Purpose: add deterministic tests and practical evidence for changed flows.
- Trigger: after implementation or before risky refactor.
- Output: automated results, journey checks, and remaining gaps.

### 6) Security and Risk Agent
- Purpose: review auth, secrets, ownership, abuse controls, and risky logic.
- Trigger: security-sensitive change or pre-merge review for risky scope.
- Output: severity-ranked findings and minimal safe fix plan.

### 7) Database and Migration Agent
- Purpose: evolve schema and migrations with rollback awareness.
- Trigger: data-model task.
- Output: schema patch, integrity notes, and follow-up tasks.

### 8) Ops and Release Agent
- Purpose: own CI, deploy, smoke, rollback, and operational readiness.
- Trigger: deployment or release-readiness task.
- Output: ops changes, validation evidence, and next release task.

### 9) Code Review Agent
- Purpose: perform findings-first review before completion.
- Trigger: after implementation batch or before merge.
- Output: findings, test gaps, open questions, and approval recommendation.

## Practical Workflow

Every role follows `docs/governance/autonomous-engineering-loop.md`.

1. Docs or architecture change updates the planning baseline.
2. Planner Agent runs the process self-audit, confirms operation mode, and
   refreshes canonical queue files.
3. Builder agent takes exactly one executable `NOW` task.
4. QA, Security, or Review agents validate as needed, including seven-step loop
   evidence.
5. Planner Agent closes the task and refreshes the next queue slice.

## Guardrails

- No coding without an executable plan item.
- No iteration without process self-audit, operation mode, and one bounded
  mission objective.
- No silent architecture changes. Propose them first.
- Do not leave resolved architecture truth only in planning files.
- No large mixed commits.
- Every completed task updates canonical planning state.
- New detailed plans must activate `NOW` and `NEXT` in the same turn.
