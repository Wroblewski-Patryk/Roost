import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import {composeConfigurationDigest} from './lib/agent-host-release-compose-state.mjs';
import {fixture as composeFixture,hash,image} from './fixtures/release-compose-contract.cjs';
import {activityControllerDigest,deriveActivitySessionToken,createActivityReleaseAdapter} from './lib/agent-host-release-activity-adapter.mjs';
import {createInstalledActivityTransport,renderActivityFixtureProgram,renderActivityPythonStdin,activityRestorationDigests,qualifyCandidateIngressScope} from './lib/agent-host-release-activity-installed.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>JSON.stringify(Array.isArray(v)?v.map(v=>JSON.parse(canonical(v))):v&&typeof v==='object'?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(canonical(v))])):v)
 .replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const at=delta=>new Date(Date.now()+(delta??0)).toISOString();
const sorted=v=>v.slice().sort((a,b)=>a.name.localeCompare(b.name));
const pins=rows=>sorted(rows).map(r=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest'].map(k=>[k,r[k]])));
const observed=rows=>sorted(rows).map(r=>({...pins([r])[0],status:r.state,paused:r.state==='paused',health:r.health}));

function fixture({namespace=false}={}){
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
 if(namespace)raw.ingress={...raw.ingress,chain:'INPUT',namespace:{proxyContainerId:hash('c'),proxyImageDigest:image('d'),proxyNetworkDigest:hash('e')}};
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

import {qualifyCandidateIngressRuntime} from './lib/agent-host-release-compose-worker.mjs';
import {coolifyGitSetDeploymentId} from './lib/agent-host-release-coolify-git-set-gateway.mjs';
import ingressContract from './lib/agent-host-release-compose-ingress-fence.cjs';
import {createCoolifyComposeAdapter} from './lib/agent-host-release-coolify-compose.mjs';

function candidate(){
 const f=fixture(),op={id:randomUUID(),operation:'deploy',createdAt:at(-20000),intent:{manifestDigest:f.binding.manifestDigest,
  commit:f.binding.commit,baseCommit:f.binding.baseCommit,parameters:{targetId:f.target.targetId}},outcome:null};
 f.state.journal=[op];const db=f.rows.find(r=>r.name==='db');
 const cp={schemaVersion:'roost-compose-proxy-network-fence-policy-v1',targetId:f.target.targetId,networkId:hash('9'),subnet:'172.20.0.0/24',
  proxyId:hash('8'),proxyPid:1234,namespaceDigest:hash('7'),databaseContainerId:db.containerId,databaseIpv4:'172.20.0.2',proxyIpv4:'172.20.0.6',
  ruleComment:'roost-release-hold-'+randomUUID().replaceAll('-',''),originalRulesDigest:hash('0'),controllerProgramDigest:sha(readFileSync(new URL('./lib/agent-host-release-compose-ingress-runtime.py',import.meta.url)))};
 const receipt=present=>{const args=['-d',cp.subnet,'-p','tcp','--dport','8000','-m','comment','--comment',cp.ruleComment,'-j','REJECT','--reject-with','tcp-reset'],v={schemaVersion:'roost-compose-proxy-network-fence-v1',observedAt:at(),
  ...Object.fromEntries(['targetId','networkId','subnet','proxyId','proxyPid','namespaceDigest','databaseContainerId','databaseIpv4','proxyIpv4','ruleComment','originalRulesDigest'].map(k=>[k,cp[k]])),
  port:8000,ruleDigest:sha(canonical(args)),observedRulesDigest:present?hash('b'):cp.originalRulesDigest,projectNetworkExclusive:true,publishedPortsAbsent:true,rulePresent:present};v.evidenceDigest=ingressContract.composeIngressFenceDigest(v);return v;};
 f.binding.compatibleArtifactRecovery={currentEntry:{ingressFence:receipt(true),database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest}},
  replacement:{images:f.rows.filter(r=>r.role!=='database').map(({name,imageDigest})=>({name,imageDigest}))}};
 f.state.release.snapshot=f.binding;f.root.compatibleIngress={policy:{file:'C:\\Private\\compatible.json',sha256:sha(JSON.stringify(cp))},controllerProgramDigest:cp.controllerProgramDigest};
 f.buffers.set(f.root.compatibleIngress.policy.file,Buffer.from(JSON.stringify(cp)));
 const old=f.root.ssh,operations=[],grants=[];let mutate=null;
 f.root.authorizeCandidateIngress=async proof=>{grants.push(proof);if(mutate)mutate(f);return{intentDigest:hash('6')};};
 f.root.ssh=async options=>{
  const encoded=[...options.stdin.matchAll(/base64\.b64decode\('([A-Za-z0-9+/=]+)'\)/g)].map(m=>m[1]),request=JSON.parse(Buffer.from(encoded.at(-1),'base64'));
  operations.push(request.operation);const isRuntime=request.seedHex===undefined;
  if(isRuntime){assert.equal(encoded.length,3);assert.equal(sha(Buffer.from(encoded[1],'base64')),cp.controllerProgramDigest);assert.deepEqual(request.compatibleIngress.policy,cp);}
  if(request.operation==='open_candidate_ingress')f.native.ingress=false;
  if(request.operation==='hold_candidate_ingress')f.native.ingress=true;
  const bare=options.stdin.replace(/^_scope\['TRUSTED_COMPATIBLE_INGRESS_SOURCE'\]=.*\n/m,''),value=JSON.parse(await old({...options,stdin:bare}));
  if(isRuntime&&value.schemaVersion==='roost-activity-runtime-observation-v1'){
   value.effect=['open_candidate_ingress','hold_candidate_ingress'].includes(request.operation);
   value.compatibleIngress={schemaVersion:'roost-activity-compatible-ingress-observation-v1',controllerProgramDigest:cp.controllerProgramDigest,
    policyDigest:sha(canonical(cp)),historicalIngressRuleChecked:false,originalIngressSettingsUnchanged:true,receipt:receipt(f.native.ingress)};
  }
  return JSON.stringify(value);
 };
 return{...f,op,cp,operations,grants,receipt,options:{operationId:op.id,commit:f.s.commit,tree:f.s.candidateTree},mutateBeforeWrite:fn=>{mutate=fn;}};
}
test('real installed composition opens only deploy scope, leaves DB/cadences/fixtures unchanged',async()=>{
 const f=candidate(),facade=f.facade();assert.equal(f.operations.length,0);const proof=await facade.openCandidateIngress(f.options);
 assert.equal(proof.opened,true);assert.equal(proof.blocked,false);assert.equal(f.native.readOnly,true);assert.equal(f.native.fixture,'absent');
 assert.ok(f.rows.filter(r=>r.role==='cadence').every(r=>r.state==='paused'||r.state==='created'));
 assert.equal(f.operations.filter(v=>v==='open_candidate_ingress').length,1);assert.equal(f.grants.length,1);
 assert.ok(!f.operations.some(v=>['smoke_prepare_empty','smoke_populate','open_fixture_window','restore_runtime'].includes(v)));
 assert.ok(f.operations.includes('read_health')&&f.operations.includes('reconcile')&&f.operations.includes('read_runtime_settings'));
});
test('readonly closed deploy reconciliation does not open or claim blocked success',async()=>{const f=candidate();f.op.outcome={status:'uncertain'};
 const proof=await f.facade().readCandidateIngress(f.options);assert.equal(proof.blocked,true);assert.equal(f.grants.length,0);assert.ok(!f.operations.includes('open_candidate_ingress'));});
test('readonly lost reply may prove already absent without repeating a removal',async()=>{const f=candidate();f.native.ingress=false;f.op.outcome={status:'uncertain'};
 const proof=await f.facade().readCandidateIngress(f.options);assert.equal(proof.blocked,false);assert.equal(f.grants.length,0);assert.ok(!f.operations.includes('open_candidate_ingress'));});
test('already absent rule cannot be opened again',async()=>{const f=candidate();f.native.ingress=false;await assert.rejects(f.facade().openCandidateIngress(f.options),/already_absent_no_repeat/);assert.equal(f.grants.length,0);});
for(const [name,change]of Object.entries({uncertain:f=>f.op.outcome={status:'uncertain'},closed:f=>f.op.outcome={status:'succeeded'},expired:f=>f.state.effectiveExpiresAt=at(-1),wrongTask:f=>f.op.operation='observe',wrongCommit:f=>f.op.intent.commit='f'.repeat(40),wrongManifest:f=>f.op.intent.manifestDigest=hash('e'),wrongTarget:f=>f.op.intent.parameters.targetId='another',unresolvedPredecessor:f=>f.state.journal.unshift({id:randomUUID(),operation:'deploy_config',outcome:null})}))
 test('installed open refuses '+name+' before native effects',async()=>{const f=candidate();change(f);await assert.rejects(f.facade().openCandidateIngress(f.options));assert.equal(f.operations.length,0);assert.equal(f.grants.length,0);});
test('fresh authority is re-read after durable intent, no effect when state changes',async()=>{const f=candidate();f.mutateBeforeWrite(f=>{f.state.journal.at(-1).outcome={status:'uncertain'};});await assert.rejects(f.facade().openCandidateIngress(f.options),/write_authority/);assert.ok(!f.operations.includes('open_candidate_ingress'));});
for(const [name,change]of Object.entries({data:f=>f.root.fullFingerprint=async()=>({schemaDigest:f.m.baseline.schemaDigest,dataDigest:hash('0')}),sessions:f=>f.native.other=1,DBFence:f=>f.native.readOnly=false,cadence:f=>f.rows.find(r=>r.role==='cadence').state='running',mount:f=>f.rows[0].mountDigest=hash('d')}))
 test('installed open refuses actual '+name+' drift before intent',async()=>{const f=candidate();change(f);await assert.rejects(f.facade().openCandidateIngress(f.options));assert.equal(f.grants.length,0);assert.ok(!f.operations.includes('open_candidate_ingress'));});
test('lost native remove result remains uncertain without another call',async()=>{const f=candidate(),old=f.root.ssh;f.root.ssh=async options=>{const result=await old(options);if(f.operations.at(-1)==='open_candidate_ingress')throw Error('reply lost');return result;};await assert.rejects(f.facade().openCandidateIngress(f.options),e=>e.uncertain===true);assert.equal(f.operations.filter(v=>v==='open_candidate_ingress').length,1);assert.equal(f.native.ingress,false);});
test('exact active failure hold uses separate effect and does not restore role/cadences',async()=>{const f=candidate(),facade=f.facade();await facade.openCandidateIngress(f.options);await facade.holdCandidateIngress(f.options);
 assert.equal(f.native.ingress,true);assert.equal(f.native.readOnly,true);assert.equal(f.operations.filter(v=>v==='hold_candidate_ingress').length,1);assert.ok(!f.operations.includes('restore_runtime'));});

function completeEvidence(f){const e=f.evidence().composeTargets[0],id=coolifyGitSetDeploymentId({releaseId:f.binding.releaseId,operationId:f.op.id,targetId:f.target.targetId,rollback:false});
 e.binding.deploymentId=e.runtime.deploymentId=id;e.binding.queue.deploymentId=id;
 e.binding.queue.createdAt=at(-18000);e.binding.queue.finishedAt=at(-1000);
 for(const row of e.runtime.services)if(row.role!=='database'){row.deploymentId=id;row.createdAt=at(-15000);}
 for(const row of e.binding.images)row.deploymentId=id;
 return e;}
test('Worker exact finished queue/service/source qualification rejects every important drift',()=>{const f=candidate(),e=completeEvidence(f),db=e.runtime.services.find(v=>v.role==='database');f.binding.compatibleArtifactRecovery.currentEntry.database={containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest};f.binding.compatibleArtifactRecovery.replacement.images=e.binding.images.map(({name,imageDigest})=>({name,imageDigest}));
 assert.equal(qualifyCandidateIngressRuntime(f.binding,f.state,e,f.op.id).services.length,5);
 for(const change of [e=>e.binding.queue.status='in_progress',e=>e.binding.queue.deploymentId=randomUUID(),e=>e.binding.queue.commit='f'.repeat(40),e=>e.binding.tree='f'.repeat(40),e=>e.runtime.services.pop(),e=>e.runtime.services[0].imageDigest=image('0'),e=>e.runtime.services[0].mountDigest=hash('f'),e=>e.runtime.services.find(v=>v.role==='migration').exitCode=1,e=>e.configuration.environmentDigest=hash('f'),e=>e.runtime.services.find(v=>v.role==='database').containerId=hash('f')]){const v=structuredClone(e);change(v);assert.throws(()=>qualifyCandidateIngressRuntime(f.binding,f.state,v,f.op.id));}
 const bad=structuredClone(e);bad.runtime.services.find(v=>v.role==='app').health='unhealthy';assert.throws(()=>qualifyCandidateIngressRuntime(f.binding,f.state,bad,f.op.id));
 const actual=qualifyCandidateIngressRuntime(f.binding,f.state,bad,f.op.id,{allowUnhealthyApp:true});assert.equal(actual.services.find(v=>v.role==='app').health,'unhealthy');
});

function wired(){const f=candidate(),facade=f.facade(),e=completeEvidence(f),calls=[],o={operationId:f.op.id,since:f.op.createdAt,targetId:f.target.targetId,rollback:false},clock={at:Date.now()},mode={queue:'finished',starting:false,publicHealthy:true};
 const gateway={inspectConfiguration:async()=>f.target.configuration,inspectBaseline:async()=>{throw Error('candidate only');},
  inspectRuntime:async(_id,options)=>{if(options?.operationEffect===true)calls.push('retention-effect');const row=structuredClone(e);if(mode.starting)row.runtime.services.find(v=>v.role==='app').health='starting';return{...row,healthy:true};},
  readQueue:async()=>mode.queue==='absent'?null:{...structuredClone(e.binding.queue),status:mode.queue},
  deployTarget:async()=>{calls.push('dispatch');mode.queue='finished';},configure:async()=>{throw Error('unused');},
  safety:async()=>({quiescent:true,schemaDigest:f.m.deployment.schemaDigest,dataDigest:f.m.baseline.dataDigest}),inspectBackup:async()=>f.m.backup,
  inspectCandidateIngress:async()=>{calls.push('read-ingress');return facade.readCandidateIngress(f.options);},
  openCandidateIngress:async()=>{calls.push('open');const result=await facade.openCandidateIngress(f.options);if(mode.afterOpenStarting)mode.starting=true;return result;},
  holdCandidateIngress:async()=>{calls.push('hold');return facade.holdCandidateIngress(f.options);},
  checkServices:async()=>{calls.push('public-health');assert.equal(f.native.ingress,false);return{healthy:mode.publicHealthy,healthDigest:f.m.baseline.healthDigest,dataDigest:f.m.baseline.dataDigest};}};
 return{f,e,o,mode,calls,gateway,adapter:createCoolifyComposeAdapter({gateway,now:()=>clock.at,sleep:async ms=>{clock.at+=ms;mode.starting=false;}})};}
test('actual high adapter deploy path invokes installed opening before public health',async()=>{const w=wired();const result=await w.adapter.deploy(w.f.m,w.f.binding,w.o);
 assert.equal(result.state,'finished');assert.equal(result.healthy,true);assert.ok(w.calls.indexOf('open')<w.calls.indexOf('public-health'));
 assert.equal(w.calls.filter(c=>c==='open').length,1);assert.equal(w.f.native.readOnly,true);
 await w.adapter.waitForDeployment(w.f.m,w.f.binding,w.o);assert.equal(w.calls.filter(c=>c==='open').length,1);});
test('read-only adapter reconciliation stays uncertain while rule is held',async()=>{const w=wired(),result=await w.adapter.reconcileDeployment(w.f.m,w.f.binding,w.o);
 assert.equal(result.state,'uncertain');assert.equal(result.candidateIngressBlocked,true);assert.ok(!w.calls.includes('open'));assert.ok(!w.calls.includes('public-health'));assert.equal(w.f.grants.length,0);});
test('finished exact deployment with already absent rule is readonly success',async()=>{const w=wired();w.f.native.ingress=false;w.f.op.outcome={status:'uncertain'};const result=await w.adapter.reconcileDeployment(w.f.m,w.f.binding,w.o);
 assert.equal(result.state,'finished');assert.equal(result.healthy,true);assert.ok(!w.calls.includes('open'));assert.equal(w.f.grants.length,0);});
test('pending queue and starting runtime cannot open before exact ready native state',async()=>{const w=wired();w.mode.starting=true;
 const result=await w.adapter.deploy(w.f.m,w.f.binding,w.o);assert.equal(result.healthy,true);assert.equal(w.calls.filter(v=>v==='open').length,1);
 const v=wired();v.mode.queue='in_progress';const pending=await v.adapter.reconcileDeployment(v.f.m,v.f.binding,v.o);assert.equal(pending.state,'pending');assert.ok(!v.calls.includes('open'));});
test('a changed image in actual high adapter prevents opening',async()=>{const w=wired(),old=w.gateway.inspectRuntime;w.gateway.inspectRuntime=async()=>{const row=await old();row.runtime.services[0].imageDigest=image('0');return row;};
 await assert.rejects(w.adapter.deploy(w.f.m,w.f.binding,w.o),/runtime_unproven/);assert.ok(!w.calls.includes('open'));});
test('public health failure reholds exact installed rule under the same active deploy',async()=>{const w=wired();w.mode.publicHealthy=false;const result=await w.adapter.deploy(w.f.m,w.f.binding,w.o);
 assert.equal(result.healthy,false);assert.deepEqual(w.calls.filter(v=>['open','hold'].includes(v)),['open','hold']);assert.equal(w.f.native.ingress,true);assert.equal(w.f.native.readOnly,true);});
test('health transport error after opening reholds but never blindly repeats removal',async()=>{const w=wired();w.gateway.checkServices=async()=>{throw Error('read failure');};await assert.rejects(w.adapter.deploy(w.f.m,w.f.binding,w.o));
 assert.deepEqual(w.calls.filter(v=>['open','hold'].includes(v)),['open','hold']);assert.equal(w.f.native.ingress,true);});
test('readonly API options cannot request opening or retention effects',async()=>{const w=wired();const request={...w.o,operationEffect:true,mayOpen:true};await w.adapter.reconcileDeployment(w.f.m,w.f.binding,request);
 assert.ok(!w.calls.some(v=>['open','hold','retention-effect'].includes(v)));await w.adapter.waitForDeployment(w.f.m,w.f.binding,request);
 assert.ok(!w.calls.some(v=>['open','hold','retention-effect'].includes(v)));});
test('start waiter retains genuine opening across subsequent starting settlement without another effect',async()=>{const w=wired();w.mode.afterOpenStarting=true;
 const result=await w.adapter.deploy(w.f.m,w.f.binding,w.o);assert.equal(result.state,'finished');assert.equal(result.healthy,true);
 assert.equal(w.calls.filter(v=>v==='open').length,1);assert.equal(w.calls.filter(v=>v==='retention-effect').length,1);
 assert.equal(w.f.grants.length,1);assert.equal(w.f.operations.filter(v=>v==='open_candidate_ingress').length,1);assert.ok(!w.calls.includes('hold'));
 assert.equal(w.calls.filter(v=>v==='public-health').length,1);assert.equal(w.f.native.ingress,false);
});
test('later failed health after opening and starting settlement still reholds under same active start',async()=>{const w=wired();w.mode.afterOpenStarting=true;w.mode.publicHealthy=false;
 const result=await w.adapter.deploy(w.f.m,w.f.binding,w.o);assert.equal(result.healthy,false);assert.deepEqual(w.calls.filter(v=>['open','hold'].includes(v)),['open','hold']);
 assert.equal(w.calls.filter(v=>v==='retention-effect').length,1);assert.equal(w.f.native.ingress,true);assert.equal(w.f.native.readOnly,true);
});
