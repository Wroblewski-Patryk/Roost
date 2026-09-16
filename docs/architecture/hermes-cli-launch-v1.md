# Native Hermes CLI launch contract v1

**Historical stream-only qualification.** RF-RUNTIME-005A (2026-09-16)
[supervised quiet v1](hermes-supervised-quiet-v1.md) supersedes the requirement to
wait for compatible stream-json for the first supervised pilot only. Active stable
0.21.2 is retained; newer-pin rejection remains historical evidence. Current
native/configuration blockers and all false runtime gates remain. The next-task
and unchanged-adapter statements below describe this document's original task.

RF-RUNTIME-002, 2026-09-15. Adapter: `roost-hermes-cli-launch-v1`.
Decision: [ADR-004 accepted](../decisions/ADR-004-native-hermes-codex-pilot.md).
Verdict: **PUBLIC-CLI-TRANSPORT-SPECIFIED; HERMES-LAUNCH-BLOCKED**.

[RF-RUNTIME-003 installation preflight](hermes-windows-installation-preflight-v1.md)
now proves the registry pin's chat parser lacks --format. Its compatibility
blocker is known, not merely untested; installation stopped before mutation.
The candidate below specifies the target public interface, not argv supported
by the current pin. The RF002 research and validation below remain dated evidence.
The [RF004 replacement proposal](hermes-replacement-pin-proposal-v1.md) also rejects
stable 0.21.3: identical parser, no compatible JSONL emitter. Active pin and adapter
remain unchanged; the next task is RF005's stable upstream protocol gap.

## Official interface and limits

Primary sources opened on **2026-09-15**; current documentation is not a binding
to the historical registry source pin or a tested private Windows installation.
No package/source checkout, installer or executable was downloaded or invoked.

| Source | Evidence |
| --- | --- |
| [NousResearch README](https://github.com/NousResearch/hermes-agent) | Native Windows CLI, TUI and tools are supported without WSL; supporting Python/Git Bash dependencies exist. Support does not prove a particular launcher's byte identity or child closure. |
| [Public CLI reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) | `chat --oneshot --query-file - --format stream-json --provider openai-codex --model MODEL` is documented. Input is stdin, not a shell-interpreted prompt argument. JSONL emits init, text, tool-use/result and one terminal result; terminal process and result exit codes agree. Quiet mode is not a no-tools mode. Finite chat can still delegate. max-turns counts tool iterations, not independent user queries. |
| [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) | agent.reasoning_effort, per-model reasoning overrides, disabled toolsets and memory switches exist. API retries and primary/auxiliary fallbacks are separate settings; zero API retries does not disable fallback. No immutable, effective configuration receipt for the installed pin has been established. |
| [Environment reference](https://hermes-agent.nousresearch.com/docs/reference/environment-variables) | HERMES_HOME scopes configuration; Windows Git Bash selection can be explicit. HERMES_WRITE_SAFE_ROOT limits write_file/patch targets, not all shell/OS effects. It is not whole-process workspace isolation. |
| [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) | Explicit includes and disabling resources/prompts narrow MCP registration. Startup discovery and dynamic updates still require Worker enforcement; native tools remain separate. |
| [Model providers](https://hermes-agent.nousresearch.com/docs/integrations/providers) | Codex OAuth uses the openai-codex provider without requiring Codex CLI. Hermes documents private auth persistence and optional credential import; no import is proposed. Subscription eligibility/quota accounting is not established for this installation. |

The CLI reference also documents safe-mode disabling customizations including
MCP; ignoring user configuration still loads credential environment data. These
flags are not proof of no startup/state mutation, and safe-mode cannot stand in
for a functioning allowlisted Roost MCP configuration. No guessed reasoning,
ephemeral, no-memory or no-fallback flag is emitted. The requested reasoning is
retained as an explicit required config value, not silently dropped or defaulted.

## Implemented boundary

[Provider launch preparation](../../scripts/lib/agent-host-provider-launch.mjs)
separates dispatch from codexExecutionArgs in the existing Worker. Direct CLI
keeps the same command, argv, stdin and process options. Hermes uses only the
existing Worker-issued sealed roost-provider-input-v1, current model/effort policy
and fixed registry identity/pin. A blocked candidate projection has command=null
and args=null; documented candidate arguments are non-operative inspection data.

Hermes config is closed: no caller-supplied flags, cwd, model, reasoning, MCP URL,
extra tools, fallback or credentials. Existing private config/attestation fields
remain declarations, not accepted evidence. Only normalized drive-absolute EXE
paths are allowed; no UNC, relative/PATH discovery or shell shim. The cwd is
provided internally by Worker after existing physical-path/origin/application
allowlist checks, never provider input. Projection's lexical path check is not a
replacement for those checks or executable hashing. One query and one attempt
are required; retry-enabled packets are denied.

Final launch preparation consumes the existing one-use envelope and revalidates
fresh authority/context. Failed admission burns it. Hermes then unconditionally
throws hermes_public_launch_contract_unqualified, before spawn and without a
Codex fallback, even if an outer guard is accidentally relaxed. Public provider
metadata includes fixed capability blockers; existing API/Worker admission and
the output-budget refusal remain intact. No environment/config file is generated,
broker started, credential read or process launched for Hermes.

[The public JSONL guard](../../scripts/lib/agent-host-hermes-stream.mjs) supplies
bounded synthetic protocol validation for future integration: matching init/model/
session, one result, exit agreement, known event order, bounded bytes/lines/events,
deadline/cancellation checks and redaction including text split across deltas.
All tool events currently fail because no tool boundary is qualified. Detection
after a tool event is not prevention of that tool's side effect. The decoder is
not connected to live Hermes and has no process-stop or billing enforcement claim.
Its receipt explicitly reports treeStopped=false and reported_final_only usage.
Deadline checks on input/finish are not an independent timer for a silent process;
an admitted future runner must use Worker's active deadline and owned-tree cleanup.

The [versioned capability declaration](../../scripts/lib/agent-host-hermes-launch-contract.cjs)
sets one query, one attempt, no retry and capture ceilings of 131072 stdout bytes,
32768 stderr bytes, 16384 bytes per line and 256 events. Lifetime comes from the
existing accepted packet (maximum 3600 seconds), not a new default. These capture
limits are not hard model token/cost or guest-memory quotas. No public field can
turn execution on. No new task store, scheduler, custom runtime wrapper or private
Hermes import/API is introduced.

## Remaining capability blockers

| Fixed reason | Exact missing evidence |
| --- | --- |
| hermes_public_launch_contract_unqualified | A complete admitted combination of public CLI, pinned private config, tools/auth boundaries and Worker lifecycle, not absence of a one-shot CLI. |
| hermes_cli_pin_incompatible | RF-RUNTIME-003 confirms the pinned chat parser has no --format argument. An exact compatible official release is required before installation can proceed. |
| hermes_sealed_config_enforcement_unproven | Effective exact reasoning, no fallback/model rotation, no extra retry/turn, no independent delegation/cron/company-memory mutation; controlled startup hooks/plugins/config and only the Worker MCP allowlist. |
| hermes_auth_boundary_unproven | Native OAuth access isolated from model tools and other credentials, with known startup/refresh/storage effects; no credentials in prompt/repository. |
| hermes_native_tools_isolation_unproven | Canonical workspace boundary for all native/tool/OS paths; shell escapes and host control cannot be qualified by a tool-name list or write_file prefix. |
| hermes_output_cost_budget_unproven | Execution-wide hard token/cost controls; final result usage is accounting only. |
| hermes_stop_recovery_unproven | Complete owned-tree stop on success, cancellation, timeout and controller failure, including descendants after root exit; no retry or automatic resume. |

These are explicit evidence gaps, not a claim that upstream cannot ever satisfy
them. Existing no-host-lifecycle and review/release rules remain. No ordinary
owner task approval or accepted provider choice promotes a blocker to PASS.
Windows Sandbox/Hyper-V/disposable VM research is deferred by ADR-004 and is not
the proposed remedy or prerequisite.

## Validation and next task

Focused synthetic tests exercise candidate projection, path/pin/model/effort and
override rejection, secret handling, consumed-input retry denial, direct argv
compatibility, public JSONL state, second turns/results, tools, terminal failure,
capture limits, timeout and cancellation. Direct/provider/input/protocol Worker
regressions are run separately. No real Hermes/Codex/model, credential store,
OAuth, installation, Docker/WSL, VM/Sandbox or production action is part of RF002.

Final verification on 2026-09-15: 241 synthetic Worker/adapter regression tests
and 4 API provider tests passed. Both existing Direct qualification/contract
documentation validators passed without changing their historical seals. New
document links, six closed gates, decision-register structure, JavaScript syntax
and git diff whitespace checks passed. No database or live integration test ran.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; pilotExecutionAuthorized=false;
pilotExecutionStarted=false. This is useful blocked adapter code, not a ready
Hermes installation, admitted runtime or successful agent pilot.

The following RF002 recommendation was attempted and stopped by RF003's known
pin mismatch; RF004 also found no qualified replacement. See the proposal above
for the current RF-RUNTIME-005 upstream gap.
Historical next atomic task: **RF-RUNTIME-003 — exact private
Windows Hermes installation/configuration admission packet.** Select an official
version matching the documented CLI, specify its private dependency/identity
manifest, finite installation resources, isolated config and OAuth ownership,
allowlisted MCP and no-fallback/no-memory/tool restrictions, removal/rollback and
bounded compatibility checks. Inspect only explicitly scoped non-secret evidence;
account for any existing private installation rather than overwriting it. Produce
an exact reviewable installation/configuration grant proposal. No general research
loop, install, OAuth or model run follows implicitly.
