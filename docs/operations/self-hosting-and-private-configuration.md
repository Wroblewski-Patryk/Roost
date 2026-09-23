# Self-hosting and private installation configuration

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
