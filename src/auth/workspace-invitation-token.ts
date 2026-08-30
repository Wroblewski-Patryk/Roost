import { createHash, randomBytes } from "crypto";

export function generateWorkspaceInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashWorkspaceInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
