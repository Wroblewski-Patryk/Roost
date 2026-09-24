import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {baseFixture,channelFixture,owned,prepare,material,hash,type Db} from './bootstrap-channel-native-fixture';
import {createPrismaBootstrapIssuerStore} from '../modules/api-keys/bootstrap-issuer-store';
import {createPrismaWorkerIdentityLifecycleStore} from '../modules/api-keys/worker-identity-lifecycle-store';
import {createBootstrapV2ChannelBinding} from '../modules/api-keys/bootstrap-channel-store';
import {channelSnapshotDigest} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {createPrismaTicketLifecycleStore,type TicketV2Dependencies} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {lifecycleRegistration} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {ticketChannelPlanDigest,ticketContentDigest,ticketEnvelopeDigest,ticketV2Domains} from '../modules/api-keys/bootstrap-ticket-v2-digests';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
export {owned,prepare,hash,type Db};
// Only public synthetic source records are prepared in the explicitly owned DB.
export async function preflight(){const db=new PrismaClient();try{await db.$connect();await owned(db);await channelFixture(db);
 await db.$executeRawUnsafe('CREATE TABLE native_ticket_preflight (kind TEXT PRIMARY KEY,body JSONB NOT NULL)');
 for(const table of ['worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit'])await db.$executeRawUnsafe(`INSERT INTO native_ticket_preflight SELECT '${table}',coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM ${table} t`);
 await db.$executeRawUnsafe("INSERT INTO native_ticket_preflight SELECT 'checks',jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'expr',pg_get_expr(conbin,conrelid))) FROM pg_constraint WHERE contype='c' AND conrelid IN ('worker_bootstrap_tickets'::regclass,'worker_bootstrap_attempts'::regclass)");
 console.log(JSON.stringify({legacyTicketPreflight:1,privateKeys:0,credentialStrings:0}));
 }finally{await db.$disconnect();}}
export async function ticketFixture(db:PrismaClient){
 const f=await baseFixture(db),b=f.b;
 await db.trustedProviderTicketKey.create({data:{workspaceId:b.workspaceId,installationId:b.installationId,keyId:material.keyId,epoch:1,publicKeyDigest:material.publicKeyDigest}});
 const ii:any={schemaVersion:'bootstrap-issuer-v1',binding:{workspaceId:b.workspaceId,issuerId:b.workspaceId,installationId:b.installationId,purpose:'worker-bootstrap-owner-ticket-v1'},action:'adopt',expectedRevision:0,targetEpoch:1,material,activatesAt:null,cutoverAt:null,adoptionEvidenceDigest:hash('a'),expiresAt:f.iso(600000)};
 await createPrismaBootstrapIssuerStore(db,()=>new Date(f.base-1000)).apply({operationId:randomUUID(),decisionId:(await f.accept({workerBootstrapIssuer:ii})).decisionId,decisionRevision:1,intent:ii});
 const lifecycle=createPrismaWorkerIdentityLifecycleStore(db,()=>new Date(f.base-1000));
 for(const kind of ['installation','host'] as const){const i={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId:b.workspaceId,kind,subjectId:kind==='host'?b.hostId:b.installationId,action:'adopt' as const,expected:null,generation:kind==='host'?f.snapshot.hostGeneration:f.snapshot.installationGeneration,installationId:b.installationId,installationGeneration:f.snapshot.installationGeneration,hostFingerprint:kind==='host'?b.hostFingerprint:null,authorityDigest:hash('a'),adoptionEvidenceDigest:hash('b'),expiresAt:f.iso(600000)};
  const a=await f.accept({workerIdentityLifecycle:i});await lifecycle.apply({operationId:randomUUID(),decisionId:a.decisionId,decisionRevision:1,intent:i});}
 const s=f.snapshot,t=f.ticket;
 s.validFrom=f.iso(-1000);s.expiresAt=f.iso(110000);s.certificateNotBefore=f.iso(-60000);s.certificateNotAfter=f.iso(3600000);
 Object.assign(t.intent.channel.profile.certificate,{notBefore:s.certificateNotBefore,notAfter:s.certificateNotAfter});
 t.intent.channel.validUntil=s.expiresAt;t.intent.expiresAt=f.iso(100000);t.issuedAt=f.iso();t.ownerAuthAt=f.iso(-1000);
 s.issuerHistoryDigest=(await db.$queryRaw<any[]>`SELECT record_digest AS digest FROM bootstrap_issuer_history WHERE workspace_id=${b.workspaceId}::uuid ORDER BY revision DESC LIMIT 1`)[0].digest;
 s.recordDigest=channelSnapshotDigest(s);
 t.decisionId=(await f.accept({})).decisionId;
 const identity:any={version:'bootstrap-ticket-revocation-proposal-v1',ticketId:t.id,ticketDigest:hash('0'),ownerId:t.ownerId,decisionId:t.decisionId,decisionRevision:1,purpose:'first_enrollment',binding:b,
  generation:1,credentialEpoch:1,issuedAt:t.issuedAt,notBefore:t.issuedAt,expiresAt:t.intent.expiresAt,hostGeneration:s.hostGeneration,installationGeneration:s.installationGeneration,
  issuerRevision:1,issuerHistoryDigest:s.issuerHistoryDigest,channelGeneration:s.generation,channelRevision:1,channelDigest:ticketChannelPlanDigest(s),predecessor:null};
 const {ticketDigest,...metadata}=identity;t.version='worker-bootstrap-owner-ticket-v2';t.intent.schemaVersion='worker-bootstrap-admission-v2';t.lifecycle=metadata;t.decisionIntentDigest=reviewDigest(t.intent);
 const signed={payload:t,signature:'0'.repeat(128)};identity.ticketDigest=ticketEnvelopeDigest(signed);
 const record={signed,decision:{payload:{id:t.decisionId,revision:1,ownerId:t.ownerId,authority:'owner_reserved',state:'accepted',intentDigest:t.decisionIntentDigest,acceptedAt:f.iso(-2000),expiresAt:identity.expiresAt},signature:'0'.repeat(128)}};
 const registration=lifecycleRegistration.parse({operationId:randomUUID(),identity,record});
 await prepare(db,tx=>tx.$executeRaw`UPDATE decision_revisions SET body=${JSON.stringify({workerBootstrapLifecycle:metadata})}::jsonb WHERE decision_id=${t.decisionId}::uuid`);
 const intent={schemaVersion:'worker-bootstrap-channel-v1',ticketId:t.id,ticketDigest:identity.ticketDigest,expectedRevision:0,snapshot:s};
 const accepted=await f.accept({workerBootstrapChannel:intent});
 let fault='',before:((tx:Db)=>Promise<void>)|undefined,afterQuery:((tx:Db,sql:string)=>Promise<void>)|undefined;
 const errors:string[]=[],modes:string[]=[],attempts={writes:0,roots:0,bindings:0,issues:0,reads:0};
 const deps:TicketV2Dependencies={channel:createBootstrapV2ChannelBinding(),verifier:{qualification:'worker_bootstrap_ticket_verifier_v2',verify:async(_tx,p)=>{
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.signed));assert.equal(p.domain,ticketV2Domains.content);
  return p.contentDigest===ticketContentDigest(registration.record.signed.payload)&&p.envelopeDigest===identity.ticketDigest&&reviewDigest(p.identity)===reviewDigest(identity)&&fault!=='signature';
 }}};
 const client=new Proxy(db,{get(target,key){if(key!=='$transaction')return Reflect.get(target,key);return (work:any,options:any)=>target.$transaction(async tx=>{
  const write=options.isolationLevel==='Serializable';if(write)attempts.writes++;else attempts.reads++;
  if(before){const hook=before;before=undefined;await hook(tx);}
  if(!write&&fault==='readback')throw Error('synthetic readback unavailable');
  const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$executeRaw'||key==='$queryRaw')return async(...args:any[])=>{
   const sql=args[0].join('?').replace(/\s+/g,' ').trim();
   if(sql.startsWith('INSERT INTO worker_bootstrap_tickets'))attempts.roots++;
   if(sql.startsWith('INSERT INTO worker_transport_bootstrap_grants'))attempts.bindings++;
   if(sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events'))attempts.issues++;
   try{const result=await (value as any).apply(target,args);
    if(sql==='SET TRANSACTION READ ONLY')modes.push((await tx.$queryRaw<any[]>`SHOW transaction_read_only`)[0].transaction_read_only);
    if(afterQuery)await afterQuery(tx,sql);
    if(write&&(fault==='root'&&sql.startsWith('INSERT INTO worker_bootstrap_tickets')||fault==='generation'&&sql.startsWith('INSERT INTO worker_transport_generations')||fault==='grant'&&sql.startsWith('INSERT INTO worker_transport_bootstrap_grants')||fault==='history'&&sql.startsWith('WITH v AS')||fault==='issue'&&sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events')))throw Error('synthetic rollback');
    return result;
   }catch(e:any){if(e.meta?.code)errors.push(String(e.meta.code)+':'+String(e.meta.message).slice(0,350));throw e;}
  };return typeof value==='function'?value.bind(target):value;}});
  const result=await work(proxy);if(write&&fault==='precommit')throw Error('synthetic precommit');
  if(write&&fault==='connection'){const pid=(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`)[0].pid;await db.$queryRaw`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid=${pid} AND datname=current_database()`;}
  return result;
 },{...options,maxWait:20000,timeout:30000});}});
 const store=createPrismaTicketLifecycleStore(client,()=>new Date(),deps);
 const inspect=()=>store.inspect({ticketId:t.id});
 async function command(action:string){const p=await inspect();assert.ok(p.ok);if(!p.ok)throw Error('denied');return {ticketId:t.id,operationId:randomUUID(),expectedRevision:p.head.revision,expectedFence:p.fence,action};}
 return {...f,registration,identity,intent,accepted,store,client,deps,errors,attempts,modes,inspect,command,
  fault:(v:string)=>fault=v,before:(hook:(tx:Db)=>Promise<void>)=>before=hook,afterQuery:(hook:(tx:Db,sql:string)=>Promise<void>)=>afterQuery=hook};
}
