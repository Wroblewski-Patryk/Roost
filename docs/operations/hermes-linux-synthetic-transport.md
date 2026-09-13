# Hermes Linux installation and synthetic transport assessment

RF-HERMES-002, 2026-09-13. **HERMES-TRANSPORT-SYNTHETIC-BLOCKED**.
The pinned private installation verifies, and the independent Worker transport
passes its synthetic suite. Importing the installed public Hermes session has
side effects outside the permitted minimal transport surface. The import guard
denied two filesystem mutation attempts before any fake server was started.
No Hermes session turn or full agent loop was run. Independent transport results
must not be represented as successful Hermes integration.

This follows the frozen [RF-HERMES-001 assessment](../architecture/hermes-codex-isolation-assessment.md).
It does not alter the [provider contract](../architecture/adopt-before-build.md),
[recovery ownership](../architecture/agent-host-recovery.md), existing OpenShell evidence, or the
historical [Windows installation examination](hermes-windows-attestation.md).
`executionSupported`, `pilotReady`, and `liveAdmissionAllowed` remain **false**.
There is no production runner wiring, registration, claim, admission or deployment.

## Installation and provenance

The existing non-root Linux agent area received a new versioned private root.
Source, dependency cache, virtual environment, private tool, fixed fixture and
receipts are retained there. No global PATH, system package manager, service,
autostart, user configuration or previous installation was changed.

| Component | Verified identity |
| --- | --- |
| Upstream | `NousResearch/hermes-agent`, tag `v2026.9.11` |
| Commit | `939e45c91d751fadd94dcd1b873ac3cb44846213` |
| Package | `hermes-agent 0.21.2` |
| Source archive SHA-256 | `eb8e393dd403cc903949c877bb09624d8e961fc7097f097353b34349cdc7223d` |
| Frozen `uv.lock` SHA-256 | `69b130365c9077ac9880c167daa64e39afc5611bb563a79a2fb3c612949beae9` |
| Private installer | `uv 0.11.8`, wheel SHA-256 `d97bb2920d6cddc07faa475013461294cc09b77ec8139278416c6e54b938d037` |
| Build requirements | `setuptools 83.0.0`; previously reviewed build-only `wheel 0.48.0` pin |
| Interpreter | Linux x86-64 Python `3.12.3`; binary SHA-256 `a92f0f95e883390c7256b2e441484aac06b1002dbe1d924141a77c8d82f96223` |
| Private installation receipt SHA-256 | `27be98fd3b658b0c8e26e8203566bca806ce2f3d78f12b3841298d8228eacb7c` |

The RF-HERMES-001 offline validator rechecked the retained Git object/tree
provenance. All 12,679 source files (168,751,994 bytes) match Git blob identities.
The archive was 70,506,408 bytes. Eighteen PowerShell files required restoring
archive CRLF to LF to match the exact Git blobs; this is recorded privately and
does not patch upstream code. No source symlinks were materialized.

The acquisition phase fetched 64 exact dependency/build wheels, totaling
42,830,805 bytes, using HTTPS host allowlists, size bounds and SHA-256 checks.
Compatible wheels came from the frozen lock; no source dependency fallback was
built. `wheel` is not pinned by the upstream lock: the explicit `0.48.0` build
pin comes from the previous reviewed installation contract. This exception is
not a claim that upstream locked that build dependency.

Final installation used offline/no-index/hash-required dependency installation
and frozen/offline editable synchronization, excluding dev/default groups and
disallowing dependency builds. Only the upstream-supported editable Hermes
build ran. The lock stayed unchanged. After installation, 4,358 installed wheel
files were compared directly with verified wheels; a private inventory seals
17,356 source, environment and installer file/link entries plus the interpreter.
The [read-only attestor](../../scripts/lib/hermes_install_attestation.py) rejects
receipt changes, missing/extra/changed files, link drift and interpreter drift.
It offers no automatic reinstall or reseal operation.

## Concrete Hermes blocker

The harness used isolated Python with site initialization disabled, verified
installation bytes first, then explicitly exposed only the verified installed
dependencies and source. It did not execute editable `.pth` startup code.

The attempted public import was
`agent.transports.codex_app_server_session.CodexAppServerSession`. Its transitive
imports include the public client, event projector, response formatting, prompt
builder, redaction, local environment helpers, `hermes_cli.config`, provider auth
definitions and plugin discovery/loader/state modules. The source chain is:

1. `codex_app_server_session.py` imports `codex_app_server.py`.
2. The client imports `tools.environments.local`; its `local_env_policy.py`
   calls `_build_provider_env_blocklist()` at import time.
3. That function imports `hermes_cli.auth` and `hermes_cli.config`.
4. Configuration calls `_inject_profile_env_vars()` at module load, which calls
   `providers.list_providers()` and initiates provider plugin discovery. It also
   reads bundled platform plugin manifests.

The audit guard observed and denied two filesystem mutation attempts.
Upstream exception handlers swallowed those denials, so merely observing an
import return is insufficient. The harness separately checks the denial record
and stops. Two diagnostic imports reproduced the blocked result; neither
started the fake server. No denied mutation was allowed on retry. Exact target
paths, individual mutation event names and caller stacks were not retained by
this guard, so the two mutations are not attributed to a particular directory,
operation or function. The denial covers mkdir/remove/rename/rmdir audit events.

This is an import-surface blocker, not evidence of an authentication request or
model call. No network operations or unowned subprocess attempts were recorded.
No source patch, private-method replacement, fake upstream module, extra
permission, or fallback full agent loop was used to bypass the blocker.

## Independent Worker boundary

The reusable [bounded stdio client](../../scripts/lib/bounded_app_server.py) owns
spawn and pipes before any upstream reader could run. It accepts trusted local
immutable executable/script hashes, argv, cwd, environment and one input
envelope. Task text cannot choose these facts. The public `client_factory`
integration remains an unproven candidate because the session import is blocked.

The environment is constructed from zero: fresh empty HOME and XDG config/data/
cache/state plus TMPDIR, minimal PATH, fixed UTF-8 locale and disabled bytecode.
No user profile, Codex home, provider/worker/GitHub secrets, proxy or Docker
variables are inherited. The fixture returns **names only**, plus a cwd digest.
This is environment discipline, not OS-level denial of other host files.

The Worker sends one initialized ephemeral thread with exact synthetic model,
`approvalPolicy=never`, `sandbox=read-only`, zero dynamic tools, then one exact
input/model/effort turn. The fake validates all fields; no real server interprets
these policies. The boundary denies additional requests, server-side approvals,
tool items, unknown notifications, wrong identities and duplicate consumption.
Only a correctly scoped successful terminal event followed by clean EOF/exit,
current authority and confirmed process cleanup permits success. Final text
alone, Hermes return values and RPC interrupts cannot grant success.

| Limit | Enforcement |
| --- | --- |
| Startup | 15 seconds from spawn intent |
| Turn | 20 seconds from the sole turn request |
| Stop | At most 5 seconds to confirm owned group removal |
| Outer | 60 seconds; only stricter overrides accepted |
| Inbound line | 8,192 bytes including newline, both stdout and stderr |
| Aggregate | 32,768 cumulative inbound wire bytes across both pipes, including already delivered output |
| Input | Existing 128 KiB sealed envelope maximum |
| Retry | Zero transport retries; one consumed turn |

Nonblocking reads are capped by remaining line/aggregate budgets plus one
sentinel byte, before enqueue/persistence. Only bounded raw notification lines
are queued. Stderr is counted and discarded. Byte limits describe wire payload,
not total interpreter heap or kernel pipe allocation. A separate watchdog stops
the owned process group during a stalled consumer callback.

Linux `start_new_session` allocates the owned process group before exec. The
leader is kept unreaped until signals are sent, preventing PID reuse from
redirecting those signals. The disposable harness is a child subreaper and
reaps only children in its owned group. Stop sends TERM and then KILL; no cleanup
relies on `Hermes.close()` or provider interrupt acknowledgement.

## Synthetic results and reproduction

The [opt-in harness](../../scripts/hermes_transport_synthetic.py) and
[fixed fake server](../../scripts/fixtures/bounded_fake_app_server.py) ran the
following **29 independent Worker cases**. `--boundary-only` explicitly skips
Hermes import and can emit only `WORKER-TRANSPORT-SYNTHETIC-PASS`, never Hermes
READY. A selected single case likewise cannot establish full Hermes readiness.

| Cases | Result |
| --- | --- |
| Positive protocol/final/environment names/cwd | PASS |
| Oversized line; combined byte flood; notification flood; stderr flood | 4 expected denials |
| Malformed JSON; duplicate keys; truncated line; wrong order; wrong scope; unsolicited server request | 6 expected denials |
| Unknown/missing terminal status; two completions; absent terminal; nonzero exit | 5 expected denials |
| Startup hang; turn hang; outer hang; stalled callback; nonreading process | 5 expected denials |
| Forked descendant ignoring TERM; authority loss before late terminal | 2 expected stops |
| Duplicate input consumption; policy drift | 2 expected denials |
| Input hash, executable hash, script hash, environment drift | 4 denials before spawn |

Full startup and turn limits were exercised at 15 and 20 seconds. Outer deadline
and stalled-callback tests tightened the outer limit to 0.3 seconds; they did
**not** wait 60 seconds. The additional nonreading-process test tightened startup
to 0.3 seconds. Every process cleanup completed below 0.1 seconds in the retained
suite (maximum 0.0554 seconds). Maximum retained inbound total was 32,151 bytes,
maximum queued payload 1,131 bytes, and maximum line 8,192 bytes.
Each case used a fresh minimal empty Git repository with no clone or worktree;
the repository retained only its initial HEAD file. Owned case/suite directories
were checked for path escape and symlinks and removed after stopped processes.
Installation, cached sources/wheels, fixed harness/fixture and receipts remain
private. Reproduction needs an explicitly provisioned private installation and
fresh owned paths; the repository contains no machine-specific runnable command.

Portable regressions:
`python -B scripts/test_bounded_app_server.py` (4 tests) and
`python -B scripts/test_hermes_source_assessment.py` (11 tests). The latter's
private-evidence validator also passed. No full application, database, upstream
agent, actual Codex, model, auth or sandbox suite was run.

Docker Engine/container names and normalized status, network IDs/names, volumes
and image rows matched exactly before/after in read-only native inventory.
All 16 historical OpenShell configuration JSON hashes were preserved. The Linux
distribution may naturally start or become idle; no lifecycle reset/shutdown,
Docker operation for installation/testing, or change to existing resources is
part of this task.

The final private receipt has SHA-256
`73a7f5a370230fbbf37215e6271b0b5a045741a227fc2bca1c575b614c09bc80`;
the final 29-case suite receipt has SHA-256
`7c8caa1605d1cb64575a09800847df1cebf60151764a006755326209852067ab`.
They bind the installation and exact tested harness/fixture bytes, two blocked
import receipts, all case results and cleanup. The installation was reverified
after testing and the owned runs directory was empty. Raw receipts stay private.

## Limits and one next task

This proof covers the fixed fake and its one same-group fork child only. It does
not prove containment of hostile session escapes, Windows Job Objects, arbitrary
process trees, filesystem or secret-read sandboxing, network or Docker isolation,
real App Server compatibility, model token/cost enforcement, task delivery, pilot
or production admission. Same-user races against checked files also remain
outside this synthetic attestation. The current Linux account's host privileges
were not changed or presented as an OS sandbox.

Recommend exactly one next atomic task: **RF-HERMES-003, assess an upstream public
transport-only import/API that avoids configuration, provider/plugin discovery
and filesystem side effects.** Start from the concrete import chain above and
require a reviewed exact source pin before another installation or execution
attempt. Do not patch private internals or activate the Worker. This recommendation
is not authority to start the task, publish an upstream issue, or run a real model.
