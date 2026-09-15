# ADR-004: Native Hermes with Codex OAuth for the first agent

Date: 2026-09-15
Status: accepted
Owner: Roost architecture owner
Decision version: 1
Scope: RF-RUNTIME-002 owner handoff; architecture and blocked adapter implementation
Source reference: `owner-handoff.rf-runtime-002.hermes-first.v1`

## Decision

The first-agent target is **Roost → Windows Local Worker → native Hermes Agent
→ Codex model through Codex OAuth/subscription** in one canonical application
folder. Hermes runs its own agent loop; the optional Hermes Codex App Server
runtime is not this decision. Direct Codex CLI remains an alternative provider,
with no automatic fallback. Herdr is optional observability UX, not a dependency.

Roost retains all task, hierarchy, Ready, Decision, permission, context, audit,
review and release authority. Worker retains exclusive managed access to the
canonical clone, one writer, lease, input sealing, scope, process ownership and
cleanup. Hermes supplies inference/tools inside the separately proven boundary;
it has no independent company memory, tasks, schedule, delegation or scope rights.
Only the Worker-owned allowlisted Roost MCP configuration may be attached.
Model authentication stays in the approved private instance, never prompts or
repository files; OAuth support is not proof of account entitlement or quota.

Windows Sandbox, Hyper-V and disposable VMs are **rejected as pilot prerequisites**
because of disproportionate complexity. Their qualification route is **DEFERRED**,
including the other-host recommendation from RF023. This does not remove the
workspace boundary, one-writer, secret isolation, safe process cleanup, resource
budgets, Ready/review or release gates. No existing host resource may be modified
or Docker/WSL lifecycle action performed as a consequence of this decision.

## Supersession and implementation

This replaces ADR-001's direct App Server first-provider choice and ADR-003's
associated qualification direction; native Windows and retained authority/safety
clauses remain. ADR-002's model-auth route is narrowly extended to the owner's
chosen official Hermes Codex OAuth provider, subject to private credential and
compatibility proof. The RF-RUNTIME-001 recommendation is resolved in favor of
Hermes. Earlier decisions and evidence remain dated records, not current ordering.

[Hermes CLI launch contract v1](../architecture/hermes-cli-launch-v1.md) records
the public one-shot/structured interface and the implemented fail-closed adapter.
The registry remains v5 with requiredPilotProvider=hermes_codex, now aligned with
the accepted target. Source pins remain historical until exact compatibility
proof; no automatic update, new installation or live execution is authorized.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; pilotExecutionAuthorized=false;
pilotExecutionStarted=false. Architecture acceptance is not a safeguard exception,
installation grant, OAuth operation, activation or independent review.
