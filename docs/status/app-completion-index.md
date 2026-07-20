# App Completion Index

Generated: 2026-07-20T21:42:34.135Z
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
- Missing test link: 4
- Missing doc link: 0
- Implemented, needs proof: 0
- Blocked: 0
- Known non-ok risk items: 4
- Priority review items indexed: 4/4
- Priority review truncated: false

## Flow Summary

- Unclassified user workflow: 27 entities; risks {"ok":24,"missing_test_link":3}; gates {"auth":21}
- Account access: 16 entities; risks {"ok":16}; gates {"auth":16,"configuration":3}
- User configuration: 2 entities; risks {"ok":1,"missing_test_link":1}; gates {"auth":1,"configuration":2}
- Dashboard overview: 1 entities; risks {"ok":1}; gates {}

## Priority Review Queue

| User flow | Risk | Kind | Entity | Owner | Path | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /v1/webhooks/clickup | Engineering Delivery Lead | src/app.ts#/v1/webhooks/clickup | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /workforce | Engineering Delivery Lead | src/app.ts#/workforce | - |
| Unclassified user workflow | missing_test_link | api_endpoint | USE /workspaces | Engineering Delivery Lead | src/app.ts#/workspaces | - |
| User configuration | missing_test_link | api_endpoint | USE /integration-settings | Engineering Delivery Lead | src/app.ts#/integration-settings | configuration |

## Agent Rule

A user-facing feature is not complete until the backend/API state, frontend route/component state, configuration/auth/subscription gates, tests, docs, and browser screenshot/clickthrough evidence are either verified or explicitly blocked with an owner/action.
