'use strict';
// Pure opt-in contract. No transport, file/process/key access or effect runner.
// Base schemas are injected by the trusted shared contract to avoid a cycle.
const {z}=require('zod');
const hash=z.string().regex(/^[a-f0-9]{64}$/),sha=z.string().regex(/^[a-f0-9]{40}$/),id=z.string().uuid();
const image=z.string().regex(/^sha256:[a-f0-9]{64}$/),at=z.string().datetime({offset:true});
const name=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v??{},k);
const effective=o=>!o?null:o.status==='reconciled'?(o.reconciledStatus??o.reconciled_status):o.status;
const iso=v=>v instanceof Date?v.toISOString():v;
const read=(v,k)=>v?.[k]??v?.[k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())];
const ordered=rows=>rows.slice().sort((a,b)=>a.name.localeCompare(b.name));
const freezePolicy=Object.freeze({mode:'freeze_protected_database',automaticHistoricalRollback:false,
 dataRestoreAllowed:false,volumeDeletionAllowed:false,keepIngressBlocked:true,keepCadencesHeld:true});
const sequence=Object.freeze(['push','pr','review','merge','deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup']);
const forbidden=Object.freeze(['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','publishedGitBasis','successorBasis','gitPublicationBase']);

function createCompatibleRecoveryContract(base){
 for(const k of ['manifestSchema','composeConfigurationSchema','composeRuntimeServiceSchema','releaseNativeClosureSchema'])
  if(typeof base?.[k]?.safeParse!=='function')throw Error('compatible_recovery_base_schema_required:'+k);
 if(typeof base.releaseDigest!=='function'||typeof base.composeConfigurationDigest!=='function')throw Error('compatible_recovery_base_digest_required');
 const digest=base.releaseDigest,same=(a,b)=>digest(a??null)===digest(b??null),check=(ok,why)=>{if(!ok)throw Error(why);};
 const fresh=(v,now,max=300000)=>{const n=now instanceof Date?now.getTime():Number(now),t=Date.parse(v);return Number.isFinite(n)&&Number.isFinite(t)&&t<=n&&n-t<=max;};
 const exactNames=(rows,expected)=>same(rows.map(v=>v.name).sort(),expected.map(v=>v.name).sort())&&new Set(rows.map(v=>v.name)).size===rows.length;
 const imageRow=z.object({name,imageDigest:image,commit:sha,tree:sha}).strict();
 const compatibilitySchema=z.object({schemaVersion:z.literal('roost-compose-replacement-compatibility-v1'),
  observedAt:at,commit:sha,tree:sha,artifactSetDigest:hash,configurationDigest:hash,images:z.array(imageRow).length(4),
  schemaDigest:hash,dataDigest:hash,sequenceDigest:hash,backupDigest:hash,
  linuxImageVerified:z.literal(true),asyncBridgeVerified:z.literal(true),migrationImportVerified:z.literal(true),
  restoredSchemaCompatible:z.literal(true),nonOwnedDataUnchanged:z.literal(true),sequencesUnchanged:z.literal(true),
  providerRequests:z.literal(0),externalActions:z.literal(0),ownedJobClosed:z.literal(true),
  sourceExecutionId:id,buildExecutionId:id,nativeReceiptDigest:hash,evidenceDigest:hash}).strict();
 const buildSchema=z.object({schemaVersion:z.literal('roost-compatible-artifact-build-proof-v1'),observedAt:at,
  executionId:id,sourceExecutionId:id,commit:sha,tree:sha,images:z.array(imageRow).length(4),artifactSetDigest:hash,
  configurationDigest:hash,nativeReceiptDigest:hash,signedNativeVerified:z.literal(true),ownedJobClosed:z.literal(true),
  sourceUnchanged:z.literal(true),evidenceDigest:hash}).strict();
 const presentService=base.composeRuntimeServiceSchema.extend({presence:z.literal('present'),declarationDigest:hash,inventoryDigest:hash,observedAt:at}).strict();
 const absentService=z.object({presence:z.literal('absent'),name,role:z.enum(['app','migration','cadence']),source:z.literal('built'),
  declarationDigest:hash,mountDigest:hash,containerId:z.null(),imageDigest:z.null(),state:z.literal('absent'),absenceVerified:z.literal(true),inventoryDigest:hash,observedAt:at}).strict();
 const cadenceSchema=z.discriminatedUnion('presence',[
  z.object({presence:z.literal('present'),name,behaviorDigest:hash,held:z.literal(true),containerId:hash,imageDigest:image,state:z.enum(['paused','exited','created'])}).strict(),
  z.object({presence:z.literal('absent'),name,behaviorDigest:hash,held:z.literal(true),containerId:z.null(),imageDigest:z.null(),state:z.literal('absent'),
   absenceVerified:z.literal(true),inventoryDigest:hash,observedAt:at}).strict()
 ]);
 const inventorySchema=z.object({schemaVersion:z.literal('roost-compose-project-inventory-v1'),targetId:name,observedAt:at,
  projectServiceSetComplete:z.literal(true),physicalServices:z.array(base.composeRuntimeServiceSchema).min(1).max(5),digest:hash}).strict();
 const entrySchema=z.object({schemaVersion:z.literal('roost-compose-down-entry-v1'),observedAt:at,targetId:name,
  configuration:base.composeConfigurationSchema,projectInventory:inventorySchema,services:z.array(z.discriminatedUnion('presence',[presentService,absentService])).length(5),
  historicalServiceReferences:z.array(z.object({name,containerId:hash,imageDigest:image,failedEvidenceDigest:hash}).strict()).length(5),
  imageAvailability:z.array(z.object({name,imageDigest:image,present:z.boolean()}).strict()).length(4),
  schemaDigest:hash,dataDigest:hash,sequenceDigest:hash,
  database:z.object({containerId:hash,imageDigest:image,mountDigest:hash,running:z.literal(true),healthy:z.literal(true),
   readOnlyFence:z.literal(true),activeOtherSessions:z.literal(0),ownedTransactions:z.literal(0)}).strict(),
  cadences:z.array(cadenceSchema).length(2),
  databaseSettingsDigest:hash,ingressSettingsDigest:hash,ingressBlocked:z.literal(true),activeDeploymentCount:z.literal(0),
  publicHealth:z.object({healthy:z.literal(false),healthDigest:hash}).strict(),evidenceDigest:hash}).strict();
 const compatibleArtifactRecoverySchema=z.object({schemaVersion:z.literal('roost-compose-compatible-artifact-recovery-v1'),
  prior:z.object({releaseId:id,expectedVersion:hash,closureId:id,closureDigest:hash,failedOperationId:id,failedOutcomeId:id,
   failedEvidenceDigest:hash,previousManifestDigest:hash}).strict(),currentEntry:entrySchema,nativeClosure:base.releaseNativeClosureSchema,
  replacement:z.object({commit:sha,tree:sha,artifactSetDigest:hash,configurationDigest:hash,images:z.array(imageRow).length(4),
   buildReceiptDigest:hash,compatibilityReceiptDigest:hash,schemaDigest:hash,schemaChangeAllowed:z.literal(false)}).strict(),
  publication:z.object({mode:z.literal('new_exact_commit'),baseCommit:sha,baseTree:sha}).strict(),
  scopeAudit:z.object({taskId:id,executionId:id,reviewId:id,materialVersion:hash,scopeDigest:hash}).strict(),
  failurePolicy:z.object({mode:z.literal(freezePolicy.mode),automaticHistoricalRollback:z.literal(false),dataRestoreAllowed:z.literal(false),
   volumeDeletionAllowed:z.literal(false),keepIngressBlocked:z.literal(true),keepCadencesHeld:z.literal(true)}).strict()}).strict();
 const safe=fn=>(...args)=>{try{return fn(...args)??null;}catch{return 'release_compatible_recovery_unproven';}};
 function entryDigest(e){const{evidenceDigest,...body}=e;return digest(body);}
 function compatibilityDigest(e){const{evidenceDigest,...body}=e;return digest(body);}
 function inventoryDigest(e){const{digest:_,...body}=e;return digest(body);}
 function compatibleRecoveryScopeDigest(input){const r=input?.compatibleArtifactRecovery;if(!r)return null;
  const {scopeAudit:_,...scope}=structuredClone(r);
  // Fresh reinspection may change only volatile read clocks/probe hashes. Every
  // fresh value remains bound by the full grant snapshot and admission checks;
  // the stable effect scope never manufactures a refreshed observation.
  delete scope.currentEntry.observedAt;delete scope.currentEntry.evidenceDigest;
  delete scope.currentEntry.publicHealth.healthDigest;
  delete scope.currentEntry.projectInventory.observedAt;delete scope.currentEntry.projectInventory.digest;
  for(const row of [...scope.currentEntry.services,...scope.currentEntry.cadences]){delete row.observedAt;delete row.inventoryDigest;}
  delete scope.nativeClosure.observedAt;delete scope.nativeClosure.evidenceDigest;
  return digest({schemaVersion:'roost-compose-compatible-artifact-recovery-scope-v1',
   binding:Object.fromEntries(['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId'].map(k=>[k,input[k]])),
   manifestDigest:input.manifestDigest,recovery:scope,operations:sequence,historicalRollbackExecutable:false});
 }
 function validEnvelope(input){check(compatibleArtifactRecoverySchema.safeParse(input?.compatibleArtifactRecovery).success,'shape');
  check(base.manifestSchema.safeParse(input.manifest).success&&input.manifest.schemaVersion==='roost-release-manifest-v2'
   &&input.manifest.purpose==='application_release'&&input.manifest.deployment.provider==='coolify_compose'
   &&input.manifest.cleanup.archiveRepository===false&&forbidden.every(k=>!own(input,k)),'exclusive_compose_scope');
  check(input.manifestDigest===digest(input.manifest)&&input.compatibleArtifactRecovery.scopeAudit.scopeDigest===compatibleRecoveryScopeDigest(input),'scope_digest');
 }
 function descriptor(c){const x=structuredClone(c);delete x.sourcePins.controllerRenderer;
  if(x.controllerPolicy)delete x.controllerPolicy.rendererDigest;return x;}
 function historicalManifestMatches(old,m){
  const p=old.deployment.targets[0],t=m.deployment.targets[0];
  check(['commit','schemaDigest','dataDigest','healthDigest','observedAt'].every(k=>same(old.baseline[k],m.baseline[k])),'historical_baseline');
  check(['commit','schemaDigest','compatibleSchemaDigests'].every(k=>same(old.rollback[k],m.rollback[k])),'historical_rollback');
  check(['commit','tree','sourceDigest','images'].every(k=>same(p.baseline[k],t.baseline[k]))
   &&same(descriptor(p.baseline.configuration),descriptor(t.baseline.configuration)),'historical_descriptor');
  check(same(old.services,m.services)&&same(old.observation,m.observation)&&old.repository.url===m.repository.url
   &&old.repository.canonicalDir===m.repository.canonicalDir&&old.repository.defaultBranch===m.repository.defaultBranch
   &&p.targetId===t.targetId&&p.composePath===t.composePath&&old.deployment.controllerUrl===m.deployment.controllerUrl
   &&old.deployment.url===m.deployment.url&&same(old.deployment.publicOrigins,m.deployment.publicOrigins),'existing_installation_only');
  const withoutSource=c=>{const x=structuredClone(c);for(const k of ['gitCommit','sourceDigest','composeDigest','controllerPolicy','settingsDigest','runtimePolicyDigest'])delete x[k];delete x.sourcePins.controllerRenderer;return x;};
  check(same(withoutSource(t.configuration),withoutSource(t.baseline.configuration))
   &&same(withoutSource(t.rollbackConfiguration),withoutSource(t.baseline.configuration)),'environment_storage_topology');
  check(['settingsInvariantDigest','runtimeInvariantDigest'].every(k=>t.baseline.controllerInvariants[k]===p.baseline.controllerInvariants[k]),'held_runtime_invariants');
  check(m.cleanup.ownedResourceIds.length===0&&old.cleanup.protectedResourceIds.every(v=>m.cleanup.protectedResourceIds.includes(v)),'protected_history');
  if(old.postObservation||m.postObservation){const strip=p=>{const x=structuredClone(p);if(x){delete x.candidateCommit;delete x.candidateTree;delete x.controllerDigest;}return x;};
   check(same(strip(old.postObservation),strip(m.postObservation)),'post_observation_scope');}
 }
 function closedPrior(state,input,validateClosedPrior){
  const r=input.compatibleArtifactRecovery.prior,release=state?.release,old=release?.snapshot,last=state?.journal?.at(-1);
  check(typeof validateClosedPrior==='function','canonical_closed_prior_validator_required');
  const c=state?.failedClosures?.find(v=>v.id===r.closureId),receipt=c?.snapshot;
  check(release?.id===r.releaseId&&state.expectedVersion===r.expectedVersion&&state.status==='failed'
   &&old?.manifestDigest===r.previousManifestDigest&&digest(old.manifest)===r.previousManifestDigest,'closed_prior_identity');
  check(receipt&&read(c,'releaseId')===r.releaseId&&read(c,'closureDigest')===r.closureDigest&&digest(receipt)===r.closureDigest
   &&read(c,'failedOperationId')===r.failedOperationId&&read(c,'failedOutcomeId')===r.failedOutcomeId
   &&read(c,'consentDigest')===receipt.consentDigest&&state.revocations?.some(v=>v.id===read(c,'revocationId'))
   &&last?.id===r.failedOperationId&&last.outcome?.id===r.failedOutcomeId&&effective(last.outcome)==='failed'
   &&digest(last.outcome.evidence)===r.failedEvidenceDigest&&receipt.failedEvidenceDigest===r.failedEvidenceDigest
   &&digest(receipt.evidence)===r.failedEvidenceDigest&&receipt.releaseId===r.releaseId&&receipt.applicationId===old.applicationId
   &&receipt.hostId===old.hostId&&receipt.issuerUserId===read(release,'issuerUserId'),'authentic_failed_closure');
  check(validateClosedPrior(state,receipt,false)===null,'canonical_failed_closure');
  return {old,receipt,closure:c,last};
 }
 function qualifyEntry(state,input,now,validateClosedPrior){validEnvelope(input);const prior=closedPrior(state,input,validateClosedPrior),r=input.compatibleArtifactRecovery,e=r.currentEntry,m=input.manifest,t=m.deployment.targets[0],p=prior.old.manifest.deployment.targets[0];
  historicalManifestMatches(prior.old.manifest,m);
  check(input.applicationId===prior.old.applicationId&&input.hostId===prior.old.hostId&&input.releaserAgentId===prior.old.releaserAgentId
   &&input.commit!==prior.old.commit&&input.taskId!==prior.old.taskId&&input.releaseExecutionId!==prior.old.releaseExecutionId
   &&input.baseCommit===prior.old.baseCommit&&input.baseTree===prior.old.baseTree&&input.baseCommit===m.baseline.commit,'new_source_same_target');
  check(fresh(e.observedAt,now)&&e.evidenceDigest===entryDigest(e)&&fresh(r.nativeClosure.observedAt,now)
   &&Date.parse(r.nativeClosure.observedAt)>=Date.parse(e.observedAt)&&r.nativeClosure.releaseId===r.prior.releaseId
   &&r.nativeClosure.operationId===r.prior.failedOperationId&&r.nativeClosure.agentHostId===input.hostId
   &&r.nativeClosure.evidenceDigest===e.evidenceDigest,'actual_fresh_entry_and_native');
  check(e.targetId===t.targetId&&e.configuration.targetId===t.targetId&&same(e.configuration,prior.last.outcome.evidence.composeRecovery.configuration)
   &&exactNames(e.services,t.baseline.configuration.services),'full_failed_entry_configuration');
  const inv=e.projectInventory,present=e.services.filter(v=>v.presence==='present');
  check(inv.targetId===e.targetId&&fresh(inv.observedAt,now)&&Date.parse(inv.observedAt)<=Date.parse(e.observedAt)
   &&inv.digest===inventoryDigest(inv)&&exactNames(inv.physicalServices,present)
   &&new Set(inv.physicalServices.map(v=>v.containerId)).size===inv.physicalServices.length,'actual_complete_project_inventory');
  check(e.services.every(v=>{const declaration=e.configuration.services.find(q=>q.name===v.name),actual=inv.physicalServices.find(q=>q.name===v.name);
   if(!declaration||v.declarationDigest!==digest(declaration)||v.inventoryDigest!==inv.digest||v.observedAt!==inv.observedAt||v.role!==declaration.role||v.mountDigest!==declaration.mountDigest)return false;
   if(v.presence==='absent')return !actual&&v.role!=='database'&&v.source===declaration.source;
   const {presence:_,declarationDigest:_d,inventoryDigest:_i,observedAt:_at,...physical}=v;return actual&&same(actual,physical);
  }),'present_or_verified_absent_services');
  const oldServices=prior.last.outcome.evidence.composeRecovery.services,db=e.services.find(v=>v.role==='database'),oldDb=oldServices.find(v=>v.role==='database');
  check(db?.presence==='present'&&oldDb&&['containerId','imageDigest','mountDigest'].every(k=>db[k]===oldDb[k]&&db[k]===e.database[k])
   &&db.state==='running'&&db.health==='healthy'&&db.exitCode===0,'protected_database');
  check(exactNames(e.historicalServiceReferences,oldServices)&&e.historicalServiceReferences.every(v=>{const o=oldServices.find(q=>q.name===v.name);return v.containerId===o.containerId&&v.imageDigest===o.imageDigest&&v.failedEvidenceDigest===r.prior.failedEvidenceDigest;}),'immutable_historical_service_references');
  check(e.services.every(v=>{const d=p.baseline.configuration.services.find(q=>q.name===v.name),o=oldServices.find(q=>q.name===v.name);return d&&o&&v.role===d.role&&v.mountDigest===d.mountDigest
   &&(v.presence==='absent'||v.imageDigest===o.imageDigest&&(v.role==='database'||['exited','created','paused'].includes(v.state)&&v.health!== 'healthy'));}),'held_non_database_entry');
  check(e.schemaDigest===m.baseline.schemaDigest&&e.dataDigest===m.baseline.dataDigest
   &&e.sequenceDigest===m.postObservation?.baselineSequenceDigest&&e.databaseSettingsDigest===m.postObservation?.runtimeResume.databaseSettingsDigest
   &&e.ingressSettingsDigest===m.postObservation?.runtimeResume.ingressSettingsDigest,'protected_data_and_settings');
  check(exactNames(e.imageAvailability,p.baseline.images)&&e.imageAvailability.every(v=>v.imageDigest===p.baseline.images.find(q=>q.name===v.name).imageDigest)
   &&e.imageAvailability.every(v=>e.imageAvailability.filter(q=>q.imageDigest===v.imageDigest).every(q=>q.present===v.present))
   &&e.imageAvailability.some(v=>!v.present),'honest_missing_rollback_images');
  check(exactNames(e.cadences,m.postObservation.runtimeResume.cadences)&&e.cadences.every(v=>{const d=m.postObservation.runtimeResume.cadences.find(q=>q.name===v.name),s=e.services.find(q=>q.name===v.name);
   return s?.role==='cadence'&&s.presence===v.presence&&s.state===v.state&&s.containerId===v.containerId&&s.imageDigest===v.imageDigest&&v.behaviorDigest===d.behaviorDigest
    &&(v.presence==='present'||v.inventoryDigest===inv.digest&&v.observedAt===inv.observedAt);
  }),'held_exact_cadences');
  check(r.publication.baseCommit===prior.old.commit&&r.publication.baseTree===prior.old.candidateTree
   &&r.publication.baseCommit!==input.commit&&m.repository.candidateBranch!==prior.old.manifest.repository.candidateBranch,'new_publication_not_old_replay');
  check(fresh(m.backup.restoreVerifiedAt,now,86400000)&&Date.parse(m.backup.capturedAt)<=Date.parse(m.backup.restoreVerifiedAt),'verified_backup_current');
  return prior;
 }
 const compatibleRecoveryAdmissionError=safe((state,input,now,validateClosedPrior)=>{qualifyEntry(state,input,now,validateClosedPrior);});
 function nativeClosed(e,readonly){const v=e?.verification,n=v?.ownedTreeReceipt,a=v?.managedAdmission;
  check(e?.status==='completed'&&!e.contextInvalidatedAt&&!e.errorState&&!e.leaseToken&&!e.leaseExpiresAt
   &&n?.version==='roost-windows-job-v2'&&n.attempt===e.id&&n.rootExit===0&&n.jobClosed===true&&n.cleanup===true&&n.activeProcesses===0
   &&n.assignedBeforeResume===true&&n.resumed===true&&n.killOnClose===true&&n.breakaway===false
   &&hash.safeParse(n.sourceSha256).success&&a?.qualification==='signed_native_v1'&&hash.safeParse(a.evidenceDigest).success&&a.jobSourceDigest===n.sourceSha256,'signed_closed_execution');
  if(readonly){const r=v.readOnlyAudit;check(same(e.changedFiles,[])&&r?.schemaVersion==='roost-readonly-audit-v1'&&r.verdict==='verified'
   &&hash.safeParse(r.evidenceDigest).success&&hash.safeParse(r.preTree).success&&r.preTree===r.postTree
   &&['gitState','processState','dockerState'].every(k=>r[k]==='unchanged')&&same(r.nativeTools,[]),'unchanged_readonly_audit');}
 }
 const compatibleRecoveryAuditError=safe((view,input,sourceView,previous)=>{validEnvelope(input);const a=input.compatibleArtifactRecovery.scopeAudit,e=view?.execution,c=view?.contract,d=view?.decision;
  const closedAt=Date.parse(iso(read(previous.failedClosures?.find(v=>v.id===input.compatibleArtifactRecovery.prior.closureId),'createdAt')));
  nativeClosed(e,true);check(Number.isFinite(closedAt)&&Date.parse(iso(e.completedAt))>=closedAt&&Date.parse(iso(d?.createdAt))>=Date.parse(iso(e.completedAt))
   &&view.current===true&&same(view.roleIssues,[])&&d?.decision==='approve'&&d.id===a.reviewId&&d.materialVersion===a.materialVersion
   &&view.materialVersion===a.materialVersion&&view.approvalCommit===input.commit&&d.evidence?.reviewedCommit===input.commit
   &&e.id===a.executionId&&e.id===input.releaseExecutionId&&e.taskId===a.taskId&&e.applicationId===input.applicationId&&e.agentHostId===input.hostId
   &&c?.assignment?.agentId===input.releaserAgentId&&c.nativeBoundary?.profile==='inspect-readonly'&&c.nativeBoundary.inspectReadOnly?.kind==='auditor'
   &&c.access?.sandbox==='read-only'&&c.access.externalWrites===false&&same(c.access.tools,['repository_read'])&&same(c.access.permissions,['repository_read'])
   &&sourceView?.execution?.id!==e.id&&sourceView?.decision?.id!==d.id&&sourceView?.contract?.assignment?.agentId
   &&d.verifierId!==input.releaserAgentId&&d.verifierId!==sourceView.contract.assignment.agentId,'independent_current_scope_audit');
  check(d.evidence.evidence?.some(v=>v.kind==='artifact'&&v.verdict==='pass'&&v.reference==='roost-release-compatible-artifact-scope:'+a.scopeDigest)
   &&d.evidence.evidence.some(v=>v.kind==='test'&&v.verdict==='pass'),'exact_scope_artifact');
 });
 const compatibleRecoveryReplacementError=safe((input,sourceView,build,compatibility,now,qualifyBuildProof)=>{validEnvelope(input);const r=input.compatibleArtifactRecovery.replacement,e=sourceView?.execution,d=sourceView?.decision,c=sourceView?.contract,m=input.manifest,t=m.deployment.targets[0];
  nativeClosed(e,false);check(sourceView.current===true&&same(sourceView.roleIssues,[])&&d?.decision==='approve'&&d.id===input.reviewId
   &&d.materialVersion===input.materialVersion&&sourceView.materialVersion===input.materialVersion&&sourceView.approvalCommit===input.commit
   &&d.evidence?.reviewedCommit===input.commit&&e.taskId===input.taskId&&e.applicationId===input.applicationId&&e.agentHostId===input.hostId
   &&c?.assignment?.agentId!==input.releaserAgentId&&c.assignment.agentId!==d.verifierId&&d.verifierId!==input.releaserAgentId
   &&e.metadata?.resultRevision?.commit===input.commit&&e.metadata.resultRevision.workingTree==='clean'
   &&c.nativeBoundary?.profile==='coding-local'&&c.modelSelection?.schemaVersion==='roost-managed-hermes-backend-v1'
   &&c.modelSelection.backend==='codex_responses'&&e.verification.codingTests?.schemaVersion==='roost-coding-tests-v1'
   &&e.verification.codingTests.passed===true&&e.verification.localCommit?.schemaVersion==='roost-local-commit-v1'
   &&e.verification.localCommit.executionId===e.id&&e.verification.localCommit.commit===input.commit
   &&e.verification.localCommit.tree===input.candidateTree&&e.verification.localCommit.testDigest===e.verification.codingTests.digest
   &&e.verification.localCommit.baselineCommit===input.compatibleArtifactRecovery.publication.baseCommit
   &&e.verification.localCommit.branch===m.repository.candidateBranch&&e.verification.localCommit.remotePush===false
   &&e.verification.localCommit.deployment===false,'new_exact_source_acceptance');
  check(r.commit===input.commit&&r.tree===input.candidateTree&&r.commit===t.configuration.gitCommit&&r.schemaDigest===m.baseline.schemaDigest
   &&m.deployment.schemaDigest===m.baseline.schemaDigest&&r.artifactSetDigest===m.deployment.artifactSetDigest
   &&r.configurationDigest===m.deployment.configDigest&&exactNames(r.images,t.configuration.services.filter(v=>v.source==='built'))
   &&r.images.every(v=>v.commit===input.commit&&v.tree===input.candidateTree&&m.cleanup.protectedResourceIds.includes(v.imageDigest)),'exact_replacement_tuple');
  check(compatibilitySchema.safeParse(compatibility).success&&compatibility.evidenceDigest===compatibilityDigest(compatibility)
   &&r.compatibilityReceiptDigest===digest(compatibility)&&fresh(compatibility.observedAt,now,86400000)
   &&Date.parse(compatibility.observedAt)>=Date.parse(m.backup.restoreVerifiedAt)
   &&['commit','tree','artifactSetDigest','configurationDigest','images','schemaDigest'].every(k=>same(compatibility[k],r[k]))
   &&compatibility.dataDigest===m.baseline.dataDigest&&compatibility.sequenceDigest===m.postObservation.baselineSequenceDigest
   &&compatibility.backupDigest===m.backup.digest&&compatibility.sourceExecutionId===e.id,'new_linux_restored_compatibility');
  check(buildSchema.safeParse(build).success&&build.evidenceDigest===compatibilityDigest(build)&&build.evidenceDigest===r.buildReceiptDigest&&build.executionId===compatibility.buildExecutionId
   &&build.sourceExecutionId===e.id&&build.commit===input.commit&&build.tree===input.candidateTree&&same(build.images,r.images)
   &&build.artifactSetDigest===r.artifactSetDigest&&build.configurationDigest===r.configurationDigest&&build.nativeReceiptDigest===compatibility.nativeReceiptDigest
   &&build.signedNativeVerified===true&&build.ownedJobClosed===true&&build.sourceUnchanged===true&&fresh(build.observedAt,now,86400000)
   &&Date.parse(build.observedAt)<=Date.parse(compatibility.observedAt),'authentic_new_build_proof');
  check(typeof qualifyBuildProof==='function'&&qualifyBuildProof(build,compatibility,input)===null,'core_build_proof_validator_required');
 });
 function compatibleRecoveryFailureState(state){const bad=(state.journal??[]).some(v=>!v.outcome||['failed','absent','uncertain'].includes(effective(v.outcome)));
  const held=!(state.journal??[]).some(v=>v.operation==='runtime_resume'&&effective(v.outcome)==='succeeded');
  return {schemaVersion:'roost-compatible-recovery-failure-disposition-v1',frozen:bad,configurationRollbackAllowed:false,healthyRollbackProven:false,
   dbPreservationMustBeReinspected:bad,keepIngressBlocked:bad||held,keepCadencesHeld:bad||held,normalReconciliationRequired:bad,
   historicalBaselineCertified:false,newHealthyBaselineCertified:false,releaseAuthority:false};}
 function nextCompatibleRecoveryOperation(state){const s=state?.release?.snapshot;validEnvelope(s);const j=state.journal??[];
  check(Array.isArray(j)&&j.length<=sequence.length,'bounded_journal');
  for(let i=0;i<j.length;i++){check(j[i].operation===sequence[i]&&j[i].intent?.operation===sequence[i]
   &&j[i].intent.manifestDigest===s.manifestDigest&&j[i].intent.commit===s.commit,'own_operation_sequence');
   if(effective(j[i].outcome)!=='succeeded'){check(i===j.length-1,'no_effect_after_unresolved');
    return !j[i].outcome||effective(j[i].outcome)==='uncertain'?'reconcile':'frozen';}}
  if(state.status!=='active')return null;return sequence[j.length]??null;
 }
 const compatibleRecoveryIntentError=safe((state,intent)=>{const s=state?.release?.snapshot;validEnvelope(s);
  check(nextCompatibleRecoveryOperation(state)===intent.operation&&intent.manifestDigest===s.manifestDigest&&intent.commit===s.commit
   &&intent.baseCommit===s.baseCommit&&intent.observed?.commit===s.commit&&intent.observed.manifestDigest===s.manifestDigest,'exact_next_intent');
  const beforeMerge=(state.journal??[]).every(v=>v.operation!=='merge'||effective(v.outcome)!=='succeeded'),p=s.compatibleArtifactRecovery.publication;
  check(intent.observed.baseCommit===(beforeMerge?p.baseCommit:s.commit)&&intent.observed.baseTree===(beforeMerge?p.baseTree:s.candidateTree),'exact_own_git_base');
  if(['deploy_config','deploy'].includes(intent.operation)){const r=s.compatibleArtifactRecovery.replacement;
   check(intent.parameters?.commit===s.commit&&intent.parameters.artifactSetDigest===r.artifactSetDigest
    &&intent.parameters.configDigest===r.configurationDigest&&intent.parameters.schemaDigest===r.schemaDigest
    &&(intent.operation!=='deploy'||intent.parameters.targetId===s.manifest.deployment.targetId),'exact_replacement_intent');}
  if(intent.operation==='observe')check(intent.parameters?.mode==='candidate','no_historical_rollback_observe');
 });
 const compatibleRecoveryOutcomeError=safe((input,operation,outcome,qualifyCanonicalOutcome)=>{validEnvelope(input);
  check(sequence.includes(operation?.operation)&&operation.intent?.manifestDigest===input.manifestDigest&&operation.intent.commit===input.commit,'own_outcome');
  check(['succeeded','failed','uncertain','reconciled'].includes(outcome?.status)
   &&(outcome.status==='reconciled'?['succeeded','failed','absent'].includes(effective(outcome))&&outcome.observationOnly===true
    :!own(outcome,'reconciledStatus')&&!own(outcome,'reconciled_status')),'normal_outcome_shape');
  check(typeof qualifyCanonicalOutcome==='function','canonical_outcome_validator_required');
  check(qualifyCanonicalOutcome(input,operation,outcome)===null,'canonical_outcome');
  if(effective(outcome)==='succeeded'&&['deploy','observe'].includes(operation.operation)){const e=outcome.evidence,r=input.compatibleArtifactRecovery.replacement;
   check(e?.healthy===true&&e.deployedCommit===input.commit&&e.deployedTree===input.candidateTree&&e.artifactSetDigest===r.artifactSetDigest
    &&e.configDigest===r.configurationDigest&&e.schemaDigest===r.schemaDigest&&e.dataDigest===input.manifest.baseline.dataDigest,'new_runtime_only');
   if(operation.operation==='observe')check(operation.intent.parameters?.mode==='candidate'&&e.observationSeconds>=input.manifest.observation.seconds,'full_candidate_observation');}
 });
 return Object.freeze({compatibleArtifactRecoverySchema,compatibleRecoveryEntrySchema:entrySchema,compatibleRecoveryCompatibilitySchema:compatibilitySchema,
  compatibleRecoveryBuildSchema:buildSchema,compatibleRecoveryInventorySchema:inventorySchema,compatibleRecoveryInventoryDigest:inventoryDigest,
  compatibleRecoveryScopeDigest,compatibleRecoveryEntryDigest:entryDigest,compatibleRecoveryCompatibilityDigest:compatibilityDigest,
  compatibleRecoveryAdmissionError,compatibleRecoveryAuditError,compatibleRecoveryReplacementError,compatibleRecoveryIntentError,
  compatibleRecoveryOutcomeError,nextCompatibleRecoveryOperation,compatibleRecoveryFailureState,compatibleRecoveryOperations:sequence});
}
module.exports={createCompatibleRecoveryContract};
