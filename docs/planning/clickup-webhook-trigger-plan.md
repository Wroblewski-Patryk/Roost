# ClickUp Webhook Trigger Plan

## Purpose

Implement ClickUp webhooks as the real-time trigger layer for CompanyCore so a
change in ClickUp can update CompanyCore and notify Paperclip, Jarvis, Aviary,
or future modules through one internal event bridge.

## Official ClickUp Documentation Inputs

This plan is based on the current ClickUp documentation reviewed on
2026-05-03:

- Webhooks are created with `POST /api/v2/team/{team_id}/webhook`.
- Webhooks are created by the user's auth token and are tied to that user's
  access to the ClickUp hierarchy.
- ClickUp does not provide dedicated webhook source IP addresses.
- Incoming webhook requests include `X-Signature`.
- `X-Signature` is an HMAC SHA-256 hex digest of the exact raw request body
  using the webhook secret returned at registration time.
- Webhook health requires CompanyCore to respond with successful HTTP status
  codes quickly; inactive webhooks must be reactivated with the update webhook
  endpoint.
- Task webhook payloads include events such as `taskCreated`,
  `taskUpdated`, `taskDeleted`, and `taskStatusUpdated`; status payloads include
  `history_items` with before/after status, actor, field, date, and parent
  scope metadata.

## Architecture

```text
ClickUp signed webhook
  -> CompanyCore raw webhook receiver
  -> signature verification
  -> provider webhook inbox
  -> idempotent event processor
  -> CompanyCore tables and events
  -> agent event outbox/API
  -> Paperclip, Jarvis, Aviary, future bridges
```

CompanyCore owns the ClickUp-specific webhook logic. Agents should consume
CompanyCore events and records, not raw ClickUp webhook payloads or ClickUp
tokens.

## Data Model Slice

Add these runtime tables:

- `external_webhook_registrations`
  - `workspace_id`
  - `provider`
  - `external_id`
  - `scope_type`
  - `scope_external_id`
  - `endpoint_url`
  - encrypted `secret_ciphertext`
  - `events`
  - `status`
  - `last_health_at`
  - `last_error_code`
- `provider_event_inbox`
  - `workspace_id`
  - `provider`
  - `webhook_registration_id`
  - `external_webhook_id`
  - `event_name`
  - `external_task_id`
  - `idempotency_key`
  - `payload_hash`
  - safe `payload`
  - `signature_verified`
  - `processing_status`
  - `retry_count`
  - `received_at`
  - `processed_at`
- `agent_event_outbox`
  - `workspace_id`
  - `event_id`
  - `event_type`
  - `target_agent`
  - `scope`
  - `payload`
  - `delivery_status`
  - `available_at`
  - `delivered_at`

## API Slice

Owner/admin routes:

- `GET /v1/integration-settings/clickup/webhooks`
- `POST /v1/integration-settings/clickup/webhooks/reconcile`
- `PATCH /v1/integration-settings/clickup/webhooks/:id`

Public provider route:

- `POST /v1/webhooks/clickup`

Agent routes:

- `GET /v1/agent-events`
- `POST /v1/agent-events/:id/ack`

The ClickUp webhook route is public only at the transport layer. It must reject
all events that do not pass signature verification.

## Processing Rules

- Capture the raw request body before JSON parsing.
- Find the webhook registration by `webhook_id`.
- Decrypt the stored webhook secret and verify `X-Signature` with HMAC
  SHA-256.
- Insert into `provider_event_inbox` before doing business processing.
- Use `webhook_id + history_items[].id + event` as the preferred idempotency
  key.
- For task deltas, fetch the full ClickUp task when the payload does not
  contain enough fields to update CompanyCore safely.
- Upsert ClickUp tasks by `(workspace_id, source = clickup, external_id)`.
- Emit CompanyCore events after durable task updates.
- For `taskStatusUpdated`, also enqueue an agent event with before/after
  status so Paperclip can act on workflow transitions.

## Agent Bridge Contract

Paperclip, Jarvis, Aviary, and future modules should consume a provider-neutral
CompanyCore event shape:

```json
{
  "eventType": "task_status_updated_from_clickup",
  "workspaceId": "uuid",
  "taskId": "uuid",
  "source": "clickup",
  "externalId": "clickup-task-id",
  "scope": {
    "taskListId": "uuid",
    "externalListId": "clickup-list-id",
    "operatingTableId": "uuid"
  },
  "before": {
    "status": "to do"
  },
  "after": {
    "status": "in progress"
  }
}
```

Agents must use CompanyCore API keys and CompanyCore event endpoints. They must
not receive ClickUp webhook secrets or raw provider tokens.

## Delivery Tasks

### CCV1-036A Webhook Schema And Security Foundation - DONE

- [x] Add webhook registration, provider inbox, and agent outbox tables.
- [x] Add raw body middleware support for ClickUp webhook route.
- [x] Add HMAC SHA-256 verification helper and tests using official ClickUp
  signature behavior.

### CCV1-036B ClickUp Webhook Registration

- Add ClickUp client methods for get/create/update/delete webhooks.
- Add owner API to reconcile selected List webhooks.
- Store returned webhook secrets encrypted.
- Record webhook status and last reconciliation result.

### CCV1-036C ClickUp Webhook Receiver And Inbox

- Add `POST /v1/webhooks/clickup`.
- Verify signature before processing.
- Store inbox rows idempotently.
- Return quick `2xx` after durable inbox write for valid events.

### CCV1-036D Task Event Processor

- Process task create/update/delete/status events.
- Fetch full task details when needed.
- Update CompanyCore tasks and emit internal events.
- Add retry and failure states.

### CCV1-036E Agent Event Bridge

- Add agent event outbox APIs.
- Emit provider-neutral events for Paperclip, Jarvis, and Aviary.
- Document consumer behavior and ack semantics.

### CCV1-036F Production Webhook Smoke

- Deploy schema and routes.
- Reconcile webhooks for selected ClickUp Lists.
- Change a ClickUp task status.
- Verify CompanyCore task update, internal event, agent event, and Paperclip or
  Jarvis readback path.

## Acceptance Criteria

- ClickUp webhook signatures are verified against the raw request body.
- Invalid signatures fail closed and do not create inbox rows.
- Duplicate webhook deliveries are idempotent.
- Task status changes update CompanyCore and create an agent-visible event.
- Webhook secrets and ClickUp tokens are never logged or returned.
- Webhook registration health can be inspected and reconciled by the owner.
- Paperclip, Jarvis, and Aviary have a provider-neutral event contract.
