# Official Codex source research v1

RF-HERMES-010, 2026-09-13.
Verdict: **OFFICIAL-CODEX-SOURCE-BLOCKED**.
Reason: **metadata_receipt_capture_failed**. The research is incomplete because
the first batch's result was truncated before its structured receipt could be
retained. This is an evidence-capture failure, **not a finding that OpenAI lacks
a suitable release, provenance or schema mechanism**. No candidate is selected.

The [delivery contract](direct-codex-artifact-delivery-v1.md) and
[acceptance matrix](direct-codex-artifact-delivery-acceptance-v1.md) remain in
force. The [normalized research disposition](direct-codex-official-source-research-v1.json)
records unknowns explicitly; it contains no guessed release fields or qualified
pin. No new technical claim about an official release is made from lost output.

## Network scope and failed receipt

Before the first request, the declared budget was 32 HTTP requests, 6,291,456
response bytes in aggregate and 524,288 bytes per response, with a 20-second
per-request timeout. The initial batch contained three metadata/document requests.
It used no authentication, cookie jar, local account configuration or proxy
discovery; payload/installer/archive download routes were denied.

These are the exact attempted discovery endpoints on 2026-09-13. They are
listed for scope accounting, **not cited as retained evidence of their content**:

| Attempt | Endpoint | Disposition |
| --- | --- | --- |
| SR01 | [Official App Server documentation](https://learn.chatgpt.com/docs/app-server.md) | Response status/content receipt unavailable after capture failure. |
| SR02 | [Official repository README metadata](https://api.github.com/repos/openai/codex/readme) | Response status/content receipt unavailable after capture failure. |
| SR03 | [Release discovery metadata](https://api.github.com/repos/openai/codex/releases/latest) | Discovery only; no final release/tag/ID/digest was retained. The latest route is not a pin. |

The process produced a structured batch result, but its selected metadata output
exceeded the command tool's output allowance. The tool returned a truncation
warning instead of a parseable complete JSON document. The orchestrator rejected
that document before retaining the ledger or source fields. No surviving source
receipt establishes exact statuses, response hashes, byte counts or redirect
counts. The aggregate actual request and byte totals are therefore **unknown**,
not zero and not estimated from the number of initial URLs.

An additional review of the transient retrieval logic found that automatic
redirect handling did not meter redirect response bodies through the same byte
counter. Thus the requested aggregate byte bound cannot be certified from that
implementation even if the final-response ledger were recovered. No claim of
an observed overrun is made; proof of budget compliance is missing.

No further network request was made after the failure. The declared budget was
not reset or extended, and lost counters were not replaced with guessed values.
No raw response, private receipt, header, cookie, token or account identifier
was written to the repository or to a private artifact file. Only this sanitized
failure disposition is retained. Payloads, packages, archives and binaries were
not fetched; Codex and schema generators were not run.

## Required findings and unresolved state

| Required finding | Current result and retained blocker |
| --- | --- |
| Official ownership and distribution mechanism | Not established by a retained RF010 source receipt. The requested official endpoints alone do not verify their content. |
| Exact immutable release/version/build and Linux asset | Unresolved. No tag, release ID, asset name, size or digest is promoted from unavailable output. |
| Published checksum, signature, attestation, SBOM or package integrity | Unresolved, not claimed absent. HTTPS, a GitHub digest, npm integrity or a tag would still need the distinctions in CDL-R03. No registry metadata request followed the failed batch. |
| Exact App Server/schema generation or publisher-bundle route | Unresolved. No current or version-bound documentation claim is inferred; RF001 general docs remain historical, not a bundle for an identified binary. |
| CDL-R/T01..16 and D01/B01/B02/CAS linkage | The 16-family delivery matrix remains normative, all rows SPECIFIED, NOT QUALIFIED. No source/pin/provenance/schema requirement receives new passing evidence. |
| Future acquisition endpoints and limits | Cannot propose exact asset endpoints, download or unpacked bounds without retained asset sizes/identities. The research budget is not an acquisition budget. |
| Comparison with RF008 Desktop observation | RF008 reports Linux x86_64, 262,804,768 bytes and digest 6970ad6a5b7615d2f5838879e19c1369e5527cb1544f1515f76900267740a403; exact Codex version is null. RF010 has no retained release candidate to compare. Equality/difference is unknown; no Desktop copying or permission change is justified. |
| Acquisition versus owner/security decision | Neither acquisition nor a weaker trust-policy decision is justified. Recover auditable source research before choosing either. |
| Lifecycle scripts/mutable dependencies | Not established for any selected package. The existing prohibition on package hooks, implicit dependencies and installer execution remains mandatory. |

The [qualification packet](direct-codex-qualification-decisions-v1.md) retains
D01–D06 BLOCKED, D07 DECIDED for document/schema design, all B01–B09 and profile
revision 3 unchanged. All 75 values and 53 technical nulls remain. Delivery
source/authority selection stays null and acquisitionReady=false.
implementationReady=false, executionSupported=false, pilotReady=false and
liveAdmissionAllowed=false. No runtime, API, DB, migration, registry v5,
production configuration, WSL or installed artifact was changed.

## Verification and next task

The static validator checks that missing accounting/content cannot become a
source selection, a compliance claim or admission. Negative document fixtures
reject invented byte counts, candidate/payload fields, private URLs, claimed
source evidence and activation. Existing delivery, qualification, CAS and RF008
validators remain applicable. No executable compatibility tests were run.
Docker continuity is checked read-only before/after; its normalized result is
recorded in the research disposition, without resource names or identifiers.

Exactly one recommended next atomic task: **RF-HERMES-011 — repeat bounded
official source/provenance research with auditable metadata capture.** A fresh
explicit task budget is required because RF010 accounting was not retained.
Before its first request, statically verify manual redirect handling that counts
every request and bounds every read; reject payload routes; separate a tiny
aggregate ledger from a strictly capped normalized field projection; preserve
that ledger before parsing/displaying larger results. Use only the same official
source classes and then resolve an exact immutable candidate or precise source
blockers. No payload download, installation, permission change or code execution
belongs to that retry. It is one research task, not an acquisition or trust waiver.
RF011 was not started by RF010.
