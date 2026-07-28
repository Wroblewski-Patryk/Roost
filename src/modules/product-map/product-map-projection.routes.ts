import express, { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { hashApiKey } from "../../auth/api-key";
import { hasCapability, scopesAreBroad } from "../../auth/capabilities";
import { acceptProjection, parseProjectionEnvelope, readProjection } from "./product-map-projection.service";

const maxBodyBytes = 256 * 1024;
const ingressWindows = new Map<string, number[]>();
const inflightWorkspaces = new Set<string>();

function privateResponse(res: Response) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization, X-API-Key");
}

function denyIngress(res: Response, status = 403) {
  privateResponse(res);
  return res.status(status).json({ error: "projection_ingress_denied" });
}

async function requireProjectionIngestKey(req: Request, res: Response): Promise<{ workspaceId: string; apiKeyId: string } | null> {
  if (req.header("Authorization") || req.header("Content-Encoding") || !req.header("X-API-Key")) return null;
  const record = await prisma.apiKey.findFirst({ where: { keyHash: hashApiKey(req.header("X-API-Key")!) } });
  const scopes = Array.isArray(record?.scopes) ? record!.scopes.filter((scope): scope is string => typeof scope === "string") : [];
  if (!record?.active || !record.workspaceId || scopesAreBroad(scopes) || !hasCapability(scopes, "product-map:projection:ingest")) return null;
  return { workspaceId: record.workspaceId, apiKeyId: record.id };
}

function rateAllowed(key: string, now = Date.now()) {
  const previous = (ingressWindows.get(key) ?? []).filter((time) => time > now - 60_000);
  if (previous.length >= 6) return false;
  previous.push(now);
  ingressWindows.set(key, previous);
  return true;
}

export const productMapIngressRouter = Router();
productMapIngressRouter.use((req, res, next) => {
  if (req.header("Content-Encoding")) return denyIngress(res);
  next();
});
productMapIngressRouter.use(express.raw({ type: "application/json", limit: maxBodyBytes }));
productMapIngressRouter.use((error: Error & { type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (error.type === "entity.too.large" || error.type === "entity.parse.failed") return denyIngress(res, 400);
  next(error);
});
productMapIngressRouter.post("/", async (req, res) => {
  const auth = await requireProjectionIngestKey(req, res);
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
  if (!workspace?.productMapCompanyId || workspace.productMapCompanyId !== envelope.companyId) return denyIngress(res);
  const rateKey = `${auth.apiKeyId}:${auth.workspaceId}`;
  if (!rateAllowed(rateKey) || inflightWorkspaces.has(auth.workspaceId)) return denyIngress(res, 429);
  inflightWorkspaces.add(auth.workspaceId);
  try {
    const receipt = await acceptProjection(auth.workspaceId, envelope, req.requestId);
    privateResponse(res);
    return res.status(receipt.status === "accepted" || receipt.status === "duplicate" ? 200 : 409).json({ data: receipt });
  } catch {
    return denyIngress(res, 400);
  } finally {
    inflightWorkspaces.delete(auth.workspaceId);
  }
});

export const productMapReadRouter = Router();
productMapReadRouter.get("/projection", async (req, res) => {
  const result = await readProjection(req.auth!.workspaceId);
  privateResponse(res);
  res.json({ data: result });
});
