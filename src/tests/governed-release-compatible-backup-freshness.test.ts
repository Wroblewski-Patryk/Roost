import test from 'node:test';
import assert from 'node:assert/strict';
import {compatibleRecoveryCurrentBackupError} from '../modules/agent-runtime/governed-release-contract';
const snapshot={compatibleArtifactRecovery:{},manifest:{backup:{restoreVerifiedAt:'2026-10-05T20:00:00.000Z'}}};
test('compatible effects recheck actual backup age beyond the admission clock',()=>{
 assert.equal(compatibleRecoveryCurrentBackupError(snapshot,new Date('2026-10-06T19:30:00.000Z')),null);
 assert.equal(compatibleRecoveryCurrentBackupError(snapshot,new Date('2026-10-06T20:15:00.000Z')),'release_prerequisite_stale');
});
test('invalid/future compatible backup refuses; ordinary path stays unchanged',()=>{
 assert.equal(compatibleRecoveryCurrentBackupError({manifest:snapshot.manifest},new Date('2026-10-07T00:00:00.000Z')),null);
 for(const restoreVerifiedAt of [null,'not-a-date','2026-10-06T20:02:00.000Z'])assert.equal(compatibleRecoveryCurrentBackupError({ ...snapshot,manifest:{backup:{restoreVerifiedAt}}},new Date('2026-10-06T20:00:00.000Z')),'release_prerequisite_stale');
});
