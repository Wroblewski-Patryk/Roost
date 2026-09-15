# Official Windows PE to App Server schema binding v1

RF-CODEX-020, 2026-09-15.
Verdict: **OFFICIAL-WINDOWS-PE-SCHEMA-BINDING-BLOCKED**.

Follow-up [RF021 setup admission](direct-codex-native-setup-admission-v1.md)
retains BLOCKED: no admitted external runner contract or bounded shared setup
delta/rollback. Its RF022 proposal is an owner architecture decision; the RF021
handoff below is historical. The metadata route remains closed.

The official Windows release binary does not match the selected local PE.
No inspected publisher metadata binds the Appx member to the source/schema
inventory. This final metadata round closes that route for the current Appx;
it does not claim that all possible publisher records have been disproved.

[ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md),
[RF015 preflight](direct-codex-native-artifact-preflight-v1.md),
[RF016 probe contract](direct-codex-native-schema-probe-v1.md),
[RF017 isolation](direct-codex-windows-standard-isolation-v1.md),
[RF018 outer launch](direct-codex-native-outer-launch-v1.md) and
[RF019 schema research](direct-codex-precomputed-schema-v1.md) retain their limits.

## WPB-01 — Closed official-source round

[Ledger](codex-windows-build-binding-source-ledger-v1.json): **8 requests,
409,408 delivered body bytes**, seven complete 200s and one complete 404.
Limits: 10 requests, 2,097,152 total bytes, 524,288 bytes/response, 20 seconds,
zero retries, manual redirects. No redirect occurred. The existing capture
persisted reservations and delivered-byte accounting before parsing.
closed=true; halted=false; closureReason=final_metadata_round_complete_no_more_requests.
Two unused slots are relinquished. No further metadata round is proposed.

| ID | Official source | HTTP / body bytes / SHA-256 |
| --- | --- | --- |
| S01 | [Pinned release](https://api.github.com/repos/openai/codex/releases/tags/rust-v0.154.0) | 200 / 292555 / `cd496ba31946a1415a9133a685fa3c6250a2d30a53780c15ef44e1bac02ee608` |
| S02 | [Workflow directory](https://api.github.com/repos/openai/codex/contents/.github/workflows?ref=6b9826e3aa83b1a5947db50f4332cb9c65f1b340) | 200 / 31329 / `933813898b9fee24b578a0f6846ae0ff4b9aaa5564d31a0af5834fb7aa54cf71` |
| S03 | [Windows build workflow](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/.github/workflows/rust-release-windows.yml) | 200 / 16948 / `64197ee29715bae16a3fd06a4a4522fc56814febe10981333d0ead3574217f9a` |
| S04 | [Release workflow](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/.github/workflows/rust-release.yml) | 200 / 64917 / `af0ffadfb1e9f57c093f11535b7c54e26975e2dc1af0ffbc7e9999f5c877ea01` |
| S05 | [Tag ref](https://api.github.com/repos/openai/codex/git/ref/tags/rust-v0.154.0) | 200 / 343 / `353f61b7c51e058d7615a7a568618cd1759331a9d37cd8379cd743b0a56701cc` |
| S06 | [Annotated tag](https://api.github.com/repos/openai/codex/git/tags/36eab01061df3cde5f95ec20a526777b430091ba) | 200 / 655 / `a8e5c87caf1512a90bd5244df4e4a68f6bb7b5dd3de8af9ba007cddaac2782fd` |
| S07 | [Windows signing action](https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/.github/actions/windows-code-sign/action.yml) | 200 / 2535 / `384e8712d94bc7e5bf2cfb621c3832f009969d73d43d2e7bf7ee6bd0c8b0eec5` |
| S08 | [Exact-digest attestation query](https://api.github.com/repos/openai/codex/attestations/sha256:081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575) | 404 / 126 / `8ecae33333826db91507fbc9512eabf6e8e7c9be3c43f6681ca70bff4c028a6d` |

S01 fully resolves RF019's previously incomplete release response under this
new explicit budget. That old rejected prefix and ledger remain unchanged.
Only relevant release identity, Windows asset and manifest/checksum/provenance
fields were projected; unrelated release notes and author fields were not used.
S08 was accounted as an HTTP error, with no attestation body accepted.
No release asset, schema body, executable or archive was downloaded.

## WPB-02 — What the release binds, and what it does not

S01 reports release ID 385887902, tag rust-v0.154.0, published
2026-09-09T22:35:38Z, 160 asset entries, draft=false, prerelease=false,
immutable=false and target_commitish=main. The last field is not a commit pin.
S05–06 resolve the tag object 36eab01061df3cde5f95ec20a526777b430091ba to
commit 6b9826e3aa83b1a5947db50f4332cb9c65f1b340; API verification is
verified=false, reason=unsigned.

| Candidate | Bytes | SHA-256 | Binding class |
| --- | --- | --- | --- |
| Selected local app/resources/codex.exe | 297,858,352 | `081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575` | locally observed, freshly rehashed |
| Release codex-x86_64-pc-windows-msvc.exe, asset 553706480 | 298,169,136 | `be96b992178b1e467c225800da0d65f2c86d5eba1ef0b14632f65db381cbdfde` | publisher asserted by the API; payload not fetched |
| Release codex-app-server-x86_64-pc-windows-msvc.exe, asset 553706486 | 230,817,072 | `6fe58c486f793629317d73e66f804dcfad6561aa8ed9b2c9ff647f7843b4b350` | publisher asserted; different executable, not a substitute |

The release exposes a digest for a standalone native EXE, so an archive's digest
need not be mistaken for its inner member. Both size and digest differ from the
local CLI. Different signing/build inputs could explain different bytes, but no
normalization, same-source or equivalent-schema conclusion follows. No artifact
switch or download is authorized.

S01 also lists codex-package_SHA256SUMS, 1,392 bytes, API digest
c6efb14f673ecb83d0196b5f4e0cdefbfe4f732c0d5a28cbc4eeb159c001b272.
It was not downloaded. S04 lines 1311–1332 generate that manifest from package
tar.gz archives, not inner PE/schema members. The inspected asset-name projection
found no SBOM/provenance-named asset providing the missing local binding.
S08's exact local SHA-256 attestation endpoint returned 404: no usable attestation
from that route, not a proof of global absence or a cryptographic verification.

## WPB-03 — Source pipeline and schema relationship

S04 lines 12–15 trigger release work on rust-v tags; lines 34–55 require tag and
Cargo version agreement. The release job invokes the Windows workflow
(lines 1176–1179) and publishes the resulting assets under the tag
(lines 1383–1390, including overwrite_files=true).

S03 builds x86_64/aarch64 Windows primary/helper/App Server binaries from the
checkout, then signs the staged binaries through S07's Azure Trusted Signing
action before packaging. That source describes a publisher pipeline, not an
attestation of a particular Desktop/Appx build or a reproducible-build proof.
Neither inspected workflow supplies an Appx-version-to-child-PE/source mapping.

RF019's complete [305-file inventory](codex-precomputed-schema-source-inventory-v1.json)
belongs to that same immutable source commit; its canonical metadata SHA-256 is
e7d7e4e4c2ccde48eef460cbccf6b4c9f94a3ad166c503a8dbb3233978d31161.
RF018–019's protocol sources establish intended embedding of stable/experimental
precomputed maps. This is **publisher asserted** source organization, not a
cryptographically bound local PE/schema relationship.
S04's separately published config-schema.json comes from core/config.schema.json
(lines 1334–1336); it is not the App Server schema.

No schema payload was parsed. Raw schema SHA-256, selected aggregate completeness
and exact installed-build schema identity remain unproven. The full 305-file
tree was not downloaded; the NSP 256-file limit is unchanged.

## WPB-04 — Bounded local package metadata

Current registration remains OpenAI.Codex 26.908.4834.0, x64, status Ok.
The exact CLI hash above was refreshed. These metadata files were freshly hashed:

| Relative package file | Bytes | SHA-256 |
| --- | --- | --- |
| AppxManifest.xml | 6,246 | `aca43873f91174a1dda5b58e2cbb816f41b3e0d01a0aabe6c249fafed8f0a226` |
| AppxBlockMap.xml | 3,238,925 | `f7ece161c63f5bf6d300481f2e3fde111bbe2a86070b3712489fe38a07405065` |
| AppxMetadata/CodeIntegrity.cat | 23,788 | `5eea5ef426953a60340603cc53b24ec45355857a794e2e7e8ffb1f4c4ba87668` |

RF015's dated Windows signature/catalog-member checks are **cryptographically
bound** only within their recorded selected-file/offline policy. No signature
validation was repeated here. They do not bind a Git commit; full Appx-content
verification was not established by RF015 and is not promoted now. Current
registration, sizes and hashes are **locally observed** evidence.

After nonrecursive filename/size listings of the recognized installation root,
app and app/resources, three small static publisher metadata files were read
in place with a 4,096-byte/file ceiling; none was executed or copied:

| Relative file | Bytes / SHA-256 | Meaning and limit |
| --- | --- | --- |
| app/owl-shell-runtime.json | 104 / `19ecc36c928abe789c1dec4c788c719eb583017e1cc7e2a293b280e0b32fedb5` | win32/x64 and empty package-dependency list; no child Codex build identity. |
| app/resources/owl-electron-app.json | 215 / `c3c5b943010e4db8a160f0a12aee934f61c87d59a1eafc90312492ad3d4e400c` | Runtime name owl and runtimeArchiveSha bac2f8eae1f768361075c738e9fe47aac96f5c2c94cb735d89ddb317478e21c8; no child PE/source/schema digest relation. Packaging-path value omitted from this public report. |
| app/152.0.7977.83.manifest | 226 / `e9cf8f1081d41e467331aed2a95e13d242d791f09cca821beed1be46b8931e85` | Assembly version and chrome_elf.dll association; not Codex version. |

These contents are **publisher asserted** packaging metadata, with their read
bytes locally observed; their semantic relationship to codex.exe is **unproven**.
An archive-named digest is not relabelled as the CLI digest. No Appx-version/date/
Chromium-version coincidence establishes source identity. Other binaries, ASAR
contents, profiles/config/auth/history/logs and private runtime state were not
opened by this task. No heuristic binary scan or extraction was performed.

## WPB-05 — Closure, gates and next practical step

publisherMetadataRouteClosed=true; sourceBuildBinding=null;
installedCodexVersion=null; publisherBinarySchemaManifest=null;
acceptedSchemaSha256=null; acquisitionReady=false; acquisitionAuthorized=false.
No minimal schema acquisition manifest can be accepted without the missing exact
binding and verified file digests. RF019's proposed inert-intake rules remain
conditional and NSP limits remain unchanged.

| Mapping | Disposition |
| --- | --- |
| B01/B02, D01; NSP-R/T01–02,09,16; CAS-R/T02–04,10,27–29 | Exact local candidate identity is known; publisher PE/source/schema binding remains BLOCKED. Metadata route closed for this Appx. |
| NSP-R/T03–08,10–17; CAS-R/T05–08,13–16,19,23–29 | No new isolation, startup, timeout, output, host or independent-acceptance evidence. All fifteen NSP entry gates remain closed. |

Within this selected local-artifact plan, a separately authorized probe of the
exact PE is the only remaining practical way to observe its exported schema.
This is a planning closure, not a proof that undiscovered metadata cannot exist.
The probe must not infer its schema from the mismatching release.

Exactly one recommended next atomic task: **RF-CODEX-021 — establish the minimal
official setup/outer-isolation admission for one bounded exact-local-PE JSON
schema probe.** Produce a concrete supported launch/cleanup arrangement and
independent admission evidence for the selected package, including confinement
before its first instruction, build-qualified argv, finite timeout/whole-tree
stop and output bounds. Resolve RF018's configuration-before-confinement and
timeout gaps, and any required setup delta/rollback, before asking for the
separate exact probe grant. Do not replace these prerequisites with consent or
another general metadata-research round. RF-CODEX-021 was not started.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; actualProbeAuthorized=false; actualProbeStarted=false.
Profile/schema/registry v5, runtime/API/DB and production remain unchanged.
No candidate/helper/setup/generator/model/Worker/Hermes/OpenShell execution,
installation, account/ACL/firewall/registry/service/task/UAC/admin/reboot change,
archive/payload acquisition, extraction/copy/chmod, push or deployment occurred.
Docker was not queried or operated; no WSL lifecycle action occurred.

Verification: nine existing static validators passed, including the extended
[precomputed metadata validator](../../scripts/validate_direct_codex_precomputed_schema.py).
All 15 [metadata tests](../../scripts/test_direct_codex_precomputed_schema.py)
passed, including rejected reopening, 404 promotion and false binding/readiness.
The four RF012 and five RF013 tests and RF012 static review/ledger/binding checks
also passed. Profile/schema seals are unchanged. No custom cryptographic verifier,
schema-semantic validation, system fixture or independent runtime review ran.
