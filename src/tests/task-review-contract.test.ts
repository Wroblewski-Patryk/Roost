import assert from "node:assert/strict";
import test from "node:test";
import { reviewDecisionSchema, reviewActionSchema, correctionDraft, reviewDigest } from "../modules/agent-runtime/task-review-contract";
const id="00000000-0000-4000-8000-000000000001";
const reject = { requestId:id, executionId:id, expectedVersion:"a".repeat(64), materialVersion:"b".repeat(64), decision:"reject", summary:"Invalid empty input", reproduction:["Submit an empty fixture"], expected:"A validation message", observed:"An exception is thrown", evidence:[{kind:"test",reference:"npm test -- parser",result:"Empty-input case fails"}], correction:{scope:["Handle empty parser input"],excluded:["No other parser behavior"],outcome:"Empty input returns a validation message",competencies:["javascript"]} };
test("complete rejection and approval are accepted",()=>{
  assert.ok(reviewDecisionSchema.safeParse(reject).success);
  const {reproduction,expected,observed,correction,...approve}=reject;
  assert.ok(reviewDecisionSchema.safeParse({...approve,decision:"approve"}).success);
});
for(const name of ["summary","reproduction","expected","observed","evidence","correction","expectedVersion","materialVersion"]){
  test(`rejection requires ${name}`,()=>{const input:any=structuredClone(reject);delete input[name];assert.equal(reviewDecisionSchema.safeParse(input).success,false);});
}
test("review cannot carry implementation effects or credential-shaped evidence",()=>{
  for(const extra of [{assignedWorkforceEntityId:id},{branch:"main"},{files:["source.ts"]},{summary:"api_key=synthetic-secret"}])assert.equal(reviewDecisionSchema.safeParse({...reject,...extra}).success,false);
});
test("manager disposition is explicit and rejects ambiguous alternatives",()=>{
  const input={requestId:id,expectedVersion:"a".repeat(64),reviewId:id,action:"return_to_executor",scope:reject.correction.scope};
  assert.ok(reviewActionSchema.safeParse(input).success);
  assert.equal(reviewActionSchema.safeParse({...input,childTasks:[id,id]}).success,false);
  assert.equal(reviewActionSchema.safeParse({...input,action:"create_specialist_task"}).success,false);
});
test("correction drafts have a distinct task identity and require measurement review",()=>{
 const original={objective:{outcome:"Original"},scope:{},assignment:{},taskRoles:{},singleTask:{component:{id},branch:"main"}};
 const draft=correctionDraft(original,id,{id,role:"developer",updatedAt:new Date("2026-01-01")},reject.correction);
 assert.equal(draft.singleTask.contractId,`roost-task:${id}`);assert.equal(draft.singleTask.branch,`codex/task-${id}`);assert.equal(draft.singleTask.measurement.metric,"");
 assert.equal(draft.objective.outcome,reject.correction.outcome);assert.equal(original.objective.outcome,"Original");
 assert.equal(reviewDigest({b:1,a:2}),reviewDigest({a:2,b:1}));
});
