"use strict";
const { z } = require("zod");
const { createHash } = require("node:crypto");
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
const manifestSchema=z.union([certificationManifestSchema,applicationManifestSchema,gitSetManifestSchema]);
const retainsApplication=m=>m?.schemaVersion==="roost-release-manifest-v2"&&m?.purpose==="application_release"&&m?.cleanup?.archiveRepository===false;
const releaseExpirySchema=z.string().datetime();
const predecessorSchema=z.object({releaseId:id,expectedVersion:hash}).strict();
const createReleaseSchema=z.object({requestId:id,taskId:id,applicationId:id,hostId:id,releaseExecutionId:id,releaserAgentId:id,releaserCredentialId:id,credentialVersion:z.number().int().positive(),reviewId:id,materialVersion:hash,commit:sha,candidateTree:sha,baseCommit:sha,baseTree:sha,releaserRevision:z.string().datetime(),expiresAt:releaseExpirySchema,manifest:manifestSchema,manifestDigest:hash,predecessor:predecessorSchema.optional()}).strict().superRefine((s,c)=>{
 if(isGitSetManifest(s.manifest)&&(s.manifest.deployment.artifactSetDigest!==gitSetArtifactDigest(s.manifest,s)||s.manifest.baseline.commit!==s.baseCommit))c.addIssue({code:'custom',message:'release_source_set_mismatch'});
 if(s.predecessor&&!isGitSetManifest(s.manifest))c.addIssue({code:'custom',message:'release_successor_scope_invalid'});
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
 if(!parsed.success||!isGitSetManifest(s?.manifest)||!manifestSchema.safeParse(s.manifest).success||parsed.data.releaseId!==s.predecessor?.releaseId
  ||parsed.data.expectedVersion!==s.predecessor?.expectedVersion)return false;
 const rows=parsed.data.rollbackDeploymentIds,targets=s.manifest.deployment.targets;
 return rows.length===targets.length&&new Set(rows.map(r=>r.targetId)).size===rows.length
  &&new Set(rows.map(r=>r.deploymentId)).size===rows.length&&targets.every(t=>rows.some(r=>r.targetId===t.targetId));
};
const deployedTarget=z.object({targetId:text,commit:sha,tree:sha,imageDigest:image,configDigest:hash,schemaDigest:hash,healthy:z.boolean(),deploymentId:text.optional()}).strict();
const evidenceSchema=z.object({observedAt:z.string().datetime(),failureKind:z.literal('rollback_image_mismatch').optional(),remoteCommit:sha.optional(),remoteBase:sha.optional(),remoteTree:sha.optional(),pullRequestNumber:z.number().int().positive().optional(),prHeadCommit:sha.optional(),prMerged:z.boolean().optional(),reviewApproved:z.boolean().optional(),mergedCommit:sha.optional(),deploymentId:text.optional(),deploymentIds:z.array(deploymentIdentity).min(1).max(6).optional(),deployedTargets:z.array(deployedTarget).min(1).max(6).optional(),artifactSetDigest:hash.optional(),deployedSetDigest:hash.optional(),deployedCommit:sha.optional(),deployedTree:sha.optional(),imageDigest:image.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),healthDigest:hash.optional(),dataDigest:hash.optional(),backupDigest:hash.optional(),restoreDigest:hash.optional(),healthy:z.boolean().optional(),observationSeconds:z.number().int().nonnegative().max(3600).optional(),resourceIds:z.array(text).max(30).optional(),resourcePresent:z.boolean().optional(),repositoryArchived:z.boolean().optional(),localAbsent:z.boolean().optional(),absenceVerified:z.boolean().optional(),retentionVerified:z.boolean().optional(),repositoryUrl:url.optional(),canonicalDir:dir.optional(),targetId:text.optional(),applicationActive:z.boolean().optional(),localCommit:sha.optional(),localTree:sha.optional(),protectedResourcesDigest:hash.optional()}).strict();
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
module.exports={manifestSchema,createReleaseSchema,intentSchema,outcomeSchema,operations,releaseDigest,retainsApplication,applicationManifestObject,refineApplicationManifest,gitSetManifestObject,isGitSetManifest,gitSetArtifactDigest,releaseExpirySchema,releaseSuccessorBasisSchema,releaseHasSuccessor,releaseRollbackImageFailureValid};
