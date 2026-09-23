import type { Request, Response } from "express";
import { sendApiError } from "../../middleware/api-error";

// Deliberately no injectable runtime router/composition in this slice. The pure
// service is qualified only by an in-memory adapter, without HTTP or TLS traffic.
export function workerHandoffUnavailable(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  return sendApiError(res, 503, "worker_handoff_unavailable");
}
