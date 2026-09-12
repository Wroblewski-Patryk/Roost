# RF-HOST-030: OpenShell whole-process isolation feasibility

## Verdict and scope

**BLOCKED at prerequisites**, observed 2026-09-12. This is a local feasibility
result, not a finding that OpenShell cannot provide isolation. No OpenShell
gateway, sandbox, Hermes process or model was started. No production change,
push, deployment, credential provisioning or agent activation is authorized by
this result. The existing [Hermes transport blockers](hermes-windows-attestation.md#offline-transport-examination-adapter-blocked)
remain unresolved.

The Windows host has WSL 2, but its only registered distribution is the internal
`docker-desktop` distribution. There is no user Linux distribution in which to
install/run OpenShell or verify Docker Desktop integration. The experiment stops
here. It does not enter or repurpose Docker Desktop's internal distribution,
install/import Linux, change virtualization, restart services or substitute a
custom sandbox/container orchestrator/credential proxy.

## Official route and candidate pin

NVIDIA's [support matrix](https://docs.nvidia.com/openshell/reference/support-matrix)
marks Windows x86_64 through WSL 2 and Docker Desktop **experimental**. Docker
is an available compute driver; the documented minimum Docker version is 28.0.
seccomp is required. Landlock support is kernel-dependent; `hard_requirement`
must be evaluated rather than accepting a weakened filesystem boundary.
The [Docker Compose tutorial](https://docs.nvidia.com/openshell/get-started/tutorials/docker-compose)
directs Windows users to run the CLI within a WSL 2 Linux distribution. These
documents establish a candidate route, not proof of the Roost acceptance criteria.

Candidate dependency: official NVIDIA OpenShell **v0.0.116**, published
2026-08-28T09:10:23Z. The [tagged release](https://github.com/NVIDIA/OpenShell/releases/tag/v0.0.116)
and GitHub release API reported `prerelease:false` and `draft:false`.
No `dev`, `main`, floating image or installer script was used. This is a
feasibility pin only; OpenShell is not installed or adopted in the provider registry.

| Artifact | SHA-256 | Evidence |
| --- | --- | --- |
| `openshell-x86_64-unknown-linux-musl.tar.gz` | `4fb4476d80a1875a0b83547ec3aba999cf0a2e2d75f95f2f709b622e2103520e` | Published asset digest matches the release checksum list; archive not downloaded or executed. |
| `openshell-checksums-sha256.txt` | `f8b6ec65366f9d256737b884ba4d9f184b4dbbbb9540711ed9e4934d772eba7e` | Downloaded 1,393 bytes into memory and hashed; matches GitHub's asset digest. No file retained. |

Sources: [release API](https://api.github.com/repos/NVIDIA/OpenShell/releases/tags/v0.0.116),
[checksum list](https://github.com/NVIDIA/OpenShell/releases/download/v0.0.116/openshell-checksums-sha256.txt).
Binary bytes and gateway/supervisor/sandbox image digests remain unverified:
no image was selected, pulled or built after the prerequisite block. A resumed
experiment must pin and verify every executable/image actually used.

Reproduce checksum-list verification without creating a file:

```powershell
node -e 'const c=require("crypto");(async()=>{const r=await fetch("https://github.com/NVIDIA/OpenShell/releases/download/v0.0.116/openshell-checksums-sha256.txt",{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error("fetch_failed");const b=Buffer.from(await r.arrayBuffer());if(b.length>16384)throw Error("oversized");console.log(c.createHash("sha256").update(b).digest("hex"));console.log(b.toString().split("\n").find(l=>l.endsWith("openshell-x86_64-unknown-linux-musl.tar.gz")));})().catch(()=>{process.exitCode=1;});'
```

Hermes remains **0.21.2 / v2026.9.11 /
939e45c91d751fadd94dcd1b873ac3cb44846213**. The Windows sealed installation is
not a Linux artifact. Any future sandbox installation must establish provenance
and frozen Linux dependencies for this same pin; do not mount the user's venv,
real Codex home, repository, authentication files or secrets into a sandbox.

## Reproducible preflight and observations

`node scripts/openshell-wsl-preflight.mjs` runs only `wsl.exe --list --verbose`,
`wsl.exe --version` and `docker.exe --version`. It emits counts, fixed blocker
codes and client versions, not private distribution names, paths or errors.
It never enters a distribution or queries the Docker daemon. Exit 2 means
blocked; exit 0 only means a user WSL 2 distribution exists and further checks
are required. Neither outcome grants execution or returns GO.

| Check | Observed result |
| --- | --- |
| `wsl.exe --status` | Default distribution `docker-desktop`; default WSL version 2. |
| `wsl.exe --list --verbose` | One internal distribution, running under WSL 2; zero user distributions. |
| `wsl.exe --version` | WSL 2.5.9.0; reported kernel 6.6.87.2-1. |
| `docker.exe --version` | Docker client 29.7.2, build a7dcaa6; not evidence of daemon version or WSL integration. |
| Docker Desktop executable version metadata | 4.89.0.238018; executable was not launched. |
| `node scripts/openshell-wsl-preflight.mjs` | `blocked`, `user_wsl2_distribution_missing`; no distribution entry, daemon query or sandbox start. |
| `node --test scripts/openshell-wsl-preflight.test.mjs` | 7/7 pass: UTF-16/UTF-8 decoding, internal distributions, WSL 1, WSL 2, malformed inventory, fixed commands and sanitized failures. |
| `npm run lint`; `git diff --check` | Pass; no application runtime or shared protocol changes. |

All process invocations completed. The harness bounds each read-only subprocess
to 10 seconds and 16 KiB per output stream; this is only preflight protection,
**not** a proof of the required 32-KiB Hermes/OpenShell capture boundary.

## Required containment evidence: not run

| Acceptance boundary | Status and remaining gate |
| --- | --- |
| Pinned Hermes transport + fake App Server in an OpenShell sandbox | Not started; user WSL 2 distribution/integration absent. |
| Descendant cannot survive sandbox termination | Unproven; must observe process identity and absence after cancellation. |
| stdout/stderr/notifications at or below 32 KiB without unbounded host accumulation | Unproven; must cover the gateway/CLI/host path, not merely truncate final output. |
| Host repository/arbitrary paths/real Codex credentials inaccessible | Unproven; require disposable scratch only and negative read/write tests. |
| Default-deny network with an explicit test endpoint | Unproven; require denied destinations and allowed fake endpoint, no real inference. |
| Deterministic lifecycle and cleanup without unrelated workload effects | Sandbox lifecycle unproven; preflight itself created no workload resources. |

No GO or CONDITIONAL verdict is justified without those demonstrations. Engine
version, WSL integration, kernel security features, mount behavior, gateway ports
and resource cost are unresolved. The experimental platform status remains an
additional operational gate even if a later synthetic experiment passes.

## Resources, state and next atomic task

Resources created by this experiment: **zero** containers, sandboxes, networks,
volumes, images, gateways, persistent processes, mounts, installation files or
temporary directories. The checksum response lived only in a completed Node
process. Thus cleanup has no Docker/filesystem targets. Successful completion of
the version/inventory subprocesses confirms no experiment process remains.
Existing workloads were not enumerated or accessed; no `docker ps`, `inspect`,
`exec`, `pull`, `run`, `compose`, stop, removal or pruning was performed.

Only the reproducible preflight, its tests and canonical documentation change.
Provider contract/protocol stay unchanged; `executionSupported:false`,
`pilotReady:false`, Hermes disabled and Worker `observe` remain mandatory.
No runtime/API/database/UI behavior changes, so full application/DB/UI suites
do not provide additional evidence for this prerequisite failure.

Recommended next atomic task, **not begun**: explicitly authorize preparation of
one dedicated user WSL 2 Linux distribution and enable/verify Docker Desktop
integration for that distribution, without altering existing workloads. Stop
after a read-only prerequisite report; no OpenShell install, sandbox or inference
in that setup task. Then separately resume the pinned isolation experiment.
