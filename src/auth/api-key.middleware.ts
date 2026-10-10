import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { agentPrincipalRoute } from "./agent-principal";
import { unboundCompanySourceRead } from "./company-source-read-boundary";
import { hashApiKey } from "./api-key";
import { capabilityForRequest, hasCapability } from "./capabilities";
import { verifyAuthToken } from "./token";
import { sendApiError } from "../middleware/api-error";
import type { WorkspaceRole, PrismaClient } from "@prisma/client";
import { workerCredentialRoute, workerTicketPrincipal, type WorkerTicketIdentity } from "./worker-ticket-principal";

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
  authenticatedAt?: number;
  workerTicketIdentity?: WorkerTicketIdentity;
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

export function createAuthContextMiddleware(db: Pick<PrismaClient, "apiKey" | "workspaceMembership"> & Partial<Pick<PrismaClient,"agentExecution"|"agentHost">> = prisma) {
return async function requireAuthContext(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);

  if (token) {
    const payload = verifyAuthToken(token);
    if (!payload) {
      return sendApiError(res, 401, "invalid_auth_token");
    }

    const membership = await db.workspaceMembership.findUnique({
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
      workspaceRole: membership.role,
      authenticatedAt: payload.authTime
    };
    return next();
  }

  const apiKey = req.header("X-API-Key");

  if (!apiKey) {
    return sendApiError(res, 401, "missing_api_key");
  }

  const apiKeyHash = hashApiKey(apiKey);
  const record = await db.apiKey.findFirst({
    include: { boundAgent: true, workerHost: true },
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
  const workerIdentity = workerTicketPrincipal(record);
  const requestPath=`${req.baseUrl}${req.path}`.replace(/\/+$/, "");
  if (unboundCompanySourceRead(req.method, requestPath) && !workerIdentity)
    return sendApiError(res, 403, "task_bound_source_read_required");
  if ((record.workerHostId || record.workerInstallationId || record.workerBindingEpoch) && (!workerIdentity
    || !record.workerHost || record.workerHost.workspaceId !== record.workspaceId || record.workerHost.status === "disabled"
    || !workerCredentialRoute(req.method, requestPath)))
    return sendApiError(res, 403, "worker_credential_forbidden");
  if(workerIdentity){
    const executionId=requestPath.match(/^\/v1\/agent-runtime\/executions\/([0-9a-f-]{36})\//)?.[1]
      ?? (/^\/v1\/(?:company-intelligence|product-engineering)\//.test(requestPath)?req.query.executionId:null);
    if(executionId){
      if(typeof executionId!=="string"||!db.agentExecution)return sendApiError(res,403,"worker_credential_forbidden");
      const execution=await db.agentExecution.findFirst({where:{id:executionId,workspaceId:workerIdentity.workspaceId,agentHostId:workerIdentity.hostId}});
      const taskId=requestPath.match(/^\/v1\/company-intelligence\/tasks\/([0-9a-f-]{36})\/agent-context$/)?.[1];
      const applicationId=requestPath.match(/^\/v1\/product-engineering\/applications\/([0-9a-f-]{36})\/agent-context$/)?.[1];
      if(!execution||taskId&&execution.taskId!==taskId||applicationId&&execution.applicationId!==applicationId)return sendApiError(res,403,"worker_credential_forbidden");
    }else if(/^\/v1\/(?:company-intelligence|product-engineering)\//.test(requestPath))return sendApiError(res,403,"worker_credential_forbidden");
    const hostId=requestPath.match(/^\/v1\/agent-runtime\/hosts\/([0-9a-f-]{36})\/heartbeat$/)?.[1];
    if(hostId&&hostId!==workerIdentity.hostId)return sendApiError(res,403,"worker_credential_forbidden");
    if(requestPath==="/v1/agent-runtime/hosts/register"||requestPath==="/v1/agent-runtime/recovery"){
      const slug=requestPath.endsWith("register")?req.body?.slug:req.query.hostSlug;
      if(typeof slug!=="string"||!db.agentHost)return sendApiError(res,403,"worker_credential_forbidden");
      const host=await db.agentHost.findFirst({where:{id:workerIdentity.hostId,workspaceId:workerIdentity.workspaceId,slug,status:{not:"disabled"}}});
      if(!host)return sendApiError(res,403,"worker_credential_forbidden");
    }
  }
  const scopes = Array.isArray(record.scopes)
    ? record.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
  const requiredCapability = capabilityForRequest(req);
  const workerTransport=!!workerIdentity&&workerCredentialRoute(req.method,requestPath)
    && ["agent-runtime:claim","agent-runtime:report","company-graph:read","product-engineering:read"].includes(requiredCapability??"");
  const agentManifest = !!record.boundAgentId && requestPath === "/v1/mcp/manifest" && hasCapability(scopes, "agent-runtime:read");
  if (requiredCapability && !workerTransport && !agentManifest && !hasCapability(scopes, requiredCapability)) {
    return sendApiError(res, 403, "forbidden");
  }

  // Ticket requests cannot leave credential writes outside their transaction.
  // Status is strictly observational; consumption records its actor atomically
  // in the ticket Event. Denied owner-only operations also leave no usage write.
  const ticketRequest = req.method === "POST" && /^\/v1\/agent-runtime\/owner-tickets\/(?:issue|consume|status|revoke|rotate)$/.test(`${req.baseUrl}${req.path}`.replace(/\/+$/, ""));
  if (!ticketRequest && !record.workerHostId) await db.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date(), updatedAt: record.updatedAt }
  });

  req.auth = {
    workspaceId: record.workspaceId,
    authType: "api_key",
    apiKeyId: record.id,
    ...(workerIdentity ? { workerTicketIdentity: workerIdentity } : {}),
    ...(record.boundAgentId ? { agentId: record.boundAgentId, credentialVersion: record.credentialVersion, credentialPrefix: record.keyPrefix ?? undefined } : {}),
    scopes
  };

  return next();
};
}

export const requireAuthContext = createAuthContextMiddleware();
export const requireApiKey = requireAuthContext;
