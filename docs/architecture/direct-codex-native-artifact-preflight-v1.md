# Native Windows Codex exact-artifact preflight v1

RF-CODEX-015, 2026-09-13. **NATIVE-WINDOWS-ARTIFACT-PREFLIGHT-BLOCKED**.

Follow-up: [RF-CODEX-016 schema-probe contract](direct-codex-native-schema-probe-v1.md)
now records the bounded contract and narrow system fixtures, still BLOCKED.
The RF-CODEX-016 recommendation below is the historical RF015 handoff; the
current proposed next task is RF-CODEX-017 in that contract.
The owner-approved pilot platform is native Windows under
[ADR-003](../decisions/ADR-003-native-windows-codex-pilot.md). Static Windows
signature checks now establish offline trust for the selected PE and its five
catalog-member bindings. Full package-content trust, closed launch inventory,
future-principal access, update-race protection and build/wire mapping are not
qualified. No candidate instruction executed.

## Scope and exact identity

Read-only scope was one current-user `OpenAI.Codex` Appx registration, selected
files under that recognized installation, package indexes, eight ACL/reparse
observations and existence metadata for directly named system DLLs. No wide
system scan, user profile/config/auth/history/log read or private path output.
Scripts only parsed data or called existing Windows verification APIs. They did
not load any package executable/DLL, run an installer or retrieve network data.

| Observation | Result |
| --- | --- |
| Package identity | `OpenAI.Codex`, version `26.908.4834.0`, architecture X64, `SignatureKind=Store`, `Status=Ok`; one matching current-user registration. |
| Manifest binding | Name/version/architecture agree with registration. Manifest publisher equals registered publisher; Appx CMS signer subject equals that manifest publisher. The declared application is `app/ChatGPT.exe`, not the child CLI. |
| Candidate reference | Proposed private `installationRef=desktop-native-package-01`, resolving the exact registered physical package and relative `app/resources/codex.exe`. No private receipt/configuration was created. |
| Native PE | MZ/PE32+, machine `0x8664` AMD64, executable-image characteristic, console subsystem 3; size 297,858,352 bytes, SHA-256 `081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575`. |
| Internal version | No FileVersion/ProductVersion in the previously inspected PE metadata; no build-bound version established here. Appx/desktop version is not Codex version. |
| Scope of identity | Package identity plus digest can identify this static candidate. It does not close CAS build/protocol/launch admission. RF014/RF008 Windows digest and size still match. |

## Official Windows cryptographic checks

Used existing `wintrust.dll` through a small local interop wrapper, without
implementing signature mathematics. `WinVerifyTrust` used
`WINTRUST_ACTION_GENERIC_VERIFY_V2`, `WTD_UI_NONE`, whole-chain revocation checking
excluding the root, and `dwProvFlags=0x00001080`:
`WTD_CACHE_ONLY_URL_RETRIEVAL | WTD_REVOCATION_CHECK_CHAIN_EXCLUDE_ROOT`.
Provider state was explicitly closed after each verification. Cache-only policy
was mandatory for every call; no online retry or revocation/root retrieval.

| Verification | Offline result and limit |
| --- | --- |
| `codex.exe`, file choice | `0x00000000`: successful standard Authenticode policy verification on this machine under those flags. |
| `AppxMetadata/CodeIntegrity.cat`, file choice | `0x00000000`: catalog signature accepted under the same policy. |
| Five PE files in the inventory below, catalog choice | Each `0x00000000`. `CryptCATAdminAcquireContext2` with SHA256 and `CryptCATAdminCalcHashFromFileHandle2` supplied the catalog-member hash/tag to `WinVerifyTrust`; the exact existing catalog and member handles were used. |
| `AppxManifest.xml` and `AppxBlockMap.xml`, catalog choice | Each `0x800b0100` (`TRUST_E_NOSIGNATURE`). This attempted route supplies no accepted catalog binding for those XML files. It does not mean the installed package is unsigned or corrupted. |
| `AppxSignature.p7x` | Standard .NET `SignedCms.CheckSignature(true)` passed on the decoded CMS. This checks signature mathematics only; `true` does not establish certificate-chain/package-content trust. Publisher-subject equality is an additional metadata comparison. |

Windows accepted cached trust for the selected PE/catalog members; this is
stronger than RF014's signature-presence observation. It is not independent
external attestation, current online revocation evidence or a portable future
acceptance receipt. The short-lived PE signing certificate's validity date is
not substituted for the Windows Authenticode/timestamp decision.

**Full Appx package verification remains unproven.** Selected-file block hashes
match the local blockmap, but that map's binding to the signed Appx digest was
not established by an existing offline package-verification result. CMS math,
registration status and a trusted catalog must not be combined into a fabricated
whole-package PASS. No package was reconstructed, unpacked, copied or downloaded
to make verification possible; no custom Appx digest verifier was introduced.

The Windows pilot therefore uses the evidenced Windows code-signing/catalog
route for these exact files and retains the remaining package/closure checks
as Windows B01 issues. RF009–013's npm/Node/Sigstore/TUF work is a deferred Linux
alternative, not a prerequisite or current blocker of this pilot. No claim that
all supply-chain requirements have passed follows from this routing change.

## Bounded file inventory, imports and access

All five files are PE32+ AMD64 and have one hardlink. Each was streamed against
its blockmap entry in 64 KiB blocks while computing SHA-256; size/mtime were checked
before/after each read. All selected block counts and declared sizes match.

| Relative file below `app/resources/` | Bytes / subsystem / blocks | SHA-256 |
| --- | --- | --- |
| `codex.exe` | 297,858,352 /3 /4,545 | `081e4de4be8e38fac6ed4d95e3b1a0b9f6d31c090ddc36e1696b349fe406f575` |
| `codex-command-runner.exe` | 8,218,928 /2 /126 | `dfaa6a729dfcac4a1bfcdcb47cf42d1b3662848e31cbd8420ecc3eabbb014a31` |
| `codex-windows-sandbox-setup.exe` | 15,467,312 /3 /237 | `f10e0a6d40c3bce4e65fd0a5c2550965b6e709c330711d7be5c918aa41579546` |
| `codex-code-mode-host.exe` | 72,471,856 /3 /1,106 | `fdf360c3a02adce2a29272357d61681bdddc2ab9828a5fa615c4528e4384a23e` |
| `rg.exe` | 4,234,536 /3 /65 | `673c96c34aff066742faddd08566dbaf9f3a64bcc81f62d7260ce12d4a3c0e84` |

The main PE names 20 direct imports: kernel32, combase, advapi32, shell32,
ws2_32, shlwapi, oleaut32, userenv, ntdll, bcryptprimitives, user32, secur32,
bcrypt, crypt32, iphlpapi, netapi32 and winhttp DLLs, plus the API-set contracts
`api-ms-win-core-apiquery-l2-1-0.dll`, `api-ms-win-core-synch-l1-2-0.dll` and
`api-ms-win-core-winrt-l1-1-0.dll`. None of the five PEs declares delay imports.
Helper imports additionally name ole32, fwpuclnt, winmm and dbghelp.
Every directly named ordinary DLL has an entry at the standard system-library
location; none is present directly beside the selected package executables.
API-set contracts need OS loader resolution, not a same-named physical file.

This does **not** close dependencies: transitive/dynamic DLL loads, API-set/SxS
mapping, shell/tool discovery, optional code-mode/runtime assets and which helper
is invoked under the exact configuration remain unqualified. No system DLL was
loaded or recursively inventoried, and absence of Node in an import table is
not proof that no optional feature can discover an interpreter.

Package root, `app`, `app/resources` and the five files all have SYSTEM ownership,
no reparse attribute, one execute/traverse-allow rule and zero execute-deny rules
matching the current token's SID set. For Everyone, Authenticated Users and
Builtin Users, no mutation-allow rule was found for the checked write/delete/
permission/ownership masks. No raw SID/DACL was persisted.
These are static ACL observations, not effective AccessCheck, token-attribute,
WDAC/AppLocker or arbitrary-alias proof. The future private Worker/sandbox
principal is not bound; its execute, traversal and helper access remain unknown.
No principal, permission, package or hardlink was changed.

## Wire evidence and documentary native profile

The 5,511-entry outer blockmap index and the `app.asar` JSON header were inspected
for Codex/App Server schema/protocol bundle names. Header size 2,489,269 bytes,
SHA-256 `4d2412e4a8b610283d2e0879fb66ae98f94a19b68af7487cae274c9a12a6819c`;
9,213 header entries visited, zero package member bodies read. No matching
versioned bundle was identified. Name searches do not prove absence of protocol
code in bundled JavaScript. Exact build/wire mapping and B02 remain blocked.

Native target profile `direct-codex-windows-native-candidate`, documentary
revision 1, is **NOT_ADMITTED**. It is a human-readable target under ADR-003,
not a new machine schema, merged JSON overlay or executable runtime profile.

| Native profile field | Current disposition |
| --- | --- |
| Platform / architecture | OWNER_APPROVED native Windows / x86_64. WSL kernel/distribution/bridge fields do not apply to this platform; they are not fabricated passing values. |
| Candidate identity | Exact observed Appx identity + native digest above; private installationRef is proposed, not an installed configuration or accepted launch seal. |
| Codex build / wire / closed inventory | UNRESOLVED/BLOCKED. Keep separate from the known candidate digest. |
| Invocation | Exact `argv=["app-server"]`, no shell/PATH/alias/copy; private absolute physical executable, hidden window, stdin/stdout/stderr pipes and admitted physical repository cwd. Sealed replacement environment/configuration required. |
| Access and update race | UNRESOLVED/BLOCKED future principal, dependency/loader policy and non-replaceable identity across verification/spawn. |
| Process / sandbox | Windows-owned task-only Job or qualified equivalent, no breakaway, ownership before first instruction, whole-tree stop ≤5s; vendor sandbox/ACL/firewall/effective policies must be independently proven. No administrator Worker or helper escape is admitted. |
| Account | ADR-002 I01-B official local-account policy unchanged; isolated supported channel still B04. No desktop home/token copy or new auth bridge. |
| Budgets / model / evidence | Existing CAS and owner I01-A requirements retained. No unmeasured numeric defaults, cost-cap assumption, new model choice, or independent acceptance. |
| Gates | implementationReady=false; executionSupported=false; pilotReady=false; liveAdmissionAllowed=false. |

The existing WSL v1 JSON profile/schema remains byte-for-byte historical,
NOT_ADMITTED evidence. Its 53 nulls and WSL-only fields are not a machine profile
for Windows. Shared normative CAS requirements remain current; the old profile
validator validates that historical document only. A small versioned native
machine-profile/receipt contract belongs to later qualification, not registry v5.

A private installationRef can unambiguously *name* the observed native file
without PATH or copying. It cannot yet *authorize* the exact launch descriptor.
Compare package identity/version/status, executable and metadata hashes, helper
inventory and security profile before admission; any mismatch denies and requires
explicit requalification. No silent pin update, app-version substitution, rollback
artifact selection, weaker sandbox or Windows↔WSL fallback. Sequential before/
after stability checks do not solve the remaining verification-to-spawn race.

## Blockers, verification and next task

D01/B01 is narrowed by offline signed PE/catalog-member evidence and exact static
identity. Whole-package binding, dependency closure, future-principal access,
supported child-CLI integration and protected launch identity remain. D01/B02
retains exact build/schema/initialization mapping. B03 and B08 retain numeric
resource/parser/storage measurements; B04–B09 are not closed. D07 remains
DECIDED for the old document design only, not native machine-profile acceptance.
No current CAS C/O/A runtime proof is added by Windows signature validation.

The first local inspection pipeline stopped before accessing the package because
its path input was not decoded correctly. A text-only transport correction then
completed the bounded reads; no candidate launch, network retry or package
mutation resulted. Public evidence is limited to relative paths, hashes, fixed
API outcomes and counts. Windows trust used cached policy; no fresh revocation
status, no network, no setup, generator, model or application-runtime test.

Final drift checks passed: package identity/version/architecture/Store status and
all nine selected hashes (five PEs plus manifest/blockmap/signature/catalog) are
unchanged. The four metadata hashes also match
[RF014's recorded metadata](direct-codex-platform-selection-v1.md). This is sampled
continuity; it is not an atomic snapshot or permission to launch later.

PASS: six existing static qualification/CAS/delivery/RF008/RF011/RF013 validators,
RF012 reviewer/ledger/binding checks without its mathematical checker, nine
existing offline review/policy test methods and four deliberately corrupted
historical-Git-blob fixtures. The two historical review validators now recognize
the exact original mixed-line-ending architecture snapshots through checked LF
Git equivalents. Original raw reviewer seals were reproduced before recording
those two mappings; neither review record nor historical evidence was rewritten.
The new native decision is not presented as independently reviewed by RF012/013.
Document links/privacy, decision register, untouched runtime/profile baselines,
script syntax and `git diff --check` were checked separately. No new framework,
schema or executable adapter was introduced.

Native Docker read-only before/after results agree: 4 containers, 5 networks,
107 volumes, 16 image rows; selected identity/state/start/restart and inventory
digest `328c45deb5fb79f841aafbfb974beb261c37b5708140102d1c63e43c02a03bf0`.
Existing workloads were unchanged in those observations. No payloads, logs,
environment or mounts were inspected, and no WSL/Docker lifecycle action ran.
Application/API/DB and actual Codex/OS containment tests were not run because
they are outside this static task. The unrelated user file was untouched.

Exactly one recommended next atomic task: **RF-CODEX-016 — define and qualify
the bounded native no-model schema-probe contract.** Specify the exact generator
operation, finite time/output/storage bounds, Windows launch identity/closure,
pre-initialization no-auth/no-discovery/no-network containment and owned stop
prerequisites. Identify which can be established statically or with separately
authorized system-only fixtures; unresolved prerequisites deny Codex execution.
This is the separate route to obtaining build-bound schema evidence, not an
implicit generator/probe/install grant. RF-CODEX-016 was not started.
