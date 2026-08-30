import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
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
import { env } from "../../config/env";
import { hashWorkspaceInvitationToken } from "../../auth/workspace-invitation-token";

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

const identityValueSchema = z.string().max(900_000).refine((value) => (
  value === "initials"
  || /^icon:ph-[a-z0-9-]+$/.test(value)
  || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
), "invalid_identity_value");

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().transform((value) => value.toLowerCase()).optional(),
  avatar: identityValueSchema.nullable().optional(),
  currentPassword: z.string().min(1).optional()
}).strict().refine((input) => input.name !== undefined || input.email !== undefined || input.avatar !== undefined, {
  message: "profile_field_required"
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12)
}).strict();

const acceptInvitationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(12)
}).strict();

export const authRouter = Router();

authRouter.get("/invitations/:token", asyncHandler(async (req, res) => {
  const token = z.string().min(20).parse(req.params.token);
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { tokenHash: hashWorkspaceInvitationToken(token) },
    include: { workspace: { select: { name: true, logo: true } } }
  });
  if (!invitation || invitation.status !== "pending") return res.status(404).json({ error: "invitation_not_found" });
  if (invitation.expiresAt <= new Date()) {
    await prisma.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: "expired" } });
    return res.status(410).json({ error: "invitation_expired" });
  }
  const accountExists = Boolean(await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } }));
  res.json({ data: {
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    accountExists,
    workspace: invitation.workspace
  } });
}));

authRouter.post("/invitations/:token/accept", asyncHandler(async (req, res) => {
  const token = z.string().min(20).parse(req.params.token);
  const input = acceptInvitationSchema.parse(req.body);
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { tokenHash: hashWorkspaceInvitationToken(token) },
    include: { workspace: true }
  });
  if (!invitation || invitation.status !== "pending") return res.status(404).json({ error: "invitation_not_found" });
  if (invitation.expiresAt <= new Date()) {
    await prisma.workspaceInvitation.update({ where: { id: invitation.id }, data: { status: "expired" } });
    return res.status(410).json({ error: "invitation_expired" });
  }

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existing && !(await verifyPassword(input.password, existing.passwordHash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const passwordHash = existing ? existing.passwordHash : await hashPassword(input.password);
  const accepted = await prisma.$transaction(async (tx) => {
    const claimed = await tx.workspaceInvitation.updateMany({
      where: { id: invitation.id, status: "pending", expiresAt: { gt: new Date() } },
      data: { status: "accepted", acceptedAt: new Date() }
    });
    if (claimed.count !== 1) throw new Error("workspace_invitation_already_used");
    const user = existing ?? await tx.user.create({ data: { email: invitation.email, name: input.name, passwordHash } });
    const membership = await tx.workspaceMembership.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
      create: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
      update: {}
    });
    await tx.workspaceInvitation.update({ where: { id: invitation.id }, data: { acceptedByUserId: user.id } });
    await tx.auditLog.create({ data: {
      workspaceId: invitation.workspaceId, actorType: "user", actorId: user.id, action: "workspace_invitation_accepted",
      resourceType: "workspace_membership", resourceId: membership.id, inputPayload: {},
      outputPayload: { role: membership.role }, correlationId: randomUUID()
    } });
    return { user, membership };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "workspace_invitation_already_used") return null;
    throw error;
  });
  if (!accepted) return res.status(409).json({ error: "invitation_already_used" });

  const workforce = await prisma.workforceEntity.findFirst({ where: {
    workspaceId: invitation.workspaceId, source: "user", externalId: accepted.user.id
  } });
  if (!workforce) {
    await createWorkforceEntity(invitation.workspaceId, {
      type: "human", status: "active", name: accepted.user.name || accepted.user.email,
      department: "06-kadry", role: accepted.membership.role, personalityProfile: "supportive",
      runtimeMode: "manual", synchronizationEnabled: false
    }, { source: "user", externalId: accepted.user.id });
  }

  const authToken = createAuthToken({ userId: accepted.user.id, workspaceId: invitation.workspaceId });
  res.json({ data: {
    token: authToken,
    user: { id: accepted.user.id, email: accepted.user.email, name: accepted.user.name },
    workspace: { id: invitation.workspace.id, name: invitation.workspace.name },
    role: accepted.membership.role
  } });
}));

authRouter.post("/register", asyncHandler(async (req, res) => {
  if (!env.workspaceCreationEnabled) return res.status(403).json({ error: "workspace_creation_disabled" });
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
    select: { email: true, name: true, avatar: true, updatedAt: true }
  });

  res.json({
    data: {
      ...req.auth,
      user,
      workspaces: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        logo: membership.workspace.logo,
        accentColor: membership.workspace.accentColor,
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
        data: { name: input.name, email: input.email, avatar: input.avatar },
        select: { id: true, email: true, name: true, avatar: true, updatedAt: true }
      });
      await tx.workforceEntity.updateMany({
        where: { source: "user", externalId: updated.id },
        data: { name: updated.name || updated.email, ...(input.avatar !== undefined ? { avatar: input.avatar } : {}) }
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
