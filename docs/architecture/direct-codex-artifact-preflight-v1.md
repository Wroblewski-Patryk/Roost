# Exact Codex artifact preflight v1

RF-HERMES-008, 2026-09-13. Offline static observation, not runtime qualification.
Verdict: **EXACT-CODEX-ARTIFACT-PREFLIGHT-BLOCKED**.
The [normalized observation](direct-codex-artifact-preflight-v1.json) records
one ELF x86_64 candidate in the bounded search. It is readable from the selected
running WSL2 distribution, but its execute permission query returns false.
Its exact Codex version, authenticated provenance, closed launch dependencies
and corresponding wire bundle remain unproven. No candidate code was executed.

Authority: [ADR-001](../decisions/ADR-001-direct-codex-app-server-pilot.md),
[ADR-002](../decisions/ADR-002-codex-qualification-owner-decisions.md), and the
governing RF008 read-only preflight task. The [qualification packet](direct-codex-qualification-decisions-v1.md)
and [CAS contract](direct-codex-app-server-contract-v1.md) retain all requirements.
This report is a dated, sanitized architecture finding, not a private runtime
receipt or an executable installation configuration.

## Discovery boundary

No disk-wide or home-directory scan, ambient PATH search, shell alias execution,
profile/auth inspection or network lookup was used. Seven conventional exact
Linux installation targets were checked: system/local executable locations,
system/local npm package locations, an optional installation location, and the
current user's conventional local executable and npm-global package locations.
None was present; four checks stopped at an absent parent. Ancestor links were
rejected rather than followed. Two conventional Windows npm installation roots
contained neither the exact package nor its expected command wrappers.

The host reported two running WSL2 distributions. Only the already running
Worker distribution was used for metadata and static file reads, via explicit
system env/Python paths with an empty environment, isolated Python, no site
loading and no bytecode writes. No distribution was started, stopped or changed
by a lifecycle command. The second distribution was not searched.

The OS package registration identified one Desktop installation, represented
only as `desktop-package-01`. The registered installation root was inspected;
it was not an account data directory. Its outer package index names exactly one
`app/resources/codex` and one `app/resources/codex.exe`. This establishes one
observed Linux-format candidate in the bounded scope, **not host-wide uniqueness**.
Unsearched profiles, version-manager trees, unrelated distributions and unknown
installations are not assumed empty and cannot provide an implicit fallback.

## Artifact and launch-chain findings

| Relative artifact | Static finding | Consequence |
| --- | --- | --- |
| `app/resources/codex` | Regular file, 262,804,768 bytes; ELF64 little-endian, machine 62 (x86_64), ET_DYN. SHA-256 `6970ad6a5b7615d2f5838879e19c1369e5527cb1544f1515f76900267740a403`. | The only observed Linux Codex-format candidate. Its bytes match when read from Windows and WSL. App Server behavior is not established by its filename or header. |
| `app/resources/codex.exe` | PE, machine 34404 (AMD64); separate digest in the observation. | Windows executable excluded from this Linux profile; no platform substitution. |
| `app/resources/codex-code-mode-host` | ELF64 x86_64, ET_DYN; separately hashed. | Potential auxiliary runtime artifact; necessity and permitted use are unproven. |
| `app/resources/rg` | ELF64 x86_64, ET_DYN; separately hashed. | Potential tool dependency; not permission to run it or search with it. |

The three ELF headers have no PT_INTERP and no DT_NEEDED entries. Thus their
declared loader chain contains no external interpreter/shared-library names.
This does **not** prove absence of runtime dlopen, subprocesses, tool discovery,
configuration reads or other dependencies. No ldd, --version, schema generator,
binary import, App Server, Worker, Hermes, OpenShell, model or task agent ran.

The candidate is directly readable through the existing WSL filesystem view.
There it is a regular file with mode `0444`, owner class `current-user`, no
execute bits and `access(X_OK)=false`. These are permission queries, not a failed
execution attempt. No chmod, copy, mount change, loader workaround or installation
was attempted. Direct execution is not ready under the present view.

A future no-shell launch would require a privately resolved, pinned Windows
WSL bridge and one private physical Linux executable reference, with exactly
`["app-server"]` for the Codex argv. Host/distro names and paths belong behind
installation-local references, never distributed configuration. The observed
native ELF avoids a demonstrated npm/Node wrapper requirement, but the bridge,
full runtime dependency closure, execute permission, replacement-race protection
and cross-OS containment are still unqualified. No usable launch descriptor can
be constructed from this report alone.

## Version and provenance

| Evidence | What was established | What was not established |
| --- | --- | --- |
| OS Appx registration and AppxManifest.xml | Both identify package version `26.908.4834.0`, architecture x64; registration labels SignatureKind as Store. | This is package metadata, not the Linux Codex executable version or an independent signature validation. |
| Static app.asar package.json | Desktop application version `26.908.40834`; archive header and exact package metadata were parsed as data only. | This version cannot be copied into codexVersion. No artifact code was imported or executed. |
| AppxBlockMap.xml | Every 64 KiB block of the four selected artifacts matches the local map; exact sizes match. Metadata hashes are recorded. | A local map can establish consistency but cannot authenticate itself. |
| AppxSignature.p7x | Present and hashed. | Publisher trust, signature chain and binding to the blockmap were not cryptographically verified. No online revocation or certificate fetch occurred. |
| Auxiliary installation metadata | Observed and hashed; no exact Codex version supplied by the inspected metadata. | No upstream build/commit/version-to-ELF-digest binding. |

All current artifact evidence is **LOCAL_OBSERVATION_ONLY**. No independently
authenticated upstream provenance was established. The local Store label is not
promoted to such proof. codexVersion remains null. A same-version label alone
would still not prove identical bytes, complete dependencies or protocol support.

## Bounded inventory and closure limits

A transient manifest was built only for the recognized Desktop installation
root, with relative path, type, size, file SHA-256, hardlink count and normalized
owner/DACL observations. No raw SID, ACL, absolute path or manifest was persisted.
The serialized in-memory manifest used sorted object keys and relative-path-sorted
entries; its digest is an observation identifier, not an accepted inventory seal.

The bounds were 8,000 entries, 2,200,000,000 file bytes and 120 seconds. The read
took 41 seconds: 6,548 entries, 5,510 hashed regular files, 1,037 directories and
one excluded entry, totaling 1,906,910,011 hashed bytes. Four package-index members
were not inventoried because their subtree was excluded by the privacy denylist.
That subtree was not enumerated or read. This is an intentional incompleteness,
not a reason to relax the exclusion. The manifest is **not closed**.

Three additional regular files relative to the blockmap were the recognized
packaging metadata `AppxBlockMap.xml`, `AppxSignature.p7x` and
`AppxMetadata/CodeIntegrity.cat`; no other extra regular file was observed in the
inspected portion. No traversed link/reparse entry was found; 2,129 regular files
had multiple hardlinks. Their other locations were not searched. All 6,547
non-excluded entries had readable normalized ACLs and system ownership, with
zero observed broad-principal write-allow entries. This is not an effective
agent-access analysis; the excluded entry has no ACL observation.

Sequential hashing detects the observed bytes and per-file metadata changes,
not an atomic snapshot or protection against replacement after inspection.
Managed package updates, hardlink aliases, unproven effective ACLs, the excluded
subtree and auxiliary discovery prevent claiming an immutable launch closure.
The required installation inventory and exact-pin fields remain null.

## Wire artifacts and admission impact

No version-bound App Server wire/schema bundle was identified. The 5,511-entry
outer package index had no matching App Server/Codex schema or protocol JSON
artifact name. Only the archive header and package metadata were inspected;
absence of a named outer file is not proof that no protocol code exists inside
archives. No schema was generated. The RF001 documentation snapshot is dated
general documentation, not a schema bound to this ELF digest.

| Decision / blocker | RF008 result |
| --- | --- |
| D01 / B01 | Narrowed to a concrete observed ELF digest, but exact Codex version/provenance, executable placement/access and immutable dependency inventory remain missing. BLOCKED. |
| D01 / B02 | Exact-version wire artifacts and field/initialization/ephemeral mappings remain missing. BLOCKED. |
| D02–D06 / B03–B09 | No numeric budget, auth, containment, money, policy, retention or independent-review proof added. BLOCKED. |
| D07 | Document/schema design remains DECIDED; this is not runtime receipt acceptance. |

Profile revision 3 adds E10 observation references only. All 75 setting values,
53 technical nulls, seven research values and nine blockers are preserved.
implementationReady=false, executionSupported=false, pilotReady=false and
liveAdmissionAllowed=false. Registry v5 and runtime/API/configuration are unchanged.
The [CAS matrix](direct-codex-app-server-acceptance-v1.md) remains SPECIFIED,
NOT QUALIFIED; this task contributes static observations, no C/O runtime evidence.

A later no-model probe requires, before any candidate instruction executes:
authenticated exact binary/build identity; a privately bound executable with
permitted execute access; closed immutable launch/bridge dependencies; version-
bound wire/source mapping; and a separately accepted bounded contract proving
pre-initialization no-auth/no-discovery/no-network containment and owned stop.
Every missing item denies the probe. I01-C grants no implicit installation or
relaxation of those prerequisites.

## Future private receipt boundary

If separately authorized later, use existing installation-private evidence
storage outside repositories/build contexts and outside Codex account profiles.
A closed private receipt must contain exactly version, installationRef,
observedAt, installationRoot, executablePath, executableVersion, executableSha256,
platformRef, bridgeRef, inventory, inventorySha256, provenanceRef, wireSchemaRef,
wireSchemaSha256, accessPolicyRef and reviewerRef. Each inventory entry contains
relativePath, type, size, sha256, ownerRef, aclRef and linkCount. References must
resolve to independently reviewed evidence; unknowns cannot pass qualification.
Private paths stay there; the public projection contains only opaque references,
platform families, approved relative paths, sizes, versions and digests. Apply
the existing bounded retention policy and preserve unresolved work's sole evidence.
No private receipt, raw listing or private path was written in RF008, inside or
outside the repository. The transient incomplete manifest was discarded.

## Verification and next task

The static preflight validator checks the sanitized observation's closed shape,
cross-field bindings, privacy and retained denials. Negative fixtures reject
private paths, invented versions, promoted integrity, changed hashes, unknown
fields and activation. They do not inspect installations or execute Codex.
Existing profile/schema and CAS structural validators remain required.
Native Docker read-only comparisons cover container identity/state/start/restart
and network/volume/image inventories before and after; results are recorded in
the normalized observation. No workload lifecycle or production action occurred.

Exactly one recommended next atomic task: **RF-HERMES-009 — specify and obtain
approval for delivery of one verifiable Linux Codex artifact and matching wire
bundle for this profile.** Define the official provenance/build-to-digest evidence,
private executable placement and immutable launch-inventory acceptance criteria
needed to resolve B01/B02, including how to address this candidate's missing
execute access. Record any version/artifact change as an explicit reviewed new
candidate, never an automatic fallback. This is one delivery-contract decision,
not installation, download, permission mutation or a compatibility probe. It must
establish the authority and bounded scope for any later acquisition; do not infer
network/install permission from RF008 or I01-C. RF009 was not started here.
