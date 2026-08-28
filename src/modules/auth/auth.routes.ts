import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { requireAuthContext } from "../../auth/api-key.middleware";
import { hashPassword, verifyPassword } from "../../auth/password";
import { createAuthToken } from "../../auth/token";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureOperatingModelForWorkspace } from "../../operating-model/catalog";
import { ensureLifecycleProcedureForWorkspace } from "../company-os/lifecycle-procedure-definition";
import { createWorkforceEntity } from "../workforce/workforce.service";

const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(12),
  name: z.string().optional(),
  workspaceName: z.string().min(1)
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().transform((value) => value.toLowerCase()).optional(),
  currentPassword: z.string().min(1).optional()
}).strict().refine((input) => input.name !== undefined || input.email !== undefined, {
  message: "profile_field_required"
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12)
}).strict();

export const authRouter = Router();

authRouter.post("/register", asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await hashPassword(input.password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash
        }
      });

      const workspace = await tx.workspace.create({
        data: {
          name: input.workspaceName,
          ownerUserId: user.id
        }
      });

      await tx.workspaceMembership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "owner"
        }
      });

      await ensureOperatingModelForWorkspace(tx, workspace.id);
      await ensureLifecycleProcedureForWorkspace(tx, workspace.id);

      return { user, workspace };
    }, { maxWait: 5_000, timeout: 15_000 });

    const token = createAuthToken({
      userId: result.user.id,
      workspaceId: result.workspace.id
    });

    await createWorkforceEntity(result.workspace.id, {
      type: "human",
      status: "active",
      name: result.user.name || result.user.email,
      department: "06-kadry",
      role: "Owner",
      personalityProfile: "executive",
      runtimeMode: "manual",
      synchronizationEnabled: false
    }, {
      source: "user",
      externalId: result.user.id
    });

    res.status(201).json({
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "email_already_registered" });
    }
    throw error;
  }
}));

authRouter.post("/login", asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      memberships: {
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const membership = user.memberships[0];
  if (!membership) {
    return res.status(422).json({ error: "workspace_required" });
  }

  const token = createAuthToken({
    userId: user.id,
    workspaceId: membership.workspaceId
  });

  res.json({
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name
      }
    }
  });
}));

authRouter.get("/me", requireAuthContext, asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user" || !req.auth!.userId) {
    return res.json({ data: req.auth });
  }

  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: "asc" },
    include: { workspace: true }
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.userId },
    select: { email: true, name: true, updatedAt: true }
  });

  res.json({
    data: {
      ...req.auth,
      user,
      workspaces: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
        active: membership.workspaceId === req.auth!.workspaceId
      }))
    }
  });
}));

authRouter.patch("/me", requireAuthContext, asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user" || !req.auth!.userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  const input = updateProfileSchema.parse(req.body);
  try {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    if (input.email && input.email !== existing.email && (!input.currentPassword || !(await verifyPassword(input.currentPassword, existing.passwordHash)))) {
      return res.status(400).json({ error: "current_password_invalid" });
    }
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.auth!.userId },
        data: { name: input.name, email: input.email },
        select: { id: true, email: true, name: true, updatedAt: true }
      });
      await tx.workforceEntity.updateMany({
        where: { source: "user", externalId: updated.id },
        data: { name: updated.name || updated.email }
      });
      return updated;
    });
    return res.json({ data: user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "email_already_registered" });
    }
    throw error;
  }
}));

authRouter.post("/password", requireAuthContext, asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user" || !req.auth!.userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  const input = changePasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    return res.status(400).json({ error: "current_password_invalid" });
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    return res.status(400).json({ error: "new_password_must_differ" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) }
  });
  return res.json({ data: { changed: true } });
}));
