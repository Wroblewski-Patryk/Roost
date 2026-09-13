# Direct Codex artifact delivery contract v1

RF-HERMES-009, 2026-09-13. Contract version: **1**.
Status: **SPECIFIED; ACQUISITION BLOCKED**.
Authority: the RF009 documentation task, [ADR-001](../decisions/ADR-001-direct-codex-app-server-pilot.md)
and [ADR-002](../decisions/ADR-002-codex-qualification-owner-decisions.md).
The [acceptance matrix](direct-codex-artifact-delivery-acceptance-v1.md) maps
CDL-R01..16 to CDL-T01..16, D01/B01/B02 and the existing CAS requirements/tests.
This contract specifies future delivery; it grants no acquisition or execution.
Follow-up [RF010 source research](direct-codex-official-source-research-v1.md)
is incomplete because metadata/accounting capture failed. It selects no source
and leaves this contract intact. Its report and the qualification packet own
the current next-task recommendation; the RF009 recommendation below is historical.

## CDL-R01 — Scope and present disposition

One candidate means one exact official native Linux x86_64 Codex App Server
artifact, one selected WSL2 distribution and one immutable versioned installation
root behind the Windows Worker's private installation reference. Preserve the
[CAS contract](direct-codex-app-server-contract-v1.md), registry v5, existing
authority/recovery boundaries and all independent budget/isolation gates.
Hermes and OpenShell are not required delivery components. No Node/npm launcher,
shell wrapper, Windows PE or alternative runtime is implicitly selected.

[RF008](direct-codex-artifact-preflight-v1.md) remains dated BLOCKED evidence.
Its Desktop ELF digest is an observation, with mode 0444 and X_OK=false in WSL;
neither package versions nor local checksum agreement establish its Codex build
or publisher trust. Do not chmod, copy, extract for reuse or use a loader bypass
on that installed Desktop artifact. Do not repair the existing installation.

The closed selection record below contains no chosen source or technical guess:

```json
{
  "contractId": "roost-codex-artifact-delivery-v1",
  "sourceRef": null,
  "releaseRef": null,
  "codexVersion": null,
  "buildRef": null,
  "artifactSha256": null,
  "publisherManifestRef": null,
  "trustPolicyRef": null,
  "installationRef": null,
  "inventoryRef": null,
  "schemaRoute": null,
  "wireBundleRef": null,
  "acquisitionAuthorityRef": null,
  "acquisitionReady": false,
  "schemaProbeReady": false,
  "compatibilityProbeReady": false,
  "implementationReady": false,
  "executionSupported": false,
  "pilotReady": false,
  "liveAdmissionAllowed": false
}
```

All nulls are unresolved, never defaults. acquisitionReady=false,
schemaProbeReady=false, compatibilityProbeReady=false, implementationReady=false,
executionSupported=false, pilotReady=false and liveAdmissionAllowed=false.
The qualification profile stays revision 3 with all 75 setting values and
53 technical nulls unchanged. No executable configuration consumes this record.

## CDL-R02 — Official source and exact version selection

Eligible source classes are publisher-operated distribution, an official
publisher-owned release repository, or a registry artifact whose publisher
ownership and release binding are authenticated. A future source review must
establish that OpenAI publishes the exact Linux artifact through that channel,
using official documentation plus authenticated release metadata. No exact
endpoint or package is selected here; source classes are requirements, not
claims that a current source publishes every required artifact or signature.

Select one exact version/build and immutable release identity from that evidence;
bind asset identity, platform, byte count and digest. A tag alone is insufficient
if it can move. `latest`, version ranges, moving channels, ambient command
resolution, search snippets and matching filenames cannot be pins. Mirrors,
unverified caches and Desktop package extraction without an authenticated
build-to-digest binding are rejected. No manual copying from Desktop is a route.
An official registry may be a source of bytes only: install scripts, lifecycle
hooks and package-manager resolution are forbidden acquisition mechanisms.
Unsupported source format or unavailable provenance leaves selection BLOCKED;
do not silently choose a different version, platform or runtime.

## CDL-R03 — Publisher manifest and detached verification

Normalize publisher evidence into a closed private manifest with exactly these
fields. Preserve original signed/attested bytes and their digest separately;
normalization cannot manufacture claims absent from the publisher evidence.

| Field | Required value and verification |
| --- | --- |
| `manifestVersion` | Exact delivery-manifest version 1. |
| `publisherRef` | Verified official publisher identity under the reviewed trust policy. |
| `sourceUrl` | Exact authenticated official asset URL; private evidence, not a guessed repository default. |
| `releaseIdentity` | Immutable release/asset identity, including a fixed commit/build binding when a mutable tag is used for discovery. |
| `codexVersion` | Exact binary release version, not a Desktop/application/package version inferred to be equivalent. |
| `buildIdentity` | Publisher-attested build identity linking this version to these bytes. |
| `platform` | Literal linux; reject cross-platform archives or select only explicitly identified members under the manifest. |
| `architecture` | Literal x86_64, independently confirmed by static ELF inspection. |
| `assetSize` | Positive exact published byte count, checked against the bounded download. |
| `assetDigest` | Algorithm and value: SHA-256 or stronger approved algorithm; no weak hashes. |
| `executableIdentity` | Exact relative member, published native executable size/digest, and version/build binding, including authenticated archive-member evidence where packaged. |
| `verificationEvidence` | Detached signature or build attestation, signed checksum/manifest identity, trusted signer/issuer and verification-policy references. |

Detached verification precedes payload download. Independently anchor the
publisher key or attestation issuer/subject/build policy; a signer key shipped
only beside the payload cannot authenticate itself. Authenticate any required
transparency/checkpoint material through the explicitly approved endpoints or
previously trusted evidence. Never fetch missing trust material implicitly.
Plain checksum text, HTTPS alone, registry integrity alone and a local Store
label are not substitutes for the reviewed signature/attestation chain.

Verify signature/attestation binding, release/build/platform/size and digest
agreement before accepting a payload. A stronger publisher digest still requires
a locally computed SHA-256 for the existing Worker profile, explicitly bound to
the same verified bytes. Missing mandatory published metadata, unavailable trust
anchor, unverified signature, mismatch or unsupported algorithm means BLOCKED.
Do not invent a size from an unrestricted download, a version from --version,
or provenance from a locally computed hash. No unsigned fallback is admitted.

## CDL-R04 — Build, binary and wire-schema binding

The evidence chain is exact version/build → authenticated executable digest →
closed launch inventory → wire bundle digest → reviewed CAS field mapping.
The RF001 general documentation snapshot cannot replace exact-build wire data.
There are exactly two schema routes, selected explicitly by a later task:

- **PUBLISHER_BUNDLE**: authenticated publisher manifest binds the version/build
  and executable digest to a versioned wire/schema bundle, its size, digest,
  complete membership and format. A same-version filename without that binding
  is insufficient; external schema references must be resolved into the sealed
  bundle or rejected, never fetched during validation or admission.
- **PINNED_GENERATOR**: after binary provenance, inventory, protected placement,
  permissions and pre-execution containment are proven, a separately authorized
  no-model schema-generation probe may run the verified native binary. Its exact
  generator argv must come from reviewed official evidence for that build; it
  is not guessed here or added to CAS-R04's App Server argv. Bind executable,
  inventory, generator argv, output membership/size/hashes and probe evidence.

PINNED_GENERATOR may enter a **BINARY_VERIFIED_SCHEMA_PENDING** evidence state;
that state authorizes nothing by itself and does not satisfy B02. Its narrow
schema-only task can precede a complete wire bundle, resolving the bootstrap
dependency without allowing App Server compatibility, thread/turn creation,
model/tool use or live admission. It needs independent no-auth/no-discovery/
no-network containment and owned stop before any instruction executes. Unknown
generator side effects or unsupported containment block it.

Generated output first goes to bounded private scratch, then, under explicit
finalization authority, to a separately sealed read-only schema evidence bundle.
Keep that evidence bundle outside the immutable executable root; never append
generated files to a sealed installation. The receipt binds both opaque root
references and complete relative inventories. This is one executable installation
plus inert evidence, not a second runtime. Reseal the profile evidence revision;
the binary's verified identity must remain identical. A generated bundle proves
observed output for that pin, not publisher signature or behavioral compatibility.

## CDL-R05 — Private protected placement

Resolve installationRef to one physical, versioned installation root in the
selected WSL2 distribution, outside repositories, account profiles and shared
user-writable/global package locations. The actual absolute root and distro
identity exist only in private per-installation configuration. Roost records
the opaque reference and state, never the host path or credentials.

Require root ownership or an independently proven equivalent protected installer
principal, with no agent write/delete/rename rights on the root, ancestors or
files. Specify exact private owner/group/ACL/mode policy for every entry; only
the minimal Worker/contained-execution principals receive required read/execute
rights. Ordinary files and schemas are non-executable. No world-writable or
unnecessary world-executable grants, setuid/setgid binaries or file capabilities.
No blanket permission repair or recursive change outside this newly authorized
root. Permission setup itself requires the later task's explicit narrow authority.

Reject symlinks, junctions, reparse escapes, special files and external hardlinks;
v1 installed regular files require linkCount=1. Do not resolve ambient PATH,
run shell wrappers or use mutable global libraries/helpers. Native platform
dependencies need a separately sealed immutable platform view, identified in
the launch inventory, or placement within the installation under reviewed rules.
Missing protection cannot be replaced with filesystem mode labels alone.

Writable scratch, synthetic CODEX_HOME and temporary output are separate private
capabilities outside the installation. They contain no real account files and
cannot broaden model/tool access. The schema evidence area is read-only after
finalization. Do not change global PATH, shell/user profiles, WSL mounts, services,
autostart, Docker or the existing Desktop installation to make placement work.

## CDL-R06 — Closed inventory receipt

The private receipt identity is `roost-codex-artifact-delivery-receipt-v1`.
Required top-level fields: version, installationRef, profileRef, sourceEvidenceRef,
publisherManifestSha256, executableSha256, platformRef, bridgeRef, schemaRoute,
wireBundleRef, wireBundleSha256, files, inventorySha256, accessPolicyRef,
identityProtectionRef, observedAt, reviewerRef and status. Unknown fields,
duplicate keys, coercions and unresolved required values cannot qualify a pin.
A schema-pending receipt has status BINARY_VERIFIED_SCHEMA_PENDING and null wire
references explicitly; it cannot be mistaken for final delivery acceptance.

Each inventory entry has exactly rootRef, relativePath, type, size, sha256,
ownerRef, mode, aclRef, linkCount and purpose. rootRef resolves only to the one
installation, its sealed schema evidence bundle or its pinned immutable platform
view. A reference cannot add another executable installation or writable root.
relativePath is normalized within that root: no absolute paths, traversal,
case-colliding names, alternate streams, NUL or link resolution. Directories have
size zero and sha256 null; regular files have exact bytes/digest and linkCount=1.
All entries have verified ownership/mode/ACL policy references.

Inventory every necessary executable, loader, library, helper, static config and
schema, and every directory/regular file in each admitted root. Reject missing,
extra, changed, unreadable or excluded members; an incomplete inventory cannot
be a final seal. ELF without PT_INTERP/DT_NEEDED does not prove absence of dlopen,
helper processes, environment/config discovery, plugins or other runtime reads.
Resolve that closure through version-bound source evidence and separately bounded
probes; never treat an empty loader list as complete dependency proof.

Use the existing canonical sorted-key UTF-8 JSON/SHA-256 rules and explicitly
sort entries by rootRef then relativePath. Seal the receipt externally rather
than inserting a self-hash. Fresh inventory and access-policy checks must agree
before any later probe/launch; a digest alone supplies no authority or immutability.

## CDL-R07 — Identity from admission through spawn

The required protection spans the executable, all loadable dependencies, schema
and their namespace, not just a hash check followed by opening a filename again.
A candidate Linux design opens the approved physical root without following
links, resolves beneath that root, opens the file without following links, and
checks file identity/type/device/inode/owner/mode/link count/size plus digest on
the same readable handle. Execute that verified identity through a supported
handle-based operation such as execveat/fexecve inside protected containment.
Do not reopen an unchecked path after verification.

This is a design to qualify, not a claim that the host/binary supports it.
If handle-based execution is unavailable, an independently proven equivalent
must prevent rename, replacement, mount substitution and writable aliases for
the full interval. No plain path recheck or periodic hashing fallback. Dynamic
loaders/dependencies must remain within the pinned protected namespace. Bind
the Windows bridge's file identity and ownership too; a Windows handle alone
does not protect Linux descendants or mounts. Any identity/permission drift,
extra file or unproven race protection denies spawn and retains the blocked pin.

## CDL-R08 — Future acquisition authority envelope

The later acquisition task must explicitly authorize exactly one source, version,
build, asset/executable digest, installationRef and resolved private root before
payload writes. A closed authorization contains the following required fields;
it is private task evidence, not a new API or persistent workflow engine:

| Required field | Exact boundary |
| --- | --- |
| `taskRef`, `authorityRef`, `reviewerRef`, `expiresAt` | Current bounded task/owner authority and independent review; no authority from artifact metadata. |
| `sourceRef`, `releaseRef`, `codexVersion`, `buildRef`, `assetDigest`, `executableSha256` | Exact reviewed source and authenticated identities from CDL-R02/03. |
| `installationRef`, `rootRef`, `platformRef`, `trustPolicyRef` | One private physical installation and proven target/trust policy; no root supplied by archive content. |
| `networkAllowlist` | Exact official HTTPS origins, asset paths/methods and required publisher-operated delivery endpoints; no wildcard domains, arbitrary redirects, account cookies or proxy discovery. |
| `maxMetadataBytes`, `maxDownloadBytes`, `maxUnpackedBytes`, `maxFiles`, `maxDepth` | Positive finite bounds for metadata, cumulative downloaded bodies, unpacked bytes/membership/depth; no archive bomb or reset across retries. |
| `maxDurationSeconds`, `maxRetries`, `maxWorkspaceBytes`, `minFreeReserveBytes` | Measured finite task/time/retry/disk budget including partials, extraction, schema output, verification and stop; maxRetries may be zero. |
| `writeScope`, `permissionPolicyRef`, `cleanupScope` | Exact new quarantine, installation and evidence/scratch roots; precise creation/permission/finalization rights and ownership-based cleanup policy. |
| `retentionPolicyRef`, `rollbackRef` | Current/previous slot identities, protected unresolved pins and reviewed failure behavior. |

All numeric values must be selected and justified by the responsible technical
system under I01-A before acquisition; this spec supplies no guessed defaults.
Task duration remains within the existing 60–3,600-second contract, including
verification, normal exit and the at-most-five-second owned-stop reserve.
Missing endpoint, root, numeric bound, permission authority or trust evidence
means zero payload download/placement. DNS/TLS validation and every redirect must
remain in the reviewed endpoint policy; stop before contacting an unlisted target.
Do not use installers that need implicit mirrors, credential stores or lifecycle
scripts. No autostart, service/global PATH/profile changes, real auth/secret access,
model calls, tool/task execution or implicit schema generation is authorized.

## CDL-R09 — Download, quarantine and static extraction

After detached verification and explicit authority, stream into an exclusively
created task-owned quarantine under the private declared write scope. Enforce
time and cumulative size limits before storage growth, including retries and
metadata; check exact published size and digest before parsing/unpacking.
Untrusted bytes remain non-executable and are never imported or invoked.

Use a reviewed nonexecuting archive reader with membership/depth/unpacked-size
bounds. Reject absolute/traversal/colliding entries, links, devices, archive
permission surprises and undeclared members. Never apply an archive's owner,
setuid, capabilities or permission metadata directly. Set only the explicit
new-root policy after verification. No postinstall/hooks, version probe, package
manager, auto-repair or scripts from the download. Parse bounded ELF/config/schema
metadata as data, preserve publisher evidence and deny on incomplete inspection.

## CDL-R10 — Placement and permission acceptance

Publish only verified bytes into the exact newly authorized versioned root;
never overwrite a current or previous pin. Use a qualified atomic same-filesystem
publication or a reviewed equivalent, then recheck the destination inventory,
identity protection, ownership and minimal execute/read rights from the intended
Worker/contained principal. Cross-filesystem copy cannot silently substitute for
an atomic operation. Inert evidence placement follows the same integrity rules.

Keep the candidate inactive while checking. Failure, execute-access denial,
unexpected writable ancestor, a different destination digest or unknown owner
blocks. Do not recursively chmod a shared parent, repair WSL mounts, broaden ACLs,
or fix RF008's Desktop permissions. If protected ownership requires privileges
not expressly granted by the later task, stop; never elevate implicitly.

## CDL-R11 — Ordered stages and distinct gates

These are documentary evidence stages, not an implemented state machine:

| Stage | Required exit evidence; unknown means BLOCKED |
| --- | --- |
| S01 source_selection | One exact official source/version/build, trust policy, platform and bounded acquisition proposal reviewed. |
| S02 detached_verification | Publisher manifest/signature/attestation and immutable digest/size bindings verified before payload download. |
| S03 bounded_download | Separately granted task, exact approved endpoint and complete size/digest match inside cumulative limits. |
| S04 quarantine_static_inspection | No code executed; safe archive membership, ELF identity and declared dependency/config discovery reviewed. |
| S05 inventory_seal | Complete binary/platform launch inventory and protected identity. PUBLISHER_BUNDLE also seals wire data; PINNED_GENERATOR is explicitly schema-pending. |
| S06 private_placement | One new inactive versioned root and exact destination inventory; no overwrite or ambient lookup. |
| S07 permissions_check | Minimal intended-principal access and replacement protection proven. Failure cannot trigger permission repair. |
| S08 no_model_probe | Separate schema-generation and/or compatibility contract only. Schema-only entry may lack wire data; compatibility requires the completed version-bound bundle and reviewed method mapping. Neither may call a model. |
| S09 independent_review | Exact source/binary/inventory/schema/probe seals, negative evidence and workload continuity accepted independently. Missing, stale or skipped proof blocks. |
| S10 separate_qualification_admission | Delivery acceptance only supplies evidence to D01/B01/B02. Complete CAS qualification and new explicit implementation/pilot/admission authority remain separate. |

No stage automatically authorizes the next. Partial/restarted acquisition does
not refill budgets or revive expired authority. A terminal receipt alone cannot
advance stage or change the four production gates. Independent review must
distinguish static, synthetic, compatibility and OS-enforcement evidence.

## CDL-R12 — Separate no-model probe contract

Any later probe binds binary/inventory/platform/identity-protection seals, exact
generator argv or protocol methods, duration/resource/output caps, isolated
synthetic roots, zero network/auth access, owned process containment and bounded
stop. Prove protections before initialization/discovery, not after observing a
handshake. Stop all owned descendants within the existing at-most-five-second
stop budget, included in the task budget, without touching foreign workloads.

Schema generation is a separate executable invocation from CAS App Server argv.
No thread/start, turn/start, tool call, account discovery or model dispatch belongs
to the schema-only allowlist. Compatibility has its own exact allowlist and
version-bound wire data; this contract does not approve those methods or run it.
Missing whole-process protection, unknown generator behavior or uncontrolled
scratch/config discovery blocks the probe. Retain evidence; do not retry with
weaker containment or run a model to discover whether the installation works.

## CDL-R13 — Space, failed delivery and owned cleanup

Retain one current verified artifact and **at most one previous verified artifact**.
Candidate downloads/quarantine/schema scratch require their own finite temporary
disk budget, including peak simultaneous copies and the host free-space reserve.
They do not grant an unbounded third retained version. Before acquiring another
candidate, a full retained slot must be safely retired under explicit authority,
or the operation must fit the approved staging plan; otherwise stop for space.

Never delete an active, referenced, leased or unresolved pin, or its sole evidence,
to satisfy the limit. If protected pins prevent reducing retained storage to the
allowed slots, block acquisition; no automatic eviction. Do not infer that an
old timestamp makes a pin unreferenced. Preserve original current/previous
selection on failed delivery; do not auto-switch runtime or replay work.

Failure cleanup may remove only newly created artifacts demonstrably owned by
this task, inside its exact cleanupScope, after all owned handles/processes have
stopped and evidence retention is satisfied. Check physical identities and
containment of every cleanup target; never follow links or delete existing roots.
Unknown ownership, partial effects or sole unresolved evidence means retain and
report BLOCKED for reconciliation. No global cache purge or Docker/WSL cleanup.

## CDL-R14 — Upgrade, rotation and rollback

Every version, binary/dependency/schema digest, placement or protection-policy
change is a new candidate/profile revision with new evidence and independent
review. No background updates, moving install symlink or automatic fallback.
Drain and reconcile active/ambiguous attempts before an explicitly authorized
current-pin rotation; existing fences remain until ownership and stop are proven.

Rollback selects only the retained verified previous pin after current authority,
compatibility and unchanged inventory are checked again. It is a separate
operator decision, not failure cleanup. Rollback never resumes old work, replays
consumed input, resets task budgets or admits a version whose evidence is stale.
Preserve checkpoints, user data and existing applications throughout.

## CDL-R15 — Privacy and workload continuity

Private source URLs, absolute installation paths, distro/principal identities,
owner/ACL details and complete receipts stay in bounded access-controlled
per-installation evidence outside repositories, build contexts and account
profiles. Public projections contain only opaque references, platform families,
approved relative artifact paths, exact public versions, sizes and digests.
No credentials, cookies, tokens, raw network/process output, user profiles or
full private receipt enter distributed files, task summaries or commit messages.

Normalize failures to fixed reasons and bounded counters before persistence;
redaction failure blocks, never falls back to raw logs. Retention follows the
approved no-raw-log rule and preserves unresolved work's only evidence. No real
CODEX_HOME/auth access or copying is part of delivery or its probes.

Read-only Docker before/after evidence must cover container identity/state/start/
restart and network/volume/image inventories. Unexpected changes block completion
of workload-continuity acceptance; they grant no repair authority. Never restart
Docker/WSL, terminate a distribution, clean sockets, prune/reset or touch unrelated
resources. No runtime/API/DB/migration/registry/production-config change belongs
to this specification or is implicit in later artifact delivery.

## CDL-R16 — Acceptance, unresolved source and next task

The [delivery acceptance matrix](direct-codex-artifact-delivery-acceptance-v1.md)
contains positive and mandatory negative cases for every stable CDL requirement.
Each maps to D01/B01/B02 and existing CAS-R/T IDs. Static validation checks the
documentary structure and denials only; it cannot certify publisher provenance,
actual acquisition, filesystem protection, schema generation or compatibility.
D01–D06 remain BLOCKED, D07 remains DECIDED for document/schema design only,
and all B01–B09 remain open. This contract adds acceptance rules, not pin values.

RF009 static verification: 16 requirement/test pairs, 10 ordered stages and
12 unresolved selection fields pass completeness checks; 25 negative document
mutations reject missing boundaries, private paths, invented selections and
readiness promotion. Existing qualification, CAS and RF008 observation validators
pass. Docker read-only before/after comparisons agree for container identities,
states, start/restart counters and resource inventories: 4 containers, 5 networks,
107 volumes and 16 image rows. These counts disclose no installation identity.
No network, acquisition, permission change, WSL lifecycle action, executable
probe or runtime qualification was performed. All four production gates remain false.

RF008 does not select an official source. Missing: authenticated publisher
channel/ownership, exact version/build and immutable release/asset identity,
published sizes/digests and independently trusted verification material,
available wire-bundle route, native dependency closure, protected placement
mechanism and a fully bounded acquisition authority. No source URL, release,
digest or numeric acquisition default is invented to fill these gaps.

Exactly one recommended next atomic task: **RF-HERMES-010 — bounded official
source-selection and provenance research for one Linux x86_64 Codex candidate.**
Under a separate research task, inspect official documentation/release metadata
to establish one exact channel/version/build, required publisher manifest/trust
evidence and the feasible schema route. Report one supported selection with
evidence or precise BLOCKED reasons. Research may propose explicit acquisition
endpoints and limits but cannot download payloads, install, copy, change
permissions or run code. Any metadata network access needs that task's explicit
scope; none is granted or performed by RF009. RF010 is not started here.
