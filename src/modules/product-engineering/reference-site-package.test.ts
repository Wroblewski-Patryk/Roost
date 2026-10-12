import assert from "node:assert/strict";
import test from "node:test";
import { referenceSitePackage, referenceSitePackageDigest } from "./reference-site-package";

const fixture = {
  schemaVersion: "roost-reference-site-package-v1",
  source: { provider: "openai_sites", projectId: "appgprj_fixtureone",
    versionId: "appgprj_fixtureone~appgver_fixturev1", versionNumber: 1,
    commitSha: "a".repeat(40), archiveSha256: "b".repeat(64),
    deploymentId: "appgdep_fixtureone", publishedUrl: "https://first.example.org" },
  preparedAt: "2026-10-12T12:00:00.000Z",
  observations: [{ id: "site-navigation", category: "journey", route: "/en/", language: "en",
    text: "The source defines a navigation link to the contact page.",
    evidence: [{ kind: "source", ref: "src/App.jsx", sha256: "c".repeat(64),
      observedAt: "2026-10-12T11:00:00.000Z", scope: "source_only" }] }],
  unknowns: ["The published click path has not been verified."]
} as const;

test("G24a package binds source observations to an exact saved Sites version", () => {
  assert.equal(referenceSitePackage.safeParse(fixture).success, true);
  assert.equal(referenceSitePackage.safeParse({ ...fixture,
    source: { ...fixture.source, versionId: "appgprj_other~appgver_fixturev1" } }).success, false);
  assert.equal(referenceSitePackage.safeParse({ ...fixture,
    observations: [...fixture.observations, fixture.observations[0]] }).success, false);
  assert.equal(referenceSitePackage.safeParse({ ...fixture,
    observations: [{ ...fixture.observations[0], evidence: [{ ...fixture.observations[0].evidence[0],
      ref: "../secret.env" }] }] }).success, false);
  assert.equal(referenceSitePackage.safeParse({ ...fixture,
    observations: [{ ...fixture.observations[0], evidence: [{ ...fixture.observations[0].evidence[0],
      ref: "image.png?token=private" }] }] }).success, false);
  assert.notEqual(referenceSitePackageDigest(fixture), referenceSitePackageDigest({ ...fixture,
    observations: [{ ...fixture.observations[0], text: "A changed source statement." }] }));
});

test("G24a package cannot promote source inspection into published or supervised proof", () => {
  const evidence = fixture.observations[0].evidence[0];
  const withEvidence = (candidate: unknown) => ({ ...fixture, observations: [{ ...fixture.observations[0],
    evidence: [candidate] }] });
  assert.equal(referenceSitePackage.safeParse(withEvidence({ ...evidence,
    scope: "supervised_result" })).success, false);
  assert.equal(referenceSitePackage.safeParse(withEvidence({ ...evidence,
    kind: "supervised_click", scope: "supervised_result" })).success, false);
  assert.equal(referenceSitePackage.safeParse(withEvidence({ ...evidence,
    kind: "supervised_click", scope: "supervised_result", result: "The contact form opened." })).success, true);
  assert.equal(referenceSitePackage.safeParse(withEvidence({ ...evidence,
    kind: "published_screenshot", scope: "published_render", result: "It opened." })).success, false);
  assert.equal(referenceSitePackage.safeParse(withEvidence({ ...evidence,
    kind: "published_screenshot", scope: "published_render" })).success, false);
  assert.equal(referenceSitePackage.safeParse(withEvidence({ ...evidence,
    kind: "published_screenshot", scope: "published_render", providerRef: "sediment://file_fixture" })).success, true);
});
