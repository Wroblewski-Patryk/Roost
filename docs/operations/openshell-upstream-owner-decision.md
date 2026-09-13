# Upstream owner decision packet (RF-HOST-045)

**OWNER-UPSTREAM-DECISION-PACKET-READY** means local decision material is complete.
Owner decision is pending. No publication, implementation, install or runtime is
approved. Recommendation: **A**, a feature-request issue only, subject to the
checks and exact-text approval below. It can clarify upstream interest without
committing to a downstream implementation or its maintenance.

The [versioned packet](../../config/openshell/upstream-owner-decision.json) binds
this page, the [public issue draft](openshell-upstream-nonwriting-issue-draft.md)
and the [public appendix](openshell-nonwriting-public-appendix.md). Public draft
files contain only proposed public content; neither has been submitted. The
first issue line is the exact proposed title and the rest is its body. The
appendix can be pasted inline in that same future issue; a separate gist or
upload would be a second write and is outside this choice.

## Exactly three owner options

### A. Publish one feature-request issue only after separate owner approval and all prepublication checks; no code contribution. Recommended.

- **Agent hookup:** No immediate hookup. Execution remains blocked until an official qualifying release and independent admission; maintainer timing is unknown.
- **Tokens and maintenance:** Low initial drafting and review cost; bounded follow-up discussion may need a separate task. No downstream code maintenance commitment.
- **Security:** Public text cannot be fully recalled; privacy review is required. No runtime exposure is added and no enforcement requirement is relaxed.
- **Upstream dependence:** High: acceptance, scheduling, implementation and release remain upstream decisions; filing promises none of them.
- **Reversibility:** The decision can be declined before posting. A posted issue may be closed later, but public copies/history may persist.

### B. Do not publish now; periodically inspect official stable releases in separately authorized checks while execution stays blocked.

- **Agent hookup:** Deferred until official support is discovered and qualified; no date is promised.
- **Tokens and maintenance:** Repeated bounded release reviews consume tokens/time; no fork maintenance. No monitor or recurring automation is created by this packet.
- **Security:** No new public disclosure or runtime exposure; avoid treating old snapshots as current or relaxing admission while waiting.
- **Upstream dependence:** Very high and passive: upstream must independently prioritize the capability.
- **Reversibility:** Easy to reconsider later; time spent waiting cannot be recovered.

### C. Separately approve preparation of an upstream contribution, conditional on contribution rights and current upstream rules; no permanent downstream fork.

- **Agent hookup:** Uncertain and likely longest: accepted scope, contributor eligibility, design, implementation, qualification and official release precede hookup.
- **Tokens and maintenance:** Highest: investigation, design, tests, review iterations and temporary branch maintenance need a separately bounded budget; no permanent patch support.
- **Security:** Future low-level containment changes carry implementation and regression risk. This option authorizes no code, install or runtime now; exact scope requires separate approval.
- **Upstream dependence:** High: maintainers control acceptance and release. First-time PR eligibility requires a human-written vouch request unless exempt; no request is prepared or sent here.
- **Reversibility:** Preparation can be stopped with sunk effort. Future public submissions are persistent; no maintained private fork is a fallback.

## Historical evidence and public channel

The [RF044 manifest](openshell-official-release-inspection.md) is used only as a
historical snapshot: checked **2026-09-13T02:07:56Z**, expiry
**2026-09-13T03:07:56Z**, recorded verdict
**OFFICIAL-RELEASE-NO-QUALIFIED-CANDIDATE / NO-NEWER-STABLE-RELEASE**.
It cannot establish today's release state or satisfy publication freshness,
even if this document is read before its original expiry. No network refresh
was performed. The v0.0.116 source assessment retains 0 PASS, 11 BLOCKED and
5 UNPROVEN requirements; all 35 negative cases remain unexecuted/UNPROVEN.

The unchanged [RF043 proposal, acceptance and schema](openshell-nonwriting-stdio-proposal.md)
remain pinned. All 16 requirements and 35 negative cases map exactly once to
seven appendix concerns in the packet. Its receipt schema is one possible
direction, not a mandated upstream API. No v1/v2/v3 contract, fixture, parser,
release manifest, image or installation pin changes. Runtime policy hash stays
null; all implementation/execution/pilot/live-admission flags stay false.

Seven retained files were checked against exact Git blob and SHA-256 identities
at commit `d1155aa70042d3e2ee49dbfa15346b108b7c1d92`: CONTRIBUTING.md, SECURITY.md,
LICENSE, docs/CONTRIBUTING.mdx and feature/bug/config issue-template files.
No Code of Conduct file was found in the retained complete Git tree; that says
nothing about an organization-wide policy or later repository version.

The pinned [feature template](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/.github/ISSUE_TEMPLATE/feature_request.yml)
requires story, problem, impact, workflow design, observable acceptance,
alternatives and review declarations. Blank issues are disabled. The draft
matches those sections and discloses static agent investigation. Its existing
issues/architecture checkbox remains unchecked because online review is pending.
New features start as issues; an RFC is only requested/numbered by maintainers.

This is a stricter capability gap, not an active exploit or security advisory.
Under pinned [SECURITY.md](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/SECURITY.md),
a suspected vulnerability belongs in NVIDIA's private disclosure channel, not a
public GitHub issue. Reclassification would stop this public submission path.

Pinned [CONTRIBUTING.md](https://github.com/NVIDIA/OpenShell/blob/d1155aa70042d3e2ee49dbfa15346b108b7c1d92/CONTRIBUTING.md)
requires duplicate search and leaves implementation decisions open. Substantial
issue-backed work normally awaits maintainer acceptance or direct invitation.
First-time PR authors need a vouch unless exempt; the owner must write that
request personally, because AI-generated vouch requests are rejected. No vouch
is needed for filing a feature issue under these retained instructions.
Contributors must understand their code, include DCO sign-off, and update/test
user-facing documentation with behavioral changes. LICENSE identifies
Apache-2.0; this records the retained text, not a determination of the owner's
rights or current eligibility. Option C requires those checks separately.

## Prepublication checklist, all pending

1. Obtain newly authorized fresh official release evidence; this historical snapshot cannot satisfy publication preflight.
2. Online, confirm current CONTRIBUTING, SECURITY, feature template, architecture guidance and account eligibility. Use Feature Request only if this remains a capability gap; suspected vulnerability follows the current private channel.
3. Search open and closed upstream issues for this need. Stop for owner review if a duplicate or supported solution exists; do not post a comment instead.
4. Review exact title/body/appendix for secrets, personal/company/deployment identifiers, private paths and unsupported security claims.
5. Present the final title/body/inline appendix and their updated hashes for explicit owner approval after preflight; approve destination and exactly one issue creation. Resolve the unchecked template declaration truthfully. Any text change requires a new reviewed revision.
6. Only after all preceding checks and explicit approval, create exactly one issue with the appendix inline. No gist, attachment upload, comment, PR or other write is included; an ambiguous response requires read-only reconciliation, not an automatic retry.

This checklist is not authorization. Issue-only approval does not authorize code,
fork, PR, installation, runtime or follow-up communications. Options B/C also
need an explicit later owner decision; no monitoring or implementation starts.

## Deterministic local verification

The [validator](../../scripts/openshell_upstream_decision.py) reads bounded local
files only. It binds the packet and exact normalized public/owner texts, verifies
three complete options with one recommendation, seven groups covering 16/35,
all-false action flags, historical-only evidence and immutable RF043/RF044
identities. It rechecks all 37 source files plus seven governance files.
It cannot publish, refresh evidence, grant admission or execute upstream code.

```text
python -B scripts/openshell_upstream_decision.py --upstream-root <verified-source-root>
python -B -m unittest discover -s scripts -p test_openshell_upstream_decision.py
```

Tests include omitted options/tradeoffs, hidden authorization, unsafe workarounds,
private data, stale-as-fresh claims, incomplete coverage and text/hash drift.
READY exit 0 means decision-packet integrity only; invalid input gives BLOCKED
exit 2 with every authority flag false. Full application builds and upstream
runtime/adversarial tests are outside this local document task.

Only Engine version and container names/status, network, volume and image
inventories are read for continuity. No workload payload, network request,
Docker action, WSL/recovery/lifecycle operation or agent execution is included.

Exactly one next action: present these three choices to the owner for a decision.
Do not automatically start another task.
