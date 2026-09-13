# Add an opt-in Docker profile for immutable, nonwriting stdio workloads

## User Story

As an operator running small protocol probes, I want one image-baked static
executable to run through bounded stdio without filesystem writes or network
access, so that it receives only the authority its job needs.

## Problem Statement

The inspected Docker path leaves `readonly_rootfs` unset. An empty or root OCI
working directory resolves to `/sandbox`; workspace preparation requires write
access. I could not identify an opt-in mode combining read-only child backing,
no workspace, exact cwd/argv and verifiable isolation before workload execution.

This requests an additional capability, not a vulnerability fix. No exploit or
violation of an existing guarantee is asserted.

## Impact / Why This Matters

A probe that needs no home, cache, temporary files, credentials or shell cannot
meet this admission boundary through image packaging or filesystem policy
alone. Keeping it blocked avoids granting writable backing it does not need.

## Proposed Design

The caller explicitly selects a versioned nonwriting profile, immutable platform
image, executable identity, argv, cwd and finite resource/stdio limits. For
example, `/opt/example/bin/stdio-probe` runs as nonroot with cwd `/`, without
workspace creation or write probes.

Before workload exec, the caller can verify the prepared state and authorize
that unchanged state once. Unsupported or partial support returns a clear denial.
The profile is off by default; existing workflows keep their behavior. Names,
wire format and internal implementation remain upstream design choices.

## Acceptance Criteria

- The child has read-only root/mount backing, exact cwd/argv and no writable
  workspace, user mounts, image volumes or implicit writable temporary paths.
- The selected image-baked executable is checked against its requested identity
  and cannot be substituted between verification and exec.
- The child receives only bounded stdio: no network/proxy, GPU, credentials or
  supervisor/control descriptors. Necessary supervisor state stays inaccessible.
- Observed effective policy and enforced limits match the request. Missing
  protection, state drift or stale/replayed approval denies execution.
- Attempts are single-use. Resource/output/deadline violations terminate without
  success; failed or completed attempts cannot restart with retained state.
- Tests verify these outcomes on supported builds/platforms, including prepared
  state before workload exec and controlled attempts at forbidden operations.

### Inline technical appendix

Useful rejection cases include hidden writable mounts; cwd or shell fallback;
mutable image references; executable hash/metadata/link drift; inherited control
FDs; effective network grants; policy enrichment/fallback; unbounded output;
and prepared-state replay. Runtime overflow means termination, not a claim that
initial execution never happened.

An authenticated pre-exec receipt is one possible way to expose observed state.
No specific schema, signature protocol or new lifecycle API is requested; an
existing upstream mechanism with equivalent observable guarantees is welcome.
Configuration assertions or signatures alone do not prove enforcement.

## Alternatives Considered

An immutable custom image addresses delivery but not mandatory workspace writes
or mount isolation. A filesystem deny policy constrains handled operations but
does not prove read-only backing or exclude inherited authority. Writable scratch
changes the required boundary; waiting for official support remains an option.

## Agent Investigation

Read-only review on 2026-09-13 found v0.0.116 still the latest stable. Current
`main` was pinned to `5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0`; the
[Docker create path](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/crates/openshell-driver-docker/src/lib.rs#L3145),
[workspace resolver](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/crates/openshell-core/src/driver_mounts.rs#L108)
and [workspace contract](https://github.com/NVIDIA/OpenShell/blob/5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0/architecture/compute-runtimes.md#L405)
support the observations above. No runtime experiment was performed.

Related work: [companion supervisor PR #2965](https://github.com/NVIDIA/OpenShell/pull/2965),
[OCI workdir issue #2526](https://github.com/NVIDIA/OpenShell/issues/2526), and
[attestation discussion #2661](https://github.com/NVIDIA/OpenShell/discussions/2661).
These cover useful parts; this proposal adds the specific no-workspace,
nonwriting stdio outcome and can fit those existing directions.

## Checklist

- [x] I've reviewed existing issues and the architecture docs
- [x] This is a design proposal, not a "please build this" request
