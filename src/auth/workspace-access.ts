import type { Request, Response, NextFunction } from "express";
import type { WorkspaceRole } from "@prisma/client";
import { sendApiError } from "../middleware/api-error";
import { prisma } from "../db/prisma";

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

export async function enforceHumanWorkspaceAccess(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.authType !== "user") return next();

  const role = req.auth.workspaceRole;
  if (!role) return sendApiError(res, 403, "forbidden");

  const path = req.path.startsWith("/v1/") ? req.path.slice(3) : req.path;
  if (req.auth.taskScopeId) {
    const taskId = req.auth.taskScopeId;
    const allowed = (req.method === "GET" && (path === `/tasks/${taskId}`
      || path === `/agent-runtime/tasks/${taskId}/review`))
      || (req.method === "POST" && path === `/agent-runtime/tasks/${taskId}/actions/review`);
    if (!allowed) return sendApiError(res, 403, "task_scope_forbidden");
    try {
      const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId: req.auth.workspaceId, status: { not: "archived" } }, select: { id: true } });
      if (!task) return sendApiError(res, 403, "task_scope_forbidden");
    } catch (error) {
      return next(error);
    }
    return next();
  }
  const administrationPath = administrationSegments.some((segment) => path === segment || path.startsWith(`${segment}/`));
  if (administrationPath && !roleAtLeast(role, "admin")) {
    return sendApiError(res, 403, "forbidden");
  }

  if (role === "viewer" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return sendApiError(res, 403, "workspace_read_only");
  }

  return next();
}
