# Official offline policy validation (RF-HOST-040)

The separately authorized [RF-HOST-041 stdio-only v3](openshell-stdio-policy-v3.md)
has now completed conditional static validation. This RF-HOST-040 report and
its v2 BLOCKED result remain historical evidence; no runtime is admitted.

**OFFICIAL-OFFLINE-POLICY-VALIDATION-BLOCKED**, verified 2026-09-13.
The official parser accepts v2, and the pinned offline adapter works. The
selected Docker supervisor loading path subsequently adds filesystem grants
that violate v2. No v2 policy, contract, fixture byte or activation flag changed.

## Result and exact scope

| Check | Result |
| --- | --- |
| Roost materialized artifact linter | PASS, `REPRODUCIBLE-FIXTURE-READY`; artifact identity only. |
| Official `parse_sandbox_policy` and `validate_sandbox_policy` | PASS for v2, executed offline. |
| Official provider-free `compose_effective_policy` | PASS; preserves the explicit source grants. |
| Official `merge_policy` with `AddRule` | Preserves the synthetic liberal base rule and base filesystem; unsuitable for full replacement. |
| Runtime effective-policy equality | **BLOCKED** by supervisor baseline enrichment; not executed. |
| Offline repeatability | Ten real adapter cases passed twice with identical results. Network-none container; reserved-address connect returned ENETUNREACH (101). |

The official serializer's canonical source-policy projection is **555 bytes**,
SHA-256 **`96c5765649280436b3a0a6394f877f2a044e9bd54c4c350bb2c8971ffeb5233c`**.
It retains exactly the v2 filesystem/process/Landlock/network grants. It omits
the empty `network_middlewares` object, explaining the difference from the
580-byte authored policy hash. No middleware grant is added by that omission.

**The runtime effective-policy hash is null/unavailable.** This projection is
the result of official source-policy parsing/composition, not an effective
supervisor snapshot. We did not run or reproduce the supervisor's private
enrichment functions, invent an exact runtime projection, or turn source
inspection into a runtime attestation. The adapter always preserves the known
BLOCKED gate, even when all parser tests pass.

The source projection contains:

- RO: `/opt/roost-fixture/bin/fake-app-server`; RW: `/sandbox/roost-fixture/scratch`.
- `include_workdir=false`, Landlock `hard_requirement`, user/group `sandbox`.
- Only `synthetic_probe` / `synthetic-probe-v2`, the fixture binary path and
  `fixture.roost.test:18080`, REST/enforce, `GET /probe`.

## Why v2 cannot be admitted

All source references are pinned to OpenShell commit
`d1155aa70042d3e2ee49dbfa15346b108b7c1d92` / release **v0.0.116**.

The [supervisor baseline implementation](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-sandbox/src/lib.rs#L1552)
defines proxy RO candidates `/usr`, `/lib`, `/etc`, `/app`, `/var/log`, `/proc`,
`/dev/urandom` and RW candidate `/tmp`. Its private
`enrich_proto_baseline_paths` enables proxy enrichment when `network_policies`
is nonempty, then adds existing paths not already granted. It does not use
`include_workdir=false` or `hard_requirement` as an opt-out. GPU enrichment is
a separate path and is not needed to establish this failure.

The [gRPC load path](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-sandbox/src/lib.rs#L2324)
takes a supplied server policy in preference to disk discovery, but then calls
enrichment unconditionally before constructing the OPA engine. Thus replacing
the bundled image policy does not establish equality with the submitted file.
The selected [Docker driver](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-driver-docker/src/lib.rs#L3019)
launches the combined supervisor, not a newly assumed alternate topology.
The local Rego-file override also enriches filesystem paths and is not a fix.
The sidecar process bootstrap consumes a policy from its controlling network
supervisor; inspecting its clone operation alone cannot prove a bypass.

At least **`/usr` is a proven additional RO grant** for the planned pinned base:
RF-HOST-037's complete static image audit records the GCC executable under
`/usr/bin`, while v2 grants neither `/usr` nor an ancestor. This existing path
and v2's nonempty network group satisfy the pinned enrichment conditions.
Other listed paths remain existence-dependent candidates; we do not fabricate
a complete launched-container inventory. This one proven extra grant suffices
to fail v2's exact allowlist contract. These grants are **supervisor defaults**,
not a claim that the image's ten liberal network groups were merged into v2.

The [gateway policy code](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-server/src/grpc/policy.rs)
also distinguishes a new explicit source, additive updates, global policy and
provider composition. Existing sandbox updates reject static-field changes;
global/provider settings can change the effective source. None of these were
configured or contacted. An explicit new-sandbox source with no global/provider
layers is the examined premise, not an implemented Worker transport.

No upstream function was copied, patched or translated to hide this conflict.
No `/usr` or `/tmp` grant was added to the Roost contract. No claim of overall
READY follows from the separately successful parser.

## Official implementation and immutable pins

The pinned [CLI dispatch](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-cli/src/main.rs#L2627)
resolves gateway/auth context before policy set/update/get/list/delete. There
is no standalone offline validation subcommand; update dry-run is a merge
preview. The installed CLI, including `--help`, was not invoked.

The small [Rust adapter](../../tools/openshell-policy-adapter/src/main.rs) links
the unmodified [official crate](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-policy/src/lib.rs).
It calls the public parser, validator, canonical JSON projection,
`compose_effective_policy` and `merge_policy` functions. It does not link the
gateway/sandbox entrypoint or invoke filesystem-loading/default-resolution APIs.
`replace` in this adapter means provider-free composition of the supplied source;
it deliberately refuses a base argument and does not simulate the full gateway
or supervisor replacement procedure.

The [manifest](../../tools/openshell-policy-adapter/Cargo.toml) pins package
`openshell-policy` **0.0.0** (the upstream workspace version, distinct from the
release label), no default features and no added features, with the exact git
revision in metadata. Its path dependency is materialized beside the adapter
from the verified archive; the upstream source is not vendored into this repo.
Official `openshell-policy` disables default features on `openshell-core`, so
the optional core telemetry feature is not selected.

The [immutable parser receipt](../../config/openshell/official-parser-v1.json)
records all source, toolchain, input and output pins. Principal hashes:

| Identity | SHA-256 |
| --- | --- |
| Official source archive | `83a62839104354d7af2bb0d4eca3e037ea36dfa68cb02f38d363a9e0f9ef6326` |
| Upstream Cargo.lock | `4ae60cda3aaaa83e578bf786eb245a8c3f6b1e663c14ce0007b2bf8241bd8e46` |
| rust-toolchain.toml | `f7969f2aef5faff3a786f980b53b1aeecb92179613531fa0fd74406abf92e1ed` |
| Adapter source, LF | `2894f94cf248374d3ec036937d8a54fa7289bfc658957c40de7b191d017d8971` |
| Adapter manifest, LF | `07f9f5e5422c5b3eebc6a5f703b25d62ab15420334d6a045907aa077aeb5584c` |
| Resolved adapter Cargo.lock | `f682b22d9098a5b34b2dd861fb3f3133ee60c793257bb2c2be003bf47bd172c9` |
| Static parser binary, 3,502,288 bytes | `1547f375cdf3748c6e754fb84c2d728c149b7ea80268a51e884d75b2fb5d8a13` |

The source archive's **1,517 Git blobs** matched the pinned Git tree, including
the bytes of one nonmaterialized `.claude/skills` symlink. No symlink was created
or followed. The dependency closure downloaded **335 registry crates**, each
matching the exact checksum in upstream Cargo.lock. The resolved adapter lock
contains 239 packages, including 235 registry packages; every registry version
and checksum matches upstream. The [lockfile](../../tools/openshell-policy-adapter/Cargo.lock)
is committed; crate archives, extracted dependencies and compiler output remain
in one private versioned RF-HOST-040 root. No package manager/global install,
PATH modification, source patch or installer script was used on the host.

The official builder was
`docker.io/library/rust@sha256:4c2fd73ef19c5ef9d54bee03b06b2839a392604fbfcd578ed948b71b37c1d7fb`,
discovered through `1.95.0-bookworm` and used only by digest. It reported Rust
**1.95.0**, commit `59807616e1fa2540724bfbac14d7976d7e4a3860`, LLVM 22.1.2 and
Cargo 1.95.0. The adapter is a static PIE with no PT_INTERP, DT_NEEDED, RPATH or
RUNPATH; its bytes were statically inspected before parser execution. This is
the parser adapter, never the RF-HOST-039 fake App Server.

## Offline build, validation and bounds

Public sources/crates were acquired on the host from the exact NVIDIA commit
and crates.io registry named by upstream lock. The Docker Hub manifest was
resolved before one exact builder pull. Neither container had network access.
Build inputs traveled by bounded owned tar streams, with no host/repository
bind mount, named volume, Docker socket, credentials or existing workload data.

The build container used numeric non-root UID/GID 1000, network none, read-only
root, cap-drop ALL, no-new-privileges, 2 CPUs, 4 GiB RAM with no extra swap,
256 PIDs, restart no, 3 GiB bounded tmpfs and 1 MiB shm, log-driver none.
Compilation tools run only from the pinned image. The temporary build filesystem
must permit compilation subprocesses and the parser; this does not grant
execution of the separate fixture. The producer had a 600-second deadline,
64 MiB stdout and 64 KiB stderr ingestion bounds. Build completed in 96.623 s.

The private Cargo configuration replaces crates.io with the checksum-verified
directory source and sets offline=true. A copy of upstream lock seeded adapter
resolution; only the adapter's derived lock changed. Preparation used
`cargo generate-lockfile --offline`, followed by:

```text
cargo build --release --offline --locked --target x86_64-unknown-linux-gnu -j 2
```

Environment fixes Rust 1.95.0, SOURCE_DATE_EPOCH=0, locale C, TZ=UTC, isolated
HOME/CARGO_HOME, image RUSTUP_HOME and
`RUSTFLAGS=-C target-feature=+crt-static --remap-path-prefix=/build=/source -C link-arg=-Wl,--build-id=none`.
Future rebuilds require the exact builder and pinned sources/vendor/lock;
the builder was removed after this task. **Offline parser reruns do not require
the Rust toolchain**, using the retained static binary and already-local base.

The second container used that unchanged base digest from RF-HOST-039, non-root
`sandbox`, network none, read-only root, cap-drop ALL, no-new-privileges, 1 CPU,
512 MiB RAM/no extra swap, 64 PIDs, restart no, 128 MiB tmpfs, 1 MiB shm and
log-driver none. Only parser/runner/public policy inputs were transferred; the
fake App Server ELF was not transferred. A numeric reserved-address socket
probe returned 101; there was no DNS or real service request.

The repeat command inside this separately authorized container is:

```text
python3 /build/roost/scripts/openshell_official_policy.py --parser /build/parser
```

Its exit **2** is the expected overall BLOCKED verdict, even when the ten
upstream cases pass. The [runner](../../scripts/openshell_official_policy.py)
rehashes the parser before every invocation and pins v2 input. It passes only
an explicit empty-of-credentials HOME/XDG/locale environment and exact executable
argv; each process has a five-second deadline, bounded concurrent pipe ingestion
and fixed error codes. The Rust adapter reads at most 32,769 envelope bytes,
accepts policy/base strings at most 8 KiB each, emits at most 16 KiB and no stderr.
The extra input byte detects overflow. Raw upstream diagnostics are never echoed.
The runner does not create containers or itself prove network isolation; the
recorded Docker configuration and in-container negative probe establish this run.

Actual tests cover parse failure, unknown policy/envelope fields, invalid root
identity, input/output limits (including bounded YAML alias expansion), clean
source composition, additive merge leakage and rejection of a replacement base.
Ten cases passed in each of two runs. Seven synthetic transport tests separately
cover byte pin drift, process timeout, output overflow, clean environment and
refusal of invalid/admitting output. They mock transport, not upstream semantics.

## Resources, remaining gates and next task

Fresh physical free space was **20,185,612,288 bytes** before acquisition and
stayed above 10 GiB; a later snapshot was 17,114,832,896 bytes. No VHD compaction
or filesystem cleanup was used to manufacture headroom. Exactly two recorded
containers were removed by their owned IDs. The one new builder image had no
container users and was removed by its recorded digest without force/prune;
all 16 baseline image inventory rows were restored. Four owned transport/empty
diagnostic files were selectively removed. The private source/dependency/parser
root is retained and inventoried; no generated binary/archive is committed.

Before/after continuity passed: Windows Engine **29.7.2 linux/amd64**, the same
four container names/states (two Up), five networks, 107 volumes and 16 image
inventory rows. Both owned container IDs are absent. The private root inventory
records 20,231 retained files plus its receipt and inventory index; expanded
source/vendor hashes are the verified acquisition hashes, while retained archive
and evidence hashes were refreshed. Existing workload payloads, logs, environment and mounts
were not inspected. No restart, WSL entry/shutdown/termination, settings toggle,
socket/stale/recovery operation or automated repair occurred. No fixture,
gateway, supervisor, sandbox, model or agent ran, and no Worker/provider/Hermes,
executionSupported, pilotReady or liveAdmissionAllowed flag was enabled.

Seven transport tests, 12 materialized-artifact regressions and seven preflight
tests passed, alongside the two runs of ten official parser cases. Syntax,
privacy, **411 local-link checks**, immutable-pin and diff checks passed.

Official source-policy parsing is now proven independently of Roost's checks.
Effective supervisor equality, Landlock/network/admin/host-control containment,
resource/output bounds, process-tree stop and provider compatibility remain
unproven. Full application/API/DB/UI builds were not run for this isolated
adapter/contract change. No push, deployment or production change follows.

Exactly one recommended next atomic task, **not started**: prepare and statically
validate a proposed **v3 stdio-only** policy/contract for the existing fixture,
removing its unused network group and explicitly excluding GPU enrichment;
require proof that the selected loader preserves its exact filesystem grants,
without broadening the allowlist, patching upstream or executing any runtime.
