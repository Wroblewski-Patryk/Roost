import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { hashApiKey } from "./api-key";
import { capabilityForRequest, hasCapability } from "./capabilities";
import { verifyAuthToken } from "./token";
import { sendApiError } from "../middleware/api-error";

export type AuthContext = {
  userId?: string;
  workspaceId: string;
  authType: "user" | "api_key";
  apiKeyId?: string;
  scopes?: string[];
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function bearerToken(req: Request) {
  const authorization = req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice("Bearer ".length).trim();
}

export async function requireAuthContext(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);

  if (token) {
    const payload = verifyAuthToken(token);
    if (!payload) {
      return sendApiError(res, 401, "invalid_auth_token");
    }

    const membership = await prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: payload.workspaceId,
          userId: payload.userId
        }
      }
    });

    if (!membership) {
      return sendApiError(res, 403, "forbidden");
    }

    req.auth = {
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      authType: "user"
    };
    return next();
  }

  const apiKey = req.header("X-API-Key");

  if (!apiKey) {
    return sendApiError(res, 401, "missing_api_key");
  }

  const apiKeyHash = hashApiKey(apiKey);
  const record = await prisma.apiKey.findFirst({
    where: {
      OR: [
        { keyHash: apiKeyHash },
        {
          key: apiKey,
          keyHash: null
        }
      ]
    }
  });

  if (!record?.active) {
    return sendApiError(res, 403, "invalid_api_key");
  }

  if (!record.workspaceId) {
    return sendApiError(res, 422, "workspace_required");
  }

  const scopes = Array.isArray(record.scopes)
    ? record.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
  const requiredCapability = capabilityForRequest(req);
  if (requiredCapability && !hasCapability(scopes, requiredCapability)) {
    return sendApiError(res, 403, "forbidden");
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() }
  });

  req.auth = {
    workspaceId: record.workspaceId,
    authType: "api_key",
    apiKeyId: record.id,
    scopes
  };

  return next();
}

export const requireApiKey = requireAuthContext;
