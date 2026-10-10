import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const bundle = await build({ stdin: { contents: "import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{CompanyGraphRoute}from'./web/src/features/departments/company-graph-route';createRoot(document.getElementById('root')).render(<LanguageProvider><CompanyGraphRoute/></LanguageProvider>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", loader: { ".css": "empty" }, define: { "process.env.NODE_ENV": '"test"' } });
const assetNames = await readdir("public/react/assets");
const cssName = assetNames.find((name) => /^index-.*\.css$/.test(name));
const graphCssName = assetNames.find((name) => /^unified-graph-3d-.*\.css$/.test(name));
assert.ok(cssName && graphCssName, "build:web output required");
const css = await readFile(path.join("public/react/assets", cssName));
const graphCss = await readFile(path.join("public/react/assets", graphCssName));
const packet = {
  schemaVersion: "company-graph-v2", generatedAt: "2026-10-10T00:00:00.000Z", rootNodeId: "workspace:sample",
  nodes: [
    { id: "workspace:sample", entityType: "workspace", label: "Sample Company", state: "active" },
    { id: "department:operations", entityType: "department", recordType: "04-operacje", label: "Operations", state: "active" },
    { id: "record:sample", entityType: "company_record", recordType: "procedure", label: "Sample record", state: "active" }
  ],
  edges: [
    { id: "structural:department", type: "contains", source: "structural", status: "active", from: { entityType: "workspace", entityId: "workspace:sample" }, to: { entityType: "department", entityId: "department:operations" } },
    { id: "structural:record", type: "owns", source: "structural", status: "active", from: { entityType: "department", entityId: "department:operations" }, to: { entityType: "company_record", entityId: "record:sample" } }
  ],
  summary: { recordCount: 1, contextualizedRecordCount: 1, unassignedRecordCount: 0, unrootedComponentCount: 0, relationshipCoverage: 100 },
  organizationalMemberships: [{ entityType: "company_record", entityId: "record:sample", departmentKey: "04-operacje", role: "owner" }]
};

const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url === "/graph-style.css") { res.setHeader("Content-Type", "text/css"); return res.end(graphCss); }
  if (req.url?.startsWith("/vendor/phosphor/bold/")) {
    try { const data = await readFile(path.join("node_modules/@phosphor-icons/web/src/bold", path.basename(req.url))); res.setHeader("Content-Type", req.url.endsWith("css") ? "text/css" : "font/woff2"); return res.end(data); }
    catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/graph-style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const origin = `http://127.0.0.1:${server.address().port}`;
let checked = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 834, 1440]) for (const mode of ["valid", "invalid", "error"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem("companycoreLocale", value), locale);
    await page.route("**/v1/company-intelligence/graph", (route) => mode === "error"
      ? route.fulfill({ status: 503, json: { error: "server_error" } })
      : route.fulfill({ json: { data: mode === "invalid" ? { ...packet, edges: [{ id: "bad", type: "contains", source: "structural" }] } : packet } }));
    await page.goto(origin);
    if (mode === "invalid") {
      await page.getByText(locale === "pl" ? "Graf firmy ma nieprawidłowe dane relacji." : "Company Graph has invalid relationship data.").waitFor();
      assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Odśwież dane" : "Refresh data" }).isVisible(), true);
      assert.equal(await page.locator(".company-graph-health .badge").innerText(), locale === "pl" ? "Dane niedostępne" : "Data unavailable");
    } else if (mode === "error") {
      assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Spróbuj ponownie" : "Try again" }).isVisible(), true);
      assert.equal(await page.locator(".company-graph-health .badge").innerText(), locale === "pl" ? "Dane niedostępne" : "Data unavailable");
    } else {
      await page.getByText("100% contextualized").waitFor();
      await page.locator(".unified-graph3d-access button").filter({ hasText: "Sample record" }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("heading", { name: "Sample record" }).waitFor();
      const context = page.getByRole("link", { name: "Open full context" });
      assert.equal(await context.getAttribute("href"), "/areas?area=00-ogolny&view=entity&type=company_record&id=record%3Asample");
      await page.getByRole("button", { name: "Explore relationships" }).click();
      assert.equal(await page.getByRole("button", { name: "Focused perspective" }).getAttribute("aria-pressed"), "true");
      await page.getByRole("searchbox", { name: "Search Company Graph" }).fill("nothing-matches-this");
      await page.getByText(locale === "pl" ? "Żadne obiekty nie pasują do wyszukiwania" : "No objects match this search").waitFor();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${width}/${mode}: horizontal overflow`);
    assert.deepEqual(errors, [], `${locale}/${width}/${mode}: page errors`);
    await page.close(); checked++;
  }
} finally {
  await browser.close(); server.close(); await once(server, "close");
}
console.log(`Company Graph UI checks passed: ${checked}`);
