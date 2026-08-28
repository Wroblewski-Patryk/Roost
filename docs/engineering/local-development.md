# Local Development

This guide is the executable local runtime contract for Roost. CompanyCore
remains the runtime name in commands, containers, environment variables, and
API responses.

## Safety boundary

The commands below operate on local processes, local containers, and local data
only. Local health, API, and UI readbacks are development evidence; they are
not staging or production proof. Do not reuse the example credentials in a
shared environment, add real provider credentials to .env, or run production
smoke, deployment, restart, or mutation commands from this guide.

## Prerequisites

- Node.js 22 and npm. The runtime image uses node:22-alpine.
- Docker with Docker Compose v2 for local PostgreSQL and container paths.
- PowerShell 7 for the commands below.

Confirm the toolchain before changing local state:

~~~powershell
node --version
npm --version
docker --version
docker compose version
docker compose config --quiet
~~~

The Compose configuration check should exit successfully without output. The
Compose services are postgres and backend; PostgreSQL 16 is the source of truth,
and the backend serves both the Express API and the built React bundle.

## Install dependencies and create local configuration

From the repository root:

~~~powershell
npm ci
npm run prisma:generate

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
}
~~~

Review .env before startup. It is ignored by Git and must contain local values
only. The baseline development settings are:

- NODE_ENV=development
- PORT=3102
- DATABASE_URL pointing to a local PostgreSQL database
- local-only SEED_API_KEY, owner seed values, and cryptographic placeholders

The ClickUp and Google Drive entries in .env.example are operator placeholders.
Leave them as placeholders for ordinary local development. Workspace-owned
provider credentials belong in encrypted integration settings, not in a
committed file or command transcript.

## Run DEV mode

npm run dev runs the TypeScript server in watch mode on the host. Roost reserves
host port `3102` for the backend and `55432` for PostgreSQL; this keeps it clear
of Soar's `5432` PostgreSQL and `6379` Redis ports. Start the Roost PostgreSQL
service through Compose.

First use:

~~~powershell
docker compose up -d postgres
~~~

On later runs, start the existing container instead:

~~~powershell
docker compose start postgres
docker compose ps postgres
~~~

Wait for the health readback to become healthy, then prepare the schema, seed
the local workspace, build the React bundle, and start watch mode:

~~~powershell
npm run prisma:migrate:deploy
npm run seed
npm run build:web
npm run dev
~~~

Expected server output includes "companycore listening on port 3102".
TypeScript backend changes restart the watched process. There is no separate
Vite development-server script; after frontend changes, rerun npm run build:web
so Express can serve the refreshed bundle from public/react/.

Use npm run prisma:migrate:dev only when intentionally authoring a migration.
npm run prisma:push is for throwaway local experimentation and is not a
substitute for the checked-in migration path.

## Run local PROD-like mode

This path proves the compiled server and backend-served React bundle without
touching a protected environment. Reuse the healthy local development database
above. In a fresh PowerShell session, generate non-placeholder secrets without
printing them, then build, migrate, seed, and start:

~~~powershell
$env:NODE_ENV = 'production'
$env:PORT = '3102'
$env:COMPANYCORE_ALLOWED_ORIGINS = 'http://localhost:3102'
$env:COMPANYCORE_API_HOSTS = 'localhost'
$env:AUTH_TOKEN_SECRET = [Convert]::ToHexString(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
).ToLowerInvariant()
$env:API_KEY_HASH_SECRET = [Convert]::ToHexString(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
).ToLowerInvariant()
$env:INTEGRATION_SECRET_KEY = [Convert]::ToHexString(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
).ToLowerInvariant()

npm run build
npm run prisma:migrate:deploy
npm run seed
npm start
~~~

Expected output again includes "companycore listening on port 3102". Setting
NODE_ENV=production is intentional: the runtime fails closed when the three
required secrets are missing or still use development placeholders.

For a container-image readback, build the repository image and run the backend
through the Compose network. The image entrypoint applies migrations, runs the
idempotent seed, and then starts dist/server.js:

~~~powershell
docker compose up -d postgres
docker compose build backend
docker compose run --rm --service-ports -e AUTH_TOKEN_SECRET -e API_KEY_HASH_SECRET -e INTEGRATION_SECRET_KEY backend
~~~

The explicit -e flags pass the generated local secrets into the one-off backend
container. A bare docker compose up backend does not pass those three values
from the current base Compose file and therefore is not the executable
production-mode path.

## Verify either runtime mode

Keep the server running and use a second PowerShell session.

Health and readiness:

~~~powershell
$health = Invoke-RestMethod http://localhost:3102/health
$ready = Invoke-RestMethod http://localhost:3102/ready

if ($health.status -ne 'ok' -or $ready.status -ne 'ok') {
  throw 'Roost health/readiness check failed.'
}
~~~

Protected API readback and denied-path check:

~~~powershell
$projects = Invoke-RestMethod -Uri http://localhost:3102/v1/projects -Headers @{ 'X-API-Key' = 'dev-companycore-key' }

if ($null -eq $projects.data) {
  throw 'Protected project-list response is missing its data envelope.'
}

$denied = Invoke-WebRequest -Uri http://localhost:3102/v1/projects -SkipHttpErrorCheck

if ($denied.StatusCode -ne 401) {
  throw "Expected unauthenticated status 401, received $($denied.StatusCode)."
}
~~~

Manual owner-console check:

1. Open http://localhost:3102/ and confirm the React application renders.
2. Open http://localhost:3102/auth/login and confirm the owner login form
   renders without a separate frontend server.
3. For an authenticated UI check, use only the local seed owner from .env; do
   not use a live account.

Use [Testing Strategy](testing.md) for integration and regression commands.
npm run test:api:local creates and drops only `companycore_test` in the same
Roost PostgreSQL service on port `55432`; it never creates another container.

## Stop and clean up

Stop a host DEV or PROD-like process with Ctrl+C. Preserve the local database
for the next session with:

~~~powershell
docker compose stop postgres
~~~

Stop the Compose path while preserving its named database volume with:

~~~powershell
docker compose down
~~~

Running `docker compose down --volumes` destroys the local Roost database.
Inspect the exact project and volume first and use it only when a clean local
database is intentional.

## Troubleshooting

### Port 3102 or 55432 is already in use

Inspect the listener before stopping anything:

~~~powershell
Get-NetTCPConnection -State Listen |
  Where-Object LocalPort -In 3102, 55432 |
  Select-Object LocalAddress, LocalPort, OwningProcess
~~~

Stop only the process or container you own. Do not kill all Node or PostgreSQL
processes by name. Override `ROOST_BACKEND_PORT` or `ROOST_POSTGRES_PORT` when
needed and update the local URL to match. Container-to-container PostgreSQL
traffic remains on the internal port `5432`.

### The server cannot reach PostgreSQL

- Confirm the development container is healthy.
- Confirm host mode uses localhost and the published port.
- Confirm a containerized backend uses the Compose hostname postgres:5432.
- Run npm run prisma:migrate:deploy and address the first migration error; do
  not bypass it with prisma db push.

### PROD-like startup rejects an environment variable

Production mode intentionally rejects missing secrets and values containing
the development prefixes or "change-me". Generate the three session-only
values as shown above. Do not weaken the runtime check or commit replacements.

### The UI is missing or stale in DEV mode

Run npm run build:web, then reload the page. The backend serves the generated
React bundle; npm run dev watches the TypeScript server, not the Vite source.

### A container exits during startup

Read bounded logs and fix the first failure:

~~~powershell
docker compose ps --all
docker compose logs --tail 100 postgres
docker compose logs --tail 100 backend
~~~

Migration, seed, and missing-secret failures occur before the server begins
listening, so /health cannot pass until the entrypoint completes.

## Ignored local evidence retention

Local evidence producers must use the exact ignored `.tmp` or `tmp` roots and
follow the bundle metadata contract in the
[ignored evidence retention guardrail](../operations/ignored-evidence-retention-guardrail.md).
Run `npm run evidence:retention:check` for the bounded metadata-only inventory;
run `npm run test:evidence-retention` for its isolated fixture suite. Neither
command authorizes evidence cleanup.
