import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { createAuthToken } from "../../auth/token";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureOperatingModelForWorkspace } from "../../operating-model/catalog";
import { ensureLifecycleProcedureForWorkspace } from "../company-os/lifecycle-procedure-definition";

const workspaceSchema = z.object({
  name: z.string().min(1)
}).strict();

export const workspacesRouter = Router();

function safeWorkspace(workspace: {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: workspace.id,
    name: workspace.name,
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
