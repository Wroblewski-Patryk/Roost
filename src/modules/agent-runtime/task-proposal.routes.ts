import { Router } from "express";
import { z } from "zod";
import { requireWorkspaceRole } from "../../auth/workspace-access";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { readyTransaction } from "./task-execution-readiness";
import { createTaskProposalSchema, decideTaskProposalSchema, issueTaskProposalMandateSchema, revokeTaskProposalMandateSchema } from "./task-proposal-contract";
import {
  createTaskProposal,
  decideTaskProposal,
  issueTaskProposalMandate,
  listTaskProposalMandates,
  listTaskProposals,
  revokeTaskProposalMandate,
  taskProposalMandateCatalog,
  taskProposalDetail
} from "./task-proposal";

export const taskProposalRouter = Router();
const uuid = z.string().uuid();

function send(res: Parameters<typeof sendApiError>[0], result: any, created = false) {
  if (result.error) {
    const code = String(result.error);
    return sendApiError(res, code.endsWith("not_found") ? 404 : code.includes("forbidden") || code.endsWith("_required") ? 403 : 409, code);
  }
  return res.status(created && !result.replayed ? 201 : 200).json({ data: result });
}

taskProposalRouter.get("/task-proposal-mandate-candidates", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
  return send(res, await readyTransaction(db => taskProposalMandateCatalog(db, req.auth!.workspaceId, req.auth!)));
}));

taskProposalRouter.get("/tasks/:id/proposal-mandates", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
  return send(res, await readyTransaction(db => listTaskProposalMandates(db, req.auth!.workspaceId, uuid.parse(req.params.id), req.auth!)));
}));

taskProposalRouter.post("/tasks/:id/proposal-mandates", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
  if (!req.header("X-Owner-Action-Proof")) return sendApiError(res, 403, "task_proposal_fresh_owner_required");
  const input = issueTaskProposalMandateSchema.parse(req.body);
  return send(res, await readyTransaction(db => issueTaskProposalMandate(db, req.auth!.workspaceId, uuid.parse(req.params.id), req.auth!, input)), true);
}));

taskProposalRouter.post("/tasks/:id/proposal-mandates/:mandateId/actions/revoke", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
  if (!req.header("X-Owner-Action-Proof")) return sendApiError(res, 403, "task_proposal_fresh_owner_required");
  const input = revokeTaskProposalMandateSchema.parse(req.body);
  return send(res, await readyTransaction(db => revokeTaskProposalMandate(db, req.auth!.workspaceId, uuid.parse(req.params.id), uuid.parse(req.params.mandateId), req.auth!, input)), true);
}));

taskProposalRouter.post("/tasks/:id/proposals", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "api_key" || !req.auth!.agentId || !req.auth!.apiKeyId) return sendApiError(res, 403, "task_proposal_bound_agent_required");
  const input = createTaskProposalSchema.parse(req.body);
  return send(res, await readyTransaction(db => createTaskProposal(db, req.auth!.workspaceId, uuid.parse(req.params.id), req.auth!, input)), true);
}));

taskProposalRouter.get("/task-proposals", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
  const page = z.coerce.number().int().min(0).max(1000).default(0).parse(req.query.page);
  const status = z.literal("pending").optional().parse(req.query.status);
  return send(res, await readyTransaction(db => listTaskProposals(db, req.auth!.workspaceId, req.auth!, page, status)));
}));

taskProposalRouter.get("/task-proposals/:id", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
  return send(res, await readyTransaction(db => taskProposalDetail(db, req.auth!.workspaceId, uuid.parse(req.params.id), req.auth!)));
}));

for (const action of ["accept", "reject"] as const) {
  taskProposalRouter.post(`/task-proposals/:id/actions/${action}`, asyncHandler(async (req, res) => {
    if (!requireWorkspaceRole(req, res, "owner")) return;
    const input = decideTaskProposalSchema.parse({ ...req.body, action });
    return send(res, await readyTransaction(db => decideTaskProposal(db, req.auth!.workspaceId, uuid.parse(req.params.id), req.auth!, input)), true);
  }));
}
