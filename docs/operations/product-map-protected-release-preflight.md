# Product Map Protected Release Preflight

Last updated: 2026-07-28

## Purpose And Boundary

This is the mandatory entry packet for the future Roost Product Map release
tracked by [LUC-1910](/LUC/issues/LUC-1910). It binds the Paperclip projection
runtime acceptance, Roost production promotion, rollback, smoke, and monitoring
prerequisites into one fail-closed gate.

Preparing or updating this packet does not authorize a push, deploy, restart,
configuration change, protected smoke, secret access, or production mutation.
The release remains `NO-GO` until every mandatory gate below has current
evidence for one exact candidate SHA and the DRE records a final `GO` decision.

Lifecycle stage: release preflight. Accountable gate owner: 09 DRE (Deployment
& Reliability Engineer). Escalation owner: 09 CTO (Chief Technology Officer).

## Time-Bounded Baseline

The following read-only observations were collected on 2026-07-28. They are
orientation evidence, not release acceptance.

| Surface | Observation | Release interpretation |
| --- | --- | --- |
| Roost owner remote | `origin` resolves to `https://github.com/Wroblewski-Patryk/Roost.git`; deployment branch is `main` | owner/branch identity is known |
| Roost source | local `main` was clean at `0c2b5e7925540599a9f0ad84375ab09dfd4d5018`; live `origin/main` and the local tracking ref were `070b150f5477d701d462485aad8b91450d0c3d71`; local was `82` commits ahead and contained `origin/main` | no release candidate is selected; local HEAD must not be pushed as an implicit batch |
| Public Roost runtime | `GET https://api.roost.luckysparrow.ch/health` returned `status=ok`, build commit `070b150f5477d701d462485aad8b91450d0c3d71`, and image `unknown`; web and API roots returned `200` | uptime and deployed SHA are known; rollback image provenance is not current enough for release acceptance |
| Coolify target | project `Roost` (`d1203xzl7e8csh848aj031xp`), environment `production` (`y106ybhx7fsfupe1jb012zm5`, internal id `12`), application `Roost` (`rnqqkhl3o3dut4qv56mlxly2`), server `localhost` (`g9wxtiwh5k1rebqww89gt9nd`) | exact target identity is known and must be re-read immediately before promotion |
| Coolify state | application `running:unknown`; server API reported reachable and usable; application restart count `9`; latest recorded restart was type `crash` at `2026-07-11T13:52:54Z`; CPU and memory limits are both `0` | current runtime is reachable, but status quality, capacity headroom, and crash history require entry-time inspection |
| Paperclip projection source | source-reviewed endpoint `GET /api/companies/{companyId}/softwarehouse/portfolio-projection/v1` at Paperclip commit `1f8950aa818c2762a1694cae42bf35f9ab7984ca` on `codex/rolling-work-queue` | source is accepted; strict-3200 runtime acceptance is still outstanding |

Credential bindings were checked by name and presence only. The future gate may
use the configured `COOLIFY_BASE_URL`, least-privilege read/status token,
separately scoped deploy token, and `ROOST_PROD_TEST_*` account bindings. Values
must never be printed, copied into commands, committed, attached, or included in
issue evidence.

## Mandatory Gate Matrix

| Gate | Required evidence | Owner | Current state |
| --- | --- | --- | --- |
| PMAP-REL-G01 Candidate provenance | Clean Roost worktree; exact 40-character Roost candidate SHA; owner remote; `main` target; live remote ref readback; approved commit range; exact publisher implementation commit/artifact and supervised-service definition; accepted Paperclip source commit; candidate contains the accepted Product Map consumer and no unrelated packet | Engineering Delivery + TSA + DRE | blocked: future Roost candidate and publisher artifact are not selected |
| PMAP-REL-G02 Independent acceptance | [LUC-1910](/LUC/issues/LUC-1910) implementation evidence plus independent QA, security/privacy, review, documentation, and release approvals tied to the same candidate SHA | EDL, QVE/TAE, SPA/CLO, Docs, DRE | blocked: release parent not implemented/accepted |
| PMAP-REL-G03 Coolify and publisher-host identity/capacity | Re-read exact project/environment/application/server UUIDs; no unexpected deployment in progress; server reachable/usable; disk has room for build plus current and rollback images; memory/CPU have headroom for build and canary; no high-disk or capacity alert; canonical local publisher host and supervisor identity; no new listener, fallback port, second Paperclip/Roost instance, or unmanaged watcher | DRE | partially verified: Coolify identity known; remote and local headroom plus publisher supervisor remain unverified |
| PMAP-REL-G04 Config, persistence, migration, and retention | Names-only inventory for target URL, owner-company/workspace binding, Paperclip route-read credential, Roost ingest credential, and optional signing-key binding; owning secret stores and rotation/revocation order; `docker-compose.coolify.yml` and publisher-service contract checks; migration diff and data-impact classification; active/LKG/quarantine/idempotency retention and cleanup policy; backup/restore requirement; `SOURCE_COMMIT` propagation; no secret values in output | TSA + DRE + DB/Security when applicable | blocked: binding names, publisher service contract, and projection-state retention/cleanup policy are not selected |
| PMAP-REL-G05 Paperclip and publisher runtime acceptance | Zero active Paperclip runs; exact owner binding; controlled canonical restart; source route and denial matrix; publisher supervisor start/restart/stop and safe cancellation; five-minute scheduling, overlap coalescence, 3/10-second timeouts, bounded retry, replay/idempotency, and network reachability/allowlist proof; health and topology audit; rollback note | TSA + DRE | blocked: publisher runtime/supervisor and allowlist ownership are not selected; protected restart is not authorized/performed |
| PMAP-REL-G06 Promotion authorization | Explicit DRE `GO` record naming candidate, target, checks, rollback target, smoke owner, stop conditions, and protected-action authority; push must be treated as a Coolify production trigger | DRE + release owner | blocked |
| PMAP-REL-G07 Post-deploy transport smoke | Public health and SHA, API metadata, authenticated Product Map browser journey, separate ingest/read authorization denials, accepted/duplicate/out-of-order/conflict/quarantine paths, source-based stale/LKG/unavailable labeling, five-minute publisher delivery, responsive/accessibility checks, redacted logs, and data/migration verification | DRE + QA/Security | blocked until implementation and deployment |
| PMAP-REL-G08 Monitoring, disablement, and recovery | Coolify deployment/source readback; publisher service/schedule health; delivery age from source `observedAt`; attempt/success/failure/retry, authorization-denial, duplicate, conflict, quarantine, and unsupported-schema signals; at least three public health samples across a minimum 15-minute window; restart/error/migration/auth log review; alert/escalation route; publisher disable plus dedicated-key revocation rehearsal; rollback or forward-fix decision; final acceptance | DRE | blocked until implementation and deployment |

No gate may inherit evidence from another SHA. A stale, missing, `unknown`, or
conflicting fact is a failed gate, not permission to infer readiness.

## Independent Projection Transport Operations Review

Review source: [LUC-2094](/LUC/issues/LUC-2094). Architecture reviewed at
Roost commit `a9334d8529c2196fcd62e3b5331ec8b72273e062`; preflight baseline
reviewed from commit `f1db9fdfd7f8dafd38404bc1bb3545219c8a3f79`.

Verdict: **`changes_required`**. The one-way outbound transport is operationally
viable in principle, and its bounded payload, source-based freshness,
idempotency, quarantine, explicit stale/LKG behavior, and no-reverse-access
rules are suitable foundations. It is not yet an implementable or releasable
operations contract because the following owner-controlled details are absent:

| Finding | Required correction | Accountable owner | Gate impact |
| --- | --- | --- | --- |
| PMAP-OPS-01 Publisher runtime ownership | Select the exact existing local service supervisor, service name, executable/package and source commit, working directory, runtime identity, schedule mechanism, single-run/coalescing lock, restart policy, health signal, bounded log sink, upgrade path, and graceful stop/cancellation behavior. The solution must not create a second Paperclip/Roost instance, listener, fallback port, or unmanaged watcher. | TSA defines the runtime boundary; DRE accepts it | G01, G03, G05, G08 |
| PMAP-OPS-02 Network and binding ownership | Record the exact non-secret target host/path contract, DNS/TLS verification posture, outbound TCP/443 and ingress proxy/firewall allowlist owners, names-only config bindings and owning secret stores, bootstrap/rotation/revocation sequence, and whether Security requires a separate raw-body signature. Source-route approval cannot authorize the new Roost ingress. | TSA + Security define; DRE verifies | G04, G05, G06, G07 |
| PMAP-OPS-03 Projection-state lifecycle | Define durable storage and migrations for active, LKG, quarantine, conflict, and idempotency/replay records; choose finite retention windows; define cleanup scheduling, audit preservation, cleanup-failure alerting, backup/restore behavior, and the rule that rollback never deletes history or moves the active pointer backward. | TSA + DB Engineering define; DRE verifies recovery | G04, G07, G08 |
| PMAP-OPS-04 Multi-artifact provenance | Bind one release packet to the exact Paperclip source commit, exact local publisher implementation/service definition, exact Roost candidate, schema/transport versions, and rollback artifacts. A clean Roost SHA alone cannot prove the local transport being operated. | Engineering Delivery + TSA + DRE | G01, G06, G08 |

Until these corrections are accepted, the protected Product Map release stays
`NO-GO`. This verdict does not authorize implementation, push, deploy, restart,
configuration mutation, protected probes, secret access, or production
mutation. The existing static Product Map may remain available only under its
explicit static or stale labeling; it must not be presented as live.

## Paperclip Owner-Binding Acceptance

Before any strict-3200 restart or live projection acceptance, all active
Paperclip runs must reach zero and the canonical runner/server process must be
proven to receive exactly:

`SOFTWAREHOUSE_COMPANY_ID=ae26bb8b-8f5f-4a85-b341-78d4e1985975`

The controlled acceptance must then prove:

1. strict port `3200` restarts through the canonical runner/process path;
2. the owner-company projection route succeeds;
3. an authorized non-owner request is denied without projection facts;
4. a direct cross-company request is denied without projection facts;
5. missing, empty, whitespace-padded, case-altered, and fallback/legacy-derived
   owner bindings all fail closed;
6. Paperclip health and `pnpm run softwarehouse:runtime-topology-audit` pass;
7. the pre-restart commit, PID/process binding, startup command, previous config
   binding, and recovery command are recorded without secret values.

Stop immediately on any binding mismatch, projection disclosure, unexpected
port/listener, failed health/topology check, active run, or missing rollback
path. Never broad-kill Node, PowerShell, PostgreSQL, or browser processes.

## Roost Candidate And Data Gate

Immediately before any push or deploy, record:

- repository path, clean status, branch, owner remote, live remote SHA, exact
  candidate SHA, approved commit range, and reviewer evidence;
- Coolify project/environment/application/server identifiers from PMAP-REL-G03;
- whether the push will trigger automatic redeploy and which deployment record
  must appear;
- migration list between deployed SHA and candidate, `prisma migrate deploy`
  expectation, data classification, and backup/restore requirement;
- current running container/image and previous known-good commit/image;
- PostgreSQL container and `companycore_postgres` volume preservation;
- capacity evidence sufficient for the new build, a canary, the running service,
  and one rollback image. When no numeric project threshold exists, require at
  least the estimated build/image footprint twice plus normal database/runtime
  headroom; uncertainty is `NO-GO`.

For no-schema candidates, explicitly record `migration impact: none` after a
diff. For schema candidates, validate empty and existing database paths at the
risk-appropriate level and capture a backup or verified snapshot before
promotion. `prisma db push` and production volume deletion are forbidden.

## Rollback And Forward-Fix Contract

The current public runtime commit `070b150f5477d701d462485aad8b91450d0c3d71`
is a source rollback reference only. Public health currently reports image
`unknown`, while `docs/operations/rollback-and-recovery.md` contains an older
historical image pointer. Therefore the future release must re-read and record
the actual running container/image before promotion. If it cannot identify and
relaunch the current known-good runtime, the decision is `NO-GO`.

Rollback triggers:

- deployed commit does not equal the approved candidate;
- health/readiness fails or build image remains `unknown` after the acceptance
  window;
- migration/startup fails or a crash/restart loop appears;
- owner login or authenticated Product Map journey fails;
- owner, non-owner, cross-company, or malformed-binding authorization behavior
  leaks projection facts;
- stale/conflict/NO-GO semantics are promoted incorrectly;
- data ownership, persistence, API compatibility, or accessibility regresses.

Recovery order:

1. stop further promotion and preserve redacted logs/evidence;
2. decide app rollback versus forward-fix based on migration/data impact;
3. redeploy the captured known-good commit/image while preserving PostgreSQL;
4. prefer a forward-fix migration for an already-applied safe schema change;
5. restore a verified backup only for corruption or an unsafe ownership/data
   migration;
6. rerun the full health, authorization, Product Map, and monitoring smoke
   before accepting traffic;
7. open an incident/regression lane before any retry when the failure is not a
   transient provider observation.

## Post-Deploy Smoke

The smoke owner must record timestamps, target identifiers, candidate SHA,
deployment record, HTTP status, safe response assertions, browser evidence,
and redacted log findings.

Public and provenance checks:

- `GET https://api.roost.luckysparrow.ch/health` returns `200`, `status=ok`,
  `build.commit=<candidate>`, and a non-`unknown` image;
- `GET https://roost.luckysparrow.ch/` and
  `GET https://api.roost.luckysparrow.ch/` return `200`;
- CORS preflight from the web origin to the API origin succeeds only for the
  approved origin;
- Coolify shows the expected application, branch/ref, deployment trigger, and
  completed candidate SHA.

Protected Product Map checks:

- owner login succeeds without recording credential or session material;
- `/areas?area=00-ogolny&view=product-map` loads after direct navigation and
  reload;
- loading, empty, unavailable/error, stale, conflict, and success states remain
  distinguishable;
- Roost, Soar, Featherly, and Paperclip keep source SHA, deployed SHA, freshness,
  lifecycle/readiness, blockers, and evidence links separate;
- a zero-gap or healthy signal does not override explicit `NO-GO`, missing
  evidence, or conflict state;
- authorized non-owner, unauthenticated, cross-workspace/company, and malformed
  owner-binding probes return no projection facts;
- desktop, tablet, mobile, keyboard, focus, overflow, console, and relevant
  network checks pass.

## Monitoring And Acceptance Window

For the initial acceptance window, DRE must:

- observe the Coolify deployment through completion and confirm the source SHA;
- capture at least three public health samples across a minimum 15-minute
  window, including one after authenticated browser smoke;
- inspect backend startup/migration logs, restart count, crash/restart status,
  HTTP 5xx, auth denials, and projection errors with secrets and private data
  redacted;
- confirm PostgreSQL remains healthy and the persistent volume is unchanged;
- record Product Map availability, correctness, freshness, authorization, and
  deployed-SHA alignment as the release SLIs;
- use the issue thread for the release evidence and incident route, with DRE as
  first responder and CTO as escalation owner.

Long-term automated monitoring/error tracking is not currently configured.
This manual window satisfies only the bounded v1 acceptance path; it must not be
represented as a mature automated alerting SLO. A detected failure makes the
error-budget posture `burning` or `exhausted` and stops unrelated risky release
work until recovery is complete.

## Final Decision Record

The final issue update for the release must state:

```text
Decision: GO | NO-GO | ROLLBACK | FORWARD-FIX
Candidate SHA:
Roost target: project / environment / application / server
Paperclip runtime commit and owner binding:
Migration/data impact:
Rollback target:
Capacity result:
Smoke result:
Monitoring window result:
Security/QA/review references:
Residual risk:
Accountable owner and next action:
```

Absent or stale fields force `NO-GO`.
