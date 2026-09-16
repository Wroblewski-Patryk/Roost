# Windows startup environment v1

Later B24 update: [recovery supplement v1](hermes-b24-recovery-supplement-v1.md)
bridges the legacy identity ordering and records later verification separately.
Original B21 REFUSED/acceptance_failed/spent remain unchanged; missing historical
fixture ownership keeps recovery BLOCKED. No cleanup or execution grant follows.
The outcomes and successor proposals below retain their historical scope.


RF-RUNTIME-005B23 is **DONE**: it implements the minimal SystemDrive correction identified in
[B22](hermes-b22-footprint-diagnosis-v1.md). It is an implementation/synthetic
atom with no provider activation, installation change or B21 cleanup authority.
The historical writer of B21's eight extra entries remains unknown. Successful
synthetic routing does not establish that writer or prove a future smoke clean.

## Trusted derivation and physical root

`agent-host-windows-environment.mjs` selects SYSTEMROOT and optional SystemDrive
case-insensitively, before reading values. Duplicate keys are rejected even if
their values agree. On Windows, SYSTEMROOT is required and must be a normalized
absolute local drive-directory path: no drive-relative, UNC/device, traversal,
duplicate separator, alternate-stream, reserved-name, control/injection,
unresolved-percent, trailing-dot/space or root-only form is accepted. The drive
letter is normalized to uppercase; the remaining directory spelling retains
case-insensitive Windows meaning. No system drive letter is hardcoded.

SystemDrive is derived from that root in the Windows expansion format, such as
`D:`. A parent value, if present, must contain exactly the same drive designator,
case-insensitively. Missing SystemDrive can be derived; missing SYSTEMROOT,
conflict, path components or malformed values fail closed. The pure derivation
helper used by synthetic tests is not an admission capability.

Production construction also uses the existing native physical-identity check:
SYSTEMROOT and its ancestors must exist as ordinary directories, without
symlink/junction traversal or a realpath alias. Only directory metadata is read.
At sealing and every pre-spawn proof check, the candidate root/drive must match
the live Worker's own verified environment. A caller cannot select a different
existing directory by providing a self-consistent candidate environment.
The physical root identity is bound, so replacing that directory while keeping
the same path cannot reuse Ready evidence.

## Minimal environment and token rejection

The only new child variable is `SYSTEMDRIVE`. Existing plumbing remains
SYSTEMROOT, WINDIR, PATH, PATHEXT, COMSPEC, TEMP, TMP, USERPROFILE, HOME, APPDATA
and LOCALAPPDATA. The implementation does not copy the entire parent environment
or add ProgramData/XDG values. Secret/provider/dispatcher variable values remain
unread and excluded. SYSTEMROOT's drive prefix is normalized consistently.

Windows admission rejects unresolved `%NAME%` patterns in copied startup values
and critical paths: profile, executable, repository/cwd and derived Hermes
home/write root. No general expansion is performed. Task prompts, source code
and other text are not substituted. A canonical workspace containing a literal
unresolved token is rejected, rather than silently redirected.

On non-Windows platforms, derivation emits no SYSTEMDRIVE and does not inspect
Windows source values or physical roots. Candidate admission disallows an
injected SYSTEMDRIVE there. Existing non-Windows plumbing is retained; token
rules do not reinterpret literal percent text in POSIX paths. Platform selection
in production uses process.platform, not an API/task-provided platform field.

## Ready, receipt and process binding

Per-attempt startup policy and receipt become
`roost-hermes-standard-startup-v2` and `roost-hermes-startup-receipt-v2`.
The new strict windowsEnvironment projection carries policy
`roost-windows-system-environment-v1` and either:

- `derived_verified_systemroot`, with systemDriveDigest and rootIdentityDigest;
- `non_windows_omitted`, without Windows drive fields.

The actual value stays in the private child environment. The public receipt
contains no raw system/private paths or drive value. Full environmentDigest and
candidate digest bind the value; policyDigest includes the Windows contract.
The opaque startup seal also binds this projection, the existing Ready revision,
input seal, profile/provider and deadline. Each proof consumption rechecks live
root/drive identity. Final native process comparison still requires exact
executable/argv/cwd/environment equality. Serialized receipt copies cannot
authorize execution. A v1-shaped receipt cannot satisfy the new v2 schema.

This is a per-attempt proof change, not a profile migration. Profile v5 bytes,
config digest, registry v5, exact provider pin, auth contract, owner-attestation
confirmation/expiry and native-risk v7 remain unchanged. The private profile,
installation manifest and OAuth state were not edited or read for migration.
ADR-004 execution authority remains v13 with no fresh activation.

## Verification and limits

Synthetic cases cover matching/lowercase/non-default drives, omitted parent
drive, missing/relative/UNC/device/noncanonical SYSTEMROOT, ambiguous keys,
invalid/mismatching/injected drive values, reparse/missing roots, task/config/
candidate override, Ready drift, physical root replacement, receipt privacy,
critical path tokens and explicit non-Windows behavior.

A genuine existing Windows Job runs only system Node in a new owned arithmetic
repository. The child observes the exact derived drive and canonical cwd.
An in-memory helper expands the drive token to an absolute synthetic cache path
outside that repository, without creating or opening it. The Job finishes with
exit 0, assigned-before-resume, activeProcesses=0 and jobClosed=true. Repository
entries remain unchanged. Owned test roots/launcher are removed with identity
checks; no host ProgramData write or provider/network execution is part of it.

Final validation passed **220/220 tests, zero failures/skips**, including 51 B23
cases, B22 diagnostics and the required B7 startup, B9 budget, B11 native boundary,
B12 launch admission, B16 split installation, B19 review/reconciliation and B21
controller policy regressions. All native process/recovery work in those tests
used owned synthetic fixtures, never the retained B21 pair.

Application lint, typecheck and both server/web builds passed. Existing Vite
warnings for two runtime-resolved static assets and a large chunk remain unrelated
to this change. All 740 checked documentation links resolve; default context is
83,666 bytes, and three active planning files meet their budgets. Added-content
privacy and diff whitespace checks passed. Usage readback was 62%, with ordinary
usage allowed; no reset was used. Non-Windows cases are synthetic branch tests,
not a separate native Linux/macOS run.

B21's signed review/key identity, original root/owner marker, full repository
footprint and exact Writer/lease/spent identities and bytes matched before and
after all checks. The recovery barrier remains absent. No real reconciliation,
grant, deletion or new smoke occurred. Test-owned roots and Job processes finished
with no B23 leftovers. The B22 serialization and signed REFUSED recovery blockers
remain; this environment fix does not discharge them.

## One next atom

Propose **B24: a versioned, append-only recovery-evidence contract and synthetic
tests** for canonical identity serialization and later independent verification
of a preserved REFUSED attempt. Preserve the original signed terminal receipt,
all artifact bindings, process checks and owner-grant gates. Keep actual B21
cleanup and provider activation outside that atom. This is the single next owner
action/proposal after the B23 local commit and coordinator report; B23 stops here.
