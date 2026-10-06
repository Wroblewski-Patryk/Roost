import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import contract from './agent-host-release-contract.cjs';
import {composeRuntimeServiceSchema} from './agent-host-release-compose-state.mjs';
import {installedActivitySettingsSchema,activityControllerDigest,activityFixturePublicValues} from './agent-host-release-activity-adapter.mjs';
import {activityBrowserInputSchema} from './agent-host-release-activity-browser.mjs';
import ingressFenceContract from './agent-host-release-compose-ingress-fence.cjs';

const hex=z.string().regex(/^[a-f0-9]{64}$/),git=z.string().regex(/^[a-f0-9]{40}$/),uuid=z.string().uuid();
const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),pg=z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,62}$/);
const instant=z.string().datetime(),image=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const roles={app:'app',migrate:'migration',db:'database',maintenance_cadence:'cadence',proactive_cadence:'cadence'};
const row=z.object({name:z.enum(Object.keys(roles)),role:z.enum(Object.values(roles)),containerId:hex,imageDigest:image,mountDigest:hex}).strict();
const cadence=z.object({name:z.enum(['maintenance_cadence','proactive_cadence']),behavior:z.literal('restore_existing_loop'),behaviorDigest:hex}).strict();
const pythonSourcePath=z.string().regex(/^\/app\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.py$/);
const cadenceExpectedSources=z.object({settingsSourcePath:pythonSourcePath,settingsSourceDigest:hex,
 schedulerSourcePath:pythonSourcePath,schedulerSourceDigest:hex,
 maintenanceEntrypointPath:pythonSourcePath,maintenanceEntrypointDigest:hex,
 proactiveEntrypointPath:pythonSourcePath,proactiveEntrypointDigest:hex}).strict().refine(v=>
 new Set([v.settingsSourcePath,v.schedulerSourcePath,v.maintenanceEntrypointPath,v.proactiveEntrypointPath]).size===4);
const privatePolicySchema=z.object({schemaVersion:z.literal('roost-activity-installed-policy-v1'),postObservationDigest:hex,fixtureDigest:hex,targetId:id,
 applicationId:uuid,createdAt:instant,expiresAt:instant,catalogDigest:hex,controllerProgramDigest:hex}).strict();
const ingressBase={port:z.literal(8000),protocol:z.literal('tcp'),appContainerId:hex,networkId:hex,
 originalOwnedRuleAbsent:z.literal(true),originalRulesDigest:hex};
export const activityIngressSettingsSchema=z.discriminatedUnion('chain',[
 z.object({...ingressBase,chain:z.literal('DOCKER-USER')}).strict(),
 z.object({...ingressBase,chain:z.literal('INPUT'),namespace:z.object({proxyContainerId:hex,proxyImageDigest:image,proxyNetworkDigest:hex}).strict()}).strict()
]);
const privateSettingsSchema=z.object({schemaVersion:z.literal('roost-activity-runtime-settings-private-v1'),targetId:id,
 database:z.object({containerId:hex,adminUser:pg,adminDatabase:pg,applicationUser:pg,applicationDatabase:pg,
  originalRoleConfig:z.array(z.string().min(3).max(1024).refine(v=>v.includes('=')&&!/[\x00\r\n]/.test(v))).max(32)}).strict(),
 ingress:activityIngressSettingsSchema,
 cadences:z.array(cadence.extend({containerId:hex,imageDigest:image,mountDigest:hex,originalState:z.enum(['running','paused','exited','created']),originalExitCode:z.literal(0)}).strict()).length(2),
 browserAccess:z.object({kind:z.literal('pydantic_settings_auth_cookie_v1'),settingsSourcePath:z.string().regex(/^\/app\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.py$/),
  routesSourcePath:z.string().regex(/^\/app\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.py$/),settingsSourceDigest:hex,routesSourceDigest:hex}).strict().optional(),
 cadenceEvidence:z.object({schema:z.literal('public'),table:pg,expectedOwner:z.literal('external_scheduler'),expectedMode:z.literal('externalized'),expectedSources:cadenceExpectedSources.optional()}).strict().optional(),
 internalHealth:z.object({frontendMetaName:activityBrowserInputSchema.shape.frontendMetaName}).strict().optional()
}).strict();
const compatibleIngressPolicySchema=z.object({schemaVersion:z.literal('roost-compose-proxy-network-fence-policy-v1'),targetId:id,networkId:hex,
 subnet:z.string().regex(/^\d+\.\d+\.\d+\.\d+\/(?:2[4-9]|30)$/),proxyId:hex,proxyPid:z.number().int().min(2).max(0x7fffffff),namespaceDigest:hex,
 databaseContainerId:hex,databaseIpv4:z.string(),proxyIpv4:z.string(),ruleComment:z.string().regex(/^roost-release-hold-[a-f0-9]{32}$/),
 originalRulesDigest:hex,controllerProgramDigest:hex}).strict();
export const activityCompatibleIngressInstallationSchema=z.object({policy:installedActivitySettingsSchema.shape.policy,controllerProgramDigest:hex}).strict();
const compatibleIngressObservationSchema=z.object({schemaVersion:z.literal('roost-activity-compatible-ingress-observation-v1'),controllerProgramDigest:hex,policyDigest:hex,
 historicalIngressRuleChecked:z.literal(false),originalIngressSettingsUnchanged:z.literal(true),receipt:ingressFenceContract.composeIngressFenceSchema.extend({rulePresent:z.boolean()})}).strict();
const qualifiedSchema=z.object({observedAt:instant,targetId:id,commit:git,tree:git,backendCommit:git,frontendCommit:git,healthy:z.literal(true),
 services:z.array(composeRuntimeServiceSchema).length(5)}).strict();
const structuralSchema=qualifiedSchema.pick({observedAt:true,targetId:true,commit:true,tree:true,services:true}).strict();
const ingressProbeSchema=z.object({blocked:z.literal(true),observedAt:instant,httpStatus:z.union([z.literal(502),z.literal(504),z.null()]),transportTimeout:z.boolean()}).strict();
const runtimeObservationSchema=z.object({schemaVersion:z.literal('roost-activity-runtime-observation-v1'),operation:z.enum([
 'read_runtime_fence','read_runtime_settings','hold_ingress','open_fixture_window','refence_fixture_window','restore_runtime']),
 releaseId:uuid,operationId:uuid,fixtureId:uuid,targetId:id,manifestDigest:hex,controllerProgramDigest:hex,runtimeDigest:hex,
 databaseReadOnly:z.boolean(),activeOtherSessions:z.number().int().nonnegative(),activeOwnedSessions:z.number().int().nonnegative(),roleConfigDigest:hex,
 originalRoleConfigMatches:z.boolean(),ingressOwnedRulePresent:z.boolean(),ingressBlockedByRoot:z.boolean(),cadencesHeld:z.boolean(),
 cadences:z.array(z.object({name:z.enum(['maintenance_cadence','proactive_cadence']),state:z.enum(['running','paused','exited','created']),behaviorDigest:hex}).strict()).length(2),
 databaseSettingsDigest:hex,ingressSettingsDigest:hex,cadenceSettingsDigest:hex,effect:z.boolean(),providerCalls:z.literal(0),
 nativeJobQualified:z.literal(false),externalHealthVerified:z.literal(false),cadenceTicksVerified:z.literal(false),observedAt:instant,
 compatibleIngress:compatibleIngressObservationSchema.optional(),
 browser:z.object({containerAddress:activityBrowserInputSchema.shape.containerAddress,cookieName:activityBrowserInputSchema.shape.cookieName}).strict().optional()
}).strict();
const supplemental=z.object({nonOwnedDigest:hex,sequenceDigest:hex,catalogDigest:hex,fullDataDigest:hex}).strict();
const fixtureObserved=z.union([
 z.object({phase:z.literal('needs_baseline_seal'),state:z.literal('absent'),observed:supplemental,effect:z.literal(false),nativeJobQualified:z.literal(false),releaseSchemaVerified:z.literal(false)}).strict(),
 z.object({phase:z.literal('observed'),state:z.enum(['absent','empty','populated']),effect:z.boolean(),nonOwnedUnchanged:z.literal(true),sequenceUnchanged:z.literal(true),
  catalogUnchanged:z.literal(true),fullDataParity:z.boolean(),before:supplemental,after:supplemental,nativeJobQualified:z.literal(false),releaseSchemaVerified:z.literal(false),
  memoryId:z.number().int().negative(),summaryDigest:hex,markerDigest:hex}).strict()
]);
const fixtureEnvelope=z.object({schemaVersion:z.literal('roost-activity-fixture-observation-v1'),operation:z.enum(['reconcile','smoke_prepare_empty','smoke_populate','fixture_cleanup']),
 releaseId:uuid,operationId:uuid,manifestDigest:hex,targetId:id,commit:git,tree:git,fixtureId:uuid,controllerProgramDigest:hex,runtimeDigest:hex,observedAt:instant,
 expectedTreeBoundByParentObservation:z.literal(true),providerCalls:z.literal(0),cadenceStarted:z.literal(false),fenceChanged:z.literal(false),nativeJobQualified:z.literal(false),
 ownedDatabaseSessionsClosed:z.literal(true),observed:fixtureObserved}).strict();
const fixturePolicySchema=z.object({schemaVersion:z.literal('roost-activity-fixture-policy-v1'),kind:z.literal('synthetic_recent_activity'),targetId:id,
 applicationId:uuid,coolifyApplicationId:z.string().regex(/^[1-9][0-9]{0,9}$/),releaseId:uuid,operationId:uuid,fixtureId:uuid,userId:uuid,sessionId:uuid,eventId:uuid,traceId:uuid,
 memoryId:z.number().int().min(-2147483648).max(-1),markerDigest:hex,summaryDigest:hex,createdAt:instant,expiresAt:instant,commit:git,tree:git,manifestDigest:hex,
 expectedRuntime:z.array(row).length(5),controllerProgramDigest:hex,frontendMetaName:activityBrowserInputSchema.shape.frontendMetaName,
 baseline:z.object({releaseSchemaDigest:hex,releaseDataDigest:hex,nonOwnedDigest:hex,sequenceDigest:hex,catalogDigest:hex}).strict().nullable()}).strict();
const closedSchema=z.object({nativeChildrenClosed:z.literal(true)}).strict();
const browserOutputSchema=z.object({phase:z.enum(['empty','populated']),activityCount:z.number().int().min(0).max(1),backendCommit:git,frontendCommit:git,
 renderedEventId:uuid.nullable(),renderedSummaryDigest:hex.nullable(),renderDigest:hex,negativePathStatus:z.literal(401),providerRequests:z.literal(0),externalActions:z.literal(0)}).strict();
const nativeHealthSchema=z.object({backendCommit:git,frontendCommit:git,healthy:z.literal(true),startedAt:instant,observedAt:instant,
 cadenceEvidence:z.array(z.object({name:z.enum(['maintenance_cadence','proactive_cadence']),behaviorDigest:hex,executionState:z.enum(['executed','skipped']),
  behaviorVerified:z.literal(true),summaryDigest:hex,completedTicks:z.number().int().positive(),observedAt:instant}).strict()).length(2)}).strict();
const browserAccessSchema=z.object({schemaVersion:z.literal('roost-activity-browser-access-observation-v1'),containerAddress:activityBrowserInputSchema.shape.containerAddress,
 cookieName:activityBrowserInputSchema.shape.cookieName,settingsSourceDigest:hex,routesSourceDigest:hex,source:z.enum(['environment','dotenv','settings_default','route_default']),
 runtimeDigest:hex,providerCalls:z.literal(0),effect:z.literal(false),nativeJobQualified:z.literal(false)}).strict();
const internalHealthSchema=z.object({schemaVersion:z.literal('roost-activity-internal-health-observation-v1'),backendCommit:git,frontendCommit:git,healthy:z.literal(true),observedAt:instant,
 runtimeDigest:hex,providerCalls:z.literal(0),effect:z.literal(false),nativeJobQualified:z.literal(false)}).strict();
const counter=z.number().int().min(0).max(1000000).nullable();
const tickCommon={schemaVersion:z.literal('roost-activity-cadence-observation-v1'),runtimeDigest:hex,startedAt:instant,observedAt:instant,effect:z.literal(false),nativeJobQualified:z.literal(false)};
const tickReadSchema=z.discriminatedUnion('status',[
 z.object({...tickCommon,status:z.literal('pending'),reason:z.literal('missing_fresh_terminal_tick'),cadenceEvidence:z.array(z.never()).length(0)}).strict(),
 z.object({...tickCommon,status:z.literal('observed'),
 cadenceEvidence:z.array(z.object({name:z.enum(['maintenance_cadence','proactive_cadence']),behaviorDigest:hex,behaviorVerified:z.literal(true),completedTicks:z.number().int().positive(),
  executionState:z.enum(['executed','skipped']),expectedExecutionState:z.enum(['executed','skipped']).nullable(),executionExpectationVerified:z.boolean(),
  summaryDigest:hex,lastRunAt:instant,observedAt:instant,providerRequests:counter,providerRequestsVerified:z.boolean(),externalActions:counter,externalActionsVerified:z.boolean(),
  failureState:z.enum(['unknown','none_recorded','recorded']),failures:counter}).strict()).length(2)}).strict()
]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=value=>JSON.stringify(Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):value&&typeof value==='object'?
 Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(canonical(v))])):value)
 .replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const same=(a,b)=>canonical(a)===canonical(b);
const snapshotBasis=source=>{const {releaseId:_id,readinessDigest:_ready,configurationDigest:_configuration,...snapshot}=source??{};return snapshot;};
const fail=(code,uncertain=false)=>{throw Object.assign(Error('release_activity_installed_'+code),{retryable:false,uncertain});};
const check=(v,code)=>{if(!v)fail(code);};
const parse=(schema,value,code)=>{const r=schema.safeParse(value);if(!r.success)fail(code);return r.data;};
const result=o=>o?.status==='reconciled'?(o.reconciledStatus??o.reconciled_status):o?.status;
const fresh=v=>Date.now()-Date.parse(v)<=60000&&Date.parse(v)<=Date.now()+2000;
const sorted=rows=>rows.slice().sort((a,b)=>a.name.localeCompare(b.name));
const pins=rows=>sorted(rows).map(r=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest'].map(k=>[k,r[k]])));
const observedRows=(rows,cadences=[])=>sorted(rows).map(r=>{
 const state=cadences.find(c=>c.name===r.name)?.state??r.state;
 return {...pins([r])[0],status:state,paused:state==='paused',health:r.health};
});
const normalizedDatabase=({containerId:_id,...settings})=>settings;
const normalizedIngress=({appContainerId:_id,...settings})=>settings;
const normalizedCadences=rows=>sorted(rows).map(({containerId:_id,imageDigest:_image,...settings})=>settings);
export function activityRestorationDigests(raw){
 const s=privateSettingsSchema.parse(raw);
 return {databaseSettingsDigest:hash(canonical(normalizedDatabase(s.database))),ingressSettingsDigest:hash(canonical(normalizedIngress(s.ingress))),
  cadenceSettingsDigest:hash(canonical(normalizedCadences(s.cadences)))};
}
export function qualifyActivityCompatibleIngressObservation(value,{policy,controllerProgramDigest,operation,ingressPresent,now=Date.now()}){
 const v=parse(compatibleIngressObservationSchema,value,'compatible_ingress_observation_unproven'),r=v.receipt;
 check(['read_runtime_fence','read_runtime_settings','hold_ingress','open_fixture_window','refence_fixture_window','restore_runtime'].includes(operation)
  &&v.controllerProgramDigest===controllerProgramDigest&&v.policyDigest===hash(canonical(policy))
  &&r.rulePresent===ingressPresent&&r.evidenceDigest===ingressFenceContract.composeIngressFenceDigest(r)
  &&['targetId','networkId','subnet','proxyId','proxyPid','namespaceDigest','databaseContainerId','databaseIpv4','proxyIpv4','ruleComment','originalRulesDigest'].every(k=>r[k]===policy[k])
  &&Date.parse(r.observedAt)<=now+2000&&now-Date.parse(r.observedAt)<=60000,'compatible_ingress_observation_changed');
 const args=['-d',policy.subnet,'-p','tcp','--dport','8000','-m','comment','--comment',policy.ruleComment,'-j','REJECT','--reject-with','tcp-reset'];
 check(r.ruleDigest===hash(canonical(args))&&(r.rulePresent||r.observedRulesDigest===r.originalRulesDigest)
  &&(operation==='restore_runtime'?r.rulePresent===false:['hold_ingress','open_fixture_window','refence_fixture_window'].includes(operation)?r.rulePresent===true:true),'compatible_ingress_rule_readback_unproven');return v;
}

/** Pure rendering of the one source-sealed raw Python literal. No packet code,
 * filesystem path, Python expression, callback or escape evaluation is used. */
export function renderActivityFixtureProgram(source){
 check(typeof source==='string'&&Buffer.byteLength(source)>=5000&&Buffer.byteLength(source)<=131072,'fixed_fixture_source_invalid');
 const marker='# This program runs only inside the exact existing app container.';
 check(source.split(marker).length===2&&source.startsWith('"""Trusted fixed synthetic recent-activity fixture controller.'),'fixed_fixture_source_invalid');
 const prefix=source.split(marker)[0],match=source.match(/^APP_PROGRAM = r'''([\s\S]*?)^'''/m);
 check(match&&source.match(/^APP_PROGRAM = r'''/mg)?.length===1&&prefix.includes('async def transact(repo, request):'),'fixed_fixture_source_invalid');
 // Python parses source universal newlines even when trusted source bytes are
 // read without normalization. Prefix itself is copied verbatim by its renderer.
 return prefix+'\n'+match[1].replaceAll('\r\n','\n');
}
export function renderActivityPythonStdin(source,request,{compatibleIngressSource}={}){
 check(typeof source==='string'&&Buffer.byteLength(source)<=131072,'fixed_source_bound');
 const encoded=Buffer.from(JSON.stringify(request)).toString('base64');
 check(Buffer.byteLength(JSON.stringify(request))<=65536,'request_bound');
 if(request.compatibleIngress!==undefined)check(typeof compatibleIngressSource==='string'&&hash(Buffer.from(compatibleIngressSource))===request.compatibleIngress.controllerProgramDigest,'compatible_ingress_source_seal');
 else check(compatibleIngressSource===undefined,'compatible_ingress_source_without_scope');
 const program=`import base64,io,sys\n_SOURCE=base64.b64decode('${Buffer.from(source).toString('base64')}').decode('utf-8')\n`+
  `_scope={'__name__':'roost_activity_installed'}\nexec(compile(_SOURCE,'<roost-activity-sealed>','exec'),_scope)\n`+
  `_scope['TRUSTED_SOURCE']=_SOURCE\n`+(compatibleIngressSource===undefined?'':`_scope['TRUSTED_COMPATIBLE_INGRESS_SOURCE']=base64.b64decode('${Buffer.from(compatibleIngressSource).toString('base64')}').decode('utf-8')\n`)+
  `sys.stdin=io.TextIOWrapper(io.BytesIO(base64.b64decode('${encoded}')),encoding='utf-8')\n_scope['main']()\n`;
 check(Buffer.byteLength(program)<=131072,'stdin_bound');return program;
}

/** All dependencies are fixed root-owned native adapters. Settings contain
 * data/seals only. Importing/creating this factory executes no native process. */
export function createInstalledActivityTransport({manifest,binding,settings,seed,installation,baselineServices,readScopeBytes,readRuntime,fullFingerprint,
 readReleaseState,ssh,nativeProcess,assertNativeClosed,healthProbe,probeIngressBlocked,compatibleIngress}){
 const cfg=installedActivitySettingsSchema.parse(settings),m=contract.manifestSchema.parse(manifest),s=structuredClone(binding),p=m.postObservation;
 const install=parse(z.object({sshHost:z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/),frontendMetaName:activityBrowserInputSchema.shape.frontendMetaName}).strict(),installation,'installation_invalid');
 check(contract.isComposeManifest(m)&&p&&s.manifestDigest===contract.releaseDigest(m)&&same(s.manifest,m)&&uuid.safeParse(s.releaseId).success,'release_scope_invalid');
 const compatible=s.compatibleArtifactRecovery!==undefined,compatibleCfg=compatible?parse(activityCompatibleIngressInstallationSchema,compatibleIngress,'compatible_ingress_installation_required'):null;
 if(!compatible)check(compatibleIngress===undefined,'compatible_ingress_without_scope');
 check([readScopeBytes,readRuntime,fullFingerprint,readReleaseState,ssh,nativeProcess,assertNativeClosed,healthProbe,probeIngressBlocked].every(v=>typeof v==='function'),'fixed_callbacks_required');
 const secret=Buffer.isBuffer(seed)?Buffer.from(seed):typeof seed==='string'&&/^[a-f0-9]{64}$/.test(seed)?Buffer.from(seed,'hex'):null;
 check(secret?.length===32,'ephemeral_seed_required');activityFixturePublicValues(p.fixture);
 const source={fixture:readFileSync(new URL('./agent-host-release-activity-fixture.py',import.meta.url)),
  runtime:readFileSync(new URL('./agent-host-release-activity-runtime.py',import.meta.url)),browser:readFileSync(new URL('./agent-host-release-activity-browser.mjs',import.meta.url)),
  ...(compatible?{compatibleIngress:readFileSync(new URL('./agent-host-release-compose-ingress-runtime.py',import.meta.url))}:{})};
 if(compatible)check(hash(source.compatibleIngress)===compatibleCfg.controllerProgramDigest,'compatible_ingress_fixed_source_changed');
 check(hash(source.fixture)===cfg.controller.sha256&&hash(source.runtime)===cfg.runtimeController.sha256&&hash(source.browser)===cfg.ui.sha256
  &&activityControllerDigest(cfg)===p.controllerDigest,'fixed_source_seal_changed');
 const fixtureSource=new TextDecoder('utf-8',{fatal:true}).decode(source.fixture),runtimeSource=new TextDecoder('utf-8',{fatal:true}).decode(source.runtime);
 const fixtureProgramDigest=hash(renderActivityFixtureProgram(fixtureSource)),scopeDigest=contract.releaseDigest(p),fixtureDigest=contract.releaseDigest(p.fixture),target=m.deployment.targets[0];
 const baselineRows=parse(z.array(composeRuntimeServiceSchema).min(4).max(5),baselineServices,'sealed_baseline_services_required');
 check(new Set(baselineRows.map(r=>r.name)).size===baselineRows.length&&new Set(baselineRows.map(r=>r.containerId)).size===baselineRows.length
  &&baselineRows.every(r=>target.baseline.configuration.services.some(d=>r.name===d.name&&r.role===d.role&&r.mountDigest===d.mountDigest
   &&r.imageDigest===(d.source==='image'?d.imageDigest:target.baseline.images.find(v=>v.name===r.name)?.imageDigest)))
  &&['app','db','maintenance_cadence','proactive_cadence'].every(name=>baselineRows.some(r=>r.name===name)),'sealed_baseline_services_changed');
 let sealed,rawSettings,lastFixturePolicy,lastFixtureReply,compatiblePolicy;
 const readSeals=async()=>{
  const read=async descriptor=>{let b;try{b=await readScopeBytes({...descriptor,maxBytes:131072});}catch{fail('private_seal_unproven');}
   check(Buffer.isBuffer(b)&&b.length>0&&b.length<=131072&&hash(b)===descriptor.sha256,'private_seal_changed');
   try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}catch{fail('private_json_unproven');}};
  const policy=parse(privatePolicySchema,await read(cfg.policy),'private_policy_invalid'),raw=parse(privateSettingsSchema,await read(cfg.runtimeSettings),'private_runtime_settings_invalid');
  if(compatible){const observed= s.compatibleArtifactRecovery.currentEntry.ingressFence,cp=parse(compatibleIngressPolicySchema,await read(compatibleCfg.policy),'compatible_ingress_policy_invalid');
   check(cp.controllerProgramDigest===compatibleCfg.controllerProgramDigest&&cp.targetId===target.targetId&&observed
    &&['targetId','networkId','subnet','proxyId','proxyPid','namespaceDigest','databaseContainerId','databaseIpv4','proxyIpv4','ruleComment','originalRulesDigest'].every(k=>cp[k]===observed[k]),'compatible_ingress_admitted_policy_changed');
   ingressFenceContract.qualifyComposeIngressFence(observed,{targetId:target.targetId,databaseContainerId:cp.databaseContainerId,now:Date.parse(observed.observedAt)});
   if(compatiblePolicy)check(same(cp,compatiblePolicy),'compatible_ingress_policy_changed');compatiblePolicy=cp;
  }
  check(policy.postObservationDigest===scopeDigest&&policy.fixtureDigest===fixtureDigest&&policy.targetId===target.targetId&&policy.applicationId===s.applicationId
   &&policy.controllerProgramDigest===fixtureProgramDigest&&raw.targetId===target.targetId,'private_scope_changed');
  check(raw.internalHealth?.frontendMetaName===install.frontendMetaName,'internal_health_contract_required');
  check(Date.parse(policy.expiresAt)>Date.parse(policy.createdAt)&&Date.parse(policy.expiresAt)-Date.parse(policy.createdAt)<=7200000
   &&Date.parse(policy.createdAt)<=Date.now()+120000,'private_window_invalid');
  check(raw.database.containerId===baselineRows.find(r=>r.name==='db').containerId&&raw.ingress.appContainerId===baselineRows.find(r=>r.name==='app').containerId
   &&raw.cadences.every(c=>baselineRows.some(r=>r.name===c.name&&['containerId','imageDigest','mountDigest'].every(k=>r[k]===c[k]))),'sealed_baseline_binding_changed');
  const {databaseSettingsDigest,ingressSettingsDigest}=activityRestorationDigests(raw);
  const cadences=raw.cadences.map(({name,behavior,behaviorDigest})=>({name,behavior,behaviorDigest}));
  check(databaseSettingsDigest===p.runtimeResume.databaseSettingsDigest&&ingressSettingsDigest===p.runtimeResume.ingressSettingsDigest
   &&same(sorted(cadences),sorted(p.runtimeResume.cadences))&&new Set(cadences.map(c=>c.name)).size===2,'restoration_seal_changed');
  check(new Set(raw.database.originalRoleConfig.map(v=>v.split('=')[0])).size===raw.database.originalRoleConfig.length
   &&raw.database.originalRoleConfig.filter(v=>v.startsWith('default_transaction_read_only=')).every(v=>['default_transaction_read_only=on','default_transaction_read_only=off'].includes(v)),'original_database_settings_invalid');
  if(sealed)check(same(sealed.policy,policy)&&same(rawSettings,raw),'private_scope_changed');
  rawSettings=raw;sealed={validated:true,policyDigest:cfg.policy.sha256,runtimeSettingsDigest:cfg.runtimeSettings.sha256,
   sourceDigests:{controller:cfg.controller.sha256,runtimeController:cfg.runtimeController.sha256,ui:cfg.ui.sha256},policy,
   runtimeSettings:{schemaVersion:'roost-activity-runtime-settings-v1',targetId:target.targetId,databaseSettingsDigest,ingressSettingsDigest,cadences,frontendMetaName:install.frontendMetaName}};
  return structuredClone(sealed);
 };
 const current=async(operationId,writes=false)=>{
  const state=await readReleaseState(),j=state?.journal,last=j?.at(-1);
  check(state?.release?.id===s.releaseId&&(state.release.manifestDigest??state.release.manifest_digest)===s.manifestDigest
   &&same(snapshotBasis(state.release.snapshot),snapshotBasis(s))&&same(state.release.snapshot.manifest,m)
   &&Array.isArray(j)&&j.length<=300&&last?.id===operationId&&contract.postObservationOperations.includes(last.operation)
   &&last.intent?.parameters?.postObservationDigest===scopeDigest&&[null,undefined,'uncertain'].includes(result(last.outcome))
   &&j.slice(0,-1).every(r=>['succeeded','failed','absent'].includes(result(r.outcome))),'durable_scope_changed');
  check(!contract.postObservationIntentError(s,{operation:last.operation,parameters:last.intent.parameters},j.slice(0,-1)),'progression_unproven');
  if(writes)check((compatible?['active','reconciliation_required'].includes(state.status):state.status==='active')
   &&Date.parse(state.effectiveExpiresAt??s.expiresAt)>Date.now()&&!result(last.outcome),'write_authority_unproven');
  return {state,operation:last};
 };
 const qualified=async options=>{
  const ctx=await current(options.operationId);await readSeals();
  const previous=ctx.state.journal.slice(0,-1),observation=previous.filter(j=>j.operation==='observe'&&result(j.outcome)==='succeeded').at(-1);
  const mode=observation?.intent?.parameters?.mode,e=observation?.outcome?.evidence;
  check(observation&&['candidate','rollback'].includes(mode)&&!contract.composeEvidenceError(s,e,mode==='rollback')
   &&e.healthy===true&&e.observationSeconds>=m.observation.seconds,'finished_observation_required');
  const expected=ctx.operation.operation==='runtime_resume'?{commit:e.deployedCommit,tree:e.deployedTree}:{commit:s.commit,tree:s.candidateTree};
  check(options.commit===expected.commit&&options.tree===expected.tree,'operation_version_changed');
  const r=parse(structuralSchema,await readRuntime(options),'qualified_runtime_unproven');
  check(r.targetId===target.targetId&&r.commit===options.commit&&r.tree===options.tree
   &&fresh(r.observedAt)&&new Set(r.services.map(v=>v.containerId)).size===5&&new Set(r.services.map(v=>v.name)).size===5
   &&Object.entries(roles).every(([name,role])=>r.services.some(v=>v.name===name&&v.role===role)),'qualified_runtime_changed');
  const prior=e.composeTargets[0].runtime.services,identityKeys=['name','role','containerId','imageDigest','mountDigest','createdAt','commit','tree','deploymentId'];
  const immutable=rows=>sorted(rows).map(v=>Object.fromEntries(identityKeys.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])));
  check(same(immutable(r.services),immutable(prior)),'qualified_runtime_identity_changed');
  const actual=pins(r.services);
  check(actual.find(v=>v.name==='db').imageDigest===baselineRows.find(v=>v.name==='db').imageDigest
   &&actual.find(v=>v.name==='db').mountDigest===baselineRows.find(v=>v.name==='db').mountDigest
   &&actual.every(v=>target.configuration.services.some(d=>d.name===v.name&&d.role===v.role&&d.mountDigest===v.mountDigest))
   &&rawSettings.cadences.every(c=>actual.some(v=>v.name===c.name&&v.mountDigest===c.mountDigest)),'raw_runtime_binding_changed');
  const health=parse(internalHealthSchema,await invokePython(runtimeSource,{operation:'read_health',policy:runtimePolicy(options.operationId,r),
   runtimeSettings:materializeSettings(r),facts:facts(r)}),'internal_health_unproven');
  check(health.backendCommit===r.commit&&health.frontendCommit===r.commit&&Date.now()-Date.parse(health.observedAt)<=10000
   &&Date.parse(health.observedAt)<=Date.now()+2000&&health.runtimeDigest===hash(canonical(observedRows(r.services))),'internal_health_identity_changed');
  return {ctx,r:{...r,backendCommit:health.backendCommit,frontendCommit:health.frontendCommit,healthy:true}};
 };
 const runtimePolicy=(operationId,r)=>({schemaVersion:'roost-activity-runtime-policy-v1',targetId:target.targetId,coolifyApplicationId:target.configuration.topology.applicationId,
  releaseId:s.releaseId,operationId,fixtureId:p.fixture.fixtureId,commit:r.commit,tree:r.tree,manifestDigest:s.manifestDigest,
  controllerProgramDigest:cfg.runtimeController.sha256,createdAt:sealed.policy.createdAt,expiresAt:sealed.policy.expiresAt,expectedRuntime:pins(r.services)});
 const materializeSettings=r=>({...structuredClone(rawSettings),database:{...structuredClone(rawSettings.database),containerId:r.services.find(v=>v.name==='db').containerId},
  ingress:{...structuredClone(rawSettings.ingress),appContainerId:r.services.find(v=>v.name==='app').containerId},
  cadences:rawSettings.cadences.map(c=>({...structuredClone(c),containerId:r.services.find(v=>v.name===c.name).containerId,imageDigest:r.services.find(v=>v.name===c.name).imageDigest}))});
 const facts=(r,extra={})=>({ingressBlockedByRoot:false,fixtureAbsentByRoot:false,parityVerifiedByRoot:false,
  proofDigest:hash(canonical(r)),observedAt:new Date().toISOString(),...extra});
 const invokePython=async(sourceText,request)=>{
  if(compatible&&sourceText===runtimeSource){check(compatiblePolicy&&!Object.hasOwn(request,'compatibleIngress'),'compatible_ingress_policy_required');
   request={...request,compatibleIngress:{schemaVersion:'roost-activity-compatible-ingress-v1',policy:structuredClone(compatiblePolicy),controllerProgramDigest:compatibleCfg.controllerProgramDigest}};}
  const script=renderActivityPythonStdin(sourceText,request,request.compatibleIngress?{compatibleIngressSource:source.compatibleIngress.toString('utf8')}:{});let stdout;
  try{stdout=await ssh({command:'python3 -',stdin:script,timeoutMs:90000,maxOutputBytes:65536});}catch{fail('native_result_unproven',true);}
  check(typeof stdout==='string'&&Buffer.byteLength(stdout)>0&&Buffer.byteLength(stdout)<=65536,'native_output_bound');
  try{return JSON.parse(stdout);}catch{fail('native_json_unproven',true);}
 };
 const runtimeOp=async(operation,r,operationId,extra={})=>{
  const ctx=await current(operationId,!operation.startsWith('read_runtime_'));
  const writeAllowed={hold_ingress:['smoke','fixture_cleanup'],open_fixture_window:['smoke','fixture_cleanup'],refence_fixture_window:['fixture_cleanup'],restore_runtime:['runtime_resume']};
  check(operation.startsWith('read_runtime_')||writeAllowed[operation]?.includes(ctx.operation.operation),'native_operation_scope_changed');
  const out=parse(runtimeObservationSchema,await invokePython(runtimeSource,{operation,policy:runtimePolicy(operationId,r),runtimeSettings:materializeSettings(r),facts:facts(r,extra)}),'native_runtime_unproven');
  if(compatible)qualifyActivityCompatibleIngressObservation(out.compatibleIngress,{policy:compatiblePolicy,controllerProgramDigest:compatibleCfg.controllerProgramDigest,operation,ingressPresent:out.ingressOwnedRulePresent});
  else check(out.compatibleIngress===undefined,'compatible_ingress_without_scope');
  check(out.operation===operation&&out.releaseId===s.releaseId&&out.operationId===operationId&&out.fixtureId===p.fixture.fixtureId
   &&out.targetId===target.targetId&&out.manifestDigest===s.manifestDigest&&out.controllerProgramDigest===cfg.runtimeController.sha256&&fresh(out.observedAt)
   &&out.databaseSettingsDigest===sealed.runtimeSettings.databaseSettingsDigest&&out.ingressSettingsDigest===sealed.runtimeSettings.ingressSettingsDigest
   &&out.cadenceSettingsDigest===hash(canonical(normalizedCadences(rawSettings.cadences)))&&new Set(out.cadences.map(c=>c.name)).size===2
   &&out.cadences.every(c=>p.runtimeResume.cadences.some(e=>c.name===e.name&&c.behaviorDigest===e.behaviorDigest)),'native_runtime_scope_changed');
  check(out.runtimeDigest===hash(canonical(observedRows(r.services,out.cadences))),'native_runtime_identity_changed');
  if(operation.startsWith('read_runtime_'))check(out.effect===false,'readonly_effect_detected');
  return out;
 };
 const nativeRead=async options=>{const {r}=await qualified(options),native=await runtimeOp('read_runtime_settings',r,options.operationId);
  return {r,native};};
 const readBrowserAccess=async(r,operationId)=>{
  check(rawSettings.browserAccess,'browser_source_contract_required');
  const out=parse(browserAccessSchema,await invokePython(runtimeSource,{operation:'read_browser_access',policy:runtimePolicy(operationId,r),runtimeSettings:materializeSettings(r),facts:facts(r)}),'native_browser_access_unproven');
  check(out.runtimeDigest===hash(canonical(observedRows(r.services)))&&out.settingsSourceDigest===rawSettings.browserAccess.settingsSourceDigest
   &&out.routesSourceDigest===rawSettings.browserAccess.routesSourceDigest,'native_browser_source_changed');return out;
 };
 const readCadenceTicks=async({operationId,since,commit,tree})=>{
  check(instant.safeParse(since).success&&Date.now()-Date.parse(since)>=1000*p.runtimeResume.observationSeconds
   &&Date.now()-Date.parse(since)<=300000,'native_tick_scope_unproven');
  const {ctx,r}=await qualified({operationId,commit,tree});
  check(ctx.operation.operation==='runtime_resume'&&rawSettings.cadenceEvidence&&instant.safeParse(since).success
   &&Date.parse(since)>=Date.parse(ctx.operation.createdAt)&&Date.now()-Date.parse(since)>=1000*p.runtimeResume.observationSeconds
   &&Date.now()-Date.parse(since)<=300000&&r.services.filter(v=>v.role==='cadence').every(v=>v.state==='running'),'native_tick_scope_unproven');
  const out=parse(tickReadSchema,await invokePython(runtimeSource,{operation:'cadence_tick_read',policy:runtimePolicy(operationId,r),runtimeSettings:materializeSettings(r),
   facts:facts(r),observation:{startedAt:since,observationSeconds:p.runtimeResume.observationSeconds}}),'native_tick_read_unproven');
  check(out.runtimeDigest===hash(canonical(observedRows(r.services)))&&out.startedAt===since&&fresh(out.observedAt),'native_tick_runtime_changed');
  if(out.status==='pending')return out;
  check(new Set(out.cadenceEvidence.map(v=>v.name)).size===2&&out.cadenceEvidence.every(v=>p.runtimeResume.cadences.some(c=>c.name===v.name&&c.behaviorDigest===v.behaviorDigest)
    &&Date.parse(v.lastRunAt)>=Date.parse(since)&&Date.parse(v.lastRunAt)<=Date.parse(v.observedAt)&&Date.parse(v.observedAt)<=Date.parse(out.observedAt)
    &&v.providerRequestsVerified===(v.providerRequests!==null)&&v.externalActionsVerified===(v.externalActions!==null)
    &&v.failureState===(v.failures===null?'unknown':v.failures===0?'none_recorded':'recorded')
    &&(!v.executionExpectationVerified||v.expectedExecutionState===v.executionState)),'native_tick_facts_unproven');
  return out;
 };
 const fixture=async(operation,{policy,seed:provided})=>{
  policy=parse(fixturePolicySchema,policy,'fixture_policy_invalid');
  check(typeof provided==='string'&&/^[a-f0-9]{64}$/.test(provided)&&timingSafeEqual(Buffer.from(provided,'hex'),secret),'seed_scope_changed');
  const writes=operation!=='reconcile',ctx=await current(policy?.operationId,writes);
  const allowed={smoke_prepare_empty:'smoke',smoke_populate:'smoke',fixture_cleanup:'fixture_cleanup'};
  check(!writes||allowed[operation]===ctx.operation.operation,'fixture_operation_scope_changed');
  await readSeals();
  check(policy.releaseId===s.releaseId&&policy.manifestDigest===s.manifestDigest&&policy.fixtureId===p.fixture.fixtureId&&policy.targetId===target.targetId
   &&policy.applicationId===s.applicationId&&policy.coolifyApplicationId===target.configuration.topology.applicationId
   &&policy.controllerProgramDigest===fixtureProgramDigest&&policy.frontendMetaName===install.frontendMetaName
   &&Object.entries(p.fixture).every(([k,v])=>policy[k]===v)&&policy.createdAt===sealed.policy.createdAt&&policy.expiresAt===sealed.policy.expiresAt,'fixture_policy_changed');
  check(policy.baseline===null?operation==='reconcile':same(policy.baseline,{releaseSchemaDigest:m.baseline.schemaDigest,releaseDataDigest:m.baseline.dataDigest,
   nonOwnedDigest:m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,catalogDigest:sealed.policy.catalogDigest}),'fixture_baseline_changed');
  const {r}=await qualified({operationId:policy.operationId,commit:policy.commit,tree:policy.tree});
  check(same(sorted(policy.expectedRuntime),pins(r.services)),'fixture_policy_changed');
  const out=parse(fixtureEnvelope,await invokePython(fixtureSource,{operation,policy,seedHex:provided}),'native_fixture_unproven');
  check(out.operation===operation&&out.releaseId===s.releaseId&&out.operationId===policy.operationId&&out.manifestDigest===s.manifestDigest
   &&out.targetId===target.targetId&&out.commit===r.commit&&out.tree===r.tree&&out.fixtureId===p.fixture.fixtureId
   &&out.controllerProgramDigest===fixtureProgramDigest&&fresh(out.observedAt),'native_fixture_scope_changed');
  check(out.runtimeDigest===hash(canonical(observedRows(r.services))),'native_fixture_runtime_changed');
  if(operation==='reconcile')check(out.observed.effect===false,'readonly_effect_detected');
  lastFixturePolicy=structuredClone(policy);lastFixtureReply=structuredClone(out);return out;
 };
 const sequenceRead=async()=>{check(lastFixturePolicy,'fixture_baseline_required');const out=await fixture('reconcile',{policy:lastFixturePolicy,seed:secret.toString('hex')});
  const observation=out.observed.phase==='needs_baseline_seal'?out.observed.observed:out.observed.after;
  check(hex.safeParse(observation?.sequenceDigest).success,'native_sequence_unproven');return {sequenceDigest:observation.sequenceDigest};};
 const windowResult=n=>({ingressBlocked:n.ingressOwnedRulePresent,cadencesHeld:n.cadencesHeld,databaseReadOnly:n.databaseReadOnly,activeOtherSessions:n.activeOtherSessions});
 const probeIngress=async(operationId,r)=>{
  const probe=parse(ingressProbeSchema,await probeIngressBlocked({operationId,targetId:target.targetId,expectedCommit:r.commit,url:new URL('/health',m.deployment.url).href}),'public_ingress_fence_unproven');
  check(fresh(probe.observedAt)&&((probe.httpStatus===null&&probe.transportTimeout)||([502,504].includes(probe.httpStatus)&&!probe.transportTimeout)),'public_ingress_fence_unproven');return probe;
 };
 const window=async({operationId,policy})=>{const {r,native}=await nativeRead({operationId,commit:policy.commit,tree:policy.tree});
  check(native.cadencesHeld&&native.databaseReadOnly&&native.activeOtherSessions===0,'fixture_window_basis_unproven');
  const held=native.ingressOwnedRulePresent?native:await runtimeOp('hold_ingress',r,operationId);
  check(held.ingressOwnedRulePresent,'ingress_hold_unproven');
  await probeIngress(operationId,r);
  const open=await runtimeOp('open_fixture_window',r,operationId,{ingressBlockedByRoot:true});return windowResult(open);};
 const refence=async({operationId,policy})=>{const {r,native}=await nativeRead({operationId,commit:policy.commit,tree:policy.tree});
  check(native.cadencesHeld&&native.ingressOwnedRulePresent&&native.activeOtherSessions===0,'refence_basis_unproven');
  await probeIngress(operationId,r);
  const fenced=native.databaseReadOnly?native:await runtimeOp('refence_fixture_window',r,operationId,{ingressBlockedByRoot:true});return windowResult(fenced);};
 const browse=async options=>{check(lastFixturePolicy&&lastFixtureReply,'fixture_observation_required');
  check(lastFixtureReply.observed.state===(options.phase==='empty'?'empty':'populated'),'browser_fixture_phase_changed');
  const {r,native}=await nativeRead({operationId:lastFixturePolicy.operationId,commit:options.commit,tree:lastFixturePolicy.tree});
  check(native.ingressOwnedRulePresent&&!native.databaseReadOnly&&native.cadencesHeld&&native.activeOtherSessions===0,'native_browser_access_unproven');
  const access=await readBrowserAccess(r,lastFixturePolicy.operationId);
  const input=activityBrowserInputSchema.parse({...options,sshHost:install.sshHost,containerAddress:access.containerAddress,
   port:49173,frontendMetaName:install.frontendMetaName,cookieName:access.cookieName});
  check(hash(readFileSync(new URL('./agent-host-release-activity-browser.mjs',import.meta.url)))===cfg.ui.sha256,'fixed_browser_source_changed');
  check(input.commit===r.commit,'browser_commit_changed');let b;
  try{b=await nativeProcess('node',{argv:[fileURLToPath(new URL('./agent-host-release-activity-browser.mjs',import.meta.url))],cwd:os.tmpdir(),
   input:JSON.stringify(input),durationMs:90000,maxBytes:8192});}catch{fail('browser_native_unproven',true);}
  check(Buffer.isBuffer(b)&&b.length>0&&b.length<=8192,'browser_output_bound');
  let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));}catch{fail('browser_json_unproven',true);}
  return parse(browserOutputSchema,value,'browser_proof_unproven');
 };
 const restore=async({operationId,since,commit,tree,observationSeconds,priorServices})=>{
  const {r,native}=await nativeRead({operationId,commit,tree});check(same(pins(r.services),pins(priorServices))&&native.ingressOwnedRulePresent&&native.cadencesHeld
   &&native.databaseReadOnly&&native.activeOtherSessions===0&&observationSeconds===p.runtimeResume.observationSeconds,'restore_basis_unproven');
  check(lastFixturePolicy?.operationId===operationId,'restore_fixture_observation_required');
  const absent=await fixture('reconcile',{policy:lastFixturePolicy,seed:secret.toString('hex')});
  const fingerprint=parse(z.object({schemaDigest:hex,dataDigest:hex}).strict(),await fullFingerprint(),'restore_full_fingerprint_unproven');
  check(absent.observed.state==='absent'&&absent.observed.fullDataParity===true&&absent.observed.after.sequenceDigest===p.baselineSequenceDigest
   &&fingerprint.schemaDigest===m.baseline.schemaDigest&&fingerprint.dataDigest===m.baseline.dataDigest,'restore_parity_unproven');
  await probeIngress(operationId,r);
  const start=new Date().toISOString(),restored=await runtimeOp('restore_runtime',r,operationId,{ingressBlockedByRoot:true,fixtureAbsentByRoot:true,
   parityVerifiedByRoot:true,proofDigest:hash(canonical({fixture:absent,fingerprint}))});
  check(!restored.ingressOwnedRulePresent&&restored.originalRoleConfigMatches&&restored.cadences.every(c=>c.state==='running'),'restore_readback_unproven');
  const observed=parse(nativeHealthSchema,await healthProbe({operationId,commit,tree,since:start,observationSeconds,services:r.services,cadences:sealed.runtimeSettings.cadences}),'native_tick_observation_unproven');
  check(observed.backendCommit===commit&&observed.frontendCommit===commit&&Date.parse(observed.startedAt)>=Date.parse(start)&&Date.parse(start)>=Date.parse(since)
   &&Date.parse(observed.observedAt)-Date.parse(observed.startedAt)>=1000*observationSeconds&&fresh(observed.observedAt)
   &&new Set(observed.cadenceEvidence.map(c=>c.name)).size===2&&observed.cadenceEvidence.every(c=>sealed.runtimeSettings.cadences.some(e=>c.name===e.name&&c.behaviorDigest===e.behaviorDigest)
    &&Date.parse(c.observedAt)>=Date.parse(observed.startedAt)&&Date.parse(c.observedAt)<=Date.parse(observed.observedAt)),'native_tick_receipts_unproven');
  const {r:final}=await qualified({operationId,commit,tree});
  check(fresh(final.observedAt)&&same(pins(final.services),pins(r.services))&&final.commit===commit&&final.tree===tree
   &&final.backendCommit===commit&&final.frontendCommit===commit,'restored_runtime_identity_changed');
  const finalFence=await runtimeOp('read_runtime_settings',final,operationId);
  check(!finalFence.ingressOwnedRulePresent&&finalFence.originalRoleConfigMatches&&finalFence.cadences.every(c=>c.state==='running'),'restored_runtime_drift');
  const schema=parse(z.object({schemaDigest:hex,dataDigest:hex}).strict(),await fullFingerprint(),'restored_schema_unproven');
  check(schema.schemaDigest===m.baseline.schemaDigest,'restored_schema_changed');
  return {backendCommit:commit,frontendCommit:commit,schemaDigest:schema.schemaDigest,healthy:true,fixtureAbsent:true,
   databaseSettingsDigest:sealed.runtimeSettings.databaseSettingsDigest,ingressSettingsDigest:sealed.runtimeSettings.ingressSettingsDigest,
   observationSeconds,services:final.services,cadences:sealed.runtimeSettings.cadences,startedAt:observed.startedAt,observedAt:observed.observedAt,cadenceEvidence:observed.cadenceEvidence};
 };
 const transport={
  validateScope:readSeals,fixture,sequenceRead,fullFingerprint,
  readRuntime:async options=>{const {r,native}=await nativeRead(options);return {...r,...windowResult(native)};},
  holdIngressAndOpenFixtureWindow:window,refenceFixtureWindow:refence,restoreRuntimeAndObserve:restore,browse,
  assertClosed:async context=>parse(closedSchema,await assertNativeClosed(context),'native_children_unclosed')
 };
 return {transport,readCadenceTicks};
}
