import type {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {proofBytes,proofDigest} from './bootstrap-proof-encoding';
import {proofKeyIntent,proofKeyEvent,proofScope,proofGeneration,replayProofKeys,proofEventReceipt,proofReference,proofEqual,selectProofKey,denyProof} from './bootstrap-proof-key-contract';
import {proofAuthorityAttachment} from './bootstrap-proof-authority-contract';
import {proofPersistenceFunctions,proofPersistenceTriggers,proofPersistenceForeignKeys} from './bootstrap-proof-persistence-guards';
import {requireDecisionAttestationGuards} from './decision-attestation-adapter';
import {requireDispatchGuards} from './bootstrap-dispatch-prisma';
import {requireCompletionGuards} from './bootstrap-canonical-completion-sql';
import {recognizeV3Backend,v3Pinned} from './bootstrap-v3-catalog';
import {one,positiveText,sqlHash,type AttestationDb as Db} from './decision-attestation-sql';
import {freezePublic} from './worker-transport-snapshot';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';

const id=z.string().uuid(),positive=z.number().int().positive().max(2147483646),time=z.string().datetime({precision:3});
const table=z.enum(['bootstrap_proof_key_history','bootstrap_proof_attachments','bootstrap_proof_ticket_links']);
const receipt=z.object({operationId:id,table,eventId:id,recordDigest:sqlHash,sourceDigest:sqlHash,writerXid:positiveText,fromFence:positiveText,toFence:positiveText}).strict();
const clock=z.object({fence:positiveText,xid:positiveText,at:time,isolation:z.enum(['serializable','repeatable read']),readOnly:z.enum(['on','off']),origin:z.literal('origin'),schemaSafe:z.literal(true)}).strict();
const keyCommand=z.object({operationId:id,decisionId:id,decisionRevision:positive,intent:proofKeyIntent}).strict();
const attachmentCommand=z.object({operationId:id,attachment:proofAuthorityAttachment}).strict();
const lifecycleIds=z.object({installationLifecycleId:id,hostLifecycleId:id}).strict();
type Table=z.infer<typeof table>;
type Operation={row:Record<string,any>;receipt:z.infer<typeof receipt>};
const fail=(uncertain=false)=>freezePublic({ok:false as const,error:uncertain?'reconciliation_required':'denied',retryable:false as const,authorityRecorded:false,...lifecycleFlags});
const kindTable=(kind:'key'|'attachment')=>kind==='key'?'bootstrap_proof_key_history' as const:'bootstrap_proof_attachments' as const;

export async function requireProofPersistenceGuards(db:Db){
 await requireDecisionAttestationGuards(db);await requireDispatchGuards(db);await requireCompletionGuards(db);
 const f=await db.$queryRaw<any[]>`/* proof functions */ SELECT p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,
  p.prorettype::regtype::text AS result,l.lanname AS language,p.provolatile::text AS volatility,
  encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
  (n.nspname='public' AND p.prokind='f' AND NOT p.prosecdef AND p.proconfig IS NULL AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u') AS enabled
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.proname=ANY(${proofPersistenceFunctions.map(f=>f.name)}::text[])`;
 const v3=await recognizeV3Backend(db,f);
 if(f.length!==proofPersistenceFunctions.length||!proofPersistenceFunctions.every(e=>f.filter(({enabled,...v})=>enabled===true&&proofEqual(v3Pinned(e,v3),v)).length===1))denyProof();
 const t=await db.$queryRaw<any[]>`/* proof triggers */ SELECT c.relname AS "table",t.tgname AS name,p.proname AS function,t.tgtype::int AS kind,t.tgdeferrable AS deferred,
  (t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal AND (t.tgconstraint<>0)=t.tgdeferrable
   AND t.tginitdeferred=t.tgdeferrable AND n.nspname='public' AND pn.nspname='public' AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype
   AND current_setting('session_replication_role')='origin') AS enabled
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
 WHERE c.relname||':'||t.tgname=ANY(${proofPersistenceTriggers.map(t=>`${t.table}:${t.name}`)}::text[])`;
 if(t.length!==proofPersistenceTriggers.length||!proofPersistenceTriggers.every(e=>t.filter(({enabled,...v})=>enabled===true&&proofEqual(e,v)).length===1))denyProof();
 const keys=await db.$queryRaw<any[]>`/* proof foreign keys */ SELECT child.relname AS "table",parent.relname AS target,
  ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord) AS columns,
  ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS "targetColumns",
  (c.convalidated AND NOT c.condeferrable AND NOT c.condeferred AND c.confdeltype='r' AND c.confupdtype='a' AND c.confmatchtype='s'
   AND cn.nspname='public' AND pn.nspname='public' AND child.relkind='r' AND parent.relkind='r'
   AND EXISTS(SELECT 1 FROM pg_index ix WHERE ix.indexrelid=c.conindid AND ix.indisunique AND ix.indisvalid AND ix.indisready AND ix.indislive AND ix.indpred IS NULL AND ix.indexprs IS NULL)) AS enabled
 FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid JOIN pg_namespace cn ON cn.oid=child.relnamespace
 JOIN pg_class parent ON parent.oid=c.confrelid JOIN pg_namespace pn ON pn.oid=parent.relnamespace
 WHERE c.contype='f' AND child.relname=ANY(${[...new Set(proofPersistenceForeignKeys.map(k=>k.table))]}::text[])`;
 if(keys.length!==proofPersistenceForeignKeys.length||!proofPersistenceForeignKeys.every(e=>keys.filter(({enabled,...v})=>enabled===true&&proofEqual(e,v)).length===1))denyProof();
}
async function readClock(db:Db){return clock.parse(one(await db.$queryRaw<any[]>`/* proof clock */ SELECT revision::text AS fence,pg_current_xact_id()::text AS xid,
 to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at,current_setting('transaction_isolation') AS isolation,
 current_setting('transaction_read_only') AS "readOnly",current_setting('session_replication_role') AS origin,
 current_schemas(true)=ARRAY['pg_catalog','public']::name[] AS "schemaSafe" FROM ready_source_fence WHERE id=1`));}
async function sources(db:Db,workspaceId:string){return sqlHash.parse(one(await db.$queryRaw<any[]>`/* proof sources */ SELECT bootstrap_proof_sources(${workspaceId}::uuid) AS digest`).digest);}
function operation(value:unknown):Operation{
 const v=z.object({row:z.record(z.any()),receipt}).strict().parse(value),r=v.row,p=v.receipt;
 const record=p.table==='bootstrap_proof_key_history'?proofKeyEvent.parse(r.record):p.table==='bootstrap_proof_attachments'?proofAuthorityAttachment.parse(r.record):denyProof();
 if(r.id!==p.operationId||r.record_digest!==p.recordDigest||r.source_digest!==p.sourceDigest||r.writer_xid!==p.writerXid||
  r.bytes!==proofBytes(record).toString('hex')||proofDigest(record)!==p.recordDigest||BigInt(p.toFence)<=BigInt(p.fromFence))denyProof();
 if(p.table==='bootstrap_proof_key_history'){
  const k=proofKeyEvent.parse(record),i=k.intent;
  if(r.id!==k.id||r.workspace_id!==i.scope.workspaceId||r.principal!==i.scope.principal||r.revision!==k.revision||r.decision_id!==k.decisionId||r.decision_revision!==k.decisionRevision||
   r.installation_id!==(i.scope.principal==='local_worker'?i.scope.installationId:null)||p.eventId!==k.auditId||p.fromFence!==String(k.fromFence)||p.toFence!==String(k.toFence))denyProof();
 }else{
  const a=proofAuthorityAttachment.parse(record);
  if(r.workspace_id!==a.workspaceId||r.installation_id!==a.installationId||r.host_id!==a.generation.hostId||r.host_generation!==a.generation.hostGeneration||r.installation_generation!==a.generation.installationGeneration||
   r.decision_id!==a.decisionId||r.decision_revision!==a.decisionRevision||r.ticket_id!==a.ticketId||r.request_id!==a.requestId||r.enrollment_generation!==a.enrollmentGeneration||
   r.worker_principal!=='local_worker'||r.server_principal!=='roost_server'||r.worker_revision!==a.worker.revision||r.server_revision!==a.server.revision||
   r.worker_history_digest!==a.worker.historyDigest||r.server_history_digest!==a.server.historyDigest)denyProof();
 }return {row:r,receipt:p};
}
export async function readProofOperation(db:Db,name:Table,operationId:string){
 const raw=one(await db.$queryRaw<any[]>`/* proof operation */ SELECT bootstrap_proof_operation(${table.parse(name)},${id.parse(operationId)}::uuid) AS value`).value;
 return raw===null?null:operation(raw);
}
export async function readProofHistory(db:Db,input:unknown){
 const scope=proofScope.parse(input);
 const rows=await db.$queryRaw<any[]>`/* proof history */ SELECT bootstrap_proof_operation('bootstrap_proof_key_history',id) AS value
 FROM bootstrap_proof_key_history WHERE workspace_id=${scope.workspaceId}::uuid AND principal=${scope.principal} ORDER BY revision LIMIT 1001`;
 if(rows.length>1000)denyProof();const result=rows.map(r=>operation(r.value)),records=result.map(r=>proofKeyEvent.parse(r.row.record));
 if(records.some(r=>!proofEqual(r.intent.scope,scope)))denyProof();
 if(records.length){replayProofKeys(records);for(let n=0;n<records.length;n++){
  const state=replayProofKeys(records.slice(0,n+1)),g=state.generations.find(g=>g.epoch===records[n].intent.targetEpoch)!;
  const row=result[n].row;
  if(scope.principal==='local_worker'){
   if(!proofEqual(g.generation,{hostId:row.host_id,hostGeneration:row.host_generation,installationGeneration:row.installation_generation}))denyProof();
   lifecycleIds.parse({hostLifecycleId:row.host_lifecycle_id,installationLifecycleId:row.installation_lifecycle_id});
  }else if([row.host_id,row.host_generation,row.installation_generation,row.host_lifecycle_id,row.installation_lifecycle_id].some(v=>v!==null))denyProof();
 }}return {records,operations:result};
}
async function lifecycle(db:Db,workspaceId:string,installationId:string,generation:z.infer<typeof proofGeneration>){
 return lifecycleIds.parse(one(await db.$queryRaw<any[]>`/* proof lifecycle */ SELECT i.id AS "installationLifecycleId",h.id AS "hostLifecycleId"
 FROM worker_identity_lifecycle i JOIN worker_identity_lifecycle h ON h.workspace_id=i.workspace_id
 WHERE i.workspace_id=${workspaceId}::uuid AND i.subject_id=${installationId}::uuid AND i.generation=${generation.installationGeneration}::uuid
 AND h.subject_id=${generation.hostId}::uuid AND h.generation=${generation.hostGeneration}::uuid
 AND bootstrap_proof_lifecycle(i.workspace_id,i.subject_id,h.subject_id,i.generation,h.generation,i.id,h.id) LIMIT 2`));
}
async function owner(db:Db,workspaceId:string,decisionId:string,revision:number,field:string,value:unknown){
 return id.parse(one(await db.$queryRaw<any[]>`/* proof owner */ SELECT bootstrap_proof_owner(${workspaceId}::uuid,${decisionId}::uuid,${revision},${field},${JSON.stringify(value)}::jsonb) AS owner`).owner);
}

// Existing Db only. This returns canonical persisted public facts, NOT a signed
// ticket/seal or production verifier capability. No default client or trust flag.
export async function readCanonicalProofAuthority(db:Db,input:unknown){
 await requireProofPersistenceGuards(db);const c=await readClock(db);if(c.isolation==='repeatable read'&&c.readOnly!=='on')denyProof();
 const a=proofAuthorityAttachment.parse(input),worker=await readProofHistory(db,a.worker.scope),server=await readProofHistory(db,a.server.scope);
 selectProofKey(worker.records,a.worker,c.at,c.at,a.generation);selectProofKey(server.records,a.server,c.at,c.at,null);
 if(await owner(db,a.workspaceId,a.decisionId,a.decisionRevision,'workerBootstrapProofAuthority',a)!==a.ownerId)denyProof();
 const identities=await lifecycle(db,a.workspaceId,a.installationId,a.generation);
 const rows=await db.$queryRaw<any[]>`/* proof attachment lookup */ SELECT bootstrap_proof_operation('bootstrap_proof_attachments',id) AS value
 FROM bootstrap_proof_attachments WHERE decision_id=${a.decisionId}::uuid AND ticket_id=${a.ticketId}::uuid LIMIT 2`;
 const attached=operation(one(rows).value);
 if(!proofEqual(attached.row.record,a)||attached.row.worker_key_event_id!==worker.records.at(-1)?.id||attached.row.server_key_event_id!==server.records.at(-1)?.id||
  attached.row.host_lifecycle_id!==identities.hostLifecycleId||attached.row.installation_lifecycle_id!==identities.installationLifecycleId)denyProof();
 return freezePublic({attachment:a,worker:worker.records,server:server.records,receipt:attached.receipt,sourceDigest:await sources(db,a.workspaceId),fence:c.fence,
  authorityPersistenceRecorded:true,blockers:['bootstrap_proof_native_qualification_missing','bootstrap_proof_v3_seal_unavailable','bootstrap_proof_signature_verifier_unavailable'],...lifecycleFlags});
}

export function createPrismaProofAuthorityStore(client?:Pick<PrismaClient,'$transaction'>){
 const seen=new WeakSet<object>();
 async function transaction<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>){
  if(!client)denyProof();let entered=false,observed:T|undefined;
  const result=await client.$transaction(async db=>{
   if(entered||seen.has(db))denyProof();entered=true;seen.add(db);
   if(mode==='read')await db.$executeRaw`SET TRANSACTION READ ONLY`;
   await db.$executeRaw`SET LOCAL search_path = pg_catalog, public`;
   await requireProofPersistenceGuards(db);const c=await readClock(db);
   if(c.isolation!==(mode==='read'?'repeatable read':'serializable')||c.readOnly!==(mode==='read'?'on':'off'))denyProof();
   observed=await work(db);return observed;
  },{isolationLevel:mode==='read'?'RepeatableRead':'Serializable',timeout:10000,maxWait:2000});
  if(!entered||observed===undefined||observed!==result)denyProof();return result;
 }
 async function apply(kind:'key'|'attachment',input:unknown){let possibleCommit=false;
  try{
   proofBytes(input);const command=kind==='key'?keyCommand.parse(input):attachmentCommand.parse(input),name=kindTable(kind);
   const matches=(op:Operation)=>'intent' in command?op.row.decision_id===command.decisionId&&op.row.decision_revision===command.decisionRevision&&proofEqual(op.row.record.intent,command.intent):proofEqual(op.row.record,command.attachment);
   const existing=await transaction('read',db=>readProofOperation(db,name,command.operationId));
   if(existing){if(!matches(existing))denyProof();return freezePublic({ok:true as const,idempotent:true,receipt:existing.receipt,authorityRecorded:true,...lifecycleFlags});}
   const prepared=await transaction('write',async db=>{
    await db.$queryRaw`/* proof lock */ SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;
    const replay=await readProofOperation(db,name,command.operationId);if(replay){if(!matches(replay))denyProof();return replay;}
    const c=await readClock(db);let workspaceId:string;
    if('intent' in command){
     const i=command.intent;workspaceId=i.scope.workspaceId;const h=await readProofHistory(db,i.scope),s=h.records.length?replayProofKeys(h.records):null;
     const ownerId=await owner(db,workspaceId,command.decisionId,command.decisionRevision,'workerBootstrapProofKey',i);
     const body={id:command.operationId,previousDigest:s?.historyDigest??null,revision:i.expectedRevision+1,at:c.at,intent:i,ownerId,decisionId:command.decisionId,
      decisionRevision:command.decisionRevision,decisionIntentDigest:proofDigest(i),fromFence:Number(c.fence),toFence:Number(c.fence)+1,auditId:randomUUID()};
     const record=proofKeyEvent.parse({...body,receiptDigest:proofEventReceipt(body)}),state=replayProofKeys([...h.records,record]);
     const g=state.generations.find(g=>g.epoch===i.targetEpoch)!.generation;
     const ids=i.scope.principal==='local_worker'?await lifecycle(db,workspaceId,i.scope.installationId,g!):null;
     const digest=await sources(db,workspaceId);possibleCommit=true;
     if(await db.$executeRaw`/* proof insert key */ INSERT INTO bootstrap_proof_key_history(id,workspace_id,principal,installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id,
      decision_id,decision_revision,revision,record,record_bytes,record_digest,source_digest,writer_xid)
      VALUES(${record.id}::uuid,${workspaceId}::uuid,${i.scope.principal},${i.scope.principal==='local_worker'?i.scope.installationId:null}::uuid,${g?.hostId??null}::uuid,
       ${g?.installationGeneration??null}::uuid,${g?.hostGeneration??null}::uuid,${ids?.installationLifecycleId??null}::uuid,${ids?.hostLifecycleId??null}::uuid,
       ${record.decisionId}::uuid,${record.decisionRevision},${record.revision},${JSON.stringify(record)}::jsonb,${proofBytes(record)},${proofDigest(record)},${digest},${c.xid})`!==1)denyProof();
    }else{
     const a=command.attachment;workspaceId=a.workspaceId;
     const w=await readProofHistory(db,a.worker.scope),s=await readProofHistory(db,a.server.scope);
     selectProofKey(w.records,a.worker,c.at,c.at,a.generation);selectProofKey(s.records,a.server,c.at,c.at,null);
     if(await owner(db,workspaceId,a.decisionId,a.decisionRevision,'workerBootstrapProofAuthority',a)!==a.ownerId)denyProof();
     const ids=await lifecycle(db,workspaceId,a.installationId,a.generation),digest=await sources(db,workspaceId);possibleCommit=true;
     if(await db.$executeRaw`/* proof insert attachment */ INSERT INTO bootstrap_proof_attachments(id,workspace_id,installation_id,host_id,installation_generation,host_generation,installation_lifecycle_id,host_lifecycle_id,
      decision_id,decision_revision,ticket_id,request_id,enrollment_generation,worker_key_event_id,worker_principal,worker_revision,worker_history_digest,server_key_event_id,server_principal,server_revision,server_history_digest,
      record,record_bytes,record_digest,source_digest,writer_xid)
      VALUES(${command.operationId}::uuid,${workspaceId}::uuid,${a.installationId}::uuid,${a.generation.hostId}::uuid,${a.generation.installationGeneration}::uuid,${a.generation.hostGeneration}::uuid,
       ${ids.installationLifecycleId}::uuid,${ids.hostLifecycleId}::uuid,${a.decisionId}::uuid,${a.decisionRevision},${a.ticketId}::uuid,${a.requestId}::uuid,${a.enrollmentGeneration},
       ${w.records.at(-1)!.id}::uuid,'local_worker',${a.worker.revision},${a.worker.historyDigest},${s.records.at(-1)!.id}::uuid,'roost_server',${a.server.revision},${a.server.historyDigest},
       ${JSON.stringify(a)}::jsonb,${proofBytes(a)},${proofDigest(a)},${digest},${c.xid})`!==1)denyProof();
    }
    await db.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
    const actual=await readProofOperation(db,name,command.operationId);
    if(!actual||!matches(actual)||actual.receipt.writerXid!==c.xid||actual.receipt.sourceDigest!==await sources(db,workspaceId))denyProof();
    return actual;
   });
   const committed=await transaction('read',db=>readProofOperation(db,name,command.operationId));
   if(!committed||!proofEqual(prepared,committed))denyProof();
   return freezePublic({ok:true as const,idempotent:false,receipt:committed.receipt,authorityRecorded:true,...lifecycleFlags});
  }catch{return fail(possibleCommit);}
 }
 return Object.freeze({qualification:'source_only_prisma_proof_authority_v1' as const,
  applyKey:(input:unknown)=>apply('key',input),attach:(input:unknown)=>apply('attachment',input),
  async inspect(input:unknown){try{return {ok:true as const,facts:await transaction('read',db=>readCanonicalProofAuthority(db,input)),...lifecycleFlags};}catch{return fail();}},
  async inspectOperation(name:Table,operationId:string){try{return {ok:true as const,operation:await transaction('read',db=>readProofOperation(db,name,operationId)),...lifecycleFlags};}catch{return fail();}}
 });
}
