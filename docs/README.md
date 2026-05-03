# Company Core

LuckySparrow Company Core is the internal source-of-truth backend for company
operations.

It exists because Paperclip, Jarvis, n8n automations, and future GUI clients
need one consistent place to read and write operational data. Without Company
Core, project state, tasks, sales context, notes, decisions, and AI activity
would drift across tools.

Company Core v1 provides:

- PostgreSQL data model with Prisma.
- Express API protected by `X-API-Key`.
- Minimal flows for projects, goals, targets, tasks, clients, deals, notes, and
  events.
- Native ClickUp integration planned as the first backend integration adapter,
  with the existing ClickUp sync endpoint kept for compatible external payloads.
- Docker Compose runtime for local and Coolify-style deployment.

It deliberately does not provide a GUI, Google Drive sync, Obsidian sync,
advanced auth, analytics, background workers, or full business automation.

## Documentation Index

Use `docs/` as the canonical home for CompanyCore documentation.

## Recommended Structure

- `architecture/`
  system design, modules, integration boundaries, deployment topology
- `engineering/`
  local development, technical workflows, stack-specific implementation notes
- `modules/`
  optional implementation-facing deep-dives for code ownership, routes,
  dependencies, and tests
- `governance/`
  rules for language, repository layout, delegation, and working agreements
- `operations/`
  deploy, smoke, rollback, backups, monitoring, and operator runbooks
- `planning/`
  execution plan, next commits queue, open decisions
- `product/`
  overview, product rules, scope, user value, roadmap inputs
- `security/`
  baseline security expectations and sensitive-area notes
- `ux/`
  source-of-truth policy, experience quality bar, reusable pattern memory, and
  design evidence rules

## Index Rules

- Update this file when new canonical docs are added, moved, or renamed.
- Prefer repository-relative links.
- Keep project docs in English.

## Canonical Docs

- Product:
  - `product/overview.md`
  - `product/product.md`
  - `product/mvp_scope.md`
- Architecture:
  - `ARCHITECTURE.md`
  - `architecture/README.md`
  - `architecture/system-architecture.md`
  - `architecture/tech-stack.md`
  - `architecture/architecture-source-of-truth.md`
- Engineering:
  - `engineering/local-development.md`
  - `engineering/testing.md`
- Modules:
  - `modules/README.md`
  - `modules/system-modules.md`
  - `modules/module-deep-dive-template.md`
  - `modules/module-doc-status-index.md`
- Planning:
  - `planning/mvp-execution-plan.md`
  - `planning/mvp-next-commits.md`
  - `planning/companycore-v1-task-contracts.md`
  - `planning/auth-workspace-integration-plan.md`
  - `planning/regression-prevention-plan.md`
  - `planning/open-decisions.md`
  - `planning/planning-catalog-index.md`
- Governance:
  - `governance/working-agreements.md`
  - `governance/language-policy.md`
  - `governance/repository-structure-policy.md`
  - `governance/subagent-delegation-policy.md`
  - `governance/code-quality-guardrails.md`
  - `governance/template-usage.md`
  - `governance/agent-setup-blueprint.md`
  - `governance/world-class-product-engineering-standard.md`
  - `governance/autonomous-engineering-loop.md`
  - `governance/function-coverage-ledger-standard.md`
  - `governance/function-coverage-ledger-template.csv`
- Operations:
  - `DEPLOYMENT.md`
  - `operations/coolify-vps-deployment-contract.md`
  - `operations/post-deploy-smoke.md`
  - `operations/rollback-and-recovery.md`
  - `operations/service-reliability-and-observability.md`
  - `operations/clickup-production-bootstrap.md`
  - `operations/jarvis-companycore-update-runbook.md`
- Security:
  - `security/security-baseline.md`
  - `security/secure-development-lifecycle.md`
- UX:
  - `ux/ux-ui-mcp-collaboration.md`
  - `ux/stitch-mcp-playbook.md`
  - `ux/design-system-contract.md`
  - `ux/experience-quality-bar.md`
  - `ux/design-memory.md`
  - `ux/visual-direction-brief.md`
  - `ux/ui-scorecard.md`
  - `ux/pattern-gallery.md`
  - `ux/screen-quality-checklist.md`
  - `ux/anti-patterns.md`
  - `ux/brand-personality-tokens.md`
  - `ux/canonical-visual-implementation-workflow.md`
  - `ux/background-and-decorative-asset-strategy.md`
  - `ux/evidence-driven-ux-review.md`
