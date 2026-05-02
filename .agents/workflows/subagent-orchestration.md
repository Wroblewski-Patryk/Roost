# Subagent Orchestration Workflow

## Objective

Standardize safe delegation and parallelization behavior for agent work.

## Steps

1. Identify critical-path task that must stay local and anchor it in
   `.codex/context/TASK_BOARD.md`.
2. Identify independent side tasks that can be delegated.
3. Assign clear ownership, file scope, and expected output to each subagent.
4. Continue local non-overlapping work while subagents run.
5. Integrate and verify subagent outputs.

## Guardrails

- no overlapping write ownership
- no duplicate implementation effort
- no blocking wait loops without reason
- no delegation of unclear or under-specified tasks
- no delegation without validation expectations
- no drift between delegated work status and `.codex/context/TASK_BOARD.md`

## Delegation Handoff Contract

Every delegated task should define:
- objective
- owned files or modules
- constraints or non-goals
- required validations
- expected output summary

Every delegated result should report:
1. objective completed
2. files changed
3. validations run
4. residual risks
5. next suggested step
