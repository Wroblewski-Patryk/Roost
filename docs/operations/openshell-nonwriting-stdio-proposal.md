# Proposed upstream Docker nonwriting stdio profile (RF-HOST-043)

**UPSTREAM-NONWRITING-PROFILE-PROPOSAL-READY**, 2026-09-13, means a complete
local proposal and acceptance specification. It does **not** mean that OpenShell
implements the profile. [RF042's pinned driver remains BLOCKED](openshell-docker-v3-delivery.md).
No implementation, upstream patch, fork, external submission or runtime experiment
is included. Existing v1/v2/v3 contracts and execution admission remain unchanged.

## Portable feature and immutable artifacts

Propose `docker_nonwriting_stdio`, version `1`, disabled by default. The name is
a local proposal, not a reserved or existing upstream API. It is useful for any
small, static, stdio-only workload requiring no filesystem writes or networking;
the OpenShell feature must not depend on Roost, its fixture path or task IDs.
The acceptance binding below uses the existing v3 fixture as one consumer.

| Artifact | Identity / canonical SHA-256 |
| --- | --- |
| [Proposal](../../config/openshell/nonwriting-stdio.proposal.json) | `openshell.docker-nonwriting-stdio.proposal.v1`; `d0ebbdfc737fda1b9e6ab312641b0205c408295be9d773bac2ee54db57815c8e` |
| [Acceptance contract](../../config/openshell/nonwriting-stdio.acceptance.json) | `openshell.docker-nonwriting-stdio.acceptance.v1`; `670b1930cd9db96647f808a544cb3710ba3878dbbc364f5ebda3e8e49527e659` |
| [Proposed public receipt schema](../../config/openshell/nonwriting-stdio.receipt.schema.json) | JSON Schema 2020-12; `5165a152d6c3d06e1355bf13cd5d6fba693404e5dcddee7858edc0a4d81b6cf0` |

Artifact hashes use sorted-key, compact ASCII JSON without a trailing newline,
the same restricted encoding as v3. Duplicate keys, floats, unknown/missing
fields and semantic drift fail validation. Schema URLs identify standards only;
this task performs no network access. No real runtime receipt is manufactured.

The proposal pins **37 existing upstream files / 3,310,685 bytes**, each with
SHA-256, Git blob SHA-1 and byte length, at v0.0.116 commit
`d1155aa70042d3e2ee49dbfa15346b108b7c1d92`. It reuses RF042's 30 source anchors
and adds seven already-retained protocol/CLI/gateway/OPA files, checked against the
verified RF040 Git tree. `sourceMap.symbolReferences` records exact file/line
locations. All functions and fields below identify intervention points in that
release; proposed new behavior is not attributed to its current implementation.

## Negotiation and backward compatibility

Use upstream's existing capability flow: internal `GetCapabilitiesResponse`,
public `ComputeDriverCapabilities`/`GetGatewayInfoResponse`, gateway translation
and the actual selected supervisor's acknowledgement. Add a typed required
profile/version/contract identity to the create request and observed prepared
status. Do not hide a required capability solely inside an opaque driver config
that an old gateway could ignore.

All three roles must acknowledge the same requested version, contract and build
identities. Missing/false support, an unknown version, ignored required input,
partial implementation or unavailable enforcement produces denial before
workload exec. Capability presence alone is discovery, not qualification. In the
current Docker driver, `driver_version` reports the **daemon** version; it must
not be treated as the driver binary's identity.

The ordinary protobuf convention of ignoring unknown additive fields remains
unchanged outside this profile. An explicitly required profile needs a positive
versioned handshake before create/start can authorize a workload. Old client/new
server ordinary behavior remains; new client/old server profile requests fail.
No existing sandbox is migrated, remounted, reset or silently opted in. Normal
Docker mode remains available to existing users but cannot satisfy v3. Errors
must never trigger fallback to ordinary mode, image policy, shell or workspace.

## Normative containment and preparation contract

The 16 requirement records are normative. These invariants apply jointly:

1. **Read-only child filesystem.** Set Docker `HostConfig.ReadonlyRootfs=true`
   for the supervisor container's root and independently observe the final child
   root/mount namespace as read-only before workload exec. Root-only checks are
   insufficient: enumerate all mounts, overmounts and submounts, including Docker
   proc/sys/dev/shm, hostname/hosts/resolver files. Deny unknown or incomplete
   enumeration and every writable backing visible to the child. RO path grants
   or a read-only bind do not by themselves establish immutable backing.
2. **No workspace.** `workspaceMode=none` must bypass directory creation,
   ownership/mode changes, write probes, upload/extraction/copy/sync and HOME/XDG
   derivation. Require an explicit canonical absolute cwd that already exists
   as an immutable directory; missing, empty, symlinked or inaccessible cwd fails.
   It never falls back to image WORKDIR or `/sandbox`. V3 requires exactly `/`.
3. **Exact executable.** Require explicit argv, `tty=false`, nonroot numeric
   UID/GID and no supplementary groups, clean explicit environment, capabilities
   empty and no-new-privileges. Execute the exact image-baked static ELF directly;
   no login shell, image ENTRYPOINT/CMD, interpreter or dynamic loader defaults.
   No other binary or writable/memfd executable may be selected or subsequently
   executed. An unused shell in image metadata is not itself execution; selecting
   it as the effective process is a failure.
4. **Immutable delivery.** Require the platform-manifest `@sha256` reference,
   expected OS/architecture and verified config/layer closure, not a mutable tag
   or merely an OCI index digest. Prove the final exact path's regular-file type,
   mode, numeric ownership, size/hash, nlink=1 and lack of symlink ancestors,
   hardlinks, setid, file capabilities, devices or dynamic dependencies. Identify
   bytes without running them. Compare the same immutable object again in the
   final child namespace; any substitution between preparation and exec denies.
   No fixture byte may come from post-start copy, user mounts or mutable cache.
5. **No ambient authority.** Reject all user binds, named/anonymous volumes and
   image-declared volumes, even if supposedly unused. Child networking is none:
   no proxy baseline, DNS, inference, middleware, routes to control services or
   effective network grants. GPU requests/devices/environment are absent,
   including `/dev/nvidiactl` and `/dev/dxg`. Absence needs observation, not just
   empty authored maps. Child PID/IPC/mount separation and enforced privilege
   restrictions must exclude supervisor proc-root/FD/namespace/ptrace/signal and
   host-control access. RO device nodes are not proof against device I/O.
6. **Separate supervisor authority.** Gateway daemon access and a rootful
   supervisor remain trusted control-plane privileges. Necessary supervisor
   writes may use explicitly bounded private tmpfs in a separate mount namespace,
   with private propagation, recorded owner/byte/inode limits and zero child
   visibility through mounts, descriptors or proc. Logs, CA, tokens, SSH/netns
   state and control bind material must be absent from the child namespace.
   Unnecessary proxy/provider/sidecar paths are disabled. No requirement asks the
   supervisor to initialize its internal state without writes; the child receives
   none of that writable state or authority.
7. **Descriptor boundary.** At workload exec, only FD 0 read and FD 1/2 write
   remain: three unique dedicated nonblocking anonymous pipes, bounded at the
   trusted consumer. No directory, socket, credential, executable, namespace,
   device or administrative descriptor survives. Enumerate actual descriptors;
   do not rely solely on CLOEXEC intentions. Setup, error and receipt-barrier
   descriptors must close before exec, with independent evidence of the final
   allowlist. Writable process memory and bounded stdio are permitted; they are
   not filesystem scratch or a channel for control commands.
8. **Exact effective policy and bounds.** Enforce hard Landlock and required
   syscall restrictions, preserving one exact RO executable grant, zero RW and
   no include-workdir grant for v3. No merge, provider/global layer, disk default,
   enrichment, OPA fallback or later update is allowed. Hash the actual
   post-loader snapshot and installed rules; verify their approved semantics.
   Record and enforce finite CPU/RAM/no-extra-swap/PID, state byte/inode,
   setup/workload/termination deadlines and all-stream input/output bounds.
   No file logger, stderr path or telemetry queue may bypass the aggregate cap.

V3's consumer binding preserves policy hash
`0d7ac3b0eccde457d5a77e6662a4bfb6a2f1de3e3c4147d2d49633fce6058e5b`,
contract hash `f01133f5a240c2eb60bf2d21d121649373e6e1259f22debfe62222abba888f98`,
and the 8,656-byte fixture hash
`c4c7bbc5d9d73629c4ebb88ffc1dfa48cb58e85e5477f69ec1128aaab156c85d`
at `/opt/roost-fixture/bin/fake-app-server`. The proposed image acceptance adds
metadata requirements mode `0555`, owner 0:0 and nlink=1; it neither changes the
ELF bytes nor claims those properties for an unbuilt image. Resolve `sandbox`
user/group from the verified image, seal their nonroot numeric IDs and reject
ambiguity; do not assume a UID from a label. Qualified fixture image digest and
runtime effective-policy hash remain **null**.

The v3 test vector requests 1 CPU, 512 MiB RAM without extra swap, 64 PIDs,
16 MiB/1,024-inode supervisor state, setup 30 s, workload 3 s, termination 5 s,
128-byte input, 61-byte stdout, zero stderr and 32 KiB aggregate capture including
control diagnostics. These are future acceptance inputs, not observed runtime
limits. Setup cannot consume the workload budget or reset an external attempt
deadline. A bound breach terminates/fails the attempt; it cannot create success.

## Proposed receipt and single-use exec boundary

The closed schema describes a provider-neutral **pre-exec** envelope. A trusted
setup process may prepare namespaces and pause at the exec latch; the workload
ELF has not executed. Here "before spawn" means before workload execution, not
before any trusted OS setup process exists. Integration evidence must explicitly
prove that the latch remains closed. A pre-create config report is insufficient.

`REQUESTED -> PREPARING -> SEALED_NOT_EXECUTED -> ACKNOWLEDGED -> EXECUTED_OR_DENIED`

The gateway, driver and supervisor supply authenticated, build-bound observations
for the same attempt and frozen instance generation. The caller receives the
sealed payload, validates it and pins its exact SHA-256 to its execution request
(Roost would bind it to the existing execution packet). Start must acknowledge
that hash and nonce once, within expiry. Any change of image, mount, FD, policy,
identity, limit, build, generation or authority invalidates the receipt. A crash,
timeout, cancellation or rejected acknowledgement denies execution; no retry or
ordinary-mode fallback follows.

| Required payload group | Evidence carried |
| --- | --- |
| Profile and provenance | Exact id/version/contract hash; three component acknowledgements; gateway/driver/supervisor release/source/binary/artifact identities; qualified release evidence hash. |
| Freshness | Random 32-byte nonce, execution-request hash, opaque attempt/generation identities, preparation and expiry timestamps. At most 30 s with at most 1 s known clock skew; unknown clock status denies. |
| Platform and image | Linux architecture/variant, Engine/API/kernel/cgroup and qualified-host hash; exact WSL/Desktop versions when applicable, otherwise literal `not-applicable`; platform manifest/config/layer closure, no image volumes. |
| Child and fixture | Exact argv/cwd/UID/GID, workspace none, empty HOME/XDG/env, no groups/caps/TTY; fixture type/mode/owner/size/hash/link/loader properties, image-membership and final-object proof hashes. |
| Root and complete mount tables | Observed container and child root RO, immutable backing, sealed namespace generation; every child/supervisor mount's IDs, root/target/type, source class/opaque source hash, mount and superblock flags, visibility, propagation, ownership and bounds. |
| Network/GPU/FDs | Empty authored and effective network state, absent GPU state, exact three stdio descriptors with mode/type/nonblocking/dedicated status, completed closure and independent observation evidence. |
| Policy/state/resources/lifecycle | Authenticated post-loader snapshot, semantic projection and installed-rule hashes, actual enforcement; supervisor-private state inventory and ceilings; all enforced resource/output limits; no restart, no retained mutable state and owned-cleanup contract. |

Complete mount information is about both sandbox namespaces; it must not expose
host filesystem sources, workload names or credential values. Use opaque source
identities and source classes. The child namespace must contain no hidden mount
or control-material path. Sort mount rows by namespace/generation/mount ID and FD
rows by number; reject duplicate IDs, unknown flag semantics, gaps, more than
256 rows or a receipt larger than 64 KiB. Compute counts/hashes from complete
observations rather than trusting a reported writable count of zero.

Cross-field rules in the contract are mandatory in addition to schema syntax.
They bind argv to fixture, image suffix to manifest/platform, numeric identities
to the request, effective semantics to the approved source, all bounds to actual
enforcement and mount visibility to the observed final namespace. The schema does
not express every cross-field or kernel fact. The RF041 serializer hash cannot
be substituted for the actual post-loader hash.

Hash canonical payload bytes only, excluding the outer payload hash and seals.
Require exactly three unique role seals, sorted by role, using Ed25519 over ASCII
`openshell/nonwriting-stdio/receipt/v1:` followed by the lowercase 64-character
payload hash. Keys are pinned out of band to trusted roles/builds; the request
cannot supply its own trusted key or observed state. Deliver via the authenticated
control channel and recheck approved official builds and qualification evidence.
This is a proposed software attestation inside the operator's trust boundary,
not hardware attestation or protection against a malicious trusted root/daemon.
Signatures authenticate observations; they do not replace independent enforcement
tests. No signing, negotiation or packet adapter is implemented in RF043.

## Exact upstream change map

Every row calls for **add/change/test**, with no supplied code or diff. The
machine-readable map provides full paths and verified symbol line references.

| Existing v0.0.116 surface | Proposed intervention |
| --- | --- |
| `proto/compute_driver.proto`: `GetCapabilitiesResponse`, `DriverSandboxSpec`, `DriverSandboxStatus`; `proto/openshell.proto`: `ComputeDriverCapabilities`, `SandboxSpec`, `SandboxStatus`; `proto/sandbox.proto`: `GetSandboxConfigResponse` | Add required profile, prepared observation and acknowledgement contracts; keep ordinary additive semantics. |
| CLI `main.rs`, `run.rs`: `SandboxCreateConfig`, `sandbox_create`, `command`, `tty_override`, `uploads`, `driver_config_json`; server `config_file.rs`: `GatewayFileSection` | Add typed opt-in/cwd/none input and default-off permission; reject conflicting upload, shell, provider and fallback options. |
| Server `grpc/mod.rs::get_gateway_info`, compute `ComputeDriverInfoSnapshot` and driver `capabilities` | Report actual role build/profile qualification, not daemon version as binary identity; propagate positive acknowledgements. |
| Docker `DockerComputeConfig`, `DockerSandboxDriverConfig`, `build_container_create_body_for_image`, `build_binds` | Set explicit RO root/resources and reject user/image mounts; compare actual daemon state against planned HostConfig. |
| Docker `prepare_image`, `ImageMetadata`, `resolve_supervisor_bin_source`; core `supervisor_cache_path` | Verify immutable platform/layer/file closure and actual supervisor hash; reject fixture cache delivery and any identity drift. |
| Core `resolve_oci_workspace_root`; process `ResolvedWorkspace`, `prepare_oci_workspace_with`, `validate_effective_workspace_write`, `prepare_filesystem_with_identity` | Add none representation; bypass every workspace mutation/probe; validate exact immutable cwd without fallback. |
| Core `MainProcessConfig`; sandbox `main.rs`; process `spawn_impl` | Carry exact argv/cwd and add the nonexecuting preparation/acknowledgement latch; no implicit shell or image entrypoint. |
| Process `SupervisorIdentityMountNamespace`, `start_supervisor_identity_spawn_worker`, `drop_privileges_with_identity`, `spawn_command_with_supervisor_identity_namespace` | Extend to full child mount/PID/IPC containment and exact FD closure/observation before exec; current optional identity mask is insufficient. |
| Sandbox log setup; SSH startup; network `write_ca_files`; netns `NetworkNamespace`; core `container_paths` | Confine necessary bounded control state to supervisor-only namespace; prove no child visibility, propagation or descriptor escape. |
| Sandbox `load_policy`, `enrich_proto_baseline_paths`; server `grpc/policy.rs`; core `SandboxPolicy`; network `opa.rs::from_proto`/`proto_to_opa_data_json`; Linux `landlock.rs` | Explicit no-fallback/no-enrichment profile, actual post-loader/installed-rule evidence and mandatory hard enforcement. |
| Core `effective_driver_gpu_count`, policy conversion; `create_netns_for_proxy`; sandbox initialization | Introduce explicit no-network/no-GPU branch; eliminate implicit proxy/CA baseline from child rather than assuming empty maps suffice. |
| Process `run_process`; Docker create body; sandbox output/log setup | Enforce finite byte/deadline/resource bounds across all streams and private state. |
| Compute `start_persisted_sandboxes`, `cleanup_on_shutdown`; Docker `start_sandbox`, `stop_sandbox`, `delete_sandbox`; process/netns exit | Single-use attempts; no retained-state restart, fresh proof after crashes, owned cleanup without broad host repair. |
| Driver README and deployment contract | Publish exact qualified host/release combinations and evidence; unsupported Docker/WSL remains denied. |

## Negative acceptance matrix and proof levels

All **35** machine-readable cases require `DENIED`, no workload exec, no success
receipt and no reuse of the prepared attempt. Rejected inputs/state are injected
before the target workload's exec boundary. Separately authorized live tests may
execute an adversarial harness to test denial of a secondary exec or forbidden
operation; this does not claim that no trusted test process ran. A runtime output
overflow must terminate without success; it cannot retroactively prevent an
already authorized initial exec. Missing or unenforceable bounds deny initially.

| Cases | Required denial condition |
| --- | --- |
| `profile_missing`, `profile_unknown` | Absent/false/partial support, unknown version/hash or missing role acknowledgement. |
| `root_unset`, `root_false`, `child_root_rw` | HostConfig unset/false or child root RW despite claimed RO container. |
| `implicit_rw_mount`, `image_volume`, `user_mount`, `tmp_writable`, `sandbox_writable` | Hidden/automatic/stacked RW mount, any image VOLUME/user mount or writable tmp/workspace. |
| `cwd_fallback`, `workspace_probe` | Missing/empty cwd maps to image workdir/sandbox or none mode invokes workspace writes/probes/copy. |
| `mutable_tag`, `digest_platform_mismatch` | Mutable image reference or platform/config/layer identity mismatch. |
| `fixture_absent`, `fixture_hash_drift`, `fixture_symlink`, `fixture_hardlink`, `fixture_device` | Missing membership, changed size/hash/mode/owner, symlink ancestor, hardlink, special file, setid/capabilities or prepare-to-exec substitution. |
| `shell_entrypoint`, `secondary_exec` | Effective shell/default/interpreter entrypoint or forbidden additional/writable/memfd exec. |
| `gpu_device`, `network_grant` | GPU request/device/env, DNS/inference/proxy baseline, network rule or control route. |
| `inherited_socket`, `inherited_token`, `inherited_fd` | Socket/credential/extra FD or stdio backed by file/device/control resource. |
| `supervisor_state_visible`, `control_escape` | Private state reachable by mount/proc/FD propagation or child can reach host/admin/privileged process controls. |
| `policy_merge`, `policy_fallback` | Effective merge/enrichment, OPA/default fallback or unavailable/skipped hard enforcement. |
| `retained_restart`, `unsupported_host` | Recovery/start uses old state/receipt, or exact Docker/WSL/kernel combination is unqualified. |
| `forged_receipt`, `post_seal_change`, `unbounded_resources` | Invalid provenance/replay/freshness, any sealed-state drift or unavailable/exceeded bound. |

Evidence levels are cumulative and bound to exact official release/build/host:

1. **Upstream unit/property:** parse/negotiation, required-field permutations,
   policy/image invariants and negative fixtures. Local RF043 integrity tests
   are not these upstream implementation tests.
2. **Fake daemon:** assert complete Docker HostConfig/mount/resource/lifecycle
   requests and reject mismatched responses. Snapshots prove request behavior,
   not kernel containment.
3. **Prepared integration:** separately authorize an official supervisor and
   trusted inspectors in a real container with the workload latch closed.
   Observe exact namespaces, mounts, FDs, identity and enforcement; inject
   failures and prove the fixture ELF/model never executes. Test cleanup and
   restart denial without altering unrelated workloads or host lifecycle.
4. **Live adversarial:** separately authorize a reviewed adversarial binary and
   behavior revision. Prove denied writes/network/admin/secondary exec, enforced
   output bounds, descendant termination and crash/replay failures. The existing
   RF039 stdio fixture does not implement these attacks and is not sufficient.

Qualification requires all four levels, all negative cases and a complete
supported-platform matrix: exact official component builds, Engine/API, kernel,
Landlock/seccomp/cgroup, OS/architecture and WSL/Desktop when used. Missing,
inconclusive or stale evidence denies qualification; successful source review,
schema presence, advertisement or a single happy-path integration never suffices.
An implementation-qualified capability still needs separate task execution
authority and all existing Roost admission gates.

## Local validation and continuity

[Validator](../../scripts/openshell_nonwriting_proposal.py) and
[synthetic tests](../../scripts/test_openshell_nonwriting_proposal.py) check the
code-pinned proposal/contract/schema, requirement/matrix/source coverage,
closed-schema fields and local references, exact v3 anchors and all 37 source
blobs plus symbol lines. The validator reads bytes only; it does not implement
the proposed runtime or accept a real receipt as proof of containment.

```text
python -B scripts/openshell_nonwriting_proposal.py --upstream-root <verified-source-root>
python -B -m unittest discover -s scripts -p test_openshell_nonwriting_proposal.py
```

Exit 0 means the complete pinned local specification is READY. Missing/drifted
inputs yield exit 2 and PROPOSAL-BLOCKED. Both outcomes retain
`implementationVerified=false`, `executionSupported=false`, `pilotReady=false`,
`liveAdmissionAllowed=false`, runtime hash null. JSON is bounded to 128 KiB per
artifact, 12,000 nodes, 40 levels and 2,048-character ASCII strings; source reads
reuse RF042's 2 MiB/file, 8 MiB aggregate and no-symlink/reparse/path-escape rules.
No dependencies are installed or upstream code imported/executed.

Eight focused synthetic tests pass, including mutation subcases for every
top-level field, requirement, source map/blob, negative case and receipt payload
field. All 84 OpenShell Python tests and seven synthetic preflight tests passed;
syntax checks for five files, scoped privacy checks for nine files, 403 local
links and diff checks passed. The actual validator verified all 37 source blobs
and symbol references, returning specification READY with implementation false.
Before/after inventories preserved Engine 29.7.2 linux/amd64, the same four
container names/states (two Up), five networks, 107 volumes and 16 image rows.
All ten pre-existing OpenShell JSON files retained their exact bytes. Private
receipts retain detailed checks. Application/API/DB/UI builds and all four
upstream/runtime evidence levels were not run. Only Engine version and existing
container names/status, network, volume and image inventories were read. No workload
payload/env/log/mount inspection, network/download, runtime, image action,
WSL/restart/repair/prune, install/cache mutation, push or deploy is authorized.

## One future adopt-before-build decision

Exactly one recommended next atomic task, **not started**: review a newer
official OpenShell release for this capability or equivalent semantics, pin its
official evidence and evaluate it against this acceptance contract. That task
requires its own authority for network/release inspection. If absent, record the
gap and propose an upstream issue/contribution as separately approved work;
do not submit it automatically. A fork or permanent Roost patch is not admitted.
RF043 stops at this local proposal; v3 and all live gates remain unchanged.
