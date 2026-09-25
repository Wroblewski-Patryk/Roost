# First supervised agent runtime decision packet v1

Resolved by RF-RUNTIME-002 / [ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md):
the owner selected native Hermes with Codex OAuth as the first runtime and direct
CLI as an alternative. The v1 proposal and its pending decision wording below
are historical. No safeguard exception or live admission follows from the choice.

RF-RUNTIME-001, 2026-09-15. Packet version: **1**.
Status: **PROPOSED — OWNER DECISION REQUIRED**.
Verdict: **DIRECT-CLI-PILOT-RECOMMENDED; EXECUTION-NOT-ADMITTED**.
Repository evidence baseline: a4a060f543dcc9f915be1f1e2084e30f30c9b8b6.

Recommend the existing Local Worker → native Codex CLI path as the shortest
first supervised, non-critical, local-change experiment. This is a recommendation
about implementation effort, not a claim that it runs under current admission.
Owner acceptance must explicitly distinguish this limited experiment from the
accepted direct App Server target. Hermes and Herdr can complement that path;
neither is a prerequisite or an alternative source of task authority.

[RF023](direct-codex-disposable-windows-preflight-v1.md) blocked an additional
disposable Windows qualification boundary. It did not block Roost product
development or establish that native Codex cannot work. Its proposed other-host
follow-up is specific to that qualification route, not a universal first-agent
dependency. Its observations remain valid dated evidence; no result is relabelled.

The Codex native command sandbox is distinct from Microsoft's Windows Sandbox
product. The proposed experiment needs no VM, Windows Sandbox or Hyper-V. It
still needs a deliberately selected and verified native Codex permission mode;
“without Windows Sandbox” must never mean danger-full-access or no protections.
No current host sandbox readiness, login, model entitlement or production state
was inspected in this task.

## 1. Ownership and complementary roles

| Component | Proposed first-pilot role | Authority that stays elsewhere |
| --- | --- | --- |
| Roost | Sole operational truth for queue, hierarchy, task scope, procedures, Ready, Decisions, permissions, context, audit, independent review and release gates. | Provider sessions cannot approve or advance work. Git remains technical source truth. |
| Local Worker | Sole managed entry to the application's canonical clone; claim/lease, one writer, sealed input, executable/policy selection, process lifetime and results. | Cannot invent tasks, relax Decisions or release code. A lock does not exclude unrelated editors; the owner must prevent concurrent manual writers during the experiment. |
| Codex CLI | One ephemeral invocation with the accepted task, model/effort and workspace-write policy, producing a local uncommitted change and report. | No commit, push, deploy, host maintenance, independent retry, queue or release authority. |
| Hermes, optional later | Additional agent/runtime using scoped Roost MCP through the existing Worker broker; potentially different specialist tools or interface. | No second authoritative memory, task board, scheduler, hierarchy, delegation or canonical-clone launcher. |
| Herdr, optional later | Local terminal/status layer for operator visibility across permitted terminals. | No task admission, Ready transition, approval keystrokes, retries, restart/resume or writer coordination on Roost's behalf. |

Worker exclusivity here is the managed execution topology. It is not a new claim
that Windows prevents the owner or unrelated tools from opening the clone.
Reuse Roost's existing records and APIs, not repository-local coordination files.

## 2. Current primary-source evidence

All sources below were opened on **2026-09-15**. These are current documentation
observations, not pinned local-binary compatibility tests. No installer, release
archive, executable or source checkout was downloaded. No instructions shown in
upstream installation examples were executed. OpenAI documentation URLs under
developers.openai.com redirected to the official learn.chatgpt.com pages below.

| Ref | Opened primary source | Supported fact and limit |
| --- | --- | --- |
| U01 | [OpenAI non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) | `codex exec` is intended for scripted workflows; `--json` supplies JSONL events, `--ephemeral` avoids session rollout persistence and explicit workspace-write permits edits. Current docs also describe ignoring user config; availability and full discovery behavior of those flags in the installed binary remain untested. No execution-wide hard token/cost cap was established by this page. |
| U02 | [OpenAI Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox) | Native Windows is supported without WSL/VM. Elevated mode uses dedicated lower-privilege users, filesystem permissions, firewall/local policy setup; unelevated mode uses a restricted user token and weaker environment-level offline controls. Administrator-approved setup is a prerequisite for the recommended mode. This does not attest the existing host or authorize setup/fallback. |
| U03 | [OpenAI authentication](https://learn.chatgpt.com/docs/auth) | Login can be cached in a local file or OS credential store and refreshed during use. Authentication storage is a separate concern from ephemeral session output. No login/token was read or changed and no account entitlement was verified here. |
| U04 | [NousResearch Hermes repository README](https://github.com/NousResearch/hermes-agent) | Upstream documents native Windows CLI/gateway/TUI/tools without WSL. Its Windows setup uses Python and supporting tools including Git Bash. This is product support evidence, not validation of Roost's historical installed pin. |
| U05 | [Hermes model providers](https://hermes-agent.nousresearch.com/docs/integrations/providers) | Hermes documents a ChatGPT/Codex subscription device-OAuth provider, its own credential storage and optional CLI credential import; this provider does not require Codex CLI. The page explicitly leaves eligible-plan/quota consumption semantics undocumented. Do not promise included quota, free usage or entitlement from successful OAuth. Credential import is not proposed. |
| U06 | [Hermes optional Codex App Server runtime](https://hermes-agent.nousresearch.com/docs/user-guide/features/codex-app-server-runtime) | Separate opt-in mode hands tool execution to Codex App Server; Hermes retains session/UI functions and callback tools. Plugin/config migration and goal/kanban continuation are described. This is distinct from U05 and not a clean Worker transport or Windows containment attestation. |
| U07 | [Hermes MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) | MCP tools can be filtered with exact include lists; prompts/resources utilities can be disabled. Tools are discovered at startup and can change dynamically. Filtering MCP registrations alone does not isolate Hermes native tools or enforce Roost authority. |
| U08 | [Herdr Windows support](https://herdr.dev/docs/windows-beta/) and [installation](https://herdr.dev/docs/install/) | Native Windows is described as generally available, using ConPTY; stable Windows x64 packages include an app-local ConPTY runtime. Windows support is not parity with every Unix integration. No local availability was checked. |
| U09 | [Herdr agents](https://herdr.dev/docs/agents/) | Codex and Hermes lifecycle status uses screen-manifest detection; session integrations are separate. Displayed idle/working/blocked is useful operator evidence, not Roost completion or a security boundary. |
| U10 | [Herdr integrations](https://herdr.dev/docs/integrations/) | Integrations modify provider hooks/configuration and can enable native-session restoration. General documentation describes Hermes integration, while U08's Windows installer list does not include Hermes: exact Windows Hermes hook support remains unverified. Status detection does not depend on resolving that gap. |
| U11 | [Herdr agent automation](https://herdr.dev/docs/agent-automation/) | Start/prompt/wait/read primitives exist for Codex and Hermes. Waits have no default timeout and do not track individual turns; timeout does not prove no prompt was submitted. Blind retry and interpreting Done as task success would violate Roost's attempt/result contract. |

Adoption implications are our assessment of these sources, not upstream claims
of Roost compatibility. Current docs neither invalidate older pinned-source
findings nor qualify a newly downloaded version. No new version is selected.

## 3. Repository findings and concrete inconsistencies

Links below identify the files; named symbols remain the stable inspection points.
No runtime test was run to promote static findings into end-to-end proof.

| Ref | Existing mechanism / mismatch | Consequence for the first pilot |
| --- | --- | --- |
| L01 | [ADR-001](../decisions/ADR-001-direct-codex-app-server-pilot.md) explicitly targets direct **App Server**, with [ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md) selecting native Windows. Both deliberately preserve registry v5. | Direct CLI is not already accepted as the replacement pilot transport. Approve a bounded CLI milestone while retaining the App Server/autonomy target; do not silently reinterpret either ADR. |
| L02 | [Registry](../../src/modules/agent-runtime/execution-providers.json) has requiredPilotProvider=hermes_codex; [readiness route](../../src/modules/agent-runtime/agent-runtime.routes.ts) also hardcodes it and prove_hermes_read_only_compatibility. | Two executable projections retain the old dependency despite the new architecture. Reconcile both, UI/tests and documentation after decision; changing only JSON leaves misleading readiness. |
| L03 | [providerAdmissionReason/projectProvider](../../scripts/lib/agent-host-provider-contract.cjs) always deny: direct gives host_lifecycle_isolation_unproven; Hermes gives hermes_compatibility_unproven and its projection adds lifecycle/native-tool/budget/stop blockers. [host protocol](../../src/modules/agent-runtime/host-protocol.ts) uses this denial. | Deliberate protection, not a one-line bug to delete. API and Worker need the same narrowly evidenced admission rule; caller metadata, a flag or owner-approved task text cannot substitute. |
| L04 | [Worker execute/runHost](../../scripts/roost-codex-agent-host.mjs) already seals/consumes input, checks Ready/context, lease, duration, path/origin and task branch, then spawns one CLI process. [codexExecutionArgs](../../scripts/lib/agent-host-model-policy.mjs) builds exec/ephemeral/json/workspace-write plus exact model/effort. | Reuse this path. No App Server schema generator or Hermes transport is required to specify its existing JSONL contract. Exact installed CLI event/flag compatibility still needs evidence. |
| L05 | [createCodexOutputBudget](../../scripts/lib/agent-host-output-budget.mjs) unconditionally rejects unsupported hard output-token enforcement before spawn, even in supervised mode. | A second independent blocker remains after provider selection. A post-turn usage counter, byte limit, wall clock or subscription quota is not a hard token/cost cap. |
| L06 | Worker's safeChildEnvironment copies the parent environment and removes five Roost/CompanyCore fields; codexCommand defaults to a PATH-resolved name. CLI args do not independently seal native Windows implementation, user config, hooks or integrations. | Existing sanitization is useful but not a minimal environment or exact executable/configuration admission. Prevent inherited release/production credentials and accidental tools; verify official login access without copying secrets. |
| L07 | [terminateWindowsProcessTree](../../scripts/lib/agent-host-execution-lease.mjs) uses bounded taskkill while the root is live and returns when it already exited. Worker finally also conditions termination on a live root. | There is no proved owned-descendant closure after normal root exit, breakaway or controller death. Human supervision and root exit 0 cannot prove cleanup; implement/prove ownership and stop before claiming it. No global process kill. |
| L08 | Worker records resultRevision as HEAD, branch and clean/dirty; [completion API](../../src/modules/agent-runtime/agent-runtime.routes.ts) accepts dirty results. [Typed handoff](typed-work-handoff.md) explicitly attests recorded material, not independent Git verification. | No new commit is needed to report an uncommitted pilot result. But HEAD plus dirty flag/path list does not bind the actual changed bytes; independent review needs a bounded diff/content seal and a freshness check. |
| L09 | Worker's normal runHost loop can claim again after completion; [single-task checks](../../scripts/lib/agent-host-single-task.mjs) require a pre-existing deterministic task branch but never create/switch it. | Add single-use pilot eligibility and stop claiming after its one attempt. Prepare the accepted branch separately before admission in the same canonical clone. |
| L10 | [Product description](../product/product.md) describes executable owner flows; [runtime docs](local-codex-agent-runtime.md) later explain the blockers. Active planning previously said no architecture decision blocks development. | Distinguish implemented surfaces from admitted execution. Ordinary development remains possible; first native writing needs this explicit decision and missing controls. |

Other retained controls include bounded/redacted runner diagnostics, one logical
turn guard, server-derived protocol admission, current task/risk/procedure pins,
one machine writer slot and reconciliation after uncertain stop. Existing
synthetic tests are useful starting points, not fresh live proof. Test injections
such as providerAdmissionForTest or createObservedOutputBudget must never become
configuration switches or a pilot launcher bypass.

## 4. Options and recommendation

| Option | Benefit / reuse | Cost / unresolved risk | Recommendation |
| --- | --- | --- | --- |
| A — Direct Codex CLI first | Existing Worker, JSONL handling, official native execution and login; smallest number of adapters for one local change. | Requires owner-approved CLI milestone, admission/budget decisions, pinned policy, process closure and dirty-result review. Non-interactive CLI is not per-command human approval. | Recommended conditional first milestone, not ready now. |
| B — Hermes agent through Roost MCP, optionally Codex OAuth | Reuse maintained agent/tool loop and MCP client; can add specialist capabilities without replacing Roost. | Extra runtime, native tools, session/auth/config effects and quota uncertainty; existing broker is only a narrow read surface. Codex OAuth does not imply Codex sandbox or CLI execution. | Complementary later provider. Do not require Hermes or its App Server mode for A. |
| C — Herdr local observability | Reuse terminals, status detection and navigation instead of building a terminal multiplexer. | Persistent processes, restore hooks, input automation and heuristic statuses require containment by Worker policy; one-shot JSONL runs may offer little rich TUI status. | Optional later operator UX; not a provider or substitute for A/B. |

Retaining the accepted App Server-only qualification route is also a valid owner
response if the experiment's residual risks are unacceptable. It costs more
qualification work but avoids creating a limited exception. C cannot solve A's
admission and B adds an unnecessary dependency for the first coding task.

Adopt maintained Hermes MCP filtering, tool adapters and bounded transient
conversation handling only where a later Roost task needs them. Reuse the existing
Worker broker for identity/lease/context checks rather than a second credential
proxy. Reject autonomous Hermes cron/kanban/goals, durable company memory or
delegation as competing authority; any future proposals must enter native Roost
commands. Disable unneeded native tools and changing MCP surfaces at admission.
MCP alone gives no right to write the canonical clone.

Adopt Herdr terminal/status presentation where useful; keep the Roost execution
ID and Worker reports authoritative. Do not adopt session restore, terminal
keystroke approval, autonomous prompt dispatch or automatic retry for a Roost
attempt. If it later hosts a Worker terminal, it must not restart/resume that
Worker or its Codex child. Its raw terminal controls cannot be granted to an
agent as an alternate launch path. Configuration and installation need separate
review; no custom terminal emulator or second scheduler is proposed.

## 5. Minimum pilot versus full autonomy

The proposed pilot is one owner-present, non-critical task in one separately
approved application (not Roost self-development), on the existing Windows host
and canonical clone. Prefer a small text-only change with existing local checks,
no dependencies, external integrations, production data or release credentials.
Ready, current role/risk/procedure evidence, lease, one writer, expiry, audit and
independent reviewer are required. No retry, continuation, second claim, commit,
push, deploy or host maintenance belongs to that attempt. Owner presence means
monitoring and a tested stop path, not a claim of reviewing commands before they
execute. Blocked command requests must fail the attempt rather than escalate.

| Must be resolved before this experiment | Can remain a later autonomy requirement |
| --- | --- |
| Exact task/host/application/branch/base and one-use authority; API/Worker agreement; current Ready/risk/Decision seals; stop/reconcile and preserved unrelated work. | Scheduling many tasks, autonomous delegation, medium/high-risk delivery, unattended recovery and production releases. |
| Selected official executable and supported argv/events; deliberately bounded config/env/integrations; existing native sandbox readiness with no implicit setup; minimal official model-auth channel. | Full direct App Server schema/build qualification. RF016–023 requirements remain binding on their own route, not silently repurposed as CLI JSONL requirements. |
| Effective selected command FS/network protections and no release/host-control authority; fail on required setup or policy drift. Model-service egress is separately allowed; this is not the offline schema probe. | General containment claims across arbitrary agent/provider tools and all workloads. No experimental receipt qualifies these. |
| Finite time, one attempt, bounded captured bytes/files, safe process stop; honest token/cost accounting and an explicit decision about missing hard caps. | Unattended hard token/cost enforcement remains mandatory; a pilot exception is not capability proof. |
| Immutable uncommitted change evidence, independent review of the exact bytes, no automatic task Done or release. | Main protection, PR/merge/release and rollback certification before any future release. |

Under today's accepted contracts, an ordinary task approval cannot waive L03 or
L05. [accepted requirements](../product/requirements.md) RF-HOST-010 retains
time/token/cost/attempt limits; RF-SEC-007 requires a fresh narrow expiring owner
exception for disabling a key gate and Security review for safeguard changes.
[Host lifecycle safety](../operations/host-lifecycle-safety.md) still denies
uncontained execution. This packet neither grants an exception nor weakens those
requirements. A new proposal must enumerate each retained control, exact missing
guarantee, compensating measure, expiry and independent acceptance.

In particular, accepting one bounded CLI experiment may require explicit owner
acceptance of unproved aggregate token/cost enforcement and residual isolation
limits after native-mode verification. It must not report those controls PASS.
The owner can instead require hard enforcement and keep the pilot blocked.
Never silently replace hard maxOutputTokens with observed final usage or claim a
finite monetary overshoot bound without evidence. No fixed resource numbers or
selected model are invented here: exact limits must come from the accepted task
and measured host/runner envelope before the single-use grant.

No ordinary task or general exception may authorize Docker/WSL or other host
lifecycle actions. No native sandbox setup/change is implied. If the selected
existing mode cannot meet the explicitly accepted experiment boundary, stop and
return the unmet requirement; do not install, use full access or auto-fallback.

## 6. Smallest conditional implementation sequence

This is a dependency sequence for review, not dispatched tasks or an execution
queue. Each row must finish with its own scoped authorization and evidence;
stop at an unmet prerequisite. No row after the decision has started.

| Order | Atomic deliverable | Exit evidence |
| --- | --- | --- |
| 1 | Owner decision on packet v1: accept A as a limited CLI milestone, retain B/C optional, and decide whether a separate bounded exception proposal is acceptable for L03/L05. | Explicit accepted/rejected/deferred variant, affected ADR/activation/host-budget clauses, non-waivable controls and review requirements. Choice alone grants no live run. |
| 2 | Reconcile provider/readiness documentation and projections after the decision. | Registry, API readiness, UI/messages and static guards agree on CLI experiment versus App Server target; all execution gates still false. Preserve historical qualification evidence and compatibility/version rules. |
| 3 | Define and evidence the exact native CLI experiment envelope on the current host, using bounded authorized inspection. | Executable/config/event contract, selected already-ready native mode, minimal environment/login references, workload reserve, finite resource limits, residual-risk register and independently reviewed exception terms if applicable. No secret extraction or implicit setup; missing evidence stops progression. |
| 4 | Implement the narrowly scoped pilot admission/lifecycle path in existing API/Worker boundaries. | Server-bound single-use task/attempt/host/policy/expiry, shared admission checks, one claim, finite collectors, process ownership/stop including normal root exit and controller failure; no test override or global bypass. Budget exception, if approved, is separately typed and never relabelled hard enforcement. |
| 5 | Bind the uncommitted result to independent review. | Extend existing result/evidence contract with bounded changed-byte/diff digest, before baseline, unchanged HEAD/branch and current-byte verification; detect unrelated changes. No commit required, no secret/raw-log artifacts, no new evidence service. |
| 6 | Run focused synthetic end-to-end and fault validation, then independent safeguard review. | Ready → claim → one fake CLI → report → independent review, with cancellation/expiry/context drift/crash/second-claim/extra-tool/dirty-result drift/reviewer rejection cases. Denials for all non-pilot work, no release authority and API/Worker compatibility remain proved. Separate approval is required for any rollout of these code changes. |
| 7 | Obtain a fresh exact one-attempt live grant after compatible reviewed API/Worker versions are available, then run one non-critical native task. | Roost task → Ready and owner grant → Worker claim → one codex exec → uncommitted canonical-clone change → bounded report → independent exact-result review. Stop claims after attempt, prove process closure, return to disabled/observe; no commit/push/deploy. Failure retains evidence and reconciliation, never auto-retries. |

Before order 7, the owner/operator must have selected the private application
reference, prepared its deterministic task branch in the canonical clone and
provided the required scoped Worker credential through existing private setup.
Neither this bootstrap task nor a Codex prompt performs those preparations on
another application. Readiness requires the reviewed code actually available on
both API and Worker; changing files here is not deployment or live readiness.

Acceptance of the live experiment means its explicit local-change objective,
allowed diff and checks passed and an independent principal accepted that exact
result. It does not mean autonomous delivery, an accepted App Server adapter,
complete billing attribution or a production release. Results stay in existing
Roost execution/review/evidence records; no provider-owned task state is imported.

## 7. Decision request, verification and closed gates

Exactly one recommended next atomic task: **RF-RUNTIME-002 — owner decision on
first-agent runtime packet v1 and the admissible scope of a supervised CLI
experiment.** Select A (recommended, with explicit limitations and separate
evidence/exception approval), retain the App Server-only route, or defer. Record
the decision and downstream contract impact; do not install, activate or run a
pilot as part of that decision. RF-RUNTIME-002 was not started.

ownerDecisionAccepted=false; exceptionApproved=false; implementationReady=false;
executionSupported=false; pilotReady=false; liveAdmissionAllowed=false;
pilotExecutionAuthorized=false; pilotExecutionStarted=false.

RF-RUNTIME-001 changes this proposed packet, traceability and active planning
only. ADRs, qualification packets, runtime registry, executable code, existing
security gates and production configuration are unchanged. Verification passed:
document links/privacy/size/gate checks (18 local links, 12 primary-source links),
both existing qualification/CAS documentation validators and git diff --check.
These checks do not verify runtime behavior. No runtime or integration test,
installation, OAuth, credential read, model invocation, Docker/WSL operation,
VM/Sandbox creation, system change, production write, push or deployment occurred.
