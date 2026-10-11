export class IntegrationError extends Error {
  constructor(
    public readonly code:
      | "integration_not_configured"
      | "integration_unavailable"
      | "integration_invalid_token"
      | "integration_rate_limited"
      | "unsupported_file_type"
      | "source_changed"
      | "revision_required"
      | "sync_failed"
      | "invalid_webhook_payload"
      | "webhook_not_registered"
      | "invalid_webhook_signature"
      | "clickup_status_scope_unavailable"
      | "clickup_webhook_required"
      | "clickup_status_intent_open"
      | "clickup_status_scope_mismatch"
      | "clickup_status_readback_incomplete"
      | "clickup_status_version_conflict"
      | "clickup_comment_result_uncertain"
      | "clickup_status_intent_not_resolvable"
      | "clickup_task_not_found"
      | "not_found",
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}
