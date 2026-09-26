import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { one, type AttestationDb as Db } from './decision-attestation-sql';
import { denyProof, proofEqual } from './bootstrap-proof-key-contract';
import { v3Command, v3Plan, v3Receipt, type V3Command, type V3Plan } from './bootstrap-proof-issuance-contract';
import { createV3ProjectionReader, projectionCommitment } from './bootstrap-proof-projection';
import { requireV3BackendCatalog } from './bootstrap-v3-catalog';
import type { V3IssuancePorts, V3Phase } from './bootstrap-proof-issuance';

const packet = z.object({
  version: z.literal('bootstrap-v3-native-packet-v1'),
  plan: v3Plan,
  anchor: z.unknown(),
  evidence: z.unknown(),
  native: z.object({ mutations: z.array(z.unknown()), receipts: z.array(z.unknown()),
    epochs: z.array(z.unknown()), unfilteredReceipts: z.array(z.unknown()) }).strict(),
  commitment: projectionCommitment.nullable(),
  receipt: v3Receipt.nullable(),
  persistenceQualified: z.literal(false), cryptographyQualified: z.literal(false),
  sendPermit: z.literal(false), implementationReady: z.literal(false), executionSupported: z.literal(false),
  pilotReady: z.literal(false), liveAdmissionAllowed: z.literal(false),
  pilotExecutionAuthorized: z.literal(false), pilotExecutionStarted: z.literal(false),
  transportQualified: z.literal(false), launchAuthority: z.literal(false)
}).strict();

// This adapter is deliberately given a Prisma client by its caller. It does not
// provision signing keys, infer owner authority, or grant network delivery.
export function createPrismaV3IssuancePorts(client: Pick<PrismaClient, '$transaction'>): V3IssuancePorts {
  const modes = new WeakMap<Db, 'read' | 'write'>();
  const locked = new WeakSet<Db>();
  const projector = createV3ProjectionReader({
    qualification: 'source_only_canonical_projection_port_v3',
    async read(db, operationId, through) {
      const rows = await db.$queryRaw<{ value: unknown }[]>`SELECT bootstrap_v3_read(${operationId}::uuid, ${through}) AS value`;
      const value=packet.parse(one(rows).value);
      return {anchor:value.anchor,evidence:value.evidence};
    }
  });
  const requireMode = (db: Db) => { const mode = modes.get(db); if (!mode) denyProof(); return mode; };
  const readPacket = async (db: Db, command: V3Command) => {
    const rows = await db.$queryRaw<{ value: unknown }[]>`SELECT bootstrap_v3_read(${command.operationId}::uuid, 'seal') AS value`;
    const raw = one(rows).value;
    if (raw === null) return null;
    const value = packet.parse(raw);
    if (!proofEqual(value.plan.command, command) || !value.commitment || !value.receipt) denyProof();
    await projector.verify(db, value.plan, 'seal', value.commitment);
    // The native packet must include its complete, unfiltered interval. Catalog
    // and SQL function pins are checked on this same transaction before reads.
    if (!Array.isArray(value.native.unfilteredReceipts)) denyProof();
    return { plan: value.plan, receipt: value.receipt };
  };
  return Object.freeze({
    qualification: 'source_only_proof_issuance_ports_v3' as const,
    async transaction<T>(mode: 'read' | 'write', work: (db: Db) => Promise<T>): Promise<T> {
      return client.$transaction(async db => {
        if (mode === 'read') await db.$executeRaw`SET TRANSACTION READ ONLY`;
        await db.$executeRaw`SET LOCAL search_path = pg_catalog, public`;
        modes.set(db, mode);
        try { return await work(db); }
        finally { modes.delete(db); locked.delete(db); }
      }, { isolationLevel: mode === 'read' ? 'RepeatableRead' : 'Serializable', maxWait: 3000,
        timeout: mode === 'read' ? 30000 : 180000 });
    },
    async bound(db: Db, lock: boolean) {
      const mode = requireMode(db);
      if (lock) {
        if (mode !== 'write') denyProof();
        await db.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;
        locked.add(db);
      }
      const row = one(await db.$queryRaw<Array<{ fence: string; writerXid: string; isolation: string; readOnly: string; origin: string; schemaSafe: boolean }>>`
        SELECT revision::text AS fence, pg_current_xact_id()::text AS "writerXid",
          current_setting('transaction_isolation') AS isolation,
          current_setting('transaction_read_only') AS "readOnly",
          current_setting('session_replication_role') AS origin,
          current_schemas(true)=ARRAY['pg_catalog','public']::name[] AS "schemaSafe"
        FROM ready_source_fence WHERE id=1`);
      if (row.origin !== 'origin' || !row.schemaSafe || row.isolation !== (mode === 'read' ? 'repeatable read' : 'serializable')
        || row.readOnly !== (mode === 'read' ? 'on' : 'off')) denyProof();
      return { mode, isolation: row.isolation, readOnly: row.readOnly === 'on', origin: true as const,
        schemaSafe: true as const, fence: row.fence, writerXid: row.writerXid, locked: locked.has(db) };
    },
    async guards(db: Db) { requireMode(db); await requireV3BackendCatalog(db); },
    async readOperation(db: Db, input: V3Command) { requireMode(db); return readPacket(db, v3Command.parse(input)); },
    async appendPhase(db: Db, phase: V3Phase, input: Readonly<V3Plan>) {
      if (requireMode(db) !== 'write' || !locked.has(db)) denyProof();
      const plan = v3Plan.parse(input);
      const rows = await db.$queryRaw<{ value: unknown }[]>`SELECT bootstrap_v3_write(${JSON.stringify(plan)}::jsonb, ${phase}) AS value`;
      const value = packet.parse(one(rows).value);
      if (!proofEqual(value.plan, plan)) denyProof();
      await projector.verify(db, plan, phase, phase === 'seal' ? value.commitment : undefined);
    },
    async checkImmediate(db: Db) {
      if (requireMode(db) !== 'write' || !locked.has(db)) denyProof();
      await db.$executeRaw`SET CONSTRAINTS bootstrap_v3_commit_guard IMMEDIATE`;
    }
  });
}
