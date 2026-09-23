# Self-hosting and private installation configuration

Owner amendment v33: [native bootstrap ledger qualification](../architecture/worker-bootstrap-ledger-v1.md)
is **DONE: 10/10 PostgreSQL results, 86/86 source regressions, 96/96 total**.
The full 78-file migration chain applied only to one owned disposable database;
no migration was edited. Real constraints, concurrency, fence locking, isolation,
atomic rollback/audit and READ ONLY checks pass. Cleanup PASS: owned database and
helpers absent, three existing DB fingerprints equal, PostgreSQL stopped again,
backend/Soar unchanged. Production authority/delivery remain PARTIAL; production
BLOCKED and all flags false. Exactly one next recommendation: source-only canonical
BootstrapAuthoritySource integration and fail-closed tests, without inventing
missing epochs/revocation facts or activating runtime. Earlier proposals are historical.

Owner amendment v32: [durable bootstrap ledger](../architecture/worker-bootstrap-ledger-v1.md)
is **DONE source-only: 13/13 adapter results, 86/86 selected source results**.
Five additive tables are proposed in an UNAPPLIED migration; the prior 77 migrations
are unchanged. Transactional mocks qualify one-time generations, canonical recovery,
CAS completion, atomic audit/rollback and read purity. Production authority sources
and native SQL remain PARTIAL; production/execution BLOCKED, all flags false.
Ordinary admission is unchanged. Exactly one recommended next atom: native ledger
qualification in an explicitly authorized isolated disposable database with synthetic
authority sources and cleanup evidence. Earlier successor proposals are historical.

Owner amendment v31: [bootstrap/recovery admission](../architecture/worker-bootstrap-admission-v1.md)
is **DONE as a source-only contract/model: 16/16 results, 73/73 source regressions**.
A separate current-owner ticket admits one first enrollment or terminal recovery;
ordinary poll/ACK/status/rotation retain their existing credential requirements.
Exact bindings, burned generations, replay, expiry/cutover and post-commit unknown
are enforced synthetically. No native persistence, network, provisioning or default
composition; all admission flags false. Durable issuer/delivery integration is
PARTIAL and production BLOCKED. Exactly one proposed next atom: a source-only
bootstrap ledger adapter and additive unapplied schema with mocked transaction
validation. Earlier successor proposals below are historical.

Owner amendment v30: [persisted admission/HTTPS coordinator](../architecture/worker-handoff-coordinator-v1.md)
is **DONE for source-only integration: 11/11 results, 57/57 source regressions**.
Immutable snapshots are the only configuration source; inspection, pre-body peer
recheck and signed operation/response completion reject drift and stale pins.
Concurrent/replayed completion, uncertainty, read-only status and buffer wiping
are qualified with an injected synthetic exchange on the existing HTTPS client.
No persistence/migration change, real network/DB/Docker or activation; flags false.
Real exchange remains PARTIAL and production BLOCKED. Integration exposes an
active-credential prerequisite that blocks first enrollment and rotation recovery.
Exactly one proposed next atom: a source-only bootstrap/recovery admission contract
and synthetic validation resolving that cycle without relaxing owner/host bindings.
Earlier successor proposals below are historical.

Owner amendment v29: [native transport persistence](../architecture/worker-transport-admission-v1.md)
is **DONE: 9/9 PostgreSQL results, 55/55 selected native/source results**.
Real Prisma/Serializable concurrency (20 attempts per create/stage/cutover/revoke/
readmit), FK/unique/CHECK constraints, atomic rollback and SQL read-only inspection
pass. The previously unapplied migration needed a JSON-operator parenthesis fix;
it then applied with the full 77-file chain. Earlier 76 migrations unchanged.
Cleanup PASS: owned database absent, three existing database fingerprints equal,
Roost PostgreSQL exited, backend/Soar unchanged. Production remains BLOCKED and
all flags false. Exactly one proposed next atom: source-only integration of
persisted admission with the HTTPS handoff boundary and synthetic denial tests;
no endpoints, provisioning, default composition or activation. Earlier proposals
below are historical; native evidence does not qualify governance fixture setup
or privileged SQL/whole-database rollback protection.

Owner amendment v28: [transport admission persistence](../architecture/worker-transport-admission-v1.md)
is DONE for the source Prisma adapter and synthetic transactions: **10/10 results,
46/46 selected source regressions**. Four additive tables preserve identity
generations, one workspace/host head, monotonic history and atomic Event/audit.
Serializable writes use the existing fence and exact revision/digest; read snapshots
perform no writes. Migration **UNAPPLIED**; native persistence qualification PARTIAL,
production TLS/DNS/provisioning and execution BLOCKED. Default composition absent,
all six flags plus `transportQualified` false. Exactly one proposed next atom:
separately authorized native PostgreSQL qualification in a disposable synthetic
database. Earlier successor proposals below are historical.

Owner amendment v27: [source production transport admission](../architecture/worker-transport-admission-v1.md)
qualifies only schema/authority/state transitions with synthetic signed metadata:
9/9 results, 36/36 source tests. Public origin/certificate/CA digests and epochs
may be installation configuration; private TLS keys and provisioning payloads are
not accepted. No DNS/network/DB/Docker/system changes occur. Writable local anchors
cannot independently prevent same-account rollback; production stays blocked.
One next atom: source-only Prisma adapter and additive unapplied admission migration
with synthetic transaction tests. Earlier successor proposals are historical.

Owner amendment v26: [loopback HTTPS handoff](../architecture/worker-handoff-https-v1.md)
passes 9/9 real HTTPS results and 189/189 selected tests with in-memory test CA,
certificates and keys. No system trust, proxy, firewall, registry, database or
Docker changes occur. Default composition remains unavailable and loopback PASS
does not qualify production TLS/DNS/certificate provisioning or secret storage.
One next atom: source-only production HTTPS/DNS/certificate admission contract
and synthetic denials for exact installation/host/owner binding and epoch rollback.
No real endpoint contact, provisioning or activation. Earlier successor proposals
below are historical.

Owner amendment v25 — bounded native handoff evidence

[Worker handoff qualification](../architecture/worker-credential-lifecycle-v1.md)
applied the unchanged 76-migration chain to one owned disposable database only.
9/9 native PostgreSQL/HTTP results and 180/180 selected regressions pass. Test HTTP
is loopback; HTTPS origin/certificate evidence is synthetic. Default deployment
composition remains unavailable; no automatic provisioning, business-data seed,
secret-store integration or provider activation is introduced. Exactly one next
atom: loopback HTTPS adapter qualification with ephemeral test certificates and
synthetic credentials. Earlier next-atom proposals below are historical.

Owner amendment v24: [synthetic Worker handoff](../architecture/worker-credential-lifecycle-v1.md)
adds an unexecuted forward migration for device request state only. It stores
hashes, fingerprints, bindings, expiry, bounded attempts and terminal outcome;
never raw device secrets, raw credentials or response bodies. The source adapter
has no production generator, secure delivery or TLS composition, and the public
handoff routes remain unavailable. 7/7 synthetic tests pass for one-time delivery,
ack activation, lost response, recovery, transport drift and lockout. No database,
Docker, network or deployment action occurs in this atom. Native migration
qualification is the single next atom; real provisioning and launch remain blocked.

Owner amendment v23: [native credential lifecycle qualification](../architecture/worker-credential-lifecycle-v1.md)
applies the 75-migration chain only in one owned disposable database. The final
migration's first attempt failed SQL parsing and rolled back completely; two
CASE comparisons were parenthesized before its first successful application.
No migration already applied before this atom was changed; the prior 74 files
remain intact. No reset, business-data seeding, role, container, image or volume
creation occurred. Native owner-decision/auth, invalidation, races and rollback
pass. Default generator/hasher/delivery remain absent; no production provisioning.
Cleanup verified database name/OID/owner/comment/zero sessions and its absence
after DROP. Existing logical data, schema, sequences, catalog and roles match
the baseline; Docker inventory matches. The database container is back to exited,
unrelated services/backend unchanged, both HTTP servers and owned relay closed
with no remaining child. No deployment, TLS qualification or activation.
Earlier migration/qualification states below are historical.

Owner amendment v22: [Worker credential lifecycle](../architecture/worker-credential-lifecycle-v1.md)
adds a forward-only 75th migration for guards, atomic ticket/claim invalidation
and the existing append-only credential ledger. It is **unexecuted** and must be
qualified separately before release; the v21 native evidence does not cover it.
No applied migration or Prisma table layout is changed, no credential is seeded,
and no database/Docker operation occurs in this source/synthetic atom. All three
owner lifecycle routes have no generator, hasher or delivery in default composition.
Do not turn the test-only synthetic delivery seam into production provisioning.
Revoked generations/history remain retained; recovery requires explicit owner
reconciliation and never a reset, secret replay or automatic restart. Production
secret delivery, TLS and launch remain unqualified; no deployment or activation.
The earlier migration and cleanup results below are historical.

Owner amendment v21: [Worker binding qualification](../architecture/worker-owner-ticket-channel-v1.md)
applies the full 74-migration chain in one owned disposable database, including
the unchanged additive binding migration. No applied migration is edited, no
existing credential is converted and no business data is seeded. Ticket requests
do not independently update credential last-use metadata; successful consumption
has its transactional actor Event. Status redaction rejects sensitive content
without persisting an incident. Production provisioning and deployment stay out
of scope. The v20 unexecuted-migration statement below is historical.
The owned database was identity-checked and dropped with no sessions. Existing
logical data/schema/sequences/catalog/roles and Docker inventory matched their
baselines; the database container returned to exited, other services unchanged.
Both local HTTP servers and the loopback relay closed, with no relay child left.

Owner amendment v20: [Worker ticket binding](../architecture/worker-owner-ticket-channel-v1.md)
adds nullable host/installation/epoch metadata to existing API keys and an
immutable ticket-binding extension. Migration is additive and **unexecuted**;
its native guards require separate database qualification before release. It
creates no key, maps no existing credential automatically and provides no
provisioning API. No secret enters the binding or status response. Status polls
do not renew credentials or write ticket/Ready/audit state. Preserve binding
history during rollback; never remove spent rows to recover authority.

Owner amendment v19: the [ticket database qualification](../architecture/server-owner-ticket-v1.md)
applied all 73 forward migrations in one uniquely owned disposable database in
an existing local PostgreSQL instance. Identity-checked database removal and
before/after logical database, role and container inventory comparisons PASS.
The authorized database container returned to exited; unrelated services retained
their original states. The owned relay stopped with no remaining child processes.
No new container, image, volume, role or database instance was created. No private
environment or container credentials were read; only synthetic test data was
written to the owned database. This is not a production migration or release.
The default API still has no signer or physical-evidence adapter. Existing
installation data, credentials and volumes must remain unchanged.

Owner amendment v18: [ticket persistence](../architecture/server-owner-ticket-v1.md)
adds an unapplied, additive migration for public key metadata and immutable
ticket/attempt/decision consumption history. No signing secret, environment
switch, bootstrap key generation or recurring seed is added. API composition has
no signer/evidence adapter and remains unavailable. PostgreSQL verification was
blocked by unavailable Docker; do not infer release readiness from synthetic
tests. Preserve existing credentials, volumes and records. A later rollback must
disable ticket handling while retaining the ledger; never delete spent rows or
restore an older ledger to regain authority. Full database rollback is outside
the journal's anti-replay guarantee and requires separate reconciliation.

Owner amendment v17:
[server owner-ticket contract](../architecture/server-owner-ticket-v1.md) selects
existing Roost server secret configuration for future private signing capability.
Worker receives public verification material only, from a qualified fresh HTTPS
origin; writable local anchors are not production authority. No signing secret,
new environment variable, bootstrap change, key rotation or provisioning is
implemented here. Preserve all existing credentials, records and volumes.
The prior local-anchor section below describes synthetic historical behavior.

Roost is a reusable company operating system. Company records live in the
installation's PostgreSQL database. Git distributes code, schema and fictional
examples, not an operator's company data, credentials, domains or machine paths.

## New installation

Use `docker-compose.coolify.yml` on your own Coolify resource. Configure persistent
PostgreSQL storage and the secrets/public origins listed in [Deployment](../DEPLOYMENT.md).
The backend runs migrations and a transactional first-install bootstrap. A new
installation gets an owner, workspace, twelve departments and `00 General` only.
Change first-login credentials and the company name in account/workspace settings.
Create integrations, API keys, applications, projects and tasks explicitly.

## Updating an existing installation

Before switching an existing deployment from company-specific defaults:

1. Record its current public web/API origins in Coolify as
   `COMPANYCORE_PUBLIC_WEB_BASE_URL` and `COMPANYCORE_PUBLIC_API_BASE_URL`.
   Retain the current `COMPANYCORE_ALLOWED_ORIGINS` and `COMPANYCORE_API_HOSTS`
   explicitly if the deployment uses aliases or a separate API domain.
   Set `ROOST_OPERATOR_NAME` and `ROOST_OPERATOR_CONTACT_EMAIL` to retain the
   installation's public privacy/terms contact. These values are rendered server-side
   with HTML escaping; unset installations refer to their workspace administrator.
   If using product-map evidence, retain its issue namespace in `ROOST_ISSUE_PREFIX`
   (new installations default to `ISSUE`). Foreign prefixes remain rejected.
2. Keep the same Coolify resource, PostgreSQL volume and database credentials.
   Preserve `AUTH_TOKEN_SECRET`, `API_KEY_HASH_SECRET`, `INTEGRATION_SECRET_KEY`
   and any provider OAuth credentials. Public repository cleanup is not key rotation.
3. Inspect pending migrations and verify a recoverable database backup before release.
   Never run `prisma migrate reset`, `prisma db push`, volume deletion or data cleanup
   as part of this transition.
4. Deploy the reviewed release. Existing users/workspaces make bootstrap skip all
   writes. Old seeded business records, integrations, ownership and passwords remain.
5. Check health, owner login, workspace identity and integration status. Rollback
   must not reintroduce the old recurring data seed.

The historical `20260830120000_codex_agent_runtime` file is sanitized in this public
distribution: its schema is unchanged, but private portfolio data statements were
removed. `prisma migrate deploy` skips an already-applied name without replaying it
or rewriting its recorded checksum. A local upgrade regression compares every
database row before and after this transition. This is not permission to edit future
applied migrations; create new, reviewed migrations for future schema changes.
`migrate dev` may flag the historical checksum difference in an old development
database. Do not resolve that warning by resetting retained data.

## Private files and operator tools

Keep real `.env` files, host mappings, import configurations and private runbooks
outside the repository (and outside its Docker build context). Public files under
`config/` use fictional examples. Existing private Agent Host mappings continue to
define their actual workspace root, repositories and service URL; do not replace
them with the example file during an upgrade.

The documentation importer accepts `ROOST_IMPORT_CONFIG` or `--config` pointing to
a private mapping based on `config/application-import.example.json`. Local preview
does not connect to an API. API preview/apply requires explicit `ROOST_API_URL`
and `ROOST_API_TOKEN`. It does not run on startup or deployment.

Company-specific one-off direct-database importers are not shipped publicly.
Their removal from Git does not remove any previously imported database records.

## Trusted provider pilot

The [trusted-provider pilot contract](../architecture/trusted-provider-pilot-v1.md)
uses a private signed risk decision and public-key anchor in the existing Writer
state directory. It contains installation/workspace IDs and exact scoped pins,
never distributed owner data. Provisioning/signing is explicit operator work;
startup never creates or renews acceptance. The current implementation qualifies
only synthetic fixtures, not real provider activation. Revocation and any binding
change invalidate prepared attempts; account-level tampering remains acknowledged
residual risk. No signing key belongs in the checkout or provider environment.

## Public history

Cleaning the current files does not remove prior Git commits, cached assets,
releases, forks or pull-request refs. History removal is a separate coordinated
publication operation: archive the original repository privately, account for all
public refs, pause concurrent pushes, and use an explicitly approved history rewrite
or a new repository with clean history. Never treat a normal cleanup commit as an
erasure of already-published credentials. Rotate any actual exposed credential in
its owning service and preserve the old value only where required for a reviewed
data-encryption migration.
