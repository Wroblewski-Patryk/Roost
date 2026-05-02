import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { requireAuthContext } from "../../auth/api-key.middleware";
import { hashPassword, verifyPassword } from "../../auth/password";
import { createAuthToken } from "../../auth/token";
import { asyncHandler } from "../../middleware/async-handler";

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

      return { user, workspace };
    });

    const token = createAuthToken({
      userId: result.user.id,
      workspaceId: result.workspace.id
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
  res.json({ data: req.auth });
}));
