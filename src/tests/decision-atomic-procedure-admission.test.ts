import assert from "node:assert/strict";
import test from "node:test";
import { decisionAction, decisionActionTimeout, decisionDeferral, decisionProposal, reopeningEvent } from "../modules/decisions/decision-governance-contract";
import { decisionGovernanceCommand } from "../modules/decisions/decision-governance";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { admissionCommand } from "../modules/agent-runtime/task-risk-admission";
import { redactionState } from "../modules/agent-runtime/runtime-redaction-policy";

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const workspaceId=id(1),ownerId=id(2),decisionId=id(3),previewId=id(4);
const procedureEvidence={verdict:"passed",evidence:{id:id(5),revision:"2026-10-01T12:00:00.000Z"},
 rationale:"Inspected the published procedure against the actual task scope",
 validation:"Read and verify the selected base and extension composition",
 observedResult:"Both published procedures cover the inspected scope"};

// This fixture exercises the normal command and normal admission command, not
// a substituted gate writer. SQL constraint failures are injected at the real
// acceptance INSERT; the enclosing transaction owns rollback on exceptions.
function fixture(options:{taskIds?:string[];blockedTask?:string;missingTask?:string;nativeFailure?:boolean;actor?:"agent";invalidateAtTaskFence?:boolean;invalidateEveryTaskFence?:boolean;membershipRole?:string}={}){
 const taskIds=options.taskIds??[id(10),id(11),id(12),id(13),id(14)];
 const impact={taskIds,nodes:taskIds.map(taskId=>({type:"task",id:taskId}))};
 const authority={status:"owner_reserved",reason:"unclassified_owner",principal:{kind:"user",id:ownerId},path:[],mandate:null};
 const revision={decision_id:decisionId,state:"pending",body:{scope:[{type:"task",id:taskIds[0]}]}};
 const preview={id:previewId,impact,authority};
 const principal=options.actor==="agent"?{kind:"agent",id:id(40),credentialId:id(41),credentialPrefix:"unit"}:
  {kind:"user",id:ownerId,credentialId:null,credentialPrefix:null};
 const expectedVersion=reviewDigest({u:options.actor?null:ownerId,role:options.actor?null:"owner",principal,ownerUserId:ownerId,authority,
  revisions:[[decisionId,"pending"]],previews:[previewId],acceptance:undefined,deferrals:[],references:[],impact});
 let evidenceRows:any[]=[],events:any[]=[],acceptances:any[]=[],saved:any=null;
 let taskFence=false,admissionEpoch=0;
 const versionReads:Array<{taskId:string;version:string}>=[];
 const calls:Array<{sql:string;values:any[]}>=[];
 const text=(parts:any)=>Array.from(parts as string[]).join("?");
 const db:any={
  workspaceMembership:{findFirst:async()=>({role:options.membershipRole??"owner",userId:ownerId})},
  workspace:{findUnique:async()=>({ownerUserId:ownerId})},
  task:{findFirst:async({where}:any)=>where.id===options.missingTask?null:{id:where.id,title:"Certification task"}},
  companyRecord:{findFirst:async()=>({description:"Inspected technical context"})},
  event:{create:async({data}:any)=>{events.push(data);return data;}},
  apiKey:{findFirst:async()=>({id:id(41),active:true,expiresAt:new Date(Date.now()+60_000),credentialVersion:1,boundAgentId:id(40),
   keyPrefix:"unit",scopes:["agent-runtime:write"],boundAgent:{id:id(40),workspaceId,type:"agent",status:"active",source:"manual"}})},
  $queryRaw:async(parts:any,...values:any[])=>{
   const sql=text(parts);calls.push({sql,values});
   if(sql.includes("FROM decision_revisions"))return [revision];
   if(sql.includes("FROM decision_impact_previews"))return [preview];
   if(sql.includes("FROM decision_acceptances")||sql.includes("FROM decision_deferrals")||sql.includes("FROM workforce_mandate_versions")||sql.includes("FROM workforce_entities")||sql.startsWith("SELECT * FROM ? WHERE"))return [];
   if(sql.includes("decision_current_impact"))return [{value:impact}];
   if(sql.includes("AS version")){
    const version=admissionEpoch>1?admissionEpoch.toString(16).padStart(64,"0"):(admissionEpoch?"d":"c").repeat(64);
    versionReads.push({taskId:values[0],version});return [{version}];
   }
   if(sql.includes("SELECT id,request_hash")){
    const row=evidenceRows.find(row=>row.requestId===values[2]);return row?[{id:row.id,request_hash:row.requestHash}]:[];
   }
   if(sql.includes("SELECT request_hash"))return [];
   if(sql.includes("task_admission_view"))throw new Error("Compact evidence must not probe or claim an admission seal");
   if(sql.includes("FROM tasks")||sql.includes("FROM api_keys"))return [];
   throw new Error(`Unexpected query in fixture: ${sql}`);
  },
  $executeRaw:async(parts:any,...values:any[])=>{
   const sql=text(parts);calls.push({sql,values});
   if(sql.includes("UPDATE ready_source_fence SET revision = revision + 1"))taskFence=true;
   if(sql.includes("SELECT decision_authority_invalidate")&&taskFence){
    if(options.invalidateEveryTaskFence||options.invalidateAtTaskFence&&!admissionEpoch)admissionEpoch++;
    taskFence=false;
   }
   if(sql==="SAVEPOINT decision_acceptance_evidence")saved={evidenceRows:[...evidenceRows],events:[...events],acceptances:[...acceptances],admissionEpoch,taskFence};
   else if(sql==="ROLLBACK TO SAVEPOINT decision_acceptance_evidence")({evidenceRows,events,acceptances,admissionEpoch,taskFence}=saved);
   else if(sql.includes("INSERT INTO task_admission_evidence"))evidenceRows.push({id:values[0],taskId:values[2],operation:values[4],gate:values[5],evidenceId:values[13],detail:JSON.parse(values[16]),requestId:values[18],requestHash:values[19]});
   else if(sql.includes("INSERT INTO decision_acceptances")){
    if(options.nativeFailure||options.blockedTask&&taskIds.includes(options.blockedTask)||evidenceRows.some(row=>row.detail.verdict==="failed"))throw new Error("decision_risk_admission_required");
    acceptances.push({id:values[0],decisionId:values[1],previewId:values[3]});
   }
   return 1;
  }
 };
 const actor:any=options.actor?{authType:"api_key",workspaceId,agentId:id(40),apiKeyId:id(41),credentialVersion:1}:ownerId;
 const run=async(overrides:Record<string,unknown>={})=>{
  const before={evidenceRows:[...evidenceRows],events:[...events],acceptances:[...acceptances],admissionEpoch,taskFence};
  try{return await decisionGovernanceCommand(db,workspaceId,actor,"action",{requestId:id(20),expectedVersion,action:"accept",previewId,procedureEvidence,...overrides},decisionId);}
  catch(error){({evidenceRows,events,acceptances,admissionEpoch,taskFence}=before);throw error;}
 };
 return {run,db,calls,expectedVersion,taskIds,versionReads,admissionEpoch:()=>admissionEpoch,rows:()=>({evidenceRows,events,acceptances})};
}

test("explicit procedure evidence is bounded, complete and allowed only for acceptance",()=>{
 const action={requestId:id(20),expectedVersion:"a".repeat(64),action:"accept",previewId,procedureEvidence};
 assert.equal(decisionAction.safeParse(action).success,true);
 for(const key of ["verdict","evidence","rationale","validation","observedResult"]){
  const incomplete:any={...procedureEvidence};delete incomplete[key];
  assert.equal(decisionAction.safeParse({...action,procedureEvidence:incomplete}).success,false);
 }
 for(const extra of [{taskIds:[id(10)]},{operation:"runtime_execute"},{gate:"owner_approval"},{actorUserId:ownerId},{validation:"x".repeat(2001)}])
  assert.equal(decisionAction.safeParse({...action,procedureEvidence:{...procedureEvidence,...extra}}).success,false);
 assert.equal(decisionAction.safeParse({...action,action:"review_impact"}).success,false);
 assert.equal(decisionProposal.safeParse({...action,title:"Not a proposal"}).success,false);
 assert.equal(decisionDeferral.safeParse({requestId:id(20),expectedVersion:"a".repeat(64),targetType:"decision",targetId:decisionId,
  reason:"budget",explanation:"Wait for budget",condition:{type:"owner_signal"},procedureEvidence}).success,false);
 assert.equal(reopeningEvent.safeParse({requestId:id(20),expectedVersion:"a".repeat(64),deferralId:id(21),type:"owner_signal",
  explanation:"Owner signalled readiness",procedureEvidence}).success,false);
 assert.equal(decisionAction.safeParse({...action,procedureEvidence:undefined}).success,true);
});

test("one human acceptance records normal procedure gates for every expanded impact task",async()=>{
 const f=fixture(),result:any=await f.run();
 assert.equal(result.replayed,false);
 const rows=f.rows();assert.equal(rows.acceptances.length,1);
 assert.deepEqual(rows.evidenceRows.map(row=>row.taskId),f.taskIds);
 for(const row of rows.evidenceRows){
  assert.equal(row.operation,"decision_supersede");assert.equal(row.gate,"procedure");
  assert.equal(row.evidenceId,procedureEvidence.evidence.id);
  assert.equal(row.detail.validation,procedureEvidence.validation);
  assert.equal(row.detail.observedResult,procedureEvidence.observedResult);
  assert.equal(row.detail.verdict,"passed");
 }
 const event=rows.events.find(row=>row.type==="decision_governance_recorded");
 assert.deepEqual(event.payload.procedureAdmissions,rows.evidenceRows.map(row=>({taskId:row.taskId,evidenceId:row.id})));
 const order=f.calls.map(c=>c.sql.includes("INSERT INTO decision_acceptances")?"accept":c.sql.includes("INSERT INTO task_admission_evidence")?"evidence":"other");
 assert.ok(order.indexOf("accept")>order.lastIndexOf("evidence"));
});

test("only structurally valid explicit-proof acceptance receives the bounded transaction budget",()=>{
 const action={requestId:id(20),expectedVersion:"a".repeat(64),action:"accept",previewId,procedureEvidence};
 assert.equal(decisionActionTimeout(action),90_000);
 assert.equal(decisionActionTimeout({...action,procedureEvidence:undefined}),20_000);
 assert.equal(decisionActionTimeout({...action,action:"review_impact"}),20_000);
 for(const body of [null,{}, {...action,requestId:"invalid"},{...action,procedureEvidence:{...procedureEvidence,validation:""}},
  {...action,timeoutMs:3600000},{...action,timeout:3600000}]){
  assert.equal(decisionAction.safeParse(body).success,false);
  assert.equal(decisionActionTimeout(body),20_000);
 }
});

test("stale version or noncurrent preview rejects before any procedure write",async()=>{
 for(const override of [{expectedVersion:"f".repeat(64)},{previewId:id(99)}]){
  const f=fixture();assert.deepEqual(await f.run(override),{error:"decision_stale"});
  assert.equal(f.rows().evidenceRows.length,0);assert.equal(f.rows().acceptances.length,0);
  assert.equal(f.calls.some(c=>c.sql.startsWith("SAVEPOINT")),false);
 }
});

test("atomic human evidence reads its CAS version after task fencing invalidates expired authority",async()=>{
 const f=fixture({invalidateAtTaskFence:true}),result:any=await f.run();
 assert.equal(result.error,undefined,JSON.stringify(result));
 assert.equal(result.replayed,false);assert.equal(f.admissionEpoch(),1);
 assert.equal(f.rows().acceptances.length,1);assert.equal(f.rows().evidenceRows.length,f.taskIds.length);
 assert.deepEqual(f.versionReads.map(r=>r.version),Array(f.taskIds.length*2).fill("d".repeat(64)));
 for(const taskId of f.taskIds)assert.equal(f.versionReads.filter(r=>r.taskId===taskId).length,2,
  "Each generated version is still checked by the normal admission command");
});

test("an external admission CAS captured before authority invalidation remains stale",async()=>{
 const f=fixture({invalidateAtTaskFence:true}),result=await admissionCommand(f.db,workspaceId,id(10),ownerId,"evidence",{
  ...procedureEvidence,requestId:id(21),expectedVersion:"c".repeat(64),operation:"decision_supersede",gate:"procedure"},{compact:true});
 assert.deepEqual(result,{error:"risk_admission_stale"});assert.equal(f.admissionEpoch(),1);
 assert.deepEqual(f.rows(),{evidenceRows:[],events:[],acceptances:[]});
});

test("each internal evidence body is constructed after exactly one normal task fence",async()=>{
 const f=fixture({invalidateEveryTaskFence:true}),result:any=await f.run();
 assert.equal(result.error,undefined,JSON.stringify(result));assert.equal(f.admissionEpoch(),f.taskIds.length);
 assert.equal(f.rows().acceptances.length,1);assert.equal(f.rows().evidenceRows.length,f.taskIds.length);
 assert.equal(f.calls.filter(c=>c.sql.includes("UPDATE ready_source_fence SET revision = revision + 1")).length,f.taskIds.length);
 for(const taskId of f.taskIds){
  const reads=f.versionReads.filter(r=>r.taskId===taskId);
  assert.equal(reads.length,2);assert.equal(reads[0].version,reads[1].version,
   "The captured internal CAS is still checked after construction by the normal command");
 }
 assert.equal(new Set(f.versionReads.map(r=>r.version)).size,f.taskIds.length,
  "The fixture changes the version at every fence, including a second fence on the same task");
});

const admissionBody=()=>({...procedureEvidence,requestId:id(21),expectedVersion:"c".repeat(64),operation:"decision_supersede",gate:"procedure"});

test("internal body construction retains task, membership, schema, redaction and CAS guards",async()=>{
 for(const options of [{missingTask:id(10)},{membershipRole:"viewer"}]){
  const f=fixture(options);let invoked=false;
  const result=await admissionCommand(f.db,workspaceId,id(10),ownerId,"evidence",undefined,{compact:true,bodyAfterLock:async()=>{
   invoked=true;return admissionBody();
  }});
  assert.deepEqual(result,{error:"missingTask" in options?"task_not_found":"risk_admission_forbidden"});
  assert.equal(invoked,false);assert.equal(f.rows().evidenceRows.length,0);
 }
 const stale=fixture({invalidateEveryTaskFence:true});
 assert.deepEqual(await admissionCommand(stale.db,workspaceId,id(10),ownerId,"evidence",undefined,
  {compact:true,bodyAfterLock:async()=>admissionBody()}),{error:"risk_admission_stale"});
 assert.equal(stale.rows().evidenceRows.length,0);
 const invalid=fixture();
 await assert.rejects(admissionCommand(invalid.db,workspaceId,id(10),ownerId,"evidence",undefined,
  {compact:true,bodyAfterLock:async()=>({...admissionBody(),skipLock:true})}));
 assert.equal(invalid.rows().evidenceRows.length,0);
 const redacted=fixture(),secret="synthetic-private-evidence-value-for-redaction-test";
 await redactionState.run({scope:{workspaceId,surface:"test"},secrets:[secret],notices:[],incidentIds:[],flushing:false},async()=>{
  await assert.rejects(admissionCommand(redacted.db,workspaceId,id(10),ownerId,"evidence",undefined,
   {compact:true,bodyAfterLock:async()=>({...admissionBody(),rationale:secret})}),/agent_runtime_content_blocked/);
 });
 assert.equal(redacted.rows().evidenceRows.length,0);
});

test("factory is server-only and restricted to compact evidence; literal body guards run before fencing",async()=>{
 for(const [kind,options] of [["scope",{compact:true,bodyAfterLock:async()=>admissionBody()}],
  ["evidence",{bodyAfterLock:async()=>admissionBody()}],["evidence",{compact:true,bodyAfterLock:"invalid"}]] as const){
  const f=fixture();await assert.rejects(admissionCommand(f.db,workspaceId,id(10),ownerId,kind,undefined,options as any),
   /risk_admission_internal_factory_invalid/);
  assert.equal(f.calls.length,0);
 }
 for(const extra of [{bodyAfterLock:async()=>admissionBody()},{skipLock:true}]){
  const f=fixture();await assert.rejects(admissionCommand(f.db,workspaceId,id(10),ownerId,"evidence",{...admissionBody(),...extra},{compact:true}));
  assert.equal(f.calls.length,0);
 }
});

test("internal factory uses the normal request replay and conflict checks",async()=>{
 const f=fixture(),options={compact:true,bodyAfterLock:async()=>admissionBody()};
 const first:any=await admissionCommand(f.db,workspaceId,id(10),ownerId,"evidence",undefined,options);
 const replay=await admissionCommand(f.db,workspaceId,id(10),ownerId,"evidence",undefined,options);
 assert.deepEqual(replay,{...first,replayed:true});assert.equal(f.rows().evidenceRows.length,1);assert.equal(f.rows().events.length,1);
 const conflict=await admissionCommand(f.db,workspaceId,id(10),ownerId,"evidence",undefined,
  {compact:true,bodyAfterLock:async()=>({...admissionBody(),observedResult:"A different explicitly supplied observation"})});
 assert.deepEqual(conflict,{error:"risk_admission_request_conflict"});assert.equal(f.rows().evidenceRows.length,1);
});

test("agent cannot attach human procedure evidence",async()=>{
 const f=fixture({actor:"agent"});assert.deepEqual(await f.run(),{error:"decision_forbidden"});
 assert.equal(f.rows().evidenceRows.length,0);assert.equal(f.rows().acceptances.length,0);
});

test("a missing later task rolls back every earlier normal evidence and its event",async()=>{
 for(const invalidateAtTaskFence of [false,true]){
  const f=fixture({missingTask:id(12),invalidateAtTaskFence}),result:any=await f.run();
  assert.equal(result.error,"task_not_found");
  assert.deepEqual(f.rows(),{evidenceRows:[],events:[],acceptances:[]});assert.equal(f.admissionEpoch(),0);
  assert.ok(f.calls.some(c=>c.sql==="ROLLBACK TO SAVEPOINT decision_acceptance_evidence"));
  assert.equal(f.calls.some(c=>c.sql.includes("INSERT INTO decision_acceptances")),false);
 }
});

test("native acceptance guard failure propagates and rolls back the enclosing transaction",async()=>{
 for(const [options,override] of [[{nativeFailure:true},{}],[{nativeFailure:true,invalidateAtTaskFence:true},{}],[{blockedTask:id(12)},{}],[{},
  {procedureEvidence:{...procedureEvidence,verdict:"failed",observedResult:"Required procedure coverage failed verification"}}]] as const){
  const f=fixture(options);await assert.rejects(f.run(override),/decision_risk_admission_required/);
  assert.equal(f.calls.filter(c=>c.sql.includes("INSERT INTO task_admission_evidence")).length,5);
  assert.ok(f.calls.some(c=>c.sql.includes("INSERT INTO decision_acceptances")));
  assert.deepEqual(f.rows(),{evidenceRows:[],events:[],acceptances:[]});assert.equal(f.admissionEpoch(),0);
 }
});

test("internal compact evidence returns a record identity without claiming admission or probing a seal",async()=>{
 for(const verdict of ["passed","failed"]){
  const f=fixture(),result:any=await admissionCommand(f.db,workspaceId,id(10),ownerId,"evidence",{
   ...procedureEvidence,verdict,requestId:id(21),expectedVersion:"c".repeat(64),operation:"decision_supersede",gate:"procedure"},{compact:true});
  assert.deepEqual(Object.keys(result).sort(),["evidenceId","operation"]);
  assert.equal(result.evidenceId,f.rows().evidenceRows[0].id);assert.equal(result.operation,"decision_supersede");
  assert.equal(f.calls.some(c=>c.sql.includes("task_admission_view")),false);
 }
});

test("expanded impacts are never truncated to the evidence or caller-selected task",async()=>{
 const f=fixture({taskIds:Array.from({length:201},(_,n)=>id(100+n))});
 assert.deepEqual(await f.run(),{error:"decision_impact_too_large"});
 assert.equal(f.rows().evidenceRows.length,0);
 const duplicate=fixture({taskIds:[id(10),id(10)]});
 assert.deepEqual(await duplicate.run(),{error:"decision_scope_invalid"});
 assert.equal(duplicate.rows().evidenceRows.length,0);
});
