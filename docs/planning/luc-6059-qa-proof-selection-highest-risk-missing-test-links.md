# LUC-6059 QA Proof Selection For Highest-Risk Missing Test Links

## Header

- ID: [LUC-6059](/LUC/issues/LUC-6059)
- Parent: [LUC-6054](/LUC/issues/LUC-6054)
- Task Type: QA verification
- Current Stage: verification
- Status: VERIFIED_DONE
- Owner: Test Automation Engineer
- Date: 2026-06-28

## Goal

Convert the refreshed app-completion and architecture health signals after
[LUC-6054](/LUC/issues/LUC-6054) into the smallest executable QA proof lane.

## Scope

- Inputs:
  - `docs/status/app-completion-index.json`
  - `docs/status/app-completion-index.md`
  - `docs/status/architecture-awareness-report.md`
  - `src/tests/api.test.ts`
- Chosen flow: `Subscription and entitlement`
- Chosen proof target: `GET /v1/finance/context` read-only finance and
  entitlement context inside the named API test
  `CompanyCore v1 protected API flow`.
- Exclusions: product code changes, schema changes, new test authoring,
  browser proof, protected smoke, deploy, push, restart, live provider action,
  credential access, and secret disclosure.

## Selection Rationale

The current app-completion snapshot generated `2026-06-28T21:11:15.013Z`
reports `1043` items, `7` flows, `1003` missing test links, `7` missing doc
links, `0` blocked records, and `0` browser-review records.

The highest-risk current flow by volume remains `Subscription and entitlement`
with `694` entities, including `664` missing test links and `26`
implemented-needs-proof rows. Prior curation packets classify much of this as
scanner/proof-link debt over planning and feature documents, but the concrete
runtime contract still worth re-proving locally is the current money-facing
surface: `GET /v1/finance/context`.

This target is safe for the Test Automation Engineer role because it uses the
existing local API integration test suite, a disposable local PostgreSQL
database, and no live credentials or protected production action.

## Proof Covered

The selected named test already contains the subscription/entitlement-relevant
assertions:

- unauthenticated `GET /v1/finance/context` returns `401`;
- authenticated owner can read finance context;
- finance context exposes pricing candidates, owner-decision requirements,
  blocked invoice readiness, and blocked agent actions;
- read-only context does not mutate approvals, notes, deals, tasks, or agent
  events except for the expected pre-existing test deal state;
- workspace B does not receive workspace A commercial exception data;
- MCP manifest exposes `companycore_get_finance_context` as `finance:read`
  with `riskLevel: read` and `requiresApproval: false`.

## Verification

Commands run with validation-owned PostgreSQL container
`companycore-luc-6059-postgres` on `127.0.0.1:55594`:

```powershell
$env:DATABASE_URL='postgresql://companycore:companycore@127.0.0.1:55594/companycore_test?schema=public'
$env:NODE_ENV='test'
docker exec companycore-luc-6059-postgres pg_isready -U companycore -d companycore_test
npm run build:server
npm run prisma:migrate:deploy
npm run seed
node --test --test-name-pattern "CompanyCore v1 protected API flow" dist/tests/api.test.js
```

Result:

- PostgreSQL readiness: PASS.
- `npm run build:server`: PASS.
- `npm run prisma:migrate:deploy`: PASS, `31` migrations applied.
- `npm run seed`: PASS.
- Scoped Node test: PASS, `1/1` tests.
- `git diff --check`: PASS with existing Windows LF-to-CRLF warnings only.
- Cleanup: `docker rm -f companycore-luc-6059-postgres` PASS.
- Browser cleanup check: no `chrome-headless-shell` process rows found.

## Acceptance Criteria

- Exact flow/entity/path chosen: `Subscription and entitlement` /
  `GET /v1/finance/context` / `src/tests/api.test.ts` named test
  `CompanyCore v1 protected API flow`.
- Command results recorded: yes.
- Evidence movement: the concrete finance/subscription entitlement runtime
  contract is verified locally by scoped API proof; the aggregate
  app-completion missing-test-link count remains scanner/proof-link debt.
- Protected blocker handling: no secrets, live account, deploy, or protected
  smoke was required.
- Engineering child issue: not needed because no implementation defect was
  found.

## Result Report

Status: `VERIFIED_DONE`.

No product code was changed for this issue. The highest-risk concrete proof
target available after [LUC-6054](/LUC/issues/LUC-6054) was re-proved locally
through the existing API regression suite. Remaining subscription/entitlement
missing-test-link volume is still broad app-completion evidence-link debt
unless a future snapshot exposes a new unverified runtime route, API endpoint,
browser surface, or capability.

Source-control disposition: not committed. The shared worktree was already
mixed-dirty and `main` is ahead of `origin/main`; this issue only adds this
evidence packet and source-of-truth state notes.

Push status: not needed.

Deploy impact: none.

Residual risk: protected production proof remains separately gated by
credential/operator approval. This heartbeat did not run production smoke.
