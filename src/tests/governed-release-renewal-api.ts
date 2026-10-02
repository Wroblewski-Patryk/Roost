import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { createAuthToken } from "../auth/token";

export function registerReleaseRenewalTests({request,registerOwner}:any) {
 test("governed release renewal HTTP denies nonowners, stale login, missing authority and immutable changes",async()=>{
  const owner=await registerOwner(`release-renewal-${randomUUID()}@example.test`,"Release renewal fixture");
  const workspaceId=owner.workspace.id,user=await prisma.workspaceMembership.findFirstOrThrow({where:{workspaceId,role:"owner"}});
  const path=`/v1/agent-runtime/releases/${randomUUID()}/actions/renew`;
  const input={requestId:randomUUID(),expectedVersion:"a".repeat(64),expiresAt:new Date(Date.now()+1800000).toISOString()};
  const post=(body:any,token=owner.token)=>request(path,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  const missing=await post(input);assert.equal(missing.status,404,JSON.stringify(missing.body));assert.equal(missing.body.error,"release_not_found");
  for(const authTime of [null,Math.floor(Date.now()/1000)-301,Math.floor(Date.now()/1000)+61]) {
   const rejected=await post(input,createAuthToken({userId:user.userId,workspaceId},authTime));
   assert.equal(rejected.status,403,JSON.stringify(rejected.body));assert.equal(rejected.body.error,"release_fresh_owner_required");
  }
  for(const field of ["manifest","commit","reviewId","grantDigest","releaserCredentialId"])
   assert.equal((await post({...input,[field]:"changed"})).status,400,field);
  const admin=await prisma.user.create({data:{email:`release-renewal-admin-${randomUUID()}@example.test`,passwordHash:"synthetic-not-a-login"}});
  await prisma.workspaceMembership.create({data:{workspaceId,userId:admin.id,role:"admin"}});
  assert.equal((await post(input,createAuthToken({userId:admin.id,workspaceId}))).status,403);
  assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int AS n FROM governed_release_renewals WHERE workspace_id=${workspaceId}::uuid`)[0].n,0);
  assert.equal((await prisma.$queryRaw<any[]>`SELECT governed_release_effective_expiry(${randomUUID()}::uuid) AS expires`)[0].expires,null);
  // Direct SQL is guarded independently of HTTP and cannot append authority to
  // an absent/unproven grant; no fixture turns off the renewal trigger.
  await assert.rejects(prisma.$executeRaw`INSERT INTO governed_release_renewals(id,release_id,workspace_id,sequence,issuer_user_id,owner_authenticated_at,previous_expires_at,expires_at,expected_version,request_id,request_hash)
   VALUES(${randomUUID()}::uuid,${randomUUID()}::uuid,${workspaceId}::uuid,1,${user.userId}::uuid,now(),now()-interval '1 minute',now()+interval '30 minutes',${"a".repeat(64)},${randomUUID()}::uuid,${"b".repeat(64)})`,/governed_release_renewal_invalid/);
  const triggers=await prisma.$queryRaw<any[]>`SELECT tgname,tgenabled FROM pg_trigger WHERE tgrelid='governed_release_renewals'::regclass AND NOT tgisinternal ORDER BY tgname`;
  assert.deepEqual(triggers.map(t=>[t.tgname,t.tgenabled]),[["governed_release_renewal_guard","O"],["governed_release_renewal_immutable","O"]]);
 });
}
