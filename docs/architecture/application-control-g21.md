# G21 application control

## Accepted boundary

G21 connects an application's own operation projection to its exact Task and
Decision records, then returns the owner to the same application. It uses the
existing takeover baseline, task risk scope, Decision, review and release
records. The application projection does not grant execution, declare product
or sale readiness, or repair another application's repository. The production
check is read-only; creating a new company task or running a model is outside
this gate.

## Owner path

The portfolio operation view distinguishes a declared profile stage from a
stage supported by accepted evidence. It surfaces application blockers above
the gate summary, with exact Decision or Task links where a record exists. A
pending Decision exposes the Task in its own scope, rather than the nearest
unrelated outcome. A current accepted takeover Decision also exposes its own
audit Task when that Task remains scoped to the application. Each cross-area
link carries the application ID as a return hint. The destination re-reads the
workspace-scoped application projection and exact record before enabling the
return path. Malformed, duplicate, foreign or stale hints are discarded. The
validated route survives sign-in and reload. PL and EN owner labels are
provided for these controls.

The operation projection selects each Task's latest TaskRiskScope before
filtering by application and bounding the result to 100 distinct Tasks.
Repeated revisions therefore cannot hide an older current audit Task. Moving
a Task and its project to another application removes that Task from the
former application's nearest outcome, blockers and Decision links. An accepted
baseline is shown only while its existing native evidence validator still passes. A source
change can make it stale; historical acceptance is not a current stage claim.

## Agent boundary

The existing task packet remains the authoritative input for a managed
execution. For a bound Worker requesting the application execution profile,
the API requires the exact execution, workspace, task and application, a
current nonterminal attempt, an uninvalidated context and a current Ready
contract. These checks and the application context read run in one serializable
transaction. A foreign application is denied; a changed TaskRiskScope
invalidates the running attempt and denies further task and application
context reads. The owner application view remains a separate authenticated
read and does not expose Worker authority.

## Verification and release

Focused projection and navigation tests passed 38/38. The disposable
PostgreSQL HTTP/browser fixture passed 1/1: bound
Worker context for application A, no foreign record, application B refusal,
terminal attempt refusal, Task reassignment A to B, invalidated running
attempt refusal, and PL/EN browser routes at 390, 834 and 1440 CSS pixels.
The host's native fresh-context test suite passed 39/39, including changed
application and revoked-access refusal. The later 101-revision PostgreSQL
regression and moved-Task native test passed 2/2, and the operation service
unit suite passed 10/10. `npm run validate`, `npm run codex:check` and
`git diff --check` passed after the final code change. The disposable test
database and temporary role were removed after the run.
The browser checks use synthetic apps without an accepted takeover baseline;
they prove navigation mechanics, not a current business baseline. The current
baseline projection and its exact audit Task have separate unit coverage.
Independent Security review found no remaining P0-P2 after transactional
status and Ready rechecks; it also reviewed the final current-scope query.
Independent UX review found no release-blocking defect after inspecting the
updated PL/EN, mobile/tablet/desktop screenshots and exact Task content.

The G21 commits `150c11e0`, `0b3f1218`, `df6db6f7` and `c16efcf6` were
fast-forward pushed to `main` and deployed through the standard release path.
The last two corrections were found by signed-in, read-only production checks:
the accepted Decision first exceeded the runtime response boundary, then its
exact audit Task was hidden by a page of newer risk-scope revisions. The
Decision response now projects bounded Task readiness, and the operation query
selects current distinct Tasks before applying its page limit. The production
health endpoint reported the exact final code commit with HTTP 200;
PostgreSQL was healthy. In the owner console, the accepted baseline Decision
opened its exact audit Task, which returned to the same application. The
application displayed a concrete blocker and kept product and sale readiness
unverified. These production checks did not edit company records or launch a
model. The runtime automatically created two technical incident records when
the earlier read-only Decision requests were rejected; those records remain
in the audit history. A real production Worker execution and a wider
application-readiness claim are outside this proof. Provider cost and token
usage were not observed.
