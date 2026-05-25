---
id: "FEAT-AUTO-0006"
name: "Company Os Coverage Expansion"
type: "feature"
status: "implemented"
layer: "full-stack"
module: "company-os"
feature: "company-os-coverage"
risk_level: "medium"
completion_percent: "50"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#feature #auto-scaffold #coverage-expansion"
---

# Company Os Coverage Expansion

- ID: `FEAT-AUTO-0006`
- Type: `feature`
- Status: `implemented`
- Verification: `tested`
- Layer: `full-stack`
- Module: `company-os`
- Feature: `company-os-coverage`
- File: `docs/architecture/architecture-evidence-system.md`

## Description

Auto-generated feature grouping for company-os API coverage expansion.

## Direct Links

- Parent: none
- Children: none
- Depends on: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Used by: [[AGENT-COORDINATOR|Coordinator agent role]]
- UI: none
- API: none
- Database: none
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- owns -> [[API-AUTO-0003|DELETE /v1/company-os/standards/:id]] (partial)
- owns -> [[API-AUTO-0030|GET /v1/company-os]] (partial)
- owns -> [[API-AUTO-0031|GET /v1/company-os/:collection]] (partial)
- owns -> [[API-AUTO-0032|GET /v1/company-os/:collection/:id]] (partial)
- owns -> [[API-AUTO-0033|GET /v1/company-os/workflow-definitions/drafts]] (partial)
- owns -> [[API-AUTO-0034|GET /v1/company-os/workflow-definitions/drafts/:id]] (partial)
- owns -> [[API-AUTO-0091|PATCH /v1/company-os/standards/:id]] (partial)
- owns -> [[API-AUTO-0092|PATCH /v1/company-os/workflow-definitions/drafts/:id]] (partial)
- owns -> [[API-AUTO-0119|POST /v1/company-os/approvals/:id/decision]] (partial)
- owns -> [[API-AUTO-0120|POST /v1/company-os/approvals/request]] (partial)
- owns -> [[API-AUTO-0121|POST /v1/company-os/events/:id/actions/evaluate-automation-rules]] (partial)
- owns -> [[API-AUTO-0122|POST /v1/company-os/pipeline-runs/:id/actions/start-stage]] (partial)
- owns -> [[API-AUTO-0123|POST /v1/company-os/stage-runs/:id/actions/block]] (partial)
- owns -> [[API-AUTO-0124|POST /v1/company-os/stage-runs/:id/actions/complete]] (partial)
- owns -> [[API-AUTO-0125|POST /v1/company-os/stage-runs/:id/actions/validate]] (partial)
- owns -> [[API-AUTO-0126|POST /v1/company-os/standards]] (partial)
- owns -> [[API-AUTO-0127|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive]] (partial)
- owns -> [[API-AUTO-0128|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft]] (partial)
- owns -> [[API-AUTO-0129|POST /v1/company-os/workflow-definitions/drafts]] (partial)
- owns -> [[API-AUTO-0130|POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate]] (partial)
- owns -> [[API-AUTO-0131|POST /v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact]] (partial)
- depends_on -> [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] (partial)
- contains -> [[API-AUTO-0003|DELETE /v1/company-os/standards/:id]] (partial)
- contains -> [[API-AUTO-0030|GET /v1/company-os]] (partial)
- contains -> [[API-AUTO-0031|GET /v1/company-os/:collection]] (partial)
- contains -> [[API-AUTO-0032|GET /v1/company-os/:collection/:id]] (partial)
- contains -> [[API-AUTO-0033|GET /v1/company-os/workflow-definitions/drafts]] (partial)
- contains -> [[API-AUTO-0034|GET /v1/company-os/workflow-definitions/drafts/:id]] (partial)
- contains -> [[API-AUTO-0091|PATCH /v1/company-os/standards/:id]] (partial)
- contains -> [[API-AUTO-0092|PATCH /v1/company-os/workflow-definitions/drafts/:id]] (partial)
- contains -> [[API-AUTO-0119|POST /v1/company-os/approvals/:id/decision]] (partial)
- contains -> [[API-AUTO-0120|POST /v1/company-os/approvals/request]] (partial)
- contains -> [[API-AUTO-0121|POST /v1/company-os/events/:id/actions/evaluate-automation-rules]] (partial)
- contains -> [[API-AUTO-0122|POST /v1/company-os/pipeline-runs/:id/actions/start-stage]] (partial)
- contains -> [[API-AUTO-0123|POST /v1/company-os/stage-runs/:id/actions/block]] (partial)
- contains -> [[API-AUTO-0124|POST /v1/company-os/stage-runs/:id/actions/complete]] (partial)
- contains -> [[API-AUTO-0125|POST /v1/company-os/stage-runs/:id/actions/validate]] (partial)
- contains -> [[API-AUTO-0126|POST /v1/company-os/standards]] (partial)
- contains -> [[API-AUTO-0127|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive]] (partial)
- contains -> [[API-AUTO-0128|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft]] (partial)
- contains -> [[API-AUTO-0129|POST /v1/company-os/workflow-definitions/drafts]] (partial)
- contains -> [[API-AUTO-0130|POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate]] (partial)
- contains -> [[API-AUTO-0131|POST /v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact]] (partial)
- owns -> [[API-AUTO-0168|POST /v1/company-os/pipeline-runs/:id/task-links]] (partial)
- contains -> [[API-AUTO-0168|POST /v1/company-os/pipeline-runs/:id/task-links]] (partial)
- owns -> [[API-AUTO-0169|POST /v1/company-os/knowledge-links]] (partial)
- contains -> [[API-AUTO-0169|POST /v1/company-os/knowledge-links]] (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-AUTO-0006` Company Os Coverage Expansion auto chain: [[API-AUTO-0003|DELETE /v1/company-os/standards/:id]] -> [[API-AUTO-0030|GET /v1/company-os]] -> [[API-AUTO-0031|GET /v1/company-os/:collection]] -> [[API-AUTO-0032|GET /v1/company-os/:collection/:id]] -> [[API-AUTO-0033|GET /v1/company-os/workflow-definitions/drafts]] -> [[API-AUTO-0034|GET /v1/company-os/workflow-definitions/drafts/:id]] -> [[API-AUTO-0091|PATCH /v1/company-os/standards/:id]] -> [[API-AUTO-0092|PATCH /v1/company-os/workflow-definitions/drafts/:id]] -> [[API-AUTO-0119|POST /v1/company-os/approvals/:id/decision]] -> [[API-AUTO-0120|POST /v1/company-os/approvals/request]] -> [[API-AUTO-0121|POST /v1/company-os/events/:id/actions/evaluate-automation-rules]] -> [[API-AUTO-0122|POST /v1/company-os/pipeline-runs/:id/actions/start-stage]] -> [[API-AUTO-0123|POST /v1/company-os/stage-runs/:id/actions/block]] -> [[API-AUTO-0124|POST /v1/company-os/stage-runs/:id/actions/complete]] -> [[API-AUTO-0125|POST /v1/company-os/stage-runs/:id/actions/validate]] -> [[API-AUTO-0126|POST /v1/company-os/standards]] -> [[API-AUTO-0127|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive]] -> [[API-AUTO-0128|POST /v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft]] -> [[API-AUTO-0129|POST /v1/company-os/workflow-definitions/drafts]] -> [[API-AUTO-0130|POST /v1/company-os/workflow-definitions/drafts/:id/actions/activate]] -> [[API-AUTO-0131|POST /v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00166` tested: missing none

## Notes

Auto-generated by feature coverage sync; refine links and status per module evidence.
