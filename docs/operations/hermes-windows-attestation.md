# Private Windows Hermes installation attestation

This is installation evidence only. Keep production execution disabled and the
Worker in `observe`. Do not configure models, login, MCP, memory, sessions,
kanban, gateways or autostart. The [Worker-owned MCP broker contract](../architecture/worker-readonly-mcp-broker.md)
has synthetic proof only; native integration and the read-only model comparison
remain a separately authorized, unstarted stage.

## Installation and provenance

Use one private upstream checkout and one venv outside all application
repositories, following the upstream Windows layout under the installation's
local application data directory. Never vendor upstream code into Roost, run a
remote installer one-liner or modify upstream source/lock to force installation.
Resolve canonical physical paths: a packaged desktop app can virtualize local
application data, while a scheduled Worker sees the underlying physical path.
The generated console launcher must bind that canonical venv Python path.

Registry v2 pins the official NousResearch repository, package `0.21.2`, release
`v2026.9.11`, commit `939e45c91d751fadd94dcd1b873ac3cb44846213`, MIT license,
and SHA-256 of the installer, pyproject, setup and uv lock. Verify the tag's
commit before executing source. GitHub reports the tag and commit **unsigned**;
matching hashes do not establish a publisher signature. The pinned release does
not supply a usable Windows wheel/sdist outside its Nix build path; do not
substitute the older package available on PyPI.

The reviewed private source-build route uses existing Python `3.13.1` and uv
`0.11.8`. Verify the official uv Windows release archive SHA-256
`c84629a56e0706b69a47ea35862208af827cb6fbfa1d0ca763c52c67594637e8`
and contained executable SHA-256
`c3f337907f233811954d96e0ecf2d46df094413250ebdcd10d40d9b5c48febd2`.
Core plus the upstream MCP extra are frozen by `uv.lock`; no default development
group or optional messaging/browser/dashboard/voice extra is selected. This does
not remove web/server dependencies already present in core.

The explicitly reviewed build-only exception is `setuptools==83.0.0` (the exact
upstream-lock wheel, SHA-256
`29b23c360f22f414dc7336bb39178cc7bcbf6021ed2733cde173f09dba19abb3`)
and `wheel==0.48.0` (official PyPI wheel, SHA-256
`3217dcc807155e45db462d7ef2431f5ddda0d7273b700d05a67b271ceb1287ab`).
Verify downloads before execution and install only these two with
`uv pip install --no-index --no-deps`. In the new venv, use frozen core/MCP sync,
`--no-build-isolation-package hermes-agent`, and `--inexact` to retain those two
build tools; forbid builds of every other locked package with
`--no-build-package`. No additional off-lock build dependency is allowed.
Changing pins or build exceptions requires a fresh reviewed installation.
Retain private build provenance, exact installed dependency/license inventory
and manifest. Remove only verified temporary downloads belonging to this install.

## Worker verification and diagnostic command

After checking provenance and source cleanliness, seal a private JSON manifest
(`schemaVersion:1`) with official source, version, commit, release,
`signature:unsigned`, canonical executable/probe directory, and two ordered
roots: `checkout`, `pythonBase`. Each root has a canonical path and a complete
`files` array of relative forward-slash paths and SHA-256 values. Include venv,
bytecode and Git metadata. The manifest is outside those roots. Pin its byte
SHA-256 in private Worker configuration as `executionProvider.attestation`.
Do not automatically reseal changed bytes: re-establish their provenance first.

Worker checks the sealed files before the exact `--version` invocation. Its
environment contains only OS plumbing, a System32-only PATH, fixed Python
isolation switches, disabled Git prompting/optional locks, dead loopback HTTP
proxies, and `HERMES_HOME` pointing at a private empty diagnostic directory.
That directory must deny this Worker's Windows identity write access through
NTFS ACLs; Worker confirms that an exclusive empty sentinel cannot be written.
It never clears a pre-existing directory. This is a scratch directory, not a
Hermes profile. No Roost/provider keys, user profile, Python hooks or model
settings are inherited. Proxies are defense in depth, not a general network or
filesystem sandbox for future inference.

The command has a 15-second timeout, 32-KiB combined output limit, hidden window,
no shell, and process-tree termination on timeout/overflow. Worker discards raw
stdout/stderr, which may contain the installation path. Only one exact version
banner matching the registry is accepted. A writable/nonempty probe directory,
wrong version, timeout, changed bytes or uncertain stop remains a fixed-code
failure with no incident, claim, fallback or installation loop.
File hashing has a 60-second abort budget and at most sixteen concurrent reads.
Worker reuses the timestamped startup/config-change snapshot during heartbeats;
it does not continuously monitor file integrity. A standalone check or Worker
restart performs a fresh full check. An uncertain process stop prevents further
probes in that Worker process and requires private reconciliation before restart.

Upstream `--version` tries to initialize home/config and update-cache state;
the write-denied directory prevents those writes. `--help` and `doctor` share
broader startup/config/auth paths. They are deliberately not run: their read-only
behavior cannot be established for this pin. No profile/config/token is created
to make these diagnostics pass.

## Offline transport examination: adapter blocked

The pinned installation's public `CodexAppServerClient` was examined offline
with `scripts/hermes-transport-boundary.test.mjs`. Set the test-only
`ROOST_HERMES_BOUNDARY_CONFIG` to an existing private host config and run
`node --test scripts/hermes-transport-boundary.test.mjs`. Without an explicit
config or on a non-Windows host, this installation diagnostic is skipped.
It is not part of ordinary CI and never resolves or starts a Codex executable.

The test performs fresh full installation attestation before input preparation
and again before spawning isolated venv Python. It imports the official
`agent.transports.codex_app_server.CodexAppServerClient`; no source is copied,
patched or replaced. The only App Server is a fixed Python fixture in a unique
system-temp directory. Its wire records one thread/start and one turn/start,
the exact Worker-issued input SHA/seal/model/effort, empty dynamic tools and no
inherited Roost/provider/MCP/Python-hook secrets. Worker consumes the envelope
once; a second consume is rejected. There is no inference, provider admission,
MCP broker, AIAgent, session runner, authentication or external network request.

The successful negative test observed two concrete blockers at this pin:

- The public notification queue accepted a **32,769-byte payload**, and the
  stderr buffer retained a **32,769-byte line**. A 500-line retention policy is
  not a 32-KiB byte cap. Polling `stderr_tail()` after capture cannot impose one.
- `close()` terminated the immediate fake App Server but left its deliberately
  short-lived sleeping child alive. The fixture confirmed that child's eventual
  exit. This is evidence about the upstream client, not a successful Worker
  cancellation, crash/recovery or escaped-child containment proof.

The outer test has its own 32-KiB capture and process timeout; it does not pretend
that these bound the client's internal pipes. Its home/profile/temp/Codex-home
paths are ephemeral and its environment is allowlisted. The fixture workspace
is writable solely for the fake server and sanitized wire summary: **no empty
read-only production workspace or native filesystem isolation is proven**.
The temporary tree is removed after the child exits; cleanup failure fails the
test. No existing private PoC directory is read or cleaned. Raw prompts, responses,
tracebacks and private installation paths are not retained as evidence artifacts.

The public constructor controls the executable, arguments, home and environment,
but offers no public pipe factory, byte-budget hook or process-tree owner. Its
[pinned source](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/transports/codex_app_server.py)
uses unbounded line reads/queues and direct-child termination. A wrapper that
only invokes these methods cannot establish the requested containment contract.
No production adapter is shipped by this examination. Existing admission remains
closed; declaring settings, overriding private internals or marking synthetic
tests as native compatibility is not an acceptable substitute.

A subsequent bounded design must either provide Worker-owned pipe/process
containment before the upstream client can read or spawn, or adopt an explicitly
reviewed upstream version with suitable public hooks and repeat attestation.
The first retains the dependency pin but needs a tested integration boundary;
the second avoids private-API coupling but requires a pin/dependency review.
Neither option is implemented or activated here. RF-HOST-010/020, strict result
validation, live compatibility and full stop/recovery acceptance remain open.

## Rollout and rollback

Preserve the existing private Worker config before adding the provider manifest;
leave `enabled:false`, `executionMode:observe`, credentials and repository mappings
unchanged. Validate the candidate config locally before one normal observer
Stop/Start. Check the Worker report and production heartbeat independently;
installation verified and pilot not ready must both remain visible in PL/EN.
Direct Codex's existing admission behavior is unchanged when selected explicitly
or when the provider object is absent. There is no automatic fallback.

Rollback restores the previous private config and restarts the observer normally,
with execution still disabled. Retain the private installation and evidence until
cleanup is explicitly requested. Do not uninstall shared Python/uv, touch other
profiles, reset data, alter credentials or delete persistent volumes. API/UI
rollback uses the previous reviewed image; this release has no migration.

Tests: `npm run test:agent-provider`, existing Worker protocol/process/lease/
writer/context/budget/recovery suites, observer tests during a controlled stop,
and `node scripts/execution-provider-ui.test.mjs` after a web build. They use
synthetic processes and no model, MCP server, production queue or extra database.
