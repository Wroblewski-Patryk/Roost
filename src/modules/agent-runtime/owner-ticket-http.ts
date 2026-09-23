import type { Request, Response } from "express";
import { ZodError } from "zod";
import { sendApiError } from "../../middleware/api-error";
import { createOwnerTicketService, OwnerTicketError } from "./owner-ticket";

type Service = ReturnType<typeof createOwnerTicketService>;
// No runtime setter, environment activation or request-supplied dependency.
// The existing API mounts these handlers with no signer/service composition.
export function ownerTicketHandler(action: keyof Service, service?: Service) {
  return async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.auth?.authType !== "user" || req.auth.workspaceRole !== "owner" || !req.auth.userId) return sendApiError(res, 403, "owner_ticket_forbidden");
    if (!service) return sendApiError(res, 503, "owner_ticket_unavailable");
    try {
      const result = await service[action](req.auth, req.body);
      if ("error" in result && result.error) return sendApiError(res, 409, result.error);
      return res.status(action === "issue" ? 201 : 200).json({ data: result });
    } catch (error) {
      if (error instanceof ZodError) return sendApiError(res, 400, "validation_error");
      if (error instanceof OwnerTicketError) return sendApiError(res, error.status, error.code);
      return sendApiError(res, 503, "owner_ticket_unavailable");
    }
  };
}
