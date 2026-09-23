import type { Request, Response } from "express";
import { sendApiError } from "../../middleware/api-error";
import { createWorkerCredentialService, freshWorkerOwner, WorkerCredentialError } from "./worker-credential.service";
import type { WorkerCredentialIntent } from "./worker-credential-contract";

export function workerCredentialHandler(action: WorkerCredentialIntent["action"], service: ReturnType<typeof createWorkerCredentialService>) {
  return async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    if (!req.auth || !freshWorkerOwner(req.auth, new Date())) return sendApiError(res, 403, "worker_credential_forbidden");
    try { return res.json({ data: await service(req.auth, action, req.body) }); }
    catch (error) { return sendApiError(res, error instanceof WorkerCredentialError ? error.status : 503,
      error instanceof WorkerCredentialError ? error.code : "worker_credential_unavailable"); }
  };
}
