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
function assertCompletedReleaseInspection(state,{inspection,applicationId,hostId,agentId,validateOutcome,qualifyStoredSnapshot,now=Date.now()}){
 const fail=code=>{throw Error('release_inspection_'+code);};
 if(typeof validateOutcome!=='function')fail('canonical_validator_required');
 if(typeof qualifyStoredSnapshot!=='function')fail('stored_proof_validator_required');
 const pin=releaseInspectionSchema.parse(inspection),r=state?.release;
 if(state?.status!=='completed'||state.truncated===true||state.revocations?.length||state.failedClosures?.length)fail('not_completed');
 const b=qualifyStoredSnapshot(state);
 if(r.applicationId!==applicationId||r.hostId!==hostId||b.applicationId!==applicationId||b.hostId!==hostId||b.releaserAgentId===agentId)fail('identity_or_independence');
 if(b.commit!==pin.commit||b.candidateTree!==pin.tree||b.manifestDigest!==pin.manifestDigest||wire.releaseDigest(b.manifest)!==pin.manifestDigest
  ||!b.compatibleArtifactRecovery||wire.compatibleRecoveryScopeDigest(b)!==pin.scopeDigest)fail('candidate_changed');
 const rows=state.journal;
 if(!Array.isArray(rows)||!same(rows.map(row=>row.operation),phases)||new Set(rows.map(row=>row.id)).size!==phases.length)fail('journal_incomplete');
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
  const at=Date.parse(row.createdAt),observed=Date.parse(outcome.evidence.observedAt);
  if(!Number.isFinite(at)||!Number.isFinite(observed)||observed<at||observed>now||(n&&at<Date.parse(rows[n-1].createdAt)))fail('phase_clock');
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
  phaseCount:rows.length,completedAt:ev('cleanup').observedAt};
}
module.exports={releaseInspectionSchema,releaseVerificationSelectionSchema,assertCompletedReleaseInspection};
