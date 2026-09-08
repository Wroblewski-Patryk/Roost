import test from "node:test";
import assert from "node:assert/strict";
import { admissionScopeSchema, admissionEvidenceSchema } from "../modules/agent-runtime/task-risk-admission-contract";
test("client cannot omit target classification or provide final gates or issuer",()=>{
 const scope={requestId:"00000000-0000-4000-8000-000000000001",expectedVersion:"a".repeat(64),taskType:"migration",environment:"production",destructive:true,commit:"a".repeat(40),targetId:"00000000-0000-4000-8000-000000000002",releaseId:"00000000-0000-4000-8000-000000000003",procedureId:"00000000-0000-4000-8000-000000000004",rationale:"Exact synthetic boundary"};
 assert.equal(admissionScopeSchema.safeParse(scope).success,true);
 for(const key of ["environment","destructive","commit","targetId","releaseId","procedureId"]){const copy:any={...scope};delete copy[key];assert.equal(admissionScopeSchema.safeParse(copy).success,false);}
 assert.equal(admissionScopeSchema.safeParse({...scope,requiredGates:[]}).success,false);
 assert.equal(admissionEvidenceSchema.safeParse({gate:"owner_approval",actorUserId:scope.targetId}).success,false);
});
test("backup evidence requires artifact identity and current verification fields",()=>{
 const body={requestId:"00000000-0000-4000-8000-000000000001",expectedVersion:"a".repeat(64),operation:"runtime_execute",gate:"backup",verdict:"passed",evidence:{id:"00000000-0000-4000-8000-000000000002",revision:"2026-09-08T00:00:00.000Z"},rationale:"Synthetic exact verification",artifact:{reference:"Synthetic archive",digest:"b".repeat(64),bytes:100,capturedAt:"2026-09-08T00:00:00.000Z"},validation:"Read isolated archive",observedResult:"Archive verified"};
 assert.equal(admissionEvidenceSchema.safeParse(body).success,true);
 for(const key of ["artifact","validation","observedResult","evidence"]){const copy:any={...body};delete copy[key];assert.equal(admissionEvidenceSchema.safeParse(copy).success,false);}
 assert.equal(admissionEvidenceSchema.safeParse({...body,expiresAt:"2099-01-01T00:00:00Z"}).success,false);
});
