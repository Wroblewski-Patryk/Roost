import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = path.join(os.tmpdir(), "roost-active-context-ui"); await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{AgentExecutionsRoute}from'./web/src/features/departments/agent-executions-route';createRoot(document.getElementById('root')).render(<LanguageProvider><AgentExecutionsRoute/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
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
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 834, 1440]) for (const state of ["requested", "stopped", "cancelled"]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } }), requests = [], errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const execution = { id: "fixture-execution", status: state === "requested" ? "running" : state === "stopped" ? "waiting_for_approval" : "cancelled", createdAt: "2026-09-07T20:00:00Z", startedAt: "2026-09-07T20:01:00Z",
      contextInvalidatedAt: "2026-09-07T20:02:00Z", contextStoppedAt: state === "requested" ? null : "2026-09-07T20:03:00Z",
      task: { id: "00000000-0000-4000-8000-000000000123", title: "Aktualizacja formularza zgłoszeń" }, application: { id: "fixture-app", name: "Portal obsługi klienta", slug: "fixture" }, agentHost: { id: "fixture-host", name: "Laptop · agent" }, changedFiles: [], verification: {}, usage: {}, events: [],
      errorState: { code: "agent_execution_context_invalidated", message: "SYNTHETIC_SECRET_NOT_FOR_DISPLAY" },
      contextInvalidation: { changedSources: [{ table: "company_records", id: "00000000-0000-4000-8000-000000000456", label: "Zasady akceptacji zmian i aktualności dokumentacji technicznej", operation: "update", changedAt: "2026-09-07T20:02:00Z" }] } };
    await page.route("**/v1/**", async route => {
      const url = route.request().url(); requests.push({ url, method: route.request().method() });
      if (url.endsWith("/actions/cancel")) { execution.status = "cancelled"; return route.fulfill({ json: { data: execution } }); }
      assert.equal(route.request().method(), "GET");
      if (url.includes("execution-readiness")) return route.fulfill({ status: 503, json: { error: "fixture_read_unavailable" } });
      if (url.includes("/executions?")) return route.fulfill({ json: { data: [execution] } });
      if (url.endsWith("/readiness")) return route.fulfill({ json: { data: { executionEnabled: false, mode: "foundation_only", applications: [] } } });
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Open execution", exact: true }).first().click({ timeout: 5000 }).catch(async error => {
      await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true });
      throw new Error(JSON.stringify({ requests, errors, text: (await page.locator("body").innerText()).slice(0, 3500), error: error.message }));
    });
    const dialog = page.getByRole("dialog", { name: "Codex execution details" });
    await dialog.getByText(locale === "pl" ? state === "requested" ? "Kontekst zmieniony — zażądano zatrzymania" : "Host potwierdził zatrzymanie pracy" : state === "requested" ? "Context changed — stop requested" : "Host confirmed work stopped", { exact: true }).waitFor();
    assert.equal((await dialog.innerText()).includes("SYNTHETIC_SECRET"), false);
    assert.equal(await dialog.getByRole("button", { name: locale === "pl" ? "Ponów" : "Retry", exact: true }).count(), 0);
    await dialog.getByText(locale === "pl" ? "Zmienione źródła (1)" : "Changed sources (1)", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, `${locale}-${state}-${width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (state === "requested") assert.equal(await dialog.getByRole("button", { name: /Close stopped attempt|Zamknij zatrzymaną próbę/ }).count(), 0);
    if (state === "stopped") {
      const close = dialog.getByRole("button", { name: locale === "pl" ? "Zamknij zatrzymaną próbę" : "Close stopped attempt" });
      await close.focus(); await page.keyboard.press("Enter");
      await dialog.getByRole("button", { name: locale === "pl" ? "Sprawdź nowy kontekst" : "Review new context" }).waitFor();
      assert.equal(requests.filter(r => r.method === "POST").length, 1);
    }
    if (state === "cancelled") {
      await dialog.getByRole("button", { name: locale === "pl" ? "Sprawdź nowy kontekst" : "Review new context" }).click();
      await page.getByText(locale === "pl" ? "Nie udało się potwierdzić żądania." : "The request could not be confirmed.", { exact: false }).waitFor();
      assert.ok(requests.some(r => r.url.includes(`/tasks/${execution.task.id}/execution-readiness?editor=1`)));
      assert.equal(requests.some(r => r.method === "POST"), false);
    }
    assert.deepEqual(errors, []); await page.close(); checked++;
  }
  process.stdout.write(JSON.stringify({ checked, output }) + "\n");
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
