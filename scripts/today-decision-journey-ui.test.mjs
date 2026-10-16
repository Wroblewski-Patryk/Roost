import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const decisionId = "00000000-0000-4000-8000-000000000002";
const taskId = "00000000-0000-4000-8000-000000000003";
const previewId = "00000000-0000-4000-8000-000000000004";
const target = `/areas?area=01-strategia&view=decisions&decisionId=${decisionId}&from=attention`;
const bundle = await build({ stdin: {
  contents: "import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{useAppLocation,useClientNavigation}from'./web/src/app-navigation';import{GeneralDashboard}from'./web/src/features/departments/general-dashboard';import{DecisionsWorkbench}from'./web/src/features/departments/decisions-workbench';function App(){useClientNavigation();const location=useAppLocation();return location.includes('view=decisions')?<DecisionsWorkbench departmentKey='01-strategia' canonical/>:<GeneralDashboard/>}createRoot(document.getElementById('root')).render(<LanguageProvider><App/></LanguageProvider>);",
  resolveDir: process.cwd(), loader: "tsx"
}, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, "built web CSS is required");
const css = await readFile(path.join("public/react/assets", cssName));
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const origin = `http://127.0.0.1:${server.address().port}`;
let checked = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: "reduce" });
    const errors = [], writes = [];
    let accepted = false;
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const proposal = { title: "Choose the scoped approach", context: "Two current approaches have different costs", decision: "Use the smaller delivery", rationale: "It provides evidence", consequences: "Later work needs review", scopeReason: "Only this task is affected", scope: [{ type: "task", id: taskId }], conflicts: [] };
    const impact = { nodes: [{ type: "task", id: taskId, title: "Scoped task" }], taskIds: [taskId], contexts: [], grants: [], handoffs: [], interviews: [] };
    const root = () => ({ expectedVersion: "a".repeat(64), canWrite: true, canAccept: !accepted, authorityCatalog: { workforce: [], departments: [] }, catalog: [], resourceCatalog: [], configurationCatalog: [], revisions: [{ id: decisionId, title: proposal.title, state: accepted ? "accepted" : "pending" }], deferrals: [] });
    const detail = () => ({ ...root(), selected: { decisionId, version: 1, state: accepted ? "accepted" : "pending", body: proposal }, impact, current: true, previews: [{ id: previewId, version: 1, createdAt: "2026-10-16T10:00:00Z", impact }], acceptance: accepted ? { id: decisionId, createdAt: "2026-10-16T11:00:00Z" } : null, ancestors: [], supersededBy: [], taskStates: [{ id: taskId, title: "Scoped task", executionReadiness: { status: "ready" } }], gates: [{ taskId, seal: "valid" }] });
    const attentionItem = { id: decisionId, kind: "decision", title: proposal.title, status: "pending", reason: "decision_pending", responsible: "Owner", context: proposal.context, target };
    await page.route("**/v1/**", route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() === "POST") {
        writes.push({ path: url.pathname, body: request.postDataJSON() });
        if (url.pathname === `/v1/decisions/${decisionId}/governance/actions` && writes.at(-1).body.action === "accept") {
          accepted = true; return route.fulfill({ status: 201, json: { data: { record: { id: decisionId } } } });
        }
        return route.fulfill({ status: 405, json: { error: "unexpected_write" } });
      }
      if (url.pathname === "/v1/dashboard/command") return route.fulfill({ json: { data: { summary: {}, departmentSignals: [], latestRouteProposals: [], attentionTotal: accepted ? 0 : 1, priorityItems: accepted ? [] : [attentionItem] } } });
      if (url.pathname === "/v1/dashboard/attention") return route.fulfill({ json: { data: { items: accepted ? [] : [attentionItem], totalCount: accepted ? 0 : 1, decisionCount: accepted ? 0 : 1, hasMore: false } } });
      if (url.pathname === "/v1/decisions/governance") return route.fulfill({ json: { data: root() } });
      if (url.pathname === `/v1/decisions/${decisionId}/governance`) return route.fulfill({ json: { data: detail() } });
      if (url.pathname === `/v1/decisions/${decisionId}`) return route.fulfill({ json: { data: { id: decisionId, title: proposal.title, source: "roost_decision", historyReason: null, status: accepted ? "accepted" : "proposed" } } });
      if (url.pathname === "/v1/decisions") return route.fulfill({ json: { data: [{ id: decisionId, title: proposal.title, source: "roost_decision", historyReason: null, status: accepted ? "accepted" : "proposed" }] } });
      if (url.pathname === "/v1/decisions/interview-queue") return route.fulfill({ json: { data: [] } });
      if (url.pathname === "/v1/departments") return route.fulfill({ json: { data: { departments: [] } } });
      if (url.pathname === "/v1/task-proposals") return route.fulfill({ json: { data: { items: [], page: 0, hasMore: false } } });
      return route.fulfill({ json: { data: {} } });
    });
    await page.goto(`${origin}/areas?area=00-ogolny&view=overview`);
    const attention = page.getByRole("button", { name: proposal.title });
    await attention.waitFor();
    await attention.press("Enter");
    const link = page.locator(`a[href='${target}']`);
    await link.waitFor();
    await link.press("Enter");
    assert.equal(new URL(page.url()).searchParams.get("decisionId"), decisionId);
    const dialog = page.getByRole("dialog", { name: proposal.title });
    await dialog.waitFor();
    await dialog.getByText(proposal.decision).waitFor();
    await dialog.getByRole("button", { name: locale === "pl" ? "Przejrzyj i zaakceptuj" : "Review and accept" }).click();
    await page.getByRole("button", { name: locale === "pl" ? "Akceptuję wskazany zakres" : "Accept the listed scope" }).click();
    await dialog.getByText(locale === "pl" ? "Jawna akceptacja" : "Explicit acceptance").waitFor();
    assert.deepEqual(writes, [{ path: `/v1/decisions/${decisionId}/governance/actions`, body: { requestId: writes[0].body.requestId, expectedVersion: "a".repeat(64), action: "accept", previewId } }]);
    await dialog.getByRole("button", { name: locale === "pl" ? "Wróć" : "Back", exact: true }).click();
    await page.waitForURL(/view=overview/);
    await attention.waitFor({ state: "hidden" });
    await page.goto(`${origin}/areas?area=01-strategia&view=decisions&decisionId=${decisionId}`);
    await page.getByRole("dialog", { name: proposal.title }).getByText(locale === "pl" ? "Jawna akceptacja" : "Explicit acceptance").waitFor();
    assert.equal(new URL(page.url()).searchParams.get("scope"), null, "accepted Decision remains in Current");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${width}: overflow`);
    assert.deepEqual(errors, [], `${locale}/${width}: page errors`);
    await page.close(); checked++;
  }
} finally {
  await browser.close(); server.close(); await once(server, "close");
}
console.log(`Today Decision routed UI journey: ${checked} PL/EN narrow/wide checks passed`);
