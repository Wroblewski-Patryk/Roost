'use strict';
// Pure FAILED disposition for an unchanged down entry. This does not admit a
// successor, retry, rollback or release. The owner attests private native closure;
// neither this validator nor the server performs Windows HMAC/OS inspection.
const {z}=require('zod');
function createCompatibleConfigClosureContract(base){
 const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),at=z.string().datetime();
 const d=base.releaseDigest,same=(a,b)=>d(a??null)===d(b??null),check=v=>{if(!v)throw Error('release_compatible_config_closure_unproven');};
 const read=(v,k)=>v?.[k]??v?.[k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())];
 const effective=v=>v?.status==='reconciled'?read(v,'reconciledStatus'):v?.status;
 const safe=fn=>(...args)=>{try{fn(...args);return null;}catch{return 'release_compatible_config_closure_unproven';}};
 const revalidationSchema=z.object({schemaVersion:z.literal('roost-compatible-config-absence-closure-revalidation-v1'),
  releaseId:id,failedOutcomeId:id,evidenceDigest:hash,currentEvidence:base.compatibleFailureEvidenceSchema,
  nativeClosureDigest:hash,observedAt:at}).strict();
 const stableEvidence=e=>{
  const c=structuredClone(e),v=c.compatibleRecoveryFailure;delete c.observedAt;delete v.evidenceDigest;
  for(const [object,keys]of [[v.ingressFence,['observedAt','evidenceDigest']],[v.projectInventory,['observedAt','digest']],
   [v.queueScan,['through','observedAt','digest']]])for(const k of keys)delete object[k];
  return c;
 };
 function original(snapshot,input){
  const e=base.compatibleFailureEvidenceSchema.parse(input.evidence),v=e.compatibleRecoveryFailure;
  check(v.kind==='configuration_absent'&&v.operation==='deploy_config'&&v.phase==='entry'
   &&v.releaseId===snapshot.releaseId&&v.operationId===input.failedOperationId);
  const n=base.releaseNativeClosureSchema.parse(input.nativeClosure);
  check(n.releaseId===snapshot.releaseId&&n.agentHostId===snapshot.hostId&&n.operationId===input.failedOperationId
   &&n.evidenceDigest===d(e)&&Date.parse(n.observedAt)>=Date.parse(e.observedAt));
  return{e,v,n};
 }
 function bind(snapshot,input){
  const {e,n}=original(snapshot,input),a=input.absenceRevalidation;if(a===undefined)return;
  const v=revalidationSchema.parse(a),ce=v.currentEvidence;
  check(v.releaseId===snapshot.releaseId&&v.evidenceDigest===d(e)&&v.nativeClosureDigest===d(n)
   &&v.observedAt===ce.observedAt&&Date.parse(ce.observedAt)>=Date.parse(e.observedAt)
   &&Date.parse(n.observedAt)>=Date.parse(ce.observedAt)&&same(stableEvidence(e),stableEvidence(ce)));
 }
 function fresh(snapshot,input,now,operation){
  bind(snapshot,input);const a=input.absenceRevalidation,e=a?.currentEvidence??input.evidence,n=input.nativeClosure;
  const clock=now instanceof Date?now.getTime():Number(now),time=Date.parse(e.observedAt),native=Date.parse(n.observedAt);
  check(Number.isFinite(clock)&&Number.isFinite(time)&&time<=clock&&clock-time<=300000
   &&Number.isFinite(native)&&native>=time&&native<=clock&&clock-native<=300000);
  check(operation&&base.compatibleFailureEvidenceError(snapshot,e,operation,{now:clock})===null);
 }
 function closure(state,input,{checkVersion=true,qualifyGitOutcome}={}){
  check(state?.release&&typeof qualifyGitOutcome==='function');const r=state.release,s={...r.snapshot,releaseId:r.id},j=state.journal;
  check(base.compatibleArtifactRecoverySchema.safeParse(s.compatibleArtifactRecovery).success
   &&s.manifestDigest===d(s.manifest)&&s.applicationId===read(r,'applicationId')&&s.hostId===read(r,'hostId')
   &&(!checkVersion||state.expectedVersion===input.expectedVersion&&state.revocations.length===0)
   &&Array.isArray(j)&&j.length===5&&j.map(v=>v.operation).join(',')==='push,pr,review,merge,deploy_config'
   &&new Set(j.map(v=>v.id)).size===5&&new Set(j.map(v=>v.outcome?.id)).size===5);
  const op=j[4],out=op.outcome;original(s,input);bind(s,input);
  check(op.id===input.failedOperationId&&out?.status==='reconciled'&&effective(out)==='absent'
   &&read(out,'observationOnly')===true&&same(out.evidence,input.evidence));
  if(input.absenceRevalidation!==undefined)check(input.absenceRevalidation.failedOutcomeId===out.id);
  check(base.compatibleFailureOutcomeError(s,op,{status:out.status,reconciledStatus:effective(out),observationOnly:true,evidence:out.evidence},
   {now:Date.parse(out.evidence.observedAt)})===null);
  if(input.absenceRevalidation!==undefined)check(base.compatibleFailureEvidenceError(s,input.absenceRevalidation.currentEvidence,op,
   {now:Date.parse(input.absenceRevalidation.currentEvidence.observedAt)})===null);
  const git=j.slice(0,4),p=s.compatibleArtifactRecovery.publication;check(git.every(v=>effective(v.outcome)==='succeeded'
   &&v.intent?.operation===v.operation&&v.intent.commit===s.commit&&v.intent.baseCommit===s.baseCommit&&v.intent.manifestDigest===s.manifestDigest
   &&v.intent.observed?.commit===s.commit&&v.intent.observed.baseCommit===p.baseCommit&&v.intent.observed.baseTree===p.baseTree
   &&v.intent.observed.manifestDigest===s.manifestDigest
   &&v.outcome.evidence.remoteCommit===s.commit&&v.outcome.evidence.remoteTree===s.candidateTree
   &&v.outcome.evidence.remoteBase===p.baseCommit&&v.outcome.evidence.remoteBaseTree===p.baseTree&&qualifyGitOutcome(r,v,j)===null)
   &&git.slice(1).every(v=>v.outcome.evidence.pullRequestNumber===git[1].outcome.evidence.pullRequestNumber));
 }
 return Object.freeze({compatibleConfigClosureRevalidationSchema:revalidationSchema,
  compatibleConfigClosureError:safe(closure),compatibleConfigClosureRevalidationBindingError:safe(bind),
  compatibleConfigClosureRevalidationError:safe(fresh),compatibleConfigClosureStableEvidence:stableEvidence});
}
module.exports={createCompatibleConfigClosureContract};
