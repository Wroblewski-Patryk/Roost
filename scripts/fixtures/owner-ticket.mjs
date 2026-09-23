// Test-only issuer and atomic-consume model. Private keys never leave memory;
// no production signer/secret/HTTP adapter is implemented by this fixture.
import { generateKeyPairSync, sign, randomUUID, randomBytes } from "node:crypto";
import { trustedPilotBytes } from "../lib/agent-host-trusted-pilot.mjs";
import { inspectFixedContainment } from "../lib/agent-host-fixed-execution.mjs";
import { assertOwnerTicketIssuer, ownerTicketVersion, ownerTicketDigest } from "../lib/agent-host-owner-ticket.mjs";
import { createManagedBackendFixture } from "./trusted-pilot.mjs";

export async function createOwnerTicketFixture(t, backend = "codex_responses") {
  const x = await createManagedBackendFixture(t, backend), now = Date.now(),
    { publicKey, privateKey } = generateKeyPairSync("ed25519"), nonce = () => randomBytes(32).toString("hex");
  const issuer = "https://roost.example.invalid", ownerId = "00000000-0000-4000-8000-000000000031";
  const auth = { authType: "user", userId: ownerId, workspaceId: x.payload.scope.workspaceId, workspaceRole: "owner" };
  const ownerDecision = { primaryOwnerId: ownerId, actorUserId: ownerId, workspaceId: auth.workspaceId, explicitAcceptance: true, state: "accepted" };
  assertOwnerTicketIssuer(auth, ownerDecision);
  const claimDigest = inspectFixedContainment(x.grant).runtime.claimDigest;
  const server = { origin: issuer, installationId: x.payload.installationId, workspaceId: x.payload.scope.workspaceId,
    key: { id: "test-key-1", epoch: 1, publicKey: publicKey.export({ type: "spki", format: "pem" }), state: "active" },
    decisionId: x.payload.decisionId, decisionRevision: x.payload.revision, decisionState: "accepted",
    checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + 5000).toISOString() };
  const expected = { issuer, installationId: server.installationId, workspaceId: server.workspaceId,
    acceptance: structuredClone(x.payload), claimDigest, challenge: nonce(),
    clock: { wall: now, previousWall: now, monotonic: 1000, previousMonotonic: 1000 } };
  const ticket = { payload: { schemaVersion: ownerTicketVersion, issuer, audience: "roost-worker-trusted-pilot",
    ticketId: randomUUID(), nonce: nonce(), keyId: server.key.id, keyEpoch: server.key.epoch,
    issuedAt: new Date(now).toISOString(), notBefore: new Date(now).toISOString(), expiresAt: new Date(now + 30000).toISOString(),
    acceptance: structuredClone(x.payload), claimDigest, authority: "explicit_primary_owner_decision", renewable: false }, signature: "" };
  const signObject = value => { value.signature = sign(null, trustedPilotBytes(value.payload), privateKey).toString("hex"); };
  signObject(ticket);
  // Mimics a server-side CAS in tests only. Repeated ticket/nonce consumption
  // refuses even if the caller starts a fresh verifier process.
  const consumed = new Set();
  function consume(challenge = expected.challenge) {
    const identities = ["ticket:" + ticket.payload.ticketId, "nonce:" + ticket.payload.nonce,
      "attempt:" + server.installationId + ":" + x.payload.scope.executionId,
      "decision:" + server.workspaceId + ":" + server.decisionId + ":" + server.decisionRevision];
    const firstUse = identities.every(identity => !consumed.has(identity));
    if (firstUse) for (const identity of identities) consumed.add(identity);
    const ack = { payload: { schemaVersion: ownerTicketVersion, kind: "consume_ack", issuer, keyId: server.key.id,
      keyEpoch: server.key.epoch, ticketDigest: ownerTicketDigest(ticket), nonce: ticket.payload.nonce, challenge,
      claimDigest, decisionId: server.decisionId, decisionRevision: server.decisionRevision, consumeId: randomUUID(),
      state: firstUse ? "consumed" : "replayed", firstUse, checkedAt: server.checkedAt, expiresAt: server.expiresAt }, signature: "" };
    signObject(ack); return ack;
  }
  const request = { ticket, server, expected, consumeAck: consume(), localPublicKey: server.key.publicKey };
  return { ...x, request, auth, ownerDecision, consume, signObject };
}
