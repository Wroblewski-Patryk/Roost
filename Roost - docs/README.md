# Company Core

LuckySparrow Company Core is the internal source-of-truth backend for company
operations.

It exists because Paperclip, Jarvis, n8n automations, and future GUI clients
need one consistent place to read and write operational data. Without Company
Core, project state, tasks, sales context, notes, decisions, and AI activity
would drift across tools.

Company Core v1 provides:

- PostgreSQL data model with Prisma.
- Express API protected by owner auth and workspace service API keys.
- Workspace-scoped flows for projects, goals, targets, tasks, clients, deals,
  notes, decisions, agents, interactions, events, and operating-model records.
- Native ClickUp import, signed webhook ingestion, scheduled maintenance,
  write-back, comments, views, custom fields, and retry observability.
- Google Drive v2 server-side integration foundation with OAuth setup guidance,
  folder discovery, selected-folder configuration, Docs/Sheets APIs, file
  metadata/content snapshots, and freshness routes. Real owner consent and the
  first production import remain externally blocked.
- Owner web console surfaces for API keys, ClickUp setup, Google Drive setup,
  operating areas, relationships, data operations, and typed business editors.
- OpenJarvis read integration through the CompanyCore connector.
- Paperclip agent-event consumption through the CompanyCore adapter.
- Docker Compose runtime for local and Coolify-style deployment.

It deliberately keeps broad automation orchestration, Obsidian sync, advanced
analytics, and mobile app scope beyond the accepted v1/v2 web-console slice.

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

## Agent Operating Docs

These files live outside `docs/` because they are execution state, not product
or architecture truth:

- `.agents/core/operating-system.md`
- `.agents/core/execution-loop.md`
- `.agents/core/anti-regression.md`
- `.agents/core/quality-gates.md`
- `.agents/state/current-focus.md`
- `.agents/state/known-issues.md`
- `.agents/state/regression-log.md`
- `.agents/state/system-health.md`
- `.agents/state/next-steps.md`

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
  - `architecture/unified-organizational-operating-system.md`
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
  - `operations/google-drive-owner-setup.md`
  - `operations/v1-operator-handoff.md`
  - `operations/jarvis-companycore-update-runbook.md`
  - `operations/paperclip-companycore-adapter-runbook.md`
  - `operations/v1-source-handoff-package.md`
  - `operations/v1-release-readiness.md`
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

## Agent App-Building Docs

- `governance/app-creation-playbook.md`
- `governance/user-feedback-loop.md`
- `../.codex/templates/app-blueprint-template.md`
- `../.codex/templates/user-feedback-item-template.md`
- `../.codex/templates/handoff-packet-template.md`
