import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { referenceSitePackageDigest } from "../modules/product-engineering/reference-site-package";

export function registerReferenceSiteG24aTests(helpers: {
  request: (path: string, init?: RequestInit) => Promise<{ status: number; body: any }>;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
}) {
  const { request, registerOwner } = helpers;
  test("G24a exact task and reviewed site admit one unverified Finding; stale scope and app actions deny", async () => {
    const priorUrls = process.env.ROOST_REFERENCE_SITE_URLS;
    const siteUrl = "https://first.example.org/";
    process.env.ROOST_REFERENCE_SITE_URLS = JSON.stringify([siteUrl, "https://second.example.org/"]);
    const sitePackage = { schemaVersion: "roost-reference-site-package-v1", source: {
      provider: "openai_sites", projectId: "appgprj_fixtureone",
      versionId: "appgprj_fixtureone~appgver_fixturev1", versionNumber: 1,
      commitSha: "a".repeat(40), archiveSha256: "b".repeat(64),
      deploymentId: "appgdep_fixtureone", publishedUrl: siteUrl },
      preparedAt: new Date().toISOString(), observations: [{ id: "primary-navigation", category: "journey",
        route: "/", language: "en", text: "A public landing page contains primary navigation and a menu.",
        evidence: [{ kind: "source", ref: "src/App.jsx", sha256: "c".repeat(64),
          observedAt: new Date().toISOString(), scope: "source_only" }] }],
      unknowns: ["Keyboard navigation was not inspected."] };
    const packageDigest = referenceSitePackageDigest(sitePackage);
    try {
      const owner = await registerOwner(`site-${randomUUID()}@example.test`, "Site fixture");
      const workspaceId = owner.workspace.id;
      const ownerHeaders = { Authorization: `Bearer ${owner.token}` };
      const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: "Site analyst",
        slug: `site-${randomUUID()}`, type: "agent", source: "manual", status: "active" } });
      const task = await prisma.task.create({ data: { workspaceId, title: "Inspect fictional site",
        assignedWorkforceEntityId: agent.id } });
      const otherTask = await prisma.task.create({ data: { workspaceId, title: "Another task",
        assignedWorkforceEntityId: agent.id } });
      const outsider = await prisma.workforceEntity.create({ data: { workspaceId, name: "Other analyst",
        slug: `other-${randomUUID()}`, type: "agent", source: "manual", status: "active" } });
      const issued = await request("/v1/api-keys/agent-credentials", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ requestId: randomUUID(), agentId: agent.id, name: "Site fixture key",
          expiresAt: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(issued.status, 201, JSON.stringify(issued.body));
      const agentHeaders = { "X-API-Key": issued.body.data.key };
      const otherIssued = await request("/v1/api-keys/agent-credentials", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ requestId: randomUUID(), agentId: outsider.id, name: "Other analyst key",
          expiresAt: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(otherIssued.status, 201);
      const created = await request("/v1/company-records", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ recordType: "reference_site", title: "Fictional reference site",
          description: "A public fixture", source: "owner_note", status: "active",
          metadata: { referenceUrl: siteUrl, providerVersion: "v1", sourceKind: "openai_sites",
            sourceId: "appgprj_fixtureone", package: sitePackage } }) });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const site = created.body.data;
      const duplicate = await request("/v1/company-records", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ recordType: "reference_site", title: "Duplicate fixture site",
          status: "active", metadata: { referenceUrl: siteUrl, providerVersion: "v1",
            sourceKind: "openai_sites", sourceId: "appgprj_fixtureone", package: sitePackage } }) });
      assert.equal(duplicate.status, 409);
      assert.equal(duplicate.body.error, "reference_site_duplicate");
      const root = `/v1/product-engineering/tasks/${task.id}/reference-sites`;
      const ownerPreview = await request(`${root}/${site.id}/package`, { headers: ownerHeaders });
      assert.equal(ownerPreview.status, 200, JSON.stringify(ownerPreview.body));
      assert.equal(ownerPreview.body.data.source.sourceReviewId, null);
      const agentBeforeApproval = await request(`${root}/${site.id}/package`, { headers: agentHeaders });
      assert.equal(agentBeforeApproval.status, 403);
      const review = await request(`/v1/company-records/${site.id}/context-reviews`, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ requestId: randomUUID(), taskId: task.id, expectedRevision: site.updatedAt,
          action: "approve", classification: "observation", provenance: "Owner-selected public fixture",
          environment: "isolated_test", verificationMethod: "Public page review", verificationRef: "fixture-public-page",
          inclusionReason: "Study visible navigation", validUntil: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(review.status, 201, JSON.stringify(review.body));
      const list = await request(root, { headers: agentHeaders });
      assert.equal(list.status, 200, JSON.stringify(list.body));
      assert.equal(list.body.data.items.length, 1);
      assert.equal(list.body.data.items[0].sourceReviewId, review.body.data.id);
      assert.equal(list.body.data.reviewEnvironment, "isolated_test");
      const manifest = await request("/v1/mcp/manifest", { headers: agentHeaders });
      assert.equal(manifest.status, 200, JSON.stringify(manifest.body));
      const siteTools = manifest.body.data.tools.filter((tool: { path: string }) =>
        tool.path.includes("/reference-sites"));
      assert.equal(siteTools.length, 4);
      assert.ok(siteTools.some((tool: { path: string; method: string }) =>
        tool.path.endsWith("/:siteId/package") && tool.method === "GET"));
      assert.ok(siteTools.some((tool: { path: string; method: string; inputSchema: { properties?: any } }) =>
        tool.path.endsWith("/:siteId/findings") && tool.method === "POST" &&
        tool.inputSchema?.properties?.body?.properties?.observationId));
      const unreviewed = await request(`/v1/product-engineering/tasks/${otherTask.id}/reference-sites`, { headers: agentHeaders });
      assert.equal(unreviewed.status, 200);
      assert.equal(unreviewed.body.data.items.length, 0);
      const wrongAgent = await request(root, { headers: { "X-API-Key": otherIssued.body.data.key } });
      assert.equal(wrongAgent.status, 403);

      {
        const preview = await request(`${root}/${site.id}/package`, { headers: agentHeaders });
        assert.equal(preview.status, 200, JSON.stringify(preview.body));
        assert.equal(preview.body.data.source.contentDigest, packageDigest);
        assert.equal(preview.body.data.package.observations[0].id, "primary-navigation");
        const command = { requestId: randomUUID(), packageDigest, observationId: "primary-navigation",
          siteRevision: site.updatedAt, sourceReviewId: review.body.data.id,
          title: "Visible navigation", category: "journey", language: "en",
          observed: "The landing page shows a primary navigation menu.", sourceExcerpt: "primary navigation",
          interpretation: "Visitors can use the menu to explore sections.",
          uncertainty: "Keyboard navigation was not tested.",
          applicability: "Might inform another site after independent review." };
        const post = (body: unknown) => request(`${root}/${site.id}/findings`, { method: "POST", headers: agentHeaders,
          body: JSON.stringify(body) });
        const submitted = await post(command);
        assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
        const findingId = submitted.body.data.record.id;
        const replay = await post(command);
        assert.equal(replay.status, 200, JSON.stringify(replay.body));
        assert.equal(replay.body.data.replayed, true);
        const altered = await post({ ...command, requestId: randomUUID(), packageDigest: "b".repeat(64) });
        assert.equal(altered.status, 409);
        const invented = await post({ ...command, requestId: randomUUID(), observationId: "invented-observation" });
        assert.equal(invented.status, 409);
        const otherTaskWrite = await request(`/v1/product-engineering/tasks/${otherTask.id}/reference-sites/${site.id}/findings`,
          { method: "POST", headers: agentHeaders, body: JSON.stringify({ ...command, requestId: randomUUID() }) });
        assert.equal(otherTaskWrite.status, 403);
        const found = await request(`${root}/${site.id}/findings`, { headers: ownerHeaders });
        assert.equal(found.status, 200);
        assert.equal(found.body.data.items.length, 1);
        assert.equal(found.body.data.items[0].verification, "unverified");
        const version = await prisma.$queryRaw<Array<{ id: string; application_id: string | null; reference_site_id: string }>>`
          SELECT id,application_id,reference_site_id FROM finding_versions WHERE observation_id=${findingId}::uuid`;
        assert.equal(version.length, 1);
        assert.equal(version[0].application_id, null);
        assert.equal(version[0].reference_site_id, site.id);
        await assert.rejects(prisma.$executeRaw`INSERT INTO finding_occurrences(id,observation_id,version_id,workspace_id,
          purpose,body,actor_kind,actor_id,credential_id,request_id,request_hash)
          VALUES(${randomUUID()}::uuid,${findingId}::uuid,${version[0].id}::uuid,${workspaceId}::uuid,
          'observation','{}'::jsonb,'agent',${agent.id}::uuid,${issued.body.data.id}::uuid,
          ${randomUUID()}::uuid,'a')`, /reference_site_action_denied/);
        const appAction = await request(`/v1/product-engineering/findings/${findingId}/actions`, { method: "POST",
          headers: ownerHeaders, body: JSON.stringify({ requestId: randomUUID(), action: "queue_deduplication",
            expectedVersion: "a".repeat(64), reason: "Site subject has no application Finding authority" }) });
        assert.equal(appAction.status, 404);
        const legacyView = await request(`/v1/product-engineering/findings/${findingId}`, { headers: ownerHeaders });
        assert.equal(legacyView.status, 404);
        const ownerDenied = await request(`${root}/${site.id}/findings`, { method: "POST", headers: ownerHeaders,
          body: JSON.stringify({ ...command, requestId: randomUUID() }) });
        assert.equal(ownerDenied.status, 403);
      }
      const secondPackage = { ...sitePackage, source: { ...sitePackage.source,
        projectId: "appgprj_fixturetwo", versionId: "appgprj_fixturetwo~appgver_fixturev2",
        deploymentId: "appgdep_fixturetwo", publishedUrl: "https://second.example.org/" },
        observations: [{ ...sitePackage.observations[0], id: "second-navigation" }] };
      const secondCreated = await request("/v1/company-records", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ recordType: "reference_site", title: "Second fictional site", status: "active",
          metadata: { referenceUrl: "https://second.example.org/", providerVersion: "v1",
            sourceKind: "openai_sites", sourceId: "appgprj_fixturetwo", package: secondPackage } }) });
      assert.equal(secondCreated.status, 201, JSON.stringify(secondCreated.body));
      const secondSite = secondCreated.body.data;
      const secondReview = await request(`/v1/company-records/${secondSite.id}/context-reviews`, {
        method: "POST", headers: ownerHeaders, body: JSON.stringify({ requestId: randomUUID(), taskId: task.id,
          expectedRevision: secondSite.updatedAt, action: "approve", classification: "observation",
          provenance: "Second selected fixture", environment: "isolated_test",
          verificationMethod: "Fixture source review", verificationRef: "second-fixture",
          inclusionReason: "Study second saved version", validUntil: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(secondReview.status, 201, JSON.stringify(secondReview.body));
      const bothSites = await request(root, { headers: agentHeaders });
      assert.equal(bothSites.status, 200);
      assert.equal(bothSites.body.data.items.length, 2);
      const secondRead = await request(`${root}/${secondSite.id}/package`, { headers: agentHeaders });
      assert.equal(secondRead.status, 200);
      assert.equal(secondRead.body.data.package.source.projectId, "appgprj_fixturetwo");
      const changed = await request(`/v1/company-records/${site.id}`, { method: "PATCH", headers: ownerHeaders,
        body: JSON.stringify({ metadata: { ...site.metadata,
          package: { ...sitePackage, unknowns: ["The source package changed after review."] } } }) });
      assert.equal(changed.status, 200);
      const stale = await request(root, { headers: agentHeaders });
      assert.equal(stale.status, 200);
      assert.equal(stale.body.data.items.length, 1);
      assert.equal(stale.body.data.items[0].id, secondSite.id);
    } finally {
      if (priorUrls === undefined) delete process.env.ROOST_REFERENCE_SITE_URLS;
      else process.env.ROOST_REFERENCE_SITE_URLS = priorUrls;
    }
  });
}
