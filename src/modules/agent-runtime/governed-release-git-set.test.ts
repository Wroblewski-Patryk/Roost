import test from "node:test";
import assert from "node:assert/strict";
import { releaseDigest, releaseManifestSchema, releaseOutcomeError, releaseIntentError, releaseGitSetArtifactDigest }
 from "./governed-release-contract";

const sha=(s:string)=>s.repeat(64),git=(s:string)=>s.repeat(40),image=(s:string)=>`sha256:${sha(s)}`;
function fixture(){
 const s:any={commit:git("a"),candidateTree:git("b"),baseCommit:git("c"),baseTree:git("d")};
 const targets=["api","web"].map((targetId,index)=>({targetId,name:targetId,dockerfile:`/apps/${targetId}/Dockerfile`,
  configDigest:sha(String(index+1)),baseline:{commit:git(index?"e":"c"),tree:git(index?"f":"d"),
   imageDigest:image(index?"3":"4"),configDigest:sha(String(index+1))}}));
 const aggregate=releaseDigest(targets.map(t=>({targetId:t.targetId,configDigest:t.configDigest})));
 const old={commit:s.baseCommit,artifactSetDigest:"",configDigest:aggregate,schemaDigest:sha("5")};
 const m:any={schemaVersion:"roost-release-manifest-v2",purpose:"application_release",
  repository:{url:"https://github.com/example/pilot",defaultBranch:"main",canonicalDir:"C:\\Pilot",candidateBranch:"codex/pilot"},
  deployment:{provider:"coolify_git_set",targetId:"api",url:"https://pilot.example.test",controllerUrl:"https://controller.example.test",
   publicOrigins:["https://pilot.example.test"],targets,artifactSetDigest:"",configDigest:aggregate,schemaDigest:sha("5")},
  services:[{name:"api",healthUrl:"https://pilot.example.test/health",expectedStatus:200}],
  baseline:{...old,healthDigest:sha("6"),dataDigest:sha("7"),observedAt:"2026-10-02T12:00:00.000Z"},
  rollback:{...old,compatibleSchemaDigests:[sha("5")]},observation:{seconds:2,intervalSeconds:1,maxFailures:0},
  backup:{digest:sha("8"),restoreDigest:sha("8"),bytes:10,capturedAt:"2026-10-02T12:00:00.000Z",restoreVerifiedAt:"2026-10-02T12:00:00.000Z"},
  cleanup:{repositoryUrl:"https://github.com/example/pilot",canonicalDir:"C:\\Pilot",coolifyTargetId:"api",ownedResourceIds:[],
   archiveRepository:false,protectedResourceIds:["api","web"]}};
 s.manifest=m;m.deployment.artifactSetDigest=releaseGitSetArtifactDigest(m,s);
 m.baseline.artifactSetDigest=m.rollback.artifactSetDigest=releaseGitSetArtifactDigest(m,s,true);
 const evidence=(rollback=false,targetId:string|null="api")=>{
  const rows=targets.filter(t=>targetId===null||t.targetId===targetId).map(t=>({targetId:t.targetId,commit:rollback?t.baseline.commit:s.commit,
   tree:rollback?t.baseline.tree:s.candidateTree,imageDigest:rollback?t.baseline.imageDigest:image("9"),
   configDigest:t.configDigest,schemaDigest:sha("5"),healthy:true,deploymentId:`deploy-${t.targetId}`}));
  return {deployedCommit:rollback?m.rollback.commit:s.commit,deployedTree:rollback?s.baseTree:s.candidateTree,
   artifactSetDigest:rollback?m.rollback.artifactSetDigest:m.deployment.artifactSetDigest,
   deployedTargets:rows,deploymentIds:rows.map(r=>({targetId:r.targetId,deploymentId:r.deploymentId})),
   deployedSetDigest:releaseDigest(rows.map(({healthy,deploymentId,...r})=>r)),configDigest:aggregate,schemaDigest:sha("5"),
   healthDigest:sha("6"),dataDigest:sha("7"),healthy:true,observationSeconds:2};
 };
 return {s,m,release:{snapshot:s,manifest_digest:releaseDigest(m)},evidence};
}
test("source test: Git set manifest and exact runtime set permit candidate and mixed baseline release evidence",()=>{
 const f=fixture();assert.equal(releaseManifestSchema.safeParse(f.m).success,true);
 assert.equal(releaseOutcomeError(f.release,{operation:"deploy",intent:{parameters:{targetId:"api"}}},{status:"succeeded",evidence:f.evidence()}),null);
 assert.equal(releaseOutcomeError(f.release,{operation:"rollback",intent:{parameters:{targetId:"web"}}},{status:"succeeded",evidence:f.evidence(true,"web")}),null);
});
test("source test: source configuration evidence needs no not-yet-built image",()=>{
 const f=fixture(),e:any={deployedCommit:f.s.commit,artifactSetDigest:f.m.deployment.artifactSetDigest,
  configDigest:f.m.deployment.configDigest,schemaDigest:f.m.deployment.schemaDigest};
 assert.equal(releaseOutcomeError(f.release,{operation:"deploy_config"},{status:"succeeded",evidence:e}),null);
 for(const change of [{imageDigest:image("9")},{artifactSetDigest:sha("a")},{deployedTargets:[]}])
  assert.equal(releaseOutcomeError(f.release,{operation:"deploy_config"},{status:"succeeded",evidence:{...e,...change}}),"release_config_identity_mismatch");
});
for(const [name,modify] of [
 ["missing target",(e:any)=>e.deployedTargets.pop()],
 ["duplicate target",(e:any)=>e.deployedTargets[1]={...e.deployedTargets[0]}],
 ["unrelated commit",(e:any)=>e.deployedTargets[0].commit=git("f")],
 ["unrelated tree",(e:any)=>e.deployedTargets[0].tree=git("f")],
 ["config",(e:any)=>e.deployedTargets[0].configDigest=sha("f")],
 ["schema",(e:any)=>e.deployedTargets[0].schemaDigest=sha("f")],
 ["missing image",(e:any)=>delete e.deployedTargets[0].imageDigest],
 ["source digest",(e:any)=>e.artifactSetDigest=sha("f")],
 ["runtime digest",(e:any)=>e.deployedSetDigest=sha("f")],
 ["queue identity",(e:any)=>e.deploymentIds[0].deploymentId="unrelated"],
 ["missing queue",(e:any)=>e.deploymentIds.pop()],
 ["duplicate queue",(e:any)=>e.deploymentIds.push({...e.deploymentIds[0]})],
 ["false top image",(e:any)=>e.imageDigest=image("9")],
 ["false top deployment",(e:any)=>e.deploymentId="single"],
 ["unhealthy target",(e:any)=>e.deployedTargets[0].healthy=false],
 ["business data",(e:any)=>e.dataDigest=sha("f")]
] as [string,(e:any)=>void][])test(`source test: rejects tampered ${name}`,()=>{
 const f=fixture(),e=f.evidence();modify(e);
 assert.equal(releaseOutcomeError(f.release,{operation:"deploy",intent:{parameters:{targetId:"api"}}},{status:"succeeded",evidence:e}),"release_deployment_unproven");
});
test("source test: rollback cannot substitute uniform repository base for mixed per-target baseline",()=>{
 const f=fixture(),e=f.evidence(true,"web");e.deployedTargets[0].commit=f.s.baseCommit;
 assert.equal(releaseOutcomeError(f.release,{operation:"rollback",intent:{parameters:{targetId:"web"}}},{status:"succeeded",evidence:e}),"release_deployment_unproven");
});
test("source test: failed release attribution requires the exact complete deployed set",()=>{
 const f=fixture(),e=f.evidence();e.healthy=false;e.deployedTargets[0].healthy=false;
 assert.equal(releaseOutcomeError(f.release,{operation:"deploy",intent:{parameters:{targetId:"api"}}},{status:"failed",evidence:e}),null);
 e.deployedTargets[0].commit=f.s.baseCommit;
 assert.equal(releaseOutcomeError(f.release,{operation:"deploy",intent:{parameters:{targetId:"api"}}},{status:"failed",evidence:e}),"release_failure_not_attributed");
});
test("source test: observation cannot replace queue identities or omit required interval",()=>{
 const f=fixture(),e=f.evidence(false,null);e.observationSeconds=1;
 const journal=["api","web"].map(targetId=>({operation:"deploy",outcome:{status:"succeeded",evidence:f.evidence(false,targetId)}}));
 assert.equal(releaseOutcomeError(f.release,{operation:"observe",intent:{parameters:{mode:"candidate"}}},{status:"succeeded",evidence:e},journal),"release_observation_incomplete");
});
test("source test: durable source intent binds artifact digest and prohibits v1 image substitution",()=>{
 const f=fixture(),input:any={operation:"deploy",manifestDigest:f.release.manifest_digest,commit:f.s.commit,baseCommit:f.s.baseCommit,
  observed:{commit:f.s.commit,baseCommit:f.s.commit,baseTree:f.s.candidateTree,manifestDigest:f.release.manifest_digest},
  parameters:{targetId:"api",commit:f.s.commit,artifactSetDigest:f.m.deployment.artifactSetDigest,configDigest:f.m.deployment.configDigest,schemaDigest:f.m.deployment.schemaDigest}};
 const journal=[{operation:"merge",outcome:{status:"succeeded"}},{operation:"deploy_config",outcome:{status:"succeeded"}}];
 assert.equal(releaseIntentError(f.release,input,journal),null);
 assert.equal(releaseIntentError(f.release,{...input,parameters:{...input.parameters,imageDigest:image("9")}},journal),"release_parameter_scope_invalid");
});
test("source test: full observation is tied to every previously accepted queue",()=>{
 const f=fixture(),e=f.evidence(false,null),op={operation:"observe",intent:{parameters:{mode:"candidate"}}};
 const journal=["api","web"].map(targetId=>({operation:"deploy",outcome:{status:"succeeded",evidence:f.evidence(false,targetId)}}));
 assert.equal(releaseOutcomeError(f.release,op,{status:"succeeded",evidence:e},journal),null);
 e.deploymentIds[0].deploymentId=e.deployedTargets[0].deploymentId="unrelated";
 assert.equal(releaseOutcomeError(f.release,op,{status:"succeeded",evidence:e},journal),"release_deployment_unproven");
});
test("source test: distinct target intent is allowed only after prior target is durably resolved",()=>{
 const f=fixture(),input:any={operation:"deploy",manifestDigest:f.release.manifest_digest,commit:f.s.commit,baseCommit:f.s.baseCommit,
  observed:{commit:f.s.commit,baseCommit:f.s.commit,baseTree:f.s.candidateTree,manifestDigest:f.release.manifest_digest},
  parameters:{targetId:"web",commit:f.s.commit,artifactSetDigest:f.m.deployment.artifactSetDigest,configDigest:f.m.deployment.configDigest,schemaDigest:f.m.deployment.schemaDigest}};
 const journal:any[]=[{operation:"merge",outcome:{status:"succeeded"}},{operation:"deploy_config",outcome:{status:"succeeded"}}];
 assert.equal(releaseIntentError(f.release,input,journal),"release_progression_invalid");
 const first={operation:"deploy",intent:{parameters:{targetId:"api"}},outcome:{status:"uncertain"}};
 journal.push(first);assert.equal(releaseIntentError(f.release,input,journal),"release_operation_unresolved");
 first.outcome.status="succeeded";assert.equal(releaseIntentError(f.release,input,journal),null);
 assert.equal(releaseIntentError(f.release,{...input,parameters:{...input.parameters,targetId:"api"}},journal),"release_operation_already_succeeded");
 const observe={...input,operation:"observe",parameters:{mode:"candidate"}};
 assert.equal(releaseIntentError(f.release,observe,journal),"release_progression_invalid");
});
