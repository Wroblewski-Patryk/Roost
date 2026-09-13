import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyInputs,verifyMerkle,certificateClaims} from './verify_codex_provenance.mjs';
const original=JSON.parse(fs.readFileSync('docs/architecture/codex-provenance-verification-inputs-v1.json'));
const copy=()=>structuredClone(original);

test('retained signatures and inclusion math pass without granting trust',()=>{
 const r=verifyInputs(copy());
 for(const signatures of Object.values(r.registry))for(const s of signatures){assert.equal(s.signatureMathVerified,true);assert.equal(s.keyFingerprintMatches,true);assert.equal(s.operatorKeyTrustPolicyAccepted,false);}
 for(const a of r.attestations){assert.equal(a.dsseSignatureMathVerified,true);assert.equal(a.subjectMatchesExactPackage,true);assert.equal(a.logs[0].merkleInclusionMathVerified,true);assert.equal(a.logs[0].checkpointSignatureVerified,false);assert.equal(a.semanticPolicyAccepted,false);}
 assert.equal(r.provenanceAuthenticated,false);assert.equal(r.acquisitionReady,false);
});
test('changed package signature and operator key fail mathematics',()=>{
 const input=copy();input.metadata.platformPackage.dist.signatures[0].sig='AAAA';
 assert.equal(verifyInputs(input).registry.platformPackage[0].signatureMathVerified,false);
 const other=copy();other.metadata.registryKeys.keys[1].key=other.metadata.registryKeys.keys[0].key;
 const result=verifyInputs(other).registry.platformPackage[0];
 assert.equal(result.signatureMathVerified,false);assert.equal(result.keyFingerprintMatches,false);
});
test('changed signed subject fails DSSE and log payload binding',()=>{
 const input=copy(),env=input.metadata.attestations[1].dsseEnvelope;
 const body=JSON.parse(Buffer.from(env.payload,'base64'));
 body.subject[0].digest.sha512='0'.repeat(128);
 env.payload=Buffer.from(JSON.stringify(body)).toString('base64');
 const result=verifyInputs(input).attestations[1];
 assert.equal(result.dsseSignatureMathVerified,false);assert.equal(result.subjectMatchesExactPackage,false);
 assert.equal(result.statementHashMatchesCapture,false);assert.equal(result.logs[0].payloadHashMatches,false);
});
test('Merkle proof rejects changed leaf, root, index and excessive hashes',()=>{
 const entry=copy().metadata.attestations[0].verificationMaterial.tlogEntries[0];
 const body=Buffer.from(entry.canonicalizedBody,'base64');
 assert.equal(verifyMerkle(Buffer.from('changed'),entry.inclusionProof),false);
 for(const [name,value] of [['rootHash',Buffer.alloc(32).toString('base64')],['logIndex','-1'],['logIndex',entry.inclusionProof.treeSize],['hashes',Array(65).fill(Buffer.alloc(32).toString('base64'))]]){
  const proof=structuredClone(entry.inclusionProof);proof[name]=value;
  assert.equal(verifyMerkle(body,proof),false);
 }
});
test('checkpoint text substitution is detected and leaf issuer stays unauthenticated',()=>{
 const input=copy();input.metadata.attestations[1].verificationMaterial.tlogEntries[0].inclusionProof.checkpoint.envelope='wrong\n0\nAAAA\n';
 const result=verifyInputs(input).attestations[1];
 assert.equal(result.logs[0].checkpointRootAndSizeConsistent,false);
 assert.equal(result.certificate.chainVerified,false);assert.equal(result.certificate.issuerIdentityAuthenticated,false);
 assert.throws(()=>certificateClaims(Buffer.from([0x30,0x82,0xff,0xff])));
});
test('caller supplied readiness cannot become admission',()=>{
 const input=copy();input.acquisitionReady=true;input.provenanceAuthenticated=true;input.rootTrust='TRUSTED';
 const result=verifyInputs(input);
 assert.equal(result.acquisitionReady,false);assert.equal(result.provenanceAuthenticated,false);
 assert.equal(result.trustRootBootstrap,'BLOCKED_NO_TRUSTED_ROOT');
});
