# App Completion Index

Generated: 2026-07-15T18:10:53.806Z
Project: Roost
Root: C:/Personal/Projekty/Aplikacje/Roost
Source graph: docs/graphs/architecture-awareness.json

## Purpose

This index turns architecture-awareness entities into user-facing completion lanes.
Agents use it to decide what to plan next: backend/API proof, frontend/browser proof, auth/subscription/configuration gates, exchange integration proof, or cleanup.
Internal functions and modules are implementation details: they receive proof through their owning product boundary and are not dispatched as one issue per symbol.

## Counts

- Items: 46
- User flows: 4
- Needs browser/screenshot review: 0
- Missing test link: 23
- Missing doc link: 2
- Implemented, needs proof: 0
- Blocked: 0
- Known non-ok risk items: 25
- Priority review items indexed: 25/25
- Priority review truncated: false

## Flow Summary

- Unclassified user workflow: 36 entities; risks {"ok":13,"missing_doc_link":1,"missing_test_link":22}; gates {"auth":11}
- Account access: 7 entities; risks {"ok":7}; gates {"auth":7,"configuration":1}
- User configuration: 2 entities; risks {"missing_doc_link":1,"missing_test_link":1}; gates {"auth":1,"configuration":2}
- Dashboard overview: 1 entities; risks {"ok":1}; gates {}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| Unclassified user workflow | missing_doc_link | api_endpoint | USE /goals | Engineering Delivery Lead | src/app.ts#/goals | auth |
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
| User configuration | missing_doc_link | api_endpoint | USE /connection | Engineering Delivery Lead | src/app.ts#/connection | auth, configuration |
| User configuration | missing_test_link | api_endpoint | USE /integration-settings | Engineering Delivery Lead | src/app.ts#/integration-settings | configuration |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
