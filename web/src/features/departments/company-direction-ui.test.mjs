import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright";

const draftId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const decisionId = "33333333-3333-4333-8333-333333333333";
const comparisonId = "44444444-4444-4444-8444-444444444444";
const conflictId = "55555555-5555-4555-8555-555555555555";
const now = "2026-10-12T10:00:00.000Z";
const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{CompanyDirectionPanel}from'./web/src/features/departments/company-direction-panel';createRoot(document.getElementById('root')).render(<LanguageProvider><CompanyDirectionPanel tasks={[{id:'${taskId}',title:'Synthetic strategic task'}]} decisions={[{id:'${decisionId}',title:'Synthetic decision'}]}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
});
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, "Built owner-console CSS required");
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
    let current = null;
    let versions = [];
    let comparisons = [];
    let lastProof = null;
    await page.route("**/v1/**", async route => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      const body = request.postDataJSON?.() ?? {};
      if (pathname === "/v1/auth/me") return route.fulfill({ json: { data: { user: { preferredLanguage: locale } } } });
      if (pathname === "/v1/strategy/direction" && request.method() === "GET")
        return route.fulfill({ json: { data: { current, versions, comparisons } } });
      if (request.method() === "POST") writes.push({ path: pathname, body, proof: request.headers()["x-owner-action-proof"] });
      if (pathname === "/v1/strategy/direction/drafts") {
        const draft = { id: draftId, version: null, text: body.text, provenance: body.provenance, status: "draft", createdAt: now, adoptedAt: null };
        versions = [draft, ...versions];
        return route.fulfill({ status: 201, json: { data: draft } });
      }
      if (pathname === `/v1/strategy/direction/drafts/${draftId}/preview`)
        return route.fulfill({ json: { data: { previewId: "66666666-6666-4666-8666-666666666666", expiresAt: now,
          draftId, expectedCurrentId: current?.id ?? null, impactDigest: "a".repeat(64),
          counts: { goals: 0, projects: 0, tasks: 1, procedures: 0, decisions: 1 },
          examples: { tasks: [{ id: taskId, title: "Synthetic strategic task" }] },
          consequences: ["review_open_tasks", "revalidate_agent_ready"] } } });
      if (pathname === "/v1/auth/reauth") {
        assert.equal(body.method, "POST");
        assert.equal(body.bodyDigest, createHash("sha256").update(JSON.stringify(lastProof?.body)).digest("hex"));
        assert.equal(body.path, lastProof?.path);
        return route.fulfill({ json: { data: { proof: "synthetic-proof" } } });
      }
      if (pathname === `/v1/strategy/direction/drafts/${draftId}/adopt`) {
        assert.equal(request.headers()["x-owner-action-proof"], "synthetic-proof");
        assert.deepEqual(body, { previewId: "66666666-6666-4666-8666-666666666666", expectedCurrentId: null, impactDigest: "a".repeat(64) });
        current = { ...versions[0], status: "adopted", version: 1, adoptedAt: now };
        versions = [current];
        return route.fulfill({ json: { data: current } });
      }
      if (pathname === "/v1/strategy/direction/comparisons") {
        const comparison = { id: body.subjectType === "task" ? comparisonId : conflictId, directionVersionId: draftId, subjectType: body.subjectType, subjectId: body.subjectId,
          subjectTitle: body.subjectType === "task" ? "Synthetic strategic task" : "Synthetic decision",
          outcome: body.outcome, evidence: body.evidence, assessment: body.assessment, status: "proposed",
          currentEvidence: true, staleReason: null,
          exceptionRationale: null, createdAt: now, decidedAt: null };
        comparisons = [comparison, ...comparisons];
        return route.fulfill({ status: 201, json: { data: comparison } });
      }
      if (pathname === `/v1/strategy/direction/comparisons/${comparisonId}/actions/resolve` ||
        pathname === `/v1/strategy/direction/comparisons/${conflictId}/actions/resolve`) {
        assert.equal(request.headers()["x-owner-action-proof"], "synthetic-proof");
        const id = pathname.includes(conflictId) ? conflictId : comparisonId;
        const index = comparisons.findIndex(item => item.id === id);
        comparisons[index] = { ...comparisons[index], status: body.action === "confirm_aligned" ? "aligned" : "exception_accepted",
          exceptionRationale: body.rationale, decidedAt: now };
        return route.fulfill({ json: { data: comparisons[index] } });
      }
      return route.fulfill({ status: 404, json: { error: "fixture_not_found" } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByText(locale === "pl" ? "Nie przyjęto jeszcze kierunku firmy." : "No company direction has been adopted yet.").first().waitFor();
    await page.getByLabel(locale === "pl" ? "Treść kierunku" : "Direction text").fill("Synthetic company purpose");
    await page.getByLabel(locale === "pl" ? "Źródło i uzasadnienie właściciela" : "Owner source and rationale").fill("Synthetic owner fixture");
    await page.getByRole("button", { name: locale === "pl" ? "Zapisz propozycję" : "Save proposal" }).click();
    await page.locator("select").filter({ has: page.locator(`option[value="${draftId}"]`) }).selectOption(draftId);
    await page.getByRole("button", { name: locale === "pl" ? "Pokaż skutki" : "Preview impact" }).click();
    await page.getByText(locale === "pl" ? "Sprawdź otwarte zadania i ich zakres." : "Review open tasks and their scope.").waitFor();
    assert.equal(writes.some(item => item.path.endsWith("/adopt")), false, "preview must not adopt");
    await page.getByRole("button", { name: locale === "pl" ? "Przyjmij tę wersję" : "Adopt this version" }).click();
    assert.equal(writes.some(item => item.path.endsWith("/adopt")), false, "adoption requires separate confirmation");
    lastProof = { path: `/v1/strategy/direction/drafts/${draftId}/adopt`, body: { previewId: "66666666-6666-4666-8666-666666666666", expectedCurrentId: null, impactDigest: "a".repeat(64) } };
    await page.getByLabel(locale === "pl" ? "Obecne hasło" : "Current password").fill("synthetic-password");
    await page.getByRole("button", { name: locale === "pl" ? "Potwierdź i zapisz" : "Confirm and save" }).click();
    await page.getByText(locale === "pl" ? "Nowy kierunek przyjęty." : "New direction adopted.").waitFor();
    assert.equal(writes.filter(item => item.path.endsWith("/adopt")).length, 1);
    await page.getByLabel(locale === "pl" ? "Identyfikator zadania lub decyzji" : "Task or decision identifier").fill(taskId);
    await page.getByLabel(locale === "pl" ? "Proponowany wynik" : "Proposed outcome").fill("Synthetic aligned outcome");
    await page.getByLabel(locale === "pl" ? "Dowód lub podstawa oceny" : "Evidence or assessment basis").fill("Synthetic evidence");
    await page.getByRole("button", { name: locale === "pl" ? "Zapisz porównanie" : "Save comparison" }).click();
    await page.getByText("Synthetic aligned outcome").waitFor();
    await page.getByLabel(locale === "pl" ? "Uzasadnienie decyzji" : "Decision rationale").fill("Synthetic rationale");
    await page.getByRole("button", { name: locale === "pl" ? "Potwierdź zgodność" : "Confirm alignment" }).click();
    lastProof = { path: `/v1/strategy/direction/comparisons/${comparisonId}/actions/resolve`, body: { action: "confirm_aligned", rationale: "Synthetic rationale" } };
    await page.getByLabel(locale === "pl" ? "Obecne hasło" : "Current password").fill("synthetic-password");
    await page.getByRole("button", { name: locale === "pl" ? "Potwierdź i zapisz" : "Confirm and save" }).click();
    await page.getByText(locale === "pl" ? "Potwierdzona zgodność" : "Alignment confirmed").waitFor();
    assert.equal(writes.filter(item => item.path.endsWith("/actions/resolve")).length, 1);
    await page.getByLabel(locale === "pl" ? "Rodzaj rekordu" : "Record type").selectOption("decision");
    await page.getByLabel(locale === "pl" ? "Identyfikator zadania lub decyzji" : "Task or decision identifier").fill(decisionId);
    await page.getByLabel(locale === "pl" ? "Proponowany wynik" : "Proposed outcome").fill("Synthetic conflicting outcome");
    await page.getByLabel(locale === "pl" ? "Dowód lub podstawa oceny" : "Evidence or assessment basis").fill("Synthetic conflict evidence");
    await page.getByLabel(locale === "pl" ? "Ocena względem kierunku" : "Assessment against direction").selectOption("conflict");
    await page.getByRole("button", { name: locale === "pl" ? "Zapisz porównanie" : "Save comparison" }).click();
    await page.getByText("Synthetic conflicting outcome").last().waitFor();
    await page.getByLabel(locale === "pl" ? "Uzasadnienie decyzji" : "Decision rationale").last().fill("Synthetic exception rationale");
    await page.getByRole("button", { name: locale === "pl" ? "Przyjmij wyjątek" : "Accept exception" }).click();
    lastProof = { path: `/v1/strategy/direction/comparisons/${conflictId}/actions/resolve`, body: { action: "accept_exception", rationale: "Synthetic exception rationale" } };
    await page.getByLabel(locale === "pl" ? "Obecne hasło" : "Current password").fill("synthetic-password");
    await page.getByRole("button", { name: locale === "pl" ? "Potwierdź i zapisz" : "Confirm and save" }).click();
    await page.getByText(locale === "pl" ? "Wyjątek przyjęty" : "Exception accepted").waitFor();
    assert.equal(writes.filter(item => item.path.endsWith("/actions/resolve")).length, 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no horizontal overflow");
    if (process.env.ROOST_G19_UI_SCREENSHOT)
      await page.screenshot({ path: path.join(process.env.ROOST_G19_UI_SCREENSHOT, `g19-${locale}.png`), fullPage: true });
    await page.close();
  }
  console.log(JSON.stringify({ locales: ["pl", "en"], proofBoundActionsPerLocale: 3, previewWithoutAdoption: true,
    alignedTask: true, conflictingDecision: true }));
} finally {
  await browser.close();
  server.close();
}
