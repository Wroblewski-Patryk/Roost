# RF-HOST-033: pinned OpenShell installation/security preflight

RF-HOST-037 [static base audit](openshell-static-base-audit.md) subsequently
verified all 13 local base-image layers and documented the final filesystem.
Named Docker/control clients are absent within the audit's stated scope;
system control tools and bundled agents are present. The bundled policy is too
permissive for the planned test. Static READY grants no runtime admission.

Current result: **RF-HOST-036 installed and verified the pinned CLI and exactly
three OCI images on 2026-09-13, without activating a runtime.** The owner gave
separate artifact-installation authority after the
[RF-HOST-035 prerequisites](host-lifecycle-safety.md) passed. The immutable pins
below are unchanged. No gateway, supervisor, sandbox or agent was started.

## RF-HOST-036 installed artifacts and proof limits

Fresh pre-mutation checks passed: Windows Engine and native Linux client/server
**29.7.2**, Linux/amd64, default non-root WSL identity, native ELF Docker CLI
and Unix socket. Windows build 26200 and Running/Auto LanmanServer were
confirmed. Both Windows and guest had no listeners on 8080/8081. The guest was
x86_64 with kernel 6.6.87.2-microsoft-standard-WSL2, 15,347,876 KiB available
memory, Landlock ABI 3 and a successful read-only seccomp action-availability
probe. These are host-interface checks, not applied sandbox restrictions.

Physical host storage had **23,133,343,744 bytes** free before installation,
clearing the planned 10 GiB installation reserve plus 10 GiB headroom. Guest
filesystem capacity was checked separately and was not substituted for physical
free space. All three approved image references and the new versioned Linux
installation root were absent at baseline.

The two official release downloads matched both their pinned byte lengths and
SHA-256 values in the artifact table below. The checksum-list entry also matched
the archive. SHA verification preceded extraction. Seven synthetic negative
path/type checks passed; the actual archive contained exactly one regular file,
with no links/devices, duplicate paths or escaping entries. Extraction used
exclusive file creation, ignored archive ownership/privilege bits and remained
inside the new private installation root.

| Installed CLI evidence | Result |
| --- | --- |
| Release | `v0.0.116`, unchanged pinned source commit below |
| Executable bytes | **22,271,920** |
| Executable SHA-256 | `24e85062073d512d1951c76cd3890b7bce1ab01cc36a08f88b3b43c067a402da` |
| ELF metadata | 64-bit, little-endian, x86_64 |
| Only invocation | `--version` returned `openshell 0.0.116`, exit 0 |
| Permissions/environment | Private directories 0700, binary 0500; private HOME and XDG config/state/data/cache; no global PATH change or real Codex home |

The following were pulled sequentially using full `@sha256` references and
`--platform linux/amd64`, never discovery tags. Each exact `RepoDigests` entry
matched its approved reference; `Os=linux` and `Architecture=amd64`. On this
Engine's image store, local `Id` equals the platform-manifest digest shown here,
not the separate image-config digest. All three were inspected again afterward.

| Image | Verified local Id (SHA-256) | Reported image Size | Pull duration |
| --- | --- | ---: | ---: |
| Gateway | `06bbd3eb7b3a1e88fc85d4914221f9a8b345e67cc1a9bab164814c2cfa0f80d9` | 48,574,109 B | 14.371 s |
| Supervisor | `1f02f37ee9e16c3b1245b80899a954fc8198099494d4fe0cd1e891fc63adf127` | 17,373,381 B | 7.348 s |
| Community base | `c2a43bb0d765774e2790b3babfb20997bb2eac7b4bf4c6d7d8661e99817bf904` | 1,399,652,505 B | 222.809 s |

Reported image Size is not a measurement of exclusive physical disk allocation.
Afterward the host had **20,390,486,016 bytes** free, still above the required
10 GiB headroom. Windows Engine remained 29.7.2; the same two baseline workload
names remained Up. Only names/status were read, without container payloads,
logs, environment, mounts or restart policies. Both WSL distributions remained
Running and were left to their natural lifecycle.

The private Linux receipt inventories the version root, created directories,
archive, checksum list, executable hashes and the three image references/IDs.
Final inventory found exactly these three artifact files plus the receipt, with
zero unexpected files. Private Windows evidence records host checks and the
Linux receipt hash. Paths and workload identifiers are intentionally absent here.
The selective rollback plan requires a separate owner decision, unchanged owned
paths/hashes and no container use of an image reference. Remove only recorded
unused references and owned files/empty directories inside this version root;
preserve ancestors, other workloads and all Docker/WSL settings and socket,
stale or recovery directories. No rollback or broad cleanup was executed.

Validation: seven inventory-preflight tests, seven negative archive checks,
two pinned download hashes, all three canonical image references and repeated
local image/CLI integrity checks passed. No runtime code or repository tests
were added; full build, API/DB tests and container builds were not run for this
documentation-only repository change.

**At RF-HOST-036, still unproven:** image executable/content inventory (the
subsequent RF-HOST-037 audit above narrows this gap), signatures/attestations,
dependency/vulnerability suitability, gateway
configuration and mTLS, callback/bind resolution, child/admin separation,
Landlock/seccomp/network enforcement, process-tree cleanup, CPU/RAM/PID limits,
hard bounds on every writable/log path, whole-path 32-KiB output capture and
live provider compatibility. No container/network/volume, certificate, gateway
configuration, service or autostart was created. No package manager, installer
script, image build, alternate image, model, Hermes or Codex invocation occurred.
Worker remains online/observe, provider disabled, `executionSupported=false`,
`pilotReady=false` and Hermes disabled. Installation does not relax admission.

The then-recommended offline inventory was completed by RF-HOST-037 above.
Its next task is recorded in that audit; the later live gates below remain mandatory.

## Historical RF-HOST-033 verdict and authority

**BLOCKED**, checked 2026-09-13. Release artifacts and the Docker deployment
candidate are identified, but the prepared user distribution no longer exposes
`/var/run/docker.sock` after a cold start. Two native Linux probes failed while
the Windows Docker client could reach the existing daemon. The earlier
[RF-HOST-032 success](agent-wsl-environment.md) is historical evidence, not
proof that integration survives a subsequent start. No settings repair or
restart was authorized or attempted. **READY-FOR-PINNED-OPENSHELL-INSTALL is
withheld.**

This is an installation contract proposal, not an executed procedure. No
OpenShell binary, gateway, supervisor, sandbox, agent or model was installed
or run. Only official metadata/source text and existing OS read-only probes
were used. A private receipt holds machine-specific observations; this document
contains portable requirements and artifact references.

## Supported route and minimum requirements

The [NVIDIA support matrix](https://docs.nvidia.com/openshell/reference/support-matrix)
lists Windows x86_64 through WSL 2 + Docker Desktop as **experimental**. Select
the **Docker compute driver**, a containerized gateway from NVIDIA's
[Compose topology](https://docs.nvidia.com/openshell/get-started/tutorials/docker-compose),
and the static Linux musl CLI inside the dedicated Ubuntu distribution. Docker
Engine/Desktop must expose Engine **28.0 or later**. The CLI needs no host glibc;
the alternative standalone Linux gateway needs glibc **2.28+**, but is not part
of this selected route. No numerical Compose minimum is stated in the tutorial;
the Compose plugin must be available. seccomp is required (Linux 3.17+ in the
matrix); the strict filesystem prerequisite is the Landlock ABI described below.

[Docker's Windows prerequisites](https://docs.docker.com/desktop/setup/install/windows-install/)
require WSL **2.1.5+**, 64-bit Windows 10 22H2/build 19045 or Windows 11
23H2/build 22631 or newer, a supported servicing state/edition, hardware
virtualization/SLAT, at least **8 GB RAM**, and automatic/running LanmanServer.
Linux containers are the selected mode. Optional Enhanced Container Isolation
requires WSL **2.6+**; it is not configured or claimed here.

Kubernetes/Helm and Podman would introduce a different runtime and are excluded.
MicroVM uses KVM on Linux or Hypervisor.framework on macOS. A KVM device exists
in this WSL guest but is inaccessible to its default user; nested virtualization
and libkrun were not verified. Therefore MicroVM is not an admitted fallback,
not a claim that KVM is universally impossible in WSL. No VM binary is needed.

## Immutable artifact contract

The official [release API](https://api.github.com/repos/NVIDIA/OpenShell/releases/tags/v0.0.116)
still reports stable **v0.0.116**, published 2026-08-28T09:10:23Z, not a draft
or prerelease. The [tag reference](https://api.github.com/repos/NVIDIA/OpenShell/git/ref/tags/v0.0.116)
resolves to commit `d1155aa70042d3e2ee49dbfa15346b108b7c1d92`.
Tags alone are mutable: later installation must verify the hashes below and
use OCI digest references, never a floating installer or tag.

| Host artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| [CLI Linux x86_64 musl archive](https://github.com/NVIDIA/OpenShell/releases/download/v0.0.116/openshell-x86_64-unknown-linux-musl.tar.gz) | 8,921,130 | `4fb4476d80a1875a0b83547ec3aba999cf0a2e2d75f95f2f709b622e2103520e` |
| [CLI checksum list](https://github.com/NVIDIA/OpenShell/releases/download/v0.0.116/openshell-checksums-sha256.txt) | 1,393 | `f8b6ec65366f9d256737b884ba4d9f184b4dbbbb9540711ed9e4934d772eba7e` |

At RF-HOST-033 preflight, the checksum list was hashed in memory and its CLI
entry matched the release asset digest. RF-HOST-036 subsequently verified the
downloaded archive and executable bytes as recorded above. No host gateway, supervisor, VM,
Debian/RPM/Snap package, Python SDK or installer script is required by this route.

The following three **linux/amd64 platform digests** are the installation
references, each prefixed with `ghcr.io/` and suffixed with `@sha256:<digest>`.
The human-readable tag records discovery only.

| Repository / discovery tag | linux/amd64 manifest SHA-256 | Compressed layer bytes | Layers |
| --- | --- | ---: | ---: |
| `nvidia/openshell/gateway:0.0.116` | `06bbd3eb7b3a1e88fc85d4914221f9a8b345e67cc1a9bab164814c2cfa0f80d9` | 48,564,287 | 23 |
| `nvidia/openshell/supervisor:0.0.116` | `1f02f37ee9e16c3b1245b80899a954fc8198099494d4fe0cd1e891fc63adf127` | 17,371,057 | 3 |
| `nvidia/openshell-community/sandboxes/base:fffb6b2` | `c2a43bb0d765774e2790b3babfb20997bb2eac7b4bf4c6d7d8661e99817bf904` | 1,399,641,771 | 13 |

| Image | OCI index SHA-256 | linux/arm64 manifest SHA-256 (not selected) |
| --- | --- | --- |
| Gateway | `05cf77bbb022a739aed6f22daa0e7e164415f4ab273b5f84319e46d91eb8f645` | `3d08ad1e7d839a2ffb9ac85a66102b96dd6bc042c3a6f1eaa31351998fd65792` |
| Supervisor | `c8c42aef16c200063e32cbf72e553e4ead027085427b555efafd95063ecead42` | `34e0ba2b07008d9707321e3522277c4ca380af1b539534a2ab56dfce943532f7` |
| Base | `aeef1c63f00e2913ea002ccb3aaf925f338b5c5d70e63576f0d95c16a138044e` | `04dd51f785ae52557ac53d4b12b3a0611a7347e5b8738e6278203465e6fb726e` |

RF-HOST-033 metadata evidence is the official GHCR v2 index/platform-manifest response for each
repository/tag. Every response-body SHA-256 matched its digest; amd64 children
also matched their index descriptors. No layer or config blob was downloaded
during that preflight; RF-HOST-036 later pulled the three approved references.
The private receipt retains manifests, descriptor/config sizes and sums.
Attestation descriptors were observed, but attestations/signatures and image
contents were not verified. Digest integrity is not a vulnerability assessment.

The base tag maps to NVIDIA OpenShell Community commit
`fffb6b2248ff6ba585f50517f3711b08122089f2`; its
[build workflow](https://github.com/NVIDIA/OpenShell-Community/blob/fffb6b2248ff6ba585f50517f3711b08122089f2/.github/workflows/build-sandboxes.yml)
publishes short-commit tags. Its
[Dockerfile](https://github.com/NVIDIA/OpenShell-Community/blob/fffb6b2248ff6ba585f50517f3711b08122089f2/sandboxes/base/Dockerfile)
declares a non-root sandbox user, Python 3.14.3 and bundled agent/development
tools. It does not explicitly install Docker CLI. This is the documented base
candidate, not a minimal audited runtime; actual absence of Docker CLI and
unexpected executables requires later content verification. Bundled real Codex
and other agent CLIs must not be invoked by the fake-server experiment.
Python 3.14 is not acceptance of the separately pinned Hermes dependency range.

## Historical RF-HOST-033 read-only prerequisite results

| Check | Result and limit |
| --- | --- |
| Platform | Dedicated Ubuntu 24.04.5 LTS, WSL 2.5.9.0, x86_64, kernel 6.6.87.2-microsoft-standard-WSL2. Default account remains non-root. Host build clears Docker's numeric Windows 11 floor; LanmanServer Running/Auto. No Windows support-lifecycle attestation is implied. |
| Native Docker | Linux CLI 29.7.2, client API 1.55 available on Linux-only PATH. `/var/run/docker.sock` absent; native server version/API and connectivity **FAIL**. Empty daemon fields from the failed `info` call are unavailable, not zero resource capacity. |
| Host Docker, separate route | Desktop 4.89.0.238018; Engine 29.7.2, API 1.55, minimum API 1.40, Linux/amd64. These values do not substitute for the failed WSL connection. |
| Compose | Plugin v5.5.0 from selected `docker info` client-plugin metadata. No Compose command or service lifecycle operation was executed. |
| Cgroups/namespaces | Guest cgroup2fs; cpu, cpuset, io, memory and pids controllers present. cgroup/ipc/mnt/net/pid/user/uts interfaces present. Host daemon reports cgroup v2/cgroupfs. Namespace creation inside a future container remains untested. |
| seccomp | Kernel CONFIG_SECCOMP and CONFIG_SECCOMP_FILTER enabled; read-only GET_ACTION_AVAIL for KILL_PROCESS returned success. The ordinary guest probe has Seccomp=0; availability is not an applied sandbox filter. |
| Landlock | CONFIG_SECURITY_LANDLOCK enabled; read-only `landlock_create_ruleset(NULL,0,VERSION)` returned ABI **3**, errno 0. No ruleset or restriction was created. Unreadable securityfs LSM list was not treated as absence. |
| Service manager | PID 1 is WSL init; systemd remains intentionally disabled. The selected Docker gateway requires an existing daemon and plugin, not guest systemd. No service/package installation is planned. |
| Ports | No TCP listeners on 8080/8081 in the user WSL namespace or Windows listener snapshot. No socket was bound. This does not reserve ports or prove future Docker callback routing. |
| Capacity | Snapshot clears 20 GiB free on the physical Windows storage volume and 10 GiB available guest memory. Guest dynamic VHD capacity is not physical free storage. Precise installation-specific values remain private. |
| Cleanup | One scoped termination returned 0; subsequent inventory confirmed the user distribution Stopped and internal Docker distribution Running. No global shutdown or Docker restart. |

NVIDIA calls Landlock recommended and seccomp required in its support matrix.
The [pinned Landlock implementation](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-process/src/sandbox/linux/landlock.rs)
constructs ABI **V2** rules; the guest's ABI 3 clears that interface prerequisite.
The [policy contract](https://docs.nvidia.com/openshell/reference/policy-schema)
distinguishes `best_effort` from `hard_requirement`. This experiment must use
`hard_requirement` with nonempty, valid path rules: missing support or paths
must fail startup. Never silently downgrade. Kernel/interface observations
outside the actual sandbox cannot establish enforcement inside it.

## Control-plane and sandbox boundary

The [pinned Docker driver](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-driver-docker/README.md)
uses the host daemon to create sibling sandbox containers. The trusted gateway
alone receives the daemon socket; its root user/socket access has administrative
power over all local workloads. The WSL user's socket access, when restored,
is likewise administrative capability. Neither is sandbox isolation.

Keep the Docker socket/CLI, container-management API, real repositories,
credentials, real Codex home, `/mnt/c` and arbitrary host mounts out of the agent
container and its environment. Leave `enable_bind_mounts=false`; reject all
user-supplied bind/volume mounts at the trusted Worker boundary. This gateway
flag alone does not forbid existing named-volume access. Only necessary internal
supervisor/control-material mounts and explicitly bounded scratch are admissible.

The combined supervisor starts with elevated container capabilities, then creates
nested namespaces and applies privilege drop, Landlock and seccomp to children.
It is part of the trusted boundary; the agent must receive none of those
privileges. The Docker driver requests SYS_ADMIN/NET_ADMIN/SYS_PTRACE/SYSLOG
and unconfined AppArmor, so container defaults alone are not sufficient evidence.

Use [local mTLS user authentication](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/docs/reference/gateway-auth.mdx),
not the tutorial's plaintext setting: disable_tls=false,
OPENSHELL_ENABLE_MTLS_AUTH=true, private ephemeral server/client certificates
through OPENSHELL_TLS_CERT/KEY/CLIENT_CA, and no unauthenticated user mode.
Only Worker/CLI receive the administrator client identity. Supervisor bearer
tokens are sandbox-scoped and must not be exposed to agent children. Verify that
the agent cannot access gateway administrative methods, even through callbacks.
No provider credentials, inference route, OIDC login or cloud account is needed.

## Staged installation and rollback plan

RF-HOST-036 completed only the artifact installation/pulls in steps 1–3.
Content/security admission and steps 4–7 remain unexecuted and require their
own authority; this plan does not authorize starting a runtime.

1. RF-HOST-035 established the permitted natural-use prerequisite; healthy
   Running with the integration proxy is acceptable and forced termination is
   prohibited. Recheck native Docker, free storage/ports and the private
   existing-workload baseline before a separately authorized installation.
2. Under a new private Linux installation root, download only the CLI archive
   above, verify SHA-256 before extraction, reject escaping archive entries,
   and keep the binary versioned. Use private XDG config/state/data directories;
   never reuse real Codex/auth directories or copy repositories.
3. After separate pull authority, acquire only the three amd64 digest references.
   Verify actual image IDs/platform/content, Docker-CLI absence and policy input
   before sandbox admission. A mismatch stops the task; no automatic rebuild,
   dependency upgrade or alternate image selection.
4. Adapt the [pinned Compose file](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/deploy/docker/docker-compose.yml)
   and [gateway config](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/deploy/docker/gateway.toml)
   privately: digest-pin gateway/default_image/supervisor_image, restart `no`,
   command `[]`, explicit Docker driver, dedicated namespace/network and mTLS.
   Publish only loopback 8080 control and 8081 health. Preserve the matching
   callback port; configure guest TLS material for the supervisor separately
   from the administrator identity. No global Docker settings change.
5. The supervisor cache must be resolvable at the same absolute source/target
   path by the gateway and Docker daemon. WSL client path translation makes
   this a required later bind-resolution test, not an assumption. Use a new
   installation-owned path only; fail if it already contains unknown data.
6. A later gateway-only verification has a 120-second readiness deadline and
   ten-minute total lifetime, followed by explicit cleanup. No autostart,
   systemd unit, scheduled task, recurring shell, restart policy or unattended
   agent. Start no sandbox until the additional live gates below are resolved.
7. Rollback first ends only experiment sandboxes, then its gateway. Remove only
   recorded experiment container/network IDs and owned private config/cache/TLS/
   fixture files. Remove an image only if introduced by this installation and
   unreferenced by pre-existing resources. Never global prune, wildcard deletion,
   shared-volume deletion or workload recreation. Verify the earlier workload
   baseline, then let the dedicated WSL distribution idle naturally. Healthy
   Running with its integration proxy is acceptable; never force termination.

Source SHA-256 values before private adaptations:
Compose `856b994c1e1ec7af3954de03d768f2dc8ec28e751c1bdc0235f54206f79df184`;
gateway TOML `e8e0600fc3e0700f19e70e9ff5e755b3c30fcb72043ec7d13aaf40b338b5ac84`.
Record new private hashes after applying the reviewed settings; do not execute
the upstream examples unchanged.

## Resource estimate and unresolved live gates

Unique compressed layers total **1,465,577,115 bytes (1.365 GiB)**. Including the
CLI archive gives **1,474,498,245 bytes**, plus small manifest/checksum metadata.
No base-image build dependencies are additional pulls when using these final
digests. Exact unpacked sizes cannot be inferred from compressed descriptors.
Plan a **10 GiB incremental disk reservation**, retaining at least 10 GiB host
headroom: approximately five times compressed size for download plus expanded
storage, 128 MiB CLI/supervisor allowance, 1 GiB runtime/state and remaining
headroom. This is a conservative planning assumption, not an enforced quota.

Proposed ceilings: one gateway at 1 CPU/512 MiB/128 PIDs; one sandbox at
1 CPU/1 GiB/128 PIDs; no GPU or local model. Budget at most 2 GiB incremental
RAM including overhead, with no added swap allowance. Scratch target is 256 MiB
and gateway state 256 MiB. These are proposed limits, not observed consumption.

The [pinned container construction](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-driver-docker/src/lib.rs)
wires CPU, memory and PID limits but does not wire a writable-layer disk quota
or per-sandbox Docker log limit in its HostConfig. A bounded tmpfs does not bound
all image-writable paths/logs; guest free-space polling is not a hard quota.
Resolve this before the adversarial live experiment without changing global
Docker limits or unrelated workloads. The full-path 32-KiB capture mechanism is
also unproven. Installation readiness must never be mistaken for these proofs.

| Later fake-App-Server experiment criterion | Pass/fail contract |
| --- | --- |
| Process-tree kill | Fixture forks descendants; cancel/timeout/main-process exit leaves no fixture descendants or runnable sandbox, verified by identity within five seconds. Any survivor fails. |
| Whole-path output | Aggregate retained stdout/stderr/notifications, gateway/CLI queues and diagnostic/log copies are bounded to **32,768 bytes**, including one oversized frame and concurrent streams. Bound at ingestion; final truncation alone fails. No real Codex or model call. |
| Filesystem/identity | Non-root child; Landlock hard_requirement active with nonempty rules. Disposable sentinels prove denied host-repo/auth paths, `/mnt/c`, control material and arbitrary bind/volume requests. Never read real credentials to test a denial. |
| Network | Replace the bundled permissive policy completely: default deny and exactly one explicit synthetic endpoint/binary. No provider/inference setup, broad globs or inherited API allowlists. Denied DNS/IP/direct connections and gateway admin methods must fail. |
| Docker boundary | No socket, Docker CLI or reachable host container API in the agent sandbox; no administrator mTLS identity/token. Merely hiding the CLI is insufficient. |
| CPU/RAM/PIDs/disk | Effective limits match the proposed ceilings before stress. Every writable path and all log/output storage must have a demonstrated bound. Quota exhaustion stays inside the experiment; absent hard disk/log controls fail. |
| Cleanup/continuity | Deterministic teardown removes every newly recorded runtime resource, leaves existing workload identities/states and policies unchanged, and allows the dedicated distribution to idle naturally; healthy Running with its integration proxy is acceptable. Never force termination. Any unrelated effect fails; do not auto-repair it. |

## Historical RF-HOST-033 verification and next task (superseded)

The reusable RF-HOST-030 inventory preflight remains deliberately unchanged:
`further_checks_required` is not live Docker or installation readiness. Its
seven unit tests and documentation diff checks passed; artifact descriptor/hash
consistency checks also passed. No application/API/DB/UI change needs a full
build, and those suites were not run. The failed native
probe is reported as failed rather than hidden by the passing inventory tests.

Only one private receipt was created. No temporary file/script, archive, image
layer, container, network, volume or service was created. OS/native probes
completed; the final distribution inventory confirmed scoped cleanup. Existing
workloads were not modified or inspected for payloads. The host daemon remained
available; application-level continuity was not re-attested in this read-only task.

Keep executionSupported=false, pilotReady=false, Hermes disabled and Worker
observe-only. The local status snapshot reported offline; this task did not
restart the observer or change its configuration. No push, deployment or
production access. RF-HOST-030 through RF-HOST-033 commits remain local.

Recommended next atomic task, **not started**: diagnose and restore persistent
Docker Desktop integration for the dedicated distribution, with explicit scope
for any required settings change/restart and existing-workload continuity checks.
Recheck this preflight afterward. Do not combine that task with OpenShell install.
