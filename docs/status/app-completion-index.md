# App Completion Index

Generated: 2026-07-14T15:57:15.493Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.

## Counts

- Items: 1282
- User flows: 5
- Needs browser/screenshot review: 0
- Missing test link: 1101
- Missing doc link: 30
- Implemented, needs proof: 8
- Blocked: 0
- Known non-ok risk items: 1139
- Priority review items indexed: 200/1139
- Priority review truncated: true

## Flow Summary

- Unclassified user workflow: 1116 entities; risks {"ok":10,"missing_test_link":1070,"implemented_needs_proof":8,"missing_doc_link":28}; gates {"auth":3,"configuration":8}
- Account access: 80 entities; risks {"ok":80}; gates {"auth":80,"configuration":18}
- Dashboard overview: 44 entities; risks {"ok":44}; gates {}
- User configuration: 33 entities; risks {"missing_test_link":31,"missing_doc_link":2}; gates {"configuration":31}
- Trading operation: 9 entities; risks {"ok":9}; gates {}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /agents | Engineering Delivery Lead | src/app.ts#/agents | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /api-keys | Engineering Delivery Lead | src/app.ts#/api-keys | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /api/build-info | Engineering Delivery Lead | src/app.ts#/api/build-info | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /assets | Engineering Delivery Lead | src/app.ts#/assets | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /clients | Engineering Delivery Lead | src/app.ts#/clients | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /commercial-exceptions | Engineering Delivery Lead | src/app.ts#/commercial-exceptions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /company-os | Engineering Delivery Lead | src/app.ts#/company-os | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /connection | Engineering Delivery Lead | src/app.ts#/connection | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /deals | Engineering Delivery Lead | src/app.ts#/deals | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /decisions | Engineering Delivery Lead | src/app.ts#/decisions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /departments | Engineering Delivery Lead | src/app.ts#/departments | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /events | Engineering Delivery Lead | src/app.ts#/events | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /goals | Engineering Delivery Lead | src/app.ts#/goals | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /health | Engineering Delivery Lead | src/app.ts#/health | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /intake | Engineering Delivery Lead | src/app.ts#/intake | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /interactions | Engineering Delivery Lead | src/app.ts#/interactions | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /mcp | Engineering Delivery Lead | src/app.ts#/mcp | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /notes | Engineering Delivery Lead | src/app.ts#/notes | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /operating-graph | Engineering Delivery Lead | src/app.ts#/operating-graph | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /operating-model | Engineering Delivery Lead | src/app.ts#/operating-model | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /operations | Engineering Delivery Lead | src/app.ts#/operations | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /pipeline-stages | Engineering Delivery Lead | src/app.ts#/pipeline-stages | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /process-core | Engineering Delivery Lead | src/app.ts#/process-core | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /projects | Engineering Delivery Lead | src/app.ts#/projects | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /ready | Engineering Delivery Lead | src/app.ts#/ready | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /relationships | Engineering Delivery Lead | src/app.ts#/relationships | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /targets | Engineering Delivery Lead | src/app.ts#/targets | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /task-lists | Engineering Delivery Lead | src/app.ts#/task-lists | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /tasks | Engineering Delivery Lead | src/app.ts#/tasks | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /v1 | Engineering Delivery Lead | src/app.ts#/v1 | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /v1/health | Engineering Delivery Lead | src/app.ts#/v1/health | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /v1/ready | Engineering Delivery Lead | src/app.ts#/v1/ready | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /v1/webhooks/clickup | Engineering Delivery Lead | src/app.ts#/v1/webhooks/clickup | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /workforce | Engineering Delivery Lead | src/app.ts#/workforce | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /workspaces | Engineering Delivery Lead | src/app.ts#/workspaces | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | . | Engineering Delivery Lead | . | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | .agents | Engineering Delivery Lead | .agents | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | .github | Engineering Delivery Lead | .github | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | .tmp | Engineering Delivery Lead | .tmp | - |
| Unclassified user workflow | implemented_needs_proof | feature_or_capability | docs | Engineering Delivery Lead | docs | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | history | Engineering Delivery Lead | history | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | prisma | Engineering Delivery Lead | prisma | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | seed.ts | Engineering Delivery Lead | prisma/seed.ts | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | apiKeyPrefix | Engineering Delivery Lead | prisma/seed.ts#apiKeyPrefix | configuration |
| Unclassified user workflow | missing_test_link | feature_or_capability | ensureCompanyOsFoundation | Engineering Delivery Lead | prisma/seed.ts#ensureCompanyOsFoundation | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | ensureSeedOperatingModel | Engineering Delivery Lead | prisma/seed.ts#ensureSeedOperatingModel | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | ensureWorkforceFoundation | Engineering Delivery Lead | prisma/seed.ts#ensureWorkforceFoundation | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | for | Engineering Delivery Lead | prisma/seed.ts#for | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | generatedWorkforceFiles | Engineering Delivery Lead | prisma/seed.ts#generatedWorkforceFiles | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | hashApiKey | Engineering Delivery Lead | prisma/seed.ts#hashApiKey | configuration |
| Unclassified user workflow | missing_test_link | feature_or_capability | hashPassword | Engineering Delivery Lead | prisma/seed.ts#hashPassword | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | list | Engineering Delivery Lead | prisma/seed.ts#list | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | main | Engineering Delivery Lead | prisma/seed.ts#main | - |
| Unclassified user workflow | missing_doc_link | feature_or_capability | scripts | Engineering Delivery Lead | scripts | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | adapter-smoke.mjs | Engineering Delivery Lead | scripts/adapter-smoke.mjs | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | assertCapability | Engineering Delivery Lead | scripts/adapter-smoke.mjs#assertCapability | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | request | Engineering Delivery Lead | scripts/adapter-smoke.mjs#request | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | agent-training-smoke.mjs | Engineering Delivery Lead | scripts/agent-training-smoke.mjs | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | assertCapability | Engineering Delivery Lead | scripts/agent-training-smoke.mjs#assertCapability | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | request | Engineering Delivery Lead | scripts/agent-training-smoke.mjs#request | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | aog-deploy-smoke.mjs | Engineering Delivery Lead | scripts/aog-deploy-smoke.mjs | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | fail | Engineering Delivery Lead | scripts/aog-deploy-smoke.mjs#fail | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | run | Engineering Delivery Lead | scripts/aog-deploy-smoke.mjs#run | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | backfill-architecture-nodes.mjs | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | csvEscape | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#csvEscape | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | dbModule | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#dbModule | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | loadCsv | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#loadCsv | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | main | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#main | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | pageModule | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#pageModule | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | parseCsv | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#parseCsv | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | readText | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#readText | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | routeFilePath | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#routeFilePath | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | routeModule | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#routeModule | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | toCsv | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#toCsv | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | writeText | Engineering Delivery Lead | scripts/backfill-architecture-nodes.mjs#writeText | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | build-architecture-chain-hardening-worklist.mjs | Engineering Delivery Lead | scripts/build-architecture-chain-hardening-worklist.mjs | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | csvEscape | Engineering Delivery Lead | scripts/build-architecture-chain-hardening-worklist.mjs#csvEscape | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | loadCsv | Engineering Delivery Lead | scripts/build-architecture-chain-hardening-worklist.mjs#loadCsv | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | main | Engineering Delivery Lead | scripts/build-architecture-chain-hardening-worklist.mjs#main | - |
| Unclassified user workflow | missing_test_link | feature_or_capability | parseCsv | Engineering Delivery Lead | scripts/build-architecture-chain-hardening-worklist.mjs#parseCsv | - |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
