import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { computeRisk,riskAssessmentSchema,riskDimensions,riskEntrySchema,type RiskEntry } from "../modules/agent-runtime/task-risk-contract";
const entry=():RiskEntry=>({taskId:randomUUID(),dimensions:Object.fromEntries(riskDimensions.map(d=>[d,{level:"low",rationale:"Bounded synthetic impact",evidence:[{id:randomUUID(),revision:"2026-09-08T00:00:00.000Z"}]}])) as RiskEntry["dimensions"],uncertainty:{level:"none",reasons:"Controlled synthetic fixture",evidence:[{id:randomUUID(),revision:"2026-09-08T00:00:00.000Z"}]},contradictions:[]});
for(const dimension of riskDimensions)test(`maximum includes ${dimension}`,()=>{
 for(const level of ["low","medium","high","critical"] as const){const e=entry();e.dimensions[dimension].level=level;assert.equal(computeRisk([e]).level,level);}
 const missing:any=entry();delete missing.dimensions[dimension];assert.equal(riskEntrySchema.safeParse(missing).success,false);
});
test("uncertainty escalates or fails closed; contradictory evidence cannot be low",()=>{
 const e=entry();e.uncertainty.level="bounded";assert.equal(computeRisk([e]).level,"medium");
 e.dimensions.security.level="high";assert.equal(computeRisk([e]).level,"critical");
 e.uncertainty.level="unverifiable";assert.equal(computeRisk([e]).level,null);
 e.uncertainty.level="none";e.contradictions=["The supporting records disagree"];assert.equal(computeRisk([e]).status,"needs_decision");
});
test("splitting related low changes increases cumulative impact without averaging",()=>{
 assert.equal(computeRisk([entry(),entry()]).level,"medium");
 assert.equal(computeRisk([entry(),entry(),entry(),entry()]).level,"high");
 const e=entry();e.dimensions.legal.level="critical";assert.equal(computeRisk([e,entry()]).level,"critical");
 assert.equal(computeRisk([e,e]).level,null);
});
test("client cannot supply final risk, actor, algorithm or omit joint justification",()=>{
 const body={requestId:randomUUID(),expectedVersion:"a".repeat(64),entries:[entry()],jointRationale:"Reviewed whole change"};
 assert.equal(riskAssessmentSchema.safeParse(body).success,true);
 for(const key of ["level","result","actor","algorithm"]){assert.equal(riskAssessmentSchema.safeParse({...body,[key]:"low"}).success,false);}
 assert.equal(riskAssessmentSchema.safeParse({...body,jointRationale:""}).success,false);
});
