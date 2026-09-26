import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,randomUUID,sign,verify,type KeyObject} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import type {PrismaClient} from '@prisma/client';
import {materials as proofMaterials} from './bootstrap-proof-authority-native-fixture';
import {baseFixture,owned,prepare} from './bootstrap-channel-native-fixture';
import {createPrismaBootstrapIssuerStore} from '../modules/api-keys/bootstrap-issuer-store';
import {createPrismaWorkerIdentityLifecycleStore} from '../modules/api-keys/worker-identity-lifecycle-store';
import {createPrismaProofAuthorityStore} from '../modules/api-keys/bootstrap-proof-persistence';
import {proofEqual,proofReference,replayProofKeys,type ProofKeyIntent} from '../modules/api-keys/bootstrap-proof-key-contract';
import {proofAuthorityAttachment} from '../modules/api-keys/bootstrap-proof-authority-contract';
import {v3Authority,v3AuthorityVersion,v3Envelope,v3Intent,v3Seal,v3Domains,validateV3Authority} from '../modules/api-keys/bootstrap-proof-issuance-contract';
import {channelSnapshotDigest} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {bootstrapChannelSnapshot} from '../modules/api-keys/bootstrap-channel-contract';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {recordV3OwnerAuth} from '../modules/api-keys/bootstrap-v3-owner-auth';
import {provisionBootstrapInstallation} from '../modules/api-keys/bootstrap-installation-provision';
import {createPrismaV3AuthorityPort} from '../modules/api-keys/bootstrap-proof-issuance-authority-prisma';
import {createPrismaV3IssuancePorts} from '../modules/api-keys/bootstrap-proof-issuance-prisma';
import {createBootstrapProofV3Issuance,type V3OwnerTicketIssuer,type V3BindingSealer} from '../modules/api-keys/bootstrap-proof-issuance';
import type {AuthContext} from '../auth/api-key.middleware';
import {decisionGovernanceCommand,decisionGovernanceView} from '../modules/decisions/decision-governance';
import {admissionCommand,admissionVersion} from '../modules/agent-runtime/task-risk-admission';
import {computeRisk} from '../modules/agent-runtime/task-risk-contract';

// Public source rows and ephemeral signing keys are created only on an owned
// disposable database. No private key is persisted or printed. Native guards
// and stores, not this fixture, produce authority digests, fences and XIDs.
export async function prepareV3FirstEnrollmentSources(db:PrismaClient){
 await owned(db);
 const f=await baseFixture(db),b=f.b,ownerId=f.ticket.ownerId;
 const issuerKeys=generateKeyPairSync('ed25519'),sealKeys=generateKeyPairSync('ed25519');
 const issuerDer=issuerKeys.publicKey.export({type:'spki',format:'der'});
 const issuerMaterial={keyId:`native-v3-${randomUUID().slice(0,8)}`,algorithm:'Ed25519' as const,format:'spki-der-base64' as const,
  spki:issuerDer.toString('base64'),publicKeyDigest:createHash('sha256').update(issuerDer).digest('hex')};
 b.ticketKeyId=issuerMaterial.keyId;b.ticketPublicKeyDigest=issuerMaterial.publicKeyDigest;
 const generation={installationGeneration:f.snapshot.installationGeneration,hostId:b.hostId,hostGeneration:f.snapshot.hostGeneration};
 await provisionBootstrapInstallation(db,{authType:'user',workspaceId:b.workspaceId,userId:ownerId,
  workspaceRole:'owner',authenticatedAt:Math.floor((f.base-1000)/1000)},
  {installationId:b.installationId,material:issuerMaterial},new Date(f.base-1000));
 const lifecycle=createPrismaWorkerIdentityLifecycleStore(db,()=>new Date(f.base-1000));
 for(const kind of ['installation','host'] as const){
  const value={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId:b.workspaceId,kind,
   subjectId:kind==='host'?b.hostId:b.installationId,action:'adopt' as const,expected:null,
   generation:kind==='host'?generation.hostGeneration:generation.installationGeneration,
   installationId:b.installationId,installationGeneration:generation.installationGeneration,
   hostFingerprint:kind==='host'?b.hostFingerprint:null,authorityDigest:'a'.repeat(64),
   adoptionEvidenceDigest:'b'.repeat(64),expiresAt:f.iso(600000)};
  const accepted=await f.accept({workerIdentityLifecycle:value});
  const result=await lifecycle.apply({operationId:randomUUID(),decisionId:accepted.decisionId,decisionRevision:1,intent:value});
  assert.equal(result.state,'active','Native lifecycle fixture');
 }
 async function approve(field:string,value:unknown){const accepted=await f.accept({[field]:value});
  await prepare(db,tx=>tx.$executeRaw`UPDATE decision_acceptances SET created_at=clock_timestamp() WHERE id=${accepted.acceptanceId}::uuid`);
  return accepted.decisionId;
 }
 const api=createPrismaProofAuthorityStore(db);
 async function history(principal:string){return (await db.$queryRaw<Array<{record:any}>>`
  SELECT record FROM bootstrap_proof_key_history WHERE workspace_id=${b.workspaceId}::uuid AND principal=${principal} ORDER BY revision`).map(r=>r.record);}
 async function seed(){for(const principal of ['local_worker','roost_server'] as const){
  const worker=principal==='local_worker';
  const intent:ProofKeyIntent={version:'bootstrap-proof-key-history-v1',scope:worker?
   {principal,purpose:'worker-bootstrap-proof-v1',workspaceId:b.workspaceId,installationId:b.installationId}:
   {principal,purpose:'bootstrap-completion-binding-attestation-v1',workspaceId:b.workspaceId},
   action:'create',expectedRevision:0,targetEpoch:1,material:proofMaterials[worker?0:1],
   generation:worker?generation:null,provenance:{source:worker?'local_worker_os_protected':'roost_server_secret_store',evidenceDigest:'a'.repeat(64)},
   adoptionEvidenceDigest:null,activatesAt:null,cutoverAt:null,expiresAt:f.iso(600000)};
  const decisionId=await approve('workerBootstrapProofKey',intent);
  const result=await api.applyKey({operationId:randomUUID(),decisionId,decisionRevision:1,intent});
  assert.equal(result.ok,true,`Native ${principal} proof key must commit`);
 }}
 const issuerIntent={schemaVersion:'bootstrap-issuer-v1' as const,
  binding:{workspaceId:b.workspaceId,issuerId:b.workspaceId,installationId:b.installationId,purpose:'worker-bootstrap-owner-ticket-v1' as const},
  action:'adopt' as const,expectedRevision:0,targetEpoch:1,material:issuerMaterial,activatesAt:null,cutoverAt:null,
  adoptionEvidenceDigest:'a'.repeat(64),expiresAt:f.iso(600000)};
 const issuerDecision=await approve('workerBootstrapIssuer',issuerIntent);
 const issuerResult=await createPrismaBootstrapIssuerStore(db,()=>new Date(f.base-1000)).apply({
  operationId:randomUUID(),decisionId:issuerDecision,decisionRevision:1,intent:issuerIntent});
 assert.equal(issuerResult.revision,1,'Native issuer history must commit');
 await seed();
 const worker=replayProofKeys(await history('local_worker'));
 const server=replayProofKeys(await history('roost_server'));
 const decisionId=randomUUID(),ticketId=randomUUID(),requestId=randomUUID(),attachmentId=randomUUID();
 const attachment=proofAuthorityAttachment.parse({version:'bootstrap-proof-authority-v1',workspaceId:b.workspaceId,installationId:b.installationId,
  generation,ownerId,decisionId,decisionRevision:1,ticketId,requestId,enrollmentGeneration:1,
  purpose:'first_enrollment',worker:proofReference(worker,worker.highWater),server:proofReference(server,server.highWater),prior:null});
 const issuerHead=(await db.$queryRaw<Array<{revision:number;record_digest:string}>>`
  SELECT revision,record_digest FROM bootstrap_issuer_history WHERE workspace_id=${b.workspaceId}::uuid ORDER BY revision DESC LIMIT 1`)[0];
 assert.ok(issuerHead,'Native issuer head is required');
 const snapshot={...f.snapshot,purpose:'first_enrollment' as const,binding:b,issuerRevision:issuerHead.revision,
  issuerHistoryDigest:issuerHead.record_digest,validFrom:f.iso(-1000),expiresAt:f.iso(110000),
  certificateNotBefore:f.iso(-60000),certificateNotAfter:f.iso(3600000)};
 snapshot.recordDigest=channelSnapshotDigest(snapshot);
 const exactSnapshot=bootstrapChannelSnapshot.parse(snapshot);
 const channel={...f.intent.channel,validUntil:exactSnapshot.expiresAt,
  profile:{...f.intent.channel.profile,certificate:{...f.intent.channel.profile.certificate,
   notBefore:exactSnapshot.certificateNotBefore,notAfter:exactSnapshot.certificateNotAfter}}};
 const intent=v3Intent.parse({...f.intent,schemaVersion:'worker-bootstrap-admission-v3',purpose:'first_enrollment',
  requestId,channel,expiresAt:f.iso(100000),proofAuthority:attachment});
 const body={workerBootstrapProofAuthority:attachment,workerBootstrapAdmissionV3:intent,
  workerBootstrapChannel:{schemaVersion:'worker-bootstrap-channel-v1',ticketId,snapshot:exactSnapshot}};
 const acceptanceId=randomUUID(),previewId=randomUUID(),at=(await db.$queryRaw<Array<{at:string}>>`
  SELECT to_char(date_trunc('milliseconds',clock_timestamp()) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at`)[0].at;
 await db.$transaction(async tx=>{
  // Existing native fixtures suppress only the old decision policy row guards
  // for inert accepted-source setup. All current source/fence/audit triggers
  // run in origin and are restored before COMMIT.
  const guards=await tx.$queryRaw<Array<{tbl:string;name:string}>>`
   SELECT c.relname AS tbl,t.tgname AS name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
   WHERE c.relname IN ('decision_revisions','decision_impact_previews','decision_acceptances')
    AND NOT t.tgisinternal AND t.tgtype & 3=3`;
  for(const g of guards){assert.match(g.tbl,/^decision_(revisions|impact_previews|acceptances)$/);
   assert.match(g.name,/^[a-z_]+$/);await tx.$executeRawUnsafe(`ALTER TABLE ${g.tbl} DISABLE TRIGGER ${g.name}`);}
  await tx.$executeRaw`INSERT INTO decisions(id,workspace_id,title,status,source,authority_revision,updated_at)
   VALUES(${decisionId}::uuid,${b.workspaceId}::uuid,'Inert V3 first enrollment decision','proposed','roost_decision',1,clock_timestamp())`;
  await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
   VALUES(${decisionId}::uuid,${b.workspaceId}::uuid,1,${JSON.stringify(body)}::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
  await tx.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
   VALUES(${previewId}::uuid,${decisionId}::uuid,${b.workspaceId}::uuid,1,'{}'::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest({})})`;
  await tx.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority,created_at)
   VALUES(${acceptanceId}::uuid,${decisionId}::uuid,${b.workspaceId}::uuid,${previewId}::uuid,${ownerId}::uuid,${randomUUID()}::uuid,
    ${reviewDigest(body)},'{"status":"owner_reserved"}'::jsonb,${at}::timestamptz)`;
  await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
  for(const g of guards)await tx.$executeRawUnsafe(`ALTER TABLE ${g.tbl} ENABLE TRIGGER ${g.name}`);
 },{isolationLevel:'Serializable',timeout:30000});
 const attached=await api.attach({operationId:attachmentId,attachment});
 assert.equal(attached.ok,true,'Native proof attachment must commit');
 const [facts]=await db.$queryRaw<Array<{tickets:number;attachments:number;authority_events:number}>>`
  SELECT (SELECT count(*)::int FROM worker_bootstrap_tickets WHERE workspace_id=${b.workspaceId}::uuid) AS tickets,
   (SELECT count(*)::int FROM bootstrap_proof_attachments WHERE id=${attachmentId}::uuid) AS attachments,
   (SELECT count(*)::int FROM decision_authority_events WHERE decision_id=${decisionId}::uuid) AS authority_events`;
 assert.equal(facts.tickets,0,'First enrollment must have no predecessor ticket');
 assert.ok(facts.authority_events>=1,'Native decision authority event required');
 const auth:AuthContext={authType:'user',workspaceRole:'owner',workspaceId:b.workspaceId,userId:ownerId,
  authenticatedAt:Math.floor(Date.parse(at)/1000)-1};
 const ownerAuth=await recordV3OwnerAuth(db,auth,{decisionId,requestId:randomUUID()});
 const authority=v3Authority.parse(await db.$transaction(async tx=>{
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  await tx.$executeRaw`SET LOCAL search_path = pg_catalog, public`;
  return createPrismaV3AuthorityPort().read(tx,attachmentId,null);
 },{isolationLevel:'RepeatableRead',timeout:30000}));
 assert.equal(authority.attachmentId,attachmentId);
 assert.equal(authority.attachment.ticketId,ticketId);
 assert.equal(authority.owner.decisionId,decisionId);
 const command={version:'bootstrap-proof-issue-command-v3' as const,operationId:randomUUID(),attachmentId,
  expected:v3AuthorityVersion(authority)};
 validateV3Authority(command,authority);
 return {f,attachment,attachmentId,decisionId,acceptanceId,intent,snapshot:exactSnapshot,at,facts,ownerAuth,authority,command,
  issuerKeys,sealKeys};
}

// The two Ed25519 private keys live only in this process, for this disposable
// native qualification. The verifier recomputes signatures over the exact V3
// transcript bytes and never accepts a placeholder signature.
export async function issueV3NativeFirstEnrollment(db:PrismaClient,
 prepared:Awaited<ReturnType<typeof prepareV3FirstEnrollmentSources>>){
 const counters={issuerSignatures:0,issuerVerifications:0,seals:0,sealVerifications:0};
 const signature=(hex:string,key:KeyObject)=>sign(null,Buffer.from(hex,'hex'),key).toString('hex');
 const checked=(hex:string,sig:string,key:KeyObject)=>verify(null,Buffer.from(hex,'hex'),key,Buffer.from(sig,'hex'));
 const issuer:V3OwnerTicketIssuer={qualification:'injected_owner_ticket_issuer_v3',
  async issue(_db,request){counters.issuerSignatures+=2;return {
   version:'worker-bootstrap-owner-envelope-v3',domain:v3Domains.envelope,
   signed:{payload:request.payload,signature:signature(request.contentBytes,prepared.issuerKeys.privateKey)},
   decision:{payload:request.decision,signature:signature(request.decisionBytes,prepared.issuerKeys.privateKey)}};},
  async verify(_db,request,input){counters.issuerVerifications++;
   const value=v3Envelope.parse(input);
   return proofEqual(value.signed.payload,request.payload)&&proofEqual(value.decision.payload,request.decision)&&
    checked(request.contentBytes,value.signed.signature,prepared.issuerKeys.publicKey)&&
    checked(request.decisionBytes,value.decision.signature,prepared.issuerKeys.publicKey);}
 };
 const sealer:V3BindingSealer={qualification:'injected_roost_binding_sealer_v3',
  async seal(_db,request){counters.seals++;return {payload:request.payload,
   signature:signature(request.bytes,prepared.sealKeys.privateKey)};},
  async verify(_db,request,input){counters.sealVerifications++;const value=v3Seal.parse(input);
   return proofEqual(value.payload,request.payload)&&checked(request.bytes,value.signature,prepared.sealKeys.publicKey);}
 };
 const errors:string[]=[];
 const diagnosticClient={...db,$transaction:async(work:any,options:any)=>{
  try{return await db.$transaction(work,options);}catch(error:any){
   errors.push(String(error?.meta?.message??error?.message??error).slice(0,1200));throw error;}
 }} as any;
 const api=createBootstrapProofV3Issuance({ports:createPrismaV3IssuancePorts(diagnosticClient),
  authority:createPrismaV3AuthorityPort(),issuer,sealer});
 const result=await api.issue(prepared.command);
 if(!result.ok)return {result,counters,errors,api,readback:null,facts:null};
 const readback=await api.inspect(prepared.command);
 const [facts]=await db.$queryRaw<Array<{operations:number;phases:number;tickets:number;attempts:number;links:number;seals:number;commitments:number}>>`
  SELECT (SELECT count(*)::int FROM bootstrap_v3_operations WHERE id=${prepared.command.operationId}::uuid) AS operations,
   (SELECT count(*)::int FROM bootstrap_v3_phases WHERE operation_id=${prepared.command.operationId}::uuid) AS phases,
   (SELECT count(*)::int FROM worker_bootstrap_tickets WHERE id=${prepared.attachment.ticketId}::uuid) AS tickets,
   (SELECT count(*)::int FROM worker_bootstrap_attempts WHERE ticket_id=${prepared.attachment.ticketId}::uuid) AS attempts,
   (SELECT count(*)::int FROM bootstrap_proof_ticket_links WHERE attachment_id=${prepared.attachmentId}::uuid) AS links,
   (SELECT count(*)::int FROM bootstrap_v3_seals WHERE operation_id=${prepared.command.operationId}::uuid) AS seals,
   (SELECT count(*)::int FROM bootstrap_v3_commitments WHERE operation_id=${prepared.command.operationId}::uuid) AS commitments`;
 return {result,counters,errors,api,readback,facts};
}

// Normal owner Decision API probe. It runs after the independent issuance
// qualification in the disposable database. It never disables a trigger.
export async function probeV3OwnerDecisionApi(db:PrismaClient,
 prepared:Awaited<ReturnType<typeof prepareV3FirstEnrollmentSources>>){
 await owned(db);
 const workspaceId=prepared.f.b.workspaceId,ownerId=prepared.f.ticket.ownerId;
 const application=await db.application.create({data:{workspaceId,name:'Isolated V3 decision admission',slug:`v3-admission-${randomUUID().slice(0,12)}`}});
 const project=await db.project.create({data:{workspaceId,name:'Isolated V3 decision project'}});
 await db.applicationProject.create({data:{applicationId:application.id,projectId:project.id}});
 const component=await db.applicationArchitectureComponent.create({data:{applicationId:application.id,name:'Isolated decision target',type:'backend'}});
 const task=await db.task.create({data:{workspaceId,projectId:project.id,ownerUserId:ownerId,title:'Inert V3 decision scope'}});
 const procedure=await db.procedure.create({data:{workspaceId,name:'Isolated V3 decision admission procedure',purpose:'Verify the exact disposable decision',status:'active',
  steps:{create:{stepOrder:1,instruction:'Verify the exact V3 decision proposal and source records'}},
  applicationLinks:{create:{applicationId:application.id}}}});
 const source=await db.companyRecord.create({data:{workspaceId,applicationId:application.id,recordType:'requirement',key:`v3-admission-${randomUUID()}`,
  title:'Disposable decision evidence',description:'An isolated owner decision and its bounded task are verified in the disposable database.'}});
 const decisionId=randomUUID(),ticketId=randomUUID(),requestId=randomUUID();
 const attachment={...prepared.attachment,decisionId,ticketId,requestId};
 const intent={...prepared.intent,requestId,proofAuthority:attachment};
 const body={decisionId,title:'Approve V3 first enrollment',context:'Owner approves exact worker bootstrap sources',
  decision:'Issue one first enrollment ticket from the accepted V3 bundle',rationale:'Use the current owner and canonical source records',
  consequences:'A single bounded first enrollment may be issued',scopeReason:'The scoped task needs this worker enrollment',
  scope:[{type:'task',id:task.id}],supersedesId:null,conflicts:[],
  workerBootstrapProofAuthority:attachment,workerBootstrapAdmissionV3:intent,
  workerBootstrapChannel:{schemaVersion:'worker-bootstrap-channel-v1',ticketId,snapshot:prepared.snapshot}};
 const view=await db.$transaction(tx=>decisionGovernanceView(tx,workspaceId,ownerId),{isolationLevel:'Serializable',timeout:30000});
 if('error' in view)throw Error(`V3 decision view denied: ${view.error}`);
 let proposed:any,proposalError:string|null=null;
 try{proposed=await db.$transaction(tx=>decisionGovernanceCommand(tx,workspaceId,ownerId,'proposal',
  {...body,requestId:randomUUID(),expectedVersion:view.expectedVersion}),{isolationLevel:'Serializable',timeout:30000});}
 catch(error:any){proposalError=String(error?.meta?.message??error?.message??error).slice(0,800);}
 if(proposalError||!proposed?.record?.id)return {proposalError,proposalResult:proposed??null,acceptanceError:null,acceptanceResult:null};
 // Native risk and admission rows pass their normal database guards. The
 // command and final seal are produced by the application and SQL policy.
 const riskScopeId=randomUUID(),riskInput={applicationId:application.id,
  contract:{procedures:{items:[{id:procedure.id,revision:String(procedure.version)}],noneReason:null}},
  prompt:null,baseBranch:null,releaseSet:null};
 await db.$executeRaw`INSERT INTO task_risk_heads(task_id) VALUES(${task.id}::uuid)`;
 await db.$executeRaw`INSERT INTO task_risk_scopes(id,workspace_id,task_id,version,application_id,component_id,release_set_id,input,input_hash,actor_user_id,request_id,request_hash)
  VALUES(${riskScopeId}::uuid,${workspaceId}::uuid,${task.id}::uuid,1,${application.id}::uuid,${component.id}::uuid,NULL,
   ${JSON.stringify(riskInput)}::jsonb,${reviewDigest(riskInput)},${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest({riskScopeId})})`;
 const ref={id:source.id,revision:source.updatedAt.toISOString()},impact={level:'low' as const,
  rationale:'Only the isolated disposable task is affected',evidence:[ref]};
 const entry={taskId:task.id,dimensions:Object.fromEntries(['money','data','security','availability','legal','reversibility','users'].map(d=>[d,impact])),
  uncertainty:{level:'none' as const,reasons:'The isolated fixture has explicit bounds',evidence:[ref]},contradictions:[]};
 const entries=[entry],result=computeRisk(entries as any);
 await db.$executeRaw`INSERT INTO task_risk_assessments(id,workspace_id,task_id,version,source_version,sources,entries,result,joint_rationale,algorithm,actor_user_id,request_id,request_hash)
  VALUES(${randomUUID()}::uuid,${workspaceId}::uuid,${task.id}::uuid,1,task_risk_version(${task.id}::uuid),task_risk_sources(${task.id}::uuid),
   ${JSON.stringify(entries)}::jsonb,${JSON.stringify(result)}::jsonb,'Isolated decision admission',
   'roost-native-risk-v1',${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest({entries})})`;
 const scope=await db.$transaction(async tx=>admissionCommand(tx,workspaceId,task.id,ownerId,'scope',{
  requestId:randomUUID(),expectedVersion:await admissionVersion(tx,task.id),taskType:'review',environment:'development',
  targetId:source.id,releaseId:source.id,commit:'a'.repeat(40),destructive:false,procedureId:procedure.id,
  rationale:'Review the exact V3 proposal in the isolated database'}),{isolationLevel:'Serializable',timeout:30000}).catch(async error=>{
   throw Error(`Admission scope failed: ${String(error?.meta?.message??error?.message??error).slice(0,800)}`);});
 if('error' in scope)throw Error(`Admission scope denied: ${scope.error}`);
 // The proposal preview predates the native risk and scope rows. Refresh it
 // through the owner command before pinning decision-dependent evidence.
 const beforeReview=await db.$transaction(tx=>decisionGovernanceView(tx,workspaceId,ownerId,decisionId),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in beforeReview)throw Error(`V3 pre-review view denied: ${beforeReview.error}`);
 const reviewed=await db.$transaction(tx=>decisionGovernanceCommand(tx,workspaceId,ownerId,'action',
  {requestId:randomUUID(),expectedVersion:beforeReview.expectedVersion,action:'review_impact'},decisionId),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in reviewed)throw Error(`V3 impact review denied: ${reviewed.error}`);
 const evidence=await db.$transaction(async tx=>admissionCommand(tx,workspaceId,task.id,ownerId,'evidence',{
  requestId:randomUUID(),expectedVersion:await admissionVersion(tx,task.id),operation:'decision_supersede',gate:'procedure',
  verdict:'passed',evidence:ref,rationale:'Isolated exact decision evidence',
  validation:'Inspect the proposed V3 decision and scoped source records',
  observedResult:'The exact V3 proposal and scoped records are present'}),{isolationLevel:'Serializable',timeout:30000});
 if('error' in evidence)throw Error(`Admission evidence denied: ${evidence.error}`);
 const [admission]=await db.$queryRaw<Array<{risk:string|null;view:any;seal:string|null}>>`
  SELECT task_risk_current(${task.id}::uuid)::text AS risk,
   task_admission_view(${task.id}::uuid,'decision_supersede') AS view,
   task_admission_seal(${task.id}::uuid,'decision_supersede') AS seal`;
 assert.ok(admission.risk,'Current native risk assessment required');
 assert.match(admission.seal??'',/^[a-f0-9]{64}$/,'Canonical decision admission seal required');
 const candidate=await db.$transaction(tx=>decisionGovernanceView(tx,workspaceId,ownerId,decisionId),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in candidate)throw Error(`V3 candidate decision view denied: ${candidate.error}`);
 let acceptance:any,acceptanceError:string|null=null;
 try{acceptance=await db.$transaction(tx=>decisionGovernanceCommand(tx,workspaceId,ownerId,'action',
  {requestId:randomUUID(),expectedVersion:candidate.expectedVersion,action:'accept',previewId:candidate.previews?.[0]?.id},decisionId),
  {isolationLevel:'Serializable',timeout:30000});}
 catch(error:any){acceptanceError=String(error?.meta?.message??error?.message??error).slice(0,800);}
 if(acceptanceError||!acceptance?.record?.id)throw Error(`V3 decision acceptance failed: ${acceptanceError??JSON.stringify(acceptance)}`);
 // A separate primary-owner decision is required for managed runtime approval.
 // Its selection digest is computed from the real trusted-pilot canonical
 // serializer over the exact Codex selection used by this disposable probe.
 const importModule=new Function('specifier','return import(specifier)') as (specifier:string)=>Promise<any>;
 const [fixtureSelection,pilot]=await Promise.all([
  importModule(pathToFileURL(path.resolve('scripts/fixtures/trusted-pilot.mjs')).href),
  importModule(pathToFileURL(path.resolve('scripts/lib/agent-host-trusted-pilot.mjs')).href)]);
 const selection=fixtureSelection.managedSelectionFixture('codex_responses');
 const selectionDigest=createHash('sha256').update(pilot.trustedPilotBytes(selection)).digest('hex');
 const managedBody={title:'Approve isolated managed Codex runtime',
  context:'The isolated worker installation and task have exact source records',
  decision:'Approve the exact low risk managed Codex selection for this task',
  rationale:'The owner accepts the bounded managed runtime selection',
  consequences:'Only the scoped disposable task may use this selection',
  scopeReason:'The isolated task needs explicit managed runtime approval',
  scope:[{type:'task',id:task.id}],supersedesId:null,conflicts:[],
  managedRuntimeApproval:{schemaVersion:'roost-managed-runtime-approval-v1',taskId:task.id,
   applicationId:application.id,installationId:prepared.attachment.installationId,selectionDigest,
   backend:'codex_responses',riskClass:'low',mode:'trusted_provider_pilot',residualRiskAccepted:true,
   acknowledgement:'windows_account_authority_not_os_isolation'}};
 const currentRisk=(await db.$queryRaw<Array<{id:string|null}>>`SELECT task_risk_current(${task.id}::uuid)::text AS id`)[0].id;
 if(!currentRisk)await db.$executeRaw`INSERT INTO task_risk_assessments(id,workspace_id,task_id,version,source_version,sources,entries,result,joint_rationale,algorithm,actor_user_id,request_id,request_hash)
  VALUES(${randomUUID()}::uuid,${workspaceId}::uuid,${task.id}::uuid,(SELECT max(version)+1 FROM task_risk_assessments WHERE task_id=${task.id}::uuid),
   task_risk_version(${task.id}::uuid),task_risk_sources(${task.id}::uuid),${JSON.stringify(entries)}::jsonb,
   ${JSON.stringify(result)}::jsonb,'Recheck after accepted V3 decision','roost-native-risk-v1',
   ${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest({entries,after:'v3_acceptance'})})`;
 const managedView=await db.$transaction(tx=>decisionGovernanceView(tx,workspaceId,ownerId),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in managedView)throw Error(`Managed decision view denied: ${managedView.error}`);
 const managedProposal:any=await db.$transaction(tx=>decisionGovernanceCommand(tx,workspaceId,ownerId,'proposal',
  {...managedBody,requestId:randomUUID(),expectedVersion:managedView.expectedVersion}),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in managedProposal)throw Error(`Managed decision proposal denied: ${managedProposal.error}`);
 const managedDecisionId=managedProposal.record.id;
 const managedEvidence=await db.$transaction(async tx=>admissionCommand(tx,workspaceId,task.id,ownerId,'evidence',{
  requestId:randomUUID(),expectedVersion:await admissionVersion(tx,task.id),operation:'decision_supersede',gate:'procedure',
  verdict:'passed',evidence:ref,rationale:'Exact managed runtime proposal and source checked',
  validation:'Inspect the separate owner proposal and canonical selection digest',
  observedResult:'The proposal binds one task, application and installation'}),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in managedEvidence)throw Error(`Managed decision admission denied: ${managedEvidence.error}`);
 const [managedAdmission]=await db.$queryRaw<Array<{seal:string|null}>>`
  SELECT task_admission_seal(${task.id}::uuid,'decision_supersede') AS seal`;
 assert.match(managedAdmission.seal??'',/^[a-f0-9]{64}$/);
 const managedCandidate=await db.$transaction(tx=>decisionGovernanceView(tx,workspaceId,ownerId,managedDecisionId),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in managedCandidate)throw Error(`Managed candidate view denied: ${managedCandidate.error}`);
 const managedAcceptance:any=await db.$transaction(tx=>decisionGovernanceCommand(tx,workspaceId,ownerId,'action',
  {requestId:randomUUID(),expectedVersion:managedCandidate.expectedVersion,action:'accept',
   previewId:managedCandidate.previews?.[0]?.id},managedDecisionId),
  {isolationLevel:'Serializable',timeout:30000});
 if('error' in managedAcceptance)throw Error(`Managed decision acceptance denied: ${managedAcceptance.error}`);
 return {decisionId,proposalError:null,proposalResult:{id:proposed.record.id,replayed:proposed.replayed},impactReviewed:true,
  taskId:task.id,riskId:admission.risk,admissionStatus:admission.view.status,admissionSeal:admission.seal,
  acceptanceError,acceptanceResult:acceptance??null,
  managed:{decisionId:managedDecisionId,acceptanceId:managedAcceptance.record?.id??null,
   selectionDigest,admissionSeal:managedAdmission.seal,installationId:prepared.attachment.installationId,
   taskId:task.id,applicationId:application.id}};
}
