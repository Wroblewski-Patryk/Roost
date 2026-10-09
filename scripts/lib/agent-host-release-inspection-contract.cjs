"use strict";
const {z}=require('zod');
const wire=require('./agent-host-release-contract.cjs');
const hash=z.string().regex(/^[a-f0-9]{64}$/),sha=z.string().regex(/^[a-f0-9]{40}$/);
const releaseInspectionSchema=z.object({schemaVersion:z.literal('roost-governed-release-inspection-v1'),
 commit:sha,tree:sha,manifestDigest:hash,scopeDigest:hash,imageDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/),
 minimumObservationSeconds:z.number().int().min(1).max(1800),minimumRestoredActivitySeconds:z.number().int().min(1).max(1800)}).strict();
const releaseVerificationSelectionSchema=z.object({schemaVersion:z.literal('roost-release-verification-selection-v1'),releaseId:z.string().uuid(),custodyEvidenceId:z.string().uuid()}).strict();
const phases=['push','pr','review','merge','deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'];
const same=(a,b)=>wire.releaseDigest(a??null)===wire.releaseDigest(b??null);
const read=(v,k)=>v?.[k]??v?.[k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())];
const iso=v=>v instanceof Date?v.toISOString():v;
const outcomeBody=raw=>({requestId:read(raw,'requestId'),status:raw?.status,
 ...(raw?.status==='reconciled'?{reconciledStatus:read(raw,'reconciledStatus')}:{}),observationOnly:read(raw,'observationOnly'),evidence:raw?.evidence});
function qualifyInheritedReleasePublication(state,publicationState,{validateOutcome,now=Date.now()}={}){
 const fail=code=>{throw Error('release_inspection_publication_'+code);},r=state?.release,b=r?.snapshot;
 if(typeof validateOutcome!=='function')fail('canonical_validator_required');
 if(wire.compatibleConfigurationContinuationStoredError(b)!==null)fail('stored_basis');
 const basis=b.compatibleContinuationBasis,p=publicationState,pr=p?.release,old=pr?.snapshot,rows=p?.journal;
 if(!p||p.status!=='failed'||p.truncated===true||pr?.id!==basis.releaseId||p.expectedVersion!==basis.expectedVersion
  ||read(pr,'applicationId')!==b.applicationId||read(pr,'hostId')!==b.hostId
  ||read(r,'workspaceId')!==read(pr,'workspaceId')||old?.manifestDigest!==basis.previousManifestDigest
  ||wire.releaseDigest(old.manifest)!==basis.previousManifestDigest||!same(old.manifest.repository,basis.repository)
  ||old.releaserAgentId!==b.releaserAgentId||old.baseCommit!==b.baseCommit||old.baseTree!==b.baseTree
  ||!['applicationId','hostId','taskId','reviewId','materialVersion','commit'].every(k=>old[k]===basis[k])||old.candidateTree!==basis.tree
  ||!Array.isArray(rows)||rows.length!==5||wire.releaseDigest(rows)!==basis.journalDigest)fail('parent_binding');
 const c=p.failedClosures?.find(x=>x.id===basis.closureId),receipt=c?.snapshot,last=rows[4],closedAt=Date.parse(iso(read(c,'createdAt')));
 if(!c||!receipt||read(c,'releaseId')!==pr.id||read(c,'closureDigest')!==basis.closureDigest||wire.releaseDigest(receipt)!==basis.closureDigest
  ||read(c,'failedOperationId')!==basis.failedOperationId||read(c,'failedOutcomeId')!==basis.failedOutcomeId
  ||read(c,'expectedVersion')!==receipt.expectedVersion||read(c,'consentDigest')!==receipt.consentDigest
  ||!p.revocations?.some(x=>x.id===read(c,'revocationId'))||receipt.releaseId!==pr.id||receipt.applicationId!==b.applicationId
  ||receipt.hostId!==b.hostId||receipt.issuerUserId!==read(pr,'issuerUserId')||receipt.failedOutcomeId!==basis.failedOutcomeId
  ||receipt.failedEvidenceDigest!==basis.failedEvidenceDigest||wire.releaseDigest(last.outcome?.evidence)!==basis.failedEvidenceDigest
  ||!Number.isFinite(closedAt)||closedAt>now||Date.parse(receipt.nativeClosure?.observedAt)>closedAt)fail('closure_binding');
 if(wire.compatibleConfigClosureError(p,receipt,{checkVersion:false,
  qualifyGitOutcome:(release,row,journal)=>validateOutcome(release,row,outcomeBody(row.outcome),journal)})!==null)fail('canonical_closure');
 const proofs=rows.slice(0,4).map(row=>({operation:row.operation,operationId:row.id,outcomeId:row.outcome.id,
  intentDigest:wire.releaseDigest(row.intent),outcomeDigest:wire.releaseDigest(row.outcome),evidenceDigest:wire.releaseDigest(row.outcome.evidence)}));
 if(!same(proofs,basis.git)||!same(rows.slice(0,4).map(x=>x.operation),phases.slice(0,4))
  ||rows[1].outcome.evidence.pullRequestNumber!==basis.publication.pullRequestNumber
  ||!same(old.compatibleArtifactRecovery.publication,{mode:'new_exact_commit',baseCommit:basis.publication.baseCommit,baseTree:basis.publication.baseTree}))fail('git_basis');
 for(let i=0;i<4;i++){
  const row=rows[i],raw=row.outcome,o=outcomeBody(raw),at=Date.parse(iso(read(row,'createdAt'))),observed=Date.parse(o.evidence.observedAt);
  wire.intentSchema.parse(row.intent);wire.outcomeSchema.parse(o);
  if(read(row,'releaseId')!==pr.id||read(raw,'operationId')!==row.id
   ||(o.status==='reconciled'?o.reconciledStatus:o.status)!=='succeeded'||validateOutcome(pr,row,o,rows.slice(0,i))!==null
   ||!Number.isFinite(at)||!Number.isFinite(observed)||observed<at||observed>closedAt
   ||(i&&at<Date.parse(iso(read(rows[i-1],'createdAt')))))fail('git_outcome');
 }
 if(state.journal?.some(x=>rows.some(y=>x.id===y.id||x.outcome?.id===y.outcome?.id)))fail('own_id_replay');
 return {schemaVersion:'roost-governed-release-inherited-publication-v1',releaseId:pr.id,closureId:c.id,closureDigest:basis.closureDigest,
  nativeClosureDigest:wire.releaseDigest(receipt.nativeClosure),revocationId:read(c,'revocationId'),closedAt:new Date(closedAt).toISOString(),
  parentManifestDigest:basis.previousManifestDigest,journalDigest:basis.journalDigest,commit:basis.commit,tree:basis.tree,
  baseCommit:basis.publication.baseCommit,baseTree:basis.publication.baseTree,pullRequestNumber:basis.publication.pullRequestNumber,
  operationCount:4,operationsSummary:proofs.map((proof,i)=>({...proof,createdAt:iso(read(rows[i],'createdAt')),observedAt:rows[i].outcome.evidence.observedAt})),
  claimBoundary:{historicalOwnerClosure:true,currentNativeCapability:false,serverOsAttestation:false}};
}
function assertCompletedReleaseInspection(state,{inspection,applicationId,hostId,agentId,validateOutcome,qualifyStoredSnapshot,publicationState,now=Date.now()}){
 const fail=code=>{throw Error('release_inspection_'+code);};
 if(typeof validateOutcome!=='function')fail('canonical_validator_required');
 if(typeof qualifyStoredSnapshot!=='function')fail('stored_proof_validator_required');
 const pin=releaseInspectionSchema.parse(inspection),r=state?.release;
 if(state?.status!=='completed'||state.truncated===true||state.revocations?.length||state.failedClosures?.length)fail('not_completed');
 const b=qualifyStoredSnapshot(state);
 if(r.applicationId!==applicationId||r.hostId!==hostId||b.applicationId!==applicationId||b.hostId!==hostId||b.releaserAgentId===agentId)fail('identity_or_independence');
 if(b.commit!==pin.commit||b.candidateTree!==pin.tree||b.manifestDigest!==pin.manifestDigest||wire.releaseDigest(b.manifest)!==pin.manifestDigest
  ||!b.compatibleArtifactRecovery||wire.compatibleRecoveryScopeDigest(b)!==pin.scopeDigest)fail('candidate_changed');
 const continuation=b.compatibleConfigurationContinuation!==undefined,inheritedPublication=continuation?qualifyInheritedReleasePublication(state,publicationState,{validateOutcome,now}):null;
 if(!continuation&&publicationState!==undefined)fail('unexpected_publication');
 const rows=state.journal,ownPhases=continuation?phases.slice(4):phases;
 if(!Array.isArray(rows)||!same(rows.map(row=>row.operation),ownPhases)||new Set(rows.map(row=>row.id)).size!==ownPhases.length)fail('journal_incomplete');
 for(let n=0;n<rows.length;n++){
  const row=rows[n],raw=row.outcome;
  const outcome={requestId:raw?.requestId??raw?.request_id,status:raw?.status,
   ...(raw?.status==='reconciled'?{reconciledStatus:raw.reconciledStatus??raw.reconciled_status}:{}),
   observationOnly:raw?.observationOnly??raw?.observation_only,evidence:raw?.evidence};
  wire.intentSchema.parse(row.intent);wire.outcomeSchema.parse(outcome);
  if(row.intent.operation!==row.operation||row.intent.manifestDigest!==pin.manifestDigest||row.intent.commit!==pin.commit
   ||(row.releaseId??row.release_id)!==r.id||(raw.operationId??raw.operation_id)!==row.id
   ||(outcome.status==='reconciled'?outcome.reconciledStatus:outcome.status)!=='succeeded'
   ||validateOutcome(r,row,outcome,rows.slice(0,n))!==null)fail('phase_unproven');
  const at=Date.parse(iso(read(row,'createdAt'))),observed=Date.parse(outcome.evidence.observedAt);
  if(!Number.isFinite(at)||!Number.isFinite(observed)||observed<at||observed>now||(n&&at<Date.parse(rows[n-1].createdAt))
   ||inheritedPublication&&at<Date.parse(inheritedPublication.closedAt))fail('phase_clock');
 }
 const row=op=>rows.find(x=>x.operation===op),ev=op=>row(op).outcome.evidence;
 const m=b.manifest,o=ev('observe'),clean=ev('fixture_cleanup').postObservation,resume=ev('runtime_resume').postObservation;
 if(!m.deployment.targets?.every(t=>{const runtime=o.composeTargets?.find(x=>x.targetId===t.targetId)?.runtime;
  return t.configuration.services.filter(s=>s.source==='built').every(s=>runtime?.services?.filter(x=>x.name===s.name&&x.imageDigest===pin.imageDigest).length===1);
 }))fail('deployed_image_changed');
 if(row('observe').intent.parameters.mode!=='candidate'||m.observation.seconds<pin.minimumObservationSeconds||o.healthy!==true
  ||o.observationSeconds<pin.minimumObservationSeconds||Date.parse(o.observedAt)-Date.parse(row('observe').createdAt)<pin.minimumObservationSeconds*1000)fail('observation_incomplete');
 if(!clean?.fixtureAbsent||!clean.authAbsent||!clean.eventAbsent||!clean.sequencesUnchanged||!clean.noUnownedChanges
  ||clean.schemaDigest!==m.baseline.schemaDigest||clean.dataDigest!==m.baseline.dataDigest||clean.sequenceDigest!==m.postObservation.baselineSequenceDigest)fail('cleanup_parity');
 if(!resume?.healthy||resume.observationSeconds<pin.minimumRestoredActivitySeconds||m.postObservation.runtimeResume.observationSeconds<pin.minimumRestoredActivitySeconds
  ||Date.parse(ev('runtime_resume').observedAt)-Date.parse(row('runtime_resume').createdAt)<pin.minimumRestoredActivitySeconds*1000
  ||!same(resume.cadences,m.postObservation.runtimeResume.cadences)||resume.databaseSettingsDigest!==m.postObservation.runtimeResume.databaseSettingsDigest
  ||resume.ingressSettingsDigest!==m.postObservation.runtimeResume.ingressSettingsDigest)fail('restored_activity_unproven');
 return {schemaVersion:'roost-governed-release-inspection-facts-v1',releaseId:r.id,applicationId,hostId,commit:pin.commit,tree:pin.tree,
  manifestDigest:pin.manifestDigest,scopeDigest:pin.scopeDigest,imageDigest:pin.imageDigest,journalDigest:wire.releaseDigest(rows),
  observationSeconds:o.observationSeconds,restoredActivitySeconds:resume.observationSeconds,
  cleanupSchemaDigest:clean.schemaDigest,cleanupDataDigest:clean.dataDigest,cleanupSequenceDigest:clean.sequenceDigest,
  phaseCount:rows.length,ownPhaseCount:rows.length,inheritedPhaseCount:continuation?4:0,effectivePhaseCount:continuation?11:rows.length,
  ...(inheritedPublication?{inheritedPublication}:{}),completedAt:ev('cleanup').observedAt};
}
module.exports={releaseInspectionSchema,releaseVerificationSelectionSchema,assertCompletedReleaseInspection,qualifyInheritedReleasePublication};
