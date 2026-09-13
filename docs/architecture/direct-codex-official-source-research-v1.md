# Official Codex source research v1

RF-HERMES-010 record, revision **2**, completed by **RF-HERMES-011** on 2026-09-13.
Verdict: **OFFICIAL-CODEX-SOURCE-BLOCKED**; researchComplete=true.
The research now identifies one exact candidate and retained provenance metadata.
Acquisition remains blocked by missing native-member identity/published compressed
size and unverified detached trust, wire and placement evidence. This is not a
claim that OpenAI lacks signatures or a supported App Server.

The [normalized findings](direct-codex-official-source-research-v1.json) and
[per-request ledger](codex-source-metadata-ledger-v1.json) supersede RF010's
incomplete capture disposition. RF010's lost counts remain unknown; they were
not recovered, estimated or included in this newly authorized budget.
The [delivery contract](direct-codex-artifact-delivery-v1.md) and
[acceptance matrix](direct-codex-artifact-delivery-acceptance-v1.md) retain all gates.

## Capture and network accounting

Before network use, eight offline synthetic tests exercised receipt persistence
before projection, manual redirects and their bodies, payload/foreign-host denial,
per-response and aggregate caps, HEAD, exact-cap reads and transport failure.
The [capture helper](../../scripts/codex_metadata_capture.py) reserves each request
in a small ledger before transport, saves status before reading, and saves actual
bytes/digest after every delivered read before parsing. In-flight reads remain
visible if interrupted. No automatic redirect, retry, cookie jar or proxy lookup
is used. A watchdog closes owned network sockets at the request deadline.
Bodies stay in bounded memory; only ledger fields and selected facts are retained.
Final offline validation passes nine capture tests, including a later test that
a closed ledger prevents any further transport, and four research test methods
with negative fixtures. Delivery (16 families), CAS (30 families), qualification
(75 values/53 nulls) and prior artifact-preflight validators also pass. These
checks validate accounting and document consistency, not publisher signatures.

The fresh limit was 12 requests, 1,048,576 body bytes total, 131,072 per response,
20 seconds per request and zero retry after transport/limit failure.
Actual result: **11 requests, 190,283 body bytes, 1 redirect response, 2 HTTP 404
responses, 0 transport errors, 0 over-limit responses and 0 retries**. The largest
body was 99,470 bytes. All reads are accounted for; no in-flight read remains.
The ledger is closed with one unused request. Response-body accounting does not
purport to count TLS/HTTP framing bytes.

The redirect was a HEAD discovery response: its zero body bytes and status were
recorded, and it was not automatically followed. Two different documentation
path lookups returned 404 and each contributed 14 bytes: the first used an
unresolved short revision, the second the actual tag commit. Neither supports
any content claim or proves App Server/schema absence. They are retained as
failed lookups, not hidden, treated as success or used as exact-build evidence.

## Official channel and exact candidate

The official repository README names npm installation of `@openai/codex`,
documents GitHub release binaries for Linux x86_64, and describes a publisher
download service. The selected research channel is the **official npm platform
package**, reached through that documented package; the installer and its
automatic fallback behavior were not used. [Official README](https://raw.githubusercontent.com/openai/codex/main/README.md),
read 2026-09-13 (ledger request 1, hash-bound snapshot).

HEAD release discovery resolved `rust-v0.154.0`. The tag API resolves it to
annotated tag object `36eab01061df3cde5f95ec20a526777b430091ba`, which resolves to
commit `6b9826e3aa83b1a5947db50f4332cb9c65f1b340`. GitHub reports that tag unsigned.
The fixed object/commit and package digest define the candidate; a moving tag or
latest route alone never does. A numeric GitHub release ID was not retrieved and
is not the selected registry release identity. [Tag reference](https://api.github.com/repos/openai/codex/git/ref/tags/rust-v0.154.0),
[exact tag object](https://api.github.com/repos/openai/codex/git/tags/36eab01061df3cde5f95ec20a526777b430091ba),
read 2026-09-13, requests 4 and 6.

| Candidate field | Retained publisher/registry metadata |
| --- | --- |
| Package identity | `@openai/codex@0.154.0-linux-x64`; Codex release 0.154.0. |
| Exact package asset | `codex-0.154.0-linux-x64.tgz`; proposed only, never fetched. |
| Declared platform | os=linux, cpu=x64. No independent ELF inspection of this package occurred. |
| Registry unpacked size / file count | 339,130,586 bytes / 8 files reported; member types uninspected. |
| Compressed asset size | Not established by retained metadata; not inferred from unpacked size. |
| Package integrity | SHA-512 `6b8148dc0f2c1adc06aceaa5b6b3dbad2da16a3ac7406e7dd44c2645f891a0b31bd74571741b54196e20bba20955810d898180ee4dcfe239511c4a02654fecf5`. |
| Legacy registry shasum | SHA-1 `9e93bbf0906338c2d1ebbeb9de3b0a4ef7123e55`; recorded diagnostically, not an accepted security digest. |
| Native executable member size / SHA-256 | Not established. Archive integrity does not supply these values. |
| Local artifact/inventory qualification | None; no payload was read or installed. |

The root `0.154.0` package explicitly maps its Linux x64 optional dependency to
`npm:@openai/codex@0.154.0-linux-x64`. Thus the platform variant is source-derived,
not a guessed asset name. [Root version manifest](https://registry.npmjs.org/@openai/codex/0.154.0),
[exact platform version manifest](https://registry.npmjs.org/@openai/codex/0.154.0-linux-x64),
read 2026-09-13, requests 5 and 7.

## Trust evidence and its limits

The registry metadata advertises two signatures with the same key ID and an
attestation endpoint. The bounded attestation response contains one publish
statement and one SLSA provenance statement. Both subjects match the platform
package's SHA-512 integrity exactly. The provenance declares the same commit
and tag as the GitHub metadata and the release workflow path
`.github/workflows/rust-release.yml`. These are parsed, internally consistent
claims; cryptographic authentication of them remains unperformed.
[Package attestations](https://registry.npmjs.org/-/npm/v1/attestations/@openai%2fcodex@0.154.0-linux-x64),
read 2026-09-13, request 10, 14,643 bytes.

| Evidence class | Present / missing / unverified |
| --- | --- |
| Publisher/registry assertions | Exact package version, declared OS/CPU, unpacked size and package integrity are present. No payload verification was performed. |
| Registry signatures | Two advertised signatures, one key ID; not verified against an independently accepted key policy. |
| Publish attestation | One signature with public-key, transparency and timestamp verification material is present; not independently verified. |
| SLSA build provenance | One signature with certificate, transparency and timestamp material is present; source commit and subject digest match the other metadata. Signer identity/chain, log/checkpoint and trust anchors remain unverified. |
| Source tag | Exact Git object linkage established; GitHub verification says unsigned. It is not publisher signature proof. |
| GitHub asset SHA-256/checksum | Not investigated for a GitHub payload; this is the npm candidate. No GitHub digest is substituted for npm/native-member verification. |
| Native member manifest / SBOM | Not established in this bounded research. Not claimed globally absent. The published file count is not a member inventory or SBOM. |

The tag-version release workflow contains Linux signature-bundle packaging
steps, but workflow text alone is not evidence of a completed signed build or
the identity of a particular binary. [Versioned release workflow](https://raw.githubusercontent.com/openai/codex/rust-v0.154.0/.github/workflows/rust-release.yml),
read 2026-09-13, request 3. No signature bundle was downloaded as a release asset.

HTTPS transports, tag names, registry integrity and matching provenance fields
cannot replace detached cryptographic verification. Embedded certificates/keys
cannot establish their own independent trust. Only minimal statement hashes,
subject digest and selected provenance fields were retained, not full bundles,
certificates, signatures or nested response bodies.

## App Server and schema route

Official OpenAI documentation describes `codex app-server` with default stdio
and documents `generate-json-schema` and `generate-ts` with an explicit output
directory. Those commands were only read as documentation. The selected route
is therefore **PINNED_GENERATOR_CANDIDATE**, not a qualified generator invocation.
[Official App Server documentation](https://learn.chatgpt.com/docs/app-server.md),
read 2026-09-13, request 11.

No publisher wire bundle bound to this exact package/native executable was
established. General documentation is not version-specific binary evidence;
the unsuccessful repository documentation lookups add no such evidence.
After verified binary/inventory/placement and explicit bounded authority, a
schema-only no-model probe may determine the exact build's supported generator
and seal its output under CDL-R04/12. No schema, binding, thread, turn or model
was generated or started here.

The root npm manifest declares a Node entrypoint and optional platform resolution.
The platform manifest does not declare bin, scripts, dependencies or optional
dependencies in the captured fields. This does not prove that payload contents
have no discovery behavior. Future delivery must treat an approved archive as
inert data; no npm install, lifecycle hooks, global linking, Node wrapper, ambient
PATH resolution or mutable dependency installation is admitted.

## Comparison and bounded acquisition proposal

RF008's Desktop ELF is Linux x86_64, 262,804,768 bytes, SHA-256
`6970ad6a5b7615d2f5838879e19c1369e5527cb1544f1515f76900267740a403`, with unknown
exact Codex version. The new metadata describes an eight-file package and an
archive SHA-512, not its native member. The sizes/digests are different kinds of
objects and do not establish equality or inequality of the executables.
No Desktop path was read, copied or changed in RF011.

For a later separately authorized acquisition, the smallest proposed payload
host allowlist is `registry.npmjs.org`, with exactly
`/@openai/codex/-/codex-0.154.0-linux-x64.tgz`. Manifest and attestation endpoints
are the exact metadata URLs cited above. No redirect destination, mirror or
GitHub fallback is implicitly allowed. This is an endpoint proposal, not an
authorized request; the capture helper rejects that payload route.

Provisional resource ceilings derived from published/observed sizes are:
maxDownloadBytes=339130586, maxUnpackedBytes=339130586, maxRegularFiles=8,
maxMetadataBytes=65536, maxRetries=0. The download ceiling conservatively uses
the declared unpacked size as a resource limit; it is **not a claim about exact
compressed size**. A task must still establish that exact size under CDL-R03.
The 65,536-byte metadata proposal accommodates the observed 14,643-byte
attestations and 3,372-byte platform manifest with bounded verification metadata;
anything larger must block under its later contract, not grow the cap.

Peak candidate storage is provisionally 678,326,708 bytes: one download ceiling
plus one unpacked ceiling plus metadata, assuming same-filesystem atomic
placement and no extra copy. Existing retained pins and the host reserve are
additional. maxDurationSeconds, archive depth/complete membership, private root,
free-space reserve and schema-output needs are not measured or approved here.
These incomplete constraints **do not form a runnable acquisition contract**.

## Qualification impact and next task

All 16 CDL-R/T families and their existing CAS-R/T mappings remain normative.
RF011 supplies source-level observations for CDL-R02/03/04 and acquisition sizing
input for CDL-R08/09/13. It supplies no C/O enforcement or independent acceptance.
D01/B01 remain blocked by native member identity, exact compressed size,
unverified detached trust and missing closed protected placement/inventory.
B02 remains blocked by the absent established exact-build wire bundle/generator
proof. D02–D06 and B03–B09 are unchanged; D07 remains documentary DECIDED.
Profile revision 3, 75 values and 53 technical nulls remain untouched.

implementationReady=false, executionSupported=false, pilotReady=false,
liveAdmissionAllowed=false and acquisitionReady=false. No runtime/API/DB/registry,
production configuration, installed component, permission or WSL lifecycle change
occurred. Docker read-only continuity is recorded in the normalized findings.

Exactly one recommended next atomic task: **RF-HERMES-012 — independent security
review of the exact npm candidate's detached provenance and publisher-manifest
gaps before acquisition.** Decide the acceptable independently anchored
verification procedure and identify a compliant way to establish the missing
compressed size/native member size and digest under CDL-R03. If those conditions
cannot be met, retain BLOCKED rather than waive them implicitly. The review may
define a separately bounded metadata-verification scope; it grants no payload
download, installation, schema execution or weaker trust policy by itself.
RF012 was not started here.
