import type {Prisma} from '@prisma/client';
import {z} from 'zod';
import {channelTransition,channelEqual,denyChannel,type ChannelTransition} from './bootstrap-channel-persistence-contract';
import {requireDecisionAttestationGuards} from './decision-attestation-adapter';

type Db=Prisma.TransactionClient;
const id=z.string().uuid(),count=z.string().regex(/^[1-9][0-9]*$/).max(20),hash=z.string().regex(/^[a-f0-9]{64}$/);
export const channelRevokeWitness=z.object({writerXid:count,fromFence:count,toFence:count}).strict();
export type ChannelRevokeWitness=z.infer<typeof channelRevokeWitness>;
const nativeReceipt=z.object({table:z.string(),rowId:z.string(),generationId:id,writerXid:count,fence:count,digest:hash,verified:z.literal(true)}).strict();
const baseSchema=z.object({operation:channelTransition,workspaceId:id,hostId:id,generationId:id,ticketId:id,writerXid:count,
 currentFence:count,receipts:z.array(nativeReceipt).length(3),verified:z.literal(true)}).strict();
const authority=z.object({decisionId:id,sourceTable:z.string(),sourceRow:z.string(),sourceDigest:hash,fence:count}).strict();
const object=z.object({table:z.string(),rowId:z.string(),digest:hash,operation:z.enum(['INSERT','UPDATE']),authority:authority.nullable()}).strict();
const receipt=z.object({id,eventId:id,table:z.string(),rowId:z.string(),digest:hash,operation:z.string(),workspaceId:id,
 writerXid:count,fence:count,verified:z.literal(true)}).strict();
const lineageSchema=z.object({decisions:z.array(id).min(1).max(1000),objects:z.array(object).min(4).max(2002),
 receipts:z.array(receipt).min(4).max(2002)}).strict();
function one<T>(rows:T[]):T{if(rows.length!==1)denyChannel();return rows[0];}
const unique=(values:string[])=>new Set(values).size===values.length;
const key=(r:{table:string;rowId:string})=>`${r.table}:${r.rowId}`;

// Reconstruct the pinned trigger order, never replace an expected fence with
// the current one. Distinct native/source receipts may share an epoch; repeated
// receipts for the same object, missing epochs and foreign writers may not.
// Revoke always updates an existing head via INSERT ... ON CONFLICT UPDATE:
// history BEFORE ROW, speculative head INSERT and head UPDATE are three epochs.
export function validateChannelRevocationEvidence(input:unknown,baseInput:unknown,lineageInput?:unknown,expected?:ChannelRevokeWitness){
 const r=channelTransition.parse(input),b=baseSchema.parse(baseInput);
 if(r.action!=='revoke'||r.state!=='revoked'||!channelEqual(r,b.operation))denyChannel();
 const named=new Map(b.receipts.map(p=>[p.table,p]));
 const h=named.get('worker_transport_history'),head=named.get('worker_transport_heads'),audit=named.get('worker_transport_audit');
 if(!h||!head||!audit||h.rowId!==r.id||audit.rowId!==r.id||head.rowId!==`${b.workspaceId}:${b.hostId}`||
  b.receipts.some(p=>p.writerXid!==b.writerXid||p.generationId!==b.generationId)||h.fence!==audit.fence)denyChannel();
 const headFence=BigInt(head!.fence),historyFence=BigInt(h!.fence),through=BigInt(b.currentFence),from=headFence-3n;
 if(from<1n||historyFence<headFence+1n||through<historyFence)denyChannel();
 if(expected){const e=channelRevokeWitness.parse(expected);if(e.writerXid!==b.writerXid||BigInt(e.fromFence)!==from||e.toFence!==b.currentFence)denyChannel();}
 if(lineageInput===undefined){if(historyFence!==headFence+1n||through!==historyFence)denyChannel();}
 else{
  const l=lineageSchema.parse(lineageInput),n=BigInt(l.decisions.length),objects=new Map(l.objects.map(o=>[key(o),o]));
  if(!unique(l.decisions)||objects.size!==l.objects.length||!unique(l.receipts.map(p=>p.id))||!unique(l.receipts.map(p=>p.eventId))||
   !unique(l.receipts.map(key))||l.receipts.length!==l.objects.length||l.objects.length!==2+2*l.decisions.length||
   historyFence!==headFence+n+1n||through!==historyFence+n)denyChannel();
  const phases=[{table:'worker_transport_heads',rowId:`${b.workspaceId}:${b.hostId}`,fence:headFence,operation:'UPDATE'},
   {table:'worker_transport_history',rowId:`${r.id}:${b.hostId}`,fence:historyFence,operation:'INSERT'}];
  for(const phase of phases){const source=objects.get(key(phase));
   if(!source||source.authority!==null||source.operation!==phase.operation)denyChannel();
   const p=l.receipts.find(p=>key(p)===key(phase));if(!p||BigInt(p.fence)!==phase.fence)denyChannel();
   const children=l.objects.filter(o=>o.authority?.sourceTable===phase.table&&o.authority.sourceRow===phase.rowId);
   if(children.length!==l.decisions.length||!unique(children.map(o=>o.authority!.decisionId))||
    children.some(o=>o.table!=='decision_authority_events'||o.operation!=='INSERT'||!l.decisions.includes(o.authority!.decisionId)||o.authority!.sourceDigest!==source!.digest))denyChannel();
   const epochs=children.map(o=>BigInt(o.authority!.fence)).sort((a,b)=>a<b?-1:a>b?1:0);
   if(epochs.some((f,i)=>f!==phase.fence+BigInt(i)+1n))denyChannel();
  }
  for(const p of l.receipts){const o=objects.get(key(p));
   if(!o||p.writerXid!==b.writerXid||p.workspaceId!==b.workspaceId||p.digest!==o.digest||p.operation!==o.operation||
    BigInt(p.fence)<=from||BigInt(p.fence)>through||o.authority&&o.authority.fence!==p.fence)denyChannel();}
 }
 return {record:r,witness:{writerXid:b.writerXid,fromFence:String(from),toFence:b.currentFence}};
}

// Legacy-compatible SQL: no migration-82/83 relation or helper is referenced.
// Every automatic native receipt is matched to the exact current full row.
export async function readChannelRevocationBase(db:Db,r:ChannelTransition){
 const rows=await db.$queryRaw<any[]>`WITH target AS (SELECT * FROM worker_transport_history WHERE id=${r.id}::uuid),
 objects(tbl,rid,row) AS (
  SELECT 'worker_transport_history',h.id::text,to_jsonb(h) FROM target h
  UNION ALL SELECT 'worker_transport_heads',x.workspace_id::text||':'||x.host_id::text,to_jsonb(x) FROM worker_transport_heads x JOIN target h ON x.history_id=h.id
  UNION ALL SELECT 'worker_transport_audit',x.history_id::text,to_jsonb(x) FROM worker_transport_audit x JOIN target h ON x.history_id=h.id
 ), checks AS (
  SELECT w.*,COALESCE(o.tbl IS NOT NULL AND w.generation_id=h.generation_id AND w.row_digest=encode(sha256(convert_to(o.row::text,'UTF8')),'hex'),false) AS verified
  FROM target h JOIN worker_transport_write_audit w ON w.writer_xid=h.writer_xid
   OR w.fence_revision>(SELECT min(p.fence_revision)-3 FROM worker_transport_write_audit p
    WHERE p.writer_xid=h.writer_xid AND p.table_name='worker_transport_heads' AND p.row_id=h.workspace_id::text||':'||h.host_id::text)
    AND w.fence_revision<=(SELECT revision FROM ready_source_fence WHERE id=1)
  LEFT JOIN objects o ON o.tbl=w.table_name AND o.rid=w.row_id
 ) SELECT jsonb_build_object('operation',h.record,'workspaceId',h.workspace_id,'hostId',h.host_id,'generationId',h.generation_id,
  'ticketId',g.ticket_id,'writerXid',h.writer_xid,'currentFence',f.revision::text,
  'receipts',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',table_name,'rowId',row_id,'generationId',generation_id,
   'writerXid',writer_xid,'fence',fence_revision::text,'digest',row_digest,'verified',verified)),'[]'::jsonb) FROM checks),
  'verified',COALESCE(current_setting('transaction_isolation')='repeatable read' AND current_setting('transaction_read_only')='on'
   AND current_setting('session_replication_role')='origin' AND h.record=${JSON.stringify(r)}::jsonb AND h.state='revoked' AND h.record->>'action'='revoke'
   AND h.record->>'id'=h.id::text AND (h.record->>'revision')::int=h.revision AND h.record->>'state'=h.state
   AND h.record_digest=encode(sha256(convert_to(h.record::text,'UTF8')),'hex') AND a.record_digest=h.record_digest
   AND h.signature IS NULL AND h.decision_id IS NULL AND h.request_id=h.id
   AND head.workspace_id=h.workspace_id AND head.host_id=h.host_id AND head.revision=h.revision AND head.record_digest=h.record_digest
   AND head.certificate_epoch=h.certificate_epoch AND head.high_water_epoch=h.high_water_epoch AND head.state=h.state AND head.purpose=h.purpose
   AND prev.revision=h.previous_revision AND prev.revision+1=h.revision AND prev.record_digest=h.previous_digest AND prev.high_water_epoch=h.previous_high_water
   AND prev.state=h.previous_state AND prev.state='current' AND prev.generation_id=h.previous_generation_id AND prev.generation_id=h.generation_id
   AND prev.workspace_id=h.workspace_id AND prev.host_id=h.host_id AND prev.purpose=h.purpose
   AND prev.record->>'grantId'=g.id::text AND prev.record->>'action' IN ('grant','consume')
   AND g.record->>'id'=g.id::text AND g.record_digest=encode(sha256(convert_to(g.record::text,'UTF8')),'hex')
   AND g.record->'intent'->>'ticketId'=g.ticket_id::text AND g.generation_id=h.generation_id AND g.purpose=h.purpose
   AND g.record->'intent'->'snapshot'->>'generation'=h.generation_id::text AND g.record->'intent'->'snapshot'->>'purpose'=h.purpose
   AND h.owner_id::text=g.record->>'ownerId' AND h.current_pin=g.record->'intent'->'snapshot'->>'leafPin' AND h.staged_pin IS NULL
   AND h.certificate_epoch=(g.record->'intent'->'snapshot'->>'certificateEpoch')::int AND h.high_water_epoch=h.certificate_epoch
   AND gen.workspace_id=h.workspace_id AND gen.host_id=h.host_id AND gen.credential_id IS NULL AND gen.purpose=h.purpose
   AND gen.installation_id::text=g.record->'intent'->'snapshot'->'binding'->>'installationId'
   AND gen.workspace_id::text=g.record->'intent'->'snapshot'->'binding'->>'workspaceId'
   AND gen.host_id::text=g.record->'intent'->'snapshot'->'binding'->>'hostId'
   AND gen.identity=jsonb_build_object('binding',g.record->'intent'->'snapshot'->'binding','hostGeneration',g.record->'intent'->'snapshot'->'hostGeneration',
    'installationGeneration',g.record->'intent'->'snapshot'->'installationGeneration')
   AND (SELECT count(*) FROM worker_transport_write_audit w WHERE w.table_name='worker_transport_generations' AND w.row_id=gen.id::text
    AND w.generation_id=gen.id AND w.row_digest=encode(sha256(convert_to(to_jsonb(gen)::text,'UTF8')),'hex'))=1
   AND (SELECT count(*) FROM worker_transport_write_audit w WHERE w.table_name='worker_transport_bootstrap_grants' AND w.row_id=g.id::text
    AND w.generation_id=gen.id AND w.row_digest=encode(sha256(convert_to(to_jsonb(g)::text,'UTF8')),'hex'))=1
   AND (SELECT count(*) FROM worker_transport_write_audit w WHERE w.table_name='worker_transport_history' AND w.row_id=prev.id::text
    AND w.writer_xid=prev.writer_xid AND w.row_digest=encode(sha256(convert_to(to_jsonb(prev)::text,'UTF8')),'hex'))=1
   AND e.workspace_id=h.workspace_id AND e.type='worker.bootstrap_channel' AND e.source='roost' AND e.actor_type::text='user'
   AND e.actor_id=h.owner_id::text AND e.resource_type='worker_transport' AND e.resource_id=h.id::text
   AND e.payload=jsonb_build_object('revision',h.revision,'state',h.state,'launchAuthority',false),false)) AS channel_revoke_base
 FROM target h JOIN worker_transport_audit a ON a.history_id=h.id JOIN events e ON e.id=a.event_id
 JOIN worker_transport_heads head ON head.history_id=h.id JOIN worker_transport_generations gen ON gen.id=h.generation_id
 JOIN worker_transport_bootstrap_grants g ON g.id=(h.record->>'grantId')::uuid
 JOIN worker_transport_history prev ON prev.id=(h.record->>'previousId')::uuid CROSS JOIN ready_source_fence f WHERE f.id=1`;
 return baseSchema.parse(one(rows).channel_revoke_base);
}

export async function readChannelRevocation(db:Db,input:unknown,expected?:ChannelRevokeWitness){
 const r=channelTransition.parse(input);if(r.action!=='revoke'||r.state!=='revoked')denyChannel();
 const base=await readChannelRevocationBase(db,r),head=base.receipts.find(p=>p.table==='worker_transport_heads'),history=base.receipts.find(p=>p.table==='worker_transport_history');
 if(!head||!history)denyChannel();
 // Preserve the old exact-catalog path without requiring migration 83.
 if(BigInt(history!.fence)===BigInt(head!.fence)+1n&&history!.fence===base.currentFence)
  return validateChannelRevocationEvidence(r,base,undefined,expected);
 await requireDecisionAttestationGuards(db);
 const from=String(BigInt(head!.fence)-3n);
 const rows=await db.$queryRaw<any[]>`WITH target AS (SELECT * FROM worker_transport_history WHERE id=${r.id}::uuid),
 source_objects(tbl,rid,row,operation) AS (
  SELECT 'worker_transport_history',h.id::text||':'||h.host_id::text,to_jsonb(h),'INSERT' FROM target h
  UNION ALL SELECT 'worker_transport_heads',x.workspace_id::text||':'||x.host_id::text,to_jsonb(x),'UPDATE' FROM worker_transport_heads x JOIN target h ON x.history_id=h.id
 ), objects(tbl,rid,row,operation,authority) AS (
  SELECT tbl,rid,row,operation,NULL::jsonb FROM source_objects
  UNION ALL SELECT 'decision_authority_events',d.id::text,to_jsonb(d),'INSERT',jsonb_build_object('decisionId',d.decision_id,
   'sourceTable',d.source_table,'sourceRow',d.source_row,'sourceDigest',d.source_digest,'fence',d.fence_revision::text)
  FROM decision_authority_events d JOIN target h ON d.writer_xid=h.writer_xid
 ), checks AS (
  SELECT p.*,COALESCE(o.tbl IS NOT NULL AND p.row_digest=bootstrap_lifecycle_digest(o.row) AND p.operation=o.operation
   AND e.workspace_id=p.workspace_id AND e.type='decision.attestation.write' AND e.source='roost' AND e.actor_type::text='system' AND e.actor_id IS NULL
   AND e.resource_type=p.table_name AND e.resource_id=p.row_id
   AND e.payload=jsonb_build_object('table',p.table_name,'rowId',p.row_id,'operation',p.operation,'rowDigest',p.row_digest,
    'fence',p.fence_revision::text,'writerXid',p.writer_xid,'launchAuthority',false)
   AND (o.authority IS NULL OR (o.row->>'action'='source_change' AND o.row->>'writer_xid'=p.writer_xid AND o.row->>'workspace_id'=p.workspace_id::text
    AND o.row->'mutation_digest'='null'::jsonb
    AND o.row->>'record_digest'=decision_attestation_digest('owner-decision-authority-event-v1',o.row-'record_digest')
    AND EXISTS(SELECT 1 FROM decision_authority_events prior WHERE prior.decision_id=(o.row->>'decision_id')::uuid
     AND prior.revision=(o.row->>'revision')::bigint-1 AND prior.record_digest=o.row->>'previous_digest'
     AND prior.workspace_id=p.workspace_id AND prior.fence_revision<(o.row->>'fence_revision')::bigint
     AND (o.row->>'source_table'='worker_transport_heads' AND prior.fence_revision<=${from}::bigint
      OR o.row->>'source_table'='worker_transport_history' AND prior.writer_xid=h.writer_xid
       AND prior.action='source_change' AND prior.source_table='worker_transport_heads'
       AND prior.source_row=h.workspace_id::text||':'||h.host_id::text)
     AND prior.record_digest=decision_attestation_digest('owner-decision-authority-event-v1',to_jsonb(prior)-'record_digest')))),false) AS verified
  FROM decision_attestation_write_receipts p CROSS JOIN target h LEFT JOIN objects o ON o.tbl=p.table_name AND o.rid=p.row_id
  LEFT JOIN events e ON e.id=p.event_id WHERE p.writer_xid=h.writer_xid OR p.fence_revision>${from}::bigint AND p.fence_revision<=${base.currentFence}::bigint
 ) SELECT jsonb_build_object('decisions',(SELECT coalesce(jsonb_agg(d.id ORDER BY d.id),'[]'::jsonb) FROM decisions d JOIN target h ON d.workspace_id=h.workspace_id WHERE d.authority_revision=1),
  'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',tbl,'rowId',rid,'digest',bootstrap_lifecycle_digest(row),'operation',operation,'authority',authority)),'[]'::jsonb) FROM objects),
  'receipts',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'eventId',event_id,'table',table_name,'rowId',row_id,'digest',row_digest,'operation',operation,
   'workspaceId',workspace_id,'writerXid',writer_xid,'fence',fence_revision::text,'verified',verified)),'[]'::jsonb) FROM checks)) AS channel_revoke_lineage`;
 return validateChannelRevocationEvidence(r,base,one(rows).channel_revoke_lineage,expected);
}
