import { nativePath } from "../modules/agent-runtime/runtime-redaction-http";
import { IntegrationError } from "../integrations/errors";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { sendApiError } from "./api-error";
import { inspectRuntime } from "../modules/agent-runtime/runtime-redaction-policy";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error.message === "agent_runtime_content_blocked") return sendApiError(res, 409, "agent_runtime_content_blocked");
  if (nativePath(_req.path)) {
    if (error instanceof ZodError) return sendApiError(res, 400, "validation_error");
    // Unknown native exceptions may contain Prisma arguments or upstream data.
    // Inspect in memory for the incident; neither logs nor clients receive them.
    inspectRuntime(String(error.message), "error.native");
    console.error("Agent runtime operation failed; inspect safe incident references.");
    return sendApiError(res, 500, "internal_server_error");
  }
  if (error instanceof IntegrationError) return sendApiError(res, error.status, error.code);

  if (error instanceof ZodError) {
    return sendApiError(res, 400, "validation_error", { details: error.flatten() });
  }

  if (error.message === "cors_origin_not_allowed") {
    return sendApiError(res, 403, "cors_origin_not_allowed");
  }

  console.error(error);

  return sendApiError(res, 500, "internal_server_error");
}
