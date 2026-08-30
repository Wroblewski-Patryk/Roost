# Roost documentation

Roost is LuckySparrow's internal company operating system. `CompanyCore` is
the legacy runtime identifier used by the API, database and deployment
contracts; it is not a separate product.

The repository keeps durable product and engineering truth here. Roost keeps
execution queue/history in its database; Codex and local execution tools keep
only transient process state outside the repository.

## Start here

- Product: `product/product.md`, `product/overview.md`, `product/mvp_scope.md`
- Architecture: `architecture/architecture-source-of-truth.md`,
  `architecture/system-architecture.md`, `architecture/tech-stack.md`,
  `architecture/innovation-product-engineering.md`,
  `architecture/local-codex-agent-runtime.md`
  `architecture/workspace-human-access.md`
- Engineering: `engineering/local-development.md`, `engineering/testing.md`
- Operations: `DEPLOYMENT.md`, `operations/coolify-vps-deployment-contract.md`,
  `operations/rollback-and-recovery.md`, `operations/post-deploy-smoke.md`,
  `operations/local-codex-agent-host.md`
- Security: `security/security-baseline.md`
- Current planning: `planning/mvp-next-commits.md`,
  `planning/open-decisions.md`
- Runtime surface inventory: `operations/v1-code-surface-index.md`

## Documentation rules

- Keep product, architecture, operations and security claims aligned with the
  implemented runtime.
- Keep issue histories, generated reports, screenshots and agent memory out of
  the repository.
- Prefer small, stable documents over generated evidence graphs.
- Do not place credentials, tokens, production data or sensitive logs here.

Roost currently consists of a PostgreSQL/Prisma data model, an Express API,
a backend-served React owner console, native ClickUp and Google Drive adapters,
API/MCP integration boundaries, and Docker Compose deployment for Coolify.
