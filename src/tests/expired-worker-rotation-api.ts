import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { digest } from "../auth/owner-action-proof";
import { prisma } from "../db/prisma";

type Response = { status: number; body: unknown };
type Harness = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
};

export function registerExpiredWorkerRotationApiTests({ request, registerOwner }: Harness) {
  test("Outcome 0 expired Worker rotation HTTP", async () => {
    const owner = await registerOwner(`expired-worker-${randomUUID()}@example.test`, "Expired Worker rotation fixture");
    const workspaceId = owner.workspace.id;
    const auth = { Authorization: `Bearer ${owner.token}` };
    const me = await request("/v1/auth/me", { headers: auth });
    assert.equal(me.status, 200);
    const ownerId = (me.body as any).data.userId as string;
    const taskId = randomUUID(), hostId = randomUUID(), handoffId = randomUUID();
    const installationId = randomUUID(), decisionId = randomUUID();
    const requestHash = digest(randomUUID()), handoffDigest = digest(randomUUID());
    const intent = {
      schemaVersion: "worker-credential-lifecycle-v1", action: "rotate", workspaceId,
      installationId, hostId, expectedCredentialId: randomUUID(), expectedVersion: 1,
      expectedEpoch: 1, expectedFingerprint: "c".repeat(64),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      validUntil: new Date(Date.now() - 180_000).toISOString(),
      handoff: { requestId: handoffId, requestDigest: handoffDigest,
        hostFingerprint: "d".repeat(64), origin: "https://example.test",
        certificateFingerprint: "e".repeat(64), replacesRequestId: null }
    };
    const proposal = { title: "Synthetic expired Worker rotation", context: "A stale credential request",
      decision: "Rotate one Worker credential", rationale: "Bound owner request",
      consequences: "No issuance took place", scopeReason: "One historical task",
      scope: [{ type: "task", id: taskId }], supersedesId: null, conflicts: [], workerCredential: intent };

    // A historical unissued request cannot be recreated through the live enrollment API.
    // Disable only user triggers around synthetic rows in this disposable API database.
    await prisma.$transaction(async tx => {
      const tables = ["tasks", "agent_hosts", "worker_credential_handoffs", "decisions", "decision_revisions"];
      for (const table of tables) await tx.$executeRawUnsafe(`ALTER TABLE ${table} DISABLE TRIGGER USER`);
      await tx.$executeRaw`INSERT INTO tasks(id,workspace_id,title,status,updated_at)
        VALUES(${taskId}::uuid,${workspaceId}::uuid,'Synthetic retained task','todo',now())`;
      await tx.$executeRaw`INSERT INTO agent_hosts(id,workspace_id,name,slug,platform,updated_at)
        VALUES(${hostId}::uuid,${workspaceId}::uuid,'Synthetic offline host',${`offline-${hostId}`} ,'windows',now())`;
      await tx.$executeRaw`INSERT INTO worker_credential_handoffs(id,workspace_id,installation_id,host_id,
        host_fingerprint,device_secret_hash,challenge_hash,request_digest,user_code_hash,origin,
        certificate_fingerprint,state,created_at,expires_at)
        VALUES(${handoffId}::uuid,${workspaceId}::uuid,${installationId}::uuid,${hostId}::uuid,
        ${"d".repeat(64)},${digest(randomUUID())},${"1".repeat(64)},${handoffDigest},${"2".repeat(64)},
        'https://example.test',${"e".repeat(64)},'expired',now()-interval '5 minutes',now()-interval '4 minutes')`;
      await tx.$executeRaw`INSERT INTO decisions(id,workspace_id,title,decision,status,source,updated_at)
        VALUES(${decisionId}::uuid,${workspaceId}::uuid,${proposal.title},${proposal.decision},'proposed','roost_decision',now())`;
      await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
        VALUES(${decisionId}::uuid,${workspaceId}::uuid,1,${JSON.stringify(proposal)}::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${requestHash})`;
      for (const table of tables.reverse()) await tx.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE TRIGGER USER`);
    });

    const path = `/v1/decisions/${decisionId}/governance/expired-credential-withdrawals`;
    const governancePath = `/v1/decisions/${decisionId}/governance`;
    const view = async () => {
      const response = await request(governancePath, { headers: auth });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return (response.body as any).data;
    };
    const issueProof = async (body: string) => {
      const result = await request("/v1/auth/reauth", { method: "POST", headers: auth,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path, bodyDigest: digest(body) }) });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      return (result.body as any).data.proof as string;
    };
    const command = (body: string, headers: Record<string, string> = auth) =>
      request(path, { method: "POST", headers, body });
    const active = await view();
    assert.equal(active.credentialWithdrawal.eligible, false);
    assert.ok(active.credentialWithdrawal.blockers.includes("active_task"));
    assert.deepEqual(active.credentialWithdrawal.impact.taskIds, [taskId]);
    const reason = "The unused Worker rotation request expired without issuance.";
    const activeBody = JSON.stringify({ requestId: randomUUID(), expectedVersion: active.expectedVersion,
      expectedPreviewDigest: active.credentialWithdrawal.previewDigest, reason });
    assert.equal((await command(activeBody, { ...auth, "X-Owner-Action-Proof": await issueProof(activeBody) })).status, 409);

    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("ALTER TABLE tasks DISABLE TRIGGER USER");
      await tx.$executeRaw`UPDATE tasks SET status='archived' WHERE id=${taskId}::uuid`;
      await tx.$executeRawUnsafe("ALTER TABLE tasks ENABLE TRIGGER USER");
    });
    const eligible = await view();
    assert.equal(eligible.credentialWithdrawal.eligible, true, JSON.stringify(eligible.credentialWithdrawal));
    assert.deepEqual(eligible.credentialWithdrawal.blockers, []);
    assert.deepEqual(eligible.credentialWithdrawal.handoff, { id: handoffId, state: "expired", expired: true });
    assert.match(eligible.credentialWithdrawal.previewDigest, /^[a-f0-9]{64}$/);
    const otherOwner = await registerOwner(`expired-worker-other-${randomUUID()}@example.test`, "Other Worker workspace");
    const foreignView = await request(governancePath, { headers: { Authorization: `Bearer ${otherOwner.token}` } });
    assert.equal(foreignView.status, 404);
    assert.equal(JSON.stringify(foreignView.body).includes(handoffId), false);
    const body = JSON.stringify({ requestId: randomUUID(), expectedVersion: eligible.expectedVersion,
      expectedPreviewDigest: eligible.credentialWithdrawal.previewDigest, reason });
    assert.equal((await command(body)).status, 403, "owner command requires exact recent proof");
    const staleBody = JSON.stringify({ ...JSON.parse(body), requestId: randomUUID(), expectedVersion: "0".repeat(64) });
    assert.equal((await command(staleBody, { ...auth, "X-Owner-Action-Proof": await issueProof(staleBody) })).status, 409);
    const apiKey = await request("/v1/api-keys", { method: "POST", headers: auth,
      body: JSON.stringify({ name: "Expired rotation denial fixture", fullAccessConfirmed: true }) });
    assert.equal(apiKey.status, 201, JSON.stringify(apiKey.body));
    assert.equal((await command(body, { "X-API-Key": (apiKey.body as any).data.key })).status, 403);

    const before = await prisma.$queryRaw<Array<{ kind: string; row: unknown }>>`
      SELECT 'task' AS kind,to_jsonb(t) AS row FROM tasks t WHERE t.id=${taskId}::uuid
      UNION ALL SELECT 'handoff',to_jsonb(h) FROM worker_credential_handoffs h WHERE h.id=${handoffId}::uuid
      UNION ALL SELECT 'credential',to_jsonb(k) FROM api_keys k WHERE k.workspace_id=${workspaceId}::uuid`;
    const proof = await issueProof(body);
    const alteredBody = JSON.stringify({ ...JSON.parse(body), reason: `${reason} Altered` });
    assert.equal((await command(alteredBody, { ...auth, "X-Owner-Action-Proof": proof })).status, 403,
      "proof is bound to the exact JSON body");
    const created = await command(body, { ...auth, "X-Owner-Action-Proof": proof });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal((created.body as any).data.replayed, false);
    assert.equal((created.body as any).data.record.decisionId, decisionId);
    assert.equal((await command(body, { ...auth, "X-Owner-Action-Proof": proof })).status, 403,
      "the consumed proof cannot authorize replay");
    const replayed = await command(body, { ...auth, "X-Owner-Action-Proof": await issueProof(body) });
    assert.equal(replayed.status, 200, JSON.stringify(replayed.body));
    assert.equal((replayed.body as any).data.replayed, true);
    assert.equal((replayed.body as any).data.record.id, (created.body as any).data.record.id);
    const ledger = await prisma.$queryRaw<Array<{ count: bigint; kind: string; impact_digest: string }>>`
      SELECT count(*) AS count,min(kind) AS kind,min(impact_digest) AS impact_digest
      FROM decision_withdrawals WHERE decision_id=${decisionId}::uuid`;
    assert.equal(ledger[0].count, 1n);
    assert.equal(ledger[0].kind, "expired_worker_rotation");
    assert.equal(ledger[0].impact_digest, eligible.credentialWithdrawal.previewDigest);
    const history = await view();
    assert.equal(history.selected.state, "withdrawn");
    assert.equal(history.withdrawal.kind, "expired_worker_rotation");
    assert.equal(history.credentialWithdrawal, null);
    const after = await prisma.$queryRaw<Array<{ kind: string; row: unknown }>>`
      SELECT 'task' AS kind,to_jsonb(t) AS row FROM tasks t WHERE t.id=${taskId}::uuid
      UNION ALL SELECT 'handoff',to_jsonb(h) FROM worker_credential_handoffs h WHERE h.id=${handoffId}::uuid
      UNION ALL SELECT 'credential',to_jsonb(k) FROM api_keys k WHERE k.workspace_id=${workspaceId}::uuid`;
    assert.deepEqual(after, before, "withdrawal and replay cannot mutate task, handoff or credential rows");
  });
}
