import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";

type AuthTokenPayload = {
  userId: string;
  workspaceId: string;
  exp: number;
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

export function createAuthToken(input: Omit<AuthTokenPayload, "exp">) {
  const payload: AuthTokenPayload = {
    ...input,
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
    if (!payload.userId || !payload.workspaceId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
