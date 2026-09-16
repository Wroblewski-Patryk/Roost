# ADR-004: Native Hermes with Codex OAuth for the first agent

RF-RUNTIME-005B10 source evidence: [native tool boundary](../architecture/hermes-native-tool-boundary-v1.md)
selects roost-hermes-native-audited-coding-v1. Source qualification is complete;
implementation is **BLOCKED on one owner decision** accepting the stated native
file/shell residual risk. This is a proposal, not an accepted waiver or version 7.
Version 6, current runtime/private configuration and all six false flags remain.
The only proposed successor is B11 implementation after that explicit acceptance.

RF-RUNTIME-005B9 owner amendment (version 6): accept the pinned public CLI's
unavailable physical model/tool/retry counters and hard token/cost caps as residual
pilot risk. Use small coding tasks, 24 logical turns, api_max_retries 2, an original
Worker deadline at most 900 seconds with native Job cleanup and no automatic
whole-task restart. Unknown accounting stays null; maxOutputTokens is intent,
exit 0 only a review candidate. This supersedes B8's mandatory pre-dispatch budget
boundary and its proposed source-only B9 without changing B8's source findings.
The [implemented practical policy](../architecture/hermes-practical-attempt-budget-v1.md)
adds Ready-bound private v3 profile/receipts. No fork/private entrypoint/proxy/new
framework or isolation system is introduced. No real launch, model, tool or pilot
activation is authorized; B4/B7 risks and all six false gates remain. Historical
B8 evidence follows below.

RF-RUNTIME-005B8 source evidence: [attempt/budget qualification](../architecture/hermes-attempt-budget-contract-v1.md)
selects a finite coding-small-v1 candidate but is **BLOCKED** by the absence of a
supported Worker pre-dispatch budget boundary on the selected quiet CLI. One
attempt may contain multiple model/tool exchanges; public max-turns/run-budget do
not prove hard call/token caps. This is qualification evidence, not a new owner
risk waiver or ADR version. Version 5, same-owner attestation, all six false gates
and the real-launch denial remain unchanged. B9 is proposed source-only work.

RF-RUNTIME-005B7 owner amendment: accept local bundled-skills synchronization into
the private Hermes profile and local banner repository/tag/skill-index reads,
including short local git processes. Network update checks remain disabled;
neither effect authorizes sending task/code/private-path/company data. Standard
public CLI, exact packet-derived route/reasoning/task tools, safe-mode environment,
empty modern/legacy fallback and no worktree are implemented in the
[startup contract](../architecture/hermes-minimal-startup-contract-v1.md).
Only a fresh private Ready/input-bound startup receipt removes the local config
blocker; it is synthetic/source-backed evidence, not a live-runtime or execution
grant. No fork/private entrypoint/VM/new isolation system is introduced. B4's
attestation authority and accepted residual risks remain. All six gates are false.

Source evidence RF-RUNTIME-005B6: [public minimal startup contract](../architecture/hermes-minimal-startup-contract-v1.md)
is NOT_SUPPORTED for strict minimal startup on this pin. Standard chat retains
automatic skills/banner startup work despite its quiet single-query interface.
This records a concrete source limitation, not a version 4 amendment, new
credential-isolation requirement or execution grant. B4 residual risks remain.

Implementation evidence RF-RUNTIME-005B5: [effective-config qualification](../architecture/hermes-effective-config-qualification-v1.md)
is BLOCKED after a partial exact-pin loader observation in synthetic storage.
Startup/tool/rotation consumers remain unqualified; the negative diagnostic receipt
is not Ready authority. This does not amend version 4's owner-attestation decision
or residual risks, change the pin, or activate any execution gate.

Implementation update RF-RUNTIME-005C: [native owned-job v1](../architecture/windows-owned-process-job-v1.md)
now has actual fixture proof for process cleanup, including controller loss. This
implements the retained boundary without changing the first-provider decision or
requiring a VM. Native job evidence does not qualify model/auth/tool containment;
all six runtime flags remain false.

RF-RUNTIME-005A / BATCH-RUNTIME-005A accepts a narrow amendment:
the first supervised pilot uses stable Hermes 0.21.2's public
[quiet adapter](../architecture/hermes-supervised-quiet-v1.md).
Unreleased stream-json is no longer a pilot prerequisite. The six runtime gates
remain false; native tree ownership, effective private configuration and remaining
budgets/auth/tool boundaries are still unqualified. One Worker attempt, sealed
stdin, untrusted bounded output and independent review of exact dirty-byte evidence
are mandatory. No agent commit/push/deploy or hidden fallback is allowed.
RF-RUNTIME-005B3 accepts [same-owner profile v1](../architecture/hermes-same-owner-profile-v1.md):
Hermes may reuse the same owner's Codex CLI auth. No separate token store or
Restricted Token/ACL credential sandbox is required. This supersedes the B2
external-guard recommendation, rejected by the owner as disproportionate. B1/B2
remain evidence about full profile-only isolation, which is no longer a pilot
requirement. Account/provider/model changes, rotation/fallback, hidden interactive
reauthorization and secrets in Roost/evidence remain forbidden. A secret-free
private profile and synthetic admission binding are prepared. RF-RUNTIME-005B4
accepts the owner's confirmation of the currently signed-in local Codex account
as authoritative for this single-owner pilot. No stable account ID or token-derived
fingerprint is required. A private versioned attestation expires within 90 days
and is rechecked for revocation/change at Ready sealing and pre-spawn. Renewal is
explicit after expiry, withdrawal or reported account/session/config changes.
Installed CLI help does not guarantee secret-free status output, so no status
command was run. Owner-attestation-only qualification is explicitly allowed;
silent account switches and unreported session loss may remain undetected.
Hermes stays unmodified at 0.21.2; no global execution gate changes.
Future local Ollama (gpt-oss or Mistral/Devstral) stays planned/disabled until
confirmed disk expansion and separate resource/quality qualification.
The original RF-RUNTIME-002 decision and its dated authority follow below.

Date: 2026-09-15
Status: accepted
Owner: Roost architecture owner
Decision version: 6 (RF-RUNTIME-005B9 practical attempt-budget amendment, 2026-09-16)
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
Model authentication uses the approved same-owner local source, never prompts or
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
