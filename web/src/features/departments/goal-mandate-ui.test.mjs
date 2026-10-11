import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright";

const goalId = "11111111-1111-4111-8111-111111111111";
const draftId = "22222222-2222-4222-8222-222222222222";
const previewId = "33333333-3333-4333-8333-333333333333";
const ownerId = "44444444-4444-4444-8444-444444444444";
const workspaceId = "55555555-5555-4555-8555-555555555555";
const evidenceId = "66666666-6666-4666-8666-666666666666";
const measurementId = "77777777-7777-4777-8777-777777777777";
const taskId = "88888888-8888-4888-8888-888888888888";
const now = "2026-10-12T10:00:00.000Z";

const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{GoalMandatePanel}from'./web/src/features/departments/goal-mandate-panel';createRoot(document.getElementById('root')).render(<LanguageProvider><GoalMandatePanel goalId='${goalId}' onClose={()=>{}} onChanged={()=>{}} onEditLegacy={()=>{}} onArchiveLegacy={()=>{}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
});
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, "Built owner-console CSS required; run npm run build:web first");
const css = await readFile(path.join("public/react/assets", cssName));
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch({ headless: true });
try {
  for (const [locale, width] of [["pl", 390], ["en", 1440]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.addInitScript(language => {
      localStorage.setItem("companycoreLocale", language);
      sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token");
    }, locale);
    const writes = [];
    const packet = { goal: { id: goalId, title: "Synthetic measurable goal", status: "active" },
      current: null, versions: [], measurements: [], progressStatus: "unknown", progress: null,
      tasks: [{ id: taskId, title: "Synthetic task", status: "todo", estimatedDurationMinutes: null }],
      economics: { executions: [], attemptCount: 0, acceptedOutcomeCount: 0, reviewReturnCount: 0,
        observedExecutionElapsedMs: null, elapsedUnknownCount: 0, observedModelCost: null,
        modelCostUnknownCount: 0, humanEffortMinutes: null, providerInputTokens: null,
        providerOutputTokens: null, historicalUnknownAttributionCount: 0 } };
    let expectedProof = null;
    await page.route("**/v1/**", async route => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      const body = request.postDataJSON?.() ?? {};
      if (pathname === "/v1/auth/me") return route.fulfill({ json: { data: { workspaceId, user: { preferredLanguage: locale } } } });
      if (pathname === `/v1/workspaces/${workspaceId}/access/members`) return route.fulfill({ json: { data: [{ userId: ownerId, name: "Synthetic Owner", email: "owner@example.invalid", role: "owner", taskScopeId: null }] } });
      if (pathname === "/v1/evidence" && request.method() === "GET") return route.fulfill({ json: { data: [{
        id: evidenceId, reference: "Synthetic verified goal evidence", observedAt: now, verificationStatus: "verified" }] } });
      if (pathname === `/v1/goal-mandates/goals/${goalId}` && request.method() === "GET") return route.fulfill({ json: { data: packet } });
      if (request.method() === "POST") writes.push({ pathname, body });
      if (pathname === `/v1/goal-mandates/goals/${goalId}/drafts`) {
        const draft = { id: draftId, version: null, status: "draft", ...body, createdAt: now, adoptedAt: null };
        packet.versions = [draft];
        return route.fulfill({ status: 201, json: { data: draft } });
      }
      if (pathname === `/v1/goal-mandates/goals/${goalId}/drafts/${draftId}/preview`)
        return route.fulfill({ json: { data: { previewId, expectedCurrentId: null, impactDigest: "a".repeat(64), expiresAt: now,
          counts: { tasks: 1, targets: 0, measurements: 0, readyTasks: 0 },
          examples: { tasks: [{ id: taskId, title: "Synthetic task" }] },
          effects: ["Existing Target and Metric values remain legacy, unverified data; they do not establish progress."] } } });
      if (pathname === "/v1/auth/reauth") {
        assert.equal(body.method, "POST");
        assert.equal(body.path, expectedProof.path);
        assert.equal(body.bodyDigest, createHash("sha256").update(JSON.stringify(expectedProof.body)).digest("hex"));
        return route.fulfill({ json: { data: { proof: "synthetic-proof" } } });
      }
      if (pathname === `/v1/goal-mandates/goals/${goalId}/drafts/${draftId}/adopt`) {
        assert.equal(request.headers()["x-owner-action-proof"], "synthetic-proof");
        assert.deepEqual(body, expectedProof.body);
        packet.current = { ...packet.versions[0], version: 1, status: "adopted", adoptedAt: now };
        packet.versions = [packet.current];
        return route.fulfill({ json: { data: packet.current } });
      }
      if (pathname === `/v1/goal-mandates/goals/${goalId}/measurements`) {
        assert.equal(body.versionId, draftId);
        assert.equal(body.evidenceId, evidenceId);
        packet.measurements = [{ id: measurementId, versionId: draftId, value: body.value,
          note: body.note, observedAt: body.observedAt, status: "accepted", evidenceCurrent: true,
          evidenceId, taskId: null, source: { id: evidenceId, entityType: "goal", entityId: goalId,
            reference: "synthetic source", url: null, verificationStatus: "verified" } }];
        packet.progressStatus = "current";
        packet.progress = { value: body.value, observedAt: body.observedAt, evidenceId,
          measurementId, versionId: draftId };
        return route.fulfill({ status: 201, json: { data: packet.measurements[0] } });
      }
      throw new Error(`Unexpected request: ${request.method()} ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText(locale === "pl" ? "Brak aktualnego, zaakceptowanego pomiaru." : "No current, accepted measurement.").waitFor();
    assert.equal(await page.getByText(/\b0\s*%/).count(), 0, "unknown progress must not become zero percent");
    await page.getByLabel(locale === "pl" ? "Mierzalny wynik" : "Measurable result").fill("Synthetic outcome");
    await page.getByLabel(locale === "pl" ? "Miernik" : "Metric").fill("Completed cases");
    await page.getByLabel(locale === "pl" ? "Jednostka" : "Unit").fill("cases");
    await page.getByLabel(locale === "pl" ? "Wartość docelowa" : "Target value").fill("12");
    await page.getByLabel(locale === "pl" ? "Źródło dowodu" : "Evidence source").fill("Verified goal evidence");
    await page.getByLabel(locale === "pl" ? "Podstawa decyzji" : "Decision basis").fill("Synthetic owner decision");
    await page.getByLabel(locale === "pl" ? "Osoba odpowiedzialna" : "Accountable person").selectOption(ownerId);
    await page.getByRole("button", { name: locale === "pl" ? "Zapisz propozycję" : "Save proposal" }).click();
    await page.getByRole("button", { name: locale === "pl" ? "Pokaż skutki" : "Preview impact" }).click();
    await page.getByText("Synthetic task").last().waitFor();
    assert.equal(writes.some(item => item.pathname.endsWith("/adopt")), false, "preview is read-only for the mandate");
    await page.getByRole("button", { name: locale === "pl" ? "Przyjmij wynik" : "Adopt outcome" }).click();
    assert.equal(writes.some(item => item.pathname.endsWith("/adopt")), false, "adoption needs separate proof");
    expectedProof = { path: `/v1/goal-mandates/goals/${goalId}/drafts/${draftId}/adopt`,
      body: { previewId, expectedCurrentId: null, impactDigest: "a".repeat(64) } };
    await page.getByLabel(locale === "pl" ? "Obecne hasło" : "Current password").fill("synthetic-password");
    await page.getByRole("button", { name: locale === "pl" ? "Potwierdź i zapisz" : "Confirm and save" }).click();
    await page.getByText("Synthetic outcome · 12 cases (Completed cases)").first().waitFor();
    await page.getByLabel(locale === "pl" ? "Zweryfikowany dowód" : "Verified evidence").selectOption(evidenceId);
    await page.getByLabel(locale === "pl" ? "Zaobserwowana wartość" : "Observed value").fill("5");
    await page.getByLabel(locale === "pl" ? "Zaobserwowano" : "Observed at").fill("2026-10-12T10:00");
    await page.getByLabel(locale === "pl" ? "Opis pomiaru" : "Measurement note").fill("Verified synthetic measurement");
    await page.getByRole("button", { name: locale === "pl" ? "Zapisz pomiar" : "Save measurement" }).click();
    await page.getByText("Verified synthetic measurement").waitFor();
    await page.getByText(locale === "pl" ? "Praca człowieka: Nieznane" : "Human effort: Unknown", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no horizontal overflow");
    await page.close();
  }
  console.log(JSON.stringify({ locales: ["pl", "en"], widths: [390, 1440], previewBeforeProof: true,
    proofBoundAdoption: true, progressOnlyAfterEvidence: true, unknownEconomicsVisible: true }));
} finally {
  await browser.close();
  server.close();
}
