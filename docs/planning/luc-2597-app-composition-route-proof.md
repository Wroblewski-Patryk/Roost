# LUC-2597 App Composition Route Proof

## Scope

This packet closes the app-completion `missing_test_link` finding rooted at
`api_endpoint:get:1998daec82`. The finding groups the public root endpoint and
39 Express mount points declared by `src/app.ts`.

## Diagnosis

`src/tests/api.test.ts` already exercises every indexed path through a literal
request to the public route, protected legacy route, or protected `/v1` alias.
The architecture-awareness graph linked that integration test to the
`src/app.ts` feature entity, but did not propagate the relation to route
entities created from the same file. Only four mounted routes had explicit
`tests` overrides. The resulting gap was evidence-link drift, not an
unimplemented endpoint or a newly discovered runtime failure.

## Proof Matrix

| Indexed route group | Executable evidence |
| --- | --- |
| Public composition: `/`, `/health`, `/v1/health`, `/ready`, `/v1/ready`, `/api/build-info` | Public and production-host assertions in `src/tests/api.test.ts` |
| Protected core mounts: projects, goals, targets, task lists, tasks, clients, deals, decisions, departments, interactions, notes, agents, agent logs/events, and API keys | Owner, service-key, denial, CRUD, and workspace-isolation requests in `src/tests/api.test.ts` |
| Protected operating-system mounts: assets, commercial exceptions, company OS, connection, events, intake, MCP, operating graph/model, operations, pipeline stages, process core, relationships, workforce, and workspaces | Context, command, manifest, denial, and workspace-isolation requests in `src/tests/api.test.ts` |
| Provider/ingress mounts: Google Drive, product-map projection ingest, and ClickUp webhook | Mocked-provider, ingress-auth, signature, idempotency, and error-path requests in `src/tests/api.test.ts` |
| Version composition: `/v1` | The same protected routers are mounted on both legacy and `/v1` prefixes; the integration flow exercises both compatibility and versioned routes |

The explicit `tests` and `documents` relations are maintained in
`docs/architecture/scanner-overrides.json`. They target all 40 source paths
listed in `docs/status/app-completion-index.json`.

## Verification

Run:

```powershell
npm run test:api:local
node <Softwarehouse>/scripts/build-architecture-awareness-index.mjs --project Roost --root <Roost>
node <Softwarehouse>/scripts/build-app-completion-index.mjs --project Roost --root <Roost>
node <Softwarehouse>/scripts/build-project-truth-indexes.mjs --project Roost --root <Roost>
```

Acceptance requires the API test to pass and the regenerated app-completion
index to report zero risk items for the grouped source item.

### Result on 2026-08-09

- `node --stack_size=8192 ./node_modules/typescript/bin/tsc --noEmit` passed.
- Architecture-awareness regeneration completed with all 125 configured
  relation overrides applied; the 80 relations added for this packet resolve
  to 40 unique test targets and 40 matching documentation targets.
- App-completion regeneration passed with `missingTestLink=0`,
  `missingDocLink=0`, `riskItems=0`, and `appCompletionRiskItems=0`.
- Project-truth regeneration was applied and now reports
  `appCompletionGaps=0` and `knownAppCompletionRiskItems=0`.
- `npm run test:api:local` could not start because the workstation Docker
  engine/pipe was unavailable. The runner failed before database creation or
  test execution, so this is an environment blocker rather than a test
  failure.
- `npm run build` could not emit over the active runtime's locked `dist` files
  (`TS5033` / `EPERM`). The no-emit TypeScript check passed, and no shared
  runtime process was terminated.
- The refreshed project truth separately records public-probe egress and
  source/deployment alignment gaps. They do not reopen this app-completion
  evidence-link finding.

## Boundaries

- No application behavior, database schema, provider configuration, or
  production runtime is changed.
- No production deployment is required; this is local test-evidence and
  architecture-index reconciliation.
- Production protected-route health remains a separate deployment-monitoring
  concern.
