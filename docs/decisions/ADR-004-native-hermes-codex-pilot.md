# ADR-004: Native Hermes with Codex OAuth for the first agent

RF-RUNTIME-005A / BATCH-RUNTIME-005A accepts a narrow amendment:
the first supervised pilot uses stable Hermes 0.21.2's public
[quiet adapter](../architecture/hermes-supervised-quiet-v1.md).
Unreleased stream-json is no longer a pilot prerequisite. The six runtime gates
remain false; native tree ownership, effective private configuration and remaining
budgets/auth/tool boundaries are still unqualified. One Worker attempt, sealed
stdin, untrusted bounded output and independent review of exact dirty-byte evidence
are mandatory. No agent commit/push/deploy or hidden fallback is allowed.
The sole next atom is owner-present Codex OAuth plus minimal Blank Slate config
(RF-RUNTIME-005B), separately delegated; no live execution is authorized here.
Future local Ollama (gpt-oss or Mistral/Devstral) stays planned/disabled until
confirmed disk expansion and separate resource/quality qualification.
The original RF-RUNTIME-002 decision and its dated authority follow below.

Date: 2026-09-15
Status: accepted
Owner: Roost architecture owner
Decision version: 2 (RF-RUNTIME-005A amendment, 2026-09-16)
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
