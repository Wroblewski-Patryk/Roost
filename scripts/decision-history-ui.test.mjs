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
  { id: "55555555-5555-4555-8555-555555555555", title: "Superseded contract", status: "accepted", governanceState: "accepted", historyReason: "superseded", source: "fixture" }
];
const bundle = await build({ stdin: { contents: "import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{DecisionsWorkbench}from'./web/src/features/departments/decisions-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><DecisionsWorkbench departmentKey='01-strategia' canonical/></LanguageProvider>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", loader: { ".css": "empty" }, define: { "process.env.NODE_ENV": '"test"' } });
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
      await page.getByRole("button", { name: locale === "pl" ? "Otwórz historię" : "Inspect history" }).filter({ visible: true }).first().click();
      const dialog = page.getByRole("dialog", { name: "Archived contract" });
      await dialog.waitFor();
      assert.equal(await dialog.getByText(`ID: ${archivedId}`).isVisible(), true);
      assert.equal(await dialog.getByText("Retained exact choice").isVisible(), true);
      assert.equal(await dialog.getByText("Option A; Option B").isVisible(), true);
      assert.equal(await dialog.getByText("Observed outcome").isVisible(), true);
      assert.equal(await dialog.getByText(`Current contract (ID: ${id})`).isVisible(), true);
      assert.equal(await dialog.getByRole("button", { name: locale === "pl" ? "Zapisz" : "Save" }).count(), 0);
      await dialog.press("Escape");
      assert.equal(await dialog.count(), 0);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${width}/${mode}: overflow`);
    assert.deepEqual(writes, [], `${locale}/${width}/${mode}: unexpected writes`);
    assert.deepEqual(errors, [], `${locale}/${width}/${mode}: page errors`);
    await page.close(); checked++;
  }
} finally {
  await browser.close(); server.close(); await once(server, "close");
}
console.log(`Decision current/history UI checks passed: ${checked}`);
