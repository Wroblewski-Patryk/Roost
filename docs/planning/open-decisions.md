# Open decisions

RF-RUNTIME-005C [native owned-job qualification](../architecture/windows-owned-process-job-v1.md)
is complete for local fixture process lifetime/cleanup. Native receipt validation
is required per attempt; missing proof remains fail-closed.
[RF-RUNTIME-005B3 same-owner profile](../architecture/hermes-same-owner-profile-v1.md)
implements the accepted reuse of the owner's Codex CLI auth source. The owner
rejected a separate token store and external Restricted Token/ACL credential guard.
Profile creation/readback and synthetic Ready-bound admission are complete; live
identity remains BLOCKED / owner-interaction-required. Exactly one recommended
next atom: **RF-RUNTIME-005B4 — owner-present qualification of nonsecret same-owner
identity evidence**. It is not started. The owner must confirm the intended account
in a visible interface without sharing secrets; this alone grants no model run.
The 0.21.2 pin, native Job lifecycle and all six false runtime gates are unchanged.

The first-provider choice is resolved by RF-RUNTIME-002 /
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md): native Hermes using
Codex OAuth behind Windows Local Worker; direct CLI alternative and Herdr optional.
Workspace, one-writer, cleanup, secrets, Ready/review and release guards remain.
No VM/Windows Sandbox/Hyper-V prerequisite. No runtime activation follows.

## Same-owner authentication — identity evidence pending

[RF-RUNTIME-005A](../architecture/hermes-supervised-quiet-v1.md) accepts public
quiet/oneshot on existing stable 0.21.2 for the first supervised pilot. Waiting
for unreleased stream-json is no longer required; older rejection evidence remains
historical. B1/B2 profile-only isolation findings remain historical after the B3
owner amendment. The private profile is sealed synthetically; real nonsecret
identity evidence remains pending. No OAuth or model operation occurred in B3. Fresh owned-tree receipts remain mandatory;
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
