import {createHash,createPrivateKey,createPublicKey,sign,verify,type KeyObject} from 'node:crypto';
import {v3Domains,v3Envelope,v3Seal,v3Transcript,prepareV3Ticket,prepareV3Seal} from './bootstrap-proof-issuance-contract';
import {proofEqual,selectProofKey,denyProof} from './bootstrap-proof-key-contract';
import {readProofHistory} from './bootstrap-proof-persistence';
import type {AttestationDb as Db} from './decision-attestation-sql';
import type {V3OwnerTicketIssuer,V3BindingSealer} from './bootstrap-proof-issuance';

type PrivateSigner={key:KeyObject;spki:string;digest:string};
function privateSigner(encoded:string|undefined):PrivateSigner|null{
 if(!encoded||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return null;
 try{
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('base64')!==encoded)return null;
  const key=createPrivateKey({key:bytes,format:'der',type:'pkcs8'});
  if(key.asymmetricKeyType!=='ed25519')return null;
  const spkiBytes=createPublicKey(key).export({format:'der',type:'spki'});
  return {key,spki:spkiBytes.toString('base64'),digest:createHash('sha256').update(spkiBytes).digest('hex')};
 }catch{return null;}
}
function signature(bytes:Buffer,signer:PrivateSigner){
 const value=sign(null,bytes,signer.key);
 if(value.length!==64||!verify(null,bytes,createPublicKey(signer.key),value))denyProof();
 return value.toString('hex');
}
function authentic(bytes:Buffer,hex:string,signer:PrivateSigner){
 return /^[a-f0-9]{128}$/.test(hex)&&verify(null,bytes,createPublicKey(signer.key),Buffer.from(hex,'hex'));
}
function issuerMatches(request:ReturnType<typeof prepareV3Ticket>,signer:PrivateSigner){
 const material=request.payload.context.issuer.material;
 return material.spki===signer.spki&&material.publicKeyDigest===signer.digest;
}
async function serverMatches(db:Db,request:ReturnType<typeof prepareV3Seal>,signer:PrivateSigner){
 const attachment=request.payload.attachment;
 const history=await readProofHistory(db,attachment.server.scope);
 const material=selectProofKey(history.records,attachment.server,request.payload.sealedAt,request.payload.sealedAt,null);
 return material.spki===signer.spki&&material.publicKeyDigest===signer.digest;
}

// The two private keys are installed only in the server secret store. Public
// material must still match the current persisted issuer and proof-key streams.
export function createV3CryptoPortsFromEnvironment():{issuer:V3OwnerTicketIssuer;sealer:V3BindingSealer}|null{
 const ticket=privateSigner(process.env.ROOST_V3_TICKET_PRIVATE_KEY_B64);
 const binding=privateSigner(process.env.ROOST_V3_BINDING_PRIVATE_KEY_B64);
 if(!ticket||!binding||ticket.digest===binding.digest)return null;
 const issuer:V3OwnerTicketIssuer={qualification:'injected_owner_ticket_issuer_v3',
  async issue(_db,request){
   if(!issuerMatches(request,ticket))denyProof();
   return v3Envelope.parse({version:'worker-bootstrap-owner-envelope-v3',domain:v3Domains.envelope,
    signed:{payload:request.payload,signature:signature(Buffer.from(request.contentBytes,'hex'),ticket)},
    decision:{payload:request.decision,signature:signature(Buffer.from(request.decisionBytes,'hex'),ticket)}});
  },
  async verify(_db,request,value){
   if(!issuerMatches(request,ticket))return false;
   const envelope=v3Envelope.parse(value),a=request.payload.intent.proofAuthority,ctx=request.payload.context;
   return proofEqual(envelope.signed.payload,request.payload)&&proofEqual(envelope.decision.payload,request.decision)
    &&authentic(v3Transcript(v3Domains.content,a,ctx,envelope.signed.payload),envelope.signed.signature,ticket)
    &&authentic(v3Transcript(v3Domains.decision,a,ctx,envelope.decision.payload),envelope.decision.signature,ticket);
  }
 };
 const sealer:V3BindingSealer={qualification:'injected_roost_binding_sealer_v3',
  async seal(db,request){
   if(!await serverMatches(db,request,binding))denyProof();
   return v3Seal.parse({payload:request.payload,signature:signature(Buffer.from(request.bytes,'hex'),binding)});
  },
  async verify(db,request,value){
   if(!await serverMatches(db,request,binding))return false;
   const seal=v3Seal.parse(value),a=request.payload.attachment,ctx=request.payload.linkBinding.context;
   return proofEqual(seal.payload,request.payload)&&authentic(v3Transcript(v3Domains.seal,a,ctx,seal.payload),seal.signature,binding);
  }
 };
 return {issuer,sealer};
}
