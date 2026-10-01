import test from 'node:test';
import assert from 'node:assert/strict';
import {createReleaseCleanupGateway} from './lib/agent-host-release-cleanup.mjs';
const manifest={deployment:{targetId:'test-target',controllerUrl:'https://controller.example.test'},cleanup:{ownedResourceIds:['app']}};
const config={origin:'https://controller.example.test',targetId:'test-target'};
function setup(transport){return createReleaseCleanupGateway({resources:{ownedResource:async()=>({kind:'coolify_application',id:'test-target'}),configurationInspector:async()=>({}),reconcileLocal:async()=>({status:'succeeded',evidence:{localAbsent:true}})},coolify:config,credential:async()=>'synthetic-credential',transport});}
test('application cleanup preserves volumes and confirms exact endpoint absence',async()=>{
 const calls=[];const gateway=setup(async req=>{calls.push(req);return{};});
 const e=await gateway.removeResource(manifest,{},'app');assert.deepEqual(e,{absenceVerified:true,resourceIds:['app']});
 assert.equal(calls.length,2);assert.equal(calls[0].method,'DELETE');
 assert.equal(calls[0].url,'https://controller.example.test/api/v1/applications/test-target?delete_volumes=false&delete_connected_networks=false&docker_cleanup=false');
 assert.equal(calls[1].method,'GET');assert.equal(calls[1].expectedStatus,404);
});
test('lost deletion reply is never retried; reconciliation reads current state',async()=>{
 const calls=[];const gateway=setup(async req=>{calls.push(req);if(req.method==='DELETE')throw Error('reply lost');return{};});
 await assert.rejects(gateway.removeResource(manifest,{},'app'));const r=await gateway.reconcileResource(manifest,{},'app');
 assert.equal(r.status,'succeeded');assert.equal(calls.filter(c=>c.method==='DELETE').length,1);
});
test('lost read or unauthorized response cannot prove removal',async()=>{
 const gateway=setup(async()=>{throw Error('403 or unknown');});await assert.rejects(gateway.reconcileResource(manifest,{},'app'));
});
test('a queued deletion with application still present never proves an absent effect',async()=>{
 const calls=[];const gateway=setup(async req=>{calls.push(req);if(req.expectedStatus===404)throw Error('still present');return{uuid:'test-target'};});
 await assert.rejects(gateway.reconcileResource(manifest,{},'app'),/removal_unproven/);
 assert.equal(calls.filter(c=>c.method==='DELETE').length,0);
});
test('target mismatch prevents credential read and deletion',async()=>{
 let called=false;const gateway=setup(async()=>{called=true;return{};});await assert.rejects(gateway.removeResource({...manifest,deployment:{...manifest.deployment,targetId:'different'}},{},'app'));
 assert.equal(called,false);
});
