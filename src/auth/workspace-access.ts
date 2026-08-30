import type { Request, Response, NextFunction } from "express";
import type { WorkspaceRole } from "@prisma/client";
import { sendApiError } from "../middleware/api-error";

const administrationSegments = [
  "/api-keys",
  "/integration-settings"
];

export function roleAtLeast(role: WorkspaceRole | undefined, required: WorkspaceRole) {
  const rank: Record<WorkspaceRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };
  return role !== undefined && rank[role] >= rank[required];
}

export function requireWorkspaceRole(req: Request, res: Response, required: WorkspaceRole) {
  if (req.auth?.authType !== "user" || !req.auth.userId || !roleAtLeast(req.auth.workspaceRole, required)) {
    sendApiError(res, 403, "forbidden");
    return false;
  }
  return true;
}

export function enforceHumanWorkspaceAccess(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.authType !== "user") return next();

  const role = req.auth.workspaceRole;
  if (!role) return sendApiError(res, 403, "forbidden");

  const path = req.path.startsWith("/v1/") ? req.path.slice(3) : req.path;
  const administrationPath = administrationSegments.some((segment) => path === segment || path.startsWith(`${segment}/`));
  if (administrationPath && !roleAtLeast(role, "admin")) {
    return sendApiError(res, 403, "forbidden");
  }

  if (role === "viewer" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return sendApiError(res, 403, "workspace_read_only");
  }

  return next();
}
