"use strict";
const { z } = require("zod");
const { createHash } = require("node:crypto");
const id=z.string().uuid(), sha=z.string().regex(/^[a-f0-9]{40}$/), hash=z.string().regex(/^[a-f0-9]{64}$/);
const text=z.string().trim().min(1).max(1000).refine(v=>!/(?:cc_v1_[A-Za-z0-9_-]{24,}|Bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*\S+)/i.test(v),"Credentials prohibited");
const url=z.string().url().max(2000).refine(v=>{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash;},"HTTPS URL without credentials required");
const dir=text.refine(v=>/^[A-Za-z]:[\\/]/.test(v)&&!v.split(/[\\/]/).includes(".."),"Canonical Windows directory required");
const image=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const artifact=z.object({commit:sha,imageDigest:image,configDigest:hash,schemaDigest:hash}).strict();
const manifestSchema=z.object({schemaVersion:z.literal("roost-release-manifest-v1"),
 repository:z.object({url,defaultBranch:text,canonicalDir:dir,candidateBranch:text}).strict(),
 deployment:z.object({provider:z.literal("coolify"),targetId:text,controllerUrl:url,url,imageDigest:image,configDigest:hash,schemaDigest:hash}).strict(),
 services:z.array(z.object({name:text,healthUrl:url,expectedStatus:z.number().int().min(200).max(299)}).strict()).min(1).max(12),
 baseline:artifact.extend({healthDigest:hash,dataDigest:hash,observedAt:z.string().datetime()}).strict(),
 observation:z.object({seconds:z.number().int().min(1).max(1800),intervalSeconds:z.number().int().min(1).max(300),maxFailures:z.number().int().min(0).max(3)}).strict(),
 backup:z.object({digest:hash,bytes:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),capturedAt:z.string().datetime(),restoreVerifiedAt:z.string().datetime(),restoreDigest:hash}).strict(),
 rollback:artifact.extend({compatibleSchemaDigests:z.array(hash).min(1).max(8)}).strict(),
 cleanup:z.object({repositoryUrl:url,canonicalDir:dir,coolifyTargetId:text,ownedResourceIds:z.array(text).max(30),archiveRepository:z.literal(true)}).strict()
}).strict().superRefine((m,c)=>{
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
});
const createReleaseSchema=z.object({requestId:id,taskId:id,applicationId:id,hostId:id,releaseExecutionId:id,releaserAgentId:id,releaserCredentialId:id,credentialVersion:z.number().int().positive(),reviewId:id,materialVersion:hash,commit:sha,candidateTree:sha,baseCommit:sha,baseTree:sha,releaserRevision:z.string().datetime(),expiresAt:z.string().datetime(),manifest:manifestSchema,manifestDigest:hash}).strict();
const operations=["push","pr","review","merge","deploy_config","deploy","observe","rollback_config","rollback","cleanup_resource","archive_repository","cleanup_local","cleanup"];
const parametersSchema=z.object({branch:text.optional(),pullRequestNumber:z.number().int().positive().optional(),deploymentId:text.optional(),commit:sha.optional(),imageDigest:image.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),mode:z.enum(["candidate","rollback"]).optional(),faultInjection:z.boolean().optional(),resourceId:text.optional(),resourceIds:z.array(text).max(30).optional()}).strict();
const intentSchema=z.object({requestId:id,operation:z.enum(operations),manifestDigest:hash,commit:sha,baseCommit:sha,expectedVersion:hash,observed:z.object({commit:sha,baseCommit:sha,baseTree:sha,manifestDigest:hash}).strict(),parameters:parametersSchema}).strict().superRefine((v,c)=>{
 const allowed={push:["branch"],pr:[],review:["pullRequestNumber"],merge:["pullRequestNumber"],deploy_config:["commit","imageDigest","configDigest","schemaDigest"],deploy:["commit","imageDigest","configDigest","schemaDigest","faultInjection"],observe:["mode"],rollback_config:["commit","imageDigest","configDigest","schemaDigest"],rollback:["commit","imageDigest","configDigest","schemaDigest"],cleanup_resource:["resourceId"],archive_repository:[],cleanup_local:[],cleanup:["resourceIds"]}[v.operation];
 if(Object.keys(v.parameters).some(k=>!allowed.includes(k)))c.addIssue({code:"custom",message:"operation_parameters_outside_scope"});
});
const evidenceSchema=z.object({observedAt:z.string().datetime(),remoteCommit:sha.optional(),remoteBase:sha.optional(),remoteTree:sha.optional(),pullRequestNumber:z.number().int().positive().optional(),prHeadCommit:sha.optional(),prMerged:z.boolean().optional(),reviewApproved:z.boolean().optional(),mergedCommit:sha.optional(),deploymentId:text.optional(),deployedCommit:sha.optional(),deployedTree:sha.optional(),imageDigest:image.optional(),configDigest:hash.optional(),schemaDigest:hash.optional(),healthDigest:hash.optional(),dataDigest:hash.optional(),backupDigest:hash.optional(),restoreDigest:hash.optional(),healthy:z.boolean().optional(),observationSeconds:z.number().int().nonnegative().max(3600).optional(),resourceIds:z.array(text).max(30).optional(),resourcePresent:z.boolean().optional(),repositoryArchived:z.boolean().optional(),localAbsent:z.boolean().optional(),absenceVerified:z.boolean().optional()}).strict();
const outcomeSchema=z.object({requestId:id,status:z.enum(["succeeded","failed","uncertain","reconciled"]),reconciledStatus:z.enum(["succeeded","absent","failed"]).optional(),observationOnly:z.boolean(),evidence:evidenceSchema}).strict().superRefine((v,c)=>{if(v.status==="reconciled"?(!v.observationOnly||!v.reconciledStatus):v.reconciledStatus!==undefined)c.addIssue({code:"custom",message:"reconciliation_shape_invalid"});});
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const releaseDigest=v=>createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
module.exports={manifestSchema,createReleaseSchema,intentSchema,outcomeSchema,operations,releaseDigest};
