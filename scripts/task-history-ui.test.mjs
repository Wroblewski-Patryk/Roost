import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const archivedId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const tasks = [
  { id: archivedId, title: "Retained release task", description: "Audit evidence remains available.", status: "archived", source: "clickup", externalId: "provider-42", createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-15T10:00:00.000Z", organizationalContext: { ownerDepartment: { key: "04-operacje" } } },
  { id: otherId, title: "Other department task", status: "archived", source: "companycore", organizationalContext: { ownerDepartment: { key: "01-strategia" } } }
];
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{OperationsRoute}from'./web/src/features/departments/operations-route';createRoot(document.getElementById('root')).render(<LanguageProvider><OperationsRoute/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const stylesheet = readFileSync(join("public", "react", "assets", readdirSync(join("public", "react", "assets")).find(name => /^index-.*\.css$/.test(name))));
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/theme.css") { res.setHeader("Content-Type", "text/css"); return res.end(stylesheet); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/theme.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${server.address().port}/areas?area=04-operacje&view=tasks`;
let cases = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    await page.addInitScript(language => { localStorage.setItem("companycoreLocale", language); sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token"); }, locale);
    const requests = [];
    let mode = "populated";
    await page.route("**/v1/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      requests.push({ method: request.method(), path: url.pathname, query: url.searchParams.toString() });
      if (url.pathname === "/v1/tasks" && request.method() === "GET") {
        if (mode === "error") return route.fulfill({ status: 503, json: { error: "unavailable" } });
        const rows = mode === "empty" ? [] : url.searchParams.has("departmentKey") ? tasks.filter(task => task.organizationalContext.ownerDepartment.key === url.searchParams.get("departmentKey")) : tasks;
        return route.fulfill({ json: { data: rows } });
      }
      if (url.pathname === `/v1/tasks/${archivedId}` && request.method() === "GET") return route.fulfill({ json: { data: tasks[0] } });
      if (url.pathname === "/v1/operations/work-items" && request.method() === "GET") return route.fulfill({ json: { data: { workItems: [], taskLists: [], departments: [], statuses: [] } } });
      return route.fulfill({ status: 403, json: { error: "fixture_route_denied" } });
    });
    await page.goto(`${base}&department=04-operacje&scope=history`);
    await page.getByRole("heading", { name: locale === "pl" ? "Historia zadań" : "Task history" }).waitFor();
    const taskLink = page.getByRole("link", { name: width < 640 ? locale === "pl" ? "Otwórz zapis" : "Open record" : "Retained release task" }).first();
    await taskLink.waitFor();
    assert.equal(await page.getByText("Other department task").count(), 0);
    assert.ok(requests.some(request => request.path === "/v1/tasks" && request.query.includes("archive=only") && request.query.includes("departmentKey=04-operacje")));
    await taskLink.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "Retained release task" }).last().waitFor();
    assert.ok(page.url().includes(`historicalTaskId=${archivedId}`));
    await page.getByText(archivedId).waitFor();
    await page.getByText("provider-42").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "history must not overflow horizontally");
    if (locale === "pl") await page.screenshot({ path: join(tmpdir(), `roost-task-history-${width}.png`), fullPage: true });
    assert.equal(await page.getByRole("button", { name: /save|zapisz|archive|archiwizuj/i }).count(), 0);
    assert.deepEqual([...new Set(requests.map(request => request.method))], ["GET"]);
    assert.ok((await page.getByRole("link", { name: locale === "pl" ? "Bieżące" : "Current" }).getAttribute("href")).includes("department=04-operacje"));
    const currentResponse = page.waitForResponse(response => response.url().includes("/v1/operations/work-items") && response.status() === 200);
    await page.getByRole("link", { name: locale === "pl" ? "Bieżące" : "Current" }).click();
    await currentResponse;
    assert.ok(requests.some(request => request.path === "/v1/operations/work-items" && request.query.includes("archive=exclude") && request.query.includes("departmentKey=04-operacje")));
    assert.equal(await page.getByText("Retained release task").count(), 0);
    await page.goto(`${base}&taskId=${archivedId}`);
    await page.waitForURL(url => url.searchParams.get("scope") === "history" && url.searchParams.get("historicalTaskId") === archivedId);
    await page.getByRole("heading", { name: "Retained release task" }).last().waitFor();
    await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=01-strategia&view=tasks&department=01-strategia&scope=history`);
    await page.getByRole("heading", { name: locale === "pl" ? "Historia zadań" : "Task history" }).waitFor();
    await page.getByLabel(locale === "pl" ? "Filtruj według działu" : "Filter by department").selectOption("04-operacje");
    await page.waitForURL(url => url.searchParams.get("area") === "04-operacje" && url.searchParams.get("department") === "04-operacje" && url.searchParams.get("scope") === "history");
    assert.deepEqual([...new Set(requests.map(request => request.method))], ["GET"]);
    await page.close();
    cases += 1;

    const empty = await browser.newPage({ viewport: { width, height: 850 } });
    await empty.addInitScript(language => { localStorage.setItem("companycoreLocale", language); sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token"); }, locale);
    await empty.route("**/v1/tasks?**", route => route.fulfill({ json: { data: [] } }));
    await empty.goto(`${base}&scope=history`);
    await empty.getByText(locale === "pl" ? "Brak zadań w historii" : "No tasks in history").waitFor();
    await empty.close();
    cases += 1;

    const error = await browser.newPage({ viewport: { width, height: 850 } });
    await error.addInitScript(language => { localStorage.setItem("companycoreLocale", language); sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token"); }, locale);
    let failed = true;
    await error.route("**/v1/tasks?**", route => failed ? route.fulfill({ status: 503, json: { error: "unavailable" } }) : route.fulfill({ json: { data: [] } }));
    await error.goto(`${base}&scope=history`);
    const retry = error.getByRole("button", { name: locale === "pl" ? "Ponów" : "Retry" });
    await retry.waitFor();
    failed = false;
    await retry.click();
    await error.getByText(locale === "pl" ? "Brak zadań w historii" : "No tasks in history").waitFor();
    await error.close();
    cases += 1;
  }
  console.log(`Task Current/History PL/EN narrow/wide, keyboard, exact read-only record, archived deep-link redirect, department switch, empty/error/retry: ${cases}/${cases}`);
} finally {
  await browser.close();
  server.close();
}
