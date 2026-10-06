import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recoveryOnlyFixture} from './governed-release-compose-recovery-only.test';
import {releaseRecoveryOnlyReadError} from '../modules/agent-runtime/governed-release-contract';

function fixture() {
 const f:any=recoveryOnlyFixture(),workspace=randomUUID();
 Object.assign(f.state.release,{host_id:f.input.hostId,workspace_id:workspace});
 Object.assign(f.release,{host_id:f.input.hostId,workspace_id:workspace,releaser_agent_id:f.input.releaserAgentId,
  releaser_credential_id:f.input.releaserCredentialId,credential_version:f.input.credentialVersion});
 return {previous:f.state,current:{release:f.release,journal:[],revocations:[],effectiveExpiresAt:'2026-10-04T12:30:00.000Z'},
  reader:{agentId:f.input.releaserAgentId,credentialId:f.input.releaserCredentialId,credentialVersion:f.input.credentialVersion,scopes:['agent-runtime:release']}};
}
const now=new Date('2026-10-04T12:06:07.000Z');
test('new active recovery credential can read its exact closed old failure',()=>{
 const f=fixture();assert.notEqual(f.reader.credentialId,f.previous.release.snapshot.releaserCredentialId);
 assert.equal(releaseRecoveryOnlyReadError(f.previous,f.current,f.reader,now),null);
});
const mutations:Record<string,(f:any)=>void>={
 agent:f=>f.reader.agentId=randomUUID(),credential:f=>f.reader.credentialId=randomUUID(),
 epoch:f=>f.reader.credentialVersion++,scope:f=>f.reader.scopes=[],
 host:f=>f.current.release.host_id=randomUUID(),workspace:f=>f.current.release.workspace_id=randomUUID(),
 expired:f=>f.current.effectiveExpiresAt='2026-10-04T12:00:00.000Z',invalidExpiry:f=>f.current.effectiveExpiresAt='invalid',
 revoked:f=>f.current.revocations.push({id:randomUUID()}),
 completed:f=>f.current.journal.push({operation:'cleanup',outcome:{status:'succeeded'}}),
 closure:f=>f.current.release.snapshot.recoveryOnly.closureId=randomUUID(),
 oldRelease:f=>f.current.release.snapshot.recoveryOnly.releaseId=randomUUID(),
 manifest:f=>f.current.release.snapshot.manifestDigest='a'.repeat(64),
 changedEntry:f=>f.current.release.snapshot.recoveryOnly.currentEvidence.dataDigest='a'.repeat(64),
};
for(const [name,mutate] of Object.entries(mutations))test('recovery read refuses '+name,()=>{
 const f=fixture();mutate(f);assert.equal(releaseRecoveryOnlyReadError(f.previous,f.current,f.reader,now),'release_recovery_read_forbidden');
});
