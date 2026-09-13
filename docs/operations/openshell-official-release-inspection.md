# Official OpenShell release inspection (RF-HOST-044)

**OFFICIAL-RELEASE-NO-QUALIFIED-CANDIDATE**, checked
**2026-09-13T02:07:56Z**, reason **NO-NEWER-STABLE-RELEASE**. Official public
release and tag inventories still identify **v0.0.116** as the latest stable.
No newer stable candidate exists to assess or adopt. This finding is dated,
not a permanent statement about upstream. No installation pin changed.

The [inspection manifest](../../config/openshell/official-release-inspection.json)
is `openshell.official-release-inspection.v1`, canonical SHA-256
`2caaa40ec9a8a141f3b134bff441e2360ffd0acf63c29415321a3d8a69d3816a`.
It binds the [RF043 proposal and acceptance contract](openshell-nonwriting-stdio-proposal.md)
without modifying either, and preserves the [RF042 blockers](openshell-docker-v3-delivery.md).
Execution, pilot and implementation flags remain false; runtime policy hash null.

## Official discovery and its limits

Read-only, unauthenticated GitHub API observations ran from
**2026-09-13T02:06:26Z to 02:07:56Z**. Fifteen responses, **3,697,998 bytes**,
were retained privately with SHA-256, byte length, exact endpoint, HTTP status,
ETag, Date, pagination Link and observation time. No cookies, credentials,
login, release binary, OCI object, source archive or clone was used.

| Official evidence | Observation |
| --- | --- |
| [Latest stable endpoint](https://api.github.com/repos/NVIDIA/OpenShell/releases/latest) | v0.0.116, draft=false, prerelease=false, published 2026-08-28T09:10:23Z. |
| [Releases page 1](https://api.github.com/repos/NVIDIA/OpenShell/releases?per_page=30&page=1), [2](https://api.github.com/repos/NVIDIA/OpenShell/releases?per_page=30&page=2), [3](https://api.github.com/repos/NVIDIA/OpenShell/releases?per_page=30&page=3), [4](https://api.github.com/repos/NVIDIA/OpenShell/releases?per_page=30&page=4) | Complete public traversal: 30/30/30/7 records, 97 total, 94 stable and 3 prerelease. Last page has no next link. No duplicate release IDs/tags. |
| [All tag refs](https://api.github.com/repos/NVIDIA/OpenShell/git/matching-refs/tags/) | 119 refs; greatest stable SemVer tag is v0.0.116. A higher prerelease tag exists separately below. No pagination Link. |
| [Exact stable ref](https://api.github.com/repos/NVIDIA/OpenShell/git/ref/tags/v0.0.116) and [commit](https://api.github.com/repos/NVIDIA/OpenShell/git/commits/d1155aa70042d3e2ee49dbfa15346b108b7c1d92) | Lightweight tag points directly to unchanged commit `d1155aa70042d3e2ee49dbfa15346b108b7c1d92`; tree `fcef21059143930d9e4e52a382b4f0b61fa15c19`. |

The API's pagination links use its numeric repository identity `1166129534`;
the requested endpoints retain the exact NVIDIA/OpenShell repository path.
Public unauthenticated discovery cannot inspect unpublished/private drafts.
These observations are a bounded interval, not an atomic GitHub transaction.
No default-branch source was inspected or used as a release surrogate.

The manifest expires at **2026-09-13T03:07:56Z**: one hour after checkedAt.
The offline validator uses the current UTC clock, rejects future or expired
observations and has no CLI option to refresh the date. This is a maximum reuse
age for a negative inspection, not a guarantee that GitHub stays unchanged for
an hour or permission to install anything. A subsequent adoption decision needs
a newly authorized fresh official inspection and new immutable evidence.

## Stable, prerelease and tag identities

| Publication/ref | Flags and date | Exact tag object and resolved commit | Disposition |
| --- | --- | --- | --- |
| [v0.0.116](https://github.com/NVIDIA/OpenShell/releases/tag/v0.0.116) | draft=false, prerelease=false; published/updated 2026-08-28T09:10:23Z | Lightweight commit `d1155aa70042d3e2ee49dbfa15346b108b7c1d92` | Latest stable, existing baseline; 24 asset metadata records. |
| [dev](https://github.com/NVIDIA/OpenShell/releases/tag/dev) | draft=false, prerelease=true; published 2026-03-18T21:11:50Z, updated 2026-09-12T00:55:26Z | Annotated tag `c19cbcc0d12f2964e15170a8bee8fbc0de079a6a` -> `5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0` | Rolling prerelease updated after baseline, not a new stable; 24 asset records. |
| [vm-runtime-capability-free](https://github.com/NVIDIA/OpenShell/releases/tag/vm-runtime-capability-free) | draft=false, prerelease=true; published 2026-09-05T18:55:59Z, updated 18:56:03Z | Annotated tag `c43498657ab91950f7147d7dd01da09d91171087` -> `c7b7c2609b3081b2346537d7b79356c17902abac` | Newer publication, VM prerelease; 3 asset records. Name does not establish Docker profile semantics. |
| [vm-runtime](https://github.com/NVIDIA/OpenShell/releases/tag/vm-runtime) | draft=false, prerelease=true; published 2026-05-06T05:44:03Z, updated 2026-08-27T00:25:33Z | Annotated tag `39a69c6c58fc63186c37a58867941bfd427da16b` -> `56088d0811f35d01e5af8f975335c9d0e30524be` | Older informational prerelease; 3 asset records. |
| [v0.1.0-pre.1 tag object](https://api.github.com/repos/NVIDIA/OpenShell/git/tags/0ba004e79fb3923133e0c1e288b08ced075a29be) | Tag date 2026-09-01T17:10:52Z; **no public Release record**, so draft/prerelease flags and publish time are unavailable | Annotated tag `0ba004e79fb3923133e0c1e288b08ced075a29be` -> `f54a7a617760295cc101d6ec7f31df1dba50fc23` | SemVer prerelease tag only, not a qualifying publication; no release asset metadata. |

All newer stable and versioned published release lists are empty. The manifest
also records the nonversioned prerelease publications so semantic version ordering
does not hide them. No prerelease implementation is qualified or compared as a
Docker replacement. No inference follows from words such as "capability-free".

The **54 asset metadata entries** retain IDs, names, state, content type, size,
upstream digest when supplied, creation/update time and official API/download
URLs. Those URLs were **not followed**. Publisher-supplied asset digests are
metadata, not local binary verification or supply-chain admission.

Raw annotated-tag objects were reconstructed from the official metadata and
accepted only when Git object SHA-1 matched exactly. The API normalizes tagger
dates; bounded timezone-token candidates were checked against the exact hash,
not accepted by assumption. The stable commit's signed payload/signature was
reassembled and its Git object SHA-1 likewise matched. Public author identity
and signature bodies stay in private raw evidence. GitHub reports the commit
signature verified; this task did not independently verify its signing key.

| Reconstructed object | SHA-256 of exact raw Git object content |
| --- | --- |
| v0.0.116 commit, 1,176 B | `e597c9bbef02c57339cfa2472bcbf6542c5e28fe19f94fffefe7038d78c78181` |
| dev tag, 171 B | `1d36dc2ce888f66d61600d3f8b93bd4e88c12acb53f1846d1ad7f850a637bcfc` |
| VM capability-free tag, 212 B | `ce854722095e5d02f62cd0a4f7b9125aba0e2787a45e0b582bac4a200dd77e82` |
| VM tag, 196 B | `36ce143eadadb85bcb9bec9773360a415f7408895b85db077d6f529e21a65e83` |
| v0.1.0-pre.1 tag, 176 B | `e51ecccb4c4f10d3691ecf4d13afb87b7b2be0000835e3f47c017ac901281681` |

## All 16 requirements: nearest stable state

There is no newer stable candidate. The following is the gap assessment of the
**unchanged v0.0.116 baseline**, not a claim about unreleased code or prerelease
behavior. PASS requires qualifying enforcement evidence, not a matching config
name. Result: **0 PASS, 11 BLOCKED, 5 UNPROVEN**.

All citations below resolve to the pinned commit. Exact Git blob/SHA-256 identities
and symbol lines are inherited from the RF043 proposal and reverified against
the **37 retained source files / 3,310,685 bytes**. No source files were downloaded.
Full per-requirement source references are in the manifest.

| Requirement | Assessment | Exact source evidence and remaining gap |
| --- | --- | --- |
| Negotiation | BLOCKED | [GetCapabilitiesResponse](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/proto/compute_driver.proto#L68) and [public capabilities](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/proto/openshell.proto#L785): no required three-role nonwriting profile acknowledgement; driver version reports daemon version. |
| Root | BLOCKED | [Docker create body](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-driver-docker/src/lib.rs#L2944): readonly_rootfs unset. Internal RO binds do not establish child root RO. |
| Mounts | BLOCKED | Same driver create/config/mount paths accept typed mounts and image-volume metadata; no complete child namespace sealing/receipt path. |
| Workspace | BLOCKED | [resolve_oci_workspace_root](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-core/src/driver_mounts.rs#L108) maps root/empty workdir to sandbox; [workspace preparation](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-process/src/process.rs#L1802) requires writes/probes. No none mode. |
| Command | UNPROVEN | [MainProcessConfig](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-core/src/sandbox_env.rs#L39) and [spawn_impl](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-process/src/process.rs#L739) preserve explicit argv, but defaults and complete secondary-exec/immutable-object exclusion are not proven jointly. |
| Artifact | BLOCKED | Docker ImageMetadata/prepare_image/create have no requested exact fixture path/type/mode/owner/size/hash gate. This missing capability is distinct from actual fixture membership, which remains UNPROVEN. |
| Isolation | UNPROVEN | Process identity/drop/hardening/Landlock exist; source-only evidence does not attest complete child mount/PID/IPC/control separation. |
| Network/GPU | BLOCKED | [Core policy conversion](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-core/src/policy.rs#L99) and [combined supervisor initialization](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-sandbox/src/lib.rs#L390) retain Proxy mode with empty authored groups; no explicit no-network/no-GPU profile. |
| Descriptors | UNPROVEN | spawn_impl has stdio/pre_exec setup, not independent observation of a final closed allowlist free of control FDs. |
| Supervisor state | BLOCKED | [Supervisor logging](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-sandbox/src/main.rs#L555), SSH/CA/netns/workspace writes remain in the combined topology. Optional identity masking is not full child namespace separation. |
| Policy | BLOCKED | [load_policy](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-sandbox/src/lib.rs#L2242), gateway policy and [OPA conversion](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-network/src/opa.rs#L392): only conditional grant equality; fallback/enrichment/composition/update routes lack sealed profile acknowledgement. |
| Limits | BLOCKED | Docker HostConfig omits log/shm/swap controls; supervisor rolling-file count is not a byte cap. No complete profile-wide output/state/deadline proof. |
| Lifecycle | BLOCKED | [Docker stop/start/delete](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-driver-docker/src/lib.rs#L1078) and [start_persisted_sandboxes](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-server/src/compute/mod.rs#L2208) retain/restart state without the proposed single-use receipt/fresh-state contract. |
| Receipt | BLOCKED | Public SandboxStatus, DriverSandboxStatus and GetSandboxConfigResponse lack complete trusted pre-exec evidence/hash acknowledgement. Self-asserted input is not observation. |
| Compatibility | UNPROVEN | Ordinary additive compatibility exists; fail-closed backward compatibility for the absent required profile is not established. |
| Evidence | UNPROVEN | No new stable and no complete release-bound four-level profile qualification. Generic/source tests cannot be promoted to acceptance evidence. |

## Closure of all 35 negative cases

The manifest includes every RF043 case ID exactly once, its requirement/source
disposition, unchanged expected DENIED/no-exec/no-success/no-reuse outcome and
`executed=false`. **All 35 acceptance-test results are UNPROVEN**; none was run
or promoted to PASS. This is complete assessment coverage, not successful
execution of the negative matrix.

Coverage includes missing/unknown/partial profile; root unset/false/child RW;
implicit/hidden mounts, image VOLUME/user mounts, writable tmp/sandbox;
cwd fallback/write probe; mutable tag/digest-platform mismatch;
fixture absent/hash-mode-owner drift/symlink/hardlink/device;
shell/secondary exec; GPU/network/proxy; inherited socket/token/FD;
supervisor-state/control escape; policy merge/fallback; retained restart and
unsupported host; forged/stale receipt, post-seal change and unbounded resources.

The nearest stable code delta since RF042/043 is **zero**. Existing partial
mechanisms (explicit argv, immutable image-ID selection, privilege drop and
conditional Landlock grant preservation) remain useful foundations. They do not
close any complete RF043 requirement. The [local future upstream draft](openshell-upstream-nonwriting-issue-draft.md)
therefore carries forward the full profile gap without proposing a Roost fork,
patch, policy weakening or derived-image-only workaround.

## Validator, checks and preserved state

The [offline validator](../../scripts/openshell_release_inspection.py) binds the
exact code-owned manifest, all 15 response/metadata hashes, release pagination,
stable/prerelease ordering, latest/list/ref agreement, 54 asset metadata records,
unreleased tag membership, five Git object hashes, RF043 contract identities,
37 source blobs/symbol lines and 16/35 assessment closure. It performs no HTTP
request, install or runtime action and cannot refresh hashes or dates through
caller input.

```text
python -B scripts/openshell_release_inspection.py --evidence-root <private-RF044-root> --upstream-root <verified-source-root>
```

Exit **2** with snapshotVerified=true/fresh=true means the dated no-candidate
finding was verified. After expiry, verdict becomes INSPECTION-BLOCKED with a
stale/future code; the recorded historical conclusion remains separately labeled.
Missing/drifted evidence, incomplete pages, unorderable stable versions, changed
refs or forged PASS results fail closed. No branch grants implementation or
execution readiness. HTTP acquisition used 20-second socket timeouts, denied
redirects, at most 2 MiB per response (256 KiB for annotated tags), 12 MiB aggregate
and ten release pages; observed responses stayed within those bounds.

Eleven [synthetic tests](../../scripts/test_openshell_release_inspection.py)
cover SemVer/prerelease/tag distinctions, all newer stable detection, ambiguous
flags/duplicates, endpoint/pagination limits, every 16/35 omission or forged
PASS, immutable date/hash binding, clock expiry and evidence/path bounds.
All **95 OpenShell Python tests and seven synthetic preflight tests passed**,
along with syntax checks for three files, scoped privacy checks for eight files,
410 local links and diff checks. The actual offline validator returned exit 2,
snapshotVerified=true/fresh=true and NO-NEWER-STABLE-RELEASE. Upstream enforcement
tests, runtime/adversarial experiments and application/API/DB/UI builds were not
run for this isolated inspection.

Before/after continuity preserved Engine **29.7.2 linux/amd64**, the same four
container names/states (two Up), five networks, 107 volumes and 16 image rows.
All 13 pre-existing OpenShell JSON files retained exact bytes. Only version and
names/status inventories were read, without workload payload/env/log/private
mount inspection. No Docker image/container/Compose action, OpenShell CLI,
gateway/supervisor/sandbox/fixture/model/agent, WSL entry/lifecycle/recovery,
restart/toggle/prune/reset/socket/stale operation, install/cache change, push or
deploy occurred. One redundant task-owned intermediate object index was removed;
exact API metadata/raw responses, Git objects and final receipts remain privately
inventoried. No archive or additional clone/worktree was created.

Exactly one recommended next atomic task, **not started**: review and finalize
the local upstream issue/contribution scope against RF043 for an explicit owner
decision on whether to submit it. No external submission, implementation, fork,
new release installation or runtime preflight follows from RF044.
