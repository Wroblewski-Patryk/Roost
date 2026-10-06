import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {z} from 'zod';

export const providerSharedAuditVersion='roost-provider-shared-audit-instruction-v1';
const hash=z.string().regex(/^[a-f0-9]{64}$/),id=z.string().uuid();
const source=z.object({executionId:id,evidenceDigest:hash,responseSha256:hash}).strict();
export const providerSharedAuditInstructionSchema=z.object({schemaVersion:z.literal(providerSharedAuditVersion),
 originalInstructionSha256:hash,originalInputDigest:hash,originalSeal:hash.optional(),
 parts:z.tuple([z.string(),z.object({priorAuditFinalResponse:source}).strict(),z.string()])}).strict();
const receipt=z.object({evidenceDigest:hash,digest:hash,preTree:hash,postTree:hash,verdict:z.literal('verified'),
 gitState:z.literal('unchanged').optional(),processState:z.literal('unchanged').optional(),dockerState:z.literal('unchanged').optional(),
 nativeTools:z.array(z.never()).optional(),comparisonScope:z.literal('same_repository_and_per_execution_state').optional()}).strict();
const priorSchema=z.object({schemaVersion:z.literal('roost-prior-readonly-audit-v1'),executionId:id,taskId:id,auditorAgentId:id,
 completedAt:z.string().datetime(),branch:z.string().min(1),commit:z.string().regex(/^[a-f0-9]{40}$/),receipt,
 finalResponse:z.string().min(1).max(10000),digest:hash}).strict();
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const sha=v=>createHash('sha256').update(v).digest('hex'),digest=v=>sha(JSON.stringify(canonical(v)));
const fail=()=>{throw Object.assign(Error('agent_provider_shared_audit_invalid'),{retryable:false,contextAdmission:true});};
function jsonSafe(v,seen=new Set(),depth=0){
 if(depth>40)return false;
 if(v===null||typeof v==='string'||typeof v==='boolean')return true;
 if(typeof v==='number')return Number.isFinite(v)&&!Object.is(v,-0);
 if(!Array.isArray(v)&&!plain(v)||seen.has(v)||Object.getOwnPropertySymbols(v).length)return false;
 const properties=Object.getOwnPropertyDescriptors(v);
 if(Array.isArray(v)){
  if(Object.getPrototypeOf(v)!==Array.prototype||v.length>100000||Object.keys(properties).some(k=>k!=='length'&&!/^(?:0|[1-9][0-9]*)$/.test(k))
   ||Object.keys(properties).length!==v.length+1)return false;
 }
 if(Object.entries(properties).some(([k,p])=>k!=='length'&&(!p.enumerable||!Object.hasOwn(p,'value'))))return false;
 seen.add(v);const ok=Object.entries(properties).every(([k,p])=>Array.isArray(v)&&k==='length'||jsonSafe(p.value,seen,depth+1));seen.delete(v);return ok;
}
function inputSafe(input){if(!plain(input)||!jsonSafe(input)||Buffer.byteLength(JSON.stringify(input))>2097152)fail();}
const frameOf=input=>input.evidence?.ownerInstruction?.value;
const isFrame=v=>plain(v)&&v.schemaVersion===providerSharedAuditVersion;
function wrapped(input){
 const a=input.evidence?.priorAudit,o=input.evidence?.ownerInstruction;
 if(a?.provenance!=='worker.verified_prior_readonly_audit'||a.trust!=='untrusted_evidence'
  ||o?.provenance!=='claimed.prompt.ready_approved'||o.trust!=='untrusted_evidence')fail();
 const parsed=priorSchema.safeParse(a.value);if(!parsed.success)fail();const prior=parsed.data;
 if(prior.receipt.preTree!==prior.receipt.postTree||Buffer.byteLength(prior.finalResponse)>10000)fail();
 // Native audit digest uses its fixed original construction order. Canonical
 // provider serialization may reorder those keys without changing any value.
 const body={schemaVersion:prior.schemaVersion,executionId:prior.executionId,taskId:prior.taskId,auditorAgentId:prior.auditorAgentId,
  completedAt:prior.completedAt,branch:prior.branch,commit:prior.commit,
  receipt:Object.fromEntries(['evidenceDigest','digest','preTree','postTree','verdict','gitState','processState','dockerState','nativeTools','comparisonScope']
   .filter(k=>Object.hasOwn(prior.receipt,k)).map(k=>[k,prior.receipt[k]])),finalResponse:prior.finalResponse};
 if(sha(JSON.stringify(body))!==prior.digest)fail();return prior;
}
function sealValid(input){if(Object.hasOwn(input,'seal')){const {seal,...body}=input;if(!hash.safeParse(seal).success||seal!==digest(body))fail();}}
function restoreFrame(input){
 const parsed=providerSharedAuditInstructionSchema.safeParse(frameOf(input));if(!parsed.success)fail();const frame=parsed.data,prior=wrapped(input),ref=frame.parts[1].priorAuditFinalResponse;
 if(ref.executionId!==prior.executionId||ref.evidenceDigest!==prior.receipt.evidenceDigest||ref.responseSha256!==sha(prior.finalResponse))fail();
 const value=frame.parts[0]+prior.finalResponse+frame.parts[2];if(sha(value)!==frame.originalInstructionSha256)fail();
 const restored=structuredClone(input);restored.evidence.ownerInstruction.value=value;
 delete restored.seal;if(frame.originalSeal!==undefined)restored.seal=frame.originalSeal;
 if(digest(restored)!==frame.originalInputDigest)fail();sealValid(restored);return restored;
}
/** Pure lossless representation. Full prior evidence remains inline and grants
 * no authority. No strings are summarized, trimmed, redacted or omitted. */
export function projectProviderSharedAudit(input){
 inputSafe(input);const value=frameOf(input);
 if(isFrame(value)){assertProviderSharedAudit(input);return input;}
 if(input.evidence?.priorAudit===undefined||typeof value!=='string')return input;
 const text=input.evidence.priorAudit?.value?.finalResponse;
 if(typeof text!=='string'||!text.length)return input;
 const index=value.indexOf(text);
 if(index<0||value.indexOf(text,index+text.length)!==-1)return input;
 const prior=wrapped(input);
 sealValid(input);
 const frame={schemaVersion:providerSharedAuditVersion,originalInstructionSha256:sha(value),originalInputDigest:digest(input),
  ...(Object.hasOwn(input,'seal')?{originalSeal:input.seal}:{}),
  parts:[value.slice(0,index),{priorAuditFinalResponse:{executionId:prior.executionId,evidenceDigest:prior.receipt.evidenceDigest,responseSha256:sha(text)}},value.slice(index+text.length)]};
 const projected=structuredClone(input);projected.evidence.ownerInstruction.value=frame;
 if(Object.hasOwn(input,'seal')){const {seal:_,...body}=projected;projected.seal=digest(body);}
 // A reference is not worthwhile if its metadata costs more than the literal.
 if(Buffer.byteLength(JSON.stringify(canonical(projected)))>=Buffer.byteLength(JSON.stringify(canonical(input))))return input;
 assertProviderSharedAudit(projected,input);return projected;
}
export function restoreProviderSharedAudit(input){
 inputSafe(input);if(!isFrame(frameOf(input)))return input;sealValid(input);return restoreFrame(input);
}
/** Optional original is a caller-held authority/source comparison, never a
 * packet-supplied approval. Self-contained hashes prove representation only. */
export function assertProviderSharedAudit(input,expectedOriginal){
 const restored=restoreProviderSharedAudit(input);
 if(expectedOriginal!==undefined){inputSafe(expectedOriginal);if(!isDeepStrictEqual(restored,expectedOriginal)||digest(restored)!==digest(expectedOriginal))fail();}
 return true;
}
