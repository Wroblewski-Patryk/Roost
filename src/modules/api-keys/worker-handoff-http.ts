import type { Request, Response } from "express";
import { sendApiError } from "../../middleware/api-error";
import { createWorkerHandoffService } from "./worker-handoff.service";
import { WorkerCredentialError } from "./worker-credential.service";

// Production remains uncomposed. A qualification server may explicitly inject
// the real service/store and trusted synthetic transport dependencies below.
export function workerHandoffUnavailable(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  return sendApiError(res, 503, "worker_handoff_unavailable");
}

export function workerHandoffHandler(action: "request" | "approve" | "poll" | "ack" | "status", service: ReturnType<typeof createWorkerHandoffService>) {
  return async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const body = { ...req.body };
    try {
      // A bounded canonical base64url wire encoding is decoded only in memory.
      // Trusted transport evidence is never read from this body or headers.
      if (["poll", "ack", "status"].includes(action)) for (const field of ["deviceSecret", "challenge"]) {
        if (typeof body[field] !== "string" || !/^[A-Za-z0-9_-]{43,171}$/.test(body[field])) throw new WorkerCredentialError("validation_error", 400);
        const value = Buffer.from(body[field], "base64url");
        if (value.toString("base64url") !== body[field]) { value.fill(0); throw new WorkerCredentialError("validation_error", 400); }
        body[field] = value; delete req.body[field];
      }
      return res.json({ data: await service(action, req.auth, body) });
    } catch (e) { return sendApiError(res, e instanceof WorkerCredentialError ? e.status : 503, e instanceof WorkerCredentialError ? e.code : "worker_handoff_unavailable"); }
    finally { for (const field of ["deviceSecret", "challenge"]) { if (Buffer.isBuffer(body[field])) body[field].fill(0); delete req.body?.[field]; } }
  };
}
