import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = path.join(os.tmpdir(), "roost-runtime-redaction-ui"); await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{AgentExecutionsRoute}from'./web/src/features/departments/agent-executions-route';import{CompanyRecordsWorkbench}from'./web/src/features/departments/company-records-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider>{location.pathname==="/incidents"?<CompanyRecordsWorkbench departmentKey="09-technologia" recordType="technical_incident"/>:<AgentExecutionsRoute/>}</LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const css = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(await readFile(path.join("public/react/assets", css))); }
  if (req.url.startsWith("/vendor/phosphor/bold/")) {
    const name = path.basename(req.url);
    try { res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "font/woff2"); return res.end(await readFile(path.join("node_modules/@phosphor-icons/web/src/bold", name))); } catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true }); let checked = 0;
const fingerprint = "00000000-0000-4000-8000-000000000123";
const metadata = { fingerprint, surface: "input.diagnostic", findings: [{ category: "credential", location: "$.payload.text" }] };
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) for (const surface of ["execution", "incidents"]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } }), errors = [];
    page.setDefaultTimeout(8000);
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    await page.route("**/v1/**", async route => {
      const url = route.request().url();
      assert.equal(route.request().method(), "GET");
      if (url.includes("/executions?")) return route.fulfill({ json: { data: [{ id: "fixture-execution", status: "failed", createdAt: "2026-09-08T08:00:00Z", task: { id: fingerprint, title: "Synthetic parser task" }, application: { id: "fixture-app", name: "Synthetic app", slug: "fixture" }, changedFiles: [], verification: {}, usage: {}, finalResponse: "[REDACTED]", errorState: { code: "agent_runtime_content_blocked", retryable: false }, events: [{ id: "fixture-event", type: "runtime_redaction", level: "warning", message: "Content removed.", payload: metadata, createdAt: "2026-09-08T08:00:00Z" }] }] } });
      if (url.includes("/company-records?")) return route.fulfill({ json: { data: [{ id: "fixture-incident", recordType: "technical_incident", key: "runtime-redaction:fixture", title: "Agent runtime content removed", status: "active", priority: "high", functionalState: "unknown", verificationState: "unverified", evidenceCount: 0, source: "runtime_redaction_v1", metadata }] } });
      if (url.includes("/departments?")) return route.fulfill({ json: { data: { departments: [] } } });
      if (url.endsWith("/readiness")) return route.fulfill({ json: { data: { executionEnabled: false, applications: [] } } });
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/${surface === "incidents" ? "incidents" : ""}`);
    if (surface === "execution") await page.getByRole("button", { name: "Open execution", exact: true }).click();
    else await page.getByRole("button", { name: "Edit", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText(locale === "pl" ? "Treść została usunięta" : "Content was removed", { exact: true }).waitFor();
    await dialog.getByText(fingerprint, { exact: true }).waitFor();
    await dialog.getByText("$.payload.text", { exact: true }).waitFor();
    const link = dialog.getByRole("link", { name: locale === "pl" ? "Incydenty techniczne" : "Technical incidents", exact: true });
    await link.focus(); assert.equal(await link.getAttribute("href"), "/areas?area=09-technologia&view=incidents");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, `${locale}-${surface}-${width}.png`) });
    await page.close(); checked++;
  }
  console.log(JSON.stringify({ checked, output }));
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
