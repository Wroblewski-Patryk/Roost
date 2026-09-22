# Hermes Desktop, profile isolation and local model routing

## Decision: two existing runtimes

**Decision complete, 2026-09-22: reject sharing the managed Hermes runtime with
Desktop.** Retain the existing manifest-bound Roost CLI and the existing
Desktop-delivered runtime as separate ownership domains. Do not install, copy,
merge venv/dist-info, repair or create profiles. Keep one future Ollama server
and model-weight store outside both profiles.

The subsequent point-2A authority conditionally permits **one additional,
physically independent private Desktop backend installation** after all its
source/build/isolation gates pass. It does not authorize a second model-weight
copy. The preflight below stopped before exercising that installation authority.

**Current manual-path policy:** the subsequent operational 2A decision accepts
the official Desktop installer and its dependency installation for the owner's
manual tool. Full independently mirrored/hash-closed dependencies are **not** a
manual-install admission gate. Earlier artifact-closure refusals below are
historical evidence, not current policy. Managed Roost runtime admission, source
pins, provider gates and isolation requirements are unchanged. The optional
artifact checker now reports inventory status and `manualInstallationGate=false`.
The next decision also explicitly accepts the installer's internal repository,
Python-version and dependency-tier fallbacks within one 20-minute stage-driver
attempt. Only an external rerun remains disallowed for that atom. That attempt
was started and rolled back as recorded below; it produced no qualified runtime.
A separately authorized real retry using the corrected driver repeated the
output-protocol failure and was also rolled back. No third wrapper attempt was made.
The subsequent direct-stage decision removes `wrapper_protocol` from the active
manual path. Official stage exit codes plus filesystem postconditions and full
postflight are authoritative; the old wrapper history below is retained as evidence.
The strict toolchain qualification below is historical. The owner subsequently
accepted upstream normal User+Machine PATH and generated Python/build tools for
manual Desktop only. The latest monitor-repair attempt passed repository and
Python, then stopped at venv transition because the monitor rejected an internal
uv alias. Follow-up local rollback is complete, with missing native venv cleanup
proof still explicitly unavailable. One diagnostic pair remains; 2A is BLOCKED
and 2B is not ready. No second install followed the alias correction.

This does **not** establish physical isolation of the current Windows views.
Some descendants overlap while others differ. Manual Desktop launch stays
denied until the point-2 boundaries below are proven. Roost's
[delivery gate](agent-delivery-readiness.md) remains RF-HOST-035; all six
readiness/authority flags remain false.

## Verified evidence and limits

Locations below are logical labels, not machine paths. The point-1 qualification
did not read auth, configuration contents, cookies, private logs, sessions or
databases. Point 2 permits hash-only profile verification, described below;
no private contents are interpreted, displayed or persisted.

| Component | Observation |
| --- | --- |
| Managed CLI | Manifest version `0.21.2`, source commit `939e45c91d751fadd94dcd1b873ac3cb44846213`; source initializer declares `0.21.2`. These are declarations, not a successful import measurement. |
| Desktop | Actual installed ASAR package is **0.17.6**, build commit `a3d7f9ae257d5db6bb9759a10c437d786eec1610`, CI timestamp `2026-09-21T16:49:27.690Z`. Electron/PE `40.10.2`, checkout package `0.17.2` and setup installer `0.0.1` are separate identities. |
| Different views | Managed-manifest and Desktop-adjacent roots are inspected separately. The managed view lacks three Desktop executable/bundle artifacts and five inspected `0.21.3.dist-info` files present in the Desktop view. Matching root identities do not imply equivalent descendant trees. |
| Overlap | Sampled package/main source, venv Python, Hermes shim and venv configuration have matching physical identities and bytes across these views in the inspecting process. Two path strings do not prove isolation. |
| Editable metadata | Desktop view contains `0.21.2` and `0.21.3` editable registrations (`uv`); managed view contains the inspected `0.21.2` registration only. Both observed console declarations map `hermes` to `hermes_cli.main:main`; the sampled shim matches the `0.21.2` RECORD. No distribution was removed. Metadata does not prove two imported code versions or reconstruct installation history. |
| Effective import/protocol | The repo-owned probe returned `identity_probe_failed_closed`. No measured effective version, normal-site startup or Desktop/backend protocol compatibility is claimed. |

The 2026-09-21 inventory found installed Ollama `0.34.2`, no Hermes/Ollama
process/service running at that observation, and an Ollama startup shortcut
whose effective StartupApproved state was not verified. The default model store
had zero blobs and no manifests. Alternate stores were not exhaustively searched;
no live API/CLI model listing was invoked. This atom did not refresh runtime state.

## Repo-owned diagnostic

The opt-in [Node harness](../../scripts/qualify-hermes-desktop.mjs),
[helpers](../../scripts/lib/hermes-backend-qualification.mjs) and
[Python probe](../../scripts/hermes_backend_identity_probe.py) follow the existing
[effective-config probe](../../scripts/hermes_effective_config_probe.py) and owned
Windows Job pattern. They are not Worker startup hooks or admission receipts.

The harness accepts an exact canonical manifest locator and separately named
Desktop root. It checks pinned source/interpreter inputs against the manifest,
samples both views plus the Python base, then invokes the exact managed Python
with `-I -S -B`, a fresh empty temporary home, clean allowlisted environment and
a 10-second owned-process limit. `-S` excludes `.pth`/site startup; a successful
result would describe controlled source import, not Desktop's ordinary invocation.

Before the minimal package import, the child installs a deny-by-default audit
hook for mutations, sockets, subprocesses, ctypes, nonminimal Hermes imports and
unknown effects. It resolves the package on explicit search paths and executes
only its attested initializer source, avoiding unqualified generated bytecode.
Distribution declarations may be read; `hermes_cli.main` and the console
entrypoint are never loaded. No installation write is permitted. This constrains
reviewed Python code, not hostile native code or other processes; it is not an OS sandbox.

Only bounded, schema-validated JSON with relative identities or a fixed refusal
leaves the child. Raw exceptions, private paths and upstream output are discarded.
Snapshots track file hashes, identities, sizes and timestamps; SAME, CHANGED,
MISSING_BEFORE and MISSING_AFTER are separate per-file results. Temporary artifacts
are removed only under a verified temporary root after owned-process cleanup.

Observed on 2026-09-22:

- Initial preflight rejected a noncanonical manifest locator before any child
  launch; read-only resolution identified the Windows package location.
- Snapshot handling was corrected to record redirected descendants separately
  from strict exact-path checks on managed execution inputs. This does not
  equate the views or relax the interpreter binding.
- The final harness captured the child's complete fixed refusal
  `identity_probe_failed_closed`. Effective import remains unqualified.
- **45 comparable sampled files SAME; 8 MISSING_BEFORE; zero CHANGED or
  MISSING_AFTER.** Missing entries are three Desktop artifacts and five
  `0.21.3.dist-info` files in the managed view.
- Owned-process cleanup passed; the temporary directory was removed. This is
  bounded sample evidence, not a full installation/private-profile content audit.

Earlier ad-hoc probes were policy-denied or had unreliable capture and supply
no positive evidence. The repo harness did not repeat those inline commands.

## Static Desktop contract

The installed `dist/electron-main.mjs` was re-inspected without executing it.

| Boundary | Verified behavior / consequence |
| --- | --- |
| Root | `HERMES_DESKTOP_HERMES_ROOT` selects an existing source. A valid explicit descriptor skips normal bootstrap; an invalid override may fall through to other backends. |
| Interpreter | `HERMES_DESKTOP_PYTHON` is an existence-based preference. Selection may fall back to `.venv`, `venv` or system Python; `createPythonBackend` may normalize the command to a venv interpreter. No exact-hash enforcement was found. |
| Command | Descriptor uses `-m hermes_cli.main`; primary startup requests `serve --host 127.0.0.1 --port 0`, optionally with an active profile. Discovery can probe `serve --help` and substitute dashboard arguments. Protocol compatibility was not exercised. |
| Environment | Spawn explicitly sets `HERMES_HOME` and `HERMES_DESKTOP=1`, but inherits parent environment and retains inherited `PYTHONPATH`. Primary CWD is resolved separately. |
| State | `HERMES_DESKTOP_USER_DATA_DIR` selects Electron state. Process `HERMES_HOME` overrides user-data defaults and Windows user-environment fallback. `profiles/<name>` normalization collapses to the parent home. |
| Updates/repair | `resolveUpdateRoot()` includes the override root. Update IPC/connection routes can launch a detached updater/script. Other paths bootstrap/install and resolve again. No verified global fail-closed disable control was found; this does not assert automatic update application on every launch. |

Even a successful minimal import would leave protocol, enforced exact selection,
update/bootstrap/fallback denial, profile isolation and inherited-environment
control unproven. Sharing therefore fails independently of the negative probe.

## Point 2 preflight: BLOCKED before profile writes

The separately authorized point-2 preflight on 2026-09-22 stopped before any
private creation. Four Desktop-candidate descendants resolve to the **same
canonical files, physical file identities and SHA-256 bytes** as managed files:
`hermes_cli/main.py`, `venv/Scripts/python.exe`, `venv/Scripts/hermes.exe` and
`venv/pyvenv.cfg`. This is a positive overlap finding in the inspecting process,
not merely an unresolved comparison or proof about a separately launched
Desktop process's entire filesystem view.

The installed main bundle still has SHA-256
`38edf1f8fd31020bcc536ded5cd8b4af366163c2e874a8dc2c7d8eb38ef1aaa4`.
Static readback confirms that `resolveUpdateRoot()` can select the explicit
source root and the Windows updater handoff receives that root as `-InstallRoot`.
An independent home/user-data override does not isolate those mutable code/venv
targets. `HERMES_DISABLE_LAZY_INSTALLS` is not referenced in that bundle; setting
it alone is not evidence of Desktop update/bootstrap/repair/fallback denial.
No qualified enforcement that confines every such path to Desktop-only files
is available. The first positive overlap is sufficient to deny creation;
an exhaustive inventory of every possible runtime write was not attempted.

No `MANUAL_HOME`, Electron state, config/auth secret, pending Ollama configuration,
launcher, backup or temporary runtime artifact was created. There is therefore
no launcher dry-run acceptance and no rollback deletion to perform. The identity
check is a rejected preflight, not a successful launch validation. No new
generator/validator code is needed for this negative, documentation-only result.

Hash-only verification of `hermes-pilot` covered all **349 regular files,
3,351,013 bytes** in the resolved profile tree. Before/after inventories, file
identities, modification times and SHA-256 digests matched. Bytes were streamed
into hashes only; no config/auth/log/session content was interpreted or emitted,
and no private paths or per-file digests were saved in the repository. This
proves the compared files unchanged, not exclusive control over other processes.

Five existing Node qualification tests passed, including the runner for three
synthetic Python guard tests; none imports installed Hermes. Docs checks passed:
443 local links, privacy, budgets (103,208-byte default context) and scoped diff.
No new launcher was generated, so its dry-run/update/fallback behavior was not
tested or declared safe. No `npm run validate`, installed-runtime probe or UI/
backend/provider test was run for this documentation-only denial.

Point 3 remains **not ready**. First prove disjoint mutable targets in the intended
Desktop launch context and enforce update/bootstrap/repair/fallback confinement;
then a separately authorized point 2 must create and read-back the isolated
profile/launcher and pass its dry-run. Model download/provider trial still needs
separate authority and storage/resource/quality qualification. No work proceeds
automatically from this denial.

## Contract for a future successful point 2

Only preflight has run; profile/launcher creation is **not started**. These labels
are private per-installation values, not a launch script. Satisfy the boundaries
before creation and launch:

| Boundary | Manual Desktop | Managed Roost |
| --- | --- | --- |
| Runtime | Existing `DESKTOP_RUNTIME` code/dependencies; never an override to managed code | Existing manifest-bound `MANAGED_RUNTIME`, frozen |
| Process home | Independent `MANUAL_HOME`, identity `hermes-manual` | Existing `MANAGED_HOME`, `hermes-pilot`, unchanged |
| Mutable data | Own config/auth/state DB/sessions/memory/logs/cache/locks/ready/ownership files | No access or reuse by manual Desktop |
| Electron state | Independent `MANUAL_DESKTOP_STATE` through `HERMES_DESKTOP_USER_DATA_DIR` | No shared manual Electron state |
| Ollama | Future one explicitly selected server/store | Same weights only after separate provider admission |

Before writing profiles, resolve actual Desktop executable, Python, source,
dependency and update targets in the intended Desktop launch context. Prove its
mutable files do not resolve to managed descendants; path spelling is insufficient
under the observed Windows redirection. If existing Desktop assets cannot satisfy
this, stop and report the overlap. Do not install/copy/merge or silently select
managed code. The decision does not claim existing overlaps have been repaired.

Use independent home roots, not `profiles/<name>` siblings. Bind exact executable,
argv, CWD, module/dependency identities and an allowlisted process environment
without inherited Python paths, credentials, profile selectors or remote/attach
selections. No global PATH/environment/registry/autostart changes are implicit.
Updates must be denied or confined to verified Desktop-only targets. Missing
pins, ambiguous state or unproven enforcement deny launch; no silent fallback
to another runtime, profile, model or effort. No mutable state is shared.

Any shared base interpreter needs an explicit immutable ownership/update boundary;
it does not make a shared venv safe. Roles, hierarchy, delegation, task context
and review remain in Roost. Do not create a Hermes profile per agent. Profile
separation is not an OS sandbox.

## Point 2A: exact source identified, provisioning BLOCKED

Source-only preflight on 2026-09-22 established a more precise fresh-install
target than the earlier runtime inventory:

- Packaged `install-stamp.json` names commit
  `a3d7f9ae257d5db6bb9759a10c437d786eec1610`. In the installed main bundle,
  `installRefForStamp()` selects that exact commit; `buildPinArgs()` supplies
  `-Commit` when `pinCommit` is true. `runBootstrap()` sets `pinCommit` for a
  fresh destination without an existing Git checkout. Existing checkouts take
  a different, unpinned path, which is not an acceptable provisioning shortcut.
- That commit is present in the local object database. Recomputing its Git
  commit-object SHA-1 matches the stamp. Its tree is
  `971ce7f3edcdbb0ebed9a1a433493eda2e51d3d7`: 14,718 regular source entries,
  183,879,887 logical bytes, no symlink/submodule entries. Nothing was extracted.
- At this exact commit, both the package initializer and project metadata
  declare **Hermes 0.21.3**. The console entrypoint is `hermes_cli.main:main`;
  `hermes_cli/subcommands/dashboard.py` declares `serve`, `--host`, `--port 0`
  and the headless JSON-RPC/WebSocket backend used by Desktop. This identifies
  the upstream-selected source and minimum static interface, not a live
  protocol/behavior qualification. Installer stage protocol `1` is not a
  substitute for a Desktop/backend wire-protocol proof.

The deterministic build gate fails **before staging**. At that commit,
`[build-system].requires` is `["setuptools==83.0.0", "wheel"]`. `uv.lock` contains
setuptools `83.0.0`, but no `wheel` package/version/artifact hash; no wheel build
constraint was found. The source explicitly requires wheel for its isolated
build. An unconstrained resolver or an arbitrary cached wheel is not evidence
of the requested exact locked build closure. No package-manager/install command
or network download was attempted; the upstream installer also contains unlocked
fallback tiers and was not executed.

Exact source evidence (SHA-256 of Git blob bytes):

| Artifact | SHA-256 |
| --- | --- |
| `pyproject.toml` | `1cc8f282c7b77cd3f9ea7ea45be3eb58baa391f06dc8faff106682fb8d803744` |
| `uv.lock` | `6caed1dea1418a3e244adf9c47f4f10bea4f221f8f72e65b926aa9f3ef71713b` |
| `hermes_cli/subcommands/dashboard.py` | `cf78789c16e5b2e2183671711944cc230bda241726ca3420a4c0b519f7fc4193` |

Free system-disk space was approximately 35.6 GiB. The unextracted source alone
is about 175.4 MiB; a complete interpreter/venv/dependency size is not established.
No final/private root, staging tree, venv, installation receipt, profile or
launcher was created, so no rollback deletion was necessary. Destination ancestry,
cross-launch-context visibility, dependency RECORD/license inventory and physical
non-overlap of a new runtime were not qualified because that runtime does not exist.

Hash-only profile readback still matches the preceding point-2 baseline for all
349 regular files (3,351,013 bytes), including file identities/content hashes.
The 45 comparable installation samples retain their physical identities, sizes
and hashes from point 1; the eight absent entries remain absent. This is sampled
installation evidence, not a full-file installation audit. No managed mutation
or auth/log/session interpretation was performed.

Before provisioning can resume, supply a reviewed exact build constraint and
verified artifact provenance/hash for `wheel` (and close the full build/runtime
dependency set), retaining the stamped source pin rather than choosing latest.
The later isolated diagnostic must explicitly admit the manual `0.21.3` source
identity; the existing managed-only `0.21.2` diagnostic is not its qualification.
Only after a complete isolated build, file/import/RECORD/license/size/overlap
checks, atomic publication and read-back receipt PASS is **point 2B** eligible
for separate authorization. No 2B or model work starts from this refusal.

Verification: all five backend-qualification Node tests passed, including three
synthetic Python guard cases. The 443 local Markdown links, documentation budgets,
added-text privacy scan and scoped whitespace check passed. All eight unrelated
modified tracked files retained their baseline hashes; the unrelated untracked
design artifact was not opened or staged. Full application validation and live
runtime/UI/model tests were not run for this documentation-only result.

### Resumed 2A: necessary build archives absent

The follow-up dependency preflight retains the exact source/tree/blob pins above.
Both existing runtime views declare `wheel 0.48.0`, `setuptools 83.0.0` and
`packaging 26.0` in installed metadata. Wheel declares Python `>=3.9` and
`packaging>=24.0`; setuptools declares Python `>=3.10`, packaging `>=3.8`.
These declared ranges accept Python 3.13.1. They do not prove artifact provenance,
an effective build, dynamic build-hook requirements or backend compatibility.
Wheel 0.48.0 is an explicit candidate based on the existing installation, not a
latest-version selection or an admitted build constraint.

Read-only inspection of the local uv and pip caches found 322 original-archive
candidates (`.whl` or pip HTTP `.body`), including a wheel 0.46.3 archive and
packaging 26.1/26.2 archives. None supplies the required original wheel 0.48.0,
setuptools 83.0.0 or packaging 26.0 bytes. Unpacked uv cache entries and installed
dist-info are not original wheel artifacts and cannot establish their ZIP hashes.
This result covers the named caches, not every location on the machine.

The [manual build-input manifest](../../config/hermes/manual-desktop-build-inputs.json)
records the necessary locked inputs, target and unqualified wheel candidate.
Its [offline preflight](../../scripts/hermes_desktop_build_preflight.py) verifies
the local commit/tree and pyproject/lock blob hashes before selecting exact
official-PyPI artifacts from that lock. It scans only original archive candidates,
matches byte size and SHA-256, verifies matching ZIP metadata without extraction,
and emits no private paths. No package manager, network, installed Hermes import,
source build, staging or installation operation is implemented by this checker.
It runs under base Python with `-I -S -B`, an explicit source root and explicit
cache roots; exit code `2` and `BLOCKED` are the expected refusal, not a crash.

| Necessary artifact | Locked SHA-256 | Cache result |
| --- | --- | --- |
| `setuptools-83.0.0-py3-none-any.whl` | `29b23c360f22f414dc7336bb39178cc7bcbf6021ed2733cde173f09dba19abb3` | Missing exact bytes |
| `packaging-26.0-py3-none-any.whl` | `b36f1fef9334a5588b4166f8bcd26a14e521f2b55e6b9de3aaa80d3ff7a37529` | Missing exact bytes |
| `wheel 0.48.0` candidate | Not qualified | Missing qualified original artifact |

The current network allowance permits only wheel metadata and one wheel artifact.
Downloading it cannot fill the other already-established gaps. Therefore **zero
metadata requests and zero artifact downloads** were made, and work stopped before
staging under the incomplete-closure rule. This manifest is deliberately a
necessary-input preflight, not a full build/runtime lock or installation receipt.
The upstream lock has 259 package entries across environments/extras; that count
is not a resolved Windows runtime set. Runtime marker/extras selection, all
transitive artifacts and dynamic build hooks remain unqualified. Even finding
both locked archives cannot make this checker authorize installation.

Six [synthetic tests](../../scripts/test_hermes_desktop_build_preflight.py) cover
official provenance/hash selection, ambiguous artifacts, opaque-cache byte matches,
corrupt bytes, incorrect distribution identity, installed-metadata substitution,
source drift and refusal with partial inputs. The live file-only check returned
both locked archives absent. Transactional staging/rollback, new-runtime overlap,
dual-distribution, effective-import and receipt checks were not run: no new
runtime or provisioning implementation was created. Existing managed admission
and provider pins remain unchanged. Point 2B remains ineligible.

### Initial operational 2A inspection, before fallback authorization

The packaged bundle still selects source commit `a3d7f9ae...` for fresh installs.
The observed Desktop executable SHA-256 is
`1d27ee17f1a23cb18373c324b1b34b6a05b79c14ce129624d7645269f9a7612a`;
the main bundle retains the hash recorded above. Both the Desktop executable
and cached PowerShell installer report Authenticode `NotSigned`. This is a
reported identity limitation, not an invented requirement for a signed script.

The cached `install-main.ps1` has SHA-256
`226a342a3f409a0e3b6a716b3ba4d464f286adc1e7356d08edd3ff33d6b35e39`.
Removing its three-byte UTF-8 BOM produces the exact pinned `scripts/install.ps1`
Git blob (251,523 bytes), SHA-256
`e57d49271c45205e8faae964e59453a2279481d85eadae7d8495df2e31f91ccd`.
Thus the cached script's content was bound to the selected source rather than
trusted because its filename says `main`.

The verified installer accepts `-InstallDir` and `-HermesHome`, not `-InstallRoot`.
Explicit values survive its path normalization. Its supported headless stage
shape is `-Stage <name> -NonInteractive -Json -InstallDir <target> -HermesHome
<private-install-home> -Commit <stamp-commit> -Branch main`; this is an inspected
interface, **not an executed or admitted command**. `-ShowResolvedPaths` and
`-Manifest` are read-only protocol modes. A stage returns JSON containing `stage`,
`ok`, `skipped`, `reason` and `duration_ms`; the script exits 0 on stage success,
1 on failure and 2 for an unknown stage. The native exit and stage frame both
need validation. No stage result alone qualifies the finished runtime.

Source inspection distinguishes two paths:

- Full bootstrap runs `path` and `config-templates` even with `-NonInteractive`.
  These persist user PATH/default `HERMES_HOME` and create configuration/state.
  A stage driver can omit them, as well as desktop/node/SDK/setup/gateway stages;
  full bootstrap is therefore outside this task's write/profile scope.
- A selective backend sequence can use `repository`, `python`, `venv` and
  `dependencies`, with a fresh explicit target. However, `repository` attempts
  SSH, then HTTPS, then a ZIP fallback; `python` attempts 3.11, then fallback
  minors 3.12/3.13/3.10; `dependencies` contains its documented resolver-tier
  fallback. No installer parameter disables these sequences. This conflicts
  with this operational atom's explicit no-retry restriction. No wrapper was
  invented that pretends an asynchronous stop-on-log prevents the next attempt.

The relevant configured upstream origins are GitHub's NousResearch repository/
archives and Astral's managed-Python distribution through uv, plus PyPI dependency
resolution. Other full-install stages can fetch Git for Windows, Node.js, npm,
browser assets and a CUA driver; those stages were not admitted. No network
request, redirect or package source was exercised by this inspection.

`-InstallRoot` belongs to `scripts/desktop-update/windows.ps1`, which needs an
existing installation and invokes `python -m hermes_cli.main update`, probes
`main update --help`, may retry/rebuild and imports `hermes_cli.main` in validation.
The pinned updater does have `-NoUi` and `-NoGateway`; these do not remove its
prohibited main import/execution. The pinned updater blob SHA-256 is
`e0c611d684e956c6d6231c69e757a0633ba83c8b311e3fecd6934105dfcf59b1`.
The current checkout's updater differs from that blob and was not substituted.

A private manual-root candidate outside the repository, managed/profile roots,
package cache and temp was inspected but not created. Its existing parent
ancestry resolved exactly without reported links; free disk space was about
31.3 GiB. No new runtime/cache resources, installer process, profile, launcher or receipt
were created, so there was no rollback target. Physical overlap and effective
import of a new runtime cannot be qualified while it does not exist.

The installer attempt allowance remains unused. Full artifact closure is no
longer the blocker: the remaining conflict is between the available official
install/update behavior and this atom's operational restrictions. Point 2B and
model/provider work remain unstarted.

Full hash-only baseline/readback of the inspected managed root covered 19,246
regular files (376,658,620 bytes); the profile covered 349 regular files
(3,351,013 bytes). Neither tree contained observed links. Relative entries, file
identities, sizes, modification times and content hashes matched before/after the
verification window. Private contents were hashed only, never interpreted or
saved as evidence files. This full-tree check is distinct from earlier 45-file
installation sampling. Six artifact-inventory tests, five backend regression
tests (including three Python guard cases), and the actual installer's read-only
PowerShell AST parameter/target check passed. No real installation postflight,
write-set/rollback/receipt/new-runtime overlap test is claimed for an unstarted
attempt.

### One authorized stage-driver attempt: BLOCKED, rollback complete

The [one-shot driver](../../scripts/install-hermes-manual.mjs),
[stage wrapper](../../scripts/hermes_manual_install_stages.ps1) and
[boundary helpers](../../scripts/lib/hermes-manual-install.mjs) implement only
the explicit manual operation. They are not imported by Worker/provider startup.
The sequence is `repository`, `python`, `venv`, `dependencies`, with explicit
`-InstallDir`, `-HermesHome`, exact `-Commit`, `-Branch main`, `-NonInteractive`
and `-Json`. It does not invoke full bootstrap, path/config/setup/gateway stages,
Desktop UI or the separate updater. Existing venv presence before the venv stage
is refused so this fresh-install driver cannot enter the installer's global
gateway/process cleanup branch for a replacement venv.

Preflight verifies an absent private root, exact nonlinked parent ancestry,
installer bytes against the pinned local Git blob, disk reserve, full protected
inventories and hashes of selected machine settings. The child receives a fresh
allowlisted environment with private HOME/USERPROFILE/HERMES_HOME, Git config,
uv cache and temp paths. `UV_LINK_MODE=copy` prevents cache hardlink reuse.
The native Windows Job owns the PowerShell driver and descendants before resume,
has a 20-minute timeout and bounded output, and terminates the tree on refusal.
Protected-tree watchers and periodic manual-tree size/link/reserve checks are
best-effort observations, not an OS filesystem/network sandbox. The existing Job
proves process ownership and cleanup, not an enforced child-process-count cap.

The [machine-state readback](../../scripts/hermes_manual_machine_state.ps1) hashes
user/machine PATH, default HERMES_HOME, HERMES_GIT_BASH_PATH, Run registry values
and Startup-folder files without emitting their values. This is a defined set
of settings, not a claim to audit every registry key, scheduled task or system
filesystem write. Ordinary system temp is permitted by the governing operation;
the installation's own caches/temp are redirected inside its private root.

Observed outcome on 2026-09-22:

- An initial preflight encountered an inherited PowerShell module-path mismatch.
  It reported `attemptStarted=false` and `finalRootExists=false`. Pinning the
  system PowerShell module path fixed the read-only state probe; no installation
  attempt had occurred at that point.
- The subsequent **single installation attempt** started under the owned Job.
  The driver's JSON parser rejected process output as `wrapper_protocol` and
  stopped the Job. No stage PASS or fallback event was successfully recorded.
  This is a driver/output-capture failure, not evidence that the upstream
  installer or a package failed. The rejected raw line was not retained, so its
  exact content and the last upstream operation cannot be reconstructed.
- Native process cleanup was confirmed. The owned root and its one-off tool,
  home/cache/temp children were removed after identity/link/overlap checks.
  `cleanup=true`, `finalRootExists=false`; no final runtime, profile, launcher
  or successful installation receipt remains. Free space was 28,922,404,864 bytes
  (about 26.9 GiB) at that readback.
- Full managed readback: **19,246 regular files, 376,658,620 bytes unchanged**.
  Full profile readback: **349 regular files, 3,351,013 bytes unchanged**.
  Selected machine-state hash also matched. No confirmed write outside the owned
  area was observed in these scopes; a complete system write-set is not claimed.
- Configured sources remain the verified upstream GitHub/Astral/PyPI paths.
  No successful network operation or download is attested by the failed capture;
  absence of captured events is not a network audit proving zero requests.

After rollback, the wrapper was corrected to capture all PowerShell streams
(`*>&1`, including informational `Write-Host` output) and set UTF-8 explicitly.
The parser tolerates a leading BOM and retains only byte count/hash for a future
invalid frame. These fixes passed synthetic tests; **the actual installation was
not retried**. They do not retroactively establish the rejected line's cause.

The [minimal identity probe](../../scripts/hermes_manual_identity.py) executes
only attested initializer source under `-I -S -B` with an empty temporary home,
one distribution and exact console entrypoint. It denies initializer effects
and never imports main or site hooks. Its source-import result would not prove
normal-site Desktop startup/protocol behavior. It was tested synthetically but
was not reached against a new runtime. The private receipt contract binds the
source, installer, identity and full runtime inventory; readback drift refuses
qualification. No successful real receipt was produced in this attempt.

Verification: seven [manual-driver tests](../../scripts/hermes-manual-install.test.mjs)
cover ordered exit/frame parsing, target boundaries, hardlink overlap, inventory
drift, rollback ownership, receipt pins, PowerShell child exit/output streams and
synthetic frame transport through the actual owned native Job.
Three [synthetic identity tests](../../scripts/test_hermes_manual_identity.py)
cover minimal source import, duplicate distribution/wrong identity and denied
writes. Five existing backend Node tests (including three Python guard cases)
also passed. Real evidence is limited to the failed capture, owned-process/root
cleanup and protected-state readback. No real effective import, completed stage
set, final-runtime no-overlap or successful receipt PASS is claimed. Point 2B
remains ineligible; there is no automatic retry or model/provider continuation.

### Authorized retry of the corrected driver: same refusal, clean rollback

The next authorization permitted exactly one real retry of the unchanged driver
from commit `bb607909322bae6ce0d65d2adf496500aeb9e655`. Read-only preflight found
the known manual root, runtime, installation home, tool/cache/temp children all
absent, and no previous owned process in the scoped process check. Free space
was 29,338,017,792 bytes (about 27.3 GiB), above the required 20 GiB. Driver bytes
matched that commit. The driver refreshed canonical ancestry, installer identity,
full managed/profile inventories and selected system-state baseline before spawn.

This **second real attempt** again returned `wrapper_protocol`, with no captured
stage PASS or fallback event. The invalid-frame evidence is deliberately limited
to **48 UTF-8 bytes**, SHA-256
`f7b5d6c7e74ca099db21404a775ee2b8776b36dc4a96b7f04cd85673b82ce408`.
No raw output was published or saved. The prior stream/encoding correction did
not resolve the real failure; its precise cause and the last upstream operation
remain unestablished. This is not an attested upstream installation failure or a
successful network/install result. No installer, stage or architecture change
was made during this retry, and there was no third attempt or upstream repair.

Owned Job cleanup and rollback passed again: `attemptStarted=true`,
`cleanup=true`, `finalRootExists=false`. All new owned runtime/home/cache/temp/tool
resources were removed; no final manual installation or receipt remains. Full
readback matched 19,246 managed files (376,658,620 bytes), 349 profile files
(3,351,013 bytes) and the selected machine-state hash. Final free space was
29,307,674,624 bytes (about 27.3 GiB). Network requests/downloads, effective manual
identity and final-runtime isolation were not qualified by the failed capture.
The targeted real preflight/cleanup/readback is the evidence for this retry;
unchanged synthetic suites were not needlessly rerun. Point 2B remains ineligible.

### Direct official stages: repository exit 1, rollback complete

The next authorization permits one logical installation with at most four
sequential direct installer processes, in the same fixed stage order. The active
[driver](../../scripts/install-hermes-manual.mjs) now invokes the verified official
`install.ps1` directly using Windows PowerShell `-NoProfile -NonInteractive`,
explicit `-Stage`, `-InstallDir`, `-HermesHome`, `-Commit` and `-Branch main`.
It no longer invokes the repo-owned PowerShell stage wrapper or `validateFrames`.
No raw-output line is required to be JSON. The previous wrapper and tests remain
historical/inactive for this manual path; provider/managed rules are unchanged.

The [direct-stage validator](../../scripts/lib/hermes-manual-direct.mjs) uses a
shared 20-minute deadline, one invocation per stage and no external retry.
Each process is owned by the existing native Windows Job. Captured stdout/stderr
bytes are streamed into separate `wx`-created files under the owned private cache;
existing native stream limits (128 KiB stdout, 32 KiB stderr per process) remain
fail-closed. Output-limit/timeout/nonzero exit stops the sequence. Only byte
counts, SHA-256, fixed error classifications and mentions of allowlisted official
hosts leave those files. Host mentions are not a network connection audit.

Stage admission requires native exit 0, clean process-tree termination and the
matching filesystem condition: repository commit/tree and source presence;
private compatible managed-Python executable; private venv/interpreter binding;
then one Hermes distribution/version/entrypoint shim. Filesystem PASS is never
inferred from a JSON frame. A nonzero stage does not run the later stages or try
to repair upstream. Protected-tree and machine-setting readback, size limits,
private clean environment and rollback ownership checks are retained.

For a future successful four-stage run, the [RECORD/license inventory checker](../../scripts/hermes_manual_records.py)
reads installed metadata without importing packages, validates RECORD target
boundaries, existence, sizes and supplied hashes, rejects duplicate package
names, and inventories license files. Unhashed RECORD entries are counted rather
than described as cryptographically verified. Alongside minimal effective source
import, exact source commit/tree/working-tree checks, physical non-overlap and
full readback, the result goes into a private receipt published by same-directory
rename and read back. No successful receipt was reached in this run.

Observed direct-run outcome on 2026-09-22:

| Stage | Native exit / filesystem qualification |
| --- | --- |
| `repository` | **1**; filesystem PASS not evaluated after nonzero exit |
| `python` | Not started |
| `venv` | Not started |
| `dependencies` | Not started |

Preflight found the known root absent and no previous owned process. Free space
was 28,485,054,464 bytes (about 26.5 GiB), above 20 GiB. The official installer
bytes/source pin and full protected baselines were refreshed before spawn.
`repository` ended normally with exit 1 (`terminationReason=root_exit`), so the
direct runner obtained a real installer result without a log-protocol refusal.
The only safe failure classification is **`command_unavailable`**. The exact
command name was not retained by the fixed-class summary and is not established.
A later read-only check found Git and uv candidates on registered PATH; that
does not identify which command the installer could not resolve.

| Private stream | Bytes | SHA-256 |
| --- | --- | --- |
| stdout | 410 | `b90f701a9cd63d7e748966f71038bf454fabebaa8e5e2e74e5ebc19c93251ab2` |
| stderr | 82 | `e64a9e3e713b676fb98a310e899b5631ec37f0fd79d7a9a2c09df53409e1e893` |

Raw output was not published. Neither stream's safe summary contained an official
host URL; no fallback or download is attested, and zero network requests are not
proven. Owned Job cleanup passed, followed by exact owned root/home/cache/temp/
tool/log removal. `finalRootExists=false`, no remaining manual resources or
installation receipt. Final free space was 28,462,182,400 bytes (about 26.5 GiB).
Full readback again matched all 19,246 managed files (376,658,620 bytes), 349
profile files (3,351,013 bytes) and the selected machine-state hash. These scoped
checks do not assert a complete system-wide filesystem/registry audit.

Five [direct-runner tests](../../scripts/hermes-manual-direct.test.mjs) passed:
ordered single attempts/shared deadline; stop on exit/timeout/postcondition failure;
filesystem/duplicate-distribution checks; safe log classification; and actual
owned PowerShell transport of non-JSON stdout/stderr into private files. Two
[synthetic RECORD tests](../../scripts/test_hermes_manual_records.py) verify hashes,
license inventory, tampering and path escapes. The actual failed stage,
process/root cleanup and full protected readback are the real evidence. Effective
manual identity, completed dependency inventory, final-runtime no-overlap and
successful receipt remain unqualified. No upstream repair, repeated stage or
point-2B/model/provider work followed this failure.

### Toolchain-qualified retry: source admission refused before installation

The owner next required every external command to have an exact qualified path,
version and hash, with a minimal child PATH, safe system PSModulePath and a
read-only same-environment preflight before one possible direct installation.
The [source analyzer](../../scripts/hermes_manual_source_commands.ps1) parses the
exact hash-checked pinned installer using the PowerShell AST; it never dot-sources
or executes upstream code. It follows the four selected stage functions, common
dispatch/path helpers and their local call closure, recording literal commands,
dynamic call heads, ProcessStartInfo filenames, SSH command strings and PATH writes.
It conservatively records older-install branches too; the fresh-target contract
excludes them rather than pretending those commands are absent from the source.

Source-confirmed stage toolchain:

| Stage/branch | Commands and qualification limits |
| --- | --- |
| Common dispatch | Windows PowerShell host and built-in Management, Utility and Core commands; `Invoke-Stage` calls `Sync-EnvPath` before the worker |
| Repository SSH/HTTPS | `git`; SSH string is `ssh -o BatchMode=yes -o ConnectTimeout=5`; qualified Git package helpers are additional local candidate evidence |
| Repository ZIP fallback | `Invoke-WebRequest`, `Expand-Archive` (Archive module), filesystem cmdlets, then Git init/fetch/checkout |
| Python primary/fallback | uv python find/install for private managed Python; 3.11, then 3.12/3.13/3.10; dynamically resolved private interpreter `--version` |
| Fresh venv | uv via ProcessStartInfo, bound to the private resolved Python; no interpreter download in this stage |
| Dependencies and repairs | uv sync locked, editable pip tiers, entrypoint reinstall and web extra fallback; private Python metadata/import/compile probes |
| Existing venv only, excluded | `schtasks`, `taskkill`, `Get-CimInstance`; driver refuses an existing venv before this stage |
| Short-path normalization only | Add-Type/PInvoke and COM fallbacks are excluded by the actual long-path inputs; cmdlet availability is still checked |

There is no direct curl, tar or cmd invocation in these selected source branches.
`cmd.exe` is catalogued as the planned COMSPEC, not as an observed installer call.
The audit base Python is a separate postflight tool, never a substitute for the
new private installation interpreter. Scriptblock dispatch (`$Script` and
`$StageDef.Worker`) is distinguished from native executable resolution. Dependency
builds can execute further backend/tool code; the installer source alone does not
enumerate or attest that full closure. No speculative compiler list is accepted.

The [qualifier](../../scripts/qualify-hermes-manual-toolchain.mjs) resolves explicit
local installation locations without registered PATH, rejects links/managed
origins and checks physical overlap with protected inventories. The shared
[environment builder and source gate](../../scripts/lib/hermes-manual-toolchain.mjs)
set only qualified command directories and system directories, `.EXE` PATHEXT,
system PSModulePath, private home/temp/cache, empty private gitconfig, no inherited
credential/proxy/shim environment, disabled credential helpers/prompts and uv copy
mode. A [native probe](../../scripts/hermes_manual_toolchain_probe.ps1) checks
Get-Command application resolution, hashes, local versions, system command/module
origin and effective Git configuration/helper directory in that same planned
environment. This is process-environment qualification, not a host sandbox.

Observed local candidate versions and SHA-256 (canonical machine paths stay local):

| Candidate | Version | SHA-256 |
| --- | --- | --- |
| Git dispatcher | 2.49.0.windows.1 | `fec691d80fccc35fcc309fbc9f720536c1d795b8a562ec169f28c9923da9600f` |
| uv | 0.11.8 | `c3f337907f233811954d96e0ecf2d46df094413250ebdcd10d40d9b5c48febd2` |
| Git bundled SSH | OpenSSH 9.9p2 / OpenSSL 3.2.4 | `50f2ed2c4eacea177dc208bbb70679307f5d5fcace69c2c74703da41c1b92ad9` |
| Git bundled sh | Bash 5.2.37 | `fc362aae1f217d34d02237d99527839dd6cf85b37c7a0277109400bfa0faa594` |
| Git core | 2.49.0.windows.1 | `fe0e064c8283dc50b1ce11a8b90d2ec1b68b5dc714ff0b8a8534bb9c43d1d02e` |
| Git HTTPS helper | 2.49.0.windows.1 | `88c65fdef1a1e6d61eb597c1d2efee3696739634f5029d1c17fccddfadd564d2` |
| Windows PowerShell executable | File version 10.0.26100.8972 | `8bb6fa8c283b4d92120b1ef249a9b311b0f804d4cabbe9981159976c8be76a5e` |
| COMSPEC candidate | File version 10.0.26100.1 | `97ac98b1a92c286054cce55239cfccdfc23a5517bd07fe693072c9ca96c7dabb` |
| Separate audit Python | 3.13.1 | `03573716a7fcbd8b7fed8fe0163bbfbd3a852546920d6a666123f307c8dac7d9` |

Core 3.0.0.0, Management/Utility 3.1.0.0 and Archive 1.0.1.0 module paths,
versions and hashes were also resolved locally; 33 source cmdlets/functions and
private Git configuration passed. This does not attest every transitive DLL or
future build backend. CIM is not required in the admitted fresh-venv branch.

The **overall preflight remains BLOCKED**. Source lines 967 and 1262 assign PATH
from User + Machine registry values; `Invoke-Stage` calls the first assignment
unconditionally at line 4952. The official script therefore discards the exact
environment whose resolution was checked. Changing registered PATH, patching
upstream or replacing official stage dispatch is outside this atom and was not
done. The other explicit blockers are generated private Python without a current
exact pre-install identity and the unqualified dependency-build closure. This is
not a diagnosis of the previous deleted raw log: its missing command stays unknown.

No installation stage was started, no runtime or installation receipt was created,
and no model/profile/launcher/provider work followed. Private inspection scratch
was removed. Full managed/profile readback and selected machine-state hashes
matched their baselines (19,246 managed files / 376,658,620 bytes; 349 profile files /
3,351,013 bytes). No actual failure log was retained because no stage ran.

For a future admitted run, [failure retention](../../scripts/lib/hermes-manual-diagnostic.mjs)
keeps at most one bounded private log/receipt pair outside repository/runtime,
checks ownership and old-log hash before replacement, extracts only a simple
missing-command name and rejects detected secret patterns. Raw bytes are never
published. Pattern screening is not a proof that arbitrary output contains no
secret. Retention/rollback/secret deletion are synthetic qualifications only in
this atom; live failure retention was not exercised. Stage success still uses
exit/filesystem evidence. Nine new tests plus five direct-stage and seven manual
regression tests pass. Point 2B remains ineligible; STOP after the scoped commit.

### Normal Windows manual policy: repository interrupted by local monitor

The owner explicitly replaces the previous hermetic toolchain requirement for
this manual Desktop installation. Upstream `Sync-EnvPath` may read normal User +
Machine PATH. Officially downloaded/generated Python and build backends belong
to the trusted installer process and do not need pre-install artifact hashes.
This does not relax any managed Roost provider or autonomous-execution rule.
Upstream bytes, commit/tree, fresh targets, private home/cache/temp/gitconfig,
noninteractive execution, owned Job and the shared 20-minute deadline remain.

The [effective-PATH reader](../../scripts/hermes_manual_effective_path.ps1) uses
the exact upstream registry expression in the same private environment without
writing registry values. The [manual policy helper](../../scripts/lib/hermes-manual-normal-path.mjs)
checks Git, uv, SSH, cmd and PowerShell resolve as applications at explicit
expected installation locations, not aliases or unexpected shadows. Entry-tool
identities and effective PATH are rechecked before each stage. Other source
cmdlets and the private Git configuration use the existing local probe. The
strict analyzer remains available as historical/read-only evidence but is no
longer an admission gate for this manual driver.

Two preparatory checks did not start an installer stage. First, Windows
PowerShell initialized one 1,972-byte startup cache under the new private home
before the driver had reserved the root; the second fresh-root assertion refused.
The exact ten-entry fresh footprint was checked for canonical location, creation
window, links and inventory, then removed. The driver now owns/creates private
directories before any private-environment PowerShell probe. Second, the system
OpenSSH version probe exited 255 without output because PROGRAMDATA was absent.
A read-only comparison confirmed that adding PROGRAMDATA (with SystemDrive)
produces version exit 0. Only those standard system folder selectors were restored;
credential/proxy/askpass variables remain excluded. These were preflight repairs,
not repeated upstream installation stages.

Final preflight passed with normal effective PATH hash
`3fea684a392a423172aeb4c6468beaefa798397944ccbfebc4cc6d3a0bcc04d7`.
Git resolved to the previously recorded 2.49.0 dispatcher. uv resolved to the
Desktop-managed standalone binary 0.12.17, SHA-256
`2019cdf564cb8f749262f5f021cedc75a99abb1c6081227ca340bbcda972611d`,
rather than the older standalone 0.11.8 candidate from the strict probe. System
OpenSSH was 9.5p2 / LibreSSL 3.8.2, SHA-256
`786ff14be7cd652b2b9770a57e9b1aa5e03a052ce3a3d641fb4760c0ff3fde05`.
Neither tool overlaps protected runtime/profile files. Other Git helpers,
PowerShell, COMSPEC and audit Python identities matched the recorded candidates.

Exactly one actual official process was started: **repository**. Its private
diagnostic confirms target/configuration setup, SSH clone, host-key verification
failure and the official HTTPS fallback. During that fallback the local periodic
inventory monitor caught an exception and requested Job termination with
`manual_tree_boundary`. The retained native root exit is **130**; repository did
not pass its postcondition. Python, venv and dependencies never started. This is
controller cancellation, not evidence that the HTTPS installer itself failed.
The underlying inventory exception was discarded by the old generic catch;
no particular filesystem violation or race is proven. Later code now retains a
bounded exception code and the stage's native result on monitor cancellation.
That diagnostic fix was not used to rerun this attempt or backfill its evidence.

The single retained private log/receipt pair is outside repository and runtime.
Raw output is not published. The log is 541 bytes including stream delimiters:

| Evidence | Bytes | SHA-256 |
| --- | --- | --- |
| stdout | 165 | `a43f80a8eea8d03f164fd5218b6b2d72b35410f2b87a63c2b2dbfdbe2dfc2f03` |
| stderr | 361 | `8611fd0e7910537803e978d8a5680b07dfe2207359cf04e44af749d8b1474fe4` |
| Combined private log | 541 | `e45be55cf06b3193542adfd35d8bd145d6aad7f92d7d2e754aa7e93d18ff2c9a` |

Owned Job cleanup and exact new-root removal passed. Full readback matched
19,246 managed files / 376,658,620 bytes, 349 profile files / 3,351,013 bytes and
the selected machine-state hash. Free space after rollback was 28,301,692,928
bytes (about 26.4 GiB). No installation receipt, ready runtime, profile or launcher
exists; the retained diagnostic receipt is not installation acceptance. No UI,
main/serve/chat/gateway, model, Ollama, provider or login was started. Four normal
PATH/environment tests, five direct-stage, four diagnostic and seven manual
regression tests passed.
Point **2A BLOCKED; 2B not ready**. No second actual installation attempt followed.

### Mutable owned-tree observation and the private uv alias

The next owner-authorized atom replaces live immutable inventory checks with
[bounded containment observation](../../scripts/lib/hermes-manual-live-monitor.mjs).
Only stopped trees use stable size/mtime/hash inventories. Live sampling checks
the owned root identity, explicit runtime/home/cache/temp/tools scope, canonical
targets and known protected file IDs; it does not require files to persist between
reads. Concurrent create/write/rename/delete is expected. Descendant I/O errors
are recorded as skipped observations, never as proof of safety. Windows tests
also observed delete-pending handles resolving into the volume's NTFS deleted
metadata area: those samples are skipped, not added to the write allowlist.

The final sampler is bounded to 250 ms per poll so it does not monopolize the Job
controller. Observed byte limits and the free-space reserve remain. It is not an
OS write sandbox and cannot see every write outside the allowed roots or exclude
path races. The accepted manual boundary consists of the private environment,
owned Windows Job, best-effort protected-tree events, canonical scope checks and
complete protected fingerprints/selected machine-state before and after. Repo
edits and tests are scoped controller work, not installer write authority.

Old diagnostic ownership/hash is checked during preflight. It is removed only
after actual child output (or a resumed native result) proves the new attempt
started. Replacement retains at most one private failure log/receipt pair.
Controller reason and bounded monitor code can now accompany empty child streams.

Observed single fresh attempt on 2026-09-22:

| Stage | Outcome |
| --- | --- |
| repository | Exit 0, native cleanup true, exact commit/tree postcondition PASS; official SSH-to-HTTPS fallback accepted |
| python | Exit 0, native cleanup true, private managed Python postcondition PASS |
| venv | Dispatch announced, then controller `manual_tree_boundary` / `live_link`; no qualified native exit/cleanup result or filesystem PASS |
| dependencies | Not started |

The initial live sampler still rejected every link. Read-only inspection after
the stop identified one link, entirely inside the newly created runtime:
`.hermes-runtime/python/cpython-3.11-windows-x86_64-none` points to
`.hermes-runtime/python/cpython-3.11.16-windows-x86_64-none`. This is the observed
private uv version alias, not an escape to managed Hermes. The final sampler
checks alias target containment and avoids duplicate traversal. Stopped manual
inventories accept internal aliases only through explicit `allowInternalLinks`;
their default still rejects links. External targets and known protected hardlink
overlap remain rejected. These alias corrections were tested but not used for a
second installation attempt in this atom.

Automatic rollback initially preserved the tree because the venv cleanup result
was unavailable and strict inventory rejected the alias. A separate bounded
local cleanup checked the observed root object/creation time, exact internal
alias target, full non-overlap inventory and candidate-process absence before
removing only that owned root. The cleanup removed 18,714 files / 1,057,526,336
bytes plus directories and the one internal alias. Root absence and zero matching
candidate processes were read back. This does **not** recreate a native venv
cleanup receipt or prove more than the scoped process inspection.

Driver readback matched all 19,246 managed files / 376,658,620 bytes, 349 profile
files / 3,351,013 bytes and selected machine-state. Full managed/profile hashes
were compared again around local cleanup and remained unchanged. Free space
after cleanup was 25,459,867,648 bytes. No completed runtime, installation receipt,
profile, launcher or point-2B resource remains.

The newest retained private diagnostic is the venv/controller failure: both child
streams are empty, native exit is null, controller reason is `manual_tree_boundary`
and monitor code is `live_link`. The 15-byte stream-delimited log has SHA-256
`3cadabec897fd961a14ae0f164fbcc2d872da835fd7c259079ac6fab44594c72`;
the bounded receipt is 476 bytes. Adding the observed controller diagnosis did
not invent a missing process result. Raw bytes and machine paths are not public.
Successful repository/Python log hashes were emitted in the sanitized stage
results; their temporary files were removed with the owned root.

Four live-monitor tests cover concurrent mutation, out-of-scope targets/protected
hardlinks, internal aliases and sampling/resource bounds. Six diagnostic tests,
five direct-stage, four normal-Windows and seven manual regression tests pass.
No UI/main/serve/chat/gateway/Ollama/model/provider/login ran. **2A BLOCKED; 2B not
ready.** Managed Roost admission remains unchanged.

## Disk/resources and one model store

Metadata-only totals on 2026-09-22: managed venv view **122.6 MiB**, Desktop venv
view **703.6 MiB**, Desktop Electron release **385.0 MiB**. These are logical file
lengths, not physical allocation: redirected/overlapping files cannot be added
as independent disk costs. The decision adds **no installation/model bytes**.
Two runtime domains require separate dependency/update verification and may
retain distinct dependency copies.

Free system-disk space was **35.6 GiB**. The earlier snapshot recorded 31.7 GiB
physical RAM and nominal 6 GB GPU VRAM; free runtime memory and inference speed
were not measured. Storage expansion remains unconfirmed. The
[Ollama listing](https://ollama.com/library/gpt-oss:20b), checked 2026-09-21, lists
a 14 GB MXFP4 artifact and operation from 16 GB memory; these are not a full
execution budget or download approval.

One future Ollama weight store/server configuration stays outside both homes.
Neither runtime gets copied model weights; shared weights never imply shared
conversations, credentials, state or Roost authority.

## Future explicit routing

The [provider registry](../../src/modules/agent-runtime/execution-providers.json)
and [model allowlist](../../scripts/lib/agent-host-model-policy.mjs) are unchanged.

| Provider/model | Separate effort | Evidence boundary |
| --- | --- | --- |
| Codex `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-terra` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` | Local allowlist, not account/runtime availability proof |
| Codex `gpt-5.6-luna` | `low`, `medium`, `high`, `xhigh`, `max` | `ultra` rejected locally |
| Ollama `gpt-oss:20b` | `low`, `medium`, `high` via explicit `think` | Candidate only; digest/endpoint/runtime not admitted |

The [Ollama thinking contract](https://docs.ollama.com/capabilities/thinking)
specifies those GPT-OSS levels. Do not implicitly map efforts or infer equivalent
capabilities. Every route records provider/model/digest, effort/profile, reason,
capability/quality evidence, risk/privacy, context/output budget, quota/cost,
resources, latency and authority. Missing evidence/quota/resources block or queue
the task. A replacement route needs a visible decision and fresh applicable
authority; scope, one-writer, review and release gates persist, and spent grants
cannot be revived.

Local coding/autonomy requires a separately authorized low-risk, non-sensitive
evaluation with expected results and predefined quality, format, failure, resource
and latency criteria. Installation or one response does not establish admission.

## Validation and closure

Small Node regressions cover result privacy/schema, clean environment, sharing
criteria and missing/changed/physical snapshot identities. Synthetic Python guard
tests cover mutations, network/process/native execution, secret/profile reads,
site hooks, nonminimal imports and unknown effects. Existing effective-config
admission tests remain in scope. Syntax, docs/link/privacy/diff checks are required;
full `npm run validate` and runtime/provider tests are outside this atom.
Final checks passed: 23 Node cases (one runs all three synthetic Python guard
tests), JavaScript syntax, 443 local links, scoped privacy/diff and documentation
budgets (default context 103,208 bytes). Eight pre-existing modified tracked
files retained their hashes; `design-qa.md` was not read or staged.

The decision atom is complete; manual launch and Roost execution remain
unqualified. No profile/model download/Ollama launch/login/install mutation/push/
deployment was performed. The subsequent point-2 preflight stopped before private
writes; its refusal does not authorize installation changes or point 3.
