"use strict";
const { z } = require("zod");
const { createHash } = require("node:crypto");
// The pure CommonJS engine also backs the ESM transport wrapper; no loader cycle.
const compose = require('./agent-host-release-compose-state.cjs');
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
const createReleaseSchema=z.object({requestId:id,taskId:id,applicationId:id,hostId:id,releaseExecutionId:id,releaserAgentId:id,releaserCredentialId:id,credentialVersion:z.number().int().positive(),reviewId:id,materialVersion:hash,commit:sha,candidateTree:sha,baseCommit:sha,baseTree:sha,releaserRevision:z.string().datetime(),expiresAt:releaseExpirySchema,manifest:manifestSchema,manifestDigest:hash,predecessor:predecessorSchema.optional(),baselineRestart:baselineRestartSchema.optional()}).strict().superRefine((s,c)=>{
 if(isReleaseSetManifest(s.manifest)&&(s.manifest.deployment.artifactSetDigest!==sourceArtifactDigest(s.manifest,s)||s.manifest.baseline.commit!==s.baseCommit))c.addIssue({code:'custom',message:'release_source_set_mismatch'});
 if(isComposeManifest(s.manifest)&&s.manifest.deployment.targets.some(t=>t.configuration.gitCommit!==s.commit||t.baseline.tree!==s.baseTree))c.addIssue({code:'custom',message:'release_compose_source_changed'});
 if(s.manifest.postObservation&&(s.manifest.postObservation.candidateCommit!==s.commit||s.manifest.postObservation.candidateTree!==s.candidateTree))c.addIssue({code:'custom',message:'release_post_observation_source_changed'});
 if(s.predecessor&&!isReleaseSetManifest(s.manifest))c.addIssue({code:'custom',message:'release_successor_scope_invalid'});
 if(s.baselineRestart&&(!isReleaseSetManifest(s.manifest)||s.predecessor))c.addIssue({code:'custom',message:'release_restart_scope_invalid'});
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
const composeRecoverySchema=z.object({schemaVersion:z.literal('roost-compose-recovery-observation-v1'),kind:z.enum(['queue_failed','queue_absent']),
 releaseId:id,operationId:id,since:z.string().datetime(),targetId:text,phase:z.enum(['candidate','rollback']),requestedCommit:sha,requestedTree:sha,
 deploymentId:text,queue:z.object({targetId:text,deploymentId:text,commit:z.union([sha,z.literal('HEAD')]),
  status:z.enum(['failed','cancelled-by-user']),createdAt:z.string().datetime(),finishedAt:z.string().datetime().nullable()}).strict().nullable(),
 controlPlaneQuiescent:z.literal(true),configuration:compose.composeConfigurationSchema,
 baselineCommit:sha,baselineTree:sha,migrationSchemaVerified:z.literal(true),
 baselineServices:z.array(compose.composeRuntimeServiceSchema).min(2).max(12),services:z.array(compose.composeRuntimeServiceSchema).min(2).max(12)}).strict();
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
const evidenceSchema=z.object({composeConfigAbsence:composeConfigAbsenceSchema.optional(),postObservation:postObservationEvidenceSchema.optional(),composeRecovery:composeRecoverySchema.optional(),composeTargets:z.array(composeTargetEvidence).length(1).optional(),observedAt:z.string().datetime(),failureKind:z.literal('rollback_image_mismatch').optional(),remoteCommit:sha.optional(),remoteBase:sha.optional(),remoteTree:sha.optional(),pullRequestNumber:z.number().int().positive().optional(),prHeadCommit:sha.optional(),prMerged:z.boolean().optional(),reviewApproved:z.boolean().optional(),mergedCommit:sha.optional(),deploymentId:text.optional(),deploymentIds:z.array(deploymentIdentity).max(6).optional(),deployedTargets:z.array(deployedTarget).min(1).max(6).optional(),artifactSetDigest:hash.optional(),deployedSetDigest:hash.optional(),deployedCommit:sha.optional(),deployedTree:sha.optional(),imageDigest:image.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),healthDigest:hash.optional(),dataDigest:hash.optional(),backupDigest:hash.optional(),restoreDigest:hash.optional(),healthy:z.boolean().optional(),observationSeconds:z.number().int().nonnegative().max(3600).optional(),resourceIds:z.array(text).max(30).optional(),resourcePresent:z.boolean().optional(),repositoryArchived:z.boolean().optional(),localAbsent:z.boolean().optional(),absenceVerified:z.boolean().optional(),retentionVerified:z.boolean().optional(),repositoryUrl:url.optional(),canonicalDir:dir.optional(),targetId:text.optional(),applicationActive:z.boolean().optional(),localCommit:sha.optional(),localTree:sha.optional(),protectedResourcesDigest:hash.optional()}).strict().superRefine((e,c)=>{if(e.deploymentIds?.length===0&&!((e.composeRecovery?.kind==='queue_absent'||e.composeConfigAbsence!==undefined)&&e.absenceVerified===true))c.addIssue({code:'custom',message:'empty_deployment_ids_outside_recovery'});});
const closeFailedReleaseSchema=z.object({requestId:id,expectedVersion:hash,failedOperationId:id,consentDigest:hash,evidence:evidenceSchema,nativeClosure:releaseNativeClosureSchema.optional()}).strict();
const authorizeReconciliationSchema=z.object({requestId:id,expectedVersion:hash,credentialId:id,credentialVersion:z.number().int().positive(),operationIds:z.array(id).min(1).max(30),expiresAt:releaseExpirySchema}).strict();
const publishedGitBasisSchema=z.object({schemaVersion:z.literal('roost-release-published-git-v1'),releaseId:id,expectedVersion:hash,
 closureId:id,closureDigest:hash,pushOperationId:id,prOperationId:id,reviewOperationId:id,mergeOperationId:id,
 baselineDeploymentIds:z.array(deploymentIdentity).max(6),basisKind:z.literal('compose_config_absence').optional(),composeEvidenceDigest:hash.optional()}).strict().superRefine((b,c)=>{if(b.basisKind==='compose_config_absence'?b.baselineDeploymentIds.length!==0||!b.composeEvidenceDigest:b.baselineDeploymentIds.length===0||b.composeEvidenceDigest!==undefined)c.addIssue({code:'custom',message:'published_git_basis_kind_invalid'});});
const releaseHasPublishedGit=s=>{
 const parsed=publishedGitBasisSchema.safeParse(s?.publishedGitBasis), restart=baselineRestartSchema.safeParse(s?.baselineRestart);
 if(!parsed.success||!restart.success||s.predecessor||s.successorBasis||!isReleaseSetManifest(s.manifest)||!manifestSchema.safeParse(s.manifest).success)return false;
 const b=parsed.data,r=restart.data,rows=b.baselineDeploymentIds,targets=s.manifest.deployment.targets;
 if(isComposeManifest(s.manifest))return b.basisKind==='compose_config_absence'&&b.releaseId===r.releaseId&&b.expectedVersion===r.expectedVersion&&b.closureId===r.closureId&&rows.length===0;
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
const composeRecoveryEvidenceError=(s,e,operation)=>{
 try {
  const m=s.manifest,t=m.deployment.targets[0],r=e.composeRecovery,rollback=operation.operation==='rollback';
  if(!isComposeManifest(m)||!manifestSchema.safeParse(m).success||!evidenceSchema.safeParse(e).success
   ||Object.keys(e).some(k=>!['composeRecovery','deploymentIds','deployedCommit','deployedTree','artifactSetDigest','configDigest','schemaDigest','dataDigest','healthDigest','healthy','observedAt','deployedSetDigest','absenceVerified'].includes(k))
   ||!['deploy','rollback'].includes(operation.operation)||!r||r.releaseId!==s.releaseId||r.operationId!==operation.id
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
module.exports={composeConfigAbsenceSchema,composeConfigAbsenceEvidenceError,releaseNativeClosureSchema,postObservationScopeSchema,postObservationEvidenceSchema,postObservationOperations,postObservationIntentError,postObservationOutcomeError,composeRecoverySchema,composeRecoveryEvidenceError,composeManifestObject,isComposeManifest,isReleaseSetManifest,sourceArtifactDigest,composeEvidenceError,manifestSchema,createReleaseSchema,intentSchema,outcomeSchema,operations,releaseDigest,retainsApplication,applicationManifestObject,refineApplicationManifest,gitSetManifestObject,isGitSetManifest,gitSetArtifactDigest,releaseExpirySchema,releaseSuccessorBasisSchema,releaseHasSuccessor,releaseRollbackImageFailureValid,baselineRestartSchema,closeFailedReleaseSchema,authorizeReconciliationSchema,publishedGitBasisSchema,releaseHasPublishedGitBasis:releaseHasPublishedGit,releaseRestartProtectedResourceIds};
