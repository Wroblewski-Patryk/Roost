// Historical v59/v60 reader qualification harness ONLY. No runtime export.
import {z} from 'zod';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {createCanonicalBootstrapAuthoritySource} from '../modules/api-keys/worker-bootstrap-authority-source';
import {decisionAuthorityRequest,isDecisionAuthorityReader,type DecisionAuthorityRead} from '../modules/api-keys/bootstrap-decision-authority-reader';
import {exact,denyAttestation as deny,type AttestationDb as Db} from '../modules/api-keys/decision-attestation-sql';


const command=decisionAuthorityRequest.extend({attemptId:z.string().uuid()}).strict();
// Source qualification only. This process-local latch is NOT durable dispatch
// authority. Native atomic dispatch/complete and multi-process restart safety
// require a separately qualified integration before any production composition.
const attempted=new Set<string>();
export type AttestedCompositionDependencies={qualification:'synthetic_attested_composition_v1';decisionAuthority:unknown;
 readTransaction:<T>(work:(db:Db)=>Promise<T>)=>Promise<T>;
 exchange:(proof:Readonly<DecisionAuthorityRead>)=>Promise<unknown>;
 complete:(reply:unknown,proof:Readonly<DecisionAuthorityRead>)=>Promise<void>;
};
export function createAttestedBootstrapComposition(deps?:AttestedCompositionDependencies){
 const source=createCanonicalBootstrapAuthoritySource(undefined,undefined,deps?.decisionAuthority),seen=new WeakSet<object>();
 const valid=()=>{if(deps?.qualification!=='synthetic_attested_composition_v1'||!isDecisionAuthorityReader(deps.decisionAuthority)||
  typeof deps.readTransaction!=='function'||typeof deps.exchange!=='function'||typeof deps.complete!=='function')deny();};
 async function read(input:unknown){valid();const q=decisionAuthorityRequest.parse(input);let entered=false,observed:DecisionAuthorityRead|undefined;
  const result=await deps!.readTransaction(async db=>{
   if(entered||seen.has(db))deny();entered=true;seen.add(db);
   const release=await source.bindTransaction!(db,'read');
   try{observed=await source.inspectDecisionAuthority(db,q);return observed;}finally{release();}
  });
  if(!entered||!observed||result!==observed)deny();return result;
 }
 function same(a:DecisionAuthorityRead,b:DecisionAuthorityRead){
  return exact(a.version,b.version)&&a.projectionDigest===b.projectionDigest&&exact(a.seal,b.seal);
 }
 async function pair(q:z.infer<typeof command>){const {attemptId,...scope}=q,a=await read(scope),b=await read(scope);
  for(const p of [a,b])if(!p.seal||p.seal.attemptId!==attemptId||p.ticketHead.attemptId!==attemptId||p.ticketHead.state!=='consumed')deny();
  if(!same(a,b))deny();return b;
 }
 return Object.freeze({
  async inspect(input:unknown){try{return await read(input);}catch{return {ok:false as const,blocker:'signed_current_decision_unavailable',...lifecycleFlags};}},
  async run(input:unknown){let possibleCommit=false;
   try{valid();const q=command.parse(input),sending=await pair(q);
    // Synchronous before calling any supplied exchange: concurrent callers and
    // new factory instances in this process cannot reuse the same attempt.
    if(attempted.has(q.attemptId)||attempted.size>=10000)deny();attempted.add(q.attemptId);
    possibleCommit=true;const reply=await deps!.exchange(sending),completion=await pair(q);
    if(!same(sending,completion))deny();await deps!.complete(reply,completion);
    return {ok:true as const,qualification:'source_only_synthetic_composition_v1' as const,...lifecycleFlags};
   }catch{return {ok:false as const,error:possibleCommit?'delivery_unknown':'denied',reconciliationRequired:possibleCommit,
    retryable:false as const,...lifecycleFlags};}
  }
 });
}
