# Pinned Docker v3 delivery compatibility (RF-HOST-042)

Subsequent [RF-HOST-043](openshell-nonwriting-stdio-proposal.md) defines a local
upstream capability proposal and acceptance contract. It implements no runtime
feature and does not change this pinned Docker BLOCKED result.

**PINNED-DOCKER-V3-DELIVERY-BLOCKED**, verified 2026-09-13. The pinned stock
Docker driver/combined supervisor cannot satisfy the complete
[v3 contract](openshell-stdio-policy-v3.md). This is a static compatibility
finding, not a failed runtime experiment. No upstream code, policy, fixture,
installation, image or execution flag was changed.

| Independent requirement | Verdict | Source-bound reason |
| --- | --- | --- |
| a. Child-visible container rootfs read-only before Landlock, with no undeclared writable mounts | **BLOCKED** | Docker `HostConfig` never sets `readonly_rootfs`; no mapped driver option supplies it. It leaves other Docker mount/default filesystem controls unspecified. Internal RO binds do not make the rootfs read-only. |
| b. Zero writable workspace/home/cache/tmp/state backing, no scratch, exact v3 cwd | **BLOCKED** | Every selected OCI workspace is prepared or validated as writable. `/` and an empty image workdir map to `/sandbox`; v3's exact `/` cwd cannot be selected on this driver path. Landlock separately denies handled operations after preparation; it does not remove the writable backing or prove all possible mutations impossible. |
| c. Exact immutable fixture at its pinned path without host/user mounts, post-start copy or mutable shared cache | **UNPROVEN** | The retained RF037 receipt has no complete path-membership evidence for this filename/hash. No immutable fixture-bearing image was materialized. Image-baked delivery is supported in principle, but a derived image alone would not repair a or b. |

**No READY inference follows from the independently successful RF041 grant
proof.** The runtime effective-policy hash stays **null**; executionSupported,
pilotReady and liveAdmissionAllowed remain false. V1/v2/v3 policy and contract
bytes, RF039 source/recipe/ELF and RF040 parser/dependencies are unchanged.

## Source identities and interpretation

The [machine-readable proof](../../config/openshell/docker-v3-delivery-proof.json)
pins **30 unchanged files, 2,274,649 bytes**, from OpenShell v0.0.116 commit
`d1155aa70042d3e2ee49dbfa15346b108b7c1d92`. Each entry records SHA-256, exact
Git blob SHA-1, byte length, role and line ranges. Every blob was checked against
the previously verified RF040 Git tree. Canonical proof SHA-256 is
`84010b83f421468c0244fb08f2339a518e48d87d28b193a9eccc020b9651e645`.

The selected base remains
`ghcr.io/nvidia/openshell-community/sandboxes/base@sha256:c2a43bb0d765774e2790b3babfb20997bb2eac7b4bf4c6d7d8661e99817bf904`.
The RF033/036 gateway and supervisor platform pins remain respectively
`06bbd3eb7b3a1e88fc85d4914221f9a8b345e67cc1a9bab164814c2cfa0f80d9`
and `1f02f37ee9e16c3b1245b80899a954fc8198099494d4fe0cd1e891fc63adf127`.
These image references were not inspected, saved, pulled or started in RF042;
only allowed names/status inventory was read. Source defaults using `latest`
are described below as defaults, never adopted as new pins.

## Exact topology trace

1. **Gateway configuration.** `deploy/docker/docker-compose.yml` 60-133 starts
   a gateway as UID 0, clears its image CMD, supplies a TOML path, a SQLite data
   location, HOME/XDG data location, host Docker socket and same-path data bind.
   `gateway.toml` 24-51 selects Docker, default base/supervisor images and
   IfNotPresent. Its plaintext tutorial setting is not Roost's approved mTLS
   boundary. The config merge lives in server `config_file.rs` 417-500.
   None of this was instantiated. Gateway `grpc/sandbox.rs` 220-290 fills a
   missing command with `/bin/bash -l`, fills the default image, and validates
   an explicitly supplied policy.
2. **Supervisor binary delivery.** Docker driver `resolve_supervisor_bin_source`
   3686-3737 selects explicit binary, explicit image, sibling binary, local cargo
   candidate, then release-matched default image. The selected image route
   inspects the image, extracts `/openshell-sandbox` via a temporary container's
   archive endpoint, writes an atomic cache file, and removes that temporary
   container (3786-3944). That extraction container is not a workload and need
   not be started; RF042 created none. Existing cache entries get ELF-format
   validation, not an expected content-hash recheck. The cache is supervisor
   delivery, not a general fixture delivery mechanism.
3. **Sandbox image and creation.** `provision_sandbox_inner` 924-1076 resolves
   the image, writes a sandbox token file if needed, resolves CDI requests,
   constructs the container and starts it. Image preparation 1594-1670 retains
   the inspected image ID, OCI user/workdir and declared volumes. The container
   uses that immutable image ID rather than re-resolving a mutable tag.
   `DockerSandboxDriverConfig` 343-352 accepts only CDI devices and typed mounts;
   there is no raw HostConfig escape or rootfs/cwd override. `DockerComputeConfig`
   116-219 likewise has no read-only-root or no-workspace option.
4. **HostConfig and OCI process.** `build_container_create_body_for_image`
   2944-3079 sets supervisor User=`0`, WorkingDir=`/`, Entrypoint to the internal
   supervisor bind, and Cmd=`["--workdir", resolved_image_workspace]`. It replaces
   the image's `/bin/bash` entrypoint. HostConfig sets CPU/RAM from resource
   requirements, configured PID limit, optional CDI device requests, internal
   binds plus user binds, typed user mounts, restart None, added
   SYS_ADMIN/NET_ADMIN/SYS_PTRACE/SYSLOG, AppArmor unconfined, managed bridge and
   host aliases. `readonly_rootfs`, `tmpfs`, read-only/masked path lists, memory
   swap, log driver/byte ceiling and shm size are not set here. No post-create
   read-only-root update occurs on this provisioning path. Default Docker
   filesystem/mount behavior therefore cannot be reported as a sealed v3 map.
5. **Combined supervisor initialization.** Sandbox `main.rs` 555-624 attempts
   rolling files under `/var/log` (falls back to stderr). Lines 658-709 decode
   the exact canonical process transport and call `run_sandbox`. Supervisor
   lib.rs 175-232 loads policy and resolves identity/workspace; 390-475 creates
   proxy networking and conditionally policy-DNS state; networking run.rs
   316-389 attempts ephemeral proxy CA files. SSH/control startup and process
   filesystem preparation follow through process `run.rs` 87-133. These writes
   are not disabled merely by v3's empty network groups or RW list.
6. **Workspace and child.** Core `driver_mounts::resolve_oci_workspace_root`
   108-120 maps empty or `/` to `/sandbox`. The stock base declares `/sandbox`.
   Docker OCI identity causes workspace to become both child cwd and HOME,
   even when policy user/group are explicit. `prepare_filesystem_with_identity`
   2029-2100 invokes managed workspace preparation or validation before the
   empty policy-RW loop. Managed `/sandbox` creation/chown/chmod is explicit at
   process.rs 1802-1855; it unconditionally chowns and ensures owner write/execute.
   An alternate image workdir must already exist without symlinks and pass a
   clean helper running as the final identity (1552-1616). The helper actually
   opens O_TMPFILE for writing or creates/unlinks a bounded probe entry
   (1749-1794). A read-only mount cannot pass that check. Changing image
   WORKDIR to `/` therefore does not provide a nonwriting escape.
7. **Policy and enforcement.** RF041's premises remain exact explicit snapshot,
   empty groups, absent GPU devices/requests/environment, no composition,
   override, discovery, fallback or updates, Full enforcement and
   include_workdir=false. Thus the successful source path still has one RO
   fixture and zero RW grants. Process.rs 746-911 creates a direct command,
   pipes stdio when tty=false, strips supervisor-only env, sets cwd, prepares
   Landlock, drops identity/capabilities and enforces before exec. This preserves
   a policy boundary; it does not configure Docker rootfs read-only.
8. **Exit and cleanup.** Canonical process exit is reported by process run.rs
   145-466. NetworkNamespace Drop (netns/mod.rs 551-580) closes its FD and tries
   to delete veth/netns. Docker stop/start (1143-1261) retains the existing
   container writable layer and attachments. Delete (1078-1141) force-removes
   the managed container and cleans its token; it does not delete user named
   volumes or the shared supervisor cache. Gateway Compose restart policy is
   separate from sandbox restart None. This analysis grants no cleanup action.

## Created, mounted and writable paths by recipient

These are paths derived from the pinned source, not inspected private mounts.
Conditions matter: excluded optional paths are not claimed to exist locally.

| Path/source | Recipient and behavior | V3 implication |
| --- | --- | --- |
| Docker socket `/var/run/docker.sock` | Gateway Compose RW bind; administrative daemon capability. Not an internal sandbox bind. | Never expose to child; stock separation is not a runtime containment attestation. |
| Same-path gateway data bind `/var/lib/openshell` | Gateway writes SQLite DB and XDG data/cache; config bind `/etc/openshell/gateway.toml` is RO. | Gateway storage is separate from child rootfs. No local payload inspected. |
| `$XDG_DATA_HOME/openshell/docker-supervisor/<digest>/openshell-sandbox` | Gateway-owned mutable cache; temporary sibling file, atomic persist, mode 0755. Bound RO into supervisor at `/opt/openshell/bin/openshell-sandbox`. | Cache key is image ID; existing bytes receive ELF validation only. Not usable as immutable fixture delivery. |
| `$XDG_STATE_HOME/openshell/docker-sandbox-tokens/<namespace>/<id>/sandbox.jwt` | Gateway writes token with restricted ownership/mode; optional RO bind to `/etc/openshell/auth/sandbox.jwt`. Deleted with sandbox token cleanup. | Supervisor control material; no fixture grant or child authority. |
| `/etc/openshell/tls/client/{ca.crt,tls.crt,tls.key}` | Optional supervisor RO host-file binds for gateway mTLS. | Intended for supervisor; stripped environment alone is not proof of all FD/mount isolation. |
| `/sandbox`, or selected custom image workdir | Supervisor creates/owns managed directory or requires successful write probe on custom directory; child cwd/HOME points there. | Mandatory writable backing and unsupported `/` cwd conflict with v3's nonwriting delivery contract. |
| `/etc/passwd`, `/etc/group` | Identity update code exists for injected numeric platform IDs; Docker clears those injected UID/GID variables. | Docker named `sandbox:sandbox` does not require that rewrite; it still requires workspace preparation. |
| `/var/log/openshell*` | Supervisor rolling application/OCSF logs, three daily files; failed creation falls back to stderr. | File-count retention is not a byte cap. No child RO/RW grant added. |
| `/etc/openshell-tls/{openshell-ca.pem,ca-bundle.pem}` | Proxy mode attempts mkdir/write via `write_ca_files`; TLS failure is handled as disabled TLS interception. | Empty authored network groups still convert to Proxy. V3 grants no child access to these files. |
| `/run/netns/<name>` / `/var/run/netns` | Supervisor invokes `ip netns add`, creates veth and opens namespace FD; Drop attempts cleanup. | Requires privileged namespace setup. This is within sandbox topology, not evidence of a read-only mount map. |
| `/run/openshell/ssh.sock` | Supervisor mkdir/chmod parent 0700; socket 0600 in combined Full mode; replaces an existing socket at its configured path. | Control endpoint, not child scratch. Never operated on in RF042. |
| `/run/openshell/policy-dns-epoch` and temporary sibling | Conditional transparent-TCP/DNS runtime atomically persists epoch. | No eligible endpoints under v3, so this branch is excluded by the stated premises. |
| SPIFFE identity mount parent | Optional child spawn namespace masks it with RO tmpfs, 4 KiB, mode 0555, nosuid/nodev/noexec (process.rs 509-651). | Provider-free v3 excludes it. This mask is not a rootfs remount. |
| User bind/volume/tmpfs targets; image VOLUME | Driver supports explicit typed mounts, validates overlaps; user bind disabled by default, existing named volumes independently supported. | All absent in v3; stock RF037 image declares no volumes. Other images must be rechecked. |
| `/tmp`, `/root`, home/cache/XDG paths | No v3 scratch is configured. They remain part of the unsealed image/root layer or environment-dependent paths; fixture code does not use them. | Lack of a policy grant is distinct from a read-only mount. No complete child-visible writable mount inventory was observed. |
| Docker-managed `/proc`, `/sys`, `/dev`, `/dev/shm`, hostname/hosts/resolver files | Runtime-managed mounts are not fully specified by the driver packet; exact flags/backing are outside this source-only proof. | Do not infer their absence, size or writability from empty user mounts. This remains a completeness gap for a. |

No sidecar TLS copies/state directories, GPU injection, provider skill installation,
user volume, upload or inference configuration is admitted by the v3 premises.
No generic image cache/home directories are claimed automatically created unless
the listed source actually creates them.

## Landlock is a separate layer

Landlock source lines 190-237 choose **ABI V2**, handle that ABI's filesystem
rights and add only the one RO rule. The hard-requirement path treats missing
paths, unavailable Landlock and prepare/enforce failures as fatal. For handled
path operations, ungranted write access is denied after successful enforcement;
the managed workspace does not silently become a policy RW grant when
include_workdir=false. This is the retained RF041 conditional result.

However, `hard_requirement` is a compatibility/failure policy, not a request for
every filesystem operation, a read-only remount, or a general syscall write
ban. Seccomp is default-allow with targeted blocks (seccomp.rs 137-149,
184-297), not a fixture-syscall allowlist. This task does not prove denial of
every metadata operation, already-open descriptor operation, kernel/runtime
mount or operation outside the selected ABI's handled rights. Inherited FDs
and effective enforcement still require separate evidence. Therefore the
stronger assertion "all writes everywhere are impossible" is **UNPROVEN**.
It is also incorrect to claim the child can open `/sandbox` for ordinary writes
merely because its pre-Landlock backing is writable. Both layers are reported
without substituting one for the other.

## Fixture membership and supported delivery

RF037 reconstructed 26,747 paths and verified all layer/config hashes. Its
final metadata digest is
`f58a65c38c8a0c05cf11ae303e714e2734a9163fadfc4e9e4bee976396e8e43d`.
The retained receipt SHA-256 is
`40d02ddfe55b4a53745909c68c43e0a5d2364744253e07c2bcba7b0eb91fc79d`.
It stores counts, a digest, selected categorized findings and predefined basename
probes, **not the complete path map**. `openshell_static_audit.py` 416-449
only retains entries with nonempty categories. `fake-app-server` is not a
predefined probe, and its ordinary regular-file path need not be selected.

Thus neither exact-path presence nor absence can be certified from that retained
evidence. A synthetic regression demonstrates that a virtual image containing
the fixture can omit it from selected findings. We did not assert the expected
absence from dates/naming or the opaque hash, and did not repeat image save to
fill the gap. The known private RF039 ELF is 8,656 bytes, SHA-256
`c4c7bbc5d9d73629c4ebb88ffc1dfa48cb58e85e5477f69ec1128aaab156c85d`;
its existence outside the image does not establish image membership.

Supported delivery routes in CLI run.rs and the pinned sandbox documentation:

| Mechanism | Compatibility with c |
| --- | --- |
| Explicit image reference / `--from` registry image | Supports image-baked files and inspected image-ID selection. A separately reproducible image could carry the pinned fixture before start, without user mounts or post-start copying. No such image was built or verified; writable rootfs remains unresolved. |
| Local Dockerfile/directory `--from` | CLI builds through the local daemon (run.rs 1028-1187). It is a supported way to produce the preceding image, not a runtime immutable-delivery proof. Not executed. |
| `--upload` / sandbox upload | Completes after canonical process start; combining upload with a trailing main command is explicitly rejected at run.rs 454-456. Mutable copy/merge is outside c. |
| Bind / existing volume / tmpfs | User bind/volume forbidden by v3; empty tmpfs supplies no bytes and requires later writes. Docker image mounts are not supported by the typed driver config. |
| Shell/download/startup generation or privileged Docker copy | Outside exact argv, no-network/no-shell and no post-start-copy contract. Not a permitted workaround or implemented delivery route. |
| Supervisor extraction/cache | Specialized for the supervisor binary and internally host-bound. Cannot be repurposed as a fixture channel without changing semantics/upstream. |

Exact child argv **can** be supplied as the driver spec command with tty=false.
`MainProcessConfig` preserves vector boundaries, supervisor main.rs 658-671
decodes it without shell parsing, and process.rs directly constructs Command.
The image entrypoint is superseded. Missing command still defaults to bash;
setting image ENTRYPOINT alone does not select the fixture. Exact v3 cwd `/`
cannot accompany that command on the stock driver route. Command expressibility
therefore does not mean that the fixture can be delivered or launched under v3.

## Deterministic proof, checks and continuity

[The validator](../../scripts/openshell_docker_delivery.py) reads only explicitly
provided local files. It checks a code-owned canonical proof hash, all 30 exact
Git/SHA-256 blobs, v3 policy/contract/source-proof anchors, RF037 parser source
and the exact private image receipt. It rejects path traversal, symlinks/junctions,
missing/oversized files and drift. Bounds are 2 MiB per source, 8 MiB aggregate,
32 KiB proof and 512 KiB image receipt. It never interprets the driver, imports
upstream logic, executes its parser, invokes Docker or contacts a network.

```text
python -B scripts/openshell_docker_delivery.py --upstream-root <verified-source-root> --image-audit <private-RF037-receipt>
```

Exit **2** with `proofVerified=true` means the recorded BLOCKED findings match
the reviewed source. Drift remains BLOCKED with `proofVerified=false`; a caller
cannot refresh hashes or change outcomes through an input file. This is static
evidence integrity, not a signature or attestation of runtime enforcement.

Seven focused synthetic tests cover exact blob identity, HostConfig/mount/tmpfs/
workspace/delivery drift, missing sources, bounded reads, unsafe paths, reparse
rejection, forged manifests and the incomplete image-membership evidence.
The actual pinned source/receipt validator also completed successfully, retaining
BLOCKED. All 76 OpenShell Python regression tests and seven synthetic preflight
tests passed. Syntax, scoped privacy, local-link and diff checks passed; results
are recorded with the private task receipt. Full app/API/DB/UI builds and all live gates were
not run for this source-only analysis.

Before/after inventory preserved Engine 29.7.2 linux/amd64, all four container
names/states (two Up), five networks, 107 volumes and 16 image rows. RF042 performed
only those version/name/status inventory commands; no workload payload, log,
environment or private mount inspection. No container/image action, Compose,
OpenShell CLI, WSL/lifecycle/recovery operation, install/cache mutation, network
request, model or agent execution is part of this task.

Exactly one recommended next atomic task, **not started**: prepare a minimal
upstream feature proposal and acceptance contract for an official Docker
nonwriting stdio profile (read-only rootfs, no mandatory writable workspace,
exact cwd and image-baked immutable fixture delivery). Keep it local for review;
do not submit it externally or implement a fork. A derived image alone addresses
only potential delivery and cannot close a/b, so building one now is not the
recommended next step. V3 remains unchanged while awaiting a supported capability.
