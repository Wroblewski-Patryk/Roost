import assert from "node:assert/strict";
import test from "node:test";
import { reviewDecisionSchema, reviewActionSchema, correctionDraft, exactReviewCommit, managerCorrectionCompetencies, nativeBoundaryResultBlocked, reviewDigest } from "../modules/agent-runtime/task-review-contract";
const id="00000000-0000-4000-8000-000000000001";
test("uncommitted byte evidence changes invalidate the review material digest",()=>{
  const result={commit:"a".repeat(40),verification:{workspaceEvidence:{seal:"b".repeat(64),manifest:[{path:"source.ts",working:{sha256:"c".repeat(64)}}]}}};
  const changed=structuredClone(result);changed.verification.workspaceEvidence.manifest[0].working.sha256="d".repeat(64);
  assert.notEqual(reviewDigest(result),reviewDigest(changed));
});
const reject = { requestId:id, executionId:id, expectedVersion:"a".repeat(64), materialVersion:"b".repeat(64), decision:"reject", summary:"Invalid empty input", reproduction:["Submit an empty fixture"], expected:"A validation message", observed:"An exception is thrown", evidence:[{kind:"test",reference:"npm test -- parser",result:"Empty-input case fails"}], correction:{scope:["Handle empty parser input"],excluded:["No other parser behavior"],outcome:"Empty input returns a validation message",competencies:["javascript"]} };
test("complete rejection and approval are accepted",()=>{
  assert.ok(reviewDecisionSchema.safeParse(reject).success);
  const {reproduction,expected,observed,correction,...approve}=reject;
  assert.ok(reviewDecisionSchema.safeParse({...approve,decision:"approve",reviewedCommit:"c".repeat(40),evidence:[{kind:"test",reference:"npm test -- parser",result:"Empty-input case passes",verdict:"pass"}]}).success);
  assert.equal(reviewDecisionSchema.safeParse({...approve,decision:"approve",reviewedCommit:"c".repeat(40)}).success,false);
  assert.equal(reviewDecisionSchema.safeParse({...approve,decision:"approve",reviewedCommit:"c".repeat(40),evidence:[{kind:"test",reference:"npm test -- parser",result:"Empty-input case fails",verdict:"fail"}]}).success,false);
});
test("exact review commit requires a clean typed receipt bound to the host and checkpoint",()=>{
  const hostId="00000000-0000-4000-8000-000000000002", branch="codex/task-1", commit="c".repeat(40);
  const execution={id,attempt:1,agentHostId:hostId,checkpointVersion:3,metadata:{resultRevisionReviewVersion:"1"}};
  const result={contract:{singleTask:{branch}},resultRevision:{schemaVersion:"roost-result-revision-v1",id,executionId:id,attempt:1,hostId,checkpointVersion:3,observedAt:new Date().toISOString(),commit,branch,workingTree:"clean"}};
  assert.equal(exactReviewCommit(result,execution),commit);
  for(const revision of [{...result.resultRevision,workingTree:"dirty"},{...result.resultRevision,branch:"main"},{...result.resultRevision,checkpointVersion:2},{...result.resultRevision,commit:"short"}])
    assert.equal(exactReviewCommit({...result,resultRevision:revision},execution),null);
  assert.equal(exactReviewCommit(result,{...execution,metadata:{}}),null);
});
test("read-only completion requires a verified unchanged zero-tool receipt",()=>{
 const contract={nativeBoundary:{profile:"inspect-readonly"}};
 const receipt={schemaVersion:"roost-readonly-audit-v1",verdict:"verified",evidenceDigest:"a".repeat(64),preTree:"b".repeat(64),postTree:"b".repeat(64),processState:"unchanged",dockerState:"unchanged",gitState:"unchanged",nativeTools:[]};
 assert.equal(nativeBoundaryResultBlocked({readOnlyAudit:receipt},contract),false);
 for(const bad of [{...receipt,postTree:"c".repeat(64)},{...receipt,nativeTools:["terminal"]},{...receipt,processState:"changed"}])
   assert.equal(nativeBoundaryResultBlocked({readOnlyAudit:bad},contract),true);
 assert.equal(nativeBoundaryResultBlocked({},contract),true);
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
  assert.ok(reviewActionSchema.safeParse({...input,competencies:["governed coding"]}).success);
  assert.equal(reviewActionSchema.safeParse({...input,competencies:[]}).success,false);
  assert.equal(reviewActionSchema.safeParse({...input,childTasks:[id,id]}).success,false);
  assert.equal(reviewActionSchema.safeParse({...input,action:"create_specialist_task"}).success,false);
});
test("manager retains a previously assigned competency only with a recorded explanation",()=>{
  const recommended=["Node.js filesystem and symlink semantics","path-containment security testing"];
  const assigned=["governed coding"];
  assert.deepEqual(managerCorrectionCompetencies(recommended,assigned,["governed coding"]),{error:"task_review_competency_rationale_required"});
  assert.deepEqual(managerCorrectionCompetencies(recommended,assigned,["unassigned specialty"],"Manager reviewed the task"),{error:"task_review_competencies_expanded"});
  const mapped=managerCorrectionCompetencies(recommended,assigned,["governed coding"],"The assigned executor retains the governed coding scope; the focused symlink regression and independent review remain mandatory.");
  if ("error" in mapped) throw new Error(mapped.error);
  assert.deepEqual(mapped.competencies,["governed coding"]);
  assert.equal(mapped.managerCompetencyRationale?.startsWith("The assigned executor"),true);
  assert.deepEqual(recommended,["Node.js filesystem and symlink semantics","path-containment security testing"]);
});
test("correction drafts have a distinct task identity and require measurement review",()=>{
 const original={objective:{outcome:"Original"},scope:{},assignment:{},taskRoles:{},singleTask:{component:{id},branch:"main"}};
 const draft=correctionDraft(original,id,{id,role:"developer",updatedAt:new Date("2026-01-01")},reject.correction);
 assert.equal(draft.singleTask.contractId,`roost-task:${id}`);assert.equal(draft.singleTask.branch,`codex/task-${id}`);assert.equal(draft.singleTask.measurement.metric,"");
 assert.equal(draft.objective.outcome,reject.correction.outcome);assert.equal(original.objective.outcome,"Original");
 assert.equal(reviewDigest({b:1,a:2}),reviewDigest({a:2,b:1}));
});
