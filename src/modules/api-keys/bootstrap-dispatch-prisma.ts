import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import {createCanonicalBootstrapAuthoritySource} from './worker-bootstrap-authority-source';
import {isDecisionAuthorityReader} from './bootstrap-decision-authority-reader';
import {attestationDbClock} from './decision-attestation-projection';
import {requireDecisionAttestationGuards} from './decision-attestation-adapter';
import {exact,positiveText,sqlHash,type AttestationDb as Db} from './decision-attestation-sql';
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
 async function inspect(input:unknown){
  const q=dispatchScope.parse(input),{attemptId,...scope}=q;
  return transaction('read',async db=>{
   const release=await source.bindTransaction!(db,'read');
   try{
    const proof=await source.inspectDecisionAuthority(db,scope),authority=authorityForDispatch(proof,q),entries=await history(db,attemptId);
    if(entries.some(e=>!exact(e.record.authority,authority)))deny();
    const clock=await attestationDbClock(db);if(clock.fence!==authority.version.fence)deny();
    const head=entries.at(-1)?.record??null,expired=!!head?.leaseExpiresAt&&Date.parse(clock.at)>=Date.parse(head.leaseExpiresAt);
    return freezePublic({authorityCurrent:true as const,authority,entries,head,leaseExpired:expired,
     reconciliationRequired:!!head&&(['send_started','completion_started','delivery_unknown','reconciliation_required'].includes(head.state)||expired&&head.state==='delivered'),
     // Inspecting never grants permission or silently resumes any operation.
     sendAuthorized:false as const,completionAuthorized:false as const,...lifecycleFlags});
   }finally{release();}
  });
 }
 const failure=(uncertain:boolean)=>freezePublic({ok:false as const,error:uncertain?'reconciliation_required':'denied',
  reconciliationRequired:uncertain,retryable:false as const,sendAuthorized:false as const,completionAuthorized:false as const,...lifecycleFlags});
 const adapter=Object.freeze({qualification:'source_only_durable_dispatch_v1' as const,
  async inspect(input:unknown){
   try{return {ok:true as const,...await inspect(input)};}
   catch{
    // Expired/revoked authority cannot write, but a restart can still inspect
    // exact, audited history. This fallback is never used by execute().
    try{const q=dispatchScope.parse(input);return await transaction('read',async db=>{
     await requireDecisionAttestationGuards(db);const entries=await history(db,q.attemptId),head=entries.at(-1)?.record;
     if(!head||head.authority.ticketId!==q.ticketId||head.authority.decisionId!==q.decisionId||
      head.authority.purpose!==q.purpose||!exact(head.authority.binding,q.binding))deny();
     const clock=await attestationDbClock(db);
     return freezePublic({ok:true as const,authorityCurrent:false as const,entries,head,authority:head!.authority,
      leaseExpired:!!head!.leaseExpiresAt&&Date.parse(clock.at)>=Date.parse(head!.leaseExpiresAt),
      reconciliationRequired:true,sendAuthorized:false as const,completionAuthorized:false as const,...lifecycleFlags});
    });}catch{return failure(false);}
   }
  },
  async execute(input:unknown){let possibleCommit=false;
   try{
    const c=dispatchCommand.parse(input),{operationId,action,expectedRevision,expectedDigest,ownerId,ownerEpoch,claimGeneration,leaseMs,responseDigest,completionOperationId,evidenceDigest,...scope}=c;
    const before=await inspect(scope),authority:DispatchAuthority=before.authority,requestDigest=reviewDigest(c);
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
     const record=advanceDispatch(entries.at(-1)?.record??null,authority,c,new Date(clock.at).toISOString());
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
    if(!entry||!exact(entry,candidate)||committed.head?.operationId!==operationId||!exact(committed.authority,authority))deny();
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
