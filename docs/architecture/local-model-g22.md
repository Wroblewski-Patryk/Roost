# G22 local model: bounded native and deployed evidence

2026-10-12. This records the authorized G22 implementation, isolated native
trial and read-only production release verification. Earlier failed-trial and
pre-release checkpoints remain below as historical evidence. This is not a
model-quality qualification or routing-policy decision for G23.

## Accepted boundary

One company-information task may select a managed local `gpt-oss:20b` backend
before Ready. The selection binds an exact Ollama digest, explicit low effort,
one Hermes turn, no native tools or external writes, and no fallback to Codex.
The owner separately approved a loopback HTTP observer because Ollama does not
attest the model digest in each answer. The observer checks the installed model
and serving process before, during and after the request, permits only one
model request, and records response metadata without prompt or answer content.
This cannot provide atomic proof of the weights used for each token.

The Worker uses the existing Writer, claim, lease, signed admission, Windows
Job, cleanup, and independent review boundaries. A create-only flushed marker
is written before request bytes leave the observer. A missing marker stops the
request. The result API requires a validated observer receipt before accepting
completion; the database review function refuses missing or unknown backends
and incomplete local receipts. The owner console shows requested and observed
backend separately, with token usage unknown when the provider does not report
it.

## Checks and actual result

- Installed Hermes reached exactly one model route through the observer against
  a synthetic upstream (1/1). Observer refusal/identity/stream tests passed
  12/12; the flushed marker test passed 1/1.
- Worker/packet/context tests passed 114/114. The local admission unit test,
  TypeScript check, `validate`, `codex:check`, and UI Ready tests (8 model plus
  80 browser cases) passed. A fresh disposable PostgreSQL run applied all
  migrations and passed 13/13 without invoking a provider. Security review
  found a nullable SQL refusal and an unknown-backend gap; both were fixed and
  the corrected migration was reapplied on a fresh disposable database.
- The final authorized real local trial used an isolated database and synthetic
  company source. The Windows Worker claimed the attempt and the API reported
  `completed`. The completion route accepts a company-information result only
  after validating the one-call local observer receipt and owned Job cleanup.
  The native test then failed at its obsolete `information-result.canReview`
  assertion, before invoking the independent task-review route. G11 had closed
  that legacy owner shortcut. The test now expects the shortcut to remain
  closed, but this correction has not been rerun with the real model.
- The earlier real native trial stopped without a confirmed request marker.
  Conservatively the two approved trial slots are treated as consumed. The
  model's actual provider cost and token count are not independently measured.

No production company record was changed. Disposable database and role were
removed, and the PostgreSQL container's previous stopped state was restored.
The second trial's test failed; no independent review of its concrete result,
production deployment, or read-only production smoke is claimed. The owner
approved one additional isolated trial after correction of that test. This
third trial failed before completion with `information_attempt_stopped`. Its
create-only model-request marker exists, but that marker proves only the
observer was about to send the request body, not that Ollama accepted it. The
Worker exited, while its private Writer lock and prepared checkpoint were
retained for reconciliation; the isolated database and role were removed and
the previous PostgreSQL container state was restored. No Hermes or owned model
process remained. The underlying refusal is not identified by the current
public failure code. The additional trial budget is spent. G22 remains active
and unreleased.

## Diagnostic extension after exhausted trials

The owner approved one local diagnostic attempt only: safe cause codes from the
observer, Windows Job, Hermes and Worker into a private create-only failure
checkpoint, synthetic refusal tests and independent Security review. No model
request, production data write, retained Writer-lock removal or deployment was
authorized. This code was added locally. The checkpoint records only fixed
allowlisted codes and booleans; it does not read or write prompt or answer
content. A confirmed native-stop failure takes precedence over an observer
failure, while the observer code remains separate. The Worker no longer sends
a duplicate failure report after its first report receives confirmation.

Focused diagnostics, observer and marker tests passed 15/15; a synthetic
installed-Hermes route against a fake upstream passed 1/1 without a model call.
The native Worker, Windows Job, lease and information suite passed 86/86.
`codex:check` passed. Independent Security review found no remaining P0-P2 in
this diagnostic change after the stop-priority fix. It did not verify Windows
crash durability or an uncertain response to `/actions/fail`; the latter still
requires manual reconciliation if it occurs.

The third trial predates these cause codes. Its model-request marker and
generic failure do not identify the underlying refusal, and the new diagnostic
cannot reconstruct it. The retained private Writer lock and checkpoint remain
untouched. No further native model trial, independent review of that failed
attempt, commit, push, production deployment or smoke test occurred in this
diagnostic extension. A future diagnostic trial and any Writer reconciliation
need a separate bounded approval and budget.

## One additional owner-approved native trial

The owner separately authorized one more isolated `gpt-oss:20b` trial with the
new diagnostic codes, a 600-second one-turn model limit and a conditional
standard release after full checks. The old private Writer lock was not
touched. The fixture made a fresh Writer directory and disposable database,
selected the exact installed digest and `low` effort, and used no native tools,
external writes or fallback. The real Windows Worker, installed Hermes and
Ollama completed execution `59a4ed70-9b5c-4e8b-b769-536a76ab2b32` with an
owned Windows Job and `observedBackend=ollama_loopback`. A different fixture
verifier role accepted the result through `/actions/review`, and the Task
became `done`. The native test passed 13/13. The disposable database and role
were removed and the PostgreSQL container's prior stopped state restored.
No second model attempt was made in this extension.

The test verifies native routing, exact backend receipt and independent review
authority. It checks that the answer is nonempty, but does not score its factual
quality against the synthetic source; G23 remains the separate quality and
routing-policy gate. Provider cost and token counts were not preserved in this
test report. Ollama still does not atomically attest the weights used for each
token; the admitted digest is bounded by process/store checks and the observer.

Final Security review found that `medium` and `high` effort were still exposed
for the local company-information class. The implementation now admits only
`low` in the owner UI, shared API/Worker validation and SQL risk/Ready/review
functions. The final Worker information suite passed 115/115 and the final
browser suite passed 80/80 Ready checks plus 25/25 authorization checks. Fresh
disposable PostgreSQL applied the corrected additive migration and passed
13/13 without another model call. The fake-upstream installed-Hermes route
passed 1/1. `npm run validate`, `npm run codex:check` and `git diff --check`
passed. Security found no remaining confirmed P0-P2 in its final read-only
review. At this checkpoint the code is local only; commit, push, production
deployment and read-only production smoke remain pending.

Pre-release read-back found `main` and public `/health` both at `a6818fac`, a
healthy PostgreSQL container on the retained named volume, and the prior
backend image available. Production's latest finished migration is G20; G22
has not been applied. The VPS has about 7 GB free and 7.98 GB unused builder
cache; no cleanup was run or authorized. The G20 encrypted verified backup
file still exists outside Git at the recorded 95,148,731 bytes and 2026-10-12
01:04 UTC timestamp. Its isolated restore proof is from G20; no fresh backup
or restoration was run for G22, so later production writes are not represented
by that copy.

## Release read-back and boundary

The reviewed implementation commit `4c9055b074c863e7e8125503ed6b076e0bc0e389`
was fast-forward pushed to `main`. Coolify replaced the backend and PostgreSQL
containers on the existing named PostgreSQL volume. During the handoff public
health briefly returned `no available server`; it recovered without a manual
rollback. Both public `/health` and `/v1/health` then returned `ok` with the
exact implementation commit. PostgreSQL was healthy; the G22 migration was
finished and not rolled back, and the native-review function retained the
`low` effort check. The previous backend image remained present. A read-only
query found zero production executions selecting `ollama_loopback`.

An unauthenticated information-result GET returned HTTP 401. The signed-in
owner console loaded in the existing browser session. No production company
record, Task, model attempt or review was created for smoke. VPS root free
space was about 6 GB after the build; no cache, image, container or volume
cleanup was run. The G20 encrypted backup remained present but is older than
this release; no new backup or isolated restore was claimed. The old isolated
Writer lock from the failed local trial remains retained, separate from the
successful fresh Writer. The test did not score answer quality, and no default
model-routing policy has been enabled. This meets the bounded G22 native and
deployed read-only gate. Stop before G23.
