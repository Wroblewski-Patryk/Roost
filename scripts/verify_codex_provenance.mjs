/** RF012 offline mathematical checks only. This is NOT a Sigstore admission verifier. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const hash = (b) => crypto.createHash('sha256').update(b).digest();
const b64 = (s) => Buffer.from(s,'base64');
const equal = (a,b) => a.length === b.length && crypto.timingSafeEqual(a,b);
const key = (s) => crypto.createPublicKey({key:b64(s),format:'der',type:'spki'});
export function sshFingerprint(publicKey) {
  const jwk=publicKey.export({format:'jwk'});
  if(jwk.kty!=='EC' || jwk.crv!=='P-256') return null;
  const field=(bytes)=>{const size=Buffer.alloc(4);size.writeUInt32BE(bytes.length);return Buffer.concat([size,bytes]);};
  const point=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]);
  const encoded=Buffer.concat([field(Buffer.from('ecdsa-sha2-nistp256')),field(Buffer.from('nistp256')),field(point)]);
  return 'SHA256:'+hash(encoded).toString('base64').replace(/=+$/,'');
}
export function pae(envelope) {
  const type=Buffer.from(envelope.payloadType), body=b64(envelope.payload);
  return Buffer.concat([Buffer.from('DSSEv1 '+type.length+' '),type,Buffer.from(' '+body.length+' '),body]);
}
export function verifySignature(data,signature,publicKey) {
  try { return crypto.verify('sha256',data,publicKey,b64(signature)); } catch { return false; }
}
export function verifyMerkle(body,proof) {
  let index=BigInt(proof.logIndex), end=BigInt(proof.treeSize)-1n;
  if(index<0n || index>end || end<0n || proof.hashes.length>64) return false;
  let root=hash(Buffer.concat([Buffer.from([0]),body]));
  for(const encoded of proof.hashes) {
    if(end===0n) return false;
    const sibling=b64(encoded);
    if(sibling.length!==32) return false;
    if((index&1n)===1n || index===end) {
      root=hash(Buffer.concat([Buffer.from([1]),sibling,root]));
      while(index!==0n && (index&1n)===0n) {index>>=1n;end>>=1n;}
    } else root=hash(Buffer.concat([Buffer.from([1]),root,sibling]));
    index>>=1n;end>>=1n;
  }
  return index===0n && end===0n && equal(root,b64(proof.rootHash));
}
function tlv(bytes,start=0) {
  if(start+2>bytes.length) throw Error('DER_BOUND');
  const tag=bytes[start];let size=bytes[start+1],cursor=start+2;
  if(size&128) {
    const n=size&127;if(n===0 || n>4 || cursor+n>bytes.length) throw Error('DER_LENGTH');
    size=0;for(let i=0;i<n;i++)size=size*256+bytes[cursor++];
  }
  const end=cursor+size;if(end>bytes.length)throw Error('DER_BOUND');
  return {tag,start:cursor,end,value:bytes.subarray(cursor,end)};
}
function children(node) {const out=[];for(let i=0;i<node.value.length;){const n=tlv(node.value,i);out.push(n);i=n.end;}return out;}
function oid(bytes) {
  const out=[Math.min(2,Math.floor(bytes[0]/40)),bytes[0]%40];let n=0;
  for(const b of bytes.subarray(1)){n=n*128+(b&127);if(!(b&128)){out.push(n);n=0;}}
  return out.join('.');
}
export function certificateClaims(raw) {
  const cert=new crypto.X509Certificate(raw);
  const tbs=children(tlv(raw))[0];
  const ext=children(tbs).find(x=>x.tag===0xa3);
  const strings={};
  if(ext) for(const item of children(children(ext)[0])) {
    const fields=children(item), id=oid(fields[0].value), value=fields.at(-1).value;
    if(id.startsWith('1.3.6.1.4.1.57264.1.')) {
      let data=value;
      if([0x0c,0x13,0x16].includes(value[0])){const inner=tlv(value);if(inner.end===value.length)data=inner.value;}
      strings[id]=data.toString('utf8');
    }
  }
  return {cert,strings};
}
export function verifyInputs(input) {
  const m=input.metadata,p=m.platformPackage,expected=Buffer.from(p.dist.integrity.slice(7),'base64').toString('hex');
  const keys=new Map(m.registryKeys.keys.map(k=>[k.keyid,{meta:k,key:key(k.key)}]));
  const registry={};
  for(const name of ['rootPackage','platformPackage']) {
    const pkg=m[name],data=Buffer.from(pkg.name+'@'+pkg.version+':'+pkg.dist.integrity);
    registry[name]=pkg.dist.signatures.map(s=>{
      const k=keys.get(s.keyid);
      return {keyId:s.keyid,keyFingerprintMatches:k?sshFingerprint(k.key)===s.keyid:false,
        signatureMathVerified:!!k && verifySignature(data,s.sig,k.key),
        operatorKeyExpires:k?.meta.expires??null,operatorKeyTrustPolicyAccepted:false};
    });
  }
  const attestations=m.attestations.map(a=>{
    const env=a.dsseEnvelope,mat=a.verificationMaterial,payload=b64(env.payload),statement=JSON.parse(payload);
    const leaf=mat.certificate?certificateClaims(b64(mat.certificate.rawBytes)):null;
    const pub=leaf?.cert.publicKey??keys.get(mat.publicKey?.hint)?.key;
    const logs=(mat.tlogEntries??[]).map(entry=>{
      const body=b64(entry.canonicalizedBody),content=JSON.parse(body),proof=entry.inclusionProof;
      const verifier=content.spec.signatures[0]?.verifier;
      const signature=content.spec.signatures[0]?.signature;
      let loggedKeyMatches=false;
      try {
        const bytes=b64(verifier),pem=bytes.toString('utf8');
        const logged=pem.includes('CERTIFICATE')?new crypto.X509Certificate(bytes).publicKey:crypto.createPublicKey(bytes);
        loggedKeyMatches=equal(logged.export({format:'der',type:'spki'}),pub.export({format:'der',type:'spki'}));
      } catch { /* Unknown log verifier format is not acceptance. */ }
      const checkpoint=proof.checkpoint.envelope.split('\n');
      const proofRootMatchesCheckpoint=checkpoint[1]===proof.treeSize && checkpoint[2]===proof.rootHash;
      const instant=Number(entry.integratedTime)*1000;
      return {logId:Buffer.from(entry.logId.keyId,'base64').toString('hex'),outerLogIndex:entry.logIndex,
        proofLogIndex:proof.logIndex,treeSize:proof.treeSize,
        merkleInclusionMathVerified:verifyMerkle(body,proof),
        checkpointRootAndSizeConsistent:proofRootMatchesCheckpoint,
        payloadHashMatches:content.spec.payloadHash.algorithm==='sha256' && content.spec.payloadHash.value===hash(payload).toString('hex'),
        loggedSignatureMatches:env.signatures.some(s=>s.sig===signature),loggedPublicKeyMatches:loggedKeyMatches,
        leafWithinCertificateValidityAtClaimedLogTime:leaf?instant>=Date.parse(leaf.cert.validFrom)&&instant<=Date.parse(leaf.cert.validTo):null,
        integratedTime:entry.integratedTime,integratedTimeAuthenticated:false,
        signedEntryTimestampVerified:false,checkpointSignatureVerified:false,
        outerIndexShardBindingVerified:false,transparencyTrustAccepted:false};
    });
    const claims=leaf?.strings??{};
    const workflow=statement.predicate?.buildDefinition?.externalParameters?.workflow;
    const dependency=statement.predicate?.buildDefinition?.resolvedDependencies?.[0];
    return {predicateType:a.predicateType,statementSha256:hash(payload).toString('hex'),
      statementHashMatchesCapture:hash(payload).toString('hex')===a.statementSha256,
      dsseSignatureMathVerified:!!pub && env.signatures.length===1 && verifySignature(pae(env),env.signatures[0].sig,pub),
      subjectMatchesExactPackage:statement.subject.length===1 && statement.subject[0].name==='pkg:npm/%40openai/codex@0.154.0-linux-x64' && statement.subject[0].digest.sha512===expected,
      declaredWorkflowMatches:workflow?workflow.repository==='https://github.com/openai/codex' && workflow.ref==='refs/tags/rust-v0.154.0' && workflow.path==='.github/workflows/rust-release.yml':null,
      declaredCommitMatches:dependency?dependency.digest.gitCommit===m.tagObject.object.sha:null,
      declaredBuilderMatches:workflow?statement.predicate.runDetails.builder.id==='https://github.com/actions/runner/github-hosted':null,
      certificate:leaf?{
        sha256:hash(leaf.cert.raw).toString('hex'),
        sanMatchesExpectedWorkflow:leaf.cert.subjectAltName==='URI:https://github.com/openai/codex/.github/workflows/rust-release.yml@refs/tags/rust-v0.154.0',
        issuerClaim:claims['1.3.6.1.4.1.57264.1.8']??claims['1.3.6.1.4.1.57264.1.1']??null,
        codeSigningEkuPresent:leaf.cert.keyUsage?.includes('1.3.6.1.5.5.7.3.3')??false,
        sourceRepositoryClaim:claims['1.3.6.1.4.1.57264.1.12']??null,
        sourceCommitClaim:claims['1.3.6.1.4.1.57264.1.13']??null,
        sourceRefClaim:claims['1.3.6.1.4.1.57264.1.14']??null,
        validFrom:leaf.cert.validFrom,validTo:leaf.cert.validTo,
        chainVerified:false,sctVerified:false,issuerIdentityAuthenticated:false}:null,
      logs,semanticPolicyAccepted:false};
  });
  return {schemaId:'roost-codex-provenance-crypto-observation-v1',taskId:'RF-HERMES-012',
    verifierScope:'PARTIAL_MATHEMATICAL_CHECKS_NOT_SIGSTORE_ADMISSION',
    registry,attestations,trustRootBootstrap:'BLOCKED_NO_TRUSTED_ROOT',
    provenanceAuthenticated:false,acquisitionReady:false,
    compressedSize:m.archiveHead.contentLength,archiveBodyBytesRead:m.archiveHead.bodyBytesRead,
    nativeSize:null,nativeSha256:null};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const inputPath='docs/architecture/codex-provenance-verification-inputs-v1.json';
  const bytes=fs.readFileSync(inputPath);
  const result=verifyInputs(JSON.parse(bytes));
  result.inputsSha256=hash(bytes).toString('hex');
  console.log(JSON.stringify(result,null,2));
}
