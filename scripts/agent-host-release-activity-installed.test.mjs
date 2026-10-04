import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import {composeConfigurationDigest} from './lib/agent-host-release-compose-state.mjs';
import {fixture as composeFixture,hash,image} from './fixtures/release-compose-contract.cjs';
import {activityControllerDigest,deriveActivitySessionToken,createActivityReleaseAdapter} from './lib/agent-host-release-activity-adapter.mjs';
import {createInstalledActivityTransport,renderActivityFixtureProgram,renderActivityPythonStdin,activityRestorationDigests} from './lib/agent-host-release-activity-installed.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>JSON.stringify(Array.isArray(v)?v.map(v=>JSON.parse(canonical(v))):v&&typeof v==='object'?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(canonical(v))])):v)
 .replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const at=delta=>new Date(Date.now()+(delta??0)).toISOString();
const sorted=v=>v.slice().sort((a,b)=>a.name.localeCompare(b.name));
const pins=rows=>sorted(rows).map(r=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest'].map(k=>[k,r[k]])));
const observed=rows=>sorted(rows).map(r=>({...pins([r])[0],status:r.state==='paused'?'running':r.state,paused:r.state==='paused',health:r.health}));

function fixture(){
 const f=composeFixture(),calls=[];
 for(const config of [f.target.configuration,f.target.baseline.configuration,f.target.rollbackConfiguration]){
  config.services.find(r=>r.name==='maintenance').name='maintenance_cadence';
  config.services.push({...structuredClone(config.services.find(r=>r.role==='cadence')),name:'proactive_cadence',mountDigest:hash('5')});
 }
 f.target.baseline.images.find(r=>r.name==='maintenance').name='maintenance_cadence';
 f.target.baseline.images.push({name:'proactive_cadence',imageDigest:image('4')});
 f.target.configDigest=composeConfigurationDigest(f.target.configuration);f.target.baseline.configDigest=composeConfigurationDigest(f.target.baseline.configuration);
 f.target.rollbackConfigDigest=composeConfigurationDigest(f.target.rollbackConfiguration);
 for(const [key,digest] of [['deployment',f.target.configDigest],['baseline',f.target.baseline.configDigest],['rollback',f.target.rollbackConfigDigest]])
  f.m[key].configDigest=contract.releaseDigest([{targetId:f.target.targetId,configDigest:digest}]);
 f.m.deployment.artifactSetDigest=contract.sourceArtifactDigest(f.m,f.s);f.m.baseline.artifactSetDigest=contract.sourceArtifactDigest(f.m,f.s,'baseline');
 f.m.rollback.artifactSetDigest=contract.sourceArtifactDigest(f.m,f.s,true);
 f.m.cleanup.protectedResourceIds=[...new Set([f.target.targetId,...f.target.baseline.images.map(r=>r.imageDigest),...f.target.configuration.services.map(r=>r.mountDigest),image('e')])];
 const baselineServices=f.evidence(true).composeTargets[0].runtime.services,rows=f.evidence().composeTargets[0].runtime.services;
 // A newly deployed candidate is allowed new container IDs and built images.
 for(const r of rows)if(r.role!=='database')r.containerId=sha('candidate-'+r.name);
 const raw={schemaVersion:'roost-activity-runtime-settings-private-v1',targetId:f.target.targetId,
  database:{containerId:baselineServices.find(r=>r.name==='db').containerId,adminUser:'postgres',adminDatabase:'postgres',applicationUser:'app',applicationDatabase:'app',originalRoleConfig:['default_transaction_read_only=off','search_path=public']},
  ingress:{chain:'DOCKER-USER',port:8000,protocol:'tcp',appContainerId:baselineServices.find(r=>r.name==='app').containerId,networkId:hash('9'),originalOwnedRuleAbsent:true,originalRulesDigest:hash('0')},
  cadences:baselineServices.filter(r=>r.role==='cadence').map(r=>({name:r.name,containerId:r.containerId,imageDigest:r.imageDigest,mountDigest:r.mountDigest,
   originalState:'running',originalExitCode:0,behavior:'restore_existing_loop',behaviorDigest:sha('behavior-'+r.name)})),
  browserAccess:{kind:'pydantic_settings_auth_cookie_v1',settingsSourcePath:'/app/app/config.py',routesSourcePath:'/app/app/routes.py',settingsSourceDigest:hash('a'),routesSourceDigest:hash('b')},
  cadenceEvidence:{schema:'public',table:'cadence_state',expectedOwner:'external_scheduler',expectedMode:'externalized',expectedSources:{
   settingsSourcePath:'/app/app/config.py',settingsSourceDigest:hash('a'),schedulerSourcePath:'/app/app/scheduler.py',schedulerSourceDigest:hash('b'),
   maintenanceEntrypointPath:'/app/scripts/maintenance.py',maintenanceEntrypointDigest:hash('c'),proactiveEntrypointPath:'/app/scripts/proactive.py',proactiveEntrypointDigest:hash('d')}},
  internalHealth:{frontendMetaName:'fixture-revision'}};
 const source={fixture:readFileSync(new URL('./lib/agent-host-release-activity-fixture.py',import.meta.url)),
  runtime:readFileSync(new URL('./lib/agent-host-release-activity-runtime.py',import.meta.url)),browser:readFileSync(new URL('./lib/agent-host-release-activity-browser.mjs',import.meta.url))};
 const settings={seedCredentialTarget:'Roost/fixture/seed',policy:{file:'C:\\Private\\scope.json',sha256:hash('0')},controller:{sha256:sha(source.fixture)},
  runtimeController:{sha256:sha(source.runtime)},ui:{sha256:sha(source.browser)},runtimeSettings:{file:'C:\\Private\\runtime.json',sha256:sha(JSON.stringify(raw))}};
 const fixtureId=randomUUID(),summary=`Roost controlled activity fixture ${fixtureId}`;
 const fixtureScope={fixtureId,userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),memoryId:-Number(1n+BigInt('0x'+fixtureId.replaceAll('-',''))%2000000000n),
  summaryDigest:sha(summary),markerDigest:sha(canonical({fixtureId,email:`roost-fixture-${fixtureId}@example.invalid`,displayName:`Roost controlled fixture ${fixtureId}`,ownership:'roost-activity-fixture-v1'}))};
 const digests=activityRestorationDigests(raw),p={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:f.s.commit,candidateTree:f.s.candidateTree,
  controllerDigest:activityControllerDigest(settings),fixture:fixtureScope,baselineSequenceDigest:hash('6'),budget:{providerRequests:0,externalActions:0},
  runtimeResume:{approved:true,databaseSettingsDigest:digests.databaseSettingsDigest,ingressSettingsDigest:digests.ingressSettingsDigest,observationSeconds:1,
   cadences:raw.cadences.map(({name,behavior,behaviorDigest})=>({name,behavior,behaviorDigest}))}};
 f.m.postObservation=p;
 const s={...f.s,requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,
  reviewId:randomUUID(),materialVersion:hash('1'),releaserRevision:at(),expiresAt:at(60000),manifestDigest:contract.releaseDigest(f.m)};
 const state={status:'active',release:{id:randomUUID(),snapshot:s,manifestDigest:s.manifestDigest},journal:[]},binding={...s,releaseId:state.release.id};
 const evidence={...f.evidence(),observedAt:at(-10000)};evidence.composeTargets[0].runtime.services=structuredClone(rows);
 const done=(operation,parameters={})=>({id:randomUUID(),operation,createdAt:at(-15000),intent:{parameters},outcome:{requestId:randomUUID(),status:'succeeded',observationOnly:operation==='observe',evidence}});
 state.journal.push(done('deploy'),done('observe',{mode:'candidate'}));
 const pending=operation=>{const row={id:randomUUID(),operation,createdAt:at(-5000),intent:{parameters:{postObservationDigest:contract.releaseDigest(p)}},outcome:null};state.journal.push(row);return row;};
 pending('smoke');
 const privatePolicy={schemaVersion:'roost-activity-installed-policy-v1',postObservationDigest:contract.releaseDigest(p),fixtureDigest:contract.releaseDigest(p.fixture),targetId:f.target.targetId,
  applicationId:s.applicationId,createdAt:at(-30000),expiresAt:at(60000),catalogDigest:hash('7'),controllerProgramDigest:sha(renderActivityFixtureProgram(source.fixture.toString('utf8')))};
 settings.policy.sha256=sha(JSON.stringify(privatePolicy));
 const buffers=new Map([[settings.policy.file,Buffer.from(JSON.stringify(privatePolicy))],[settings.runtimeSettings.file,Buffer.from(JSON.stringify(raw))]]);
 const native={fixture:'absent',readOnly:true,ingress:true,other:0};
 const data=()=>({nonOwnedDigest:f.m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,catalogDigest:privatePolicy.catalogDigest,fullDataDigest:native.fixture==='absent'?f.m.baseline.dataDigest:hash('8')});
 const root={manifest:f.m,binding,settings,seed:hash('f'),installation:{sshHost:'fixture-vps',frontendMetaName:'fixture-revision'},baselineServices,
  readScopeBytes:async({file})=>buffers.get(file),readReleaseState:async()=>structuredClone(state),
  readRuntime:async({commit,tree})=>({observedAt:at(),targetId:f.target.targetId,commit,tree,services:structuredClone(rows)}),
  fullFingerprint:async()=>({schemaDigest:f.m.baseline.schemaDigest,dataDigest:data().fullDataDigest}),
  ssh:async options=>{
   calls.push({kind:'ssh',options});assert.equal(options.command,'python3 -');assert.equal(options.timeoutMs,90000);assert(options.stdin.length<=131072);
   const encoded=[...options.stdin.matchAll(/base64\.b64decode\('([A-Za-z0-9+/=]+)'\)/g)].map(m=>m[1]);assert.equal(encoded.length,2);
   const request=JSON.parse(Buffer.from(encoded[1],'base64').toString('utf8')),isFixture=request.seedHex!==undefined;
   assert.equal(Buffer.from(encoded[0],'base64').toString('utf8'),(isFixture?source.fixture:source.runtime).toString('utf8'));
   const policy=request.policy;
   assert.deepEqual(pins(rows),sorted(policy.expectedRuntime));
   if(isFixture){
    assert.equal(request.seedHex,hash('f'));let effect=false;
    if(request.operation==='smoke_prepare_empty'){native.fixture='empty';effect=true;}
    if(request.operation==='smoke_populate'){native.fixture='populated';effect=true;}
    if(request.operation==='fixture_cleanup'){native.fixture='absent';effect=true;}
    const d=data();return JSON.stringify({schemaVersion:'roost-activity-fixture-observation-v1',operation:request.operation,releaseId:binding.releaseId,operationId:policy.operationId,manifestDigest:s.manifestDigest,targetId:f.target.targetId,
     commit:policy.commit,tree:policy.tree,fixtureId:p.fixture.fixtureId,controllerProgramDigest:privatePolicy.controllerProgramDigest,runtimeDigest:sha(canonical(observed(rows))),observedAt:at(),
     expectedTreeBoundByParentObservation:true,providerCalls:0,cadenceStarted:false,fenceChanged:false,nativeJobQualified:false,ownedDatabaseSessionsClosed:true,
     observed:policy.baseline===null?{phase:'needs_baseline_seal',state:'absent',observed:d,effect:false,nativeJobQualified:false,releaseSchemaVerified:false}:
      {phase:'observed',state:native.fixture,effect,nonOwnedUnchanged:true,sequenceUnchanged:true,catalogUnchanged:true,fullDataParity:native.fixture==='absent',before:d,after:d,
       nativeJobQualified:false,releaseSchemaVerified:false,memoryId:p.fixture.memoryId,summaryDigest:p.fixture.summaryDigest,markerDigest:p.fixture.markerDigest}});
   }
   if(request.operation==='read_health')return JSON.stringify({schemaVersion:'roost-activity-internal-health-observation-v1',backendCommit:policy.commit,frontendCommit:policy.commit,healthy:true,observedAt:at(),runtimeDigest:sha(canonical(observed(rows))),providerCalls:0,effect:false,nativeJobQualified:false});
   if(request.operation==='read_browser_access')return JSON.stringify({schemaVersion:'roost-activity-browser-access-observation-v1',containerAddress:'172.19.0.3',cookieName:'fixture_session',
    settingsSourceDigest:raw.browserAccess.settingsSourceDigest,routesSourceDigest:raw.browserAccess.routesSourceDigest,source:'settings_default',runtimeDigest:sha(canonical(observed(rows))),providerCalls:0,effect:false,nativeJobQualified:false});
   if(request.operation==='cadence_tick_read')return JSON.stringify({schemaVersion:'roost-activity-cadence-observation-v1',status:'observed',runtimeDigest:sha(canonical(observed(rows))),startedAt:request.observation.startedAt,observedAt:at(),effect:false,nativeJobQualified:false,
    cadenceEvidence:p.runtimeResume.cadences.map(c=>({name:c.name,behaviorDigest:c.behaviorDigest,completedTicks:1,executionState:'executed',behaviorVerified:true,summaryDigest:hash('3'),lastRunAt:request.observation.startedAt,observedAt:at(),
     expectedExecutionState:null,executionExpectationVerified:false,providerRequests:null,providerRequestsVerified:false,externalActions:null,externalActionsVerified:false,failureState:'unknown',failures:null}))});
   const materialized=request.runtimeSettings;assert.equal(materialized.database.containerId,rows.find(r=>r.name==='db').containerId);
   assert.equal(materialized.ingress.appContainerId,rows.find(r=>r.name==='app').containerId);
   for(const c of materialized.cadences){const r=rows.find(r=>r.name===c.name);assert.equal(c.imageDigest,r.imageDigest);assert.equal(c.containerId,r.containerId);}
   let effect=false;
   if(request.operation==='hold_ingress'){native.ingress=true;effect=true;}
   if(request.operation==='open_fixture_window'){native.readOnly=false;effect=true;}
   if(request.operation==='refence_fixture_window'){native.readOnly=true;effect=true;}
   if(request.operation==='restore_runtime'){native.readOnly=false;native.ingress=false;for(const r of rows)if(r.role==='cadence')r.state='running';effect=true;}
   return JSON.stringify({schemaVersion:'roost-activity-runtime-observation-v1',operation:request.operation,releaseId:binding.releaseId,operationId:policy.operationId,fixtureId:p.fixture.fixtureId,targetId:f.target.targetId,
    manifestDigest:s.manifestDigest,controllerProgramDigest:settings.runtimeController.sha256,runtimeDigest:sha(canonical(observed(rows))),databaseReadOnly:native.readOnly,activeOtherSessions:native.other,activeOwnedSessions:0,
    roleConfigDigest:hash('1'),originalRoleConfigMatches:!native.readOnly,ingressOwnedRulePresent:native.ingress,ingressBlockedByRoot:request.facts.ingressBlockedByRoot,
    cadencesHeld:rows.filter(r=>r.role==='cadence').every(r=>r.state!=='running'),cadences:rows.filter(r=>r.role==='cadence').map(r=>({name:r.name,state:r.state,behaviorDigest:p.runtimeResume.cadences.find(c=>c.name===r.name).behaviorDigest})),
    ...activityRestorationDigests(materialized),effect,providerCalls:0,nativeJobQualified:false,externalHealthVerified:false,cadenceTicksVerified:false,observedAt:at(),browser:{containerAddress:'172.19.0.3',cookieName:'fixture_session'}});
  },
  nativeProcess:async(kind,options)=>{calls.push({kind:'node',options});assert.equal(kind,'node');assert.equal(options.argv.length,1);assert.equal(options.durationMs,90000);assert.equal(options.maxBytes,8192);
   assert.equal(options.argv[0],fileURLToPath(new URL('./lib/agent-host-release-activity-browser.mjs',import.meta.url)));
   const input=JSON.parse(options.input);assert.equal(input.containerAddress,'172.19.0.3');assert.equal(input.cookieName,'fixture_session');assert.equal(input.port,49173);
   assert.equal(input.token,deriveActivitySessionToken(p.fixture,hash('f')));
   return Buffer.from(JSON.stringify({phase:input.phase,activityCount:input.phase==='empty'?0:1,backendCommit:s.commit,frontendCommit:s.commit,
    renderedEventId:input.phase==='empty'?null:p.fixture.eventId,renderedSummaryDigest:input.phase==='empty'?null:p.fixture.summaryDigest,renderDigest:hash('2'),negativePathStatus:401,providerRequests:0,externalActions:0}));},
  assertNativeClosed:async()=>({nativeChildrenClosed:true}),
  probeIngressBlocked:async options=>{calls.push({kind:'probe',options});assert.equal(native.ingress,true);return {blocked:true,observedAt:at(),httpStatus:502,transportTimeout:false};},
  healthProbe:async({commit,since})=>{calls.push({kind:'health'});await new Promise(resolve=>setTimeout(resolve,1050));const end=at();return {backendCommit:commit,frontendCommit:commit,healthy:true,startedAt:since,observedAt:end,
   cadenceEvidence:p.runtimeResume.cadences.map(c=>({name:c.name,behaviorDigest:c.behaviorDigest,completedTicks:1,executionState:'executed',behaviorVerified:true,summaryDigest:hash('3'),observedAt:end}))};}
 };
 const facade=()=>createInstalledActivityTransport(root),transport=()=>facade().transport;
 const fixturePolicy=(baseline=true)=>({schemaVersion:'roost-activity-fixture-policy-v1',kind:'synthetic_recent_activity',targetId:f.target.targetId,applicationId:s.applicationId,coolifyApplicationId:f.target.configuration.topology.applicationId,
  releaseId:binding.releaseId,operationId:state.journal.at(-1).id,...p.fixture,createdAt:privatePolicy.createdAt,expiresAt:privatePolicy.expiresAt,commit:s.commit,tree:s.candidateTree,manifestDigest:s.manifestDigest,
  expectedRuntime:pins(rows),controllerProgramDigest:privatePolicy.controllerProgramDigest,frontendMetaName:'fixture-revision',
  baseline:baseline?{releaseSchemaDigest:f.m.baseline.schemaDigest,releaseDataDigest:f.m.baseline.dataDigest,nonOwnedDigest:f.m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,catalogDigest:privatePolicy.catalogDigest}:null});
 const save=out=>{state.journal.at(-1).outcome={...out,requestId:randomUUID(),observationOnly:false,evidence:{...out.evidence,observedAt:at()}};};
 return {...f,s,p,root,settings,binding,state,raw,source,privatePolicy,buffers,native,rows,baselineServices,calls,pending,transport,facade,fixturePolicy,save,summary};
}

test('factory has no native effects, seals fixed sources, normalized restoration and original baseline identities',async()=>{
 const f=fixture(),t=f.transport();assert.equal(f.calls.length,0);const sealed=await t.validateScope();
 assert.equal(f.calls.length,0);assert.equal(sealed.policyDigest,f.settings.policy.sha256);
 const before=JSON.stringify(f.raw),r=await t.readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.commit,tree:f.s.candidateTree});
 assert.equal(r.databaseReadOnly,true);assert.equal(r.ingressBlocked,true);assert.equal(JSON.stringify(f.raw),before);
 assert.notEqual(f.raw.ingress.appContainerId,f.rows.find(r=>r.name==='app').containerId);
});

test('fixed Python rendering keeps code outside argv and policy; exact program seal and bounded stdin',()=>{
 const f=fixture(),program=renderActivityFixtureProgram(f.source.fixture.toString());assert.equal(sha(program),f.privatePolicy.controllerProgramDigest);
 const request={operation:'reconcile',policy:f.fixturePolicy(),seedHex:hash('f')},render=renderActivityPythonStdin(f.source.fixture.toString(),request);
 assert(render.startsWith('import base64,io,sys\n'));assert(!render.includes(hash('f')));assert(render.includes("_scope['TRUSTED_SOURCE']=_SOURCE"));
 assert.throws(()=>renderActivityFixtureProgram('operator code'),/fixed_fixture_source_invalid/);
 assert.throws(()=>renderActivityPythonStdin('x',{data:'x'.repeat(65536)}),/request_bound/);
 const raw=structuredClone(f.raw);raw.database.originalRoleConfig.push('application_name=zażółć');
 const {containerId,...normal}=raw.database;
 assert.equal(activityRestorationDigests(raw).databaseSettingsDigest,sha(canonical(normal)));
});

test('readonly fixture and sequence use fixed source job and return no native qualification invention',async()=>{
 const f=fixture(),t=f.transport(),out=await t.fixture('reconcile',{policy:f.fixturePolicy(),seed:hash('f')});
 assert.equal(out.nativeJobQualified,false);assert.equal(out.observed.effect,false);assert.equal(out.observed.state,'absent');
 assert.deepEqual(await t.sequenceRead(),{sequenceDigest:f.p.baselineSequenceDigest});
 assert(f.calls.every(c=>c.kind==='ssh'));assert(!f.calls.some(c=>c.kind==='node'));assert.equal(f.native.fixture,'absent');
});

test('installed callbacks compose with pure adapter through smoke/cleanup/resume without overwriting seals',async()=>{
 const f=fixture(),original=JSON.stringify(f.raw),t=f.transport();
 const adapter=createActivityReleaseAdapter({manifest:f.m,binding:f.binding,settings:f.settings,seed:hash('f'),readState:f.root.readReleaseState,transport:t});
 for(const operation of ['smoke','fixture_cleanup','runtime_resume']){
  if(operation!=='smoke')f.pending(operation);
  const out=await adapter.postObservation(f.m,f.binding,{operation,operationId:f.state.journal.at(-1).id});assert.equal(out.status,'succeeded');f.save(out);
 }
 assert.equal(f.native.fixture,'absent');assert.equal(f.native.ingress,false);assert.equal(JSON.stringify(f.raw),original);
 assert.equal(f.calls.filter(c=>c.kind==='node').length,2);assert.equal(f.calls.filter(c=>c.kind==='health').length,1);
});

for(const [name,change] of [
 ['missing native callback',f=>delete f.root.ssh],
 ['unsealed fixture code',f=>f.settings.controller.sha256=hash('0')],
 ['unsealed runtime code',f=>f.settings.runtimeController.sha256=hash('0')],
 ['unsealed UI code',f=>f.settings.ui.sha256=hash('0')],
 ['missing baseline observations',f=>delete f.root.baselineServices],
 ['wrong baseline image',f=>f.baselineServices[0].imageDigest=image('0')],
 ['extra module selector',f=>f.settings.runtimeController.module='operator.py']
])test(`factory rejects ${name} before native effect`,()=>{
 const f=fixture();change(f);assert.throws(f.transport);assert.equal(f.calls.length,0);
});

for(const [name,change] of [
 ['missing source seal',s=>delete s.settingsSourceDigest],
 ['source traversal',s=>s.schedulerSourcePath='/app/../operator.py'],
 ['operator code selector',s=>s.module='operator.py'],
 ['invalid source digest',s=>s.proactiveEntrypointDigest='unknown'],
 ['duplicate source path',s=>s.proactiveEntrypointPath=s.maintenanceEntrypointPath]
])test(`cadence expectation rejects ${name} before native effects`,()=>{
 const f=fixture();change(f.raw.cadenceEvidence.expectedSources);
 assert.throws(()=>activityRestorationDigests(f.raw));assert.equal(f.calls.length,0);
});

for(const [name,change] of [
 ['changed private bytes',f=>f.buffers.set(f.settings.policy.file,Buffer.from('{}'))],
 ['wrong private application',f=>{f.privatePolicy.applicationId=randomUUID();f.buffers.set(f.settings.policy.file,Buffer.from(JSON.stringify(f.privatePolicy)));f.settings.policy.sha256=sha(f.buffers.get(f.settings.policy.file));}],
 ['wrong rendered fixture program',f=>{f.privatePolicy.controllerProgramDigest=hash('0');f.buffers.set(f.settings.policy.file,Buffer.from(JSON.stringify(f.privatePolicy)));f.settings.policy.sha256=sha(f.buffers.get(f.settings.policy.file));}],
 ['wrong baseline DB identity',f=>{f.raw.database.containerId=hash('0');f.buffers.set(f.settings.runtimeSettings.file,Buffer.from(JSON.stringify(f.raw)));f.settings.runtimeSettings.sha256=sha(f.buffers.get(f.settings.runtimeSettings.file));}],
 ['unapproved original GUC',f=>{f.raw.database.originalRoleConfig.push('search_path=other');f.buffers.set(f.settings.runtimeSettings.file,Buffer.from(JSON.stringify(f.raw)));f.settings.runtimeSettings.sha256=sha(f.buffers.get(f.settings.runtimeSettings.file));}],
 ['private path selector',f=>{f.privatePolicy.script='operator.py';f.buffers.set(f.settings.policy.file,Buffer.from(JSON.stringify(f.privatePolicy)));f.settings.policy.sha256=sha(f.buffers.get(f.settings.policy.file));}]
])test(`private seal rejects ${name} without invoking SSH`,async()=>{
 const f=fixture();change(f);const t=f.transport();await assert.rejects(t.validateScope());assert.equal(f.calls.length,0);
});

test('cannot select fixture operation, alternate baseline or foreign seed from a packet',async()=>{
 const f=fixture(),t=f.transport();
 await assert.rejects(t.fixture('fixture_cleanup',{policy:f.fixturePolicy(),seed:hash('f')}),/fixture_operation_scope_changed/);
 await assert.rejects(t.fixture('reconcile',{policy:f.fixturePolicy(),seed:hash('e')}),/seed_scope_changed/);
 const p=f.fixturePolicy();p.baseline.sequenceDigest=hash('0');await assert.rejects(t.fixture('reconcile',{policy:p,seed:hash('f')}),/fixture_baseline_changed/);
 assert.equal(f.calls.length,0);
});

test('earlier unresolved or wrong durable intent denies native observations as well as writes',async()=>{
 const f=fixture(),t=f.transport();f.state.journal[0].outcome=null;
 await assert.rejects(t.readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.commit,tree:f.s.candidateTree}),/durable_scope_changed/);
 assert.equal(f.calls.length,0);
});

test('qualified runtime must preserve fixed DB image/mount and full five-service membership',async()=>{
 const f=fixture(),t=f.transport();f.rows.find(r=>r.name==='db').imageDigest=image('0');
 await assert.rejects(t.readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.commit,tree:f.s.candidateTree}),/qualified_runtime_identity_changed/);
 assert.equal(f.calls.length,0);
});

test('readonly native response may not claim effects or select new runtime identity',async()=>{
 const f=fixture(),old=f.root.ssh;f.root.ssh=async o=>{const r=JSON.parse(await old(o));r.effect=true;return JSON.stringify(r);};
 await assert.rejects(f.transport().readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.commit,tree:f.s.candidateTree}),/internal_health_unproven/);
});

test('sequence cannot be invented before a qualified current fixture observation',async()=>{
 const f=fixture();await assert.rejects(f.transport().sequenceRead(),/fixture_baseline_required/);assert.equal(f.calls.length,0);
});

test('browser needs actual cookie/IP facts and must reject arbitrary browser output',async()=>{
 const f=fixture();f.native.readOnly=false;f.native.fixture='empty';
 const old=f.root.ssh;f.root.ssh=async o=>{const v=JSON.parse(await old(o));if(v.schemaVersion==='roost-activity-browser-access-observation-v1')delete v.cookieName;return JSON.stringify(v);};
 const t=f.transport();await t.fixture('reconcile',{policy:f.fixturePolicy(),seed:hash('f')});
 await assert.rejects(t.browse({phase:'empty',token:deriveActivitySessionToken(f.p.fixture,hash('f')),summary:f.summary,summaryDigest:f.p.fixture.summaryDigest,eventId:f.p.fixture.eventId,commit:f.s.commit}),/native_browser_access_unproven/);
 assert(!f.calls.some(c=>c.kind==='node'));
});

test('lost native fixture response is uncertain and never exposes raw private errors',async()=>{
 const f=fixture();f.root.ssh=async()=>{throw Error('private password diagnostic');};
 await assert.rejects(f.transport().fixture('reconcile',{policy:f.fixturePolicy(),seed:hash('f')}),e=>e.message==='release_activity_installed_native_result_unproven'&&e.uncertain===true&&e.cause===undefined);
});

async function readyForTickRead(f){
 const installed=f.facade(),adapter=createActivityReleaseAdapter({manifest:f.m,binding:f.binding,settings:f.settings,seed:hash('f'),readState:f.root.readReleaseState,transport:installed.transport});
 for(const operation of ['smoke','fixture_cleanup']){
  if(operation!=='smoke')f.pending(operation);
  f.save(await adapter.postObservation(f.m,f.binding,{operation,operationId:f.state.journal.at(-1).id}));
 }
 f.pending('runtime_resume');for(const r of f.rows)if(r.role==='cadence')r.state='running';f.native.readOnly=false;f.native.ingress=false;
 return installed;
}
const tickOptions=f=>({operationId:f.state.journal.at(-1).id,since:at(-2000),commit:f.s.commit,tree:f.s.candidateTree});

test('fixed read-only cadence reader exposes actual unknown counters without inventing zero or skip expectation',async()=>{
 const f=fixture(),installed=await readyForTickRead(f);f.calls.length=0;
 const out=await installed.readCadenceTicks(tickOptions(f));assert.equal(out.status,'observed');assert.equal(out.effect,false);
 assert.equal(out.cadenceEvidence.length,2);for(const c of out.cadenceEvidence){
  assert.equal(c.providerRequests,null);assert.equal(c.providerRequestsVerified,false);assert.equal(c.externalActions,null);
  assert.equal(c.executionExpectationVerified,false);assert.equal(c.expectedExecutionState,null);assert.equal(c.failureState,'unknown');
 }
 assert.equal(f.calls.length,2);assert(f.calls.every(c=>c.kind==='ssh'));assert.equal(f.native.fixture,'absent');
 assert(!Object.keys(installed.transport).includes('readCadenceTicks'));
});

test('missing fresh ticks remain pending rather than successful restored behavior',async()=>{
 const f=fixture(),old=f.root.ssh;f.root.ssh=async options=>{const value=JSON.parse(await old(options));
  if(value.schemaVersion==='roost-activity-cadence-observation-v1'){value.status='pending';value.reason='missing_fresh_terminal_tick';value.cadenceEvidence=[];}
  return JSON.stringify(value);};
 const installed=await readyForTickRead(f),out=await installed.readCadenceTicks(tickOptions(f));
 assert.equal(out.status,'pending');assert.deepEqual(out.cadenceEvidence,[]);assert.equal(out.effect,false);
});

for(const [name,change] of [
 ['old terminal tick',out=>out.cadenceEvidence[0].lastRunAt=at(-60000)],
 ['future terminal tick',out=>out.cadenceEvidence[0].observedAt=at(60000)],
 ['duplicate cadence',out=>out.cadenceEvidence[1]=out.cadenceEvidence[0]],
 ['wrong behavior scope',out=>out.cadenceEvidence[0].behaviorDigest=hash('0')],
 ['fake provider verification',out=>out.cadenceEvidence[0].providerRequestsVerified=true],
 ['invented failure certainty',out=>out.cadenceEvidence[0].failureState='none_recorded'],
 ['false execution expectation',out=>{out.cadenceEvidence[0].executionExpectationVerified=true;out.cadenceEvidence[0].expectedExecutionState='skipped';}],
 ['claimed readonly effect',out=>out.effect=true],
 ['unexpected raw logs',out=>out.rawLogs='secret']
])test(`cadence reader rejects ${name}`,async()=>{
 const f=fixture(),old=f.root.ssh;f.root.ssh=async options=>{const out=JSON.parse(await old(options));if(out.schemaVersion==='roost-activity-cadence-observation-v1')change(out);return JSON.stringify(out);};
 const installed=await readyForTickRead(f);await assert.rejects(installed.readCadenceTicks(tickOptions(f)),/native_tick/);
});

test('cadence reader rejects insufficient elapsed window and wrong durable phase without executing SSH',async()=>{
 const f=fixture(),installed=await readyForTickRead(f);f.calls.length=0;
 await assert.rejects(installed.readCadenceTicks({...tickOptions(f),since:at()}),/native_tick_scope_unproven/);assert.equal(f.calls.length,0);
 f.state.journal.at(-1).operation='smoke';await assert.rejects(installed.readCadenceTicks(tickOptions(f)),/progression_unproven/);assert.equal(f.calls.length,0);
});

test('normal public candidate ingress is held only within the explicit smoke write operation',async()=>{
 const f=fixture();f.native.ingress=false;const t=f.transport(),adapter=createActivityReleaseAdapter({manifest:f.m,binding:f.binding,settings:f.settings,seed:hash('f'),readState:f.root.readReleaseState,transport:t});
 const out=await adapter.postObservation(f.m,f.binding,{operation:'smoke',operationId:f.state.journal.at(-1).id});assert.equal(out.status,'succeeded');
 const nativeOperations=f.calls.filter(c=>c.kind==='ssh').map(c=>JSON.parse(Buffer.from([...c.options.stdin.matchAll(/base64\.b64decode\('([A-Za-z0-9+/=]+)'\)/g)][1][1],'base64')).operation);
 assert.equal(nativeOperations.filter(v=>v==='hold_ingress').length,1);assert.equal(f.native.ingress,true);
 assert(nativeOperations.indexOf('hold_ingress')<nativeOperations.indexOf('smoke_prepare_empty'));
});

test('browser native output and closure proof remain strict; no success on unknown selectors',async()=>{
 const f=fixture();f.native.readOnly=false;f.native.fixture='empty';
 f.root.nativeProcess=async()=>Buffer.from('{"script":"operator","token":"private"}');
 const t=f.transport();await t.fixture('reconcile',{policy:f.fixturePolicy(),seed:hash('f')});
 await assert.rejects(t.browse({phase:'empty',token:deriveActivitySessionToken(f.p.fixture,hash('f')),summary:f.summary,summaryDigest:f.p.fixture.summaryDigest,eventId:f.p.fixture.eventId,commit:f.s.commit}),/browser_proof_unproven/);
 f.root.assertNativeClosed=async()=>({nativeChildrenClosed:false});await assert.rejects(f.transport().assertClosed({operation:'smoke',operationId:f.state.journal.at(-1).id}),/native_children_unclosed/);
});

test('scope binds the whole immutable owner grant, not only manifest and commit',async()=>{
 const f=fixture(),t=f.transport();f.state.release.snapshot.releaserAgentId=randomUUID();
 await assert.rejects(t.readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.commit,tree:f.s.candidateTree}),/durable_scope_changed/);
 assert.equal(f.calls.length,0);
});

test('no selected SHA, replacement container or deployment receipt can bypass qualified observation',async()=>{
 const f=fixture(),t=f.transport();
 await assert.rejects(t.readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.baseCommit,tree:f.s.baseTree}),/operation_version_changed/);
 f.rows[0].containerId=hash('0');await assert.rejects(t.readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.commit,tree:f.s.candidateTree}),/qualified_runtime_identity_changed/);
 assert.equal(f.calls.length,0);
});

test('expired owner grant prevents window mutation even when fresh readonly native evidence is available',async()=>{
 const f=fixture(),t=f.transport();f.state.effectiveExpiresAt=at(-1000);
 await assert.rejects(t.holdIngressAndOpenFixtureWindow({operationId:f.state.journal.at(-1).id,policy:f.fixturePolicy()}),/write_authority_unproven/);
 const ops=f.calls.filter(c=>c.kind==='ssh').map(c=>JSON.parse(Buffer.from([...c.options.stdin.matchAll(/base64\.b64decode\('([A-Za-z0-9+/=]+)'\)/g)][1][1],'base64')).operation);
 assert(ops.every(op=>['read_runtime_settings','read_health'].includes(op)));assert.equal(f.native.readOnly,true);
});

for(const [name,response] of [
 ['backend still reachable',{blocked:true,httpStatus:200,transportTimeout:false}],
 ['auth denial still reachable',{blocked:true,httpStatus:401,transportTimeout:false}],
 ['backend unhealthy still reachable',{blocked:true,httpStatus:503,transportTimeout:false}],
 ['no observed refusal',{blocked:true,httpStatus:null,transportTimeout:false}],
 ['contradictory timeout',{blocked:true,httpStatus:502,transportTimeout:true}],
 ['stale negative probe',{blocked:true,httpStatus:502,transportTimeout:false,observedAt:at(-120000)}]
])test(`explicit window refuses ${name} before opening the database fence`,async()=>{
 const f=fixture();f.root.probeIngressBlocked=async()=>({...response,observedAt:response.observedAt??at()});const t=f.transport();
 await assert.rejects(t.holdIngressAndOpenFixtureWindow({operationId:f.state.journal.at(-1).id,policy:f.fixturePolicy()}),/public_ingress_fence_unproven/);
 assert.equal(f.native.readOnly,true);
 const ops=f.calls.filter(c=>c.kind==='ssh').map(c=>JSON.parse(Buffer.from([...c.options.stdin.matchAll(/base64\.b64decode\('([A-Za-z0-9+/=]+)'\)/g)][1][1],'base64')).operation);
 assert(!ops.includes('open_fixture_window'));
});

test('bounded public timeout is admitted only together with exact native owned ingress rule',async()=>{
 const f=fixture();f.root.probeIngressBlocked=async()=>({blocked:true,observedAt:at(),httpStatus:null,transportTimeout:true});
 const out=await f.transport().holdIngressAndOpenFixtureWindow({operationId:f.state.journal.at(-1).id,policy:f.fixturePolicy()});
 assert.equal(out.databaseReadOnly,false);assert.equal(out.ingressBlocked,true);
});

for(const [name,change] of [
 ['wrong backend SHA',out=>out.backendCommit='e'.repeat(40)],
 ['wrong frontend SHA',out=>out.frontendCommit='e'.repeat(40)],
 ['unhealthy internal application',out=>out.healthy=false],
 ['changed runtime during health',out=>out.runtimeDigest=hash('0')],
 ['stale internal health',out=>out.observedAt=at(-20000)]
])test(`internal health rejects ${name} even when structural container inspection succeeds`,async()=>{
 const f=fixture(),old=f.root.ssh;f.root.ssh=async options=>{const out=JSON.parse(await old(options));if(out.schemaVersion==='roost-activity-internal-health-observation-v1')change(out);return JSON.stringify(out);};
 await assert.rejects(f.transport().readRuntime({operationId:f.state.journal.at(-1).id,commit:f.s.commit,tree:f.s.candidateTree}),/internal_health/);
 assert.equal(f.native.fixture,'absent');assert.equal(f.native.readOnly,true);assert(!f.calls.some(c=>c.kind==='probe'));
});
