import { createHash, createHmac, randomUUID } from 'node:crypto';
import { z } from 'zod';
import contract from './agent-host-release-contract.cjs';
import { composeRuntimeServiceSchema } from './agent-host-release-compose-state.mjs';

const hash=z.string().regex(/^[a-f0-9]{64}$/),sha=z.string().regex(/^[a-f0-9]{40}$/),uuid=z.string().uuid();
const seal=z.object({file:z.string().min(1).max(1200).refine(v=>/^(?:[A-Za-z]:[\\/]|\/)/.test(v)
 &&!/[\x00\r\n]/.test(v)&&!v.split(/[\\/]/).includes('..')),sha256:hash}).strict();
export const installedActivitySettingsSchema=z.object({
 seedCredentialTarget:z.string().regex(/^Roost\/[A-Za-z0-9][A-Za-z0-9/_-]{0,179}$/),
 policy:seal,controller:z.object({sha256:hash}).strict(),runtimeController:z.object({sha256:hash}).strict(),ui:z.object({sha256:hash}).strict(),runtimeSettings:seal
}).strict();
export const activityControllerDigest=settings=>{const c=installedActivitySettingsSchema.parse(settings);
 return contract.releaseDigest({schemaVersion:'roost-activity-controller-set-v1',controllerSha256:c.controller.sha256,runtimeControllerSha256:c.runtimeController.sha256,uiSha256:c.ui.sha256});};
const fail=(code,uncertain=false)=>{throw Object.assign(Error(`release_activity_${code}`),{retryable:false,uncertain});};
const check=(v,code)=>{if(!v)fail(code);};
const parse=(schema,value,code)=>{const r=schema.safeParse(value);if(!r.success)fail(code);return r.data;};
const same=(a,b)=>canonical(a)===canonical(b);
const snapshotBasis=source=>{const {readinessDigest:_readiness,configurationDigest:_configuration,...snapshot}=source??{};return snapshot;};
const orderedRows=rows=>rows.slice().sort((a,b)=>a.name.localeCompare(b.name));
const canonical=value=>JSON.stringify(Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(canonical(v))])):value);
const result=o=>o?.status==='reconciled'?(o.reconciledStatus??o.reconciled_status):o?.status;
const expectedRoles={app:'app',migrate:'migration',db:'database',maintenance_cadence:'cadence',proactive_cadence:'cadence'};
const textHash=v=>createHash('sha256').update(v).digest('hex');

export function activityFixturePublicValues(fixture){
 const f=parse(z.object({fixtureId:uuid,userId:uuid,sessionId:uuid,eventId:uuid,traceId:uuid,
  memoryId:z.number().int().negative(),markerDigest:hash,summaryDigest:hash}).strict(),fixture,'fixture_scope_invalid');
 const summary=`Roost controlled activity fixture ${f.fixtureId}`;
 const marker={fixtureId:f.fixtureId,email:`roost-fixture-${f.fixtureId}@example.invalid`,displayName:`Roost controlled fixture ${f.fixtureId}`,ownership:'roost-activity-fixture-v1'};
 // Python canonical() sorts keys and uses ASCII. Fixed markers/UUIDs are ASCII.
 const canonical=JSON.stringify(Object.fromEntries(Object.entries(marker).sort(([a],[b])=>a.localeCompare(b))));
 const memoryId=-Number(1n+BigInt(`0x${f.fixtureId.replaceAll('-','')}`)%2000000000n);
 check(f.memoryId===memoryId&&f.markerDigest===textHash(canonical)&&f.summaryDigest===textHash(summary),'fixture_marker_changed');
 return {summary,memoryId,markerDigest:f.markerDigest,summaryDigest:f.summaryDigest};
}
export function deriveActivitySessionToken(fixture,seed){
 const f=parse(z.object({fixtureId:uuid,sessionId:uuid}).strict(),{fixtureId:fixture?.fixtureId,sessionId:fixture?.sessionId},'fixture_identity_invalid');
 const bytes=Buffer.isBuffer(seed)?seed:typeof seed==='string'&&/^[a-f0-9]{64}$/.test(seed)?Buffer.from(seed,'hex'):null;
 check(bytes?.length===32,'ephemeral_seed_required');
 return 'aion_sess_'+createHmac('sha256',bytes).update(`roost-activity-fixture-v1/session/${f.fixtureId}/${f.sessionId}`).digest('base64url');
}

const sealedScopeSchema=z.object({validated:z.literal(true),policyDigest:hash,runtimeSettingsDigest:hash,
 sourceDigests:z.object({controller:hash,runtimeController:hash,ui:hash}).strict(),
 policy:z.object({schemaVersion:z.literal('roost-activity-installed-policy-v1'),postObservationDigest:hash,fixtureDigest:hash,
  targetId:z.string().min(1).max(80),applicationId:uuid,createdAt:z.string().datetime(),expiresAt:z.string().datetime(),
  catalogDigest:hash,controllerProgramDigest:hash}).strict(),
 runtimeSettings:z.object({schemaVersion:z.literal('roost-activity-runtime-settings-v1'),targetId:z.string().min(1).max(80),
  databaseSettingsDigest:hash,ingressSettingsDigest:hash,frontendMetaName:z.string().regex(/^[A-Za-z0-9._:-]{1,80}$/),cadences:z.array(z.object({name:z.string().min(1).max(80),
   behavior:z.literal('restore_existing_loop'),behaviorDigest:hash}).strict()).length(2)}).strict()
}).strict();
const runtimeSchema=z.object({observedAt:z.string().datetime(),targetId:z.string().min(1).max(80),commit:sha,tree:sha,
 backendCommit:sha,frontendCommit:sha,healthy:z.literal(true),services:z.array(composeRuntimeServiceSchema).length(5),
 databaseReadOnly:z.boolean(),activeOtherSessions:z.number().int().nonnegative(),ingressBlocked:z.boolean(),cadencesHeld:z.boolean()}).strict();
const fpSchema=z.object({schemaDigest:hash,dataDigest:hash}).strict(),seqSchema=z.object({sequenceDigest:hash}).strict();
const supplemental=z.object({nonOwnedDigest:hash,sequenceDigest:hash,catalogDigest:hash,fullDataDigest:hash}).strict();
const inventorySchema=z.object({phase:z.literal('needs_baseline_seal'),state:z.literal('absent'),observed:supplemental,effect:z.literal(false),
 nativeJobQualified:z.literal(false),releaseSchemaVerified:z.literal(false)}).strict();
const fixtureObservedSchema=z.object({phase:z.literal('observed'),state:z.enum(['absent','empty','populated']),effect:z.boolean(),
 nonOwnedUnchanged:z.literal(true),sequenceUnchanged:z.literal(true),catalogUnchanged:z.literal(true),fullDataParity:z.boolean(),
 before:supplemental,after:supplemental,nativeJobQualified:z.literal(false),releaseSchemaVerified:z.literal(false),memoryId:z.number().int().negative(),
 summaryDigest:hash,markerDigest:hash}).strict();
const fixtureReplySchema=z.object({schemaVersion:z.literal('roost-activity-fixture-observation-v1'),operation:z.enum(['smoke_prepare_empty','smoke_populate','fixture_cleanup','reconcile']),
 releaseId:uuid,operationId:uuid,manifestDigest:hash,targetId:z.string().min(1).max(80),commit:sha,tree:sha,fixtureId:uuid,controllerProgramDigest:hash,
 runtimeDigest:hash,observedAt:z.string().datetime(),expectedTreeBoundByParentObservation:z.literal(true),providerCalls:z.literal(0),cadenceStarted:z.literal(false),
 fenceChanged:z.literal(false),nativeJobQualified:z.literal(false),ownedDatabaseSessionsClosed:z.literal(true),observed:z.union([inventorySchema,fixtureObservedSchema])}).strict();
const browserSchema=z.object({phase:z.enum(['empty','populated']),activityCount:z.number().int().min(0).max(1),backendCommit:sha,frontendCommit:sha,
 renderedEventId:uuid.nullable(),renderedSummaryDigest:hash.nullable(),renderDigest:hash,negativePathStatus:z.literal(401),providerRequests:z.literal(0),externalActions:z.literal(0)}).strict();
const closedSchema=z.object({nativeChildrenClosed:z.literal(true)}).strict();
const windowSchema=z.object({ingressBlocked:z.literal(true),cadencesHeld:z.literal(true),databaseReadOnly:z.literal(false),activeOtherSessions:z.literal(0)}).strict();
const fenceSchema=windowSchema.extend({databaseReadOnly:z.literal(true)}).strict();
const resumedSchema=z.object({backendCommit:sha,frontendCommit:sha,schemaDigest:hash,healthy:z.literal(true),fixtureAbsent:z.literal(true),
 databaseSettingsDigest:hash,ingressSettingsDigest:hash,observationSeconds:z.number().int().min(1).max(300),
 services:z.array(composeRuntimeServiceSchema).length(5),cadences:sealedScopeSchema.shape.runtimeSettings.shape.cadences,
 startedAt:z.string().datetime(),observedAt:z.string().datetime(),cadenceEvidence:z.array(z.object({name:z.string().min(1).max(80),
  behaviorDigest:hash,completedTicks:z.number().int().positive(),executionState:z.enum(['executed','skipped']),
  behaviorVerified:z.literal(true),summaryDigest:hash,observedAt:z.string().datetime()}).strict()).length(2)}).strict();

/** Dependencies are fixed installed source callbacks, never installation/model
 * selectors. This pure orchestrator executes no process, SQL, API or model. */
export function createActivityReleaseAdapter({manifest,binding,settings,seed,readState,transport}){
 const cfg=installedActivitySettingsSchema.parse(settings),m=contract.manifestSchema.parse(manifest),s=structuredClone(binding),p=m.postObservation;
 check(contract.isComposeManifest(m)&&p&&typeof readState==='function'&&transport&&typeof transport==='object','binding_invalid');
 const callbacks=['validateScope','fixture','readRuntime','fullFingerprint','sequenceRead','holdIngressAndOpenFixtureWindow','refenceFixtureWindow','restoreRuntimeAndObserve','browse','assertClosed'];
 check(Object.keys(transport).every(k=>callbacks.includes(k))&&callbacks.every(k=>typeof transport[k]==='function'),'fixed_transport_required');
 check(uuid.safeParse(s.releaseId).success&&uuid.safeParse(s.applicationId).success&&s.commit===p.candidateCommit&&s.candidateTree===p.candidateTree
  &&s.manifestDigest===contract.releaseDigest(m)&&same(s.manifest,m),'manifest_binding_changed');
 const {releaseId,...snapshot}=s,snapshotDigest=textHash(canonical(snapshotBasis(snapshot))),scopeDigest=contract.releaseDigest(p),fixtureDigest=contract.releaseDigest(p.fixture);
 check(p.controllerDigest===activityControllerDigest(cfg),'controller_set_changed');
 const values=activityFixturePublicValues(p.fixture),secret=Buffer.from(Buffer.isBuffer(seed)?seed:parse(hash,seed,'ephemeral_seed_required'),'hex');
 check(secret.length===32,'ephemeral_seed_required');const token=deriveActivitySessionToken(p.fixture,secret),t=m.deployment.targets[0];
 check(t.configuration.services.length===5&&Object.entries(expectedRoles).every(([name,role])=>t.configuration.services.filter(r=>r.name===name&&r.role===role).length===1),'fixed_service_scope_required');

 const authorized=async(operation,operationId,reconcile)=>{
  check(contract.postObservationOperations.includes(operation)&&uuid.safeParse(operationId).success,'operation_scope_invalid');
  const state=await readState();check(state?.release?.id===releaseId&&textHash(canonical(snapshotBasis(state.release.snapshot)))===snapshotDigest
   &&state.release.snapshot.manifestDigest===s.manifestDigest&&(state.release.manifestDigest??state.release.manifest_digest)===s.manifestDigest,'release_basis_changed');
  check(Array.isArray(state.journal)&&state.journal.length<=300,'journal_unproven');
  const current=state.journal.at(-1),prior=state.journal.slice(0,-1);
  check(current?.id===operationId&&current.operation===operation&&current.intent?.parameters?.postObservationDigest===scopeDigest
   &&(!result(current.outcome)||reconcile&&result(current.outcome)==='uncertain')
   &&prior.every(r=>['succeeded','failed','absent'].includes(result(r.outcome))),'current_durable_intent_required');
  check(!contract.postObservationIntentError(s,{operation,parameters:current.intent.parameters},prior),'progression_unproven');
  if(!reconcile)check(state.status==='active'&&Date.parse(state.effectiveExpiresAt??s.expiresAt)>Date.now(),'release_expired');
  const observation=prior.filter(r=>r.operation==='observe').at(-1),mode=observation?.intent?.parameters?.mode,e=observation?.outcome?.evidence;
  check(observation&&result(observation.outcome)==='succeeded'&&['candidate','rollback'].includes(mode)
   &&!contract.composeEvidenceError(s,e,mode==='rollback')&&e.healthy===true&&e.observationSeconds>=m.observation.seconds,'qualified_observation_required');
  const queues=prior.slice(0,prior.indexOf(observation)).filter(r=>r.operation===(mode==='rollback'?'rollback':'deploy')&&result(r.outcome)==='succeeded')
   .flatMap(r=>r.outcome.evidence?.deploymentIds??[]);
  check(same(queues,e.deploymentIds),'observation_queue_changed');
  return {state,current,observation,mode,commit:operation==='runtime_resume'?e.deployedCommit:s.commit,
   tree:operation==='runtime_resume'?e.deployedTree:s.candidateTree,priorServices:e.composeTargets[0].runtime.services};
 };
 const sealScope=async()=>{
  const seal=parse(sealedScopeSchema,await transport.validateScope({manifest:structuredClone(m),binding:structuredClone(s),settings:structuredClone(cfg)}),'installed_scope_unproven');
  check(seal.policyDigest===cfg.policy.sha256&&seal.runtimeSettingsDigest===cfg.runtimeSettings.sha256
   &&seal.sourceDigests.controller===cfg.controller.sha256&&seal.sourceDigests.runtimeController===cfg.runtimeController.sha256&&seal.sourceDigests.ui===cfg.ui.sha256
   &&seal.policy.postObservationDigest===scopeDigest&&seal.policy.fixtureDigest===fixtureDigest&&seal.policy.targetId===t.targetId
   &&seal.policy.applicationId===s.applicationId&&seal.runtimeSettings.targetId===t.targetId
   &&seal.runtimeSettings.databaseSettingsDigest===p.runtimeResume.databaseSettingsDigest&&seal.runtimeSettings.ingressSettingsDigest===p.runtimeResume.ingressSettingsDigest
   &&same(seal.runtimeSettings.cadences,p.runtimeResume.cadences),'installed_scope_changed');
  const delta=Date.parse(seal.policy.expiresAt)-Date.parse(seal.policy.createdAt);check(delta>0&&delta<=7200000&&Date.parse(seal.policy.createdAt)<=Date.now()+120000,'fixture_window_invalid');return seal;
 };
 const runtime=async context=>{
  const r=parse(runtimeSchema,await transport.readRuntime({commit:context.commit,tree:context.tree,operationId:context.current.id}),'runtime_unproven');
  check(r.targetId===t.targetId&&r.commit===context.commit&&r.tree===context.tree&&r.backendCommit===context.commit&&r.frontendCommit===context.commit
   &&Date.parse(r.observedAt)>=Date.parse(context.observation.outcome.evidence.observedAt)&&Date.now()-Date.parse(r.observedAt)<=60000&&Date.parse(r.observedAt)<=Date.now()+2000
   &&same(orderedRows(r.services),orderedRows(context.priorServices)),'current_runtime_identity_changed');return r;
 };
 const baseline=seal=>({releaseSchemaDigest:m.baseline.schemaDigest,releaseDataDigest:m.baseline.dataDigest,nonOwnedDigest:m.baseline.dataDigest,
  sequenceDigest:p.baselineSequenceDigest,catalogDigest:seal.policy.catalogDigest});
 const policyFor=(context,seal,r,hasBaseline=true)=>({schemaVersion:'roost-activity-fixture-policy-v1',kind:'synthetic_recent_activity',targetId:t.targetId,
  applicationId:s.applicationId,coolifyApplicationId:t.configuration.topology.applicationId,releaseId,operationId:context.current.id,...p.fixture,
  createdAt:seal.policy.createdAt,expiresAt:seal.policy.expiresAt,commit:context.commit,tree:context.tree,manifestDigest:s.manifestDigest,
  expectedRuntime:r.services.map(row=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest'].map(k=>[k,row[k]]))),frontendMetaName:seal.runtimeSettings.frontendMetaName,
  baseline:hasBaseline?baseline(seal):null,controllerProgramDigest:seal.policy.controllerProgramDigest});
 const fingerprint=async(full=true)=>{
  const f=parse(fpSchema,await transport.fullFingerprint(),'full_fingerprint_unproven'),q=parse(seqSchema,await transport.sequenceRead(),'sequence_unproven');
  check(f.schemaDigest===m.baseline.schemaDigest&&(!full||f.dataDigest===m.baseline.dataDigest)&&q.sequenceDigest===p.baselineSequenceDigest,'data_basis_changed');return {...f,...q};
 };
 const fixture=async(op,policy,runtimeRows)=>{
  const r=parse(fixtureReplySchema,await transport.fixture(op,{policy:structuredClone(policy),seed:secret.toString('hex')}),'fixture_unproven');
  check(r.operation===op&&r.releaseId===releaseId&&r.operationId===policy.operationId&&r.manifestDigest===s.manifestDigest
   &&r.targetId===t.targetId&&r.commit===policy.commit&&r.tree===policy.tree&&r.fixtureId===p.fixture.fixtureId
   &&r.controllerProgramDigest===policy.controllerProgramDigest&&Date.now()-Date.parse(r.observedAt)<=60000&&Date.parse(r.observedAt)<=Date.now()+2000,'fixture_identity_changed');
  const expected=orderedRows(runtimeRows).map(row=>({...policy.expectedRuntime.find(e=>e.name===row.name),status:row.state==='paused'?'running':row.state,paused:row.state==='paused',health:row.health}));
  check(r.runtimeDigest===textHash(canonical(expected)),'fixture_runtime_changed');
  const f=r.observed.phase==='needs_baseline_seal'?r.observed.observed:r.observed.after;
  check(f.nonOwnedDigest===m.baseline.dataDigest&&f.sequenceDigest===p.baselineSequenceDigest
   &&(policy.baseline===null||f.catalogDigest===policy.baseline.catalogDigest),'fixture_parity_unproven');
  if(r.observed.phase==='observed')check(r.observed.memoryId===values.memoryId&&r.observed.markerDigest===values.markerDigest
   &&r.observed.summaryDigest===values.summaryDigest,'fixture_marker_changed');return r.observed;
 };
 const closed=async context=>parse(closedSchema,await transport.assertClosed({operation:context.current.operation,operationId:context.current.id}),'native_children_unclosed');
 const baseProof=context=>({postObservationDigest:scopeDigest,fixtureDigest,controllerDigest:p.controllerDigest,targetId:t.targetId,commit:context.commit,tree:context.tree});
 const qualify=(context,status,proof,reconcile=false)=>{
  const body={requestId:randomUUID(),status:reconcile?'reconciled':status,...(reconcile?{reconciledStatus:status}:{}),observationOnly:reconcile,
   evidence:{observedAt:new Date().toISOString(),postObservation:proof}};
  check(!contract.postObservationOutcomeError(s,context.current,body,context.state.journal),'typed_outcome_unproven');
  return {status,evidence:{postObservation:proof}};
 };

 const execute=async(operation,operationId)=>{
  let effect=false,context;
  try{
   context=await authorized(operation,operationId,false);const sealed=await sealScope(),r=await runtime(context);
   check(r.cadencesHeld&&r.activeOtherSessions===0&&(operation==='smoke'||r.ingressBlocked),'maintenance_scope_unproven');
   const policy=policyFor(context,sealed,r),fresh=await fixture('reconcile',policy,r.services);
   if(operation==='smoke'){
    check(context.mode==='candidate'&&Date.parse(sealed.policy.expiresAt)>Date.now()&&fresh.state==='absent'&&r.databaseReadOnly,'empty_fixture_basis_required');
    await fingerprint();const inventory=await fixture('reconcile',policyFor(context,sealed,r,false),r.services);
    check(inventory.phase==='needs_baseline_seal'&&inventory.observed.fullDataDigest===m.baseline.dataDigest
     &&inventory.observed.catalogDigest===sealed.policy.catalogDigest,'supplemental_baseline_unproven');
    effect=true;parse(windowSchema,await transport.holdIngressAndOpenFixtureWindow({operationId,policy,runtimeSettings:sealed.runtimeSettings}),'fixture_window_unproven');
    const empty=await fixture('smoke_prepare_empty',policy,r.services);check(empty.state==='empty'&&empty.effect===true,'empty_fixture_unproven');
    const browse=async phase=>{
     const b=parse(browserSchema,await transport.browse({phase,token,summary:values.summary,summaryDigest:values.summaryDigest,eventId:p.fixture.eventId,commit:context.commit}),'render_unproven');
     check(b.phase===phase&&b.activityCount===(phase==='empty'?0:1)&&b.backendCommit===context.commit&&b.frontendCommit===context.commit
      &&(phase==='empty'?b.renderedEventId===null&&b.renderedSummaryDigest===null:b.renderedEventId===p.fixture.eventId&&b.renderedSummaryDigest===values.summaryDigest),'render_identity_changed');return b;
    };
    const emptyRender=await browse('empty'),populated=await fixture('smoke_populate',policy,r.services);
    check(populated.state==='populated'&&populated.effect===true,'populated_fixture_unproven');const populatedRender=await browse('populated');
    const last=await fixture('reconcile',policy,r.services);check(last.state==='populated','fixture_changed_after_render');await fingerprint(false);
    const current=await runtime(context);check(current.ingressBlocked&&current.cadencesHeld&&!current.databaseReadOnly&&current.activeOtherSessions===0,'fixture_window_changed');
    await closed(context);return qualify(context,'succeeded',{...baseProof(context),kind:'smoke',backendCommit:context.commit,frontendCommit:context.commit,
     emptyActivityCount:0,populatedActivityCount:1,renderedEventId:p.fixture.eventId,renderedSummaryDigest:values.summaryDigest,memoryId:values.memoryId,
     emptyRenderDigest:emptyRender.renderDigest,populatedRenderDigest:populatedRender.renderDigest,negativePathStatus:401,schemaDigest:m.baseline.schemaDigest,
     nonOwnedDataDigest:last.after.nonOwnedDigest,sequenceDigest:last.after.sequenceDigest,fixtureRows:{authUsers:1,authSessions:1,recentMemory:1},
     noUnownedChanges:true,fixtureOwned:true,ingressBlocked:true,cadencesHeld:true,nativeChildrenClosed:true,providerRequests:0,externalActions:0});
   }
   if(operation==='fixture_cleanup'){
    if(fresh.state!=='absent'){
     effect=true;if(r.databaseReadOnly)parse(windowSchema,await transport.holdIngressAndOpenFixtureWindow({operationId,policy,runtimeSettings:sealed.runtimeSettings}),'fixture_window_unproven');
     const removed=await fixture('fixture_cleanup',policy,r.services);check(removed.state==='absent'&&removed.fullDataParity,'fixture_cleanup_unproven');
    }
    effect=true;parse(fenceSchema,await transport.refenceFixtureWindow({operationId,policy,runtimeSettings:sealed.runtimeSettings}),'refence_unproven');
    const current=await runtime(context);check(current.databaseReadOnly&&current.activeOtherSessions===0&&current.ingressBlocked&&current.cadencesHeld,'refence_readback_unproven');
    const final=await fixture('reconcile',policy,r.services);check(final.state==='absent'&&final.fullDataParity,'fixture_absence_unproven');
    const f=await fingerprint();await closed(context);return qualify(context,'succeeded',{...baseProof(context),kind:'fixture_cleanup',...f,fixtureAbsent:true,authAbsent:true,eventAbsent:true,
     databaseReadOnly:true,activeOtherSessions:0,nativeChildrenClosed:true,sequencesUnchanged:true,noUnownedChanges:true,providerRequests:0,externalActions:0});
   }
   check(fresh.state==='absent'&&fresh.fullDataParity&&r.databaseReadOnly,'runtime_resume_fixture_pending');await fingerprint();
   effect=true;const resumed=parse(resumedSchema,await transport.restoreRuntimeAndObserve({operationId,since:context.current.createdAt,scope:sealed.runtimeSettings,
    commit:context.commit,tree:context.tree,priorServices:structuredClone(context.priorServices),observationSeconds:p.runtimeResume.observationSeconds}),'runtime_resume_unproven');
   check(resumed.backendCommit===context.commit&&resumed.frontendCommit===context.commit&&resumed.schemaDigest===m.baseline.schemaDigest
    &&resumed.databaseSettingsDigest===p.runtimeResume.databaseSettingsDigest&&resumed.ingressSettingsDigest===p.runtimeResume.ingressSettingsDigest
    &&resumed.observationSeconds>=p.runtimeResume.observationSeconds&&same(resumed.cadences,p.runtimeResume.cadences)
    &&Date.parse(resumed.startedAt)>=Date.parse(context.current.createdAt)
    &&Date.parse(resumed.observedAt)-Date.parse(resumed.startedAt)>=1000*p.runtimeResume.observationSeconds
    &&Date.now()-Date.parse(resumed.observedAt)<=60000&&Date.parse(resumed.observedAt)<=Date.now()+2000
    &&new Set(resumed.cadenceEvidence.map(c=>c.name)).size===2&&p.runtimeResume.cadences.every(c=>resumed.cadenceEvidence.some(e=>e.name===c.name&&e.behaviorDigest===c.behaviorDigest
     &&Date.parse(e.observedAt)>=Date.parse(resumed.startedAt)&&Date.parse(e.observedAt)<=Date.parse(resumed.observedAt))),'runtime_ticks_unproven');
   await closed(context);return qualify(context,'succeeded',{...baseProof(context),kind:'runtime_resume',backendCommit:resumed.backendCommit,frontendCommit:resumed.frontendCommit,
    schemaDigest:resumed.schemaDigest,healthy:true,fixtureAbsent:true,nativeChildrenClosed:true,databaseSettingsDigest:resumed.databaseSettingsDigest,
    ingressSettingsDigest:resumed.ingressSettingsDigest,observationSeconds:resumed.observationSeconds,services:resumed.services,cadences:resumed.cadences,
    cadenceEvidence:resumed.cadenceEvidence});
  }catch{
   if(context)try{await closed(context);}catch{}
   fail(effect?'effect_uncertain':'precondition_unproven',effect);
  }
 };
 const reconcile=async(operation,operationId)=>{
  const context=await authorized(operation,operationId,true),seal=await sealScope();
  // Resume changes cadence state. Its uncertain outcome cannot be qualified by
  // a running container or by rerunning restore/observe effects.
  if(operation==='runtime_resume'){
   const r=parse(runtimeSchema,await transport.readRuntime({commit:context.commit,tree:context.tree,operationId:context.current.id}),'runtime_unproven');
   const pins=['name','role','containerId','imageDigest','mountDigest','createdAt','commit','tree','deploymentId'];
   check(r.targetId===t.targetId&&r.commit===context.commit&&r.tree===context.tree&&r.backendCommit===context.commit&&r.frontendCommit===context.commit
    &&Date.now()-Date.parse(r.observedAt)<=60000&&Date.parse(r.observedAt)<=Date.now()+2000
    &&same(orderedRows(r.services).map(v=>Object.fromEntries(pins.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]))),
     orderedRows(context.priorServices).map(v=>Object.fromEntries(pins.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])))),'current_runtime_identity_changed');
   await closed(context);return qualify(context,'failed',{...baseProof(context),kind:'failure',phase:operation,failureCode:'runtime_resume_failed',ownedEffects:'unproven',nativeChildrenClosed:true},true);
  }
  const r=await runtime(context),policy=policyFor(context,seal,r),read=await fixture('reconcile',policy,r.services);
  const f=await fingerprint(read.state==='absent');await closed(context);
  if(operation==='fixture_cleanup'&&read.state==='absent'&&read.fullDataParity&&r.databaseReadOnly&&r.activeOtherSessions===0&&r.ingressBlocked&&r.cadencesHeld)
   return qualify(context,'succeeded',{...baseProof(context),kind:'fixture_cleanup',...f,fixtureAbsent:true,authAbsent:true,eventAbsent:true,databaseReadOnly:true,
    activeOtherSessions:0,nativeChildrenClosed:true,sequencesUnchanged:true,noUnownedChanges:true,providerRequests:0,externalActions:0},true);
  // DB contents cannot reconstruct actual browser rendering. Preserve owned
  // rows for the separate cleanup operation and fail truthfully, never replay.
  return qualify(context,'failed',{...baseProof(context),kind:'failure',phase:operation,failureCode:operation==='smoke'?'fixture_unproven':'data_parity_failed',
   ownedEffects:read.state==='absent'?'absent':'present',nativeChildrenClosed:true},true);
 };
 const invoke=async(m2,s2,o,isReconcile)=>{
  check(same(m2,m)&&same(s2,s)&&o&&Object.keys(o).every(k=>['operation','operationId','state'].includes(k)),'caller_binding_changed');
  if(!isReconcile)return execute(o.operation,o.operationId);
  try{return await reconcile(o.operation,o.operationId);}catch{
   if(contract.postObservationOperations.includes(o.operation)&&uuid.safeParse(o.operationId).success)
    try{await transport.assertClosed({operation:o.operation,operationId:o.operationId});}catch{}
   // Native connection/SQL/browser errors can contain private material. Keep
   // reconciliation unresolved, without forwarding a raw message or cause.
   fail('reconciliation_unproven',true);
  }
 };
 return {postObservation:(m2,s2,o)=>invoke(m2,s2,o,false),reconcilePostObservation:(m2,s2,o)=>invoke(m2,s2,o,true)};
}
