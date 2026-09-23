import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createBootstrapChannelModel,bootstrapChannelWriters} from '../modules/api-keys/bootstrap-channel-contract';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
const hash=(s:string)=>s.repeat(64),copy=<T>(v:T):T=>structuredClone(v);
export function bootstrapChannelFixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment'){
  const base=Date.parse('2030-01-01T00:00:00.000Z');let now=base,inspects=0,exchanges=0;const iso=(ms=0)=>new Date(base+ms).toISOString();
  const binding={workspaceId:randomUUID(),installationId:randomUUID(),installationEpoch:1,hostId:randomUUID(),hostEpoch:1,hostFingerprint:hash('a'),ticketKeyId:'public-model',ticketKeyEpoch:1,ticketPublicKeyDigest:hash('b')};
  const profile={origin:'https://worker.example.com:443',serverName:'worker.example.com',certificate:{fingerprint:hash('c'),hostname:'worker.example.com',notBefore:iso(-60000),notAfter:iso(120000)},
    trust:{mode:'owner_approved_ca_digest',caDigest:hash('d')},resolver:{policy:'public_ipv4_only_v1',evidenceType:'issuer_signed_peer_observation_v1'},proxy:false,redirect:false,downgrade:false,
    bootstrap:{source:'owner_out_of_band',evidenceDigest:hash('e'),fingerprint:hash('c')}};
  const snapshot:any={version:'bootstrap-channel-snapshot-proposal-v1',purpose,binding,hostGeneration:randomUUID(),installationGeneration:randomUUID(),generation:randomUUID(),revision:1,recordDigest:hash('f'),state:'current',
    issuerRevision:1,issuerHistoryDigest:hash('1'),origin:profile.origin,serverName:profile.serverName,caDigest:hash('d'),leafPin:hash('c'),certificateEpoch:1,highWaterEpoch:1,
    certificateNotBefore:iso(-60000),certificateNotAfter:iso(120000),certificateEvidenceDigest:hash('e'),resolverPolicy:'public_ipv4_only_v1',publicAddresses:['8.8.8.8','9.9.9.9'],
    redirect:false,proxy:false,downgrade:false,sessionReuse:false,validFrom:iso(-2000),cutoverAt:null,expiresAt:iso(60000)};
  // IDs/fingerprints only. No credential string, keypair, signature or issuance.
  const priorCredential={id:randomUUID(),version:1,epoch:1,fingerprint:hash('2')};
  const intent:any={schemaVersion:'worker-bootstrap-admission-v1',purpose,binding,requestId:randomUUID(),deviceProofDigest:hash('3'),channel:{revision:1,certificateEpoch:1,highWaterEpoch:1,profile,validUntil:iso(60000)},
    baseline:{enrollmentGeneration:purpose==='first_enrollment'?0:1,credentialHighWater:purpose==='first_enrollment'?0:1,credential:purpose==='first_enrollment'?null:priorCredential},
    target:{id:randomUUID(),version:1,epoch:purpose==='first_enrollment'?1:2,fingerprint:hash('4')},
    prior:purpose==='first_enrollment'?null:{attemptId:randomUUID(),state:'revoked_credential',credential:priorCredential},expiresAt:iso(60000)};
  const ownerId=randomUUID(),decisionId=randomUUID(),ticket:any={version:'worker-bootstrap-owner-ticket-v1',id:randomUUID(),ownerId,ownerAuthAt:iso(-2000),issuedAt:iso(-1000),decisionId,decisionRevision:1,decisionIntentDigest:reviewDigest(intent),intent};
  const grant:any={version:'bootstrap-channel-grant-proposal-v1',purpose,ownerId,decisionId,decisionRevision:1,ticketId:ticket.id,ticketDigest:hash('5'),snapshotDigest:reviewDigest(snapshot),expiresAt:iso(60000)};
  const proof:any={qualification:'synthetic_bootstrap_channel_proof_v1',snapshot,grant,acceptedGrantDigest:reviewDigest(grant),ticket,ticketDigest:hash('5'),
    decision:{id:decisionId,revision:1,ownerId,authority:'owner_reserved',state:'accepted',intentDigest:reviewDigest(intent),acceptedAt:iso(-2000),expiresAt:iso(60000)},
    owner:{id:ownerId,solePrimary:true,active:true},lifecycle:{binding:copy(binding),hostGeneration:snapshot.hostGeneration,installationGeneration:snapshot.installationGeneration,hostActive:true,installationActive:true},
    issuer:{revision:1,historyDigest:hash('1'),binding:copy(binding),current:true},channelCurrent:true,certificateCurrent:true,ticketCurrent:true,decisionCurrent:true,
    credentialState:purpose==='first_enrollment'?'absent':'terminal',fence:{revision:1,mode:'read_only_repeatable_read',writers:[...bootstrapChannelWriters],proofDigest:hash('6')}};
  const peer=()=>({snapshotDigest:reviewDigest(snapshot),ticketDigest:proof.ticketDigest,requestId:intent.requestId,origin:snapshot.origin,serverName:snapshot.serverName,caDigest:snapshot.caDigest,leafPin:snapshot.leafPin,
    certificateEpoch:snapshot.certificateEpoch,resolverPolicy:snapshot.resolverPolicy,publicAddresses:copy(snapshot.publicAddresses),peerAddress:'8.8.8.8',chainValid:true,hostnameValid:true,proxy:false,redirect:false,sessionReuse:false,observedAt:new Date(now).toISOString(),expiresAt:new Date(now+10000).toISOString()});
  const hooks:{inspect?:(n:number)=>void;peer?:(p:any)=>void;after?:()=>void;reply?:(r:any)=>unknown}={};
  const dependencies={qualification:'synthetic_bootstrap_channel_model_v1' as const,
    inspect:async(id:string)=>{assert.equal(id,ticket.id);inspects++;hooks.inspect?.(inspects);return copy(proof);},
    exchange:async(s:unknown,verify:(p:unknown)=>Promise<boolean>)=>{exchanges++;assert.ok(Object.isFrozen(s));const p=peer();hooks.peer?.(p);if(!await verify(p))throw Error('synthetic peer denied');hooks.after?.();
      const r={snapshotDigest:p.snapshotDigest,ticketDigest:proof.ticketDigest,requestId:intent.requestId,peerDigest:reviewDigest(p),responseDigest:hash('7'),outcome:'response',commitUncertain:false};return hooks.reply?hooks.reply(r):r;}};
  return {proof,snapshot,ticket,intent,profile,iso,hooks,peer,dependencies,now:()=>new Date(now),advance:(ms:number)=>now+=ms,model:createBootstrapChannelModel(dependencies,()=>new Date(now)),input:()=>({ticketId:ticket.id}),counts:()=>({inspects,exchanges})};
}
