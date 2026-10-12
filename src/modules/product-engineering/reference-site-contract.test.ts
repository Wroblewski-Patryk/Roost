import test from "node:test";
import assert from "node:assert/strict";
import { configuredReferenceSiteUrl, referenceSiteFindingInput, referenceSiteMetadata } from "./reference-site-contract";

test("G24a exact two-site configuration fails closed", () => {
  const previous = process.env.ROOST_REFERENCE_SITE_URLS;
  const one = "https://first.example.org/";
  const two = "https://second.example.org/";
  try {
    process.env.ROOST_REFERENCE_SITE_URLS = JSON.stringify([one, two]);
    assert.equal(configuredReferenceSiteUrl(one), true);
    assert.equal(configuredReferenceSiteUrl(two), true);
    assert.equal(configuredReferenceSiteUrl("https://third.example.org/"), false);
    assert.equal(configuredReferenceSiteUrl("https://first.example.org/other"), false);
    process.env.ROOST_REFERENCE_SITE_URLS = JSON.stringify([one, one]);
    assert.equal(configuredReferenceSiteUrl(one), false);
    process.env.ROOST_REFERENCE_SITE_URLS = "invalid";
    assert.equal(configuredReferenceSiteUrl(one), false);
  } finally {
    if (previous === undefined) delete process.env.ROOST_REFERENCE_SITE_URLS;
    else process.env.ROOST_REFERENCE_SITE_URLS = previous;
  }
});

test("G24a source and Finding input reject unscoped or unversioned material", () => {
  const sourcePackage = { schemaVersion: "roost-reference-site-package-v1", source: {
    provider: "openai_sites", projectId: "appgprj_fictional",
    versionId: "appgprj_fictional~appgver_one", versionNumber: 1,
    commitSha: "a".repeat(40), archiveSha256: "b".repeat(64),
    deploymentId: "appgdep_one", publishedUrl: "https://first.example.org" },
    preparedAt: "2026-10-12T12:00:00.000Z", observations: [{ id: "primary-navigation",
      category: "journey", route: "/", language: "en", text: "A primary navigation is defined.",
      evidence: [{ kind: "source", ref: "src/App.jsx", sha256: "c".repeat(64),
        observedAt: "2026-10-12T12:00:00.000Z", scope: "source_only" }] }], unknowns: [] };
  const metadata = { referenceUrl: "https://first.example.org/", providerVersion: "v1",
    sourceKind: "openai_sites", sourceId: "appgprj_fictional", package: sourcePackage };
  assert.equal(referenceSiteMetadata.safeParse(metadata).success, true);
  assert.equal(referenceSiteMetadata.safeParse({ ...metadata, referenceUrl: "http://first.example.org/" }).success, false);
  assert.equal(referenceSiteMetadata.safeParse({ ...metadata, sourceKind: "other" }).success, false);
  assert.equal(referenceSiteMetadata.safeParse({ ...metadata, providerVersion: "v2" }).success, false);
  assert.equal(referenceSiteMetadata.safeParse({ ...metadata, sourceId: "appgprj_other" }).success, false);
  assert.equal(referenceSiteMetadata.safeParse({ ...metadata, extra: "unreviewed" }).success, false);
  const input = { requestId: "11111111-1111-4111-8111-111111111111", packageDigest: "a".repeat(64),
    observationId: "primary-navigation", siteRevision: "2026-10-12T11:00:00.000Z",
    sourceReviewId: "22222222-2222-4222-8222-222222222222", title: "Visible navigation",
    category: "journey", language: "en", observed: "A public landing page contains a primary navigation.",
    sourceExcerpt: "primary navigation", interpretation: "Visitors can navigate to a second section.",
    uncertainty: "Keyboard operation was not inspected.", applicability: "May help a separate page after review." };
  assert.equal(referenceSiteFindingInput.safeParse(input).success, true);
  assert.equal(referenceSiteFindingInput.safeParse({ ...input, sourceReviewId: undefined }).success, false);
  assert.equal(referenceSiteFindingInput.safeParse({ ...input, category: "verified" }).success, false);
  assert.equal(referenceSiteFindingInput.safeParse({ ...input, requestUrl: "https://third.example.org/" }).success, false);
});
