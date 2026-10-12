# G24a reference site study

## Authorized outcome and boundary

For one assigned informational task, an authorized agent may inspect exactly two
owner-approved public reference sites and submit dated, sourced observations of
visible content, functions, journeys, failures, uncertainty and possible
applicability. Findings remain unverified in the existing Finding ledger.
Independent verification, promotion to a checklist or procedure, use in an
application, and source-site changes are later gates. The owner must separately
approve the exact content of any production Finding before it is written.

The owner later replaced the unsuccessful live browser route with two curated,
versioned packages from the exact saved OpenAI Sites versions. This is the
current G24a route. Each private package identifies the Sites project, saved
version, source commit, provider archive digest, preparation date and every
curated observation's evidence type, reference and digest. Source inspection,
published screenshots and supervised click results have distinct evidence
scopes; source code alone cannot establish published behavior. The packages
contain selected public observations and unknowns, never whole repositories,
secrets or customer data. The existing exact-task CompanySourceReview remains
the admission boundary, and Findings remain dated and unverified. No real
production Finding is written without separate approval of its exact content.

The earlier browser reader, renderer, egress proxy and four-service topology
are local historical work and were not released as G24a. The normal Roost
release followed verification of both exact packages, isolated
native/API/MCP/UI tests, Security/UX review and preflight. The production
smoke was read-only.
Site addresses and IDs remain private installation configuration.

## Superseded browser design and evidence

- Owner-created `reference_site` CompanyRecords carry exact HTTPS URL, source ID
  and declared provider version. Existing task-bound CompanySourceReview binds
  the current record revision and content digest. Only a current approved
  review admits agent access.
- A task-scoped API/MCP route projects eligible sites; another renders one exact
  site. On submission, the server renders again, checks the content digest and
  source excerpt, and writes a new `reference_site` Finding with task, site,
  revision, review, timestamp and digest. An application Finding remains a
  distinct subject. Existing application-specific verification, merge,
  occurrence, triage and conversion commands reject site Findings.
- The backend calls a private renderer; it never launches Chromium. The
  renderer has no database or backend credentials and no public port. It runs
  Chromium as a non-root user with its sandbox enabled, resource limits and a
  private network. A separate egress proxy is the sole outbound path and
  permits HTTPS CONNECT to the two configured public hosts only. The browser
  also restricts requests to same-origin GET, the exact initial URL, bounded
  transfer/time, and no cookies or form actions. A mismatch or uncertainty
  denies capture and Finding creation.
- The owner console exposes current source approval and the unverified
  observation with provenance in Polish and English. It cannot approve or
  promote a Finding in G24a.

## Historical renderer checkpoint (2026-10-12)

The additive migration and its follow-up alias correction applied in fresh,
disposable PostgreSQL databases. A focused HTTP/SQL test passed one agent
Finding creation, idempotent replay, task-specific review visibility, owner
write denial, source revision invalidation and site-occurrence denial. Seven
source/capture policy tests, the PL/EN owner-console fixture, `validate` and
`codex:check` passed. These are isolated checks; they do not prove the browser
or deployment topology. No production migration, source record, approval,
Finding or site write has occurred.

**Safe stop after the one approved experiment:** Earlier CDP interception and
Playwright `route.fetch` shared Chromium's cookie jar, so neither prevented
first-party cookies from leaving. A fresh, stateless HTTPS request context per
resource, through the approved CONNECT proxy, passed the isolated fixture:
zero outbound cookies for main HTML, JavaScript, CSS and fetch; exact host;
redirect, POST, third-party and size denials. The production helper uses this
mechanism and strips `Set-Cookie` before browser fulfillment. Playwright buffers
responses without `Content-Length` before exposing them, so the renderer needs
a hard memory limit as an outer bound.

The one live diagnostic read of the two owner-approved Sites did **not** pass
the capture acceptance policy. Site 1 returned main HTML 200 and rendered
3,485 text characters with 42 links, zero cookies sent or stored, and 394,061
transferred bytes; one request was denied for leaving the exact origin and four
resource responses were denied for status. Site 2 failed on its first proxy
resource fetch (`proxy_fetch_failed`), with zero bytes and zero cookies. This
diagnostic does not establish a complete capture or a Finding for either Site.
The temporary host harness was removed. No repeat request or workaround was
attempted. The renderer and proxy scripts remain local, while Compose is
unchanged; no release should use this checkpoint. The approved experiment is
consumed, and G24a remains blocked pending a separately approved bounded
diagnosis of the actual resource/proxy failures and a revised safe policy.

**Resumed diagnosis checkpoint:** The owner authorized one corrected read of
both Sites only after the saved failures had been diagnosed, their causes
repaired and tests changed. The saved result does not contain the failed
resource type or host class, the four HTTP status codes, or the underlying
exception for Site 2. It contains only the generic codes above. A fresh DNS
lookup for Site 2 still returned two A and two AAAA records, all passing the
proxy's public-address check; this cannot establish the prior TLS/CONNECT
failure. The proxy had a concrete error-handling defect: its pre-connect
`error` listener destroyed the client before a 502 could be returned. Local
code now returns a bounded 502 and records only a fixed failure class. The
renderer and capture helper similarly classify request/transport failures
without URLs or response content. Isolated capture tests passed 5/5, proxy
and renderer tests 7/7, and the server build passed. These fixes improve
diagnosis but do not prove either Site can be fully read. No live retry was
made; the one approved corrected read is still unused. Recovering the actual
missing cause requires a separately approved diagnostic network read before
any cause-specific repair or corrected full read.

**One separately approved diagnostic read (2026-10-12):** The owner approved
one additional read before correction. It used the same exact two-host CONNECT
proxy and stateless per-resource HTTPS fetch; no cookie was sent or retained,
and no page content was saved. Site 1 returned the main document with HTTP 200,
3,485 rendered text characters, 42 links and 394,061 transferred bytes. One
stylesheet requested an unapproved host and was blocked before egress. Three
images returned HTTP 403 and one script returned HTTP 302, which the no-redirect
policy denied. Site 2 returned its main document with HTTP 200 and 777,536
transferred bytes, but rendered zero text and links; three scripts, three images
and six fonts returned HTTP 403. The proxy recorded no DNS or CONNECT failure
in this read. The prior generic `proxy_fetch_failed` therefore did not recur;
its exact historical cause remains unknown.

The diagnostic read is consumed. The single owner-approved corrected full read
remains unused. A complete capture cannot be claimed under the current exact
host and response policy: Site 1 requests a third host and both Sites have
denied or redirecting resources; Site 2's client-rendered body remained empty.
No host allowlist, redirect, cookie or network policy was broadened. No Finding
or production write was made. G24a stays blocked before Compose integration,
independent Security/UX review, commit, push and deployment. A new owner scope
decision is needed if use of the third host, redirected script or provider
access method is contemplated; any such proposal must preserve a separately
reviewed isolation and provenance contract.

## Versioned-package checkpoint (2026-10-12)

Both exact saved Sites versions are available at their pinned source commits.
One was inspected in its source checkout; the other was inspected in a separate
clean read-only checkout. Neither whole repository is copied into Roost. The
two private curated packages each contain seven selected observations and
explicit unknowns. Every cited source file was checked against its pinned
commit; the saved published screenshots and supervised click-result files were
separately SHA-256 checked. Each published site had one supervised navigation
path and one detail interaction inspected. No form was submitted, no external
link followed, and no cookie decision made. A screenshot
does not prove an unvisited interaction; a source file does not prove the
published deployment. The package records these scopes separately.

The server validates the package identity, evidence scope and bounded content,
then computes its digest before a `reference_site` CompanyRecord can be created.
Evidence file bytes were checked privately during preparation; the server does
not dereference those files. Its current
task-bound CompanySourceReview admits an agent to read that exact package via
API/MCP. A Finding request must cite its current package digest, observation
ID, source review and record revision, and quote an excerpt in that observation.
The Finding ledger stores it as dated, unverified and site-specific. Application
Finding commands cannot act on it. The PL/EN owner panel shows version, digest,
observation evidence scopes, unknowns and agent Findings. The private package
files and screenshot/click evidence remain outside the repository. No production
source record, review or Finding has been written for this gate.

## Historical release criteria and rollback

Before push: inspect the migration for data loss and application Finding
regression; run isolated PostgreSQL with exact task/site/key and stale-review
denials, package-provenance checks, PL/EN owner UI, API/MCP checks, `validate`,
`codex:check`, Security/UX review and resource preflight. Do not release the
superseded renderer, egress proxy or four-service topology. Deploy by the
normal path only if all gates pass. Production smoke reads health and the
scoped owner projection; it creates no Finding. Rollback restores the previous
backend image while preserving the additive schema and all records.

## G24a release and limits

The two exact, private curated Sites packages were checked against their saved
source commits, published screenshots and supervised click evidence. Each has
seven selected observations and explicit unknowns. The package bytes and
evidence remain outside Git. The released code validates package identity and
provenance, requires a current task-bound CompanySourceReview for agent read,
and records only dated, unverified, site-specific Findings. The earlier
renderer, egress proxy and four-service Compose design were excluded from both
scoped commits.

The additive migrations and their data-loss review passed isolated PostgreSQL
tests. Focused HTTP/SQL, API/MCP and package tests covered exact task/source/key
access, stale revisions, replay and refusal paths. The PL/EN owner fixture
covered package creation, source review, package/Finding read and the entry
from the canonical Operations task view. It also verified that an unsent
ClickUp status selection cannot be discarded through that entry. The existing
ClickUp UI regression passed 4/4. `npm run validate`, `npm run codex:check`,
`npm run typecheck`, `git diff --check` and the independent Security/UX review
passed for the final UI repair.

Commit `19c3a4b8` delivered the source/API/schema capability; commit
`ca88d04c` connected the owner panel to the canonical Operations route.
Coolify reported a successful deployment of `ca88d04c`; both public health
endpoints returned `ok` with its exact full commit. In the signed-in owner
console, a current task opened the G24a panel and showed the truthful empty
source state. The smoke made no production source, review or Finding write.
The two configured URLs were present in the running backend. VPS free space
was 3.0 GB after the UI build. Two separately authorized prunes removed
2.494 GB and 1.247 GB of unused builder cache before the UI and final evidence
builds; free space was 4.1 GB before the latter. The final evidence commit
`844f29e8` is on `origin/main`; Coolify reported success, and both public
health endpoints returned `ok` with its exact commit. The signed-in owner
panel still opened to the truthful empty state after that deployment. VPS free
space was 1.8 GB after the final build, so another release requires a fresh
capacity preflight and separate authority for any cleanup.

This proves the bounded mechanism and read-only production view. It does not
prove a real production agent study, owner-approved source review or Finding:
those require separate approval of the exact content. G24b is not authorized.
