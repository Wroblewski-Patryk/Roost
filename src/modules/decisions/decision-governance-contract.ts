import { z } from "zod";
import { decisionAuthorityDeclaration } from "./decision-authority-contract";
import { workerCredentialIntent } from "../api-keys/worker-credential-contract";
import { workerTransportIntent } from "../api-keys/worker-transport-contract";
import { workerBootstrapIntent } from "../api-keys/worker-bootstrap-contract";
import { lifecycleIntent } from "../api-keys/worker-identity-lifecycle";
import { channelGrantIntent } from "../api-keys/bootstrap-channel-persistence-contract";
import { bootstrapChannelSnapshot } from "../api-keys/bootstrap-channel-contract";
import { issuerIntent } from "../api-keys/bootstrap-issuer-contract";
import { proofKeyIntent } from "../api-keys/bootstrap-proof-key-contract";
import { proofAuthorityAttachment } from "../api-keys/bootstrap-proof-authority-contract";
import { v3Intent } from "../api-keys/bootstrap-proof-issuance-contract";

const uuid=z.string().uuid(), text=z.string().trim().min(3).max(2000), hash=z.string().regex(/^[a-f0-9]{64}$/);
export const managedRuntimeApproval=z.object({schemaVersion:z.literal('roost-managed-runtime-approval-v1'),
  taskId:uuid,applicationId:uuid,installationId:uuid,selectionDigest:hash,
  backend:z.literal('codex_responses'),riskClass:z.literal('low'),
  mode:z.literal('trusted_provider_pilot'),residualRiskAccepted:z.literal(true),
  acknowledgement:z.literal('windows_account_authority_not_os_isolation')}).strict();
// A coding task needs a separate owner decision after two completed, independent
// read-only canaries. The decision is scoped to one installation, task and branch;
// it grants no push or deployment capability.
export const firstWriteApproval=z.object({schemaVersion:z.literal('roost-first-write-approval-v1'),
  taskId:uuid,applicationId:uuid,installationId:uuid,
  branch:z.string().regex(/^codex\/task-[a-f0-9-]{36}$/),
  baselineCommit:z.string().regex(/^[a-f0-9]{40}$/),
  auditorExecutionId:uuid,verifierExecutionId:uuid,
  auditorEvidenceDigest:hash,verifierEvidenceDigest:hash,
  capabilities:z.tuple([z.literal('repository_read'),z.literal('repository_write'),z.literal('local_test')]),
  operations:z.object({localCommit:z.literal(true)}).strict(),
  remotePush:z.literal(false),deployment:z.literal(false),financialWrites:z.literal(false)
}).strict().refine(v=>v.auditorExecutionId!==v.verifierExecutionId,
  {message:'Independent read-only canaries are required'});
export const decisionNodeTypes=["task","application","project","procedure","company_record","resource","decision"] as const;
export const decisionNode=z.object({type:z.enum(decisionNodeTypes),id:uuid}).strict();
export const decisionProposal=z.object({requestId:uuid,decisionId:uuid.optional(),expectedVersion:hash,title:text,context:text,decision:text,rationale:text,consequences:text,
  findingAdjudication:z.object({versionId:uuid,principal:z.object({kind:z.enum(["user","agent"]),id:uuid}).strict()}).strict().optional(),
  authority:decisionAuthorityDeclaration.optional(),
  workerCredential:workerCredentialIntent.optional(),
  workerTransport:workerTransportIntent.optional(),
  workerBootstrap:workerBootstrapIntent.optional(),
  workerIdentityLifecycle:lifecycleIntent.optional(),
  workerBootstrapIssuer:issuerIntent.optional(),
  workerBootstrapProofKey:proofKeyIntent.optional(),
  workerBootstrapProofAuthority:proofAuthorityAttachment.optional(),
  workerBootstrapAdmissionV3:v3Intent.optional(),
  workerBootstrapChannel:z.union([channelGrantIntent,z.object({schemaVersion:z.literal('worker-bootstrap-channel-v1'),ticketId:uuid,
    snapshot:bootstrapChannelSnapshot}).strict()]).optional(),
  managedRuntimeApproval:managedRuntimeApproval.optional(),
  firstWriteApproval:firstWriteApproval.optional(),
  scopeReason:text,scope:z.array(decisionNode).min(1).max(8),supersedesId:uuid.nullable(),
  conflicts:z.array(z.object({kind:z.enum(["contradicts","narrows","replaces"]),oldProvision:text,newProvision:text,explanation:text}).strict()).max(12)
}).strict().superRefine((v,c)=>{
  if(v.managedRuntimeApproval&&(!v.scope.some(n=>n.type==='task'&&n.id===v.managedRuntimeApproval!.taskId)
    ||v.authority||v.workerBootstrap||v.workerCredential||v.workerTransport||v.workerIdentityLifecycle
    ||v.workerBootstrapIssuer||v.workerBootstrapProofKey||v.workerBootstrapProofAuthority||v.workerBootstrapAdmissionV3||v.workerBootstrapChannel))
    c.addIssue({code:'custom',message:'Managed runtime approval requires its exact task and a separate primary-owner decision'});
  if(v.firstWriteApproval&&(!v.scope.some(n=>n.type==='task'&&n.id===v.firstWriteApproval!.taskId)
    ||v.authority||v.managedRuntimeApproval||v.workerBootstrap||v.workerCredential||v.workerTransport||v.workerIdentityLifecycle
    ||v.workerBootstrapIssuer||v.workerBootstrapProofKey||v.workerBootstrapProofAuthority||v.workerBootstrapAdmissionV3||v.workerBootstrapChannel))
    c.addIssue({code:'custom',message:'First pilot write requires its own exact primary-owner decision'});
  const v3=!!v.workerBootstrapAdmissionV3||!!v.workerBootstrapProofAuthority;
  if(v3){
   if(!v.decisionId||!v.workerBootstrapAdmissionV3||!v.workerBootstrapProofAuthority||!v.workerBootstrapChannel||!('snapshot' in v.workerBootstrapChannel)
     ||v.workerBootstrapProofAuthority.decisionId!==v.decisionId
     ||v.workerBootstrapAdmissionV3.proofAuthority.ticketId!==v.workerBootstrapChannel.ticketId
     ||JSON.stringify(v.workerBootstrapAdmissionV3.proofAuthority)!==JSON.stringify(v.workerBootstrapProofAuthority)
     ||v.authority||v.workerBootstrap||v.workerCredential||v.workerTransport||v.workerIdentityLifecycle||v.workerBootstrapIssuer||v.workerBootstrapProofKey)
    c.addIssue({code:'custom',message:'V3 first enrollment requires one exact owner-approved authority, intent and channel snapshot'});
  }else if(v.workerBootstrapChannel&&(v.authority||v.workerBootstrap||v.workerCredential||v.workerTransport||v.workerIdentityLifecycle||v.workerBootstrapIssuer||v.workerBootstrapProofKey))c.addIssue({code:"custom",message:"Bootstrap channel requires its own primary-owner decision"});
  if((v.workerBootstrapIssuer||v.workerBootstrapProofKey)&&(v.authority||v.workerBootstrap||v.workerCredential||v.workerTransport||v.workerIdentityLifecycle||v.workerBootstrapIssuer&&v.workerBootstrapProofKey))
   c.addIssue({code:'custom',message:'Bootstrap key lifecycle requires a separate primary-owner decision'});
  if(v.workerIdentityLifecycle&&(v.authority||v.workerBootstrap||v.workerCredential||v.workerTransport))c.addIssue({code:"custom",message:"Identity lifecycle requires its own primary-owner decision"});
  if(v.workerBootstrap&&(v.authority||v.workerCredential||v.workerTransport))c.addIssue({code:"custom",message:"Bootstrap requires its own primary-owner decision"});
  if(v.workerCredential&&v.authority)c.addIssue({code:"custom",message:"Worker credential decisions are reserved to the primary owner"});
  if(v.workerTransport&&(v.authority||v.workerCredential))c.addIssue({code:"custom",message:"Transport admission requires its own primary-owner decision"});
  if(Boolean(v.supersedesId)!==Boolean(v.conflicts.length))c.addIssue({code:"custom",message:"A replacement requires exact conflicts"});
  if(new Set(v.scope.map(n=>n.type+":"+n.id)).size!==v.scope.length)c.addIssue({code:"custom",message:"Duplicate scope"});
  if(v.conflicts.some(x=>!v.decision.includes(x.newProvision)))c.addIssue({code:"custom",message:"New provision must be quoted exactly"});
});
export const decisionAction=z.object({requestId:uuid,expectedVersion:hash,action:z.enum(["review_impact","accept"]),previewId:uuid.optional(),grantIds:z.array(z.object({taskId:uuid,grantId:uuid}).strict()).min(1).max(200).optional()}).strict();
export const reopenCondition=z.discriminatedUnion("type",[
  z.object({type:z.literal("resource_available"),referenceId:uuid}).strict(),
  z.object({type:z.literal("configuration_changed"),referenceId:uuid}).strict(),
  z.object({type:z.literal("owner_signal")}).strict(),
  z.object({type:z.literal("deadline"),dueAt:z.string().datetime()}).strict()
]);
export const decisionDeferral=z.object({requestId:uuid,expectedVersion:hash,targetType:z.enum(["decision","interview"]),targetId:uuid,
  reason:z.enum(["budget","infrastructure"]),explanation:text,condition:reopenCondition}).strict();
export const reopeningEvent=z.object({requestId:uuid,expectedVersion:hash,deferralId:uuid,
  type:z.enum(["resource_available","configuration_changed","owner_signal","deadline"]),referenceRevision:hash.optional(),explanation:text}).strict();
