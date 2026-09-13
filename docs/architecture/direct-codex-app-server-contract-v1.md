# Direct Worker–Codex App Server adapter contract v1

RF-HERMES-005, 2026-09-13. Specification version: **1**.
Status: **specified; implementation admission blocked**.
Current [RF-HERMES-006 decision packet](direct-codex-qualification-decisions-v1.md):
D01–D06 BLOCKED; D07 DECIDED for document/schema design only. Its profile is
NOT_ADMITTED and all four readiness gates remain false.
Architecture authority: [ADR-001 v1](../decisions/ADR-001-direct-codex-app-server-pilot.md).
This is a normative target contract, not implemented behavior or activation.
Its closed acceptance matrix is [the v1 matrix](direct-codex-app-server-acceptance-v1.md).

Every normative clause belongs to a stable CAS-R identifier below; tables and
subclauses inherit their enclosing identifier. CAS-T tests map every requirement
to explicit positive and negative evidence. D identifiers are unresolved
qualification decisions, not default values. No unlisted exception is permitted.

## Evidence basis and reading rules

**F** means a fact in an already captured source, **N** a Roost requirement,
**U** an unproven mapping/effect requiring the selected binary's compatibility
evidence. F is not a claim about the latest release or an admitted executable.
No network access or Codex execution was used to author this specification.

| Source | Local evidence and scope |
| --- | --- |
| S01 | [RF001 manifest](../../config/hermes/source-assessment.json), `openai-1`: captured official [App Server documentation](https://learn.chatgpt.com/docs/app-server.md), 2026-09-13T11:21:07Z, 99,470 bytes, SHA-256 `a72a5c88ab05ab9737ec28b432708f2776f696be48eae09ee39c02dd2f9480e0`. Sections Message schema, Initialization, Start or resume a thread, Start a turn, Events, Approvals and Authentication. |
| S02 | Same manifest, `openai-0`, `openai-2`, `openai-4`–`openai-7`: captured official sandbox, Windows sandbox, approvals, configuration and permissions documentation; source hashes remain in the unchanged manifest. No host-wide containment proof. |
| S03 | [Execution packet](execution-packet-contract.md): RF-HOST-010/016 budgets/model, RF-CTX-006 Ready/context and existing command authority. [Provider input](adopt-before-build.md) defines immutable `roost-provider-input-v1`. |
| S04 | [Recovery v1](agent-host-recovery.md), [supervised runtime](local-codex-agent-runtime.md) and [host lifecycle safety](../operations/host-lifecycle-safety.md): machine writer, lease, checkpoint, stop and current denial. |
| S05 | [RF002 synthetic boundary](../operations/hermes-linux-synthetic-transport.md): 29 fake-server cases and research limits; not real App Server or escaping-descendant proof. |
| S06 | [RF001 assessment](hermes-codex-isolation-assessment.md), [RF003 audit](hermes-clean-transport-api.md) and ADR-001: Hermes is optional; existing synthetic wrapper is not approved production code. |
| S07 | [Foundation V2](../product/interview-foundation-v2.md): RF-HOST-010/011/016, RF-SEC-011 and RF-RES-001..004; [native redaction](native-runtime-redaction.md). |

## CAS-R01 — Ownership and scope

Roost API/control plane owns goals, tasks, hierarchy, canonical context, Decisions,
grant/admission transactions, audit and final acceptance. Worker owns all local
enforcement: lease, writer slot, checkpoints, canonical repository, secrets,
resources, child lifetime, deadline/accounting and stop. The thin adapter only
encodes/decodes the official App Server protocol and projects bounded events;
it cannot claim tasks, renew authority, resolve Decisions or select a model.
Codex executes one admitted turn and permitted tools inside Worker containment.
Use existing API/state mechanisms; no separate queue, workflow engine or ledger
that can overrule Roost. Hermes and OpenShell are not requirements of v1.

## CAS-R02 — Strict local invocation envelope

Define `roost-codex-app-server-invocation-v1` as a **Worker-local** descriptor,
never a remotely supplied launch configuration or the prompt. Keep existing
`roost-provider-input-v1` bytes and seal intact; this wrapper does not revise its
schema or enlarge its 131,072-byte maximum. Reject unknown fields recursively,
duplicate JSON keys, null where not stated, non-finite/coerced numbers, malformed
UTF-8, NUL, invalid enums and limits exceeding the approved profile. No defaults
may fill required fields. Validate shape before resolving paths or secrets.

The following is the complete descriptor field dictionary. UUID means canonical
UUID; digest means 64 lowercase hexadecimal SHA-256; count means a nonnegative
safe integer; bounded text is nonempty UTF-8 with its profile byte cap. All fields
are required except the two explicitly optional fields. Named objects have
exactly the keys specified here; profile references resolve to immutable trusted
Worker objects, not free-form maps supplied by tasks.

| Field / exact object keys | Type and constraint |
| --- | --- |
| `version` | Exact literal `roost-codex-app-server-invocation-v1`. |
| `identity` | `{workspaceId, applicationId, taskId, executionId, attempt, workerSessionId}`; five IDs UUID, attempt integer 1–5, exactly equal to the current execution and writer owner. |
| `input` | `{version, sha256, bytes}`; exact existing provider input version, digest, canonical UTF-8 string ≤131,072 bytes validated against the existing strict provider-input schema. No reserialization by adapter. |
| `pins` | `{packetRevision, contextRevision, readySeal, riskSeal, compositionSeal, workspaceDigest}`; digests bound to existing accepted projections, not new API columns or independently mutable authority. |
| `admission` | `{grantRef, leaseRef, checkpointVersion}`; first two opaque local handles, last count. Handles resolve only in Worker to current authoritative state; lease/API credential values never cross into the adapter descriptor. |
| `profile` | `{id, revision, sha256}`; approved compatibility profile ID, positive revision and digest. Profile resolution is local and exact. |
| `executable` | `{pathRef, version, sha256, inventorySha256}`; private canonical-path handle, exact qualified version and two digests. No version range or alias. |
| `argv` | Exact string array `["app-server"]`; maximum one entry. See CAS-R04 for rejected variants. |
| `environment` | `{profileRef, sha256}`; immutable replacement-environment recipe and digest of its secret-free template. Secret values are never hashed into a durable dictionary or logged. |
| `filesystem` | `{repositoryRef, repositoryDigest, scratchRef, scratchPolicySha256}`; Worker-local handles and digests. All roots resolve under CAS-R06/07, never from prompt text. |
| `policy` | `{sandboxProfileRef, sandboxSha256, approvalPolicy, authoritySeal}`; approved policy handle/digests; approvalPolicy exact `never` or `unlessTrusted`, with mode eligibility under CAS-R08/17. |
| `modelSelection` | `{model, reasoningEffort}`; exact existing admitted pair, no defaults. |
| `session` | `{mode, ephemeral, clientInstanceId}`; literal `new`, literal true and UUID. |
| `budgets` | `{startedAt, maxDurationSeconds, maxOutputTokens, maxAttempts, startupMs, turnMs, stopMs, lineBytes, aggregateBytes, pendingBytes, maxItems, maxCallbacks, maxTransportRetries, maxCostMicros, currency, pricingRevision}`; UTC timestamp, existing accepted three integer budget limits, remaining numeric fields positive safe integers except retry count may be zero; currency fixed approved ISO currency and pricingRevision digest. Relations in CAS-R13/14; no unresolved values admitted. |
| `evidence` | `{requirementsSeal, outputSchemaSeal}`; digests binding accepted task evidence and the fixed outcome schema CAS-R22. |
| `credentialRef` (optional) | Opaque local reference, present only for an independently qualified auth profile; never a secret value, account identifier or path. Absence means auth-free synthetic qualification only. |
| `displayLabel` (optional) | Redacted human label ≤80 UTF-8 bytes; cannot affect protocol, authority or limits. |

Forbidden everywhere in model input: private path/credential/lease/config values,
raw task-selected argv/env, provider overrides, deployment credentials and API
proxies. Forbidden descriptor additions include `extraArgs`, `envOverlay`, shell
strings, arbitrary callback functions, resume/thread IDs and bypass/ready flags.
Serialize only the input bytes into one text item; descriptor handles and pins
are not extra model instructions. Example identifiers such as `example-task`
are illustrative labels, not valid substitutes for typed execution IDs.

## CAS-R03 — Executable identity

Worker resolves `pathRef` to one absolute physical executable path in private
installation configuration. Reject PATH lookup, relative/UNC/device paths,
symlink/junction/reparse aliases, writable-by-agent binaries, scripts requiring
an unpinned interpreter and platform mismatches. Verify exact version,
executable digest and complete dependency/runtime inventory against the profile
before spawn; prevent replacement between verification and execution using a
qualified OS handle/ACL mechanism. No shell, version probe or download on task
admission. Missing integrity or unproven race protection blocks before spawn.
Recorded CLI versions in v5/RF001 are observations, not this profile's pin (D01).

## CAS-R04 — Arguments and configuration

Launch the resolved native binary with exactly `["app-server"]`, stdio pipes
and no shell. S01 documents default stdio (F); support by the selected binary
remains U. No `--listen`, command substitution, `-c`/`--config`, profile override,
`--model`, sandbox/approval flags, resume/exec subcommand, positional prompt,
`--dangerously-bypass-approvals-and-sandbox`, duplicate or conflicting options.
Transport/profile/model/policy controls use the sealed private config and exact
RPC fields, never a second flag channel. A binary needing additional argv needs
a reviewed contract version, not an escape hatch.

Before spawn, Worker supplies only a sealed minimal configuration in synthetic
CODEX_HOME. Configuration precedence, managed layers, project config, AGENTS
instruction discovery, skills, hooks, plugins, MCP servers, proxy/provider
defaults and telemetry must be inventoried for the pin. Deny unapproved layers,
discovery and initialization before their side effects. Checking config/read
after such effects is insufficient. Repository instructions are untrusted task
context and cannot change permissions. Unknown effective config blocks.

## CAS-R05 — Replacement environment and secret delivery

[ADR-002 / I01-B](../decisions/ADR-002-codex-qualification-owner-decisions.md)
selects official authentication of the laptop's logged-in Codex account only.
Roost stores its connection reference/state, never copied credentials. The
external-token mechanism discussed below is research, not an approved channel
or permission to inspect auth. Existing isolation and fail-closed gates remain.

Build child env from zero. Fixed minimal names: `CODEX_HOME`, `HOME`, `TEMP`,
`TMP`, `TMPDIR`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME`,
`XDG_STATE_HOME`, `PATH`; POSIX locale names `LANG`/`LC_ALL` only in a qualified
POSIX profile, Windows `SystemRoot`/`WINDIR` only in a qualified Windows profile.
Profile values are exact private resolved paths or fixed locale values; PATH
contains only pinned trusted tool directories and never cwd, empty entries or
user-writable search directories. Platform-inapplicable names are absent.
Home/temp/XDG resolve to distinct approved scratch subdirectories. No parent
env copy: reject extra provider, Roost, cloud, SSH/Git, Docker, WSL, proxy,
loader-injection, Node/Python, telemetry and credential variables.

`credentialRef` denotes the authorized official local-account connection, whose
isolated resolution remains to be demonstrated by D03 after fresh grant/lease
checks, scoped to provider, attempt, expiry and audience. No private credential
store or token-export path is assumed to supply that connection.
Any secret transfer must use a qualified official in-memory authentication channel;
never through argv, prompt, inherited env, files, API records or logs. Candidate
S01 `account/login/start` with `chatgptAuthTokens` and its refresh callback is
experimental (F), not a selected/authorized transfer mechanism (U,
D03). Do not extract a user's existing Codex login/session. No browser/device
login or implicit token refresh is in v1. Before real use D03 must establish
lawful preexisting credential access, no persistence/tool-child leakage, exact
request schema and bounded refresh inside original budget; otherwise block.
Until then credentialRef is rejected and the auth-method allowlist is empty.
Roost stores only grant/reference identity; local paths/account IDs/token values
stay out of telemetry. A secret may exist briefly in the approved private wire
buffer, never in a durable trace; redact before any callback or persistence.

## CAS-R06 — Canonical application workspace

Process cwd is the one resolved canonical application repository, equal to
thread cwd and turn cwd. Validate application ID, physical direct-child mapping,
Git top level, expected branch/HEAD/origin, workspace digest and existing changes
at preparation and immediately before spawn. Reject traversal, aliases, sibling
repositories, unapproved worktrees/clones and remote-provided paths. An approved
task branch must already exist; the adapter never creates/switches it.
Preserve unrelated tracked/untracked/user files; the accepted scope contains
explicit exclusions, and tool enforcement protects them even inside the repo.
No whole-worktree staging, reset or cleanup based on a model request.

## CAS-R07 — Filesystem and host containment

The **model/tool writable-root list contains exactly the canonical application
root**. Read roots are the repository plus enumerated immutable runtime/toolchain
dependencies, not all host home directories. Protect excluded user paths and
Git control data (including hooks/config/index/refs when commit is not granted)
with enforceable permissions or a mediated tool boundary, not prompts.

Synthetic CODEX_HOME/temp/XDG are separate Worker-owned process-state scratch,
not another application clone or additional model writable roots. Only the
App Server's admitted housekeeping receives that private capability; tools must
not read/write auth, Worker locks, other projects or private profiles through it.
If the pin/OS cannot separate server scratch and tool access, fail closed (D04).
Redirect/exclude default temp write grants; do not silently widen the root set.
Allow only admitted provider egress, not arbitrary tool network, host-control
sockets, metadata endpoints, Docker/WSL administration or production DB access.
Native command sandbox declarations alone do not prove whole-process isolation.
OpenShell may later supply evidence but is not assumed to solve these requirements.

## CAS-R08 — Effective sandbox and approval policy

Compile policy from current authority/risk/Ready, never from model text. The
target local-change profile uses native workspace-write command containment
with restricted reads and one writable root; read-only qualification is a
separate stricter fixture, not production evidence. `never` means no interactive
approval can increase grants, not unrestricted tools. `unlessTrusted` is eligible
only after D06 proves its trust classification plus enforcement cannot run a
prohibited action without a Roost decision. Absence of callbacks is not proof.

Compare requested and effective policy before turn admission: configuration
layers, thread response fields and independent native deny probes for the pin.
S01 `config/read` reports layered disk config (F), not complete effective tool
enforcement. Missing field/support/readback or disagreement is blocked, never
downgraded. `dangerFullAccess`, `externalSandbox`, permissive approval policy,
session-wide grants and policy amendments are rejected by this v1 adapter.

## CAS-R09 — Exact model and effort

Keep S03's allowlist: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`,
`gpt-6-astra`; efforts `low`, `medium`, `high`, `xhigh`, `max`, `ultra`, except
Luna excludes `ultra`. This is the owner's minimum-5.6 policy, not a promise of
current provider availability. Both fields are mandatory in Ready and input.
Thread model/provider and turn model/effort must equal the accepted pair;
provider is exactly the qualified official `openai` path. Validate the pin's
supported pair and effective response. No `latest`, alias, inherited default,
automatic upgrade/downgrade or cross-model retry. A reroute notification stops
the attempt; unknown actual usage is not reported as a confirmed model match.
Any escalation requires independent plan/budget approval and new Ready/execution.

## CAS-R10 — Official protocol mapping and compatibility facts

The following is the complete client method set for the base profile. Exact
request/result/event JSON schemas must be sealed by D01, with recursive unknown
field rejection. Roost field names are not assumed to be upstream spellings.
Use version-specific generated schemas or reviewed official source artifacts;
generating them would execute Codex and is not part of RF-HERMES-005.

| Stage | Official mapping (F: S01) | Required v1 mapping and remaining U |
| --- | --- | --- |
| Initialize | `initialize` request once, then `initialized` notification after successful response. | Fixed secret-free clientInfo name/title/version; experimentalApi=false and no opt-outs in base profile. Check response schema/platform against pin; response is not binary attestation. |
| Read configuration | `config/read` with `includeLayers:false` reads resolved on-disk configuration. | Only this read method, after safe initialization; privately compare allowlisted values, discard/redact raw result. Pre-init layer/side-effect enforcement still required. |
| New thread | `thread/start`; docs show model, cwd, approvalPolicy, sandbox and returned thread identity/instructionSources. | Exact model/provider, cwd and approval; thread `sandbox` enum uses `workspaceWrite`, not CLI `workspace-write`; require ephemeral=true. Exact input ephemeral/provider fields and effective policy readback remain U until schema and behavior proof. No dynamicTools, extra instructions, personality or feature defaults. |
| Stored thread | `thread/resume` accepts recorded threadId; thread/fork also exists. | **Forbidden in v1**, including after laptop restart. It is not Roost checkpoint recovery; ephemeral sessions cannot be reconstructed from an ID. |
| One turn | `turn/start` accepts threadId/input/cwd/model/effort/approvalPolicy/sandboxPolicy/outputSchema. | One text input containing the exact sealed provider bytes; same model/cwd/approval, exact effort; sandboxPolicy workspaceWrite with one writableRoots entry, restricted readOnlyAccess and networkAccess=false for tools. Pin must prove separate provider connectivity and default temp exclusions. Fixed CAS-R22 schema. |
| Events/requests | Thread/turn/item notifications and server-initiated approvals; see CAS-R16/17. | Validate against sealed schemas and active identities before projection; no wildcard acceptance. Wire ordering variations require explicit pin proof. |
| Interrupt | `turn/interrupt` takes threadId and turnId, acknowledges `{}`; turn/completed may report interrupted. | At most one request when IDs are known; best effort inside stopMs. Ack is not termination proof. No documented universal shutdown RPC is assumed. |
| Terminal | `turn/completed`, turn.status completed/interrupted/failed. | CAS-R21/22 validate all evidence and stop/close owned process. CLI `turn.completed` JSONL is a different interface and is rejected here. |

The base client allowlist is exactly initialize, initialized, config/read,
thread/start, turn/start, turn/interrupt. Auth additions need the separately
qualified D03 profile and exact schema/capability negotiation; none is admitted
now. No turn/steer, thread/fork, thread/resume, command/exec, config writes, account discovery,
MCP/resource browsing, app/plugin installation or external listeners.

## CAS-R11 — State machine and idempotency

Worker states: validated → prepared → spawn_intent → initializing → thread_bound
→ turn_intent → running → stopping → terminal_pending → reconciled. Existing
durable checkpoint stages remain S04's claimed/prepared/spawn_intent/running/
effect_possible; intermediate adapter states are bounded process-local state,
not new persistent API stages. Record and acknowledge spawn_intent locally and
in Roost before process creation; consume the existing input exactly once.

One process, connection, thread and logical turn per attempt. Allocate unique
client request IDs; IDs correlate replies and are **not** upstream idempotency
keys. Never resend thread/start or turn/start after a lost response. Bind returned
thread, session and turn identities to the attempt; do not derive sessionId from
threadId. Before consuming any response/event, recheck local stop fence. Before
turn_start, reread current authority/context and remaining budget; no in-session
replacement input or renewed budget. A send with unknown outcome is effect-
possible; preserve it and reconcile, never infer that the request did not run.

## CAS-R12 — Ephemeral sessions and laptop recovery

ephemeral=true, no persistent Codex rollouts, no replayed conversation, no
second turn. Worker checkpoints carry secret-free identity, input/context and
workspace digests, version/CAS and stage, not prompts, raw RPC or credentials.
Persist by the existing local-flush then API-ack ordering; mismatch is blocked.
Do not add unknown fields to existing recovery-v1 records; a later versioned
extension may bind extra profile receipts without loosening stage admission.

After restart, only matching claimed/prepared checkpoints with a still-valid
lease, confirmed dead owner, exclusive recovery gate and unchanged accepted
context/workspace can recover the same attempt. Expired lease, spawn_intent,
running, effect_possible, missing/corrupt/torn checkpoint or lost terminal ACK
requires reconciliation. Preserve partial files/evidence and retained writer;
do not erase changes, refill budgets, resume Codex or requeue automatically.
After confirmed stop and explicit reconciliation, an authorized new execution
may use reviewed remaining work as new input. No task is silently lost or
duplicated; unacknowledged work stays visibly unresolved. Exactly-once effects
across arbitrary crashes or OS freezes are not claimed.

## CAS-R13 — Limit provenance and timers

All limits are required finite values before a real invocation. Read from one
approved profile plus accepted task budgets; stricter task values win. Clock
rollback/future startedAt or uncertain elapsed time blocks; monotonic elapsed
cannot decrease. Overall deadline is original server startedAt plus accepted
maxDurationSeconds, including preparation, callback wait, transport retries and
laptop downtime; it never resets at spawn or recovery. Begin forced stop no
later than min(overall deadline, last confirmed lease expiry) minus stopMs.
Startup starts at spawn_intent; turn starts before sending turn/start; each is
capped by remaining overall/lease time. Stop budget is included, not added.
Require 0 < stopMs ≤5,000; startupMs and turnMs are each at most
maxDurationSeconds×1,000−stopMs. Before an operation, its remaining admitted
window must exceed stopMs. Require lineBytes ≤aggregateBytes, pendingBytes
≤aggregateBytes, bounded positive descriptor/string/array/depth/item/callback
caps, and attempt ≤maxAttempts. Numeric overflow or incompatible caps blocks;
do not clamp a malformed profile into validity. Quotas cover both framing and
decoded representations so JSON expansion cannot bypass the memory bound.

| Limit | Provenance and production disposition |
| --- | --- |
| Provider input ≤131,072 bytes | Existing Worker contract (S03), retained. Outer descriptor max bytes needs D02; it does not enlarge model input. |
| Duration 60–3,600 seconds; attempts 1–5; output 128–100,000 tokens | Existing accepted packet bounds (S03). Exact task values remain required; no new default. Output includes reasoning. |
| Stop reserve at most 5,000 ms | Existing five-second lease/duration margin S04 and ADR-001 ceiling. Graceful/forced phase split and platform proof need D04; total cannot grow. |
| Startup 15,000 ms, turn 20,000 ms, outer 60,000 ms | RF002 fake-only values (S05); not approved production phase defaults. Production startup/turn caps need D02; overall remains task duration. |
| Line 8,192 bytes; stdout+stderr aggregate 32,768 bytes | RF002 research wire limits, including newline and delivered bytes. Production values and descriptor/queue/item/callback bounds need D02. |
| Zero RF002 transport retries | Research profile only. Existing S04 permits bounded upstream HTTP/SSE retries within one turn; production exact retry ceiling and verifiable counting need D05. Adapter RPC/process replay count is zero in v1. |
| Token/cost hard enforcement | Required by S03/S07, not demonstrated. maxCostMicros/currency/pricingRevision and accounting/overshoot mechanism need D05 and independent task budget approval. No currency/default amount is selected here. |
| CPU, RAM, process/fd counts, scratch bytes, event/callback rates and report timeout | Finite qualification-profile values required by CAS-R15/23; not established by RF002. D02/D04 must select them and overflow action. |

Limits above are not interchangeable: line bytes cannot prove output tokens,
elapsed time cannot prove money, post-turn usage cannot cap generation. Stop at
the first exceeded/unsupported limit, stop further claims and retain evidence.

## CAS-R14 — Cost, tokens and retries

Admission requires a demonstrated hard bound on generation including reasoning,
partial/undelivered responses, retries and any permitted auxiliary activity.
Auxiliary model calls/subagents are disabled in v1. Do not use tool-output
truncation, estimated text tokens, account percentages or a prompt as a cap.
If synchronous enforcement or a formally bounded reservation covering maximum
overshoot is unavailable, deny before spawn. Reservation must stay within the
accepted task budget; unknown usage is unknown, never zero or a refund.

Counters monotonically consume original attempt limits. No reset on heartbeat,
reconnect, token refresh or report failure. Provider retries must expose an
enforceable count and partial cost or remain unsupported. Follow Retry-After
and bounded backoff only inside the same lease/deadline/count/budget; if the
delay cannot fit, stop. Terminal failure does not retry. Repeated ineffective
actions checkpoint and request independent plan review. Independent model/
budget escalation creates new authority; adapter cannot perform it itself.

## CAS-R15 — One writer, one runtime and process ownership

Acquire the existing machine-wide exclusive writer only after API protocol
admission and recovery classification. One writing attempt across the whole
laptop, irrespective of workspace/application/key; one declared local runtime
per application. A second host cannot claim concurrently. Read-only observers
never obtain a writer slot. Include native/WSL entrypoints: separate OS-local locks cannot count as
a laptop-wide writer fence. A qualified platform profile must use the existing
canonical ownership boundary or prove a compatible fence across these entrypoints.
Inventory declared application resources before
work; an existing healthy runtime is reused, unknown conflicts block. Do not
choose another port, spawn another clone/runtime, kill foreign processes or
repair Docker/WSL. External editors must honor the writer boundary; the lock
alone does not prevent their changes, so unexpected workspace drift stops work.

Contain the entire process tree before the first executable instruction.
Windows Job Objects without breakaway or a qualified equivalent must cover
descendants; POSIX process groups alone do not cover setsid/double-fork escapes.
D04 must prove the actual supported platform, protected supervisor/watchdog,
PID-reuse-safe ownership and non-bypassable limits. No host-control sockets or
privileges. Enforce profile CPU/RAM/process/handle/scratch caps before launch.
If containment/ownership cannot be established, create no child. On exhaustion,
stop only owned resources and retain the writer for reconciliation.

## CAS-R16 — Framing, allowlisted events and normalization

Use bounded raw UTF-8 newline records on stdout; enforce lineBytes and cumulative
aggregateBytes across stdout and stderr **before** JSON parsing, allocation,
queue insertion or durable emission. Count all bytes, including discarded or
already delivered bytes; use at most one overflow sentinel byte per read. Drain
stderr under the same quotas and discard its content; emit only bounded counts
and fixed classifications. Enforce pendingBytes/maxItems independently, reject
invalid UTF-8/duplicate keys/deep or oversized JSON according to D02 parser caps.

Closed base notification allowlist: `thread/started`, `thread/status/changed`,
`turn/started`, `turn/completed`, `turn/diff/updated`, `turn/plan/updated`,
`thread/tokenUsage/updated`, `item/started`, `item/completed`,
`item/agentMessage/delta`, `item/commandExecution/outputDelta`,
`item/fileChange/outputDelta`, `item/reasoning/summaryTextDelta`,
`item/reasoning/summaryPartAdded`, `item/reasoning/textDelta`,
`serverRequest/resolved`, `error`, `warning`,
`configWarning`, `model/rerouted`, `model/verification` and `thread/closed`.
S01 documents these event families; exact schemas/payload enums and which are
emitted by the selected pin remain U. Known warnings/errors/rerouting/verification
are deny/control signals in v1, not permission to continue under unknown config.
thread/closed before accepted terminal is interrupted. All other methods fail
closed; adding one requires explicit profile/contract review, not `item/*`.

Allowed item unions are `userMessage`, `agentMessage`, `reasoning`,
`commandExecution`, `fileChange`. Reasoning content is dropped, never stored as
hidden chain of thought. MCP/app/web/delegation/dynamic-tool item types are denied
in the base profile. Runtime tool reads beyond initial input require a separate
bounded contract; mandatory context already arrives in the input envelope.

Normalize to a strict secret-free event record with exactly `{version,
executionId, attempt, localSequence, kind, itemRef, counters, reasonCode}`:
version=1, executionId UUID, attempt positive integer, localSequence monotonic
count, itemRef opaque bounded ID or null. kind is one of `started`, `progress`,
`approval_pending`, `usage`, `stopping`, `terminal`; counters has exactly
`stdoutBytes`, `stderrBytes`, `outputTokens`, `costMicros`, `transportRetries`
(counts or null when unknown); reasonCode is a reviewed fixed enum. No text,
absolute paths, raw diffs, commands or payloads in this transport event. Task
evidence is handled separately by CAS-R22/23.

## CAS-R17 — Callback authority and decisions

Base server-request allowlist: `item/commandExecution/requestApproval` and
`item/fileChange/requestApproval`. Each must match live thread/turn/item,
pending item type, lease/context, exact scope and allowed command/file operation.
Only one outstanding approval at a time, bounded by maxCallbacks and remaining
deadline; additional concurrent requests deny/stop. Worker projects a redacted
request into existing Roost Decision/authority mechanisms; the adapter cannot
accept model claims, job titles or external instructions as grants.

Responses are exactly single-use `accept`, `decline` or `cancel` only when the
pin schema permits them. Accept requires a current Roost decision for that
request/action and cannot exceed existing scope. Reject acceptForSession,
exec-policy amendments, additional writable grants and trust persistence. With
approvalPolicy=never, unexpected approval requests deny/stop, never auto-accept.
Timeout/no answer/revocation means cancel/stop, not implied acceptance.

Unknown requests, `item/permissions/requestApproval`, tool/requestUserInput,
item/tool/requestUserInput, item/tool/call, MCP elicitation, auth refresh and
attestation are denied in the base profile without forwarding secret/raw values.
S01 uses differing user-input names in sections; neither spelling is silently
admitted. Auth refresh may be added only by qualified D03, inside CAS-R14.
No background hooks, migration, auto-review or auxiliary provider may run.

## CAS-R18 — Ordering, duplicates and late events

Use single-reader ordering, unique request IDs and per-item state. Permit
thread/started or turn/started to precede the corresponding RPC reply only in a
bounded provisional slot; require matching identity before dispatching callbacks
or accepting a terminal. This accommodates asynchronous streams without treating
arrival order as authority. Reject completion before a matching start, wrong
thread/turn, unknown request IDs, multiple terminals, changed payload for an ID,
repeated item starts/completions and events from a closed connection.

Exactly identical repeated approval request IDs return at most the cached denial
or already-authorized response while still pending/current, without another
Decision or tool execution. Any changed content or expired authority cancels it.
RPC response duplicates and unsequenced repeated deltas fail closed: do not
deduplicate arbitrary model text by content. late terminal/usage after stop is
counted within caps but cannot change the frozen outcome. Lost output/ordering
evidence is failed or interrupted, never guessed success.

## CAS-R19 — Interrupt and complete stop

Stop is an idempotent Worker operation, independent of callbacks/event-loop
progress. Atomically close admission to new events/actions, freeze cause and
budget accounting, retain/checkpoint ownership, optionally send one turn/interrupt
when IDs are bound, close stdin and begin OS termination of the owned tree.
Use the D04 bounded graceful phase then force-kill the entire containment unit
before stopMs expires (≤5,000 ms including interrupt wait). Never wait indefinitely
for an RPC ACK, EOF, child exit, report or callback. No interrupt ID means direct
OS stop, not waiting for a turn ID. Confirm zero owned descendants/handles and
release only task-owned scratch with verified identity after redaction.

On normal terminal, close the dedicated server using the qualified graceful
exit procedure; process lifetime is independent of thread completion. A forced
kill required for normal-success cleanup is a cleanup failure, not success.
On cancellation/failure, forced cleanup may confirm stop but cannot change the
cause. Unconfirmed termination retains writer/checkpoint and blocks all new
claims. Never signal a foreign PID, restart hosts, delete unknown resources or
claim protection during an OS freeze; startup must reconcile that uncertainty.

## CAS-R20 — Recovery and reporting safety

On lease loss, context change, deadline, budget breach or protocol failure,
stop and use existing authorized fail/cancel/context-stopped/recovery-blocked
report paths. Expired-token use is limited to the already supported stop report;
it cannot renew authority. Terminal reporting retries may repeat only the same
existing idempotent report/CAS receipt inside its bounded report timeout, with
no rerun of model/tools. A lost or conflicting ACK leaves terminal_pending and
retained local ownership. No unacknowledged event is counted as delivered.

## CAS-R21 — Outcome classification

| Outcome | Exact qualification rule |
| --- | --- |
| `success` | Exactly one completed terminal for bound turn; valid fixed output and required evidence, no outstanding callback/item, current lease/context/budgets, confirmed effective model/policy, complete accounting, clean server exit/EOF and zero descendants; canonical API accepts the report. Text or exit code alone is insufficient. |
| `blocked` | A missing/unsupported contract, authority, pin, policy or required evidence prevents admission; after a process exists, stop it and retain actual effect stage. Never imply that blocked means no side effects without pre-spawn evidence. |
| `failed` | Protocol/operation/validation error, provider failed status, exhausted cap or cleanup failure; nonretryable on this attempt. |
| `cancelled` | Current explicit Roost cancellation observed and whole-tree stop confirmed; late completed does not override it. |
| `interrupted` | Unexpected disconnect/power loss or uncertain effects/termination; reconciliation required. A provider interrupted status without a Roost cancellation is not user cancellation. |

First stop cause is immutable; any uncertainty upgrades the evidence state to
reconciliation-required and forbids success, even if an earlier cause is retained
for diagnostics. Local classifications are projected through existing API
commands/statuses, not invented DB enums. Task completion/review/release remains
separate from reporting a successful execution.

## CAS-R22 — Outcome and artifact contract

The requested model outputSchema is a closed object with required `summary`
(redacted bounded string), `changedPaths` (unique repository-relative path
strings), `checks` (array of closed `{checkId, status, evidenceRef}` objects;
status pass/fail/not_run), and `artifacts` (array of opaque evidence references).
All other keys forbidden. Sizes/counts use D02; checkId/evidenceRef must resolve
to the accepted task's required evidence. The model's assertions are untrusted.

Worker independently verifies changed files/exclusions, test receipts (command
identity, exit code and bounded redacted evidence), artifact hashes and relevant
Git status against the accepted input. Required checks marked not_run cannot
produce success. Preserve partial artifacts on failure privately. Durable outcome
receipt has exact keys `{version, executionId, attempt, inputSeal, profileSeal,
checkpointVersion, outcome, reasonCode, requestedModel, observedModel,
evidenceRefs, counters, treeStopped, reportAcknowledged}`; version=1, IDs/seals as
CAS-R02, outcome CAS-R21, reason fixed enum, model objects exact pair or observed
null, counters CAS-R16, booleans literal, evidenceRefs bounded unique opaque list.
No claimed observed model from requested arguments alone. Metadata extension
support is a future compatibility change, not authority to write unknown fields
to today's API. Until accepted, keep the receipt in qualified private evidence.

## CAS-R23 — Privacy and bounded telemetry

Apply existing native redaction before model dispatch, callback emission,
checkpoint, event or evidence persistence. Required sensitive input blocks;
redacting it cannot silently change sealed meaning. No raw stdout/stderr/RPC,
account IDs, tokens, private domains/paths, production data or application
portfolio in distributed code/examples/fixtures. Only fictional identifiers
and per-installation configuration. Private evidence uses access-controlled
storage, declared bounded retention/size (D02/D07), opaque references and hashes;
repository-relative paths only after task-scope validation. Redact secret
sentinels split across chunks/encodings before any sink; a raw buffer has a
strict bound and is never a diagnostic fallback. No external telemetry/exporter.

## CAS-R24 — Commit, test and release authority

Tool execution must enforce task scope, not merely ask the model to comply.
Accepted checks require their own permitted command/resource scope. A successful
test/turn does not grant commit, push, merge, deploy or external communication.
Base local-change profile denies these actions and their credentials. Protect
Git metadata and network/tool access so shell aliases, hooks or API requests
cannot bypass the denial. If that boundary is unproven, local-change admission
is blocked. Any future release-capable profile requires exact current grants
and existing independent review/risk/backup controls, not a callback auto-accept.

## CAS-R25 — Non-goals and retained gates

No mandatory Hermes/OpenShell, multi-device coordination, parallel writers,
multiple clones/worktrees, persistent Codex resume, autonomous release, broad
runtime tools, new DB workflow, production activation or provider fallback.
No promise of automatically finishing work after a laptop crash; preserved
state plus explicit reconciliation prevents silent loss/replay. The current
registry v5, executionSupported=false, pilotReady=false, liveAdmissionAllowed=false,
execution disabled/observe and independent host/output gates remain unchanged.

## CAS-R26 — Versioning and later v5 reconciliation

This spec v1 is separate from provider registry v5, recovery-v1, provider-input-v1
and host wire v1. A future implementation change must propose a new registry
version with a distinct direct App Server provider identity (name reserved by
that change), keeping legacy direct_codex CLI and hermes_codex meanings. Do not
reinterpret either identity in place. Specify new host/API capability negotiation,
readiness projection, exact profile pin and regression/rollback rules before
changing requiredPilotProvider. All three readiness guards stay false through
that migration until independent pilot admission.

Old/new API/Worker mismatches deny claim/recovery/spawn in both directions;
unknown mandatory capabilities deny. Rollout drains/reconciles existing attempts;
rollback preserves checkpoints and never resumes them on older semantics. No
data reset, applied-migration edit, implicit installation or automatic activation.
The current legacy registry requirement is historical executable behavior, not
an architecture reason to insert Hermes into this adapter.

## CAS-R27 — Compatibility profile and unresolved decisions

An immutable qualification profile binds contract version, source/document and
generated wire-schema hashes, exact executable/version/inventory, OS/architecture,
toolchain, argv template, allowed config/env/auth, filesystem/containment policy,
effective model/effort/policy readback, method/event/request schemas, numeric
resource/parser caps, approved pricing and evidence-retention rules. Its strict
schema must give every key a type and reject unknown fields before implementation
admission. No opaque profile may supply executable code or arbitrary callbacks.
Unknown schema/version/enum or hash/config drift closes admission, even when
initialize succeeds. Capability claims from the process do not attest behavior.

The following is the closed decision list for v1; no implicit defaults:

| ID | Required resolution | Current state / responsible authority |
| --- | --- | --- |
| D01 | One exact Codex executable/version/inventory and supported OS; sealed official wire schemas and effective control mappings, including ephemeral/temporary-root behavior. | BLOCKED in RF006; exact installation pin/wire evidence still missing. |
| D02 | Production startup/turn, line/aggregate/queue/descriptor/JSON depth/string/array caps; item/callback/rate/report/retention limits and cross-limit relations. | BLOCKED technically; RF007/I01-A approves selection by the responsible technical system/agent within existing bounds, not manual owner tuning. Numeric values/evidence remain missing. |
| D03 | Approved credential reference source and official secret delivery/auth-refresh channel with no persistence or tool leakage. | BLOCKED technically; RF007/I01-B selects official local logged-in Codex authentication and reference/state-only Roost storage; channel isolation remains unproven. |
| D04 | Supported OS whole-process/FS/network containment, scratch separation, CPU/RAM/process/handle/disk limits and ≤5s stop phase split. | BLOCKED in RF006; abnormal-stop allocation selected, cross-OS enforcement remains unproven. |
| D05 | Enforceable generation/retry/accounting mechanism, exact retry maximum, cost currency/price revision and independently approved monetary budget; overshoot reservation if any. | BLOCKED in RF006; no demonstrated total token/cost/retry bound. |
| D06 | Effective native policy/approval behavior and mediation of user exclusions, commands, Git metadata and prohibited external actions; exact callback schema. | BLOCKED in RF006; restrictive never baseline selected, native enforcement remains unproven. |
| D07 | Closed profile/receipt schemas, reason enums, private evidence retention and versioned API/Worker receipt/protocol integration mapping. | DECIDED for document design in RF006; numeric retention remains D02, independent review and all runtime proof still required. |

Decision resolution supplies concrete values/design evidence, not runtime proof.
Unavailable upstream controls may close a decision as unsupported; then the
affected profile stays blocked instead of admitting a weaker requirement.

## CAS-R28 — Ready to implement

All conditions must hold: ADR-001 still accepted; CAS-R01..30 and CAS-T01..30
complete and statically linked; D01..D07 resolved into a strict, reviewed finite
profile with no critical UNKNOWN; chosen controls have a viable enforcement
design and official protocol mapping; test fixtures/evidence expectations and
versioned integration/rollback scope are independently reviewed; the owner/source
task explicitly authorizes one bounded implementation task. These conditions
authorize construction only, never agent execution or a production rollout.
Current result: **implementationReady=false**, because D01..D06 remain blocked
and independent qualification review is still required.
Writing this specification or passing its linter cannot satisfy those decisions.

## CAS-R29 — Ready for pilot

Separately require: actual reviewed implementation and compatible API/Worker
versions; every CAS-T row passes its required evidence level on exact admitted
artifacts/platform, including real-server and native deny/escape/crash tests;
hard output/cost/retry enforcement with complete accounting; independently
verified resource/privacy/authority/recovery and unchanged existing workloads;
all relevant Foundation V2 context/review/backup/host gates; fresh explicit
single-use pilot task authority and rollback/stop plan. No waiver through local
metadata or a successful synthetic fixture. Missing evidence means all activation
flags remain false; later activation is a separate authorized change.

## CAS-R30 — Acceptance closure and next task

The [acceptance matrix](direct-codex-app-server-acceptance-v1.md) is closed for
v1. Each row supplies a positive case, negative family and expected evidence;
missing mandatory field/enum variants are generated exhaustively from the
resolved strict schemas. A skipped required case or unsupported control fails
qualification; documentary checks are not runtime test results. New protocol
behavior requires versioned profile/contract review and matching tests.

Run `python -B scripts/validate_direct_codex_contract.py` for the
[offline structural validator](../../scripts/validate_direct_codex_contract.py).
It checks IDs/mapping, local links/anchors, index references, required descriptor
fields, retained gates, source/privacy structure and default-context size only.
It does not execute matrix cases or supply missing decision evidence.

The original RF-HERMES-005 follow-up, RF-HERMES-006, is now recorded in the
[qualification decision packet](direct-codex-qualification-decisions-v1.md).
That packet owns current decision status and exactly one recommended next task;
unsupported choices remain blockers. This specification grants no next-task authority.
