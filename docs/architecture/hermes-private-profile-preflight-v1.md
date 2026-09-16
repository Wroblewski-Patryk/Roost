# Hermes private profile preflight v1

RF-RUNTIME-005B1, 2026-09-16. Verdict: **BLOCKED before profile creation**.
The accepted task required an enforceable private Blank Slate configuration and
an OAuth preflight, with no credential-store reads, login or model invocation.
Its explicit stop condition forbids guessed configuration keys or a wrapper
around a missing upstream contract. This is a source qualification result, not
proof that a configured Hermes process was tested.

The retained installation pin is Hermes **0.21.2**, commit
`939e45c91d751fadd94dcd1b873ac3cb44846213`. No replacement or second installation
was made. [Quiet transport](hermes-supervised-quiet-v1.md) and
[native owned-job proof](windows-owned-process-job-v1.md) remain independent.

## Precise missing public contract

The pin does implement Blank Slate. It does **not** establish the required
profile-only credential source / no implicit credential fallback policy:

- In [auth_codex.py, lines 408-479](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_codex.py#L408-L479),
  `resolve_codex_runtime_credentials` catches selected malformed/missing-token
  errors and calls `_recover_codex_tokens_from_cli` before its pool fallback.
- In the [refresh error branch, lines 359-378](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_codex.py#L359-L378),
  a relogin-required error also calls the same recovery function. This is
  conditional recovery, not a claim that every invocation imports credentials.
- [Recovery, lines 168-179](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_codex.py#L168-L179),
  reads a valid Codex CLI token pair and saves it into Hermes. The
  [importer, lines 386-405](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_codex.py#L386-L405),
  resolves `CODEX_HOME` or the account's default Codex home, independently of
  `HERMES_HOME`. These branches have no profile configuration guard.
- `fallback_providers: []` governs model/provider fallback, not that importer.
  The [credential pool configuration](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/agent/credential_pool.py#L555-L562)
  selects a strategy; unknown values fall back to `fill_first`. The supported
  strategies are `fill_first`, `round_robin`, `random`, and `least_used`, not a
  public disable-rotation or isolated-source policy. An empty/new pool alone
  does not prove fail-closed behavior after credential state changes.

The missing contract is an upstream-supported way to restrict Codex credential
resolution to the selected private store and reject missing, invalid or revoked
credentials without importing another client's grant or selecting another account.
Neither a digest of secret-free YAML nor a Job Object proves that property.
Relocating `HERMES_HOME` alone does not affect the separate Codex importer.
No invented `auth.import=false`, `credential_pool.enabled=false`, credential
inspection, host-home rewrite, monkeypatch or private Python launcher was used.

This fails the requested no-implicit-fallback profile qualification. The existing
`hermes_auth_boundary_unproven` and `hermes_sealed_config_enforcement_unproven`
blockers stay in place. It is not a conclusion that every individual Blank Slate
setting is unavailable, nor a change to the accepted Hermes-first architecture.

## Confirmed configuration surface

[Pinned setup_quick.py](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/setup_quick.py#L158-L197)
keeps `file`, `terminal`, **`vision` and `skills`** in Blank Slate, disables
compression, memory/user profile, checkpoints and smart model routing, and sets
90 agent turns. The later minimal setup path opts out of bundled skills except
the essential skill. This is not equivalent to a deny-all profile or one turn.

[Pinned defaults](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config_defaults.py)
expose `updates.check`, `telemetry.shared_metrics.enabled/send`,
`fallback_providers`, `auxiliary.title_generation.enabled`,
`auxiliary.background_review.enabled`, `curator.enabled`, memory flags,
`skills.project_discovery`, hooks and MCP definitions/auto-reload controls.
Background review and curator default to enabled, so the Blank Slate label alone
is insufficient. Plugin allowlisting and explicit CLI toolsets can narrow tools;
they do not provide the missing credential-source policy. No unsupported blanket
`offline`, `cron.enabled` or `gateway.enabled` key was introduced.

Provider/model/reasoning remain solely the existing packet-derived public adapter
arguments. MCP remains unattached. No profile, config version or digest is
advertised as verified; `configReceipt` and `environmentReceipt` remain null.
Ready-to-spawn profile sealing and its change/unknown-key/redaction tests are
**not implemented** because qualification stopped first. The existing Worker
still rejects every Hermes launch before spawn, even with asserted metadata.

## OAuth command preflight only

The exact public command shape is
`hermes auth add openai-codex --type oauth --label roost-pilot`.
This is **not an instruction to execute it now**. A later owner-present task must
first resolve the blocker and bind the visible terminal to the qualified private
profile and canonical executable. Only then can the owner run that one command
and complete the displayed device-code instructions. No such terminal was opened.

[The parser](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/subcommands/auth.py)
supports the command. [The implementation](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth_commands.py#L333-L387)
loads the pool before starting device login and writes a distinct manual OAuth
pool entry. The Codex callback calls `_codex_device_code_login()` without passing
the generic `--no-browser` or `--timeout` options; those flags are not relied on
as safety controls. The device flow prints a URL/code for the owner and polls;
none of it was invoked. Storage is the selected Hermes home's private `auth.json`
credential pool, never a repository file. Existing auth stores were not read.

Public local cleanup is `hermes auth logout openai-codex`.
[clear_provider_auth](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth.py#L1206-L1225)
and [logout_command](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/auth.py#L2259-L2292)
remove that provider's local singleton/pool state; logout may also reset model
configuration. This is not server-side grant revocation, and does not establish
that an ambient source cannot be adopted later. No remote-revoke command is
qualified here. No tokens, auth backup or logout operation were created/run.

## Verification, provenance and retained resources

Public source was fetched as data and compared with the existing checkout after
CRLF-to-LF normalization. No upstream module was imported or executed.
SHA-256 values below are the official HTTP LF bytes:

| Source | SHA-256 |
| --- | --- |
| `hermes_cli/auth_codex.py` | `c8d217b5a63e7bc0328323c6efc2b876c2adf60d8176b515226f52f82b5ed8b0` |
| `hermes_cli/auth_commands.py` | `90b1b115127caaab50f4431945f02009585a0b255b194888b6052da5d6aefa46` |
| `hermes_cli/subcommands/auth.py` | `18d0748bcbda3d593bbfd75b3ba5e393c6271779eb5d388de4e180da17186f02` |
| `hermes_cli/auth.py` | `8988b8a8f005696d806216875a458ca1359f4df788d9affa6d59f8a1ffce2ffc` |
| `agent/credential_pool.py` | `2e2da9f80eb7070d25a8418995536a7e673a81d12494a55f2e6eaaf02b1e285f` |
| `hermes_cli/setup_quick.py` | `37b739480327d6586b237ea94f9baefe877b6f41c41f621df42257564603668a` |
| `hermes_cli/config_defaults.py` | `bb3926a19337d2a37db9c7152b00680db8dad947c5332e94df75e40596c316f7` |
| `hermes_cli/main.py` | `dc7a6eda3caebab994e8dd2c05a4a8c8b2331f4472313c675efc9e7305b5d6aa` |
| `hermes_cli/env_loader.py` | `beb37e5a2a0bc9808510c970c583a53d4cee342756ddcf4011093995f9e3ceab` |

CLI version/help/parser/readback/doctor execution was skipped. Static inspection
of main/env-loader shows dotenv/external-secret loading before command handling,
plus startup repair/cleanup paths; even help is not a qualified read-only probe.
The setup wizard also inspects provider state before its Blank Slate selection.
Only source parsing and filesystem metadata were used. The standard Windows and
legacy home config locations had no config file; checkout dotenv was absent.
This limited inventory is not a scan of arbitrary named profiles or credentials.

Task-created private profiles, configuration files, backups, installations,
downloads on disk and Hermes processes: **zero**. No overwrite occurred, so no
rollback backup was necessary. Existing installation and credential resources
remain unchanged. No scheduled task, gateway, Docker/WSL/VM, model, MCP, VPS,
database, push or deployment action occurred. `design-qa.md` was not read or changed.

Validation: **137 existing synthetic provider/input/quiet admission tests passed**,
both Direct documentation validators passed, and **483 local links** in the seven
changed documents resolved. The new document passed private-identifier and six
false-gate checks; `git diff --check` passed. These checks do not establish
upstream runtime behavior. Typecheck/lint/build and native Job fixture reruns are
not required for this documentation-only change; no runtime code changed.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; pilotExecutionAuthorized=false;
pilotExecutionStarted=false.

Exactly one next atom: **RF-RUNTIME-005B2 — resolve and qualify the public
profile-only Codex credential-source contract**. The owner/coordinator must settle
this gap before profile sealing and owner-present OAuth can continue. No switch
of pin, alternative auth boundary or next task is authorized by this report.
