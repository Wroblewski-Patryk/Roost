import { randomUUID } from "crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { generateWorkspaceInvitationToken, hashWorkspaceInvitationToken } from "../../auth/workspace-invitation-token";
import { requireWorkspaceRole, roleAtLeast } from "../../auth/workspace-access";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";

const inviteSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  role: z.enum(["admin", "member", "viewer"]).default("member")
}).strict();
const taskInviteSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  taskId: z.string().uuid()
}).strict();

const roleSchema = z.object({ role: z.nativeEnum(WorkspaceRole) }).strict();
const transferSchema = z.object({ userId: z.string().uuid() }).strict();

export const workspaceAccessRouter = Router({ mergeParams: true });

function workspaceId(req: Request) {
  return z.string().uuid().parse(req.params.id);
}

async function actorMembership(req: Request, res: Response, minimum: WorkspaceRole = "admin") {
  const id = workspaceId(req);
  if (id !== req.auth?.workspaceId || !requireWorkspaceRole(req, res, minimum)) return null;
  return prisma.workspaceMembership.findUniqueOrThrow({
    where: { workspaceId_userId: { workspaceId: id, userId: req.auth!.userId! } }
  });
}

function audit(workspaceId: string, actorId: string, action: string, resourceType: string, resourceId: string | null, outputPayload: object = {}) {
  return prisma.auditLog.create({ data: {
    workspaceId,
    actorType: "user",
    actorId,
    action,
    resourceType,
    resourceId,
    inputPayload: {},
    outputPayload,
    correlationId: randomUUID()
  } });
}

workspaceAccessRouter.get("/members", asyncHandler(async (req, res) => {
  const id = workspaceId(req);
  if (id !== req.auth?.workspaceId || !requireWorkspaceRole(req, res, "viewer")) return;
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id } });
  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId: id },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { id: true, email: true, name: true, avatar: true } } }
  });
  const taskIds = members.flatMap((membership) => membership.taskScopeId ? [membership.taskScopeId] : []);
  const tasks = await prisma.task.findMany({ where: { workspaceId: id, id: { in: taskIds } }, select: { id: true, title: true } });
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]));
  res.json({ data: members.map((membership) => ({
    id: membership.id,
    userId: membership.userId,
    email: membership.user.email,
    name: membership.user.name,
    avatar: membership.user.avatar,
    role: membership.role,
    taskScopeId: membership.taskScopeId,
    taskTitle: membership.taskScopeId ? taskTitles.get(membership.taskScopeId) ?? null : null,
    primaryOwner: workspace.ownerUserId === membership.userId,
    joinedAt: membership.createdAt
  })) });
}));

workspaceAccessRouter.get("/invitations", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res);
  if (!actor) return;
  const now = new Date();
  const invitations = await prisma.workspaceInvitation.findMany({
    where: { workspaceId: actor.workspaceId, status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { name: true, email: true } } }
  });
  const taskIds = invitations.flatMap((invitation) => invitation.taskScopeId ? [invitation.taskScopeId] : []);
  const tasks = await prisma.task.findMany({ where: { workspaceId: actor.workspaceId, id: { in: taskIds } }, select: { id: true, title: true } });
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]));
  res.json({ data: invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    taskScopeId: invitation.taskScopeId,
    taskTitle: invitation.taskScopeId ? taskTitles.get(invitation.taskScopeId) ?? null : null,
    status: invitation.expiresAt <= now ? "expired" : invitation.status,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    invitedBy: invitation.invitedBy.name || invitation.invitedBy.email
  })) });
}));

workspaceAccessRouter.post("/task-invitations", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res, "owner");
  if (!actor) return;
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId }, select: { ownerUserId: true } });
  if (workspace.ownerUserId !== req.auth!.userId) return sendApiError(res, 403, "primary_owner_required");
  const input = taskInviteSchema.parse(req.body);
  const task = await prisma.task.findFirst({ where: {
    id: input.taskId, workspaceId: actor.workspaceId, status: { not: "archived" }
  }, select: { id: true, title: true } });
  if (!task) return sendApiError(res, 404, "task_not_found");
  const existingUser = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existingUser && await prisma.workspaceMembership.findUnique({ where: {
    workspaceId_userId: { workspaceId: actor.workspaceId, userId: existingUser.id }
  } })) return sendApiError(res, 409, "workspace_member_exists");
  const token = generateWorkspaceInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await prisma.$transaction(async (tx) => {
    await tx.workspaceInvitation.updateMany({ where: {
      workspaceId: actor.workspaceId, email: input.email, status: "pending"
    }, data: { status: "revoked", revokedAt: new Date() } });
    const created = await tx.workspaceInvitation.create({ data: {
      workspaceId: actor.workspaceId,
      email: input.email,
      role: "member",
      taskScopeId: task.id,
      tokenHash: hashWorkspaceInvitationToken(token),
      invitedByUserId: req.auth!.userId!,
      expiresAt
    } });
    await tx.auditLog.create({ data: {
      workspaceId: actor.workspaceId, actorType: "user", actorId: req.auth!.userId!, action: "task_member_invited",
      resourceType: "workspace_invitation", resourceId: created.id,
      inputPayload: { email: input.email, taskId: task.id },
      outputPayload: { expiresAt }, correlationId: randomUUID()
    } });
    return created;
  });
  res.status(201).json({ data: { id: invitation.id, email: invitation.email, role: invitation.role,
    taskScopeId: task.id, taskTitle: task.title, expiresAt, token } });
}));

workspaceAccessRouter.post("/invitations", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res);
  if (!actor) return;
  const input = inviteSchema.parse(req.body);
  if (input.role === "admin" && !roleAtLeast(actor.role, "owner")) return sendApiError(res, 403, "forbidden");

  const existingUser = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existingUser && await prisma.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: existingUser.id } } })) {
    return sendApiError(res, 409, "workspace_member_exists");
  }

  const rawToken = generateWorkspaceInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await prisma.$transaction(async (tx) => {
    await tx.workspaceInvitation.updateMany({
      where: { workspaceId: actor.workspaceId, email: input.email, status: "pending" },
      data: { status: "revoked", revokedAt: new Date() }
    });
    const created = await tx.workspaceInvitation.create({ data: {
      workspaceId: actor.workspaceId,
      email: input.email,
      role: input.role,
      tokenHash: hashWorkspaceInvitationToken(rawToken),
      invitedByUserId: req.auth!.userId!,
      expiresAt
    } });
    await tx.auditLog.create({ data: {
      workspaceId: actor.workspaceId, actorType: "user", actorId: req.auth!.userId!, action: "workspace_member_invited",
      resourceType: "workspace_invitation", resourceId: created.id, inputPayload: { email: input.email, role: input.role },
      outputPayload: { expiresAt }, correlationId: randomUUID()
    } });
    return created;
  });
  res.status(201).json({ data: { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt, token: rawToken } });
}));

workspaceAccessRouter.post("/invitations/:invitationId/actions/reissue", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res);
  if (!actor) return;
  const invitationId = z.string().uuid().parse(req.params.invitationId);
  const existing = await prisma.workspaceInvitation.findFirst({ where: { id: invitationId, workspaceId: actor.workspaceId, status: "pending" } });
  if (!existing) return sendApiError(res, 404, "not_found");
  if (existing.taskScopeId && actor.role !== "owner") return sendApiError(res, 403, "forbidden");
  if (existing.taskScopeId) {
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId }, select: { ownerUserId: true } });
    if (workspace.ownerUserId !== req.auth!.userId) return sendApiError(res, 403, "primary_owner_required");
  }
  if (existing.role === "admin" && !roleAtLeast(actor.role, "owner")) return sendApiError(res, 403, "forbidden");
  if (existing.taskScopeId && !await prisma.task.findFirst({ where: {
    id: existing.taskScopeId, workspaceId: actor.workspaceId, status: { not: "archived" }
  }, select: { id: true } })) return sendApiError(res, 409, "invitation_scope_unavailable");
  const token = generateWorkspaceInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.workspaceInvitation.updateMany({ where: {
      id: existing.id, status: "pending", tokenHash: existing.tokenHash
    }, data: { tokenHash: hashWorkspaceInvitationToken(token), expiresAt } });
    if (claimed.count !== 1) return null;
    await tx.auditLog.create({ data: {
      workspaceId: actor.workspaceId, actorType: "user", actorId: req.auth!.userId!,
      action: "workspace_invitation_reissued", resourceType: "workspace_invitation",
      resourceId: existing.id, inputPayload: {}, outputPayload: { expiresAt }, correlationId: randomUUID()
    } });
    return tx.workspaceInvitation.findUniqueOrThrow({ where: { id: existing.id } });
  });
  if (!updated) return sendApiError(res, 409, "invitation_changed");
  res.json({ data: { id: updated.id, email: updated.email, role: updated.role, taskScopeId: updated.taskScopeId, expiresAt, token } });
}));

workspaceAccessRouter.delete("/invitations/:invitationId", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res);
  if (!actor) return;
  const invitationId = z.string().uuid().parse(req.params.invitationId);
  const existing = await prisma.workspaceInvitation.findFirst({ where: { id: invitationId, workspaceId: actor.workspaceId, status: "pending" } });
  if (!existing) return sendApiError(res, 404, "not_found");
  if (existing.taskScopeId && actor.role !== "owner") return sendApiError(res, 403, "forbidden");
  if (existing.taskScopeId) {
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId }, select: { ownerUserId: true } });
    if (workspace.ownerUserId !== req.auth!.userId) return sendApiError(res, 403, "primary_owner_required");
  }
  if (existing.role === "admin" && !roleAtLeast(actor.role, "owner")) return sendApiError(res, 403, "forbidden");
  const revoked = await prisma.$transaction(async (tx) => {
    const claimed = await tx.workspaceInvitation.updateMany({ where: {
      id: existing.id, status: "pending", tokenHash: existing.tokenHash
    }, data: { status: "revoked", revokedAt: new Date() } });
    if (claimed.count !== 1) return false;
    await tx.auditLog.create({ data: {
      workspaceId: actor.workspaceId, actorType: "user", actorId: req.auth!.userId!,
      action: "workspace_invitation_revoked", resourceType: "workspace_invitation",
      resourceId: existing.id, inputPayload: {}, outputPayload: {}, correlationId: randomUUID()
    } });
    return true;
  });
  if (!revoked) return sendApiError(res, 409, "invitation_changed");
  res.status(204).send();
}));

workspaceAccessRouter.patch("/members/:userId", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res);
  if (!actor) return;
  const targetUserId = z.string().uuid().parse(req.params.userId);
  const input = roleSchema.parse(req.body);
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId } });
  const target = await prisma.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: targetUserId } } });
  if (!target) return sendApiError(res, 404, "not_found");
  if (target.taskScopeId) return sendApiError(res, 409, "task_scoped_membership_immutable");
  if (workspace.ownerUserId === targetUserId && input.role !== "owner") return sendApiError(res, 409, "primary_owner_transfer_required");
  if ((target.role === "owner" || input.role === "owner" || input.role === "admin") && actor.role !== "owner") return sendApiError(res, 403, "forbidden");
  if (target.userId === req.auth!.userId && input.role !== target.role) return sendApiError(res, 409, "cannot_change_own_role");
  const updated = await prisma.workspaceMembership.update({ where: { id: target.id }, data: { role: input.role } });
  await audit(actor.workspaceId, req.auth!.userId!, "workspace_member_role_changed", "workspace_membership", updated.id, { role: input.role, userId: targetUserId });
  res.json({ data: { id: updated.id, userId: updated.userId, role: updated.role } });
}));

workspaceAccessRouter.delete("/members/:userId", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res);
  if (!actor) return;
  const targetUserId = z.string().uuid().parse(req.params.userId);
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId } });
  const target = await prisma.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: targetUserId } } });
  if (!target) return sendApiError(res, 404, "not_found");
  if (targetUserId === workspace.ownerUserId) return sendApiError(res, 409, "primary_owner_transfer_required");
  if ((target.role === "owner" || target.role === "admin") && actor.role !== "owner") return sendApiError(res, 403, "forbidden");
  if (targetUserId === req.auth!.userId) return sendApiError(res, 409, "cannot_remove_self");
  const workforce = await prisma.workforceEntity.findFirst({
    where: { workspaceId: actor.workspaceId, source: "user", externalId: targetUserId },
    select: { id: true, directReports: { select: { id: true }, take: 1 } }
  });
  if (workforce?.directReports.length) return sendApiError(res, 409, "cannot_remove_member_with_direct_reports");
  await prisma.$transaction(async (transaction) => {
    if (workforce) {
      await transaction.organizationalDepartmentRelation.deleteMany({ where: { workspaceId: actor.workspaceId, entityType: "workforce", entityId: workforce.id } });
      await transaction.organizationalScope.deleteMany({ where: { workspaceId: actor.workspaceId, entityType: "workforce", entityId: workforce.id } });
      await transaction.entityOwnership.deleteMany({ where: { workspaceId: actor.workspaceId, entityType: "workforce", entityId: workforce.id } });
      await transaction.workforceEntity.delete({ where: { id: workforce.id } });
    }
    await transaction.workspaceMembership.delete({ where: { id: target.id } });
    await transaction.auditLog.create({ data: {
      workspaceId: actor.workspaceId,
      actorType: "user",
      actorId: req.auth!.userId!,
      action: "workspace_member_removed",
      resourceType: "workspace_membership",
      resourceId: target.id,
      inputPayload: {},
      outputPayload: { userId: targetUserId, workforceEntityId: workforce?.id ?? null },
      correlationId: randomUUID()
    } });
  });
  res.status(204).send();
}));

workspaceAccessRouter.post("/actions/transfer-ownership", asyncHandler(async (req, res) => {
  const actor = await actorMembership(req, res, "owner");
  if (!actor) return;
  const input = transferSchema.parse(req.body);
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId } });
  if (workspace.ownerUserId !== req.auth!.userId) return sendApiError(res, 403, "primary_owner_required");
  if (input.userId === req.auth!.userId) return sendApiError(res, 409, "already_primary_owner");
  const target = await prisma.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: input.userId } } });
  if (!target) return sendApiError(res, 404, "not_found");
  if (target.taskScopeId) return sendApiError(res, 409, "task_scoped_membership_immutable");
  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({ where: { id: actor.workspaceId }, data: { ownerUserId: target.userId } });
    await tx.workspaceMembership.update({ where: { id: target.id }, data: { role: "owner" } });
    await tx.workspaceMembership.update({ where: { id: actor.id }, data: { role: "admin" } });
    await tx.auditLog.create({ data: {
      workspaceId: actor.workspaceId, actorType: "user", actorId: req.auth!.userId!, action: "workspace_ownership_transferred",
      resourceType: "workspace", resourceId: actor.workspaceId, inputPayload: { newOwnerUserId: target.userId },
      outputPayload: { previousOwnerUserId: req.auth!.userId }, correlationId: randomUUID()
    } });
  });
  res.json({ data: { workspaceId: actor.workspaceId, ownerUserId: target.userId } });
}));
