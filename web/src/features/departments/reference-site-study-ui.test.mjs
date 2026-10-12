import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "11111111-1111-4111-8111-111111111111";
const siteId = "22222222-2222-4222-8222-222222222222";
const findingId = "33333333-3333-4333-8333-333333333333";
const ownerId = "44444444-4444-4444-8444-444444444444";
const reviewId = "55555555-5555-4555-8555-555555555555";
const digest = "a".repeat(64);
const now = "2026-10-12T10:00:00.000Z";

const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{ReferenceSiteStudy}from'./web/src/features/departments/reference-site-study';createRoot(document.getElementById('root')).render(<LanguageProvider><ReferenceSiteStudy taskId='${taskId}' taskTitle='Synthetic task' onClose={()=>{}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
});

test("PL/EN owner reviews a finding and accepts only the exact checklist preview", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/app.js") {
      res.setHeader("Content-Type", "text/javascript");
      return res.end(bundle.outputFiles[0].contents);
    }
    res.setHeader("Content-Type", "text/html");
    return res.end('<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script src="/app.js"></script></body></html>');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of ["pl", "en"]) {
      const page = await browser.newPage();
      await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
      const writes = [];
      let reviewed = false;
      let accepted = false;
      const site = { id: siteId, title: "Synthetic Site", url: "https://example.test/", providerVersion: "v1",
        recordRevision: now, packageDigest: digest, versionNumber: 1, commitSha: "synthetic", observationCount: 1,
        approved: true, sourceReviewId: "66666666-6666-4666-8666-666666666666" };
      const source = { url: site.url, providerVersion: "v1", versionStatus: "published", recordRevision: now,
        sourceReviewId: site.sourceReviewId, preparedAt: now, contentDigest: digest,
        version: { versionNumber: 1, commitSha: site.commitSha } };
      const finding = () => ({ id: findingId, createdAt: now, state: "observed",
        verification: reviewed ? "confirmed" : "unverified", actorId: "77777777-7777-4777-8777-777777777777",
        findingDigest: digest, review: reviewed ? { id: reviewId, verdict: "confirmed", reviewerUserId: ownerId,
          rationale: "Checked the saved route", evidence: "Saved source snapshot only", reviewedAt: now } : null,
        body: { title: "Visible navigation", category: "navigation", language: "en", observed: "Main action visible",
          sourceExcerpt: "Open the form", interpretation: "Likely clear", uncertainty: "Click outcome not established",
          applicability: "Public page", source, observationId: "obs-1", sourceLanguage: "en",
          evidence: [{ kind: "source", scope: "source_only" }] } });
      await page.route("**/v1/**", async route => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        const body = request.method() === "POST" ? request.postDataJSON() : null;
        const respond = data => route.fulfill({ json: { data } });
        if (request.method() === "POST") writes.push({ pathname, body });
        if (pathname === `/v1/product-engineering/tasks/${taskId}/reference-sites` && request.method() === "GET")
          return respond({ items: [site], reviewEnvironment: "isolated_test" });
        if (pathname === `/v1/product-engineering/tasks/${taskId}/reference-sites/${siteId}/findings` && request.method() === "GET")
          return respond({ items: [finding()], truncated: false });
        if (pathname.endsWith(`/findings/${findingId}/review`) && request.method() === "POST") {
          assert.equal(body.expectedFindingDigest, digest);
          assert.equal(body.verdict, "confirmed");
          assert.equal(body.rationale, "Checked the saved route");
          reviewed = true;
          return respond({ review: { id: reviewId }, replayed: false });
        }
        if (pathname === `/v1/product-engineering/tasks/${taskId}/reference-site-checklist` && request.method() === "GET")
          return respond(accepted ? { status: "active", procedure: { id: "88888888-8888-4888-8888-888888888888",
            familyId: "99999999-9999-4999-8999-999999999999", name: "Website evidence checklist", version: 1,
            decisionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", items: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              order: 1, instruction: "Check the primary action", expectedInput: { description: "Saved page" },
              expectedOutput: { description: "Review note" }, rollbackInstruction: "Reopen review",
              validationRule: { itemId: "primary-action", applicability: "Public page",
                acceptanceCriterion: "Action is visible", status: "approved", ownerUserId: ownerId,
                source: { findingId, observationId: "obs-1", packageDigest: digest, evidenceScopes: ["source_only"] } } }] } }
            : { status: "none", procedure: null });
        if (pathname.endsWith("/reference-site-checklist/preview") && request.method() === "POST") {
          assert.equal(body.items.length, 1);
          return respond({ digest, preview: { schemaVersion: "roost-reference-site-checklist-preview-v1", taskId,
            ownerUserId: ownerId, name: "Website evidence checklist", items: body.items.map(item => ({ ...item,
              source: { taskId, siteId, findingId, findingVersionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                findingDigest: digest, reviewId, sourceReviewId: site.sourceReviewId, packageDigest: digest,
                metadataDigest: digest, recordRevision: now, observationId: "obs-1", evidenceScopes: ["source_only"] } })) } });
        }
        if (pathname.endsWith("/reference-site-checklist/accept") && request.method() === "POST") {
          assert.equal(body.expectedDigest, digest);
          assert.equal(body.items[0].itemId, "primary-action");
          accepted = true;
          return respond({ procedureId: "88888888-8888-4888-8888-888888888888", version: 1 });
        }
        return route.fulfill({ status: 404, json: { error: "fixture_not_found" } });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.getByText("Visible navigation").waitFor();
      assert.equal(writes.length, 0, "opening the panel must not write");
      await page.getByRole("button", { name: locale === "pl" ? "Oceń niezależnie" : "Review independently" }).click();
      await page.getByLabel(locale === "pl" ? "Uzasadnienie" : "Rationale").fill("Checked the saved route");
      await page.getByLabel(locale === "pl" ? "Dowód weryfikacji i jego zakres" : "Review evidence and scope").fill("Saved source snapshot only");
      await page.getByRole("button", { name: locale === "pl" ? "Zapisz ocenę" : "Save review" }).click();
      await page.getByRole("button", { name: locale === "pl" ? "Dodaj do propozycji checklisty" : "Add to checklist proposal" }).click();
      const values = locale === "pl" ? ["Stały ID punktu", "Działanie", "Sprawdzalne kryterium", "Wymagany materiał wejściowy", "Oczekiwany dowód wyniku", "Wycofanie"]
        : ["Stable item ID", "Action", "Testable criterion", "Required input", "Expected output evidence", "Rollback"];
      for (const [label, value] of values.map((label, index) => [label, ["primary-action", "Check the primary action", "Action is visible", "Saved page", "Review note", "Reopen review"][index]]))
        await page.getByLabel(label).fill(value);
      await page.getByRole("button", { name: locale === "pl" ? "Pokaż dokładny podgląd" : "Show exact preview" }).click();
      await page.getByText(`SHA-256 ${digest}`).waitFor();
      assert.equal(writes.filter(write => write.pathname.endsWith("/accept")).length, 0, "preview must not accept");
      await page.getByLabel(locale === "pl" ? "Sprawdzalne kryterium" : "Testable criterion").fill("Action is clearly visible");
      assert.equal(await page.getByText(`SHA-256 ${digest}`).count(), 0, "edit must invalidate preview");
      await page.getByRole("button", { name: locale === "pl" ? "Pokaż dokładny podgląd" : "Show exact preview" }).click();
      await page.getByRole("button", { name: locale === "pl" ? "Przyjmij tę wersję checklisty" : "Accept this checklist version" }).click();
      await page.getByText(locale === "pl" ? "przyjęta, bieżąca" : "accepted, current").waitFor();
      assert.equal(writes.filter(write => write.pathname.endsWith("/accept")).length, 1);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
