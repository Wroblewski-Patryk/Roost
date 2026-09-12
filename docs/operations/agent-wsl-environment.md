# RF-HOST-031: dedicated Ubuntu WSL environment

## Current result

**PARTIAL**, verified 2026-09-13. One dedicated Ubuntu 24.04 LTS user
distribution is installed, healthy, WSL 2 and non-root by default. Docker
integration is unavailable from its Linux environment, so this is **not**
READY-FOR-OPENSHELL-PREFLIGHT. OpenShell, Hermes and Codex were neither installed
nor executed. There was no model inference, push or deployment.

This resolves only the missing-user-distribution prerequisite from
[RF-HOST-030](openshell-wsl-feasibility.md). Whole-process isolation, capture,
filesystem restrictions, network policy and sandbox cleanup remain unproven.
The existing provider/Worker admission contract does not change.

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

## Docker and mount observations

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

## Cleanup, gates and next task

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

Recommended next atomic task, **not started**: authorize enabling Docker Desktop
WSL integration only for the dedicated distribution, including any required
Apply/restart in an owner-approved window. Verify native client/socket/server
access without pulling images or starting containers, then stop that distribution.
Do not combine that task with installing OpenShell or executing any model.
