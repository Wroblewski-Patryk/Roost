# Standard Codex provenance policy v1

RF-HERMES-013, 2026-09-13. **STANDARD-PROVENANCE-POLICY-BLOCKED**.
One standard implementation family is recommended for further qualification:
**sigstore-js client `sigstore@5.0.0`**. No verifier was installed, imported or
executed. The RF012 partial checker remains observational and was not extended.

The [candidate policy](direct-codex-standard-provenance-policy-v1.json) contains
exact observed tool pins, candidate semantics, trust/cache boundaries, a future
receipt field dictionary and blockers. The separate reviewer's
[decision record](direct-codex-standard-provenance-review-v1.json) owns the
verdict. Policy selection is not artifact, acquisition or runtime qualification.

## Bounded research and independence

Fresh official metadata/docs capture used **12 requests and 116,644 body bytes**
within 1 MiB total, 128 KiB/response, 20 seconds/request and zero retries.
There were 11 HTTP 200 responses and one HTTP 404, zero redirects and zero
transport/limit failures. The maximum response was 66,824 bytes; recorded
request durations stayed below 20 seconds. The
[ledger](codex-standard-policy-metadata-ledger-v1.json) is closed.

The failed request used a guessed package README directory. The official
repository index subsequently identified `packages/client`; the distinct
correct path was counted separately. The 404 is not evidence of absent support.
Only metadata and Markdown documents were fetched, never package/source archives,
binaries or candidate payloads. [Retained source projections](codex-standard-policy-sources-v1.json)
bind selected fields/paragraphs to request hashes and line locations. They are
not complete response archives. Network instructions and example commands were
treated as data.

A new read-only agent, `codex-separate-agent.rf013_standard_policy_review`,
received no inherited conversation, freshly read canonical requirements/evidence,
and independently assessed the policy. It did not author RF012 or this policy,
make network requests, edit files or execute a verifier. This establishes
attributable author separation within the shared environment, not external
organizational/human attestation, a cryptographic reviewer signature or B09/CAS
runtime acceptance. Its verdict is preserved by the main executor.

## Compared maintained options

All observed stable packages require Node
`^22.22.2 || ^24.15.0 || >=26.0.0`. The previously observed Windows Node22.13.0
does not meet that range. No WSL Node/runtime or Linux package execution was
checked. Null OS/CPU fields in metadata are not proof of supported deployment.
A separately authenticated, exactly pinned compatible runtime remains required.

| Option | Observed exact release | Capability / why selected or not |
| --- | --- | --- |
| Native npm | `npm@12.0.2`, source `332350fd21e8bd040ce68a8f618c16ccfd23dba7` | `npm audit signatures` verifies registry signatures and provenance for downloaded packages. JSON with `--include-attestations` exposes a verified bundle array. A safe detached-only tree/configuration path and signature-specific failure semantics were not established. Not selected. |
| npm pacote | `pacote@22.0.0`, source `e4e44c5428c840d853b5ef8641e169b5b79328ab` | Manifest API documents signatures/attestations verification **if present**, registry-scoped keys and TUF cache. Presence must be independently mandatory. Tarball streams may retry and broad fetching/extraction methods are unsuitable as implicit acquisition authority. Not selected. |
| Sigstore JS client | `sigstore@5.0.0`, source `7d2900eca1c22b3f87c13987c8d4b7c9a29b733a` | Official Sigstore project client explicitly supports npm use and detached DSSE verification. Public identity/OID/key-selector options fit the required policy surface. Selected as the sole candidate, still BLOCKED. |
| Components of selected family | `@sigstore/verify@4.1.2`, `@sigstore/tuf@5.0.0` | Maintained verification and TUF components, not additional competing choices. Exact observed SRI/source pins are recorded, but the entire transitive toolchain is not locked/authenticated. |

Primary documentation:
[npm audit signatures](https://raw.githubusercontent.com/npm/cli/332350fd21e8bd040ce68a8f618c16ccfd23dba7/docs/lib/content/commands/npm-audit.md),
[pacote manifest options](https://raw.githubusercontent.com/npm/pacote/e4e44c5428c840d853b5ef8641e169b5b79328ab/README.md),
[Sigstore client verification API](https://raw.githubusercontent.com/sigstore/sigstore-js/7d2900eca1c22b3f87c13987c8d4b7c9a29b733a/packages/client/README.md),
read 2026-09-13.

The registry's `latest` endpoints were discovery only. The policy pins their
resolved exact versions, package SRI and source commit, not the moving route.
Tool package signatures were not verified here; SRI in metadata alone does not
authenticate a tool installation. Source metadata for `@sigstore/verify@4.1.2`
names a different commit from the client-version README snapshot, so exact
dependency behavior cannot be claimed from that snapshot.

## Standard verification policy, not a replacement cryptosystem

The documented client entrypoint is
`verify(bundle[, payload][, options])`, returning signer key/identity
information. Detached attestations do not require external artifact bytes.
No `sign`/`attest` operation, signing endpoint, environment identity discovery,
npm install, audit fix, lifecycle hook, global PATH or package-manager resolution
is allowed by this research or the proposed verification-only flow.

Use the maintained implementation for signature/DSSE, certificate chain/SCT,
authenticated signing time, log inclusion/checkpoint/shard handling and TUF
validation. Required guarantees must be established for the exact selected
configuration. Do not fill an undocumented gap with the RF012 checker, copied
crypto code, an ad hoc root, weakened thresholds or unsigned fallback.

After successful standard cryptographic verification, exact semantic comparisons
must require:

- One subject with the RF011 package identity and SHA-512; exactly one required
  npm publish statement and one SLSA statement, both binding the same subject.
  Exact statement types and predicate/build types are fixed in the policy.
- The immutable source commit `6b9826e3aa83b1a5947db50f4332cb9c65f1b340`,
  tag object `36eab01061df3cde5f95ec20a526777b430091ba`, expected repository,
  `rust-v0.154.0` ref, release workflow, builder and resolved dependency URI.
  Numeric public repository/owner IDs and the expected build invocation are
  equality pins; no end-user account is inferred from the npm publish predicate.
- GitHub Actions issuer and exact workflow URI SAN, code-signing EKU and required
  source repository/ref/commit certificate extensions. The documented URI option
  is a regex: escape metacharacters and anchor both ends. Omit/forbid the email
  identity option because it takes precedence over URI matching.
- Certificate-transparency and artifact-transparency thresholds of one, with no
  downgrade. Delegate the actual checks to the standard implementation. Reject
  duplicate JSON, malformed values, unknown security-critical fields and ambiguous
  extra subjects/statements; do not coerce or silently ignore ambiguity.

The publish bundle's untrusted key hint can select only an exact externally
accepted npm key from a prevalidated map. The callback performs key selection,
not signature mathematics or trust establishment. The standard registry key
convention is documented, but the exact accepted provider/rotation integration
has not been qualified. It remains a blocker.

Any exception, rejected result, unsupported format, missing required evidence,
semantic mismatch, timeout or uncertain failure is a denial. Exact
version-specific failure/output mapping is not yet proven. Generic `npm audit`
vulnerability exit codes cannot be substituted for provenance failure semantics.

## Standard TUF distribution, snapshots and network boundaries

The maintained [@sigstore/tuf documentation](https://raw.githubusercontent.com/sigstore/sigstore-js/7d2900eca1c22b3f87c13987c8d4b7c9a29b733a/packages/tuf/README.md)
describes an embedded initial root, automatic cache initialization and standard
metadata/target downloads. `getTrustedRoot` obtains the `trusted_root.json`
target. The default mirror is `https://tuf-repo-cdn.sigstore.dev`.
This is the intended standard route; manually fetching an unversioned target and
trusting its contents is not an equivalent bootstrap.

| State or operation | Required treatment |
| --- | --- |
| Maintainer-supplied bootstrap | Authenticate the pinned toolchain and its embedded initial root; record exact bytes/hash. Nothing was installed or authenticated here. |
| Per-qualification pin | Record tool/runtime/dependency inventory, initial root, validated root versions and hashes, timestamp/snapshot/targets versions/expiry and trusted target digest. A cached filename alone is not a pin. |
| Online refresh | Separate finite authority; let the maintained TUF implementation validate updates. Enumerate the actual versioned metadata/target requests, redirects, bytes and retries under the task budget. That complete network configuration remains unqualified. |
| Offline verification | Previously validated, unexpired pinned cache plus an external no-network boundary. Missing/expired data fails closed; no implicit refresh or ambient user cache. |
| Online transparency | Only if the selected standard verification path requires it and exact endpoints are approved. Never follow arbitrary bundle URLs or invent a custom log/shard repair. |
| Freshness/replay/consistency | Use established standard expiry/rollback/authenticated-time handling plus exact candidate and fresh grant. Unsupported required consistency/witness policy stays BLOCKED, not self-implemented. |

`forceCache` suppresses downloads only while cached metadata is unexpired;
it is not an unconditional offline switch. `forceInit` and ambient application
cache fallback are not admitted. The receipt must distinguish trust in the
standard distributed bootstrap from a qualification snapshot and from any
subsequent online lookup.

## Candidate inputs and non-operative quarantine proposal

RF012 retained selected verification material rather than a complete standard
bundle. Required media-type/timestamp fields cannot be invented. The captured
client paragraph refers to bundle/Rekor compatibility, but its actual table
values were not retained. Exact candidate input compatibility must therefore be
checked later against complete bounded metadata and the pinned standard tool.

The candidate platform manifest projection contains null bin/files/scripts/
dependencies/optionalDependencies and linux/x64 OS/CPU. RF012 normalized absent
and explicit-null values identically, so raw field presence cannot be recovered
from that projection. Root manifest's Node entrypoint and platform alias are
recorded. None proves absence of embedded hooks/helpers or native discovery.

The proposed future streaming ceiling is **536,870,912 bytes (512 MiB)**.
This is an administrative maximum for an explicitly authorized staging task,
not the actual compressed size, a compression estimate or the unpackedSize.
HEAD in RF012 supplied no Content-Length. Any later grant must prove capacity,
time and free-space reserve and may reduce this cap; overflow denies before
the cap is exceeded, with no retry or budget refill.

For the selected detached route, standard provenance must pass **before download**.
After a separately granted bounded inert download, the complete package digest
must pass **before any parser/decompressor**, followed by bounded static native
size/hash/inventory inspection before filesystem materialization or placement.
Reject traversal, collisions, links, special files, permission surprises and
decompression/member/depth overflow. Preserve verified identity across inspection.
Only task-owned failure cleanup is eligible; unresolved sole evidence is retained.
No schema generator/App Server execution follows automatically.

This split is non-operative. Existing CDL-R03/T03 published-size/native-member
requirements and coupled R08/R09/R11 clauses remain unchanged pending explicit
independent revision. Neither tool selection nor this streaming ceiling grants
acquisition, installation, placement or execute authority.

## Receipt, mappings and next task

The policy defines `roost-codex-standard-trust-policy-receipt-v1` with required
field names for policy/task/reviewer seals, exact toolchain/runtime, bootstrap and
validated metadata versions/hashes/expiry, key policy, package/bundle identity,
standard verification and semantic results, authenticated time/checkpoints,
cache/network evidence and decision reasons. Unknown fields or unresolved required
values deny admission. This is a field dictionary; full field typing and an
executable closed schema remain unqualified.

Complete private receipts and cache/root paths belong in bounded installation
evidence, never public logs or repository configuration. Public projections carry
only references, public pins, digests, fixed outcomes and counts.

Mappings remain CDL-R/T03,08,09,11 → D01/B01/B02 and existing CAS-R03,07,13,23,27–29.
Profile revision3, 75 values, 53 technical nulls, seven research values and nine
blockers remain unchanged. All policy/acquisition/probe/activation gates remain
false. No runtime/API/DB/registry, production, authentication or Docker/WSL
lifecycle change occurred.

Verification passed: five standard-policy test methods with negative mutations,
ten fake-transport capture tests, the new static policy/review validator, delivery
(16 families), CAS (30 families), qualification, RF011 source and RF008 preflight
validators. RF012's reviewer seal, ledger and file bindings were checked statically;
its mathematical checker was not executed. No standard-verifier or runtime tests
ran because the toolchain is neither installed nor authorized for execution.

The main executor's native Docker read-only before/after snapshots agree:
4 containers, 5 networks, 107 volumes and 16 image rows, with unchanged selected
container identity/state/start/restart and inventory digest
`328c45deb5fb79f841aafbfb974beb261c37b5708140102d1c63e43c02a03bf0`.
This is executor continuity evidence, not a Docker action by the reviewer.
Entry revision was `f9eedc8b3e5284489dafb9de7f6726c6b9c4fcf6`; later integration
links do not alter the independently reviewed entry snapshots.

Exactly one recommended next atomic task: **RF-HERMES-014 — qualify the closed
standard verifier toolchain and configuration under separate bounded authority.**
Establish authenticated exact runtime/dependency/bootstrap pins, complete standard
bundle inputs, accepted npm key provider, standard failure/network/cache/time/
freshness behavior and a typed receipt, or retain precise BLOCKED conditions.
Any tool acquisition/installation requires that task's explicit authority; no
candidate package payload, custom cryptography, generator or App Server is
implicit. RF014 was not started here.
