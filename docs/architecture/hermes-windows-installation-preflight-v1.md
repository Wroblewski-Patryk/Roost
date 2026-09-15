# Native Hermes installation preflight v1

RF-RUNTIME-003, 2026-09-15. Verdict: **PIN-CLI-INCOMPATIBLE; INSTALLATION-STOPPED**.
The later [RF004 replacement proposal](hermes-replacement-pin-proposal-v1.md)
also rejects newest stable 0.21.3; RF005's upstream protocol gap is now next.
This follows [ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md) and the
[launch contract](hermes-cli-launch-v1.md). The task granted one private native
installation and secret-free configuration, without OAuth, inference or a pilot.
Its explicit stop condition applies: do not install a pin that lacks the required
public CLI, and do not substitute a floating release or silently weaken launch v1.

## Confirmed evidence

Read-only host metadata reports Windows build 10.0.26200, X64. Command discovery
does not find Hermes, but the standard operator-local Hermes directory already
contains a source checkout, virtual environment, EXE launcher and historical
Roost installation receipts. Absence from PATH is not absence of an installation.
The existing checkout reports a clean worktree and the registry commit. No
existing files were overwritten, moved, repaired, resealed or deleted. No full
dependency inventory or current executable/version attestation is claimed.

The following official sources were fetched as data, without executing them:

- [Release tag object](https://api.github.com/repos/NousResearch/hermes-agent/git/tags/2160b2d59c87316e82f749d77c1f25969bea1533):
  v2026.9.11 resolves to 939e45c91d751fadd94dcd1b873ac3cb44846213. The tag is unsigned.
- [Pinned package metadata](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/pyproject.toml):
  version 0.21.2; package metadata, setup.py and uv.lock match registry hashes and
  the corresponding local files.
- [Pinned Windows installer](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/scripts/install.ps1):
  public Commit/Tag, SkipSetup and NonInteractive options exist. Default native
  paths are operator-local; the source checkout and managed dependencies/config
  would be installation resources. No installer stage was invoked. The registry
  installer hash is for CRLF checkout bytes, not the LF HTTP response. Normalizing
  only LF to CRLF reproduces the registry hash exactly; this is not a content
  mismatch and no integrity rule was relaxed.
- [Pinned chat parser](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/_parser.py):
  chat registers --oneshot, --query-file, --provider, --model and --reasoning,
  but does not register --format. There is no stream-json argument/value in this
  file. The local file is byte-identical to the official response.
- [Current public CLI documentation](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
  describes --format stream-json, which launch v1 requires. Current documentation
  is not evidence that this historical pin implements it.

Pinned parser SHA-256:
`8f6573f8bc211208ae884e9ca21987240abd28bc3312c7189f323286dfc29a21`.
Installer HTTP LF SHA-256:
`226c70a90ad47e8a4d34cb11aca4ecbeb649e2f9b67fbd009ea49791de2d56f5`.
Installer checkout CRLF SHA-256 remains the registry value:
`53a077364aa28bbd6e8d987cdec11a4552e22ff2c5137845725a1c99770f392f`.

## Stop and retained state

The specific admission reason is now **hermes_cli_pin_incompatible**. The
registry records source compatibility evidence, not a verified installation.
The diagnostic launch candidate still describes the target interface; its
command/args remain null and final preparation still denies Hermes before spawn.
No fallback to plain text, private Python wrapper or a newer unapproved pin was
introduced. The pinned parser's --reasoning flag is an observation only; changing
that argument would not supply the missing structured-output protocol.

Preflight retained the target-directory presence and user/machine PATH state in
memory. Because the CLI mismatch was established before any installation change,
no installation mutation manifest or rollback action became necessary. Downloads
remained in memory. Task-owned installation resources (installers, archives,
clones, runtime/config/cache files and temporary directories) and Hermes processes
created: **zero**. Synthetic tests use their own disposable fixtures. Existing
resources and PATH entries are unchanged; no new global command was registered.
Private paths and historical receipts stay outside the application repository.

Blank Slate configuration was not written or read back. Version/help/doctor were
not executed after the stop condition. No OAuth store, model, gateway, cron, MCP
endpoint, Docker/WSL/VM/Sandbox, system dependency, UAC or antivirus setting was
accessed or changed. Thus no config enforcement, process cleanup, authentication
or live compatibility claim follows from this source-only check.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; pilotExecutionAuthorized=false;
pilotExecutionStarted=false.

## Verification and next step

Focused synthetic adapter/provider/config and direct regressions, API projection,
documentation validators and git diff checks verify that the known incompatibility
cannot be overridden by asserted installation/compatibility metadata. These tests
do not run the private Hermes executable or establish upstream runtime behavior.
Final results: 242 Worker/adapter regressions, 20 synthetic attestation tests and
4 API provider tests passed. Both Direct documentation validators passed with
historical seals unchanged; new local links, closed gates, registry metadata and
git diff whitespace checks passed. Database/live integration tests were not run.

Historical next atomic task: **RF-RUNTIME-004 — qualify an exact official Hermes
release pin implementing launch v1 before installation**. Establish source/version
integrity and the public structured CLI plus documented configuration controls;
produce a bounded replacement-pin proposal accounting for the existing private
installation. Do not begin OAuth/MCP connection while this pin blocker remains.
RF-RUNTIME-004 subsequently completed with no qualified replacement; see above.
