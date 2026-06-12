# Task Synchronization Report

Generated: 2026-06-11T17:46:24.686Z

## Contract

Every task should identify the feature/module it changes, dependency expectations, affected files, test requirements, docs requirements, and proof links.

## Signals

- Tasks without architecture links: 0
- Implementation entities without task links: 173
- Verified entities without proof evidence: 0

## Tasks Without Architecture Links


## Implementation Without Task Links

- api_endpoint: GET / (src/app.ts#/)
- api_endpoint: USE /agent-events (src/app.ts#/agent-events)
- api_endpoint: USE /agent-logs (src/app.ts#/agent-logs)
- api_endpoint: USE /agents (src/app.ts#/agents)
- api_endpoint: USE /api-keys (src/app.ts#/api-keys)
- api_endpoint: USE /assets (src/app.ts#/assets)
- api_endpoint: USE /auth (src/app.ts#/auth)
- api_endpoint: USE /clients (src/app.ts#/clients)
- api_endpoint: USE /commercial-exceptions (src/app.ts#/commercial-exceptions)
- api_endpoint: USE /company-os (src/app.ts#/company-os)
- api_endpoint: USE /connection (src/app.ts#/connection)
- api_endpoint: USE /dashboard (src/app.ts#/dashboard)
- api_endpoint: USE /deals (src/app.ts#/deals)
- api_endpoint: USE /decisions (src/app.ts#/decisions)
- api_endpoint: USE /departments (src/app.ts#/departments)
- api_endpoint: USE /events (src/app.ts#/events)
- api_endpoint: USE /finance (src/app.ts#/finance)
- api_endpoint: USE /goals (src/app.ts#/goals)
- api_endpoint: USE /google-drive (src/app.ts#/google-drive)
- api_endpoint: USE /health (src/app.ts#/health)
- api_endpoint: USE /intake (src/app.ts#/intake)
- api_endpoint: USE /integration-settings (src/app.ts#/integration-settings)
- api_endpoint: USE /interactions (src/app.ts#/interactions)
- api_endpoint: USE /mcp (src/app.ts#/mcp)
- api_endpoint: USE /notes (src/app.ts#/notes)
- api_endpoint: USE /operating-graph (src/app.ts#/operating-graph)
- api_endpoint: USE /operating-model (src/app.ts#/operating-model)
- api_endpoint: USE /operations (src/app.ts#/operations)
- api_endpoint: USE /pipeline-stages (src/app.ts#/pipeline-stages)
- api_endpoint: USE /process-core (src/app.ts#/process-core)
- api_endpoint: USE /projects (src/app.ts#/projects)
- api_endpoint: USE /relationships (src/app.ts#/relationships)
- api_endpoint: USE /sales (src/app.ts#/sales)
- api_endpoint: USE /strategy (src/app.ts#/strategy)
- api_endpoint: USE /targets (src/app.ts#/targets)
- api_endpoint: USE /task-lists (src/app.ts#/task-lists)
- api_endpoint: USE /tasks (src/app.ts#/tasks)
- api_endpoint: USE /v1 (src/app.ts#/v1)
- api_endpoint: USE /v1/auth (src/app.ts#/v1/auth)
- api_endpoint: USE /v1/health (src/app.ts#/v1/health)
- api_endpoint: USE /v1/webhooks/clickup (src/app.ts#/v1/webhooks/clickup)
- api_endpoint: USE /workforce (src/app.ts#/workforce)
- api_endpoint: USE /workspaces (src/app.ts#/workspaces)
- component: cc-field.tsx (web/src/components/cc-field.tsx)
- component: cc-notice.tsx (web/src/components/cc-notice.tsx)
- component: cc-resource-selector.tsx (web/src/components/cc-resource-selector.tsx)
- component: cc-text-input.tsx (web/src/components/cc-text-input.tsx)
- feature: seed.ts (prisma/seed.ts)
- feature: adapter-smoke.mjs (scripts/adapter-smoke.mjs)
- feature: aog-deploy-smoke.mjs (scripts/aog-deploy-smoke.mjs)
- feature: backfill-architecture-nodes.mjs (scripts/backfill-architecture-nodes.mjs)
- feature: build-architecture-chain-hardening-worklist.mjs (scripts/build-architecture-chain-hardening-worklist.mjs)
- feature: build-architecture-proof-bundle.mjs (scripts/build-architecture-proof-bundle.mjs)
- feature: build-architecture-registry-catalog.mjs (scripts/build-architecture-registry-catalog.mjs)
- feature: check-architecture-command-contract.mjs (scripts/check-architecture-command-contract.mjs)
- feature: check-architecture-evidence-cardinality.mjs (scripts/check-architecture-evidence-cardinality.mjs)
- feature: check-architecture-graph-artifact-consistency.mjs (scripts/check-architecture-graph-artifact-consistency.mjs)
- feature: check-architecture-pipeline-nodes.mjs (scripts/check-architecture-pipeline-nodes.mjs)
- feature: check-architecture-proof-bundle-gate.mjs (scripts/check-architecture-proof-bundle-gate.mjs)
- feature: check-route-capabilities.mjs (scripts/check-route-capabilities.mjs)
- feature: clickup-production-bootstrap.mjs (scripts/clickup-production-bootstrap.mjs)
- feature: google-drive-production-smoke.mjs (scripts/google-drive-production-smoke.mjs)
- feature: print-architecture-status.mjs (scripts/print-architecture-status.mjs)
- feature: sync-architecture-chains.mjs (scripts/sync-architecture-chains.mjs)
- feature: sync-architecture-doc-baseline.mjs (scripts/sync-architecture-doc-baseline.mjs)
- feature: app.ts (src/app.ts)
- feature: agent-key-profiles.ts (src/auth/agent-key-profiles.ts)
- feature: api-key.middleware.ts (src/auth/api-key.middleware.ts)
- feature: api-key.ts (src/auth/api-key.ts)
- feature: capabilities.ts (src/auth/capabilities.ts)
- feature: password.ts (src/auth/password.ts)
- feature: token.ts (src/auth/token.ts)
- feature: env.ts (src/config/env.ts)
- feature: prisma.ts (src/db/prisma.ts)
- feature: health.routes.ts (src/health/health.routes.ts)
- feature: clickup.client.ts (src/integrations/clickup/clickup.client.ts)
- feature: clickup.maintenance-scheduler.ts (src/integrations/clickup/clickup.maintenance-scheduler.ts)
- feature: clickup.mapper.ts (src/integrations/clickup/clickup.mapper.ts)
- feature: clickup.sync.ts (src/integrations/clickup/clickup.sync.ts)
- feature: clickup.webhooks.ts (src/integrations/clickup/clickup.webhooks.ts)