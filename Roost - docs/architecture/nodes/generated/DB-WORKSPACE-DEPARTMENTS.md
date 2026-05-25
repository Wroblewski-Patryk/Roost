---
id: "DB-WORKSPACE-DEPARTMENTS"
name: "workspace_departments model"
type: "database_model"
status: "verified"
layer: "database"
module: "departments"
feature: "management-department-catalog"
risk_level: "medium"
completion_percent: "90"
verification_status: "verified"
last_verified_at: "2026-05-24"
tags: "#database #departments"
---

# workspace_departments model

- ID: `DB-WORKSPACE-DEPARTMENTS`
- Type: `database_model`
- Status: `verified`
- Verification: `verified`
- Layer: `database`
- Module: `departments`
- Feature: `management-department-catalog`
- File: `prisma/schema.prisma`

## Description

Workspace-scoped department catalog persistence model.

## Direct Links

- Parent: [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]
- Children: none
- Depends on: [[API-DEPARTMENTS-LIST|GET /v1/departments]], [[API-DEPARTMENTS-CREATE|POST /v1/departments]], [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]]
- Used by: [[COMP-SHELL|Authenticated Shell component]]
- UI: none
- API: [[API-DEPARTMENTS-LIST|GET /v1/departments]]
- Database: [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]]
- Tests: [[TEST-API-LOCAL|npm run test:api:local]]
- Docs: [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]
- Agent: [[AGENT-COORDINATOR|Coordinator agent role]]

## Relations

- depends_on -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] (partial)
- depends_on -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] (partial)
- depends_on -> [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]] (partial)
- [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> reads (verified)
- [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> writes (verified)
- [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]] -> writes (partial)
- [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> depends_on (partial)
- [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> depends_on (partial)
- [[API-DEPARTMENTS-UPDATE|PATCH /v1/departments/:id]] -> depends_on (partial)
- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]] -> contains (partial)
- [[COMP-SHELL|Authenticated Shell component]] -> depends_on (partial)
- [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> depends_on (partial)
- [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> depends_on (partial)

## Chains

- `CHAIN-MGMT-DEPT-CATALOG` Management department catalog execution chain: [[PAGE-12-MANAGEMENT-DEPARTMENTS|/areas?area=12-zarzadzanie&view=departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[COMP-MANAGEMENT-ROUTE|ManagementRoute component]] -> [[UI-MGMT-DEPARTMENT-FORM|Department catalog form]] -> [[API-DEPARTMENTS-CREATE|POST /v1/departments]] -> [[FUNC-ENSURE-DEFAULT-DEPARTMENTS|ensureDefaultDepartments]] -> [[FUNC-SERIALIZE-DEPARTMENT|serializeDepartment]] -> [[DB-WORKSPACE-DEPARTMENTS|workspace_departments model]] -> [[API-DEPARTMENTS-LIST|GET /v1/departments]] -> [[COMP-SHELL|Authenticated Shell component]] -> [[TEST-BROWSER-MGMT-DEPT|Browser rendered department catalog proof]] -> [[DOC-MGMT-DEPT-CONTRACT|Management department catalog task contract]]

## Tests

- No test rows.

## Evidence

- `EVID-AUTO-00012` verified: missing none

## Notes

Migration applied during test:api:local with 27 migrations.
