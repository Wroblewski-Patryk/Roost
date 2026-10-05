'use strict';
const {z}=require('zod');
const readKeys=Object.freeze(['legacy','health','inventory','fingerprint','capacity','maintenance','queue','protectedImages','backup']);
const hash=z.string().regex(/^[a-f0-9]{64}$/),sha=z.string().regex(/^[a-f0-9]{40}$/),date=z.string().datetime();
const requiredParity=Object.freeze(['configurationParity','serviceIdentityParity','schemaDataSequenceCatalogParity','protectedImagesPresent','fixtureAbsent','noUnownedChanges','controlPlaneQuiescent','noCandidateQueue','normalCatalogComplete','priorReleaseClosed','databaseReadOnly','cadencesHeld','ingressOpen','workerStopped','writerLockAbsent','capacityQualified','backupPhysicalCopyVerified']);
const zeroCounts=Object.freeze(['candidateQueueCount','activeQueueCount','activeApplicationReleaseCount','activeOtherSessions','ownedTransactions','apiWrites','modelCalls','businessWrites','providerCalls']);

// This is fresh-owner attestation of actual platform reads. A hash proves its
// binding and integrity, not server inspection, native signature or provenance.
function createBaselineRevalidationSchema(baselineSchema){
 return z.object({schemaVersion:z.literal('roost-release-baseline-revalidation-v1'),source:z.literal('root_actual_readonly_baseline_parity'),
  applicationId:z.string().uuid(),hostId:z.string().uuid(),targetId:z.string().min(1).max(1000),commit:sha,candidateTree:sha,baseCommit:sha,baseTree:sha,manifestDigest:hash,
  baseline:baselineSchema,baselineDigest:hash,targetBaselineDigest:hash,protectedResourcesDigest:hash,rollbackDigest:hash,backupDigest:hash,baselineRestartDigest:hash,
  receiptDigest:hash,revalidationDigest:hash,observedAt:date,
  actualReadTimes:z.object(Object.fromEntries(readKeys.map(k=>[k,date]))).strict(),
  actualReadDigests:z.object(Object.fromEntries(readKeys.map(k=>[k,hash]))).strict(),
  ...Object.fromEntries(requiredParity.map(k=>[k,z.literal(true)])),...Object.fromEntries(zeroCounts.map(k=>[k,z.literal(0)]))}).strict();
}
function baselineRevalidationDigest(value,digest){const {revalidationDigest:_sealed,...body}=value;return digest(body);}
function baselineRevalidationBindings(input,digest){
 const m=input.manifest,{observedAt:_historical,...baseline}=m.baseline,t=m.deployment.targets[0];
 return {applicationId:input.applicationId,hostId:input.hostId,targetId:t.targetId,commit:input.commit,candidateTree:input.candidateTree,baseCommit:input.baseCommit,baseTree:input.baseTree,
  manifestDigest:digest(m),baseline,baselineDigest:digest(baseline),targetBaselineDigest:digest(t.baseline),
  protectedResourcesDigest:digest(m.cleanup.protectedResourceIds),rollbackDigest:digest(m.rollback),backupDigest:digest(m.backup),baselineRestartDigest:digest(input.baselineRestart)};
}
function baselineRevalidationBindingError(input,schema,digest){
 const v=input.baselineRevalidation,m=input.manifest;
 if(v===undefined)return null;
 if(!schema.safeParse(v).success||m?.schemaVersion!=='roost-release-manifest-v2'||m.purpose!=='application_release'
  ||m.deployment?.provider!=='coolify_compose'||m.cleanup?.archiveRepository!==false||m.deployment.targets?.length!==1
  ||!input.baselineRestart||input.predecessor)return 'release_baseline_revalidation_invalid';
 const expected=baselineRevalidationBindings(input,digest);
 if(input.baseCommit!==m.baseline.commit||input.baseTree!==m.deployment.targets[0].baseline.tree
  ||input.manifestDigest!==expected.manifestDigest||Object.entries(expected).some(([k,value])=>digest(v[k])!==digest(value))
  ||v.revalidationDigest!==baselineRevalidationDigest(v,digest))return 'release_baseline_revalidation_binding_changed';
 return null;
}
function baselineRevalidationError(input,schema,digest,now){
 const error=baselineRevalidationBindingError(input,schema,digest);if(error||input.baselineRevalidation===undefined)return error;
 const v=input.baselineRevalidation,at=now instanceof Date?now.getTime():Number(now);
 if(!Number.isFinite(at)||[v.observedAt,...readKeys.map(k=>v.actualReadTimes[k])].some(time=>{
  const observed=Date.parse(time),age=at-observed;return !Number.isFinite(age)||age<0||age>300000;
 }))return 'release_prerequisite_stale';
 return null;
}
module.exports={readKeys,requiredParity,zeroCounts,createBaselineRevalidationSchema,baselineRevalidationDigest,baselineRevalidationBindings,baselineRevalidationBindingError,baselineRevalidationError};
