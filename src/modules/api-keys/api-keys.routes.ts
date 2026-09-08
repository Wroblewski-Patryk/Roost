import { agentCredentialCatalog, agentCredentialCommand } from "./agent-credential.service";
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { createAuditedApiKey, setAuditedApiKeyActive } from "./api-key.service";
import { agentKeyProfiles, findAgentKeyProfile } from "../../auth/agent-key-profiles";
import { capabilities, scopesAreBroad } from "../../auth/capabilities";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { requireWorkspaceRole } from "../../auth/workspace-access";

const createApiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string().min(1)).optional(),
  profileId: z.string().min(1).optional(),
  fullAccessConfirmed: z.boolean().optional()
}).strict();

const updateApiKeySchema = z.object({
  active: z.boolean()
}).strict();

export const apiKeysRouter = Router();

function requireOwner(req: Request, res: Response) {
  return requireWorkspaceRole(req, res, "admin");
}

function safeApiKey(record: {
  id: string;
  workspaceId: string | null;
  name: string;
  keyPrefix: string | null;
  scopes: unknown;
  active: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: record.scopes,
    active: record.active,
    lastUsedAt: record.lastUsedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

apiKeysRouter.get("/", asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) {
    return;
  }

  const records = await prisma.apiKey.findMany({
    where: { workspaceId: req.auth!.workspaceId, boundAgentId: null },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: records.map(safeApiKey) });
}));

apiKeysRouter.get("/profiles", asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) {
    return;
  }

  res.json({ data: agentKeyProfiles });
}));

apiKeysRouter.post("/", asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) {
    return;
  }

  const input = createApiKeySchema.parse(req.body);
  const profile = findAgentKeyProfile(input.profileId);
  if (input.profileId && !profile) {
    return sendApiError(res, 400, "invalid_api_key_profile");
  }

  if (!profile && !input.scopes?.length && !input.fullAccessConfirmed) {
    return sendApiError(res, 400, "api_key_scope_required");
  }

  const scopes = input.scopes?.length ? input.scopes : profile?.scopes ?? ["companycore:*"];
  const requestedCustomScopes = input.scopes ?? [];
  const unknownScopes = requestedCustomScopes.filter((scope) => !capabilities.includes(scope as never) && !scopesAreBroad([scope]));
  if (unknownScopes.length) {
    return sendApiError(res, 400, "invalid_api_key_scope", { details: { scopes: unknownScopes } });
  }
  if (requestedCustomScopes.length && scopesAreBroad(requestedCustomScopes) && !input.fullAccessConfirmed) {
    return sendApiError(res, 400, "api_key_full_access_confirmation_required");
  }

  const { record, rawKey } = await createAuditedApiKey({
    workspaceId: req.auth!.workspaceId, name: input.name, scopes, profileId: profile?.id ?? null,
    actorType: req.auth!.authType === "user" ? "user" : "agent", actorId: req.auth!.userId ?? req.auth!.apiKeyId,
    source: "roost_api"
  });
  res.status(201).json({
    data: {
      ...safeApiKey(record),
      profile: profile ? {
        id: profile.id,
        label: profile.label,
        riskLevel: profile.riskLevel
      } : null,
      key: rawKey
    }
  });
}));

apiKeysRouter.patch("/:id", asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) {
    return;
  }

  const input = updateApiKeySchema.parse(req.body);
  const existing = await prisma.apiKey.findFirst({
    where: {
      id: String(req.params.id),
      workspaceId: req.auth!.workspaceId
    }
  });

  if (!existing) {
    return sendApiError(res, 404, "not_found");
  }

  if (existing.boundAgentId) return sendApiError(res, 403, "credential_lifecycle_required");
  const record = await setAuditedApiKeyActive({
    workspaceId: req.auth!.workspaceId, id: existing.id, active: input.active,
    actorType: req.auth!.authType === "user" ? "user" : "agent", actorId: req.auth!.userId ?? req.auth!.apiKeyId,
    source: "roost_api"
  });
  res.json({ data: safeApiKey(record) });
}));


apiKeysRouter.get("/agent-credentials", asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) return;
  res.json({ data: await agentCredentialCatalog(req.auth!.workspaceId) });
}));
apiKeysRouter.post("/agent-credentials", asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) return;
  const result = await agentCredentialCommand(req.auth!.workspaceId, req.auth!.userId!, "create", null, req.body);
  if ("error" in result) return sendApiError(res, result.error === "credential_forbidden" ? 403 : 409, result.error!);
  res.status(result.replayed ? 200 : 201).json({ data: result });
}));
for (const action of ["rotate", "revoke"] as const) apiKeysRouter.post(`/:id/actions/${action}`, asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) return;
  const id = z.string().uuid().parse(req.params.id);
  const result = await agentCredentialCommand(req.auth!.workspaceId, req.auth!.userId!, action, id, req.body);
  if ("error" in result) return sendApiError(res, result.error === "credential_forbidden" ? 403 : result.error === "credential_not_found" ? 404 : 409, result.error!);
  res.json({ data: result });
}));
