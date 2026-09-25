import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {workerTicketFingerprint} from '../auth/worker-ticket-principal';
import {attestationNativeFixture,owned,prepare,type Db} from './decision-attestation-native-fixture';
import {nativeDispatchHarness} from './bootstrap-dispatch-native-fixture';
import {createCanonicalBootstrapCompletion,type CanonicalCompletionDependencies} from '../modules/api-keys/bootstrap-canonical-completion';
import {createPrismaWorkerHandoffStore} from '../modules/api-keys/worker-handoff-store';
import {createPrismaWorkerCredentialStore,workerCredentialTransaction} from '../modules/api-keys/worker-credential-store';
import {safeWorkerCredential} from '../modules/api-keys/worker-credential.service';
import {createPrismaTicketLifecycleStore} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {createPrismaBootstrapChannelStore,createBootstrapV2ChannelBinding} from '../modules/api-keys/bootstrap-channel-store';
import type {CanonicalCompletionInput} from '../modules/api-keys/bootstrap-canonical-completion-contract';

export const syntheticSignature=(domain:string,payload:unknown)=>reviewDigest({syntheticPublicEvidence:true,domain,payload}).repeat(2);
export async function acceptCompletionFixture(db:PrismaClient,workspaceId:string,ownerId:string,body:any){
 await owned(db);const decisionId=randomUUID(),previewId=randomUUID();
 await prepare(db,async tx=>{
  await tx.decision.create({data:{id:decisionId,workspaceId,title:'Synthetic completion authority',status:'accepted',source:'native_fixture'}});
  await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
   VALUES(${decisionId}::uuid,${workspaceId}::uuid,1,${JSON.stringify(body)}::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
  await tx.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
   VALUES(${previewId}::uuid,${decisionId}::uuid,${workspaceId}::uuid,1,'{}'::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
  await tx.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority,created_at)
   VALUES(${randomUUID()}::uuid,${decisionId}::uuid,${workspaceId}::uuid,${previewId}::uuid,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)},'{"status":"owner_reserved"}'::jsonb,clock_timestamp())`;
 });return decisionId;
}
export async function prepareCompletionSources(db:PrismaClient,prior?:NonNullable<Parameters<typeof attestationNativeFixture>[1]>['prior'],baselineCredential?:any){
 await owned(db);const inertVerifier=reviewDigest({inertVerifierOnly:randomUUID()}),fingerprint=workerTicketFingerprint(inertVerifier),handoffId=randomUUID();
 let approval:any,credentialExpiry:string;
 const f=await attestationNativeFixture(db,{prior,completionPreparation:{fingerprint,baselineCredential,prepare:async reg=>{
  const i=reg.identity,t=reg.record.signed.payload,b=i.binding,now=new Date(),iso=(ms:number)=>new Date(now.getTime()+ms).toISOString();credentialExpiry=iso(300000);
  const binding={requestId:handoffId,requestDigest:reviewDigest({fixture:handoffId}),hostFingerprint:b.hostFingerprint,
   origin:t.intent.channel.profile.origin,certificateFingerprint:t.intent.channel.profile.certificate.fingerprint,replacesRequestId:null};
  const baseline=t.intent.baseline.credential,intent={schemaVersion:'worker-credential-lifecycle-v1',action:'enroll',workspaceId:b.workspaceId,installationId:b.installationId,hostId:b.hostId,
   expectedCredentialId:baseline?.id??null,expectedVersion:baseline?.version??0,expectedEpoch:t.intent.baseline.credentialHighWater,expectedFingerprint:baseline?.fingerprint??null,
   expiresAt:credentialExpiry,validUntil:iso(100000),handoff:binding};
  approval={requestId:randomUUID(),decisionId:await acceptCompletionFixture(db,b.workspaceId,i.ownerId,{workerCredential:intent}),decisionRevision:1,explicitAcceptance:true,intent};
  await prepare(db,async tx=>{
   // An inert verifier hash, with no corresponding secret, is source data only.
   // No credential generator, handoff poll/delivery, private key or signer runs.
   await tx.apiKey.create({data:{id:t.intent.target.id,workspaceId:b.workspaceId,name:'Inert native completion verifier',keyHash:inertVerifier,keyPrefix:'synthetic',
    scopes:['agent-runtime:claim'],active:false,workerHostId:b.hostId,workerInstallationId:b.installationId,workerBindingEpoch:t.intent.target.epoch,credentialVersion:1,expiresAt:new Date(credentialExpiry)}});
   const placeholder=reviewDigest({inertHandoff:handoffId});
   await tx.$executeRaw`INSERT INTO worker_credential_handoffs(id,workspace_id,installation_id,host_id,host_fingerprint,device_secret_hash,challenge_hash,request_digest,user_code_hash,
    origin,certificate_fingerprint,state,owner_user_id,owner_auth_time,approval_command,credential_id,response_digest,spent_at,ack_deadline,created_at,expires_at)
    VALUES(${handoffId}::uuid,${b.workspaceId}::uuid,${b.installationId}::uuid,${b.hostId}::uuid,${b.hostFingerprint},${placeholder},${placeholder},${binding.requestDigest},${placeholder},
     ${binding.origin},${binding.certificateFingerprint},'awaiting_ack',${i.ownerId}::uuid,${Math.floor(now.getTime()/1000)}::bigint,${JSON.stringify(approval)}::jsonb,
     ${t.intent.target.id}::uuid,${reviewDigest({inertResponse:handoffId})},${now},${new Date(iso(60000))},${now},${new Date(iso(120000))})`;
  });
 }}});
 return {f,handoffId,approval,credentialExpiry:credentialExpiry!};
}
export async function completionRecoveryPrior(db:PrismaClient){
 const s=await prepareCompletionSources(db),b=s.f.reg.identity.binding,kid=s.f.reg.record.signed.payload.intent.target.id;
 const old=await db.apiKey.findUniqueOrThrow({where:{id:kid}}),safe=safeWorkerCredential(old);
 const intent={schemaVersion:'worker-credential-lifecycle-v1' as const,action:'revoke' as const,workspaceId:b.workspaceId,installationId:b.installationId,hostId:b.hostId,
  expectedCredentialId:kid,expectedVersion:safe.version,expectedEpoch:safe.epoch,expectedFingerprint:safe.fingerprint,expiresAt:null,validUntil:new Date(Date.now()+60000).toISOString()};
 const command={requestId:randomUUID(),decisionId:await acceptCompletionFixture(db,b.workspaceId,s.f.reg.identity.ownerId,{workerCredential:intent}),decisionRevision:1,explicitAcceptance:true as const,intent};
 await createPrismaWorkerCredentialStore(db).transaction(async tx=>{const current=await tx.latest(b.workspaceId,b.hostId);assert.ok(current);
  const revoked=await tx.revoke(current,new Date());await tx.record(command,s.f.reg.identity.ownerId,reviewDigest(command),revoked,new Date());});
 await createPrismaWorkerHandoffStore(db).transaction(async tx=>{const h=await tx.handoff(s.handoffId);assert.ok(h);h.state='revoked';await tx.saveHandoff(h);await tx.handoffAudit(h,'revoked');});
 const channelOperation=randomUUID();
 try{await createPrismaBootstrapChannelStore(db).transition({ticketId:s.f.reg.identity.ticketId,operationId:channelOperation,expectedRevision:1,action:'revoke'});}
 catch(e:any){assert.equal(e.code,'reconciliation_required');
  // The legacy store's fence equality predates the opt-in attestation receipts.
  // Never retry its write. Reconcile this owned fixture from the actual row,
  // current head and original native receipt, including the exact writer XID.
  const proof=await db.$queryRaw<any[]>`SELECT (h.state='revoked' AND h.revision=2 AND head.history_id=h.id
   AND a.writer_xid=h.writer_xid AND a.row_digest=encode(sha256(convert_to(to_jsonb(h)::text,'UTF8')),'hex')
   AND h.record_digest=encode(sha256(convert_to(h.record::text,'UTF8')),'hex')) AS verified
   FROM worker_transport_history h JOIN worker_transport_write_audit a ON a.table_name='worker_transport_history' AND a.row_id=h.id::text
   JOIN worker_transport_heads head ON head.history_id=h.id WHERE h.id=${channelOperation}::uuid`;
  assert.equal(proof.length,1);assert.equal(proof[0].verified,true);
 }
 const store=createPrismaTicketLifecycleStore(db,()=>new Date(),{channel:createBootstrapV2ChannelBinding(),verifier:{qualification:'worker_bootstrap_ticket_verifier_v2',verify:async(_tx,r)=>reviewDigest(r.signed)===reviewDigest(s.f.reg.record.signed)}});
 const status=await store.inspect({ticketId:s.f.reg.identity.ticketId});assert.ok(status.ok);
 await store.transition({ticketId:s.f.reg.identity.ticketId,operationId:randomUUID(),action:'revoke',expectedRevision:status.head.revision,expectedFence:status.fence});
 const final=await store.inspect({ticketId:s.f.reg.identity.ticketId});assert.ok(final.ok);
 const key=safeWorkerCredential(await db.apiKey.findUniqueOrThrow({where:{id:kid}}));
 return {prior:{base:s.f.sourceFixture,identity:s.f.reg.identity,head:final.head,digest:final.digest},baselineCredential:{id:key.id,version:key.version,epoch:key.epoch,fingerprint:key.fingerprint}};
}
export async function nativeCompletionHarness(db:PrismaClient,clients:PrismaClient[],recovery=false){
 const prior=recovery?await completionRecoveryPrior(db):undefined,s=await prepareCompletionSources(db,prior?.prior,prior?.baselineCredential),f=s.f;
 await f.ready();for(const kind of ['attest','seal'])assert.equal((await f.ports.execute(await f.command(kind))).ok,true,JSON.stringify(f.errors));
 const attempt=(await db.$queryRaw<any[]>`SELECT id FROM worker_bootstrap_attempts WHERE ticket_id=${f.q.ticketId}::uuid`)[0].id;
 const dispatch=nativeDispatchHarness(db,clients,f,attempt);await dispatch.through('completion_started');dispatch.clear();
 const controls={fault:'',atWrite:0,verify:'',provider:false,mutateChild:undefined as ((values:any[])=>void)|undefined,
  afterProvider:undefined as ((tx:Db)=>Promise<void>)|undefined,beforeCommit:undefined as ((tx:Db)=>Promise<void>)|undefined};
 const writes:string[]=[],errors:string[]=[],verifications:{kind:string;db:Db}[]=[],providers:Db[]=[];let committed=false,faultHits=0,injecting=false;
 async function input(){const now=new Date().toISOString(),t=f.reg.record.signed.payload,i=f.reg.identity,profile=t.intent.channel.profile,
  status=await dispatch.adapter.inspect(dispatch.scope);assert.ok(status.ok);assert.ok(status.lastReceipt);
  const peerPayload={binding:i.binding,attemptId:attempt,ticketDigest:i.ticketDigest,certificateEpoch:t.intent.channel.certificateEpoch,origin:profile.origin,serverName:profile.serverName,
   pin:profile.certificate.fingerprint,caDigest:profile.trust.caDigest,certificateNotBefore:profile.certificate.notBefore,certificateNotAfter:profile.certificate.notAfter,
   addresses:['8.8.8.8'],peerAddress:'8.8.8.8',observedAt:now,expiresAt:new Date(Date.now()+29000).toISOString(),resolverPolicy:'public_ipv4_only_v1' as const,
   source:'issuer_signed_peer_observation_v1' as const,chainValid:true as const,hostnameValid:true as const,proxy:false as const,redirect:false as const,downgrade:false as const};
  const peer={payload:peerPayload,signature:syntheticSignature('roost-worker-bootstrap-v1:peer',peerPayload)};
  const payload={version:'worker-bootstrap-completion-v1' as const,attemptId:attempt,ticketDigest:i.ticketDigest,requestId:t.intent.requestId,state:'acknowledged' as const,
   credential:t.intent.target,peer:peerPayload,responseDigest:status.head!.responseDigest!,committedAt:now};
  const completion={payload,signature:syntheticSignature('roost-worker-bootstrap-v1:completion',payload)},handoff=await createPrismaWorkerHandoffStore(db).readHandoff!(s.handoffId);assert.ok(handoff);
  const binding={version:'roost-bootstrap-canonical-completion-v1' as const,command:await dispatch.command('complete'),dispatchPredecessor:status.lastReceipt,
   sealDigest:status.authority.sealDigest,ticketEnvelopeDigest:i.ticketDigest,requestId:t.intent.requestId,hostGeneration:i.hostGeneration,installationGeneration:i.installationGeneration,
   credential:t.intent.target,handoffId:s.handoffId,handoffResponseDigest:handoff.responseDigest!,credentialApprovalDigest:reviewDigest(s.approval),
   peerDigest:reviewDigest(peer),completionDigest:reviewDigest(completion),issuedAt:now,completedAt:now};
  return {peer,completion,binding:{payload:binding,signature:syntheticSignature(binding.version,binding)}} satisfies CanonicalCompletionInput;
 }
 function factory(clientIndex?:number){const transaction=dispatch.transactionFor(clientIndex);
  const deps:CanonicalCompletionDependencies={qualification:'source_only_canonical_completion_v1',decisionAuthority:dispatch.reader,
   transaction:async(mode,work)=>transaction(mode,async base=>{
    let n=0;const proxy=new Proxy(base,{get(target,key){const value=Reflect.get(target,key);
     if(key==='$queryRaw'||key==='$executeRaw')return async(...args:any[])=>{
      const sql=(Array.isArray(args[0])?args[0].join('?'):args[0].sql).replace(/\s+/g,' ').trim();
      if(sql.startsWith('INSERT INTO worker_bootstrap_completions')&&controls.mutateChild){const values=args.slice(1);controls.mutateChild(values);args=[args[0],...values];}
      try{const result=await (value as any).apply(target,args);
       if(!injecting&&/^(INSERT|UPDATE)\b/.test(sql)){assert.equal(mode,'write');writes.push(sql.split(' ').slice(0,3).join(' '));n++;
        if(n===controls.atWrite){faultHits++;throw Error('native completion statement rollback');}}
       if(mode==='read'&&committed&&sql.includes('FROM worker_bootstrap_completions c')){
        if(controls.fault==='readback'){faultHits++;throw Error('native completion readback unavailable');}
        if(controls.fault==='missing'){faultHits++;return [];}
        if(controls.fault==='mismatch'&&result[0]){faultHits++;result[0].receipt.inputDigest='f'.repeat(64);}
       }return result;
      }catch(e:any){errors.push(String(e.meta?.code??e.code??'error')+':'+String(e.meta?.message??e.message).slice(0,600));throw e;}
     };return typeof value==='function'?value.bind(target):value;}});
    dispatch.active.add(proxy);let result;try{result=await work(proxy);}catch(e:any){errors.push(String(e.stack??e.message).split("\n").slice(0,5).join("\n"));throw e;}finally{dispatch.active.delete(proxy);}
    if(mode==='write'&&n){await controls.beforeCommit?.(base);committed=true;}return result;
   }),verifier:{qualification:'injected_bootstrap_completion_verifier_v1',verify:async(tx,r)=>{assert.ok(dispatch.active.has(tx));verifications.push({kind:r.kind,db:tx});return controls.verify!==r.kind&&r.signature===syntheticSignature(r.domain,r.payload);}},
   credentialFacts:{qualification:'injected_canonical_credential_possession_v1',inspect:async(tx,r)=>{
    assert.ok(dispatch.active.has(tx));providers.push(tx);const actual=await workerCredentialTransaction(tx).latest(f.reg.identity.binding.workspaceId,f.reg.identity.binding.hostId);assert.ok(actual);
    const publicFact=safeWorkerCredential(actual),{id,version,epoch,fingerprint,...rest}=publicFact;
    assert.deepEqual({credential:{id,version,epoch,fingerprint},...rest},r.context.credential);
    injecting=true;try{await controls.afterProvider?.(tx);}finally{injecting=false;}
    return {credential:r.context.credential,handoffId:s.handoffId,inputDigest:reviewDigest(r.input),fence:r.context.fence,possessionVerified:!controls.provider};
   }}};return createCanonicalBootstrapCompletion(deps);
 }
 return {f,s,dispatch,controls,writes,errors,verifications,providers,input,factory,faultHits:()=>faultHits,
  async fact(){const k=safeWorkerCredential(await db.apiKey.findUniqueOrThrow({where:{id:f.reg.record.signed.payload.intent.target.id}}));
   const h=await createPrismaWorkerHandoffStore(db).readHandoff!(s.handoffId);return {key:k,handoffState:h?.state,acknowledgedAt:h?.acknowledgedAt,
    completions:(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_bootstrap_completions WHERE attempt_id=${attempt}::uuid`)[0].n};}};
}
export type NativeCompletionHarness=Awaited<ReturnType<typeof nativeCompletionHarness>>;
