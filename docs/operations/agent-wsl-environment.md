# RF-HOST-031/032: dedicated Ubuntu WSL environment

Current follow-up: [RF-HOST-033](openshell-installation-preflight.md) is BLOCKED:
the native Docker socket was absent on the next cold start. The successful
RF-HOST-032 observations below are retained; they do not establish persistence.

## RF-HOST-032 result

**READY-FOR-OPENSHELL-PREFLIGHT**, verified 2026-09-13. The dedicated Ubuntu
24.04 LTS distribution has working native Docker Desktop integration under WSL 2, with a non-root
default user. RF-HOST-032 passed client/server and existing-workload continuity
checks after one supported Apply/restart. Scoped termination returned success;
two early inventories still reported Running, but the final inventory confirmed
Stopped without another termination, Docker restart or settings workaround.

This establishes environment prerequisites only, not execution admission.
OpenShell, Hermes and Codex were neither installed nor executed in this
environment. There was no model inference, push or deployment.

This resolves only the missing-user-distribution prerequisite from
[RF-HOST-030](openshell-wsl-feasibility.md). Whole-process isolation, capture,
filesystem restrictions, network policy and sandbox cleanup remain unproven.
The existing provider/Worker admission contract does not change.

The installation sections below retain RF-HOST-031 evidence. The
[RF-HOST-032 integration result](#rf-host-032-integration-and-lifecycle-result)
supersedes its missing-Docker observation and recommended integration task.

## Installation and account boundary

The source is Canonical's stable
[Ubuntu 24.04.5 WSL AMD64 image](https://releases.ubuntu.com/24.04.5/ubuntu-24.04.5-wsl-amd64.wsl).
The downloaded 388,975,696-byte archive matched the release
[SHA256SUMS](https://releases.ubuntu.com/24.04.5/SHA256SUMS) entry:
`bb415d824822c4b878125729af451a5d18fb13d1cf5cbed9a7393ad64ac6039e`.
No installer script, development image or application container was used.

Canonical documents [WSL image installation](https://documentation.ubuntu.com/wsl/latest/howto/install-ubuntu-wsl2/);
Microsoft supports [importing a root filesystem and configuring its user](https://learn.microsoft.com/en-us/windows/wsl/use-custom-distro).
The verified image was imported once with `--version 2` into a new private
installation directory. There were no intermediate distribution imports,
exports, duplicate registrations or Windows/WSL upgrades.

Explicit administration in the new distribution created one operational account
with its own home/group, `/bin/bash`, a locked password and no administrator
group membership. Root's password is also locked. No reusable password, token,
SSH key, passwordless sudo rule or other secret was created. Root remains
available through an explicit host invocation with `--user root`; non-root
defaults are not a security boundary against the Windows account owner.

Both the distribution's `[user] default` and WSL's `--set-default-user` select
that operational account. The new distribution alone has `[boot] systemd=false`
to avoid starting its packaged services on subsequent boots. No host startup
entry, scheduled task, recurring window or background service was added. No
extra packages/toolchains/model dependencies or repositories were installed;
the official Ubuntu image includes its own OS packages (523 reported by dpkg).

## Verification and disk footprint

Machine-specific names, account/registration IDs, installation paths and the
complete local command result are retained only in a private installation
receipt outside the repository. The following commands are templates; replace
placeholders from that receipt rather than inferring another distribution.

| Command/check | Result |
| --- | --- |
| `wsl.exe --version`; `wsl.exe --list --verbose` before mutation | WSL 2.5.9.0; only the existing internal Docker distribution. |
| `wsl.exe --import <distribution> <private-install-dir> <verified-image.wsl> --version 2` | Exit 0; exactly one new user distribution. |
| Explicit `--user root --cd / --exec /bin/sh -s` administration | Created/locked the operational account, checked no admin groups and wrote only new-distribution configuration. |
| `wsl.exe --manage <distribution> --set-default-user <operational-user>` | Exit 0; registry default user is non-root. |
| `/etc/os-release`, `uname -m`, `uname -r` inside the new distribution | Ubuntu 24.04.5 LTS, version ID 24.04, x86_64, kernel 6.6.87.2-microsoft-standard-WSL2. |
| Two starts after scoped termination, without `--user` | Exit 0 as the expected non-root account; harmless shell command and `id -u` checks passed. |
| `df -B1 --output=size,used,avail /` | Guest filesystem used 1,333,235,712 bytes, about 1.24 GiB. |
| New distribution's `ext4.vhdx` file length | 1,488,977,920 bytes, about 1.39 GiB. This is file length, not a measured NTFS physical-allocation total. |
| `wsl.exe --terminate <distribution>` then inventory | Exit 0; new distribution Stopped under WSL 2. Existing internal Docker distribution remained Running and the WSL default was unchanged. |

The dynamically growing filesystem reports a roughly 1-TiB capacity; that is
not disk space consumed. No fixed-size disk, resize, compaction or extra image
copy was created. No reboot or global `wsl --shutdown` was required or run.

## RF-HOST-031 Docker and mount observations

`/mnt/c` is mounted by WSL defaults. Windows paths are inherited in the default
PATH. No `[automount]` or `[interop]` expansion was configured and no repository,
credential directory or real Codex home was explicitly mounted or copied. Host
drive accessibility is **not** filesystem isolation; hardening is a later task.
Absence of a particular binfmt registration was not treated as proof that
Windows interoperability is disabled.

The inherited PATH can resolve a Windows-side Docker wrapper. With PATH limited
to standard Linux directories there is **no native Docker CLI**, and
`/var/run/docker.sock` is **absent**. Docker server access from this distribution
is therefore unverified/unavailable for the required Linux route; the Windows
wrapper was not executed as a substitute. No Docker daemon, workload, container,
network, image or volume was queried, installed or changed.

Docker's [official WSL integration instructions](https://docs.docker.com/desktop/features/wsl/)
locate the setting under **Settings > Resources > WSL Integration**, followed by
Apply. Enabling the new distribution requires a Docker Desktop settings change,
which is outside RF-HOST-031. No toggle, restart or backend change was attempted.

## RF-HOST-031 cleanup and gates

Retained: exactly one dedicated distribution/VHDX, its operational account and
minimal config, and one private installation receipt. The downloaded archive,
two temporary administration/verification scripts, their unique temporary
directory and intermediate private scratch records were removed. Absence of
each temporary target was explicitly checked. No temporary import remains.

The reusable `node scripts/openshell-wsl-preflight.mjs` now reports one user WSL 2
distribution and `further_checks_required`, correctly requiring Docker integration
and sandbox evidence. Its successful exit is not readiness or execution authority.
Native checks above, the seven preflight unit tests and diff validation cover
this documentation-only repository change; no application/API/DB/UI build or
test suite is needed to establish these installation facts.

Keep `executionSupported:false`, `pilotReady:false`, Hermes disabled and workers
in `observe`. The previous RF-HOST-030 commit and this task's commit remain local;
neither may be pushed as an implicit follow-up.

RF-HOST-031 recommended a separately authorized Docker integration task. Its
subsequent result follows; the original installation itself did not change Docker.

## RF-HOST-032 integration and lifecycle result

The owner authorized integration only for the dedicated distribution and at
most one Apply/restart. Docker Desktop 4.89.0.238018 exposed the documented
**Settings > Resources > WSL Integration** setting. Only the dedicated
distribution's toggle was enabled; integration with the default WSL distribution
remained off. The UI required **Apply & restart**, invoked exactly once. Its
status changed from Engine stopping to Engine running, with Apply then disabled.
No undocumented settings file was patched and no Docker/WSL update was performed.

Before mutation, a private receipt recorded daemon availability and the names,
running states and restart policies of the two running containers. Both used
`always`. After restart, both were Running with unchanged policies and the same
running-name set; they were still Running after the scoped WSL termination.
This verifies running-state continuity only, not application health or data
contents. No application payload, logs, environment, mounts or secrets were
inspected. Machine/account/container identifiers remain outside the repository.

| Bounded check | Result |
| --- | --- |
| Host `docker version --format <client/server-version-fields>` | Client and server 29.7.2 before and after; each call bounded to 10 seconds. Post-Apply daemon check succeeded without retry. |
| Host Docker context/endpoint fields | Local Docker Desktop Linux engine over a Windows named pipe; no remote daemon was used. |
| `wsl.exe --distribution <distribution> --cd / --exec /usr/bin/env -i PATH=<standard-Linux-directories> HOME=<Linux-home> USER=<operational-user> /bin/sh -s` | Exit 0 within a 30-second bound, with no `--user` override; expected non-root identity and harmless command passed. |
| `command -v docker`, `readlink -f`, first four executable bytes | `/usr/bin/docker` resolves to Docker Desktop's shared Linux CLI under `/mnt/wsl/docker-desktop/cli-tools/`; ELF magic confirmed. No Windows PATH wrapper. |
| `test -S /var/run/docker.sock`; selected context endpoint | Unix socket, resolved `/run/docker.sock`; context `default`, endpoint `unix:///var/run/docker.sock`. |
| Linux `docker version --format <selected-fields>` | Client 29.7.2 Linux/amd64 and server 29.7.2 Linux/amd64. |
| Linux `docker info --format <selected-fields>` | Docker Desktop, Linux/x86_64; builtin seccomp and cgroup namespace reported. These fields do not prove sandbox policy enforcement or Landlock support. |
| `wsl.exe --terminate <distribution>` | Exit 0 once; two early inventories reported Running, then the final inventory confirmed Stopped under WSL 2. No further distribution entry, termination loop or restart followed. |
| Final host daemon/workload checks | Docker Desktop remains available; both prior running workloads remain Running with unchanged restart policies. The global WSL default is unchanged. |

No stale-socket/listener failure appeared in the bounded daemon check or UI.
No files were removed to repair Docker. There was no global WSL shutdown,
container start/recreate/build/pull/remove or image/network/volume mutation.
The Docker settings workflow supplied the integration CLI/socket; no separate
Linux Docker package, daemon, OpenShell, Hermes, Codex or model was installed.

Retained resources are the existing dedicated distribution/VHDX, its enabled
Docker integration and one additional private verification receipt. No temporary
scripts or downloaded files were created. VHDX file length remains 1,488,977,920
bytes; guest filesystem use was 1,333,399,552 bytes (163,840 bytes above RF-HOST-031).
Physical NTFS allocation and per-distribution RAM were not measured. The
distribution is Stopped at handoff; Docker Desktop remains Running.

Filesystem isolation remains **UNPROVEN**: `/mnt/c` and inherited Windows paths
were not hardened, and daemon connectivity is not containment evidence. The
local host remains online in `observe`, provider disabled and
`executionSupported:false`; registry `pilotReady:false` and Hermes disabled
remain unchanged. No API/DB/protocol or execution-admission contract changed.

The seven existing preflight unit tests and `git diff --check` pass. The reusable
preflight remains deliberately limited to prerequisite inventory and reports
`further_checks_required`; it cannot certify this integration or grant execution.
Application/API/DB/UI suites were not run for this documentation-only change.
All three RF-HOST-030/031/032 commits remain local and must not be implicitly pushed.

Next atomic task, **not started**: a bounded OpenShell-specific prerequisite
preflight against this Linux environment, checking the candidate's supported
platform and kernel/security requirements and defining its installation/resource
plan. Native Docker access alone does not prove whole-process containment.
Any installation or sandbox/container trial requires its own explicit scope;
no model execution or agent activation follows automatically.
