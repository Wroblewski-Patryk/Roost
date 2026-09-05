import { z } from "zod";
import { prisma } from "../db/prisma";
import { findAgentKeyProfile } from "../auth/agent-key-profiles";
import { createAuditedApiKey, setAuditedApiKeyActive } from "../modules/api-keys/api-key.service";

// Trusted production-container administration only, with explicit owner
// authority. This is not an HTTP endpoint or a bootstrap service-key bypass.
// stdout must be captured directly by the approved secret-store receiver.
export async function provisionHostKey(raw: unknown) {
  const input = z.object({
    action: z.enum(["create", "revoke"]), workspaceId: z.string().uuid(),
    name: z.string().trim().min(1).max(120), ownerAuthorized: z.literal(true),
    keyId: z.string().uuid().optional()
  }).strict().parse(raw);
  await prisma.workspace.findUniqueOrThrow({ where: { id: input.workspaceId } });
  const profile = findAgentKeyProfile("mcp_codex_worker")!;
  const actor = { actorType: "system" as const, actorId: null, source: "owner_authorized_host_provisioning" };
  if (input.action === "revoke") {
    if (!input.keyId) throw new Error("key_id_required");
    const key = await prisma.apiKey.findFirstOrThrow({ where: { id: input.keyId, workspaceId: input.workspaceId, name: input.name } });
    if (JSON.stringify(key.scopes) !== JSON.stringify(profile.scopes)) throw new Error("profile_mismatch");
    await setAuditedApiKeyActive({ ...actor, workspaceId: input.workspaceId, id: key.id, active: false });
    return { id: key.id, active: false };
  }
  if (input.keyId) throw new Error("unexpected_key_id");
  const { record, rawKey } = await createAuditedApiKey({ ...actor, workspaceId: input.workspaceId, name: input.name, scopes: profile.scopes, profileId: profile.id, rejectActiveName: true });
  return { id: record.id, workspaceId: record.workspaceId, profileId: profile.id, key: rawKey };
}

if (require.main === module) {
  void (async () => {
    try {
      if (process.env.NODE_ENV !== "production" || process.stdout.isTTY) throw new Error("secure_receiver_required");
      const result = await provisionHostKey(JSON.parse(process.argv[2] || "{}"));
      process.stdout.write(JSON.stringify(result));
    } catch {
      process.stderr.write("host_credential_provisioning_failed\n");
      process.exitCode = 1;
    } finally { await prisma.$disconnect(); }
  })();
}
