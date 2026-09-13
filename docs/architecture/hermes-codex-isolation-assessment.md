# Hermes, Codex and local worker isolation (RF-HERMES-001)

**OPENSHELL-NOT-REQUIRED-FOR-CODEX-RUNTIME-CANDIDATE**. Static assessment,
2026-09-13. OpenShell is an evaluated optional containment candidate, not a
demonstrated prerequisite for a coding worker. Codex provides native command
sandboxing; a separately qualified Worker adapter could use it. **The shipped
Hermes integration is not admitted:** configuration, credential isolation,
process ownership and budget gaps remain. No installation or runtime was executed.

This assesses normal coding with writes inside one repository. The historical
[nonwriting stdio proposal](../operations/openshell-nonwriting-stdio-proposal.md)
addresses a different workload and remains valid history. Coding does not need
zero filesystem writes. Release and integration actions require a separate
authority and credential boundary; ordinary coding never inherits those grants.

## Project and release identity

The official [Hermes site](https://hermes-agent.nousresearch.com/) links to
[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent), repository
ID `1024554267`. Its API still returns that canonical name directly, without a
redirect. The proposed `hermes-agent-org/hermes` address returns a different
repository, ID `1210503219`, with release `v0.1.0` dated 2026-04-15. No transfer
or canonical succession is established by this evidence. It is excluded from
the implementation assessment; similar names do not establish lineage.

Latest stable [v2026.9.11](https://github.com/NousResearch/hermes-agent/releases/tag/v2026.9.11)
was published 2026-09-11T19:20:31Z, with draft/prerelease false. Annotated tag
`2160b2d59c87316e82f749d77c1f25969bea1533` resolves to commit
`939e45c91d751fadd94dcd1b873ac3cb44846213`, tree
`87733a9376625ca99972ef5d9b238024633aaea0`. Package version is `0.21.2`, Python
`>=3.11,<3.14`, license MIT. The pinned README declares Linux, macOS, WSL2,
Termux and native Windows support; native Windows uses Git Bash for Hermes shell
tools. Platform support is not a containment guarantee.

Current main was `b6b53c69a6ed49cb099cf1bfe76b5e6edd718e5a`, tree
`8643dbbc1441801ae74c71189bda1f600012b3e9`. Twelve of 29 selected source files
differ from stable, but the App Server client, session, integration, migration,
switch and runtime guide have the same Git blobs. The assessed App Server feature
is already in stable. Other main changes are not silently attributed to stable.
Even the stable guide is not an exact implementation contract: it describes
multiple Kanban writable roots, while the stable client adds one derived board
root. The code controls this assessment.

Tag and commit Git objects were reconstructed and SHA-1 verified; selected
blobs were verified against the complete Git tree and SHA-256. Both inspected
commits and the tag are reported unsigned. Hash integrity is not publisher
signature verification. Latest release and main were rechecked at the end of
the observation interval, 2026-09-13T11:19:40Z–11:23:38Z.

## Two different Codex modes

| Question | Provider `openai-codex` with runtime `auto` | Runtime `codex_app_server` |
| --- | --- | --- |
| Model transport | Hermes calls the Codex Responses endpoint. | Local Codex CLI drives the primary turn. |
| Tool loop | Hermes executes its configured tools. | Codex owns the primary tool loop; configured MCP callbacks can execute Hermes tools. |
| Codex CLI required | No, if Hermes already has valid provider credentials. CLI credential import is an optional fallback. | Yes; code accepts `>=0.125.0`, while the guide says `>=0.130.0`. Neither is a compatibility pin. |
| Shell/file boundary | Hermes backend; local is the default. Codex model selection adds no Codex sandbox. | Codex command sandbox, subject to effective Codex config; Hermes parent and external tools are separate surfaces. |
| Default state | Active provider path unless runtime explicitly changes. | Opt-in; unset/empty/`auto` stays on Hermes loop. |
| Credential state | Hermes auth store, with CLI import/global-profile fallbacks. | Codex home/config/auth plus Hermes auxiliary-provider state. |

The provider/runtime selection is implemented in
[`runtime_provider.py`](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/runtime_provider.py#L237)
and the branch in
[`conversation_loop.py`](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/conversation_loop.py#L1505).
The ordinary path continues through Hermes tool rounds and dispatch. Its
[`terminal_tool.py`](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/terminal_tool.py#L1)
defaults to the local backend; file tools and configured web/MCP providers remain
Hermes-owned. Its dangerous-command approval layer is not OS isolation. Choosing
a Docker/remote backend separately would need its own audit and authorization.

[`auth_codex.py`](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_codex.py#L386)
normally reads Hermes `auth.json`, but recovery can read `CODEX_HOME/auth.json`
or the default user Codex directory and save imported tokens into Hermes state.
Refresh and credential-pool fallback are real behavior, not merely documentation.
[`auth.py`](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth.py#L770)
also allows profile-to-global auth fallback. Separate profile names alone do not
prove separate secrets. No real auth/config files were read in this audit.

## App Server behavior at the stable pin

The opt-in switch checks the executable then persists `model.openai_runtime`.
Its version helper uses `MIN_CODEX_VERSION = (0, 125, 0)` despite the stable
guide's 0.130.0 prerequisite; this discrepancy requires exact-version validation.
It invokes migration: existing user MCP servers, installed Codex plugins and the
Hermes callback are added to Codex config, with `default_permissions = ":workspace"`.
Discovery failure is nonfatal; the switch is not a transactional, fail-closed
admission procedure. See
[`codex_runtime_switch.py`](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/codex_runtime_switch.py#L145)
and [`migration`](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/codex_runtime_plugin_migration.py#L394).
In particular, `migrate()` defaults to `Path.home() / ".codex"`; the switch does
not pass an explicit home. Setting `CODEX_HOME` is insufficient evidence that
this migration will write only there. Do not run the convenience enable command
for a constrained Worker profile.

The [client constructor](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex_app_server.py#L45)
spawns `[codex_bin, "app-server", *extra_args]` with three pipes, no shell, and
Windows hide flags. It does not supply subprocess `cwd`; the parent cwd is
inherited. It starts two reader threads and uses newline-delimited JSON-RPC,
`initialize` then `initialized`. No explicit experimental capability is enabled
by the normal session. The public constructor accepts extra arguments and an
environment overlay; the standard session does not forward a sealed Worker
argument/environment contract.

The [session](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex_app_server_session.py#L180)
sends only `{cwd}` at `thread/start`, then thread ID plus text at `turn/start`.
**Neither request pins model, reasoning, sandboxPolicy, approvalPolicy, writable
roots or ephemeral state.** The stored permission-profile attribute is logged,
not sent as an enforcement policy. Codex therefore resolves omitted fields from
its configuration. Matching Hermes UI model metadata is not proof of the actual
Codex model. Cwd comes from session/config/environment/current-directory helpers,
not a trusted Roost repository allowlist.

The [integration](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/codex_runtime.py#L382)
reuses one session per AIAgent across turns. No Roost input seal, lease, branch pin
or safe checkpoint-resume binding is passed. This route starts a new Codex thread;
it does not implement a pinned `thread/resume` contract after restart. Hermes
persists projected messages and usage separately. Post-turn memory sync and
background review can run; goal continuation and auxiliary calls can add model
work outside the primary turn. The full conversational wrapper is broader than
a single admitted Worker execution.

Environment handling has improved: the
[local environment helper](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tools/environments/local.py#L302)
removes listed internal secrets, but starts from `os.environ.copy()` and the client
requests `inherit_credentials=True`. Unknown secrets, provider credentials and
ambient paths are not a closed allowlist; caller overlays run afterward. Owned
Kanban context additionally changes MCP environment and adds an external writable
root. A coding Worker must not inherit that context.

Approval requests default to denial without a callback; permission requests are
declined and unknown methods receive an error. Explicit bypass flags can accept
exec/patch approvals, and session approval choices can persist. MCP elicitation
for `hermes-tools` is auto-accepted. These behaviors do not substitute for an
immutable `approvalPolicy=never` inside independently proven containment.

The [Hermes MCP callback](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/hermes_tools_mcp_server.py#L38)
exposes web, browser, media, skills and Kanban operations. It excludes terminal,
file/search/process, delegation, memory/session-search and todo from this callback.
Dispatch still runs Hermes handlers in another process; native shell sandboxing
does not prove callback or connector network/credential isolation. No dynamic
tools are supplied by the session, but that does not disable config-discovered MCP.

Turn polling defaults to 600 seconds, with a 90-second post-tool silence watchdog.
Startup/RPC time and synchronous callbacks are not one execution-wide deadline.
There is no hard byte, token, cost, CPU or memory cap on the complete invocation.
Notification/request queues and `readline()` are unbounded; stderr retains 500
lines of unbounded size. `close()` terminates/kills the direct child only.
`turn/interrupt` has a five-second RPC timeout, not descendant-stop attestation.

The session's normal turn enables `accept_final_text_at_deadline=True`; a completed
assistant message can be accepted without `turn/completed`. Its terminal-status
handling also does not establish Roost's strict success schema. Errors can include
stderr tails and exceptions. Retirement allows a new process on a later turn;
there is no Roost single-use retry fence. The provider's separate Responses path
also has transport retry logic. Accounting is observational, not an enforced cost
ceiling. These findings agree with the earlier
[offline transport examination](../operations/hermes-windows-attestation.md#offline-transport-examination-adapter-blocked),
which was not rerun here.

## What official Codex documentation establishes

[Sandbox documentation](https://learn.chatgpt.com/docs/sandboxing) separates OS
enforcement from approval prompts. `workspace-write` is a command write boundary,
not whole-host secrecy or complete process containment. Common temporary roots
can be writable too. [Security documentation](https://learn.chatgpt.com/docs/agent-approvals-security)
describes network-disabled command execution, protected `.git`, `.agents` and
`.codex` paths, and explicitly separates command networking from web search,
MCP, connectors, browser and other service connections. Model transport itself
also needs its independently controlled network path.

[Windows documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox)
prefers native elevated setup: dedicated lower-privilege users, filesystem ACLs
and firewall rules. Unelevated mode uses a restricted token and environment-level
offline controls and is weaker. Windows 11 is recommended; recent Windows 10 is
best effort. Neither documentation nor this audit proves denial of this host's
Docker named pipe, WSL control APIs, other repositories or every secret file.
No existing sandbox setup, ACL or firewall was changed or tested.

[Permissions documentation](https://learn.chatgpt.com/docs/permissions) describes
Seatbelt on macOS and bubblewrap/seccomp on Linux/WSL, with Landlock compatibility
paths. The Hermes guide's simple seatbelt/Landlock wording is not the complete
current platform picture. Beta permission profiles can restrict reads, writes
and socket/network access, but do not compose freely with legacy sandbox config.
This assessment does not claim those beta profiles work with Hermes's minimum
Codex version. Legacy workspace-write alone does not establish zero outside reads.

[Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
supports explicit sandbox/approval values, writable roots and temporary-root
exclusions, environment policy, disabled web search and managed constraints.
[Config layering](https://learn.chatgpt.com/docs/config-file/config-basic) includes
user and trusted project configuration. A task cannot gain authority by merely
asking, but a task-writable config or unchecked inherited layer is a separate
attack surface. The Worker must inspect effective policy and require immutable
machine constraints; a prompt or clean PATH is not that boundary.

The [App Server API](https://learn.chatgpt.com/docs/app-server) supports explicit
thread/turn settings and ephemeral threads. For `workspaceWrite`, omitted
`readOnlyAccess` defaults to full read access; the API also describes restricted
read roots. That supports a narrower candidate, subject to platform enforcement
proof, rather than treating write confinement as read confinement. It also exposes powerful APIs such
as unsandboxed `thread/shellCommand` and experimental process spawning. A Worker
must allowlist the protocol it sends and handles. Do not infer that every RPC is
sandboxed. The public package metadata observed `@openai/codex` **0.154.0**, with
Windows x64 package **0.154.0-win32-x64**. Metadata integrity values are pinned in
the manifest; no package, binary or publisher attestation was downloaded or run.
The existing registry's observed alpha CLI remains unchanged and unqualified.

## Admission matrix

PASS means evidence for the stated static property, never live readiness.
BLOCKED means a concrete missing/incompatible control in the standard path.
UNPROVEN means available evidence does not establish the requirement. Both mode
columns assess the complete Roost requirement, not whether a setting exists.

| Requirement | Provider loop | App Server path | Reason and owner of the missing proof |
| --- | --- | --- | --- |
| Repository/path confinement | BLOCKED | BLOCKED | Arbitrary runtime cwd; Worker must select and revalidate one physical allowlisted repo. |
| Filesystem writes | BLOCKED | BLOCKED | Local backend or ambient config; pin workspace-write, zero extra roots and no outside temp grants. |
| Network | BLOCKED | BLOCKED | Hermes tools and MCP/service channels remain; pin command network off and disable other surfaces. |
| Docker/host lifecycle | UNPROVEN | UNPROVEN | CLI hiding is insufficient; OS denial of sockets, named pipes and lifecycle APIs needs proof. |
| Credentials | BLOCKED | BLOCKED | Auth import/global fallback and environment inheritance; isolate parent and tool identities. |
| MCP/plugins | BLOCKED | BLOCKED | Broad tools or automatic migration/discovery; zero servers/plugins/apps for first proof. |
| Process tree | UNPROVEN | BLOCKED | Client closes only direct child; Worker must own and attest the entire descendant tree. |
| Time/output/cost | BLOCKED | BLOCKED | No complete hard budget; buffers and auxiliary calls exceed one bounded turn. |
| Retries | UNPROVEN | BLOCKED | No execution-wide Roost fence; later-turn recreation and transport retries need explicit accounting. |
| Session/resume | BLOCKED | BLOCKED | Persistent conversation state; no ephemeral or sealed resume contract in standard session. |
| Task/context binding | BLOCKED | BLOCKED | No Worker seal/lease; App Server request omits exact model and reasoning too. |
| Windows compatibility | UNPROVEN | UNPROVEN | Platform support is documented; exact installed pair and effective confinement were not tested. |
| Audit evidence | PASS | PASS | Reproducible static release/source/doc assessment, explicitly no runtime proof. |
| Release authority | BLOCKED | BLOCKED | Provider tools do not enforce Roost's separate delivery mandate; preserve Worker/API denial. |

Totals: provider **1 PASS / 9 BLOCKED / 4 UNPROVEN**; App Server **1 PASS /
11 BLOCKED / 2 UNPROVEN**. No row authorizes execution.

## Responsibility and proposed constrained configuration

Roost owns tasks, accepted context, capability/release decisions, budgets and
durable queue/results. Worker owns the immutable provider envelope, canonical
repo/branch/commit, one-writer lock, lease/context stop, process tree, hard capture
and deadline, and evidence. Hermes may supply an explicitly bounded adapter;
its scheduling, goals, memory and gateway must not become another authority.
Codex owns model/tool execution and verified OS command sandboxing. OpenShell
could add separately justified whole-process containment, but it cannot repair
missing model/context binding, budgets or release authority by itself.

The existing [Worker contract](local-codex-agent-runtime.md) already provides
allowlist/input/lease/context/lock controls and rejects unproven output and host
lifecycle isolation. Observe mode must remain unchanged. The
[read-only broker](worker-readonly-mcp-broker.md) is a later, separate integration;
do not attach it merely because Hermes migration discovers MCP configuration.

Proposed configuration is an admission specification, not a runnable recipe:

- Worker-issued physical repo cwd; fixed executable paths and hashes; exact
  model/reasoning and sealed input checked before a single start/turn.
- Dedicated private Hermes/Codex homes, temp and state under an isolated OS
  identity. No real auth, inherited provider variables, personal home, global
  fallback, Kanban context, project hooks or arbitrary configuration overlays.
- Explicit workspace-write, empty extra writable roots, network false, temporary
  root exclusions, approval never, and effective-policy readback. System/toolchain
  read dependencies need a bounded allowlist; other repositories/secrets do not.
- No migration/enable command, MCP/plugins/apps, web/browser, dynamic tools,
  auxiliary providers, goal continuation, review/memory sync, gateway or autostart.
  Do not claim that one undocumented boolean disables all these surfaces.
- Worker-owned byte-limited pipes and OS descendant containment before any
  upstream reader/spawn; finite startup/turn/stop budgets, one consumed attempt,
  and strict terminal result. Failure retains evidence and denies continuation.
- Fresh ephemeral thread only. Resume remains prohibited until checkpoint,
  context, model, cwd and permission identities can all be revalidated.

If a public upstream API cannot express a requirement, stop before launch rather
than modifying private internals, broadening permissions or patching a maintained
fork. Native Windows elevated-only policy and secret-read denial need separate
attestation; unelevated fallback is not acceptable proof for this requirement.

## Exactly one next atomic task

**RF-HERMES-002: pinned installation/attestation and synthetic transport admission
in the existing private Roost-Agents area.** This is a proposed task, not authority
to execute it now. Reuse the existing Hermes `0.21.2` / `939e45c...` sealed
installation if it verifies; do not reinstall or reseal drift automatically.
For an isolated Codex candidate, use the manifest's exact `0.154.0` Windows x64
package metadata and verify downloaded package integrity, provenance and binary
identity before any separately authorized installation; no floating package pin.

The task should first attest the existing layout and design the public adapter
boundary that owns spawn/pipes. Its synthetic fixture must use an empty temporary
repository and a fixed fake App Server, with no model, auth, real repository,
Docker/WSL access or gateway. Assert exact cwd/model/reasoning/policies, zero tools
and additional roots, one sealed envelope and one turn, no migration/global-home
touches, finite byte/time limits, and complete descendant stop. Inject oversized
lines, stalled callbacks, absent terminal events, process death, policy drift,
late success, duplicate consumption and cancellation. Expected result is either
a bounded adapter candidate or a precise blocker; the current direct-child and
buffer failures must not be restated as a pass. Synthetic success cannot prove
OS sandboxing, token/cost enforcement or activate the worker. No live Codex
app-server/model call is part of that proposed synthetic test.

For that one synthetic attempt, propose 15 seconds for startup, 20 seconds for
the turn, five seconds for confirmed stop and a 60-second outer deadline. Limit
each wire line to 8 KiB and combined captured/queued output to 32 KiB; permit zero
transport retries and one fake server with one intentionally spawned test child.
Keep input within the existing 128-KiB envelope. Enforce limits before buffering,
and attest Windows process-tree ownership before releasing the fake process.
Unsupported containment or drift stops the task before a real provider launch.

## Reproduction and limits

The [assessment manifest](../../config/hermes/source-assessment.json) binds
53 bounded HTTPS GET responses (9,078,952 bytes), 29 selected stable blobs,
three reconstructed Git objects, two complete tree identities, official docs,
package metadata, local contract inputs, all 14 matrix rows and this report.
Raw receipts remain private; repository artifacts contain no operator identity,
deployment paths, secrets or host inventory. A failed exploratory documentation
URL is retained as HTTP 404 evidence and supplies no positive claim.

The [validator](../../scripts/hermes_source_assessment.py) checks completeness,
fixed identities, Git object/tree/blob hashes and report/contract drift offline.
Its synthetic tests exercise omissions, duplicate identities, altered statuses,
authority expansion, malformed input, evidence drift and path escape. A valid
assessment means a consistent dated audit, not a current-release claim or an
installation, enforcement, pilot or production approval.

Docker continuity is checked through bounded read-only Engine/container/network/
volume/image listings. Full application, upstream, model and adversarial runtime
tests are outside this task. Existing OpenShell artifacts and admission gates
remain intact. No automatic next task follows this assessment.
