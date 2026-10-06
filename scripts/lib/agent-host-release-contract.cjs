"use strict";
const { z } = require("zod");
const { createHash } = require("node:crypto");
// The pure CommonJS engine also backs the ESM transport wrapper; no loader cycle.
const compose = require('./agent-host-release-compose-state.cjs');
const baselineRevalidation = require('./agent-host-release-baseline-revalidation.cjs');
const id=z.string().uuid(), sha=z.string().regex(/^[a-f0-9]{40}$/), hash=z.string().regex(/^[a-f0-9]{64}$/);
const text=z.string().trim().min(1).max(1000).refine(v=>!/(?:cc_v1_[A-Za-z0-9_-]{24,}|Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(v),"Credentials prohibited");
const url=z.string().url().max(2000).refine(v=>{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash;},"HTTPS URL without credentials required");
const dir=text.refine(v=>/^[A-Za-z]:[\\/]/.test(v)&&!v.split(/[\\/]/).includes(".."),"Canonical Windows directory required");
const image=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const artifact=z.object({commit:sha,imageDigest:image,configDigest:hash,schemaDigest:hash}).strict();
const manifestObject=z.object({schemaVersion:z.literal("roost-release-manifest-v1"),
 repository:z.object({url,defaultBranch:text,canonicalDir:dir,candidateBranch:text}).strict(),
 deployment:z.object({provider:z.literal("coolify"),targetId:text,controllerUrl:url,url,imageDigest:image,configDigest:hash,schemaDigest:hash}).strict(),
 services:z.array(z.object({name:text,healthUrl:url,expectedStatus:z.number().int().min(200).max(299)}).strict()).min(1).max(12),
 baseline:artifact.extend({healthDigest:hash,dataDigest:hash,observedAt:z.string().datetime()}).strict(),
 observation:z.object({seconds:z.number().int().min(1).max(1800),intervalSeconds:z.number().int().min(1).max(300),maxFailures:z.number().int().min(0).max(3)}).strict(),
 backup:z.object({digest:hash,bytes:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),capturedAt:z.string().datetime(),restoreVerifiedAt:z.string().datetime(),restoreDigest:hash}).strict(),
 rollback:artifact.extend({compatibleSchemaDigests:z.array(hash).min(1).max(8)}).strict(),
 cleanup:z.object({repositoryUrl:url,canonicalDir:dir,coolifyTargetId:text,ownedResourceIds:z.array(text).max(30),archiveRepository:z.literal(true)}).strict()
}).strict();
const refineManifest=(m,c)=>{
 const issue=message=>c.addIssue({code:"custom",message});
 if(m.repository.defaultBranch===m.repository.candidateBranch)issue("candidate_branch_must_differ");
 if(m.services.some(s=>new URL(s.healthUrl).origin!==new URL(m.deployment.url).origin))issue("health_origin_mismatch");
 if(m.backup.restoreDigest!==m.backup.digest||Date.parse(m.backup.restoreVerifiedAt)<Date.parse(m.backup.capturedAt))issue("restore_unverified");
 if(!m.rollback.compatibleSchemaDigests.includes(m.baseline.schemaDigest)||!m.rollback.compatibleSchemaDigests.includes(m.deployment.schemaDigest))issue("rollback_schema_incompatible");
 if(["commit","imageDigest","configDigest","schemaDigest"].some(k=>m.rollback[k]!==m.baseline[k]))issue("rollback_baseline_mismatch");
 if(m.cleanup.repositoryUrl!==m.repository.url||m.cleanup.canonicalDir!==m.repository.canonicalDir||m.cleanup.coolifyTargetId!==m.deployment.targetId)issue("cleanup_scope_mismatch");
 if(m.observation.intervalSeconds>m.observation.seconds)issue("observation_interval_invalid");
 if(new Set(m.cleanup.ownedResourceIds).size!==m.cleanup.ownedResourceIds.length)issue("cleanup_resources_duplicate");
 if(JSON.stringify(m).length>60000)issue("manifest_too_large");
};
// v1 is deliberately unchanged: historical certification snapshots and their
// digests remain valid. Permanent applications opt into a separate wire shape.
const certificationManifestSchema=manifestObject.superRefine(refineManifest);
const applicationManifestObject=manifestObject.extend({schemaVersion:z.literal("roost-release-manifest-v2"),purpose:z.literal("application_release"),
 cleanup:manifestObject.shape.cleanup.extend({archiveRepository:z.literal(false),protectedResourceIds:z.array(text).min(1).max(100)}).strict()
}).strict();
const refineApplicationManifest=(m,c)=>{
 refineManifest(m,c);
 const issue=message=>c.addIssue({code:"custom",message});
 if(new Set(m.cleanup.protectedResourceIds).size!==m.cleanup.protectedResourceIds.length)issue("protected_resources_duplicate");
 if(!m.cleanup.protectedResourceIds.includes(m.deployment.targetId))issue("application_target_not_protected");
 if(m.cleanup.ownedResourceIds.some(id=>m.cleanup.protectedResourceIds.includes(id)))issue("cleanup_protected_resource");
};
const applicationManifestSchema=applicationManifestObject.superRefine(refineApplicationManifest);
const gitSetTarget=z.object({targetId:text,name:text,dockerfile:text,configDigest:hash,
 baseline:z.object({commit:sha,tree:sha,imageDigest:image,configDigest:hash}).strict()}).strict();
const sourceSetArtifact=z.object({commit:sha,artifactSetDigest:hash,configDigest:hash,schemaDigest:hash}).strict();
const gitSetManifestObject=applicationManifestObject.extend({
 services:z.array(manifestObject.shape.services.element.extend({expectedJsonStatus:z.enum(['ok','ready']).optional()}).strict()).min(1).max(12),
 deployment:z.object({provider:z.literal('coolify_git_set'),targetId:text,controllerUrl:url,url,
  artifactSetDigest:hash,configDigest:hash,schemaDigest:hash,publicOrigins:z.array(url).min(1).max(8),targets:z.array(gitSetTarget).min(1).max(6)}).strict(),
 baseline:sourceSetArtifact.extend({healthDigest:hash,dataDigest:hash,observedAt:z.string().datetime()}).strict(),
 rollback:sourceSetArtifact.extend({compatibleSchemaDigests:z.array(hash).min(1).max(8)}).strict()
}).strict();
const isGitSetManifest=m=>retainsApplication(m)&&m?.deployment?.provider==='coolify_git_set';
const gitSetArtifactDigest=(m,b,rollback=false)=>releaseDigest(m.deployment.targets.map(t=>({targetId:t.targetId,
 commit:rollback?t.baseline.commit:b.commit,tree:rollback?t.baseline.tree:b.candidateTree,dockerfile:t.dockerfile,
 configDigest:rollback?t.baseline.configDigest:t.configDigest})).sort((a,b)=>a.targetId<b.targetId?-1:a.targetId>b.targetId?1:0));
const gitSetManifestSchema=gitSetManifestObject.superRefine((m,c)=>{
 const issue=message=>c.addIssue({code:'custom',message});
 if(m.repository.defaultBranch===m.repository.candidateBranch)issue('candidate_branch_must_differ');
 const ids=m.deployment.targets.map(t=>t.targetId),origins=m.deployment.publicOrigins;
 if(new Set(ids).size!==ids.length||new Set(m.deployment.targets.map(t=>t.name)).size!==ids.length)issue('deployment_targets_duplicate');
 if(!ids.includes(m.deployment.targetId)||ids.some(id=>!m.cleanup.protectedResourceIds.includes(id)))issue('application_targets_not_protected');
 if(origins.some(value=>new URL(value).pathname!=='/')||new Set(origins).size!==origins.length
  ||!origins.includes(new URL(m.deployment.url).origin)||m.services.some(s=>!origins.includes(new URL(s.healthUrl).origin)))issue('health_origin_mismatch');
 if(m.deployment.targets.some(t=>!/^\/[A-Za-z0-9._/-]+$/.test(t.dockerfile)||t.dockerfile.split('/').includes('..')))issue('dockerfile_scope_invalid');
 if(m.backup.restoreDigest!==m.backup.digest||Date.parse(m.backup.restoreVerifiedAt)<Date.parse(m.backup.capturedAt))issue('restore_unverified');
 if(!m.rollback.compatibleSchemaDigests.includes(m.baseline.schemaDigest)||!m.rollback.compatibleSchemaDigests.includes(m.deployment.schemaDigest))issue('rollback_schema_incompatible');
 if(['commit','artifactSetDigest','configDigest','schemaDigest'].some(k=>m.rollback[k]!==m.baseline[k]))issue('rollback_baseline_mismatch');
 if(m.baseline.artifactSetDigest!==gitSetArtifactDigest(m,{},true))issue('baseline_source_set_mismatch');
 const aggregate=releaseDigest(m.deployment.targets.map(t=>({targetId:t.targetId,configDigest:t.configDigest})).sort((a,b)=>a.targetId<b.targetId?-1:a.targetId>b.targetId?1:0));
 const baselineAggregate=releaseDigest(m.deployment.targets.map(t=>({targetId:t.targetId,configDigest:t.baseline.configDigest})).sort((a,b)=>a.targetId<b.targetId?-1:a.targetId>b.targetId?1:0));
 if(m.deployment.configDigest!==aggregate||m.baseline.configDigest!==baselineAggregate)issue('configuration_set_mismatch');
 if(m.cleanup.repositoryUrl!==m.repository.url||m.cleanup.canonicalDir!==m.repository.canonicalDir||m.cleanup.coolifyTargetId!==m.deployment.targetId)issue('cleanup_scope_mismatch');
 if(new Set(m.cleanup.ownedResourceIds).size!==m.cleanup.ownedResourceIds.length||new Set(m.cleanup.protectedResourceIds).size!==m.cleanup.protectedResourceIds.length
  ||m.cleanup.ownedResourceIds.some(id=>m.cleanup.protectedResourceIds.includes(id)))issue('cleanup_protected_resource');
 if(m.observation.intervalSeconds>m.observation.seconds)issue('observation_interval_invalid');
 if(JSON.stringify(m).length>60000)issue('manifest_too_large');
});
const composeTarget=z.object({targetId:text,name:text,composePath:text,sourceDigest:hash,configDigest:hash,
 configuration:compose.composeConfigurationSchema,
 rollbackConfiguration:compose.composeConfigurationSchema,rollbackConfigDigest:hash,
 baseline:z.object({commit:sha,tree:sha,sourceDigest:hash,configDigest:hash,configuration:compose.composeConfigurationSchema,
  controllerInvariants:z.object({rendererDigest:hash,settingsInvariantDigest:hash,runtimeInvariantDigest:hash}).strict(),
  images:z.array(z.object({name:text,imageDigest:image}).strict()).min(2).max(11)}).strict()}).strict();
// Opt-in only: historical v1/v2 snapshots and their digests stay unchanged.
// No text, credentials, SQL or commands are accepted in the fixture scope.
const postObservationScopeSchema=z.object({schemaVersion:z.literal('roost-release-post-observation-v1'),
 kind:z.literal('synthetic_recent_activity'),candidateCommit:sha,candidateTree:sha,controllerDigest:hash,
 fixture:z.object({fixtureId:id,userId:id,sessionId:id,eventId:id,traceId:id,memoryId:z.number().int().min(-2147483648).max(-1),
  markerDigest:hash,summaryDigest:hash}).strict(),baselineSequenceDigest:hash,
 // This budget governs the synthetic fixture only. Restored cadence effects are
 // separately, explicitly accepted by runtimeResume's sealed behavior hashes.
 budget:z.object({providerRequests:z.literal(0),externalActions:z.literal(0)}).strict(),
 runtimeResume:z.object({approved:z.literal(true),databaseSettingsDigest:hash,ingressSettingsDigest:hash,
  observationSeconds:z.number().int().min(1).max(300),cadences:z.array(z.object({name:text,
   behavior:z.literal('restore_existing_loop'),behaviorDigest:hash}).strict()).min(1).max(10)}).strict()
}).strict().superRefine((p,c)=>{if(new Set(p.runtimeResume.cadences.map(r=>r.name)).size!==p.runtimeResume.cadences.length
 ||new Set([p.fixture.userId,p.fixture.sessionId,p.fixture.eventId,p.fixture.traceId,p.fixture.fixtureId]).size!==5)
 c.addIssue({code:'custom',message:'post_observation_identity_conflict'});});
const composeManifestObject=gitSetManifestObject.extend({postObservation:postObservationScopeSchema.optional(),deployment:gitSetManifestObject.shape.deployment.extend({
 provider:z.literal('coolify_compose'),targets:z.array(composeTarget).length(1)
}).strict()}).strict();
const isComposeManifest=m=>retainsApplication(m)&&m?.deployment?.provider==='coolify_compose';
const isReleaseSetManifest=m=>isGitSetManifest(m)||isComposeManifest(m);
const sourceArtifactDigest=(m,b,rollback=false)=>isComposeManifest(m)?releaseDigest(m.deployment.targets.map(t=>({
 targetId:t.targetId,composePath:t.composePath,commit:rollback?t.baseline.commit:b.commit,tree:rollback?t.baseline.tree:b.candidateTree,
 sourceDigest:rollback===true?t.rollbackConfiguration.sourceDigest:rollback==='baseline'?t.baseline.sourceDigest:t.sourceDigest,
 configDigest:rollback===true?t.rollbackConfigDigest:rollback==='baseline'?t.baseline.configDigest:t.configDigest,
 services:(rollback===true?t.rollbackConfiguration:rollback==='baseline'?t.baseline.configuration:t.configuration).services.slice().sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0),
 ...(rollback?{images:t.baseline.images.slice().sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)}:{})
})).sort((a,b)=>a.targetId<b.targetId?-1:a.targetId>b.targetId?1:0)):gitSetArtifactDigest(m,b,rollback);
const composeManifestSchema=composeManifestObject.superRefine((m,c)=>{
 const issue=message=>c.addIssue({code:'custom',message});
 const t=m.deployment.targets[0],current=t.configuration,baseline=t.baseline.configuration,recovery=t.rollbackConfiguration;
 if([current,baseline,recovery].some(config=>!compose.composeConfigurationSchema.safeParse(config).success)){
  issue('compose_configuration_invalid');return;
 }
 if(m.repository.defaultBranch===m.repository.candidateBranch)issue('candidate_branch_must_differ');
 if(t.targetId!==m.deployment.targetId||t.targetId!==current.targetId||t.targetId!==baseline.targetId
  ||t.composePath!==current.composePath||t.composePath!==baseline.composePath
  ||[current,baseline,recovery].some(config=>config.targetId!==t.targetId||config.composePath!==t.composePath
   ||config.repositoryUrl!==m.repository.url||config.branch!==m.repository.defaultBranch)
  ||t.sourceDigest!==current.sourceDigest||t.baseline.sourceDigest!==baseline.sourceDigest
  ||t.baseline.commit!==baseline.gitCommit||t.baseline.commit!==m.baseline.commit||recovery.gitCommit!==t.baseline.commit)issue('compose_source_binding_invalid');
 if(t.configDigest!==compose.composeConfigurationDigest(current)||t.baseline.configDigest!==compose.composeConfigurationDigest(baseline)
  ||m.deployment.configDigest!==releaseDigest([{targetId:t.targetId,configDigest:t.configDigest}])
  ||t.rollbackConfigDigest!==compose.composeConfigurationDigest(recovery)
  ||m.rollback.configDigest!==releaseDigest([{targetId:t.targetId,configDigest:t.rollbackConfigDigest}])
  ||m.baseline.configDigest!==releaseDigest([{targetId:t.targetId,configDigest:t.baseline.configDigest}]))issue('configuration_set_mismatch');
 const policies=[current.controllerPolicy,recovery.controllerPolicy],invariants=t.baseline.controllerInvariants;
 const hasController=policies.every(Boolean);
 if(!hasController||policies.some((policy,index)=>policy?.phase!==['candidate','rollback'][index])
  ||baseline.controllerPolicy&&baseline.controllerPolicy.phase!=='baseline')issue('controller_policy_phase_invalid');
 if([...policies,...(baseline.controllerPolicy?[baseline.controllerPolicy]:[])].some(policy=>!policy
  ||['rendererDigest','settingsInvariantDigest','runtimeInvariantDigest'].some(k=>policy[k]!==invariants[k]))
  ||[baseline,current,recovery].some(config=>config.sourcePins.controllerRenderer!==invariants.rendererDigest))issue('controller_policy_invariant_changed');
 const stableRecovery=config=>{
  const {gitCommit:_pin,sourceDigest:_source,composeDigest:_compose,...stable}=config;
  if(hasController){delete stable.settingsDigest;delete stable.runtimePolicyDigest;delete stable.controllerPolicy;}
  return {...stable,services:stable.services.slice().sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)};
 };
 if(releaseDigest(stableRecovery(baseline))!==releaseDigest(stableRecovery(recovery)))issue('rollback_configuration_incompatible');
 // Data-bearing service images and mounts cannot drift during a source release.
 const protectedServices=rows=>rows.map(({name,role,source,mountDigest,imageDigest})=>({name,role,source,mountDigest,...(imageDigest?{imageDigest}:{})})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 if(releaseDigest(protectedServices(current.services))!==releaseDigest(protectedServices(baseline.services)))issue('compose_storage_binding_changed');
 const built=baseline.services.filter(s=>s.source==='built'),images=t.baseline.images;
 if(images.length!==built.length||new Set(images.map(row=>row.name)).size!==images.length
  ||built.some(s=>!images.some(row=>row.name===s.name)))issue('rollback_images_incomplete');
 if(!m.cleanup.protectedResourceIds.includes(t.targetId)
  ||images.some(row=>!m.cleanup.protectedResourceIds.includes(row.imageDigest))
  ||baseline.services.some(row=>!m.cleanup.protectedResourceIds.includes(row.mountDigest)
   ||row.source==='image'&&!m.cleanup.protectedResourceIds.includes(row.imageDigest)))issue('application_resources_not_protected');
 const origins=m.deployment.publicOrigins;
 if(origins.some(value=>new URL(value).pathname!=='/')||new Set(origins).size!==origins.length
  ||!origins.includes(new URL(m.deployment.url).origin)||m.services.some(s=>!origins.includes(new URL(s.healthUrl).origin)))issue('health_origin_mismatch');
 if(m.backup.restoreDigest!==m.backup.digest||Date.parse(m.backup.restoreVerifiedAt)<Date.parse(m.backup.capturedAt))issue('restore_unverified');
 if(!m.rollback.compatibleSchemaDigests.includes(m.baseline.schemaDigest)||!m.rollback.compatibleSchemaDigests.includes(m.deployment.schemaDigest))issue('rollback_schema_incompatible');
 if(['commit','schemaDigest'].some(k=>m.rollback[k]!==m.baseline[k]))issue('rollback_baseline_mismatch');
 if(m.baseline.artifactSetDigest!==sourceArtifactDigest(m,{},'baseline')||m.rollback.artifactSetDigest!==sourceArtifactDigest(m,{},true))issue('baseline_source_set_mismatch');
 if(m.cleanup.repositoryUrl!==m.repository.url||m.cleanup.canonicalDir!==m.repository.canonicalDir||m.cleanup.coolifyTargetId!==t.targetId)issue('cleanup_scope_mismatch');
 if(new Set(m.cleanup.ownedResourceIds).size!==m.cleanup.ownedResourceIds.length||new Set(m.cleanup.protectedResourceIds).size!==m.cleanup.protectedResourceIds.length
  ||m.cleanup.ownedResourceIds.some(id=>m.cleanup.protectedResourceIds.includes(id)))issue('cleanup_protected_resource');
 if(m.observation.intervalSeconds>m.observation.seconds)issue('observation_interval_invalid');
 if(m.postObservation){const p=m.postObservation,cadences=current.services.filter(r=>r.role==='cadence');
  if(p.candidateCommit!==current.gitCommit
   ||[current,baseline,recovery].some(config=>config.services.some(r=>r.role==='cadence'&&r.expectedState!=='paused'))||cadences.length!==p.runtimeResume.cadences.length
   ||cadences.some(r=>!p.runtimeResume.cadences.some(x=>x.name===r.name)))issue('post_observation_scope_changed');}
 if(JSON.stringify(m).length>60000)issue('manifest_too_large');
});
const manifestSchema=z.union([certificationManifestSchema,applicationManifestSchema,gitSetManifestSchema,composeManifestSchema]);
const retainsApplication=m=>m?.schemaVersion==="roost-release-manifest-v2"&&m?.purpose==="application_release"&&m?.cleanup?.archiveRepository===false;
const releaseExpirySchema=z.string().datetime();
const predecessorSchema=z.object({releaseId:id,expectedVersion:hash}).strict();
const baselineRestartSchema=predecessorSchema.extend({closureId:id,consentDigest:hash}).strict();
const composeQueueAbsenceBaselineAdoptionSchema=z.object({schemaVersion:z.literal('roost-compose-queue-absence-baseline-adoption-v1'),
 releaseId:id,closureId:id,closureDigest:hash,failedOperationId:id,failedOutcomeId:id,failedEvidenceDigest:hash,targetId:text,
 previousManifestDigest:hash,previousRendererDigest:hash,newRendererDigest:hash,previousRollbackConfigurationDigest:hash,
 retainedServicesDigest:hash}).strict();
// A terminal queue failure is not queue absence or a successful rollback.
// This sibling admission retains those failures and seals only the repaired
// controller projection, while data/source/service policy remains unchanged.
const composeRetainedBaselineAdoptionSchema=composeQueueAbsenceBaselineAdoptionSchema.extend({
 schemaVersion:z.literal('roost-compose-retained-baseline-adoption-v1'),
 candidateControllerPolicy:compose.composeControllerPolicySchema,
 rollbackControllerPolicy:compose.composeControllerPolicySchema,
 candidateSettingsDigest:hash,candidateRuntimePolicyDigest:hash,
 rollbackSettingsDigest:hash,rollbackRuntimePolicyDigest:hash}).strict();
const baselineRevalidationSchema=baselineRevalidation.createBaselineRevalidationSchema(sourceSetArtifact.extend({healthDigest:hash,dataDigest:hash}).strict());
// Git publication may advance from a different exact main than the deployed rollback baseline.
const gitPublicationBaseSchema=z.object({commit:sha,tree:sha}).strict();
const releaseGitPublicationBase=s=>s.gitPublicationBase??{commit:s.baseCommit,tree:s.baseTree};
const createReleaseSchema=z.object({requestId:id,taskId:id,applicationId:id,hostId:id,releaseExecutionId:id,releaserAgentId:id,releaserCredentialId:id,credentialVersion:z.number().int().positive(),reviewId:id,materialVersion:hash,commit:sha,candidateTree:sha,baseCommit:sha,baseTree:sha,releaserRevision:z.string().datetime(),expiresAt:releaseExpirySchema,manifest:manifestSchema,manifestDigest:hash,predecessor:predecessorSchema.optional(),baselineRestart:baselineRestartSchema.optional(),baselineAdoption:z.union([composeQueueAbsenceBaselineAdoptionSchema,composeRetainedBaselineAdoptionSchema]).optional(),baselineRevalidation:baselineRevalidationSchema.optional(),gitPublicationBase:gitPublicationBaseSchema.optional()}).strict().superRefine((s,c)=>{
 if(s.gitPublicationBase&&(!isComposeManifest(s.manifest)||s.predecessor||s.baselineRestart||s.baselineAdoption||s.gitPublicationBase.commit===s.commit))c.addIssue({code:'custom',message:'release_git_publication_base_scope_invalid'});
 if(isReleaseSetManifest(s.manifest)&&(s.manifest.deployment.artifactSetDigest!==sourceArtifactDigest(s.manifest,s)||s.manifest.baseline.commit!==s.baseCommit))c.addIssue({code:'custom',message:'release_source_set_mismatch'});
 if(isComposeManifest(s.manifest)&&s.manifest.deployment.targets.some(t=>t.configuration.gitCommit!==s.commit||t.baseline.tree!==s.baseTree))c.addIssue({code:'custom',message:'release_compose_source_changed'});
 if(s.manifest.postObservation&&(s.manifest.postObservation.candidateCommit!==s.commit||s.manifest.postObservation.candidateTree!==s.candidateTree))c.addIssue({code:'custom',message:'release_post_observation_source_changed'});
 if(s.predecessor&&!isReleaseSetManifest(s.manifest))c.addIssue({code:'custom',message:'release_successor_scope_invalid'});
 if(s.baselineRestart&&(!isReleaseSetManifest(s.manifest)||s.predecessor))c.addIssue({code:'custom',message:'release_restart_scope_invalid'});
 if(s.baselineAdoption&&(!isComposeManifest(s.manifest)||!s.baselineRestart||!s.baselineRevalidation
  ||s.baselineAdoption.releaseId!==s.baselineRestart.releaseId||s.baselineAdoption.closureId!==s.baselineRestart.closureId
  ||s.baselineAdoption.targetId!==s.manifest.deployment.targets[0].targetId
  ||s.baselineAdoption.previousRendererDigest===s.baselineAdoption.newRendererDigest
  ||s.baselineAdoption.newRendererDigest!==s.manifest.deployment.targets[0].baseline.controllerInvariants.rendererDigest))c.addIssue({code:'custom',message:'release_baseline_adoption_unproven'});
 const baselineError=baselineRevalidation.baselineRevalidationBindingError(s,baselineRevalidationSchema,releaseDigest);if(baselineError)c.addIssue({code:'custom',message:baselineError});
});
const postObservationOperations=['smoke','fixture_cleanup','runtime_resume'];
const operations=["push","pr","review","merge","deploy_config","deploy","observe","rollback_config","rollback",...postObservationOperations,"cleanup_resource","archive_repository","cleanup_local","cleanup"];
const parametersSchema=z.object({postObservationDigest:hash.optional(),targetId:text.optional(),branch:text.optional(),pullRequestNumber:z.number().int().positive().optional(),deploymentId:text.optional(),commit:sha.optional(),imageDigest:image.optional(),artifactSetDigest:hash.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),mode:z.enum(["candidate","rollback"]).optional(),faultInjection:z.boolean().optional(),resourceId:text.optional(),resourceIds:z.array(text).max(30).optional()}).strict();
const intentSchema=z.object({requestId:id,operation:z.enum(operations),manifestDigest:hash,commit:sha,baseCommit:sha,expectedVersion:hash,observed:z.object({commit:sha,baseCommit:sha,baseTree:sha,manifestDigest:hash}).strict(),parameters:parametersSchema}).strict().superRefine((v,c)=>{
 const allowed={push:["branch"],pr:[],review:["pullRequestNumber"],merge:["pullRequestNumber"],deploy_config:["commit","imageDigest","artifactSetDigest","configDigest","schemaDigest"],deploy:["targetId","commit","imageDigest","artifactSetDigest","configDigest","schemaDigest","faultInjection"],observe:["mode"],rollback_config:["commit","imageDigest","artifactSetDigest","configDigest","schemaDigest"],rollback:["targetId","commit","imageDigest","artifactSetDigest","configDigest","schemaDigest"],smoke:['postObservationDigest'],fixture_cleanup:['postObservationDigest'],runtime_resume:['postObservationDigest'],cleanup_resource:["resourceId"],archive_repository:[],cleanup_local:[],cleanup:["resourceIds"]}[v.operation];
 if(Object.keys(v.parameters).some(k=>!allowed.includes(k)))c.addIssue({code:"custom",message:"operation_parameters_outside_scope"});
 if(postObservationOperations.includes(v.operation)&&!v.parameters.postObservationDigest)c.addIssue({code:'custom',message:'post_observation_scope_digest_required'});
});
const deploymentIdentity=z.object({targetId:text,deploymentId:text}).strict();
// This is server-derived immutable evidence, never owner-supplied create input.
const releaseSuccessorBasisSchema=z.object({schemaVersion:z.literal('roost-release-successor-v1'),releaseId:id,expectedVersion:hash,
 mergeOperationId:id,rollbackObservationOperationId:id,cleanupOperationId:id,
 rollbackDeploymentIds:z.array(deploymentIdentity).min(1).max(6)}).strict();
const releaseHasSuccessor=s=>{
 const parsed=releaseSuccessorBasisSchema.safeParse(s?.successorBasis);
 if(!parsed.success||!isReleaseSetManifest(s?.manifest)||!manifestSchema.safeParse(s.manifest).success||parsed.data.releaseId!==s.predecessor?.releaseId
  ||parsed.data.expectedVersion!==s.predecessor?.expectedVersion)return false;
 const rows=parsed.data.rollbackDeploymentIds,targets=s.manifest.deployment.targets;
 return rows.length===targets.length&&new Set(rows.map(r=>r.targetId)).size===rows.length
  &&new Set(rows.map(r=>r.deploymentId)).size===rows.length&&targets.every(t=>rows.some(r=>r.targetId===t.targetId));
};
const deployedTarget=z.object({targetId:text,commit:sha,tree:sha,imageDigest:image,configDigest:hash,schemaDigest:hash,healthy:z.boolean(),deploymentId:text.optional()}).strict();
const composeTargetEvidence=z.object({targetId:text,configuration:compose.composeConfigurationSchema,runtime:compose.composeRuntimeSchema,binding:compose.composeRuntimeBindingSchema}).strict();
// Explicit failed partial rollout. This is neither an unchanged healthy baseline
// nor installed candidate health. The fixed reader supplies image/source proof,
// preserved data and fenced database plus the entire five-service project set.
const composeFailedPartialV1Schema=z.object({schemaVersion:z.literal('roost-compose-failed-partial-runtime-v1'),
 images:z.array(z.object({name:text,imageDigest:image,commit:sha,tree:sha,deploymentId:text}).strict()).length(4),
 candidateConfigDigest:hash,databaseReadOnly:z.literal(true),activeOtherSessions:z.literal(0),ownedTransactions:z.literal(0),projectServiceSetComplete:z.literal(true),
 protectedRollbackImages:z.array(z.object({name:text,imageDigest:image}).strict()).length(4),presentRollbackImageDigests:z.array(image).min(1).max(5),
 publicHealth:z.object({healthy:z.literal(false),healthDigest:hash}).strict()}).strict();
// Version 2 records actual failed-image metadata when a build omitted its SHA.
// Exact failed-queue tags/runtime environment identify an intended attempt;
// they do not certify candidate source, deployed version or installed health.
const composeFailedPartialV2ImageSchema=z.object({name:text,imageDigest:image,commit:sha,tree:sha,deploymentId:text,
 imageRef:text,createdAt:z.string().datetime({offset:true}),buildRevision:z.union([sha,z.literal('unknown')]),
 revisionLabel:sha.nullable(),treeLabel:sha.nullable()}).strict();
const composeFailedPartialV2Schema=composeFailedPartialV1Schema.omit({schemaVersion:true,images:true}).extend({
 schemaVersion:z.literal('roost-compose-failed-partial-runtime-v2'),images:z.array(composeFailedPartialV2ImageSchema).length(4),
 sourceAttribution:z.literal('failed_queue_exact_reference_and_runtime_environment'),candidateCodeProvenanceVerified:z.literal(false)
}).strict().refine(p=>p.images.some(i=>i.buildRevision==='unknown'),{message:'failed_partial_v2_requires_actual_unknown_image_revision'});
const composeFailedPartialSchema=z.union([composeFailedPartialV1Schema,composeFailedPartialV2Schema]);
const composePartialRollbackAbsenceSchema=z.object({schemaVersion:z.literal('roost-compose-partial-rollback-absence-v1'),
 candidateOperation:z.object({id,operation:z.literal('deploy'),createdAt:z.string().datetime(),intent:intentSchema}).strict(),
 candidateEvidence:z.lazy(()=>evidenceSchema),candidateEvidenceDigest:hash,images:z.array(composeFailedPartialV2ImageSchema).length(4),
 databaseReadOnly:z.literal(true),activeOtherSessions:z.literal(0),ownedTransactions:z.literal(0),projectServiceSetComplete:z.literal(true),
 protectedRollbackImages:z.array(z.object({name:text,imageDigest:image}).strict()).length(4),presentRollbackImageDigests:z.array(image).min(1).max(5),
 publicHealth:z.object({healthy:z.literal(false),healthDigest:hash}).strict(),retryOrdinal:z.literal(1)}).strict();
const composeFailedRollbackPartialSchema=composePartialRollbackAbsenceSchema.omit({schemaVersion:true}).extend({
 schemaVersion:z.literal('roost-compose-failed-rollback-partial-v1'),
 absenceOperation:z.object({id,operation:z.literal('rollback'),createdAt:z.string().datetime(),intent:intentSchema}).strict(),
 absenceEvidence:z.lazy(()=>evidenceSchema),absenceEvidenceDigest:hash}).strict();
const composeRecoverySchema=z.object({schemaVersion:z.literal('roost-compose-recovery-observation-v1'),kind:z.enum(['queue_failed','queue_absent','queue_failed_partial','queue_absent_partial','queue_failed_rollback_partial']),
 releaseId:id,operationId:id,since:z.string().datetime(),targetId:text,phase:z.enum(['candidate','rollback']),requestedCommit:sha,requestedTree:sha,
 deploymentId:text,queue:z.object({targetId:text,deploymentId:text,commit:z.union([sha,z.literal('HEAD')]),
  status:z.enum(['failed','cancelled-by-user']),createdAt:z.string().datetime(),finishedAt:z.string().datetime().nullable()}).strict().nullable(),
 controlPlaneQuiescent:z.literal(true),configuration:compose.composeConfigurationSchema,
 baselineCommit:sha,baselineTree:sha,migrationSchemaVerified:z.literal(true),
 baselineServices:z.array(compose.composeRuntimeServiceSchema).min(2).max(12),services:z.array(compose.composeRuntimeServiceSchema).min(2).max(12),
 partial:composeFailedPartialSchema.optional(),partialRollbackAbsence:composePartialRollbackAbsenceSchema.optional(),partialRollbackFailure:composeFailedRollbackPartialSchema.optional()}).strict();
// An unchanged legacy baseline is a no-effect observation, never a deployment.
const composeConfigAbsenceSchema=z.object({schemaVersion:z.literal('roost-compose-config-absence-v1'),releaseId:id,operationId:id,
 since:z.string().datetime(),targetId:text,requestedCommit:sha,requestedTree:sha,configuration:compose.composeConfigurationSchema,
 baselineCommit:sha,baselineTree:sha,migrationSchemaVerified:z.literal(true),controlPlaneQuiescent:z.literal(true),noCandidateQueue:z.literal(true),
 baselineServices:z.array(compose.composeRuntimeServiceSchema).min(2).max(12),services:z.array(compose.composeRuntimeServiceSchema).min(2).max(12)}).strict();
// This is the fresh owner's attestation of privately retained, signed native
// closure evidence. The API does not pretend to inspect Windows processes.
const releaseNativeClosureSchema=z.object({schemaVersion:z.literal('roost-release-owner-native-closure-v1'),releaseId:id,operationId:id,
 agentHostId:id,evidenceDigest:hash,checkpointDigest:hash,controllerPid:z.number().int().positive(),registeredChildCount:z.number().int().positive(),
 allChildrenClosed:z.literal(true),nativeProcessesAbsent:z.literal(true),writerAbsent:z.literal(true),observedAt:z.string().datetime()}).strict();
const postObservationBinding=z.object({postObservationDigest:hash,fixtureDigest:hash,controllerDigest:hash,
 targetId:text,commit:sha,tree:sha}).strict();
const postObservationEvidenceSchema=z.discriminatedUnion('kind',[
 postObservationBinding.extend({kind:z.literal('smoke'),backendCommit:sha,frontendCommit:sha,
  emptyActivityCount:z.literal(0),populatedActivityCount:z.literal(1),renderedEventId:id,renderedSummaryDigest:hash,
  memoryId:z.number().int().min(-2147483648).max(-1),emptyRenderDigest:hash,populatedRenderDigest:hash,
  negativePathStatus:z.literal(401),schemaDigest:hash,nonOwnedDataDigest:hash,sequenceDigest:hash,
  fixtureRows:z.object({authUsers:z.literal(1),authSessions:z.literal(1),recentMemory:z.literal(1)}).strict(),
  noUnownedChanges:z.literal(true),fixtureOwned:z.literal(true),ingressBlocked:z.literal(true),cadencesHeld:z.literal(true),
  nativeChildrenClosed:z.literal(true),providerRequests:z.literal(0),externalActions:z.literal(0)}).strict(),
 postObservationBinding.extend({kind:z.literal('fixture_cleanup'),schemaDigest:hash,dataDigest:hash,sequenceDigest:hash,
  fixtureAbsent:z.literal(true),authAbsent:z.literal(true),eventAbsent:z.literal(true),databaseReadOnly:z.literal(true),
  activeOtherSessions:z.literal(0),nativeChildrenClosed:z.literal(true),sequencesUnchanged:z.literal(true),
  noUnownedChanges:z.literal(true),providerRequests:z.literal(0),externalActions:z.literal(0)}).strict(),
 postObservationBinding.extend({kind:z.literal('runtime_resume'),backendCommit:sha,frontendCommit:sha,schemaDigest:hash,
  healthy:z.literal(true),fixtureAbsent:z.literal(true),nativeChildrenClosed:z.literal(true),
  databaseSettingsDigest:hash,ingressSettingsDigest:hash,observationSeconds:z.number().int().min(1).max(300),
  services:z.array(compose.composeRuntimeServiceSchema).min(3).max(12),
  cadences:z.array(z.object({name:text,behavior:z.literal('restore_existing_loop'),behaviorDigest:hash}).strict()).min(1).max(10),
  cadenceEvidence:z.array(z.object({name:text,behaviorDigest:hash,completedTicks:z.number().int().positive(),
   executionState:z.enum(['executed','skipped']),behaviorVerified:z.literal(true),summaryDigest:hash,observedAt:z.string().datetime()}).strict()).min(1).max(10)
 }).strict(),
 // A failure declares owned effects honestly. It never proves absence/parity or
 // permits final cleanup; an uncertain result must be reconciled by the reader.
 postObservationBinding.extend({kind:z.literal('failure'),phase:z.enum(postObservationOperations),
  failureCode:z.enum(['fixture_unproven','empty_render_failed','populated_render_failed','data_parity_failed','runtime_resume_failed']),
  ownedEffects:z.enum(['absent','present','unproven']),nativeChildrenClosed:z.literal(true)}).strict()
]);
const evidenceSchema=z.object({composeConfigAbsence:composeConfigAbsenceSchema.optional(),postObservation:postObservationEvidenceSchema.optional(),composeRecovery:composeRecoverySchema.optional(),composeTargets:z.array(composeTargetEvidence).length(1).optional(),observedAt:z.string().datetime(),failureKind:z.literal('rollback_image_mismatch').optional(),remoteCommit:sha.optional(),remoteBase:sha.optional(),remoteBaseTree:sha.optional(),remoteTree:sha.optional(),pullRequestNumber:z.number().int().positive().optional(),prHeadCommit:sha.optional(),prMerged:z.boolean().optional(),reviewApproved:z.boolean().optional(),mergedCommit:sha.optional(),deploymentId:text.optional(),deploymentIds:z.array(deploymentIdentity).max(6).optional(),deployedTargets:z.array(deployedTarget).min(1).max(6).optional(),artifactSetDigest:hash.optional(),deployedSetDigest:hash.optional(),currentServiceSetDigest:hash.optional(),deployedCommit:sha.optional(),deployedTree:sha.optional(),imageDigest:image.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),healthDigest:hash.optional(),dataDigest:hash.optional(),backupDigest:hash.optional(),restoreDigest:hash.optional(),healthy:z.boolean().optional(),observationSeconds:z.number().int().nonnegative().max(3600).optional(),resourceIds:z.array(text).max(30).optional(),resourcePresent:z.boolean().optional(),repositoryArchived:z.boolean().optional(),localAbsent:z.boolean().optional(),absenceVerified:z.boolean().optional(),retentionVerified:z.boolean().optional(),repositoryUrl:url.optional(),canonicalDir:dir.optional(),targetId:text.optional(),applicationActive:z.boolean().optional(),localCommit:sha.optional(),localTree:sha.optional(),protectedResourcesDigest:hash.optional()}).strict().superRefine((e,c)=>{if(e.deploymentIds?.length===0&&!((['queue_absent','queue_absent_partial'].includes(e.composeRecovery?.kind)||e.composeConfigAbsence!==undefined)&&e.absenceVerified===true))c.addIssue({code:'custom',message:'empty_deployment_ids_outside_recovery'});
 if(e.currentServiceSetDigest!==undefined&&!['queue_failed_partial','queue_absent_partial','queue_failed_rollback_partial'].includes(e.composeRecovery?.kind))c.addIssue({code:'custom',message:'partial_runtime_digest_outside_failed_partial'});});
// Closing its own still-active release attests exactly one catalog entry. Grant
// admission continues to require zero active application releases.
const configAbsenceClosureBaselineSchema=baselineRevalidationSchema.extend({activeApplicationReleaseCount:z.literal(1)}).strict();
const configAbsenceRevalidationSchema=z.object({releaseId:id,evidenceDigest:hash,baseline:configAbsenceClosureBaselineSchema}).strict();
// Both configuration mutations succeeded, while both exact queues were absent.
// Attest the actual rollback controller separately from the retained baseline.
const composeQueueAbsenceRevalidationSchema=z.object({schemaVersion:z.literal('roost-compose-queue-absence-closure-revalidation-v1'),
 releaseId:id,candidateOutcomeId:id,candidateEvidence:evidenceSchema,rollbackOutcomeId:id,rollbackEvidenceDigest:hash,nativeClosureDigest:hash,
 configuration:compose.composeConfigurationSchema,services:z.array(compose.composeRuntimeServiceSchema).min(2).max(12),
 queues:z.array(z.object({operationId:id,targetId:text,deploymentId:text,queue:z.null()}).strict()).length(2),
 baseline:configAbsenceClosureBaselineSchema,revalidationDigest:hash}).strict();
const composeRetainedBaselineRevalidationSchema=composeQueueAbsenceRevalidationSchema.extend({
 schemaVersion:z.literal('roost-compose-retained-baseline-closure-revalidation-v1'),
 baseline:configAbsenceClosureBaselineSchema.extend({noCandidateQueue:z.literal(false),candidateQueueCount:z.literal(1)}).strict(),
 queues:z.array(z.object({operationId:id,targetId:text,deploymentId:text,queue:composeRecoverySchema.shape.queue.unwrap()}).strict()).length(2)}).strict();
const composeFailedRollbackPartialClosureRevalidationSchema=z.object({schemaVersion:z.literal('roost-compose-failed-rollback-partial-closure-revalidation-v1'),
 releaseId:id,failedOutcomeId:id,failedEvidenceDigest:hash,currentEvidence:evidenceSchema,nativeClosureDigest:hash,observedAt:z.string().datetime()}).strict();
const closeFailedReleaseSchema=z.object({requestId:id,expectedVersion:hash,failedOperationId:id,consentDigest:hash,evidence:evidenceSchema,nativeClosure:releaseNativeClosureSchema.optional(),absenceRevalidation:z.union([configAbsenceRevalidationSchema,composeQueueAbsenceRevalidationSchema,composeRetainedBaselineRevalidationSchema,composeFailedRollbackPartialClosureRevalidationSchema]).optional()}).strict();
const authorizeReconciliationSchema=z.object({requestId:id,expectedVersion:hash,credentialId:id,credentialVersion:z.number().int().positive(),operationIds:z.array(id).min(1).max(30),expiresAt:releaseExpirySchema}).strict();
const publishedGitBasisSchema=z.object({schemaVersion:z.literal('roost-release-published-git-v1'),releaseId:id,expectedVersion:hash,
 closureId:id,closureDigest:hash,pushOperationId:id,prOperationId:id,reviewOperationId:id,mergeOperationId:id,
 baselineDeploymentIds:z.array(deploymentIdentity).max(6),basisKind:z.enum(['compose_config_absence','compose_queue_absence','compose_retained_baseline']).optional(),composeEvidenceDigest:hash.optional(),baselineAdoptionDigest:hash.optional()}).strict().superRefine((b,c)=>{
 if(b.basisKind!==undefined?b.baselineDeploymentIds.length!==0||!b.composeEvidenceDigest:b.baselineDeploymentIds.length===0||b.composeEvidenceDigest!==undefined)c.addIssue({code:'custom',message:'published_git_basis_kind_invalid'});
 if(['compose_queue_absence','compose_retained_baseline'].includes(b.basisKind)?!b.baselineAdoptionDigest:b.baselineAdoptionDigest!==undefined)c.addIssue({code:'custom',message:'published_git_basis_adoption_invalid'});
});
const releaseHasPublishedGit=s=>{
 const parsed=publishedGitBasisSchema.safeParse(s?.publishedGitBasis), restart=baselineRestartSchema.safeParse(s?.baselineRestart);
 if(!parsed.success||!restart.success||s.predecessor||s.successorBasis||!isReleaseSetManifest(s.manifest)||!manifestSchema.safeParse(s.manifest).success)return false;
 const b=parsed.data,r=restart.data,rows=b.baselineDeploymentIds,targets=s.manifest.deployment.targets;
 if(isComposeManifest(s.manifest)){
  if(b.releaseId!==r.releaseId||b.expectedVersion!==r.expectedVersion||b.closureId!==r.closureId||rows.length!==0)return false;
  if(b.basisKind==='compose_config_absence')return s.baselineAdoption===undefined;
  const retained=b.basisKind==='compose_retained_baseline';
  const adoption=(retained?composeRetainedBaselineAdoptionSchema:composeQueueAbsenceBaselineAdoptionSchema).safeParse(s.baselineAdoption);
  return (b.basisKind==='compose_queue_absence'||retained)&&adoption.success&&s.baselineRevalidation!==undefined
   &&!baselineRevalidation.baselineRevalidationBindingError(s,baselineRevalidationSchema,releaseDigest)
   &&adoption.data.releaseId===r.releaseId&&adoption.data.closureId===r.closureId&&adoption.data.closureDigest===b.closureDigest
   &&adoption.data.failedEvidenceDigest===b.composeEvidenceDigest&&releaseDigest(adoption.data)===b.baselineAdoptionDigest
   &&adoption.data.targetId===targets[0].targetId&&adoption.data.previousRendererDigest!==adoption.data.newRendererDigest
   &&adoption.data.newRendererDigest===targets[0].baseline.controllerInvariants.rendererDigest;
 }
 if(b.basisKind!==undefined)return false;
 return b.releaseId===r.releaseId&&b.expectedVersion===r.expectedVersion&&b.closureId===r.closureId
  &&rows.length===targets.length&&new Set(rows.map(x=>x.targetId)).size===rows.length&&new Set(rows.map(x=>x.deploymentId)).size===rows.length
  &&targets.every(t=>rows.some(x=>x.targetId===t.targetId));
};
// A fresh baseline may add protection for exactly the images attested by its
// immutable closure. Preserve the original footprint and its order verbatim.
const releaseRestartProtectedResourceIds=(manifest,evidence)=>{
 if(isComposeManifest(manifest)&&manifestSchema.safeParse(manifest).success&&evidence?.composeConfigAbsence)return manifest.cleanup.protectedResourceIds.slice();
 if(!isGitSetManifest(manifest)||!manifestSchema.safeParse(manifest).success)return null;
 const rows=evidence?.deployedTargets,targets=manifest.deployment.targets;
 if(!Array.isArray(rows)||rows.length!==targets.length||new Set(rows.map(r=>r.targetId)).size!==rows.length)return null;
 const protectedIds=manifest.cleanup.protectedResourceIds.slice();
 for(const target of targets){
  const row=rows.find(r=>r.targetId===target.targetId);
  if(!row||!image.safeParse(row.imageDigest).success)return null;
  if(!protectedIds.includes(row.imageDigest))protectedIds.push(row.imageDigest);
 }
 return protectedIds;
};
// A diagnosed failure describes the actual rebuilt image. It never proves a
// successful rollback or permits a changed source/configuration/data baseline.
const releaseRollbackImageFailureValid=(s,e,targetId)=>{
 if(!isGitSetManifest(s?.manifest)||!manifestSchema.safeParse(s.manifest).success||!sha.safeParse(s?.baseTree).success
  ||typeof targetId!=='string'||!evidenceSchema.safeParse(e).success)return false;
 const m=s.manifest,t=m.deployment.targets.find(t=>t.targetId===targetId),rows=e.deployedTargets,queues=e.deploymentIds;
 if(!t||e.failureKind!=='rollback_image_mismatch'||e.healthy!==false||e.imageDigest!==undefined||e.deploymentId!==undefined
  ||e.repositoryArchived===true||e.localAbsent===true
  ||e.deployedCommit!==m.rollback.commit||e.deployedTree!==s.baseTree||e.artifactSetDigest!==m.rollback.artifactSetDigest
  ||e.artifactSetDigest!==gitSetArtifactDigest(m,s,true)||e.configDigest!==m.rollback.configDigest||e.schemaDigest!==m.rollback.schemaDigest
  ||e.dataDigest!==m.baseline.dataDigest||!hash.safeParse(e.healthDigest).success
  ||!Array.isArray(rows)||rows.length!==1||!Array.isArray(queues)||queues.length!==1)return false;
 const r=rows[0],q=queues[0];
 if(r.targetId!==targetId||r.commit!==t.baseline.commit||r.tree!==t.baseline.tree||r.configDigest!==t.baseline.configDigest
  ||r.schemaDigest!==m.rollback.schemaDigest||r.imageDigest===t.baseline.imageDigest||!image.safeParse(r.imageDigest).success
  ||typeof r.healthy!=='boolean'||!text.safeParse(r.deploymentId).success||q.targetId!==targetId||q.deploymentId!==r.deploymentId)return false;
 const actual={targetId:r.targetId,commit:r.commit,tree:r.tree,imageDigest:r.imageDigest,configDigest:r.configDigest,schemaDigest:r.schemaDigest};
 return e.deployedSetDigest===releaseDigest([actual]);
};
const outcomeSchema=z.object({requestId:id,status:z.enum(["succeeded","failed","uncertain","reconciled"]),reconciledStatus:z.enum(["succeeded","absent","failed"]).optional(),observationOnly:z.boolean(),evidence:evidenceSchema}).strict().superRefine((v,c)=>{if(v.status==="reconciled"?(!v.observationOnly||!v.reconciledStatus):v.reconciledStatus!==undefined)c.addIssue({code:"custom",message:"reconciliation_shape_invalid"});});
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const releaseDigest=v=>createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
// Raw fixed-reader facts are retained in the journal. Qualification recomputes
// their complete service set and queue bindings; a caller's summary is not proof.
const composeEvidenceError=(s,e,rollback=false,targetId,allowUnhealthy=false)=>{
 try {
  const m=s.manifest,expected=rollback==='baseline'?m.baseline:rollback?m.rollback:m.deployment,t=m.deployment.targets[0];
  if(!isComposeManifest(m)||!manifestSchema.safeParse(m).success||!evidenceSchema.safeParse(e).success
   ||targetId!==undefined&&targetId!==t.targetId||e.composeRecovery!==undefined||e.imageDigest!==undefined||e.deploymentId!==undefined||e.deployedTargets!==undefined
   ||e.deployedCommit!==(rollback?m.rollback.commit:s.commit)||e.deployedTree!==(rollback?s.baseTree:s.candidateTree)
   ||e.artifactSetDigest!==expected.artifactSetDigest||expected.artifactSetDigest!==sourceArtifactDigest(m,s,rollback)
   ||e.configDigest!==expected.configDigest||e.schemaDigest!==expected.schemaDigest||e.dataDigest!==m.baseline.dataDigest
   ||typeof e.healthy!=='boolean'||!hash.safeParse(e.healthDigest).success
   ||!Array.isArray(e.composeTargets)||e.composeTargets.length!==1||!Array.isArray(e.deploymentIds)||e.deploymentIds.length!==1)return 'release_deployment_unproven';
  const row=e.composeTargets[0],config=rollback==='baseline'?t.baseline.configuration:rollback?t.rollbackConfiguration:t.configuration,queue=e.deploymentIds[0];
  if(row.targetId!==t.targetId||queue.targetId!==t.targetId||queue.deploymentId!==row.binding.deploymentId
   ||row.binding.commit!==e.deployedCommit||row.binding.tree!==e.deployedTree)return 'release_deployment_unproven';
  // Failure attribution may observe unhealthy health probes while proving the
  // same running immutable source set. This never qualifies a success and never
  // changes the recorded facts; exited or substituted services still fail.
  const runtime=allowUnhealthy&&e.healthy===false?{...row.runtime,services:row.runtime.services.map(r=>
   ['app','database'].includes(r.role)&&['starting','unhealthy'].includes(r.health)?{...r,health:'healthy'}:r)}:row.runtime;
  const proof=compose.qualifyComposeRuntime({expected:{configuration:config,configDigest:rollback==='baseline'?t.baseline.configDigest:rollback?t.rollbackConfigDigest:t.configDigest},
   configuration:row.configuration,runtime,binding:row.binding});
  if(rollback&&t.baseline.images.some(img=>proof.services.find(r=>r.name===img.name)?.imageDigest!==img.imageDigest))return 'release_deployment_unproven';
  if(e.deployedSetDigest!==releaseDigest([{targetId:t.targetId,runtimeSetDigest:proof.runtimeSetDigest}]))return 'release_deployment_unproven';
  return null;
 }catch{return 'release_deployment_unproven';}
};
const composeConfigAbsenceEvidenceError=(s,e,operation)=>{
 try {
  const m=s.manifest,t=m.deployment.targets[0],r=e.composeConfigAbsence;
  if(!isComposeManifest(m)||!manifestSchema.safeParse(m).success||!evidenceSchema.safeParse(e).success||!r
   ||Object.keys(e).some(k=>!['composeConfigAbsence','deploymentIds','deployedCommit','deployedTree','artifactSetDigest','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','deployedSetDigest','absenceVerified'].includes(k))
   ||operation.operation!=='deploy_config'||r.releaseId!==s.releaseId||r.operationId!==operation.id
   ||Date.parse(r.since)!==new Date(operation.createdAt??operation.created_at).getTime()||r.targetId!==t.targetId
   ||r.requestedCommit!==s.commit||r.requestedTree!==s.candidateTree||r.baselineCommit!==t.baseline.commit||r.baselineTree!==t.baseline.tree
   ||releaseDigest(r.configuration)!==releaseDigest(t.baseline.configuration)||compose.composeConfigurationDigest(r.configuration)!==t.baseline.configDigest
   ||e.deployedCommit!==t.baseline.commit||e.deployedTree!==t.baseline.tree||e.artifactSetDigest!==m.baseline.artifactSetDigest
   ||e.configDigest!==m.baseline.configDigest||e.schemaDigest!==m.baseline.schemaDigest||e.dataDigest!==m.baseline.dataDigest
   ||e.healthDigest!==m.baseline.healthDigest||e.healthy!==true||e.absenceVerified!==true||releaseDigest(e.deploymentIds)!==releaseDigest([])
   ||Date.parse(e.observedAt)<Date.parse(r.since)||r.services.some(row=>Date.parse(row.createdAt)>Date.parse(r.since)))return 'release_compose_config_absence_unproven';
  const ordered=rows=>rows.slice().sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  if(releaseDigest(ordered(r.services))!==releaseDigest(ordered(r.baselineServices)))return 'release_compose_config_absence_unproven';
  const proof=compose.qualifyComposeRetainedBaseline({configuration:t.baseline.configuration,images:t.baseline.images,services:r.services,baselineServices:r.baselineServices});
  return e.deployedSetDigest===releaseDigest([{targetId:t.targetId,runtimeSetDigest:proof.runtimeSetDigest}])?null:'release_compose_config_absence_unproven';
 }catch{return 'release_compose_config_absence_unproven';}
};
const releaseConfigAbsenceRevalidationBindingError=(snapshot,input)=>{
 if(input.absenceRevalidation?.schemaVersion==='roost-compose-failed-rollback-partial-closure-revalidation-v1')return composeFailedRollbackPartialClosureBindingError(snapshot,input);
 if(input.absenceRevalidation?.schemaVersion==='roost-compose-retained-baseline-closure-revalidation-v1')return releaseComposeRetainedBaselineRevalidationBindingError(snapshot,input);
 if(input.absenceRevalidation?.schemaVersion==='roost-compose-queue-absence-closure-revalidation-v1')return releaseComposeQueueAbsenceRevalidationBindingError(snapshot,input);
 if(input.absenceRevalidation===undefined)return null;
 try {
  const a=input.absenceRevalidation,e=input.evidence,r=e?.composeConfigAbsence;
  if(!configAbsenceRevalidationSchema.safeParse(a).success||!releaseNativeClosureSchema.safeParse(input.nativeClosure).success||!releaseHasPublishedGit(snapshot)||!isComposeManifest(snapshot.manifest)
   ||!id.safeParse(snapshot.releaseId).success||a.releaseId!==snapshot.releaseId||a.releaseId!==input.nativeClosure?.releaseId
   ||a.evidenceDigest!==releaseDigest(e)||input.nativeClosure.evidenceDigest!==a.evidenceDigest
   ||input.nativeClosure.operationId!==input.failedOperationId||input.nativeClosure.agentHostId!==snapshot.hostId
   ||r?.releaseId!==a.releaseId||r.operationId!==input.failedOperationId
   ||composeConfigAbsenceEvidenceError(snapshot,e,{id:input.failedOperationId,operation:'deploy_config',createdAt:r.since}))return 'release_config_absence_revalidation_invalid';
  const binding=baselineRevalidation.baselineRevalidationBindingError({...snapshot,baselineRevalidation:a.baseline},configAbsenceClosureBaselineSchema,releaseDigest);
  if(binding)return binding;
  if(Object.values(a.baseline.actualReadTimes).some(at=>Date.parse(at)>Date.parse(a.baseline.observedAt)))return 'release_config_absence_revalidation_invalid';
  if(Date.parse(input.nativeClosure.observedAt)<Date.parse(a.baseline.observedAt))return 'release_native_closure_stale';
  return null;
 }catch{return 'release_config_absence_revalidation_invalid';}
};
const releaseConfigAbsenceRevalidationError=(snapshot,input,now)=>{
 if(input.absenceRevalidation?.schemaVersion==='roost-compose-failed-rollback-partial-closure-revalidation-v1')return composeFailedRollbackPartialClosureRevalidationError(snapshot,input,now);
 if(input.absenceRevalidation?.schemaVersion==='roost-compose-retained-baseline-closure-revalidation-v1')return releaseComposeRetainedBaselineRevalidationError(snapshot,input,now);
 if(input.absenceRevalidation?.schemaVersion==='roost-compose-queue-absence-closure-revalidation-v1')return releaseComposeQueueAbsenceRevalidationError(snapshot,input,now);
 const binding=releaseConfigAbsenceRevalidationBindingError(snapshot,input);if(binding||input.absenceRevalidation===undefined)return binding;
 const a=input.absenceRevalidation,error=baselineRevalidation.baselineRevalidationError({...snapshot,baselineRevalidation:a.baseline},configAbsenceClosureBaselineSchema,releaseDigest,now);
 if(error)return error;
 const at=now instanceof Date?now.getTime():Number(now),native=Date.parse(input.nativeClosure?.observedAt);
 if(!Number.isFinite(native)||native<Date.parse(a.baseline.observedAt)||native>at+60000||at-native>300000)return 'release_native_closure_stale';
 return null;
};
const composeFailedPartialEvidenceError=(s,e,operation)=>{
 try{
  const m=s.manifest,t=m?.deployment?.targets?.[0],r=e.composeRecovery,p=r?.partial,q=r?.queue,op=operation.intent;
  if(!isComposeManifest(m)||!manifestSchema.safeParse(m).success||!evidenceSchema.safeParse(e).success
   ||r?.kind!=='queue_failed_partial'||r.partialRollbackAbsence!==undefined||r.partialRollbackFailure!==undefined||!composeFailedPartialSchema.safeParse(p).success
   ||Object.keys(e).some(k=>!['composeRecovery','deploymentIds','artifactSetDigest','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','currentServiceSetDigest'].includes(k))
   ||operation.operation!=='deploy'||!id.safeParse(operation.id).success||!intentSchema.safeParse(op).success||op.operation!=='deploy'
   ||op.manifestDigest!==releaseDigest(m)||op.commit!==s.commit||op.baseCommit!==s.baseCommit
   ||op.observed.commit!==s.commit||op.observed.baseCommit!==s.commit||op.observed.baseTree!==s.candidateTree||op.observed.manifestDigest!==releaseDigest(m)
   ||op.parameters.targetId!==t.targetId||op.parameters.commit!==s.commit||op.parameters.artifactSetDigest!==m.deployment.artifactSetDigest
   ||op.parameters.configDigest!==m.deployment.configDigest||op.parameters.schemaDigest!==m.deployment.schemaDigest
   ||op.parameters.imageDigest!==undefined||op.parameters.faultInjection!==undefined
   ||r.releaseId!==s.releaseId||r.operationId!==operation.id||r.targetId!==t.targetId||r.phase!=='candidate'
   ||Date.parse(r.since)!==new Date(operation.createdAt??operation.created_at).getTime()
   ||r.requestedCommit!==s.commit||r.requestedTree!==s.candidateTree||r.baselineCommit!==s.baseCommit||r.baselineTree!==s.baseTree
   ||r.deploymentId!==`r${releaseDigest([s.releaseId,operation.id,t.targetId,'candidate']).slice(0,23)}`
   ||!q||q.targetId!==t.targetId||q.deploymentId!==r.deploymentId||q.commit!==s.commit||q.status!=='failed'||q.finishedAt===null
   ||Date.parse(q.createdAt)<Date.parse(r.since)||Date.parse(q.finishedAt)<Date.parse(q.createdAt)||Date.parse(e.observedAt)<Date.parse(q.finishedAt)
   ||r.controlPlaneQuiescent!==true||r.migrationSchemaVerified!==true||releaseDigest(r.configuration)!==releaseDigest(t.configuration)
   ||compose.composeConfigurationDigest(r.configuration)!==t.configDigest||p.candidateConfigDigest!==t.configDigest
   ||e.artifactSetDigest!==m.deployment.artifactSetDigest||e.configDigest!==m.deployment.configDigest||e.schemaDigest!==m.baseline.schemaDigest
   ||e.schemaDigest!==m.deployment.schemaDigest||e.dataDigest!==m.baseline.dataDigest||e.healthy!==false
   ||e.healthDigest!==p.publicHealth.healthDigest||e.healthDigest===m.baseline.healthDigest
   ||releaseDigest(e.deploymentIds)!==releaseDigest([{targetId:t.targetId,deploymentId:r.deploymentId}]))return 'release_compose_failed_partial_unproven';
  const declared=t.configuration.services,rows=r.services,before=r.baselineServices,built=declared.filter(d=>d.source==='built'),ordered=v=>v.slice().sort((a,b)=>a.name.localeCompare(b.name));
  // Scope this exception to the actual five-service failure profile. Foreign,
  // missing, running cadence/app, or unknown migration states remain refused.
  if(declared.length!==5||built.length!==4||declared.filter(d=>d.role==='cadence').length!==2||rows.length!==5||before.length!==4
   ||before.some(d=>d.role==='migration')||new Set(rows.map(d=>d.name)).size!==5||new Set(rows.map(d=>d.containerId)).size!==5
   ||new Set(p.images.map(d=>d.name)).size!==4||built.some(d=>!p.images.some(x=>x.name===d.name))
   ||new Set(before.map(d=>d.name)).size!==4||new Set(before.map(d=>d.containerId)).size!==4)return 'release_compose_failed_partial_service_set';
  compose.qualifyComposeRetainedBaseline({configuration:t.baseline.configuration,images:t.baseline.images,services:before,baselineServices:before});
  const requiredImages=[...new Set([...t.baseline.images.map(x=>x.imageDigest),...declared.filter(d=>d.source==='image').map(d=>d.imageDigest)])].sort();
  if(releaseDigest(ordered(p.protectedRollbackImages))!==releaseDigest(ordered(t.baseline.images))
   ||new Set(p.presentRollbackImageDigests).size!==p.presentRollbackImageDigests.length
   ||releaseDigest(p.presentRollbackImageDigests.slice().sort())!==releaseDigest(requiredImages)
   ||requiredImages.some(x=>!m.cleanup.protectedResourceIds.includes(x))
   ||!m.rollback.compatibleSchemaDigests.includes(e.schemaDigest)||m.rollback.schemaDigest!==e.schemaDigest)return 'release_compose_failed_partial_rollback_unproven';
  for(const row of rows){const d=declared.find(x=>x.name===row.name),prior=before.find(x=>x.name===row.name),proof=p.images.find(x=>x.name===row.name);
   if(!d||row.role!==d.role||row.mountDigest!==d.mountDigest||Date.parse(row.createdAt)<Date.parse(q.createdAt)||Date.parse(row.createdAt)>Date.parse(q.finishedAt)
    ||before.some(x=>x.containerId===row.containerId))return 'release_compose_failed_partial_service_binding';
   if(d.source==='built'&&p.schemaVersion==='roost-compose-failed-partial-runtime-v2'&&(!proof
    ||proof.imageRef!==`${t.targetId}_${row.name}:${s.commit}`
    ||Date.parse(proof.createdAt)<Date.parse(q.createdAt)||Date.parse(proof.createdAt)>Date.parse(q.finishedAt)
    ||Date.parse(proof.createdAt)>Date.parse(row.createdAt)
    ||proof.buildRevision!=='unknown'&&proof.buildRevision!==s.commit
    ||proof.revisionLabel!==null&&proof.revisionLabel!==s.commit||proof.treeLabel!==null&&proof.treeLabel!==s.candidateTree))
    return 'release_compose_failed_partial_image_attribution_unproven';
   if(d.source==='image'){
    if(!prior||prior.role!=='database'||row.imageDigest!==d.imageDigest||row.imageDigest!==prior.imageDigest||row.mountDigest!==prior.mountDigest
     ||row.state!=='running'||row.health!=='healthy'||row.exitCode!==0||row.commit!==undefined||row.tree!==undefined||row.deploymentId!==undefined)
     return 'release_compose_failed_partial_database_unproven';
   }else if(!proof||proof.commit!==s.commit||proof.tree!==s.candidateTree||proof.deploymentId!==r.deploymentId||row.imageDigest!==proof.imageDigest
    ||row.commit!==s.commit||row.tree!==s.candidateTree||row.deploymentId!==r.deploymentId||row.health!==null
    ||(row.role==='migration'?row.state!=='exited'||row.exitCode===0:row.state!=='created'||row.exitCode!==0))
    return 'release_compose_failed_partial_candidate_unproven';
  }
  return e.currentServiceSetDigest===compose.composeRuntimeSetDigest(rows)?null:'release_compose_failed_partial_runtime_digest';
 }catch{return 'release_compose_failed_partial_unproven';}
};
const composePartialRollbackAbsenceEvidenceError=(s,e,operation)=>{
 try{
  const m=s.manifest,t=m?.deployment?.targets?.[0],r=e.composeRecovery,p=r?.partialRollbackAbsence,op=operation.intent;
  if(!isComposeManifest(m)||!manifestSchema.safeParse(m).success||!evidenceSchema.safeParse(e).success
   ||!composePartialRollbackAbsenceSchema.safeParse(p).success||r.kind!=='queue_absent_partial'||r.partial!==undefined||r.partialRollbackFailure!==undefined
   ||Object.keys(e).length!==10||Object.keys(e).some(k=>!['composeRecovery','deploymentIds','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','currentServiceSetDigest','absenceVerified'].includes(k))
   ||operation.operation!=='rollback'||!id.safeParse(operation.id).success||!intentSchema.safeParse(op).success||op.operation!=='rollback'
   ||op.manifestDigest!==releaseDigest(m)||op.commit!==s.commit||op.baseCommit!==s.baseCommit
   ||op.observed.commit!==s.commit||op.observed.baseCommit!==s.commit||op.observed.baseTree!==s.candidateTree||op.observed.manifestDigest!==releaseDigest(m)
   ||releaseDigest(op.parameters)!==releaseDigest({targetId:t.targetId,commit:m.rollback.commit,artifactSetDigest:m.rollback.artifactSetDigest,configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest})
   ||r.releaseId!==s.releaseId||r.operationId!==operation.id||r.targetId!==t.targetId||r.phase!=='rollback'
   ||Date.parse(r.since)!==new Date(operation.createdAt??operation.created_at).getTime()||r.queue!==null
   ||r.deploymentId!==`r${releaseDigest([s.releaseId,operation.id,t.targetId,'rollback']).slice(0,23)}`
   ||r.requestedCommit!==m.rollback.commit||r.requestedTree!==s.baseTree||r.baselineCommit!==s.baseCommit||r.baselineTree!==s.baseTree
   ||releaseDigest(r.configuration)!==releaseDigest(t.rollbackConfiguration)||compose.composeConfigurationDigest(r.configuration)!==t.rollbackConfigDigest
   ||e.configDigest!==m.rollback.configDigest||e.schemaDigest!==m.baseline.schemaDigest||e.dataDigest!==m.baseline.dataDigest
   ||e.healthy!==false||e.absenceVerified!==true||releaseDigest(e.deploymentIds)!==releaseDigest([])
   ||e.healthDigest!==p.publicHealth.healthDigest||e.healthDigest===m.baseline.healthDigest||Date.parse(e.observedAt)<Date.parse(r.since)
   ||p.candidateEvidenceDigest!==releaseDigest(p.candidateEvidence)||p.candidateOperation.id===operation.id
   ||Date.parse(p.candidateEvidence.observedAt)>Date.parse(r.since)
   ||composeFailedPartialEvidenceError(s,p.candidateEvidence,p.candidateOperation)!==null
   ||p.candidateEvidence.composeRecovery.partial.schemaVersion!=='roost-compose-failed-partial-runtime-v2')return 'release_compose_partial_rollback_absence_unproven';
  const c=p.candidateEvidence.composeRecovery,ordered=rows=>rows.slice().sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  if(releaseDigest(ordered(r.services))!==releaseDigest(ordered(c.services))||releaseDigest(ordered(r.baselineServices))!==releaseDigest(ordered(c.baselineServices))
   ||releaseDigest(ordered(p.images))!==releaseDigest(ordered(c.partial.images))
   ||releaseDigest(ordered(p.protectedRollbackImages))!==releaseDigest(ordered(c.partial.protectedRollbackImages))
   ||releaseDigest(p.presentRollbackImageDigests.slice().sort())!==releaseDigest(c.partial.presentRollbackImageDigests.slice().sort())
   ||e.currentServiceSetDigest!==compose.composeRuntimeSetDigest(r.services))return 'release_compose_partial_rollback_absence_runtime_changed';
  return null;
 }catch{return 'release_compose_partial_rollback_absence_unproven';}
};
const partialEffective=o=>!o?null:o.status==='reconciled'?(o.reconciledStatus??o.reconciled_status):o.status;
const composePartialRollbackAbsenceJournalError=(s,operation,e,journal)=>{
 try{
  if(composePartialRollbackAbsenceEvidenceError(s,e,operation)!==null||!Array.isArray(journal))return 'release_compose_partial_rollback_absence_lineage_unproven';
  const p=e.composeRecovery.partialRollbackAbsence,index=journal.findIndex(o=>o.id===operation.id),ci=journal.findIndex(o=>o.id===p.candidateOperation.id);
  if(index!==journal.length-1||ci<0||index!==ci+2)return 'release_compose_partial_rollback_absence_lineage_unproven';
  const candidate=journal[ci],configuration=journal[ci+1],current=journal[index],m=s.manifest;
  if(candidate.operation!=='deploy'||partialEffective(candidate.outcome)!=='failed'
   ||candidate.outcome.status==='reconciled'&&(candidate.outcome.observationOnly??candidate.outcome.observation_only)!==true
   ||releaseDigest(candidate.outcome.evidence)!==p.candidateEvidenceDigest
   ||releaseDigest({id:candidate.id,operation:candidate.operation,createdAt:new Date(candidate.createdAt??candidate.created_at).toISOString(),intent:candidate.intent})!==releaseDigest(p.candidateOperation)
   ||configuration.operation!=='rollback_config'||partialEffective(configuration.outcome)!=='succeeded'
   ||releaseDigest(configuration.intent?.parameters)!==releaseDigest({commit:m.rollback.commit,artifactSetDigest:m.rollback.artifactSetDigest,configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest})
   ||configuration.outcome.evidence?.deployedCommit!==m.rollback.commit||configuration.outcome.evidence?.configDigest!==m.rollback.configDigest
   ||configuration.outcome.evidence?.artifactSetDigest!==m.rollback.artifactSetDigest||configuration.outcome.evidence?.schemaDigest!==m.rollback.schemaDigest
   ||!Number.isFinite(Date.parse(configuration.createdAt??configuration.created_at))||!Number.isFinite(Date.parse(configuration.outcome.evidence.observedAt))
   ||new Date(configuration.createdAt??configuration.created_at).getTime()<Date.parse(candidate.outcome.evidence.observedAt)
   ||Date.parse(configuration.outcome.evidence.observedAt)>Date.parse(e.composeRecovery.since)
   ||current.operation!=='rollback'||releaseDigest(current.intent)!==releaseDigest(operation.intent)
   ||!(current.outcome?.status==='uncertain'||current.outcome?.status==='reconciled'&&partialEffective(current.outcome)==='absent'
      &&(current.outcome.observationOnly??current.outcome.observation_only)===true&&releaseDigest(current.outcome.evidence)===releaseDigest(e))
   ||journal.slice(0,index).some(o=>o.outcome?.evidence?.composeRecovery?.kind==='queue_absent_partial'))return 'release_compose_partial_rollback_absence_lineage_unproven';
  return null;
 }catch{return 'release_compose_partial_rollback_absence_lineage_unproven';}
};
const composePartialRollbackRetryValid=(s,journal)=>{
 try{const last=journal.at(-1);return last?.operation==='rollback'&&last.outcome?.status==='reconciled'&&partialEffective(last.outcome)==='absent'
  &&(last.outcome.observationOnly??last.outcome.observation_only)===true&&last.outcome.evidence?.composeRecovery?.kind==='queue_absent_partial'
  &&composePartialRollbackAbsenceJournalError(s,last,last.outcome.evidence,journal)===null;
 }catch{return false;}
};
// Terminal observation of the sole rollback retry failing before changing the
// already accepted failed candidate. This never proves recovery or source.
const composeFailedRollbackPartialEvidenceError=(s,e,operation)=>{
 try{const r=e?.composeRecovery,p=r?.partialRollbackFailure,q=r?.queue,t=s.manifest.deployment.targets[0];
  if(!evidenceSchema.safeParse(e).success||!composeFailedRollbackPartialSchema.safeParse(p).success
   ||r.kind!=='queue_failed_rollback_partial'||r.partial!==undefined||r.partialRollbackAbsence!==undefined
   ||Object.keys(e).length!==9||Object.keys(e).some(k=>!['composeRecovery','deploymentIds','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','currentServiceSetDigest'].includes(k))
   ||!q||q.targetId!==t.targetId||q.deploymentId!==r.deploymentId||q.commit!==s.manifest.rollback.commit||q.status!=='failed'||q.finishedAt===null
   ||Date.parse(q.createdAt)<Date.parse(r.since)||Date.parse(q.finishedAt)<Date.parse(q.createdAt)||Date.parse(e.observedAt)<Date.parse(q.finishedAt)
   ||releaseDigest(e.deploymentIds)!==releaseDigest([{targetId:t.targetId,deploymentId:r.deploymentId}])
   ||p.absenceOperation.id===operation.id||p.absenceEvidenceDigest!==releaseDigest(p.absenceEvidence)
   ||composePartialRollbackAbsenceEvidenceError(s,p.absenceEvidence,p.absenceOperation)!==null
   ||Date.parse(p.absenceEvidence.observedAt)>Date.parse(r.since))return 'release_compose_failed_rollback_partial_unproven';
  const {absenceOperation,absenceEvidence,absenceEvidenceDigest,...base}=p;
  const projectedRecovery={...r,kind:'queue_absent_partial',queue:null,partialRollbackAbsence:{...base,schemaVersion:'roost-compose-partial-rollback-absence-v1'}};
  delete projectedRecovery.partialRollbackFailure;
  const projected={...e,composeRecovery:projectedRecovery,deploymentIds:[],absenceVerified:true};
  if(composePartialRollbackAbsenceEvidenceError(s,projected,operation)!==null)return 'release_compose_failed_rollback_partial_runtime_changed';
  const original=p.absenceEvidence.composeRecovery.partialRollbackAbsence;
  if(p.candidateEvidenceDigest!==original.candidateEvidenceDigest||releaseDigest(p.candidateOperation)!==releaseDigest(original.candidateOperation))
   return 'release_compose_failed_rollback_partial_lineage_unproven';
  return null;
 }catch{return 'release_compose_failed_rollback_partial_unproven';}
};
const composeFailedRollbackPartialJournalError=(s,operation,e,journal)=>{
 try{if(composeFailedRollbackPartialEvidenceError(s,e,operation)!==null||!Array.isArray(journal))return 'release_compose_failed_rollback_partial_lineage_unproven';
  const p=e.composeRecovery.partialRollbackFailure,index=journal.findIndex(o=>o.id===operation.id),ai=journal.findIndex(o=>o.id===p.absenceOperation.id);
  if(index!==journal.length-1||ai<0||index!==ai+1)return 'release_compose_failed_rollback_partial_lineage_unproven';
  const absence=journal[ai],current=journal[index],out=current.outcome;
  if(absence.operation!=='rollback'||partialEffective(absence.outcome)!=='absent'||absence.outcome.status!=='reconciled'
   ||(absence.outcome.observationOnly??absence.outcome.observation_only)!==true
   ||releaseDigest(absence.outcome.evidence)!==p.absenceEvidenceDigest
   ||releaseDigest({id:absence.id,operation:absence.operation,createdAt:new Date(absence.createdAt??absence.created_at).toISOString(),intent:absence.intent})!==releaseDigest(p.absenceOperation)
   ||composePartialRollbackAbsenceJournalError(s,absence,absence.outcome.evidence,journal.slice(0,ai+1))!==null
   ||current.operation!=='rollback'||releaseDigest(current.intent)!==releaseDigest(operation.intent)
   ||releaseDigest(current.intent.parameters)!==releaseDigest(absence.intent.parameters)
   ||!(out?.status==='uncertain'||out?.status==='reconciled'&&partialEffective(out)==='failed'
     &&(out.observationOnly??out.observation_only)===true&&releaseDigest(out.evidence)===releaseDigest(e)))return 'release_compose_failed_rollback_partial_lineage_unproven';
  return null;
 }catch{return 'release_compose_failed_rollback_partial_lineage_unproven';}
};
const failedRollbackPartialStableEvidence=e=>{const copy=structuredClone(e);delete copy.observedAt;delete copy.healthDigest;delete copy.composeRecovery.partialRollbackFailure.publicHealth.healthDigest;return copy;};
const composeFailedRollbackPartialClosureBindingError=(s,input)=>{
 try{const a=input.absenceRevalidation,n=input.nativeClosure,e=input.evidence,current=a?.currentEvidence,r=current?.composeRecovery;
  if(!composeFailedRollbackPartialClosureRevalidationSchema.safeParse(a).success||!releaseNativeClosureSchema.safeParse(n).success
   ||a.releaseId!==s.releaseId||a.failedEvidenceDigest!==releaseDigest(e)||a.nativeClosureDigest!==releaseDigest(n)
   ||n.releaseId!==s.releaseId||n.agentHostId!==s.hostId||n.operationId!==input.failedOperationId||n.evidenceDigest!==releaseDigest(current)
   ||r.operationId!==input.failedOperationId||a.observedAt!==current.observedAt||Date.parse(n.observedAt)<Date.parse(current.observedAt)
   ||releaseDigest(failedRollbackPartialStableEvidence(current))!==releaseDigest(failedRollbackPartialStableEvidence(e))
   ||composeFailedRollbackPartialEvidenceError(s,current,{id:r.operationId,operation:'rollback',createdAt:r.since,intent:r.partialRollbackFailure.absenceOperation.intent})!==null)
   return 'release_compose_failed_rollback_partial_closure_unproven';
  return null;
 }catch{return 'release_compose_failed_rollback_partial_closure_unproven';}
};
const composeFailedRollbackPartialClosureRevalidationError=(s,input,now)=>{
 const error=composeFailedRollbackPartialClosureBindingError(s,input);if(error)return error;
 const at=now instanceof Date?now.getTime():Number(now),observed=Date.parse(input.absenceRevalidation.observedAt),native=Date.parse(input.nativeClosure.observedAt);
 if(!Number.isFinite(at)||observed>at+60000||at-observed>300000||native>at+60000||at-native>300000)return 'release_native_closure_stale';
 return null;
};
const composeRecoveryEvidenceError=(s,e,operation)=>{
 if(e?.composeRecovery?.kind==='queue_failed_rollback_partial')return composeFailedRollbackPartialEvidenceError(s,e,operation);
 if(e?.composeRecovery?.kind==='queue_absent_partial')return composePartialRollbackAbsenceEvidenceError(s,e,operation);
 if(e?.composeRecovery?.kind==='queue_failed_partial')return composeFailedPartialEvidenceError(s,e,operation);
 try {
  const m=s.manifest,t=m.deployment.targets[0],r=e.composeRecovery,rollback=operation.operation==='rollback';
  if(!isComposeManifest(m)||!manifestSchema.safeParse(m).success||!evidenceSchema.safeParse(e).success
   ||Object.keys(e).some(k=>!['composeRecovery','deploymentIds','deployedCommit','deployedTree','artifactSetDigest','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','deployedSetDigest','absenceVerified'].includes(k))
   ||!['deploy','rollback'].includes(operation.operation)||!r||r.partial!==undefined||r.partialRollbackAbsence!==undefined||r.partialRollbackFailure!==undefined||r.releaseId!==s.releaseId||r.operationId!==operation.id
   ||Date.parse(r.since)!==new Date(operation.createdAt??operation.created_at).getTime()||r.targetId!==t.targetId
   ||operation.intent?.parameters?.targetId!==t.targetId||r.phase!==(rollback?'rollback':'candidate')
   ||r.requestedCommit!==(rollback?m.rollback.commit:s.commit)||r.requestedTree!==(rollback?s.baseTree:s.candidateTree)
   ||r.deploymentId!==`r${releaseDigest([s.releaseId,operation.id,t.targetId,rollback?'rollback':'candidate']).slice(0,23)}`
   ||e.composeTargets!==undefined||e.deploymentId!==undefined||e.imageDigest!==undefined||e.deployedTargets!==undefined
   ||e.deployedCommit!==t.baseline.commit||e.deployedTree!==t.baseline.tree||r.baselineCommit!==t.baseline.commit||r.baselineTree!==t.baseline.tree
   ||e.artifactSetDigest!==m.baseline.artifactSetDigest||e.configDigest!==(rollback?m.rollback.configDigest:m.deployment.configDigest)
   ||e.schemaDigest!==m.baseline.schemaDigest||e.dataDigest!==m.baseline.dataDigest||e.healthDigest!==m.baseline.healthDigest||e.healthy!==true
   ||compose.composeConfigurationDigest(r.configuration)!==(rollback?t.rollbackConfigDigest:t.configDigest)
   ||r.configuration.gitCommit!==r.requestedCommit||Date.parse(e.observedAt)<Date.parse(r.since)
   ||releaseDigest(e.deploymentIds)!==releaseDigest(r.kind==='queue_absent'?[]:[{targetId:t.targetId,deploymentId:r.deploymentId}]))return 'release_compose_recovery_unproven';
  if(r.kind==='queue_absent'?(r.queue!==null||e.absenceVerified!==true):(!r.queue||e.absenceVerified!==undefined
   ||r.queue.targetId!==r.targetId||r.queue.deploymentId!==r.deploymentId||![r.requestedCommit,'HEAD'].includes(r.queue.commit)
   ||Date.parse(r.queue.createdAt)<Date.parse(r.since)||Date.parse(r.queue.createdAt)>Date.parse(e.observedAt)
   ||r.queue.finishedAt!==null&&(Date.parse(r.queue.finishedAt)<Date.parse(r.queue.createdAt)||Date.parse(r.queue.finishedAt)>Date.parse(e.observedAt))))return 'release_compose_recovery_unproven';
  const proof=compose.qualifyComposeRetainedBaseline({configuration:t.baseline.configuration,images:t.baseline.images,
   services:r.services,baselineServices:r.baselineServices});
  if(e.deployedSetDigest!==releaseDigest([{targetId:t.targetId,runtimeSetDigest:proof.runtimeSetDigest}]))return 'release_compose_recovery_unproven';
  return null;
 }catch{return 'release_compose_recovery_unproven';}
};
const releaseComposeQueueAbsenceRevalidationDigest=value=>{
 const {revalidationDigest:_sealed,...body}=value;return releaseDigest(body);
};
const releaseComposeQueueAbsenceRevalidationBindings=snapshot=>baselineRevalidation.baselineRevalidationBindings(
 {...snapshot,baselineRestart:snapshot.baselineRestart??null},releaseDigest);
const releaseComposeQueueAbsenceRevalidationBindingError=(snapshot,input,retained=false)=>{
 try {
  const a=input.absenceRevalidation,e=input.evidence,n=input.nativeClosure,m=snapshot.manifest,t=m.deployment.targets[0];
  if(!(retained?composeRetainedBaselineRevalidationSchema:composeQueueAbsenceRevalidationSchema).safeParse(a).success||!releaseNativeClosureSchema.safeParse(n).success
   ||!isComposeManifest(m)||!manifestSchema.safeParse(m).success||!id.safeParse(snapshot.releaseId).success
   ||a.releaseId!==snapshot.releaseId||n.releaseId!==snapshot.releaseId||n.agentHostId!==snapshot.hostId
   ||n.operationId!==input.failedOperationId||n.evidenceDigest!==releaseDigest(e)||a.nativeClosureDigest!==releaseDigest(n)
   ||a.rollbackEvidenceDigest!==releaseDigest(e)||a.revalidationDigest!==releaseComposeQueueAbsenceRevalidationDigest(a))return 'release_compose_queue_absence_revalidation_invalid';
  const candidate=a.candidateEvidence.composeRecovery,rollback=e.composeRecovery;
  const kind=retained?'queue_failed':'queue_absent';
  if(!candidate||!rollback||candidate.kind!==kind||rollback.kind!==kind||candidate.operationId===rollback.operationId
   ||retained&&[candidate,rollback].some(r=>r.queue?.status!=='failed'||r.queue.finishedAt===null)
   ||rollback.operationId!==input.failedOperationId
   ||composeRecoveryEvidenceError(snapshot,a.candidateEvidence,{id:candidate.operationId,operation:'deploy',createdAt:candidate.since,intent:{parameters:{targetId:t.targetId}}})
   ||composeRecoveryEvidenceError(snapshot,e,{id:rollback.operationId,operation:'rollback',createdAt:rollback.since,intent:{parameters:{targetId:t.targetId}}}))return 'release_compose_queue_absence_revalidation_invalid';
  const ordered=rows=>rows.slice().sort((x,y)=>x.name<y.name?-1:x.name>y.name?1:0);
  if(releaseDigest(ordered(candidate.baselineServices))!==releaseDigest(ordered(rollback.baselineServices))
   ||releaseDigest(ordered(candidate.services))!==releaseDigest(ordered(rollback.services))
   ||releaseDigest(ordered(a.services))!==releaseDigest(ordered(rollback.services))
   ||releaseDigest(a.configuration)!==releaseDigest(t.rollbackConfiguration)
   ||releaseDigest(a.configuration)!==releaseDigest(rollback.configuration)
   ||compose.composeConfigurationDigest(a.configuration)!==t.rollbackConfigDigest)return 'release_compose_queue_absence_revalidation_invalid';
  compose.qualifyComposeRetainedBaseline({configuration:t.baseline.configuration,images:t.baseline.images,services:a.services,baselineServices:rollback.baselineServices});
  const expectedQueues=[candidate,rollback].map(r=>({operationId:r.operationId,targetId:r.targetId,deploymentId:r.deploymentId,queue:retained?r.queue:null}));
  if(releaseDigest(a.queues)!==releaseDigest(expectedQueues))return 'release_compose_queue_absence_revalidation_invalid';
  const expected=releaseComposeQueueAbsenceRevalidationBindings(snapshot),b=a.baseline;
  if(snapshot.manifestDigest!==expected.manifestDigest||Object.entries(expected).some(([key,value])=>releaseDigest(b[key])!==releaseDigest(value))
   ||b.revalidationDigest!==baselineRevalidation.baselineRevalidationDigest(b,releaseDigest)
   ||Object.values(b.actualReadTimes).some(at=>Date.parse(at)>Date.parse(b.observedAt))
   ||Date.parse(b.observedAt)<Math.max(Date.parse(a.candidateEvidence.observedAt),Date.parse(e.observedAt)))return 'release_compose_queue_absence_revalidation_invalid';
  if(Date.parse(n.observedAt)<Date.parse(b.observedAt))return 'release_native_closure_stale';
  return null;
 }catch{return 'release_compose_queue_absence_revalidation_invalid';}
};
const releaseComposeRetainedBaselineRevalidationBindingError=(snapshot,input)=>releaseComposeQueueAbsenceRevalidationBindingError(snapshot,input,true);
const releaseComposeQueueAbsenceRevalidationError=(snapshot,input,now,retained=false)=>{
 const error=releaseComposeQueueAbsenceRevalidationBindingError(snapshot,input,retained);if(error)return error;
 const b=input.absenceRevalidation.baseline,at=now instanceof Date?now.getTime():Number(now);
 if(!Number.isFinite(at)||[b.observedAt,...baselineRevalidation.readKeys.map(key=>b.actualReadTimes[key])].some(time=>{
  const age=at-Date.parse(time);return !Number.isFinite(age)||age<0||age>300000;
 }))return 'release_prerequisite_stale';
 const native=Date.parse(input.nativeClosure.observedAt);
 return native>at+60000||at-native>300000?'release_native_closure_stale':null;
};
const releaseComposeRetainedBaselineRevalidationError=(snapshot,input,now)=>releaseComposeQueueAbsenceRevalidationError(snapshot,input,now,true);
const postResult=o=>o?.status==='reconciled'?(o.reconciledStatus??o.reconciled_status):o?.status;
const latestPostObservation=(s,journal)=>{
 const observations=journal.filter(j=>j.operation==='observe'),last=observations.at(-1);
 if(!last||postResult(last.outcome)!=='succeeded'||!['candidate','rollback'].includes(last.intent?.parameters?.mode))return null;
 const rollback=last.intent.parameters.mode==='rollback',e=last.outcome.evidence;
 const recovery=journal.map((j,i)=>j.operation.startsWith('rollback')?i:-1).filter(i=>i>=0).at(-1);
 if(recovery!==undefined&&(!rollback||journal.indexOf(last)<=recovery))return null;
 if(composeEvidenceError(s,e,rollback)||e.healthy!==true||!Number.isInteger(e.observationSeconds)
  ||e.observationSeconds<s.manifest.observation.seconds)return null;
 const queues=journal.slice(0,journal.indexOf(last)).filter(j=>j.operation===(rollback?'rollback':'deploy')&&postResult(j.outcome)==='succeeded')
  .flatMap(j=>j.outcome.evidence?.deploymentIds??[]);
 if(releaseDigest(queues)!==releaseDigest(e.deploymentIds))return null;
 return last;
};
const postObservationOutcomeError=(s,operation,input,journal=[])=>{
 const ownIndex=journal.findIndex(j=>operation?.id?j.id===operation.id:j===operation);
 if(ownIndex>=0)journal=journal.slice(0,ownIndex);
 const op=operation?.operation,p=s?.manifest?.postObservation,e=input?.evidence,result=postResult(input);
 const used=postObservationOperations.includes(op);
 if(!used)return e?.postObservation!==undefined?'release_evidence_scope_invalid':null;
 if(!isComposeManifest(s?.manifest)||!p||!manifestSchema.safeParse(s.manifest).success)return 'release_post_observation_scope_required';
 if(operation.intent?.parameters?.postObservationDigest!==releaseDigest(p))return 'release_post_observation_scope_changed';
 if(!outcomeSchema.safeParse(input).success||Object.keys(e).some(k=>!['observedAt','postObservation'].includes(k)))return 'release_post_observation_unproven';
 const progression=postObservationIntentError(s,{operation:op,parameters:operation.intent?.parameters},journal);
 if(progression)return progression;
 // Uncertainty creates a durable hold, never a fabricated success/absence.
 if(result==='uncertain')return e.postObservation===undefined?null:'release_post_observation_unproven';
 const observation=latestPostObservation(s,journal),proof=e.postObservation;
 if(!observation||Date.parse(e.observedAt)<Date.parse(observation.outcome.evidence.observedAt))return 'release_post_observation_before_verification';
 const rollback=observation.intent.parameters.mode==='rollback',commit=op==='runtime_resume'?observation.outcome.evidence.deployedCommit:s.commit;
 const tree=op==='runtime_resume'?observation.outcome.evidence.deployedTree:s.candidateTree;
 if(!proof||proof.postObservationDigest!==releaseDigest(p)||proof.fixtureDigest!==releaseDigest(p.fixture)
  ||proof.controllerDigest!==p.controllerDigest||proof.targetId!==s.manifest.deployment.targetId
  ||proof.commit!==commit||proof.tree!==tree)return 'release_post_observation_identity_mismatch';
 if(result==='failed'){
  const failures={smoke:['fixture_unproven','empty_render_failed','populated_render_failed','data_parity_failed'],
   fixture_cleanup:['fixture_unproven','data_parity_failed'],runtime_resume:['fixture_unproven','runtime_resume_failed']};
  return proof.kind==='failure'&&proof.phase===op&&failures[op]?.includes(proof.failureCode)
   &&(input.status==='reconciled'||input.observationOnly===false)?null:'release_post_observation_failure_unproven';
 }
 if(result!=='succeeded'||input.status!=='reconciled'&&input.observationOnly!==false||proof.kind!==op)return 'release_post_observation_unproven';
 const baseline=s.manifest.baseline;
 if(proof.schemaDigest!==baseline.schemaDigest)return 'release_post_observation_schema_changed';
 if(op==='smoke'){
  if(rollback||proof.backendCommit!==s.commit||proof.frontendCommit!==s.commit||p.candidateCommit!==s.commit
   ||p.candidateTree!==s.candidateTree||proof.renderedEventId!==p.fixture.eventId||proof.memoryId!==p.fixture.memoryId
   ||proof.renderedSummaryDigest!==p.fixture.summaryDigest)return 'release_post_observation_identity_mismatch';
  if(proof.nonOwnedDataDigest!==baseline.dataDigest||proof.sequenceDigest!==p.baselineSequenceDigest)
   return 'release_post_observation_data_changed';
 }
 if(op==='fixture_cleanup'&&(proof.dataDigest!==baseline.dataDigest||proof.sequenceDigest!==p.baselineSequenceDigest))return 'release_post_observation_data_changed';
 if(op==='runtime_resume'){
  if(proof.backendCommit!==commit||proof.frontendCommit!==commit||proof.databaseSettingsDigest!==p.runtimeResume.databaseSettingsDigest
   ||proof.ingressSettingsDigest!==p.runtimeResume.ingressSettingsDigest||proof.observationSeconds<p.runtimeResume.observationSeconds
   ||releaseDigest(proof.cadences.slice().sort((a,b)=>a.name.localeCompare(b.name)))
     !==releaseDigest(p.runtimeResume.cadences.slice().sort((a,b)=>a.name.localeCompare(b.name))))return 'release_runtime_resume_scope_changed';
  if(proof.cadenceEvidence.length!==p.runtimeResume.cadences.length
   ||new Set(proof.cadenceEvidence.map(r=>r.name)).size!==proof.cadenceEvidence.length
   ||p.runtimeResume.cadences.some(c=>!proof.cadenceEvidence.some(r=>r.name===c.name&&r.behaviorDigest===c.behaviorDigest
     &&Date.parse(r.observedAt)>=Date.parse(operation.createdAt)&&Date.parse(r.observedAt)<=Date.parse(e.observedAt))))
   return 'release_runtime_resume_ticks_unproven';
  const prior=observation.outcome.evidence.composeTargets[0].runtime.services,rows=proof.services;
  if(rows.length!==prior.length||new Set(rows.map(r=>r.name)).size!==rows.length||new Set(rows.map(r=>r.containerId)).size!==rows.length
   ||prior.some(before=>{const row=rows.find(r=>r.name===before.name);
    if(!row||['role','containerId','imageDigest','mountDigest','createdAt','commit','tree','deploymentId'].some(k=>row[k]!==before[k]))return true;
    if(row.role==='cadence')return row.state!=='running'||row.health!==null||row.exitCode!==0
     ||!p.runtimeResume.cadences.some(c=>c.name===row.name);
    return ['state','health','exitCode'].some(k=>row[k]!==before[k]);
   }))return 'release_runtime_resume_identity_changed';
 }
 return null;
};
const postSucceeded=(s,journal,op)=>journal.some((j,i)=>j.operation===op&&postResult(j.outcome)==='succeeded'
 &&!postObservationOutcomeError(s,j,{requestId:j.outcome.requestId??j.outcome.request_id,status:j.outcome.status,
  ...(j.outcome.status==='reconciled'?{reconciledStatus:j.outcome.reconciledStatus??j.outcome.reconciled_status}:{}),
  observationOnly:j.outcome.observationOnly??j.outcome.observation_only,evidence:j.outcome.evidence},journal.slice(0,i)));
const postObservationIntentError=(s,input,journal=[])=>{
 const p=s?.manifest?.postObservation,op=input?.operation,used=postObservationOperations.includes(op);
 if(!p)return used?'release_post_observation_scope_required':null;
 if(!isComposeManifest(s.manifest)||!manifestSchema.safeParse(s.manifest).success)return 'release_post_observation_scope_changed';
 if(used&&(input.parameters?.postObservationDigest!==releaseDigest(p)||Object.keys(input.parameters).some(k=>k!=='postObservationDigest')))
  return 'release_post_observation_scope_changed';
 if(journal.some(j=>!postResult(j.outcome)||postResult(j.outcome)==='uncertain'))return 'release_operation_unresolved';
 const smoke=journal.filter(j=>j.operation==='smoke'),resumes=journal.filter(j=>j.operation==='runtime_resume');
 const cleaned=postSucceeded(s,journal,'fixture_cleanup'),resumed=postSucceeded(s,journal,'runtime_resume');
 const observation=latestPostObservation(s,journal),rollback=observation?.intent.parameters.mode==='rollback';
 // Once normal cadence is restored, unchanged-data release operations cannot be
 // repeated against a pre-resume fingerprint. Only retained resource cleanup remains.
 if(resumes.length&&['deploy_config','deploy','observe','rollback_config','rollback','smoke','fixture_cleanup'].includes(op))return 'release_runtime_resume_recovery_required';
 if(['cleanup_resource','archive_repository','cleanup_local','cleanup'].includes(op)&&(!resumed||smoke.length&&!cleaned))return 'release_post_observation_pending';
 if(op.startsWith('rollback')&&smoke.length&&!cleaned)return 'release_fixture_cleanup_pending';
 if(op==='observe'&&smoke.length&&input.parameters?.mode!=='rollback')return 'release_post_observation_already_started';
 if(!used)return null;
 if(!observation)return 'release_post_observation_before_verification';
 if(postSucceeded(s,journal,op))return 'release_operation_already_succeeded';
 if(op==='smoke'&&(rollback||smoke.length))return 'release_post_observation_already_started';
 if(op==='fixture_cleanup'&&(!smoke.length||rollback))return 'release_fixture_cleanup_without_smoke';
 if(op==='runtime_resume'){
  if(resumes.length)return 'release_runtime_resume_recovery_required';
  if(smoke.length&&!cleaned)return 'release_fixture_cleanup_pending';
  if(!rollback&&!postSucceeded(s,journal,'smoke'))return 'release_post_observation_smoke_pending';
 }
 return null;
};
module.exports={gitPublicationBaseSchema,releaseGitPublicationBase,baselineRevalidationSchema,composeConfigAbsenceSchema,composeConfigAbsenceEvidenceError,releaseNativeClosureSchema,postObservationScopeSchema,postObservationEvidenceSchema,postObservationOperations,postObservationIntentError,postObservationOutcomeError,composeFailedPartialSchema,composeFailedPartialV1Schema,composeFailedPartialV2Schema,composeFailedPartialV2ImageSchema,composeFailedPartialEvidenceError,composeRecoverySchema,composeRecoveryEvidenceError,composeManifestObject,isComposeManifest,isReleaseSetManifest,sourceArtifactDigest,composeEvidenceError,manifestSchema,createReleaseSchema,intentSchema,outcomeSchema,operations,releaseDigest,retainsApplication,applicationManifestObject,refineApplicationManifest,gitSetManifestObject,isGitSetManifest,gitSetArtifactDigest,releaseExpirySchema,releaseSuccessorBasisSchema,releaseHasSuccessor,releaseRollbackImageFailureValid,baselineRestartSchema,closeFailedReleaseSchema,authorizeReconciliationSchema,publishedGitBasisSchema,releaseHasPublishedGitBasis:releaseHasPublishedGit,releaseRestartProtectedResourceIds};
module.exports.composePartialRollbackAbsenceSchema=composePartialRollbackAbsenceSchema;
module.exports.composePartialRollbackAbsenceEvidenceError=composePartialRollbackAbsenceEvidenceError;
module.exports.composePartialRollbackAbsenceJournalError=composePartialRollbackAbsenceJournalError;
module.exports.composePartialRollbackRetryValid=composePartialRollbackRetryValid;
module.exports.releaseBaselineRevalidationSchema=baselineRevalidationSchema;
module.exports.releaseBaselineRevalidationBindings=input=>baselineRevalidation.baselineRevalidationBindings(input,releaseDigest);
module.exports.releaseBaselineRevalidationDigest=value=>baselineRevalidation.baselineRevalidationDigest(value,releaseDigest);
module.exports.releaseBaselineRevalidationBindingError=input=>baselineRevalidation.baselineRevalidationBindingError(input,baselineRevalidationSchema,releaseDigest);
module.exports.releaseBaselineRevalidationError=(input,now)=>baselineRevalidation.baselineRevalidationError(input,baselineRevalidationSchema,releaseDigest,now);
module.exports.releaseConfigAbsenceRevalidationSchema=configAbsenceRevalidationSchema;
module.exports.releaseConfigAbsenceRevalidationBindingError=releaseConfigAbsenceRevalidationBindingError;
module.exports.releaseConfigAbsenceRevalidationError=releaseConfigAbsenceRevalidationError;
module.exports.releaseComposeQueueAbsenceRevalidationSchema=composeQueueAbsenceRevalidationSchema;
module.exports.releaseComposeQueueAbsenceRevalidationBindings=releaseComposeQueueAbsenceRevalidationBindings;
module.exports.releaseComposeQueueAbsenceRevalidationDigest=releaseComposeQueueAbsenceRevalidationDigest;
module.exports.releaseComposeQueueAbsenceRevalidationBindingError=releaseComposeQueueAbsenceRevalidationBindingError;
module.exports.releaseComposeQueueAbsenceRevalidationError=releaseComposeQueueAbsenceRevalidationError;
module.exports.releaseComposeQueueAbsenceBaselineAdoptionSchema=composeQueueAbsenceBaselineAdoptionSchema;
module.exports.releaseComposeRetainedBaselineAdoptionSchema=composeRetainedBaselineAdoptionSchema;
module.exports.releaseComposeRetainedBaselineRevalidationSchema=composeRetainedBaselineRevalidationSchema;
module.exports.releaseComposeRetainedBaselineRevalidationBindings=releaseComposeQueueAbsenceRevalidationBindings;
module.exports.releaseComposeRetainedBaselineRevalidationDigest=releaseComposeQueueAbsenceRevalidationDigest;
module.exports.releaseComposeRetainedBaselineRevalidationBindingError=releaseComposeRetainedBaselineRevalidationBindingError;
module.exports.releaseComposeRetainedBaselineRevalidationError=releaseComposeRetainedBaselineRevalidationError;
// Reconstruct every permitted byte from the authenticated previous snapshot.
// Aggregate artifact digests include configuration, so they are derived again;
// physical images, source commits and sealed controller command hashes stay put.
const composeAdoptionBackupMatches=(previous,candidate)=>{
 if(releaseDigest(previous)===releaseDigest(candidate))return true;
 return candidate.digest!==previous.digest&&Date.parse(candidate.capturedAt)>Date.parse(previous.restoreVerifiedAt)
  &&Date.parse(candidate.restoreVerifiedAt)>=Date.parse(candidate.capturedAt);
};
const releaseComposeQueueAbsenceAdoptionManifest=(snapshot,rendererDigest,observedAt,backup=snapshot.manifest.backup)=>{
 try {
  const previous=snapshot.manifest,t=previous.deployment.targets[0];
  if(!isComposeManifest(previous)||!manifestSchema.safeParse(previous).success||!hash.safeParse(rendererDigest).success
   ||!sha.safeParse(snapshot.commit).success||!sha.safeParse(snapshot.candidateTree).success
   ||rendererDigest===t.baseline.controllerInvariants.rendererDigest||!z.string().datetime().safeParse(observedAt).success
   ||Date.parse(observedAt)<Date.parse(previous.baseline.observedAt)||!composeAdoptionBackupMatches(previous.backup,backup))return null;
  const m=structuredClone(previous),target=m.deployment.targets[0];
  const qualify=config=>{const copy=structuredClone(config);copy.sourcePins.controllerRenderer=rendererDigest;
   copy.controllerPolicy.rendererDigest=rendererDigest;return copy;};
  target.configuration=qualify(t.configuration);target.rollbackConfiguration=qualify(t.rollbackConfiguration);
  target.baseline.configuration=qualify(t.rollbackConfiguration);target.baseline.configuration.controllerPolicy.phase='baseline';
  target.baseline.sourceDigest=target.baseline.configuration.sourceDigest;
  target.baseline.controllerInvariants.rendererDigest=rendererDigest;
  target.configDigest=compose.composeConfigurationDigest(target.configuration);
  target.rollbackConfigDigest=compose.composeConfigurationDigest(target.rollbackConfiguration);
  target.baseline.configDigest=compose.composeConfigurationDigest(target.baseline.configuration);
  m.deployment.configDigest=releaseDigest([{targetId:target.targetId,configDigest:target.configDigest}]);
  m.rollback.configDigest=releaseDigest([{targetId:target.targetId,configDigest:target.rollbackConfigDigest}]);
  m.baseline.configDigest=releaseDigest([{targetId:target.targetId,configDigest:target.baseline.configDigest}]);
  m.deployment.artifactSetDigest=sourceArtifactDigest(m,snapshot);
  m.rollback.artifactSetDigest=sourceArtifactDigest(m,snapshot,true);
  m.baseline.artifactSetDigest=sourceArtifactDigest(m,snapshot,'baseline');
  m.baseline.observedAt=observedAt;m.backup=structuredClone(backup);
  return manifestSchema.safeParse(m).success?m:null;
 }catch{return null;}
};
module.exports.releaseComposeQueueAbsenceAdoptionManifest=releaseComposeQueueAbsenceAdoptionManifest;
module.exports.releaseComposeQueueAbsenceAdoptionManifestMatches=(snapshot,candidate,adoption)=>{
 try {
  if(!composeQueueAbsenceBaselineAdoptionSchema.safeParse(adoption).success)return false;
  const previous=snapshot.manifest,t=previous.deployment.targets[0];
  if(adoption.previousManifestDigest!==snapshot.manifestDigest||adoption.previousManifestDigest!==releaseDigest(previous)
   ||adoption.targetId!==t.targetId||adoption.previousRendererDigest!==t.baseline.controllerInvariants.rendererDigest
   ||adoption.previousRollbackConfigurationDigest!==t.rollbackConfigDigest)return false;
  const expected=releaseComposeQueueAbsenceAdoptionManifest(snapshot,adoption.newRendererDigest,candidate.baseline.observedAt,candidate.backup);
  return expected!==null&&releaseDigest(expected)===releaseDigest(candidate);
 }catch{return false;}
};
// Deterministic projected baseline: the closure retains the actual old rollback
// controller separately. This projection does not assert that the new renderer
// or a rollback ever ran; ordinary deployment must still prove every effect.
const releaseComposeRetainedBaselineAdoptionManifest=(snapshot,adoption,observedAt,backup=snapshot.manifest.backup)=>{
 try {
  const a=composeRetainedBaselineAdoptionSchema.parse(adoption),old=snapshot.manifest,t=old.deployment.targets[0];
  if(a.previousManifestDigest!==snapshot.manifestDigest||a.previousManifestDigest!==releaseDigest(old)
   ||a.targetId!==t.targetId||a.previousRendererDigest!==t.baseline.controllerInvariants.rendererDigest
   ||a.previousRollbackConfigurationDigest!==t.rollbackConfigDigest)return null;
  for(const [policy,phase]of [[a.candidateControllerPolicy,'candidate'],[a.rollbackControllerPolicy,'rollback']])
   if(policy.phase!==phase||policy.rendererDigest!==a.newRendererDigest
    ||['settingsInvariantDigest','runtimeInvariantDigest'].some(k=>policy[k]!==t.baseline.controllerInvariants[k]))return null;
  const m=releaseComposeQueueAbsenceAdoptionManifest(snapshot,a.newRendererDigest,observedAt,backup);if(!m)return null;
  const target=m.deployment.targets[0];
  target.configuration.controllerPolicy=structuredClone(a.candidateControllerPolicy);
  target.configuration.settingsDigest=a.candidateSettingsDigest;target.configuration.runtimePolicyDigest=a.candidateRuntimePolicyDigest;
  target.rollbackConfiguration.controllerPolicy=structuredClone(a.rollbackControllerPolicy);
  target.rollbackConfiguration.settingsDigest=a.rollbackSettingsDigest;target.rollbackConfiguration.runtimePolicyDigest=a.rollbackRuntimePolicyDigest;
  // Keep the observed old rollback command/settings preimage in the baseline.
  // The recipe above only requalifies its local renderer descriptor and phase;
  // repaired candidate/rollback commands have not yet been installed.
  target.configDigest=compose.composeConfigurationDigest(target.configuration);
  target.rollbackConfigDigest=compose.composeConfigurationDigest(target.rollbackConfiguration);
  target.baseline.configDigest=compose.composeConfigurationDigest(target.baseline.configuration);
  for(const [key,digest]of [['deployment',target.configDigest],['rollback',target.rollbackConfigDigest],['baseline',target.baseline.configDigest]])
   m[key].configDigest=releaseDigest([{targetId:target.targetId,configDigest:digest}]);
  m.deployment.artifactSetDigest=sourceArtifactDigest(m,snapshot);m.rollback.artifactSetDigest=sourceArtifactDigest(m,snapshot,true);
  m.baseline.artifactSetDigest=sourceArtifactDigest(m,snapshot,'baseline');
  return manifestSchema.safeParse(m).success?m:null;
 }catch{return null;}
};
module.exports.releaseComposeRetainedBaselineAdoptionManifest=releaseComposeRetainedBaselineAdoptionManifest;
module.exports.releaseComposeRetainedBaselineAdoptionManifestMatches=(snapshot,candidate,adoption)=>{
 const expected=releaseComposeRetainedBaselineAdoptionManifest(snapshot,adoption,candidate?.baseline?.observedAt,candidate?.backup);
 return expected!==null&&releaseDigest(expected)===releaseDigest(candidate);
};
// A new encrypted backup/restore does not change the already published source.
// All runtime, data, rollback and effect policy stays identical. Fresh admission
// still verifies this new tuple, its age, current evidence and exact owner grant.
module.exports.composeFailedRollbackPartialSchema=composeFailedRollbackPartialSchema;
module.exports.composeFailedRollbackPartialEvidenceError=composeFailedRollbackPartialEvidenceError;
module.exports.composeFailedRollbackPartialJournalError=composeFailedRollbackPartialJournalError;
module.exports.composeFailedRollbackPartialClosureRevalidationSchema=composeFailedRollbackPartialClosureRevalidationSchema;
module.exports.composeFailedRollbackPartialClosureBindingError=composeFailedRollbackPartialClosureBindingError;
module.exports.composeFailedRollbackPartialClosureRevalidationError=composeFailedRollbackPartialClosureRevalidationError;
module.exports.releaseComposeRestartManifestMatches=(previous,candidate)=>{
 try {
  if(!isComposeManifest(previous)||!isComposeManifest(candidate)||!manifestSchema.safeParse(candidate).success)return false;
  const stable=m=>{const {backup,baseline,...rest}=m;return {...rest,baseline:Object.fromEntries(Object.entries(baseline).filter(([k])=>k!=='observedAt'))};};
  if(releaseDigest(stable(previous))!==releaseDigest(stable(candidate)))return false;
  if(releaseDigest(previous.backup)===releaseDigest(candidate.backup))return true;
  const b=candidate.backup,p=previous.backup;
  return b.digest!==p.digest&&Date.parse(b.capturedAt)>Date.parse(p.restoreVerifiedAt)
   &&Date.parse(b.restoreVerifiedAt)>=Date.parse(b.capturedAt);
 }catch{return false;}
};
