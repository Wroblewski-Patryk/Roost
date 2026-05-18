import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { sendApiError } from "./api-error";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    return sendApiError(res, 400, "validation_error", { details: error.flatten() });
  }

  if (error.message === "cors_origin_not_allowed") {
    return sendApiError(res, 403, "cors_origin_not_allowed");
  }

  console.error(error);

  return sendApiError(res, 500, "internal_server_error");
}
