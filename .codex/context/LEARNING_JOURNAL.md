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
