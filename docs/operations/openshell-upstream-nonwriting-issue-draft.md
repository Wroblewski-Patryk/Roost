# Add an opt-in Docker profile for immutable, nonwriting stdio workloads

## User Story

As an operator running small protocol probes, I want to run one image-baked
static executable through bounded stdio, without filesystem writes or network
access, so that the probe receives only the authority its job needs.

## Problem Statement

In the reviewed OpenShell v0.0.116 Docker path, container creation leaves
`readonly_rootfs` unset. An empty or root image workdir resolves to `/sandbox`,
and workspace preparation requires a writable directory. There is no negotiated
profile combining a read-only child filesystem, workspace none, exact cwd/argv
and verifiable isolation before workload execution.

This is a request for a stricter optional capability. Static review has not
demonstrated an exploit or a violation of an existing security guarantee.

## Impact / Why This Matters

The probe needs no home, cache, temporary files, credentials or shell. Its
admission stays blocked when the selected runtime requires writable workspace
backing or cannot establish the complete child boundary. Image packaging and
filesystem policy alone do not establish that boundary.

## Proposed Design

The caller explicitly requests a versioned nonwriting profile, an immutable
platform image, exact executable identity, argv, cwd and finite resource/stdio
limits. For example, `/opt/example/bin/stdio-probe` runs with cwd `/` as a
nonroot identity; no workspace is prepared or probed for writes.

Before workload exec, the caller can verify the prepared child state and bind
its one-time start acknowledgement to that unchanged state. Missing, unknown,
partial or unsupported profile support rejects the request with a useful reason.
The feature is disabled by default and preserves ordinary users' behavior.
Names, wire format and internal architecture are open to upstream design.

## Acceptance Criteria

- The child has a read-only root and no writable or control mounts, network,
  proxy, GPU, credentials or descriptors beyond dedicated bounded stdio.
- Workspace none preserves exact cwd/argv without shell defaults, probes or
  uploads. The image-baked executable's final identity is checked before exec.
- Necessary supervisor state is bounded and inaccessible to the child.
  Observed effective policy cannot silently gain grants or use a fallback.
- Machine-verifiable pre-exec evidence binds the selected builds, image, child
  state and limits to one fresh attempt; drift or replay denies execution.
  A receipt is one possible design, not a required schema or signing protocol.
- Finite resource/output/deadline limits are enforced. Failed or completed
  attempts cannot restart with retained state. Unsupported platforms fail closed.
- Release-bound tests cover negative cases, prepared-state inspection before
  workload exec and separately controlled adversarial execution. Configuration
  assertions alone are insufficient evidence of enforcement.

## Alternatives Considered

- An immutable custom image can deliver the probe but does not remove mandatory
  workspace writes or seal the child root/mount state.
- A filesystem deny policy constrains handled operations; it does not prove
  read-only backing or exclude inherited control descriptors.
- Writable scratch or broader grants change the requested boundary. Keeping
  execution blocked while waiting for official support preserves it.

## Agent Investigation

Offline review used v0.0.116 commit
`d1155aa70042d3e2ee49dbfa15346b108b7c1d92`:
[Docker create path](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-driver-docker/src/lib.rs#L2944),
[workspace resolver](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-core/src/driver_mounts.rs#L108),
[workspace preparation](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/crates/openshell-supervisor-process/src/process.rs#L1802).
Explicit argv and privilege restrictions provide useful foundations. No runtime
experiment was performed. This pinned review makes no claim about current
releases, prereleases or unpublished work.

## Checklist

- [ ] I've reviewed existing issues and the architecture docs
- [x] This is a design proposal, not a "please build this" request
