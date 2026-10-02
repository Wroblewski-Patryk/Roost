import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { renewRelease } from "../modules/agent-runtime/governed-release";
import { releaseDigest, renewReleaseSchema, releaseRenewalWindowError, releaseRenewalStateError } from "../modules/agent-runtime/governed-release-contract";
import { wire } from "../modules/agent-runtime/task-review-contract";

const now=new Date("2026-10-02T10:30:00Z"),old=new Date("2026-10-02T10:27:00Z"),expiresAt="2026-10-02T11:20:00.000Z";
const manifest={backup:{restoreVerifiedAt:"2026-10-01T16:47:21.572Z"}};
test("expired admission can be renewed for at most one hour without refreshing the original backup proof",()=>{
 assert.equal(releaseRenewalWindowError({expiresAt},old,new Date("2026-10-02T15:30:00Z"),manifest,now),null);
 for(const expiry of ["2026-10-02T10:30:00Z","2026-10-02T11:30:00.001Z"])
  assert.equal(releaseRenewalWindowError({expiresAt:expiry},old,new Date("2026-10-02T15:30:00Z"),manifest,now),"release_window_invalid");
 assert.equal(releaseRenewalWindowError({expiresAt},new Date(expiresAt),new Date("2026-10-02T15:30:00Z"),manifest,now),"release_window_invalid");
 assert.equal(releaseRenewalWindowError({expiresAt},old,new Date("2026-10-02T11:00:00Z"),manifest,now),"release_window_invalid");
 for(const at of ["2026-10-01T10:29:59Z","2026-10-02T10:31:01Z","invalid"])
  assert.equal(releaseRenewalWindowError({expiresAt},old,new Date("2026-10-02T15:30:00Z"),{backup:{restoreVerifiedAt:at}},now),"release_prerequisite_stale");
});
test("renewal cannot replace an issuer, revive revocation, or reopen completed cleanup",()=>{
 const state={release:{issuer_user_id:"owner"},revocations:[],journal:[]};
 assert.equal(releaseRenewalStateError(state,"owner"),null);
 assert.equal(releaseRenewalStateError(state,"other-owner"),"release_issuer_required");
 assert.equal(releaseRenewalStateError({...state,revocations:[{}]},"owner"),"release_authority_inactive");
 for(const outcome of [{status:"succeeded"},{status:"reconciled",reconciled_status:"succeeded"}])
  assert.equal(releaseRenewalStateError({...state,journal:[{operation:"cleanup",outcome}]},"owner"),"release_already_completed");
 assert.equal(releaseRenewalStateError({...state,journal:[{operation:"merge",outcome:{status:"uncertain"}}]},"owner"),null);
});
test("renewal wire format cannot carry changes to immutable authority or manifest",()=>{
 const input={requestId:randomUUID(),expectedVersion:"a".repeat(64),expiresAt};
 assert.ok(renewReleaseSchema.safeParse(input).success);
 for(const key of ["manifest","commit","reviewId","releaserCredentialId","credentialVersion","journal","grantDigest"])
  assert.equal(renewReleaseSchema.safeParse({...input,[key]:"replacement"}).success,false,key);
});
function fixture() {
 const workspaceId=randomUUID(),id=randomUUID(),userId=randomUUID();
 const auth:any={authType:"user",workspaceId,workspaceRole:"owner",userId,authenticatedAt:Math.floor(Date.now()/1000)};
 const release:any={id,workspace_id:workspaceId,application_id:randomUUID(),issuer_user_id:userId,expires_at:old,snapshot:{manifest},request_hash:"never-public"};
 let renewals:any[]=[],revocations:any[]=[],journal:any[]=[],prior:any;
 const calls:string[]=[];
 const db:any={workspaceMembership:{findFirst:async()=>({role:"owner"})},apiKey:{findFirst:async()=>null},
  $executeRaw:async()=>{throw Error("denial or replay must not write authority");},
  $queryRaw:async(strings:TemplateStringsArray)=>{
   const sql=strings.join("?");calls.push(sql);
   if(sql.includes("pg_advisory_xact_lock"))return [];
   if(sql.includes("FROM governed_releases"))return [release];
   if(sql.includes("FROM governed_release_operations"))return journal;
   if(sql.includes("FROM governed_release_revocations"))return revocations;
   if(sql.includes("FROM governed_release_renewals"))return sql.includes("request_id")?(prior?[prior]:[]):renewals;
   throw Error("unexpected test database read");
  }};
 const input={requestId:randomUUID(),expectedVersion:releaseDigest(wire({release,journal,revocations,renewals})),expiresAt:new Date(Date.now()+1800000).toISOString()};
 return {db,workspaceId,id,userId,auth,release,input,calls,setPrior:(value:any)=>{prior=value;},setRenewals:(value:any[])=>{renewals=value;},setRevocations:(value:any[])=>{revocations=value;},setJournal:(value:any[])=>{journal=value;}};
}
test("fresh owner authority is required before even reading a release for renewal",async()=>{
 for(const change of [{authenticatedAt:Math.floor(Date.now()/1000)-301},{authType:"agent",agentId:randomUUID()},{workspaceRole:"admin"},{authenticatedAt:Math.floor(Date.now()/1000)+61}]) {
  const f=fixture();assert.deepEqual(await renewRelease(f.db,f.workspaceId,f.id,{...f.auth,...change},f.input),{error:"release_fresh_owner_required"});assert.equal(f.calls.length,0);
 }
});
test("renewal optimistic version and immutable credential must be current",async()=>{
 const stale=fixture();assert.deepEqual(await renewRelease(stale.db,stale.workspaceId,stale.id,stale.auth,{...stale.input,expectedVersion:"0".repeat(64)}),{error:"release_version_stale"});
 const inactive=fixture();assert.deepEqual(await renewRelease(inactive.db,inactive.workspaceId,inactive.id,inactive.auth,inactive.input),{error:"release_credential_invalid"});
});
test("idempotent replay exposes effective expiry and history without changing the grant or journal",async()=>{
 const f=fixture(),original=structuredClone(f.release),renewal={id:randomUUID(),release_id:f.id,sequence:1,expires_at:new Date(f.input.expiresAt)};
 f.setRenewals([renewal]);f.setPrior({...renewal,request_hash:releaseDigest({input:f.input,id:f.id,userId:f.userId})});
 const result:any=await renewRelease(f.db,f.workspaceId,f.id,f.auth,f.input);
 assert.equal(result.replayed,true);assert.equal(result.effectiveExpiresAt.toISOString(),f.input.expiresAt);assert.equal(result.renewals.length,1);
 assert.equal(result.release.expiresAt.toISOString(),old.toISOString());assert.equal("requestHash" in result.release,false);
 assert.deepEqual(f.release,original);assert.deepEqual(result.journal,[]);
 assert.notEqual(result.expectedVersion,f.input.expectedVersion);
});
test("renewal request ids cannot be reused for another payload or release",async()=>{
 const f=fixture();f.setPrior({release_id:randomUUID(),request_hash:releaseDigest({input:f.input,id:f.id,userId:f.userId})});
 assert.deepEqual(await renewRelease(f.db,f.workspaceId,f.id,f.auth,f.input),{error:"release_request_conflict"});
});
