import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { createMcpManifest } from "../../mcp/manifest";

export const mcpRouter = Router();

mcpRouter.get("/manifest", asyncHandler(async (req, res) => {
  res.json({
    data: createMcpManifest(req.auth!.scopes, Boolean(req.auth!.agentId))
  });
}));
