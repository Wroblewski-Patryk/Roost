# External Operational Memory Agent Playbook

Last updated: YYYY-MM-DD

## Purpose

Use this playbook when an agent writes durable project memory into an external
system such as a company OS, CRM, ticketing system, document store, or
operations API.

Agents must use the approved application or service API. They must not connect
directly to the backing database or provider internals.

## Required Inputs

- Base URL or connector identifier for the approved API.
- A scoped service credential stored in the agent runtime secret store.
- Agent identity, role, and workspace or tenant context.
- A manifest, route list, OpenAPI document, or other canonical API contract.

Raw service credentials are secret material. Do not print them in logs,
screenshots, traces, task notes, or documentation.

## Startup Flow

1. Call the service's connection, manifest, health, or `whoami` endpoint.
2. Verify:
   - authentication succeeded
   - workspace or tenant context is present
   - advertised capabilities match the intended task
   - schemas or route contracts needed for writes are available
3. Enter read-only mode when validation is incomplete.
4. Stop write mode on missing credentials, invalid credentials, insufficient
   capability, ambiguous workspace, or stale manifest data.

## Discovery Rules

- Treat the service manifest or documented API as the source of truth.
- Call only routes advertised by that source or documented in the repository.
- Never send workspace or tenant IDs unless the API contract explicitly
  requires them.
- Use IDs returned by the API when linking records.
- Treat business `DELETE` routes as archive/deactivate lifecycle operations
  unless the contract explicitly says they are irreversible.
- Do not infer raw CRUD routes for users, workspaces, memberships, API keys,
  provider settings, webhook registrations, audit events, or system tables.

## Common Write Uses

Good external memory writes include:

- durable task notes
- decisions and rationales
- implementation evidence
- agent logs
- handoff summaries
- status or stage transitions allowed by policy
- references to docs, commits, screenshots, reports, or validation artifacts

Bad external memory writes include:

- secrets or raw credentials
- provider payloads that may contain sensitive data
- chat-only speculation marked as fact
- direct edits to audit/event tables
- broad status changes without evidence
- destructive provider actions without approval

## Error Handling

| Status or failure | Agent behavior |
| --- | --- |
| validation error | Fix payload and retry only after correction. |
| authentication failure | Stop write mode. |
| permission failure | Stop the attempted action and record the missing capability. |
| not found | Treat as missing or not visible; do not probe nearby IDs. |
| conflict | Resolve relation or state conflict before retrying. |
| rate limit or transient upstream error | Back off and retry only if the action is idempotent. |
| server error | Record safe context and retry only when the operation is safe and bounded. |

Never log raw response internals that could include provider details, secrets,
or user-private content.

## Minimal Smoke

For a disposable workspace or local service:

1. Validate connection.
2. Create or update the agent identity.
3. Create a note or log entry.
4. Read the created record back.
5. Update or archive the record if the API supports a safe lifecycle route.
6. Confirm the service recorded audit or event evidence where applicable.

## Production Safety

- Use a dedicated key per agent.
- Prefer the narrowest preset that fits the role.
- Rotate any key copied through chat, logs, screenshots, shell history, or
  shared docs.
- Run the startup flow after credential rotation.
- Keep provider retries bounded and idempotent.
- Do not treat archived records as deleted history.
- Combine this playbook with
  `docs/operations/approval-aware-agent-command-flow.md` for side-effectful
  commands.
