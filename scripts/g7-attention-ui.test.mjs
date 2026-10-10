import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const id = "00000000-0000-4000-8000-000000000001";
const decisionId = "00000000-0000-4000-8000-000000000002";
const output = process.env.ROOST_QA_OUTPUT || path.join(os.tmpdir(), "roost-g7-attention-qa");
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{GeneralDashboard}from'./web/src/features/departments/general-dashboard';import{CompanyInformationResult}from'./web/src/features/departments/company-information-result';createRoot(document.getElementById('root')).render(<LanguageProvider>{location.search.includes('result')?<CompanyInformationResult taskId='${id}' canStart={false}/>:<GeneralDashboard/>}</LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, "built web CSS is required");
const css = await readFile(path.join("public/react/assets", cssName));
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url.startsWith("/vendor/phosphor/bold/")) {
    try { const data = await readFile(path.join("node_modules/@phosphor-icons/web/src/bold", path.basename(req.url))); res.setHeader("Content-Type", req.url.endsWith("css") ? "text/css" : "font/woff2"); return res.end(data); }
    catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const origin = `http://127.0.0.1:${server.address().port}`;
const decisionTarget = `/areas?area=01-strategia&view=decisions&decisionId=${decisionId}&from=attention`;
const resultTarget = `/areas?area=04-operacje&view=tasks&taskId=${id}&from=attention`;
function dashboardPacket() { return { generatedAt: new Date().toISOString(), summary: {}, departmentSignals: [], latestRouteProposals: [], priorityItems: [
  { id: decisionId, kind: "decision", title: "Approve information plan", status: "pending", target: decisionTarget },
  { id, kind: "result", title: "Review worker finding", status: "review", target: resultTarget },
] }; }
function resultPacket(mode) { return { status: ({ running: "running", failed: "failed", stopped: "stopped", pending: "queued" })[mode] || "completed", executionId: id, summary: mode === "failed" ? null : "Six current principles summarized.", finalResponse: ["failed", "running", "pending", "stopped"].includes(mode) ? null : "Full source-backed result.", reason: mode === "failed" ? "provider_auth_expired" : null, canReview: mode === "result", materialVersion: "a".repeat(64), review: mode === "accepted" ? { decision: "accept", summary: "Reviewed in the owner account." } : mode === "returned" ? { decision: "return", summary: "Needs a source correction." } : null, sources: [{ id: decisionId, title: "Orchid sample governance note", revision: "2026-10-04T00:25:08.165Z" }], budget: { maxAttempts: 1, maxDurationSeconds: 600, maxOutputTokensIntent: 1200, tokenCostEnforcement: "unavailable" }, execution: { attempt: 1, startedAt: "2026-10-10T10:00:00Z", completedAt: ["running", "pending"].includes(mode) ? null : "2026-10-10T10:01:00Z", model: "gpt-5.6-sol", effort: "low", checkpoint: ["running", "pending"].includes(mode) ? null : "complete", eventsTruncated: false, events: [{ id: decisionId, type: "information_admitted", at: "2026-10-10T10:00:00Z" }] } }; }
let checked = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 834, 1440]) {
    for (const mode of ["dashboard", "result", "accepted", "returned", "running", "failed", "stopped", "pending", "error", "empty"]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      const errors = []; page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
      await page.route("**/v1/**", route => {
        const url = route.request().url();
        assert.equal(route.request().method(), "GET");
        if (mode === "error") return route.fulfill({ status: 503, json: { error: "server_error", message: "SYNTHETIC_SECRET_SERVER" } });
        if (url.includes("/information-result")) return route.fulfill({ json: { data: resultPacket(mode) } });
        if (url.includes("/dashboard/command")) return route.fulfill({ json: { data: mode === "empty" ? { ...dashboardPacket(), priorityItems: [] } : dashboardPacket() } });
        return route.fulfill({ json: { data: {} } });
      });
      const result = ["result", "accepted", "returned", "running", "failed", "stopped", "pending"].includes(mode);
      await page.goto(`${origin}${result ? "?result" : ""}`);
      if (mode === "error") await page.getByRole("alert").first().waitFor();
      else if (mode === "empty") await page.getByText(locale === "pl" ? /Brak pilnych sygnałów/ : /No urgent.*signals/).first().waitFor();
      else if (result) await page.getByRole("region", { name: locale === "pl" ? "Wynik zadania informacyjnego" : "Information task result" }).waitFor();
      else {
        const decision = page.getByRole("button", { name: /Approve information plan/ });
        await decision.waitFor();
        await decision.focus();
        await page.keyboard.press("Enter");
        const link = page.locator(`a[href='${decisionTarget}']`);
        await link.waitFor();
        assert.equal(await link.isVisible(), true);
        const close = page.getByRole("button", { name: locale === "pl" ? "Zamknij szczegóły uwagi" : "Close attention details" });
        if (width < 1280) {
          await close.evaluate(node => new Promise(resolve => requestAnimationFrame(resolve)));
          assert.equal(await close.evaluate(node => node === document.activeElement), true);
          await page.keyboard.press("Shift+Tab");
          assert.equal(await link.evaluate(node => node === document.activeElement), true);
          await page.keyboard.press("Escape");
          assert.equal(await decision.evaluate(node => node === document.activeElement), true);
        } else await close.click();
        await page.getByRole("button", { name: /Review worker finding/ }).click();
        assert.equal(await page.locator(`a[href='${resultTarget}']`).isVisible(), true);
      }
      if (result && mode === "result") {
        assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Przyjmij wynik informacyjny" : "Accept information result" }).isDisabled(), true);
        await page.getByText(locale === "pl" ? "Oś wykonania" : "Execution timeline").click();
        assert.equal(await page.getByText(locale === "pl" ? "Dopuszczono próbę" : "Attempt admitted").isVisible(), true);
      }
      if (result && mode === "accepted") assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Przyjmij wynik informacyjny" : "Accept information result" }).count(), 0);
      if (result && mode === "returned") await page.getByText(locale === "pl" ? "Wynik informacyjny zwrócony." : "Information result returned.").waitFor();
      if (result && mode === "failed") await page.getByText(locale === "pl" ? "Wygasło uwierzytelnienie dostawcy." : "Provider authentication expired.").waitFor();
      if (result && mode === "running") await page.getByText(locale === "pl" ? "Zadanie informacyjne jest wykonywane." : "Information task is running.").waitFor();
      if (result && mode === "stopped") await page.getByText(locale === "pl" ? "Zadanie informacyjne zatrzymano" : "Information task stopped", { exact: false }).waitFor();
      if (result && mode === "pending") await page.getByText(locale === "pl" ? "Zadanie informacyjne jest w kolejce." : "Information task is queued.").waitFor();
      assert.equal((await page.locator("body").innerText()).includes("SYNTHETIC_SECRET"), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${mode}/${width}`);
      assert.deepEqual(errors, [], `${locale}/${mode}/${width}`);
      await page.screenshot({ path: path.join(output, `${locale}-${mode}-${width}.png`), fullPage: true });
      await page.close(); checked++;
    }
  }
  const page = await browser.newPage({ viewport: { width: 834, height: 960 } });
  await page.addInitScript(() => localStorage.setItem("companycoreLocale", "en"));
  let pageReads = 0;
  await page.route("**/v1/**", route => {
    if (route.request().url().includes("/dashboard/attention")) {
      pageReads++;
      return route.fulfill({ json: { data: { items: [{ id: decisionId, kind: "decision", title: "Older pending decision", status: "pending", target: decisionTarget }], hasMore: false, nextOffset: 26 } } });
    }
    const items = Array.from({ length: 25 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`, kind: "incident", title: `Current incident ${index}`, status: "active", target: "/areas?area=09-technologia&view=incidents" }));
    return route.fulfill({ json: { data: { ...dashboardPacket(), priorityItems: items, attentionHasMore: true, attentionNextOffset: 25 } } });
  });
  await page.goto(origin);
  await page.getByRole("button", { name: "Show more listed items" }).click();
  await page.getByRole("button", { name: "Load older attention items" }).click();
  await page.getByRole("button", { name: /Older pending decision/ }).waitFor();
  assert.equal(pageReads, 1);
  assert.equal(await page.getByRole("button", { name: "Load older attention items" }).count(), 0);
  await page.close(); checked++;
  for (const locale of ["pl", "en"]) {
    const conflictPage = await browser.newPage({ viewport: { width: 390, height: 960 } });
    await conflictPage.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    let reviewWrites = 0;
    await conflictPage.route("**/v1/**", route => {
      if (route.request().method() === "POST") {
        assert.ok(route.request().url().includes("/review-information"));
        reviewWrites++;
        return route.fulfill({ status: 409, json: { error: "information_result_changed" } });
      }
      return route.fulfill({ json: { data: resultPacket("result") } });
    });
    await conflictPage.goto(`${origin}?result`);
    await conflictPage.getByRole("textbox", { name: locale === "pl" ? "Uzasadnienie odbioru" : "Review explanation" }).fill("Source revision needs confirmation.");
    await conflictPage.getByRole("button", { name: locale === "pl" ? "Przyjmij wynik informacyjny" : "Accept information result" }).click();
    await conflictPage.getByText(locale === "pl" ? /Wynik lub jego uprawnienie uległy zmianie/ : /The result or its authority changed/).waitFor();
    assert.equal(reviewWrites, 1);
    assert.equal(await conflictPage.getByText(locale === "pl" ? "Wynik informacyjny przyjęty." : "Information result accepted.").count(), 0);
    await conflictPage.getByRole("button", { name: locale === "pl" ? "Odśwież wynik" : "Refresh result" }).click();
    await conflictPage.getByRole("button", { name: locale === "pl" ? "Przyjmij wynik informacyjny" : "Accept information result" }).waitFor();
    await conflictPage.close(); checked++;
  }
  console.log(`G7 attention UI: ${checked} checks passed (60 PL/EN × 390/834/1440 attention and result states, pagination, and PL/EN review-conflict recovery). Screenshots: ${output}`);
} finally { await browser.close(); server.close(); }
