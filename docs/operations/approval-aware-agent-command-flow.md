# Approval-Aware Agent Command Flow

Last updated: YYYY-MM-DD

## Purpose

Use this document when agents can call project tools, MCP tools, HTTP command
routes, webhooks, workflow actions, provider actions, or other side-effectful
operations.

The application remains the policy, permission, event, and audit boundary.
Agent bridges and tool wrappers are thin adapters, not alternate execution
authorities.

## Execution Modes

| Mode | Default | Can call risky commands | Intended use |
| --- | --- | --- | --- |
| `read_only` | yes | no | Planning, review, documentation, context gathering, and safe read agents. |
| `supervised_operator` | no | yes, when explicitly configured and watched by a human operator. |
| `autonomous_operator` | no | no, until an approved project-specific policy exists. |

## Command Categories

| Category | Examples | Default behavior |
| --- | --- | --- |
| Safe read | list records, fetch status, inspect manifests | Allow for appropriately scoped credentials. |
| Approval request | create a request for a human decision | Allow only when the credential is intended to request approvals. |
| Approval decision | approve, reject, override, unblock | Block unless explicitly supervised. |
| Lifecycle write | complete a stage, transition a workflow, retry a provider job | Block unless explicitly supervised or covered by a narrow approved policy. |
| Destructive route | delete, purge, revoke, reset, irreversible provider action | Block by default. |

## Bridge Behavior

Default bridge or adapter behavior:

1. Expose metadata that tells the agent whether a tool or route is
   side-effectful, destructive, approval-gated, or safe-read.
2. Forward safe reads only when the credential has the required capability.
3. Fail closed when a command is marked approval-gated or destructive and the
   runtime is not explicitly in supervised mode.
4. Return structured error information instead of attempting the command:
   - error code
   - tool or route name
   - method/path or command identifier
   - required capability
   - recovery guidance
5. Let the application API enforce workspace, ownership, validation,
   transition, approval, event, and audit rules even in supervised mode.

## Evidence Requirements

Before a risky command:

- Identify the target resource, command, capability, reason, expected outcome,
  and rollback or recovery path.
- Confirm whether an approval reference, owner confirmation, or supervised
  runtime is required.
- Prefer creating an approval request over attempting the risky action.

After a risky command:

- Record the command result, status, target, and evidence location.
- Verify the application wrote durable event or audit evidence.
- Record residual risk and any follow-up validation.

## Agent Rules

- Do not infer write authority from the ability to list a tool.
- Do not bypass the application API by reading or writing the database
  directly.
- Do not use broad credentials when a narrow role can do the job.
- Do not print service keys, provider secrets, bearer tokens, or raw internal
  error payloads.
- Treat missing manifest metadata as risky until classified.
- For production, user data, payments, provider accounts, secrets, AI authority,
  and background jobs, prefer fail-closed behavior.

## Non-Goals

- This document does not define product-specific approval policy.
- This document does not grant autonomous write authority.
- This document does not replace the project's security, deployment, or API
  contracts.
