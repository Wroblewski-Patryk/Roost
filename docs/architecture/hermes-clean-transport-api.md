# Hermes clean transport API assessment

Subsequent decision: [ADR-001 v1](../decisions/ADR-001-direct-codex-app-server-pilot.md)
accepts option C in RF-HERMES-004. The recommendation and next task below record
the RF-HERMES-003 assessment date; that decision is now resolved. Findings,
receipts and proof limits remain historical evidence, with admission still closed.

RF-HERMES-003, 2026-09-13. **HERMES-CLEAN-TRANSPORT-API-BLOCKED**.
In the exact official Hermes `v2026.9.11` / package `0.21.2` source at commit
`939e45c91d751fadd94dcd1b873ac3cb44846213`, no supported public interface was
found that both owns a Codex App Server connection and avoids configuration,
provider/plugin discovery and filesystem mutation attempts during import and
initialization. Several useful helpers import cleanly; they are not an App
Server client or a complete session API.

This is a bounded offline assessment of the existing
[RF-HERMES-002 installation](../operations/hermes-linux-synthetic-transport.md),
not a claim about other releases. No installation, dependency, upstream source,
Worker implementation, registry, service, autostart or production admission was
changed. `executionSupported`, `pilotReady`, and `liveAdmissionAllowed` remain
false. The [current provider contract](adopt-before-build.md) still requires its
existing approval gates; the recommendation below does not replace that contract.

## Official surfaces and import graph

The pinned source contains publicly importable `CodexAppServerClient` and
`CodexAppServerSession` classes, and upstream tests exercise the session's public
`client_factory` parameter. That is evidence of an implemented injection seam,
not a documented stable, side-effect-free library SDK. The transport namespace
exports response types and a provider normalization registry; it does not export
an alternative clean App Server connection factory. The compatibility manifest
entry for the client concerns old `field`/`time` imports, not another lifecycle API.

The relevant import path is:

`codex_app_server_session -> codex_app_server -> tools.environments.local ->
local_env_policy._build_provider_env_blocklist -> hermes_cli.auth/config ->
config._inject_profile_env_vars -> providers.list_providers -> plugin discovery`.

Configuration also enumerates bundled platform plugin manifests. The client
alone therefore retains the offending dependency chain; avoiding the session
does not remove it. The session additionally imports response formatting,
prompt-building and redaction helpers. These observations come from the
unchanged source, not from directly loading a private file or substituting modules.

Five clean imports were observed: response types, event projector, transport
namespace, Responses normalization module and `agent.codex_runtime`. Their limits
matter: the namespace's `get_transport()` discovers provider normalizers; the
Responses module explicitly does not own client lifecycle or streaming;
`agent.codex_runtime` delays its session import until a function taking the parent
`AIAgent` is called. Its `_ensure_codex_session` then imports the same session,
terminal approval helpers and constructs a session. A clean lazy import does not
establish clean execution. The event projector can convert a synthetic event to
a message without any connection, process, authentication or model.

Primary source anchors, all read locally from the attested commit:

| Subject | Pinned upstream source |
| --- | --- |
| Client constructor, environment overlay, spawn and raw RPC | [codex_app_server.py, lines 20–116 and 156–187](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex_app_server.py#L20) |
| Session injection and actual thread fields | [codex_app_server_session.py, lines 151–198](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex_app_server_session.py#L151) |
| Actual turn fields | [same session, lines 326–354](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex_app_server_session.py#L326) |
| Lazy full-agent runtime | [codex_runtime.py, lines 382–410](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/codex_runtime.py#L382) |
| Supported injection in upstream tests | [test_codex_app_server_session.py, lines 121–126](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/tests/agent/transports/test_codex_app_server_session.py#L121) |
| User-facing optional runtime and side features | [runtime guide](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/website/docs/user-guide/features/codex-app-server-runtime.md) |
| Shipped console entry points | [pyproject.toml, lines 391–394](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/pyproject.toml#L391) |

## Required Worker fields

The raw client's `request(method, params)` can carry arbitrary JSON fields. This
is wire expressiveness, not enforcement or a typed policy contract. An external
client supplied through the session's factory could add its own validation and
fields, but that neither cleans the upstream import nor proves Hermes controls.

| Field | Public client | Public session / shipped full-agent path |
| --- | --- | --- |
| Executable | `codex_bin`; no hash check | `codex_bin` reaches factory; full-agent construction leaves default `codex` |
| Exact argv | Fixed `app-server` plus `extra_args`; context can add Kanban overrides | No `extra_args` parameter; factory receives only `codex_bin`, `codex_home` |
| Exact env | `env` overlays inherited filtered env, not replacement | No env parameter; external factory must own it |
| Process cwd | No `cwd` passed to `Popen`; inherited | `cwd` is sent in `thread/start`, not a process-cwd guarantee |
| Sandbox policy | Can send raw request/config arguments; no typed enforcement | `permission_profile` is stored but deliberately not sent in `thread/start` |
| Approval policy | Raw request field possible | Callback and private routing object; no exact `approvalPolicy` wire field at start |
| Model | Raw request field possible | Neither thread nor turn start sends model |
| Reasoning effort | Raw request field possible | `run_turn` has no effort parameter and sends no effort field |
| Ephemeral session | Raw request field possible | No ephemeral parameter or start field; parent path persists session history |
| Callbacks | Notification/server-request queues and response methods | Public `approval_callback`, `on_event`, `client_factory`; these do not seal other fields |

The in-memory initialization probe confirms factory keys
`codex_bin,codex_home`, initialize metadata keys
`client_name,client_title,client_version`, and only `cwd` in `thread/start`.
No turn was run. Turn-field omissions were verified statically. The helper's
recording object uses the public injection parameter, not `sys.modules` stubs,
private-method monkeypatching, copied upstream classes or a complete adapter.

## Controlled dynamic evidence

The [probe](../../scripts/hermes_clean_import_audit.py) runs each case in a fresh
non-root Linux `python -I -S -B` process. It verifies the existing 17,356-entry
installation receipt before adding the attested source and installed dependency
directories to the normal import path. No `.pth` startup code is executed.
Public modules are imported by module name; no private source-file import is
used as a solution.

Each process receives exactly HOME, four XDG directories, TMPDIR, minimal PATH,
LANG, LC_ALL and PYTHONDONTWRITEBYTECODE. Two cases additionally receive an empty
synthetic HERMES_HOME. Every home/state directory starts empty. Audit hooks deny
filesystem mutations, descriptor write-opens, environment changes, network
operations, process creation and reads/enumeration outside explicit code/stdlib/
synthetic roots. The local hostname syscall is allowed; no hostname value is
recorded. Profiling counts selected configuration/discovery calls without
replacing upstream functions. Denials remain failures even when upstream catches
the exception. Real auth/config files are outside the read allowlist.

The retained output contains operation categories, counts and paths relative to
synthetic roots only. Other paths become `outside-synthetic`; descriptors and
process/network arguments become `not-a-path`. Raw stdout/stderr diagnostics and
environment values are not persisted. A 10-second probe alarm and 20-second outer
process limit bound each case; combined captured output is capped at 32 KiB.
This Python audit mechanism is not a hostile native-code or OS sandbox proof.

| Final matrix (15 cases) | Observed result |
| --- | --- |
| Types import + value construction | Clean; no prohibited modules/calls/operations |
| Projector import + synthetic projection | Clean; actual upstream projection works without connection |
| Transport namespace import | Clean import only; no registry discovery invoked |
| Responses normalization import | Clean import only; no App Server lifecycle |
| `agent.codex_runtime` import | Clean lazy import only; runtime function not invoked |
| Client import, default HOME | Two denied mkdir attempts at `synthetic/home/.hermes`; configuration/provider discovery |
| Session import, default HOME | Same two denied mkdir attempts and discovery |
| Client import, explicit HERMES_HOME | Two denied mkdir attempts at `synthetic/hermes`; discovery remains |
| Session import, explicit HERMES_HOME | Same explicit-home result |
| Client constructor after guarded import | Import remains dirty; initialization additionally attempts descriptor write-open and loads further agent/gateway definitions; stopped before subprocess |
| Session constructor + in-memory `ensure_started` | No additional forbidden initialization operation; import remains dirty; only cwd passed to thread start |
| Negative control: write | Denied before creating `synthetic/must-not-exist` |
| Negative control: outside read | Denied before opening a nonexistent outside sentinel; no real user file used |
| Negative control: network | Denied at socket creation, before connect/DNS |
| Negative control: subprocess | Denied before starting a nonexistent synthetic executable |

Each dirty client/session import loads category counts of 12 auth-definition,
4 configuration, 9 plugin-code, 41 provider-definition and 9 local-environment
modules. Selected-call counts include six configuration initialization and 42
provider discovery calls. No tracked auth-resolution operation was observed.
These counts describe this pin and these probes, not arbitrary initialization.
No denied write, process or network operation was allowed to continue. All
synthetic directories and environment mappings were unchanged and owned temporary
directories were removed. The two mkdir targets refine RF-HERMES-002's earlier
coarse mutation evidence without rewriting that historical receipt.

The final matrix followed an initial positive smoke and a preliminary matrix
(31 controlled probe processes in total). The final guard separately classifies
descriptor opens and allows reads of its own known harness code for version
metadata discovery; filesystem mutation, network and process denials were not
relaxed. The final matrix receipt SHA-256 is
`888420e3e3679e4caf6f573c832fea4a3e2ab3ad064424a02790c5b677d07da7`.
The final private assessment receipt binds that matrix, exact probe/test bytes,
18 relevant source hashes, constructor/method signatures and unchanged
installation inventory; its SHA-256 is
`5b20760215210aa7d0ae6fef6d60e3fa2fad73d4207b2518e4cfa8aec018ed8e`.
Raw private installation paths and host inventory are not distributed.

## A / B / C comparison and recommendation

| Variant | Assessment |
| --- | --- |
| A. Clean supported library API | BLOCKED in this pin. Public connection/session classes have dirty imports; clean helpers lack connection and complete Worker contract. |
| B. Separate Hermes CLI/process with isolated configuration | Not qualified. HOME isolation changes where initialization occurs; it does not eliminate discovery. The shipped `hermes`, `hermes-agent`, `hermes-acp` entries lead to full CLI/agent/ACP behavior, not a clean App Server bridge. No end-to-end contract sealing all required fields was found. No CLI was executed. |
| C. Direct bounded Codex App Server in Worker, Hermes optional later | Recommended direction for a separate architectural decision. It removes this dependency from the execution-critical path, but still needs real-server, OS containment, authority, output and cost qualification. RF-HERMES-002's independent fake tests do not qualify Hermes or real Codex. |

The user guide explicitly retains sessions, MCP callbacks, plugins, memory/skill
review and auxiliary behavior around the optional Codex runtime. Enabling via its
CLI command persists configuration and migrates MCP/plugins. Manually isolating
configuration is possible, but is not evidence that every required field is
sealed or these initialization paths disappear. The full-agent constructor does
not propagate executable/env/argv/model/effort/ephemeral controls into the session.
ACP is a different protocol endpoint and loads Hermes environment/agent state;
it does not repair this boundary. None of these paths was dynamically launched.

Exactly one recommended next atomic task: **RF-HERMES-004 — obtain and record an
explicit architecture decision on removing mandatory Hermes from the execution
path, preserving the existing Worker authority/input/policy/budget/stop contract
and all disabled admission gates.** Variant C is a recommendation, not an
implemented or implicitly approved provider replacement. No real Codex/model
test, issue/PR publication, push or deployment follows automatically.

## Verification and operational limits

All 15 final outcomes match the table; all four forbidden-operation controls
blocked before their target operation. Six portable regression tests in
[test_hermes_clean_import_audit.py](../../scripts/test_hermes_clean_import_audit.py)
cover mutation/descriptor distinctions, network/process/env denial, read roots,
path normalization, event bounds and helper classification. Existing installation
attestation is reused; no wrapper process tests are counted as Hermes integration.
Full application, upstream agent/model/CLI and OS-sandbox suites are out of scope.

Read-only native Docker snapshots matched container identity, running/paused/
restarting/dead state, exit code, start timestamp and restart count, alongside
Engine/network/volume/image inventory. Existing application containers remained
unchanged. No Docker/WSL reset, restart, distribution termination, socket cleanup
or prune is part of this task. Existing OpenShell evidence and configurations
remain intact; OpenShell supplies no Hermes–Codex transport API.
