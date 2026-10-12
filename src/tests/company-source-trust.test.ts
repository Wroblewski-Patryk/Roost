import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { CompanyRecord, CompanySourceReview } from "@prisma/client";
import { companySourceDigest, companySourceEligible } from "../modules/agent-runtime/company-source-trust";

test("an exact owner review admits one current scoped source and fails closed on changed trust", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    const now = new Date(), taskId = randomUUID(), workspaceId = randomUUID();
    const record = { id: randomUUID(), workspaceId, applicationId: null, recordType: "requirement",
      title: "Current scoped fact", description: "Approved content", businessPurpose: null,
      desiredState: null, expectedBehavior: null, source: "owner_note", status: "active",
      verificationState: "not_started", metadata: {}, updatedAt: now } as CompanyRecord;
    const review = { id: randomUUID(), workspaceId, recordId: record.id, taskId, action: "approve",
      recordRevision: now, contentDigest: companySourceDigest(record), environment: "isolated_test",
      validFrom: new Date(now.getTime() - 1000), validUntil: new Date(now.getTime() + 1000) } as CompanySourceReview;
    assert.equal(companySourceEligible(record, review, taskId, null, now), true);
    assert.equal(companySourceEligible(record, undefined, taskId, null, now), false);
    assert.equal(companySourceEligible(record, { ...review, action: "withdraw" }, taskId, null, now), false);
    assert.equal(companySourceEligible(record, review, randomUUID(), null, now), false);
    assert.equal(companySourceEligible({ ...record, applicationId: randomUUID() }, review, taskId, null, now), false);
    assert.equal(companySourceEligible(record, review, taskId, null, review.validUntil), false);
    assert.equal(companySourceEligible({ ...record, description: "Changed" }, review, taskId, null, now), false);
    assert.equal(companySourceEligible({ ...record, status: "archived" }, review, taskId, null, now), false);
    assert.equal(companySourceEligible({ ...record, source: "certification_fixture" }, review, taskId, null, now), false);
    assert.equal(companySourceEligible({ ...record, source: "superseded_import" }, review, taskId, null, now), false);
    assert.equal(companySourceEligible({ ...record, metadata: { sourceKind: "legacy_assumption" } }, review, taskId, null, now), false);
    assert.equal(companySourceEligible(record, { ...review, environment: "production" }, taskId, null, now), false);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test("a reference site review binds its exact URL and package content", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  try {
    const now = new Date(), taskId = randomUUID(), workspaceId = randomUUID();
    const sitePackage = { schemaVersion: "roost-reference-site-package-v1", source: {
      provider: "openai_sites", projectId: "appgprj_siteone",
      versionId: "appgprj_siteone~appgver_one", versionNumber: 1,
      commitSha: "a".repeat(40), archiveSha256: "b".repeat(64),
      deploymentId: "appgdep_one", publishedUrl: "https://site-one.example.org" },
      preparedAt: now.toISOString(), observations: [{ id: "site-navigation", category: "journey",
        route: "/", language: "en", text: "A public navigation is defined.", evidence: [{
          kind: "source", ref: "src/App.jsx", sha256: "c".repeat(64),
          observedAt: now.toISOString(), scope: "source_only" }] }], unknowns: [] };
    const record = { id: randomUUID(), workspaceId, applicationId: null, recordType: "reference_site",
      title: "Public reference", description: null, businessPurpose: null, desiredState: null,
      expectedBehavior: null, source: "owner_note", status: "active", verificationState: "not_started",
      metadata: { referenceUrl: "https://site-one.example.org/", providerVersion: "v1", sourceKind: "openai_sites",
        sourceId: "appgprj_siteone", package: sitePackage },
      updatedAt: now } as unknown as CompanyRecord;
    const review = { id: randomUUID(), workspaceId, recordId: record.id, taskId, action: "approve",
      recordRevision: now, contentDigest: companySourceDigest(record), environment: "isolated_test",
      validFrom: new Date(now.getTime() - 1000), validUntil: new Date(now.getTime() + 1000) } as CompanySourceReview;
    assert.equal(companySourceEligible(record, review, taskId, null, now), true);
    assert.equal(companySourceEligible({ ...record, metadata: { ...record.metadata as object,
      referenceUrl: "https://site-two.example.org/" } }, review, taskId, null, now), false);
    assert.equal(companySourceEligible({ ...record, metadata: { ...record.metadata as object,
      providerVersion: "v2" } }, review, taskId, null, now), false);
    assert.equal(companySourceEligible({ ...record, metadata: { ...record.metadata as object,
      package: { ...sitePackage, unknowns: ["Changed after owner review."] } } }, review, taskId, null, now), false);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
