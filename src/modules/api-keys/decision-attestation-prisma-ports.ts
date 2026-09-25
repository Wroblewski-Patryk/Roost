import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {attestationKeyMaterial,nextAttestationKeyEvent,attestationDigest} from './decision-attestation-key-model';
import {attestationPayload,ownerAuthenticationEvidence,AttestationCommitUnknown} from './decision-attestation-persistence-model';
import {requireDecisionAttestationGuards} from './decision-attestation-adapter';
import {projectDecisionAttestation,attestationDbClock,type NativeAttestationProjection} from './decision-attestation-projection';
import {attestationScope,positiveText,sqlHash,exact,one,safeCount,readAttestationOperation,denyAttestation as deny,
 type AttestationScope,type AttestationDb as Db,type SqlMutationReceipt} from './decision-attestation-sql';
import {advanceTicketLifecycle,lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import {persistedBootstrapAttempt,persistedBootstrapHistory} from './worker-bootstrap-persistence-contract';

const id=z.string().uuid(),time=z.string().datetime(),expected=z.object({authorityRevision:positiveText,fence:positiveText,digest:sqlHash}).strict();
const base=attestationScope.extend({operationId:id,expected});
const keyOperation=z.object({id,action:z.enum(['create','adopt','stage','cutover','retire','revoke']),keyId:id,material:attestationKeyMaterial.nullable(),
 overlapStartsAt:time.nullable(),cutoverAt:time.nullable()}).strict();
export const nativeAttestationCommand=z.discriminatedUnion('kind',[
 base.extend({kind:z.literal('key'),operation:keyOperation}).strict(),base.extend({kind:z.literal('auth')}).strict(),
 base.extend({kind:z.literal('attest')}).strict(),base.extend({kind:z.literal('seal')}).strict(),
 base.extend({kind:z.literal('terminal'),action:z.enum(['supersede','revoke','expire','reject'])}).strict()
]);
export type NativeAttestationCommand=z.infer<typeof nativeAttestationCommand>;
type SignatureEvidence={payload:z.infer<typeof attestationPayload>;payloadDigest:string;publicKey:NativeAttestationProjection['keyProjection']['keys'][number]};
export type NativeAttestationDependencies={
 // The caller owns Prisma and transaction lifetime; the callback is called ONCE.
 transaction:<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>)=>Promise<T>;
 ownerAuthentication?:(db:Db,scope:AttestationScope)=>Promise<unknown>;
 authorizePublicKey?:(db:Db,operation:Readonly<z.infer<typeof keyOperation>>)=>Promise<boolean>;
 signer?:{keyId:string;sign:(db:Db,evidence:Readonly<SignatureEvidence>)=>Promise<string>};
 verifier?:{verify:(db:Db,evidence:Readonly<SignatureEvidence&{signature:string}>)=>Promise<boolean>};
 ticketVerifier?:{verify:(db:Db,registration:Readonly<NativeAttestationProjection['registration']>)=>Promise<boolean>};
};
const json=JSON.stringify;
const concretePorts=new WeakSet<object>();
export function isConcreteDecisionAttestationPorts(value:unknown):value is ReturnType<typeof createPrismaDecisionAttestationPorts>{
 return typeof value==='object'&&value!==null&&concretePorts.has(value);
}
function requireCurrent(p:NativeAttestationProjection){if(!p.usable||p.terminal)deny();}
function authCurrent(p:NativeAttestationProjection,at:string){const a=p.auth;
 if(!a||Date.parse(at)-Date.parse(a.authTime)>300000||Date.parse(a.authTime)>Date.parse(at))deny();return a!;}
function unsignedCeremony(payload:z.infer<typeof attestationPayload>){const {version,authorityRevision,ownerAuthEvidenceDigest,ownerAuthLevel,
 signingKeyId,signingKeyRevision,signingKeyEpoch,signingPublicKeyDigest,signingKeyHistoryDigest,...ceremony}=payload;return ceremony;}

// Concrete native-row ports, separate from the v51 synthetic journal oracle.
// No client/connection/transaction manager is constructed. No default factory
// is installed in runtime. The supplied runner MUST provide fresh transactions.
export function createPrismaDecisionAttestationPorts(deps:NativeAttestationDependencies){
 const sessions=new WeakMap<object,{mode:'read'|'write';fence:string;used:boolean}>();
 async function bind(db:Db,mode:'read'|'write'){
  if(sessions.has(db))deny();await requireDecisionAttestationGuards(db);
  const c=await attestationDbClock(db);if(c.isolation!==(mode==='read'?'repeatable read':'serializable')||c.readOnly!==(mode==='read'?'on':'off'))deny();
  if(mode==='write'){const lock=one(await db.$queryRaw<any[]>`SELECT revision::text AS fence FROM ready_source_fence WHERE id=1 FOR UPDATE`);if(lock.fence!==c.fence)deny();}
  sessions.set(db,{mode,fence:c.fence,used:false});
 }
 async function bound(db:Db,mode?:'read'|'write'){
  const s=sessions.get(db);if(!s||mode&&s.mode!==mode)deny();const c=await attestationDbClock(db);
  if(c.fence!==s!.fence||c.readOnly!==(s!.mode==='read'?'on':'off')||c.isolation!==(s!.mode==='read'?'repeatable read':'serializable'))deny();return c;
 }
 async function projectCanonical(db:Db,q:AttestationScope){await bound(db);const p=await projectDecisionAttestation(db,q);await bound(db);return p;}
 async function ticket(db:Db,p:NativeAttestationProjection){if(!deps.ticketVerifier||await deps.ticketVerifier.verify(db,freezePublic(p.registration))!==true)deny();await bound(db);}
 async function currentAttestation(db:Db,p:NativeAttestationProjection){
  requireCurrent(p);const a=one(p.attestations.filter(a=>String(a.record.payload.authorityRevision)===p.version.authorityRevision)),b=a.record.payload;
  const key=p.keyProjection.usable.find(k=>k.material.keyId===b.signingKeyId),auth=p.auth;
  if(!key||!auth||!exact(unsignedCeremony(b),p.ceremony)||b.ownerAuthEvidenceDigest!==attestationDigest('owner-decision-auth-evidence-v1',auth)||
   b.ownerAuthLevel!==auth.level||key.historyDigest!==b.signingKeyHistoryDigest||key.revision!==b.signingKeyRevision||key.material.epoch!==b.signingKeyEpoch||
   key.material.publicKeyDigest!==b.signingPublicKeyDigest||!deps.verifier||await deps.verifier.verify(db,freezePublic({payload:b,
    payloadDigest:attestationDigest('owner-decision-attestation-payload-v1',b),publicKey:key,signature:a.record.signature}))!==true)deny();
  await bound(db);return a;
 }
 async function unchanged(db:Db,p:NativeAttestationProjection){const fresh=await projectCanonical(db,p.scope);if(!exact(fresh.version,p.version))deny();return fresh;}
 async function insertLifecycle(db:Db,e:ReturnType<typeof advanceTicketLifecycle>){
  await db.$executeRaw`INSERT INTO worker_bootstrap_lifecycle_events(id,ticket_id,revision,previous_digest,record,record_digest,attempt_id,history_id,writer_xid)
   VALUES(${e.id}::uuid,${e.ticketId}::uuid,${e.revision},${e.previousDigest},${json(e)}::jsonb,${reviewDigest(e)},${e.attemptId}::uuid,${e.historyId}::uuid,pg_current_xact_id()::text)`;
 }
 async function appendChildren(db:Db,input:NativeAttestationCommand){
  const command=nativeAttestationCommand.parse(input),q=attestationScope.parse({decisionId:command.decisionId,ticketId:command.ticketId});
  await bound(db,'write');const session=sessions.get(db)!;if(session.used)deny();session.used=true;
  let p=await projectCanonical(db,q);if(!exact(command.expected,p.version)||p.terminal)deny();
  // Key revocation and terminal invalidation remain possible after expiry.
  if(command.kind!=='terminal'&&command.kind!=='key')requireCurrent(p);
  if(command.kind==='attest'||command.kind==='seal')await ticket(db,p);
  let record:unknown,table:string,revision=safeCount(p.version.authorityRevision),required:string[];
  if(command.kind==='key'){
   if(command.operation.id!==command.operationId||!deps.authorizePublicKey||await deps.authorizePublicKey(db,freezePublic(command.operation))!==true)deny();
   p=await unchanged(db,p);const c=await bound(db,'write');
   // nextAttestationKeyEvent has a Date API; replace only its generated timestamp
   // with the exact database clock string before hashing or inserting.
   const e={...nextAttestationKeyEvent(p.keys,{workspaceId:p.ceremony.binding.workspaceId,installationId:p.ceremony.binding.installationId},command.operation,new Date(c.at)),at:c.at};
   record=e;table='decision_attestation_key_history';required=[table];
   const epoch=e.material?.epoch??p.keyProjection.keys.find(k=>k.material.keyId===e.keyId)?.material.epoch;if(!epoch)deny();
   const mutation=reviewDigest({domain:'owner-decision-sql-mutation-v1',command,record});
   await db.$executeRaw`INSERT INTO decision_attestation_key_history(id,workspace_id,installation_id,key_id,revision,epoch,action,record,record_digest,writer_xid,mutation_digest)
    VALUES(${e.id}::uuid,${e.workspaceId}::uuid,${p.ceremony.binding.installationId}::uuid,${e.keyId}::uuid,${e.revision},${epoch},${e.action},${json(e)}::jsonb,'','',${mutation})`;
  }else if(command.kind==='auth'){
   if(p.auth||!deps.ownerAuthentication)deny();const a=ownerAuthenticationEvidence.parse(await deps.ownerAuthentication!(db,q));p=await unchanged(db,p);
   const c=await bound(db,'write'),accepted=p.registration.record.decision.payload.acceptedAt;
   if(a.workspaceId!==p.ceremony.binding.workspaceId||a.ownerId!==p.ceremony.ownerId||a.acceptanceId!==p.ceremony.acceptanceId||a.acceptedAt!==accepted||
    a.policyRevision!==p.policy.revision||Date.parse(a.authTime)>Date.parse(accepted)||Date.parse(a.authTime)>Date.parse(c.at)||Date.parse(c.at)-Date.parse(a.authTime)>300000)deny();
   record=a;table='decision_owner_auth_evidence';required=[table,'decision_authority_events'];revision++;
   const mutation=reviewDigest({domain:'owner-decision-sql-mutation-v1',command,record});
   await db.$executeRaw`INSERT INTO decision_owner_auth_evidence(id,decision_id,acceptance_id,workspace_id,record,record_digest,writer_xid,mutation_digest)
    VALUES(${command.operationId}::uuid,${q.decisionId}::uuid,${a.acceptanceId}::uuid,${a.workspaceId}::uuid,${json(a)}::jsonb,'','',${mutation})`;
  }else if(command.kind==='attest'){
   if(p.attestations.length||p.attempts.length||!deps.signer||!deps.verifier)deny();const auth=authCurrent(p,(await bound(db)).at);
   const key=p.keyProjection.usable.find(k=>k.material.keyId===deps.signer!.keyId);if(!key||Date.parse(p.ceremony.validFrom)<Date.parse(key.material.validFrom)||
    Date.parse(p.ceremony.expiresAt)>Date.parse(key.material.expiresAt))deny();revision++;
   const payload=attestationPayload.parse({...p.ceremony,version:'owner-decision-attestation-v1',authorityRevision:revision,
    ownerAuthEvidenceDigest:attestationDigest('owner-decision-auth-evidence-v1',auth),ownerAuthLevel:auth.level,signingKeyId:key!.material.keyId,
    signingKeyRevision:key!.revision,signingKeyEpoch:key!.material.epoch,signingPublicKeyDigest:key!.material.publicKeyDigest,signingKeyHistoryDigest:key!.historyDigest});
   const evidence=freezePublic({payload,payloadDigest:attestationDigest('owner-decision-attestation-payload-v1',payload),publicKey:key!});
   const signature=z.string().regex(/^[a-f0-9]{128}$/).parse(await deps.signer!.sign(db,evidence));
   if(await deps.verifier!.verify(db,freezePublic({...evidence,signature}))!==true)deny();p=await unchanged(db,p);requireCurrent(p);
   const c=await bound(db);authCurrent(p,c.at);if(!p.keyProjection.usable.some(k=>k.material.keyId===payload.signingKeyId))deny();
   record={id:command.operationId,payload,signature,at:c.at};table='decision_attestations';required=[table,'decision_authority_events'];
   const keyEvent=one(p.keys.filter(k=>k.keyId===payload.signingKeyId&&k.material!==null));
   const mutation=reviewDigest({domain:'owner-decision-sql-mutation-v1',command,record});
   await db.$executeRaw`INSERT INTO decision_attestations(id,decision_id,acceptance_id,auth_evidence_id,workspace_id,key_event_id,authority_revision,record,record_digest,writer_xid,mutation_digest)
    VALUES(${command.operationId}::uuid,${q.decisionId}::uuid,${p.ceremony.acceptanceId}::uuid,${p.authId}::uuid,${p.ceremony.binding.workspaceId}::uuid,
     ${keyEvent.id}::uuid,${revision},${json(record)}::jsonb,'','',${mutation})`;
  }else if(command.kind==='terminal'){
   if(!deps.ownerAuthentication)deny();const auth=ownerAuthenticationEvidence.parse(await deps.ownerAuthentication!(db,q));p=await unchanged(db,p);
   if(auth.ownerId!==p.ceremony.ownerId||auth.acceptanceId!==p.ceremony.acceptanceId||auth.workspaceId!==p.ceremony.binding.workspaceId||auth.acceptedAt!==p.registration.record.decision.payload.acceptedAt||
    auth.policyRevision!==p.policy.revision||Date.parse((await bound(db)).at)-Date.parse(auth.authTime)>300000||Date.parse(auth.authTime)>Date.parse((await bound(db)).at))deny();
   if(command.action==='expire'&&Date.parse((await bound(db)).at)<Date.parse(p.ceremony.expiresAt))deny();
   const root=one(p.objects.filter(o=>o.table==='decisions'));record={action:command.action,sourceDigest:root.digest};
   table='decision_authority_events';required=[table];revision++;
   const mutation=reviewDigest({domain:'owner-decision-sql-mutation-v1',command,record});
   await db.$executeRaw`INSERT INTO decision_authority_events(id,workspace_id,decision_id,revision,action,source_table,source_row,source_digest,record_digest,fence_revision,writer_xid,at,mutation_digest)
    VALUES(${command.operationId}::uuid,${p.ceremony.binding.workspaceId}::uuid,${q.decisionId}::uuid,1,${command.action},'decisions',${q.decisionId},${root.digest},'',1,'',clock_timestamp(),${mutation})`;
  }else{
   if(p.attempts.length||!['issued','reserved'].includes(p.ticketHead.state))deny();const att=await currentAttestation(db,p);p=await unchanged(db,p);requireCurrent(p);
   const lineage=one(await db.$queryRaw<any[]>`SELECT decision_attestation_lineage(${q.ticketId}::uuid,${p.version.fence}::bigint) AS "sealLineage"`);
   if(lineage.sealLineage!==true)deny();await bound(db,'write');
   if(!p.keyProjection.usable.some(k=>k.material.keyId===att.record.payload.signingKeyId))deny();
   const c=await bound(db),i=p.registration.identity,t=p.registration.record.signed.payload,attemptId=command.operationId;
   const a=persistedBootstrapAttempt.parse({id:attemptId,ticketId:q.ticketId,ticketDigest:i.ticketDigest,decisionId:q.decisionId,requestId:t.intent.requestId,
    binding:i.binding,target:t.intent.target,state:'consumed',expiresAt:i.expiresAt});
   const seal={version:'owner-decision-attempt-seal-v1',attemptId,ticketId:q.ticketId,attestationId:att.row.id,attestationDigest:att.row.record_digest,
    authorityRevision:revision,sourceFence:p.version.fence,sourceDigest:p.version.digest,bindings:att.record.payload,state:'started'};
   record=seal;table='worker_bootstrap_attempts';required=[table,'worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events'];
   const mutation=reviewDigest({domain:'owner-decision-sql-mutation-v1',command,record});
   let previous=p.ticketHead,previousDigest=p.ticketDigest;
   // Preserve the existing millisecond lifecycle wire format. The exact DB
   // clock remains the authority; six-digit timestamps belong to new rows only.
   if(previous.state==='issued'){const e=advanceTicketLifecycle(i,previous,previousDigest,{id:randomUUID(),action:'reserve',attemptId:null,historyId:null},new Date(c.at));
    previous=e;previousDigest=reviewDigest(previous);await insertLifecycle(db,previous);}
   // Same bound Db as reservation, history, head and automatic audits. No nested
   // store.transaction or standalone attempt registry, no dispatch/send seam.
   await db.$executeRaw`INSERT INTO worker_bootstrap_attempts(id,ticket_id,workspace_id,host_id,generation,credential_epoch,predecessor_id,record,record_digest,lifecycle_version,
    attestation_id,attestation_seal,attestation_committed_at,attestation_mutation_digest)
    VALUES(${a.id}::uuid,${a.ticketId}::uuid,${i.binding.workspaceId}::uuid,${i.binding.hostId}::uuid,${i.generation},${i.credentialEpoch},${i.predecessor?.attemptId??null}::uuid,
     ${json(a)}::jsonb,${reviewDigest(a)},${i.version},${att.row.id}::uuid,${json(seal)}::jsonb,clock_timestamp(),${mutation})`;
   const h=persistedBootstrapHistory.parse({id:randomUUID(),attemptId,revision:1,previousDigest:null,previousState:null,state:'consumed',createdAt:c.at,peer:null,completion:null});
   await db.$executeRaw`INSERT INTO worker_bootstrap_history(id,attempt_id,revision,state,record,record_digest,previous_revision,previous_digest,previous_state)
    VALUES(${h.id}::uuid,${attemptId}::uuid,1,'consumed',${json(h)}::jsonb,${reviewDigest(h)},NULL,NULL,NULL)`;
   await db.$executeRaw`INSERT INTO worker_bootstrap_heads(workspace_id,host_id,attempt_id,history_id,generation,credential_epoch,revision,record_digest,state)
    VALUES(${i.binding.workspaceId}::uuid,${i.binding.hostId}::uuid,${attemptId}::uuid,${h.id}::uuid,${i.generation},${i.credentialEpoch},1,${reviewDigest(h)},'consumed')
    ON CONFLICT(workspace_id,host_id) DO UPDATE SET attempt_id=EXCLUDED.attempt_id,history_id=EXCLUDED.history_id,generation=EXCLUDED.generation,
    credential_epoch=EXCLUDED.credential_epoch,revision=EXCLUDED.revision,record_digest=EXCLUDED.record_digest,state=EXCLUDED.state`;
   const e=advanceTicketLifecycle(i,previous,previousDigest,{id:randomUUID(),action:'consume',attemptId,historyId:h.id},new Date(c.at));
   await insertLifecycle(db,e);
  }
  await requireDecisionAttestationGuards(db);const after=await attestationDbClock(db);session.fence=after.fence;
  const persisted=await projectCanonical(db,q);if(persisted.version.authorityRevision!==String(revision))deny();
  const result=await readAttestationOperation(db,q,command.operationId),receipt=result.receipt;
  if(result.operationTable!==table||receipt.mutationDigest!==reviewDigest({domain:'owner-decision-sql-mutation-v1',command,record})||
   receipt.authorityRevision!==String(revision)||receipt.fence!==after.fence||BigInt(receipt.fence)<=BigInt(command.expected.fence)||
   required.some(tbl=>!result.receipts.some(r=>r.table===tbl)))deny();
  if(command.kind==='seal'){
   const actual=result.operationRow.attestation_seal,proposed=record as any;
   if(!exact(actual,{...proposed,sourceFence:actual?.sourceFence})||!positiveText.safeParse(actual?.sourceFence).success||
    BigInt(actual.sourceFence)<=BigInt(command.expected.fence)||BigInt(actual.sourceFence)>BigInt(receipt.fence)||!result.operationRow.attestation_committed_at)deny();
  }else if(command.kind!=='terminal'&&!exact(result.operationRow.record,record))deny();
  await bound(db,'write');return freezePublic(receipt);
 }
 async function readCommittedOperation(db:Db,q:AttestationScope,operationId:string){await bound(db,'read');await requireDecisionAttestationGuards(db);
  const result=await readAttestationOperation(db,q,operationId);await bound(db,'read');return freezePublic(result.receipt);}
 const ports=Object.freeze({qualification:'unapplied_prisma_decision_attestation_ports_v1' as const,bind,projectCanonical,appendChildren,readCommittedOperation,
  // The caller supplies the SAME transaction used by the other authority reads.
  // This surface cannot sign, start an attempt or open a nested transaction.
  async inspectBound(db:Db,input:unknown,expectedFence:string){
   const q=attestationScope.parse(input);await bind(db,'read');
   try{const p=await projectCanonical(db,q);if(p.version.fence!==expectedFence)deny();
    await ticket(db,p);const attestation=await currentAttestation(db,p);
    let attemptReceipt:SqlMutationReceipt|null=null;
    if(p.attempts.length){const attempt=p.attempts[0],operation=await readAttestationOperation(db,q,String(attempt.id));
     if(operation.operationTable!=='worker_bootstrap_attempts'||!exact(operation.operationRow,attempt)||
      operation.receipt.mutationDigest!==attempt.attestation_mutation_digest||
      operation.receipt.authorityRevision!==p.version.authorityRevision||operation.receipt.fence!==p.version.fence)deny();
     attemptReceipt=operation.receipt;
    }
    await unchanged(db,p);return freezePublic({projection:p,attestation,attemptReceipt});
   }finally{sessions.delete(db);}
  },
  async inspect(input:unknown){try{const q=attestationScope.parse(input);return await deps.transaction('read',async db=>{await bind(db,'read');
   try{const p=await projectCanonical(db,q);await ticket(db,p);await currentAttestation(db,p);return {ok:true as const,version:p.version,sealed:!!p.attempts.length,...lifecycleFlags};}
   finally{sessions.delete(db);}});}catch{return {ok:false as const,blocker:'signed_current_decision_unavailable',...lifecycleFlags};}},
  async execute(input:unknown){let entered=false,completed=false,writeDb:Db|undefined,written:SqlMutationReceipt|undefined;
   try{const command=nativeAttestationCommand.parse(input),q={decisionId:command.decisionId,ticketId:command.ticketId};
    const receipt=await deps.transaction('write',async db=>{if(entered)throw new AttestationCommitUnknown();entered=true;writeDb=db;await bind(db,'write');
     try{const r=await appendChildren(db,command);written=r;completed=true;return r;}finally{sessions.delete(db);}});
    if(!completed||!written||!exact(receipt,written))throw new AttestationCommitUnknown();
    await deps.transaction('read',async db=>{if(db===writeDb)deny();await bind(db,'read');try{
     if(!exact(await readCommittedOperation(db,q,command.operationId),receipt))deny();}finally{sessions.delete(db);}});
    return {ok:true as const,receipt,qualification:'source_mocked_ports_only',...lifecycleFlags};
   }catch(e){return {ok:false as const,error:completed||e instanceof AttestationCommitUnknown?'reconciliation_required':'denied',retryable:false as const,...lifecycleFlags};}
  }
 });
 concretePorts.add(ports);return ports;
}
