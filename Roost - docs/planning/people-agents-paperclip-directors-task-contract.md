# Task

## Header
- ID: PEOPLE-AGENTS-PAPERCLIP-001
- Title: Paperclip director roster and useful People/Agents Directory
- Task Type: feature
- Current Stage: release
- Status: DONE
- Owner: Backend Builder + Frontend Builder + QA/Test
- Priority: P1
- Module Confidence Rows: DMS-06-WORKFORCE-001
- Requirement Rows: REQ-PA-PAPERCLIP-DIRECTORS-001
- Operation Mode: BUILDER
- Mission ID: PEOPLE-AGENTS-PAPERCLIP-DIRECTORS-2026-05-18
- Mission Status: VERIFIED

## Context
CompanyCore/Roost remains the source of truth for workforce records, generated
agent context files, hierarchy, skills, knowledge, tools, and sync packets.
Paperclip remains the external runtime. The owner provided Paperclip access and
requested the 00 + 12 director agents to be represented in CompanyCore before
the next Directory UX iteration.

## Goal
Import the 13 Paperclip director agents into the `workforce_entities`
foundation, add the missing source-of-truth columns needed for hierarchy and
runtime access indexes, enrich generated `agent.md`, `personality.md`, and
`environment.md`, and make the Directory roster more useful for managing
people and agents.

## Scope
- `prisma/schema.prisma`
- `prisma/migrations/202605181_paperclip_director_workforce_indexes/migration.sql`
- `prisma/seed.ts`
- `src/modules/workforce/workforce.routes.ts`
- `src/modules/workforce/workforce.service.ts`
- `src/tests/api.test.ts`
- `web/src/features/departments/people-agents-route.tsx`
- `web/src/types.ts`
- project state, requirement, and confidence docs

## Acceptance Criteria
- [ ] `workforce_entities` stores hierarchy level, Big Five profile, skills,
      knowledge, tools, authority scope, and Paperclip runtime profile.
- [ ] Seed upserts the 13 verified Paperclip director agents and links 01-12
      to 00 AIA through `manager_id`.
- [ ] Generated markdown includes role, department, hierarchy, skills,
      knowledge, tools, Big Five, organization context, and Paperclip runtime
      boundary.
- [ ] `/v1/workforce` accepts and returns the new fields with validation.
- [ ] Directory list supports dense scanning of manager, runtime, Big Five,
      skills, knowledge, tools, directors, and active records.
- [ ] Server build, web build, validation, API local test runner, seed smoke,
      and UI responsive proof pass or residual risk is recorded.

## Evidence Notes
- Paperclip pages were visited read-only on 2026-05-18 for:
  `dashboard`, `instructions`, `skills`, `knowledge`, `tools`, and
  `configuration`.
- Captured runtime facts: 13 director agents, Paperclip UUIDs, department
  labels, manager relationship to `00 AIA`, model `gpt-5.3-codex`, Codex local
  adapter, common skill library names, CompanyCore knowledge/tool access
  counts, and runtime status.

## Result Report
- Added `hierarchy_level`, `big_five_profile`, `skill_index`,
  `knowledge_index`, `tool_index`, `authority_scope`, and
  `paperclip_profile` to `workforce_entities`.
- Added an idempotent seed path that upserts 00 AIA plus the 12 department
  directors from Paperclip as active `source=paperclip` workforce agents,
  links 01-12 to 00 AIA, and archives old non-director `source=seed` workforce
  agent rows.
- Enriched generated `agent.md`, `personality.md`, and `environment.md` with
  hierarchy, indexes, Big Five, organization map, and source-of-truth runtime
  boundary.
- Expanded `/v1/workforce` validation and API regression coverage for the new
  fields.
- Improved Directory scanning with active-by-default records, director filter,
  tools/knowledge sorting, Paperclip runtime, manager, hierarchy, Big Five, and
  access-index details.
- Validation passed:
  `npm run validate`,
  `npm run test:api:local`,
  disposable PostgreSQL migration + seed smoke,
  and rendered desktop/tablet/mobile UI proof with no horizontal overflow.
