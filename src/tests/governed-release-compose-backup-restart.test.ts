import test from 'node:test';
import assert from 'node:assert/strict';
import {configAbsenceFixture} from './governed-release-compose-config-absence.test';
import {releaseDigest,releasePublishedGitBasis,releaseWindowError} from '../modules/agent-runtime/governed-release-contract';

function freshBackup(f:any) {
 f.input.manifest.backup={digest:'e'.repeat(64),restoreDigest:'e'.repeat(64),bytes:20,
  capturedAt:'2026-10-04T12:04:00.000Z',restoreVerifiedAt:'2026-10-04T12:05:00.000Z'};
 f.input.manifestDigest=releaseDigest(f.input.manifest);
 return f;
}
test('new verified archive inherits exact published Git after authentic no-effect closure without changing historical snapshot',()=>{
 const f=freshBackup(configAbsenceFixture());f.closed();const before=structuredClone(f.state);
 const result=releasePublishedGitBasis(f.state,f.input);
 assert.equal(result.error,undefined);
 for(const [i,key]of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'].entries())assert.equal(result.publishedGitBasis[key],f.state.journal[i].id);
 assert.deepEqual(f.state,before);
});
test('archive renewal cannot restamp the same archive, predate restore, omit proof or change any operational basis',()=>{
 const changes=[
  (f:any)=>f.input.manifest.backup.digest=f.input.manifest.backup.restoreDigest=f.s.manifest.backup.digest,
  (f:any)=>f.input.manifest.backup.restoreDigest='0'.repeat(64),
  (f:any)=>f.input.manifest.backup.bytes=0,
  (f:any)=>f.input.manifest.backup.capturedAt=f.s.manifest.backup.restoreVerifiedAt,
  (f:any)=>f.input.manifest.backup.restoreVerifiedAt='2026-10-04T12:03:00.000Z',
  (f:any)=>f.input.manifest.backup.extra='unattested',
  (f:any)=>f.input.manifest.baseline.schemaDigest='0'.repeat(64),
  (f:any)=>f.input.manifest.baseline.dataDigest='0'.repeat(64),
  (f:any)=>f.input.manifest.observation.seconds++,
  (f:any)=>f.input.manifest.deployment.targets[0].configuration.environmentDigest='0'.repeat(64),
  (f:any)=>f.input.manifest.cleanup.protectedResourceIds=[],
  (f:any)=>f.input.manifest.repository.canonicalDir='C:\\Other',
  (f:any)=>f.input.commit='0'.repeat(40),
  (f:any)=>f.state.revocations=[]
 ];
 for(const change of changes){const f=freshBackup(configAbsenceFixture());f.closed();change(f);assert.ok(releasePublishedGitBasis(f.state,f.input).error);}
});
test('fresh backup eligibility does not extend the normal 24-hour prerequisite or grant window',()=>{
 const f=freshBackup(configAbsenceFixture()),at=new Date('2026-10-05T12:05:01.000Z');
 f.input.manifest.baseline.observedAt=at.toISOString();f.input.expiresAt=new Date(at.getTime()+1800000).toISOString();
 assert.equal(releaseWindowError(f.input,new Date(at.getTime()+3600000),at),'release_prerequisite_stale');
});
