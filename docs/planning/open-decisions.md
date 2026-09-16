# Open decisions

RF-RUNTIME-005C [native owned-job qualification](../architecture/windows-owned-process-job-v1.md)
is complete for local fixture process lifetime/cleanup. Native receipt validation
is required per attempt; missing proof remains fail-closed.
[RF-RUNTIME-005B2 credential-source qualification](../architecture/hermes-credential-source-qualification-v1.md)
is **NOT_QUALIFIED** for current stable 0.21.3 and the inspected immutable upstream
snapshot; public provider/middleware/secret-source extensions do not establish the
complete auth boundary. Exactly one proposed next atom: **RF-RUNTIME-005B3 — specify
and qualify an external native Worker credential-access guard with synthetic data**.
Owner acceptance is required first; B3 is not started. The existing 0.21.2 pin, all
six false gates and the pending profile/OAuth setup remain unchanged.

The first-provider choice is resolved by RF-RUNTIME-002 /
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md): native Hermes using
Codex OAuth behind Windows Local Worker; direct CLI alternative and Herdr optional.
Workspace, one-writer, cleanup, secrets, Ready/review and release guards remain.
No VM/Windows Sandbox/Hyper-V prerequisite. No runtime activation follows.

## External credential-access guard — owner decision pending

[RF-RUNTIME-005A](../architecture/hermes-supervised-quiet-v1.md) accepts public
quiet/oneshot on existing stable 0.21.2 for the first supervised pilot. Waiting
for unreleased stream-json is no longer required; older rejection evidence remains
historical. RF-RUNTIME-005B1 subsequently stopped at the credential-source gap
above; profile sealing and owner-present OAuth remain pending. No OAuth or model
operation occurred in RF005A or RF005B1. Fresh owned-tree receipts remain mandatory;
effective config, auth/tool
boundaries, internal turns and hard budgets remain unqualified; all six runtime
flags stay false. Config completion must not be reported as pilot readiness.

Local Ollama with OpenAI gpt-oss or Mistral/Devstral is **PLANNED/DISABLED**.
Installation waits for confirmed disk expansion and resource/quality qualification.
Later routing is explicit by competencies, risk, quality, cost, resources and
privacy, with visible escalation and no automatic fallback.

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
