import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { agentPrincipalRoute } from "./agent-principal";
import { hashApiKey } from "./api-key";
import { capabilityForRequest, hasCapability } from "./capabilities";
import { verifyAuthToken } from "./token";
import { sendApiError } from "../middleware/api-error";
import type { WorkspaceRole } from "@prisma/client";

export type AuthContext = {
  userId?: string;
  workspaceId: string;
  authType: "user" | "api_key";
  apiKeyId?: string;
  agentId?: string;
  credentialVersion?: number;
  credentialPrefix?: string;
  scopes?: string[];
  workspaceRole?: WorkspaceRole;
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
      authType: "user",
      workspaceRole: membership.role
    };
    return next();
  }

  const apiKey = req.header("X-API-Key");

  if (!apiKey) {
    return sendApiError(res, 401, "missing_api_key");
  }

  const apiKeyHash = hashApiKey(apiKey);
  const record = await prisma.apiKey.findFirst({
    include: { boundAgent: true },
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

  if (!record?.active || record.revokedAt || record.expiresAt && record.expiresAt <= new Date()) {
    return sendApiError(res, 403, "invalid_api_key");
  }

  if (!record.workspaceId) {
    return sendApiError(res, 422, "workspace_required");
  }

  if (record.boundAgentId && (record.boundAgent?.workspaceId !== record.workspaceId || record.boundAgent?.type !== "agent" || record.boundAgent?.status !== "active" || record.boundAgent?.source === "user" || !record.expiresAt || !agentPrincipalRoute(req.method, req.path))) {
    return sendApiError(res, 403, "agent_principal_forbidden");
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
    data: { lastUsedAt: new Date(), updatedAt: record.updatedAt }
  });

  req.auth = {
    workspaceId: record.workspaceId,
    authType: "api_key",
    apiKeyId: record.id,
    ...(record.boundAgentId ? { agentId: record.boundAgentId, credentialVersion: record.credentialVersion, credentialPrefix: record.keyPrefix ?? undefined } : {}),
    scopes
  };

  return next();
}

export const requireApiKey = requireAuthContext;
