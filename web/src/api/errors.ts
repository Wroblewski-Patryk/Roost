import { MessageKey, Translate } from "../i18n/i18n";
import { AppApiError } from "./client";

const errorMessageKeys: Record<string, MessageKey> = {
  invalid_credentials: "errors.invalid_credentials",
  email_already_registered: "errors.email_already_registered",
  auth_failed: "errors.auth_failed",
  request_failed: "errors.request_failed",
  forbidden: "errors.forbidden",
  missing_scope: "errors.missing_scope",
  network_error: "errors.network_error",
  server_error: "errors.server_error",
  unknown_error: "errors.unknown_error"
};

export function errorCode(error: unknown) {
  if (error instanceof AppApiError) {
    return error.code;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "unknown_error";
}

export function userErrorMessage(error: unknown, t: Translate) {
  const key = errorMessageKeys[errorCode(error)] ?? "errors.unknown_error";
  return t(key);
}
