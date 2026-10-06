import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createReleaseSchema,releaseManifestSchema,releaseOutcomeError,releaseIntentError,releaseApprovalError,
 releaseWindowError,releaseDigest,releaseIsCompose,releaseIsGitSet,releaseIsSet,releaseSourceArtifactDigest,releaseTargetMetadataMatches} from './governed-release-contract';
const {fixture,hash,git,image}=require(path.resolve(__dirname,'../../../scripts/fixtures/release-compose-contract.cjs'));
const deploy={operation:'deploy',intent:{parameters:{targetId:'composeapp'}}};
test('ordinary Compose publication intent uses exact Git main independently from rollback source',()=>{
 const f=fixture();f.s.gitPublicationBase={commit:git('e'),tree:git('f')};
 const input:any={operation:'push',manifestDigest:f.release.manifest_digest,commit:f.s.commit,baseCommit:f.s.baseCommit,
  observed:{commit:f.s.commit,baseCommit:git('e'),baseTree:git('f'),manifestDigest:f.release.manifest_digest},parameters:{branch:f.m.repository.candidateBranch}};
 assert.equal(releaseIntentError(f.release,input,[]),null);
 assert.equal(releaseIntentError(f.release,{...input,observed:{...input.observed,baseTree:git('1')}},[]),'release_base_changed');
 assert.equal(releaseIntentError(f.release,{...input,observed:{...input.observed,baseCommit:f.s.baseCommit,baseTree:f.s.baseTree}},[]),'release_base_changed');
 assert.equal(f.m.baseline.commit,f.s.baseCommit);
});
test('all ordinary Git success and absence evidence bind publication base, while postmerge uses candidate',()=>{
 const f=fixture();f.s.gitPublicationBase={commit:git('e'),tree:git('f')};
 for(const operation of ['push','pr','review','merge']){
  const e:any={remoteCommit:f.s.commit,remoteTree:f.s.candidateTree,remoteBase:git('e'),remoteBaseTree:git('f'),pullRequestNumber:3,prHeadCommit:f.s.commit,reviewApproved:true,prMerged:true,mergedCommit:f.s.commit};
  assert.equal(releaseOutcomeError(f.release,{operation},{status:'succeeded',evidence:e}),null);
  assert.equal(releaseOutcomeError(f.release,{operation},{status:'succeeded',evidence:{...e,remoteBaseTree:git('1')}}),'release_git_publication_base_changed');
  const absent={remoteCommit:git('e'),remoteTree:git('f'),absenceVerified:true};
  assert.equal(releaseOutcomeError(f.release,{operation},{status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:absent}),null);
  assert.equal(releaseOutcomeError(f.release,{operation},{status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:{...absent,remoteTree:f.s.baseTree}}),'release_absence_unproven');
 }
 const input:any={operation:'deploy_config',manifestDigest:f.release.manifest_digest,commit:f.s.commit,baseCommit:f.s.baseCommit,
  observed:{commit:f.s.commit,baseCommit:f.s.commit,baseTree:f.s.candidateTree,manifestDigest:f.release.manifest_digest},
  parameters:{commit:f.s.commit,artifactSetDigest:f.m.deployment.artifactSetDigest,configDigest:f.m.deployment.configDigest,schemaDigest:f.m.deployment.schemaDigest}};
 const j=['push','pr','review','merge'].map(operation=>({operation,outcome:{status:'succeeded'}}));
 assert.equal(releaseIntentError(f.release,input,j),null);
 assert.equal(releaseIntentError(f.release,{...input,observed:{...input.observed,baseCommit:git('e'),baseTree:git('f')}},j),'release_base_changed');
});
test('application metadata selects its own Compose path/target/origin and cannot borrow a Dockerfile target',()=>{
 const f=fixture(),metadata={releaseTargets:[{targetId:'composeapp',composePath:f.target.composePath}],releasePublicOrigins:f.m.deployment.publicOrigins};
 assert.equal(releaseTargetMetadataMatches(metadata,f.m),true);
 for(const change of [{releaseTargets:[{targetId:'other',composePath:f.target.composePath}]},
  {releaseTargets:[{targetId:'composeapp',composePath:'/other.yml'}]},
  {releaseTargets:[{targetId:'composeapp',dockerfile:'/Dockerfile'}]},
  {releasePublicOrigins:['https://other.example.test']}])assert.equal(releaseTargetMetadataMatches({...metadata,...change},f.m),false);
});

test('Compose uses complete fixed-reader qualification through existing durable release outcome path',()=>{
 const f=fixture();assert.equal(releaseManifestSchema.safeParse(f.m).success,true);
 assert.equal(releaseIsCompose(f.m),true);assert.equal(releaseIsGitSet(f.m),false);assert.equal(releaseIsSet(f.m),true);
 assert.equal(releaseOutcomeError(f.release,deploy,{status:'succeeded',evidence:f.evidence()}),null);
 assert.equal(releaseOutcomeError(f.release,{operation:'rollback',intent:deploy.intent},{status:'succeeded',evidence:f.evidence(true)}),null);
});
test('accepted observation binds full interval and exact previously accepted queue',()=>{
 const f=fixture(),e=f.evidence(),operation={operation:'observe',intent:{parameters:{mode:'candidate'}}};
 const journal=[{...deploy,outcome:{status:'succeeded',evidence:f.evidence()}}];
 assert.equal(releaseOutcomeError(f.release,operation,{status:'succeeded',evidence:e},journal),null);
 e.observationSeconds=119;assert.equal(releaseOutcomeError(f.release,operation,{status:'succeeded',evidence:e},journal),'release_observation_incomplete');
 e.observationSeconds=120;e.deploymentIds[0].deploymentId=e.composeTargets[0].binding.deploymentId=e.composeTargets[0].binding.queue.deploymentId=e.composeTargets[0].runtime.deploymentId='anotherqueue';
 for(const r of e.composeTargets[0].runtime.services)if(r.role!=='database')r.deploymentId='anotherqueue';
 for(const r of e.composeTargets[0].binding.images)r.deploymentId='anotherqueue';
 assert.equal(releaseOutcomeError(f.release,operation,{status:'succeeded',evidence:e},journal),'release_deployment_unproven');
});
test('phase-specific rollback configuration is authorized explicitly before immutable deployment',()=>{
 const f=fixture(),input:any={operation:'rollback_config',manifestDigest:f.release.manifest_digest,commit:f.s.commit,baseCommit:f.s.baseCommit,
  observed:{commit:f.s.commit,baseCommit:f.s.commit,baseTree:f.s.candidateTree,manifestDigest:f.release.manifest_digest},
  parameters:{commit:f.m.rollback.commit,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest}};
 const journal=[{operation:'merge',outcome:{status:'succeeded'}},{...deploy,outcome:{status:'failed',evidence:{}}}];
 assert.equal(releaseIntentError(f.release,input,journal),null);
 input.parameters.configDigest=f.m.baseline.configDigest;assert.equal(releaseIntentError(f.release,input,journal),'release_rollback_artifact_invalid');
 const e={observedAt:f.evidence().observedAt,deployedCommit:f.m.rollback.commit,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest};
 assert.equal(releaseOutcomeError(f.release,{operation:'rollback_config'},{status:'succeeded',evidence:e}),null);
 assert.equal(releaseOutcomeError(f.release,{operation:'rollback_config'},{status:'succeeded',evidence:{...e,composeTargets:f.evidence(true).composeTargets}}),'release_config_identity_mismatch');
});
test('uncertain deployment is reconciled against actual complete baseline before permitting retry',()=>{
 const f=fixture();assert.equal(releaseOutcomeError(f.release,deploy,{status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:{...f.evidence('baseline'),absenceVerified:true}}),null);
 const e=f.evidence(true);e.absenceVerified=true;
 assert.equal(releaseOutcomeError(f.release,deploy,{status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:e}),'release_absence_unproven');
});
test('attributed running unhealthy services cannot qualify a success or substitute source during failure',()=>{
 const f=fixture(),e=f.evidence();e.healthy=false;e.composeTargets[0].runtime.services[0].health='unhealthy';
 assert.equal(releaseOutcomeError(f.release,deploy,{status:'failed',evidence:e}),null);
 assert.equal(releaseOutcomeError(f.release,deploy,{status:'succeeded',evidence:e}),'release_deployment_unproven');
 e.composeTargets[0].runtime.services[0].commit=git('f');
 assert.equal(releaseOutcomeError(f.release,deploy,{status:'failed',evidence:e}),'release_failure_not_attributed');
});
test('permanent Compose retains protected resources and forbids archive/local deletion',()=>{
 const f=fixture();for(const operation of ['archive_repository','cleanup_local'])assert.equal(releaseOutcomeError(f.release,{operation},{status:'succeeded',evidence:{}}),'release_retention_policy_violation');
 assert.equal(releaseOutcomeError(f.release,{operation:'cleanup_resource',intent:{parameters:{resourceId:'composeapp'}}},{status:'succeeded',evidence:{}}),'release_cleanup_scope_invalid');
});
test('create binds candidate/tree/config and owner review basis without changing old contracts',()=>{
 const f=fixture(),uuid='12345678-1234-4234-8234-123456789abc';
 const input:any={requestId:uuid,taskId:uuid,applicationId:uuid,hostId:uuid,releaseExecutionId:uuid,releaserAgentId:uuid,releaserCredentialId:uuid,
  credentialVersion:1,reviewId:uuid,materialVersion:hash('1'),commit:f.s.commit,candidateTree:f.s.candidateTree,baseCommit:f.s.baseCommit,
  baseTree:f.s.baseTree,releaserRevision:'2026-10-04T12:00:00.000Z',expiresAt:'2026-10-04T12:30:00.000Z',manifest:f.m,manifestDigest:releaseDigest(f.m)};
 assert.equal(createReleaseSchema.safeParse(input).success,true);
 assert.equal(createReleaseSchema.safeParse({...input,commit:git('f')}).success,false);
 assert.equal(createReleaseSchema.safeParse({...input,candidateTree:git('f')}).success,false);
 assert.equal(createReleaseSchema.safeParse({...input,baseTree:git('f')}).success,false);
 assert.equal(releaseSourceArtifactDigest(f.m,f.s),f.m.deployment.artifactSetDigest);
 const review:any={current:true,roleIssues:[],materialVersion:input.materialVersion,approvalCommit:input.commit,
  decision:{id:uuid,decision:'approve',materialVersion:input.materialVersion,evidence:{reviewedCommit:input.commit},verifierId:'verifier'},
  execution:{applicationId:uuid},authorities:{releaser:{principal:{kind:'agent',id:uuid}}},contract:{assignment:{agentId:'coder'},taskRoles:{releaser:{revision:input.releaserRevision}}}};
 assert.equal(releaseApprovalError(review,input),null);review.current=false;assert.equal(releaseApprovalError(review,input),'release_review_stale');
 assert.equal(releaseWindowError(input,new Date('2026-10-04T13:00:00.000Z'),new Date('2026-10-04T12:05:00.000Z')),null);
 assert.equal(releaseWindowError(input,new Date('2026-10-04T13:00:00.000Z'),new Date('2026-10-05T12:05:00.000Z')),'release_window_invalid');
});
