import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { apiKeyPrefix, generateApiKey, hashApiKey } from "../../auth/api-key";
import { asyncHandler } from "../../middleware/async-handler";

const createApiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string().min(1)).optional()
}).strict();

const updateApiKeySchema = z.object({
  active: z.boolean()
}).strict();

export const apiKeysRouter = Router();

function requireOwner(req: Request, res: Response) {
  if (req.auth?.authType !== "user" || !req.auth.userId) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
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
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: records.map(safeApiKey) });
}));

apiKeysRouter.post("/", asyncHandler(async (req, res) => {
  if (!requireOwner(req, res)) {
    return;
  }

  const input = createApiKeySchema.parse(req.body);
  const rawKey = generateApiKey();
  const record = await prisma.apiKey.create({
    data: {
      workspaceId: req.auth!.workspaceId,
      name: input.name,
      key: null,
      keyHash: hashApiKey(rawKey),
      keyPrefix: apiKeyPrefix(rawKey),
      scopes: input.scopes ?? [],
      active: true
    }
  });

  res.status(201).json({
    data: {
      ...safeApiKey(record),
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
    return res.status(404).json({ error: "not_found" });
  }

  const record = await prisma.apiKey.update({
    where: { id: existing.id },
    data: { active: input.active }
  });

  res.json({ data: safeApiKey(record) });
}));
