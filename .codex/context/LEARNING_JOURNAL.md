# LEARNING_JOURNAL

Purpose: keep a compact memory of recurring execution pitfalls and verified
fixes for this repository.

## Update Rules

- Add or update an entry when a failure pattern is reproducible or documented.
- Prefer updating an existing entry over creating duplicates.
- Keep entries in English and free of secrets.
- Apply the new guardrail in the same task where the learning is captured.
- For approved reusable UX or visual patterns, also update
  `docs/ux/design-memory.md`.

## Entry Template
```markdown
### YYYY-MM-DD - Short Title
- Context:
- Symptom:
- Root cause:
- Guardrail:
- Preferred pattern:
- Avoid:
- Evidence:
```

## Entries

### 2026-05-24 - Recover Windows Build EPERM by Resetting Build Artifacts
- Context: ARCH-EVID-002 continuation ran repeated full validation
  (`npm run validate`) after architecture gate hardening.
- Symptom: `npm run build:server` and `npm run build:web` intermittently
  failed with `EPERM` on write/open inside `dist/*` and
  `node_modules/.vite-temp/*`.
- Root cause: Local Windows file locks and stale build-temp artifacts can
  leave specific generated files unwritable across sequential validation runs.
- Guardrail: When `tsc` or Vite fails with targeted `EPERM` on build outputs,
  treat it as a local artifact-state issue first (not runtime logic regression).
- Preferred pattern: Reset build outputs deterministically:
  1) remove/recreate `dist/`,
  2) remove/recreate `node_modules/.vite-temp`,
  3) rerun `npm run build:server`, then `npm run build:web`, then full
     `npm run validate`.
- Avoid: Repeatedly retrying full validation without artifact reset, or
  changing application code to bypass local lock symptoms.
- Evidence: After `dist` and `.vite-temp` reset, `npm run build:server`,
  `npm run build:web`, and full `npm run validate` passed in the same
  checkpoint.

### 2026-05-24 - Stabilize Architecture Docs Root Before Evidence Pipeline
- Context: Architecture evidence scripts use canonical `docs/*` paths across
  graph/sync/gate/build steps.
- Symptom: `architecture:refresh` became partially nondeterministic when the
  repository had `Roost - docs/` as the physical docs root and `docs/` was
  missing, causing ENOENT failures in mid-pipeline (`features.csv` lookup).
- Root cause: Path coupling to `docs/*` with no preflight alias/bootstrap for
  repositories that rename the docs directory.
- Guardrail: Always run a docs-root preflight before architecture refresh to
  guarantee `docs/*` exists as a real directory or a valid alias.
- Preferred pattern: Keep scripts on canonical `docs/*` paths and add a single
  runtime preflight (`npm run architecture:ensure-docs-root`) that creates
  `docs -> Roost - docs` when needed.
- Avoid: Ad hoc manual junction creation during failures or broad multi-script
  path rewrites under release pressure.
- Evidence: `scripts/ensure-architecture-docs-root.mjs` added and wired into
  `architecture:refresh`; subsequent `npm run architecture:refresh` and
  `npm run validate` passed with all gates green.

### 2026-05-20 - Stop Local Prisma Servers Before Client Generation
- Context: Adding Operations task responsibility and schedule fields required
  regenerating Prisma Client on Windows.
- Symptom: `npm run prisma:generate` failed with `EPERM: operation not
  permitted, rename ... query_engine-windows.dll.node.tmp...`.
- Root cause: Local `node dist/server.js` processes were holding Prisma's
  Windows query engine DLL open.
- Guardrail: Before Prisma Client generation after schema edits, check for
  local CompanyCore `node dist/server.js` processes and stop only those app
  server processes if they are holding the query engine.
- Preferred pattern: Use `Get-CimInstance Win32_Process -Filter "name =
  'node.exe'"` to inspect command lines, stop only current-app
  `dist/server.js` processes, then rerun `npm run prisma:generate`.
- Avoid: Killing unrelated Node/Vite/Codex processes or retrying Prisma
  generation repeatedly while the DLL remains locked.
- Evidence: The first `npm run prisma:generate` failed with EPERM; after
  stopping only `node dist/server.js` processes, the same command generated
  Prisma Client successfully.

### 2026-05-19 - Centralize Managed Table Mechanics
- Context: The owner defined a reusable table contract for CompanyCore
  management screens after the People/Agents Directory became a real roster.
- Symptom: Rebuilding search, filters, sorting, actions, selection, column
  visibility, pagination, and destructive confirmations route by route would
  quickly create inconsistent management views.
- Root cause: `CcDataTable` existed as a display primitive, but not yet as the
  shared owner of table-state mechanics.
- Guardrail: Flat management indexes should put reusable table behavior in
  `CcDataTable`, then let routes provide columns, rows, fixed-value filters,
  row actions, bulk actions, and modal implementations.
- Preferred pattern: Three stacked zones: filters/settings, min-width table,
  pagination/page-size controls. Keep Preview/Duplicate/Edit/Archive/Delete as
  row-local actions and use DaisyUI modals for destructive confirmations.
- Avoid: Route-local duplicate table mechanics, `window.confirm`, and table
  pages that cannot hide columns or paginate dense backend records.
- Evidence: `CC-DATA-TABLE-MANAGED-005` passed `npm run build:web`, `npm run
  validate`, `npm run test:api:local`, and responsive Playwright proof covering
  filters, pagination, selection, column visibility, duplicate modal, archive
  modal, and no overflow.

### 2026-05-18 - Prefer Operational Tables For Flat Management Indexes
- Context: `06 People & Agents -> Directory` had already moved away from a
  permanent detail inspector, but the route-local roster still looked more
  like cards than a management table and included redundant density controls.
- Symptom: The owner could see data, but the view felt less like a practical HR
  or agent-management tool because scanning, People/Agents separation, and
  row-level actions were not the dominant structure.
- Root cause: Route-local presentation kept accumulating display details
  instead of using the shared management-table primitive as the first surface.
- Guardrail: Flat management indexes should default to `CcDataTable` with one
  backend-backed object per row, compact operational columns, explicit scope
  chips, and a sticky action column.
- Preferred pattern: Put Preview/Edit/Archive/Delete beside each row and keep
  the table action column visible across desktop, tablet, and mobile.
- Avoid: Bespoke card rosters, decorative counters, and density toggles unless
  there is verified operator need.
- Evidence: `PEOPLE-AGENTS-DIRECTORY-TABLE-UX-004` passed `npm run
  build:web`, `npm run validate`, `npm run test:api:local`, `git diff
  --check`, and responsive Playwright proof with one table, People = 1,
  Agents = 13, visible row actions, and no overflow.

### 2026-05-17 - Treat Hanging Docker CLI As An Environment Blocker
- Context: OPS-MGMT-002 attempted to run `npm run test:api` against a fresh
  PostgreSQL Docker container after adding the Operations task-list assignment
  endpoint.
- Symptom: `docker run`, `docker ps`, and `docker version` commands timed out
  instead of returning a clean PostgreSQL validation environment.
- Root cause: The local Docker daemon or Docker CLI bridge was unhealthy during
  the checkpoint; continuing to wait would not produce reliable API evidence.
- Guardrail: When Docker control commands hang, stop only validation-owned
  Docker CLI processes, record the database proof gap honestly, and do not
  mark API integration tests as passed.
- Preferred pattern: Continue with build/type gates and rendered UI proof, then
  queue a rerun of `npm run test:api` on the next healthy PostgreSQL
  validation environment.
- Avoid: Killing unrelated long-lived Docker processes or treating a timed-out
  test attempt as success.
- Evidence: OPS-MGMT-002 `npm run validate`, frontend proof, and process
  cleanup passed; database integration proof remains explicitly pending in
  `.agents/state/module-confidence-ledger.md` and
  `.agents/state/system-health.md`.

### 2026-05-14 - Use Source Archive For Private GitHub VPS Deploys
- Context: AGRUN-007 manual CompanyCore rollover to production.
- Symptom: VPS `git clone` from the private CompanyCore repository failed
  without non-interactive GitHub credentials.
- Root cause: The production host can run Docker but should not be assumed to
  have repository credentials for private source pulls.
- Guardrail: Do not block a manual rollover on private GitHub clone access
  when the exact commit is already available locally.
- Preferred pattern: Build a local `git archive` for the exact commit, copy it
  to `/tmp`, build the Docker image from that archive with explicit
  `COMPANYCORE_BUILD_COMMIT` and `COMPANYCORE_BUILD_IMAGE`, then remove the
  archive, source directory, env file, label file, and smoke scripts after
  validation.
- Evidence: Commit `c5878d95a47f17745f65689c08e9e317a6465777` deployed
  successfully through the archive path; public health reports that commit.

### 2026-05-08 - Clean Vite generated output before React builds
- Context: UXA-010 and UXA-011 rebuilt the React/Vite frontend into
  `public/react/` on Windows.
- Symptom: A subsequent `vite build` failed in `vite:build-html` with an
  emitted chunk name containing a relative path back to `web/index.html`.
- Root cause: The ignored generated `public/react/` output from a previous
  build can confuse Vite/Rolldown's HTML asset emission on this Windows
  workspace.
- Guardrail: Clean only the generated `public/react/` output before each Vite
  build.
- Preferred pattern: Keep `public/react/` ignored and run
  `node scripts/clean-react-build.mjs && vite build` through `npm run build:web`.
- Avoid: Manually deleting generated assets during every task or committing
  `public/react/` build output.
- Evidence: UXA-011 reproduced the Vite/Rolldown error; adding
  `scripts/clean-react-build.mjs` made `npm run build` pass consistently.

### 2026-05-08 - Isolate UI smoke from integration-test database state
- Context: UXA-003 and UXA-006 ran authenticated owner-console screenshot smoke
  while compose-backed integration tests were also mutating local
  workspace/auth data.
- Symptom: The UX smoke failed with noisy 403/404 console entries or an
  unexpected Drive-control assertion even though the frontend change built
  successfully.
- Root cause: The smoke and integration test shared the same compose database
  state, while the seed script intentionally does not reset an existing owner's
  password or integration settings.
- Guardrail: Run rendered UI smoke against a clean or isolated local compose
  project when screenshot evidence depends on seeded owner state. Do not run
  integration tests and UI smoke in parallel against the same local database.
- Preferred pattern: Use a separate `COMPOSE_PROJECT_NAME` and port for
  screenshot evidence, run API integration tests and UI smoke sequentially, and
  reseed before repeating UI smoke if tests touched the database.
- Avoid: Treating a dirty local compose volume as a stable UX fixture or
  debugging UI regressions from smoke output created during concurrent API
  tests.
- Evidence: `owner-console:ux-smoke` failed on the default compose project
  after tests, then passed on isolated `companycore_uxa003` at
  `http://localhost:3002`; UXA-006 reproduced the same parallel-run failure on
  `companycore_uxa006`, then passed after reseeding and rerunning the smoke
  sequentially at `http://localhost:3005`. UXA-009 reproduced the same
  failure mode when UI smoke and the container integration test ran in
  parallel against `companycore_uxa009`; rerunning `npm run seed` and the smoke
  sequentially produced passing evidence.

### 2026-04-30 - Canonical visuals require surface-by-surface closure

- Context: Screenshot-driven UI work can drift when agents treat approved
  images as inspiration, spread polish across multiple surfaces, or replace
  required assets with generic CSS approximations.
- Learning: A canonical screenshot, mockup, or approved frame must be treated
  as the active spec. Explicit user notes become part of that spec.
- Guardrail: For pixel-close UI tasks, use
  `docs/ux/canonical-visual-implementation-workflow.md`, close one surface at a
  time, capture comparison screenshots, list visible mismatches, and require an
  explicit `95%` parity judgment before moving to dependent surfaces.

### 2026-04-30 - UX audits should become action-first evidence

- Context: Broad UI passes can produce screenshots without changing the
  product's day-to-day usefulness.
- Learning: Full-route clickthroughs are most useful when they answer whether
  each screen makes the next action, blocked state, and recovery path obvious.
- Guardrail: Use `docs/ux/evidence-driven-ux-review.md` for broad UX work,
  keep feedback local to user actions, hide raw technical errors from end
  users, and convert findings into the next one or two implementation slices.

### 2026-05-02 - Prisma SQL migrations must not contain BOM
- Context: CCV1-006 integration tests applied Prisma migrations to a fresh
  PostgreSQL database through `prisma migrate deploy`.
- Symptom: The first migration failed with PostgreSQL syntax error at the first
  character before `-- CreateEnum`.
- Root cause: `prisma/migrations/202605021_v1_foundation/migration.sql`
  started with a UTF-8 BOM.
- Guardrail: SQL migration files must be UTF-8 without BOM before commit and
  `prisma migrate deploy` must be exercised against a fresh database.
- Preferred pattern: Run the endpoint test command against a disposable fresh
  PostgreSQL database so migration encoding and ordering issues surface early.
- Avoid: Trusting `npm run build` or Prisma Client generation as proof that
  migrations apply cleanly.
- Evidence: `npm test` initially failed with PostgreSQL error code `42601` at
  the BOM character, then passed after rewriting the migration without BOM.

### 2026-05-02 - Existing production schemas need Prisma baseline before migrate deploy

- Context: CompanyCore production on Coolify already contained the foundation
  schema before the runtime switched to `prisma migrate deploy`.
- Symptom: Backend restarted continuously and logs showed Prisma `P3005`
  because the database schema was not empty.
- Root cause: The production database had application tables but no
  `_prisma_migrations` metadata row for the already-applied foundation schema.
- Guardrail: Before enabling `prisma migrate deploy` against an existing
  production database, compare current tables to the intended baseline and add
  only the matching baseline migration metadata; never delete the Postgres
  volume to clear `P3005`.
- Preferred pattern: Baseline the exact already-applied migration, redeploy the
  latest commit, then verify backend logs and public health endpoints.
- Avoid: Treating `P3005` as a reason to reset production data or blindly mark
  later migrations as applied.
- Evidence: Coolify backend logs showed `P3005`; after a one-time baseline for
  `202605021_v1_foundation`, redeploying commit `3f64a72` finished, logs showed
  `No pending migrations to apply`, seed success, and `/health` plus
  `/v1/health` returned `200`.

### 2026-05-03 - Provider API mapping must start from official docs

- Context: CompanyCore is using ClickUp as the first native integration and
  future integrations will shape database tables, API routes, automations,
  storage roots, and knowledge roots.
- Symptom: A provider can look simple from UI naming, but API terminology and
  write behavior differ; ClickUp API v2 uses `Team` for Workspace, Custom
  Fields require separate endpoints for updates, Views have explicit parent
  scopes, rate limits are per token, and webhook events require HMAC signature
  verification.
- Root cause: Provider UI concepts, public API terminology, and write/update
  contracts can drift over time and cannot be safely inferred from memory.
- Guardrail: Before implementing or changing provider API behavior, check the
  current official provider documentation and record endpoint, hierarchy,
  pagination, rate-limit, webhook, signature, field, and permission
  assumptions in the task evidence.
- Preferred pattern: Keep provider-specific terminology in integration
  clients/mappers and map it into stable CompanyCore concepts through explicit
  mapping tables.
- Avoid: Hardcoding provider hierarchy or write behavior from memory, UI labels,
  old examples, or a single successful smoke call.
- Evidence: Official ClickUp docs reviewed during CCV1-034 for API v2/v3
  terminology, Tasks, Custom Fields, Views, Rate Limits, and Webhook
  signature behavior.

### 2026-05-03 - Do not pipe PowerShell here-strings with secrets into remote bash
- Context: Production smoke commands sometimes need to read service secrets
  inside the VPS container and call protected endpoints without printing secret
  values.
- Symptom: A PowerShell here-string piped into `ssh ... bash -s` can arrive
  with a leading BOM, causing remote bash to treat the first assignment or
  command as invalid.
- Root cause: Windows text encoding can prepend a BOM to piped script content,
  and the failing shell error may echo the malformed first command.
- Guardrail: For remote scripts that touch secrets, write a temporary ASCII
  script file, copy it to the VPS, execute it, and delete it, or use a proven
  single remote command with carefully tested quoting.
- Preferred pattern: `Set-Content -Encoding ascii` for temporary remote smoke
  scripts, no `set -x`, no secret echoing, and cleanup both local and remote
  script files.
- Avoid: Piping PowerShell here-strings directly into remote bash when the
  script reads API keys, tokens, or passwords.
- Evidence: During CCV1-055 smoke, a piped here-string produced remote
  `command not found` output from a BOM-prefixed line; rerunning via an ASCII
  temporary script executed correctly and returned Jarvis CompanyCore connector
  status without exposing secret values.

### 2026-05-03 - Verify deployed image, not only Coolify UI state

- Context: CompanyCore production may be rolled forward either by Coolify
  redeploy or by the approved manual VPS backend rollover path while
  GitHub-to-Coolify auto-deploy remains blocked.
- Symptom: A forced Coolify redeploy left production on commit `6731b82` even
  though newer Google Drive commits were pushed to `main`; public health still
  returned the old shape without build metadata.
- Root cause: Coolify UI/project discovery did not make the target resource
  obvious from the session, and the currently running Docker image was the
  actual deployment truth.
- Guardrail: For production release verification, always inspect the running
  Docker image/container and compare it with `/health` build metadata before
  declaring deploy success.
- Preferred pattern: If Coolify deploy state and runtime image diverge, use the
  documented manual rollover path, preserve Postgres, keep the prior image as
  rollback, and then run public plus protected smoke.
- Avoid: Treating a green public `/health` without build metadata as proof that
  the latest commit is deployed.
- Evidence: V2GD-009 rolled production from `6731b82` to
  `a52afef4492445c87d1313324dcee8bbe82f3323`; `/health` then reported the
  expected build commit and protected Google Drive smoke passed.

### 2026-05-07 - Browser plugin Node runtime may block local UI smoke
- Context: Local UI validation should prefer the in-app Browser plugin when it
  is available.
- Symptom: Browser runtime setup failed before opening the local app because
  the Node REPL reported Node `22.13.0` while requiring Node `>=22.22.0`.
- Root cause: The workstation Node binary used by `node_repl` is older than
  the Browser plugin runtime requirement.
- Guardrail: Attempt the Browser plugin first for local UI checks; if it fails
  with the Node version gate, record the exact blocker and run a Playwright
  fallback from the repository Node environment.
- Preferred pattern: Keep the local app smoke evidence explicit: target URL,
  viewports, console health, screenshot path, and whether Browser or fallback
  Playwright produced the proof.
- Avoid: Claiming Browser validation passed when only fallback Playwright ran,
  or skipping rendered UI smoke after a Browser runtime blocker.
- Evidence: V2WEB-031 Browser setup failed with `requires >= v22.22.0`;
  fallback Playwright verified `/pipeline` at desktop `1440x960` and mobile
  `390x844` with no console errors or horizontal overflow.

### 2026-05-14 - Playwright headless checks can hang after Vite port drift
- Context: V2AGENT-006 attempted a focused rendered check for
  `/react-company-os` after adding an agent command queue to the existing
  React Company OS cockpit.
- Symptom: A Vite validation server switched from the requested port because
  the port was already occupied, and subsequent Playwright headless attempts
  hung until the shell or MCP timeout even with a simple static server.
- Root cause: The rendered-check harness mixed Vite port probing, Playwright
  waits, and background process cleanup. Once the first port drifted, later
  attempts left validation-owned headless browser processes that had to be
  cleaned up separately.
- Guardrail: For focused React route smoke, reserve a fresh high port with
  `--strictPort`, avoid `networkidle` against Vite/HMR, and keep browser launch,
  page checks, browser close, and server close inside one script with a short
  explicit timeout.
- Preferred pattern: If the render harness fails before page assertions,
  record it as a tooling blocker, clean up validation-owned `vite`, `node -`,
  and `chrome-headless-shell` processes, then use a deterministic fallback
  such as system Chrome `--headless=new --dump-dom --virtual-time-budget=5000`
  against a temporary static SPA server with mock `/v1` endpoints.
- Avoid: Retrying the same hanging Playwright path repeatedly or marking a UI
  slice fully verified from build evidence alone.
- Evidence: V2AGENT-006 `npm run build` passed, but Vite/Playwright rendered
  checks timed out. V2AGENT-006R then passed with system Chrome dump-DOM,
  verifying the agent command queue markers without leaving validation ports
  or Docker containers running.

### 2026-05-14 - Check for stale route-smoke parents after browser proofs
- Context: V2WEB-AGENT-006 did not run a browser proof, but final resource
  hygiene found leftover `chrome-headless-shell` processes from earlier
  route-smoke validation runs.
- Symptom: `Get-Process chrome-headless-shell` and WMI still reported
  headless browser children whose parent command lines referenced
  `scripts/route-smoke.mjs`; `Stop-Process`, `taskkill`, and WMI termination
  reported success or "no running task instance" inconsistently.
- Root cause: Earlier route-smoke parent processes were still present or had
  stale child process records after browser validation.
- Guardrail: After any route-smoke or Playwright validation, inspect both
  `chrome-headless-shell` and parent `node scripts/route-smoke.mjs`/`cmd`
  processes, terminate the parent first, then re-check browser children.
- Preferred pattern: Keep browser proof scripts self-contained with explicit
  `finally` cleanup, and include the parent process command line in cleanup
  evidence when stale headless browsers are found later.
- Avoid: Assuming `Stop-Process chrome-headless-shell` fully cleans a route
  smoke if the parent process can respawn or retain children.
- Evidence: Final V2WEB-AGENT-006 hygiene found route-smoke parent processes
  (`node scripts/route-smoke.mjs`) and multiple `chrome-headless-shell`
  children; parent termination and repeated child cleanup were attempted, while
  `taskkill` reported no running task instance for remaining stale PIDs.

### 2026-05-14 - Split browser proof when Playwright/Chrome cannot produce a bounded PASS
- Context: V2WEB-AGENT-007 implemented the standards editor and passed build,
  static marker, and whitespace checks, then attempted local rendered proof
  with mocked `/v1` data.
- Symptom: Firefox was not installed in the Playwright cache; Chromium/Chrome
  proof attempts timed out or failed to return a bounded success result. An
  isolated Chrome profile directory under
  `%TEMP%\cc-standards-chrome-34mVT0` was removed afterward, while WMI still
  intermittently reported an old headless Chrome PID that `taskkill` described
  as not running.
- Root cause: Browser validation on this Windows desktop session can leave
  stale process records or hang before returning command output, especially
  after earlier route-smoke validation attempts.
- Guardrail: Do not mark a browser-dependent UI task DONE from build/static
  evidence alone. Record `IMPLEMENTED_NOT_VERIFIED`, queue a narrow render
  proof task, and include process/profile cleanup evidence as an explicit
  acceptance criterion.
- Preferred pattern: Keep the render proof small, avoid multiple browser
  engines in one command, print progress checkpoints early, and re-check only
  the validation-specific command lines and temporary profile paths afterward.
- Evidence: V2WEB-AGENT-007 is recorded as implemented-not-verified and
  V2WEB-AGENT-007R is now the active QA checkpoint. A later Chrome
  dump-DOM attempt with `%TEMP%\cc-standards-dump-U0vPUH` also timed out; its
  crashpad child was terminated, two stale renderer PIDs reported "no running
  task instance", and the temporary profile directory was removed. Follow-up
  hygiene found no validation-specific Chrome/Node processes and removed
  stale Playwright profile/artifact temp directories.
- Resolution: Playwright Chromium became reliable when launched with
  `--disable-crash-reporter` and
  `--disable-features=Crashpad,CalculateNativeWinOcclusion`, while avoiding
  `networkidle` as the primary readiness gate. V2WEB-AGENT-007R then passed
  render/create proof and cleanup checks.

### 2026-05-14 - Use explicit Node stack for large TypeScript server builds
- Context: V2WEB-AGENT-009 added workflow definition draft routes and
  extended the API integration test while the project already had a large
  Prisma/Express/test graph.
- Symptom: `npm run build:server` crashed inside TypeScript with
  `RangeError: Maximum call stack size exceeded` and no source diagnostic.
- Root cause: The TypeScript checker exceeded the default Node process stack
  on Windows while checking the expanded project graph. Running the same
  compiler with `node --stack_size=8192` completed successfully.
- Guardrail: Keep `build:server` pinned to
  `node --stack_size=8192 ./node_modules/typescript/bin/tsc` so local and CI
  validation use the stable checker invocation.
- Preferred pattern: If this crash returns, first run a single-file or trace
  narrowing check to confirm it is a checker stack limit, then simplify
  unusually large inferred helper return types before raising the stack again.
- Evidence: V2WEB-AGENT-009 `npm run build` and `npm test` passed after the
  script change; temporary TypeScript trace directories were removed.

### 2026-05-14 - Register specific Company OS capability routes before generic collection routes
- Context: V2WEB-AGENT-014 added guarded workflow draft list/detail routes
  under `/v1/company-os/workflow-definitions/drafts`.
- Symptom: The first regression run returned `200` for a read-only draft-list
  call even though the route should require
  `company-os:workflow-definition:write`.
- Root cause: The capability manifest matched the generic
  `/v1/company-os/:collection` GET rule before the more specific workflow
  draft route, so the request inherited broad read behavior.
- Guardrail: Add specific Company OS command/readback routes before generic
  collection matchers in `src/auth/capabilities.ts`, then cover read-only
  denial in API tests.
- Preferred pattern: Keep high-specificity Company OS routes grouped above
  `/v1/company-os/:collection` and `/v1/company-os/:collection/:id`, with
  positive owner tests and negative read-only/cross-workspace tests.
- Avoid: Appending new Company OS subroutes below generic collection routes or
  relying on route name shape alone for capability safety.
- Evidence: V2WEB-AGENT-014 `npm test` initially exposed the read-only `200`;
  after reordering specific route entries and adding assertions, `npm test`
  passed against disposable PostgreSQL on `localhost:55438`.

### 2026-05-14 - Preserve production secret compatibility during fail-closed hardening
- Context: ACF-SEC-001 made production startup fail closed for missing required
  secrets. After a later deploy, public health returned `503` and the app was
  reported as restart-looping in Coolify.
- Symptom: Local production config import failed when `AUTH_TOKEN_SECRET` and
  `INTEGRATION_SECRET_KEY` were present but `API_KEY_HASH_SECRET` was omitted.
- Root cause: Older production deployments used `AUTH_TOKEN_SECRET` as the API
  key hash fallback. Requiring a new separate hash secret without a deployment
  migration step can break startup and may invalidate existing service keys if
  operators set a different value during incident response.
- Guardrail: Security hardening that changes required production env must
  either preserve the previous runtime fallback or include an explicit
  deployment migration step before the commit is auto-deployed.
- Preferred pattern: Keep `API_KEY_HASH_SECRET` recommended for separation,
  but allow fallback to the already required non-placeholder
  `AUTH_TOKEN_SECRET` until operators intentionally rotate service keys.
- Evidence: PROD-HOTFIX-001 added a regression test for production import
  without `API_KEY_HASH_SECRET`; `npm test` passed against disposable
  PostgreSQL on `localhost:55466`.

### 2026-05-15 - Treat Docker Desktop CLI hangs as an environment blocker, not a test result
- Context: UX100-W02 needed the standard disposable PostgreSQL API gate after
  frontend shell changes.
- Symptom: `docker run`, `docker ps`, and `docker version` hung until command
  timeout. Windows reported `com.docker.service` as stopped, `Start-Service`
  could not start it from the Codex session, and a Docker Desktop CLI
  shutdown/restart attempt still left `docker version` timing out.
- Root cause: Local Docker Desktop/CLI was unavailable even though the
  `docker-desktop` WSL distribution was listed as running. The repository
  validation did not have a reachable PostgreSQL instance for Prisma migrate.
- Guardrail: Do not mark API or integrated UI tasks `DONE` when Docker is in
  this state until an equivalent reachable PostgreSQL is available. Record
  `PARTIAL` or `BLOCKED` during the gap, clean up validation-owned CLI,
  server, and browser processes, then finish the gate once a database is
  restored.
- Preferred pattern: Run `docker version --format '{{.Server.Version}}'`
  before starting a disposable database when Docker health is uncertain. If it
  hangs, stop validation-owned `docker` CLI processes and avoid repeated
  container commands. A portable PostgreSQL binary in `.tmp` is an acceptable
  local fallback for `npm run test:api` when disk space allows it.
- Evidence: UX100-W02 initially failed at Prisma migrate because no PostgreSQL
  was reachable on `localhost:55475`. After freeing validation artifacts and
  starting portable PostgreSQL on the same port, `npm run test:api` passed and
  W02 was marked verified.

### 2026-05-15 - Verify Playwright cleanup even when browser.close reports success
- Context: UX100-W03 used a one-off Playwright fallback script for
  desktop/tablet/mobile route proof after browser plugin access was not
  available.
- Symptom: The route proof completed with `badCount=0`, but a post-validation
  process check still found four `chrome-headless-shell` processes from the
  local Playwright run.
- Root cause: The proof script called `browser.close()`, but Chromium child
  processes remained alive after Node exited on Windows.
- Guardrail: After Playwright validation, always run a narrow process check for
  validation-owned `chrome-headless-shell` processes and terminate leftovers
  before closing the task.
- Preferred pattern: Keep screenshot/report artifacts, delete temporary QA
  scripts, and run:
  `Get-Process chrome-headless-shell -ErrorAction SilentlyContinue` followed
  by `Stop-Process -Force` only for the validation run.
- Evidence: UX100-W03 found four leftover `chrome-headless-shell` processes
  after Playwright proof, stopped them, and a follow-up check returned no
  remaining validation-owned browser processes. UX100-W05 repeated the same
  cleanup pattern after Company OS/MCP proof and again confirmed no
  `chrome-headless-shell` or pg-lite `postgres` processes remained.

### 2026-05-15 - Free validation artifacts before patching large docs on a full disk
- Context: ACF-OPS-002 updated deployment/state docs after API validation.
- Symptom: The filesystem had `0` bytes free. A failed write against a large
  markdown file left it empty until restored from Git, and Git reported an
  `index.lock` write error with `Out of diskspace`.
- Root cause: Local validation artifacts, including temporary Playwright
  screenshots and portable PostgreSQL data/binaries under `.tmp`, consumed the
  remaining disk headroom.
- Guardrail: Before editing large docs or committing after validation-heavy
  work, check `Get-PSDrive -PSProvider FileSystem`. If free space is low,
  delete only validation-owned temp screenshots, pg-lite data/binaries, and
  stale headless browser processes before continuing.
- Preferred pattern: Restore any accidentally truncated tracked file from Git
  immediately, remove stale `.git/index.lock` only after confirming no Git
  command is running, then rerun `git diff --check`.
- Evidence: ACF-OPS-002 restored `docs/operations/post-deploy-smoke.md` from
  Git, removed validation-owned temp artifacts, and increased free space from
  `0` bytes to over `500 MB`.

### 2026-05-15 - Docker CLI can hang during disposable database startup
- Context: AOG-BE-001 attempted to start a disposable PostgreSQL container for
  `npm run test:api` after host validation failed because `DATABASE_URL` was
  unset.
- Symptom: `docker run` and subsequent narrow `docker ps` checks timed out
  without returning container state.
- Root cause: The local Docker backend was reachable enough to print a version
  but did not respond to container lifecycle commands in time.
- Guardrail: When Docker lifecycle commands time out during validation, stop
  only the recent validation-owned `docker` CLI processes and record the API
  gate as environment-blocked rather than leaving hanging shell processes.
- Preferred pattern: Check recent `docker` processes with
  `Get-Process docker -ErrorAction SilentlyContinue`, stop only those started
  by the current validation window, then keep older Docker/Desktop processes
  untouched.
- Evidence: AOG-BE-001 stopped the recent validation-owned Docker CLI
  processes after `docker run` and `docker ps` timed out; older Docker
  processes were left untouched.

### 2026-05-15 - Use valid UUID sentinels in Prisma filters
- Context: AOG-BE-001 database-backed API validation exercised the new
  operating graph aggregate against PostgreSQL.
- Symptom: `npm run test:api` failed with Prisma `P2023` because the empty
  anti-match branch used `id: "__none__"` in UUID columns.
- Root cause: PostgreSQL UUID fields reject non-UUID sentinel strings even
  when the filter is meant to match no rows.
- Guardrail: For Prisma filters on UUID fields, use a valid impossible UUID
  sentinel such as `00000000-0000-0000-0000-000000000000`, or restructure the
  query to omit the branch.
- Preferred pattern: Define one named constant close to the route/service and
  reuse it for empty UUID filters.
- Avoid: Magic strings such as `"__none__"` in UUID-backed Prisma `where`
  clauses.
- Evidence: AOG-BE-001 replaced the invalid sentinel in
  `src/modules/operating-graph/operating-graph.routes.ts`; the follow-up
  `npm run test:api` passed against workspace-local PostgreSQL on
  `127.0.0.1:55476`.

### 2026-05-15 - Preserve the OAuth client used during repair token exchange
- Context: The V1 settings/AOG database gate replayed Google Drive OAuth repair
  after an undecryptable stored Drive secret.
- Symptom: Refresh assertions failed because reconnect used the environment
  fallback OAuth client, but the saved token secret did not preserve that
  client, making later refresh behavior ambiguous.
- Root cause: `exchangeGoogleDriveAuthorizationCode` normalized tokens without
  storing the resolved OAuth client used for the token exchange.
- Guardrail: When OAuth repair falls back to an environment client because the
  old encrypted secret cannot be read, persist the resolved client ID/secret in
  the encrypted OAuth secret alongside the new token.
- Preferred pattern: Resolve the OAuth client once, pass it into both the token
  request and normalization, and keep client secrets inside encrypted provider
  secret storage.
- Avoid: Recomputing OAuth client selection separately during exchange and
  refresh when repair flows can change the available source of truth.
- Evidence: `src/integrations/google-drive/google-drive.auth.ts` now preserves
  the resolved OAuth client during exchange/refresh, and
  `src/tests/api.test.ts` asserts the repaired secret and refresh body. `npm
  run test:api` passed against workspace-local PostgreSQL on
  `127.0.0.1:55476`.

### 2026-05-16 - Windows embedded PostgreSQL validation needs explicit locale and database creation
- Context: DMS-01-005A ran `npm run test:api` against the bundled embedded
  PostgreSQL binaries from the Paperclip workspace.
- Symptom: `initdb` failed under the Windows `Polish_Poland.1250` locale, and
  Prisma migration deploy failed when the target `companycore_test` database
  did not exist. PowerShell also rejected using the same file for both
  `RedirectStandardOutput` and `RedirectStandardError`.
- Root cause: The embedded PostgreSQL package includes `initdb.exe` and
  `postgres.exe`, but not `createdb.exe`; PowerShell requires separate stdout
  and stderr redirect paths; the default Windows locale was not accepted by
  PostgreSQL text-search configuration discovery.
- Guardrail: For future portable PostgreSQL validation on Windows, initialize
  with `initdb --locale=C --encoding=UTF8`, start `postgres.exe` with separate
  stdout/stderr log files, create the test database through
  `npx prisma db execute --url postgresql://postgres@127.0.0.1:<port>/postgres?schema=public --stdin`,
  then run `npm run test:api`.
- Preferred pattern: Stop only the validation-owned PostgreSQL process, confirm
  no process command line references the validation data directory or port, and
  remove only the validation-owned `.tmp` directory and logs.
- Evidence: DMS-01-005A passed `npm run test:api` on
  `127.0.0.1:55496` after applying this sequence, then removed
  `.tmp/companycore-strategy001-pg*`.
