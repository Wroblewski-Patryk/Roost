# Roost v1.0 Sale-Readiness Contract

Last updated: 2026-07-23
Version: `v1.0`
Status: `conditional_guided_sale_ready`
Canonical gap register: `docs/releases/roost-v1-0-gap-register.md`

## Purpose

This contract states what Roost v1.0 can honestly be sold, granted access
for, or positioned as ready on 2026-07-23. It is evidence-backed and bounded.
It does not authorize broad provider writes, hosted Paperclip V1, or
autonomous whole-company operation.

## Decision

Roost v1.0 is ready for a guided owner-operated sale or pilot under a
controlled delivery model:

- one workspace-scoped owner or operator
- manual onboarding and human-guided setup
- manual but proven deployment and smoke process
- MCP/API use through supervised or read-only scoped service keys
- knowledge-plane use as a governed read surface over imported company context

Roost v1.0 is not yet approved as:

- a self-serve SaaS product
- a broad hosted Paperclip V1 execution surface
- an unsupervised destructive MCP environment
- a product that relies on broad provider writes or autonomous company-wide
  operations

## Product Promise

Roost v1.0 is the operational core for a company that wants one workspace,
one API/MCP boundary, one owner console, and one governed knowledge and
execution surface for humans and AI agents. The v1 promise is not visual
novelty or autonomous management. The v1 promise is a usable and supportable
web/API/MCP foundation with workspace isolation, read-safe knowledge access,
scoped agent keys, ClickUp pull foundations, Google Drive import, and
documented deployment/smoke procedures.

## Evidence Summary

| Domain | Current status | Evidence |
| --- | --- | --- |
| Product truth | Verified | `docs/status/app-completion-index.md` generated 2026-07-21 shows `46` items, `4` user flows, `0` missing test links, `0` missing doc links, `0` implemented-needs-proof, `0` blocked, `0` known non-ok risk items. |
| Architecture | Verified | `docs/architecture/system-architecture.md`, `docs/architecture/autonomous-company-operating-system.md`, and `docs/architecture/organizational-architecture-bridge.md` keep Roost API/MCP-first, workspace-scoped, and AI-as-client. |
| Users and workspaces | Verified | `docs/security/security-baseline.md`, `docs/engineering/testing.md`, and `docs/architecture/web-and-mcp-foundation-before-v2.md` require auth-derived `workspaceId`, owner membership boundary, scoped service keys, and fail-closed cross-workspace access. |
| API and MCP | Verified with supervision boundary | `docs/operations/companycore-mcp-bridge.md` documents manifest-driven MCP, least-privilege profiles, `requiresApproval` fail-closed behavior, and supervised operator mode. `docs/operations/agent-companycore-api-playbook.md` keeps agents on HTTP/API contracts rather than direct DB access. |
| Knowledge-plane foundation | Verified for read-oriented v1 | `docs/architecture/organizational-architecture-bridge.md` and `docs/operations/agent-runtime-coverage-ledger.csv` (`AGRUN-COV-006`) confirm Drive OAuth, numbered-root import, and agent-readable imported knowledge under governed access. |
| Sync foundations | Verified for accepted v1 scope | ClickUp remains pull-oriented and workspace-owned; `/v1/webhooks/clickup` proof linkage is closed by `.codex/tasks/luc-1536-prove-unclassified-user-workflow-missing-test-link-for-use-v1-webhooks-clickup.md`, `docs/API.md`, and `docs/operations/post-deploy-smoke.md`. |
| Security | Verified for current boundary | `docs/security/security-baseline.md` records hashed/scoped API keys, encrypted integration settings, fail-closed startup on unsafe secrets, and non-secret error responses. `docs/operations/application-completion-audit-2026-05-14.md` records the closure of env-secret and CORS hardening gaps. |
| Operations and deploy | Verified for manual controlled rollout | `docs/operations/post-deploy-smoke.md` records repeated manual VPS/Coolify rollovers with health and protected smoke. `docs/operations/service-reliability-and-observability.md` defines v1 minimum observability. |
| Documentation baseline | Verified after LUC-1788 | This contract, `docs/releases/roost-v1-0-gap-register.md`, and refreshed product/release docs replace template-only readiness answers. |

## v1.0 Sale Boundary

The allowed v1.0 sale or pilot boundary is:

- owner-authenticated web console for company setup, visibility, and safe
  operational actions
- workspace-scoped HTTP API as the only supported integration authority
- MCP bridge as a thin wrapper over the API using scoped service keys
- Google Drive imported knowledge roots as a read-oriented company context
- ClickUp pull foundations, webhook ingress proof, and repair/maintenance
  foundations inside the documented v1 direction
- manual deploy, smoke, rollback, and operator guidance

The boundary does not include:

- autonomous provider mutations beyond accepted existing v1 commands
- general customer self-serve onboarding, billing, invitations, or advanced
  RBAC
- hosted Paperclip execution as a production-ready default path
- unsupervised high-risk MCP command execution

## Knowledge-Plane Contract

Roost v1.0 treats the knowledge plane as a governed operational memory and
context layer, not as a free-form autonomous agent substrate.

### Source-of-truth rules

- PostgreSQL is the canonical system state.
- HTTP API is the supported integration boundary.
- MCP is the preferred agent tool layer above HTTP.
- Agents must not connect directly to PostgreSQL or provider secrets.
- Imported Google Drive context, notes, decisions, tasks, and operating-model
  readback are allowed sources for AI context only through approved API/MCP
  routes.

### Allowed v1 knowledge behavior

- read imported Google Drive metadata and content through governed routes
- read notes, decisions, tasks, company OS, and connection context
- expose read-safe MCP tools through least-privilege profiles
- let owners inspect workspace, integration, and MCP readiness before giving
  keys to an agent

### Excluded or separately gated behavior

- broad Docs/Sheets write or generalized content mutation
- autonomous provider-side company operations
- hosted Paperclip-to-Roost canary beyond read-only proof
- direct provider token exposure to agents or web clients

## Readiness Classification

| Gate | Result | Meaning |
| --- | --- | --- |
| Local architecture and completion truth | PASS | Roost currently has zero generated user-facing readiness gaps. |
| Product/API/MCP boundary clarity | PASS | Architecture and ops docs consistently keep Roost as source of truth and agents as external clients. |
| Security boundary | PASS | Workspace scoping, scoped API keys, secret handling, and supervised MCP posture are documented and previously proven. |
| Manual deploy and smoke | PASS | Manual VPS/Coolify rollout is a proven operator path. |
| Hosted read-only canary | OPEN | Later local-Paperclip-to-hosted-Roost canary remains separately gated. |
| Broad autonomous/provider-write expansion | DEFERRED BY POLICY | Not part of the v1.0 sale boundary. |

## Commercial Positioning Rule

Use the following positioning until a later contract supersedes it:

- Say `guided v1.0 pilot` or `guided v1.0 sale` when the buyer/operator
  accepts manual onboarding and the current supervised/read-only agent
  boundary.
- Do not say `self-serve`, `fully autonomous`, `hosted Paperclip ready`, or
  `general availability`.
- When discussing knowledge-plane behavior, describe it as governed company
  context and read-safe memory, not as unrestricted AI autonomy.

## Remaining Work

See `docs/releases/roost-v1-0-gap-register.md` for the deduplicated active
follow-up list.
