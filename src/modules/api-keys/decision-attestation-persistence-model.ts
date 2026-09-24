import {z} from 'zod';import type {Prisma} from '@prisma/client';import {randomUUID} from 'node:crypto';
import {signedDecisionBinding,signedDecisionWriters,signedDecisionGap} from './bootstrap-signed-decision-contract';
import {freezePublic} from './worker-transport-snapshot';
import {attestationDigest as digest,attestationKeyEvent,projectAttestationKeys,nextAttestationKeyEvent} from './decision-attestation-key-model';

const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),epoch=z.number().int().positive().safe(),time=z.string().datetime();
export const attestationWriters=[...signedDecisionWriters,'attest','owner_auth_evidence','interview_acceptance_effect','ceremony_start','dispatch','complete'] as const;
const ceremony=signedDecisionBinding.innerType().omit({version:true,signingKeyId:true,signingKeyRevision:true,signingKeyEpoch:true,signingPublicKeyDigest:true,signingKeyHistoryDigest:true});
export const ownerAuthenticationEvidence=z.object({version:z.literal('roost-owner-auth-evidence-v1'),workspaceId:id,ownerId:id,acceptanceId:id,
 level:z.enum(['roost_session','roost_session_2fa','webauthn']),authTime:time,acceptedAt:time,sessionEvidenceDigest:hash,policyRevision:epoch}).strict();
const canonical=z.object({ceremony,primaryOwnerId:id,ownerMembershipIds:z.array(id).max(100),candidateCount:z.number().int().nonnegative(),
 status:z.enum(['proposed','accepted','superseded','revoked','expired','rejected','deleted']),authorityRevision:z.number().int().nonnegative().safe(),
 acceptance:z.object({id,ownerId:id,workspaceId:id,decisionId:id,revision:epoch,acceptedAt:time,authority:z.literal('owner_reserved'),
  actorAgentId:z.null(),actorCredentialId:z.null()}).strict().nullable(),auth:ownerAuthenticationEvidence.nullable()}).strict();
export const attestationPayload=ceremony.extend({version:z.literal('owner-decision-attestation-v1'),authorityRevision:epoch,
 ownerAuthEvidenceDigest:hash,ownerAuthLevel:ownerAuthenticationEvidence.shape.level,signingKeyId:id,signingKeyRevision:epoch,
 signingKeyEpoch:epoch,signingPublicKeyDigest:hash,signingKeyHistoryDigest:hash}).strict();
const attestation=z.object({id,payload:attestationPayload,signature:z.string().regex(/^[a-f0-9]{128}$/),at:time}).strict();
const seal=z.object({id,decisionId:id,acceptanceId:id,ticketId:id,authorityRevision:epoch,attestationDigest:hash,sourceDigest:hash,
 startFence:epoch,lastFence:epoch,state:z.enum(['started','dispatched','completed'])}).strict();
const journal=z.object({id,revision:epoch,writer:z.enum(attestationWriters),authorityRevision:z.number().int().nonnegative().safe(),
 fence:epoch,stateDigest:hash,previousDigest:hash.nullable(),at:time}).strict();
const receipt=z.object({journalId:id,eventId:id,eventDigest:hash,fence:epoch,stateDigest:hash}).strict();
export const attestationModelState=z.object({qualification:z.literal('synthetic_attestation_persistence_v1'),canonical,
 keys:z.array(attestationKeyEvent).max(1000),attestations:z.array(attestation).max(1000),seals:z.array(seal).max(1000),
 journal:z.array(journal).max(2000),receipts:z.array(receipt).max(2000),fence:epoch,
 guards:z.array(z.object({writer:z.enum(attestationWriters),enabled:z.literal(true),binding:z.literal('exact'),definition:z.literal('reviewed'),
  configuration:z.literal('exact')}).strict()).length(attestationWriters.length),origin:z.literal(true)}).strict();
export type AttestationModelState=z.infer<typeof attestationModelState>;
type Db=Prisma.TransactionClient;type State=AttestationModelState;type Attestation=z.infer<typeof attestation>;
const same=(a:unknown,b:unknown)=>digest('owner-decision-model-comparison-v1',a)===digest('owner-decision-model-comparison-v1',b);
function deny(reason='attestation_persistence_denied'):never{throw Error(reason);}
export const attestationRecordDigest=(a:Attestation)=>digest('owner-decision-attestation-envelope-v1',a);
const stateDigest=(s:State)=>digest('owner-decision-persistence-state-v1',{canonical:s.canonical,keys:s.keys,attestations:s.attestations,seals:s.seals});
export function inspectAttestationState(input:unknown,now=new Date()){
 const s=attestationModelState.parse(input),c=s.canonical;if(!Number.isFinite(now.getTime())||!same(s.guards.map(g=>g.writer),attestationWriters)||s.journal.length!==s.receipts.length)deny();
 let previous:z.infer<typeof journal>|undefined,lastFence=0;const ids=new Set<string>(),events=new Set<string>();
 for(let i=0;i<s.journal.length;i++){const j=s.journal[i],r=s.receipts[i];
  if(ids.has(j.id)||events.has(r.eventId)||j.revision!==i+1||j.previousDigest!==(previous?digest('owner-decision-journal-v1',previous):null)||
   j.fence<=lastFence||j.fence!==r.fence||j.stateDigest!==r.stateDigest||r.journalId!==j.id||r.eventDigest!==digest('owner-decision-journal-v1',j)||
   Date.parse(j.at)>now.getTime()||previous&&Date.parse(j.at)<Date.parse(previous.at)||previous&&j.authorityRevision<previous.authorityRevision)deny('attestation_audit_missing_or_stale');
  ids.add(j.id);events.add(r.eventId);previous=j;lastFence=j.fence;
 }
 if(previous&&(previous.stateDigest!==stateDigest(s)||previous.fence!==s.fence||previous.authorityRevision!==c.authorityRevision))deny('attestation_state_receipt_mismatch');
 if(!previous&&(s.attestations.length||s.seals.length||s.keys.length||c.authorityRevision!==0))deny('attestation_legacy_history_missing');
 if(previous&&(s.journal[0].writer!=='create'||s.journal.filter(j=>j.writer==='signing_key').length!==s.keys.length||
  s.journal.filter(j=>j.writer==='attest').length!==s.attestations.length||s.journal.filter(j=>j.writer==='ceremony_start').length!==s.seals.length))deny('attestation_writer_receipt_missing');
 projectAttestationKeys(s.keys,c.ceremony.binding.workspaceId,c.ceremony.binding.installationId,now);
 if(new Set(s.attestations.map(a=>a.payload.authorityRevision)).size!==s.attestations.length||new Set(s.seals.map(a=>a.ticketId)).size!==s.seals.length)deny('attestation_ambiguous');
 for(const a of s.attestations)if(a.payload.decisionId!==c.ceremony.decisionId||a.payload.binding.workspaceId!==c.ceremony.binding.workspaceId)deny();
 for(const x of s.seals)if(!s.attestations.some(a=>a.payload.authorityRevision===x.authorityRevision&&a.payload.acceptanceId===x.acceptanceId&&
  a.payload.decisionId===x.decisionId&&a.payload.ticketId===x.ticketId&&attestationRecordDigest(a)===x.attestationDigest)||x.startFence>x.lastFence||x.lastFence>s.fence)deny();
 return s;
}
function append(s:State,writer:typeof attestationWriters[number],now:Date){
 const prior=s.journal.at(-1);s.fence++;
 const j={id:randomUUID(),revision:s.journal.length+1,writer,authorityRevision:s.canonical.authorityRevision,fence:s.fence,stateDigest:stateDigest(s),
  previousDigest:prior?digest('owner-decision-journal-v1',prior):null,at:now.toISOString()};
 s.journal.push(j);s.receipts.push({journalId:j.id,eventId:randomUUID(),eventDigest:digest('owner-decision-journal-v1',j),fence:j.fence,stateDigest:j.stateDigest});
 return inspectAttestationState(s,now);
}
// Trusted source-writer model only, not a request API. Revisions are represented
// by canonical source changes, never by a second decision registry/head.
export function recordAttestationSourceWrite(input:unknown,writer:typeof attestationWriters[number],replacement:unknown,now:Date){
 const s=inspectAttestationState(input,now),old=s.canonical,next=canonical.parse(replacement);
 if(['attest','signing_key','ceremony_start','dispatch','complete'].includes(writer)||!attestationWriters.includes(writer)||
  old.ceremony.decisionId!==next.ceremony.decisionId||old.ceremony.binding.workspaceId!==next.ceremony.binding.workspaceId||
  ['superseded','revoked','expired','rejected','deleted'].includes(old.status))deny();
 const terminal:Record<string,State['canonical']['status']>={supersede:'superseded',revoke:'revoked',expire:'expired',reject:'rejected',delete:'deleted'};
 if(writer==='create'&&(s.journal.length||old.authorityRevision!==0||next.status!=='proposed')||writer==='expire'&&now.getTime()<Date.parse(old.ceremony.expiresAt)||
  ['accept','interview_acceptance_effect'].includes(writer)&&(old.status!=='proposed'||next.status!=='accepted'))deny();
 next.authorityRevision=old.authorityRevision+1;if(terminal[writer])next.status=terminal[writer];
 s.canonical=next;return append(s,writer,now);
}
export function recordAttestationKeyWrite(input:unknown,operation:unknown,now:Date){
 const s=inspectAttestationState(input,now),b=s.canonical.ceremony.binding;
 s.keys.push(nextAttestationKeyEvent(s.keys,{workspaceId:b.workspaceId,installationId:b.installationId},operation,now));return append(s,'signing_key',now);
}
function owner(s:State,now:Date,fresh=false){const c=s.canonical,b=c.ceremony,a=c.acceptance,e=c.auth,n=now.getTime();
 if(!s.journal.some(j=>['accept','interview_acceptance_effect'].includes(j.writer))||c.status!=='accepted'||c.candidateCount!==1||c.primaryOwnerId!==b.ownerId||c.ownerMembershipIds.length!==1||c.ownerMembershipIds[0]!==b.ownerId||!a||!e||
  a.id!==b.acceptanceId||a.decisionId!==b.decisionId||a.revision!==b.decisionRevision||a.ownerId!==b.ownerId||a.workspaceId!==b.binding.workspaceId||
  e.workspaceId!==b.binding.workspaceId||e.ownerId!==b.ownerId||e.acceptanceId!==b.acceptanceId||e.policyRevision!==b.policyRevision||e.acceptedAt!==a.acceptedAt||
  Date.parse(e.authTime)>Date.parse(e.acceptedAt)||Date.parse(e.acceptedAt)>Date.parse(b.validFrom)||n<Date.parse(b.validFrom)||n>=Date.parse(b.expiresAt)||
  fresh&&n-Date.parse(e.authTime)>300000)deny('attestation_owner_auth_invalid');
 return e!;
}
const flags={implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,
 pilotExecutionStarted:false,transportQualified:false,launchAuthority:false} as const;
const request=z.object({decisionId:id,ticketId:id}).strict();
const expected=z.object({authorityRevision:z.number().int().nonnegative().safe(),fence:epoch,digest:hash}).strict();
type Expected=z.infer<typeof expected>;
export const attestationSourceVersion=(s:State):Expected=>({authorityRevision:s.canonical.authorityRevision,fence:s.fence,digest:stateDigest(s)});
type Evidence={payload:z.infer<typeof attestationPayload>;payloadDigest:string;publicKey:ReturnType<typeof projectAttestationKeys>['keys'][number]};
export type AttestationModelDependencies={qualification:'synthetic_attestation_persistence_v1';
 transaction:<T>(mode:'read'|'write',work:(db:Db)=>Promise<T>)=>Promise<T>;
 bound:(db:Db)=>Promise<{mode:'read'|'write';isolation:'repeatable read'|'serializable';readOnly:boolean;fenceLocked:boolean;origin:boolean}>;
 load:(db:Db)=>Promise<unknown>;save:(db:Db,state:State)=>Promise<void>;
 signer?:{qualification:'synthetic_attestation_signer_v1';keyId:string;sign:(db:Db,evidence:Readonly<Evidence>)=>Promise<string>};
 verifier?:{qualification:'synthetic_attestation_verifier_v1';verify:(db:Db,evidence:Readonly<Evidence&{signature:string}>)=>Promise<boolean>};
 exchange:(db:Db,attempt:Readonly<z.infer<typeof seal>>)=>Promise<void>};
export class AttestationCommitUnknown extends Error{readonly retryable=false;constructor(){super('reconciliation_required');}}
// No SQL, signer, key loader, server route or default composition is provided.
export function createAttestationPersistenceModel(deps?:AttestationModelDependencies,clock=()=>new Date()){
 async function tx<T>(mode:'read'|'write',work:(db:Db,s:State)=>Promise<T>){
  if(deps?.qualification!=='synthetic_attestation_persistence_v1')deny('attestation_dependencies_unavailable');
  return deps.transaction(mode,async db=>{const b=await deps.bound(db);
   if(b.mode!==mode||!b.origin||b.readOnly!==(mode==='read')||b.isolation!==(mode==='read'?'repeatable read':'serializable')||mode==='write'&&!b.fenceLocked)deny('attestation_transaction_unbound');
   const result=await work(db,inspectAttestationState(await deps.load(db),clock()));
   if(!same(b,await deps.bound(db)))deny('attestation_transaction_changed');return result;});
 }
 function scope(s:State,q:z.infer<typeof request>){if(s.canonical.ceremony.decisionId!==q.decisionId||s.canonical.ceremony.ticketId!==q.ticketId)deny();}
 function cas(s:State,e:Expected){if(!same(attestationSourceVersion(s),e))deny('attestation_source_cas_changed');}
 async function current(db:Db,s:State){
  const auth=owner(s,clock()),c=s.canonical,b=c.ceremony,a=s.attestations.filter(a=>a.payload.authorityRevision===c.authorityRevision);
  if(a.length!==1||deps?.verifier?.qualification!=='synthetic_attestation_verifier_v1')deny('attestation_signature_unavailable');
  const row=a[0],p=row.payload,k=projectAttestationKeys(s.keys,b.binding.workspaceId,b.binding.installationId,clock()).usable.find(k=>k.material.keyId===p.signingKeyId);
  if(!k||p.signingKeyEpoch!==k.material.epoch||p.signingKeyRevision!==k.revision||p.signingPublicKeyDigest!==k.material.publicKeyDigest||p.signingKeyHistoryDigest!==k.historyDigest||
   p.ownerAuthEvidenceDigest!==digest('owner-decision-auth-evidence-v1',auth)||p.ownerAuthLevel!==auth.level||!same(ceremony.parse(Object.fromEntries(Object.entries(p).filter(([key])=>key in ceremony.shape))),b)||
   Date.parse(row.at)>clock().getTime()||Date.parse(p.validFrom)<Date.parse(k.material.validFrom)||Date.parse(p.expiresAt)>Date.parse(k.material.expiresAt))deny('attestation_not_current');
  if(await deps.verifier.verify(db,freezePublic({payload:p,payloadDigest:digest('owner-decision-attestation-payload-v1',p),publicKey:k,signature:row.signature}))!==true)deny('attestation_signature_invalid');
  owner(s,clock());if(!projectAttestationKeys(s.keys,b.binding.workspaceId,b.binding.installationId,clock()).usable.some(key=>key.material.keyId===p.signingKeyId))deny();
  return row;
 }
 async function projection(q:z.infer<typeof request>){return tx('read',async(db,s)=>{scope(s,q);const a=await current(db,s);
  return {db,version:attestationSourceVersion(s),attestationDigest:attestationRecordDigest(a),sealed:s.seals.some(x=>x.ticketId===q.ticketId)};});}
 async function pair(q:z.infer<typeof request>){const a=await projection(q),b=await projection(q);
  if(a.db===b.db||!same(a.version,b.version)||a.attestationDigest!==b.attestationDigest||a.sealed!==b.sealed)deny('attestation_fresh_read_changed');return b;}
 async function start(q:z.infer<typeof request>){const p=await pair(q);if(p.sealed)deny('attestation_attempt_already_sealed');
  return tx('write',async(db,s)=>{scope(s,q);cas(s,p.version);const a=await current(db,s);if(s.seals.some(x=>x.ticketId===q.ticketId)||attestationRecordDigest(a)!==p.attestationDigest)deny();
   const attempt={id:randomUUID(),...q,acceptanceId:a.payload.acceptanceId,authorityRevision:p.version.authorityRevision,attestationDigest:p.attestationDigest,
    sourceDigest:p.version.digest,startFence:s.fence+1,lastFence:s.fence+1,state:'started' as const};
   s.seals.push(attempt);await deps!.save(db,append(s,'ceremony_start',clock()));return freezePublic(attempt);});
 }
 return Object.freeze({
  async status(input:unknown){try{const p=await pair(request.parse(input));return {ok:true,qualification:'source_model_only',version:p.version,sealed:p.sealed,...flags};}
   catch{return {ok:false,blocker:signedDecisionGap.blocker,...flags};}},
  async attest(input:unknown){try{const q=request.extend({expected}).strict().parse(input);
   await tx('write',async(db,s)=>{scope(s,q);cas(s,q.expected);const auth=owner(s,clock(),true),b=s.canonical.ceremony;
    if(deps?.signer?.qualification!=='synthetic_attestation_signer_v1'||deps.verifier?.qualification!=='synthetic_attestation_verifier_v1'||
     s.attestations.some(a=>a.payload.acceptanceId===b.acceptanceId)||s.seals.some(x=>x.ticketId===b.ticketId))deny('attestation_signer_unavailable_or_replay');
    const key=projectAttestationKeys(s.keys,b.binding.workspaceId,b.binding.installationId,clock()).usable.find(k=>k.material.keyId===deps.signer!.keyId);
    if(!key||Date.parse(b.validFrom)<Date.parse(key.material.validFrom)||Date.parse(b.expiresAt)>Date.parse(key.material.expiresAt))deny('attestation_key_unavailable');
    const payload=attestationPayload.parse({...b,version:'owner-decision-attestation-v1',authorityRevision:++s.canonical.authorityRevision,
     ownerAuthEvidenceDigest:digest('owner-decision-auth-evidence-v1',auth),ownerAuthLevel:auth.level,signingKeyId:key!.material.keyId,
     signingKeyRevision:key!.revision,signingKeyEpoch:key!.material.epoch,signingPublicKeyDigest:key!.material.publicKeyDigest,signingKeyHistoryDigest:key!.historyDigest});
    const e=freezePublic({payload,payloadDigest:digest('owner-decision-attestation-payload-v1',payload),publicKey:key!});
    const signature=await deps.signer!.sign(db,e),row=attestation.parse({id:randomUUID(),payload,signature,at:clock().toISOString()});
    s.attestations.push(row);await current(db,s);owner(s,clock(),true);await deps.save(db,append(s,'attest',clock()));
   });return {ok:true,qualification:'source_model_only',...flags};
  }catch(e){return {ok:false,error:e instanceof AttestationCommitUnknown?'reconciliation_required':'denied',retryable:false,...flags};}},
  async start(input:unknown){try{return {ok:true,qualification:'source_model_only',seal:await start(request.parse(input)),...flags};}
   catch(e){return {ok:false,error:e instanceof AttestationCommitUnknown?'reconciliation_required':'denied',retryable:false,...flags};}},
  async run(input:unknown){let possibleCommit=false;
   try{const q=request.parse(input);await start(q);
    await tx('write',async(db,s)=>{scope(s,q);const a=await current(db,s),x=s.seals.find(x=>x.ticketId===q.ticketId);
     if(!x||x.state!=='started'||x.lastFence!==s.fence||x.authorityRevision!==s.canonical.authorityRevision||x.attestationDigest!==attestationRecordDigest(a))deny('attestation_dispatch_cas_changed');
     x.state='dispatched';x.lastFence=s.fence+1;await deps!.save(db,append(s,'dispatch',clock()));
     // The durable start seal was committed in the preceding transaction. Keep
     // the shared source fence locked through the bounded synthetic send seam;
     // rollback/lost ACK after possible send cannot reopen that start seal.
     possibleCommit=true;await deps!.exchange(db,freezePublic({...x}));});
    await tx('write',async(db,s)=>{scope(s,q);const a=await current(db,s),x=s.seals.find(x=>x.ticketId===q.ticketId);
     if(!x||x.state!=='dispatched'||x.lastFence!==s.fence||x.authorityRevision!==s.canonical.authorityRevision||x.attestationDigest!==attestationRecordDigest(a))deny('attestation_completion_changed');
     x.state='completed';x.lastFence=s.fence+1;await deps!.save(db,append(s,'complete',clock()));});
    return {ok:true,qualification:'source_model_only',retryable:false,...flags};
   }catch(e){const unknown=possibleCommit||e instanceof AttestationCommitUnknown;return {ok:false,error:unknown?'delivery_unknown':'denied',reconciliationRequired:unknown,retryable:false,...flags};}
  }
 });
}
