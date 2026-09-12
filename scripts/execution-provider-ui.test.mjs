import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
import contract from "./lib/agent-host-provider-contract.cjs";

const output = path.join(os.tmpdir(), "roost-provider-ui"); await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{AgentConnectionsSection}from'./web/src/features/settings/agent-connections-section';createRoot(document.getElementById('root')).render(<LanguageProvider><AgentConnectionsSection connection={null}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const css = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
const cssBytes = await readFile(path.join("public/react/assets", css));
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(cssBytes); }
  res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main id="root" style="padding:16px;max-width:1100px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true }); let checked = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 834, 1440]) for (const state of ["direct_codex", "hermes_codex", "verified", "timeout", "unknown", "empty", "error"]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } }), errors = [], writes = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const report = contract.projectProvider({ kind: ["verified", "timeout"].includes(state) ? "hermes_codex" : state,
      installation: state === "verified" ? { status: "verified", version: "0.21.2", fingerprint: "123456abcdef", checkedAt: "2026-09-12T12:00:00.000Z", signature: "unsigned" } : undefined,
      blockers: state === "hermes_codex" ? ["hermes_disabled", "hermes_executable_missing"] : state === "timeout" ? ["hermes_version_timeout"] : [] });
    await page.route("**/v1/**", async route => {
      if (route.request().method() !== "GET") writes.push(route.request().method());
      if (state === "error") return route.fulfill({ status: 503, json: { error: "fixture_unavailable" } });
      const hosts = state === "empty" ? [] : [{ id: "fixture", name: "Fixture host", workspaceId: "fixture", status: "online", applicationSlugs: [], lastSeenAt: new Date().toISOString(), metadata: { executionMode: "observe", runnerVersion: "fixture-v1" }, runtime: { executionProvider: report, compatibility: { compatible: false, reason: "observer_mode" }, executionUnavailableReasons: ["runtime_disabled", "observer_mode"] } }];
      return route.fulfill({ json: { data: route.request().url().includes("/readiness") ? { executionEnabled: false, mode: "foundation_only", applications: [], executionProviders: contract.registry } : hosts } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const panel = page.getByTestId("execution-provider-status");
    await panel.getByText(locale === "pl" ? "Wymagany przed pilotażem" : "Required before pilot", { exact: true }).waitFor();
    if (state !== "error") {
      await panel.getByText(/Hermes → Codex · 0\.21\.2/).waitFor();
      const summary = panel.locator("summary"); await summary.focus(); await page.keyboard.press("Enter");
      assert.equal(await panel.locator("details").getAttribute("open"), "");
      await panel.getByText("hermes_compatibility_unproven", { exact: true }).waitFor();
      if (state === "verified") {
        await panel.getByText(locale === "pl" ? "0.21.2 · zweryfikowana przez Worker" : "0.21.2 · verified by Worker", { exact: true }).waitFor();
        await panel.getByText("123456abcdef", { exact: true }).waitFor();
      }
      if (state === "timeout") await panel.getByText("hermes_version_timeout", { exact: true }).waitFor();
    } else await page.getByText(locale === "pl" ? "Nie udało się odczytać stanu hosta" : "Host status could not be loaded", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    if (["hermes_codex", "direct_codex", "verified", "timeout"].includes(state)) await page.screenshot({ path: path.join(output, `${locale}-${state}-${width}.png`), fullPage: true });
    await page.close(); checked++;
  }
  process.stdout.write(JSON.stringify({ checked, output }) + "\n");
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
