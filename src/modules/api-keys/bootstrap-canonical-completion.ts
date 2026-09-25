import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import {attestationDbClock} from './decision-attestation-projection';
import {requireDecisionAttestationGuards} from './decision-attestation-adapter';
import {createCanonicalBootstrapAuthoritySource} from './worker-bootstrap-authority-source';
import {isDecisionAuthorityReader} from './bootstrap-decision-authority-reader';
import {authorityForDispatch} from './bootstrap-dispatch-contract';
import {linkDispatchReceipt} from './bootstrap-dispatch-lineage';
import {readDispatchHistory,requireDispatchGuards,type DispatchDependencies} from './bootstrap-dispatch-prisma';
import {exact,one,type AttestationDb as Db} from './decision-attestation-sql';
import {canonicalCompletionInput,completionContext,completionReceipt,completionDomain,validateCompletion,denyCompletion as deny,
 type CanonicalCompletionInput,type CompletionContext} from './bootstrap-canonical-completion-contract';
import {readCompletion,readCompletionContext,writeCompletion,requireCompletionGuards} from './bootstrap-canonical-completion-sql';

export type CompletionVerification={qualification:'injected_bootstrap_completion_verifier_v1';
 verify:(db:Db,request:Readonly<{domain:string;kind:'peer'|'completion'|'binding';payload:unknown;signature:string;
  input:CanonicalCompletionInput;context:CompletionContext}>)=>Promise<boolean>};
export type CompletionCredentialProvider={qualification:'injected_canonical_credential_possession_v1';
 // Must validate the existing handoff's possession/ACK proof, never infer
 // possession from a public fingerprint, callback success or response digest.
 inspect:(db:Db,request:Readonly<{input:CanonicalCompletionInput;context:CompletionContext}>)=>Promise<unknown>};
export type CanonicalCompletionDependencies=Pick<DispatchDependencies,'transaction'|'decisionAuthority'>&{
 qualification:'source_only_canonical_completion_v1';verifier:CompletionVerification;credentialFacts:CompletionCredentialProvider};

// Explicit opt-in factory only. No HTTP client, signer, key generation, default
// Prisma client, route or existing production composition is installed here.
export function createCanonicalBootstrapCompletion(deps?:CanonicalCompletionDependencies){
 const source=createCanonicalBootstrapAuthoritySource(undefined,undefined,deps?.decisionAuthority),seen=new WeakSet<object>();
 function required(){if(deps?.qualification!=='source_only_canonical_completion_v1'||!isDecisionAuthorityReader(deps.decisionAuthority)||
  typeof deps.transaction!=='function'||deps.verifier?.qualification!=='injected_bootstrap_completion_verifier_v1'||typeof deps.verifier.verify!=='function'||
  deps.credentialFacts?.qualification!=='injected_canonical_credential_possession_v1'||typeof deps.credentialFacts.inspect!=='function')deny();}
 async function transaction<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>){
  required();let entered=false,observed:T|undefined;
  const result=await deps!.transaction(mode,async db=>{
   if(entered||seen.has(db))deny();entered=true;seen.add(db);
   const c=await attestationDbClock(db);
   if(c.isolation!==(mode==='read'?'repeatable read':'serializable')||c.readOnly!==(mode==='read'?'on':'off'))deny();
   await requireDecisionAttestationGuards(db);await requireDispatchGuards(db);await requireCompletionGuards(db);
   observed=await work(db);return observed;
  });if(!entered||observed===undefined||observed!==result)deny();return result;
 }
 const failure=(uncertain:boolean)=>freezePublic({ok:false as const,error:uncertain?'reconciliation_required':'denied',
  completionRecorded:false,credentialActivated:false,reconciliationRequired:uncertain,retryable:false as const,...lifecycleFlags});
 async function committed(db:Db,v:CanonicalCompletionInput){
  const row=await readCompletion(db,v.binding.payload.command.attemptId);
  if(!row)return null;
  if(row.receipt.inputDigest!==reviewDigest(v)||!row.verified)deny();
  return row.receipt;
 }
 return Object.freeze({qualification:'source_only_canonical_completion_v1' as const,
  async inspect(input:unknown){try{required();const v=canonicalCompletionInput.parse(input),receipt=await transaction('read',db=>committed(db,v));
   return freezePublic({ok:true as const,completionRecorded:!!receipt,credentialActivated:!!receipt,receipt,
    reconciliationRequired:false,retryable:false as const,...lifecycleFlags});
  }catch{return failure(false);}},
  async complete(input:unknown){let possibleCommit=false;
   try{
    required();const v=freezePublic(canonicalCompletionInput.parse(input)),c=v.binding.payload.command;
    const scope={attemptId:c.attemptId,ticketId:c.ticketId,decisionId:c.decisionId,binding:c.binding,purpose:c.purpose};
    const before=await transaction('read',async db=>{
     const existing=await committed(db,v);if(existing)return {existing,authority:null};
     const release=await source.bindTransaction!(db,'read');
     try{const {attemptId,...request}=scope;
      return {existing:null,authority:authorityForDispatch(await source.inspectDecisionAuthority(db,request),scope)};
     }finally{release();}
    });
    const existing=before.existing;
    if(existing)return freezePublic({ok:true as const,idempotent:true,receipt:existing,completionRecorded:true,credentialActivated:true,retryable:false as const,...lifecycleFlags});
    const candidate=await transaction('write',async db=>{
     const locked=one(await db.$queryRaw<any[]>`SELECT revision::text AS fence FROM ready_source_fence WHERE id=1 FOR UPDATE`);
     // A contender can observe the winner after obtaining the same global lock.
     const replay=await committed(db,v);if(replay)return {receipt:replay,replayed:true};
     const entries=await readDispatchHistory(db,c.attemptId),head=entries.at(-1);if(!head)deny();
     // The existing authority reader deliberately accepts READ ONLY snapshots.
     // The SAME source fence is now locked; no authority writer can interleave.
     if(!before.authority||!exact(before.authority,head!.record.authority)||locked.fence!==before.authority.version.fence)deny();
     const raw=await readCompletionContext(db,v),clock=await attestationDbClock(db);
     const context=freezePublic(completionContext.parse({...raw,dispatch:head!.record,dispatchReceipt:linkDispatchReceipt(head!),
      fence:clock.fence,at:new Date(clock.at).toISOString()}));
     validateCompletion(v,context);
     const unchanged=async()=>{const next=await readCompletionContext(db,v),now=await attestationDbClock(db);
      if(now.fence!==clock.fence||!exact(raw,next))deny();
      validateCompletion(v,{...context,at:new Date(now.at).toISOString()});};
     for(const kind of ['peer','completion','binding'] as const){
      const signed=kind==='binding'?v.binding:v[kind];
      if(await deps!.verifier.verify(db,freezePublic({kind,domain:kind==='binding'?completionDomain:`roost-worker-bootstrap-v1:${kind}`,
       payload:signed.payload,signature:signed.signature,input:v,context}))!==true)deny();await unchanged();
     }
     const fact=await deps!.credentialFacts.inspect(db,freezePublic({input:v,context}));
     if(!exact(fact,{credential:context.credential,handoffId:context.handoff.id,inputDigest:reviewDigest(v),
      fence:context.fence,possessionVerified:true}))deny();await unchanged();
     possibleCommit=true;
     return {receipt:completionReceipt.parse(await writeCompletion(db,v,context)),replayed:false};
    });
    const receipt=await transaction('read',db=>committed(db,v));
    if(!receipt||!exact(receipt,candidate.receipt))deny();
    return freezePublic({ok:true as const,idempotent:candidate.replayed,receipt,completionRecorded:true,credentialActivated:true,retryable:false as const,...lifecycleFlags});
   }catch{return failure(possibleCommit);}
  }
 });
}
