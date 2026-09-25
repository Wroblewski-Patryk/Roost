import type {CompletionVerification} from './bootstrap-canonical-completion';
import {completionDomain} from './bootstrap-canonical-completion-contract';

// Inventory of existing wire domains, NOT new signing authority. The only
// canonical SPKI history is purpose-bound to owner tickets. Neither that key
// nor an owner-decision attestation key may authorize these three signatures.
export const completionPublicVerifierContract=Object.freeze({
 version:'canonical-completion-public-verifier-contract-v1' as const,
 status:'blocked' as const,
 cryptographyQualified:false as const,
 signerAuthorityQualified:false as const,
 domains:Object.freeze({peer:'roost-worker-bootstrap-v1:peer',completion:'roost-worker-bootstrap-v1:completion',binding:completionDomain}),
 blockers:Object.freeze([
  'bootstrap_peer_signer_purpose_history_unavailable',
  'bootstrap_completion_signer_purpose_history_unavailable',
  'bootstrap_binding_signer_purpose_history_unavailable'
 ] as const)
});

// Explicit dependency compatible with createCanonicalBootstrapCompletion.
// This is only the blocked contract, not a cryptographic implementation. It
// accepts no public-key override, reader, signer or trust callback. Until an
// authorized signer/purpose/history exists, every verdict must remain false.
// No Db access or caller-controlled property evaluation can manufacture trust.
export function createCanonicalCompletionPublicVerifier():CompletionVerification&{
 readonly contract:typeof completionPublicVerifierContract
}{
 return Object.freeze({qualification:'injected_bootstrap_completion_verifier_v1' as const,
  contract:completionPublicVerifierContract,verify:async()=>false});
}
