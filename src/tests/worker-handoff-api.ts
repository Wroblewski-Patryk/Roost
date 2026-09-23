import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import childProcess from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { prisma } from "../db/prisma";
import { requireApiKey } from "../auth/api-key.middleware";
import { createAuthToken } from "../auth/token";
import { hashApiKey } from "../auth/api-key";
import { workerTicketFingerprint } from "../auth/worker-ticket-principal";
import { createWorkerHandoffService } from "../modules/api-keys/worker-handoff.service";
import { createPrismaWorkerHandoffStore } from "../modules/api-keys/worker-handoff-store";
import { workerHandoffHandler } from "../modules/api-keys/worker-handoff-http";
import { handoffHash, handoffAckProof } from "../modules/api-keys/worker-handoff-contract";
import { ownerTicketFixture } from "./owner-ticket-fixture";
import { executionProviderRegistry, projectProvider } from "../modules/agent-runtime/execution-provider";
import { runtimeRedactionBoundary } from "../modules/agent-runtime/runtime-redaction-http";

export function registerWorkerHandoffDatabaseTests(h: any) {
  test("worker handoff native PostgreSQL HTTP qualification", { skip: !process.env.WORKER_HANDOFF_TEST_DATABASE, timeout: 480000 }, async t => {
    const owner = await h.registerOwner(`handoff-${randomUUID()}@example.test`, "Synthetic handoff qualification");
    const w = owner.workspace.id, ownerId = (await prisma.workspace.findUniqueOrThrow({ where: { id: w } })).ownerUserId!;
    const ownerHeaders = () => ({ Authorization: `Bearer ${createAuthToken({ workspaceId: w, userId: ownerId })}` });
    const synthetic = await ownerTicketFixture(), installationId = synthetic.state().key.installationId;
    await prisma.trustedProviderTicketKey.create({ data: { workspaceId: w, ...synthetic.state().key } });
    const buffers: Buffer[] = [], ephemeral: Buffer[] = [], proofBuffers: Buffer[] = [], logs: string[] = [];
    const registryBefore = structuredClone(executionProviderRegistry);
    for (const method of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const)
      t.mock.method(childProcess, method, () => { throw Error("target process forbidden in handoff qualification"); });
    t.mock.method(console, "error", (...args: unknown[]) => { logs.push(args.map(String).join(" ")); });
    let fault: string | undefined, offset = 0, deliveries = 0, transportPatch: any = {};
    const origin = "https://handoff.example.test", pin = "a".repeat(64);
    const store = createPrismaWorkerHandoffStore(prisma);
    const faultStore: typeof store = { readHandoff: store.readHandoff, transaction: work => store.transaction(async tx => {
      const result = await work(new Proxy(tx, { get(target, name: keyof typeof tx) { return async (...args: any[]) => {
        const result = await (target[name] as Function)(...args);
        if (fault === name) throw Error("injected transaction failure");
        return result;
      }; } }));
      if (fault === "commit") throw Error("injected precommit failure");
      return result;
    }) };
    const service = createWorkerHandoffService(faultStore, { delivery: { qualification: "synthetic_memory_only",
      generate: async () => { const b = Buffer.from(randomBytes(48).toString("base64url")); buffers.push(b); ephemeral.push(Buffer.from(b)); return b; },
      hash: async b => hashApiKey(b.toString()), deliver: async b => { deliveries++; if (fault === "delivery") throw Error("injected lost response"); return b.toString(); } },
      transport: async () => ({ qualification: "synthetic_memory_only", requestedOrigin: origin, connectedOrigin: origin,
        certificateFingerprint: pin, tlsValidated: true, redirected: false, proxyOrigin: null, ...transportPatch }) }, () => new Date(Date.now() + offset));
    const observedService: typeof service = async (action, auth, body) => {
      for(const field of ["deviceSecret","challenge"]) if(Buffer.isBuffer((body as any)?.[field])) proofBuffers.push((body as any)[field]);
      return service(action,auth,body);
    };
    const http = express(); http.use(express.json({ limit: "16kb" })); http.use(runtimeRedactionBoundary);
    for (const action of ["request", "poll", "ack", "status"] as const) http.post(`/v1/worker-credential-handoff/${action}`, workerHandoffHandler(action, observedService));
    http.use(requireApiKey);
    http.post("/v1/api-keys/worker-credentials/handoff/approve", workerHandoffHandler("approve", service));
    const server = http.listen(0, "127.0.0.1"); await new Promise<void>(r => server.once("listening", r));
    t.after(async () => { for (const b of [...buffers, ...ephemeral]) b.fill(0); await new Promise<void>(r => server.close(() => r())); assert.equal(server.listening, false); });
    const call = async (action: string, body: any, headers: Record<string, string> = {}) => {
      const path = action === "approve" ? "/v1/api-keys/worker-credentials/handoff/approve" : `/v1/worker-credential-handoff/${action}`;
      const r = await fetch(`http://127.0.0.1:${(server.address() as any).port}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() as any, cache: r.headers.get("cache-control") };
    };
    const app = await prisma.application.create({ data: { workspaceId: w, name: "Inert handoff fixture", slug: randomUUID() } });
    const project = await prisma.project.create({ data: { workspaceId: w, name: "Inert handoff fixture" } });
    await prisma.applicationProject.create({ data: { applicationId: app.id, projectId: project.id } });
    const task = await prisma.task.create({ data: { workspaceId: w, projectId: project.id, title: "Bounded handoff decision fixture" } });
    const auth = ownerHeaders(), f = await h.prepareReadyFixture(w, task.id, app.id, auth, false);
    f.input.contract.executionClass = "roost-fixed-effect-v1"; f.input.contract.budgets.maxAttempts = 1;
    f.input.contract.modelSelection = structuredClone(synthetic.c.acceptance.provider.modelSelection);
    const root = `/v1/agent-runtime/tasks/${task.id}`;
    await h.prepareRiskFixture(root + "/risk", f.input, auth);
    const post = (url: string, body: any, headers = auth) => h.request(url, { method: "POST", headers, body: JSON.stringify(body) });
    const control = { ...f, workspaceId: w, task, app, auth, root, post };
    async function accepted(intent: any) {
      await h.refreshCompositionRisk(task.id, auth);
      const p = await h.decisionFixtureProposal(control, { workerCredential: intent }); assert.equal(p.response.status, 201);
      await h.decisionFixtureProof(control);
      const v = (await h.request(`/v1/decisions/${p.id}/governance`, { headers: auth })).body.data;
      const r = await h.request(`/v1/decisions/${p.id}/governance/actions`, { method: "POST", headers: auth,
        body: JSON.stringify({ requestId: randomUUID(), expectedVersion: v.expectedVersion, action: "accept", previewId: v.previews[0].id }) });
      assert.equal(r.status, 201); return p.id;
    }
    async function device(hostId?: string, replacesRequestId: string | null = null) {
      const host = hostId ?? (await prisma.agentHost.create({ data: { workspaceId: w, name: "Inert handoff host", slug: randomUUID(), platform: "synthetic", status: "online" } })).id;
      const deviceSecret = randomBytes(48), challenge = randomBytes(48); ephemeral.push(deviceSecret, challenge);
      const input = { requestId: randomUUID(), workspaceId: w, installationId, hostId: host, hostFingerprint: "b".repeat(64),
        deviceSecretHash: handoffHash("device", deviceSecret), challengeHash: handoffHash("challenge", challenge), origin, certificateFingerprint: pin, replacesRequestId };
      const proof = () => ({ requestId: input.requestId, workspaceId: w, installationId, hostId: host, hostFingerprint: input.hostFingerprint,
        deviceSecret: deviceSecret.toString("base64url"), challenge: challenge.toString("base64url") });
      return { input, proof, host };
    }
    async function request(d: Awaited<ReturnType<typeof device>>) { const r = await call("request", d.input); assert.equal(r.status, 200); assert.equal(r.cache, "no-store"); return r.body.data; }
    async function command(d: Awaited<ReturnType<typeof device>>, req: any, patch: any = {}) {
      const old = await prisma.apiKey.findFirst({ where: { workspaceId: w, workerHostId: d.host }, orderBy: { workerBindingEpoch: "desc" } });
      const intent = { schemaVersion: "worker-credential-lifecycle-v1", action: old?.active || old && !old.revokedAt ? "rotate" : "enroll",
        workspaceId: w, installationId, hostId: d.host, expectedCredentialId: old?.id ?? null, expectedVersion: old?.credentialVersion ?? 0,
        expectedEpoch: old?.workerBindingEpoch ?? 0, expectedFingerprint: old ? workerTicketFingerprint(old.keyHash!) : null,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), validUntil: new Date(Date.now() + 600000).toISOString(), handoff: req.binding, ...patch };
      return { requestId: randomUUID(), decisionId: await accepted(intent), decisionRevision: 1, explicitAcceptance: true, intent };
    }
    async function approved(d: Awaited<ReturnType<typeof device>>, req = undefined as any) {
      req ??= await request(d); const c = await command(d, req);
      const r = await call("approve", { requestId: d.input.requestId, userCode: req.userCode, command: c }, ownerHeaders()); assert.equal(r.status, 200); return c;
    }
    function ack(d: Awaited<ReturnType<typeof device>>, data: any) {
      const result = { ...d.proof(), credentialId: data.credential.id, credentialFingerprint: data.credential.fingerprint,
        responseDigest: data.responseDigest, ackProof: handoffAckProof(hashApiKey(data.key), d.input.requestId, data.responseDigest) };
      data.key = ""; return result;
    }
    const row = async (id: string) => (await prisma.$queryRaw<any[]>`SELECT * FROM worker_credential_handoffs WHERE id=${id}::uuid`)[0];
    async function snapshot() {
      const tables = ["api_keys", "worker_credential_handoffs", "agent_credential_operations", "events", "ready_source_fence", "trusted_provider_ticket_journal", "trusted_provider_ticket_worker_bindings", "agent_executions", "trusted_provider_tickets"];
      const state: any = {};
      for (const table of tables) state[table] = await prisma.$queryRawUnsafe(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS value FROM "${table}" t`);
      return state;
    }
    async function rollback(action: string, body: any, stages: string[], headers: Record<string, string> = {}) {
      for (const stage of stages) { const before = await snapshot(), count = deliveries; fault = stage;
        try { const r = await call(action, body, headers); assert.equal(r.status, 503, `${action}:${stage}`); } finally { fault = undefined; }
        assert.deepEqual(await snapshot(), before, `${action}:${stage}`); assert.equal(deliveries, count);
      }
    }
    const d = await device(); let req: any, c: any, delivered: any, ackInput: any;
    await t.test("request and approval use native rollback and fresh exact primary-owner authority", async () => {
      await rollback("request", d.input, ["saveHandoff", "handoffAudit", "commit"]); req = await request(d);
      assert.equal((await row(d.input.requestId)).creator_user_id, null);
      assert.equal(await prisma.apiKey.count({ where: { workerHostId: d.host } }), 0);
      const beforeApproval = await call("poll", d.proof()); assert.equal(beforeApproval.body.data.state, "requested"); assert.ok(!beforeApproval.body.data.key);
      c = await command(d, req); const body = { requestId: d.input.requestId, userCode: req.userCode, command: c };
      for (const role of ["owner", "admin", "member", "viewer"] as const) {
        const u = await prisma.user.create({ data: { email: `denied-${randomUUID()}@example.test`, passwordHash: "synthetic-no-login" } });
        await prisma.workspaceMembership.create({ data: { workspaceId: w, userId: u.id, role } });
        assert.equal((await call("approve", body, { Authorization: `Bearer ${createAuthToken({ workspaceId: w, userId: u.id })}` })).status, 403);
      }
      for (const age of [null, Math.floor(Date.now()/1000)-301, Math.floor(Date.now()/1000)+60])
        assert.equal((await call("approve", body, { Authorization: `Bearer ${createAuthToken({ workspaceId: w, userId: ownerId }, age)}` })).status, 403);
      assert.equal((await call("approve", { ...body, userCode: "00000000" }, ownerHeaders())).status, 403);
      assert.equal((await call("approve", { ...body, command: { ...c, decisionId: randomUUID() } }, ownerHeaders())).status, 403);
      await rollback("approve", body, ["saveHandoff", "handoffAudit", "commit"], ownerHeaders());
      assert.equal((await call("approve", body, ownerHeaders())).status, 200);
    });
    await t.test("20 concurrent polls disclose once; candidate inactive; 20 ACKs activate exactly once", async () => {
      await rollback("poll", d.proof(), ["insert", "handoffAudit", "commit"]);
      const results = await Promise.all(Array.from({ length: 20 }, () => call("poll", d.proof())));
      const secrets = results.filter(r => r.body.data?.key); assert.equal(secrets.length, 1);
      assert.ok(results.every(r => r.status === 200)); assert.equal(deliveries, 1);
      assert.ok(results.filter(r => !r.body.data?.key).every(r => r.body.data.state === "awaiting_ack" && r.body.data.deliverySpent));
      delivered = secrets[0].body.data;
      assert.equal((await prisma.apiKey.findUniqueOrThrow({ where: { id: delivered.credential.id } })).active, false);
      const beforeTamper = await snapshot();
      await assert.rejects(prisma.$executeRaw`UPDATE api_keys SET active=true WHERE id=${delivered.credential.id}::uuid`);
      await assert.rejects(prisma.$executeRaw`UPDATE worker_credential_handoffs SET host_fingerprint=${"f".repeat(64)} WHERE id=${d.input.requestId}::uuid`);
      await assert.rejects(prisma.$executeRaw`DELETE FROM worker_credential_handoffs WHERE id=${d.input.requestId}::uuid`);
      await assert.rejects(prisma.$executeRaw`UPDATE worker_credential_handoffs SET state='acknowledged',acknowledged_at=clock_timestamp() WHERE id=${d.input.requestId}::uuid`);
      assert.deepEqual(await snapshot(), beforeTamper);
      const replay = await call("poll", d.proof()); assert.equal(replay.body.data.state, "awaiting_ack"); assert.ok(!replay.body.data.key);
      ackInput = ack(d, delivered);
      assert.equal((await call("ack", { ...ackInput, ackProof: "0".repeat(64) })).status, 403);
      await rollback("ack", ackInput, ["saveHandoff", "activate", "record", "handoffAudit", "commit"]);
      const acks = await Promise.all(Array.from({ length: 20 }, () => call("ack", ackInput)));
      assert.ok(acks.every(r => r.status === 200 && r.body.data.state === "acknowledged" && !r.body.data.key));
      assert.equal(await prisma.apiKey.count({ where: { workerHostId: d.host, active: true, revokedAt: null } }), 1);
      assert.equal(await prisma.agentCredentialOperation.count({ where: { keyId: delivered.credential.id } }), 1);
      assert.equal(await prisma.event.count({ where: { resourceId: d.input.requestId, type: "api_key.worker_handoff_acknowledged" } }), 1);
      assert.equal((await call("ack", ackInput)).body.data.state, "acknowledged");
    });
    await t.test("lost response, deadline, recovery and concurrent rotations never resurrect the old generation", async () => {
      const lost = await device(); await approved(lost); fault = "delivery";
      try { assert.equal((await call("poll", lost.proof())).status, 503); } finally { fault = undefined; }
      const pending = await row(lost.input.requestId); assert.equal(pending.state, "awaiting_ack"); assert.ok(pending.spent_at);
      assert.ok(!(await call("poll", lost.proof())).body.data.key);
      offset = 61000;
      try { assert.equal((await call("status", lost.proof())).body.data.state, "delivery_unknown"); } finally { offset = 0; }
      const revoked = await prisma.apiKey.findUniqueOrThrow({ where: { id: pending.credential_id } }); assert.equal(revoked.active, false); assert.ok(revoked.revokedAt);
      const recovery = await device(lost.host, lost.input.requestId);
      await rollback("request", recovery.input, ["saveHandoff", "handoffAudit", "commit"]);
      await approved(recovery); const r = await call("poll", recovery.proof()); assert.equal(r.status, 200);
      assert.notEqual(r.body.data.credential.id, pending.credential_id); assert.equal((await call("ack", ack(recovery, r.body.data))).status, 200);
      assert.ok(!(await call("poll", lost.proof())).body.data.key);
      const next = await device(d.host), other = await device(d.host); await approved(next); await approved(other);
      await rollback("poll", next.proof(), ["revoke", "invalidate", "insert", "handoffAudit", "commit"]);
      const races = await Promise.all(Array.from({length:20}, (_, i) => call("poll", (i%2 ? next : other).proof())));
      const won = races.filter(r => r.body.data?.key); assert.equal(won.length, 1);
      const winner = won[0].body.data.requestId === next.input.requestId ? next : other;
      assert.equal((await call("ack", ack(winner, won[0].body.data))).status, 200);
      assert.equal(await prisma.apiKey.count({ where: { workerHostId: d.host, active: true, revokedAt: null } }), 1);
    });
    await t.test("transport and proof drift, bounded attempts, expiry and request budgets deny", async () => {
      const denied = await device(); await request(denied);
      for (const patch of [{tlsValidated:false},{redirected:true},{proxyOrigin:"https://proxy.example.test"},{requestedOrigin:"http://handoff.example.test"},
        {connectedOrigin:"https://other.example.test"},{connectedOrigin:origin+":444"},{certificateFingerprint:"f".repeat(64)}]) {
        transportPatch=patch; try { assert.equal((await call("status", denied.proof())).status,403); } finally {transportPatch={};}
      }
      for (const patch of [{workspaceId:randomUUID()},{installationId:randomUUID()},{hostId:randomUUID()},{hostFingerprint:"0".repeat(64)},
        {deviceSecret:randomBytes(48).toString("base64url")},{challenge:randomBytes(48).toString("base64url")}]) {
        const target=await device(); await request(target); assert.equal((await call("poll",{...target.proof(),...patch})).status,403);
      }
      for(let i=0;i<5;i++) assert.equal((await call("poll",{...denied.proof(),hostFingerprint:"0".repeat(64)})).status,i===4?429:403);
      assert.equal((await call("poll",denied.proof())).body.data.state,"locked");
      const expiry=await device();await request(expiry); offset=121000;
      try {assert.equal((await call("status",expiry.proof())).body.data.state,"expired");}finally{offset=0;}
      const limited=await device();await request(limited);
      for(let i=0;i<2;i++) await request(await device(limited.host));
      assert.equal((await call("request",(await device(limited.host)).input)).status,429);
      const polling=await device();await request(polling);
      for(let i=0;i<31;i++) await call("poll",polling.proof());
      assert.equal((await row(polling.input.requestId)).state,"locked");
      assert.equal((await call("request",{...(await device()).input,origin:"http://handoff.example.test"})).status,400);
    });
    await t.test("agent, Worker and foreign principals cannot approve; stale decision and exact binding deny", async () => {
      const target=await device(), r=await request(target), cmd=await command(target,r);
      const approval={requestId:target.input.requestId,userCode:r.userCode,command:cmd};
      const foreign=await h.registerOwner(`foreign-${randomUUID()}@example.test`,"Foreign inert workspace");
      const foreignId=(await prisma.workspace.findUniqueOrThrow({where:{id:foreign.workspace.id}})).ownerUserId!;
      assert.equal((await call("approve",approval,{Authorization:`Bearer ${createAuthToken({workspaceId:foreign.workspace.id,userId:foreignId})}`})).status,403);
      for(const boundAgentId of [null, control.agent.id]) {
        const raw=randomBytes(48).toString("base64url"); ephemeral.push(Buffer.from(raw));
        await prisma.apiKey.create({data:{workspaceId:w,name:"Inert approval denial",keyHash:hashApiKey(raw),keyPrefix:"synthetic",
          scopes:boundAgentId?["connection:read","tasks:read","workforce:read","agent-runtime:read","agent-runtime:write"]:["*"],boundAgentId,expiresAt:new Date(Date.now()+60000)}});
        assert.equal((await call("approve",approval,{"X-API-Key":raw})).status,403);
      }
      const worker=await device();await approved(worker);const p=await call("poll",worker.proof());const raw=p.body.data.key;
      assert.equal((await call("ack",ack(worker,p.body.data))).status,200);
      assert.equal((await call("approve",approval,{"X-API-Key":raw})).status,403);
      for(const patch of [{workspaceId:randomUUID()},{installationId:randomUUID()},{hostId:randomUUID()},{handoff:{...cmd.intent.handoff,hostFingerprint:"f".repeat(64)}}]) {
        const own=await device(), created=await request(own), exact=await command(own,created);
        assert.equal((await call("approve",{requestId:own.input.requestId,userCode:created.userCode,command:{...exact,intent:{...exact.intent,...patch}}},ownerHeaders())).status,403);
      }
      const expired=await device(), created=await request(expired), stale=await command(expired,created,{validUntil:new Date(Date.now()-1000).toISOString()});
      assert.equal((await call("approve",{requestId:expired.input.requestId,userCode:created.userCode,command:stale},ownerHeaders())).status,403);
      await approved(target,r);
      await prisma.agentHost.update({where:{id:target.host},data:{status:"disabled"}});
      assert.equal((await call("poll",target.proof())).status,409);
      assert.equal((await row(target.input.requestId)).state,"revoked");
      const expiring=await device(), er=await request(expiring), ec=await command(expiring,er,{validUntil:new Date(Date.now()+20000).toISOString()});
      assert.equal((await call("approve",{requestId:expiring.input.requestId,userCode:er.userCode,command:ec},ownerHeaders())).status,200);
      offset=21000;try{assert.equal((await call("poll",expiring.proof())).status,409);}finally{offset=0;}
      assert.equal((await row(expiring.input.requestId)).state,"revoked");
    });
    await t.test("ACK binds credential, response and current owner; malformed wire proof is bounded", async () => {
      const target=await device();await approved(target);const p=await call("poll",target.proof());assert.equal(p.status,200);
      const correct=ack(target,p.body.data);
      for(const patch of [{credentialId:randomUUID()},{credentialFingerprint:"f".repeat(64)},{responseDigest:"f".repeat(64)}])
        assert.equal((await call("ack",{...correct,...patch})).status,403);
      assert.equal((await call("ack",{...correct,challenge:"x"})).status,400);
      assert.equal((await call("ack",correct)).status,200);
      const stale=await device();await approved(stale);const q=await call("poll",stale.proof());const proof=ack(stale,q.body.data);
      offset=301000;try{assert.equal((await call("ack",proof)).body.data.state,"delivery_unknown");}finally{offset=0;}
      assert.equal((await prisma.apiKey.findUniqueOrThrow({where:{id:proof.credentialId}})).active,false);
      const before=await snapshot();
      await assert.rejects(prisma.$executeRaw`UPDATE api_keys SET active=true WHERE id=${proof.credentialId}::uuid`);
      assert.deepEqual(await snapshot(),before);
    });
    await t.test("recovery reconciliation rolls back revocation, spent state, fence and audit together",async()=>{
      const old=await device();await approved(old);const delivered=await call("poll",old.proof());delivered.body.data.key="";
      const recovery=await device(old.host,old.input.requestId);offset=61000;
      try {await rollback("request",recovery.input,["revoke","invalidate","saveHandoff","handoffAudit","commit"]);}finally{offset=0;}
      assert.equal((await row(old.input.requestId)).state,"awaiting_ack");
      const recovered=await request(recovery);const cmd=await command(recovery,recovered);
      assert.equal((await call("approve",{requestId:recovery.input.requestId,userCode:recovered.userCode,command:cmd},ownerHeaders())).status,200);
      const p=await call("poll",recovery.proof());assert.equal(p.status,200);
      assert.equal((await call("ack",ack(recovery,p.body.data))).status,200);
      assert.equal((await row(old.input.requestId)).state,"revoked");
      assert.equal(await prisma.apiKey.count({where:{workerHostId:old.host,active:true,revokedAt:null}}),1);
    });
    await t.test("no raw material in public tables, audit, status, logs; no provider or execution authority", async () => {
      const tables=await prisma.$queryRaw<any[]>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
      for(const {tablename} of tables){ assert.match(tablename,/^[a-zA-Z0-9_]+$/);
        const rows=await prisma.$queryRawUnsafe<any[]>(`SELECT to_jsonb(t)::text AS value FROM "${tablename}" t`);
        for(const {value} of rows) for(const b of ephemeral) assert.ok(!value.includes(b.toString()) && !value.includes(b.toString("base64url")),`raw material in ${tablename}`);
      }
      for(const action of ["poll","status","ack"]) {const r=await call(action,action==="ack"?ackInput:d.proof()); assert.ok(!r.body.data?.key);}
      for(const b of [...buffers,...proofBuffers]) assert.ok(b.every(v=>v===0));
      for(const b of ephemeral) assert.ok(!logs.join("\n").includes(b.toString("base64url")));
      assert.equal(await prisma.agentExecution.count({where:{workspaceId:w}}),0);
      assert.equal(await prisma.trustedProviderTicket.count({where:{workspaceId:w}}),0);
      assert.deepEqual(executionProviderRegistry,registryBefore);
      const launch = require("../../scripts/lib/agent-host-hermes-launch-contract.cjs");
      for(const flag of ["implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted"])
        assert.equal(launch[flag],false);
      for(const kind of ["direct_codex","codex_app_server","hermes_manual"]) assert.equal(projectProvider({kind}).executionSupported,false);
      const def=await h.request("/v1/worker-credential-handoff/poll",{method:"POST",body:JSON.stringify(d.proof())}); assert.equal(def.status,503);
    });
  });
}
