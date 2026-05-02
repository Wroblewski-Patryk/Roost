import { createHmac, randomBytes } from "crypto";
import { env } from "../config/env";

export function generateApiKey() {
  return `cc_v1_${randomBytes(24).toString("base64url")}`;
}

export function hashApiKey(apiKey: string) {
  return createHmac("sha256", env.apiKeyHashSecret).update(apiKey).digest("hex");
}

export function apiKeyPrefix(apiKey: string) {
  return apiKey.slice(0, 10);
}
