import express, { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { hashApiKey } from "../../auth/api-key";
import { hasCapability, scopesAreBroad } from "../../auth/capabilities";
import { acceptProjection, consumeProjectionAdmission, parseProjectionEnvelope, readProjection, tryAcquireProjectionWorkspaceLock } from "./product-map-projection.service";

const maxBodyBytes = 256 * 1024;

function privateResponse(res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization, X-API-Key");
}

function denyIngress(res: Response, status = 403) {
  privateResponse(res);
  return res.status(status).json({ error: "projection_ingress_denied" });
}

type ProjectionIngressAuth = { workspaceId: string; apiKeyId: string };

async function resolveProjectionIngressAuth(req: Request): Promise<ProjectionIngressAuth | null> {
  if (req.header("Authorization") || req.header("Content-Encoding") || !req.header("X-API-Key")) return null;
  const record = await prisma.apiKey.findFirst({ where: { keyHash: hashApiKey(req.header("X-API-Key")!) } });
  const scopes = Array.isArray(record?.scopes) ? record!.scopes.filter((scope): scope is string => typeof scope === "string") : [];
  if (!record?.active || !record.workspaceId || scopesAreBroad(scopes) || !hasCapability(scopes, "product-map:projection:ingest")) return null;
  return { workspaceId: record.workspaceId, apiKeyId: record.id };
}

export const productMapIngressRouter = Router();
productMapIngressRouter.use(async (req, res, next) => {
  try {
    const auth = await resolveProjectionIngressAuth(req);
    if (!auth) return denyIngress(res);
    res.locals.projectionIngressAuth = auth;
    next();
  } catch {
    return denyIngress(res);
  }
});
productMapIngressRouter.use(express.raw({ type: "application/json", limit: maxBodyBytes }));
productMapIngressRouter.use((error: Error & { type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (error.type === "entity.too.large" || error.type === "entity.parse.failed") return denyIngress(res, 400);
  next(error);
});
productMapIngressRouter.post("/", async (req, res) => {
  const auth = res.locals.projectionIngressAuth as ProjectionIngressAuth | undefined;
  if (!auth) return denyIngress(res);
  let rawBody: unknown;
  try {
    rawBody = JSON.parse((req.body as Buffer).toString("utf8"));
  } catch {
    return denyIngress(res, 400);
  }
  const envelope = parseProjectionEnvelope(rawBody);
  if (!envelope) return denyIngress(res, 400);
  const workspace = await prisma.workspace.findUnique({ where: { id: auth.workspaceId }, select: { productMapCompanyId: true } });
  if (!workspace?.productMapCompanyId) return denyIngress(res);
  if (workspace.productMapCompanyId !== envelope.companyId) return denyIngress(res);
  if (!await consumeProjectionAdmission(auth.apiKeyId, auth.workspaceId)) return denyIngress(res, 429);
  try {
    const receipt = await prisma.$transaction(async (tx) => {
      if (!await tryAcquireProjectionWorkspaceLock(auth.workspaceId, tx)) return null;
      return acceptProjection(auth.workspaceId, envelope, tx);
    });
    if (!receipt) return denyIngress(res, 429);
    privateResponse(res);
    return res.status(receipt.status === "accepted" || receipt.status === "duplicate" ? 200 : 409).json({ data: receipt });
  } catch {
    return denyIngress(res, 400);
  }
});

export const productMapReadRouter = Router();
productMapReadRouter.get("/projection", async (req, res) => {
  if (req.auth?.authType === "api_key") {
    const scopes = req.auth.scopes ?? [];
    if (scopesAreBroad(scopes) || scopes.length !== 1 || scopes[0] !== "product-map:projection:read") {
      privateResponse(res);
      return res.status(403).json({ error: "forbidden" });
    }
  }
  const result = await readProjection(req.auth!.workspaceId);
  privateResponse(res);
  res.json({ data: result });
});
