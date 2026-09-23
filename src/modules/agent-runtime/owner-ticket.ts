import { createHash, createPublicKey, randomBytes, randomUUID, verify } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { AuthContext } from "../../auth/api-key.middleware";

// Shared wire validators, no provider execution. Preserve native ESM in CJS builds.
const load = new Function("p", "return import(p)") as (p: string) => Promise<any>;
const wire = load(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-owner-ticket.mjs")).href);
const pilot = load(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-trusted-pilot.mjs")).href);
const h = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.string().uuid();
export const issueOwnerTicketSchema = z.object({ executionId: id, decisionId: id, decisionRevision: z.number().int().positive(),
  acceptanceDigest: h, contextDigest: h, explicitAcceptance: z.literal(true) }).strict();
export const consumeOwnerTicketSchema = z.object({ ticket: z.unknown(), ticketDigest: h, challenge: h, claimDigest: h,
  executionId: id, taskId: id, attempt: z.literal(1) }).strict();
export const revokeOwnerTicketSchema = z.object({ ticketId: id, expectedVersion: z.number().int().positive() }).strict();
export const rotateOwnerTicketSchema = z.object({ expectedEpoch: z.number().int().positive(), nextKeyId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), nextPublicKeyDigest: h }).strict();
export type TicketRow = {
  id: string; workspaceId: string; installationId: string; taskId: string; executionId: string; attempt: number;
  decisionId: string; decisionRevision: number; ownerId: string; keyId: string; keyEpoch: number;
  digest: string; nonceDigest: string; acceptanceDigest: string; contextDigest: string; claimDigest: string; challenge: string;
  issuedAt: Date; notBefore: Date; expiresAt: Date; state: "issued" | "consumed" | "revoked" | "expired";
  version: number; consumeId: string | null; consumedAt: Date | null; revokedAt: Date | null;
};
export type TicketKey = { installationId: string; keyId: string; epoch: number; publicKeyDigest: string };
export type TicketContext = { acceptance: any; claimDigest: string; challenge: string; contextDigest: string };
export interface OwnerTicketTx {
  primaryOwner(auth: AuthContext): Promise<boolean>;
  key(workspaceId: string): Promise<TicketKey | null>;
  current(workspaceId: string, executionId: string, decisionId: string, revision: number, now: Date): Promise<TicketContext>;
  find(workspaceId: string, ticketId: string): Promise<TicketRow | null>;
  insert(row: TicketRow): Promise<void>;
  transition(row: TicketRow, state: TicketRow["state"], now: Date, consumeId?: string): Promise<boolean>;
  rotate(workspaceId: string, epoch: number, keyId: string, digest: string, now: Date): Promise<boolean>;
  audit(row: TicketRow, state: string, now: Date): Promise<void>;
  spendAttempt(row: TicketRow): Promise<void>;
}
export interface OwnerTicketStore { transaction<T>(work: (tx: OwnerTicketTx) => Promise<T>): Promise<T> }
export interface OwnerTicketSigner { keyId: string; epoch: number; publicKey: string; sign(bytes: Buffer): Promise<Buffer> }
export class OwnerTicketError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}
export function ticketBlocked(code = "owner_ticket_context_changed"): never { throw new OwnerTicketError(code); }
export async function ticketHash(value: unknown) {
  return createHash("sha256").update((await pilot).trustedPilotBytes(value)).digest("hex");
}
const flags = Object.freeze({ qualification: "synthetic_server_only", realIssuerQualified: false, transportQualified: false, launchAuthority: false });

/** Dependencies are installed by server composition, never HTTP/JSON/env overrides.
 * This atom installs no signer or host-evidence adapter in the application. */
export function createOwnerTicketService(store: OwnerTicketStore, options: { issuer: string; signer?: OwnerTicketSigner; now?: () => Date }) {
  const now = options.now ?? (() => new Date());
  const signer = options.signer;
  function available() { if (!signer) throw new OwnerTicketError("owner_ticket_unavailable", 503); }
  async function owner(tx: OwnerTicketTx, auth: AuthContext) {
    if (auth.authType !== "user" || !auth.userId || auth.workspaceRole !== "owner" || !await tx.primaryOwner(auth)) throw new OwnerTicketError("owner_ticket_forbidden", 403);
  }
  async function currentKey(tx: OwnerTicketTx, w: string) {
    available();
    const key = await tx.key(w), v = await wire;
    if (!key || key.keyId !== signer!.keyId || key.epoch !== signer!.epoch || key.publicKeyDigest !== v.ownerTicketPublicKeyDigest(signer!.publicKey)) ticketBlocked("owner_ticket_key_unavailable");
    return key;
  }
  async function signed(payload: any) {
    const bytes = (await pilot).trustedPilotBytes(payload);
    // Do not trust even an injected signer to return a valid signature.
    const signature = await signer!.sign(bytes);
    if (!verify(null, bytes, createPublicKey(signer!.publicKey), signature)) ticketBlocked("owner_ticket_signing_failed");
    return { payload, signature: signature.toString("hex") };
  }
  async function context(tx: OwnerTicketTx, auth: AuthContext, executionId: string, decisionId: string, revision: number, at: Date) {
    const c = await tx.current(auth.workspaceId, executionId, decisionId, revision, at);
    const a = (await pilot).trustedPilotDecisionSchema.parse(c.acceptance);
    if (a.state !== "accepted" || a.scope.workspaceId !== auth.workspaceId || a.scope.executionId !== executionId
      || a.decisionId !== decisionId || a.revision !== revision || a.provider.kind !== "hermes_codex" || !a.provider.managedBackend
      || Date.parse(a.decidedAt) > at.getTime() || Date.parse(a.expiresAt) <= at.getTime()) ticketBlocked();
    if (Date.parse(a.provider.managedBackend.context.gates.durationDeadline) <= at.getTime()) ticketBlocked();
    h.parse(c.claimDigest); h.parse(c.challenge); h.parse(c.contextDigest);
    return { ...c, acceptance: a };
  }
  return {
    async issue(auth: AuthContext, body: unknown) {
      const input = issueOwnerTicketSchema.parse(body);
      return store.transaction(async tx => {
        await owner(tx, auth); available();
        const at = now(), key = await currentKey(tx, auth.workspaceId);
        const c = await context(tx, auth, input.executionId, input.decisionId, input.decisionRevision, at);
        if (c.acceptance.installationId !== key.installationId || await ticketHash(c.acceptance) !== input.acceptanceDigest || c.contextDigest !== input.contextDigest) ticketBlocked();
        const expiresAt = new Date(Math.min(at.getTime() + 60000, Date.parse(c.acceptance.expiresAt),
          Date.parse(c.acceptance.provider.managedBackend.context.gates.durationDeadline)));
        const v = await wire;
        const ticket = v.ownerTicketSchema.parse(await signed({ schemaVersion: v.ownerTicketVersion, issuer: options.issuer,
          audience: "roost-worker-trusted-pilot", ticketId: randomUUID(), nonce: randomBytes(32).toString("hex"),
          keyId: key.keyId, keyEpoch: key.epoch, issuedAt: at.toISOString(), notBefore: at.toISOString(), expiresAt: expiresAt.toISOString(),
          acceptance: c.acceptance, claimDigest: c.claimDigest, authority: "explicit_primary_owner_decision", renewable: false }));
        const row: TicketRow = { id: ticket.payload.ticketId, workspaceId: auth.workspaceId, installationId: key.installationId,
          taskId: c.acceptance.scope.taskId, executionId: input.executionId, attempt: 1, decisionId: input.decisionId,
          decisionRevision: input.decisionRevision, ownerId: auth.userId!, keyId: key.keyId, keyEpoch: key.epoch,
          digest: v.ownerTicketDigest(ticket), nonceDigest: await ticketHash(ticket.payload.nonce), acceptanceDigest: input.acceptanceDigest,
          contextDigest: input.contextDigest, claimDigest: c.claimDigest, challenge: c.challenge, issuedAt: at, notBefore: at, expiresAt,
          state: "issued", version: 1, consumedAt: null, revokedAt: null, consumeId: null };
        await tx.insert(row); await tx.audit(row, "issued", at);
        return { ...flags, ticket };
      });
    },
    async consume(auth: AuthContext, body: unknown) {
      const input = consumeOwnerTicketSchema.parse(body), v = await wire;
      const ticket = v.ownerTicketSchema.parse(input.ticket);
      return store.transaction(async tx => {
        await owner(tx, auth); available();
        const row = await tx.find(auth.workspaceId, ticket.payload.ticketId);
        if (!row) ticketBlocked("owner_ticket_not_found");
        if (row.state !== "issued") ticketBlocked("owner_ticket_replayed");
        const at = now(), key = await currentKey(tx, auth.workspaceId);
        if (at < row.notBefore) ticketBlocked("owner_ticket_not_yet_valid");
        if (at >= row.expiresAt) {
          if (!await tx.transition(row, "expired", at)) ticketBlocked("owner_ticket_replayed");
          await tx.audit(row, "expired", at);
          return { error: "owner_ticket_expired" as const };
        }
        if (row.ownerId !== auth.userId || key.installationId !== row.installationId || key.keyId !== row.keyId || key.epoch !== row.keyEpoch) ticketBlocked("owner_ticket_key_changed");
        if (input.ticketDigest !== row.digest || v.ownerTicketDigest(ticket) !== row.digest
          || ticket.payload.issuer !== options.issuer || ticket.payload.keyId !== key.keyId || ticket.payload.keyEpoch !== key.epoch
          || input.challenge !== row.challenge || input.claimDigest !== row.claimDigest || input.taskId !== row.taskId
          || input.executionId !== row.executionId || input.attempt !== row.attempt
          || !verify(null, (await pilot).trustedPilotBytes(ticket.payload), createPublicKey(signer!.publicKey), Buffer.from(ticket.signature, "hex"))) ticketBlocked("owner_ticket_binding_invalid");
        const c = await context(tx, auth, row.executionId, row.decisionId, row.decisionRevision, at);
        if (c.contextDigest !== row.contextDigest || await ticketHash(c.acceptance) !== row.acceptanceDigest || c.claimDigest !== row.claimDigest || c.challenge !== row.challenge) ticketBlocked();
        const consumeId = randomUUID();
        const ack = v.ownerTicketConsumeSchema.parse(await signed({ schemaVersion: v.ownerTicketVersion, kind: "consume_ack", issuer: options.issuer,
          keyId: key.keyId, keyEpoch: key.epoch, ticketDigest: row.digest, nonce: ticket.payload.nonce, challenge: row.challenge,
          claimDigest: row.claimDigest, decisionId: row.decisionId, decisionRevision: row.decisionRevision, consumeId,
          state: "consumed", firstUse: true, checkedAt: at.toISOString(), expiresAt: new Date(Math.min(at.getTime() + 5000, row.expiresAt.getTime())).toISOString() }));
        if (!await tx.transition(row, "consumed", at, consumeId)) ticketBlocked("owner_ticket_replayed");
        await tx.spendAttempt(row); await tx.audit(row, "consumed", at);
        // Returned only after transaction commit. Lost response cannot reissue it.
        return { ...flags, consumeAck: ack };
      });
    },
    async revoke(auth: AuthContext, body: unknown) {
      const input = revokeOwnerTicketSchema.parse(body);
      return store.transaction(async tx => {
        await owner(tx, auth);
        const row = await tx.find(auth.workspaceId, input.ticketId), at = now();
        if (!row || row.version !== input.expectedVersion || !await tx.transition(row, "revoked", at)) ticketBlocked("owner_ticket_replayed");
        await tx.audit(row, "revoked", at);
        return { ...flags, state: "revoked" };
      });
    },
    async rotate(auth: AuthContext, body: unknown) {
      const input = rotateOwnerTicketSchema.parse(body);
      return store.transaction(async tx => {
        await owner(tx, auth);
        if (!await tx.rotate(auth.workspaceId, input.expectedEpoch, input.nextKeyId, input.nextPublicKeyDigest, now())) ticketBlocked("owner_ticket_key_changed");
        return { ...flags, epoch: input.expectedEpoch + 1 };
      });
    }
  };
}
