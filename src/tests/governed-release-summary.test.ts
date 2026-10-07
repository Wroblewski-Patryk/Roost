import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { listReleases, releaseView } from "../modules/agent-runtime/governed-release";

function fixture() {
 const workspaceId=randomUUID(),hostId=randomUUID(),applicationId=randomUUID(),userId=randomUUID(),agentId=randomUUID(),keyId=randomUUID();
 const auth:any={authType:"user",workspaceId,userId,workspaceRole:"owner"};
 const worker:any={authType:"api_key",workspaceId,agentId,apiKeyId:keyId,credentialVersion:4,scopes:["agent-runtime:write","agent-runtime:release"]};
 const states:any[]=[];const queries:{sql:string,values:any[]}[]=[];
 const add=(outcomes:any[]=[],extra:any={})=>{
  const id=randomUUID(),release={id,workspace_id:workspaceId,host_id:hostId,application_id:applicationId,
   releaser_agent_id:agentId,releaser_credential_id:keyId,credential_version:4,expires_at:new Date(Date.now()+3600000),
   snapshot:{privateHistoricalEvidence:"x".repeat(300000)},...extra};
  const state:any={release,journal:outcomes.map((outcome,i)=>({id:randomUUID(),operation:i===0?"deploy":"observe",sequence:i+1,outcome,
   intent:{privateHistoricalEvidence:"y".repeat(300000)}})),revocations:[],renewals:[],failedClosures:[]};
  states.push(state);return state;
 };
 const db:any={workspaceMembership:{findFirst:async({where}:any)=>where.userId===userId?{userId,role:"owner"}:null},
  apiKey:{findFirst:async()=>({id:keyId,active:true,revokedAt:null,expiresAt:new Date(Date.now()+3600000),credentialVersion:4,
   boundAgentId:agentId,scopes:worker.scopes,boundAgent:{id:agentId,workspaceId,type:"agent",status:"active",source:"system"}})},
  $queryRaw:async(strings:TemplateStringsArray,...values:any[])=>{
   const sql=strings.join("?");queries.push({sql,values});
   if(sql.startsWith("SELECT id FROM api_keys"))return [{id:keyId}];
   if(sql.startsWith("SELECT id FROM governed_releases")){
    const selected=sql.includes("application_id=")?states.filter(s=>(values[1]===null||s.release.host_id===values[1])&&(values[3]===null||s.release.application_id===values[3])):states;
    return selected.slice(0,51).map(s=>({id:s.release.id}));
   }
   if(sql.startsWith("SELECT r.id FROM governed_releases"))return states.filter(s=>s.release.host_id===values[1]&&(values[2]===null||s.release.application_id===values[2])
    &&s.release.releaser_agent_id===values[4]&&s.release.releaser_credential_id===values[5]&&s.release.credential_version===values[6]).slice(0,51).map(s=>({id:s.release.id}));
   if(sql.startsWith("SELECT DISTINCT r.id"))return [];
   if(sql.startsWith("SELECT * FROM governed_releases"))return states.filter(s=>s.release.id===values[1]).map(s=>s.release);
   const state=states.find(s=>s.release.id===values[0]);
   if(sql.includes("FROM governed_release_operations"))return state?.journal??[];
   if(sql.includes("FROM governed_release_revocations"))return state?.revocations??[];
   if(sql.includes("FROM governed_release_renewals"))return state?.renewals??[];
   if(sql.includes("FROM governed_release_failed_closures"))return state?.failedClosures??[];
   throw new Error(`Unexpected query ${sql}`);
  }};
 return {db,auth,worker,states,add,queries,workspaceId,hostId,applicationId};
}

test("summary filters owner catalogue by host and app without serializing historical snapshots or journals",async()=>{
 const f=fixture(),selected=f.add([{status:"succeeded"}]);
 f.add([],{host_id:randomUUID()});f.add([],{application_id:randomUUID()});
 const result:any=await listReleases(f.db,f.workspaceId,f.auth,f.hostId,{applicationId:f.applicationId,summary:true});
 assert.equal(result.projection,"summary");assert.equal(result.truncated,false);assert.equal(result.releases.length,1);
 assert.deepEqual(result.releases[0].release,{id:selected.release.id,applicationId:f.applicationId,hostId:f.hostId});
 assert.equal(result.releases[0].status,(await releaseView(f.db,f.workspaceId,selected.release.id,f.auth) as any).status);
 assert.equal(result.releases[0].operationCount,1);assert.equal(result.releases[0].effectiveOutcomeCounts.succeeded,1);
 const serialized=JSON.stringify(result);assert.ok(serialized.length<1500);assert.ok(!/snapshot|intent|journal|privateHistoricalEvidence/.test(serialized));
 assert.ok(f.queries.some(q=>q.sql.includes("LIMIT 51")&&q.sql.includes("application_id=")));
});

test("default full catalogue response stays unchanged, including historical evidence and truncation",async()=>{
 const f=fixture();f.add([{status:"failed"}]);f.add([],{host_id:randomUUID()});
 const result:any=await listReleases(f.db,f.workspaceId,f.auth,f.hostId);
 assert.equal(result.releases.length,2);assert.equal(result.projection,undefined);
 assert.equal(result.releases[0].release.snapshot.privateHistoricalEvidence.length,300000);
 assert.equal(result.releases[0].journal[0].intent.privateHistoricalEvidence.length,300000);
});

test("unknown and unresolved operations remain explicit even on terminal release statuses",async()=>{
 const f=fixture();f.add([null,{status:"uncertain"},{status:"unexpected"},{status:"reconciled",reconciled_status:"failed"},{status:"reconciled",reconciled_status:"absent"},{status:"reconciled"}]);
 const closed=f.add([null]);closed.revocations=[{reason:"Closed FAILED; owner baseline receipt fixture"}];closed.failedClosures=[{id:randomUUID(),snapshot:{huge:"z".repeat(300000)}}];
 const result:any=await listReleases(f.db,f.workspaceId,f.auth,f.hostId,{summary:true});
 assert.equal(result.releases[0].status,"reconciliation_required");
 assert.deepEqual(result.releases[0].effectiveOutcomeCounts,{succeeded:0,failed:1,absent:1,uncertain:1,unresolved:2,unknown:1});
 assert.equal(result.releases[1].status,"failed");assert.equal(result.releases[1].failedClosureCount,1);
 assert.equal(result.releases[1].effectiveOutcomeCounts.unresolved,1);
 assert.ok(!JSON.stringify(result).includes("huge"));
});

test("summary refuses an incomplete catalogue rather than asserting quiescence",async()=>{
 const f=fixture();for(let i=0;i<51;i++)f.add();
 assert.deepEqual(await listReleases(f.db,f.workspaceId,f.auth,f.hostId,{summary:true}),{error:"release_catalog_truncated"});
 assert.ok(!f.queries.some(q=>q.sql.startsWith("SELECT * FROM governed_releases")));
 const full:any=await listReleases(f.db,f.workspaceId,f.auth);assert.equal(full.truncated,true);assert.equal(full.releases.length,50);
});

test("summary reuses the full state status for active, expired, revoked and completed rows",async()=>{
 const f=fixture();f.add();f.add([],{expires_at:new Date(Date.now()-60000)});
 const revoked=f.add();revoked.revocations=[{reason:"owner revoked"}];
 const completed=f.add([{status:"reconciled",reconciled_status:"succeeded"}]);completed.journal[0].operation="cleanup";
 const result:any=await listReleases(f.db,f.workspaceId,f.auth,f.hostId,{summary:true});
 assert.deepEqual(result.releases.map((r:any)=>r.status),["active","expired","revoked","completed"]);
 for(let i=0;i<f.states.length;i++)assert.equal(result.releases[i].status,(await releaseView(f.db,f.workspaceId,f.states[i].release.id,f.auth) as any).status);
});

test("agent summary preserves exact credential version and mandatory release scope and host",async()=>{
 const f=fixture(),selected=f.add();f.add([],{credential_version:3});f.add([],{releaser_credential_id:randomUUID()});f.add([],{application_id:randomUUID()});
 const result:any=await listReleases(f.db,f.workspaceId,f.worker,f.hostId,{summary:true,applicationId:f.applicationId});
 assert.deepEqual(result.releases.map((r:any)=>r.release.id),[selected.release.id]);
 assert.deepEqual(await listReleases(f.db,f.workspaceId,f.worker,undefined,{summary:true}),{error:"release_forbidden"});
 const limited={...f.worker,scopes:["agent-runtime:write"]};
 assert.deepEqual(await listReleases(f.db,f.workspaceId,limited,f.hostId,{summary:true}),{error:"release_forbidden"});
 assert.ok(f.queries.some(q=>q.sql.startsWith("SELECT DISTINCT r.id")&&q.sql.includes("a.credential_version=?")));
});

test("route accepts only an explicit boolean string and UUID app filter in the existing authorized read transaction",()=>{
 const source=readFileSync("src/modules/agent-runtime/governed-release.routes.ts","utf8");
 assert.match(source,/applicationId=uuid.optional\(\).parse\(req.query.applicationId\)/);
 assert.match(source,/z.enum\(\["true","false"\]\).optional\(\).parse\(req.query.summary\)===\"true\"/);
 assert.match(source,/readyTransaction\(db=>listReleases\(db,req.auth!.workspaceId,req.auth!,hostId,\{applicationId,summary\}\)\)/);
});
