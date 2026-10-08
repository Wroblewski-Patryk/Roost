import test from "node:test";import assert from "node:assert/strict";
import {workerCredentialRoute} from "../auth/worker-ticket-principal";
import {releaseInspectionView} from "../modules/agent-runtime/governed-release";
const id="00000000-0000-4000-8000-000000000001";
test("claim-only credential reaches only its lease-bound evidence endpoint, not release effects",()=>{
 assert.equal(workerCredentialRoute("POST",`/v1/agent-runtime/executions/${id}/actions/release-inspection`),true);
 for(const [method,route]of [["GET",`/v1/agent-runtime/executions/${id}/actions/release-inspection`],
  ["POST",`/v1/agent-runtime/releases/${id}/operations`],["POST",`/v1/agent-runtime/releases/${id}/actions/renew`],
  ["POST","/v1/agent-runtime/releases"]])assert.equal(workerCredentialRoute(method!,route!),false);
});
test("an unapproved or writing boundary cannot query any stored release",async()=>{
 let queries=0;const db:any={$queryRaw:async()=>{queries++;throw Error("query_not_authorized");}};
 const execution={id,applicationId:id,metadata:{executionContract:{nativeBoundary:{profile:"coding-local"},access:{sandbox:"workspace-write"}}}};
 assert.deepEqual(await releaseInspectionView(db,execution,id),{error:"release_inspection_scope_required"});assert.equal(queries,0);
});
test("a missing release remains absent without constructing final evidence",async()=>{
 let queries=0;const db:any={$queryRaw:async()=>{queries++;return[];}};
 const execution={id,workspaceId:id,applicationId:id,agentHostId:id,metadata:{executionContract:{
  nativeBoundary:{profile:"inspect-readonly",inspectReadOnly:{kind:"auditor"},releaseInspection:{}},
  singleTask:{applicationId:id},access:{sandbox:"read-only",externalWrites:false}}}};
 assert.deepEqual(await releaseInspectionView(db,execution,id),{error:"release_not_found"});assert.equal(queries,1);
});
