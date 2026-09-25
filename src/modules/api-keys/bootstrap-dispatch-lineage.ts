import {z} from 'zod';
import {Prisma} from '@prisma/client';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {bootstrapBinding} from './worker-bootstrap-contract';
import {persistedBootstrapAttempt,bootstrapAttemptState} from './worker-bootstrap-persistence-contract';
import {lifecycleEvent} from './bootstrap-ticket-lifecycle-contract';
import {readHistoricalAttestationOperation,consumedAttemptHead,sqlMutationReceipt,sqlHash,positiveText,exact,one,type AttestationDb as Db} from './decision-attestation-sql';

const id=z.string().uuid(),revision=z.number().int().positive().max(2147483646);
const sourceReceipt=z.object({id,eventId:id,rowDigest:sqlHash,writerXid:positiveText,fence:positiveText}).strict();
export const dispatchAnchor=z.object({version:z.literal('bootstrap-dispatch-anchor-v1'),attemptId:id,ticketId:id,decisionId:id,
 sealDigest:sqlHash,sealReceipt:sqlMutationReceipt,ticketEnvelopeDigest:sqlHash,
 ticketHead:z.object({id,revision,digest:sqlHash,state:z.literal('consumed'),historyId:id,receipt:sourceReceipt}).strict(),
 attemptHead:z.object({historyId:id,revision:z.literal(1),digest:sqlHash,state:z.literal('consumed'),receipt:sourceReceipt}).strict()}).strict();
export const dispatchReceiptLink=z.object({operationId:id,eventId:id,recordDigest:sqlHash,requestDigest:sqlHash,
 rowDigest:sqlHash,writerXid:positiveText,fence:positiveText}).strict();
export const dispatchLineage=z.object({version:z.literal('bootstrap-dispatch-lineage-v1'),anchor:dispatchAnchor,
 previous:dispatchReceiptLink.nullable()}).strict();
export type DispatchAnchor=z.infer<typeof dispatchAnchor>;
export type DispatchLineage=z.infer<typeof dispatchLineage>;
export type DispatchReceiptLink=z.infer<typeof dispatchReceiptLink>;
const deny=():never=>{throw Error('bootstrap_dispatch_history_integrity_failed');};

// Historical anchor verification never needs current decision authority and
// never writes. Exact native seal-operation receipts prove both consumed heads.
// A changed owner/policy can therefore invalidate authority without erasing
// independently verifiable history. Missing/replaced root receipts still deny.
export async function readDispatchAnchor(db:Db,q:{attemptId:string;ticketId:string;decisionId:string;binding:z.infer<typeof bootstrapBinding>}){
 const operation=await readHistoricalAttestationOperation(db,{decisionId:q.decisionId,ticketId:q.ticketId},q.attemptId);
 const root=operation.operationRow,record=persistedBootstrapAttempt.parse(root.record);
 if(operation.operationTable!=='worker_bootstrap_attempts'||root.id!==q.attemptId||record.id!==q.attemptId||record.ticketId!==q.ticketId||
  record.decisionId!==q.decisionId||!exact(record.binding,q.binding)||root.attestation_seal?.attemptId!==q.attemptId||
  root.attestation_seal?.bindings?.ticketEnvelopeDigest!==record.ticketDigest)deny();
 const row=one(await db.$queryRaw<any[]>(Prisma.sql`SELECT ${consumedAttemptHead} AS "attemptHead",to_jsonb(l) AS "ticketRow"
 FROM worker_bootstrap_attempts a JOIN worker_bootstrap_history h ON h.attempt_id=a.id AND h.revision=1 AND h.state='consumed'
 JOIN LATERAL (SELECT * FROM worker_bootstrap_lifecycle_events WHERE ticket_id=a.ticket_id
 AND attempt_id=a.id AND history_id=h.id AND record->>'action'='consume' AND record->>'state'='consumed') l ON true
 WHERE a.id=${q.attemptId}::uuid AND a.ticket_id=${q.ticketId}::uuid AND a.record->>'decisionId'=${q.decisionId}`));
 const h=row.attemptHead,t=row.ticketRow,head=lifecycleEvent.parse(t.record);
 const receipt=(table:string,rowId:string,raw:unknown)=>{
  const r=one(operation.receipts.filter(r=>r.table===table&&r.rowId===rowId));
  if(r.digest!==reviewDigest(raw)||r.writerXid!==operation.receipt.writerXid)deny();
  return sourceReceipt.parse({id:r.receiptId,eventId:r.eventId,rowDigest:r.digest,writerXid:r.writerXid,fence:r.fence});
 };
 if(h.state!=='consumed'||h.revision!==1||h.attempt_id!==q.attemptId||head.state!=='consumed'||head.attemptId!==q.attemptId||
  head.ticketId!==q.ticketId||head.historyId!==h.history_id||head.revoked||head.expired||head.reconciled||t.record_digest!==reviewDigest(head))deny();
 return freezePublic(dispatchAnchor.parse({version:'bootstrap-dispatch-anchor-v1',attemptId:q.attemptId,ticketId:q.ticketId,decisionId:q.decisionId,
  sealDigest:reviewDigest(root.attestation_seal),sealReceipt:operation.receipt,ticketEnvelopeDigest:record.ticketDigest,
  ticketHead:{id:head.id,revision:head.revision,digest:reviewDigest(head),state:head.state,historyId:head.historyId,
   receipt:receipt('worker_bootstrap_lifecycle_events',head.id,t)},
  attemptHead:{historyId:h.history_id,revision:h.revision,digest:h.record_digest,state:h.state,
   receipt:receipt('worker_bootstrap_heads',`${q.binding.workspaceId}:${q.binding.hostId}`,h)}}));
}

export function linkDispatchReceipt(entry:{record:{operationId:string};recordDigest:string;requestDigest:string;rowDigest:string;writerXid:string;fence:string;eventId:string}){
 return freezePublic(dispatchReceiptLink.parse({operationId:entry.record.operationId,eventId:entry.eventId,recordDigest:entry.recordDigest,
  requestDigest:entry.requestDigest,rowDigest:entry.rowDigest,writerXid:entry.writerXid,fence:entry.fence}));
}

// Current ticket status is an audited fact, not a claim of current authority.
// In particular a revoked ticket must not be displayed as the consumed anchor.
export async function readDispatchTicketStatus(db:Db,ticketId:string){
 const row=one(await db.$queryRaw<any[]>`SELECT l.record AS "currentTicket",l.record_digest AS digest,
 r.id,r.event_id AS "eventId",r.row_digest AS "rowDigest",r.writer_xid AS "writerXid",r.fence_revision::text AS fence,
 (r.row_digest=bootstrap_lifecycle_digest(to_jsonb(l)) AND r.writer_xid=l.writer_xid AND r.fence_revision<=f.revision
 AND e.type='decision.attestation.write' AND e.source='roost' AND e.actor_type::text='system'
 AND e.workspace_id IS NOT DISTINCT FROM r.workspace_id AND e.resource_type=r.table_name AND e.resource_id=r.row_id
 AND e.payload=jsonb_build_object('table',r.table_name,'rowId',r.row_id,'operation',r.operation,'rowDigest',r.row_digest,
 'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false)) AS verified
 FROM (SELECT * FROM worker_bootstrap_lifecycle_events WHERE ticket_id=${ticketId}::uuid ORDER BY revision DESC LIMIT 1) l
 CROSS JOIN ready_source_fence f LEFT JOIN decision_attestation_write_receipts r ON r.table_name='worker_bootstrap_lifecycle_events' AND r.row_id=l.id::text
 LEFT JOIN events e ON e.id=r.event_id WHERE f.id=1`);
 const record=lifecycleEvent.parse(row.currentTicket);
 if(row.verified!==true||record.ticketId!==ticketId||reviewDigest(record)!==row.digest)deny();
 return freezePublic({record,digest:row.digest as string,receipt:sourceReceipt.parse({id:row.id,eventId:row.eventId,
  rowDigest:row.rowDigest,writerXid:row.writerXid,fence:row.fence})});
}

export async function readDispatchAttemptStatus(db:Db,attemptId:string){
 const row=one(await db.$queryRaw<any[]>`SELECT to_jsonb(h) AS "currentAttempt",
 r.id,r.event_id AS "eventId",r.row_digest AS "rowDigest",r.writer_xid AS "writerXid",r.fence_revision::text AS fence,
 (r.row_digest=bootstrap_lifecycle_digest(to_jsonb(h)) AND r.fence_revision<=f.revision
 AND e.type='decision.attestation.write' AND e.source='roost' AND e.actor_type::text='system'
 AND e.workspace_id IS NOT DISTINCT FROM r.workspace_id AND e.resource_type=r.table_name AND e.resource_id=r.row_id
 AND e.payload=jsonb_build_object('table',r.table_name,'rowId',r.row_id,'operation',r.operation,'rowDigest',r.row_digest,
 'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false)) AS verified
 FROM worker_bootstrap_heads h CROSS JOIN ready_source_fence f
 LEFT JOIN decision_attestation_write_receipts r ON r.table_name='worker_bootstrap_heads'
 AND r.row_id=h.workspace_id::text||':'||h.host_id::text AND r.row_digest=bootstrap_lifecycle_digest(to_jsonb(h))
 LEFT JOIN events e ON e.id=r.event_id WHERE h.attempt_id=${attemptId}::uuid AND f.id=1`);
 const h=row.currentAttempt;if(row.verified!==true||h.attempt_id!==attemptId)deny();
 return freezePublic({historyId:id.parse(h.history_id),revision:revision.parse(h.revision),digest:sqlHash.parse(h.record_digest),
  state:bootstrapAttemptState.parse(h.state),receipt:sourceReceipt.parse({id:row.id,eventId:row.eventId,rowDigest:row.rowDigest,writerXid:row.writerXid,fence:row.fence})});
}

// This atom admits only unchanged signed-source epochs. Child dispatch writes
// have their own complete receipt chain at the seal's committed fence; any
// intervening source epoch is explicitly drift, never an inferred own write.
export function classifyDispatchFence(anchor:DispatchAnchor,currentFence:string){
 positiveText.parse(currentFence);const from=BigInt(anchor.sealReceipt.fence),through=BigInt(currentFence);
 return freezePublic({from:anchor.sealReceipt.fence,through:currentFence,
  status:through===from?'exact_seal_epoch' as const:through>from?'foreign_source_epoch' as const:'fence_regression' as const,
  complete:through===from,ownSourceEpochs:0 as const});
}
