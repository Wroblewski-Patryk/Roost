import type { Response } from "express";

const defaultMessages: Record<string, string> = {
  api_key_full_access_confirmation_required: "Full access scopes require explicit confirmation before creating a service key.",
  api_key_scope_required: "Choose an access profile or explicit scopes before creating a service key.",
  cors_origin_not_allowed: "This browser origin is not allowed.",
  forbidden: "You do not have permission to perform this action.",
  internal_server_error: "The server could not complete the request.",
  invalid_api_key: "The API key is invalid.",
  invalid_api_key_profile: "The requested API key profile does not exist.",
  invalid_api_key_scope: "One or more requested API key scopes are not supported.",
  invalid_auth_token: "The session token is invalid.",
  missing_api_key: "Authentication is required.",
  not_found: "The requested record was not found.",
  rate_limited: "Too many requests. Try again shortly.",
  validation_error: "The request data is invalid.",
  workspace_required: "A workspace is required for this action."
};

export function apiErrorBody(code: string, message = defaultMessages[code] ?? "The request could not be completed.", requestId?: string, details?: unknown) {
  return {
    error: code,
    message,
    requestId,
    errorDetails: {
      code,
      message,
      details
    }
  };
}

export function sendApiError(res: Response, status: number, code: string, options: {
  details?: unknown;
  message?: string;
} = {}) {
  return res.status(status).json(apiErrorBody(code, options.message, res.req.requestId, options.details));
}
