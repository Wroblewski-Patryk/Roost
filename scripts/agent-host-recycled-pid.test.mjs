import test from 'node:test';import assert from 'node:assert/strict';
import{recordedProcessIsAbsent}from'./lib/agent-host-process-identity.mjs';
const old={pid:42,creationTime:'130000000000000002',executablePathDigest:'a'.repeat(64),executableDigest:'b'.repeat(64)};
test('complete later process at same PID proves recorded owner absence',()=>assert.equal(recordedProcessIsAbsent(old,{...old,creationTime:'130000000000000003'}),true));
test('current owner including changed executable bytes stays fenced',()=>{assert.equal(recordedProcessIsAbsent(old,{...old}),false);assert.equal(recordedProcessIsAbsent(old,{...old,executableDigest:'c'.repeat(64)}),false);});
test('older creation, other PID and incomplete observations cannot reclaim',()=>{for(const current of [{...old,creationTime:'130000000000000001'},{...old,pid:43},{...old,creationTime:'130000000000000003',executableDigest:undefined},undefined])assert.equal(recordedProcessIsAbsent(old,current),false);});
test('absence needs full original process identity',()=>{assert.equal(recordedProcessIsAbsent(old,null),true);for(const recorded of [{pid:42},{...old,creationTime:'1'},null])assert.equal(recordedProcessIsAbsent(recorded,null),false);});
