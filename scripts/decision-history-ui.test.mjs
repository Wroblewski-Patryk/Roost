import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const id = "11111111-1111-4111-8111-111111111111";
const archivedId = "22222222-2222-4222-8222-222222222222";
const current = [
  { id, title: "Current contract", status: "accepted", historyReason: null, source: "fixture" },
  { id: "33333333-3333-4333-8333-333333333333", title: "Pending contract", status: "proposed", governanceState: "pending", historyReason: null, source: "fixture" }
];
const historical = [
  { id: archivedId, title: "Archived contract", status: "archived", historyReason: "archived", decision: "Retained exact choice", alternatives: ["Option A", "Option B"], outcome: "Observed outcome", authorType: "human", authorId: "owner-1", supersedes: { id, title: "Current contract" }, supersedesId: id, source: "fixture" },
  { id: "44444444-4444-4444-8444-444444444444", title: "Withdrawn proposal", status: "proposed", governanceState: "withdrawn", historyReason: "withdrawn", source: "fixture" },
  { id: "55555555-5555-4555-8555-555555555555", title: "Superseded contract", status: "accepted", governanceState: "accepted", historyReason: "superseded", source: "roost_decision" }
];
const bundle = await build({ stdin: { contents: "import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider,useLanguage}from'./web/src/i18n/i18n';import{DecisionsWorkbench}from'./web/src/features/departments/decisions-workbench';function SwitchLocale(){const{locale,setLocale}=useLanguage();return <button onClick={()=>setLocale(locale==='pl'?'en':'pl')} type='button'>Switch fixture locale</button>}createRoot(document.getElementById('root')).render(<LanguageProvider><SwitchLocale/><DecisionsWorkbench departmentKey='01-strategia' canonical/></LanguageProvider>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", loader: { ".css": "empty" }, define: { "process.env.NODE_ENV": '"test"' } });
const cssName = (await readdir("public/react/assets")).find((name) => /^index-.*\.css$/.test(name));
assert.ok(cssName, "build:web output required");
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
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) for (const mode of ["populated", "empty", "error"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [], writes = [];
    let currentReads = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem("companycoreLocale", value), locale);
    await page.route("**/v1/**", (route) => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== "GET") { writes.push(url.pathname); return route.fulfill({ status: 405, json: { error: "unexpected_write" } }); }
      if (url.pathname === "/v1/decisions") {
        const scope = url.searchParams.get("scope");
        if (scope === "history") return route.fulfill({ json: { data: mode === "empty" ? [] : historical } });
        if (mode === "error" && scope === "current" && currentReads++ === 0) return route.fulfill({ status: 503, json: { error: "temporary_failure" } });
        return route.fulfill({ json: { data: mode === "empty" ? [] : current } });
      }
      if (url.pathname === "/v1/decisions/governance") return route.fulfill({ json: { data: { revisions: [] } } });
      if (url.pathname === "/v1/decisions/interview-queue") return route.fulfill({ json: { data: [] } });
      if (url.pathname.startsWith("/v1/decisions/")) {
        const record = [...current, ...historical].find((row) => `/v1/decisions/${row.id}` === url.pathname);
        return record ? route.fulfill({ json: { data: record } }) : route.fulfill({ status: 404, json: { error: "not_found" } });
      }
      if (url.pathname === "/v1/departments") return route.fulfill({ json: { data: { departments: [{ id, key: "01-strategia", name: "Strategy" }] } } });
      return route.fulfill({ status: 500, json: { error: "unexpected_route" } });
    });
    await page.goto(`${origin}/areas?area=01-strategia&view=decisions`);
    const group = page.getByRole("group", { name: locale === "pl" ? "Zakres rejestru decyzji" : "Decision register scope" });
    await group.waitFor();
    if (mode === "error") {
      await page.getByRole("button", { name: locale === "pl" ? "Ponów" : "Retry" }).click();
      await page.getByText("Current contract").filter({ visible: true }).first().waitFor();
    } else if (mode === "empty") {
      await page.getByText(locale === "pl" ? "Brak bieżących decyzji" : "No current decisions").waitFor();
    } else {
      await page.getByText("Current contract").filter({ visible: true }).first().waitFor();
      assert.equal(await page.getByText("Archived contract").count(), 0);
      await page.getByText(locale === "pl" ? "Zaakceptowana" : "Accepted").filter({ visible: true }).first().waitFor();
      await page.getByText(locale === "pl" ? "Oczekująca" : "Pending").filter({ visible: true }).first().waitFor();
    }
    const history = group.getByRole("button", { name: locale === "pl" ? "Historia" : "History" });
    await history.press("Enter");
    assert.equal(await history.getAttribute("aria-pressed"), "true");
    if (mode === "empty") await page.getByText(locale === "pl" ? "Brak decyzji w historii" : "No decisions in history").waitFor();
    else {
      await page.getByText("Archived contract").filter({ visible: true }).first().waitFor();
      assert.equal(await page.getByText("Current contract").count(), 0);
      if (locale === "pl") {
        await page.getByText("Wycofana").filter({ visible: true }).first().waitFor();
        await page.getByText("Zastąpiona").filter({ visible: true }).first().waitFor();
      } else {
        await page.getByText("Withdrawn").filter({ visible: true }).first().waitFor();
        await page.getByText("Superseded").filter({ visible: true }).first().waitFor();
      }
      const statusOptions = await page.getByRole("combobox", { name: "Status" }).locator("option").allTextContents();
      assert.ok(statusOptions.includes(locale === "pl" ? "Wycofana" : "Withdrawn"));
      assert.ok(statusOptions.includes(locale === "pl" ? "Zastąpiona" : "Superseded"));
      assert.equal(statusOptions.includes(locale === "pl" ? "Withdrawn" : "Wycofana"), false);
      const statusFilter = page.getByRole("combobox", { name: "Status" });
      await statusFilter.selectOption("withdrawn");
      assert.equal(await statusFilter.inputValue(), "withdrawn");
      await page.getByText("Withdrawn proposal").filter({ visible: true }).first().waitFor();
      assert.equal(await page.getByText("Archived contract").count(), 0);
      assert.equal(await page.getByText("Superseded contract").count(), 0);
      await page.getByRole("button", { name: "Switch fixture locale" }).click();
      assert.equal(await statusFilter.inputValue(), "withdrawn");
      assert.equal(await statusFilter.locator("option:checked").textContent(), locale === "pl" ? "Withdrawn" : "Wycofana");
      await page.getByText("Withdrawn proposal").filter({ visible: true }).first().waitFor();
      assert.equal(await page.getByText("Archived contract").count(), 0);
      await page.getByRole("button", { name: "Switch fixture locale" }).click();
      await statusFilter.selectOption("all");
      await page.getByText("Archived contract").filter({ visible: true }).first().waitFor();
      await page.getByRole("button", { name: locale === "pl" ? "Otwórz historię" : "Inspect history" }).filter({ visible: true }).first().click();
      const dialog = page.getByRole("dialog", { name: "Archived contract" });
      await dialog.waitFor();
      assert.equal(await dialog.getByRole("button", { name: locale === "pl" ? "Zamknij" : "Close", exact: true }).isVisible(), true);
      assert.equal(await dialog.getByText(`ID: ${archivedId}`).isVisible(), true);
      assert.equal(await dialog.getByText("Retained exact choice").isVisible(), true);
      assert.equal(await dialog.getByText("Option A; Option B").isVisible(), true);
      assert.equal(await dialog.getByText("Observed outcome").isVisible(), true);
      assert.equal(await dialog.getByText(`Current contract (ID: ${id})`).isVisible(), true);
      assert.equal(await dialog.getByRole("button", { name: locale === "pl" ? "Zapisz" : "Save" }).count(), 0);
      await dialog.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${width}/${mode}: overflow`);
    assert.deepEqual(writes, [], `${locale}/${width}/${mode}: unexpected writes`);
    assert.deepEqual(errors, [], `${locale}/${width}/${mode}: page errors`);
    await page.close(); checked++;
  }
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [], writes = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem("companycoreLocale", value), locale);
    await page.route("**/v1/**", (route) => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== "GET") { writes.push(url.pathname); return route.fulfill({ status: 405, json: { error: "unexpected_write" } }); }
      if (url.pathname === "/v1/decisions") return route.fulfill({ json: { data: url.searchParams.get("scope") === "history" ? historical : current } });
      if (url.pathname === "/v1/decisions/governance") return route.fulfill({ json: { data: { revisions: [{ id, title: "Current proposal", state: "pending" }] } } });
      if (url.pathname === "/v1/decisions/interview-queue") return route.fulfill({ json: { data: [{ id, taskId: id, topic: "Current question", status: "pending" }] } });
      if (url.pathname.startsWith("/v1/decisions/")) {
        const record = [...current, ...historical].find((row) => `/v1/decisions/${row.id}` === url.pathname);
        return record ? route.fulfill({ json: { data: record } }) : route.fulfill({ status: 404, json: { error: "not_found" } });
      }
      if (url.pathname === "/v1/departments") return route.fulfill({ json: { data: { departments: [{ id, key: "01-strategia", name: "Strategy" }] } } });
      return route.fulfill({ status: 500, json: { error: "unexpected_route" } });
    });
    const base = `${origin}/areas?area=01-strategia&view=decisions`;
    const governedHistoryId = historical[2].id;
    await page.goto(base);
    await page.getByRole("button", { name: /Current proposal/ }).waitFor();
    await page.getByRole("button", { name: /Current question/ }).waitFor();
    await page.getByRole("button", { name: locale === "pl" ? "Historia" : "History" }).press("Enter");
    assert.equal(new URL(page.url()).searchParams.get("scope"), "history");
    assert.equal(await page.getByRole("button", { name: /Current proposal/ }).count(), 0);
    assert.equal(await page.getByRole("button", { name: /Current question/ }).count(), 0);
    await page.getByRole("button", { name: locale === "pl" ? "Otwórz historię" : "Inspect history" }).filter({ visible: true }).last().click();
    await page.getByRole("dialog", { name: "Superseded contract" }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("decisionId"), governedHistoryId);
    assert.equal(await page.getByRole("dialog", { name: "Superseded contract" }).getByRole("button", { name: locale === "pl" ? "Zapisz" : "Save" }).count(), 0);
    await page.reload();
    await page.getByRole("dialog", { name: "Superseded contract" }).waitFor();
    await page.getByRole("dialog", { name: "Superseded contract" }).press("Escape");
    assert.equal(new URL(page.url()).searchParams.get("decisionId"), null);
    assert.equal(new URL(page.url()).searchParams.get("scope"), "history");
    await page.goBack();
    await page.getByRole("dialog", { name: "Superseded contract" }).waitFor();
    await page.goto(`${base}&decisionId=${governedHistoryId}`);
    await page.getByRole("dialog", { name: "Superseded contract" }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("scope"), "history");
    await page.goto(`${base}&scope=history&decisionId=${archivedId}`);
    await page.getByRole("dialog", { name: "Archived contract" }).waitFor();
    await page.goto(`${base}&decisionId=${id}`);
    await page.getByRole("dialog", { name: locale === "pl" ? "Edytuj decyzję" : "Edit decision" }).waitFor();
    await page.goto(`${base}&scope=history&decisionId=${id}`);
    await page.getByText(locale === "pl" ? "Ta decyzja jest bieżąca, nie należy do Historii." : "This decision is current, not in History.").waitFor();
    assert.equal(new URL(await page.getByRole("link", { name: locale === "pl" ? "Pokaż bieżące" : "Show Current" }).getAttribute("href"), origin).searchParams.get("scope"), null);
    await page.goto(`${base}&scope=history&decisionId=66666666-6666-4666-8666-666666666666`);
    await page.getByText(locale === "pl" ? "Nie można otworzyć wskazanej decyzji w tym workspace." : "The requested decision is unavailable in this workspace.").waitFor();
    assert.equal(new URL(await page.getByRole("link", { name: locale === "pl" ? "Wróć do Historii" : "Back to History" }).getAttribute("href"), origin).searchParams.get("scope"), "history");
    await page.goto(`${base}&scope=history&decisionId=invalid`);
    await page.getByText(locale === "pl" ? "Nie można otworzyć wskazanej decyzji w tym workspace." : "The requested decision is unavailable in this workspace.").waitFor();
    await page.goto(`${base}&decisionId=${archivedId}&from=attention`);
    await page.getByRole("dialog", { name: "Archived contract" }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("scope"), "history");
    assert.equal(new URL(page.url()).searchParams.get("from"), "attention");
    assert.equal(await page.getByRole("link", { name: locale === "pl" ? "Wróć do uwag" : "Back to attention" }).getAttribute("href"), "/areas?area=00-ogolny&view=overview");
    await page.getByRole("dialog", { name: "Archived contract" }).press("Escape");
    assert.equal(new URL(page.url()).searchParams.get("from"), "attention", "closing historical detail retains Today origin");
    await page.getByRole("link", { name: locale === "pl" ? "Wróć do uwag" : "Back to attention" }).click();
    assert.equal(new URL(page.url()).searchParams.get("view"), "overview");
    await page.goto(`${base}&decisionId=invalid&from=attention`);
    await page.getByText(locale === "pl" ? "Nie można otworzyć wskazanej decyzji w tym workspace." : "The requested decision is unavailable in this workspace.").waitFor();
    assert.equal(await page.getByRole("link", { name: locale === "pl" ? "Wróć do uwag" : "Back to attention" }).getAttribute("href"), "/areas?area=00-ogolny&view=overview");
    await page.goto(`${base}&scope=history`);
    await page.getByRole("button", { name: locale === "pl" ? "Bieżące" : "Current" }).click();
    await page.getByRole("button", { name: locale === "pl" ? "Archiwizuj" : "Archive" }).first().click();
    await page.getByText(locale === "pl" ? "Zarchiwizować decyzję?" : "Archive decision?").waitFor();
    await page.goBack();
    await page.getByRole("button", { name: locale === "pl" ? "Historia" : "History", exact: true }).waitFor();
    assert.equal(await page.getByText(locale === "pl" ? "Zarchiwizować decyzję?" : "Archive decision?").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${width}/navigation: overflow`);
    assert.deepEqual(writes, [], `${locale}/${width}/navigation: unexpected writes`);
    assert.deepEqual(errors, [], `${locale}/${width}/navigation: page errors`);
    await page.close(); checked++;
  }
} finally {
  await browser.close(); server.close(); await once(server, "close");
}
console.log(`Decision current/history UI checks passed: ${checked}`);
