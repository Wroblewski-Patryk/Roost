import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("X-API-Key");

  if (!apiKey) {
    return res.status(401).json({ error: "missing_api_key" });
  }

  const record = await prisma.apiKey.findUnique({
    where: { key: apiKey }
  });

  if (!record?.active) {
    return res.status(403).json({ error: "invalid_api_key" });
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() }
  });

  return next();
}
