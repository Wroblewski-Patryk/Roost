import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import {createCanonicalBootstrapAuthoritySource} from './worker-bootstrap-authority-source';
import {isDecisionAuthorityReader} from './bootstrap-decision-authority-reader';
import {attestationDbClock} from './decision-attestation-projection';
import {requireDecisionAttestationGuards} from './decision-attestation-adapter';
import {exact,positiveText,sqlHash,type AttestationDb as Db} from './decision-attestation-sql';
import {readDispatchAnchor,readDispatchTicketStatus,readDispatchAttemptStatus,linkDispatchReceipt,classifyDispatchFence} from './bootstrap-dispatch-lineage';
import {dispatchGuards} from './bootstrap-dispatch-guards';
import {dispatchCommand,dispatchScope,dispatchRecord,advanceDispatch,authorityForDispatch,inspectDispatchHistory,
 dispatchDigest,denyDispatch as deny,type DispatchAuthority,type DispatchRecord} from './bootstrap-dispatch-contract';

export type DispatchDependencies={qualification:'source_only_durable_dispatch_v1';decisionAuthority:unknown;
 transaction:<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>)=>Promise<T>};
const entrySchema=z.object({record:dispatchRecord,recordDigest:sqlHash,requestDigest:sqlHash,
 rowDigest:sqlHash,writerXid:positiveText,fence:positiveText,eventId:z.string().uuid(),verified:z.literal(true)}).strict();
type Entry=z.infer<typeof entrySchema>;
const capabilities=new WeakSet<object>();
export function isDurableDispatchAdapter(value:unknown):value is DurableDispatchAdapter{
 return typeof value==='object'&&value!==null&&capabilities.has(value);
}
async function requireDispatchGuards(db:Db){
 const rows=await db.$queryRaw<any[]>`SELECT c.relname AS "table",t.tgname AS name,p.proname AS function,t.tgtype::int AS kind,t.tgdeferrable AS deferred,
 encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
 (t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal
 AND (t.tgconstraint<>0)=t.tgdeferrable AND t.tginitdeferred=t.tgdeferrable AND n.nspname='public' AND pn.nspname='public'
 AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype AND p.prokind='f' AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql')
 AND NOT p.prosecdef AND p.proconfig IS NULL AND p.provolatile='v' AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
 AND current_setting('session_replication_role')='origin') AS enabled
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE t.tgname=ANY(${dispatchGuards.map(g=>g.name)}::text[])`;
 const actual=new Map(rows.map(({enabled,...g})=>[`${g.table}:${g.name}`,{enabled,g}]));
 if(rows.length!==dispatchGuards.length||actual.size!==rows.length||!dispatchGuards.every(g=>{
  const row=actual.get(`${g.table}:${g.name}`);return row?.enabled===true&&exact(g,row.g);
 }))deny();
}
async function history(db:Db,attemptId:string){
 const rows=await db.$queryRaw<unknown[]>`SELECT h.record,h.record_digest AS "recordDigest",h.request_digest AS "requestDigest",
 bootstrap_lifecycle_digest(to_jsonb(h)) AS "rowDigest",h.writer_xid AS "writerXid",h.fence_revision::text AS fence,r.event_id AS "eventId",
 (r.row_digest=bootstrap_lifecycle_digest(to_jsonb(h)) AND r.writer_xid=h.writer_xid AND r.fence_revision=h.fence_revision
 AND e.type='bootstrap.dispatch.write' AND e.source='roost' AND e.actor_type::text='system' AND e.workspace_id=a.workspace_id
 AND e.resource_type='worker_bootstrap_dispatch_history' AND e.resource_id=h.id::text
 AND e.payload=jsonb_build_object('operationId',h.id,'attemptId',h.attempt_id,'rowDigest',r.row_digest,'writerXid',h.writer_xid,'fence',h.fence_revision::text,'launchAuthority',false)) AS verified
 FROM worker_bootstrap_dispatch_history h JOIN worker_bootstrap_attempts a ON a.id=h.attempt_id
 LEFT JOIN worker_bootstrap_dispatch_receipts r ON r.operation_id=h.id LEFT JOIN events e ON e.id=r.event_id
 WHERE h.attempt_id=${attemptId}::uuid ORDER BY h.revision LIMIT 1001`;
 const entries=z.array(entrySchema).max(1000).parse(rows);inspectDispatchHistory(entries.map(e=>e.record));
 if(new Set(entries.map(e=>e.eventId)).size!==entries.length||entries.some(e=>e.record.attemptId!==attemptId||
  dispatchDigest(e.record)!==e.recordDigest||e.record.authority.version.fence!==e.fence))deny();
 for(let i=0;i<entries.length;i++){
  const e=entries[i],r=e.record,claim=r.action==='claim'||r.action==='resume';
  if(!exact(r.lineage.previous,i?linkDispatchReceipt(entries[i-1]):null)||
   e.writerXid===r.lineage.anchor.sealReceipt.writerXid||entries.slice(0,i).some(p=>p.writerXid===e.writerXid)||
   e.requestDigest!==reviewDigest({decisionId:r.authority.decisionId,ticketId:r.authority.ticketId,binding:r.authority.binding,purpose:r.authority.purpose,
    attemptId:r.attemptId,operationId:r.operationId,action:r.action,expectedRevision:r.revision-1,expectedDigest:r.previousDigest,
    ownerId:r.ownerId,ownerEpoch:r.ownerEpoch,claimGeneration:r.claimGeneration,
    leaseMs:claim?Date.parse(r.leaseExpiresAt!)-Date.parse(r.at):null,
    responseDigest:['outcome','start_complete','complete'].includes(r.action)?r.responseDigest:null,
    completionOperationId:['start_complete','complete'].includes(r.action)?r.completionOperationId:null,evidenceDigest:r.evidenceDigest}))deny();
 }
 return entries;
}

export function createDurableDispatchAdapter(deps?:DispatchDependencies){
 const source=createCanonicalBootstrapAuthoritySource(undefined,undefined,deps?.decisionAuthority),seen=new WeakSet<object>();
 const valid=()=>{if(deps?.qualification!=='source_only_durable_dispatch_v1'||!isDecisionAuthorityReader(deps.decisionAuthority)||typeof deps.transaction!=='function')deny();};
 async function transaction<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>){
  valid();let entered=false,observed:T|undefined;
  const result=await deps!.transaction(mode,async db=>{
   if(entered||seen.has(db))deny();entered=true;seen.add(db);const c=await attestationDbClock(db);
   if(c.isolation!==(mode==='read'?'repeatable read':'serializable')||c.readOnly!==(mode==='read'?'on':'off'))deny();
   await requireDispatchGuards(db);observed=await work(db);return observed;
  });
  if(!entered||observed===undefined||result!==observed)deny();return result;
 }
 // A single READ ONLY snapshot reconstructs history and authority independently.
 async function inspect(input:unknown){
  const q=dispatchScope.parse(input),{attemptId,...scope}=q;
  return transaction('read',async db=>{
   await requireDecisionAttestationGuards(db);
   const entries=await history(db,attemptId),anchor=await readDispatchAnchor(db,q),ticketCurrent=await readDispatchTicketStatus(db,q.ticketId),
    attemptCurrent=await readDispatchAttemptStatus(db,q.attemptId),clock=await attestationDbClock(db);
   if(entries.some(e=>!exact(e.record.lineage.anchor,anchor)||e.record.authority.purpose!==q.purpose||
    !exact(e.record.authority.binding,q.binding)))deny();
   let authority:DispatchAuthority|undefined=entries.at(-1)?.record.authority,authorityCurrent=false;
   const release=await source.bindTransaction!(db,'read');
   try{
    const current=authorityForDispatch(await source.inspectDecisionAuthority(db,scope),q);
    if(clock.fence!==current.version.fence||entries.some(e=>!exact(e.record.authority,current)))deny();
    authority=current;authorityCurrent=true;
   }catch{/* Historical integrity does not confer current authority. */}finally{release();}
   if(!authority)deny();
   const head=entries.at(-1)?.record??null,expired=!!head?.leaseExpiresAt&&Date.parse(clock.at)>=Date.parse(head.leaseExpiresAt),
    fenceLineage=classifyDispatchFence(anchor,clock.fence),possibleDelivery=entries.some(e=>e.record.action==='start_send'),
    terminal=!!head&&['completed','cancelled','terminal_failed'].includes(head.state),
    reconciliationRequired=!!head&&(!authorityCurrent||!terminal&&(['send_started','completion_started','delivery_unknown','reconciliation_required'].includes(head.state)||expired&&head.state==='delivered'));
   authorityCurrent=authorityCurrent&&fenceLineage.complete;
   return freezePublic({authorityCurrent,historyIntegrity:true as const,authority:authority!,entries,head,anchor,fenceLineage,
    leaseExpired:expired,reconciliationRequired,possibleDelivery,
    effectiveState:!terminal&&possibleDelivery&&(!authorityCurrent||reconciliationRequired)?'delivery_unknown' as const:head?.state??'consumed',
    canonical:{attemptId:q.attemptId,ticketId:q.ticketId,attempt:attemptCurrent,attemptAtSeal:anchor.attemptHead,ticketAtSeal:anchor.ticketHead,ticketCurrent,
     completionRecorded:false as const,credentialActivated:false as const,
     completionBlocker:'signed_bootstrap_completion_required' as const},
    lastReceipt:entries.length?linkDispatchReceipt(entries.at(-1)!):null,
    retryable:false as const,sendAuthorized:false as const,completionAuthorized:false as const,...lifecycleFlags});
  });
 }
 const failure=(uncertain:boolean)=>freezePublic({ok:false as const,error:uncertain?'reconciliation_required':'denied',
  reconciliationRequired:uncertain,retryable:false as const,sendAuthorized:false as const,completionAuthorized:false as const,...lifecycleFlags});
 const adapter=Object.freeze({qualification:'source_only_durable_dispatch_v1' as const,
  async inspect(input:unknown){
   try{return {ok:true as const,...await inspect(input)};}
   catch{return {...failure(false),authorityCurrent:false as const,historyIntegrity:false as const};}
  },
  async execute(input:unknown){let possibleCommit=false;
   try{
    const c=dispatchCommand.parse(input),{operationId,action,expectedRevision,expectedDigest,ownerId,ownerEpoch,claimGeneration,leaseMs,responseDigest,completionOperationId,evidenceDigest,...scope}=c;
    const before=await inspect(scope),authority:DispatchAuthority=before.authority,requestDigest=reviewDigest(c);
    if(!before.authorityCurrent){possibleCommit=before.possibleDelivery;deny();}
    const priorOperation=before.entries.find(e=>e.record.operationId===c.operationId);
    // Only exact final completion is idempotently acknowledged. No repeated
    // claim/start/side-effect can acquire another permit by replaying its ID.
    if(priorOperation){
     if(action!=='complete'||priorOperation.record.state!=='completed'||priorOperation.requestDigest!==requestDigest||
      before.head?.operationId!==operationId)deny();
     return freezePublic({ok:true as const,idempotent:true,entry:priorOperation,sendAuthorized:false,completionAuthorized:false,...lifecycleFlags});
    }
    const candidate=await transaction('write',async db=>{
     await requireDecisionAttestationGuards(db);
     const locked=await db.$queryRaw<any[]>`SELECT revision::text AS fence FROM ready_source_fence WHERE id=1 FOR UPDATE`;
     if(locked.length!==1||locked[0].fence!==authority.version.fence)deny();
     const roots=await db.$queryRaw<any[]>`SELECT id::text AS id FROM worker_bootstrap_attempts WHERE id=${c.attemptId}::uuid AND ticket_id=${c.ticketId}::uuid FOR UPDATE`;
     if(roots.length!==1||roots[0].id!==c.attemptId)deny();
     const entries=await history(db,c.attemptId),clock=await attestationDbClock(db);
     if(clock.fence!==authority.version.fence)deny();
     const anchor=await readDispatchAnchor(db,scope);
     if(!exact(anchor,before.anchor)||entries.some(e=>!exact(e.record.lineage.anchor,anchor)))deny();
     const record=advanceDispatch(entries.at(-1)?.record??null,authority,c,new Date(clock.at).toISOString(),
      {version:'bootstrap-dispatch-lineage-v1',anchor,previous:entries.length?linkDispatchReceipt(entries.at(-1)!):null});
     possibleCommit=true;
     const changed=await db.$executeRaw`INSERT INTO worker_bootstrap_dispatch_history(id,attempt_id,revision,previous_digest,record,record_digest,request_digest,fence_revision,writer_xid)
      VALUES(${c.operationId}::uuid,${c.attemptId}::uuid,${record.revision},${record.previousDigest},${JSON.stringify(record)}::jsonb,
      ${dispatchDigest(record)},${requestDigest},${authority.version.fence}::bigint,pg_current_xact_id()::text)`;
     if(changed!==1)deny();
     const read=await history(db,c.attemptId),entry=read.at(-1);
     if(!entry||!exact(entry.record,record)||entry.requestDigest!==requestDigest)deny();return entry;
    });
    // Promise resolution is not COMMIT evidence. An independent transaction
    // validates the full receipt/Event chain and fresh authority after COMMIT.
    const committed=await inspect(scope),entry=committed.entries.find(e=>e.record.operationId===operationId);
    if(!committed.authorityCurrent||!entry||!exact(entry,candidate)||committed.head?.operationId!==operationId||!exact(committed.authority,authority))deny();
    const granting=action==='start_send'||action==='start_complete';if(granting&&committed.leaseExpired)deny();
    return freezePublic({ok:true as const,idempotent:false,entry,
     sendAuthorized:action==='start_send',completionAuthorized:action==='start_complete',...lifecycleFlags});
   }catch{return failure(possibleCommit);}
  }
 });
 capabilities.add(adapter);return adapter;
}
export type DurableDispatchAdapter=ReturnType<typeof createDurableDispatchAdapter>;
export type DispatchEntry=Entry;
