import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env } from "../config/env";

type AuthTokenPayload = {
  userId: string;
  workspaceId: string;
  exp: number;
  authTime?: number;
  authVersion?: number;
  sessionId?: string;
};

const tokenVersion = "v1";
const defaultTtlSeconds = 60 * 60 * 12;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(unsignedToken: string) {
  return createHmac("sha256", env.authTokenSecret).update(unsignedToken).digest("base64url");
}

export function createAuthToken(input: Omit<AuthTokenPayload, "exp" | "authTime">, authenticatedAt: number | null = Math.floor(Date.now() / 1000)) {
  const payload: AuthTokenPayload = {
    ...input,
    sessionId: input.sessionId ?? randomBytes(32).toString("base64url"),
    ...(authenticatedAt === null ? {} : { authTime: authenticatedAt }),
    exp: Math.floor(Date.now() / 1000) + defaultTtlSeconds
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${tokenVersion}.${encodedPayload}`;
  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [version, encodedPayload, signature] = token.split(".");

  if (version !== tokenVersion || !encodedPayload || !signature) {
    return null;
  }

  const unsignedToken = `${version}.${encodedPayload}`;
  const expectedSignature = sign(unsignedToken);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
    if (!payload.userId || !payload.workspaceId || !Number.isInteger(payload.exp)
      || payload.exp < Math.floor(Date.now() / 1000)
      || (payload.sessionId !== undefined && !/^(?:[A-Za-z0-9_-]{43}|[a-f0-9]{64})$/.test(payload.sessionId))
      || (payload.authVersion !== undefined && (!Number.isInteger(payload.authVersion) || payload.authVersion < 0))) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
