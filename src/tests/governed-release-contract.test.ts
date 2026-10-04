import test from "node:test";
import assert from "node:assert/strict";
import { releaseManifestSchema, releaseDigest, releaseIntentSchema, releaseOutcomeSchema, releaseApprovalError, releaseWindowError, releaseIntentError, releaseOutcomeError, releaseCandidateNativeError, releaseCanonicalDirectoryMatches } from "../modules/agent-runtime/governed-release-contract";
const id="00000000-0000-4000-8000-000000000001",commit="a".repeat(40),base="b".repeat(40),tree="c".repeat(40),baseTree="d".repeat(40),hash="e".repeat(64),at="2026-10-01T12:00:00.000Z";
const prior={commit:base,imageDigest:`sha256:${"1".repeat(64)}`,configDigest:hash,schemaDigest:hash};
export const releaseFixture={schemaVersion:"roost-release-manifest-v1",repository:{url:"https://github.com/example/certification",defaultBranch:"main",canonicalDir:"C:\\Certification\\one",candidateBranch:"codex/release"},deployment:{provider:"coolify",targetId:"fixture-target",controllerUrl:"https://controller.example.test",url:"https://certification.example.test",imageDigest:`sha256:${"2".repeat(64)}`,configDigest:hash,schemaDigest:hash},services:[{name:"api",healthUrl:"https://certification.example.test/health",expectedStatus:200}],baseline:{...prior,healthDigest:hash,dataDigest:hash,observedAt:at},observation:{seconds:30,intervalSeconds:5,maxFailures:0},backup:{digest:hash,bytes:123,capturedAt:at,restoreVerifiedAt:at,restoreDigest:hash},rollback:{...prior,compatibleSchemaDigests:[hash]},cleanup:{repositoryUrl:"https://github.com/example/certification",canonicalDir:"C:\\Certification\\one",coolifyTargetId:"fixture-target",ownedResourceIds:["fixture-target"],archiveRepository:true}};
const snapshot={commit,candidateTree:tree,baseCommit:base,baseTree,manifest:releaseFixture};
const release={snapshot,manifest_digest:releaseDigest(releaseFixture)};
const input=(op:string,parameters:any={})=>({requestId:id,operation:op,manifestDigest:release.manifest_digest,commit,baseCommit:base,expectedVersion:hash,observed:{commit,baseCommit:base,baseTree,manifestDigest:release.manifest_digest},parameters});
const complete=(operation:string,extra:any={})=>({operation,intent:input(operation),outcome:{status:"succeeded",evidence:extra}});
test("relative Windows mapping resolves lexically under the explicit same-platform root on any server platform",()=>{
 const metadata={localDirectory:"Nested/Example",localWorkspaceRoot:"C:\\Workspace\\Applications"},before=structuredClone(metadata);
 assert.equal(releaseCanonicalDirectoryMatches(metadata,"c:/workspace/applications/nested/example"),true);
 assert.deepEqual(metadata,before);
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"Example",localWorkspaceRoot:"C:/Workspace/Applications/"},"C:\\Workspace\\Applications\\Example\\"),true);
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"Example",localWorkspaceRoot:"C:\\"},"C:\\Example"),true);
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"example",localWorkspaceRoot:"/"},"/example"),true);
});
test("absolute legacy mappings retain Windows case/separator and exact POSIX semantics",()=>{
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"C:\\Workspace\\Example"},"c:/workspace/example"),true);
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"C:\\Workspace\\Example",localWorkspaceRoot:"D:\\Unrelated"},"C:\\Workspace\\Example"),true);
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"/srv/apps/example"},"/srv/apps/example/"),true);
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"/srv/apps/Example"},"/srv/apps/example"),false);
 assert.equal(releaseCanonicalDirectoryMatches({localDirectory:"example",localWorkspaceRoot:"/srv/apps"},"/srv/apps/example"),true);
});
const directoryRefusals:[string,any,unknown][]=[
 ["missing root",{localDirectory:"Example"},"C:\\Workspace\\Example"],
 ["wrong root",{localDirectory:"Example",localWorkspaceRoot:"D:\\Workspace"},"C:\\Workspace\\Example"],
 ["wrong relative directory",{localDirectory:"Other",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
 ["prefix sibling",{localDirectory:"Example-other",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
 ["parent traversal",{localDirectory:"..\\Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Example"],
 ["dot segment",{localDirectory:".\\Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
 ["nested traversal",{localDirectory:"Nested/../Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
 ["root traversal",{localDirectory:"Example",localWorkspaceRoot:"C:\\Other\\..\\Workspace"},"C:\\Workspace\\Example"],
 ["manifest traversal",{localDirectory:"C:\\Workspace\\Other\\..\\Example"},"C:\\Workspace\\Other\\..\\Example"],
 ["drive-relative",{localDirectory:"C:Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
 ["rooted relative",{localDirectory:"\\Example",localWorkspaceRoot:"C:\\Workspace"},"C:\\Example"],
 ["UNC",{localDirectory:"\\\\server\\share\\Example"},"\\\\server\\share\\Example"],
 ["extended namespace",{localDirectory:"\\\\?\\C:\\Workspace\\Example"},"\\\\?\\C:\\Workspace\\Example"],
 ["device namespace",{localDirectory:"\\\\.\\C:\\Workspace\\Example"},"\\\\.\\C:\\Workspace\\Example"],
 ["reserved device",{localDirectory:"NUL",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\NUL"],
 ["reserved device extension",{localDirectory:"CON.txt",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\CON.txt"],
 ["console input device",{localDirectory:"CONIN$",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\CONIN$"],
 ["superscript device",{localDirectory:"COM¹",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\COM¹"],
 ["alternate data stream",{localDirectory:"Example:stream",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example:stream"],
 ["trailing dot",{localDirectory:"Example.",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example."],
 ["trailing space",{localDirectory:"Example ",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example "],
 ["cross-platform root",{localDirectory:"Example",localWorkspaceRoot:"/srv/apps"},"C:\\Workspace\\Example"],
 ["cross-platform directory",{localDirectory:"C:\\Workspace\\Example"},"/srv/apps/example"],
 ["POSIX backslash ambiguity",{localDirectory:"nested\\example",localWorkspaceRoot:"/srv/apps"},"/srv/apps/nested/example"],
 ["POSIX double-root ambiguity",{localDirectory:"//srv/apps/example"},"//srv/apps/example"],
 ["relative manifest",{localDirectory:"Example",localWorkspaceRoot:"C:\\Workspace"},"Example"],
 ["control character",{localDirectory:"Exam\0ple",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Exam\0ple"],
 ["nonstring directory",{localDirectory:42,localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace\\Example"],
 ["nonstring root",{localDirectory:"Example",localWorkspaceRoot:42},"C:\\Workspace\\Example"],
 ["empty relative",{localDirectory:"",localWorkspaceRoot:"C:\\Workspace"},"C:\\Workspace"],
];
for(const [name,metadata,canonical] of directoryRefusals)test("canonical directory refuses "+name,()=>assert.equal(releaseCanonicalDirectoryMatches(metadata,canonical),false));

test("a legacy completed review without concrete managed coding proof cannot authorize release",()=>{
 assert.equal(releaseCandidateNativeError({id,verification:{}},{}),"release_native_candidate_unproven");
 assert.equal(releaseCandidateNativeError({id,verification:{}},{nativeBoundary:{profile:"inspect-readonly"}}),"release_native_candidate_unproven");
});
test("manifest validates immutable compatible rollback and rejects remote secret or cleanup widening",()=>{
 assert.ok(releaseManifestSchema.safeParse(releaseFixture).success);
 const changes=[{backup:{...releaseFixture.backup,restoreDigest:"f".repeat(64)}},{rollback:{...releaseFixture.rollback,compatibleSchemaDigests:["f".repeat(64)]}},{cleanup:{...releaseFixture.cleanup,canonicalDir:"C:\\Other"}},{services:[{...releaseFixture.services[0],healthUrl:"https://other.example.test/health"}]},{deployment:{...releaseFixture.deployment,controllerUrl:"https://secret:credential@controller.example.test"}}];
 for(const c of changes)assert.equal(releaseManifestSchema.safeParse({...releaseFixture,...c}).success,false);
});
test("approval binds current exact independently approved material and distinct releaser",()=>{
 const i={reviewId:id,materialVersion:hash,commit,applicationId:id,releaserAgentId:"release",releaserRevision:at};
 const s:any={current:true,roleIssues:[],decision:{id,decision:"approve",materialVersion:hash,evidence:{reviewedCommit:commit},verifierId:"verifier"},materialVersion:hash,approvalCommit:commit,execution:{applicationId:id},authorities:{releaser:{principal:{kind:"agent",id:"release"}}},contract:{assignment:{agentId:"coder"},taskRoles:{releaser:{revision:at}}}};
 assert.equal(releaseApprovalError(s,i),null);
 for(const change of [{current:false},{materialVersion:"f".repeat(64)},{approvalCommit:base},{decision:{...s.decision,materialVersion:"f".repeat(64)}},{decision:{...s.decision,evidence:{reviewedCommit:base}}}])assert.equal(releaseApprovalError({...s,...change},i),"release_review_stale");
 assert.equal(releaseApprovalError(s,{...i,releaserAgentId:"coder"}),"release_role_invalid");
 assert.equal(releaseApprovalError(s,{...i,releaserAgentId:"verifier"}),"release_role_invalid");
});
test("authority expires within credential and fresh prerequisite windows",()=>{
 const now=new Date(at),i={manifest:releaseFixture,expiresAt:"2026-10-01T12:30:00.000Z"};
 assert.equal(releaseWindowError(i,new Date("2026-10-01T13:00:00Z"),now),null);
 assert.equal(releaseWindowError({...i,expiresAt:at},new Date("2026-10-01T13:00:00Z"),now),"release_window_invalid");
 assert.equal(releaseWindowError(i,new Date("2026-10-01T12:10:00Z"),now),"release_window_invalid");
 assert.equal(releaseWindowError({...i,manifest:{...releaseFixture,baseline:{...releaseFixture.baseline,observedAt:"2026-09-30T12:00:00Z"}}},new Date("2026-10-01T13:00:00Z"),now),"release_prerequisite_stale");
});
test("changed commit/base/config and uncertain intent deny effects; replay cannot bypass progression",()=>{
 const i=input("push",{branch:"codex/release"});assert.ok(releaseIntentSchema.safeParse(i).success);assert.equal(releaseIntentError(release,i,[]),null);
 assert.equal(releaseIntentError(release,{...i,commit:base},[]),"release_candidate_changed");
 assert.equal(releaseIntentError(release,{...i,manifestDigest:hash},[]),"release_candidate_changed");
 assert.equal(releaseIntentError(release,{...i,observed:{...i.observed,baseCommit:commit}},[]),"release_base_changed");
 assert.equal(releaseIntentError(release,i,[{operation:"push",outcome:null}]),"release_operation_unresolved");
 assert.equal(releaseIntentError(release,i,[{operation:"push",outcome:{status:"uncertain"}}]),"release_operation_unresolved");
 assert.equal(releaseIntentError(release,i,[complete("push")]),"release_operation_already_succeeded");
 assert.equal(releaseIntentError(release,input("deploy",{commit}),[]),"release_progression_invalid");
});
test("merge cannot substitute another commit even if Git tree is identical",()=>{
 const evidence={observedAt:at,remoteCommit:commit,remoteTree:tree,prHeadCommit:commit,pullRequestNumber:1,prMerged:true,mergedCommit:base};
 assert.equal(releaseOutcomeError(release,{operation:"merge"},{status:"succeeded",evidence}),"release_merge_commit_changed");
 assert.equal(releaseOutcomeError(release,{operation:"merge"},{status:"succeeded",evidence:{...evidence,mergedCommit:commit}}),null);
});
test("health proves image configuration schema and data identity; recovery needs observation",()=>{
 const evidence={observedAt:at,deploymentId:"fixture",deployedCommit:base,deployedTree:baseTree,...releaseFixture.rollback,healthy:true,healthDigest:hash,dataDigest:hash};
 assert.equal(releaseOutcomeError(release,{operation:"rollback"},{status:"succeeded",evidence}),null);
 assert.equal(releaseOutcomeError(release,{operation:"rollback"},{status:"succeeded",evidence:{...evidence,dataDigest:"f".repeat(64)}}),"release_deployment_unproven");
 const journal=[complete("push"),complete("pr",{pullRequestNumber:1}),complete("review"),complete("merge"),complete("deploy_config"),complete("deploy"),complete("rollback_config"),complete("rollback")];
 const cleanup=input("cleanup",{resourceIds:releaseFixture.cleanup.ownedResourceIds});cleanup.observed.baseCommit=commit;cleanup.observed.baseTree=tree;
 assert.equal(releaseIntentError(release,cleanup,journal),"release_progression_invalid");
 journal.push({...complete("observe"),intent:input("observe",{mode:"rollback"})},{...complete("cleanup_resource"),intent:input("cleanup_resource",{resourceId:"fixture-target"})},complete("archive_repository"),complete("cleanup_local"));assert.equal(releaseIntentError(release,cleanup,journal),null);
 assert.equal(releaseOutcomeError(release,{operation:"observe",intent:input("observe",{mode:"rollback"})},{status:"succeeded",evidence:{...evidence,observationSeconds:1}}),"release_observation_incomplete");
});
test("uncertain absence needs a read-only reconciliation and exact baseline",()=>{
 assert.equal(releaseOutcomeSchema.safeParse({requestId:id,status:"reconciled",reconciledStatus:"absent",observationOnly:false,evidence:{observedAt:at}}).success,false);
 assert.equal(releaseOutcomeError(release,{operation:"push"},{status:"reconciled",reconciledStatus:"absent",evidence:{observedAt:at,absenceVerified:true,remoteCommit:base,remoteTree:baseTree}}),null);
 assert.equal(releaseOutcomeError(release,{operation:"push"},{status:"reconciled",reconciledStatus:"absent",evidence:{observedAt:at,absenceVerified:true,remoteCommit:commit,remoteTree:tree}}),"release_absence_unproven");
});
test("each effect carries only its own typed parameters and certificate cleanup target",()=>{
 assert.equal(releaseIntentSchema.safeParse(input("push",{branch:"codex/release",resourceId:"other"})).success,false);
 assert.equal(releaseIntentSchema.safeParse(input("deploy",{commit,imageDigest:releaseFixture.deployment.imageDigest,configDigest:hash,schemaDigest:hash,command:"arbitrary shell"})).success,false);
 const journal=[complete("merge"),{...complete("observe"),intent:input("observe",{mode:"candidate"})}];
 const i=input("cleanup_resource",{resourceId:"unowned"});i.observed.baseCommit=commit;i.observed.baseTree=tree;
 assert.equal(releaseIntentError(release,i,journal),"release_cleanup_scope_invalid");
 assert.equal(releaseOutcomeError(release,{operation:"cleanup_resource",intent:input("cleanup_resource",{resourceId:"fixture-target"})},{status:"succeeded",evidence:{observedAt:at,absenceVerified:true,resourceIds:["unowned"]}}),"release_cleanup_unproven");
});
