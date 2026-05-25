---
id: "API-AUTO-0120"
name: "POST /v1/company-os/approvals/request"
type: "api_route"
status: "implemented"
layer: "backend"
module: "company-os"
feature: "company-os-coverage"
risk_level: ""
completion_percent: ""
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#api #auto-scaffold #missing"
---

# POST /v1/company-os/approvals/request

- ID: `API-AUTO-0120`
- Type: `api_route`
- Status: `implemented`
- Verification: `tested`
- Layer: `backend`
- Module: `company-os`
- Feature: `company-os-coverage`
- File: `src/modules/company-os/company-os.routes.ts`

## Description

Auto-scaffolded from manifest drift report.

## Direct Links

- Parent: [[FEAT-AUTO-0006|Company Os Coverage Expansion]]
- Children: none
- Depends on: none
- Used by: none
- UI: none
- API: none
- Database: none
- Tests: none
- Docs: none
- Agent: none

## Relations

- No outgoing relations.
- [[FEAT-AUTO-0006|Company Os Coverage Expansion]] -> owns (partial)
- [[FEAT-AUTO-0006|Company Os Coverage Expansion]] -> contains (partial)

## Chains

- `CHAIN-AUTO-0006` Company Os Coverage Expansion auto chain: [[API-AUTO-0003|DELETE /v1/company-os/standards/:id]] -> [[API-AUTO-0030|GET /v1/company-os]] -> [[API-AUTO-0031|GET /v1/company-os/:collection]] -> [[API-AUTO-0032|GET /v1/company-os/:collection/:id]] -> [[API-AUTO-0033|GET /v1/company-os/workflow-definitions/drafts]] -> [[API-AUTO-0034|GET /v1/company-os/workflow-definitions/drafts/:id]] -> [[API-AUTO-0091|PATCH /v1/company-os/standards/:id]] -> [[API-AUTO-0092|PATCH /v1/company-os/workflow-definitions/drafts/:id]] -> [[API-AUTO-0119|POST /v1/company-os/approvals/:id/decision]] -> [[API-AUTO-0120|POST /v1/company-os/approvals/request]] -> [[API-AUTO-0121|POST /v1/company-os/events/:id/actions/evaluate-automation-rules]] -> [[API-AUTO-0122|POST /v1/company-os/pipeline-runs/:id/actions/start-stage]] -> [[API-AUTO-0123|POST /v1/company-os/stage-runs/:id/actions/block]] -> [[API-AUTO-0124|POST /v1/company-os/stage-runs/:id/actions/complete]] -> [[API-AUTO-0125|POST /v1/company-os/stage-runs/:id/actions/validate]] -> [[API-AUTO-0126|POST /v1/company-os/standards]] -> [[API-AUTO-0127|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive]] -> [[API-AUTO-0128|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft]] -> [[API-AUTO-0129|POST /v1/company-os/workflow-definitions/drafts]] -> [[API-AUTO-0130|POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate]] -> [[API-AUTO-0131|POST /v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00210` tested: missing none

## Notes

Populate ownership and links before promotion to canonical registry.
