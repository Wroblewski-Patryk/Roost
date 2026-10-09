'use strict';
// Pure continuation qualification. Stored normal FAILED closure and Git outcomes
// are authority inputs; no caller-supplied publication proof is accepted here.
// This module performs no transport, filesystem, native or credential access.
const {z}=require('zod');
const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),sha=z.string().regex(/^[a-f0-9]{40}$/);
const git=Object.freeze(['push','pr','review','merge']);
const operations=Object.freeze(['deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup']);
const code='release_compatible_configuration_continuation_unproven';
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v??{},k),read=(v,k)=>v?.[k]??v?.[k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())];
const effective=v=>v?.status==='reconciled'?read(v,'reconciledStatus'):v?.status;
const iso=v=>v instanceof Date?v.toISOString():v;
function createCompatibleConfigurationContinuationContract(base){
 for(const k of ['manifestSchema','compatibleArtifactRecoverySchema','intentSchema'])if(typeof base?.[k]?.safeParse!=='function')throw Error('compatible_continuation_base_schema_required:'+k);
 for(const k of ['releaseDigest','compatibleRecoveryScopeDigest','compatibleRecoveryEntryDigest','compatibleConfigClosureError'])if(typeof base?.[k]!=='function')throw Error('compatible_continuation_base_proof_required:'+k);
 const d=base.releaseDigest,same=(a,b)=>d(a??null)===d(b??null),check=v=>{if(!v)throw Error(code);};
 const safe=fn=>(...args)=>{try{fn(...args);return null;}catch{return code;}};
 const declaration=z.object({releaseId:id,closureId:id,closureDigest:hash,gitOperationIds:z.object({push:id,pr:id,review:id,merge:id}).strict()}).strict();
 const operationProof=z.object({operation:z.enum(git),operationId:id,outcomeId:id,intentDigest:hash,outcomeDigest:hash,evidenceDigest:hash}).strict();
 const basisSchema=z.object({schemaVersion:z.literal('roost-compatible-configuration-continuation-basis-v1'),releaseId:id,expectedVersion:hash,
  closureId:id,closureDigest:hash,previousManifestDigest:hash,journalDigest:hash,failedOperationId:id,failedOutcomeId:id,failedEvidenceDigest:hash,
  applicationId:id,hostId:id,taskId:id,reviewId:id,materialVersion:hash,commit:sha,tree:sha,
  repository:z.object({url:z.string().min(1),canonicalDir:z.string().min(1),defaultBranch:z.string().min(1),candidateBranch:z.string().min(1)}).strict(),
  publication:z.object({baseCommit:sha,baseTree:sha,pullRequestNumber:z.number().int().positive()}).strict(),git:z.array(operationProof).length(4)}).strict();
 const fresh=(v,n,max=300000)=>{const t=Date.parse(iso(v));return Number.isFinite(t)&&t<=n&&n-t<=max;};
 function scopeDigest(input){const dto=declaration.parse(input.compatibleConfigurationContinuation);
  return d({schemaVersion:'roost-compatible-configuration-continuation-scope-v1',recoveryScopeDigest:base.compatibleRecoveryScopeDigest(input),
   continuation:dto,operations,inheritedPublicationOperations:git});}
 function entryStable(value){const v=structuredClone(value);delete v.observedAt;delete v.evidenceDigest;delete v.publicHealth.healthDigest;
  delete v.projectInventory.observedAt;delete v.projectInventory.digest;
  if(v.ingressFence){delete v.ingressFence.observedAt;delete v.ingressFence.evidenceDigest;}
  for(const row of [...v.services,...v.cadences]){delete row.observedAt;delete row.inventoryDigest;}return v;}
 function envelope(input){declaration.parse(input?.compatibleConfigurationContinuation);
  check(base.manifestSchema.safeParse(input.manifest).success&&base.compatibleArtifactRecoverySchema.safeParse(input.compatibleArtifactRecovery).success);
  const m=input.manifest,r=input.compatibleArtifactRecovery;
  check(m.schemaVersion==='roost-release-manifest-v2'&&m.purpose==='application_release'&&m.deployment.provider==='coolify_compose'
   &&m.cleanup.archiveRepository===false&&m.deployment.targets.length===1&&input.manifestDigest===d(m)
   &&r.scopeAudit.scopeDigest===scopeDigest(input)&&r.scopeAudit.executionId===input.releaseExecutionId
   &&r.scopeAudit.reviewId!==input.reviewId&&r.scopeAudit.taskId!==input.taskId
   &&['compatibleContinuationBasis','publishedGitBasis','successorBasis','gitPublicationBase','recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation'].every(k=>!own(input,k)));
 }
 function derive(state,input,now,proofs={}){envelope(input);
  const dto=input.compatibleConfigurationContinuation,r=state?.release,old=r?.snapshot,rows=state?.journal,n=now instanceof Date?now.getTime():Number(now);
  check(Number.isFinite(n)&&state.status==='failed'&&r?.id===dto.releaseId&&old?.manifestDigest===d(old.manifest)
   &&hash.safeParse(state.expectedVersion).success&&Array.isArray(rows)&&rows.length===5);
  const c=state.failedClosures?.find(v=>v.id===dto.closureId),receipt=c?.snapshot,last=rows[4];
  check(c&&receipt&&read(c,'releaseId')===r.id&&read(c,'closureDigest')===dto.closureDigest&&d(receipt)===dto.closureDigest
   &&read(c,'failedOperationId')===last.id&&read(c,'failedOutcomeId')===last.outcome?.id
   &&read(c,'consentDigest')===receipt.consentDigest&&state.revocations?.some(v=>v.id===read(c,'revocationId'))
   &&receipt.releaseId===r.id&&receipt.applicationId===old.applicationId&&receipt.hostId===old.hostId
   &&receipt.issuerUserId===read(r,'issuerUserId')&&receipt.failedEvidenceDigest===d(last.outcome.evidence)
   &&receipt.failedOutcomeId===last.outcome.id&&read(c,'expectedVersion')===receipt.expectedVersion
   &&fresh(read(c,'createdAt'),n,86400000)&&Date.parse(iso(read(c,'createdAt')))>=Date.parse(receipt.nativeClosure?.observedAt));
  check(typeof proofs.qualifyGitOutcome==='function'&&base.compatibleConfigClosureError(state,receipt,{checkVersion:false,qualifyGitOutcome:proofs.qualifyGitOutcome})===null);
  const ids=git.map(k=>dto.gitOperationIds[k]);check(new Set(ids).size===4&&rows.slice(0,4).every((v,i)=>v.id===ids[i]&&v.operation===git[i]&&effective(v.outcome)==='succeeded'));
  check(['taskId','applicationId','hostId','releaserAgentId','releaserRevision','reviewId','materialVersion','commit','candidateTree','baseCommit','baseTree'].every(k=>same(input[k],old[k]))
   &&input.applicationId===read(r,'applicationId')&&input.hostId===read(r,'hostId')
   &&id.safeParse(input.releaserCredentialId).success&&input.releaserCredentialId!==old.releaserCredentialId
   &&Number.isInteger(input.credentialVersion)&&input.credentialVersion>0
   &&id.safeParse(input.requestId).success&&input.requestId!==old.requestId
   &&Date.parse(input.expiresAt)>n);
  const current=input.compatibleArtifactRecovery,prior=old.compatibleArtifactRecovery,a=current.scopeAudit,oa=prior.scopeAudit;
  check(same(current.prior,prior.prior)&&same(current.publication,prior.publication)&&same(current.failurePolicy,prior.failurePolicy)
   &&['taskId','executionId','reviewId'].every(k=>a[k]!==oa[k])&&a.executionId===input.releaseExecutionId);
  const replacement=structuredClone(current.replacement),original=structuredClone(prior.replacement);
  delete replacement.compatibilityReceiptDigest;delete original.compatibilityReceiptDigest;
  check(same(replacement,original));
  const manifest=structuredClone(input.manifest),previous=structuredClone(old.manifest);delete manifest.backup;delete previous.backup;
  check(same(manifest,previous)&&input.manifest.backup.digest!==old.manifest.backup.digest
   &&fresh(input.manifest.backup.restoreVerifiedAt,n,86400000)
   &&Date.parse(input.manifest.backup.capturedAt)<=Date.parse(input.manifest.backup.restoreVerifiedAt)
   &&Date.parse(input.manifest.backup.capturedAt)>=Date.parse(iso(read(c,'createdAt'))));
  check(same(entryStable(current.currentEntry),entryStable(prior.currentEntry))
   &&fresh(current.currentEntry.observedAt,n)&&current.currentEntry.evidenceDigest===base.compatibleRecoveryEntryDigest(current.currentEntry)
   &&fresh(current.nativeClosure.observedAt,n)&&current.nativeClosure.evidenceDigest===current.currentEntry.evidenceDigest
   &&current.nativeClosure.releaseId===current.prior.releaseId&&current.nativeClosure.operationId===current.prior.failedOperationId
   &&current.nativeClosure.agentHostId===input.hostId&&Date.parse(current.nativeClosure.observedAt)>=Date.parse(current.currentEntry.observedAt));
  for(const k of ['qualifyCurrentEntry','verifyBackupAndCompatibility','verifyOriginalSourceAcceptance','verifyCurrentScopeAudit'])check(typeof proofs[k]==='function'&&proofs[k](input,state,n)===null);
  const result={schemaVersion:'roost-compatible-configuration-continuation-basis-v1',releaseId:r.id,expectedVersion:state.expectedVersion,
   closureId:c.id,closureDigest:d(receipt),previousManifestDigest:old.manifestDigest,journalDigest:d(rows),failedOperationId:last.id,failedOutcomeId:last.outcome.id,
   failedEvidenceDigest:d(last.outcome.evidence),applicationId:old.applicationId,hostId:old.hostId,taskId:old.taskId,reviewId:old.reviewId,materialVersion:old.materialVersion,
   commit:old.commit,tree:old.candidateTree,repository:structuredClone(old.manifest.repository),
   publication:{baseCommit:prior.publication.baseCommit,baseTree:prior.publication.baseTree,pullRequestNumber:rows[1].outcome.evidence.pullRequestNumber},
   git:rows.slice(0,4).map(v=>({operation:v.operation,operationId:v.id,outcomeId:v.outcome.id,intentDigest:d(v.intent),outcomeDigest:d(v.outcome),evidenceDigest:d(v.outcome.evidence)}))};
  return basisSchema.parse(result);
 }
 function stored(snapshot){const b=basisSchema.parse(snapshot?.compatibleContinuationBasis),dto=declaration.parse(snapshot.compatibleConfigurationContinuation);
  check(b.releaseId===dto.releaseId&&b.closureId===dto.closureId&&b.closureDigest===dto.closureDigest
   &&git.every((k,i)=>b.git[i].operation===k&&b.git[i].operationId===dto.gitOperationIds[k])
   &&['applicationId','hostId','taskId','reviewId','materialVersion','commit'].every(k=>b[k]===snapshot[k])&&b.tree===snapshot.candidateTree
   &&same(b.repository,snapshot.manifest.repository)&&snapshot.compatibleArtifactRecovery.scopeAudit.scopeDigest===scopeDigest(snapshot));return b;
 }
 function next(state){const s=state?.release?.snapshot;stored(s);const j=state.journal??[];check(Array.isArray(j)&&j.length<=operations.length);
  for(let i=0;i<j.length;i++){check(j[i].operation===operations[i]&&j[i].intent?.operation===operations[i]
   &&j[i].intent.commit===s.commit&&j[i].intent.manifestDigest===s.manifestDigest);
   if(effective(j[i].outcome)!=='succeeded'){check(i===j.length-1);return !j[i].outcome||effective(j[i].outcome)==='uncertain'?'reconcile':'frozen';}}
  return state.status==='active'?(operations[j.length]??null):null;
 }
 const intentError=safe((state,intent)=>{const s=state.release.snapshot;stored(s);check(base.intentSchema.safeParse(intent).success&&next(state)===intent.operation
  &&intent.commit===s.commit&&intent.manifestDigest===s.manifestDigest&&intent.baseCommit===s.baseCommit
  &&same(intent.observed,{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest}));
  if(['deploy_config','deploy'].includes(intent.operation)){const r=s.compatibleArtifactRecovery.replacement;check(intent.parameters.commit===s.commit
   &&intent.parameters.artifactSetDigest===r.artifactSetDigest&&intent.parameters.configDigest===r.configurationDigest&&intent.parameters.schemaDigest===r.schemaDigest
   &&(intent.operation!=='deploy'||intent.parameters.targetId===s.manifest.deployment.targets[0].targetId));}
  if(intent.operation==='observe')check(intent.parameters.mode==='candidate');
 });
 return Object.freeze({compatibleConfigurationContinuationSchema:declaration,compatibleContinuationBasisSchema:basisSchema,
  compatibleConfigurationContinuationScopeDigest:scopeDigest,compatibleConfigurationContinuationBasis:derive,
  compatibleConfigurationContinuationAdmissionError:safe(derive),compatibleConfigurationContinuationStoredError:safe(stored),
  compatibleConfigurationContinuationPublication:snapshot=>{const b=stored(snapshot);return Object.freeze({commit:b.commit,tree:b.tree,
   pullRequestNumber:b.publication.pullRequestNumber,inheritedFromReleaseId:b.releaseId,operations:structuredClone(b.git)});},
  nextCompatibleConfigurationContinuationOperation:next,compatibleConfigurationContinuationIntentError:intentError,
  compatibleConfigurationContinuationOperations:operations});
}
module.exports={createCompatibleConfigurationContinuationContract};
