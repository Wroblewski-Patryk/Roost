import {randomUUID} from 'node:crypto';
import type {Prisma,PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {persistedBootstrapAttempt,persistedBootstrapHistory,signedBootstrapPeer,signedBootstrapCompletion} from './worker-bootstrap-persistence-contract';
import {ticketGuards,ticketHelpers,ticketChannelHelper} from './bootstrap-ticket-lifecycle-guards';
import type {BootstrapV2ChannelBinding} from './bootstrap-channel-store';
import {verifyTicketV2,type TicketV2SignatureVerifier} from './bootstrap-ticket-v2-verification';
import {lifecycleId as id,lifecycleHash as hash,lifecycleIdentity,lifecycleRegistration,lifecycleEvent,lifecycleEqual as same,
 advanceTicketLifecycle,denyLifecycle as deny,lifecycleFlags,lifecycleActions,type TicketLifecycleEvent} from './bootstrap-ticket-lifecycle-contract';
type Db=Prisma.TransactionClient;
const fenceValue=z.string().regex(/^[1-9][0-9]*$/),input=z.object({ticketId:id}).strict();
const command=z.object({ticketId:id,operationId:id,expectedRevision:z.number().int().positive(),expectedFence:fenceValue,
 action:z.enum(lifecycleActions).exclude(['issue']),evidence:z.object({peer:signedBootstrapPeer.optional(),completion:signedBootstrapCompletion.optional()}).strict().optional()}).strict();
export class TicketLifecycleUnknown extends Error{readonly code='reconciliation_required';readonly retryable=false;constructor(){super('bootstrap_ticket_lifecycle_reconciliation_required');}}

async function guarded(db:Db){
 const available=await db.$queryRaw<any[]>`SELECT to_regclass('public.worker_bootstrap_lifecycle_events') IS NOT NULL AND to_regclass('public.worker_bootstrap_write_receipts') IS NOT NULL AS ticket_lifecycle_available`;
 if(available.length!==1||available[0].ticket_lifecycle_available!==true)deny();
 const rows=await db.$queryRaw<any[]>`SELECT c.relname AS "table",t.tgname AS name,p.proname AS function,t.tgtype::int AS kind,
  encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,t.tgdeferrable AS deferred,
  (t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal
   AND (t.tgconstraint<>0)=t.tgdeferrable AND t.tginitdeferred=t.tgdeferrable AND n.nspname='public' AND pn.nspname='public'
   AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype AND p.prokind='f'
   AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND NOT p.prosecdef AND p.proconfig IS NULL
   AND p.provolatile='v' AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
   AND current_setting('session_replication_role')='origin' AND current_setting('transaction_isolation') IN ('repeatable read','serializable')
   AND EXISTS(SELECT 1 FROM ready_source_fence WHERE id=1)) AS enabled
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE t.tgname=ANY(${ticketGuards.map(g=>g.name)}::text[])`;
 const catalog=new Map(rows.map(({enabled,...r})=>[`${r.table}:${r.name}`,{enabled,record:r}]));
 if(rows.length!==ticketGuards.length||catalog.size!==rows.length||!ticketGuards.every(g=>{
  const actual=catalog.get(`${g.table}:${g.name}`);return actual?.enabled===true&&same(g,actual.record);
 }))deny();
 const expected=[...ticketHelpers,ticketChannelHelper];
 const helpers=await db.$queryRaw<any[]>`SELECT p.proname AS name,p.provolatile::text AS volatility,p.prorettype::regtype::text AS result,
  encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
  (n.nspname='public' AND p.pronargs=1 AND p.proargtypes='3802'::oidvector AND p.prokind='f'
   AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND NOT p.prosecdef AND p.proconfig IS NULL AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u') AS enabled
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname=ANY(${expected.map(h=>h.name)}::text[])`;
 if(helpers.length!==expected.length||!expected.every(h=>helpers.filter(({enabled,...r})=>enabled===true&&same(h,r)).length===1))deny();
}
async function fence(db:Db,write=false){
 const rows=write?await db.$queryRaw<any[]>`SELECT revision::text AS ticket_fence FROM ready_source_fence WHERE id=1 FOR UPDATE`:
  await db.$queryRaw<any[]>`SELECT revision::text AS ticket_fence FROM ready_source_fence WHERE id=1`;
 if(rows.length!==1)deny();return fenceValue.parse(rows[0].ticket_fence);
}
async function root(db:Db,ticketId:string){
 const rows=await db.$queryRaw<any[]>`SELECT lifecycle_identity AS identity,record FROM worker_bootstrap_tickets WHERE id=${ticketId}::uuid`;
 if(rows.length!==1)deny();
 return lifecycleRegistration.parse({operationId:ticketId,identity:rows[0].identity,record:rows[0].record});
}
export async function readCanonicalTicketLifecycle(db:Db,ticketId:string,now:Date){
 await guarded(db);const f=await fence(db),t=await root(db,ticketId),i=t.identity;
 if(i.ticketId!==ticketId)deny();
 // Verify every persisted writer's native receipt and its protected Event. A
 // missing legacy receipt never becomes evidence merely because metadata parses.
 const rows=await db.$queryRaw<any[]>`WITH objects AS (
  SELECT 'worker_bootstrap_tickets' AS tbl,id::text AS rid,to_jsonb(t) AS row FROM worker_bootstrap_tickets t WHERE id=${ticketId}::uuid
  UNION ALL SELECT 'worker_bootstrap_attempts',id::text,to_jsonb(a) FROM worker_bootstrap_attempts a WHERE ticket_id=${ticketId}::uuid
  UNION ALL SELECT 'worker_bootstrap_history',h.id::text,to_jsonb(h) FROM worker_bootstrap_history h JOIN worker_bootstrap_attempts a ON a.id=h.attempt_id WHERE a.ticket_id=${ticketId}::uuid
  UNION ALL SELECT 'worker_bootstrap_heads',h.workspace_id::text||':'||h.host_id::text,to_jsonb(h) FROM worker_bootstrap_heads h JOIN worker_bootstrap_attempts a ON a.id=h.attempt_id WHERE a.ticket_id=${ticketId}::uuid
  UNION ALL SELECT 'worker_bootstrap_audit',id::text,to_jsonb(a) FROM worker_bootstrap_audit a WHERE ticket_id=${ticketId}::uuid
  UNION ALL SELECT 'worker_bootstrap_lifecycle_events',id::text,to_jsonb(e) FROM worker_bootstrap_lifecycle_events e WHERE ticket_id=${ticketId}::uuid
 ), valid AS (SELECT NOT EXISTS(SELECT 1 FROM objects o WHERE NOT EXISTS(
  SELECT 1 FROM worker_bootstrap_write_receipts r JOIN events e ON e.id=r.event_id
  WHERE r.ticket_id=${ticketId}::uuid AND r.table_name=o.tbl AND r.row_id=o.rid AND r.row_digest=encode(sha256(convert_to(o.row::text,'UTF8')),'hex')
   AND e.payload=jsonb_build_object('ticketId',r.ticket_id,'rowDigest',r.row_digest,'fence',r.fence_revision::text,'writerXid',r.writer_xid,'launchAuthority',false)
   AND r.fence_revision>0 AND r.fence_revision<=${f}::bigint)) AS verified)
 SELECT e.record,e.record_digest AS digest,r.fence_revision::text AS fence,
  (v.verified AND e.record_digest=bootstrap_lifecycle_digest(e.record) AND r.writer_xid=e.writer_xid
   AND (e.attempt_id IS NULL OR EXISTS(SELECT 1 FROM worker_bootstrap_attempts a JOIN worker_bootstrap_history h ON h.attempt_id=a.id
    JOIN worker_bootstrap_audit au ON au.history_id=h.id WHERE a.id=e.attempt_id AND a.ticket_id=e.ticket_id AND h.id=e.history_id AND au.record_digest=h.record_digest))) AS verified
 FROM worker_bootstrap_lifecycle_events e CROSS JOIN valid v LEFT JOIN worker_bootstrap_write_receipts r
  ON r.table_name='worker_bootstrap_lifecycle_events' AND r.row_id=e.id::text AND r.writer_xid=e.writer_xid
 WHERE e.ticket_id=${ticketId}::uuid ORDER BY e.revision LIMIT 1001`;
 const history=z.array(z.object({record:lifecycleEvent,digest:hash,fence:fenceValue,verified:z.literal(true)}).strict()).min(1).max(1000).parse(rows);
 let previous:TicketLifecycleEvent|null=null,digest:string|null=null,lastFence=0n;
 for(const h of history){
  if(h.digest!==reviewDigest(h.record)||BigInt(h.fence)<=lastFence||BigInt(h.fence)>BigInt(f)||Date.parse(h.record.at)>now.getTime()||
   !same(h.record,advanceTicketLifecycle(i,previous,digest,{id:h.record.id,action:h.record.action,attemptId:h.record.attemptId,historyId:h.record.historyId},new Date(h.record.at))))deny();
  previous=h.record;digest=h.digest;lastFence=BigInt(h.fence);
 }
 const scope=await db.$queryRaw<any[]>`SELECT max(generation)::int AS generation,max(credential_epoch)::int AS credential,
  bool_and(lifecycle_identity IS NOT NULL) AS complete FROM worker_bootstrap_tickets WHERE workspace_id=${i.binding.workspaceId}::uuid AND host_id=${i.binding.hostId}::uuid`;
 if(scope.length!==1||scope[0].complete!==true||scope[0].generation<i.generation||scope[0].credential<i.credentialEpoch)deny();
 const head=history.at(-1)!.record;
 const ledger=await db.$queryRaw<any[]>`SELECT (
  EXISTS(SELECT 1 FROM worker_bootstrap_audit a JOIN worker_bootstrap_tickets t ON t.id=a.ticket_id
   WHERE t.id=${ticketId}::uuid AND a.history_id IS NULL AND a.record_digest=t.record_digest)
  AND (SELECT count(*) FROM worker_bootstrap_attempts WHERE ticket_id=${ticketId}::uuid)=${head.attemptId?1:0}::int
  AND (${head.attemptId}::uuid IS NULL OR ${scope[0].generation!==i.generation}::boolean OR EXISTS(
   SELECT 1 FROM worker_bootstrap_heads h JOIN worker_bootstrap_attempts a ON a.id=h.attempt_id
   WHERE a.ticket_id=${ticketId}::uuid AND h.attempt_id=${head.attemptId}::uuid AND h.history_id=${head.historyId}::uuid))
 ) AS ticket_ledger_verified`;
 if(ledger.length!==1||ledger[0].ticket_ledger_verified!==true)deny();
 if(i.predecessor){
  const p=await db.$queryRaw<any[]>`SELECT t.ticket_digest AS digest,e.record_digest AS history,e.attempt_id AS attempt,e.record->>'state' AS state,t.generation,t.credential_epoch AS credential
   FROM worker_bootstrap_tickets t JOIN LATERAL (SELECT * FROM worker_bootstrap_lifecycle_events WHERE ticket_id=t.id ORDER BY revision DESC LIMIT 1) e ON true
   WHERE t.id=${i.predecessor.ticketId}::uuid AND t.workspace_id=${i.binding.workspaceId}::uuid AND t.host_id=${i.binding.hostId}::uuid`;
  if(p.length!==1||!same(p[0],{digest:i.predecessor.ticketDigest,history:i.predecessor.historyDigest,attempt:i.predecessor.attemptId,state:i.predecessor.state,generation:i.predecessor.generation,credential:i.predecessor.credentialEpoch}))deny();
 }
 const current=await db.$queryRaw<any[]>`SELECT bootstrap_lifecycle_current(${JSON.stringify(i)}::jsonb) AS ticket_current`;
 const h=history.at(-1)!;
 if(await fence(db)!==f)deny();
 const authorityCurrent=current.length===1&&current[0].ticket_current===true&&h.fence===f&&scope[0].generation===i.generation&&scope[0].credential===i.credentialEpoch&&
  !h.record.revoked&&!h.record.expired&&!h.record.reconciled&&now.getTime()>=Date.parse(i.notBefore)&&now.getTime()<Date.parse(i.expiresAt);
 const usable=authorityCurrent&&['issued','reserved','consumed','dispatched'].includes(h.record.state);
 return {root:t,head:h.record,digest:h.digest,fence:f,usable,authorityCurrent,generationHighWater:scope[0].generation as number,credentialHighWater:scope[0].credential as number};
}
async function append(db:Db,e:TicketLifecycleEvent){
 await db.$executeRaw`INSERT INTO worker_bootstrap_lifecycle_events(id,ticket_id,revision,previous_digest,record,record_digest,attempt_id,history_id,writer_xid)
  VALUES(${e.id}::uuid,${e.ticketId}::uuid,${e.revision},${e.previousDigest},${JSON.stringify(e)}::jsonb,${reviewDigest(e)},${e.attemptId}::uuid,${e.historyId}::uuid,pg_current_xact_id()::text)`;
}
// Factory only: no Prisma client creation, default composition, route, signer,
// credential issuance or exchange. PostgreSQL schema remains unapplied.
export type TicketV2Dependencies={verifier:TicketV2SignatureVerifier;channel:BootstrapV2ChannelBinding};
export function createPrismaTicketLifecycleStore(client:Pick<PrismaClient,'$transaction'>,clock=()=>new Date(),deps?:TicketV2Dependencies){
 const options={timeout:10000,maxWait:2000};
 function dependencies(){if(deps?.channel?.qualification!=='unapplied_ticket_channel_binding_v2'||typeof deps.channel.bind!=='function'||typeof deps.channel.inspect!=='function'||
  deps.verifier?.qualification!=='worker_bootstrap_ticket_verifier_v2'||typeof deps.verifier.verify!=='function')deny();return deps!;}
 async function verified(db:Db,c:z.infer<typeof lifecycleRegistration>){const before=await fence(db);await verifyTicketV2(db,c,dependencies().verifier,clock());if(await fence(db)!==before)deny();}
 async function readVerified(db:Db,ticketId:string){const p=await readCanonicalTicketLifecycle(db,ticketId,clock());await verified(db,p.root);
  // Terminal status is readable without reopening admission. Every usable state
  // needs the concrete channel proof, never just a successful issue callback.
  const bound=await dependencies().channel.inspect(db,p.root,clock());
  if(await fence(db)!==p.fence)deny();return {...p,usable:p.usable&&bound,authorityCurrent:p.authorityCurrent&&bound};
 }
 const reading=<T>(work:(db:Db)=>Promise<T>)=>client.$transaction(async db=>{await db.$executeRaw`SET TRANSACTION READ ONLY`;return work(db);},{...options,isolationLevel:'RepeatableRead'});
 async function write(work:(db:Db)=>Promise<TicketLifecycleEvent>){let callbackCompleted=false;
  try{dependencies();const result=await client.$transaction(async db=>{await fence(db,true);await guarded(db);const e=await work(db);callbackCompleted=true;return e;},{...options,isolationLevel:'Serializable'});
   await reading(async db=>{const p=await readVerified(db,result.ticketId);if(!same(p.head,result))deny();
    // Terminal denial receipts can be confirmed after authority loss; admission
    // receipts require fresh authority. Uncertainty is never a successful ACK.
    if(['issue','reserve','consume','dispatch','complete'].includes(result.action)){
     if(!await dependencies().channel.inspect(db,p.root,clock()))deny();
     const proof=await db.$queryRaw<any[]>`SELECT bootstrap_lifecycle_current(${JSON.stringify(p.root.identity)}::jsonb) AS ticket_current`;
     if(proof.length!==1||proof[0].ticket_current!==true||clock().getTime()>=Date.parse(p.root.identity.expiresAt))deny();
     const f=await db.$queryRaw<any[]>`SELECT fence_revision::text AS receipt_fence FROM worker_bootstrap_write_receipts WHERE table_name='worker_bootstrap_lifecycle_events' AND row_id=${result.id}::text`;
     if(f.length!==1||f[0].receipt_fence!==p.fence)deny();
    }
   });return freezePublic({event:result,qualification:'source_only_unapplied_v1' as const,...lifecycleFlags});
  }catch{if(callbackCompleted)throw new TicketLifecycleUnknown();return deny();}
 }
 return Object.freeze({
  async inspect(value:unknown){try{dependencies();const c=input.parse(value),p=await reading(db=>readVerified(db,c.ticketId));
   return freezePublic({ok:true as const,qualification:'source_only_unapplied_v1' as const,identity:p.root.identity,head:p.head,digest:p.digest,fence:p.fence,usable:p.usable,authorityCurrent:p.authorityCurrent,...lifecycleFlags});
  }catch{return {ok:false as const,blockers:['bootstrap_ticket_revocation_unavailable'],...lifecycleFlags};}},
  register:(value:unknown)=>write(async db=>{const c=lifecycleRegistration.parse(value),i=c.identity,p=c.record.signed.payload;
   await verified(db,c);
   await db.$executeRaw`INSERT INTO worker_bootstrap_tickets(id,workspace_id,host_id,owner_id,decision_id,request_id,generation,credential_epoch,target_id,predecessor_id,binding_digest,ticket_digest,record,record_digest,expires_at,lifecycle_identity)
    VALUES(${i.ticketId}::uuid,${i.binding.workspaceId}::uuid,${i.binding.hostId}::uuid,${i.ownerId}::uuid,${i.decisionId}::uuid,${p.intent.requestId}::uuid,${i.generation},${i.credentialEpoch},${p.intent.target.id}::uuid,
     ${i.predecessor?.attemptId??null}::uuid,${reviewDigest(i.binding)},${i.ticketDigest},${JSON.stringify(c.record)}::jsonb,${reviewDigest(c.record)},${new Date(i.expiresAt)},${JSON.stringify(i)}::jsonb)`;
   await dependencies().channel.bind(db,freezePublic(c),clock());await guarded(db);await verified(db,c);
   const e=advanceTicketLifecycle(i,null,null,{id:c.operationId,action:'issue',attemptId:null,historyId:null},clock());await append(db,e);
   if(!await dependencies().channel.inspect(db,c,clock()))deny();return e;
  }),
  transition:(value:unknown)=>write(async db=>{const c=command.parse(value),p=await readVerified(db,c.ticketId),i=p.root.identity,t=p.root.record.signed.payload;
   if(p.head.revision!==c.expectedRevision||p.fence!==c.expectedFence||['reserve','consume','dispatch','complete'].includes(c.action)&&!p.usable)deny();
   if(c.action!=='dispatch'&&c.action!=='complete'&&c.evidence||c.action==='dispatch'&&(!c.evidence?.peer||c.evidence.completion)||c.action==='complete'&&(!c.evidence?.completion||c.evidence.peer))deny();
   let attemptId=p.head.attemptId,historyId=p.head.historyId,previous:z.infer<typeof persistedBootstrapHistory>|null=null;
   if(attemptId){const rows=await db.$queryRaw<any[]>`SELECT record FROM worker_bootstrap_history WHERE attempt_id=${attemptId}::uuid ORDER BY revision DESC LIMIT 1`;
    if(rows.length!==1)deny();previous=persistedBootstrapHistory.parse(rows[0].record);if(previous.id!==historyId)deny();}
   if(c.action==='consume')attemptId=randomUUID();
   // Reconciliation / sticky revoke on an already unknown attempt changes only
   // the ticket receipt; the existing attempt state must not be replayed.
   const probe=advanceTicketLifecycle(i,p.head,p.digest,{id:c.operationId,action:c.action,attemptId,historyId:attemptId?(historyId??randomUUID()):null},clock());
   const nextAttemptState=probe.state==='completed'?'acknowledged':['revoked','expired'].includes(probe.state)?'blocked':probe.state;
   const needsHistory=!!attemptId&&previous?.state!==nextAttemptState;if(needsHistory)historyId=randomUUID();
   const e=advanceTicketLifecycle(i,p.head,p.digest,{id:c.operationId,action:c.action,attemptId,historyId},clock());
   if(c.action==='consume'){
    const a=persistedBootstrapAttempt.parse({id:attemptId,ticketId:c.ticketId,ticketDigest:i.ticketDigest,decisionId:i.decisionId,requestId:t.intent.requestId,binding:i.binding,target:t.intent.target,state:'consumed',expiresAt:i.expiresAt});
    await db.$executeRaw`INSERT INTO worker_bootstrap_attempts(id,ticket_id,workspace_id,host_id,generation,credential_epoch,predecessor_id,record,record_digest,lifecycle_version)
     VALUES(${a.id}::uuid,${a.ticketId}::uuid,${i.binding.workspaceId}::uuid,${i.binding.hostId}::uuid,${i.generation},${i.credentialEpoch},${i.predecessor?.attemptId??null}::uuid,${JSON.stringify(a)}::jsonb,${reviewDigest(a)},${i.version})`;
   }
   if(needsHistory){
    const state=e.state==='completed'?'acknowledged':['revoked','expired'].includes(e.state)?'blocked':e.state;
    const h=persistedBootstrapHistory.parse({id:historyId,attemptId,revision:(previous?.revision??0)+1,previousDigest:previous?reviewDigest(previous):null,previousState:previous?.state??null,
     state,createdAt:clock().toISOString(),peer:c.evidence?.peer??previous?.peer??null,completion:c.evidence?.completion??previous?.completion??null});
    if(c.evidence?.peer){const peer=c.evidence.peer.payload;if(peer.attemptId!==attemptId||peer.ticketDigest!==i.ticketDigest||!same(peer.binding,i.binding))deny();}
    if(c.evidence?.completion){const v=c.evidence.completion.payload;if(v.attemptId!==attemptId||v.ticketDigest!==i.ticketDigest||v.requestId!==t.intent.requestId||!same(v.credential,t.intent.target)||!same(v.peer,previous?.peer?.payload))deny();}
    await db.$executeRaw`INSERT INTO worker_bootstrap_history(id,attempt_id,revision,state,record,record_digest,previous_revision,previous_digest,previous_state)
     VALUES(${h.id}::uuid,${attemptId}::uuid,${h.revision},${h.state},${JSON.stringify(h)}::jsonb,${reviewDigest(h)},${previous?.revision??null},${h.previousDigest},${h.previousState})`;
    await db.$executeRaw`INSERT INTO worker_bootstrap_heads(workspace_id,host_id,attempt_id,history_id,generation,credential_epoch,revision,record_digest,state)
     VALUES(${i.binding.workspaceId}::uuid,${i.binding.hostId}::uuid,${attemptId}::uuid,${h.id}::uuid,${i.generation},${i.credentialEpoch},${h.revision},${reviewDigest(h)},${h.state})
     ON CONFLICT(workspace_id,host_id) DO UPDATE SET attempt_id=EXCLUDED.attempt_id,history_id=EXCLUDED.history_id,generation=EXCLUDED.generation,
      credential_epoch=EXCLUDED.credential_epoch,revision=EXCLUDED.revision,record_digest=EXCLUDED.record_digest,state=EXCLUDED.state`;
   }
   await append(db,e);return e;
  })
 });
}
