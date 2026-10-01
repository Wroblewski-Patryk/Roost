import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { releaseExecutionBasisCurrent } from "../modules/agent-runtime/governed-release";
import { riskInputHash } from "../modules/agent-runtime/task-risk";

// Exercise the production current-basis validator, with only the database read
// boundary supplied by this fixture. Native and actual database proofs are
// separate; these regressions prohibit a completed result from bypassing drift.
function fixture(drift: string) {
  const workspaceId=randomUUID(),taskId=randomUUID(),applicationId=randomUUID();
  const revision="a".repeat(64),riskId=randomUUID();
  const pin:any={schemaVersion:"roost-ready-context-v1",status:"ready",pinId:randomUUID(),revision,
    sourceWatchVersion:"1",submissionId:randomUUID(),applicationId,riskAssessmentId:riskId,
    riskAdmissionSeal:"admission-current",procedureComposition:{seal:"procedure-current"},
    validation:{validator:"execution-packet-v1",revision},contract:{},interviewVersion:"1"};
  if(drift==="pin")pin.status="needs_revalidation";
  const execution:any={id:randomUUID(),taskId,applicationId,status:"completed",completedAt:new Date(),
    agentHostId:randomUUID(),metadata:{readyContextPin:{pinId:pin.pinId,revision}}};
  if(drift==="context")execution.contextInvalidatedAt=new Date();
  const reads:string[]=[],before=structuredClone(pin);
  const forbidden=()=>{throw Error("current release-basis check must not mutate or repin");};
  const db:any={task:{findFirst:async()=>({id:taskId,workspaceId,executionReadiness:pin}),update:forbidden},
    event:{create:forbidden},taskReviewDecision:{findFirst:async()=>null},taskReviewAction:{findUnique:async()=>null},
    $executeRaw:forbidden,$queryRaw:async(strings:TemplateStringsArray)=>{
      const sql=strings.join("?");reads.push(sql);
      if(sql.includes("finding_task_current"))return [{value:drift!=="finding"}];
      if(sql.includes("task_interview_pending"))return [{pending:false,present:false,version:"1",value:false}];
      if(sql.includes("native_capability_blocked"))return [{blocked:false}];
      if(sql.includes("task_risk_sources"))return [{current:drift==="risk"?randomUUID():riskId,sourceVersion:"current",sources:[],head:riskId}];
      if(sql.includes("input_hash FROM task_risk_scopes"))return [{input_hash:riskInputHash(pin)}];
      if(sql.includes("task_admission_view"))return [{value:{seal:drift==="admission"?null:"admission-current",expiresAt:drift==="admission"?new Date(0).toISOString():new Date(Date.now()+60000).toISOString()}}];
      if(sql.includes("task_composition"))return [{value:{seal:drift==="procedure"?"procedure-changed":"procedure-current"}}];
      throw Error(`unexpected read in drift regression: ${sql}`);
    }};
  return {db,workspaceId,execution,pin,before,reads};
}

for(const drift of ["pin","context","finding","risk","admission","procedure"]) {
  test(`completed candidate or release audit rejects current ${drift} drift without repinning`,async()=>{
    for(const role of ["candidate","release audit"]) {
      const f=fixture(drift);
      assert.equal(await releaseExecutionBasisCurrent(f.db,f.workspaceId,f.execution),false,role);
      assert.deepEqual(f.pin,f.before);
      assert.ok(f.reads.every(sql=>!sql.includes("FOR UPDATE")));
    }
  });
}

test("a missing completed execution cannot retain a release basis",async()=>{
  assert.equal(await releaseExecutionBasisCurrent({} as any,randomUUID(),null),false);
});
