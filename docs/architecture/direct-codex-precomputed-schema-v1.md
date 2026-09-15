# Precomputed App Server schema qualification v1

RF-CODEX-019, 2026-09-15. Decision candidate version **1**.
Verdict: **PRECOMPUTED-APP-SERVER-SCHEMA-BLOCKED**.

Follow-up [RF020 Windows build binding](direct-codex-windows-build-binding-v1.md)
completed the final publisher-metadata round and closed that route for the current
Appx as BLOCKED. The release PE differs from the local candidate. RF021's proposed
minimal outer-isolation admission for an exact-PE probe is the practical next step;
the RF020 recommendation below is this report's historical handoff.

Official precomputed bundles and a complete source JSON tree exist at the
inspected immutable commit. Their relationship to the exact installed native PE
is unproved. A closed Git-object inventory is available, but it is not a
publisher-signed binary/schema manifest or verified per-file SHA-256 manifest.
No schema payload was acquired, decompressed, extracted or executed.

[ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md) retains native Windows.
[RF015 artifact preflight](direct-codex-native-artifact-preflight-v1.md),
[RF016 contract](direct-codex-native-schema-probe-v1.md) /
[acceptance](direct-codex-native-schema-probe-acceptance-v1.md),
[RF017 isolation](direct-codex-windows-standard-isolation-v1.md),
[RF018 outer-launch](direct-codex-native-outer-launch-v1.md),
[CAS](direct-codex-app-server-contract-v1.md) and
[qualification](direct-codex-qualification-decisions-v1.md) retain all gates.
[CDL](direct-codex-artifact-delivery-v1.md) contributes artifact evidence rules;
its historical Linux acquisition choices are not Windows prerequisites.

## PCS-01 — Sources, prior evidence and closed budget

F = inspected official source; O = bounded local observation;
R = required future validation; U = unknown. The source candidate is immutable
commit `6b9826e3aa83b1a5947db50f4332cb9c65f1b340`, previously associated with
rust-v0.154.0 by RF011. It is not identified as this Desktop PE's source.

RF018 already captured protocol lib.rs, precomputed_exports.rs and official
App Server documentation. Their hashes remain in its
[ledger](codex-native-outer-launch-source-ledger-v1.json); no repeat fetch was
needed. RF017's setup source and RF015–018 package facts were also reused with
their stated limits.

| ID | Exact official source | HTTP / delivered body bytes / SHA-256 |
| --- | --- | --- |
| S01 | [Precomputed directory](https://api.github.com/repos/openai/codex/contents/codex-rs/app-server-protocol/schema/precomputed?ref=6b9826e3aa83b1a5947db50f4332cb9c65f1b340) | 200 / 2,721 / `da9c6ddce9c56e94f7f8a85ff1966a808efda9b337b28931d742e156d5d21df5` |
| S02 | [Schema directory](https://api.github.com/repos/openai/codex/contents/codex-rs/app-server-protocol/schema?ref=6b9826e3aa83b1a5947db50f4332cb9c65f1b340) | 200 / 2,854 / `695e370f00d059e0f42cb442c61fcc8dbd641274dd81e97c1e34da7e2292c390` |
| S03 | [JSON root tree](https://api.github.com/repos/openai/codex/git/trees/2bf7fdb554d0636e30cf9edbcb809bf86411ea92) | 200 / 9,241 / `6814d543f64f7a1c4c23721bdeb87cb044926f285f8fcbd657fea09ff9e22464` |
| S04 | [JSON v2 tree](https://api.github.com/repos/openai/codex/git/trees/93468666086f32bf41fcf113c1b4f9b95933a753) | 200 / 62,448 / `c36eadcbe9e7a34dc34ce74912a09e94c46c156eef38628ce7e7465f285806e5` |
| S05 | [JSON v1 tree](https://api.github.com/repos/openai/codex/git/trees/6fb6f46cad3cf6ca7a5e33203fd8f758961970a3) | 200 / 630 / `3447162efb36ad6ae44e699ea03350933ada9b2b475fbe431a5f7effcc3227f1` |
| S06 | [Fixture/bundle writer](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/app-server-protocol/src/schema_fixtures.rs) | 200 / 16,219 / `f3b449aac70fbb77158b74f09cf79924046b400c9d4299e909748b01a1e739bd` |
| S07 | [Release metadata (incomplete; not parsed)](https://api.github.com/repos/openai/codex/releases/tags/rust-v0.154.0) | 200 / 163,840 / `fb023bff9aabc7f81665720d1d0bc7a903a3376908404f085a3d20fae1b9c687` |

[RF019 ledger](codex-precomputed-schema-source-ledger-v1.json): closed and halted
at 7 requests / 257,953 delivered body bytes. Six complete 200 responses;
the seventh 200 reached 163,840 bytes without established end-of-body and was
rejected. Its digest above covers **only the delivered prefix**, not a complete
release document. That response was not parsed or used for release/asset claims.
No retry, redirect, alternate route or further request followed; three permitted
request slots remain unused.

Original ceilings: 10 requests, 1,048,576 total body bytes, 163,840 per response,
20 seconds per request, zero retries, manual redirects only. Every delivered
byte, including the rejected prefix, is counted. No release asset, binary,
compressed schema, npm tarball or source archive was downloaded. No partial
release body or downloaded source code was persisted; the ledger records
accounting and this report records source-derived findings.

## PCS-02 — Published data and source generation map

F: the precomputed directory at that exact commit lists two regular files:

| Relative name under schema/precomputed | Compressed bytes | Git blob SHA-1 |
| --- | --- | --- |
| app-server-exports-stable.json.zst | 148,316 | `08ebc8e755bfa404bf0f4b66f3db86754fef2ba8` |
| app-server-exports-experimental.json.zst | 153,924 | `edd06876014fe2a70979d5f057c4a9402a383646` |

The precomputed Git tree is `82133224e5381982e4b853ae6580d6ab7de56438`.
Metadata sizes below the response ceiling do not authorize downloading archives:
this task permits small textual source/manifest/tree metadata. Neither compressed
file was fetched. Compressed SHA-256, decoded size, member count and map digests
remain U.

The existing RF018 source maps the normal library exports to
precomputed_exports.rs. That file embeds the two zstd files via include_bytes,
selects stable/experimental data, decodes a JSON object containing typescript,
json_schema and internal_json_schema maps, and writes selected map entries.
The normal JSON export selects stable; TS can additionally invoke a supplied
formatter. These are library paths, not installed-build CLI qualification.

F, S06: write_schema_fixtures regenerates the source JSON/TS trees and stable
embedded data. The configurable experimental path generates temporary JSON/TS
trees and an empty internal-schema map. write_precomputed_exports serializes
the maps and compresses with zstd level 19. Collection normalizes CRLF.
The source functions may delete output trees and run generation; none ran here.

This is evidence of the intended source pipeline. It is not independent proof
that current compressed bytes equal current tree contents or the installed PE.
The fixture comparison code also normalizes JSON/TS representation, so semantic
fixture comparison must not be substituted for byte-for-byte digest acceptance.

## PCS-03 — Complete source JSON inventory, limited meaning

The schema directory publishes json, precomputed and typescript subtrees.
The source JSON root and both child trees were fetched as metadata with
truncated=false and no remaining nested tree:

| Tree | Git tree SHA-1 | Regular files |
| --- | --- | --- |
| json root | `2bf7fdb554d0636e30cf9edbcb809bf86411ea92` | 37 |
| json/v1 | `6fb6f46cad3cf6ca7a5e33203fd8f758961970a3` | 2 |
| json/v2 | `93468666086f32bf41fcf113c1b4f9b95933a753` | 266 |

The derived [source inventory](codex-precomputed-schema-source-inventory-v1.json)
lists all **305 relative paths, sizes and publisher-reported Git blob SHA-1 IDs**:
3,492,670 declared file bytes; largest file 688,845 bytes. Its canonical metadata
SHA-256 is `e7d7e4e4c2ccde48eef460cbccf6b4c9f94a3ad166c503a8dbb3233978d31161`.
Canonical means sorted object keys, preserved array order, compact UTF-8 JSON.
This seal protects the recorded inventory, not unread schema contents.

No JSON schema body was fetched. File-level content SHA-256 values are unknown.
A Git blob ID hashes Git-framed content, not the raw-file SHA-256 required by
the future accepted manifest. Do not relabel these IDs, present this derived
inventory as a publisher attestation, or infer a native executable digest from it.

Four individual JSON files exceed the current read ceiling: ClientRequest
(199,152), ServerNotification (201,413), the aggregate schemas file (688,845)
and its v2 aggregate (589,065). None was requested. A later version-bound
aggregate may reduce acquisition/file-count complexity, but its self-contained
references and complete request/notification coverage are not yet validated.

The entire 305-file tree exceeds NSP-R08's proposed 256-file output limit.
No limit is raised here. Source delivery would need an explicitly reviewed
artifact envelope; alternatively qualify a complete aggregate representation
rather than silently omit files. The inventory is under the 65,536-byte metadata
ceiling and contains no runtime payload or executable code.

## PCS-04 — Exact native PE and package metadata

O: fresh read-only registration/hash checks still identify OpenAI.Codex
26.908.4834.0, status Ok, relative app/resources/codex.exe, 297,858,352 bytes,
SHA-256 `081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575`.

AppxManifest.xml is 6,246 bytes, SHA-256
`aca43873f91174a1dda5b58e2cbb816f41b3e0d01a0aabe6c249fafed8f0a226`;
AppxBlockMap.xml is 3,238,925 bytes, SHA-256
`f7ece161c63f5bf6d300481f2e3fde111bbe2a86070b3712489fe38a07405065`.
Both match the earlier records; manifest identity is the package version,
not a Codex source tag. Metadata reads were capped at 16 KiB / 4 MiB.

A filename-only search within the blockmap's app/resources subtree for
Codex/build/version/manifest/schema/export JSON/XML/text/zstd metadata returned
six auxiliary-tool metadata names, none naming a standalone Codex build or
schema manifest. Those auxiliary files were not opened. This bounded selector
does not prove that every package or embedded location lacks provenance.

The unchanged PE hash allows reuse of RF018's bounded headers/debug/string
inspection: no .rsrc section entry, null FileVersion/ProductVersion, a CodeView
PDB identifier and ambiguous version-like strings. These do not establish a
source commit. No additional heuristic byte scan or extraction was performed.

RF015's Windows signature/catalog evidence binds observed package members under
its dated policy; it does not assert which source commit or embedded schema maps
produced the member. Registration/version, a blockmap and matching file hashes
cannot fill that semantic provenance gap.

`sourceBuildBinding=null`; `installedCodexVersion=null`;
`publisherBinarySchemaManifest=null`; `acceptedSchemaSha256=null`.

## PCS-05 — Embedded extraction and release/npm evidence

R: embedded data may be acquired only through an official named resource,
publisher offset/length manifest or other supported format route that identifies
the exact schema and its boundaries. include_bytes is a source embedding
operation, not an official PE resource directory or extraction contract.
A standard PE parser can describe sections; it cannot, by itself, identify the
meaning and selection of an arbitrary Rust byte array in .rdata.

No official named-resource/offset/length mapping was established in the inspected
source/package metadata. Finding zstd magic, guessing offsets, searching for a
downloaded byte sequence, disassembling addresses or reconstructing compiler
layout would not supply the requested supported route. No custom extractor,
heuristic scanner, decompressor, format or cryptography was implemented.
The embedded route stays BLOCKED, not declared technically impossible.

The release API response was incomplete under this task's cap. Release ID,
asset list/digests, Windows member/source mapping and any published schema
manifest from that route remain unqualified. Do not claim the release lacks
schemas or a manifest from an unread response. The historical RF011 npm evidence
concerns a Linux platform archive and never identified this Windows PE.
No new npm request, Node/Sigstore/Linux installation or platform switch occurred.

Thus the complete source tree is known, while the exact
source ↔ release ↔ Windows binary ↔ schema relationship remains U.
A successful source inventory cannot authorize acquisition for this installed
binary without that relationship.

## PCS-06 — Protocol completeness and experimental selection

Source filenames include ClientRequest, ClientNotification, ServerRequest,
ServerNotification and JSON-RPC envelopes, aggregate schema files, v1 initialization
and 266 v2 files. S06 references request/notification/response type visitors.
This establishes represented categories, not a proof that the current PE exposes
exactly those methods or that all referenced definitions are closed.

The source has separate stable and experimental compressed exports; these must
not be mixed. The JSON source tree is the intended stable fixture output.
The TS subtree exists but was not enumerated, so no complete TS manifest is
claimed. Internal schema content is a distinct map and is not automatically
part of the public App Server contract.

The retained official App Server documentation requires initialize/initialized
and an experimentalApi capability opt-in. That is session negotiation, not
cryptographic build identification. v1/v2 directory names are not a universal
numeric negotiated protocol version. Exact field/capability compatibility remains
unqualified until version-bound schemas and later CAS behavior acceptance.

Choose public stable JSON only for the proposed data route. The general
generate-json-schema/generate-ts examples and source experimental options do not
qualify flags for the installed PE; generatorArgv remains null under RF016.
No generated code, TS import, schema $ref network fetch or model/tool session
belongs to data validation.

## PCS-07 — Future bounded acquisition and inert validation

This is a prerequisite description, not acquisition authority.
`acquisitionAuthorized=false`; `acquisitionReady=false`.

| Stage | Required evidence / rule |
| --- | --- |
| Admission | Exact official immutable source/release, accepted PE binding, complete selected representation and trusted digests. Name one stable JSON representation and separate grant/deadline. A partial tree or guessed aggregate is not admissible. |
| Intake | Enumerated URLs only, bounded requests/body bytes/time, no retry/automatic redirect/refill. Verify declared and actual bytes and content digest before acceptance; preserve incomplete/error accounting. The RF019 network ledger is closed. |
| Manifest | Canonical sorted relative paths, raw bytes and SHA-256 for every delivered file; reject missing/extra/duplicate/case-colliding paths. Preserve raw-byte identity separately from parsed/canonical JSON. The present Git-object inventory is not this accepted manifest. |
| File boundary | One fresh owned private output root, no reparse/hardlinks/device paths/ADS/traversal, no package/repository/profile writes by a decoder, and bounded retention/cleanup. Do not run upstream fixture writers to obtain data. |
| Limits | Retain NSP's 2,097,152 bytes/file, 16,777,216 aggregate, depth 4 and 65,536-byte manifest ceilings as provisional references. Full 305-file source delivery needs explicit review of the 256-file mismatch. No automatic increase or file omission. |
| JSON | UTF-8, duplicate-key/non-finite rejection; bounded parsing at depth 32, 100,000 nodes and 65,536 bytes/string; check actual schema dialect with a maintained validator, then local-reference closure and complete selected request/notification/response definitions. Parser syntax success is not semantic compatibility. |
| Compression, if later chosen | An explicitly qualified maintained zstd dependency only; finite decoded bytes/ratio/window/memory/time and member limits before allocation. No hand-written decompressor, unbounded decode_all reuse, extraction based on magic or new dependency installation now. Plain committed JSON avoids this dependency if provenance/completeness can be proved. |
| Review/use | Independent reviewer validates source/PE/digests, experimental selection, all counters and completeness; only then may later adapter mapping consume the inert schema. This is not auth/isolation/process qualification or live protocol acceptance. |

No JSON Schema self-check was run because no schema body was fetched. The local
checks validate the metadata inventory and report, not unread schema semantics.
Exact decoded bundle bounds and acquisition budgets remain unqualified.

## PCS-08 — A/B decision and remaining gates

| Route | Benefit / unresolved conditions | Disposition |
| --- | --- | --- |
| A: publisher/source JSON data | Official immutable source publication and complete JSON object inventory are now observed. Plain aggregate JSON could avoid zstd and generator execution. Exact PE binding, raw-file digests and chosen aggregate completeness are missing. | Preferred research route, BLOCKED for acquisition/use. |
| B: later exact-PE no-model generator | A successful export would directly observe this executable's output, without claiming an invented source version. Exact argv/startup, first-process confinement, finite timeout, setup and all other NSP prerequisites still need proof. | Retained separately; no automatic fallback and no execution grant. |

Current evidence does not prove that publisher build binding is impossible:
the release metadata route was not completely inspected. Therefore B cannot
honestly be declared the only possible route. If authoritative mapping is
unavailable, a separately admitted exact-PE probe would be the direct way to
observe its schema, but RF018's outer-wrapper configuration-before-confinement
and timeout gaps prevent running it now. Consent or artifact naming alone does
not replace that smallest unresolved execution boundary.

| Evidence area | Existing mapping | Result |
| --- | --- | --- |
| Source/tree/binary/schema identity | NSP-R/T01–02,09,16; D01; B01/B02; CAS-R/T02–04,10,27–29; CDL-R/T04,09,11,16. | Complete source object inventory; exact binary binding and accepted SHA-256 file manifest still BLOCKED. |
| Data limits/manifest/no execution | NSP-R/T08–13,15–16; CAS-R/T13–16,19,27–29; CDL-R/T08–11,16. | Validation rules only; no payload, parsing or independent acceptance proof. |
| Auth/discovery/isolation/process/host | NSP-R/T03–07,10–17; D03/D04/D06; B04/B05/B07; CAS-R/T04–08,15,17,19,23–24. | No new evidence closes these blockers. Data publication does not qualify a runner. |

All fifteen NSP entry gates remain closed. Profile/schema/registry v5 and the
operative CAS/CDL requirements remain unchanged.

## PCS-09 — Disposition and next task

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; actualProbeAuthorized=false; actualProbeStarted=false.

No Codex/setup/helper/App Server/generator/model/Worker/Hermes/OpenShell code,
schema parser/decompressor or system fixture ran. No account/ACL/firewall/registry/
service/task/UAC/admin/reboot/PATH/profile/runtime/API/DB/production change.
Docker was not queried or operated; no WSL lifecycle, payload/archive acquisition,
extraction, package copy/move, installation, push or deployment occurred.

Verification: the [static RF019 validator](../../scripts/validate_direct_codex_precomputed_schema.py)
and eight existing qualification/contract/delivery/preflight/source/policy/isolation/
outer-launch validators passed. The [RF019 tests](../../scripts/test_direct_codex_precomputed_schema.py)
passed 12 cases: one positive baseline and eleven negative test methods covering
closed-ledger accounting, incomplete-response promotion, source inventory loss/
traversal/digest drift, false content/binary verification and admission promotion.
The existing four RF012 and five RF013 tests also passed, as did RF012's static
review/ledger/binding checks. Its custom cryptographic verifier was not executed.
Profile/schema seals remain unchanged. These checks establish documentary
consistency only; schema semantics, effective isolation and independent acceptance
were not tested or claimed.

Exactly one recommended next atomic task: **RF-CODEX-020 — bounded read-only
qualification of official native Windows release metadata for the exact
PE/source/schema binding.** Resolve the remaining publisher metadata route with
fresh explicitly sufficient metadata bounds and complete response accounting;
compare the observed PE digest/size with authoritative native member/source/schema
claims. If no mapping exists in the inspected scope, record that limit and the
separate exact-PE probe prerequisites. No payload acquisition, artifact/platform
switch, setup or execution is implicit. RF-CODEX-020 was not started.
