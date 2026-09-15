# Open decisions

Ordinary product development can continue. First-agent runtime admission has
one pending owner decision; no execution is enabled by this planning record.

## First supervised agent runtime — pending

[RF-RUNTIME-001 packet v1](../architecture/first-agent-runtime-decision-v1.md)
recommends the existing Local Worker → native Codex CLI path for one supervised,
non-critical, uncommitted local change. Hermes remains a possible additional
agent through Roost MCP; Herdr is optional terminal/status UX. Roost and Worker
retain authority. This recommendation is not an accepted architecture change.

The owner must decide whether to add this limited CLI milestone alongside the
accepted App Server target and permit a separately reviewed, expiring exception
proposal for explicitly unproved pilot guarantees. Existing provider isolation
and hard output-token admission remain closed; ordinary task consent is not an
exception. Alternatively retain App Server-only qualification or defer.

The next atomic task is **RF-RUNTIME-002**, the owner decision and downstream
contract impact described in the packet. It grants no install, rollout or live
run. All execution/pilot/live gates remain false. RF023's additional disposable
environment blocker is not a blocker for all Roost development.

## Accepted foundations

- PostgreSQL is the canonical operational data store.
- The API is the supported write boundary for web clients, agents and
  integrations.
- Owner registration creates a workspace; business records and integration
  settings are workspace-scoped.
- ClickUp is the first native provider adapter; n8n remains optional.
- The React owner console is the human control plane.
- Codex Agent Host and other agents are external supervised clients. They do not own
  Roost's product model or repository state.
- Production uses reviewed Prisma migrations and a Coolify-compatible Docker
  deployment.

Add new unresolved decisions here only when they materially affect scope,
ownership, architecture or release safety.
