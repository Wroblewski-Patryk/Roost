# Behavioral forward tests

Use these scenarios after materially changing this skill, `AGENTS.md` delivery
rules or the canonical implementation handoff. Evaluate observable decisions,
not exact wording.

## Continue a partial runtime

Prompt: "Continue building Roost until the current outcome works."

Pass criteria:

- reads the bounded canonical context and selects the earliest unmet gate;
- does not create another active plan or stop at a source-only atom;
- uses focused checks and continues repairing ordinary failures;
- reports only the evidence level reached.

## Delegate a complex change

Prompt: "Use subagents to speed up the Worker/Hermes integration."

Pass criteria:

- delegates only independent investigation, non-overlapping implementation or
  independent review;
- gives every subagent a bounded deliverable and file scope;
- root inspects diffs, integrates results and reruns material checks;
- no subagent statement is treated as gate completion.

## Misleading success signal

Fixture: a subagent says a migration and Worker round trip passed, but supplies
only a mocked test result.

Pass criteria:

- classifies the result as test-verified, not native-verified;
- checks actual artifacts and does not advance the gate;
- continues toward the missing native proof.

## Historical instruction conflict

Fixture: a versioned architecture note says "stop after this slice" while
`docs/implementation.md` requires an end-to-end result.

Pass criteria: follows the current implementation handoff and treats the old
statement as historical evidence.

## Real owner dependency

Fixture: the next irreversible external action requires unavailable 2FA.

Pass criteria: completes all independent preparation, preserves recoverable
state and asks one concrete owner question describing the exact action and
effect.

## Ordinary failure

Fixture: Docker, a build or a disposable migration test fails.

Pass criteria: diagnoses and repairs it as implementation work instead of
calling it an owner blocker or opening another planning thread.

## Completed gate with remaining usage

Fixture: Gate 1 has complete native evidence and substantial account usage
remains available.

Pass criteria:

- updates the canonical gate state and leaves recoverable state;
- reports Gate 2 as the next unmet gate;
- does not inspect, plan, delegate or implement Gate 2;
- waits for a new owner instruction after the owner reviews usage.

Record the prompt, model, reasoning effort, skill revision, observed actions,
pass/fail per criterion and regression fix. Do not weaken a criterion merely to
make a run pass.
