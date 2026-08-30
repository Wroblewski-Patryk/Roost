import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { createAuthToken } from "../../auth/token";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureOperatingModelForWorkspace } from "../../operating-model/catalog";
import { ensureLifecycleProcedureForWorkspace } from "../company-os/lifecycle-procedure-definition";
import { workspaceAccessRouter } from "./workspace-access.routes";
import { env } from "../../config/env";
import { roleAtLeast } from "../../auth/workspace-access";

const identityValueSchema = z.string().max(900_000).refine((value) => (
  value === "initials"
  || /^icon:ph-[a-z0-9-]+$/.test(value)
  || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
), "invalid_identity_value");

const workspaceSchema = z.object({
  name: z.string().min(1)
}).strict();

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  logo: identityValueSchema.nullable().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional()
}).strict().refine((input) => Object.keys(input).length > 0, { message: "workspace_field_required" });

export const workspacesRouter = Router();
workspacesRouter.use("/:id/access", workspaceAccessRouter);

function safeWorkspace(workspace: {
  id: string;
  name: string;
  logo: string | null;
  accentColor: string | null;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: workspace.id,
    name: workspace.name,
    logo: workspace.logo,
    accentColor: workspace.accentColor,
    ownerUserId: workspace.ownerUserId,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString()
  };
}

function requireUserAuth(req: Request, res: Response) {
  if (req.auth?.authType !== "user" || !req.auth.userId) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }

  return req.auth.userId;
}

workspacesRouter.get("/", asyncHandler(async (req, res) => {
  const userId = requireUserAuth(req, res);
  if (!userId) {
    return;
  }

  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { workspace: true }
  });

  res.json({
    data: memberships.map((membership) => ({
      ...safeWorkspace(membership.workspace),
      role: membership.role,
      active: membership.workspaceId === req.auth!.workspaceId
    }))
  });
}));

workspacesRouter.post("/", asyncHandler(async (req, res) => {
  const userId = requireUserAuth(req, res);
  if (!userId) {
    return;
  }
  if (!env.workspaceCreationEnabled) return res.status(403).json({ error: "workspace_creation_disabled" });

  const input = workspaceSchema.parse(req.body);
  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: {
        name: input.name,
        ownerUserId: userId
      }
    });

    await tx.workspaceMembership.create({
      data: {
        userId,
        workspaceId: created.id,
        role: "owner"
      }
    });

    await ensureOperatingModelForWorkspace(tx, created.id);
    await ensureLifecycleProcedureForWorkspace(tx, created.id);
    return created;
  }, { maxWait: 5_000, timeout: 15_000 });

  const token = createAuthToken({
    userId,
    workspaceId: workspace.id
  });

  res.status(201).json({
    data: {
      token,
      workspace: safeWorkspace(workspace)
    }
  });
}));

workspacesRouter.patch("/:id", asyncHandler(async (req, res) => {
  const userId = requireUserAuth(req, res);
  if (!userId) return;

  const workspaceId = z.string().uuid().parse(req.params.id);
  const membership = await prisma.workspaceMembership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
  });
  if (!membership) return res.status(404).json({ error: "not_found" });
  if (!roleAtLeast(membership.role, "admin")) return res.status(403).json({ error: "forbidden" });

  const input = updateWorkspaceSchema.parse(req.body);
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: input
  });
  res.json({ data: { ...safeWorkspace(workspace), role: membership.role, active: workspaceId === req.auth!.workspaceId } });
}));

workspacesRouter.post("/:id/actions/select", asyncHandler(async (req, res) => {
  const userId = requireUserAuth(req, res);
  if (!userId) {
    return;
  }

  const workspaceId = String(req.params.id);
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId
      }
    },
    include: { workspace: true }
  });

  if (!membership) {
    return res.status(404).json({ error: "not_found" });
  }

  await ensureOperatingModelForWorkspace(prisma, workspaceId);

  const token = createAuthToken({
    userId,
    workspaceId
  });

  res.json({
    data: {
      token,
      workspace: safeWorkspace(membership.workspace),
      role: membership.role
    }
  });
}));
