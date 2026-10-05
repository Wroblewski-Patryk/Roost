import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createComposeStateInspector } from './lib/agent-host-release-compose-inspector.mjs';
import { releaseWorkerDiagnostic, persistReleaseWorkerDiagnostic } from './lib/agent-host-release-worker.mjs';

const generic='release_compose_inspector_transport_unproven';
const nativeReasons=[
 'release_child_native_assignment_unobserved','release_child_native_resume_or_cleanup_unproven',
 'release_child_git_ownership_unproven','release_child_git_config_unreadable','release_child_git_repository_unavailable',
 'release_child_native_access_denied','release_child_native_exit_failed','release_child_ssh_timeout',
 'release_child_ssh_connection_closed','release_child_ssh_host_identity_unproven','release_native_request_bounds_invalid'
];
function inspector(transport){
 return createComposeStateInspector({
  targets:[{targetId:'fixtureapp',composePath:'/compose.yml',repositoryUrl:'https://github.com/example/private-app',branch:'main',
   services:[{name:'app',role:'app',source:'built',expectedState:'running'},
    {name:'migrate',role:'migration',source:'built',expectedState:'completed'},
    {name:'db',role:'database',source:'image',expectedState:'running'}]}],
  sourcePins:{queueHelper:'a'.repeat(64),deploymentJob:'b'.repeat(64),controllerRenderer:'c'.repeat(64)},transport,
  sourceForCommit:async()=>{assert.fail('transport denial must not continue');},
  treeForCommit:async()=>{assert.fail('transport denial must not continue');},
  readDeployment:async()=>{assert.fail('transport denial must not continue');}
 });
}

for(const nativeReason of nativeReasons)test('Compose transport retains only the fixed diagnostic '+nativeReason,async()=>{
 const leaf=Object.assign(Error(nativeReason),{privateDetails:'fictional-private-value'});
 const original=Error('release_compose_installation_ssh_unavailable',{cause:leaf});
 let calls=0;
 const reader=inspector(async descriptor=>{calls++;assert.equal(descriptor.write,false);throw original;});
 await assert.rejects(reader.inspectConfiguration('fixtureapp','a'.repeat(40)),error=>{
  assert.equal(error.message,generic);assert.equal(error.retryable,false);assert.equal(error.cause,original);
  assert.equal(Object.prototype.propertyIsEnumerable.call(error,'cause'),false);
  assert.equal(JSON.stringify(error).includes('fictional-private-value'),false);
  assert.equal(releaseWorkerDiagnostic(error),nativeReason);
  assert.equal(releaseWorkerDiagnostic(Error('private outer content',{cause:error})),nativeReason);
  return true;
 });
 assert.equal(calls,1);
});

test('Compose unknown or spoofed causes retain the generic refusal without persisting their bodies',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'compose-transport-diagnostic-'));
 try{
  for(const cause of [Error('release_child_secret_private'),Error('release_child_native_exit_failed\nBearer fictional-private-value'),
   Error('native_request_bounds_invalid'),Error('release_native_request_bounds_invalid private-value'),
   Error('release_api_uncertain'),Object.assign(Error('private-value'),{transportDiagnostic:'release_child_native_exit_failed'}),
   'private-value',null]){
   let caught;
   await assert.rejects(inspector(async()=>{throw cause;}).inspectConfiguration('fixtureapp','a'.repeat(40)),error=>{caught=error;return error.message===generic;});
   assert.equal(releaseWorkerDiagnostic(caught),generic);
   assert.equal(persistReleaseWorkerDiagnostic(path.join(dir,'config.json'),'blocked',releaseWorkerDiagnostic(caught)),true);
   const bytes=readFileSync(path.join(dir,'release-worker-diagnostic.json'),'utf8'),receipt=JSON.parse(bytes);
   assert.equal(receipt.phase,'blocked');assert.equal(receipt.reason,generic);
   assert.deepEqual(Object.keys(receipt).sort(),['observedAt','phase','reason']);
   assert.equal(bytes.includes('private-value'),false);assert.equal(bytes.includes('Bearer'),false);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('native-cause priority is confined to transport denial and the existing four-node bound',()=>{
 for(const reason of ['release_compose_inspector_response_invalid','release_compose_inspector_runtime_unproven',
  'release_compose_installation_configuration_preimage_changed','release_readiness_changed'])
  assert.equal(releaseWorkerDiagnostic(Error(reason,{cause:Error('release_child_native_exit_failed')})),reason);
 assert.equal(releaseWorkerDiagnostic(Error(generic,{cause:Error('outer',{cause:Error('outer',{cause:Error('outer',
  {cause:Error('release_child_native_exit_failed')})})})})),generic);
 const cycle=Error('private-value');cycle.cause=cycle;
 assert.equal(releaseWorkerDiagnostic(Error(generic,{cause:cycle})),generic);
 assert.equal(releaseWorkerDiagnostic(Error(generic+' private-value')),'release_preflight_unproven');
});

test('nonzero transport output remains generic and never fabricates a native child cause',async()=>{
 let calls=0;
 await assert.rejects(inspector(async()=>{calls++;return {exitCode:1,stdout:'private-value',stderr:'release_child_native_exit_failed'};})
  .inspectConfiguration('fixtureapp','a'.repeat(40)),error=>{
   assert.equal(error.message,generic);assert.equal(error.cause,undefined);assert.equal(releaseWorkerDiagnostic(error),generic);return true;
  });
 assert.equal(calls,1);
});
