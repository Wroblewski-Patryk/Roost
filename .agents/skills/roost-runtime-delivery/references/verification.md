# Verification routing

Start with the narrowest check that can falsify the change quickly. Repair a
failure before broadening verification. Inspect `package.json` and the relevant
engineering or operations document for current commands instead of inventing a
parallel test entrypoint.

## Repository contract

For every material change:

```powershell
npm run codex:preflight
npm run codex:requirements
git diff --check
```

These commands validate delivery-document structure and requirement coverage;
they do not prove the application runtime.

## Change classes

| Change | Minimum routing before gate-specific proof |
| --- | --- |
| Documentation or skill | `npm run codex:check`, inspect links and diff |
| Server or shared TypeScript | targeted test, `npm run typecheck`, `npm run build:server` |
| React owner console | focused model/component test, `npm run build:web`, real browser flow when behavior or layout changes |
| API and database | focused contract/integration test, migration review, Prisma generation where applicable, disposable-database test |
| Windows Worker or process lifecycle | focused `agent-host` tests plus the real Windows lifecycle required by the gate |
| Hermes/provider routing | focused provider and Hermes tests plus managed native launch with recorded backend, model and reasoning effort |
| MCP or integration adapter | contract test, real scoped smoke when credentials and authority exist, read-back of resulting state |
| Release | accepted exact commit, migration state, deploy observation, health baseline comparison and rollback evidence |

Run `npm run validate` for a coherent milestone that changes shipped code.
Database-backed suites use only the disposable database documented in
`docs/engineering/testing.md`; never reset production or accept drift by
editing an applied migration.

## Gate proof

Before advancing a gate, reread its exact text in `docs/implementation.md` and
list every required observable. Tests below the required boundary remain useful
but cannot replace native or production evidence. Record failure evidence too;
it determines the next repair without pretending that the gate advanced.
