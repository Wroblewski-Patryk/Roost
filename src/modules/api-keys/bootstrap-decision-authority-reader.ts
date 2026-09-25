import {z} from 'zod';
import {reviewDigest} from '../agent-runtime/task-review-contract';
import {freezePublic} from './worker-transport-snapshot';
import {bootstrapBinding} from './worker-bootstrap-contract';
import {lifecycleFlags} from './bootstrap-ticket-lifecycle-contract';
import {decisionAttestationGuards,decisionAttestationHelpers} from './decision-attestation-adapter';
import {isConcreteDecisionAttestationPorts} from './decision-attestation-prisma-ports';
import {attestationDbClock,type NativeAttestationProjection} from './decision-attestation-projection';
import {attestationScope,positiveText,sqlHash,exact,denyAttestation as deny,type AttestationDb as Db} from './decision-attestation-sql';
import {attestationPayload} from './decision-attestation-persistence-model';
import {inspectCanonicalLifecycle} from './worker-identity-lifecycle-store';
import {inspectCanonicalIssuer} from './bootstrap-issuer-store';
import {channelGrant,validateV2ChannelPlan} from './bootstrap-channel-persistence-contract';

// Evidence identifies the v58 native qualification, not production crypto or
// qualification of this new composition. Runtime catalogs are checked on EVERY read.
export const decisionReaderEvidence=freezePublic({version:'native-attestation-reader-evidence-v1',
 portsVersion:'unapplied_prisma_decision_attestation_ports_v1',
 nativeQualificationCommit:'3970dffe2b7e3de0a73d7beb06a13af19d2ab5f4',
 migration83LfSha256:'b16939ff35320afe5f9cc0259edf1e444c7c43b70c7e186dc6a66ce096f9e0b5',
 catalogDigest:reviewDigest({guards:decisionAttestationGuards,helpers:decisionAttestationHelpers})});
type Projection=NativeAttestationProjection;
export type DecisionReaderTrust={qualification:'synthetic_decision_reader_trust_v1';
 verifyOwnerAuthentication:(db:Db,evidence:Readonly<{auth:NonNullable<Projection['auth']>;ceremony:Projection['ceremony'];at:string}>)=>Promise<boolean>;
 trustPublicKey:(db:Db,evidence:Readonly<{key:Projection['keyProjection']['keys'][number];history:Projection['keys'];highWater:number;at:string}>)=>Promise<boolean>;
};
const capabilities=new WeakSet<object>();
const sealSchema=z.object({version:z.literal('owner-decision-attempt-seal-v1'),attemptId:z.string().uuid(),ticketId:z.string().uuid(),
 attestationId:z.string().uuid(),attestationDigest:sqlHash,authorityRevision:z.number().int().positive().safe(),sourceFence:positiveText,
 sourceDigest:sqlHash,bindings:attestationPayload,state:z.literal('started')}).strict();
export const decisionAuthorityRequest=attestationScope.extend({binding:bootstrapBinding,purpose:z.enum(['first_enrollment','owner_recovery'])}).strict();
export function isDecisionAuthorityReader(value:unknown):value is DecisionAuthorityReader{
 return typeof value==='object'&&value!==null&&capabilities.has(value);
}
export function createDecisionAuthorityReader(input:{ports:unknown;qualification:unknown;evidence:unknown;trust?:DecisionReaderTrust}){
 const {ports,trust}=input;
 // Reject duck-typed/overridden projectors, metadata overrides and absent seams.
 if(input.qualification!=='native_qualified_decision_read_ports_v1'||!exact(input.evidence,decisionReaderEvidence)||
  !isConcreteDecisionAttestationPorts(ports)||trust?.qualification!=='synthetic_decision_reader_trust_v1'||
  typeof trust.verifyOwnerAuthentication!=='function'||typeof trust.trustPublicKey!=='function')return deny();
 const inspectBound=ports.inspectBound,verifyAuth=trust!.verifyOwnerAuthentication,trustKey=trust!.trustPublicKey;
 const reader=Object.freeze({qualification:'canonical_decision_authority_reader_v1' as const,evidence:decisionReaderEvidence,
  async read(db:Db,value:unknown,expectedFence:string){
   const q=decisionAuthorityRequest.parse(value),scope={decisionId:q.decisionId,ticketId:q.ticketId};
   const {projection:p,attestation:a,attemptReceipt}=await inspectBound(db,scope,expectedFence),b=a.record.payload;
   const lifecycle=await inspectCanonicalLifecycle(db,q.binding),issuer=await inspectCanonicalIssuer(db,q.binding,new Date(p.clock.at),p.registration.identity.issuedAt);
   if(!lifecycle.facts||lifecycle.blockers.length||!issuer.facts||issuer.blockers.length||
    lifecycle.facts.hostGeneration!==b.hostGeneration||lifecycle.facts.installationGeneration!==b.installationGeneration||
    issuer.facts.highWater!==q.binding.ticketKeyEpoch)deny();
   const issuerHead=await db.$queryRaw<any[]>`SELECT revision,record_digest AS digest FROM bootstrap_issuer_history WHERE workspace_id=${q.binding.workspaceId}::uuid ORDER BY revision DESC LIMIT 1`;
   if(issuerHead.length!==1||issuerHead[0].revision!==b.issuerRevision||issuerHead[0].digest!==b.issuerHistoryDigest)deny();
   if(!exact(b.binding,q.binding)||b.purpose!==q.purpose||p.clock.isolation!=='repeatable read'||p.clock.readOnly!=='on'||
    !p.auth||Date.parse(p.auth.acceptedAt)-Date.parse(p.auth.authTime)>300000||Date.parse(p.auth.authTime)>Date.parse(p.auth.acceptedAt))deny();
   const key=p.keyProjection.usable.find(k=>k.material.keyId===b.signingKeyId);
   if(!key||Date.parse(a.record.at)-Date.parse(p.auth!.authTime)>300000||Date.parse(p.auth!.authTime)>Date.parse(a.record.at)||
    Date.parse(b.validFrom)<Date.parse(key.material.validFrom)||Date.parse(b.expiresAt)>Date.parse(key.material.expiresAt))deny();
   if(await verifyAuth(db,freezePublic({auth:p.auth!,ceremony:p.ceremony,at:p.clock.at}))!==true||
    await trustKey(db,freezePublic({key:key!,history:p.keys,highWater:p.keyProjection.highWater,at:p.clock.at}))!==true)deny();
   // Reproject after trust callbacks: a callback cannot replace a canonical row,
   // advance a fence or make a stale validity/key observation authoritative.
   const after=await inspectBound(db,scope,expectedFence);
   if(!exact(p.version,after.projection.version)||!exact(a,after.attestation)||!exact(attemptReceipt,after.attemptReceipt))deny();
   const issuerAfter=await inspectCanonicalIssuer(db,q.binding,new Date(after.projection.clock.at),p.registration.identity.issuedAt);
   if(!issuerAfter.facts||issuerAfter.blockers.length)deny();
   const c=await attestationDbClock(db);if(c.fence!==expectedFence||c.readOnly!=='on'||c.isolation!=='repeatable read'||
    Date.parse(c.at)<Date.parse(b.validFrom)||Date.parse(c.at)>=Date.parse(b.expiresAt)||Date.parse(c.at)>=Date.parse(key!.material.expiresAt))deny();
   const grant=channelGrant.parse(p.objects.find(o=>o.table==='worker_transport_bootstrap_grants')?.row.record);
   validateV2ChannelPlan(p.registration.record.signed.payload,grant.intent.snapshot,new Date(c.at));
   const attempt=p.attempts[0],seal=attempt?sealSchema.parse(attempt.attestation_seal):null;
   const {ceremonyAt,...issuerVersion}=issuer.facts!;
   const {ceremonyAt:afterTime,...issuerAfterVersion}=issuerAfter.facts!;if(!exact(issuerVersion,issuerAfterVersion))deny();
   if(seal&&(seal.attemptId!==p.ticketHead.attemptId||seal.attestationId!==a.row.id||seal.attestationDigest!==a.row.record_digest||
    String(seal.authorityRevision)!==p.version.authorityRevision||!exact(seal.bindings,b)))deny();
   return freezePublic({ok:true as const,available:true as const,qualification:'canonical_decision_authority_source_only_v1' as const,
    version:p.version,identity:p.registration.identity,attestation:a.record,attestationDigest:a.row.record_digest as string,lifecycle:lifecycle.facts!,issuer:issuer.facts!,
    ticketHead:p.ticketHead,ticketDigest:p.ticketDigest,seal,attemptReceipt,
    // Clock observations are excluded from equality; every read independently
    // checks validity. All authority rows, receipts and bindings are included.
    projectionDigest:reviewDigest({version:p.version,ceremony:p.ceremony,attestation:a.record,ticket:p.registration,
     head:p.ticketHead,ticketDigest:p.ticketDigest,seal,attemptReceipt,lifecycle:lifecycle.facts,issuer:issuerVersion}),...lifecycleFlags});
  }
 });
 capabilities.add(reader);return reader;
}
export type DecisionAuthorityReader=ReturnType<typeof createDecisionAuthorityReader>;
export type DecisionAuthorityRead=Awaited<ReturnType<DecisionAuthorityReader['read']>>;
