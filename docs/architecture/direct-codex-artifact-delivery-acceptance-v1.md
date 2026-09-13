# Direct Codex artifact delivery acceptance v1

RF-HERMES-009, 2026-09-13. Matrix version: **1**.
Normative owner: [delivery contract v1](direct-codex-artifact-delivery-v1.md).
Status of every row: **SPECIFIED, NOT QUALIFIED**.
Exactly 16 CDL requirements map one-to-one to 16 CDL test families. Within each
row, every listed negative variant is mandatory; a skipped variant cannot pass.
These are criteria, not assertions that tests against a host have been run.

Evidence levels reuse the [CAS matrix](direct-codex-app-server-acceptance-v1.md):
D documentary/static review; S synthetic fixtures; C exact real-artifact/protocol
compatibility; O supported-OS enforcement; A independent authority review.
Acquisition evidence does not become C/O merely by passing a static validator.
All executable/OS tests require their own bounded authority. Receipts bind the
exact contract/profile/artifact/inventory/schema/task identities and evidence.

| Test | Requirement | Decision | Blockers | CAS requirements | CAS tests | Positive acceptance | Mandatory negative acceptance | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CDL-T01 | CDL-R01 | D01 | B01 B02 | CAS-R01 CAS-R25 CAS-R26 | CAS-T01 CAS-T25 CAS-T26 | One Linux candidate and unchanged registry/gates; no implicit execution authority. | Desktop chmod/copy/loader workaround, Windows PE substitution, required Hermes/OpenShell, unknown source or local-ready claim: reject. | D,A |
| CDL-T02 | CDL-R02 | D01 | B01 | CAS-R03 CAS-R26 CAS-R27 | CAS-T03 CAS-T26 CAS-T27 | Official ownership, exact immutable version/build/release/asset and native platform established from evidence. | Floating latest/range/tag, mirror/cache without trust, ambiguous publisher, alias/PATH, unsupported source or package hook: BLOCKED without fallback. | D,A |
| CDL-T03 | CDL-R03 | D01 | B01 | CAS-R03 CAS-R23 CAS-R27 | CAS-T03 CAS-T23 CAS-T27 | Every publisher-manifest field authenticated; exact payload/member digest and published size bind version/build. | Remove each field, self-supplied trust key, unsigned checksum, bad signature/attestation, weak hash, changed asset/size/build or inferred Desktop version: zero accepted payload. | D,S,A |
| CDL-T04 | CDL-R04 | D01 | B01 B02 | CAS-R03 CAS-R10 CAS-R27 | CAS-T03 CAS-T10 CAS-T27 | PUBLISHER_BUNDLE or separately admitted PINNED_GENERATOR links exact executable/inventory to complete wire bundle and CAS mapping. | RF001 docs substituted for wire data, wrong build, missing schema member, remote reference, unapproved generator argv, schema-pending treated as compatibility-ready or write into sealed root: reject. | D,S,C,A |
| CDL-T05 | CDL-R05 | D01 | B01 | CAS-R03 CAS-R05 CAS-R07 CAS-R15 | CAS-T03 CAS-T05 CAS-T07 CAS-T15 | One private protected root; minimal principals, separate synthetic scratch and sealed inert evidence. | Agent-writable ancestor, external link/hardlink, special file, setuid/capability, global mutable dependency, shell/Node fallback, account home or global PATH/profile mutation: deny placement. | D,S,O,A |
| CDL-T06 | CDL-R06 | D01 | B01 B02 | CAS-R02 CAS-R03 CAS-R10 CAS-R27 | CAS-T02 CAS-T03 CAS-T10 CAS-T27 | Complete closed relative inventory and canonical receipt cover native/platform/schema membership and access policy. | Unknown/duplicate fields, path traversal/collision/stream, extra/missing/changed/unreadable member, incomplete discovery or empty ELF loader list claimed as closure: no final seal. | D,S,C,O |
| CDL-T07 | CDL-R07 | D01 | B01 | CAS-R03 CAS-R07 CAS-R15 CAS-R27 | CAS-T03 CAS-T07 CAS-T15 CAS-T27 | Same verified executable identity reaches spawn; all dependency namespaces and bridge identities protected. | Rename/file replacement, mount substitution, link alias, changed ACL, unprotected dependency, path reopen or unsupported handle execution without proven equivalent: zero spawn. | D,S,O |
| CDL-T08 | CDL-R08 | D01 | B01 B02 | CAS-R02 CAS-R13 CAS-R15 CAS-R24 | CAS-T02 CAS-T13 CAS-T15 CAS-T24 | Fresh exact acquisition authority binds source, trust, root, endpoints, finite cumulative limits and cleanup scope. | Remove each required field, expired grant, wildcard/unlisted endpoint/redirect, unknown budget, credential use, implicit elevation or broader write scope: zero acquisition. | D,S,A |
| CDL-T09 | CDL-R09 | D01 | B01 | CAS-R03 CAS-R07 CAS-R13 CAS-R23 | CAS-T03 CAS-T07 CAS-T13 CAS-T23 | Bounded nonexecuting download/extraction in owned quarantine matches authenticated bytes and safe membership. | Retry budget reset, oversized/truncated body, archive bomb/depth/count overflow, traversal/link/device, malicious mode, postinstall/hook or parser execution: stop and retain bounded evidence. | D,S,O |
| CDL-T10 | CDL-R10 | D01 | B01 | CAS-R03 CAS-R07 CAS-R24 | CAS-T03 CAS-T07 CAS-T24 | Atomic reviewed placement into a new root, exact destination seal and intended-principal access proof. | Existing-root overwrite, digest drift, cross-filesystem non-atomic substitution, X_OK denial, unknown owner or blanket chmod/shared-parent repair: candidate remains inactive. | D,S,O,A |
| CDL-T11 | CDL-R11 | D01 | B01 B02 | CAS-R11 CAS-R27 CAS-R28 CAS-R29 | CAS-T11 CAS-T27 CAS-T28 CAS-T29 | S01..S10 evidence order preserves distinct acquisition/schema/compatibility/review/admission gates. | Missing/reordered stage, stale receipt, automatic continuation, source-selection treated as download grant or delivery treated as pilot admission: reject. | D,S,A |
| CDL-T12 | CDL-R12 | D01 | B01 B02 | CAS-R04 CAS-R05 CAS-R10 CAS-R15 CAS-R19 CAS-R24 | CAS-T04 CAS-T05 CAS-T10 CAS-T15 CAS-T19 CAS-T24 | Separately bounded exact-pin no-model probe has protection before initialization and proven owned stop within existing limit. | Auth/config discovery, network, model/tool call, schema-only thread/turn, unknown argv, escaped child, stop timeout or foreign workload signal: blocked/failed, never qualified. | D,S,C,O,A |
| CDL-T13 | CDL-R13 | D01 | B01 B02 | CAS-R13 CAS-R15 CAS-R20 CAS-R23 | CAS-T13 CAS-T15 CAS-T20 CAS-T23 | One current and at most one previous verified artifact; staging peak/reserve bounded; cleanup removes only owned new unreferenced material. | Full protected slots, low disk, third retained version, active/unresolved pin eviction, missing sole evidence, unknown ownership or link during cleanup: retain protected data and block. | D,S,O,A |
| CDL-T14 | CDL-R14 | D01 | B01 B02 | CAS-R12 CAS-R20 CAS-R26 CAS-R27 | CAS-T12 CAS-T20 CAS-T26 CAS-T27 | New candidate/revision/evidence plus drain/reconcile precede explicit rotation; reviewed rollback preserves task history. | Auto-update/fallback, moving install symlink, stale previous pin, rotation during active/ambiguous work, replay or budget reset: reject. | D,S,O,A |
| CDL-T15 | CDL-R15 | D01 | B01 B02 | CAS-R07 CAS-R15 CAS-R23 CAS-R25 | CAS-T07 CAS-T15 CAS-T23 CAS-T25 | Public projections contain only sanitized fields; private evidence bounded; unrelated Docker resources match before/after. | Private path/account/SID/secret/raw log or full private receipt in repo; redaction failure, foreign workload change or lifecycle cleanup claim: block acceptance, no repair. | D,S,O,A |
| CDL-T16 | CDL-R16 | D01 | B01 B02 | CAS-R27 CAS-R28 CAS-R29 CAS-R30 | CAS-T27 CAS-T28 CAS-T29 CAS-T30 | IDs/maps/criteria complete; unresolved source recorded and one RF010 research task recommended without starting it. | Orphan/duplicate/missing requirement/test/mapping, skipped evidence, guessed source/pin, false readiness or automatic next-task start: closure fails. | D,A |

RF009 verification covers D structure only: document validator, negative
document mutations, unchanged qualification profile/registry and read-only Docker
continuity. No acquisition, archive extraction, permission change, schema
generation, Codex/Worker/Hermes/OpenShell execution, model or C/O probe ran.
Passing this matrix's linter does not mark any row qualified or resolve B01/B02.

Follow-up [RF012 independent provenance review](direct-codex-provenance-review-v1.md)
retains DETACHED-PROVENANCE-BLOCKED and all operative acceptance rows unchanged.
Package/native inspection phase separation is a non-operative proposal; it
cannot bypass T03/T08/T09/T11 or supply C/O qualification evidence.
