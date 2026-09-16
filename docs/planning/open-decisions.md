# Open decisions

RF-RUNTIME-005C [native owned-job qualification](../architecture/windows-owned-process-job-v1.md)
is complete for local fixture process lifetime/cleanup. Native receipt validation
is required per attempt; missing proof remains fail-closed.
[RF-RUNTIME-005B4 same-owner qualification](../architecture/hermes-same-owner-profile-v1.md)
is complete using explicit private owner attestation. A stable account ID is not
required. Installed CLI help does not establish secret-free status output; no
status command was run and availability is not claimed. Attestation is checked
at sealing/pre-spawn, expires within 90 days, and requires explicit renewal on
expiry/revocation or reported account/session/config changes. Silent account
switches and unreported session loss remain residual risks.
[RF-RUNTIME-005B5 effective-config qualification](../architecture/hermes-effective-config-qualification-v1.md)
is BLOCKED: exact-pin loader data is partial, with intercepted read/import attempts
and unqualified startup/tool/rotation consumers. Its private negative receipt grants
no Ready/admission authority. [RF-RUNTIME-005B6 source analysis](../architecture/hermes-minimal-startup-contract-v1.md)
recorded NOT_SUPPORTED for strict minimal startup. B7 resolves that requirement
through explicit owner acceptance of local skills sync/banner prefetch, with
network updates off. Exact Worker startup policy and Ready/input-bound receipt are
implemented and synthetically tested; only the local config blocker is removed
with fresh proof. Real Hermes launch remains denied.
[RF-RUNTIME-005B8 attempt/budget qualification](../architecture/hermes-attempt-budget-contract-v1.md)
remains historical evidence of missing physical dispatch/token boundaries.
RF-RUNTIME-005B9 owner amendment supersedes those pilot requirements with the
[implemented practical attempt policy](../architecture/hermes-practical-attempt-budget-v1.md):
24 logical turns; retry setting 2; original deadline at most 900 seconds;
native cleanup; no resume or whole-task restart; unavailable accounting null;
exit 0 only candidate_result for independent review. Private v3 profile is read
back with owner identity/confirmation/expiry preserved. This is synthetic/native
fixture qualification, not real Hermes execution. All six flags remain false.
[RF-RUNTIME-005B11 native audited coding](../architecture/hermes-native-tool-boundary-v1.md)
is implemented under ADR-004 v7. Owner acceptance resolves B10's one pending
risk decision; authority, v4 startup, leases, manifests and owned cleanup have
synthetic qualification. Native tool isolation remains technically incomplete;
violations block review/release and unobserved/transient effects remain accepted
risk. Only fresh opaque proof removes the local native-tool blocker. All six
flags remain false. [RF-RUNTIME-005B12 local launch admission](../architecture/hermes-local-launch-admission-v1.md)
is source/synthetic qualified with a single opaque, expiring, one-use proof set.
Local policyQualified can be true while activationAuthorized=false and
spawnStarted=false. B11 cleanup is closed by verified owner removal.
[RF-RUNTIME-005B13 — one real coding smoke](../architecture/hermes-real-coding-smoke-v1.md)
is **BLOCKED**. Owner-authorized exact gpt-5.6-sol/medium launch occurred once;
Hermes reported an authentication requirement and exited 1. No repair or
independent post-agent PASS was proven. Job and owned repository cleanup passed,
but a controller defect retained the stale Writer lock. The defect is corrected
and tested with a harmless fixture; there was no second real attempt.
Exactly one next owner action: manually remove that stale Writer lock, identified
in the private handoff, while preserving the separate spent record. No retry,
login, general pilot activation, MCP, E2E or release is authorized. ADR-004 v8
records the spent one-attempt permission; all six public flags remain false.
Earlier no-launch statements above describe the corresponding historical scope.

The first-provider choice is resolved by RF-RUNTIME-002 /
[ADR-004](../decisions/ADR-004-native-hermes-codex-pilot.md): native Hermes using
Codex OAuth behind Windows Local Worker; direct CLI alternative and Herdr optional.
Workspace, one-writer, cleanup, secrets, Ready/review and release guards remain.
No VM/Windows Sandbox/Hyper-V prerequisite. No runtime activation follows.

## Same-owner authentication — attestation qualified, runtime still blocked

[RF-RUNTIME-005A](../architecture/hermes-supervised-quiet-v1.md) accepts public
quiet/oneshot on existing stable 0.21.2 for the first supervised pilot. Waiting
for unreleased stream-json is no longer required; older rejection evidence remains
historical. B1/B2 profile-only isolation findings remain historical after the B3
owner amendment. B4 accepts the explicit owner attestation as authoritative for this single-owner
pilot; technical account identity is not required. No OAuth or model operation
occurred in B3/B4. Fresh owned-tree receipts remain mandatory;
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
