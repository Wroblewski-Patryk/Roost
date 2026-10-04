import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import type { ApplicationOperation } from "./product-engineering-types";
import { operationLabel, operationLabels, portfolioOperation, portfolioRecordHref, portfolioTaskHref } from "./portfolio-operation-model";

const id = "00000000-0000-4000-8000-000000000001";
const operation: ApplicationOperation = {
  schemaVersion: "roost-application-operation-v1",
  stage: { key: "verification", claim: "bounded_release_proof", scope: "A bounded parser repair", decisionId: null, asOf: "2026-10-04T10:00:00Z" },
  gateState: "blocked", nearestOutcome: { taskId: id, title: "Repair parser", status: "blocked" },
  accountable: { id, role: "accountable_manager", label: "Delivery manager" },
  blockers: [{ code: "owner_decision_pending", reference: id }],
  decisions: [{ id, title: "Accept bounded scope", state: "pending", href: `/areas?area=01-strategia&view=decisions&decisionId=${id}` }],
  evidence: [{ kind: "release", id, commit: "a".repeat(40), at: "2026-10-04T10:00:00Z", href: `/areas?area=11-innowacje&view=overview&applicationId=${id}&cockpit=evidence` }],
  productReadiness: "unverified", saleReadiness: "unverified", limitations: ["Only the parser repair has been proven"]
};

test("portfolio preserves the authoritative bounded claim, blocker and gate despite legacy score", () => {
  const application = { innovationStage: "productized", readiness: { overall: 100 }, operation };
  const displayed = portfolioOperation(application.operation)!;
  assert.equal(displayed.gateState, "blocked");
  assert.equal(displayed.stage.key, "verification");
  assert.equal(displayed.stage.scope, "A bounded parser repair");
  assert.equal(displayed.productReadiness, "unverified");
  assert.equal(displayed.saleReadiness, "unverified");
  assert.deepEqual(displayed.blockers, operation.blockers);
  assert.deepEqual(displayed.decisions, operation.decisions);
  assert.deepEqual(displayed.evidence, operation.evidence);
});

test("missing or incompatible operation projection cannot promote a declared application stage", () => {
  assert.equal(portfolioOperation(), null);
  assert.equal(portfolioOperation({ ...operation, schemaVersion: "future-schema" } as unknown as ApplicationOperation), null);
});

test("all five gates and emitted blocker reasons have Polish and English labels", () => {
  const keys = ["unmet", "in_progress", "met", "blocked", "explicitly_deferred", "takeover_baseline_missing", "takeover_baseline_stale", "owner_decision_pending", "owner_decision_deferred", "task_blocked", "task_needs_revalidation", "task_needs_context", "native_execution_failed", "independent_review_rejected", "evidence_unavailable", "outcome_not_defined"];
  for (const key of keys) for (const locale of ["pl", "en"] as const) {
    assert.ok(operationLabels[key]);
    assert.notEqual(operationLabel(key, locale), key);
  }
  for (const gateState of ["unmet", "in_progress", "met", "blocked", "explicitly_deferred"] as const) assert.equal(portfolioOperation({ ...operation, gateState })!.gateState, gateState);
});

test("portfolio links retain exact records and reject external or executable navigation", () => {
  const task = `/areas?area=04-operacje&view=tasks&taskId=${id}`;
  assert.equal(portfolioTaskHref(id), task);
  assert.equal(portfolioRecordHref(task), task);
  assert.equal(portfolioRecordHref(operation.decisions[0].href), operation.decisions[0].href);
  assert.equal(portfolioRecordHref(operation.evidence[0].href), operation.evidence[0].href);
  assert.equal(portfolioTaskHref("../foreign"), null);
  for (const href of ["//other.example/areas", "https://other.example/areas", "javascript:alert(1)", "/areas?x=\nunsafe", "/areas?x=\\unsafe", "/settings"]) assert.equal(portfolioRecordHref(href), null);
});

test("portfolio operation renders bounded scope, actual links and safe unknowns in both languages", async () => {
  const bundle = await build({ entryPoints: ["web/src/features/departments/innovation-route.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic" });
  const compiled = { exports: {} as { ApplicationOperationSummary?: React.ComponentType<{ operation?: ApplicationOperation; locale: "pl" | "en" }> } };
  runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(resolve("package.json")), process, URL, URLSearchParams });
  const component = compiled.exports.ApplicationOperationSummary!;
  for (const locale of ["pl", "en"] as const) {
    const html = renderToStaticMarkup(React.createElement(component, { operation, locale }));
    assert.ok(html.includes(operation.stage.scope!));
    assert.ok(html.includes(operation.accountable!.label));
    assert.ok(html.includes(operation.nearestOutcome!.title));
    assert.ok(html.includes(operation.decisions[0].title));
    assert.ok(html.includes(operationLabel("owner_decision_pending", locale)));
    assert.ok(html.includes(operation.evidence[0].commit!));
    assert.ok(html.includes(`taskId=${id}`));
    assert.ok(html.includes(`decisionId=${id}`));
    assert.ok(html.includes(`applicationId=${id}`));
    assert.ok(html.includes(locale === "pl" ? "Gotowość produktu: niezweryfikowana" : "Product readiness: unverified"));
    assert.ok(html.includes(locale === "pl" ? "dotyczy wyłącznie najbliższego wyniku" : "applies only to the nearest outcome"));
    assert.ok(!html.includes("100%"));
    for (const gateState of ["unmet", "in_progress", "met", "blocked", "explicitly_deferred"] as const) {
      const gateHtml = renderToStaticMarkup(React.createElement(component, { operation: { ...operation, gateState }, locale }));
      assert.ok(gateHtml.includes(operationLabel(gateState, locale)));
    }
    const unknown = renderToStaticMarkup(React.createElement(component, { locale }));
    assert.ok(unknown.includes(locale === "pl" ? "Brak zweryfikowanego stanu blokad" : "Blocker state is unverified"));
    assert.ok(!unknown.includes("href="));
    const unsafe = renderToStaticMarkup(React.createElement(component, { operation: { ...operation, decisions: [{ ...operation.decisions[0], href: "javascript:alert(1)" }], evidence: [{ ...operation.evidence[0], href: "//other.example" }] }, locale }));
    assert.ok(!unsafe.includes("javascript:"));
    assert.ok(!unsafe.includes("other.example"));
  }
});
