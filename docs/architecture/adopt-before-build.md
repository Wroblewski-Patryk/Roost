# Adopt-before-build and execution providers

Contract version: **2**. Status: private Windows installation attestation implemented,
execution disabled; Hermes compatibility **unproven**. This contract does not authorize installation,
model calls, application work or activation. The machine-readable
[registry](../../src/modules/agent-runtime/execution-providers.json) pins the
adopted reference and intended runtime; it is versioned with this contract.

## Adoption rule and authority

Prefer maintained complementary upstream components over a new Roost subsystem.
Evaluate capability fit, license, pinned identity, security, resource overhead,
failure and rollback before adoption. Do not fork, vendor or copy their source
into Roost. An update is an explicit reviewed change to the registry and private
installation, with regression evidence; a floating release is not a pin.

Roost remains canonical for company context, tasks, Decisions, procedures,
permissions, mandates, budgets, queue, audit and execution state. Local Worker
owns security admission, execution lease, one writer, canonical repository,
process lifetime, stop and recovery. A provider supplies transient inference
and tool interaction inside that boundary; it is not a workflow engine.

`direct_codex` is the existing CLI reference/fallback. The recorded CLI version
is an observed comparison reference, not a new forced update or proof of binary
provenance. Legacy hosts without a provider declaration retain this path and all
existing gates. Its hard output-token enforcement remains unavailable.

`hermes_codex` means the official Nous Research Hermes runtime using Codex,
launched only by Local Worker and accessing Roost through bounded MCP/API.
It is the required target before a local agent pilot; Direct Codex alone cannot
satisfy that prerequisite. An explicitly authorized private installation can now
be checked by Worker; the only implemented Hermes command is a guarded version
probe. There is no task/inference launcher. The registry covers source, exact version/commit where established,
license, owner, capability, boundaries, update/rollback, readiness, costs and
failure behavior. Missing evidence is explicit, including the reference binary
digest and Hermes resource measurements.

OPA, Temporal, Herdr, Langfuse and Infisical remain future candidates. They are
not dependencies or installed integrations in this stage. Each needs a separate
bounded adoption decision and complete registry entry before use.

## Private configuration and safe diagnostics

The optional `executionProvider` object belongs only in the private host JSON
selected by `ROOST_AGENT_HOST_CONFIG`, outside source repositories. Omission
selects `direct_codex`; an explicit malformed/unknown declaration blocks work.
For Hermes its accepted fields are:

| Field | Contract |
| --- | --- |
| `kind` | `hermes_codex` |
| `enabled` | Defaults false; true does not override compatibility gates |
| `officialSource`, `version`, `commit` | Exact official source and pin from the registry |
| `executablePath` | Explicit normalized Windows drive-absolute `.exe`, private only; no PATH lookup, shell, UNC, traversal or symlink alias |
| `attestation` | Private canonical `manifestPath` and SHA-256 of the sealed installation manifest; exact two fields |
| `policy` | Exact keys/values of registry `hermesPolicy`; unknown fields rejected |

The policy permits only the `roost` MCP server and the two exact read tools in
`minimumTools`: connection and the bounded task-context packet. No wildcard or
extra tool, parallel tool calls, prompts, resources or sampling is permitted.
No direct PostgreSQL, arbitrary filesystem, extra MCP server, or Roost key
inheritance into Hermes/model processes is permitted. A future Worker-owned
broker must keep credentials outside the provider environment and enforce the
same task, workspace and tool restrictions on every request and rediscovery.
Hermes memory, kanban, schedules, delegation and sessions have no independent
authority. Configuration declarations are requirements, not proof that upstream
will enforce them. Broker isolation and these restrictions are **unsatisfied**
until demonstrated in the next-stage PoC; no broker is implemented here.

`npm run agent:provider:check` reads private configuration, checks an explicitly
configured sealed installation and can execute only `hermes.exe --version` after
integrity and read-only-directory checks. It never installs or downloads anything.
It returns provider kind, pinned/installed version, a fixed installation projection
and fixed blocker codes. Exit 0 means
the reference provider path is supported, not execution or pilot readiness;
2 means provider blocked, 1 means unreadable configuration. Filesystem errors
and configuration contents are never emitted. The ordinary workspace checker
remains separate and is not installation evidence.

The host sends only this projection in `metadata.executionProvider`. API writes
and reads normalize the projection; `executionProviderConfig` is discarded.
Private provider paths, credentials, arbitrary version strings and error text
have no provider wire representation. The observer no longer reports its
private workspace root. Existing unrelated metadata contracts are unchanged.

The installation projection contains `status`, exact registry `version`, a
12-hex manifest fingerprint, ISO `checkedAt`, and `signature:unsigned`; missing
or malformed evidence becomes `unverified` with null values. This is a
Worker-reported diagnostic snapshot under the private operator's trust boundary,
not remote cryptographic attestation or proof against an administrator who can
replace both config and manifest. API normalization never treats it as authority.
The manifest covers the complete checkout (including Git metadata and venv) and
base Python installation, rejects missing/extra/changed/linked files, checks the
four public source hashes, detached HEAD, venv isolation and the launcher's exact
canonical Python binding. A generated console launcher is not an upstream signed
native binary. Full checks and probe are bounded diagnostics; private installation
and rollback requirements are described in [Windows Hermes attestation](../operations/hermes-windows-attestation.md).
The result is a startup/config-change snapshot, reused for heartbeats with its
original timestamp. Restarting Worker or running the standalone checker obtains
fresh evidence. This avoids repeatedly scanning Python on every heartbeat; it is
not continuous tamper monitoring. Any future execution admission requires fresh
integrity/containment proof and cannot reuse this diagnostic cache.

`/v1/agent-runtime/readiness` exposes the public registry and a separate
`pilotReadiness` with `ready:false`. Host runtime diagnostics and owner
connections show fixed provider/version/blocker information in PL/EN. A missing
Hermes installation is expected not-ready state: no incident or install loop.

## Admission and failure semantics

Both API request admission (claim/recovery) and Worker admission independently
reject Hermes with `hermes_compatibility_unproven`, regardless of configuration,
host-reported readiness or the API execution flag. The Worker keeps heartbeat
diagnostics while blocked, before recovery, writer lock, claim or spawn. It also
rechecks its provider at the existing immediate pre-spawn boundary. Observer
mode continues to register/heartbeat without claims even when execution is
enabled remotely. There is no automatic fallback or provider substitution.

Future provider admission must preserve protocol/capability checks, Ready and
context seals, current Decisions and risk, branch/path/origin allowlists, one
writer, lease fencing, redaction, duration and output budgets, process-tree stop,
context invalidation and checkpoint reconciliation. Metadata cannot attest any
of these guarantees or expand task authority. Contract v2 always fails closed
for Hermes; changing that requires code, evidence and separate activation
authority, not a local `ready` switch.

## Next stage only: private Windows compatibility PoC

Do not start this stage as a side effect of shipping installation attestation. Its
bounded input is a verified private installation of the exact registry source
commit, with dependency/build provenance and executable/environment digests.
Preserve the previous environment/config and a rollback path. No
unattended installer, floating download, credentials or private paths in Git.

Use an isolated synthetic fixture and the same pinned packet, model/reasoning
settings and read-only Roost MCP tools for Direct Codex and Hermes. Keep real
execution false and the production host in observe mode. No application file,
business record, task queue, Decision or production permission writes. The
Worker-owned broker must scope context to the synthetic task; the provider must
not receive a Roost key. A generic Reader key or upstream tool filter alone is
not evidence of this boundary.

Acceptance evidence must cover official identity, installed version/digest,
Windows executable/process-tree behavior, Codex backend compatibility, exact
tool discovery and rediscovery, prompt/resource/sampling denial, serial MCP,
credential and filesystem isolation, denial of extra tools/database/network
routes, and no authority from internal memory/kanban/delegation/schedules.
Compare response/trace correctness, latency, disk/RAM and model/token overhead
on identical input. Exercise cancellation, timeout, context change, lease loss,
crash/restart and budget limits using synthetic processes. Unprovable hard
output-budget or containment guarantees remain blockers; do not relabel them
as policy compliance. Stop at the first boundary breach, retain private redacted
evidence, restore the prior environment, and leave production in observe mode.
A successful read-only PoC still does not authorize a mutating pilot.

## Sources and verification

Official [Hermes release v2026.9.11](https://github.com/NousResearch/hermes-agent/releases/tag/v2026.9.11)
pins package 0.21.2 at commit
`939e45c91d751fadd94dcd1b873ac3cb44846213` (MIT).
The [upstream repository](https://github.com/NousResearch/hermes-agent) declares
Windows support; that is not Roost compatibility evidence.
[MCP documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
describes tool filtering and configurable parallel calls; the stricter Roost
boundary above still requires a PoC.
[Codex upstream](https://github.com/openai/codex) supplies the reference CLI
(Apache-2.0). No upstream source was vendored.

Contract tests: `npm run test:agent-provider`; existing host protocol, lease,
writer, Ready/context, budget and recovery suites remain regression gates.
RF-CTX-021 was already delivered in `db0227e667bebe2adc429b2619f63af2f2a30377`;
the [traceability correction](traceability-matrix.md#e-find) records that evidence
without expanding Finding scope or completing RF-CTX-022/023.
