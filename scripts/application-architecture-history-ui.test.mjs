import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const applicationId = "11111111-1111-4111-8111-111111111111";
const currentId = "22222222-2222-4222-8222-222222222222";
const archivedId = "33333333-3333-4333-8333-333333333333";
const bundle = await build({ stdin: { contents: "import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{useAppLocation,useClientNavigation}from'./web/src/app-navigation';import{InnovationRoute}from'./web/src/features/departments/innovation-route';import{ApplicationGraphRoute}from'./web/src/features/departments/application-graph-route';function App(){useClientNavigation();const location=useAppLocation();return new URL(location,window.location.origin).searchParams.get('view')==='application-graph'?<ApplicationGraphRoute/>:<InnovationRoute/>}createRoot(document.getElementById('root')).render(<LanguageProvider><App/></LanguageProvider>);", resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", loader: { ".css": "empty" }, define: { "process.env.NODE_ENV": '"test"' } });
const assetNames = await readdir("public/react/assets");
const cssName = assetNames.find((name) => /^index-.*\.css$/.test(name));
const graphCssName = assetNames.find((name) => /^application-graph-route-.*\.css$/.test(name));
assert.ok(cssName && graphCssName, "build:web output required");
const css = await readFile(path.join("public/react/assets", cssName));
const graphCss = await readFile(path.join("public/react/assets", graphCssName));
const application = {
  id: applicationId, name: "Fixture application", slug: "fixture-application", applicationType: "web_application", innovationStage: "idea", productStage: "idea", status: "active", targetPlatforms: ["web"], updatedAt: "2026-10-14T00:00:00.000Z", operation: null,
  architecture: [
    { id: currentId, type: "backend", name: "Current API", status: "active", description: "Live boundary" },
    { id: archivedId, type: "frontend", name: "Old console", status: "archived", description: "Retained history" }
  ]
};
const longName = "Archive".repeat(32);
const graphRoot = "portfolio:fixture";
const graphApplication = `application:${applicationId}`;
const graphNodes = [
  { id: graphRoot, entityId: "fixture", type: "portfolio", label: "Applications", shortLabel: "Applications", category: "Product Engineering", status: "active", completeness: 0, isRequired: true, isBlocked: false, hasEvidence: false, tags: [], parentNodeId: null, childCount: 1, path: [graphRoot], details: {} },
  { id: graphApplication, entityId: applicationId, type: "application", label: application.name, shortLabel: application.name, category: "Application", status: "active", completeness: 0, isRequired: true, isBlocked: false, hasEvidence: false, tags: [], parentNodeId: graphRoot, childCount: 0, path: [graphRoot, graphApplication], details: {} }
];
const graphPacket = { schemaVersion: "application-graph-v2", generatedAt: "2026-10-14T00:00:00.000Z", scope: "portfolio", rootNodeId: graphRoot, nodes: graphNodes, edges: [{ id: "hierarchy:fixture", source: graphRoot, target: graphApplication, type: "hierarchy", required: true }], projection: { sourceOfTruth: "product-engineering", initialDepth: 1, completeApplicationProjection: false, domainMappingVersion: "application-graph-domains-v1" } };
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url === "/graph-style.css") { res.setHeader("Content-Type", "text/css"); return res.end(graphCss); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/graph-style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const origin = `http://127.0.0.1:${server.address().port}`;
let checked = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) for (const mode of ["populated", "long", "empty", "error"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem("companycoreLocale", value), locale);
    await page.route("**/v1/**", (route) => {
      const url = new URL(route.request().url()).pathname;
      if (url === "/v1/product-engineering/portfolio") return route.fulfill({ json: { data: { applications: [], summary: {} } } });
      if (url === "/v1/product-engineering/catalog") return route.fulfill({ json: { data: { domains: [], dimensions: [], packs: [], blueprints: [], technologies: [] } } });
      if (url === "/v1/process-core/procedures" || url === "/v1/projects") return route.fulfill({ json: { data: [] } });
      if (url === `/v1/product-engineering/applications/${applicationId}`) return mode === "error"
        ? route.fulfill({ status: 404, json: { error: "application_not_found" } })
        : route.fulfill({ json: { data: mode === "empty" ? { ...application, architecture: [] } : mode === "long" ? { ...application, architecture: [application.architecture[0], { ...application.architecture[1], name: longName, description: "Boundary".repeat(40) }] } : application } });
      if (url.endsWith("/capability-map")) return route.fulfill({ json: { data: { capabilities: [] } } });
      if (url.endsWith("/gaps")) return route.fulfill({ json: { data: { gaps: [] } } });
      if (url.endsWith("/readiness")) return route.fulfill({ json: { data: { readiness: null } } });
      return route.fulfill({ status: 500, json: { error: "unexpected_test_route" } });
    });
    await page.goto(`${origin}/areas?area=11-innowacje&view=overview&applicationId=${applicationId}&cockpit=architecture&architecture=history`);
    if (mode === "error") {
      await page.getByText(locale === "pl" ? "Wskazana aplikacja jest niedostępna w tym workspace." : "The requested application is unavailable in this workspace.").waitFor();
      assert.equal(await page.getByRole("link", { name: locale === "pl" ? "Wróć do portfolio" : "Back to portfolio" }).getAttribute("href"), "/areas?area=11-innowacje&view=overview");
      assert.equal(await page.getByRole("group", { name: locale === "pl" ? "Zakres komponentów architektury" : "Architecture component scope" }).count(), 0);
    } else {
      const scope = page.getByRole("group", { name: locale === "pl" ? "Zakres komponentów architektury" : "Architecture component scope" });
      await scope.waitFor();
      const history = scope.getByRole("button", { name: locale === "pl" ? `Historia (${mode === "empty" ? 0 : 1})` : `History (${mode === "empty" ? 0 : 1})` });
      assert.equal(await history.getAttribute("aria-pressed"), "true");
      if (mode === "populated" || mode === "long") {
        assert.equal(await page.getByText(mode === "long" ? longName : "Old console").isVisible(), true);
        assert.equal(await page.getByText(`ID: ${archivedId}`).isVisible(), true);
        assert.equal(await page.getByText("Current API").count(), 0);
      } else await page.getByText(locale === "pl" ? "Brak zarchiwizowanych komponentów" : "No archived components").waitFor();
      await scope.getByRole("button", { name: locale === "pl" ? `Bieżące (${mode === "empty" ? 0 : 1})` : `Current (${mode === "empty" ? 0 : 1})` }).click();
      assert.equal(await page.getByRole("textbox", { name: locale === "pl" ? "Nazwa komponentu" : "Component name" }).count(), 1);
      if (mode === "populated" || mode === "long") {
        assert.equal(await page.getByText("Current API").isVisible(), true);
        assert.equal(await page.getByText(mode === "long" ? longName : "Old console").count(), 0);
      } else await page.getByText(locale === "pl" ? "Brak bieżących komponentów" : "No current components").waitFor();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${width}/${mode}: horizontal overflow`);
    assert.deepEqual(errors, [], `${locale}/${width}/${mode}: page errors`);
    await page.close(); checked++;
  }
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem("companycoreLocale", value), locale);
    await page.route("**/v1/**", (route) => {
      const url = new URL(route.request().url()).pathname;
      if (url === "/v1/product-engineering/graph") return route.fulfill({ json: { data: graphPacket } });
      if (url === `/v1/product-engineering/applications/${applicationId}/graph`) return route.fulfill({ json: { data: { ...graphPacket, scope: "application", applicationId, rootNodeId: graphApplication } } });
      if (url === "/v1/product-engineering/portfolio") return route.fulfill({ json: { data: { applications: [], summary: {} } } });
      if (url === "/v1/product-engineering/catalog") return route.fulfill({ json: { data: { domains: [], dimensions: [], packs: [], blueprints: [], technologies: [] } } });
      if (url === "/v1/process-core/procedures" || url === "/v1/projects") return route.fulfill({ json: { data: [] } });
      if (url === `/v1/product-engineering/applications/${applicationId}`) return route.fulfill({ json: { data: application } });
      if (url.endsWith("/capability-map")) return route.fulfill({ json: { data: { capabilities: [] } } });
      if (url.endsWith("/gaps")) return route.fulfill({ json: { data: { gaps: [] } } });
      if (url.endsWith("/readiness")) return route.fulfill({ json: { data: { readiness: null } } });
      return route.fulfill({ status: 500, json: { error: "unexpected_test_route" } });
    });
    await page.goto(`${origin}/areas?area=11-innowacje&view=application-graph`);
    await page.getByRole("searchbox", { name: "Search applications, domains, capabilities and features" }).fill("Fixture");
    await page.locator(".application-graph-search__results button").filter({ hasText: application.name }).click();
    const historyLink = page.getByRole("link", { name: locale === "pl" ? "Historia komponentów" : "Component history" });
    await historyLink.waitFor();
    assert.equal(await historyLink.getAttribute("href"), `/areas?area=11-innowacje&view=overview&applicationId=${applicationId}&cockpit=architecture&architecture=history`);
    await historyLink.click();
    await page.getByText("Old console").waitFor();
    assert.equal(new URL(page.url()).searchParams.get("architecture"), "history");
    assert.deepEqual(errors, [], `${locale}/${width}/graph-to-history: page errors`);
    await page.close(); checked++;
  }
} finally {
  await browser.close(); server.close(); await once(server, "close");
}
console.log(`Application architecture history UI checks passed: ${checked}`);
