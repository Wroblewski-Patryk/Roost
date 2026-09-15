# Native schema probe acceptance v1

RF-CODEX-016, 2026-09-15. Matrix version **1**.
Normative owner: [contract v1](direct-codex-native-schema-probe-v1.md).
Verdict: **NATIVE-SCHEMA-PROBE-CONTRACT-BLOCKED**; no actual probe authority.

Evidence: D=static contract/source review; S=own harmless system fixture;
C=separately authorized exact Codex generator; O=complete native enforcement;
A=independent acceptance. A primitive PASS-S is not an entry-gate PASS or C/O/A.
All 17 rows need positive and negative evidence before output is used in an adapter.

| Test | Requirement | Required positive / negative evidence | Current result |
| --- | --- | --- | --- |
| NSP-T01 | NSP-R01 | D,A: official build-matched exact argv/output/init path; absent/different source, added flag or format denies. | BLOCKED: argv/source binding null; general docs insufficient. |
| NSP-T02 | NSP-R02 | D,O,A: exact native identity/closed trust/loader/race protection and stable package; any hash/version/metadata/alias drift denies. | Partial D: current package/hash matches RF015; remaining preflight gaps open. |
| NSP-T03 | NSP-R03 | S,C,A: exact replacement keys and empty synthetic roots; every inherited secret/proxy/tool variable, overlay or unexpected key denies. | PASS-S for six-name environment and root values in a Python actor; no Codex/Windows account-API isolation proof. |
| NSP-T04 | NSP-R04 | D,C,O,A: forbidden profile/discovery attempts denied before side effects, including missing config; unavoidable init fails. | BLOCKED: no qualified pre-initialization boundary or build path. |
| NSP-T05 | NSP-R05 | O,A: fail-closed denial for all socket/DNS/loopback/handle routes before connection; unavailable enforcement denies spawn. | BLOCKED; no networking fixture or firewall changes. |
| NSP-T06 | NSP-R06 | O,A: only sealed reads/owned writes; synthetic outside-file, registry/account APIs, alias and host-control bypass denied. | BLOCKED; no FS sandbox/principal proof. |
| NSP-T07 | NSP-R07 | S,O,A: assign before first instruction, all helpers owned, Job close/crash/timeout stops tree≤5s; breakaway/PID reuse/foreign-handle/unknown stop fails. | PASS-S only for suspended assignment, same-token child membership, breakaway error 5 and kill-on-close with handles. Broader O/A BLOCKED. |
| NSP-T08 | NSP-R08 | S,C,O,A: exact finite phase/raw-byte/queue/CPU/RAM/process/handle/disk caps; boundary+overflow and unavailable quota deny. | PASS-S line/aggregate collector rejection and timeout. Hard aggregate sentinel, resource exhaustion/disk/handle/actual-generator sizing BLOCKED. |
| NSP-T09 | NSP-R09 | S,O,A: bounded complete canonical manifest after stop; oversize/count/name/collision/reparse/hardlink/special/ref/race denies. | PASS-S flat synthetic file hashing, hardlink/oversize rejection; complete traversal/quota/race coverage BLOCKED. |
| NSP-T10 | NSP-R10 | C,O,A: exact clean completion, nonempty bundle, all counters/stop and no drift; exit 0-only, forced cleanup or missing evidence rejects. | BLOCKED: no generator run or matched terminal contract. |
| NSP-T11 | NSP-R11 | S,C,O,A: zero model/tools/auth/retries; forbidden operation, restart/second command or stale authority denies. | D prohibition only; exact generator behavior BLOCKED. |
| NSP-T12 | NSP-R12 | D,S,A: closed private receipt with complete counters and refs; raw paths/env/logs, missing required fields or ambiguous success rejects. | D field contract; executable receipt/privacy sink qualification BLOCKED. |
| NSP-T13 | NSP-R13 | S,O,A: only owned stopped scratch cleaned; reparse/foreign/still-running/sole evidence retained and reconciliation blocks reuse. | S synthetic fixture scratch cleaned; real failure retention/cleanup O/A BLOCKED. |
| NSP-T14 | NSP-R14 | D,S,A: fixed first-cause reasons map to current B/CAS/CDL; unknown code, cause overwrite or false blocker closure rejects. | D mapping specified; no production reason sink implemented. |
| NSP-T15 | NSP-R15 | S,A: all 15 evidence-backed gates and separate exact grant; each null/false/coercion/missing/extra denies with zero Codex spawn. | PASS-S: 62 shape/value denials; real evidence/grant resolution BLOCKED. |
| NSP-T16 | NSP-R16 | A: author-separated review recomputes hashes and all rows; self-review, stale pin, missing negatives or skipped mandatory evidence rejects schema use. | NOT RUN; no independent reviewer or real bundle. |
| NSP-T17 | NSP-R17 | D,A: truthful BLOCKED, false activation and single next task; fixture promotion, stale host state or implicit next/probe launch rejects. | D checks pass; host baseline unavailable, actual probe remains forbidden. |

## RF016 fixture evidence and limits

[System-only fixture](../../scripts/test_native_codex_schema_probe.py) uses the
already running Python interpreter with `-I -S` and its own small fixed actor,
not Codex or any code from its package. Seven fixture families passed; 62 gate
denials, one owned descendant, measured Job-close stop 2 ms. The API sequence was
CreateJobObject/SetInformationJobObject, CreateProcess suspended, assign/resume,
IsProcessInJob on the child's handle, Job close and waits on both process handles.
Job kill-on-close, active-process 4 and 256 MiB job memory were set; breakaway was
not enabled. No claim of a general protected supervisor or tested exhaustion.

The bounded two-pipe collector has a four-chunk queue and 256-byte reader chunks.
It counts consumed chunks and rejects before further parsing, but can prefetch
additional bounded bytes. It is research code, not the contract's future exact
raw-budget implementation. The timeout fixture terminates its known child with
no descendants; the separate Job fixture checks descendant stop. Neither test
establishes filesystem, network, disk, handle or hostile-principal containment.

File fixtures cover only a flat owned synthetic output directory; size guards
and hashes run after writes, not as a hard writing quota. Existing hardlinks are
rejected without touching external files. No live symlink/device/registry/network
escape attempt or real account/profile read was made. Missing adversarial cases
remain explicit, not silently counted as passing. No generated schema exists.

## Static verification and host observation

The six existing qualification, CAS, delivery, artifact-preflight, source-research
and standard-policy validators passed. Qualification validation now checks the
17 unique requirement/test pairs, the exact 15 gate names against the fixture's
parsed source, null argv/build binding, false activation gates, local links and
public-path exclusions. It never executes the fixture or a Codex candidate.
The four provenance-review and five standard-policy regression tests also passed;
no custom cryptographic verifier was run. Historical review seals, profile/schema
and registry v5 remain unchanged.

Both initial and final read-only Docker queries failed. No Docker repair or
lifecycle operation followed; current workload continuity is unknown. RF015's
historical counts cannot substitute for a fresh baseline. This is an additional
host evidence gap for future admission, not a fixture success claim.
