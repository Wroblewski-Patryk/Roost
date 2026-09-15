# Open decisions

The first-provider choice is resolved by RF-RUNTIME-002 /
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md): native Hermes using
Codex OAuth behind Windows Local Worker; direct CLI alternative and Herdr optional.
Workspace, one-writer, cleanup, secrets, Ready/review and release guards remain.
No VM/Windows Sandbox/Hyper-V prerequisite. No runtime activation follows.

## Stable upstream CLI protocol gap — pending

[RF-RUNTIME-004 proposal](../architecture/hermes-replacement-pin-proposal-v1.md)
rejects newest stable 0.21.3: like active 0.21.2, its parser lacks --format required
by launch v1. Quiet output also permits background follow-up turns. No compatible
stable replacement is qualified. Next atomic task: **RF-RUNTIME-005**, resolve
the stable upstream structured-CLI/strict-single-turn gap before replacement.
The structured-output feature landed after the stable tag in 1657a1ce; a stable
release containing it is required before qualification can resume.
No installation, fork/private wrapper, OAuth or model/MCP operation follows.
All execution/pilot/live gates remain false.

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
