import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {baseFixture,prepare,material as issuerMaterial} from './bootstrap-channel-native-fixture';
import {createPrismaWorkerIdentityLifecycleStore} from '../modules/api-keys/worker-identity-lifecycle-store';
import {createPrismaProofAuthorityStore} from '../modules/api-keys/bootstrap-proof-persistence';
import {proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {proofReference,replayProofKeys,type ProofKeyIntent} from '../modules/api-keys/bootstrap-proof-key-contract';

// RFC 8032 public vectors only. No seed, private key or signing primitive.
export const materials=['3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c','fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025',
 'ec172b93ad5e563bf4932c70e1245034c35467ef2efd4d64ebf819683467e2bf','278117fc144c72340f67d0f2316e8386ceffbf2b2428c9c51fef7c597f1d426e']
 .map((p,n)=>{const b=Buffer.from('302a300506032b6570032100'+p,'hex');return {keyId:`native-proof-${n}`,algorithm:'Ed25519' as const,format:'spki-der-base64' as const,spki:b.toString('base64'),publicKeyDigest:createHash('sha256').update(b).digest('hex')};});
export async function proofNativeFixture(db:PrismaClient){
 const f=await baseFixture(db),b=f.b,ownerId=f.ticket.ownerId,generation={installationGeneration:f.snapshot.installationGeneration,hostId:b.hostId,hostGeneration:f.snapshot.hostGeneration};
 await db.trustedProviderTicketKey.create({data:{workspaceId:b.workspaceId,installationId:b.installationId,keyId:issuerMaterial.keyId,epoch:1,publicKeyDigest:issuerMaterial.publicKeyDigest}});
 const lifecycle=createPrismaWorkerIdentityLifecycleStore(db,()=>new Date(f.base-1000));
 for(const kind of ['installation','host'] as const){const intent={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId:b.workspaceId,kind,subjectId:kind==='host'?b.hostId:b.installationId,action:'adopt' as const,expected:null,
  generation:kind==='host'?generation.hostGeneration:generation.installationGeneration,installationId:b.installationId,installationGeneration:generation.installationGeneration,hostFingerprint:kind==='host'?b.hostFingerprint:null,authorityDigest:'a'.repeat(64),adoptionEvidenceDigest:'b'.repeat(64),expiresAt:f.iso(3600000)};
  const r=await lifecycle.apply({operationId:randomUUID(),decisionId:(await f.accept({workerIdentityLifecycle:intent})).decisionId,decisionRevision:1,intent});assert.equal(r.state,'active','native lifecycle fixture');}
 async function approve(field:string,value:any){const a=await f.accept({[field]:value});
  if(field==='workerBootstrapProofAuthority'){value.decisionId=a.decisionId;await prepare(db,async tx=>{await tx.$executeRaw`UPDATE decision_revisions SET body=${JSON.stringify({[field]:value})}::jsonb WHERE decision_id=${a.decisionId}::uuid`;});}
  await prepare(db,tx=>tx.$executeRaw`UPDATE decision_acceptances SET created_at=clock_timestamp() WHERE id=${a.acceptanceId}::uuid`);return a.decisionId;}
 async function history(principal:string){return (await db.$queryRaw<any[]>`SELECT record FROM bootstrap_proof_key_history WHERE workspace_id=${b.workspaceId}::uuid AND principal=${principal} ORDER BY revision`).map(r=>r.record);}
 async function command(principal:'local_worker'|'roost_server'='local_worker',action:ProofKeyIntent['action']='create',patch:Partial<ProofKeyIntent>={}){
  const h=await history(principal),s=h.length?replayProofKeys(h):null,add=['create','adopt','stage'].includes(action),worker=principal==='local_worker';
  const intent:ProofKeyIntent={version:'bootstrap-proof-key-history-v1',scope:worker?{principal,purpose:'worker-bootstrap-proof-v1',workspaceId:b.workspaceId,installationId:b.installationId}:{principal,purpose:'bootstrap-completion-binding-attestation-v1',workspaceId:b.workspaceId},
   action,expectedRevision:s?.revision??0,targetEpoch:s?.highWater??1,material:add?materials[worker?0:1]:null,generation:add&&worker?generation:null,
   provenance:add?{source:worker?'local_worker_os_protected':'roost_server_secret_store',evidenceDigest:'a'.repeat(64)}:null,adoptionEvidenceDigest:action==='adopt'?'b'.repeat(64):null,
   activatesAt:null,cutoverAt:null,expiresAt:new Date(Date.now()+3600000).toISOString(),...patch};
  return {operationId:randomUUID(),decisionId:await approve('workerBootstrapProofKey',intent),decisionRevision:1,intent};
 }
 async function attachment(prior:any=null){const w=replayProofKeys(await history('local_worker')),s=replayProofKeys(await history('roost_server'));
  const a={version:'bootstrap-proof-authority-v1' as const,workspaceId:b.workspaceId,installationId:b.installationId,generation,ownerId,decisionId:randomUUID(),decisionRevision:1,ticketId:randomUUID(),requestId:randomUUID(),enrollmentGeneration:prior?prior.enrollmentGeneration+1:1,
   purpose:prior?'owner_recovery' as const:'first_enrollment' as const,worker:proofReference(w,w.highWater),server:proofReference(s,s.highWater),prior:prior?{worker:prior.worker,decisionId:prior.decisionId,ticketId:prior.ticketId,requestId:prior.requestId,enrollmentGeneration:prior.enrollmentGeneration}:null};
  await approve('workerBootstrapProofAuthority',a);return {operationId:randomUUID(),attachment:a};}
 const controls={fault:'',hook:undefined as undefined|((tx:any)=>Promise<void>)},errors:string[]=[],trace:{mode:string;pid:number}[]=[];let written=false,hits=0;
 function client(connection=db){return new Proxy(connection,{get(target,key){if(key!=='$transaction')return Reflect.get(target,key);return async(work:any,options:any)=>{
   const write=options.isolationLevel==='Serializable';let inserted=false;
   const result=await target.$transaction(async tx=>{
    trace.push({mode:write?'write':'read',pid:(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`)[0].pid});
    const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$executeRaw'||key==='$queryRaw')return async(...args:any[])=>{
     const sql=args[0].join('?');try{const result=await value.apply(target,args);
      if(write&&sql.includes('proof insert')){inserted=true;if(controls.fault==='insert'){hits++;throw Error('synthetic post-insert rollback');}}
      if(write&&sql==='SET CONSTRAINTS ALL IMMEDIATE'&&controls.hook)await controls.hook(tx);
      if(!write&&written&&sql.includes('proof operation')){written=false;if(controls.fault==='unavailable'){hits++;throw Error('synthetic independent readback unavailable');}
       if(controls.fault==='missing'){hits++;return [{value:null}];}if(controls.fault==='mismatch'){hits++;result[0].value.row.source_digest='f'.repeat(64);}}
      return result;
     }catch(e:any){if(e.meta?.code)errors.push(`${e.meta.code}:${String(e.meta.message).slice(0,280)}`);throw e;}
    };return typeof value==='function'?value.bind(target):value;}});
    const result=await work(proxy);
    if(write&&inserted){
     if(controls.fault==='precommit'){hits++;throw Error('synthetic pre-COMMIT loss');}
     if(controls.fault==='connection'){hits++;const pid=(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`)[0].pid;await db.$queryRaw`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid=${pid} AND datname=current_database()`;}
     if(controls.fault==='cut'){hits++;await tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'");}
    }return result;
   },{...options,maxWait:20000,timeout:60000});
   if(write&&inserted){written=true;if(controls.fault==='lost'){hits++;throw Error('synthetic lost ACK after commit');}}
   return result;
  };}});}
 const api=createPrismaProofAuthorityStore(client());
 async function seed(){for(const principal of ['local_worker','roost_server'] as const){const r=await api.applyKey(await command(principal));assert.ok(r.ok,JSON.stringify(errors));}}
 return {...f,generation,ownerId,approve,history,command,attachment,api,seed,controls,errors,trace,client,hits:()=>hits,proofDigest};
}
