# Static stdio-only policy v3 (RF-HOST-041)

Subsequent [RF-HOST-042](openshell-docker-v3-delivery.md) finds the pinned Docker
delivery route BLOCKED by rootfs/workspace incompatibility and incomplete fixture
membership evidence. The conditional static grant result below is unchanged.

**STATIC-STDIO-POLICY-V3-READY**, verified 2026-09-13. This verdict covers
official source parsing and **conditional preservation of filesystem grants**
through the pinned Docker combined-supervisor loader. It does not attest a
running policy, container compatibility, confinement or execution admission.
The runtime effective-policy hash remains **null**.

The separate [v3 policy](../../config/openshell/synthetic-isolation-v3.policy.json)
and [contract](../../config/openshell/synthetic-isolation-v3.contract.json)
reuse the exact [RF-HOST-039 fixture](openshell-reproducible-fixture.md). V1 and
v2 policy/contract bytes, fixture bytes, source, recipe and toolchain identity
are unchanged. The [v2 enrichment failure](openshell-official-policy-validation.md)
remains valid historical evidence.

## Scope and identities

V3 has one RO path, `/opt/roost-fixture/bin/fake-app-server`, no RW paths,
`include_workdir=false`, Landlock `hard_requirement`, and explicit user/group
`sandbox`. Both network maps are empty: no endpoint, DNS allowance, middleware,
inference or provider group. The child contract has no scratch, writable paths,
user bind mounts, volumes, GPU devices/requests/environment, shell or agent
admission. It requires a read-only root filesystem, an immutable regular fixture
file without symlinks, controlled nonblocking stdin/stdout and no inherited
control descriptors. Its requested cwd `/` grants no filesystem access.

The unchanged fixture identity is `roost.synthetic-stdio.v2`, **8,656 bytes**.
Policy revision 3 does not imply a new executable. Build identity remains GCC
13.3.0 / GNU ld 2.42, two identical static builds, SOURCE_DATE_EPOCH=0, on
`ghcr.io/nvidia/openshell-community/sandboxes/base@sha256:c2a43bb0d765774e2790b3babfb20997bb2eac7b4bf4c6d7d8661e99817bf904`.

| Object | SHA-256 |
| --- | --- |
| Authored v3 policy, canonical 286 bytes | `0d7ac3b0eccde457d5a77e6662a4bfb6a2f1de3e3c4147d2d49633fce6058e5b` |
| V3 contract, canonical 4,907 bytes | `f01133f5a240c2eb60bf2d21d121649373e6e1259f22debfe62222abba888f98` |
| Fixture ELF | `c4c7bbc5d9d73629c4ebb88ffc1dfa48cb58e85e5477f69ec1128aaab156c85d` |
| Fixture source, ASCII LF | `6c99e3fa3651ca2109e26a2e2fe1e818dbd4c882dbc1f34b781ddaad42afa052` |
| Build recipe, ASCII LF | `6cf8f0766bf2407d8293c50e28c28329ab7ccd1fb4e05eb677137823f8d7a472` |
| Official source projection, canonical 223 bytes | `c25bcaf702aa54c5f9af2377c21fd2e96fa9280b837e59cc415e93f0eecc6682` |
| Conditional source proof | `44a0b755f9680cdbcd4c439da72eb61725ba026447c8051c2b34795f7b0551c1` |
| Official v3 receipt | `ca7c4fde3692cc2a9340264336a1a9d718d0f27a578696ce31827f335676502d` |

Canonical hashes use `roost-ascii-json-sorted-compact-v1`: sorted JSON object
keys, compact ASCII JSON, no trailing newline. The official serializer omits
empty network maps and the empty RW list, explaining the 223-byte projection.
This omission adds no grant. It is not a post-loader serialization.

## Conditional source proof through Landlock

All references below are to unchanged OpenShell **v0.0.116**, commit
`d1155aa70042d3e2ee49dbfa15346b108b7c1d92`. The machine-readable
[source proof](../../config/openshell/stdio-policy-v3.source-proof.json) records
16 complete-file SHA-256 hashes, verified Git blob identities, function names
and line ranges. The RF-HOST-040 source cache was only read; no dependency was
downloaded, changed or rebuilt. These are source implications under the listed
premises, not observations of a launched supervisor.

1. **Explicit source and parsing.** `openshell-policy/src/lib.rs`
   `parse_sandbox_policy` (1026), `to_proto` (707; filesystem assignment 810-825)
   and `validate_sandbox_policy` (1416) preserve the supplied FS lists and
   include-workdir flag. The existing official adapter exercised these public
   functions on v3, then `compose_effective_policy(source, &[])` (compose.rs
   59-75), whose clone has no provider layer to append. No default-loading API
   was called.
2. **Gateway premise.** `openshell-server/src/grpc/policy.rs` 2300-2488 can serve
   persisted policy, backfill an explicit spec, replace it with global policy,
   and append provider layers. The proof requires a **new exact explicit
   snapshot**, no prior policy, global policy, provider layers or updates.
   Credential marker passes have no endpoints to stamp. This does not claim
   a configured gateway. Official `merge_policy` is additive: a real negative
   parser case confirms merging empty-network v3 into a liberal synthetic base
   retains its network group and `/tmp` RW. Merge is excluded.
3. **Selected topology.** Docker driver lib.rs 3019-3029 selects the combined
   supervisor and an image-derived workdir. Supervisor `run_sandbox` 175-208
   uses `load_policy`, without sidecar bootstrap or local Rego/YAML overrides.
   `process_enforcement_mode` 1153-1160 selects Full when sidecar topology is
   absent. No alternate loader is assumed.
4. **Loader source selection.** `load_policy` 2258-2307's local override calls
   `enrich_sandbox_baseline_paths`, which uses Proxy mode and would add paths:
   this branch is forbidden. The selected gRPC branch clones a present exact
   snapshot (2322-2323); disk discovery/defaults at 2324-2363 are forbidden.
   Initial OPA failure replaces the proto with a restrictive default at 2436:
   this fallback is outside the proof and requires rejection before any future
   child, even if OpenShell continues in a degraded state.
5. **No proxy/GPU enrichment.** `enrich_proto_baseline_paths` (1778) computes
   `include_proxy` from nonempty network groups. V3 makes it false.
   `has_gpu_devices` (1627) checks `/dev/nvidiactl` and `/dev/dxg`; the contract
   requires both absent, with no GPU injection. `active_baseline_enrichment_paths`
   (1692) then skips GPU enumeration. `collect_baseline_enrichment_paths`
   (1655) returns two empty vectors. `enrich_proto_baseline_paths_with` (1709)
   returns false at 1718-1719 **before creating/mutating filesystem policy or
   invoking any path-existence closure**. No baseline path can be added under
   these premises. `proto_sync_payload_for_enriched_policy` (1808) returns None,
   so enrichment cannot trigger sync/refetch. GPU requests must be absent, not
   `{count:0}`: core `effective_driver_gpu_count` 40-50 rejects zero; an omitted
   count in a present request means one. Docker CDI overrides must also be absent.
6. **OPA and process conversion.** `OpaEngine::from_proto` (opa.rs 392-482)
   revalidates the proto, translates it into separate OPA data and adds runtime
   binary-identity metadata. `proto_to_opa_data_json` 1857-1893 copies explicit
   filesystem/Landlock/process fields. Empty network groups have no binary
   symlink entries to expand. On the gRPC path the process FS policy comes
   directly from `SandboxPolicy::try_from(proto_policy.clone())` (sandbox lib.rs
   2519), **not** a potentially defaulted OPA config query. Core policy.rs
   123-137 applies only lexical `normalize_path` (paths.rs 150-177); the fixture
   path is already normalized. Identity resolution touches process identity,
   not FS lists; explicit `sandbox` fields survive Docker OCI completion.
   `process_policy_for_topology` (1414-1428) clones this policy; combined topology
   does not alter it.
7. **Process setup and Landlock.** `run_process` receives that process policy
   (sandbox lib.rs 819, 922-935). Filesystem preparation (process.rs 2029-2100)
   may prepare/check an image workspace but takes `&SandboxPolicy`, adds no
   policy grants, and has zero RW directories to iterate. Process.rs 843 passes
   the policy/workdir through linux/mod.rs 25-30. Landlock clones RO/RW at
   134-135. Its workdir append at 137-144 is disabled; the empty-policy shortcut
   is impossible because one RO path remains. Rules at 218-237 add exactly one
   RO rule and zero RW rules. The regular-file mask is intersected with
   file-compatible rights at 355-364; no ancestor directory grant is introduced.
   Missing/inaccessible fixture paths, unavailable Landlock, preparation and
   enforcement errors are fatal in hard-requirement privileged preparation.
   The current-user skip branch is a different topology. Privileges drop before
   enforcement (process.rs 882-895), and errors propagate before child exec.
   The inode must still be rechecked in future runtime work.

**Conditional conclusion:** successfully prepared Landlock path grants are
exactly one RO fixture and zero RW paths. Any changed premise invalidates this
conclusion. No public offline post-loader function exists on this path:
`load_policy` and enrichment functions are private and consult runtime state.
We neither copied them into a synthetic evaluator nor ran the gateway,
supervisor or OPA loader. The source proof and official source projection remain
distinct; **runtime effective-policy hash = null**.

## Offline official evidence and default linter

The [official receipt](../../config/openshell/stdio-policy-v3.receipt.json) records
two identical runs of six actual parser cases: v3 replacement, malformed input,
unknown field, invalid root identity, refusal of a replacement base, and additive
merge leakage. The [v3 harness](../../scripts/openshell_stdio_official.py) reuses
RF-HOST-040's unchanged transport and static parser, **3,502,288 bytes**, SHA-256
`1547f375cdf3748c6e754fb84c2d728c149b7ea80268a51e884d75b2fb5d8a13`.
No toolchain, Rust image or dependencies were installed or rebuilt.

Exactly one temporary parser container used the already-local base digest with
pull=never, network none, read-only root, UID/GID 1000:1000, cap-drop ALL,
no-new-privileges, 1 CPU, 512 MiB RAM/no extra swap, 64 PIDs, restart no,
128 MiB bounded exec/nosuid/nodev tmpfs, 1 MiB shm and log-driver none.
No bind/volume/socket/credential inputs or GPU requests/devices were supplied.
Its owned configuration was verified before start; both GPU probe paths were
absent inside it. This verifies the **parser container**, not a future sandbox.
Only parser, Python harness and public policy bytes entered its bounded tar
stream. Fixture bytes were never transferred or executed. Container stdin was
limited to 5 MB, execution to 60 seconds, stdout to 32 KiB and stderr to 8 KiB.
Each parser invocation retained RF-HOST-040's five-second, 16 KiB output and
4 KiB stderr fences with an explicit credential-free environment.

Default `scripts/openshell_minimal_policy.py` now delegates to the
[static v3 linter](../../scripts/openshell_stdio_policy.py). It requires a supplied
materialized fixture and exact policy, contract, official receipt and source
proof. Code-owned canonical pins reject unknown/missing keys, old revisions,
extra network/FS grants, GPU/mount/scratch/workdir changes, merging, altered
source/recipe/ELF and missing or substituted evidence. It reads bytes only;
there is no execution option and it never launches the official parser.

```text
python -B scripts/openshell_minimal_policy.py --fixture <private-fixture-path>
```

Explicit `--template` remains v1's historical template review. The v2 artifact
module also remains historical evidence; neither can produce a v3 verdict.
No Worker/provider, executionSupported, pilotReady or liveAdmissionAllowed flag
is enabled. The receipt is immutable local audit evidence, not a remote
signature or a fresh attestation of runtime state.

## Verification, continuity and remaining gates

The actual private ELF passed the default v3 linter and structural inspection.
**69 Python regressions** (including eight v3 tests with rejection subcases)
and **seven preflight tests** passed. Source Git blob/hash checks, historical
v1/v2 byte checks, documentation links, syntax, privacy and diff checks passed.
Private before/after receipts record Engine **29.7.2 linux/amd64**, unchanged
four container names/states (two Up), five networks, 107 volumes and 16 image
inventory rows. The sole owned container was removed by its recorded ID;
zero new final Docker resources remain. Existing workload payloads, logs,
environment and mounts were not inspected. No pull/build, OpenShell CLI, WSL
entry/lifecycle/recovery action, fixture, supervisor, gateway, model or agent ran.

Static grant equality does not establish runtime feasibility. The pinned Docker
driver starts its supervisor as root, adds supervisor capabilities/control binds,
and leaves `ReadonlyRootfs` unset (lib.rs 3019-3065). Workspace preparation can
require writes or fail with the requested `/` cwd/read-only root. These are
**unresolved compatibility gates**, not permissions added to v3. Core conversion
also retains Proxy mode even without authored network groups; empty groups do
not prove implicit inference, DNS, inherited FDs or host/admin control are
inaccessible. ABI-v2 Landlock path grants alone are not a complete filesystem
or syscall confinement proof.

Live admission still requires compatible immutable delivery/workspace handling,
an acknowledged exact post-loader snapshot, real GPU absence, enforced
Landlock and network/admin/host-control isolation, bounded output/resources,
process-tree termination and provider compatibility. Full application/API/DB/UI
builds were not run for this isolated static contract change. No push, deployment
or production change occurred.

Exactly one next atomic task, **not started**: statically determine whether the
pinned Docker combined-supervisor route can satisfy v3's read-only rootfs,
zero-writable-workspace and immutable fixture-delivery contract, documenting
required upstream capability gaps without configuring a gateway, patching
upstream, broadening grants or running a fixture/runtime.
