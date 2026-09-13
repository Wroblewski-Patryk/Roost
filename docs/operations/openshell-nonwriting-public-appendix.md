# Nonwriting stdio profile: proposed acceptance concerns

This optional appendix describes outcomes for an upstream feature discussion.
It is a design proposal, not an implemented capability or vulnerability report.
Names, internal architecture and evidence encoding remain open to maintainers.
The example is one static image-baked executable at
`/opt/example/bin/stdio-probe`, with cwd `/` and bounded stdio.

## 1. Negotiation and fail-closed compatibility

Require explicit, versioned opt-in and positive support from the selected
gateway, Docker driver and supervisor. Ordinary clients retain ordinary behavior.
Unsupported or incomplete required semantics must never select normal mode.
Discovery is distinct from implementation qualification and execution authority.

Negative checks: missing or unknown profile; partial acknowledgements; an
unsupported host/build combination. Reject before workload exec without a
success result or reusable prepared attempt.

## 2. Read-only child root and complete mount boundary

Set Docker's read-only root explicitly and verify the child's actual root and
entire mount namespace, including runtime-managed, implicit and stacked mounts.
No child-visible writable backing, host/user bind, image VOLUME, shared volume
or writable temporary directory is allowed. Private mount propagation and
observed namespace state matter in addition to authored configuration.

Negative checks: unset/false container root protection, writable child root,
hidden writable mount, image volume, user mount, writable tmp or sandbox.

## 3. Workspace none, exact cwd and argv

The caller chooses an existing immutable cwd and explicit argv/nonroot identity.
Workspace none performs no directory creation, write probes, ownership changes,
copy, upload or synchronization. It supplies no writable home/cache/XDG paths.
No fallback cwd, shell, interpreter default or additional executable is admitted.

Negative checks: cwd fallback, workspace write probe, shell entrypoint and
forbidden secondary exec, including execution from mutable or anonymous memory.

## 4. Immutable image-baked executable

Bind the platform manifest, config and layer closure to the request. Verify
membership and the exact regular executable's bytes, size, mode, owner and link
properties; reject symlink ancestors, hardlinks, special files, setid/file
capabilities and unapproved loader dependencies. Preserve the verified final
object through the exec boundary. A mutable host cache is not image membership.

Negative checks: mutable tag, digest/platform mismatch, absent executable,
hash/metadata drift, symlink, hardlink or device in place of the executable.

## 5. Control, descriptor, network and GPU isolation

The child has no network/proxy/DNS/inference or GPU access and no inherited
credentials, sockets, administrative paths or control channels. Observe final
descriptors: only three dedicated bounded anonymous stdio pipes with appropriate
read/write direction remain after setup descriptors close. Enforce identity,
capability, syscall and filesystem restrictions and PID/IPC/mount separation.

A trusted rootful supervisor may need writes and privileged setup. Confine its
necessary state to bounded private storage in a separate namespace, with no
child access through mounts, propagation, proc, FDs, namespace entry, ptrace or
signals. Disable unnecessary provider/control paths. A read-only device node
does not establish absence of device authority.

Negative checks: GPU device, effective network grant, inherited socket, token or
extra FD, visible supervisor state and escape to privileged control resources.

## 6. Machine-verifiable evidence before exec

Expose trustworthy observations of the final prepared state while workload exec
is held closed. Bind exact component builds, image/executable, identity/argv/cwd,
complete mounts/FDs, effective post-loader policy, installed enforcement and
limits to a fresh attempt. Required policy cannot be enriched, merged, skipped
or replaced by a fallback. The caller's one-time acknowledgement must bind the
unchanged prepared state; any intervening change invalidates it.

An authenticated receipt with canonical hashes and independently trusted build
identities is one possible direction. No particular JSON schema, signature
algorithm, number of signatures or orchestrator protocol is required here.
Equivalent observable guarantees are welcome. Authentication alone does not
prove enforcement or protect against a malicious trusted host/root/daemon.

Negative checks: policy merge, fallback, forged/stale/replayed evidence and
post-seal state change. Qualification should combine release-bound unit/property
tests, fake-daemon request checks, prepared-container inspection with the workload
latch closed, and separately controlled live adversarial tests. All levels and
negative cases must pass on an exact supported platform/build matrix.

## 7. Single-use lifecycle and finite resources

Enforce finite CPU, memory/swap, PID, supervisor-state bytes/inodes, all-stream
input/output capture and setup/workload/termination deadlines. Logging and
diagnostic queues must not bypass output/state limits. No retained-state restart
or replay follows completion, failure, crash or cancellation. Cleanup is confined
to resources owned by that attempt and does not repair unrelated host workloads.

Negative checks: retained restart and unbounded resources. Missing or
unenforceable limits reject before workload exec. A runtime overflow terminates
without success; it cannot retroactively prevent an already authorized exec.
Adversarial tests may run a separately authorized harness to attempt forbidden
operations; rejection of those operations does not mean the harness never ran.
