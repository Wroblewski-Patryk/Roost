# Independent Codex provenance review v1

RF-HERMES-012, 2026-09-13. Verdict: **DETACHED-PROVENANCE-BLOCKED**.
The separate reviewer's [unchanged decision record](direct-codex-provenance-review-v1.json)
owns this verdict. Signature mathematics passes for the retained metadata, but
independently accepted trust, complete transparency verification, compressed size
and a complete acquisition authority do not. No package body was downloaded.

Follow-up [RF013 standard policy](direct-codex-standard-provenance-policy-v1.md)
recommends the maintained Sigstore JS family for qualification and remains
STANDARD-PROVENANCE-POLICY-BLOCKED. It neither extends this partial checker nor
changes RF012's evidence/verdict; the new policy owns the current next-task
recommendation and the RF012 recommendation below is historical.

## Independence and evidence

Reviewer reference: `codex-separate-agent.rf012_security_review`. A separate
agent received a fresh read-only scope, read canonical RF009–011 evidence, and
independently recomputed signature mathematics. It did not author RF011, perform
the network capture or edit this integration. The main executor preserves its
verdict and evidence digests. This is attributable author separation within the
same agent environment, not a different organization/model, human endorsement,
hardware-enforced principal isolation or satisfaction of CAS/B09 acceptance.

The review records exact SHA-256 evidence snapshots and questions, not private
reasoning. Historical document hashes identify the entry revision; follow-up
links added afterward do not rewrite those reviewed snapshots.

Public verification inputs are a [bounded projection](codex-provenance-verification-inputs-v1.json),
not complete HTTP responses. Exact DSSE signed bytes, public certificate/key
material, signatures and log proofs remain unaltered so verification can be
reproduced. Public repository/organization identifiers inside signed claims
cannot be redacted without invalidating their signatures; they are not end-user
credentials or private account data. No auth store was read.

## Capture and observed results

The fresh RF012 budget was 12 requests, 1,048,576 cumulative body bytes,
131,072 per response, 20 seconds/request and zero retries. The
[closed ledger](codex-provenance-metadata-ledger-v1.json) records **8 requests,
23,241 body bytes, 0 redirects, 1 HTTP 404, 0 transport/limit failures and
0 retries**. The largest response is 14,643 bytes. Four requests remain unused;
the ledger was not reopened. Every delivered body read was recorded before
projection. The RF011 ledger and its closed budget remain unchanged.

The requests rechecked root/platform npm manifests, attestations, npm operator
keys, a Sigstore trust-root target, exact tag reference/object and the exact
tarball URL with HEAD only. The HEAD returned HTTP 200 and zero body bytes, but
no Content-Length; compressed size remains unknown. No GET is admitted for that
tarball by the RF012 capture scope.

The attempted official Sigstore trust-root target returned 404. This is a
bounded failed lookup, not proof that Sigstore lacks trust roots. No previously
trusted bootstrap or authenticated root/checkpoint chain was established.
Another untrusted root copy alone would not resolve that policy gap, so no
additional network request was made.

The exact package remains `@openai/codex@0.154.0-linux-x64`, with the same
archive SHA-512, tag object and source commit retained by RF011. Fresh response
hashes for manifests, attestations and tag evidence agree with the RF011 ledger.
[Platform manifest](https://registry.npmjs.org/@openai/codex/0.154.0-linux-x64),
[attestations](https://registry.npmjs.org/-/npm/v1/attestations/@openai%2fcodex@0.154.0-linux-x64),
read 2026-09-13.

## Mathematics, trust and policy are separate

The [offline observation](codex-provenance-crypto-observation-v1.json) is produced
by the [partial mathematical checker](../../scripts/verify_codex_provenance.mjs).
It uses existing Node 22.13.0/OpenSSL 3.0.15+quic; nothing was installed. This
small checker is research code, not a production Sigstore/TUF admission verifier.

| Check | Result and limit |
| --- | --- |
| Registry signatures | Both signatures on each root/platform package verify with SHA-256/ECDSA using the matching observed npm public key. Its SSH-format fingerprint matches the key ID. |
| Publish and SLSA DSSE | Both signatures verify over DSSE pre-authentication encoding; statement hashes and exact package subject SHA-512 reproduce RF011. |
| Certificate claims | Leaf SAN names the expected OpenAI release workflow/tag; issuer extension names the GitHub Actions OIDC issuer, source repository/ref/commit match, and code-signing EKU is present. The certificate chain and SCT are unverified. |
| Log payload binding | Logged signature, public key and payload hash match each envelope. |
| Merkle inclusion mathematics | Both paths recompute the supplied root; root/tree size agree with the supplied checkpoint text. That root/checkpoint is not independently authenticated. |
| Transparency authentication | Log key trust, signed-entry timestamp, checkpoint signature, trusted integrated time, freshness/consistency/witness policy and shard-index binding remain unverified. |
| Source/build semantics | Declared exact repository, workflow, tag, commit and GitHub-hosted builder match the expected candidate. Unauthenticated claims do not satisfy semantic admission policy. |
| Overall provenance | BLOCKED. A mathematically correct signature does not establish who is trusted to sign or authorize acquisition. |

The npm key was obtained from the [official operator key endpoint](https://registry.npmjs.org/-/npm/v1/keys).
This supports reproducible mathematical verification, not self-approval of a
Roost trust/rotation policy. The captured current key has no declared expiry;
the other advertised key is expired. No missing expiry is interpreted as
perpetual accepted authority.

The leaf's short validity interval contains the *claimed* log integration time.
The current date is outside that leaf interval; historical keyless verification
therefore depends on authenticating the logged time and accepted historical root
policy. Neither was proven here. Outer log indices differ from inclusion-proof
indices; the checker uses each proof's own index for mathematics and explicitly
leaves shard mapping unverified. It neither calls the difference malicious nor
silently treats the two indices as interchangeable.

## Threat and manifest findings

| Risk | Required boundary / current finding |
| --- | --- |
| Unsigned/mutable tag | Discovery only; authenticate the exact commit and package digest under accepted signer/build policy. Matching unsigned tag objects alone is insufficient. |
| npm account/registry compromise | Registry possession/signature cannot substitute for an independently authorized build identity. Require the accepted publisher and build-provenance chain together. |
| Workflow/source/toolchain compromise | Valid provenance identifies asserted build inputs; it does not prove benign source, safe workflow dependencies, compiler integrity or malware freedom. |
| Metadata mutation/substitution | Exact signed archive digest, package subject, commit/ref/workflow and hash-bound review receipts must all match; changes require a new candidate/review. |
| Replay/equivocation | Trusted time, pin freshness/expiry, authenticated log checkpoint and applicable consistency/witness policy remain blockers. Isolated Merkle mathematics does not exclude a split-view log. |
| Missing SBOM/member manifest | Not established. A locally derived inventory is not a publisher claim, dependency closure or SBOM. |
| Hooks/dependencies | Root manifest has a Node bin and optional platform aliases. Platform captured bin/files/scripts/dependencies/optionalDependencies are null; OS/CPU are linux/x64. This does not prove absence of embedded hooks/helpers or native discovery. |
| Execution/schema | No npm install, lifecycle hook, mutable dependency resolution or Node wrapper is a delivery route. PINNED_GENERATOR_CANDIDATE remains separate and unauthorised for execution. |

## Two-phase acquisition proposal — non-operative

The reviewer considers a two-phase policy technically defensible under strict
conditions, but recommends retaining the operative delivery contract while trust
is unresolved. **No CDL-R03/T03 prerequisite is weakened or waived in RF012.**
The current published compressed-size/native-member requirements and coupled
CDL-R08/R09/R11 clauses remain in force.

A later explicit revision would need to distinguish:

1. **Before download:** independently authenticate exact package identity, archive
   digest, source commit/workflow/issuer and trusted time/log evidence; approve
   one exact endpoint, an independently justified streaming cap, finite duration,
   staging/reserve/member/depth budgets, nonexecuting quarantine and owned cleanup.
   Neither unpackedSize nor HEAD alone becomes authenticated compressed size.
2. **After bounded download, before any archive parser:** compute the full archive
   digest and actual compressed byte count; require the authenticated digest
   match. Reject mismatch/truncation/overflow without decompression. An unknown
   published size needs an expressly approved alternative streaming-cap policy.
3. **Static quarantine inspection:** only then perform bounded nonexecuting
   decompression/inspection to determine exact members, native size/SHA-256 and
   ELF/platform identity. Reject bombs, excessive count/depth/size, traversal,
   absolute/colliding paths, symlinks, hardlinks, devices and other special files.
   Do not apply archive ownership/permissions or run hooks. Seal the complete
   inventory as derived local evidence, distinct from publisher declarations.
4. **Before placement or execution:** independent receipt review must bind the
   exact downloaded archive and derived inventory/native digest to protected
   placement and separately granted authority. Failure cleanup is confined to
   proven task-owned staging and preserves unresolved sole evidence. Schema
   generation/App Server remain separately gated.

Computing native hashes necessarily requires reading decompressed member bytes;
it cannot precede all decompression unless the publisher supplies an authenticated
member manifest. Hash-before-unpack means full package verification occurs before
the archive parser is invoked, not that native identity is guessed beforehand.
A revision must update R03/T03 and the coupled R08/R09/R11/T08/T09/T11 acceptance
and authority fields together; this proposal changes none of them today.

## Qualification, checks and next task

CDL-R02/03/T02/T03 remain blocked by accepted publisher/build trust; R08/T08 by
complete acquisition authority; R09/T09 by unperformed bounded inspection;
R04/12 and T04/T12 by exact-build schema and separate probe authority. R15/T15
retain workload/privacy controls. D01/B01 and B02 stay open. Existing CAS-R03,
R07, R13, R23, R27–R29 mappings and all 16 CDL/30 CAS test families remain intact.

Profile revision 3, 75 values, 53 technical nulls, seven research values and nine
blockers are unchanged. implementationReady=false, executionSupported=false,
pilotReady=false, liveAdmissionAllowed=false and acquisitionReady=false.

Validation includes capture method/budget/closure tests, mathematical corruption
fixtures and negative review-record fixtures, plus existing delivery,
qualification, CAS and source-research validators. These tests do not provide
runtime, archive-parser or OS-enforcement evidence. Docker continuity is checked
read-only before/after; no runtime/API/DB/registry, production, installed component
or Docker/WSL lifecycle change belongs to RF012.

Completed checks: 10 capture tests, six Node mathematical/negative tests, four
review-record test methods and four source-research test methods pass. Review,
delivery (16 families), CAS (30 families), qualification, RF011 source research
and RF008 preflight validators pass. No runtime/integration or archive-parser
tests ran because acquisition/execution is outside this task.

The main executor's native Docker read-only snapshots match: 4 containers,
5 networks, 107 volumes and 16 image rows, including identical selected
container identity/state/start/restart and inventory digest
`328c45deb5fb79f841aafbfb974beb261c37b5708140102d1c63e43c02a03bf0`.
No unrelated workload was changed. This continuity observation is the executor's
evidence, not an action claimed for the independent reviewer.

Exactly one recommended next atomic task: **RF-HERMES-013 — independently anchor
the candidate's trust and transparency verification policy under a fresh bounded
metadata-only task.** Establish an approved Sigstore/TUF bootstrap and npm key
policy, authenticated certificate/log/checkpoint/time evidence and exact
publisher/workflow/source semantics, or retain precise BLOCKED reasons. Preserve
the current acquisition/execute gates; do not download a package, install a
verifier or run a generator implicitly. RF013 was not started here.
