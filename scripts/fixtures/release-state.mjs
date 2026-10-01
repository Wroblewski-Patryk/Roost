import {randomUUID} from 'node:crypto';
import contract from '../lib/agent-host-release-contract.cjs';
// Synthetic identities only. Native tests exercise OS ownership separately;
// this fixture is never a server grant or certification artifact.
export function releaseStateFixture(directory='C:\\Certification\\one'){
 const at=new Date().toISOString(),commit='a'.repeat(40),base='b'.repeat(40),hash='d'.repeat(64);
 const prior={commit:base,imageDigest:`sha256:${'1'.repeat(64)}`,configDigest:hash,schemaDigest:hash};
 const manifest={schemaVersion:'roost-release-manifest-v1',repository:{url:'https://github.com/example/certificate',defaultBranch:'main',canonicalDir:directory,candidateBranch:'codex/certificate'},deployment:{provider:'coolify',targetId:'certificate',controllerUrl:'https://controller.example.test',url:'https://certificate.example.test',imageDigest:`sha256:${'2'.repeat(64)}`,configDigest:hash,schemaDigest:hash},services:[{name:'api',healthUrl:'https://certificate.example.test/health',expectedStatus:200}],baseline:{...prior,healthDigest:hash,dataDigest:hash,observedAt:at},observation:{seconds:1,intervalSeconds:1,maxFailures:0},backup:{digest:hash,bytes:100,capturedAt:at,restoreVerifiedAt:at,restoreDigest:hash},rollback:{...prior,compatibleSchemaDigests:[hash]},cleanup:{repositoryUrl:'https://github.com/example/certificate',canonicalDir:directory,coolifyTargetId:'certificate',ownedResourceIds:[],archiveRepository:true}};
 const snapshot={requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash,commit,candidateTree:'c'.repeat(40),baseCommit:base,baseTree:'e'.repeat(40),releaserRevision:at,expiresAt:new Date(Date.now()+600000).toISOString(),manifest,manifestDigest:contract.releaseDigest(manifest),readinessDigest:hash,configurationDigest:hash};
 return{release:{id:randomUUID(),manifestDigest:snapshot.manifestDigest,snapshot},journal:[],status:'active',expectedVersion:hash};
}
