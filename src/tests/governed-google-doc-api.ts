import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { hashApiKey } from "../auth/api-key";
import { agentPrincipalScopes } from "../auth/agent-principal";
import { digest } from "../auth/owner-action-proof";
import { encryptSecret } from "../integrations/secrets";

type Response = { status: number; body: any };
type Request = (path: string, init?: RequestInit) => Promise<Response>;
type Owner = { token: string; workspace: { id: string } };

export function registerGovernedGoogleDocTests(deps: {
  request: Request;
  registerOwner: (email: string, workspaceName: string) => Promise<Owner>;
}) {
  test("G18b one task-bound Google Doc edit uses durable intent, revision control and provider readback", async () => {
    const { request, registerOwner } = deps;
    const owner = await registerOwner(`g18b-${randomUUID()}@example.test`, "G18b isolated workspace");
    const workspaceId = owner.workspace.id;
    const ownerHeaders = { Authorization: `Bearer ${owner.token}` };
    const me = await request("/v1/auth/me", { headers: ownerHeaders });
    assert.equal(me.status, 200);
    const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: "Isolated Doc agent", slug: `doc-${randomUUID()}`,
      type: "agent", source: "system", status: "active" } });
    const task = await prisma.task.create({ data: { workspaceId, title: "Edit selected Google Doc", assignedWorkforceEntityId: agent.id } });
    const rawKey = randomUUID();
    const key = await prisma.apiKey.create({ data: { workspaceId, boundAgentId: agent.id, name: "Isolated bound agent key",
      keyHash: hashApiKey(rawKey), keyPrefix: "fixture", active: true,
      expiresAt: new Date(Date.now() + 7 * 86400000), scopes: agentPrincipalScopes } });
    await prisma.integrationSetting.create({ data: { workspaceId, provider: "google_drive", active: true,
      config: { selectedFolderIds: ["root"] }, secretCiphertext: encryptSecret(JSON.stringify({ accessToken: "synthetic" })) } });
    let externalId = `fixture-${randomUUID()}`;
    const file = await prisma.googleDriveFile.create({ data: { workspaceId, provider: "google_drive", externalId,
      name: "Isolated document", mimeType: "application/vnd.google-apps.document", parentExternalId: "root", syncStatus: "synced" } });
    const snapshot = await prisma.googleDriveContentSnapshot.create({ data: { workspaceId, googleDriveFileId: file.id,
      sourceRevisionId: "r1", contentKind: "google_doc", scanStatus: "completed", extractedText: "Original", summary: "Original" } });
    let revision = "r1", content = "Original", folder = "root", posts = 0, rejectPost = false, moveDuringPost = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (!url.hostname.endsWith("googleapis.com")) return originalFetch(input, init);
      const json = (body: unknown, status = 200) => new globalThis.Response(JSON.stringify(body), { status });
      if (url.pathname.endsWith(`/files/${externalId}`)) return json({ id: externalId, name: "Isolated document",
        mimeType: "application/vnd.google-apps.document", parents: [folder], version: revision });
      if (url.pathname.endsWith("/files/root")) return json({ id: "root", name: "Root", mimeType: "application/vnd.google-apps.folder" });
      if (url.pathname.endsWith("/files/elsewhere")) return json({ id: "elsewhere", name: "Outside", mimeType: "application/vnd.google-apps.folder" });
      if (url.pathname.endsWith(`/documents/${externalId}`)) return json({ revisionId: revision, tabs: [{ tabProperties: { tabId: "t.1" },
        documentTab: { body: { content: [{ paragraph: { elements: [{ textRun: { content } }] } }] } } }] });
      if (url.pathname.endsWith(`/documents/${externalId}:batchUpdate`)) {
        posts++;
        const body = JSON.parse(String(init?.body));
        assert.deepEqual(body.writeControl, { requiredRevisionId: revision });
        assert.equal(body.requests[0].insertText.endOfSegmentLocation.tabId, "t.1");
        if (rejectPost) return json({ error: { message: "Backend unavailable" } }, 503);
        content += body.requests[0].insertText.text;
        revision = `r${posts + 1}`;
        if (moveDuringPost) folder = "elsewhere";
        return json({ writeControl: { requiredRevisionId: revision } });
      }
      throw new Error(`Unexpected Google fixture path: ${url.pathname}`);
    };
    const root = `/v1/google-drive/tasks/${task.id}/docs/${file.id}/governed`;
    const agentHeaders = { "X-API-Key": rawKey };
    try {
      assert.equal((await request(`${root}/candidate`, { headers: agentHeaders })).status, 403);
      const candidate = await request(`${root}/candidate`, { headers: ownerHeaders });
      assert.equal(candidate.status, 200, JSON.stringify(candidate.body));
      assert.equal(candidate.body.data.snapshot.id, snapshot.id);
      assert.equal(candidate.body.data.credentials[0].id, key.id);
      const mandateBody = JSON.stringify({ requestId: randomUUID(), sourceSnapshotId: snapshot.id, credentialId: key.id,
        expectedRevision: "r1", classification: "fact", validUntil: new Date(Date.now() + 86400000).toISOString() });
      const missingProof = await request(`${root}/mandate`, { method: "POST", headers: ownerHeaders, body: mandateBody });
      assert.equal(missingProof.status, 403);
      const proof = await request("/v1/auth/reauth", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path: `${root}/mandate`, bodyDigest: digest(mandateBody) }) });
      assert.equal(proof.status, 200, JSON.stringify(proof.body));
      const mandate = await request(`${root}/mandate`, { method: "POST",
        headers: { ...ownerHeaders, "X-Owner-Action-Proof": proof.body.data.proof }, body: mandateBody });
      assert.equal(mandate.status, 201, JSON.stringify(mandate.body));
      assert.equal(await prisma.taskSourceReview.count({ where: { workspaceId, taskId: task.id, sourceId: snapshot.id } }), 1);
      const read = await request(root, { headers: agentHeaders });
      assert.equal(read.status, 200, JSON.stringify(read.body));
      assert.equal(read.body.data.status, "ready");
      assert.equal(read.body.data.provider.revisionId, "r1");
      assert.equal(read.body.data.content, "Original");
      const legacyWrite = await request(`/v1/google-drive/docs/${file.id}`, { method: "PATCH", headers: ownerHeaders,
        body: JSON.stringify({ expectedRevision: "r1", requests: [{ insertText: { endOfSegmentLocation: {}, text: "Bypass" } }] }) });
      assert.equal(legacyWrite.status, 409);
      assert.equal(posts, 0);
      await prisma.task.update({ where: { id: task.id }, data: { status: "in_progress" } });
      assert.equal((await request(root, { headers: agentHeaders })).status, 200);
      const appendBody = JSON.stringify({ requestId: randomUUID(), expectedRevision: "r1", text: "\nApproved addition" });
      const appended = await request(`${root}/append`, { method: "POST", headers: agentHeaders, body: appendBody });
      assert.equal(appended.status, 201, JSON.stringify(appended.body));
      assert.equal(appended.body.data.state, "applied");
      assert.equal(posts, 1);
      const replay = await request(`${root}/append`, { method: "POST", headers: agentHeaders, body: appendBody });
      assert.equal(replay.status, 201);
      assert.equal(posts, 1);
      const after = await request(root, { headers: agentHeaders });
      assert.equal(after.status, 200, JSON.stringify(after.body));
      assert.equal(after.body.data.status, "applied");
      assert.match(after.body.data.content, /Approved addition/);
      for (const status of ["done", "blocked"] as const) {
        await prisma.task.update({ where: { id: task.id }, data: { status } });
        assert.equal((await request(root, { headers: agentHeaders })).status, 403);
        assert.equal((await request(`${root}/append`, { method: "POST", headers: agentHeaders, body: appendBody })).status, 403);
        assert.equal((await request(root, { headers: ownerHeaders })).body.data.status, "mandate_stale");
      }
      await prisma.task.update({ where: { id: task.id }, data: { status: "todo" } });
      assert.equal((await request(root, { headers: agentHeaders })).status, 403);
      assert.equal((await request(root, { headers: ownerHeaders })).body.data.status, "mandate_stale");
      const approvedReview = await prisma.taskSourceReview.findFirstOrThrow({ where: { workspaceId, taskId: task.id,
        sourceId: snapshot.id }, orderBy: { ordinal: "desc" } });
      const { id: _reviewId, ordinal: _ordinal, createdAt: _createdAt, ...reviewFields } = approvedReview;
      await prisma.taskSourceReview.create({ data: { ...reviewFields, id: randomUUID(), requestHash: digest(randomUUID()), action: "withdraw" } });
      assert.equal((await request(root, { headers: agentHeaders })).status, 403);
      assert.equal((await request(`${root}/append`, { method: "POST", headers: agentHeaders, body: appendBody })).status, 403);
      assert.equal((await request(root, { headers: ownerHeaders })).status, 200);
      assert.equal((await request(`${root}/append`, { method: "POST", headers: agentHeaders,
        body: JSON.stringify({ requestId: randomUUID(), expectedRevision: "r2", text: "Another edit" }) })).status, 409);
      assert.equal(posts, 1);
      const generic = await request(`/v1/google-drive/files/${file.id}/content`, { headers: agentHeaders });
      assert.equal(generic.status, 403);
      // Google cannot make the Doc write conditional on the Drive parent. Move
      // the second synthetic Doc during batchUpdate and retain the conflict.
      externalId = `fixture-${randomUUID()}`;
      const movedTask = await prisma.task.create({ data: { workspaceId, title: "Moved Google Doc", assignedWorkforceEntityId: agent.id } });
      const movedFile = await prisma.googleDriveFile.create({ data: { workspaceId, provider: "google_drive", externalId,
        name: "Moving document", mimeType: "application/vnd.google-apps.document", parentExternalId: "root", syncStatus: "synced" } });
      const movedSnapshot = await prisma.googleDriveContentSnapshot.create({ data: { workspaceId, googleDriveFileId: movedFile.id,
        sourceRevisionId: "r1", contentKind: "google_doc", scanStatus: "completed", extractedText: "Original" } });
      revision = "r1"; content = "Original"; folder = "root"; posts = 0; moveDuringPost = true;
      const movedRoot = `/v1/google-drive/tasks/${movedTask.id}/docs/${movedFile.id}/governed`;
      const movedMandateBody = JSON.stringify({ requestId: randomUUID(), sourceSnapshotId: movedSnapshot.id, credentialId: key.id,
        expectedRevision: "r1", classification: "fact", validUntil: new Date(Date.now() + 86400000).toISOString() });
      const movedProof = await request("/v1/auth/reauth", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path: `${movedRoot}/mandate`, bodyDigest: digest(movedMandateBody) }) });
      assert.equal(movedProof.status, 200);
      assert.equal((await request(`${movedRoot}/mandate`, { method: "POST",
        headers: { ...ownerHeaders, "X-Owner-Action-Proof": movedProof.body.data.proof }, body: movedMandateBody })).status, 201);
      const movedAppendBody = JSON.stringify({ requestId: randomUUID(), expectedRevision: "r1", text: "\nMoved addition" });
      const movedResult = await request(`${movedRoot}/append`, { method: "POST", headers: agentHeaders, body: movedAppendBody });
      assert.equal(movedResult.status, 201, JSON.stringify(movedResult.body));
      assert.equal(movedResult.body.data.state, "conflict");
      assert.equal(movedResult.body.data.errorCode, "google_doc_scope_changed");
      assert.equal(posts, 1);
      assert.equal((await request(`${movedRoot}/append`, { method: "POST", headers: agentHeaders, body: movedAppendBody })).status, 201);
      assert.equal(posts, 1);
      const movedRead = await request(movedRoot, { headers: ownerHeaders });
      assert.equal(movedRead.status, 200);
      assert.equal(movedRead.body.data.status, "conflict");
      assert.equal(movedRead.body.data.intent.state, "conflict");
      assert.equal(movedRead.body.data.content, null);
      await prisma.googleDocEditIntent.update({ where: { id: movedRead.body.data.intent.id },
        data: { state: "posting", createdAt: new Date(Date.now() - 120_000) } });
      const inFlight = await request(movedRoot, { headers: ownerHeaders });
      assert.equal(inFlight.body.data.intent.state, "posting");
      assert.equal(inFlight.body.data.intent.possibleLateWrite, true);
      assert.equal((await request(`${movedRoot}/intents/${movedRead.body.data.intent.id}/close`,
        { method: "POST", headers: ownerHeaders })).status, 409);
      // A later return to the same assignee must not resurrect an old grant.
      externalId = `fixture-${randomUUID()}`;
      const reassignedTask = await prisma.task.create({ data: { workspaceId, title: "Reassigned Google Doc", assignedWorkforceEntityId: agent.id } });
      const reassignedFile = await prisma.googleDriveFile.create({ data: { workspaceId, provider: "google_drive", externalId,
        name: "Reassigned document", mimeType: "application/vnd.google-apps.document", parentExternalId: "root", syncStatus: "synced" } });
      const reassignedSnapshot = await prisma.googleDriveContentSnapshot.create({ data: { workspaceId, googleDriveFileId: reassignedFile.id,
        sourceRevisionId: "r1", contentKind: "google_doc", scanStatus: "completed", extractedText: "Original" } });
      revision = "r1"; content = "Original"; folder = "root"; moveDuringPost = false;
      const reassignedRoot = `/v1/google-drive/tasks/${reassignedTask.id}/docs/${reassignedFile.id}/governed`;
      const reassignedBody = JSON.stringify({ requestId: randomUUID(), sourceSnapshotId: reassignedSnapshot.id, credentialId: key.id,
        expectedRevision: "r1", classification: "fact", validUntil: new Date(Date.now() + 86400000).toISOString() });
      const reassignedProof = await request("/v1/auth/reauth", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path: `${reassignedRoot}/mandate`, bodyDigest: digest(reassignedBody) }) });
      assert.equal(reassignedProof.status, 200);
      assert.equal((await request(`${reassignedRoot}/mandate`, { method: "POST",
        headers: { ...ownerHeaders, "X-Owner-Action-Proof": reassignedProof.body.data.proof }, body: reassignedBody })).status, 201);
      assert.equal((await request(reassignedRoot, { headers: agentHeaders })).status, 200);
      const otherAgent = await prisma.workforceEntity.create({ data: { workspaceId, name: "Replacement Doc agent",
        slug: `doc-${randomUUID()}`, type: "agent", source: "system", status: "active" } });
      await prisma.task.update({ where: { id: reassignedTask.id }, data: { assignedWorkforceEntityId: otherAgent.id } });
      assert.equal((await request(reassignedRoot, { headers: agentHeaders })).status, 403);
      await prisma.task.update({ where: { id: reassignedTask.id }, data: { assignedWorkforceEntityId: agent.id } });
      assert.equal((await request(reassignedRoot, { headers: agentHeaders })).status, 403);
      assert.equal((await request(reassignedRoot, { headers: ownerHeaders })).body.data.status, "mandate_stale");
      externalId = `fixture-${randomUUID()}`;
      const uncertainTask = await prisma.task.create({ data: { workspaceId, title: "Uncertain Google write", assignedWorkforceEntityId: agent.id } });
      const uncertainFile = await prisma.googleDriveFile.create({ data: { workspaceId, provider: "google_drive", externalId,
        name: "Uncertain document", mimeType: "application/vnd.google-apps.document", parentExternalId: "root", syncStatus: "synced" } });
      const uncertainSnapshot = await prisma.googleDriveContentSnapshot.create({ data: { workspaceId, googleDriveFileId: uncertainFile.id,
        sourceRevisionId: "r1", contentKind: "google_doc", scanStatus: "completed", extractedText: "Original" } });
      revision = "r1"; content = "Original"; folder = "root"; posts = 0; rejectPost = true;
      const uncertainRoot = `/v1/google-drive/tasks/${uncertainTask.id}/docs/${uncertainFile.id}/governed`;
      const uncertainMandateBody = JSON.stringify({ requestId: randomUUID(), sourceSnapshotId: uncertainSnapshot.id, credentialId: key.id,
        expectedRevision: "r1", classification: "fact", validUntil: new Date(Date.now() + 86400000).toISOString() });
      const uncertainProof = await request("/v1/auth/reauth", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path: `${uncertainRoot}/mandate`, bodyDigest: digest(uncertainMandateBody) }) });
      assert.equal(uncertainProof.status, 200);
      assert.equal((await request(`${uncertainRoot}/mandate`, { method: "POST",
        headers: { ...ownerHeaders, "X-Owner-Action-Proof": uncertainProof.body.data.proof }, body: uncertainMandateBody })).status, 201);
      const uncertainAppendBody = JSON.stringify({ requestId: randomUUID(), expectedRevision: "r1", text: "\nUncertain addition" });
      const uncertainResult = await request(`${uncertainRoot}/append`, { method: "POST", headers: agentHeaders, body: uncertainAppendBody });
      assert.equal(uncertainResult.status, 201);
      assert.equal(uncertainResult.body.data.state, "uncertain");
      assert.equal(posts, 1);
      assert.equal((await request(`${uncertainRoot}/append`, { method: "POST", headers: agentHeaders, body: uncertainAppendBody })).body.data.state, "uncertain");
      assert.equal(posts, 1);
      assert.equal((await request(uncertainRoot, { headers: ownerHeaders })).body.data.intent.state, "uncertain");
      await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date(), active: false } });
      assert.equal((await request(root, { headers: agentHeaders })).status, 403);
      assert.equal((await request(root, { headers: ownerHeaders })).status, 200);
      assert.equal(rejectPost, true);
      assert.equal(moveDuringPost, false);
    } finally { globalThis.fetch = originalFetch; }
  });
}
