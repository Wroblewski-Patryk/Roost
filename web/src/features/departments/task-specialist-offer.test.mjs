import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "22222222-2222-4222-8222-222222222222";
const offer = {
  id: "offer-1", parentTaskId: "11111111-1111-4111-8111-111111111111", childTaskId: taskId,
  specialistId: "exact-specialist-1", scope: ["Repair the bounded parser fault"], outcome: "Verified parser correction",
  contract: { acceptance: { criteria: ["Parser handles empty input"], tests: ["Run parser fixture"], evidence: ["Test receipt"] }, recovery: { handoff: "Report evidence" } },
  budgetCeiling: { maxAttempts: 1, maxDurationSeconds: 900, maxOutputTokens: 1200 }, status: "pending", decision: null
};
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{api}from'./web/src/api/client';import{TaskSpecialistOffer}from'./web/src/features/departments/task-specialist-offer';function Host(){const[state,setState]=React.useState(window.initialOffer);return <LanguageProvider><TaskSpecialistOffer taskId='${taskId}' state={state} onRefresh={async()=>{const r=await api('/v1/agent-runtime/tasks/${taskId}/specialist-offer');setState({kind:'offer',...r.data});}} onSaved={()=>window.saved=true}/></LanguageProvider>}createRoot(document.getElementById('root')).render(<Host/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const server = createServer((request, response) => {
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); return response.end(bundle.outputFiles[0].contents); }
  response.setHeader("Content-Type", "text/html");
  response.end('<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });

try {
  for (const { locale, action, reason } of [{ locale: "en", action: "accept" }, { locale: "pl", action: "reject", reason: "Niejasny zakres" }]) {
    const page = await browser.newPage();
    await page.addInitScript(({ locale, offer }) => {
      localStorage.setItem("companycoreLocale", locale);
      window.initialOffer = { kind: "offer", offer, expectedVersion: "v1", canDecide: true, canSubmit: false };
    }, { locale, offer });
    let submitted = 0;
    await page.route("**/v1/agent-runtime/tasks/**/specialist-offer**", async route => {
      if (route.request().method() === "POST") {
        assert.equal(route.request().url().endsWith(`/actions/${action}`), true);
        const body = route.request().postDataJSON();
        assert.equal(body.decision, action);
        assert.equal(body.expectedVersion, "v1");
        assert.equal(typeof body.requestId, "string");
        if (action === "reject") assert.equal(body.reason, reason);
        else assert.equal("reason" in body, false);
        submitted++;
        return route.fulfill({ json: { data: { accepted: true } } });
      }
      return route.fulfill({ json: { data: { offer: { ...offer, status: action === "accept" ? "accepted" : "rejected", decision: { id: "decision-1", decision: action, reason: reason ?? null, createdAt: "2026-10-11T10:00:00Z" } }, expectedVersion: "v2", canDecide: false, canSubmit: action === "accept" } } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText("exact-specialist-1").waitFor();
    assert.equal(await page.getByText(offer.parentTaskId).count(), 1);
    assert.equal(await page.getByText(offer.childTaskId).count(), 1);
    await page.getByText(locale === "pl" ? "Pełny proponowany kontrakt" : "Full offered contract").click();
    assert.equal(await page.getByText("Run parser fixture", { exact: false }).count(), 1);
    assert.equal(await page.getByText(locale === "pl" ? "Roost nie mierzy tokenów" : "Roost does not measure provider tokens", { exact: false }).count(), 1);
    if (action === "accept") await page.getByRole("button", { name: "Accept offer" }).click();
    else {
      await page.getByRole("button", { name: "Odmów propozycji" }).click();
      assert.equal(await page.getByRole("button", { name: "Zapisz odmowę" }).isDisabled(), true);
      await page.getByRole("textbox", { name: "Powód odmowy" }).fill(reason);
      await page.getByRole("button", { name: "Zapisz odmowę" }).click();
    }
    await page.getByText(action === "accept" ? "Accepted by specialist" : "Odmówiona przez specjalistę").waitFor();
    assert.equal(submitted, 1);
    assert.equal(await page.evaluate(() => window.saved), true);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
