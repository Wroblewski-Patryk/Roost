# OpenShell issue publication outcome (RF-HOST-047)

**UPSTREAM-ISSUE-AUTH-BLOCKED**, checked **2026-09-13T11:14:55Z**.
The owner approved one creation using the exact
[RF046 title and body](openshell-prepublication-issue.md). The existing GitHub
integration rejected that single attempt with HTTP 403,
`Resource not accessible by integration`. There were **one create attempt and
zero successful external writes**. No retry was made.

| Publication field | Result |
| --- | --- |
| Target repository | NVIDIA/OpenShell |
| Public issue URL / number | None |
| Published at | None |
| Public readback title/body hashes | Not available; no issue was created |
| Approved title SHA-256 | `4f971e0ced1fe7910eb6cd9944f72672cb10a898b454566229227df95b5add29` |
| Approved body SHA-256 | `2dc092c0d70f88309a1da42a9384c3247d3e27a41045c9fa5b04c25623f9222b` |
| Approved canonical payload SHA-256 | `ec617fe12f291feff5d3e60c2092a59368339f699916f486fb4667e955d5fc01` |

The read-only prewrite check completed at **2026-09-13T11:14:33Z**. Latest stable
remained v0.0.116, the complete tag-ref inventory was unchanged, and default
branch `main` still resolved to `5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0`.
CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, LICENSE, the feature-request template
and issue configuration were byte-identical to the RF046 evidence. The public
repository was active with issues enabled. Existing authentication succeeded;
it did not prove that this integration could create an issue in this repository.
The create response established that limitation.

Six complete, bounded public issue/PR queries covered the exact title,
nonwriting, read-only rootfs, workspace-none, immutable stdio, and updates since
the RF046 inspection began. They included open and closed results. No duplicate
was found within that search; the closest prior related issues remained related.
An authenticated exact-title/author search also found no match. After the 403,
read-only exact-title and exact-title/author reconciliation again found zero
matches. These are dated index observations, not a claim of exhaustive search.

The exact text passed integrity, privacy and accuracy review. It remains a
feature proposal with no vulnerability allegation. The attempted create supplied
only repository, title and body, with no labels, assignees, milestone or upload.
Private evidence and the one-use attempt receipt remain outside the repository;
no account identifier or credential is recorded here.

The publication authorization was limited to this single attempt. It grants no
retry, authentication change, follow-up comment, edit, PR, contribution, install,
runtime execution or deployment. The RF046 packet and earlier decision artifacts
remain immutable historical records; their pending decision described that
earlier phase. This outcome supersedes that pending publication status without
changing any runtime admission or policy identity.

Local verification: the ten focused prepublication tests, exact payload and
historical packet integrity checks, changed-document privacy/link checks and Git
diff checks passed. Read-only before/after Docker continuity and all sixteen
pre-existing OpenShell JSON byte identities matched. Application builds and
runtime/adversarial tests were outside this documentation/publication task.

Exactly one recommended next task is an audit of official Hermes mechanisms for
Codex and isolation, without assuming OpenShell is mandatory. That audit has not
started; this task creates no automatic continuation.
