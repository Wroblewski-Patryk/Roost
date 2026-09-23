import { z } from "zod";
import { reviewDigest } from "../agent-runtime/task-review-contract";

const id=z.string().uuid(), digest=z.string().regex(/^[a-f0-9]{64}$/), epoch=z.number().int().positive().max(2147483647);
export const lifecycleIntent=z.object({schemaVersion:z.literal("worker-identity-lifecycle-v1"),
  workspaceId:id,kind:z.enum(["host","installation"]),subjectId:id,action:z.enum(["create","adopt","update","revoke","replace"]),
  expected:z.object({id,epoch,generation:id}).strict().nullable(),generation:id,
  installationId:id,installationGeneration:id,hostFingerprint:digest.nullable(),authorityDigest:digest,
  adoptionEvidenceDigest:digest.nullable(),expiresAt:z.string().datetime()
}).strict().superRefine((v,c)=>{
  if((v.action==="create"||v.action==="adopt")!==(v.expected===null)||
    (v.action==="adopt")!==(v.adoptionEvidenceDigest!==null)||
    (v.kind==="host")!==(v.hostFingerprint!==null)||
    v.kind==="installation"&&(v.subjectId!==v.installationId||v.generation!==v.installationGeneration))
    c.addIssue({code:"custom",message:"Exact lifecycle identity and prospective adoption required"});
});
export type LifecycleIntent=z.infer<typeof lifecycleIntent>;
export const lifecycleRecord=z.object({id,intent:lifecycleIntent,epoch,state:z.enum(["active","revoked"]),
  ownerId:id,decisionId:id,decisionRevision:epoch,previousId:id.nullable()}).strict();
export type LifecycleRecord=z.infer<typeof lifecycleRecord>;
export class LifecycleBlocked extends Error{constructor(){super("worker_identity_lifecycle_blocked");}}
export const denyLifecycle=():never=>{throw new LifecycleBlocked();};
const same=(a:unknown,b:unknown)=>reviewDigest(a)===reviewDigest(b);
export type LifecycleAuthority={ownerId:string;decisionId:string;decisionRevision:number;intent:unknown;current:boolean;anchorFresh:boolean;
  hostEnabled:boolean;writerFenced:boolean;installation:LifecycleRecord|null};

// A pure transition contract. Authority must come from the same canonical
// transaction, never from request booleans. No default runtime composition.
export function advanceLifecycle(input:unknown,history:LifecycleRecord[],authority:LifecycleAuthority,operationId:string,now:Date):LifecycleRecord{
  const i=lifecycleIntent.parse(input),a=authority;
  if(!a.current||!a.writerFenced||!same(a.intent,i)||Date.parse(i.expiresAt)<=now.getTime())denyLifecycle();
  const rows=history.map(v=>lifecycleRecord.parse(v)).sort((x,y)=>x.epoch-y.epoch),old=rows.at(-1);
  for(let n=0;n<rows.length;n++)if(rows[n].epoch!==n+1||rows[n].previousId!==(rows[n-1]?.id??null)||
    rows[n].intent.workspaceId!==i.workspaceId||rows[n].intent.kind!==i.kind||rows[n].intent.subjectId!==i.subjectId)denyLifecycle();
  if(rows.some(r=>r.id===operationId||r.decisionId===a.decisionId))denyLifecycle();
  if(!old){if(i.expected||!['create','adopt'].includes(i.action)||i.action==='create'&&!a.anchorFresh)denyLifecycle();}
  else{
    if(!same(i.expected,{id:old.id,epoch:old.epoch,generation:old.intent.generation})||old.epoch===2147483647)denyLifecycle();
    if(i.action==='replace'){
      if(old.state!=='revoked'||i.generation===old.intent.generation||rows.some(r=>r.intent.generation===i.generation)||
        i.kind==='host'&&rows.some(r=>r.intent.hostFingerprint===i.hostFingerprint))denyLifecycle();
    }else{
      if(!['update','revoke'].includes(i.action)||old.state!=='active'||i.generation!==old.intent.generation||
        i.installationId!==old.intent.installationId||i.installationGeneration!==old.intent.installationGeneration||i.hostFingerprint!==old.intent.hostFingerprint||
        (i.action==='update')===(i.authorityDigest===old.intent.authorityDigest))denyLifecycle();
    }
  }
  if(i.kind==='host'&&i.action!=='revoke'){
    const install=a.installation;
    if(!a.hostEnabled||!install||install.state!=='active'||install.intent.kind!=='installation'||
      install.intent.workspaceId!==i.workspaceId||install.intent.subjectId!==i.installationId||install.intent.generation!==i.installationGeneration)denyLifecycle();
  }
  return lifecycleRecord.parse({id:operationId,intent:i,epoch:(old?.epoch??0)+1,state:i.action==='revoke'?'revoked':'active',
    ownerId:a.ownerId,decisionId:a.decisionId,decisionRevision:a.decisionRevision,previousId:old?.id??null});
}

export const lifecycleMissing=["host_epoch_unavailable","host_revocation_history_unavailable","installation_epoch_unavailable","installation_revocation_unavailable"] as const;
export function projectLifecycle(binding:{workspaceId:string;hostId:string;installationId:string;hostFingerprint:string;hostEpoch:number;installationEpoch:number},
  rows:unknown[],writerFenced:boolean){
  const missing:string[]=[...lifecycleMissing];
  if(!writerFenced)return {blockers:[...missing,"lifecycle_writer_unfenced"],facts:null};
  const parsed=z.array(lifecycleRecord).max(2).safeParse(rows);
  if(!parsed.success)return {blockers:missing,facts:null};
  const hosts=parsed.data.filter(r=>r.intent.kind==='host'),installs=parsed.data.filter(r=>r.intent.kind==='installation');
  const h=hosts.length===1?hosts[0]:undefined,i=installs.length===1?installs[0]:undefined,b=binding;
  if(!h||!i)return {blockers:missing,facts:null};
  if(h.intent.workspaceId!==b.workspaceId||i.intent.workspaceId!==b.workspaceId||h.intent.subjectId!==b.hostId||i.intent.subjectId!==b.installationId||
    h.intent.installationId!==b.installationId||h.intent.installationGeneration!==i.intent.generation||h.intent.hostFingerprint!==b.hostFingerprint||
    h.epoch!==b.hostEpoch||i.epoch!==b.installationEpoch)return {blockers:[...missing,"lifecycle_binding_mismatch"],facts:null};
  return {blockers:[...(h.state==='revoked'?["host_revoked"]:[]),...(i.state==='revoked'?["installation_revoked"]:[])],
    facts:{hostEpoch:h.epoch,hostGeneration:h.intent.generation,hostRevoked:h.state==='revoked',installationEpoch:i.epoch,installationGeneration:i.intent.generation,installationRevoked:i.state==='revoked'}};
}
