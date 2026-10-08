import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {executionContractSchema} from './lib/agent-host-execution-packet.mjs';
import shared from './lib/agent-host-release-inspection-contract.cjs';
import {validPacketFixture} from './fixtures/execution-packet.mjs';
const pin={schemaVersion:'roost-governed-release-inspection-v1',commit:'a'.repeat(40),tree:'b'.repeat(40),
 manifestDigest:'c'.repeat(64),scopeDigest:'d'.repeat(64),imageDigest:'sha256:'+'e'.repeat(64),minimumObservationSeconds:1200,minimumRestoredActivitySeconds:300};
test('static inspection is admitted only on the existing read-only auditor boundary',()=>{
 const c=validPacketFixture().packet.contract;
 c.nativeBoundary={profile:'inspect-readonly',readPaths:['README.md'],runtime:{required:false,ports:[]},inspectReadOnly:{kind:'auditor'},releaseInspection:pin};
 assert.equal(executionContractSchema.safeParse(c).success,true);
 c.nativeBoundary.inspectReadOnly={kind:'verifier',verifiedExecutionId:randomUUID(),verifiedEvidenceDigest:'a'.repeat(64)};
 assert.equal(executionContractSchema.safeParse(c).success,false);
});
test('future selection contains only UUID selectors, never evidence or a path',()=>{
 const v={schemaVersion:'roost-release-verification-selection-v1',releaseId:randomUUID(),custodyEvidenceId:randomUUID()};
 assert.equal(shared.releaseVerificationSelectionSchema.safeParse(v).success,true);
 for(const extra of [{file:'C:/foreign.json'},{evidence:{healthy:true}},{releaseAuthority:true}])assert.equal(shared.releaseVerificationSelectionSchema.safeParse({...v,...extra}).success,false);
 assert.equal(shared.releaseVerificationSelectionSchema.safeParse({...v,custodyEvidenceId:'../foreign'}).success,false);
});
test('serialization cannot omit the fixed outcome or stored-provenance validators',()=>{
 const args={inspection:pin,applicationId:randomUUID(),hostId:randomUUID(),agentId:randomUUID()};
 assert.throws(()=>shared.assertCompletedReleaseInspection({},args),/canonical_validator_required/);
 assert.throws(()=>shared.assertCompletedReleaseInspection({},{...args,validateOutcome:()=>null}),/stored_proof_validator_required/);
});
