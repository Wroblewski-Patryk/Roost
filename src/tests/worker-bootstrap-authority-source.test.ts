import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import childProcess from "node:child_process";
import { bootstrapFixture } from "./worker-bootstrap-fixture";
import { createCanonicalBootstrapAuthoritySource,bootstrapAuthorityGaps,CanonicalBootstrapBlocked } from "../modules/api-keys/worker-bootstrap-authority-source";
import { createPrismaWorkerBootstrapStore } from "../modules/api-keys/worker-bootstrap-store";
import { createWorkerBootstrapService } from "../modules/api-keys/worker-bootstrap.service";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";

const copy=<T>(v:T):T=>structuredClone(v),pin=(s:string)=>s.repeat(64),secret="DO-NOT-RETURN-synthetic-secret";
function fixture(){
  const f=bootstrapFixture(),b=f.context.binding,credential=copy(f.ticket().intent.target);
  Object.assign(f.context,{credential,credentialActive:false,credentialAcknowledged:true,enrollmentGeneration:1,credentialHighWater:1,
    prior:{attemptId:randomUUID(),state:"revoked_credential",credential}});f.issue("owner_recovery");
  const d=f.decision(),ticket=f.ticket(),profile=copy(f.context.channel.profile);
  const data={owner:[{id:b.workspaceId,ownerId:f.context.ownerId}],members:[{userId:f.context.ownerId}],host:[{id:b.hostId,workspaceId:b.workspaceId,status:"online"}],
    issuer:[{workspaceId:b.workspaceId,installationId:b.installationId,keyId:b.ticketKeyId,epoch:b.ticketKeyEpoch,publicKeyDigest:b.ticketPublicKeyDigest}],
    credentials:[{id:credential.id,workspaceId:b.workspaceId,hostId:b.hostId,installationId:b.installationId,version:credential.version,epoch:credential.epoch,fingerprint:credential.fingerprint,
      active:false,revokedAt:f.iso(-1000),expiresAt:f.iso(60000),scopeValid:true,unbound:true,modern:true,activeCount:0,total:1}],
    handoff:[{id:randomUUID(),workspaceId:b.workspaceId,hostId:b.hostId,installationId:b.installationId,hostFingerprint:b.hostFingerprint,credentialId:credential.id,state:"revoked",acknowledgedAt:f.iso(-2000)}],
    decision:[{id:d.id,workspaceId:b.workspaceId,revision:d.revision,state:"accepted",actorUserId:f.context.ownerId,actorAgentId:null,actorCredentialId:null,authority:"owner_reserved",acceptedAt:f.iso(-1000),conflicting:false,superseded:false,intent:copy(ticket.intent)}],
    channel:[{revision:1,recordDigest:pin("d"),certificateEpoch:1,highWaterEpoch:1,state:"current",expiresAt:f.iso(60000),installationId:b.installationId,hostId:b.hostId,hostFingerprint:b.hostFingerprint,
      keyId:b.ticketKeyId,keyEpoch:b.ticketKeyEpoch,keyDigest:b.ticketPublicKeyDigest,credentialId:credential.id,credentialEpoch:credential.epoch,credentialVersion:credential.version,credentialFingerprint:credential.fingerprint,profile,cutoverAt:null}],
    ticket:[{id:ticket.id,workspaceId:b.workspaceId,hostId:b.hostId,ownerId:f.context.ownerId,decisionId:d.id,requestId:ticket.intent.requestId,bindingDigest:reviewDigest(b),ticketDigest:reviewDigest(f.tickets.get(ticket.id)!.signed),expiresAt:ticket.intent.expiresAt}]};
  let fence=10,lastDb:any,modeOverride:string|undefined,readonlyOverride:string|undefined,writes=0;
  const hooks:{query?:(kind:string)=>void;driftFence?:boolean}={},calls:string[]=[],options:any[]=[],phases:string[]=[];
  const client:any={$transaction:async(work:any,option:any)=>{
    options.push(option);const snapshot=copy(data),old=fence;let localFence=fence,readonly="off";const isolation=modeOverride??(option.isolationLevel==="Serializable"?"serializable":"repeatable read");
    const db:any={$executeRaw:async(strings:TemplateStringsArray)=>{const sql=strings.join("");calls.push(sql);
      if(sql==="SET TRANSACTION READ ONLY"){readonly="on";phases.push("read_only");return 0;}
      assert.equal(sql,"UPDATE ready_source_fence SET revision=revision+1 WHERE id=1");assert.equal(readonly,"off");localFence++;phases.push("fence_write");return 1;},
      $queryRaw:async(strings:TemplateStringsArray,...values:any[])=>{
        const sql=strings.join("?").replace(/\s+/g," ").trim();calls.push(sql);
        if(sql.includes('worker_identity_lifecycle_guarded()'))return [{guarded:true}];
        if(sql.includes('FROM worker_identity_lifecycle l'))return [];
        if(sql.includes("FROM ready_source_fence")){phases.push("fence_read");return [{revision:String(localFence),isolation,readonly:readonlyOverride??readonly}];}
        let kind:keyof typeof data|undefined;
        if(sql.includes("FROM workspaces "))kind="owner";
        else if(sql.includes("FROM workspace_memberships "))kind="members";
        else if(sql.includes("FROM agent_hosts "))kind="host";
        else if(sql.includes("FROM trusted_provider_ticket_keys "))kind="issuer";
        else if(sql.includes("FROM api_keys "))kind="credentials";
        else if(sql.includes("FROM worker_credential_handoffs "))kind="handoff";
        else if(sql.includes("FROM decisions "))kind="decision";
        else if(sql.includes("FROM worker_transport_heads "))kind="channel";
        else if(sql.includes("FROM worker_bootstrap_tickets ")){
          if(sql.startsWith("SELECT *")){
            const signed=f.tickets.get(f.ticket().id)!.signed,record={signed,decision:f.decisions.get(f.decision().id)},i=f.ticket().intent;
            return [{id:f.ticket().id,ticket_digest:reviewDigest(signed),record_digest:reviewDigest(record),workspace_id:b.workspaceId,host_id:b.hostId,owner_id:f.context.ownerId,
              decision_id:f.decision().id,request_id:i.requestId,generation:i.baseline.enrollmentGeneration+1,credential_epoch:i.target.epoch,target_id:i.target.id,binding_digest:reviewDigest(b),predecessor_id:i.prior!.attemptId,record}];
          }kind="ticket";
        }else if(sql.includes("FROM worker_bootstrap_attempts "))return [];
        else assert.fail("unexpected canonical query");
        assert.ok(values.length>0);hooks.query?.(kind!);if(hooks.driftFence&&kind==="host")localFence++;
        return copy(snapshot[kind!]);
      }};lastDb=db;
    try{const result=await work(db);fence=localFence;return result;}catch(e){fence=old;throw e;}
  }};
  const source=createCanonicalBootstrapAuthoritySource(()=>new Date(f.iso())),store=createPrismaWorkerBootstrapStore(client,source,()=>new Date(f.iso()));
  const input=()=>({binding:copy(b),decisionId:d.id,purpose:"owner_recovery",ticketId:ticket.id});
  const inspect=async(patch:any={})=>await store.inspectAuthority({...input(),...patch}) as Awaited<ReturnType<typeof source.inspect>>;
  return {...f,data,source,store,client,input,inspect,hooks,calls,exchangeCalls:f.calls,options,phases,lastDb:()=>lastDb,fence:()=>fence,writes:()=>writes,
    mode:(value:string)=>modeOverride=value,readonly:(value:string)=>readonlyOverride=value};
}

test("canonical bootstrap authority projects existing records and denies unavailable authority",async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error("external effect forbidden");};
  for(const m of ["connect","createConnection"] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const m of ["request","get"] as const)t.mock.method(module,m,forbid);
  for(const m of ["lookup","resolve","resolve4","resolve6"] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,"fetch",forbid);for(const m of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,m,forbid);
  const logs:unknown[]=[];for(const m of ["log","warn","error"] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));

  await t.test("complete available canonical snapshot still lists every structural blocker and grants nothing",async()=>{
    const f=fixture(),r=await f.inspect();assert.equal(f.source.qualification,"canonical_bootstrap_projection_v1");assert.equal(r.ok,false);assert.deepEqual(r.blockers,[...bootstrapAuthorityGaps].sort());
    assert.equal(r.facts.ownerId,f.context.ownerId);assert.equal(r.facts.credential!.state,"revoked");assert.equal(r.facts.credential!.epoch,1);assert.equal(r.facts.issuer!.epoch,1);
    assert.equal(r.facts.decision!.intentDigest,reviewDigest(f.ticket().intent));assert.equal(r.facts.channel!.revision,1);assert.equal(r.facts.ticket!.id,f.ticket().id);
    for(const flag of ["implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted","transportQualified","launchAuthority"] as const)assert.equal(r[flag],false);
    assert.equal(f.options[0].isolationLevel,"RepeatableRead");assert.equal(f.phases[0],"read_only");
  });
  await t.test("each missing source component has an explicit bounded diagnostic",async()=>{
    const cases={owner:"workspace_owner_missing",members:"primary_owner_membership_missing",host:"host_missing",issuer:"issuer_missing_or_ambiguous",credentials:"credential_required",
      handoff:"handoff_missing_or_ambiguous",decision:"decision_missing_or_invalid",channel:"normal_channel_missing_or_invalid",ticket:"bootstrap_ticket_missing"};
    for(const [key,code] of Object.entries(cases)){const f=fixture();(f.data as any)[key]=[];const r=await f.inspect();assert.ok(r.blockers.includes(code),key);for(const gap of bootstrapAuthorityGaps)assert.ok(r.blockers.includes(gap));}
  });
  await t.test("multiple owners, wrong primary membership and unaccepted/delegated/superseded decisions deny",async()=>{
    const a=fixture();a.data.members.push({userId:randomUUID()});assert.ok((await a.inspect()).blockers.includes("owner_ambiguous"));
    const b=fixture();b.data.members[0].userId=randomUUID();assert.ok((await b.inspect()).blockers.includes("primary_owner_membership_missing"));
    for(const patch of [{state:"revoked"},{authority:"delegated"},{actorUserId:randomUUID()},{actorAgentId:randomUUID()},{actorCredentialId:randomUUID()},{conflicting:true},{superseded:true},{acceptedAt:"2099-01-01T00:00:00.000Z"}]){
      const f=fixture();Object.assign(f.data.decision[0],patch);assert.ok((await f.inspect()).blockers.includes("decision_not_current_owner_authority"));}
  });
  await t.test("revoked/expired hosts, tickets, credentials and channel cannot be revived",async()=>{
    const f=fixture();f.data.host[0].status="disabled";assert.ok((await f.inspect()).blockers.includes("host_disabled"));
    for(const patch of [{state:"revoked"},{expiresAt:"2000-01-01T00:00:00.000Z"},{cutoverAt:"2000-01-01T00:00:00.000Z"}]){const g=fixture();Object.assign(g.data.channel[0],patch);assert.ok((await g.inspect()).blockers.includes("normal_channel_revoked_or_expired"));}
    const g=fixture();g.data.ticket[0].expiresAt=g.iso(-1);assert.ok((await g.inspect()).blockers.includes("bootstrap_ticket_expired"));
    const r=await f.inspect({purpose:"ordinary"});assert.ok(r.blockers.includes("ordinary_active_credential_required"));assert.equal(r.facts.credential!.state,"revoked");
  });
  await t.test("credential absence is reported for first enrollment, never invented for recovery or normal use",async()=>{
    const f=fixture();f.data.credentials=[];f.data.handoff=[];f.data.channel=[];
    const first=await f.inspect({purpose:"first_enrollment"});assert.equal(first.facts.credentialAbsent,true);assert.equal(first.facts.credentialHighWater,0);assert.ok(!first.blockers.includes("credential_required"));
    for(const purpose of ["owner_recovery","ordinary"])assert.ok((await f.inspect({purpose})).blockers.includes("credential_required"));
    const present=fixture();assert.ok((await present.inspect({purpose:"first_enrollment"})).blockers.includes("credential_history_conflicts_with_first"));
    const ambiguous=fixture();ambiguous.data.credentials[0].activeCount=2;assert.ok((await ambiguous.inspect()).blockers.includes("credential_ambiguous"));
    const duplicate=fixture();duplicate.data.credentials.push(copy(duplicate.data.credentials[0]));duplicate.data.credentials.forEach(c=>c.total=2);assert.ok((await duplicate.inspect()).blockers.includes("credential_ambiguous"));
  });
  await t.test("issuer, host/install binding, credential generation and channel identity must match exactly",async()=>{
    for(const patch of [{installationId:randomUUID()},{keyId:"other"},{epoch:2},{publicKeyDigest:pin("0")}]){const f=fixture();Object.assign(f.data.issuer[0],patch);assert.ok((await f.inspect()).blockers.includes("issuer_binding_mismatch"));}
    for(const patch of [{credentialEpoch:2},{credentialVersion:2},{credentialFingerprint:pin("0")},{keyEpoch:2},{highWaterEpoch:2},{revision:2},{hostFingerprint:pin("0")}]){
      const f=fixture();Object.assign(f.data.channel[0],patch);assert.ok((await f.inspect()).blockers.includes("normal_channel_binding_mismatch"));}
    const f=fixture();f.data.channel[0].profile.trust.caDigest=pin("0");assert.ok((await f.inspect()).blockers.includes("normal_channel_binding_mismatch"));
    const g=fixture();g.data.handoff[0].hostFingerprint=pin("0");assert.ok((await g.inspect()).blockers.includes("handoff_binding_mismatch"));
  });
  await t.test("same transaction capability and expected fence/mode are required and released",async()=>{
    const f=fixture();const outside=await f.source.inspect({} as any,f.input());assert.ok(outside.blockers.includes("transaction_unbound"));assert.deepEqual(outside.facts,{});
    await f.inspect();const late=await f.source.inspect(f.lastDb(),f.input());assert.ok(late.blockers.includes("transaction_unbound"));
    f.mode("read committed");await assert.rejects(f.inspect());const g=fixture();g.readonly("off");await assert.rejects(g.inspect());
    const h=fixture();await h.store.read(async()=>{await assert.rejects(h.source.context({} as any,h.context.binding),CanonicalBootstrapBlocked);});
  });
  await t.test("mixed-fence TOCTOU clears facts; a fresh transaction detects authority drift",async()=>{
    const f=fixture();f.hooks.driftFence=true;const mixed=await f.inspect();assert.ok(mixed.blockers.includes("transaction_changed"));assert.deepEqual(mixed.facts,{});
    const g=fixture(),owner=g.context.ownerId;g.hooks.query=kind=>{if(kind==="host")g.data.owner[0].ownerId=randomUUID();};
    const snapshot=await g.inspect();assert.equal(snapshot.facts.ownerId,owner);delete g.hooks.query;
    const next=await g.inspect();assert.ok(next.blockers.includes("primary_owner_membership_missing"));assert.equal(next.facts.ownerId,undefined);
  });
  await t.test("ledger calls canonical source only after fence and keeps every missing authority closed",async()=>{
    const f=fixture(),before=f.fence(),service=createWorkerBootstrapService(f.store,f.exchange,()=>new Date(f.iso()));
    const r=await service.consume({ticketId:f.ticket().id,deviceProof:Buffer.alloc(48,7)});assert.equal(r.ok,false);assert.equal(f.calls.filter(q=>q.startsWith("INSERT")||q.startsWith("UPDATE worker_bootstrap")).length,0);assert.equal(f.fence(),before);
    assert.deepEqual(f.phases.slice(0,2),["fence_write","fence_read"]);assert.equal(f.exchangeCalls(),0);assert.equal(f.commits(),0);
    await assert.rejects(f.store.register(f.tickets.get(f.ticket().id)!.signed));assert.equal(f.fence(),before);
    const stale=await f.source.inspect(f.lastDb(),f.input());assert.ok(stale.blockers.includes("transaction_unbound"));
  });
  await t.test("status projections never write, expose secrets, read full rows or sign new authority",async()=>{
    const f=fixture(),before=copy(f.data),fence=f.fence();for(let i=0;i<3;i++)assert.equal((await f.inspect()).ok,false);
    assert.deepEqual(f.data,before);assert.equal(f.fence(),fence);assert.ok(f.calls.every(q=>q.startsWith("SELECT")||q==="SET TRANSACTION READ ONLY"));
    assert.ok(f.calls.every(q=>!q.includes("SELECT *")&&!q.includes(" AS keyHash")&&!q.includes("password")&&!q.includes("metadata")&&!q.includes("trusted_provider_tickets ")));
    const r=await f.inspect();assert.ok(!JSON.stringify(r).includes("PRIVATE KEY"));assert.ok(!JSON.stringify(r).includes("worker.example.com"));
    (f.data.credentials[0] as any).rawKey=secret;const malformed=await f.inspect();assert.ok(malformed.blockers.includes("credential_invalid"));assert.ok(!JSON.stringify(malformed).includes(secret));
    f.hooks.query=()=>{throw Error(secret);};const error=await f.inspect();assert.deepEqual(error.facts,{});assert.ok(error.blockers.includes("canonical_source_invalid"));assert.ok(!JSON.stringify(error).includes(secret));
  });
  await t.test("strict input and accepted-but-expired decisions do not become authority",async()=>{
    const f=fixture();const r=await f.inspect({channel:{epoch:999},hostEpoch:999});assert.ok(r.blockers.includes("canonical_source_invalid"));assert.deepEqual(r.facts,{});
    f.advance(60001);const expired=await f.inspect();assert.ok(expired.blockers.includes("decision_not_current_owner_authority"));assert.ok(expired.blockers.includes("bootstrap_ticket_expired"));
  });
  await t.test("catalog inventory exposes the absent epoch/revocation/fence sources without migrations or a shadow registry",()=>{
    const schema=readFileSync("prisma/schema.prisma","utf8"),host=schema.split("model AgentHost {")[1].split("\n}")[0];
    assert.doesNotMatch(host,/hostEpoch|installationEpoch|revokedAt/);
    const issuer=readFileSync("prisma/migrations/20260923090000_trusted_provider_owner_tickets/migration.sql","utf8");assert.doesNotMatch(issuer,/ready_source_fence|ready_source_lock/);
    const source=readFileSync("src/modules/api-keys/worker-bootstrap-authority-source.ts","utf8");assert.doesNotMatch(source,/\bINSERT INTO\b|\bCREATE TABLE\b|\bUPDATE\b|\.sign\(/);
  });
  assert.equal(effects,0);assert.deepEqual(logs,[]);
});
