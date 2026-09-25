import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';

export type AttestationDb=Prisma.TransactionClient;
export const attestationScope=z.object({decisionId:z.string().uuid(),ticketId:z.string().uuid()}).strict();
export type AttestationScope=z.infer<typeof attestationScope>;
export const positiveText=z.string().regex(/^[1-9][0-9]*$/);
export const sqlHash=z.string().regex(/^[a-f0-9]{64}$/);
export const denyAttestation=():never=>{throw Error('decision_attestation_sql_unavailable');};
export const exact=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export function one<T>(rows:T[]):T{if(rows.length!==1)denyAttestation();return rows[0];}
export function safeCount(value:unknown){const n=Number(positiveText.parse(String(value)));if(!Number.isSafeInteger(n))denyAttestation();return n;}
export function exactTime(value:unknown){
 const s=z.string().datetime({offset:true}).parse(value),fraction=(s.match(/\.(\d+)/)?.[1]??'').padEnd(6,'0');
 if(fraction.length>6)denyAttestation();return new Date(s).toISOString().slice(0,19)+'.'+fraction+'Z';
}

// Static identifiers only. No raw/unsafe SQL and no application-supplied table names.
// This CTE includes the original roots and bounded immutable histories, never a
// writable projection blob. Secret-bearing api_keys are deliberately not selected.
// Reconstruct only the original head's exact public row from immutable roots /
// revision-one history. Its original automatic receipt must still match this
// full-row digest. This is historical evidence, never the current writable head.
export const consumedAttemptHead=Prisma.sql`jsonb_build_object('workspace_id',a.workspace_id,'host_id',a.host_id,
 'attempt_id',a.id,'history_id',h.id,'generation',a.generation,'credential_epoch',a.credential_epoch,
 'revision',h.revision,'record_digest',h.record_digest,'state',h.state)`;
export function attestationObjects(q:AttestationScope,historicalAttemptId?:string){
 const heads=historicalAttemptId?Prisma.sql`SELECT 'worker_bootstrap_heads',a.workspace_id::text||':'||a.host_id::text,${consumedAttemptHead}
 FROM worker_bootstrap_attempts a JOIN scope s ON s.ticket_id=a.ticket_id JOIN worker_bootstrap_history h ON h.attempt_id=a.id
 WHERE a.id=${historicalAttemptId}::uuid AND h.revision=1 AND h.state='consumed'`:
 Prisma.sql`SELECT 'worker_bootstrap_heads',h.workspace_id::text||':'||h.host_id::text,to_jsonb(h) FROM worker_bootstrap_heads h JOIN scope s ON s.workspace_id=h.workspace_id AND s.host_id=h.host_id`;
 return Prisma.sql`WITH scope AS (
 SELECT d.id,d.workspace_id,t.id AS ticket_id,t.host_id,(t.lifecycle_identity->'binding'->>'installationId')::uuid AS installation_id
 FROM decisions d JOIN worker_bootstrap_tickets t ON t.decision_id=d.id WHERE d.id=${q.decisionId}::uuid AND t.id=${q.ticketId}::uuid
), objects AS (
 SELECT 'decisions'::text AS tbl,d.id::text AS rid,to_jsonb(d) AS row FROM decisions d JOIN scope s ON s.id=d.id
 UNION ALL SELECT 'decision_revisions',r.decision_id::text,to_jsonb(r) FROM decision_revisions r JOIN scope s ON s.id=r.decision_id
 UNION ALL SELECT 'decision_acceptances',a.id::text,to_jsonb(a) FROM decision_acceptances a JOIN scope s ON s.id=a.decision_id
 UNION ALL SELECT 'decision_impact_previews',p.id::text,to_jsonb(p) FROM decision_impact_previews p JOIN scope s ON s.id=p.decision_id
 UNION ALL SELECT 'workspaces',w.id::text,to_jsonb(w) FROM workspaces w JOIN scope s ON s.workspace_id=w.id
 UNION ALL SELECT 'workspace_memberships',m.id::text,to_jsonb(m) FROM workspace_memberships m JOIN scope s ON s.workspace_id=m.workspace_id WHERE m.role::text='owner'
 UNION ALL SELECT 'decision_owner_auth_evidence',a.id::text,to_jsonb(a) FROM decision_owner_auth_evidence a JOIN scope s ON s.id=a.decision_id
 UNION ALL SELECT 'decision_attestation_key_history',k.id::text,to_jsonb(k) FROM decision_attestation_key_history k JOIN scope s ON s.workspace_id=k.workspace_id AND s.installation_id=k.installation_id
 UNION ALL SELECT 'decision_attestations',a.id::text,to_jsonb(a) FROM decision_attestations a JOIN scope s ON s.id=a.decision_id
 UNION ALL SELECT 'decision_authority_events',e.id::text,to_jsonb(e) FROM decision_authority_events e JOIN scope s ON s.id=e.decision_id
 UNION ALL SELECT 'worker_bootstrap_tickets',t.id::text||':'||t.host_id::text,to_jsonb(t) FROM worker_bootstrap_tickets t JOIN scope s ON s.ticket_id=t.id
 UNION ALL SELECT 'worker_bootstrap_attempts',a.id::text||':'||a.host_id::text,to_jsonb(a) FROM worker_bootstrap_attempts a JOIN scope s ON s.ticket_id=a.ticket_id
 UNION ALL SELECT 'worker_bootstrap_history',h.id::text,to_jsonb(h) FROM worker_bootstrap_history h JOIN worker_bootstrap_attempts a ON a.id=h.attempt_id JOIN scope s ON s.ticket_id=a.ticket_id
 UNION ALL ${heads}
 UNION ALL SELECT 'worker_bootstrap_audit',a.id::text,to_jsonb(a) FROM worker_bootstrap_audit a JOIN scope s ON s.ticket_id=a.ticket_id
 UNION ALL SELECT 'worker_bootstrap_lifecycle_events',e.id::text,to_jsonb(e) FROM worker_bootstrap_lifecycle_events e JOIN scope s ON s.ticket_id=e.ticket_id
 UNION ALL SELECT 'worker_transport_bootstrap_grants',g.id::text,to_jsonb(g) FROM worker_transport_bootstrap_grants g JOIN scope s ON s.ticket_id=g.ticket_id
)`;}

// Every row has an exact automatic receipt AND protected Event. Application
// timestamps, booleans or caller-supplied digests cannot replace these joins.
export const exactReceipt=Prisma.sql`r.row_digest=bootstrap_lifecycle_digest(o.row)
 AND r.fence_revision>0 AND r.fence_revision<=f.revision
 AND e.type='decision.attestation.write' AND e.source='roost' AND e.actor_type::text='system'
 AND e.workspace_id IS NOT DISTINCT FROM r.workspace_id AND e.resource_type=r.table_name AND e.resource_id=r.row_id
 AND e.payload=jsonb_build_object('table',r.table_name,'rowId',r.row_id,'operation',r.operation,'rowDigest',r.row_digest,
 'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false)`;

const objectRow=z.object({table:z.string(),rowId:z.string(),row:z.record(z.unknown()),digest:sqlHash,
 receiptId:z.string().uuid(),eventId:z.string().uuid(),fence:positiveText,writerXid:positiveText,verified:z.literal(true)}).strict();
export async function readAttestationObjects(db:AttestationDb,q:AttestationScope){
 const rows=await db.$queryRaw<unknown[]>(Prisma.sql`${attestationObjects(q)}
 SELECT o.tbl AS "table",o.rid AS "rowId",o.row,bootstrap_lifecycle_digest(o.row) AS digest,
 r.id AS "receiptId",r.event_id AS "eventId",r.fence_revision::text AS fence,r.writer_xid AS "writerXid",(${exactReceipt}) AS verified
 FROM objects o CROSS JOIN ready_source_fence f LEFT JOIN LATERAL (
 SELECT * FROM decision_attestation_write_receipts r WHERE r.table_name=o.tbl AND r.row_id=o.rid
 AND r.row_digest=bootstrap_lifecycle_digest(o.row) ORDER BY r.fence_revision DESC LIMIT 1) r ON true
 LEFT JOIN events e ON e.id=r.event_id WHERE f.id=1 ORDER BY o.tbl,o.rid LIMIT 4001`);
 const result=z.array(objectRow).min(1).max(4000).parse(rows);
 if(new Set(result.map(r=>`${r.table}:${r.rowId}`)).size!==result.length)denyAttestation();
 return result;
}
export type AttestationObjects=Awaited<ReturnType<typeof readAttestationObjects>>;

export const sqlMutationReceipt=z.object({operationId:z.string().uuid(),decisionId:z.string().uuid(),ticketId:z.string().uuid(),
 mutationDigest:sqlHash,rowsDigest:sqlHash,authorityRevision:positiveText,fence:positiveText,
 writerXid:positiveText,recordedAt:z.string().datetime({precision:6})}).strict();
export type SqlMutationReceipt=z.infer<typeof sqlMutationReceipt>;
const operationReceiptRow=z.object({table:z.string(),rowId:z.string(),digest:sqlHash,fence:positiveText,
 receiptId:z.string().uuid(),eventId:z.string().uuid(),writerXid:positiveText,verified:z.literal(true)}).strict();
export async function readAttestationOperation(db:AttestationDb,q:AttestationScope,operationId:string){
 return readOperation(db,q,operationId,false);
}
// Historical receipt reconstruction is not current seal/admission authority.
// Later lifecycle children belong to other committed operations; their absence
// from the original operation's receipt set is not damage to that receipt set.
// The dispatch reader additionally requires its exact stored rowsDigest and
// exact consumed head/lifecycle receipts. Current authority keeps strict mode.
export async function readHistoricalAttestationOperation(db:AttestationDb,q:AttestationScope,operationId:string){
 return readOperation(db,q,operationId,true);
}
async function readOperation(db:AttestationDb,q:AttestationScope,operationId:string,historical:boolean){
 z.string().uuid().parse(operationId);attestationScope.parse(q);
 const rows=await db.$queryRaw<any[]>(Prisma.sql`${attestationObjects(q,historical?operationId:undefined)}, operation AS (
 SELECT o.*,COALESCE(o.row->>'mutation_digest',o.row->>'attestation_mutation_digest') AS mutation,
 COALESCE(o.row->>'writer_xid',(SELECT r.writer_xid FROM decision_attestation_write_receipts r
 WHERE r.table_name=o.tbl AND r.row_id=o.rid AND r.operation='INSERT' LIMIT 1)) AS xid
 FROM objects o WHERE o.row->>'id'=${operationId} AND o.tbl IN ('decision_owner_auth_evidence','decision_attestation_key_history',
 'decision_attestations','decision_authority_events','worker_bootstrap_attempts')
), receipts AS (
 SELECT r.*,(${exactReceipt}) AS verified FROM operation op JOIN decision_attestation_write_receipts r ON r.writer_xid=op.xid
 JOIN objects o ON o.tbl=r.table_name AND o.rid=r.row_id CROSS JOIN ready_source_fence f LEFT JOIN events e ON e.id=r.event_id WHERE f.id=1
)
 SELECT op.mutation AS "mutationDigest",op.xid AS "writerXid",op.tbl AS "operationTable",op.row AS "operationRow",
 (SELECT count(*)::int FROM operation) AS "operationCount",
 NOT EXISTS(SELECT 1 FROM objects o WHERE (o.row->>'writer_xid'=op.xid OR o.row->>'id'=${operationId}
 OR NOT ${historical}::boolean AND op.tbl='worker_bootstrap_attempts' AND (o.row->>'attempt_id'=${operationId} OR o.tbl='worker_bootstrap_audit' AND o.row->>'history_id' IN (
 SELECT h.row->>'id' FROM objects h WHERE h.tbl='worker_bootstrap_history' AND h.row->>'attempt_id'=${operationId})))
 AND NOT EXISTS(SELECT 1 FROM receipts r WHERE r.table_name=o.tbl AND r.row_id=o.rid)) AS complete,
 COALESCE((SELECT max(revision) FROM decision_authority_events WHERE decision_id=${q.decisionId}::uuid AND fence_revision<=(SELECT max(fence_revision) FROM receipts)),0)::text AS "authorityRevision",
 (SELECT max(fence_revision)::text FROM receipts) AS fence,
 to_char((SELECT max(e.updated_at) FROM receipts r JOIN events e ON e.id=r.event_id) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "recordedAt",
 (SELECT jsonb_agg(jsonb_build_object('table',r.table_name,'rowId',r.row_id,'digest',r.row_digest,'fence',r.fence_revision::text,
 'receiptId',r.id,'eventId',r.event_id,'writerXid',r.writer_xid,'verified',r.verified) ORDER BY r.table_name,r.row_id,r.id) FROM receipts r) AS receipts
 FROM operation op`);
 const r=one(rows),receipts=z.array(operationReceiptRow).min(1).max(4000).parse(r.receipts);
 if(r.operationCount!==1||r.complete!==true||new Set(receipts.map(r=>r.receiptId)).size!==receipts.length||new Set(receipts.map(r=>r.eventId)).size!==receipts.length||
  receipts.some(x=>x.writerXid!==r.writerXid)||!receipts.some(x=>x.table===r.operationTable&&x.rowId.split(':')[0]===operationId))denyAttestation();
 return {receipt:sqlMutationReceipt.parse({operationId,...q,mutationDigest:r.mutationDigest,writerXid:r.writerXid,
  rowsDigest:reviewDigest({domain:'owner-decision-sql-operation-rows-v1',receipts}),authorityRevision:r.authorityRevision,fence:r.fence,recordedAt:r.recordedAt}),
  operationTable:r.operationTable as string,operationRow:r.operationRow as Record<string,any>,receipts};
}
