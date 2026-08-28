# MVP execution plan

Roost's v1 foundation is implemented. The application has an owner-authenticated
workspace model, PostgreSQL/Prisma persistence, an Express API, a React owner
console, ClickUp and Google Drive adapters, API/MCP access and a Coolify-ready
Docker deployment.

Future work should preserve these invariants:

- PostgreSQL remains the source of truth.
- Protected data and integration settings remain workspace-scoped.
- Human users operate through the web/API; supervised agents use API/MCP.
- Provider adapters do not bypass Roost's validation, audit or event layers.
- Production schema changes use reviewed Prisma migrations.
- Every functional change passes typecheck, structural lint, build and the
  smallest relevant tests before release.

Use `mvp-next-commits.md` for the current queue and `open-decisions.md` for
unresolved product or architecture choices.
