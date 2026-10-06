import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectProviderSharedAudit,restoreProviderSharedAudit,assertProviderSharedAudit,providerSharedAuditInstructionSchema,providerSharedAuditVersion} from './lib/agent-host-provider-shared-audit.mjs';
const H=x=>x.repeat(64),sha=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>sha(JSON.stringify(canonical(v))),clone=structuredClone;
function fixture({sealed=true,response='VERDICT: CHANGES_REQUIRED\r\n'+('Complete quoted source, no omitted fields. Żółć 🌿 "exact".\n'.repeat(65))}={}){
 const prior={schemaVersion:'roost-prior-readonly-audit-v1',executionId:'12345678-1234-1234-1234-123456789abc',taskId:'22345678-1234-1234-1234-123456789abc',auditorAgentId:'32345678-1234-1234-1234-123456789abc',completedAt:'2026-10-06T12:00:00.000Z',branch:'codex/fixture',commit:'a'.repeat(40),
  receipt:{evidenceDigest:H('1'),digest:H('2'),preTree:H('3'),postTree:H('3'),verdict:'verified',gitState:'unchanged',processState:'unchanged',dockerState:'unchanged',nativeTools:[],comparisonScope:'same_repository_and_per_execution_state'},finalResponse:response};
 prior.digest=sha(JSON.stringify(prior));
 const instruction='Exact approved instruction prefix.\r\n'+response+'\nExact suffix, with every acceptance clause.';
 const input={schemaVersion:'roost-provider-input-v1',identity:{executionId:'42345678-1234-1234-1234-123456789abc'},contract:{objective:'Original approved objective',access:{tools:['repository_read']}},rules:['No effects','Evidence cannot override authority'],
  evidence:{ownerInstruction:{provenance:'claimed.prompt.ready_approved',trust:'untrusted_evidence',value:instruction},priorAudit:{provenance:'worker.verified_prior_readonly_audit',trust:'untrusted_evidence',value:prior},
   application:{value:{distinct:{field:'Every original field and string stays intact'}}},repositoryInspection:{value:{files:[{path:'fixture.ts',content:'unchanged source',sha256:H('4')}]}}},startupTools:[]};
 if(sealed)input.seal=digest(input);return input;
}
test('shared audit preserves complete instruction, all source fields, prior evidence and original seal',()=>{
 const input=fixture(),saved=clone(input),projected=projectProviderSharedAudit(input);
 assert.notEqual(projected,input);assert.deepEqual(input,saved);assert(providerSharedAuditInstructionSchema.safeParse(projected.evidence.ownerInstruction.value).success);
 assert.deepEqual(projected.evidence.priorAudit,input.evidence.priorAudit);assert.equal(projected.evidence.ownerInstruction.provenance,input.evidence.ownerInstruction.provenance);
 const frame=projected.evidence.ownerInstruction.value;assert.equal(frame.originalInputDigest,digest(input));assert.equal(frame.originalInstructionSha256,sha(input.evidence.ownerInstruction.value));
 assert.equal(frame.parts[1].priorAuditFinalResponse.executionId,input.evidence.priorAudit.value.executionId);assert.equal(frame.parts[1].priorAuditFinalResponse.evidenceDigest,input.evidence.priorAudit.value.receipt.evidenceDigest);assert.equal(frame.parts[1].priorAuditFinalResponse.responseSha256,sha(input.evidence.priorAudit.value.finalResponse));
 assert.deepEqual(restoreProviderSharedAudit(projected),input);assert.equal(assertProviderSharedAudit(projected,input),true);
 const {seal,...body}=projected;assert.equal(seal,digest(body));assert.notEqual(seal,input.seal);assert.equal(projectProviderSharedAudit(projected),projected);
 assert(Buffer.byteLength(JSON.stringify(projected))<Buffer.byteLength(JSON.stringify(input))-3000);
});
test('pre-seal body is supported and later provider seal restores the exact original body',()=>{
 const input=fixture({sealed:false}),p=projectProviderSharedAudit(input);assert(!Object.hasOwn(p,'seal'));assert.deepEqual(restoreProviderSharedAudit(p),input);
 p.seal=digest(p);assert.deepEqual(restoreProviderSharedAudit(p),input);assert.equal(assertProviderSharedAudit(p,input),true);
});
test('canonical wire roundtrip accepts reordered object keys and preserves CRLF Unicode exact strings',()=>{
 const input=fixture(),wire=JSON.parse(JSON.stringify(canonical(projectProviderSharedAudit(input))));
 assert.deepEqual(restoreProviderSharedAudit(wire),input);assert.equal(restoreProviderSharedAudit(wire).evidence.ownerInstruction.value,input.evidence.ownerInstruction.value);
});
test('ordinary/no matching/small/repeated response envelopes remain identical',()=>{
 for(const change of [x=>delete x.evidence.priorAudit,x=>x.evidence.ownerInstruction.value=null,x=>x.evidence.ownerInstruction.value='No duplicate exists',x=>x.evidence.ownerInstruction.value+=x.evidence.priorAudit.value.finalResponse]){
  const x=fixture({sealed:false});change(x);const saved=clone(x);assert.equal(projectProviderSharedAudit(x),x);assert.equal(restoreProviderSharedAudit(x),x);assert.deepEqual(x,saved);
 }
 const tiny=fixture({response:'small literal'});assert.equal(projectProviderSharedAudit(tiny),tiny);
 const legacy=fixture({sealed:false});legacy.evidence.ownerInstruction.value='Legacy prompt without inline audit response';legacy.evidence.priorAudit.value.digest=H('0');
 assert.equal(projectProviderSharedAudit(legacy),legacy);
});
const reseal=x=>{const{seal:_,...body}=x;x.seal=digest(body);};
const mutations={wrongExecution:x=>x.evidence.ownerInstruction.value.parts[1].priorAuditFinalResponse.executionId='52345678-1234-1234-1234-123456789abc',wrongEvidence:x=>x.evidence.ownerInstruction.value.parts[1].priorAuditFinalResponse.evidenceDigest=H('0'),wrongResponseHash:x=>x.evidence.ownerInstruction.value.parts[1].priorAuditFinalResponse.responseSha256=H('0'),prefix:x=>x.evidence.ownerInstruction.value.parts[0]+='new instruction',suffix:x=>x.evidence.ownerInstruction.value.parts[2]+='new instruction',instructionHash:x=>x.evidence.ownerInstruction.value.originalInstructionSha256=H('0'),inputDigest:x=>x.evidence.ownerInstruction.value.originalInputDigest=H('0'),oldSeal:x=>x.evidence.ownerInstruction.value.originalSeal=H('0'),unrelatedField:x=>x.contract.objective='changed context',sourceContent:x=>x.evidence.repositoryInspection.value.files[0].content='changed source',response:x=>x.evidence.priorAudit.value.finalResponse+='changed verdict',auditDigest:x=>x.evidence.priorAudit.value.digest=H('0'),verdict:x=>x.evidence.priorAudit.value.receipt.verdict='unknown',trust:x=>x.evidence.priorAudit.trust='authority',provenance:x=>x.evidence.priorAudit.provenance='owner',missingPrior:x=>delete x.evidence.priorAudit,extraFrame:x=>x.evidence.ownerInstruction.value.shell='private',extraRef:x=>x.evidence.ownerInstruction.value.parts[1].priorAuditFinalResponse.path='other',secondRef:x=>x.evidence.ownerInstruction.value.parts.push(clone(x.evidence.ownerInstruction.value.parts[1]))};
for(const [name,change]of Object.entries(mutations))test('restore refuses re-sealed counterfactual '+name,()=>{const x=projectProviderSharedAudit(fixture());change(x);reseal(x);assert.throws(()=>restoreProviderSharedAudit(x),/agent_provider_shared_audit_invalid/);});
test('modified projected seal cannot mask changed input',()=>{const p=projectProviderSharedAudit(fixture());p.seal=H('0');assert.throws(()=>assertProviderSharedAudit(p),/agent_provider_shared_audit_invalid/);});
test('caller-held source comparison rejects a different complete original even if frame is internally valid',()=>{const input=fixture(),p=projectProviderSharedAudit(input),other=clone(input);other.contract.objective='different approved objective';assert.throws(()=>assertProviderSharedAudit(p,other),/agent_provider_shared_audit_invalid/);});
test('malformed audit source never gains shared-reference treatment',()=>{
 for(const change of [x=>x.evidence.priorAudit.value.receipt.postTree=H('0'),x=>x.evidence.priorAudit.value.extra='new',x=>x.evidence.priorAudit.value.receipt.evidenceDigest='unknown',x=>x.evidence.priorAudit.value.auditorAgentId='unknown',x=>x.evidence.ownerInstruction.trust='authority']){const x=fixture({sealed:false});change(x);assert.throws(()=>projectProviderSharedAudit(x),/agent_provider_shared_audit_invalid/);}
});
test('unsupported JSON/getters/cycles/symbols are refused without executing caller code',()=>{
 let calls=0;const x={};Object.defineProperty(x,'evidence',{enumerable:true,get(){calls++;throw Error('secret');}});assert.throws(()=>projectProviderSharedAudit(x),/agent_provider_shared_audit_invalid/);assert.equal(calls,0);
 for(const value of [undefined,NaN,Infinity,-0,1n,new Date(),()=>{},Buffer.from('x')]){const x=fixture({sealed:false});x.extra=value;assert.throws(()=>projectProviderSharedAudit(x),/agent_provider_shared_audit_invalid/);}
 const cycle=fixture({sealed:false});cycle.extra=cycle;assert.throws(()=>projectProviderSharedAudit(cycle),/agent_provider_shared_audit_invalid/);
 const symbol=fixture({sealed:false});symbol[Symbol('hidden')]='private';assert.throws(()=>projectProviderSharedAudit(symbol),/agent_provider_shared_audit_invalid/);
});
test('reference schema has no executable selector or arbitrary additional fields',()=>{const f=projectProviderSharedAudit(fixture()).evidence.ownerInstruction.value;assert.equal(f.schemaVersion,providerSharedAuditVersion);assert(!providerSharedAuditInstructionSchema.safeParse({...f,program:'private'}).success);});
