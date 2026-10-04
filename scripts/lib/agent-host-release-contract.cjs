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
const composeManifestObject=gitSetManifestObject.extend({deployment:gitSetManifestObject.shape.deployment.extend({
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
 if(s.predecessor&&!isReleaseSetManifest(s.manifest))c.addIssue({code:'custom',message:'release_successor_scope_invalid'});
 if(s.baselineRestart&&(!isGitSetManifest(s.manifest)||s.predecessor))c.addIssue({code:'custom',message:'release_restart_scope_invalid'});
});
const operations=["push","pr","review","merge","deploy_config","deploy","observe","rollback_config","rollback","cleanup_resource","archive_repository","cleanup_local","cleanup"];
const parametersSchema=z.object({targetId:text.optional(),branch:text.optional(),pullRequestNumber:z.number().int().positive().optional(),deploymentId:text.optional(),commit:sha.optional(),imageDigest:image.optional(),artifactSetDigest:hash.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),mode:z.enum(["candidate","rollback"]).optional(),faultInjection:z.boolean().optional(),resourceId:text.optional(),resourceIds:z.array(text).max(30).optional()}).strict();
const intentSchema=z.object({requestId:id,operation:z.enum(operations),manifestDigest:hash,commit:sha,baseCommit:sha,expectedVersion:hash,observed:z.object({commit:sha,baseCommit:sha,baseTree:sha,manifestDigest:hash}).strict(),parameters:parametersSchema}).strict().superRefine((v,c)=>{
 const allowed={push:["branch"],pr:[],review:["pullRequestNumber"],merge:["pullRequestNumber"],deploy_config:["commit","imageDigest","artifactSetDigest","configDigest","schemaDigest"],deploy:["targetId","commit","imageDigest","artifactSetDigest","configDigest","schemaDigest","faultInjection"],observe:["mode"],rollback_config:["commit","imageDigest","artifactSetDigest","configDigest","schemaDigest"],rollback:["targetId","commit","imageDigest","artifactSetDigest","configDigest","schemaDigest"],cleanup_resource:["resourceId"],archive_repository:[],cleanup_local:[],cleanup:["resourceIds"]}[v.operation];
 if(Object.keys(v.parameters).some(k=>!allowed.includes(k)))c.addIssue({code:"custom",message:"operation_parameters_outside_scope"});
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
const evidenceSchema=z.object({composeRecovery:composeRecoverySchema.optional(),composeTargets:z.array(composeTargetEvidence).length(1).optional(),observedAt:z.string().datetime(),failureKind:z.literal('rollback_image_mismatch').optional(),remoteCommit:sha.optional(),remoteBase:sha.optional(),remoteTree:sha.optional(),pullRequestNumber:z.number().int().positive().optional(),prHeadCommit:sha.optional(),prMerged:z.boolean().optional(),reviewApproved:z.boolean().optional(),mergedCommit:sha.optional(),deploymentId:text.optional(),deploymentIds:z.array(deploymentIdentity).max(6).optional(),deployedTargets:z.array(deployedTarget).min(1).max(6).optional(),artifactSetDigest:hash.optional(),deployedSetDigest:hash.optional(),deployedCommit:sha.optional(),deployedTree:sha.optional(),imageDigest:image.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),healthDigest:hash.optional(),dataDigest:hash.optional(),backupDigest:hash.optional(),restoreDigest:hash.optional(),healthy:z.boolean().optional(),observationSeconds:z.number().int().nonnegative().max(3600).optional(),resourceIds:z.array(text).max(30).optional(),resourcePresent:z.boolean().optional(),repositoryArchived:z.boolean().optional(),localAbsent:z.boolean().optional(),absenceVerified:z.boolean().optional(),retentionVerified:z.boolean().optional(),repositoryUrl:url.optional(),canonicalDir:dir.optional(),targetId:text.optional(),applicationActive:z.boolean().optional(),localCommit:sha.optional(),localTree:sha.optional(),protectedResourcesDigest:hash.optional()}).strict().superRefine((e,c)=>{if(e.deploymentIds?.length===0&&!(e.composeRecovery?.kind==='queue_absent'&&e.absenceVerified===true))c.addIssue({code:'custom',message:'empty_deployment_ids_outside_recovery'});});
const closeFailedReleaseSchema=z.object({requestId:id,expectedVersion:hash,failedOperationId:id,consentDigest:hash,evidence:evidenceSchema}).strict();
const authorizeReconciliationSchema=z.object({requestId:id,expectedVersion:hash,credentialId:id,credentialVersion:z.number().int().positive(),operationIds:z.array(id).min(1).max(30),expiresAt:releaseExpirySchema}).strict();
const publishedGitBasisSchema=z.object({schemaVersion:z.literal('roost-release-published-git-v1'),releaseId:id,expectedVersion:hash,
 closureId:id,closureDigest:hash,pushOperationId:id,prOperationId:id,reviewOperationId:id,mergeOperationId:id,
 baselineDeploymentIds:z.array(deploymentIdentity).min(1).max(6)}).strict();
const releaseHasPublishedGit=s=>{
 const parsed=publishedGitBasisSchema.safeParse(s?.publishedGitBasis), restart=baselineRestartSchema.safeParse(s?.baselineRestart);
 if(!parsed.success||!restart.success||s.predecessor||s.successorBasis||!isGitSetManifest(s.manifest)||!manifestSchema.safeParse(s.manifest).success)return false;
 const b=parsed.data,r=restart.data,rows=b.baselineDeploymentIds,targets=s.manifest.deployment.targets;
 return b.releaseId===r.releaseId&&b.expectedVersion===r.expectedVersion&&b.closureId===r.closureId
  &&rows.length===targets.length&&new Set(rows.map(x=>x.targetId)).size===rows.length&&new Set(rows.map(x=>x.deploymentId)).size===rows.length
  &&targets.every(t=>rows.some(x=>x.targetId===t.targetId));
};
// A fresh baseline may add protection for exactly the images attested by its
// immutable closure. Preserve the original footprint and its order verbatim.
const releaseRestartProtectedResourceIds=(manifest,evidence)=>{
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
module.exports={composeRecoverySchema,composeRecoveryEvidenceError,composeManifestObject,isComposeManifest,isReleaseSetManifest,sourceArtifactDigest,composeEvidenceError,manifestSchema,createReleaseSchema,intentSchema,outcomeSchema,operations,releaseDigest,retainsApplication,applicationManifestObject,refineApplicationManifest,gitSetManifestObject,isGitSetManifest,gitSetArtifactDigest,releaseExpirySchema,releaseSuccessorBasisSchema,releaseHasSuccessor,releaseRollbackImageFailureValid,baselineRestartSchema,closeFailedReleaseSchema,authorizeReconciliationSchema,publishedGitBasisSchema,releaseHasPublishedGitBasis:releaseHasPublishedGit,releaseRestartProtectedResourceIds};
