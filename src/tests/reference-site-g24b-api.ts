import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { referenceSitePackageDigest } from "../modules/product-engineering/reference-site-package";
import { referenceSiteMetadata } from "../modules/product-engineering/reference-site-contract";
import { referenceSiteChecklistForExecution } from "../modules/product-engineering/reference-site-runtime-context";
import { readyEditorData } from "../modules/agent-runtime/task-execution-readiness";
import { watchReadySources } from "../modules/agent-runtime/ready-source-watch";
import { digest } from "../auth/owner-action-proof";

export function registerReferenceSiteG24bTests(helpers: {
  request: (path: string, init?: RequestInit) => Promise<{ status: number; body: any }>;
  registerOwner: (email: string, workspaceName: string) => Promise<{ token: string; workspace: { id: string } }>;
}) {
  const { request, registerOwner } = helpers;
  test("G24b independently reviewed site Finding becomes one protected versioned Procedure checklist", async () => {
    const priorUrls = process.env.ROOST_REFERENCE_SITE_URLS;
    const siteUrl = "https://checklist.example.org/";
    process.env.ROOST_REFERENCE_SITE_URLS = JSON.stringify([siteUrl, "https://second.example.org/"]);
    try {
      const owner = await registerOwner(`checklist-${randomUUID()}@example.test`, "Checklist fixture");
      const workspaceId = owner.workspace.id, ownerHeaders = { Authorization: `Bearer ${owner.token}` };
      const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: "Site analyst",
        slug: `site-${randomUUID()}`, type: "agent", source: "manual", status: "active" } });
      const task = await prisma.task.create({ data: { workspaceId, title: "Inspect a fictional page",
        assignedWorkforceEntityId: agent.id } });
      const otherTask = await prisma.task.create({ data: { workspaceId, title: "Unrelated page task",
        assignedWorkforceEntityId: agent.id } });
      await prisma.procedure.createMany({ data: Array.from({ length: 55 }, (_, index) => ({
        workspaceId, name: `Unrelated fixture procedure ${index}`, purpose: "Catalog limit fixture", status: "active" })) });
      const key = await request("/v1/api-keys/agent-credentials", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ requestId: randomUUID(), agentId: agent.id, name: "Checklist fixture key",
          expiresAt: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(key.status, 201, JSON.stringify(key.body));
      const agentHeaders = { "X-API-Key": key.body.data.key };
      const packageValue = { schemaVersion: "roost-reference-site-package-v1", source: {
        provider: "openai_sites", projectId: "appgprj_checklistfixture",
        versionId: "appgprj_checklistfixture~appgver_fixturev1", versionNumber: 1,
        commitSha: "a".repeat(40), archiveSha256: "b".repeat(64),
        deploymentId: "appgdep_checklistfixture", publishedUrl: siteUrl },
        preparedAt: new Date().toISOString(), observations: [{ id: "primary-action", category: "journey",
          route: "/", language: "en", text: "A visible primary action opens the intended detail panel.",
          evidence: [{ kind: "source", ref: "src/App.tsx", sha256: "c".repeat(64),
            observedAt: new Date().toISOString(), scope: "source_only" },
          { kind: "supervised_click", ref: "evidence/click.json", sha256: "d".repeat(64),
            observedAt: new Date().toISOString(), scope: "supervised_result", result: "Detail panel opened after the click." }] },
        { id: "detail-navigation", category: "journey", route: "/", language: "en",
          text: "Navigation from the detail panel opens the declared intent view.",
          evidence: [{ kind: "source", ref: "src/Detail.tsx", sha256: "e".repeat(64),
            observedAt: new Date().toISOString(), scope: "source_only" }] }],
        unknowns: ["Keyboard behavior was not inspected."] };
      const packageDigest = referenceSitePackageDigest(packageValue);
      assert.equal(referenceSiteMetadata.safeParse({ referenceUrl: siteUrl, providerVersion: "v1",
        sourceKind: "openai_sites", sourceId: "appgprj_checklistfixture",
        package: { ...packageValue, source: { ...packageValue.source,
          publishedUrl: "https://unapproved.example.org/" } } }).success, false);
      const siteCreated = await request("/v1/company-records", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ recordType: "reference_site", title: "Fictional checklist site", status: "active",
          description: "Fictional saved site version with a visible primary action.",
          source: "owner_note", metadata: { referenceUrl: siteUrl, providerVersion: "v1",
            sourceKind: "openai_sites", sourceId: "appgprj_checklistfixture", package: packageValue } }) });
      assert.equal(siteCreated.status, 201, JSON.stringify(siteCreated.body));
      const site = siteCreated.body.data;
      const sourceReview = await request(`/v1/company-records/${site.id}/context-reviews`, {
        method: "POST", headers: ownerHeaders, body: JSON.stringify({ requestId: randomUUID(), taskId: task.id,
          expectedRevision: site.updatedAt, action: "approve", classification: "observation",
          provenance: "Owner-selected fictional page", environment: "isolated_test",
          verificationMethod: "Fictional saved version and supervised click", verificationRef: "fixture-click",
          inclusionReason: "Review visible action pattern", validUntil: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(sourceReview.status, 201, JSON.stringify(sourceReview.body));
      const siteRoot = `/v1/product-engineering/tasks/${task.id}/reference-sites/${site.id}`;
      const createdFinding = await request(`${siteRoot}/findings`, { method: "POST", headers: agentHeaders,
        body: JSON.stringify({ requestId: randomUUID(), packageDigest, observationId: "primary-action",
          siteRevision: site.updatedAt, sourceReviewId: sourceReview.body.data.id,
          title: "Visible primary action", category: "journey", language: "en",
          observed: "The visible primary action opened a detail panel in a supervised click.",
          sourceExcerpt: "visible primary action", interpretation: "The detail view follows the action.",
          uncertainty: "Keyboard use remains unknown.", applicability: "Candidate for another public page after review." }) });
      assert.equal(createdFinding.status, 201, JSON.stringify(createdFinding.body));
      const findingId = createdFinding.body.data.record.id;
      const listed = await request(`${siteRoot}/findings`, { headers: ownerHeaders });
      assert.equal(listed.status, 200);
      assert.equal(listed.body.data.items[0].verification, "unverified");
      const findingDigest = listed.body.data.items[0].findingDigest;
      const reviewPath = `${siteRoot}/findings/${findingId}/review`;
      const reviewInput = { requestId: randomUUID(), expectedFindingDigest: findingDigest,
        verdict: "confirmed", rationale: "The saved evidence supports this specific observation.",
        evidence: "Supervised click opened the detail panel; keyboard use remains unknown." };
      const selfReview = await request(reviewPath, { method: "POST", headers: agentHeaders,
        body: JSON.stringify(reviewInput) });
      assert.equal(selfReview.status, 403);
      const wrongDigest = await request(reviewPath, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ ...reviewInput, requestId: randomUUID(), expectedFindingDigest: "f".repeat(64) }) });
      assert.equal(wrongDigest.status, 409);
      const reviewed = await request(reviewPath, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify(reviewInput) });
      assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
      assert.equal(reviewed.body.data.review.verdict, "confirmed");
      const reviewedAgain = await request(reviewPath, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify(reviewInput) });
      assert.equal(reviewedAgain.status, 200);
      assert.equal(reviewedAgain.body.data.replayed, true);
      const reviewedList = await request(`${siteRoot}/findings`, { headers: ownerHeaders });
      assert.equal(reviewedList.body.data.items[0].verification, "confirmed");
      const checklistPath = `/v1/product-engineering/tasks/${task.id}/reference-site-checklist`;
      const item = { findingId, itemId: "public-primary-action", instruction: "Check the visible primary action.",
        applicability: "Public entry pages with a single primary action.",
        acceptanceCriterion: "A supervised click opens the intended detail or intent view.",
        expectedInput: "Saved page version and declared destination for the action.",
        expectedOutput: "Evidence of the visible action and its observed destination.",
        rollback: "Restore the previous approved action and navigation if the destination differs." };
      const foreignPreview = await request(`/v1/product-engineering/tasks/${otherTask.id}/reference-site-checklist/preview`,
        { method: "POST", headers: ownerHeaders, body: JSON.stringify({ items: [item] }) });
      assert.equal(foreignPreview.status, 404);
      const preview = await request(`${checklistPath}/preview`, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ items: [item] }) });
      assert.equal(preview.status, 200, JSON.stringify(preview.body));
      assert.equal(preview.body.data.preview.items[0].source.packageDigest, packageDigest);
      assert.deepEqual(preview.body.data.preview.items[0].source.evidenceScopes, ["source_only", "supervised_result"]);
      const badAccept = await request(`${checklistPath}/accept`, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ requestId: randomUUID(), expectedDigest: "f".repeat(64), items: [item] }) });
      assert.equal(badAccept.status, 409);
      const acceptInput = { requestId: randomUUID(), expectedDigest: preview.body.data.digest, items: [item] };
      const accepted = await request(`${checklistPath}/accept`, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify(acceptInput) });
      assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
      assert.equal(accepted.body.data.version, 1);
      const procedureId = accepted.body.data.procedureId;
      const verifier = await prisma.workforceEntity.create({ data: { workspaceId,
        name: "Independent checklist verifier", slug: `checklist-verifier-${randomUUID()}`,
        type: "agent", source: "manual", status: "active", role: "site evidence reviewer",
        skillIndex: ["application audit"], authorityScope: ["task_verification"] } });
      const qualificationPath = `/v1/agent-runtime/tasks/${task.id}/verifier-qualification`;
      assert.equal((await request(qualificationPath, { headers: agentHeaders })).status, 403);
      const qualifiedView = await request(qualificationPath, { headers: ownerHeaders });
      assert.equal(qualifiedView.status, 200, JSON.stringify(qualifiedView.body));
      assert.equal(qualifiedView.body.data.canQualify, true);
      assert.deepEqual(qualifiedView.body.data.checklist.reviewIds, [reviewed.body.data.review.id]);
      const qualificationInput = { action: "qualify", requestId: randomUUID(),
        expectedVersion: qualifiedView.body.data.expectedVersion, verifierId: verifier.id,
        contract: { executionClass: "roost-company-information-runtime-v1",
          singleTask: { contractId: `roost-task:${task.id}` }, assignment: { agentId: agent.id },
          taskRoles: { executor: { id: agent.id, revision: qualifiedView.body.data.executor.revision },
            verifier: { id: verifier.id, revision: qualifiedView.body.data.candidates[0].revision } },
          procedures: { items: [{ id: procedureId, revision: "1" }] } },
        evidence: "The selected verifier has the application audit skill and an independent task-verification mandate.",
        rationale: "Authorize one independent review of the saved checklist evidence for this task only." };
      const qualificationBody = JSON.stringify(qualificationInput);
      assert.equal((await request(qualificationPath, { method: "POST", headers: ownerHeaders,
        body: qualificationBody })).status, 403);
      const proof = await request("/v1/auth/reauth", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path: qualificationPath,
          bodyDigest: digest(qualificationBody) }) });
      assert.equal(proof.status, 200, JSON.stringify(proof.body));
      const qualified = await request(qualificationPath, { method: "POST",
        headers: { ...ownerHeaders, "X-Owner-Action-Proof": proof.body.data.proof }, body: qualificationBody });
      assert.equal(qualified.status, 201, JSON.stringify(qualified.body));
      assert.equal(qualified.body.data.current.verifierId, verifier.id);
      assert.equal((await prisma.$queryRaw<Array<{ value: unknown }>>`SELECT task_verifier_qualification_current(${task.id}::uuid,${verifier.id}::uuid) AS value`)[0]?.value != null, true);
      const replayProof = await request("/v1/auth/reauth", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path: qualificationPath,
          bodyDigest: digest(qualificationBody) }) });
      const replayQualification = await request(qualificationPath, { method: "POST",
        headers: { ...ownerHeaders, "X-Owner-Action-Proof": replayProof.body.data.proof }, body: qualificationBody });
      assert.equal(replayQualification.status, 200);
      assert.equal(replayQualification.body.data.replayed, true);
      const projection = await prisma.$transaction(async db => {
        const watched = watchReadySources(db);
        const value = await referenceSiteChecklistForExecution(watched.db, db,
          workspaceId, task.id, agent.id, procedureId, "1");
        await watched.persist(task.id);
        return value;
      });
      assert.equal(projection?.procedure.decisionId, accepted.body.data.decision.id);
      assert.equal(projection?.items[0].itemId, item.itemId);
      assert.equal(projection?.items[0].observation.evidence[1].scope, "supervised_result");
      assert.equal(projection?.items[0].source.packageDigest, packageDigest);
      const proofEditor = await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&executionClass=roost-company-information-runtime-v1`,
        { headers: ownerHeaders });
      assert.equal(proofEditor.status, 200, JSON.stringify(proofEditor.body));
      assert.equal(proofEditor.body.data.editor.procedures.find((entry: any) => entry.id === procedureId)?.eligible, true);
      const foreignEditor = await request(`/v1/agent-runtime/tasks/${otherTask.id}/execution-readiness?editor=1&executionClass=roost-company-information-runtime-v1`,
        { headers: ownerHeaders });
      assert.equal(foreignEditor.status, 200, JSON.stringify(foreignEditor.body));
      assert.equal(foreignEditor.body.data.editor.procedures.find((entry: any) => entry.id === procedureId), undefined);
      assert.equal(foreignEditor.body.data.editor.referenceSiteChecklist.status, "none");
      assert.equal(await prisma.$transaction(db => referenceSiteChecklistForExecution(db, db,
        workspaceId, otherTask.id, agent.id, procedureId, "1")), null);
      assert.equal(await prisma.$transaction(db => referenceSiteChecklistForExecution(db, db,
        workspaceId, task.id, randomUUID(), procedureId, "1")), null);
      assert.equal(await prisma.$transaction(db => referenceSiteChecklistForExecution(db, db,
        workspaceId, task.id, agent.id, procedureId, "2")), null);
      const replay = await request(`${checklistPath}/accept`, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify(acceptInput) });
      assert.equal(replay.status, 200);
      assert.equal(replay.body.data.replayed, true);
      const agentRead = await request(checklistPath, { headers: agentHeaders });
      assert.equal(agentRead.status, 200, JSON.stringify(agentRead.body));
      assert.equal(agentRead.body.data.status, "active");
      assert.equal(agentRead.body.data.procedure.items[0].validationRule.itemId, item.itemId);
      const genericSources = await request(`/v1/agent-runtime/tasks/${task.id}/sources`, { headers: agentHeaders });
      assert.equal(genericSources.status, 200, JSON.stringify(genericSources.body));
      assert.ok(!genericSources.body.data.sources.some((source: any) => source.content.id === procedureId));
      const otherAgentRead = await request(`/v1/product-engineering/tasks/${otherTask.id}/reference-site-checklist`,
        { headers: agentHeaders });
      assert.equal(otherAgentRead.status, 200, JSON.stringify(otherAgentRead.body));
      assert.equal(otherAgentRead.body.data.procedure, null);
      const contractView = await request(`/v1/process-core/procedures/${procedureId}/contracts`, { headers: ownerHeaders });
      assert.equal(contractView.status, 409, JSON.stringify(contractView.body));
      const compositionView = await request(`/v1/agent-runtime/tasks/${task.id}/procedure-composition`, { headers: ownerHeaders });
      assert.equal(compositionView.status, 200, JSON.stringify(compositionView.body));
      assert.ok(!compositionView.body.data.procedures.some((procedure: any) => procedure.id === procedureId));
      const acceptedProcedure = await prisma.procedure.findUniqueOrThrow({ where: { id: procedureId } });
      const editor = await prisma.$transaction(db => readyEditorData(db, workspaceId, task.id,
        undefined, undefined, "roost-company-information-runtime-v1"));
      if (!editor || "error" in editor) throw new Error("reference_site_ready_editor_unavailable");
      assert.equal(editor.referenceSiteChecklist.status, "current");
      assert.equal(editor.referenceSiteChecklist.id, procedureId);
      assert.equal(editor.referenceSiteChecklist.decisionId, accepted.body.data.decision.id);
      assert.ok(editor.procedures.some(candidate => candidate.id === procedureId && candidate.eligible));
      assert.equal(editor.procedures.filter(candidate => "kind" in candidate && candidate.kind === "reference_site_checklist").length, 1);
      const genericApproval = await request("/v1/agent-runtime/source-reviews", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ requestId: randomUUID(), taskId: otherTask.id, sourceType: "procedure",
          sourceId: procedureId, expectedRevision: acceptedProcedure.updatedAt.toISOString(), action: "approve",
          classification: "observation", provenance: "Fictional checklist", environment: "isolated_test",
          verificationMethod: "Fixture review", verificationRef: "fixture-review",
          inclusionReason: "Try cross-task source review", validUntil: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(genericApproval.status, 400, JSON.stringify(genericApproval.body));
      const genericPatch = await request(`/v1/process-core/procedures/${procedureId}`, { method: "PATCH",
        headers: ownerHeaders, body: JSON.stringify({ purpose: "Changed after acceptance" }) });
      assert.equal(genericPatch.status, 403);
      const genericActivate = await request(`/v1/process-core/procedures/${procedureId}/actions/activate`, {
        method: "POST", headers: ownerHeaders, body: "{}" });
      assert.equal(genericActivate.status, 403);
      const genericArchive = await request(`/v1/process-core/procedures/${procedureId}/actions/archive`, {
        method: "POST", headers: ownerHeaders, body: "{}" });
      assert.equal(genericArchive.status, 403);
      await assert.rejects(prisma.$executeRaw`UPDATE procedure_steps SET instruction='Changed by SQL'
        WHERE procedure_id=${procedureId}::uuid`, /reference_site_checklist_immutable/);
      await assert.rejects(prisma.$executeRaw`TRUNCATE reference_site_finding_reviews`,
        /reference_site_checklist_receipt_immutable/);
      await assert.rejects(prisma.$executeRaw`TRUNCATE reference_site_checklist_decisions`,
        /reference_site_checklist_receipt_immutable|cannot truncate a table referenced/);
      const ownerUserId = (await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).ownerUserId;
      await assert.rejects(prisma.$transaction(async db => {
        await db.$executeRawUnsafe("ALTER TABLE procedure_contract_versions DISABLE TRIGGER composition_insert");
        await db.$executeRaw`INSERT INTO procedure_contract_versions
          (id,workspace_id,procedure_id,version,source_version,body,rationale,actor_user_id,request_id,request_hash)
          VALUES (${randomUUID()}::uuid,${workspaceId}::uuid,${procedureId}::uuid,1,${"a".repeat(64)},'{}'::jsonb,
            'Attempt bypass',${ownerUserId}::uuid,${randomUUID()}::uuid,${"b".repeat(64)})`;
      }), /reference_site_checklist_composition_denied/);
      await assert.rejects(prisma.$transaction(async db => {
        await db.$executeRawUnsafe("ALTER TABLE task_composition_selections DISABLE TRIGGER composition_insert");
        await db.$executeRaw`INSERT INTO task_composition_selections
          (id,workspace_id,task_id,operation,version,scope_id,base_procedure_id,rationale,actor_user_id,request_id,request_hash)
          VALUES (${randomUUID()}::uuid,${workspaceId}::uuid,${task.id}::uuid,'runtime_execute',1,${randomUUID()}::uuid,
            ${procedureId}::uuid,'Attempt bypass',${ownerUserId}::uuid,${randomUUID()}::uuid,${"c".repeat(64)})`;
      }), /reference_site_checklist_composition_denied/);
      const secondFinding = await request(`${siteRoot}/findings`, { method: "POST", headers: agentHeaders,
        body: JSON.stringify({ requestId: randomUUID(), packageDigest, observationId: "detail-navigation",
          siteRevision: site.updatedAt, sourceReviewId: sourceReview.body.data.id,
          title: "Navigation to intent", category: "journey", language: "en",
          observed: "The detail panel navigation leads to the declared intent view in the source.",
          sourceExcerpt: "Navigation from the detail panel", interpretation: "Intent route is declared.",
          uncertainty: "A supervised click was not performed for this observation.",
          applicability: "Pages with a detail-to-intent path." }) });
      assert.equal(secondFinding.status, 201, JSON.stringify(secondFinding.body));
      const secondFindingId = secondFinding.body.data.record.id;
      const secondList = await request(`${siteRoot}/findings`, { headers: ownerHeaders });
      const secondDigest = secondList.body.data.items.find((candidate: any) => candidate.id === secondFindingId)?.findingDigest;
      assert.ok(secondDigest);
      const secondReview = await request(`${siteRoot}/findings/${secondFindingId}/review`, { method: "POST",
        headers: ownerHeaders, body: JSON.stringify({ requestId: randomUUID(), expectedFindingDigest: secondDigest,
          verdict: "confirmed", rationale: "The saved source supports the declared route, not a click result.",
          evidence: "Source-only path evidence; supervised navigation remains unverified." }) });
      assert.equal(secondReview.status, 200, JSON.stringify(secondReview.body));
      const revisedItem = { ...item, instruction: "Check the current primary action and its destination." };
      const secondItem = { findingId: secondFindingId, itemId: "detail-intent-navigation",
        instruction: "Check navigation from the detail panel to the intent view.",
        applicability: "Public pages with an intent route.",
        acceptanceCriterion: "Source declares the route; supervised navigation must be verified separately.",
        expectedInput: "Saved page source and route definition.",
        expectedOutput: "Source evidence of the declared route, marked source only.",
        rollback: "Restore the previously approved detail route if the destination differs." };
      const replacementPreview = await request(`${checklistPath}/preview`, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ items: [revisedItem, secondItem] }) });
      assert.equal(replacementPreview.status, 200, JSON.stringify(replacementPreview.body));
      const replacement = await request(`${checklistPath}/accept`, { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ requestId: randomUUID(), expectedDigest: replacementPreview.body.data.digest,
          items: [revisedItem, secondItem] }) });
      assert.equal(replacement.status, 200, JSON.stringify(replacement.body));
      assert.equal(replacement.body.data.version, 2);
      assert.equal((await prisma.$queryRaw<Array<{ value: unknown }>>`SELECT task_verifier_qualification_current(${task.id}::uuid,${verifier.id}::uuid) AS value`)[0]?.value, null);
      const renewedQualificationView = await request(qualificationPath, { headers: ownerHeaders });
      assert.equal(renewedQualificationView.status, 200);
      const renewedQualificationBody = JSON.stringify({ ...qualificationInput, requestId: randomUUID(),
        expectedVersion: renewedQualificationView.body.data.expectedVersion,
        contract: { ...qualificationInput.contract, procedures: { items: [{ id: replacement.body.data.procedureId, revision: "2" }] } } });
      const renewedProof = await request("/v1/auth/reauth", { method: "POST", headers: ownerHeaders,
        body: JSON.stringify({ password: "very-strong-password", method: "POST", path: qualificationPath,
          bodyDigest: digest(renewedQualificationBody) }) });
      assert.equal(renewedProof.status, 200);
      const renewedQualification = await request(qualificationPath, { method: "POST",
        headers: { ...ownerHeaders, "X-Owner-Action-Proof": renewedProof.body.data.proof },
        body: renewedQualificationBody });
      assert.equal(renewedQualification.status, 201, JSON.stringify(renewedQualification.body));
      assert.equal(renewedQualification.body.data.current.verifierId, verifier.id);
      await prisma.workforceEntity.update({ where: { id: verifier.id }, data: { role: "changed reviewer role" } });
      assert.equal((await prisma.$queryRaw<Array<{ value: unknown }>>`SELECT task_verifier_qualification_current(${task.id}::uuid,${verifier.id}::uuid) AS value`)[0]?.value, null);
      assert.equal((await prisma.procedure.findUniqueOrThrow({ where: { id: procedureId } })).status, "retired");
      assert.equal(await prisma.$transaction(db => referenceSiteChecklistForExecution(db, db,
        workspaceId, task.id, agent.id, procedureId, "1")), null);
      assert.equal((await prisma.$transaction(db => referenceSiteChecklistForExecution(db, db,
        workspaceId, task.id, agent.id, replacement.body.data.procedureId, "2")))?.items.length, 2);
      const currentChecklist = await request(checklistPath, { headers: agentHeaders });
      assert.equal(currentChecklist.status, 200, JSON.stringify(currentChecklist.body));
      assert.equal(currentChecklist.body.data.procedure.version, 2);
      assert.equal(currentChecklist.body.data.procedure.items.length, 2);
      const changed = await request(`/v1/company-records/${site.id}`, { method: "PATCH", headers: ownerHeaders,
        body: JSON.stringify({ metadata: { ...site.metadata,
          package: { ...packageValue, unknowns: ["The source package changed after review."] } } }) });
      assert.equal(changed.status, 200, JSON.stringify(changed.body));
      const stale = await request(checklistPath, { headers: agentHeaders });
      assert.equal(stale.status, 200, JSON.stringify(stale.body));
      assert.equal(stale.body.data.status, "stale");
      assert.equal(stale.body.data.procedure, null);
      assert.equal(await prisma.$transaction(db => referenceSiteChecklistForExecution(db, db,
        workspaceId, task.id, agent.id, replacement.body.data.procedureId, "2")), null);
      const staleEditor = await prisma.$transaction(db => readyEditorData(db, workspaceId, task.id,
        undefined, undefined, "roost-company-information-runtime-v1"));
      if (!staleEditor || "error" in staleEditor) throw new Error("reference_site_ready_editor_unavailable");
      assert.equal(staleEditor.referenceSiteChecklist.status, "stale");
      assert.equal(staleEditor.referenceSiteChecklist.id, replacement.body.data.procedureId);
      const revisedSite = changed.body.data;
      const renewedSource = await request(`/v1/company-records/${site.id}/context-reviews`, {
        method: "POST", headers: ownerHeaders, body: JSON.stringify({ requestId: randomUUID(), taskId: task.id,
          expectedRevision: revisedSite.updatedAt, action: "approve", classification: "observation",
          provenance: "Renewed fictional page", environment: "isolated_test",
          verificationMethod: "Fictional saved version", verificationRef: "fixture-renewal",
          inclusionReason: "Check stale prior finding", validUntil: new Date(Date.now() + 86400000).toISOString() }) });
      assert.equal(renewedSource.status, 201, JSON.stringify(renewedSource.body));
      const staleOwnerFindings = await request(`${siteRoot}/findings`, { headers: ownerHeaders });
      assert.equal(staleOwnerFindings.status, 200);
      assert.equal(staleOwnerFindings.body.data.items[0].verification, "stale");
      const staleAgentFindings = await request(`${siteRoot}/findings`, { headers: agentHeaders });
      assert.equal(staleAgentFindings.status, 200);
      assert.equal(staleAgentFindings.body.data.items.length, 0);
    } finally {
      if (priorUrls === undefined) delete process.env.ROOST_REFERENCE_SITE_URLS;
      else process.env.ROOST_REFERENCE_SITE_URLS = priorUrls;
    }
  });
}
