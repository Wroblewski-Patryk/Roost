import test from "node:test";
import assert from "node:assert/strict";
import { compositionExceptionSchema, procedureContractSchema } from "../modules/agent-runtime/procedure-composition-contract";
const id="00000000-0000-4000-8000-000000000001";
const base=()=>({kind:"base",taskType:"code_change",operation:"runtime_execute",applicationId:null,componentId:null,baseProcedureId:null,
 inputs:["Exact input"],outputs:["Exact result"],evidence:["Verified evidence"],completion:["Checks passed"],roles:["requester","accountableManager","executor","verifier","releaser"],tools:["repository_read"],
 steps:[{key:"inspect",instruction:"Inspect the exact component",role:"executor",tools:["repository_read"],inputs:[],outputs:[],evidence:[],requires:[]}]});
test("versioned base accepts an explicit bounded contract",()=>assert.equal(procedureContractSchema.safeParse(base()).success,true));
for(const [name,mutate] of Object.entries({
 "missing inputs":(b:any):any=>b.inputs=[],"removed roles":(b:any):any=>b.roles=["executor"],"self dependency":(b:any):any=>b.steps[0].requires=["inspect"],
 "forward dependency":(b:any):any=>b.steps[0].requires=["future"],"duplicate steps":(b:any):any=>b.steps.push({...b.steps[0]}),"tool widening":(b:any):any=>b.steps[0].tools=["release"],
 "risk override":(b:any):any=>b.riskGates=[],"nested composition":(b:any):any=>b.extends=id,"oversized plan":(b:any):any=>b.steps=Array(51).fill(b.steps[0]),"wrong application binding":(b:any):any=>b.applicationId=id,
 "incomplete extension":(b:any):any=>b.kind="extension"
}))test(`contract rejects ${name}`,()=>{const b=base();mutate(b);assert.equal(procedureContractSchema.safeParse(b).success,false);});
test("exception is exactly one omission, never a risk/role/tool waiver",()=>{
 const body={requestId:id,expectedVersion:"a".repeat(64),operation:"runtime_execute",missing:"extension",decision:"approve_exact_missing_element",rationale:"Exact temporary omission"};
 assert.equal(compositionExceptionSchema.safeParse(body).success,true);
 for(const missing of ["risk","backup","roles","all"])assert.equal(compositionExceptionSchema.safeParse({...body,missing}).success,false);
 assert.equal(compositionExceptionSchema.safeParse({...body,expiresAt:"2099-01-01T00:00:00.000Z"}).success,false);
 assert.equal(compositionExceptionSchema.safeParse({...body,tools:["release"]}).success,false);
});
