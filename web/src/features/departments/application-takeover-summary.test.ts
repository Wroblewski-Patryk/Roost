import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApplicationTakeoverSummary, takeoverRepositoryHref } from "./application-takeover-summary";

const baseline = {
  schemaVersion: "roost-application-takeover-v1", applicationId: "00000000-0000-4000-8000-000000000001", auditTaskId: "00000000-0000-4000-8000-000000000002",
  canonicalRepository: "https://github.com/example-org/example-app", baselineCommit: "a".repeat(40), auditorExecutionId: "00000000-0000-4000-8000-000000000003", verifierExecutionId: "00000000-0000-4000-8000-000000000004",
  auditorEvidenceDigest: "b".repeat(64), verifierEvidenceDigest: "c".repeat(64), stage: "verification", scopeDescription: "Review only the parser repair", intendedUser: "A document editor", primaryProblem: "A malformed token is accepted", coreOutcome: "Reject malformed tokens",
  assumptions: [{ recordId: "00000000-0000-4000-8000-000000000005", revision: "d".repeat(64), decisionStatus: "accepted", implementationState: "implemented_incorrectly" }], limitations: ["No product or sale readiness proof"], productReady: false, saleReady: false
};

test("baseline repository navigation allows HTTPS repositories without credentials only", () => {
  assert.equal(takeoverRepositoryHref(baseline.canonicalRepository), baseline.canonicalRepository);
  for (const value of [null, {}, "javascript:alert(1)", "//github.com/example", "http://github.com/example", "https://user:password@github.com/example", "https://github.com/example?token=secret", "https://github.com/example#token", "https://github.com/", "https://github.com/\\example", "https://github.com/\nexample"]) assert.equal(takeoverRepositoryHref(value), null);
});

test("owner review renders exact baseline and assumption evidence in Polish and English", () => {
  for (const locale of ["pl", "en"] as const) {
    const html = renderToStaticMarkup(React.createElement(ApplicationTakeoverSummary, { baseline, locale }));
    for (const key of ["applicationId", "auditTaskId", "baselineCommit", "auditorExecutionId", "verifierExecutionId", "auditorEvidenceDigest", "verifierEvidenceDigest", "scopeDescription", "intendedUser", "primaryProblem", "coreOutcome"] as const) assert.ok(html.includes(baseline[key]), key);
    assert.ok(html.includes(baseline.assumptions[0].recordId));
    assert.ok(html.includes(baseline.assumptions[0].revision));
    assert.ok(html.includes(baseline.limitations[0]));
    assert.ok(html.includes(`href="${baseline.canonicalRepository}"`));
    assert.ok(html.includes(locale === "pl" ? "Zaimplementowane niepoprawnie" : "Implemented incorrectly"));
    assert.ok(html.includes(locale === "pl" ? "Zaakceptowane" : "Accepted"));
    assert.ok(html.includes(locale === "pl" ? "Gotowość produktu: niezweryfikowana" : "Product readiness: unverified"));
    assert.ok(html.includes(locale === "pl" ? "Gotowość do sprzedaży: niezweryfikowana" : "Sale readiness: unverified"));
    assert.ok(!html.includes("<button"));
    assert.ok(!html.includes("<input"));
  }
});

test("null, unknown and unsafe baseline fields never imply readiness or expose credentials", () => {
  for (const locale of ["pl", "en"] as const) {
    assert.equal(renderToStaticMarkup(React.createElement(ApplicationTakeoverSummary, { baseline: null, locale })), "");
    const unknown = renderToStaticMarkup(React.createElement(ApplicationTakeoverSummary, { baseline: { schemaVersion: "future" }, locale }));
    assert.ok(unknown.includes(locale === "pl" ? "Nie można zweryfikować" : "cannot be verified"));
    const unsafe = renderToStaticMarkup(React.createElement(ApplicationTakeoverSummary, { baseline: { ...baseline, canonicalRepository: "https://user:secret@github.com/example", assumptions: [{ recordId: null, revision: {}, decisionStatus: "unknown", implementationState: "unknown" }], limitations: null, productReady: true, saleReady: true }, locale }));
    assert.ok(!unsafe.includes("secret"));
    assert.ok(!unsafe.includes("href="));
    assert.ok(unsafe.includes(locale === "pl" ? "Nieznane" : "Unknown"));
    assert.ok(unsafe.includes(locale === "pl" ? "Gotowość produktu: niezweryfikowana" : "Product readiness: unverified"));
  }
});
