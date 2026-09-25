import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {ticketFixture,owned,prepare,type Db} from './bootstrap-ticket-native-fixture';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {ticketEnvelopeDigest} from '../modules/api-keys/bootstrap-ticket-v2-digests';
import {lifecycleRegistration} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {createPrismaTicketLifecycleStore} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {createBootstrapV2ChannelBinding} from '../modules/api-keys/bootstrap-channel-store';
import {attestationDigest} from '../modules/api-keys/decision-attestation-key-model';
import {createPrismaDecisionAttestationPorts,type NativeAttestationDependencies} from '../modules/api-keys/decision-attestation-prisma-ports';
import {AttestationCommitUnknown} from '../modules/api-keys/decision-attestation-persistence-model';
export {owned,prepare,type Db};

export async function preflight(){const db=new PrismaClient();try{await db.$connect();await owned(db);const f=await ticketFixture(db);
 await f.store.register(f.registration);await f.store.transition(await f.command('reserve'));await f.store.transition(await f.command('consume'));
 assert.equal((await f.store.inspect({ticketId:f.identity.ticketId})).ok,true);
 await db.$executeRawUnsafe('CREATE TABLE native_attestation_preflight (kind TEXT PRIMARY KEY,body JSONB NOT NULL)');
 for(const table of ['decisions','decision_revisions','decision_acceptances','worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit']){
  await db.$executeRawUnsafe(`INSERT INTO native_attestation_preflight SELECT '${table}',coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM ${table} t`);}
 console.log(JSON.stringify({legacyAttestationPreflight:true,original82CatalogPath:true,ticketAttempts:1,privateKeys:0}));
 }finally{await db.$disconnect();}}

export async function attestationNativeFixture(db:PrismaClient,options:{policyTtlMs?:number}={}){
 const f=await ticketFixture(db),q={decisionId:randomUUID(),ticketId:f.identity.ticketId},registration=structuredClone(f.registration);
 const i=registration.identity,t=registration.record.signed.payload,b=i.binding,ownerId=i.ownerId,acceptanceId=randomUUID(),previewId=randomUUID();
 const at=(await db.$queryRaw<any[]>`SELECT to_char(date_trunc('milliseconds',clock_timestamp()) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at`)[0].at as string;
 i.decisionId=q.decisionId;t.decisionId=q.decisionId;t.lifecycle.decisionId=q.decisionId;
 // Preparation precedes all attestation operations and uses no secret material.
 // Shift the ticket issue boundary after this exact synthetic acceptance time.
 i.issuedAt=at;i.notBefore=at;t.issuedAt=at;t.lifecycle.issuedAt=at;t.lifecycle.notBefore=at;t.ownerAuthAt=at;
 registration.record.decision.payload.id=q.decisionId;registration.record.decision.payload.acceptedAt=at;
 i.ticketDigest=ticketEnvelopeDigest(registration.record.signed);
 const impact={taskIds:[]},policy={version:'owner-decision-attestation-policy-v1',revision:1,evidenceDigest:reviewDigest(impact),validFrom:at,
  expiresAt:options.policyTtlMs?new Date(Date.parse(at)+options.policyTtlMs).toISOString():i.expiresAt};
 const body={workerBootstrap:t.intent,workerBootstrapLifecycle:t.lifecycle,ownerDecisionAttestation:policy};
 const channelIntent={...f.intent,ticketDigest:i.ticketDigest};
 await prepare(db,tx=>tx.$executeRaw`UPDATE decision_revisions SET body=${JSON.stringify({workerBootstrapChannel:channelIntent})}::jsonb WHERE decision_id=${f.accepted.decisionId}::uuid`);
 await db.$transaction(async tx=>{
  // These newly created inert source rows came from the old native fixture.
  // Origin writes record their real migration-83 receipts; no existing database
  // data or legacy opt-in seed is promoted by this fixture.
  await tx.$executeRaw`UPDATE workspaces SET name=name WHERE id=${b.workspaceId}::uuid`;
  await tx.$executeRaw`UPDATE workspace_memberships SET role=role WHERE workspace_id=${b.workspaceId}::uuid AND user_id=${ownerId}::uuid`;
  // Only pre-existing decision-policy BEFORE ROW triggers are suspended while
  // preparing public accepted-source fixtures. All migration-83 triggers, root
  // opt-in rules, acceptance effects and tested writers remain active. Restore
  // these exact trigger names before COMMIT and any port invocation.
  const old=await tx.$queryRaw<any[]>`SELECT c.relname AS tbl,t.tgname AS name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
   WHERE c.relname IN ('decision_revisions','decision_impact_previews','decision_acceptances') AND NOT t.tgisinternal AND t.tgtype & 3=3`;
  for(const g of old){assert.match(g.tbl,/^decision_(revisions|impact_previews|acceptances)$/);assert.match(g.name,/^[a-z_]+$/);
   await tx.$executeRawUnsafe(`ALTER TABLE ${g.tbl} DISABLE TRIGGER ${g.name}`);}
  await tx.$executeRaw`INSERT INTO decisions(id,workspace_id,title,status,source,authority_revision,updated_at)
   VALUES(${q.decisionId}::uuid,${b.workspaceId}::uuid,'Synthetic attestation decision','proposed','roost_decision',1,clock_timestamp())`;
  await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
   VALUES(${q.decisionId}::uuid,${b.workspaceId}::uuid,1,${JSON.stringify(body)}::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
  await tx.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
   VALUES(${previewId}::uuid,${q.decisionId}::uuid,${b.workspaceId}::uuid,1,${JSON.stringify(impact)}::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(impact)})`;
  await tx.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority,created_at)
   VALUES(${acceptanceId}::uuid,${q.decisionId}::uuid,${b.workspaceId}::uuid,${previewId}::uuid,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)},'{"status":"owner_reserved"}'::jsonb,${at}::timestamptz)`;
  await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
  for(const g of old)await tx.$executeRawUnsafe(`ALTER TABLE ${g.tbl} ENABLE TRIGGER ${g.name}`);
 },{isolationLevel:'Serializable',timeout:30000});
 const reg=lifecycleRegistration.parse(registration);
 const registrationErrors:string[]=[];
 const registrationClient=new Proxy(db,{get(target,key){if(key!=='$transaction')return Reflect.get(target,key);
  return (work:any,options:any)=>target.$transaction(async tx=>{try{return await work(tx);}catch(e:any){
   registrationErrors.push(String(e.meta?.message??e.stack??e.message).slice(0,1200));throw e;}},options);}});
 try{await createPrismaTicketLifecycleStore(registrationClient,()=>new Date(),{channel:createBootstrapV2ChannelBinding(),verifier:{qualification:'worker_bootstrap_ticket_verifier_v2',
  verify:async(_tx,p)=>reviewDigest(p.signed)===reviewDigest(reg.record.signed)&&reviewDigest(p.identity)===reviewDigest(reg.identity)}}).register(reg);
 }catch(e){throw new Error('Synthetic attestation registration failed: '+JSON.stringify(registrationErrors),{cause:e});}
 let fault='',before:((tx:Db)=>Promise<void>)|undefined,afterQuery:((tx:Db,sql:string)=>Promise<void>)|undefined;
 const counts={callbacks:0,writes:0,reads:0,signatures:0,statements:0},errors:string[]=[],transactions:{mode:string;db:Db}[]=[];
 const material={keyId:randomUUID(),epoch:1,purpose:'owner-decision-attestation-v1' as const,algorithm:'Ed25519' as const,format:'raw-public-hex' as const,
  publicKey:'d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a',publicKeyDigest:'',
  provenance:{kind:'installation_secret_store' as const,installationId:b.installationId,authorizationDigest:reviewDigest('synthetic public authorization'),publicMaterialEvidenceDigest:reviewDigest('synthetic public material')},
  validFrom:at,expiresAt:f.iso(240000)};
 material.publicKeyDigest=attestationDigest('owner-decision-public-key-v1',{algorithm:material.algorithm,format:material.format,publicKey:material.publicKey});
 const auth={version:'roost-owner-auth-evidence-v1',workspaceId:b.workspaceId,ownerId,acceptanceId,level:'roost_session',authTime:at,acceptedAt:at,
  sessionEvidenceDigest:reviewDigest('synthetic session evidence'),policyRevision:1};
 const deps:NativeAttestationDependencies={transaction:async(mode,work)=>{
  let returned:any;const falseAck=Error('synthetic false acknowledgement');
  try{return await db.$transaction(async tx=>{
   await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;if(mode==='read'){await tx.$executeRaw`SET TRANSACTION READ ONLY`;counts.reads++;if(fault==='readback')throw Error('synthetic readback failure');}else counts.writes++;
   if(before){const hook=before;before=undefined;await hook(tx);}
   const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$executeRaw'||key==='$queryRaw')return async(...args:any[])=>{
    const sql=(Array.isArray(args[0])?args[0].join('?'):args[0].sql).replace(/\s+/g,' ').trim();
    if(/^(INSERT|UPDATE|DELETE)\b/.test(sql))counts.statements++;
    try{let result=await (value as any).apply(target,args);if(afterQuery)await afterQuery(tx,sql);
     if(mode==='read'&&sql.includes('operationCount')){if(fault==='missing')result=[];if(fault==='mismatch'&&result[0])result[0].mutationDigest='f'.repeat(64);}return result;
    }catch(e:any){errors.push(String(e.meta?.code??e.code??'unknown')+':'+String(e.meta?.message??e.message).slice(0,500));throw e;}
   };return typeof value==='function'?value.bind(target):value;}});
   transactions.push({mode,db:proxy});counts.callbacks++;returned=await work(proxy);
   if(mode==='write'&&fault==='false')throw falseAck;
   if(mode==='write'&&fault==='connection'){const pid=(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`)[0].pid;
    await db.$queryRaw`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid=${pid} AND datname=current_database()`;}
   if(mode==='write'&&fault==='unknown')throw new AttestationCommitUnknown();return returned;
  },{isolationLevel:mode==='read'?'RepeatableRead':'Serializable',maxWait:60000,timeout:30000});
  }catch(e:any){if(e===falseAck)return returned;errors.push(String(e.stack??e.message).split('\n').slice(0,4).join('\n').slice(0,750));throw e;}
 },ownerAuthentication:async()=>auth,authorizePublicKey:async()=>true,
 signer:{keyId:material.keyId,sign:async(_tx,e)=>{counts.signatures++;return reviewDigest({syntheticPublicAttestation:e.payloadDigest}).repeat(2);}},
 verifier:{verify:async(_tx,e)=>e.signature===reviewDigest({syntheticPublicAttestation:e.payloadDigest}).repeat(2)},
 ticketVerifier:{verify:async(_tx,r)=>reviewDigest(r.identity)===reviewDigest(reg.identity)&&reviewDigest(r.record)===reviewDigest(reg.record)}};
 const ports=createPrismaDecisionAttestationPorts(deps);
 async function projection(){return deps.transaction('read',async tx=>{await ports.bind(tx,'read');return ports.projectCanonical(tx,q);});}
 async function command(kind:string,extra:any={}){return {...q,kind,operationId:randomUUID(),expected:(await projection()).version,...extra};}
 async function key(action:string,keyId=material.keyId,m:any=null,overlapStartsAt:string|null=null,cutoverAt:string|null=null){
  const operationId=randomUUID();return ports.execute(await command('key',{operationId,operation:{id:operationId,action,keyId,material:m,overlapStartsAt,cutoverAt}}));}
 async function ready(){assert.equal((await key('create',material.keyId,material)).ok,true,JSON.stringify(errors));
  assert.equal((await ports.execute(await command('auth'))).ok,true,JSON.stringify(errors));}
 return {...f,q,reg,material,auth,policy,ports,deps,projection,command,key,ready,counts,errors,transactions,
  fault:(v:string)=>fault=v,before:(hook:(tx:Db)=>Promise<void>)=>before=hook,afterQuery:(hook?:typeof afterQuery)=>afterQuery=hook};
}
