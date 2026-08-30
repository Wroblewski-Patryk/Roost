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
  folder_parent_cycle: "errors.folder_parent_cycle",
  parent_folder_not_found: "errors.parent_folder_not_found",
  department_assignment_requires_root_folder: "errors.department_assignment_requires_root_folder",
  invalid_department: "errors.invalid_department",
  invalid_workforce_role: "errors.invalid_workforce_role",
  workforce_role_type_mismatch: "errors.workforce_role_type_mismatch",
  invalid_manager: "errors.invalid_manager",
  manager_hierarchy_cycle: "errors.manager_hierarchy_cycle",
  primary_owner_transfer_required: "errors.primary_owner_transfer_required",
  cannot_remove_self: "errors.cannot_remove_self",
  cannot_delete_entity_with_direct_reports: "errors.cannot_delete_entity_with_direct_reports",
  cannot_remove_member_with_direct_reports: "errors.cannot_delete_entity_with_direct_reports",
  user_membership_not_found: "errors.user_membership_not_found",
  department_area_not_found: "errors.department_area_not_found",
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
