import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { sendApiError } from "./api-error";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

type RateLimitOptions = {
  keyPrefix: string;
  max: number;
  windowMs: number;
  skip?: (req: Request) => boolean;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const headerRequestId = req.header("X-Request-ID");
  req.requestId = headerRequestId && headerRequestId.length <= 120 ? headerRequestId : randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
}

export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (options.skip?.(req)) {
      next();
      return;
    }

    const now = Date.now();
    const key = `${options.keyPrefix}:${clientKey(req)}`;
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      sendApiError(res, 429, "rate_limited");
      return;
    }

    next();
  };
}
