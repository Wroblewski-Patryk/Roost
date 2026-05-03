export class IntegrationError extends Error {
  constructor(
    public readonly code: "integration_not_configured" | "integration_unavailable" | "integration_invalid_token" | "integration_rate_limited" | "sync_failed",
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}
