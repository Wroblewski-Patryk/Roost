// Stateless source contract, NOT a transport adapter, issuer or launch receipt.
// Trusted server snapshots must eventually come from the authenticated Roost
// HTTPS channel. JSON booleans alone do not authenticate that channel. Nothing
// here reads local keys, signs, fetches, provisions or enters a receipt registry.
import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import { trustedPilotDecisionSchema, trustedPilotBytes } from "./agent-host-trusted-pilot.mjs";

export const ownerTicketVersion = "roost-server-owner-ticket-v1";
const h = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid(), time = z.string().datetime();
const origin = z.string().url().refine(s => { try { const u = new URL(s); return u.protocol === "https:" && u.origin === s && !u.username && !u.password; } catch { return false; } });
const keyId = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), epoch = z.number().int().positive();
const sha = b => createHash("sha256").update(b).digest("hex");
const same = (a,b) => trustedPilotBytes(a).equals(trustedPilotBytes(b));
const payloadSchema = z.object({ schemaVersion: z.literal(ownerTicketVersion), issuer: origin,
  audience: z.literal("roost-worker-trusted-pilot"), ticketId: id, nonce: h, keyId, keyEpoch: epoch,
  issuedAt: time, notBefore: time, expiresAt: time,
  acceptance: trustedPilotDecisionSchema, claimDigest: h,
  authority: z.literal("explicit_primary_owner_decision"), renewable: z.literal(false) }).strict();
export const ownerTicketSchema = z.object({ payload: payloadSchema, signature: z.string().regex(/^[a-f0-9]{128}$/) }).strict();
export const serverVerificationSchema = z.object({ origin, installationId: id, workspaceId: id,
  key: z.object({ id: keyId, epoch, publicKey: z.string().min(32).max(2048), state: z.enum(["active", "revoked", "retired"]) }).strict(),
  decisionId: id, decisionRevision: epoch, decisionState: z.enum(["accepted", "revoked", "superseded"]),
  checkedAt: time, expiresAt: time }).strict();
const consumePayloadSchema = z.object({ schemaVersion: z.literal(ownerTicketVersion), kind: z.literal("consume_ack"),
  issuer: origin, keyId, keyEpoch: epoch, ticketDigest: h, nonce: h, challenge: h, claimDigest: h,
  decisionId: id, decisionRevision: epoch, consumeId: id,
  state: z.enum(["consumed", "replayed", "revoked", "denied"]), firstUse: z.boolean(),
  checkedAt: time, expiresAt: time }).strict();
export const ownerTicketConsumeSchema = z.object({ payload: consumePayloadSchema,
  signature: z.string().regex(/^[a-f0-9]{128}$/) }).strict();
const expectedSchema = z.object({ issuer: origin, installationId: id, workspaceId: id,
  acceptance: trustedPilotDecisionSchema, claimDigest: h, challenge: h,
  clock: z.object({ wall: z.number().finite(), monotonic: z.number().finite(),
    previousWall: z.number().finite(), previousMonotonic: z.number().finite() }).strict() }).strict();
function fail() { throw Object.assign(Error("server_owner_ticket_blocked"), { protocolAdmission: true, retryable: false,
  outcome: "policy_blocked", publicMessage: "Owner ticket cannot be verified; stop without offline acceptance, renewal or fallback.",
  details: { reason: "server_owner_ticket_blocked" } }); }
export function ownerTicketDigest(ticket) { return sha(trustedPilotBytes(ownerTicketSchema.parse(ticket))); }
export function ownerTicketPublicKeyDigest(pem) {
  try { const key = createPublicKey(pem); if (key.asymmetricKeyType !== "ed25519") fail();
    return sha(key.export({ type: "spki", format: "der" })); } catch { fail(); }
}
// Inputs are server-derived auth/decision data, never the issue-request body.
export function assertOwnerTicketIssuer(auth, decision) {
  if (auth?.authType !== "user" || auth.workspaceRole !== "owner" || !auth.userId
    || auth.userId !== decision?.primaryOwnerId || auth.workspaceId !== decision.workspaceId
    || decision.actorUserId !== auth.userId || decision.explicitAcceptance !== true
    || decision.state !== "accepted") fail();
}
export function verifyServerOwnerTicket({ ticket, server, consumeAck, expected, localPublicKey }) {
  try {
    const t = ownerTicketSchema.parse(ticket), s = serverVerificationSchema.parse(server),
      a = ownerTicketConsumeSchema.parse(consumeAck), e = expectedSchema.parse(expected), p = t.payload, q = a.payload;
    if (trustedPilotBytes(t).length > 65536 || trustedPilotBytes(a).length > 8192) fail();
    const clock = e.clock, elapsed = clock.monotonic - clock.previousMonotonic;
    if (elapsed < 0 || clock.wall < clock.previousWall || Math.abs(clock.wall - clock.previousWall - elapsed) > 1000) fail();
    const now = clock.wall, start = Date.parse(p.issuedAt), end = Date.parse(p.expiresAt);
    if (start > now || Date.parse(p.notBefore) !== start || now >= end || end <= start || end - start > 60000
      || Date.parse(p.acceptance.decidedAt) > start || end > Date.parse(p.acceptance.expiresAt)) fail();
    for (const fresh of [s, q]) {
      const checked = Date.parse(fresh.checkedAt), expires = Date.parse(fresh.expiresAt);
      if (checked > now || now - checked > 5000 || expires <= now || expires <= checked || expires - checked > 5000) fail();
    }
    if (s.origin !== e.issuer || p.issuer !== e.issuer || q.issuer !== e.issuer
      || s.installationId !== e.installationId || p.acceptance.installationId !== e.installationId
      || s.workspaceId !== e.workspaceId || p.acceptance.scope.workspaceId !== e.workspaceId
      || s.key.state !== "active" || p.keyId !== s.key.id || q.keyId !== s.key.id
      || p.keyEpoch !== s.key.epoch || q.keyEpoch !== s.key.epoch
      || s.decisionState !== "accepted" || p.acceptance.state !== "accepted"
      || p.acceptance.decisionId !== s.decisionId || q.decisionId !== s.decisionId
      || p.acceptance.revision !== s.decisionRevision || q.decisionRevision !== s.decisionRevision
      || !same(p.acceptance, e.acceptance) || p.claimDigest !== e.claimDigest || q.claimDigest !== e.claimDigest
      || p.acceptance.provider.kind !== "hermes_codex" || !p.acceptance.provider.managedBackend
      || q.nonce !== p.nonce || q.challenge !== e.challenge || q.ticketDigest !== ownerTicketDigest(t)
      || q.state !== "consumed" || q.firstUse !== true) fail();
    const keyDigest = ownerTicketPublicKeyDigest(s.key.publicKey);
    // A local file is only a cache/candidate. The fresh authenticated server key
    // wins; neither ticket-supplied nor local installation.json keys are roots.
    if (localPublicKey !== undefined && ownerTicketPublicKeyDigest(localPublicKey) !== keyDigest) fail();
    const key = createPublicKey(s.key.publicKey);
    if (!verify(null, trustedPilotBytes(p), key, Buffer.from(t.signature, "hex"))
      || !verify(null, trustedPilotBytes(q), key, Buffer.from(a.signature, "hex"))) fail();
    return Object.freeze({ schemaVersion: ownerTicketVersion, qualification: "validator_only",
      ticketDigest: ownerTicketDigest(t), consumeId: q.consumeId, keyDigest,
      acceptanceDigest: sha(trustedPilotBytes(p.acceptance)), expiresAt: p.expiresAt,
      realIssuerQualified: false, transportQualified: false, launchAuthority: false });
  } catch { fail(); }
}
