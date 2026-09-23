import assert from 'node:assert/strict';
import {randomUUID,createHash,createPublicKey} from 'node:crypto';
import {Prisma,PrismaClient} from '@prisma/client';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {channelSnapshotDigest} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {createPrismaBootstrapChannelStore} from '../modules/api-keys/bootstrap-channel-store';
import {createPrismaBootstrapIssuerStore} from '../modules/api-keys/bootstrap-issuer-store';
import {createPrismaWorkerIdentityLifecycleStore} from '../modules/api-keys/worker-identity-lifecycle-store';
import {createPrismaWorkerTransportStore} from '../modules/api-keys/worker-transport-store';
import {workerTicketFingerprint} from '../auth/worker-ticket-principal';
export type Db=Prisma.TransactionClient;
export const hash=(s:string)=>s.repeat(64);
const der=Buffer.from('302a300506032b6570032100d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex');
export const material={keyId:'native-public-channel',algorithm:'Ed25519' as const,format:'spki-der-base64' as const,spki:der.toString('base64'),publicKeyDigest:createHash('sha256').update(der).digest('hex')};
export async function owned(db:PrismaClient){const name=process.env.WORKER_IDENTITY_NATIVE_DATABASE;assert.match(name!,/^companycore_test_identity_[a-f0-9]{32}$/);
 assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/'+name);assert.deepEqual(await db.$queryRaw<any[]>`SELECT current_database() AS name,pg_get_userbyid(datdba) AS owner,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`,[{name,owner:'companycore',marker:'worker-identity-native:'+name!.split('_').at(-1)}]);}
// Privileged, inert canonical-source fixture preparation only. Tested channel,
// ordinary runtime/direct writers always execute in origin with native guards.
export async function prepare(db:PrismaClient,work:(tx:Db)=>Promise<unknown>){await db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await work(tx);});}
export async function baseFixture(db:PrismaClient){
 const f=bootstrapChannelFixture();f.advance(Date.now()-Date.parse(f.iso()));
 // The shared source model has a fixed epoch; shift every public timestamp.
 const base=f.now().getTime(),iso=(ms=0)=>new Date(base+ms).toISOString(),b=f.snapshot.binding;
 b.ticketKeyId=material.keyId;b.ticketPublicKeyDigest=material.publicKeyDigest;
 await prepare(db,async tx=>{await tx.user.create({data:{id:f.ticket.ownerId,email:randomUUID()+'@example.test',passwordHash:'synthetic-not-a-login'}});
  await tx.workspace.create({data:{id:b.workspaceId,name:'Inert native channel fixture',ownerUserId:f.ticket.ownerId}});
  await tx.workspaceMembership.create({data:{workspaceId:b.workspaceId,userId:f.ticket.ownerId,role:'owner'}});
  await tx.agentHost.create({data:{id:b.hostId,workspaceId:b.workspaceId,name:'Inert channel host',slug:randomUUID(),platform:'synthetic',status:'online'}});
 });
 async function accept(body:any){const decisionId=randomUUID(),preview=randomUUID(),acceptanceId=randomUUID();await prepare(db,async tx=>{
  await tx.decision.create({data:{id:decisionId,workspaceId:b.workspaceId,title:'Exact synthetic owner acceptance',status:'accepted',source:'native_fixture'}});
  await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash) VALUES(${decisionId}::uuid,${b.workspaceId}::uuid,1,${JSON.stringify(body)}::jsonb,${f.ticket.ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
  await tx.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash) VALUES(${preview}::uuid,${decisionId}::uuid,${b.workspaceId}::uuid,1,'{}'::jsonb,${f.ticket.ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
  await tx.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority,created_at) VALUES(${acceptanceId}::uuid,${decisionId}::uuid,${b.workspaceId}::uuid,${preview}::uuid,${f.ticket.ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)},'{"status":"owner_reserved"}'::jsonb,${new Date(iso(-2000))})`;
 });return {decisionId,acceptanceId};}
 return {...f,b,iso,base,accept};
}
export async function ordinaryFixture(db:PrismaClient){
 const f=await baseFixture(db),b=f.b,credentialId=randomUUID(),keyHash=reviewDigest('inert-verifier:'+randomUUID());
 const identity={workspaceId:b.workspaceId,hostId:b.hostId,installationId:b.installationId,hostFingerprint:b.hostFingerprint,credentialId,credentialVersion:1,credentialEpoch:1,credentialFingerprint:workerTicketFingerprint(keyHash),ticketKeyId:material.keyId,ticketKeyEpoch:1,ticketPublicKeyDigest:material.publicKeyDigest};
 const handoffDigest=reviewDigest(randomUUID()),profile=structuredClone(f.intent.channel.profile);profile.certificate.notBefore=f.iso(-60000);profile.certificate.notAfter=f.iso(3600000);
 await prepare(db,async tx=>{await tx.trustedProviderTicketKey.create({data:{workspaceId:b.workspaceId,installationId:b.installationId,keyId:material.keyId,epoch:1,publicKeyDigest:material.publicKeyDigest}});
  await tx.apiKey.create({data:{id:credentialId,workspaceId:b.workspaceId,name:'Inert verifier only; no credential generated',keyHash,keyPrefix:'synthetic',scopes:['agent-runtime:claim'],active:true,workerHostId:b.hostId,workerInstallationId:b.installationId,workerBindingEpoch:1,credentialVersion:1,expiresAt:new Date(f.iso(3600000))}});
  await tx.$executeRaw`INSERT INTO worker_credential_handoffs(id,workspace_id,installation_id,host_id,host_fingerprint,device_secret_hash,challenge_hash,request_digest,user_code_hash,origin,certificate_fingerprint,state,credential_id,response_digest,spent_at,ack_deadline,acknowledged_at,created_at,expires_at)
   VALUES(${randomUUID()}::uuid,${b.workspaceId}::uuid,${b.installationId}::uuid,${b.hostId}::uuid,${b.hostFingerprint},${handoffDigest},${handoffDigest},${handoffDigest},${handoffDigest},${profile.origin},${profile.certificate.fingerprint},'acknowledged',${credentialId}::uuid,${hash('0')},${new Date(f.iso())},${new Date(f.iso(60000))},${new Date(f.iso())},${new Date(f.iso())},${new Date(f.iso(120000))})`;
 });
 const intent:any={schemaVersion:'worker-transport-admission-v1',action:'create',identity,expectedRevision:0,expectedDigest:null,certificateEpoch:1,profile,staged:null,expiresAt:f.iso(60000),validUntil:f.iso(60000)};
 const a=await f.accept({workerTransport:intent});
 const record:any={version:'worker-transport-record-v1',identity,revision:1,certificateEpoch:1,highWaterEpoch:1,profile,staged:null,state:'current',ownerId:f.ticket.ownerId,decisionId:a.decisionId,decisionRevision:1,decisionIntentDigest:reviewDigest(intent),approvedAt:f.iso(),expiresAt:intent.expiresAt,requestId:randomUUID()};
 // An inert signature placeholder exercises persistence only. It is never
 // cryptographically signed or accepted as a production admission proof.
 const signed={payload:record,signature:'0'.repeat(128)},generationId=randomUUID(),historyId=randomUUID(),digest=reviewDigest(signed);
 async function direct(tx:Db,patch:any={}){
  await tx.$executeRaw`INSERT INTO worker_transport_generations(id,workspace_id,host_id,installation_id,credential_id,identity,identity_digest) VALUES(${generationId}::uuid,${b.workspaceId}::uuid,${b.hostId}::uuid,${b.installationId}::uuid,${patch.credentialId===undefined?credentialId:patch.credentialId}::uuid,${JSON.stringify(patch.identity??identity)}::jsonb,${reviewDigest(identity)})`;
  await tx.$executeRaw`INSERT INTO worker_transport_history(id,workspace_id,host_id,generation_id,revision,record_digest,certificate_epoch,high_water_epoch,state,request_id,decision_id,decision_revision,decision_intent_digest,owner_id,current_pin,record,signature)
   VALUES(${historyId}::uuid,${b.workspaceId}::uuid,${b.hostId}::uuid,${generationId}::uuid,1,${digest},1,1,'current',${record.requestId}::uuid,${a.decisionId}::uuid,1,${record.decisionIntentDigest},${record.ownerId}::uuid,${profile.certificate.fingerprint},${JSON.stringify(patch.record??record)}::jsonb,${signed.signature})`;
  await tx.$executeRaw`INSERT INTO worker_transport_heads(workspace_id,host_id,history_id,revision,record_digest,certificate_epoch,high_water_epoch,state) VALUES(${b.workspaceId}::uuid,${b.hostId}::uuid,${historyId}::uuid,1,${digest},1,1,'current')`;
  const event=await tx.event.create({data:{workspaceId:b.workspaceId,type:'native.ordinary.fixture'}});
  await tx.$executeRaw`INSERT INTO worker_transport_audit(history_id,event_id,record_digest) VALUES(${historyId}::uuid,${event.id}::uuid,${digest})`;
 }
 const signer:any={keyId:material.keyId,epoch:1,publicKey:createPublicKey({key:der,format:'der',type:'spki'}).export({type:'spki',format:'pem'}).toString(),sign:async()=>Buffer.alloc(64)};
 const store=createPrismaWorkerTransportStore(db,signer,()=>new Date(f.base));
 const runtime=()=>store.transaction(async tx=>{assert.equal((await tx.context(b.workspaceId,b.hostId))!.credentialActive,true);assert.equal(await tx.head(b.workspaceId,b.hostId),null);assert.ok(await tx.decision(a.decisionId));await tx.append(signed);await tx.audit(record);});
 return {...f,identity,intent,record,signed,generationId,historyId,direct,runtime,store};
}
export async function preflight(){const db=new PrismaClient();try{await db.$connect();await owned(db);const f=await ordinaryFixture(db);await db.$transaction(tx=>f.direct(tx),{isolationLevel:'Serializable'});
 await db.$executeRawUnsafe('CREATE TABLE native_channel_preflight (kind TEXT PRIMARY KEY,body JSONB NOT NULL)');
 for(const table of ['worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_audit'])await db.$executeRawUnsafe(`INSERT INTO native_channel_preflight SELECT '${table}',jsonb_agg(to_jsonb(t)) FROM ${table} t`);
 await db.$executeRawUnsafe("INSERT INTO native_channel_preflight SELECT 'checks',jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'expr',pg_get_expr(conbin,conrelid))) FROM pg_constraint WHERE contype='c' AND conrelid IN ('worker_transport_generations'::regclass,'worker_transport_history'::regclass)");
 console.log(JSON.stringify({ordinaryPreflightRows:1,privateKeys:0,credentialStrings:0}));
 }finally{await db.$disconnect();}}
export async function channelFixture(db:PrismaClient,purpose:'first_enrollment'|'owner_recovery'='first_enrollment'){
 const f=await baseFixture(db),b=f.b;let clock=f.base,fault='',before:((tx:Db)=>Promise<void>)|undefined;const errors:string[]=[],attempts={writes:0,appends:0},modes:string[]=[];
 await db.trustedProviderTicketKey.create({data:{workspaceId:b.workspaceId,installationId:b.installationId,keyId:material.keyId,epoch:1,publicKeyDigest:material.publicKeyDigest}});
 const ii:any={schemaVersion:'bootstrap-issuer-v1',binding:{workspaceId:b.workspaceId,issuerId:b.workspaceId,installationId:b.installationId,purpose:'worker-bootstrap-owner-ticket-v1'},action:'adopt',expectedRevision:0,targetEpoch:1,material,activatesAt:null,cutoverAt:null,adoptionEvidenceDigest:hash('a'),expiresAt:f.iso(600000)};
 await createPrismaBootstrapIssuerStore(db,()=>new Date(f.base-1000)).apply({operationId:randomUUID(),decisionId:(await f.accept({workerBootstrapIssuer:ii})).decisionId,decisionRevision:1,intent:ii});
 const lifecycle=createPrismaWorkerIdentityLifecycleStore(db,()=>new Date(f.base-1000));
 for(const kind of ['installation','host'] as const){const i={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId:b.workspaceId,kind,subjectId:kind==='host'?b.hostId:b.installationId,action:'adopt' as const,expected:null,generation:kind==='host'?f.snapshot.hostGeneration:f.snapshot.installationGeneration,installationId:b.installationId,installationGeneration:f.snapshot.installationGeneration,hostFingerprint:kind==='host'?b.hostFingerprint:null,authorityDigest:hash('a'),adoptionEvidenceDigest:hash('b'),expiresAt:f.iso(600000)};
  const a=await f.accept({workerIdentityLifecycle:i});await lifecycle.apply({operationId:randomUUID(),decisionId:a.decisionId,decisionRevision:1,intent:i});}
 const s=f.snapshot,t=f.ticket;s.purpose=purpose;t.intent.purpose=purpose;
 s.validFrom=f.iso(-1000);s.expiresAt=f.iso(110000);s.certificateNotBefore=f.iso(-60000);s.certificateNotAfter=f.iso(3600000);
 Object.assign(t.intent.channel.profile.certificate,{notBefore:s.certificateNotBefore,notAfter:s.certificateNotAfter});t.intent.channel.validUntil=s.expiresAt;t.intent.expiresAt=f.iso(100000);t.issuedAt=f.iso();t.ownerAuthAt=f.iso(-1000);
 if(purpose==='owner_recovery'){const recoveryVerifier=reviewDigest('inert-recovery:'+randomUUID()),prior={id:randomUUID(),version:1,epoch:1,fingerprint:workerTicketFingerprint(recoveryVerifier)};t.intent.baseline={enrollmentGeneration:1,credentialHighWater:1,credential:prior};t.intent.prior={attemptId:randomUUID(),state:'revoked_credential',credential:prior};t.intent.target.epoch=2;
  await prepare(db,tx=>tx.apiKey.create({data:{id:prior.id,workspaceId:b.workspaceId,name:'Inert revoked verifier',keyHash:recoveryVerifier,keyPrefix:'synthetic',scopes:['agent-runtime:claim'],active:false,revokedAt:new Date(f.iso(-1000)),workerHostId:b.hostId,workerInstallationId:b.installationId,workerBindingEpoch:1,expiresAt:new Date(f.iso(-1000))}}));}
 t.decisionId=(await f.accept({workerBootstrap:t.intent})).decisionId;t.decisionIntentDigest=reviewDigest(t.intent);
 s.issuerHistoryDigest=(await db.$queryRaw<any[]>`SELECT record_digest AS digest FROM bootstrap_issuer_history WHERE workspace_id=${b.workspaceId}::uuid ORDER BY revision DESC LIMIT 1`)[0].digest;
 s.recordDigest=channelSnapshotDigest(s);const digest=reviewDigest(t),record={signed:{payload:t,signature:'0'.repeat(128)},decision:{payload:{authority:'owner_reserved'},signature:'0'.repeat(128)}};
 await db.$executeRaw`INSERT INTO worker_bootstrap_tickets(id,workspace_id,host_id,owner_id,decision_id,request_id,generation,credential_epoch,target_id,predecessor_id,binding_digest,ticket_digest,record,record_digest,expires_at)
 VALUES(${t.id}::uuid,${b.workspaceId}::uuid,${b.hostId}::uuid,${t.ownerId}::uuid,${t.decisionId}::uuid,${t.intent.requestId}::uuid,${t.intent.baseline.enrollmentGeneration+1},${t.intent.target.epoch},${t.intent.target.id}::uuid,${t.intent.prior?.attemptId??null}::uuid,${reviewDigest(b)},${digest},${JSON.stringify(record)}::jsonb,${reviewDigest(record)},${new Date(t.intent.expiresAt)})`;
 const intent:any={schemaVersion:'worker-bootstrap-channel-v1',ticketId:t.id,ticketDigest:digest,expectedRevision:0,snapshot:s},accepted=await f.accept({workerBootstrapChannel:intent});
 const client=new Proxy(db,{get(target,key){if(key!=='$transaction')return Reflect.get(target,key);return (work:any,options:any)=>target.$transaction(async tx=>{
  const write=options.isolationLevel==='Serializable';if(write)attempts.writes++;if(before){const hook=before;before=undefined;await hook(tx);}
  const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$executeRaw'||key==='$queryRaw')return async(...args:any[])=>{
   const sql=args[0].join('?').replace(/\s+/g,' ').trim();if(sql.startsWith('WITH v AS'))attempts.appends++;
   try{const result=await (value as any).apply(target,args);if(sql==='SET TRANSACTION READ ONLY')modes.push((await tx.$queryRaw<any[]>`SHOW transaction_read_only`)[0].transaction_read_only);
    if(write&&(fault==='fence'&&sql.includes('AS channel_fence')||fault==='generation'&&sql.startsWith('INSERT INTO worker_transport_generations')||fault==='grant'&&sql.startsWith('INSERT INTO worker_transport_bootstrap_grants')||fault==='append'&&sql.startsWith('WITH v AS')))throw Error('synthetic rollback');return result;
   }catch(e:any){if(e.meta?.code)errors.push(String(e.meta.code)+':'+String(e.meta.message).slice(0,350));throw e;}
  };return typeof value==='function'?value.bind(target):value;}});
  const result=await work(proxy);if(write&&fault==='precommit')throw Error('synthetic precommit');
  if(write&&fault==='connection'){const pid=(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`)[0].pid;await db.$queryRaw`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid=${pid} AND datname=current_database()`;}return result;
 },{...options,maxWait:20000,timeout:30000});}});
 const store=createPrismaBootstrapChannelStore(client,()=>new Date(clock));
 const command=()=>({ticketId:t.id,decisionId:accepted.decisionId,decisionRevision:1,operationId:randomUUID()});
 const transition=async(action='consume')=>({ticketId:t.id,operationId:randomUUID(),expectedRevision:(await db.$queryRaw<any[]>`SELECT revision FROM worker_transport_heads WHERE workspace_id=${b.workspaceId}::uuid AND host_id=${b.hostId}::uuid`)[0]?.revision??1,action});
 async function changeIntent(work:(i:any)=>void){work(intent);intent.snapshot.recordDigest=channelSnapshotDigest(intent.snapshot);await prepare(db,tx=>tx.$executeRaw`UPDATE decision_revisions SET body=${JSON.stringify({workerBootstrapChannel:intent})}::jsonb WHERE decision_id=${accepted.decisionId}::uuid`);}
 return {...f,store,client,intent,accepted,command,transition,errors,attempts,modes,changeIntent,now:()=>new Date(clock),at:(ms:number)=>clock=f.base+ms,before:(hook:(tx:Db)=>Promise<void>)=>before=hook,fault:(v:string)=>fault=v};
}
