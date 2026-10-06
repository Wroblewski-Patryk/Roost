import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseOutcomeError,releaseOutcomeSchema} from '../modules/agent-runtime/governed-release-contract';
// Fictional protocol inventory; this does not attest a native process or target.
const {compatibleFailureFixture}=require('../../scripts/agent-host-release-compatible-failure.test.mjs');
const input=(f:any)=>({requestId:f.operation.intent.requestId,status:'reconciled',reconciledStatus:f.evidence.compatibleRecoveryFailure.kind.endsWith('_absent')?'absent':'failed',observationOnly:true,evidence:f.evidence});
for(const kind of ['configuration_absent','deployment_absent','deployment_failed'])test('compatible '+kind+' has a typed terminal freeze without a healthy baseline',()=>{
 const f=compatibleFailureFixture(kind),release={id:f.s.releaseId,snapshot:f.s};
 assert.equal(releaseOutcomeSchema.safeParse(input(f)).success,true);
 assert.equal(releaseOutcomeError(release,f.operation,input(f),[f.operation]),null);
 assert.notEqual(releaseOutcomeError({...release,id:'11111111-1111-4111-8111-111111111111'},f.operation,input(f),[f.operation]),null);
 assert.notEqual(releaseOutcomeError(release,f.operation,{...input(f),status:'succeeded'},[f.operation]),null);
});
test('failed observation must reference its own earlier successful deployment in actual normal journal',()=>{
 const f=compatibleFailureFixture('observation_failed'),release={id:f.s.releaseId,snapshot:f.s},body=input(f);
 assert.equal(releaseOutcomeError(release,f.operation,body,[f.deploy,f.operation]),null);
 for(const journal of [[f.operation],[f.operation,f.deploy],[{...f.deploy,releaseId:'11111111-1111-4111-8111-111111111111'},f.operation],[{...f.deploy,outcome:{...f.deploy.outcome,id:'11111111-1111-4111-8111-111111111111'}},f.operation]])
  assert.notEqual(releaseOutcomeError(release,f.operation,body,journal),null);
});
