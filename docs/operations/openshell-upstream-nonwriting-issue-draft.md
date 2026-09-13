# Local draft: opt-in nonwriting stdio profile for the Docker driver

**Draft only; not submitted.** Based on the official release inspection at
2026-09-13T02:07:56Z and pinned OpenShell v0.0.116 commit
`d1155aa70042d3e2ee49dbfa15346b108b7c1d92`. No newer public stable was found.
This draft does not claim that prereleases or unpublished work lack a solution.
It contains no implementation, external communication or permission to submit.

## Proposed issue text

**Title:** Add an opt-in Docker profile for immutable, nonwriting stdio workloads

Some workloads need one image-baked static ELF, explicit argv/cwd, bounded stdio,
and no filesystem writes or network access. An example is an inert protocol probe
at `/opt/example/bin/stdio-probe`, with cwd `/`. It needs no writable workspace,
home, cache, tmp directory, provider credentials or shell.

In the examined release, Docker container creation leaves readonly_rootfs unset.
Root/empty OCI workdir becomes `/sandbox`; managed workspace preparation or a
custom workdir write probe requires a writable directory. Explicit argv already
works, but immutable image-ID selection is not an exact executable identity gate.
The public capability/status paths do not provide a complete observed pre-exec
receipt binding child mount/FD/policy state to that argv and attempt.
See the [pinned Docker create path](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-driver-docker/src/lib.rs#L2944),
[workspace resolver](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-core/src/driver_mounts.rs#L108),
[workspace preparation](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-process/src/process.rs#L1802)
and [public capability schema](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/proto/openshell.proto#L785).

Propose a versioned, disabled-by-default nonwriting stdio profile, negotiated
through existing capability messages by gateway, Docker driver and supervisor.
Equivalent official semantics and upstream naming are welcome; the profile must
be portable, not tied to a particular orchestrator or example executable path.

The minimal coherent feature would jointly provide:

- Explicit Docker read-only root and a separately sealed child mount namespace
  with no writable or control resources, including implicit mounts.
- Workspace none without write probes/create/copy/upload/sync, exact immutable
  cwd, explicit argv/nonroot identity and no shell or fallback defaults.
- Platform-digest image verification and pre-start exact file type/mode/owner/
  size/hash/link checks, bound to the unchanged final executable object.
- No child network/proxy/DNS/inference/GPU, host/admin paths, credentials or
  inherited descriptors beyond three dedicated bounded stdio pipes.
- Necessary supervisor state only in bounded private tmpfs, inaccessible to
  the child through mount propagation, proc, namespaces, IPC or descriptors.
- Exact observed effective policy without enrichment/merge/fallback, enforced
  finite resources/output/deadlines and single-use attempt/recovery semantics.
- An authenticated, build-bound, fresh pre-exec evidence receipt, complete
  mount/FD enumeration and exact request/receipt acknowledgement before exec.

This does not require the trusted rootful supervisor itself to initialize without
writes. It requires a proven boundary between its state/privilege and the child.
No existing user should be silently migrated or have ordinary Docker behavior
changed. Unsupported, missing, partial or unknown required profiles must reject
the workload rather than select normal mode.

Acceptance should combine official unit/property tests, fake-daemon HostConfig
snapshots, prepared-container inspection with workload exec held closed, and a
separately authorized adversarial suite on an exact supported-platform matrix.
Each negative case must deny the rejected operation without a success receipt;
runtime resource/output breaches must terminate without success. Source/config
presence or a signed self-assertion alone does not establish enforcement.

## Proposed contribution boundary for review

Reuse existing config/CLI/public and driver schemas, capability translation,
Docker create/image paths, workspace/process preparation, namespace/FD hardening,
policy/OPA/Landlock loading, lifecycle and tests. Add the profile as one coherent
upstream capability. Do not provide a downstream fork, general arbitrary mount
configuration, writable scratch workaround or weakened policy.

The local [RF043 acceptance contract](../../config/openshell/nonwriting-stdio.acceptance.json)
contains all 16 requirements and 35 denial cases; its
[source map and receipt schema](openshell-nonwriting-stdio-proposal.md) make the
scope reviewable. These are proposed acceptance artifacts, not existing upstream
APIs or evidence that the feature is implemented.

Before any submission, obtain a separate decision on the final public issue
text and contribution scope, and recheck official release state if the dated
inspection expired. No issue/PR creation, maintainer contact or implementation
has occurred. This draft adds no follow-up automation or execution authority.
