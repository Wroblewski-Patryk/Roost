---
id: "FEAT-AUTO-0020"
name: "Operating Model Coverage Expansion"
type: "feature"
status: "implemented"
layer: "full-stack"
module: "operating-model"
feature: "operating-model-coverage"
risk_level: "medium"
completion_percent: "50"
verification_status: "tested"
last_verified_at: "2026-05-24"
tags: "#feature #auto-scaffold #coverage-expansion"
---

# Operating Model Coverage Expansion

- ID: `FEAT-AUTO-0020`
- Type: `feature`
- Status: `implemented`
- Verification: `tested`
- Layer: `full-stack`
- Module: `operating-model`
- Feature: `operating-model-coverage`
- File: `docs/architecture/architecture-evidence-system.md`

## Description

Auto-generated feature grouping for operating-model API coverage expansion.

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

- owns -> [[API-AUTO-0010|DELETE /v1/operating-model/areas/:id]] (partial)
- owns -> [[API-AUTO-0011|DELETE /v1/operating-model/automation-definitions/:id]] (partial)
- owns -> [[API-AUTO-0012|DELETE /v1/operating-model/folders/:id]] (partial)
- owns -> [[API-AUTO-0013|DELETE /v1/operating-model/knowledge-roots/:id]] (partial)
- owns -> [[API-AUTO-0014|DELETE /v1/operating-model/storage-locations/:id]] (partial)
- owns -> [[API-AUTO-0059|GET /v1/operating-model]] (partial)
- owns -> [[API-AUTO-0060|GET /v1/operating-model/area-inventory]] (partial)
- owns -> [[API-AUTO-0061|GET /v1/operating-model/areas]] (partial)
- owns -> [[API-AUTO-0062|GET /v1/operating-model/automation-definitions]] (partial)
- owns -> [[API-AUTO-0063|GET /v1/operating-model/automation-definitions/:id]] (partial)
- owns -> [[API-AUTO-0064|GET /v1/operating-model/external-fields]] (partial)
- owns -> [[API-AUTO-0065|GET /v1/operating-model/external-mappings]] (partial)
- owns -> [[API-AUTO-0066|GET /v1/operating-model/folders]] (partial)
- owns -> [[API-AUTO-0067|GET /v1/operating-model/folders/:id]] (partial)
- owns -> [[API-AUTO-0068|GET /v1/operating-model/knowledge-roots]] (partial)
- owns -> [[API-AUTO-0069|GET /v1/operating-model/knowledge-roots/:id]] (partial)
- owns -> [[API-AUTO-0070|GET /v1/operating-model/storage-locations]] (partial)
- owns -> [[API-AUTO-0071|GET /v1/operating-model/storage-locations/:id]] (partial)
- owns -> [[API-AUTO-0072|GET /v1/operating-model/tables]] (partial)
- owns -> [[API-AUTO-0102|PATCH /v1/operating-model/areas/:id]] (partial)
- owns -> [[API-AUTO-0103|PATCH /v1/operating-model/automation-definitions/:id]] (partial)
- owns -> [[API-AUTO-0104|PATCH /v1/operating-model/external-mappings/:id/scope]] (partial)
- owns -> [[API-AUTO-0105|PATCH /v1/operating-model/folders/:id]] (partial)
- owns -> [[API-AUTO-0106|PATCH /v1/operating-model/knowledge-roots/:id]] (partial)
- owns -> [[API-AUTO-0107|PATCH /v1/operating-model/storage-locations/:id]] (partial)
- owns -> [[API-AUTO-0148|POST /v1/operating-model/areas]] (partial)
- owns -> [[API-AUTO-0149|POST /v1/operating-model/automation-definitions]] (partial)
- owns -> [[API-AUTO-0150|POST /v1/operating-model/folders]] (partial)
- owns -> [[API-AUTO-0151|POST /v1/operating-model/knowledge-roots]] (partial)
- owns -> [[API-AUTO-0152|POST /v1/operating-model/storage-locations]] (partial)
- depends_on -> [[DOC-ARCH-EVIDENCE-SYSTEM|Architecture evidence source doc]] (partial)
- contains -> [[API-AUTO-0010|DELETE /v1/operating-model/areas/:id]] (partial)
- contains -> [[API-AUTO-0011|DELETE /v1/operating-model/automation-definitions/:id]] (partial)
- contains -> [[API-AUTO-0012|DELETE /v1/operating-model/folders/:id]] (partial)
- contains -> [[API-AUTO-0013|DELETE /v1/operating-model/knowledge-roots/:id]] (partial)
- contains -> [[API-AUTO-0014|DELETE /v1/operating-model/storage-locations/:id]] (partial)
- contains -> [[API-AUTO-0059|GET /v1/operating-model]] (partial)
- contains -> [[API-AUTO-0060|GET /v1/operating-model/area-inventory]] (partial)
- contains -> [[API-AUTO-0061|GET /v1/operating-model/areas]] (partial)
- contains -> [[API-AUTO-0062|GET /v1/operating-model/automation-definitions]] (partial)
- contains -> [[API-AUTO-0063|GET /v1/operating-model/automation-definitions/:id]] (partial)
- contains -> [[API-AUTO-0064|GET /v1/operating-model/external-fields]] (partial)
- contains -> [[API-AUTO-0065|GET /v1/operating-model/external-mappings]] (partial)
- contains -> [[API-AUTO-0066|GET /v1/operating-model/folders]] (partial)
- contains -> [[API-AUTO-0067|GET /v1/operating-model/folders/:id]] (partial)
- contains -> [[API-AUTO-0068|GET /v1/operating-model/knowledge-roots]] (partial)
- contains -> [[API-AUTO-0069|GET /v1/operating-model/knowledge-roots/:id]] (partial)
- contains -> [[API-AUTO-0070|GET /v1/operating-model/storage-locations]] (partial)
- contains -> [[API-AUTO-0071|GET /v1/operating-model/storage-locations/:id]] (partial)
- contains -> [[API-AUTO-0072|GET /v1/operating-model/tables]] (partial)
- contains -> [[API-AUTO-0102|PATCH /v1/operating-model/areas/:id]] (partial)
- contains -> [[API-AUTO-0103|PATCH /v1/operating-model/automation-definitions/:id]] (partial)
- contains -> [[API-AUTO-0104|PATCH /v1/operating-model/external-mappings/:id/scope]] (partial)
- contains -> [[API-AUTO-0105|PATCH /v1/operating-model/folders/:id]] (partial)
- contains -> [[API-AUTO-0106|PATCH /v1/operating-model/knowledge-roots/:id]] (partial)
- contains -> [[API-AUTO-0107|PATCH /v1/operating-model/storage-locations/:id]] (partial)
- contains -> [[API-AUTO-0148|POST /v1/operating-model/areas]] (partial)
- contains -> [[API-AUTO-0149|POST /v1/operating-model/automation-definitions]] (partial)
- contains -> [[API-AUTO-0150|POST /v1/operating-model/folders]] (partial)
- contains -> [[API-AUTO-0151|POST /v1/operating-model/knowledge-roots]] (partial)
- contains -> [[API-AUTO-0152|POST /v1/operating-model/storage-locations]] (partial)
- [[AGENT-COORDINATOR|Coordinator agent role]] -> depends_on (partial)

## Chains

- `CHAIN-AUTO-0020` Operating Model Coverage Expansion auto chain: [[API-AUTO-0010|DELETE /v1/operating-model/areas/:id]] -> [[API-AUTO-0011|DELETE /v1/operating-model/automation-definitions/:id]] -> [[API-AUTO-0012|DELETE /v1/operating-model/folders/:id]] -> [[API-AUTO-0013|DELETE /v1/operating-model/knowledge-roots/:id]] -> [[API-AUTO-0014|DELETE /v1/operating-model/storage-locations/:id]] -> [[API-AUTO-0059|GET /v1/operating-model]] -> [[API-AUTO-0060|GET /v1/operating-model/area-inventory]] -> [[API-AUTO-0061|GET /v1/operating-model/areas]] -> [[API-AUTO-0062|GET /v1/operating-model/automation-definitions]] -> [[API-AUTO-0063|GET /v1/operating-model/automation-definitions/:id]] -> [[API-AUTO-0064|GET /v1/operating-model/external-fields]] -> [[API-AUTO-0065|GET /v1/operating-model/external-mappings]] -> [[API-AUTO-0066|GET /v1/operating-model/folders]] -> [[API-AUTO-0067|GET /v1/operating-model/folders/:id]] -> [[API-AUTO-0068|GET /v1/operating-model/knowledge-roots]] -> [[API-AUTO-0069|GET /v1/operating-model/knowledge-roots/:id]] -> [[API-AUTO-0070|GET /v1/operating-model/storage-locations]] -> [[API-AUTO-0071|GET /v1/operating-model/storage-locations/:id]] -> [[API-AUTO-0072|GET /v1/operating-model/tables]] -> [[API-AUTO-0102|PATCH /v1/operating-model/areas/:id]] -> [[API-AUTO-0103|PATCH /v1/operating-model/automation-definitions/:id]] -> [[API-AUTO-0104|PATCH /v1/operating-model/external-mappings/:id/scope]] -> [[API-AUTO-0105|PATCH /v1/operating-model/folders/:id]] -> [[API-AUTO-0106|PATCH /v1/operating-model/knowledge-roots/:id]] -> [[API-AUTO-0107|PATCH /v1/operating-model/storage-locations/:id]] -> [[API-AUTO-0148|POST /v1/operating-model/areas]] -> [[API-AUTO-0149|POST /v1/operating-model/automation-definitions]] -> [[API-AUTO-0150|POST /v1/operating-model/folders]] -> [[API-AUTO-0151|POST /v1/operating-model/knowledge-roots]] -> [[API-AUTO-0152|POST /v1/operating-model/storage-locations]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00180` tested: missing none

## Notes

Auto-generated by feature coverage sync; refine links and status per module evidence.
