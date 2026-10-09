// Fictional protocol tests only; no private installation files or native/API jobs.
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID}from'node:crypto';
import {createRequire}from'node:module';import path from'node:path';import {fileURLToPath}from'node:url';import {readFileSync}from'node:fs';
import shared from './lib/agent-host-release-contract.cjs';
import {compatibleConfigClosureFixture as fixture,refreshCompatibleConfigClosure as refresh}from'./fixtures/release-compatible-config-closure.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),req=createRequire(import.meta.url);
const {require:ts}=req('tsx/cjs/api'),server=ts(path.join(root,'src/modules/agent-runtime/governed-release-contract.ts'),import.meta.url);
const service=ts(path.join(root,'src/modules/agent-runtime/governed-release.ts'),import.meta.url),{wire}=ts(path.join(root,'src/modules/agent-runtime/task-review-contract.ts'),import.meta.url);
const seal=f=>{f.body.nativeClosure.evidenceDigest=shared.releaseDigest(f.body.evidence);};
test('exact four successful Git outcomes plus down configuration absence closes FAILED without modifying proof',()=>{
 const f=fixture(),before=JSON.stringify({state:f.state,body:f.body});assert.equal(shared.closeFailedReleaseSchema.safeParse(f.body).success,true);
 assert.equal(server.releaseFailedClosureError(f.state,f.body),null);
 assert.equal(shared.compatibleConfigClosureRevalidationError(f.s,f.body,f.clock,f.operation),null);
 assert.equal(JSON.stringify({state:f.state,body:f.body}),before);assert.equal(f.body.evidence.healthy,false);
 assert.equal(shared.nextCompatibleRecoveryOperation(f.state),'frozen');
});
for(const [name,change]of Object.entries({
 application:f=>f.state.release.applicationId=randomUUID(),host:f=>f.state.release.hostId=randomUUID(),version:f=>f.body.expectedVersion='0'.repeat(64),
 closureHost:f=>f.body.nativeClosure.agentHostId=randomUUID(),closureEvidence:f=>f.body.nativeClosure.evidenceDigest='0'.repeat(64),
 closureWriter:f=>f.body.nativeClosure.writerAbsent=false,closureMissing:f=>delete f.body.nativeClosure,
 failedOperation:f=>f.body.failedOperationId=randomUUID(),extraOperation:f=>f.state.journal.push({...f.operation,id:randomUUID(),operation:'deploy'}),
 uncertainGit:f=>f.state.journal[1].outcome.status='uncertain',wrongGitCommit:f=>f.state.journal[0].outcome.evidence.remoteCommit='f'.repeat(40),
 wrongGitIntent:f=>f.state.journal[0].intent.observed.baseTree='0'.repeat(40),wrongGitBase:f=>f.state.journal[0].outcome.evidence.remoteBaseTree='0'.repeat(40),wrongPR:f=>f.state.journal[2].outcome.evidence.pullRequestNumber=9,
 rejectedReview:f=>f.state.journal[2].outcome.evidence.reviewApproved=false,wrongMerge:f=>f.state.journal[3].outcome.evidence.mergedCommit='f'.repeat(40),
 data:f=>{f.body.evidence.dataDigest='0'.repeat(64);seal(f);},sequence:f=>{f.body.evidence.sequenceDigest='0'.repeat(64);seal(f);},
 fence:f=>{f.body.evidence.compatibleRecoveryFailure.ingressFence.rulePresent=false;seal(f);},
 healthyFiction:f=>{f.body.evidence.healthy=true;seal(f);},alreadyRevoked:f=>f.state.revocations.push({id:randomUUID()})
}))test('FAILED closure refuses '+name,()=>{const f=fixture();change(f);assert.notEqual(server.releaseFailedClosureError(f.state,f.body),null);});
test('fresh actual revalidation preserves stale original clocks and all entry facts',()=>{
 const f=fixture(),old=JSON.stringify(f.body.evidence),clock=f.clock+600000;refresh(f,clock);
 assert.equal(shared.closeFailedReleaseSchema.safeParse(f.body).success,true);
 assert.equal(server.releaseFailedClosureError(f.state,f.body),null);
 assert.equal(shared.compatibleConfigClosureRevalidationError(f.s,f.body,clock,f.operation),null);
 assert.equal(JSON.stringify(f.body.evidence),old);
 assert.notEqual(shared.compatibleConfigClosureRevalidationError(f.s,{...f.body,absenceRevalidation:undefined},clock,f.operation),null);
});
for(const [name,change]of Object.entries({
 stale:f=>f.checkAt+=300001,future:f=>f.checkAt-=1,
 data:f=>f.body.absenceRevalidation.currentEvidence.dataDigest='0'.repeat(64),
 ingress:f=>f.body.absenceRevalidation.currentEvidence.compatibleRecoveryFailure.ingressFence.namespaceDigest='0'.repeat(64),
 database:f=>f.body.absenceRevalidation.currentEvidence.compatibleRecoveryFailure.database.containerId='0'.repeat(64),
 configuration:f=>f.body.absenceRevalidation.currentEvidence.compatibleRecoveryFailure.configuration.gitCommit='f'.repeat(40),
 nativeDigest:f=>f.body.absenceRevalidation.nativeClosureDigest='0'.repeat(64),outcome:f=>f.body.absenceRevalidation.failedOutcomeId=randomUUID(),
 oldNative:f=>f.body.nativeClosure.observedAt=new Date(f.clock).toISOString(),inventedField:f=>f.body.absenceRevalidation.currentEvidence.osAttested=true,
 inventoryClock:f=>f.body.absenceRevalidation.currentEvidence.compatibleRecoveryFailure.projectInventory.observedAt=new Date(f.clock).toISOString()
}))test('current closure revalidation refuses '+name,()=>{const f=fixture();f.checkAt=f.clock+600000;refresh(f,f.checkAt);change(f);
 const shape=shared.closeFailedReleaseSchema.safeParse(f.body);const binding=server.releaseFailedClosureError(f.state,f.body);
 const current=shared.compatibleConfigClosureRevalidationError(f.s,f.body,f.checkAt,f.operation);
 assert.ok(!shape.success||binding!==null||current!==null);
});
test('additive SQL retains old predicates and mirrors every original negative content check',()=>{
 const source=readFileSync(path.join(root,'prisma/migrations/20261009223000_compatible_config_absence_closure/migration.sql'),'utf8').replaceAll('\r\n','\n');
 const old=readFileSync(path.join(root,'prisma/migrations/20261006213000_compose_compatible_artifact_recovery/migration.sql'),'utf8').replaceAll('\r\n','\n');
 const a=old.indexOf('CREATE FUNCTION governed_release_compatible_negative_contents_valid('),b=old.indexOf('CREATE FUNCTION governed_release_compatible_negative_valid(',a);
 const expected=old.slice(a,b).replace('governed_release_compatible_negative_contents_valid(','governed_release_compatible_negative_contents_at(')
  .replace('observation_only BOOLEAN)','observation_only BOOLEAN,qualified_at TIMESTAMPTZ)').replaceAll('now()','qualified_at')
  .replace("governed_release_compatible_fence_valid(v->'ingressFence',target,db,e->>'observedAt',TRUE) IS DISTINCT FROM TRUE","governed_release_compatible_fence_valid(v->'ingressFence',target,db,e->>'observedAt',FALSE) IS DISTINCT FROM TRUE\n  OR (v->'ingressFence'->>'observedAt')::timestamptz>qualified_at\n  OR (v->'ingressFence'->>'observedAt')::timestamptz<qualified_at-interval '5 minutes'");
 assert.ok(source.includes(expected));assert.doesNotMatch(source,/\b(?:UPDATE\s+\w+\s+SET|DELETE FROM|INSERT INTO|DROP|TRUNCATE)\b/i);
 assert.match(source,/qualified_at/);assert.match(source,/compatible_config_closure_fresh/);assert.match(source,/interval '5 minutes'/);
 assert.match(source,/RENAME TO governed_release_failed_base_pre_compat_cfg_v1/);assert.match(source,/RETURN governed_release_failed_base_pre_compat_cfg_v1/);
 assert.doesNotMatch(source,/CREATE.*(?:published_git_basis|compatible_insert_guard|compatible_operation_guard)/);
 for(const match of source.matchAll(/(?:FUNCTION|RENAME TO)\s+([a-z_][a-z_0-9]*)/g))assert.ok(match[1].length<63,'PostgreSQL identifier must not truncate: '+match[1]);
});
test('an explicitly historical fixture and genuinely current fixture clock retain both original and current qualifications',()=>{
 const clock=Date.now()-600000,f=fixture({clock}),before=JSON.stringify(f.body.evidence),currentClock=Date.now()-1;
 assert.equal(server.releaseFailedClosureError(f.state,f.body),null);
 assert.notEqual(shared.compatibleConfigClosureRevalidationError(f.s,f.body,currentClock,f.operation),null);
 refresh(f,currentClock);assert.equal(server.releaseFailedClosureError(f.state,f.body),null);
 assert.equal(shared.compatibleConfigClosureRevalidationError(f.s,f.body,currentClock,f.operation),null);
 assert.equal(JSON.stringify(f.body.evidence),before);
});
function serviceFixture(){
 const f=fixture(),r=f.state.release;Object.assign(r,{workspace_id:randomUUID(),application_id:f.s.applicationId,host_id:f.s.hostId,issuer_user_id:r.issuerUserId,expires_at:new Date(f.s.expiresAt)});
 f.body.expectedVersion=shared.releaseDigest(wire({release:r,journal:f.state.journal,revocations:[],renewals:[]}));let writes=0;
 const db={workspaceMembership:{findFirst:async()=>({role:'owner'})},$queryRaw:async parts=>{
  const text=parts.join('?');if(text.includes('pg_advisory_xact_lock'))return[];
  if(text.includes('FROM governed_releases'))return[r];if(text.includes('FROM governed_release_operations'))return f.state.journal;
  if(['FROM governed_release_revocations','FROM governed_release_renewals','FROM governed_release_failed_closures'].some(v=>text.includes(v)))return[];
  throw Error('unexpected_fixture_read');},$executeRaw:async()=>{writes++;return 1;}};
 const auth={authType:'user',workspaceId:r.workspace_id,userId:r.issuer_user_id,workspaceRole:'owner',authenticatedAt:Math.floor(Date.now()/1000)};
 return{...f,db,auth,writes:()=>writes};
}
for(const [name,change,expected]of [
 ['old owner',f=>f.auth.authenticatedAt-=301,'release_fresh_owner_required'],
 ['wrong issuer',f=>f.auth.userId=randomUUID(),'release_issuer_required'],
 ['future native',f=>f.body.nativeClosure.observedAt=new Date(Date.now()+120000).toISOString(),'release_compatible_config_closure_unproven'],
 ['stale native',f=>f.body.nativeClosure.observedAt=new Date(Date.now()-600000).toISOString(),'release_compatible_config_closure_unproven']
])test('ordinary close-failed service refuses '+name+' before writes',async()=>{
 const f=serviceFixture();change(f);const result=await service.closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.body);
 assert.equal(result.error,expected);assert.equal(f.writes(),0);
});
