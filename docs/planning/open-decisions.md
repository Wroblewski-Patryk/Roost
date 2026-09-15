# Open decisions

The first-provider choice is resolved by RF-RUNTIME-002 /
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md): native Hermes using
Codex OAuth behind Windows Local Worker; direct CLI alternative and Herdr optional.
Workspace, one-writer, cleanup, secrets, Ready/review and release guards remain.
No VM/Windows Sandbox/Hyper-V prerequisite. No runtime activation follows.

## Private Hermes installation/configuration admission — pending

[Launch contract v1](../architecture/hermes-cli-launch-v1.md) implements blocked
public CLI projection and synthetic JSONL validation. Exact installed compatibility,
sealed config, credential/native-tool isolation, hard budgets and full process
closure remain unqualified. The next atomic task is **RF-RUNTIME-003**: a bounded,
reviewable private installation/configuration admission packet, including existing
installation handling, official pins, effects and rollback. It does not authorize
installing, OAuth or a model run. All execution/pilot/live gates remain false.

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
