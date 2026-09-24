import {z} from 'zod';import type {Prisma} from '@prisma/client';import {randomUUID} from 'node:crypto';
import {reviewDigest} from '../agent-runtime/task-review-contract';import {freezePublic} from './worker-transport-snapshot';
import {decisionAttestationOwnGuards,decisionAttestationOwnHelpers,decisionAttestationLifecycleGuardHash} from './decision-attestation-guards';
import {ticketGuards,ticketHelpers,ticketChannelHelper} from './bootstrap-ticket-lifecycle-guards';
import {attestationKeyMaterial} from './decision-attestation-key-model';
import {createAttestationPersistenceModel,inspectAttestationState,attestationSourceVersion,recordAttestationKeyWrite,recordAttestationSourceWrite,
 ownerAuthenticationEvidence,AttestationCommitUnknown,type AttestationModelState,type AttestationModelDependencies} from './decision-attestation-persistence-model';
type Db=Prisma.TransactionClient;type State=AttestationModelState;
const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),count=z.number().int().nonnegative().safe();
const expected=z.object({authorityRevision:count,fence:count.positive(),digest:hash}).strict();
const scope=z.object({decisionId:id,ticketId:id}).strict();
export const decisionAttestationGuards=[...decisionAttestationOwnGuards,...ticketGuards.map(g=>g.function==='bootstrap_lifecycle_write_guard'?{...g,hash:decisionAttestationLifecycleGuardHash}:g)];
export const decisionAttestationHelpers=[...decisionAttestationOwnHelpers,...[...ticketHelpers,ticketChannelHelper].map(h=>({...h,args:'3802'}))];
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
function deny():never{throw Error('decision_attestation_adapter_unavailable');}
export async function requireDecisionAttestationGuards(db:Db){
 const tables=await db.$queryRaw<any[]>`SELECT to_regclass('public.decision_attestations') IS NOT NULL AS decision_attestation_available`;
 if(tables.length!==1||tables[0].decision_attestation_available!==true)deny();
 const rows=await db.$queryRaw<any[]>`SELECT c.relname AS "table",t.tgname AS name,p.proname AS function,t.tgtype::int AS kind,t.tgdeferrable AS deferred,
  encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
  (t.tgenabled='O' AND t.tgqual IS NULL AND t.tgnargs=0 AND t.tgattr=''::int2vector AND NOT t.tgisinternal AND (t.tgconstraint<>0)=t.tgdeferrable AND t.tginitdeferred=t.tgdeferrable
   AND n.nspname='public' AND pn.nspname='public' AND c.relkind='r' AND p.pronargs=0 AND p.prorettype='trigger'::regtype AND p.prokind='f'
   AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND NOT p.prosecdef AND p.proconfig IS NULL AND p.provolatile='v'
   AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u' AND current_setting('session_replication_role')='origin'
   AND current_setting('transaction_isolation') IN ('repeatable read','serializable') AND EXISTS(SELECT 1 FROM ready_source_fence WHERE id=1)) AS enabled
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid
  JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE t.tgname=ANY(${[...new Set(decisionAttestationGuards.map(g=>g.name))]}::text[])`;
 const guards=new Map(rows.map(({enabled,...row})=>[`${row.table}:${row.name}`,{enabled,row}]));
 if(rows.length!==decisionAttestationGuards.length||guards.size!==rows.length||!decisionAttestationGuards.every(g=>{
  const actual=guards.get(`${g.table}:${g.name}`);return actual?.enabled===true&&same(actual.row,g);
 }))deny();
 const helpers=await db.$queryRaw<any[]>`SELECT p.proname AS name,p.proargtypes::text AS args,p.provolatile::text AS volatility,p.prorettype::regtype::text AS result,
  encode(sha256(convert_to(replace(p.prosrc,chr(13),''),'UTF8')),'hex') AS hash,
  (n.nspname='public' AND p.prokind='f' AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql') AND NOT p.prosecdef AND p.proconfig IS NULL
   AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u' AND current_setting('session_replication_role')='origin') AS enabled
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname=ANY(${decisionAttestationHelpers.map(h=>h.name)}::text[])`;
 const helperMap=new Map(helpers.map(({enabled,...row})=>[row.name,{enabled,row}]));
 if(helpers.length!==decisionAttestationHelpers.length||helperMap.size!==helpers.length||!decisionAttestationHelpers.every(h=>{
  const actual=helperMap.get(h.name);return actual?.enabled===true&&same(actual.row,h);
 }))deny();
}
// Persistence port contract, not a second state store. projectCanonical must
// JOIN existing roots + immutable children/receipts. appendChildren must insert
// only these deltas and extend the existing bootstrap attempt in the same tx.
// In particular it MUST NOT serialize a model snapshot into a new registry.
export type AttestationChildDelta={operationId:string;decisionId:string;ticketId:string;expected:z.infer<typeof expected>;
 writer:State['journal'][number]['writer'];authorityRevision:number;terminalStatus:State['canonical']['status']|null;
 authEvidence:State['canonical']['auth'];keyEvents:State['keys'];attestations:State['attestations'];attemptSeals:State['seals']};
const receipt=z.object({operationId:id,decisionId:id,mutationDigest:hash,rowsDigest:hash,authorityRevision:count,fence:z.string().regex(/^[1-9][0-9]*$/)}).strict();
export type AttestationMutationReceipt=z.infer<typeof receipt>;
export type AttestationPersistencePorts={qualification:'synthetic_attestation_adapter_v1';
 transaction:AttestationModelDependencies['transaction'];bound:AttestationModelDependencies['bound'];
 projectCanonical:(db:Db,query:z.infer<typeof scope>)=>Promise<{authorityRevisionSeed:1|null;state:unknown}>;
 appendChildren:(db:Db,delta:Readonly<AttestationChildDelta>)=>Promise<unknown>;
 readCommittedOperation:(db:Db,operationId:string)=>Promise<unknown>;
 ownerAuthentication?:(db:Db,query:z.infer<typeof scope>)=>Promise<unknown>;
 authorizePublicKey?:(db:Db,operation:unknown)=>Promise<boolean>;
 signer?:AttestationModelDependencies['signer'];verifier?:AttestationModelDependencies['verifier']};
export const attestationMutationDigest=(d:AttestationChildDelta)=>reviewDigest({domain:'owner-decision-child-mutation-v1',value:d});
const flags={implementationReady:false,executionSupported:false,pilotReady:false,liveAdmissionAllowed:false,pilotExecutionAuthorized:false,
 pilotExecutionStarted:false,transportQualified:false,launchAuthority:false} as const;
export function createDecisionAttestationAdapter(ports?:AttestationPersistencePorts,clock=()=>new Date()){
 function dependencies(q:z.infer<typeof scope>):AttestationModelDependencies{
  if(ports?.qualification!=='synthetic_attestation_adapter_v1')deny();
  const snapshots=new WeakMap<object,State>(),writes=new WeakMap<object,AttestationMutationReceipt>();
  async function read(db:Db){await requireDecisionAttestationGuards(db);const p=await ports!.projectCanonical(db,q);
   if(p.authorityRevisionSeed!==1)deny();const s=inspectAttestationState(p.state,clock());
   if(s.canonical.ceremony.decisionId!==q.decisionId||s.canonical.ceremony.ticketId!==q.ticketId)deny();snapshots.set(db,s);return s;}
  const dep:AttestationModelDependencies={qualification:'synthetic_attestation_persistence_v1',bound:ports.bound,signer:ports.signer,verifier:ports.verifier,
   load:read,exchange:async()=>deny(),
   transaction:async(mode,work)=>{let prepared=false,written:AttestationMutationReceipt|undefined,writeDb:Db|undefined;
    try{const result=await ports!.transaction(mode,async db=>{writeDb=db;await requireDecisionAttestationGuards(db);const value=await work(db);
     written=writes.get(db);prepared=!!written;return value;});
     if(written){
      // Transaction promise resolution is not evidence of COMMIT. Read exact
      // immutable row/Event/receipt joins in a NEW read-only transaction.
      await ports!.transaction('read',async db=>{if(db===writeDb)deny();const b=await ports!.bound(db);
       if(b.mode!=='read'||b.isolation!=='repeatable read'||!b.readOnly||!b.origin)deny();await requireDecisionAttestationGuards(db);
       const actual=receipt.parse(await ports!.readCommittedOperation(db,written!.operationId));if(!same(actual,written))deny();});
     }return result;
    }catch(e){if(prepared||e instanceof AttestationCommitUnknown)throw new AttestationCommitUnknown();throw e;}
   },
   save:async(db,next)=>{const before=snapshots.get(db);if(!before)deny();await requireDecisionAttestationGuards(db);
    const canonical=await read(db);if(!same(attestationSourceVersion(before),attestationSourceVersion(canonical)))deny();
    const writer=next.journal.at(-1)!.writer;
    const delta:AttestationChildDelta={operationId:randomUUID(),...q,expected:attestationSourceVersion(before),writer,authorityRevision:next.canonical.authorityRevision,
     terminalStatus:next.canonical.status!==before.canonical.status?next.canonical.status:null,
     authEvidence:!same(next.canonical.auth,before.canonical.auth)?next.canonical.auth:null,
     keyEvents:next.keys.slice(before.keys.length),attestations:next.attestations.slice(before.attestations.length),attemptSeals:next.seals.slice(before.seals.length)};
    delta.operationId=delta.keyEvents[0]?.id??delta.attestations[0]?.id??delta.attemptSeals[0]?.id??delta.operationId;
    if(!['signing_key','owner_auth_evidence','attest','supersede','revoke','expire','reject','ceremony_start'].includes(writer)||
     next.keys.length<before.keys.length||next.attestations.length<before.attestations.length||next.seals.length<before.seals.length)deny();
    const r=receipt.parse(await ports!.appendChildren(db,freezePublic(delta)));
    if(r.operationId!==delta.operationId||r.decisionId!==q.decisionId||r.mutationDigest!==attestationMutationDigest(delta)||r.authorityRevision!==next.canonical.authorityRevision||BigInt(r.fence)<=BigInt(before.fence))deny();
    writes.set(db,r);
   }
  };return dep;
 }
 async function apply(input:unknown,kind:'key'|'auth'|'terminal'){
  try{
   const base=scope.extend({expected}),command=kind==='key'?base.extend({operation:z.object({id,action:z.enum(['create','adopt','stage','cutover','retire','revoke']),keyId:id,
    material:attestationKeyMaterial.nullable(),overlapStartsAt:z.string().datetime().nullable(),cutoverAt:z.string().datetime().nullable()}).strict()}).strict().parse(input):
    kind==='terminal'?base.extend({action:z.enum(['supersede','revoke','expire','reject'])}).strict().parse(input):base.strict().parse(input);
   const q=scope.parse({decisionId:command.decisionId,ticketId:command.ticketId}),d=dependencies(q);
   await d.transaction('write',async db=>{const bound=await d.bound(db);if(bound.mode!=='write'||bound.isolation!=='serializable'||bound.readOnly||!bound.origin||!bound.fenceLocked)deny();
    const s=inspectAttestationState(await d.load(db),clock());if(!same(attestationSourceVersion(s),command.expected))deny();let next:State;
    if(kind==='key'){
     if(!ports!.authorizePublicKey||await ports!.authorizePublicKey(db,(command as any).operation)!==true)deny();
     next=recordAttestationKeyWrite(s,(command as any).operation,clock());
    }else if(kind==='auth'){
     if(!ports!.ownerAuthentication||s.canonical.auth!==null)deny();const auth=ownerAuthenticationEvidence.parse(await ports!.ownerAuthentication(db,q)),c=s.canonical;
     if(!c.acceptance||c.primaryOwnerId!==auth.ownerId||c.ownerMembershipIds.length!==1||c.ownerMembershipIds[0]!==auth.ownerId||c.candidateCount!==1||
      auth.workspaceId!==c.ceremony.binding.workspaceId||auth.acceptanceId!==c.acceptance.id||auth.ownerId!==c.acceptance.ownerId||auth.acceptedAt!==c.acceptance.acceptedAt||
      auth.policyRevision!==c.ceremony.policyRevision||Date.parse(auth.authTime)>Date.parse(auth.acceptedAt)||clock().getTime()-Date.parse(auth.authTime)>300000)deny();
     next=recordAttestationSourceWrite(s,'owner_auth_evidence',{...c,auth},clock());
    }else next=recordAttestationSourceWrite(s,(command as any).action,s.canonical,clock());
    await d.save(db,next);
   });return {ok:true,qualification:'source_adapter_contract_only',...flags};
  }catch(e){return {ok:false,error:e instanceof AttestationCommitUnknown?'reconciliation_required':'denied',retryable:false,...flags};}
 }
 function model(input:unknown){const q=scope.parse(input);return createAttestationPersistenceModel(dependencies(q),clock);}
 return Object.freeze({
  key:(input:unknown)=>apply(input,'key'),recordOwnerAuth:(input:unknown)=>apply(input,'auth'),terminal:(input:unknown)=>apply(input,'terminal'),
  async attest(input:unknown){try{const q=scope.extend({expected}).strict().parse(input);return await model({decisionId:q.decisionId,ticketId:q.ticketId}).attest(q);}catch{return {ok:false,error:'denied',retryable:false,...flags};}},
  async startCeremony(input:unknown){try{return await model(input).start(input);}catch{return {ok:false,error:'denied',retryable:false,...flags};}},
  async inspect(input:unknown){try{return await model(input).status(input);}catch{return {ok:false,blocker:'signed_current_decision_unavailable',...flags};}}
 });
}
