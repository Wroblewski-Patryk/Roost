import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { resolveReviewPrincipal, type ReviewActor } from "../../auth/agent-principal";
import { requireRuntimeContent } from "../agent-runtime/runtime-redaction-policy";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { authorityState } from "../decisions/decision-authority";
import { resolveDecisionAuthority } from "../decisions/decision-authority-policy";
import { findingBody, findingCreate, findingRevise, findingOccurrence, findingCommand, findingFingerprint, findingGrant, findingRoute, findingTransition, type FindingBody } from "./finding-contract";
import { inspectReady } from "../agent-runtime/task-execution-readiness";

export type FindingDb = Prisma.TransactionClient;
type Principal = NonNullable<Awaited<ReturnType<typeof resolveReviewPrincipal>>>;
const same = (a: { kind: string; id: string } | null | undefined, b: { kind: string; id: string }) => a?.kind === b.kind && a.id === b.id;
const json = (value: unknown) => JSON.stringify(value);
const wire = (row: any) => row ? Object.fromEntries(Object.entries(row).filter(([key]) => key !== "request_hash").map(([key,value]) => [key.replace(/_([a-z])/g, (_,char) => char.toUpperCase()),value])) : null;
function boundHistory<T extends Record<string,any>>(value:T,fields:string[]):T {
  while(Buffer.byteLength(json(value))>400000){
    const field=fields.filter(key=>Array.isArray(value[key])&&value[key].length>0).sort((a,b)=>Buffer.byteLength(json(value[b]))-Buffer.byteLength(json(value[a])))[0];
    if(!field)throw new Error("finding_response_too_large");
    value[field].pop();(value as Record<string,any>).truncated=true;
  }
  return value;
}

export async function findingCatalog(db:FindingDb,w:string,a:string) {
  const application=await db.application.findFirst({where:{id:a,workspaceId:w},select:{id:true,name:true}});
  if(!application)return {error:"finding_not_found"};
  const records=await db.$queryRaw<any[]>`SELECT * FROM (
    (SELECT 'application' AS type,id,name AS label,finding_reference(${w}::uuid,'application',id) AS revision FROM applications WHERE id=${a}::uuid AND workspace_id=${w}::uuid)
    UNION ALL (SELECT 'component',id,name,finding_reference(${w}::uuid,'component',id) FROM application_architecture_components WHERE application_id=${a}::uuid ORDER BY id LIMIT 101)
    UNION ALL (SELECT 'task',t.id,t.title,finding_reference(${w}::uuid,'task',t.id) FROM tasks t JOIN application_projects ap ON ap.project_id=t.project_id WHERE t.workspace_id=${w}::uuid AND ap.application_id=${a}::uuid ORDER BY t.id LIMIT 101)
    UNION ALL (SELECT 'project',p.id,p.name,finding_reference(${w}::uuid,'project',p.id) FROM projects p JOIN application_projects ap ON ap.project_id=p.id WHERE p.workspace_id=${w}::uuid AND ap.application_id=${a}::uuid ORDER BY p.id LIMIT 101)
    UNION ALL (SELECT 'procedure',p.id,p.name,finding_reference(${w}::uuid,'procedure',p.id) FROM procedures p JOIN application_procedures ap ON ap.procedure_id=p.id WHERE p.workspace_id=${w}::uuid AND ap.application_id=${a}::uuid ORDER BY p.id LIMIT 101)
    UNION ALL (SELECT 'company_record',id,title,finding_reference(${w}::uuid,'company_record',id) FROM company_records WHERE workspace_id=${w}::uuid AND (application_id=${a}::uuid OR application_id IS NULL) AND status<>'archived' ORDER BY id LIMIT 101)
    UNION ALL (SELECT 'application_evidence',id,reference,finding_reference(${w}::uuid,'application_evidence',id) FROM application_evidence WHERE workspace_id=${w}::uuid AND application_id=${a}::uuid ORDER BY id LIMIT 101)
    UNION ALL (SELECT 'run',id,'Run '||id::text,finding_reference(${w}::uuid,'run',id) FROM agent_executions WHERE workspace_id=${w}::uuid AND application_id=${a}::uuid ORDER BY id LIMIT 101)
    UNION ALL (SELECT 'resource',id,name,encode(sha256(convert_to(decision_node(${w}::uuid,'resource',id)::text,'UTF8')),'hex') FROM resources WHERE workspace_id=${w}::uuid ORDER BY id LIMIT 101)
  ) refs ORDER BY type,id`;
  const roster=await authorityState(db,w);
  const workspace=await db.workspace.findUniqueOrThrow({where:{id:w},select:{canonicalLanguage:true}});
  const value={application,workspaceId:w,canonicalLanguage:workspace.canonicalLanguage,records,workforce:roster.workers.map(worker=>({...worker,name:roster.labels.find(label=>label.id===worker.id)?.name})),truncated:roster.truncated||records.some(record=>records.filter(other=>other.type===record.type).length>100)};
  requireRuntimeContent(value,"finding.catalog",{workspaceId:w});return value;
}
export async function findingList(db:FindingDb,w:string,a:string) {
  if(!await db.application.findFirst({where:{id:a,workspaceId:w}}))return {error:"finding_not_found"};
  const rows=await db.$queryRaw<any[]>`SELECT v.observation_id AS id,v.version,v.body->>'title' AS title,v.body->>'classification' AS classification,v.body->>'scope' AS scope,v.fingerprint,(finding_head(v.observation_id)).state AS state,v.created_at,(SELECT count(*)::int FROM finding_occurrences WHERE observation_id=v.observation_id) AS occurrences FROM finding_versions v WHERE v.workspace_id=${w}::uuid AND v.application_id=${a}::uuid AND v.id=(finding_latest(v.observation_id)).id ORDER BY v.created_at DESC,v.id DESC LIMIT 101`;
  const value={items:rows.slice(0,100).map(wire),truncated:rows.length>100};requireRuntimeContent(value,"finding.list",{workspaceId:w});return value;
}

export async function findingAuthority(db: FindingDb, w: string, b: FindingBody, operation: "finding_verify" | "finding_triage") {
  const state = await authorityState(db,w);
  if (!state.ownerActive || !state.ownerUserId || state.truncated || !b.taskId) return {status:"blocked" as const,reason:"finding_authority_context_required"};
  // A factual verification or a proposal does not accept the reported business risk.
  // Acceptance of reserved/critical consequences remains in native owner Decisions.
  const authority = resolveDecisionAuthority({workspaceId:w,ownerUserId:state.ownerUserId,workers:state.workers,mandates:state.mandates,
    declaration:{domain:"ordinary_domain",departmentKey:b.departmentKey,requesterId:b.requesterId,recipientId:b.recipientId,
      entities:[{type:"application",id:(await db.$queryRaw<any[]>`SELECT application_id FROM application_architecture_components WHERE id=${b.componentId}::uuid`)[0]?.application_id},{type:"task",id:b.taskId},...(b.procedureId?[{type:"procedure" as const,id:b.procedureId}]:[])]},
    operation:operation==="finding_verify"?"verify_finding":"triage_finding",risk:operation==="finding_verify"||b.knownRisk==="critical"?"low":b.knownRisk,now:Date.now()});
  if(authority.status!=="delegated")return authority;
  const worker = await db.workforceEntity.findFirst({where:{id:authority.mandate.workforceId,workspaceId:w}});
  const scope = Array.isArray(worker?.authorityScope)?worker.authorityScope:[];
  const skills = Array.isArray(worker?.skillIndex)?worker.skillIndex:[];
  if (!worker || !worker.role?.trim() || !scope.includes(operation==="finding_verify"?"task_verification":"task_accountability") || !b.requiredCompetencies.every(key=>skills.includes(key))) return {status:"blocked" as const,reason:"finding_competence_required"};
  const epoch=(await db.$queryRaw<any[]>`SELECT decision_authority_epoch(${w}::uuid,${json(authority)}::jsonb) AS value`)[0].value;
  return {...authority,epoch};
}

export async function findingState(db: FindingDb,w:string,f:string,actor:ReviewActor) {
  await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
  const version=(await db.$queryRaw<any[]>`SELECT * FROM finding_versions WHERE workspace_id=${w}::uuid AND observation_id=${f}::uuid ORDER BY version DESC LIMIT 1`)[0];
  if(!version)return {error:"finding_not_found"} as const;
  const principal=await resolveReviewPrincipal(db,w,actor);
  const head=(await db.$queryRaw<any[]>`SELECT * FROM finding_journal WHERE observation_id=${f}::uuid ORDER BY sequence DESC LIMIT 1`)[0];
  const context=(await db.$queryRaw<any[]>`SELECT finding_context(${f}::uuid) AS value`)[0].value;
  const body=findingBody.parse(version.body);
  const verifyAuthority=await findingAuthority(db,w,body,"finding_verify"),triageAuthority=await findingAuthority(db,w,body,"finding_triage");
  const verification=(await db.$queryRaw<any[]>`SELECT * FROM finding_journal WHERE version_id=${version.id}::uuid AND action IN ('confirmed','adjudicate_confirmed') ORDER BY sequence DESC LIMIT 1`)[0];
  const verificationCurrent=!!verification&&(await db.$queryRaw<any[]>`SELECT finding_verification_current(${verification?.id??null}::uuid) AS value`)[0].value;
  const output=(await db.$queryRaw<any[]>`SELECT * FROM finding_outputs WHERE observation_id=${f}::uuid`)[0]??null;
  const expectedVersion=reviewDigest({versionId:version.id,headId:head?.id,context,verifyAuthority,triageAuthority,output});
  return {version,body,principal,head,context,verifyAuthority,triageAuthority,verification,verificationCurrent,output,expectedVersion};
}

export async function findingView(db: FindingDb,w:string,f:string,actor:ReviewActor) {
  const s=await findingState(db,w,f,actor);if("error" in s)return s;
  const [history,versions,occurrences,candidates]=await Promise.all([
    db.$queryRaw<any[]>`SELECT * FROM finding_journal WHERE observation_id=${f}::uuid ORDER BY sequence DESC LIMIT 101`,
    db.$queryRaw<any[]>`SELECT * FROM finding_versions WHERE observation_id=${f}::uuid ORDER BY version DESC LIMIT 51`,
    db.$queryRaw<any[]>`SELECT * FROM finding_occurrences WHERE observation_id=${f}::uuid ORDER BY created_at DESC,id DESC LIMIT 101`,
    db.$queryRaw<any[]>`SELECT j.* FROM finding_journal j JOIN finding_versions v ON v.id=j.version_id WHERE j.workspace_id=${w}::uuid AND v.application_id=${s.version.application_id}::uuid AND j.action IN ('propose_merge','resolve_merge') AND (j.observation_id=${f}::uuid OR j.body->>'otherId'=${f}) ORDER BY j.created_at DESC LIMIT 51`
  ]);
  const grants=s.principal?await db.$queryRaw<any[]>`SELECT id,operation,valid_until,task_capability_status(g) AS status FROM task_capability_grants g WHERE workspace_id=${w}::uuid AND snapshot->'finding'->>'observationId'=${f} AND (grantee_user_id=${s.principal.kind==="user"?s.principal.id:null}::uuid OR agent_id=${s.principal.kind==="agent"?s.principal.id:null}::uuid AND credential_id=${s.principal.credentialId}::uuid) ORDER BY created_at DESC LIMIT 51`:[];
  const canManageGrants=s.principal?.kind==="user"&&!!await db.workspaceMembership.findFirst({where:{workspaceId:w,userId:s.principal.id,role:{in:["owner","admin"]}}});
  const credentials=canManageGrants?await db.apiKey.findMany({where:{workspaceId:w,active:true,revokedAt:null,boundAgentId:{not:null},expiresAt:{gt:new Date()}},select:{id:true,name:true,boundAgentId:true},take:101}):[];
  const deferrals=await db.$queryRaw<any[]>`SELECT d.id,d.condition,d.explanation,d.version,(SELECT e.id FROM decision_reopening_events e WHERE e.deferral_id=d.id LIMIT 1) AS event_id FROM decision_deferrals d WHERE d.workspace_id=${w}::uuid AND d.target_type='finding' AND d.target_id=${f}::uuid ORDER BY version DESC LIMIT 51`;
  const value={expectedVersion:s.expectedVersion,canManageGrants,version:wire(s.version),state:s.head?.state??"observed",verification:wire(s.verification),verificationCurrent:s.verificationCurrent,
    credentialOptions:credentials.slice(0,100),deferrals:deferrals.slice(0,50).map(wire),
    verifyAuthority:s.verifyAuthority,triageAuthority:s.triageAuthority,output:wire(s.output),history:history.slice(0,100).map(wire),versions:versions.slice(0,50).map(wire),occurrences:occurrences.slice(0,100).map(wire),mergeCandidates:candidates.slice(0,50).map(wire),grants:grants.slice(0,50).map(wire),
    blockers:[...(!s.body.taskId?["finding_source_task_required"]:[]),...(!s.verificationCurrent&&["verified","triage_pending","converted_to_task","converted_to_decision","deferred"].includes(s.head?.state)?["finding_verification_stale"]:[])],
    truncated:history.length>100||versions.length>50||occurrences.length>100||candidates.length>50||grants.length>50||credentials.length>100||deferrals.length>50};
  boundHistory(value,["history","versions","occurrences","mergeCandidates","grants","credentialOptions","deferrals"]);
  requireRuntimeContent(value,"finding.read",{workspaceId:w});return value;
}

export async function findingJournal(db:FindingDb,w:string,f:string,v:string,p:Principal,action:string,state:string,body:unknown,proof:unknown,requestId:string,requestHash:string,grantId?:string) {
  const id=randomUUID();
  await db.$executeRaw`INSERT INTO finding_journal(id,workspace_id,observation_id,version_id,sequence,action,state,body,proof,actor_kind,actor_id,credential_id,grant_id,request_id,request_hash)
    VALUES(${id}::uuid,${w}::uuid,${f}::uuid,${v}::uuid,(SELECT COALESCE(max(sequence),0)+1 FROM finding_journal WHERE observation_id=${f}::uuid),${action},${state},${json(body)}::jsonb,${json(proof)}::jsonb,${p.kind},${p.id}::uuid,${p.credentialId}::uuid,${grantId??null}::uuid,${requestId}::uuid,${requestHash})`;
  return id;
}
async function recordVersion(db:FindingDb,w:string,a:string,f:string,p:Principal,b:FindingBody,requestId:string,requestHash:string,number:number) {
  const id=randomUUID(),fingerprint=findingFingerprint(a,b);
  await db.$executeRaw`INSERT INTO finding_versions(id,observation_id,workspace_id,application_id,version,body,fingerprint,actor_kind,actor_id,credential_id,request_id,request_hash)
    VALUES(${id}::uuid,${f}::uuid,${w}::uuid,${a}::uuid,${number},${json(b)}::jsonb,${fingerprint},${p.kind},${p.id}::uuid,${p.credentialId}::uuid,${requestId}::uuid,${requestHash})`;
  await db.$executeRaw`INSERT INTO finding_dedup_keys(workspace_id,application_id,fingerprint,observation_id) VALUES(${w}::uuid,${a}::uuid,${fingerprint},${f}::uuid) ON CONFLICT DO NOTHING`;
  await findingJournal(db,w,f,id,p,"revision","observed",{reason:b.correctionReason??"initial_observation"},{},randomUUID(),requestHash);
  return id;
}
export async function recordFinding(db:FindingDb,w:string,a:string,actor:ReviewActor,input:unknown) {
  const command=findingCreate.parse(input);requireRuntimeContent(command,"finding.create",{workspaceId:w});
  await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
  const principal=await resolveReviewPrincipal(db,w,actor);if(!principal)return {error:"finding_forbidden"};
  const hash=reviewDigest({command,applicationId:a,principal});
  const prior=(await db.$queryRaw<any[]>`SELECT observation_id,request_hash FROM finding_versions WHERE workspace_id=${w}::uuid AND request_id=${command.requestId}::uuid UNION ALL SELECT observation_id,request_hash FROM finding_occurrences WHERE workspace_id=${w}::uuid AND request_id=${command.requestId}::uuid`)[0];
  if(prior)return prior.request_hash===hash?{record:{id:prior.observation_id},replayed:true}:{error:"finding_request_conflict"};
  const app=await db.application.findFirst({where:{id:a,workspaceId:w}});if(!app)return {error:"finding_not_found"};
  const duplicate=(await db.$queryRaw<any[]>`SELECT finding_canonical(observation_id) AS observation_id FROM finding_dedup_keys WHERE workspace_id=${w}::uuid AND application_id=${a}::uuid AND fingerprint=${findingFingerprint(a,command.body)}`)[0];
  if(duplicate){
    const version=(await db.$queryRaw<any[]>`SELECT (finding_latest(${duplicate.observation_id}::uuid)).id AS id`)[0].id;
    await db.$executeRaw`INSERT INTO finding_occurrences(id,observation_id,version_id,workspace_id,purpose,body,actor_kind,actor_id,credential_id,request_id,request_hash) VALUES(${randomUUID()}::uuid,${duplicate.observation_id}::uuid,${version}::uuid,${w}::uuid,'observation',${json({source:command.body.sources[0],evidence:command.body.evidence,explanation:command.body.observed})}::jsonb,${principal.kind},${principal.id}::uuid,${principal.credentialId}::uuid,${command.requestId}::uuid,${hash})`;
    return {record:{id:duplicate.observation_id},duplicate:true,replayed:false};
  }
  let observation=command.observationId?await db.capabilityObservation.findFirst({where:{id:command.observationId,applicationId:a}}):null;
  if(command.observationId&&!observation)return {error:"finding_not_found"};
  if(observation&&(await db.$queryRaw<any[]>`SELECT id FROM finding_versions WHERE observation_id=${observation.id}::uuid LIMIT 1`).length)return {error:"finding_already_versioned"};
  if(!observation)observation=await db.capabilityObservation.create({data:{applicationId:a,observedState:"not_started",summary:command.body.title,source:principal.kind==="user"?"human":"agent",observedByType:principal.kind,observedById:principal.id}});
  await recordVersion(db,w,a,observation.id,principal,command.body,command.requestId,hash,1);
  await db.event.create({data:{workspaceId:w,type:"finding_attention",source:"roost",actorType:principal.kind,actorId:principal.id,resourceType:"capability_observation",resourceId:observation.id,payload:{findingId:observation.id,state:"observed",applicationId:a}}});
  return {record:{id:observation.id},replayed:false};
}
export async function reviseFinding(db:FindingDb,w:string,f:string,actor:ReviewActor,input:unknown) {
  const command=findingRevise.parse(input);requireRuntimeContent(command,"finding.revision",{workspaceId:w});
  const s=await findingState(db,w,f,actor);if("error" in s)return s;if(!s.principal)return {error:"finding_forbidden"};
  const hash=reviewDigest({command,f,principal:s.principal});
  const prior=(await db.$queryRaw<any[]>`SELECT * FROM finding_versions WHERE workspace_id=${w}::uuid AND request_id=${command.requestId}::uuid`)[0];
  if(prior)return prior.request_hash===hash?{record:{id:f},replayed:true}:{error:"finding_request_conflict"};
  if(command.expectedVersion!==s.expectedVersion)return {error:"finding_stale"};
  if(!command.body.correctionReason)return {error:"finding_correction_reason_required"};
  await recordVersion(db,w,s.version.application_id,f,s.principal,command.body,command.requestId,hash,s.version.version+1);
  return {record:{id:f},replayed:false};
}
export async function recordOccurrence(db:FindingDb,w:string,f:string,actor:ReviewActor,input:unknown) {
  const command=findingOccurrence.parse(input);requireRuntimeContent(command,"finding.occurrence",{workspaceId:w});
  const s=await findingState(db,w,f,actor);if("error" in s)return s;if(!s.principal)return {error:"finding_forbidden"};
  const hash=reviewDigest({command,f,principal:s.principal}),prior=(await db.$queryRaw<any[]>`SELECT * FROM finding_occurrences WHERE workspace_id=${w}::uuid AND request_id=${command.requestId}::uuid`)[0];
  if(prior)return prior.request_hash===hash?{record:{id:prior.id},replayed:true}:{error:"finding_request_conflict"};
  if(command.expectedVersion!==s.expectedVersion)return {error:"finding_stale"};
  const id=randomUUID(),{requestId,expectedVersion,...body}=command;
  await db.$executeRaw`INSERT INTO finding_occurrences(id,observation_id,version_id,workspace_id,purpose,body,actor_kind,actor_id,credential_id,request_id,request_hash) VALUES(${id}::uuid,${f}::uuid,${s.version.id}::uuid,${w}::uuid,${command.purpose},${json(body)}::jsonb,${s.principal.kind},${s.principal.id}::uuid,${s.principal.credentialId}::uuid,${requestId}::uuid,${hash})`;
  return {record:{id},replayed:false};
}

export async function issueFindingGrant(db:FindingDb,w:string,f:string,actor:ReviewActor,input:unknown) {
  const command=findingGrant.parse(input);requireRuntimeContent(command,"finding.grant",{workspaceId:w});
  const s=await findingState(db,w,f,actor);if("error" in s)return s;
  if(s.principal?.kind!=="user"||!await db.workspaceMembership.findFirst({where:{workspaceId:w,userId:s.principal.id,role:{in:["owner","admin"]}}}))return {error:"capability_admin_required"};
  const hash=reviewDigest({command,f,principal:s.principal}),prior=await db.taskCapabilityGrant.findUnique({where:{workspaceId_requestId:{workspaceId:w,requestId:command.requestId}}});
  if(prior)return prior.requestHash===hash?{record:{id:prior.id},replayed:true}:{error:"finding_request_conflict"};
  if(command.expectedVersion!==s.expectedVersion)return {error:"finding_stale"};
  const authority=command.operation==="finding_verify"?s.verifyAuthority:s.triageAuthority;
  if(authority.status!=="delegated"||!same(authority.principal,command.principal)||!s.body.taskId)return {error:"finding_authority_required"};
  if(command.operation==="finding_verify"&&(await db.$queryRaw<any[]>`SELECT finding_authored(${f}::uuid,${command.principal.kind},${command.principal.id}::uuid) AS value`)[0].value)return {error:"finding_independent_verifier_required"};
  const credential=command.credentialId?await db.apiKey.findFirst({where:{id:command.credentialId,workspaceId:w,boundAgentId:command.principal.id,active:true,revokedAt:null,expiresAt:{gt:new Date()}}}):null;
  if(command.principal.kind==="agent"?!credential:!!command.credentialId)return {error:"finding_credential_invalid"};
  const snapshot={finding:{observationId:f,versionId:s.version.id,version:s.version.version,context:s.context,authority},principal:command.principal};
  const id=randomUUID();
  const scope=(await db.$queryRaw<any[]>`SELECT finding_grant_scope(${w}::uuid,${json(snapshot)}::jsonb,${s.principal.id}::uuid,${command.credentialId}::uuid) AS value`)[0].value;
  await db.taskCapabilityGrant.create({data:{id,workspaceId:w,taskId:s.body.taskId,applicationId:s.version.application_id,agentId:command.principal.kind==="agent"?command.principal.id:null,granteeUserId:command.principal.kind==="user"?command.principal.id:null,credentialId:command.credentialId,credentialVersion:credential?.credentialVersion??0,operation:command.operation,validFrom:new Date(),validUntil:new Date(command.validUntil),issuerUserId:s.principal.id,reason:command.reason,requestId:command.requestId,requestHash:hash,scopeHash:scope,snapshot}});
  return {record:{id},replayed:false};
}

export async function commandFinding(db:FindingDb,w:string,f:string,actor:ReviewActor,input:unknown) {
  const command=findingCommand.parse(input);requireRuntimeContent(command,"finding.command",{workspaceId:w});
  const s=await findingState(db,w,f,actor);if("error" in s)return s;if(!s.principal)return {error:"finding_forbidden"};
  const p=s.principal,hash=reviewDigest({command,f,principal:p});
  const prior=(await db.$queryRaw<any[]>`SELECT * FROM finding_journal WHERE workspace_id=${w}::uuid AND request_id=${command.requestId}::uuid`)[0];
  if(prior){
    if(prior.request_hash!==hash)return {error:"finding_request_conflict"};
    if(prior.grant_id&&(await db.$queryRaw<any[]>`SELECT task_capability_base(g) AS state FROM task_capability_grants g WHERE id=${prior.grant_id}::uuid`)[0]?.state!=="active")return {error:"finding_replay_stale"};
    return {record:{id:prior.id,outputId:prior.body.outputId??null},replayed:true};
  }
  if(command.expectedVersion!==s.expectedVersion)return {error:"finding_stale"};
  const action=command.action==="verify"?command.verification.verdict:command.action==="adjudicate"?`adjudicate_${command.verification.verdict}`:command.action;
  const passive=["queue_deduplication","deduplicate","propose_merge"].includes(action);
  const operation=["verify","challenge","adjudicate"].includes(command.action)?"finding_verify":"finding_triage";
  const authority=operation==="finding_verify"?s.verifyAuthority:s.triageAuthority;
  let grant:any=null;
  if(!passive){
    if(authority.status!=="delegated"||!same(authority.principal,p))return {error:"finding_authority_required"};
    grant=command.grantId?await db.taskCapabilityGrant.findFirst({where:{id:command.grantId,workspaceId:w,operation}}):null;
    if(!grant)return {error:"finding_grant_required"};
    if(operation==="finding_triage"&&!["reopen","prepare_adjudication"].includes(action)&&!s.verificationCurrent)return {error:"finding_verification_stale"};
  }
  const prepare=["prepare_task","prepare_decision","prepare_interview"].includes(action);
  if(prepare&&s.output)return {error:"finding_output_exists"};
  if(prepare&&s.head.state!=="triage_pending")return {error:"finding_transition_invalid"};
  if(prepare&&action!==`prepare_${findingRoute(s.body)}`)return {error:"finding_decision_required"};
  let next=prepare||["propose_merge","resolve_merge","prepare_adjudication"].includes(action)?s.head.state:findingTransition(s.head.state,action);
  if(!next)return {error:"finding_transition_invalid"};
  let outputId:string|undefined,decisionId:string|undefined;
  if(command.action==="convert_task"){
    if(!s.output?.task_id||findingRoute(s.body)!=="task")return {error:"finding_task_required"};
    const readiness=await inspectReady(db,w,s.output.task_id);
    if("error" in readiness)return {error:"finding_ready_required",blocker:readiness.error};
    const origin=(await db.$queryRaw<any[]>`SELECT body FROM finding_journal WHERE id=${s.output.journal_id}::uuid`)[0].body.task;
    const contract=readiness.pin.contract;
    if(contract.objective.outcome!==origin.outcome||contract.singleTask.applicationId!==s.version.application_id||contract.singleTask.component.id!==s.body.componentId||contract.assignment.agentId!==origin.executorId||authority.status!=="delegated"||contract.singleTask.accountableManager.id!==authority.mandate.workforceId)return {error:"finding_task_scope_invalid"};
    if(!origin.acceptanceCriteria.every((value:string)=>contract.acceptance.criteria.includes(value))||!origin.requiredTests.every((value:string)=>contract.acceptance.tests.includes(value))||!contract.scope.allowed.includes(origin.scope)||!contract.scope.forbidden.includes(origin.excluded)||!contract.procedures.items.some((ref:any)=>ref.id===origin.procedureId))return {error:"finding_task_scope_invalid"};
    outputId=s.output.task_id;
  }
  if(command.action==="convert_decision"){
    decisionId=s.output?.decision_id??(s.output?.interview_id?(await db.$queryRaw<any[]>`SELECT decision_id FROM task_interview_entries WHERE case_id=${s.output.interview_id}::uuid AND action='answer' ORDER BY version DESC LIMIT 1`)[0]?.decision_id:null);
    if(!decisionId||!await db.decision.findFirst({where:{id:decisionId,workspaceId:w,status:"accepted"}}))return {error:"finding_decision_acceptance_required"};
    outputId=decisionId;
  }
  if(command.action==="propose_merge"){
    if(command.otherId===f||!(await db.$queryRaw<any[]>`SELECT 1 FROM finding_versions WHERE observation_id=${command.otherId}::uuid AND workspace_id=${w}::uuid AND application_id=${s.version.application_id}::uuid LIMIT 1`).length)return {error:"finding_merge_scope_invalid"};
  }
  if(command.action==="resolve_merge"){
    const candidate=(await db.$queryRaw<any[]>`SELECT * FROM finding_journal WHERE id=${command.candidateId}::uuid AND observation_id=${f}::uuid AND action='propose_merge'`)[0];
    if(!candidate)return {error:"finding_merge_scope_invalid"};
    if(command.verdict==="merge"){
      const other=await findingState(db,w,candidate.body.otherId,actor);
      if("error" in other||!other.verificationCurrent||other.output||s.output||other.version.application_id!==s.version.application_id)return {error:"finding_merge_scope_invalid"};
      // The retained record and both immutable histories are linked explicitly.
      next="merged";outputId=candidate.body.otherId;
    }
  }
  if(command.action==="prepare_adjudication"){
    if(s.head.state!=="inconclusive")return {error:"finding_transition_invalid"};
    if((await db.$queryRaw<any[]>`SELECT 1 FROM finding_journal WHERE version_id=${s.version.id}::uuid AND action='prepare_adjudication'`).length)return {error:"finding_adjudication_exists"};
    if((await db.$queryRaw<any[]>`SELECT 1 FROM finding_versions WHERE observation_id=${f}::uuid AND actor_kind=${command.principal.kind} AND actor_id=${command.principal.id}::uuid UNION ALL SELECT 1 FROM finding_occurrences WHERE observation_id=${f}::uuid AND purpose='fix' AND actor_kind=${command.principal.kind} AND actor_id=${command.principal.id}::uuid UNION ALL SELECT 1 FROM finding_journal WHERE version_id=${s.version.id}::uuid AND action IN ('confirmed','rejected','inconclusive','challenge') AND actor_kind=${command.principal.kind} AND actor_id=${command.principal.id}::uuid LIMIT 1`).length)return {error:"finding_independent_verifier_required"};
  }
  if(prepare||command.action==="prepare_adjudication")outputId=randomUUID();
  const journalBody={...command,...(outputId?{outputId}:{}),...(s.verification?{verificationId:s.verification.id}:{})};
  const journalId=await findingJournal(db,w,f,s.version.id,p,action,next,journalBody,passive?{}:{context:s.context,authority},command.requestId,hash,grant?.id);
  if(command.action==="prepare_task"){
    const draft=command.task;
    if(!await db.applicationProject.findFirst({where:{applicationId:s.version.application_id,projectId:draft.projectId}})||await db.applicationProject.count({where:{projectId:draft.projectId}})!==1||
      !await db.workforceEntity.findFirst({where:{id:draft.executorId,workspaceId:w,status:"active"}})||!await db.procedure.findFirst({where:{id:draft.procedureId,workspaceId:w}}))throw new Error("finding_task_scope_invalid");
    const sourceTask=await db.task.findFirstOrThrow({where:{id:s.body.taskId!,workspaceId:w},select:{goalId:true}});
    await db.task.create({data:{id:outputId,workspaceId:w,projectId:draft.projectId,goalId:sourceTask.goalId,title:draft.title,description:draft.outcome+"\n"+draft.scope,assignedWorkforceEntityId:draft.executorId,source:"roost",executionReadiness:{status:"draft",reason:"finding_context_required",applicationId:s.version.application_id,findingDraft:{...draft,branch:`codex/task-${outputId}`},findingOrigin:{observationId:f,versionId:s.version.id,verificationId:s.verification.id}}}});
    for(const dependencyId of draft.dependencies){
      if(!await db.task.findFirst({where:{id:dependencyId,workspaceId:w}}))throw new Error("finding_task_scope_invalid");
      await db.dependency.create({data:{workspaceId:w,dependencyType:"depends_on",fromEntityType:"task",fromEntityId:outputId!,toEntityType:"task",toEntityId:dependencyId,metadata:{findingId:f}}});
    }
    await db.$executeRaw`INSERT INTO finding_outputs(observation_id,workspace_id,version_id,verification_id,journal_id,task_id) VALUES(${f}::uuid,${w}::uuid,${s.version.id}::uuid,${s.verification.id}::uuid,${journalId}::uuid,${outputId}::uuid)`;
  }
  if(command.action==="prepare_decision"||command.action==="prepare_adjudication"){
    const owner=await db.workspace.findUniqueOrThrow({where:{id:w},select:{ownerUserId:true}});
    const body={title:s.body.title,context:s.body.observed,decision:command.statement,rationale:command.rationale,consequences:command.consequences,scopeReason:s.body.scope,scope:[{type:"task",id:s.body.taskId}],supersedesId:null,conflicts:[],authority:{domain:command.action==="prepare_adjudication"?"mandate_change":s.body.knownRisk==="critical"?"critical_risk":s.body.decisionNeed,departmentKey:s.body.departmentKey,entities:command.action==="prepare_adjudication"?[{type:"application",id:s.version.application_id},{type:"task",id:s.body.taskId},...(s.body.procedureId?[{type:"procedure",id:s.body.procedureId}]:[])]:[{type:"task",id:s.body.taskId}]},...(command.action==="prepare_adjudication"?{findingAdjudication:{versionId:s.version.id,principal:command.principal}}:{})};
    await db.decision.create({data:{id:outputId,workspaceId:w,title:body.title,context:body.context,decision:body.decision,rationale:body.rationale,consequences:body.consequences,status:"proposed",source:"roost_decision",authorType:p.kind,authorId:p.id}});
    await db.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,actor_agent_id,finding_journal_id,request_id,request_hash) VALUES(${outputId}::uuid,${w}::uuid,1,${json(body)}::jsonb,${p.kind==="user"?p.id:null}::uuid,${p.kind==="agent"?p.id:null}::uuid,${journalId}::uuid,${randomUUID()}::uuid,${hash})`;
    const impact=(await db.$queryRaw<any[]>`SELECT decision_impact(${w}::uuid,${json(body.scope)}::jsonb) AS value`)[0].value;
    await db.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,authority,actor_user_id,actor_agent_id,finding_journal_id,request_id,request_hash) VALUES(${randomUUID()}::uuid,${outputId}::uuid,${w}::uuid,1,${json(impact)}::jsonb,${json({status:"owner_reserved",reason:body.authority.domain,principal:{kind:"user",id:owner.ownerUserId},path:[],mandate:null})}::jsonb,${p.kind==="user"?p.id:null}::uuid,${p.kind==="agent"?p.id:null}::uuid,${journalId}::uuid,${randomUUID()}::uuid,${hash})`;
    if(command.action==="prepare_decision")await db.$executeRaw`INSERT INTO finding_outputs(observation_id,workspace_id,version_id,verification_id,journal_id,decision_id) VALUES(${f}::uuid,${w}::uuid,${s.version.id}::uuid,${s.verification.id}::uuid,${journalId}::uuid,${outputId}::uuid)`;
  }
  if(command.action==="prepare_interview"){
    const owner=await db.workspace.findUniqueOrThrow({where:{id:w},select:{ownerUserId:true}});
    const source=(await db.$queryRaw<any[]>`SELECT task_interview_context(${s.body.taskId}::uuid) AS context,task_interview_source(${s.body.taskId}::uuid) AS version`)[0];
    const evidence=s.body.evidence.filter(e=>e.type==="company_record");
    if(!source.context||!evidence.length)throw new Error("finding_interview_evidence_required");
    const checkedSources=await Promise.all(evidence.map(async e=>({id:e.id,revision:(await db.$queryRaw<any[]>`SELECT task_interview_record(${e.id}::uuid)->>'revision' AS value`)[0].value,findings:s.body.observed})));
    const body={topic:s.body.title,unknownKey:`finding_${f.replace(/-/g,"")}`,missing:s.body.expected,impact:s.body.impact,material:true,decisionClass:"task_scope",principalId:owner.ownerUserId,context:s.body.observed,recommendation:command.recommendation,consequences:s.body.impact,scope:s.body.scope,deferralEffect:command.reason,dependencies:[{taskId:s.body.taskId,blockedPart:s.body.scope}],gathering:{status:"completed",checkedSources,remainingHumanDecision:s.body.expected},questions:command.questions};
    await db.$executeRaw`INSERT INTO task_interview_cases(id,workspace_id,task_id,application_id,version,principal_id,unknown_key,decision_class,body,authority,source_version,source_snapshot,actor_user_id,actor_agent_id,actor_credential_id,capability_grant_id,finding_journal_id,request_id,request_hash) VALUES(${outputId}::uuid,${w}::uuid,${s.body.taskId}::uuid,${s.version.application_id}::uuid,1,${owner.ownerUserId}::uuid,${body.unknownKey},'task_scope',${json(body)}::jsonb,${json({status:"owner_reserved",reason:"unclassified_owner",principal:{kind:"user",id:owner.ownerUserId},path:[],mandate:null})}::jsonb,${source.version},${json(source.context)}::jsonb,${p.kind==="user"?p.id:null}::uuid,${p.kind==="agent"?p.id:null}::uuid,${p.credentialId}::uuid,${p.kind==="agent"?grant.id:null}::uuid,${journalId}::uuid,${randomUUID()}::uuid,${hash})`;
    await db.$executeRaw`INSERT INTO finding_outputs(observation_id,workspace_id,version_id,verification_id,journal_id,interview_id) VALUES(${f}::uuid,${w}::uuid,${s.version.id}::uuid,${s.verification.id}::uuid,${journalId}::uuid,${outputId}::uuid)`;
  }
  if(command.action==="defer"){
    const refType=command.condition.type==="resource_available"?"resource":command.condition.type==="configuration_changed"?"company_record":null;
    const baseline=refType?(await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(decision_node(${w}::uuid,${refType},${"referenceId" in command.condition?command.condition.referenceId:null}::uuid)::text,'UTF8')),'hex') AS value`)[0].value:null;
    await db.$executeRaw`INSERT INTO decision_deferrals(id,workspace_id,target_type,target_id,version,reason,explanation,condition,baseline,scope,actor_user_id,actor_agent_id,finding_journal_id,request_id,request_hash) VALUES(${randomUUID()}::uuid,${w}::uuid,'finding',${f}::uuid,(SELECT COALESCE(max(version),0)+1 FROM decision_deferrals WHERE target_type='finding' AND target_id=${f}::uuid),${command.category},${command.reason},${json(command.condition)}::jsonb,${baseline},${json([{type:"task",id:s.body.taskId}])}::jsonb,${p.kind==="user"?p.id:null}::uuid,${p.kind==="agent"?p.id:null}::uuid,${journalId}::uuid,${randomUUID()}::uuid,${hash})`;
  }
  if(command.action==="reopen"){
    const existing=(await db.$queryRaw<any[]>`SELECT e.id FROM decision_reopening_events e JOIN decision_deferrals d ON d.id=e.deferral_id WHERE e.workspace_id=${w}::uuid AND e.deferral_id=${command.deferralId}::uuid AND d.target_type='finding' AND d.target_id=${f}::uuid AND e.event_type=${command.eventType}`)[0];
    if(!existing){
      const eventId=randomUUID();
      await db.$executeRaw`INSERT INTO decision_reopening_events(id,workspace_id,deferral_id,event_type,reference_revision,explanation,actor_user_id,actor_agent_id,finding_journal_id,request_id,request_hash) VALUES(${eventId}::uuid,${w}::uuid,${command.deferralId}::uuid,${command.eventType},${command.referenceRevision??null},${command.reason},${p.kind==="user"?p.id:null}::uuid,${p.kind==="agent"?p.id:null}::uuid,${journalId}::uuid,${randomUUID()}::uuid,${hash})`;
      await db.event.create({data:{workspaceId:w,type:"decision_governance_attention",source:"roost",actorType:p.kind,actorId:p.id,resourceType:"capability_observation",resourceId:f,payload:{action:"reopened",deferralId:command.deferralId,eventId,targetType:"finding"}}});
    }
  }
  if(grant)await db.taskCapabilityUse.create({data:{id:randomUUID(),workspaceId:w,grantId:grant.id,requestId:command.requestId,findingJournalId:journalId,postScopeHash:grant.scopeHash,snapshot:{findingId:f,versionId:s.version.id,operation}}});
  await db.event.create({data:{workspaceId:w,type:"finding_recorded",source:"roost",actorType:p.kind,actorId:p.id,resourceType:"capability_observation",resourceId:f,payload:{findingId:f,action,state:next,recordId:journalId,outputId:outputId??null}}});
  return {record:{id:journalId,outputId:outputId??null},replayed:false};
}
