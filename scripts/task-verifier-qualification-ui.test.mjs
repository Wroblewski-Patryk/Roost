import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "00000000-0000-4000-8000-000000000102";
const verifierId = "00000000-0000-4000-8000-000000000103";
const checklistId = "00000000-0000-4000-8000-000000000104";
const decisionId = "00000000-0000-4000-8000-000000000105";
const reviewId = "00000000-0000-4000-8000-000000000106";
const app = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskVerifierQualification}from'./web/src/features/departments/task-verifier-qualification';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskVerifierQualification taskId="${taskId}" contract={{executionClass:'roost-company-information-runtime-v1',singleTask:{contractId:'roost-task:${taskId}'},procedures:{items:[{id:'${checklistId}',revision:'1'}]}}} onClose={()=>{}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(app.outputFiles[0].contents); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html><meta charset="utf-8"><div id="root"></div><script src="/app.js"></script></html>');
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ["pl", "en"]) {
    await test(`G24c qualification owner UI ${locale} shows exact scope and confirms one body`, async () => {
      const page = await browser.newPage();
      let saved = false, posted = null, proofDigest = null;
      await page.addInitScript(language => localStorage.setItem("companycoreLocale", language), locale);
      await page.route("**/v1/**", async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname.endsWith("/verifier-qualification") && req.method() === "GET") return route.fulfill({ json: { data: {
          task: { id: taskId, title: "Fictional two-site task" },
          executor: { id: "00000000-0000-4000-8000-000000000107", name: "Site agent", revision: "2026-10-13T00:00:00.000Z" },
          checklist: { id: checklistId, version: 1, decisionId, sourceDigest: "a".repeat(64), reviewIds: [reviewId], current: true },
          candidates: [{ id: verifierId, name: "Audit agent", revision: "2026-10-13T00:00:00.000Z", competency: "application audit" }],
          latest: saved ? { id: "00000000-0000-4000-8000-000000000108", action: "qualify", verifierId,
            evidence: "Observed site-audit skill and independent verifier mandate.", rationale: "One task and accepted checklist only.",
            validUntil: "2026-10-13T12:00:00.000Z" } : null,
          current: saved ? { id: "00000000-0000-4000-8000-000000000108", verifierId, validUntil: "2026-10-13T12:00:00.000Z" } : null,
          canQualify: !saved, expectedVersion: "b".repeat(64)
        } } });
        if (url.pathname === "/v1/auth/reauth") {
          const body = JSON.parse(req.postData());
          assert.equal(body.path, `/v1/agent-runtime/tasks/${taskId}/verifier-qualification`);
          assert.equal(body.password, "test-password");
          proofDigest = body.bodyDigest;
          return route.fulfill({ json: { data: { proof: "synthetic-owner-proof" } } });
        }
        if (url.pathname.endsWith("/verifier-qualification") && req.method() === "POST") {
          posted = JSON.parse(req.postData());
          assert.equal(req.headers()["x-owner-action-proof"], "synthetic-owner-proof");
          const bytes = new TextEncoder().encode(JSON.stringify(posted));
          const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
            .map(byte => byte.toString(16).padStart(2, "0")).join("");
          assert.equal(proofDigest, digest);
          saved = true;
          return route.fulfill({ status: 201, json: { data: { current: { verifierId } } } });
        }
        return route.fulfill({ status: 404, json: { error: "unmocked" } });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.getByText("Fictional two-site task").waitFor();
      assert.equal(await page.getByText(reviewId).count(), 1);
      await page.getByLabel(locale === "pl" ? "Niezależny weryfikator" : "Independent verifier").selectOption(verifierId);
      await page.getByLabel(locale === "pl" ? "Dowód kompetencji dla tej checklisty" : "Competence evidence for this checklist")
        .fill("Observed site-audit skill and independent verifier mandate.");
      await page.getByLabel(locale === "pl" ? "Uzasadnienie decyzji" : "Decision rationale")
        .fill("One task and accepted checklist only.");
      await page.getByRole("button", { name: locale === "pl" ? "Przygotuj potwierdzenie" : "Prepare confirmation" }).click();
      await page.getByText(reviewId).last().waitFor();
      await page.getByLabel(locale === "pl" ? "Obecne hasło" : "Current password").fill("test-password");
      await page.getByRole("button", { name: locale === "pl" ? "Potwierdź i zapisz" : "Confirm and save" }).click();
      await page.getByText(locale === "pl" ? "Decyzja zapisana" : "Decision recorded").waitFor();
      assert.equal(posted.verifierId, verifierId);
      assert.equal(posted.contract.procedures.items[0].id, checklistId);
      assert.equal(posted.evidence, "Observed site-audit skill and independent verifier mandate.");
      await page.close();
    });
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
