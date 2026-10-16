import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const goalId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const workspaceId = "33333333-3333-4333-8333-333333333333";
const ownerId = "44444444-4444-4444-8444-444444444444";
const versionId = "55555555-5555-4555-8555-555555555555";
const title = "Fictional withdrawn goal";
const now = new Date().toISOString();
const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{GoalsWorkbench}from'./web/src/features/departments/goals-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><GoalsWorkbench canonical/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
});
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, "Build owner-console CSS first");
const css = await readFile(path.join("public/react/assets", cssName));
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch({ headless: true });
try {
  for (const [locale, width] of [["pl", 390], ["en", 1440]]) {
    let retired = false;
    const writes = [];
    const goal = { id: goalId, title, status: "active", priority: "normal", tasks: [{ id: taskId }], targets: [] };
    const version = { id: versionId, version: 1, status: "adopted", result: "Fictional outcome", metric: "Cases", unit: "cases", targetValue: 1, evidenceSource: "Fixture", accountableUserId: ownerId, bindingDeadline: null, forecastDate: null, forecastBasis: null, executionSchedule: null, provenance: "Fixture", adoptedAt: now };
    const packet = () => ({ goal: { ...goal, status: retired ? "archived" : "active" }, current: retired ? null : version,
      versions: [{ ...version, status: retired ? "retired" : "adopted" }], measurements: [], progressStatus: "unknown", progress: null,
      tasks: [{ id: taskId, title: "Preserved ClickUp task", status: "todo", estimatedDurationMinutes: null }],
      economics: { executions: [], attemptCount: 0, acceptedOutcomeCount: 0, reviewReturnCount: 0,
        observedExecutionElapsedMs: null, elapsedUnknownCount: 0, observedModelCost: null,
        modelCostUnknownCount: 0, humanEffortMinutes: null, providerInputTokens: null,
        providerOutputTokens: null, historicalUnknownAttributionCount: 0, executionRowsOmittedCount: 0 } });
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", error => process.stderr.write(`pageerror: ${error.message}\n`));
    await page.addInitScript(language => {
      localStorage.setItem("companycoreLocale", language);
      sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token");
    }, locale);
    await page.route("**/v1/**", async route => {
      const request = route.request();
      const { pathname, searchParams } = new URL(request.url());
      const body = request.postDataJSON?.() ?? {};
      if (pathname === "/v1/goals") return route.fulfill({ json: { data: searchParams.get("archive") === "only" ? retired ? [{ ...goal, status: "archived" }] : [] : retired ? [] : [goal] } });
      if (pathname === "/v1/departments") return route.fulfill({ json: { data: { departments: [] } } });
      if (pathname === "/v1/auth/me") return route.fulfill({ json: { data: { workspaceId, user: { preferredLanguage: locale } } } });
      if (pathname === `/v1/workspaces/${workspaceId}/access/members`) return route.fulfill({ json: { data: [{ userId: ownerId, name: "Fixture owner", email: "owner@example.invalid", role: "owner", taskScopeId: null }] } });
      if (pathname === "/v1/evidence") return route.fulfill({ json: { data: [] } });
      if (pathname === `/v1/goal-mandates/goals/${goalId}`) return route.fulfill({ json: { data: packet() } });
      if (pathname === `/v1/goal-mandates/goals/${goalId}/retirement-preview`) return route.fulfill({ json: { data: {
        goal, head: { id: "66666666-6666-4666-8666-666666666666", currentVersionId: versionId }, version,
        impact: { tasks: [{ id: taskId, title: "Preserved ClickUp task", status: "todo", source: "clickup", externalId: "fixture", readiness: "needs_revalidation" }], targetCount: 0, childGoalCount: 0, measurementCount: 0, executionCount: 1, activeExecutionCount: 0 },
        blockers: [], digest: "a".repeat(64), previewToken: "synthetic-preview-token", expiresAt: new Date(Date.now() + 300000).toISOString() } } });
      if (pathname === "/v1/auth/reauth") {
        assert.equal(body.method, "POST");
        assert.equal(body.path, `/v1/goal-mandates/goals/${goalId}/actions/retire`);
        const retire = writes.find(item => item.pathname.endsWith("/actions/retire"));
        assert.equal(retire, undefined, "proof precedes retirement");
        return route.fulfill({ json: { data: { proof: "synthetic-proof" } } });
      }
      if (pathname === `/v1/goal-mandates/goals/${goalId}/actions/retire`) {
        assert.equal(request.headers()["x-owner-action-proof"], "synthetic-proof");
        assert.equal(body.previewToken, "synthetic-preview-token");
        assert.ok(body.reason.length >= 12);
        assert.match(body.requestId, /^[a-f0-9-]{36}$/);
        assert.equal(body.reason.includes("Fixture"), true);
        assert.equal(body.previewToken, "synthetic-preview-token");
        writes.push({ pathname, body });
        retired = true;
        return route.fulfill({ json: { data: { goalId, status: "archived", retiredMandateVersionId: versionId } } });
      }
      throw new Error(`Unexpected ${request.method()} ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: locale === "pl" ? "Bieżące" : "Current" }).waitFor();
    await page.getByRole("button", { name: locale === "pl" ? "Cel" : "Goal", exact: true }).last().click();
    try { await page.getByRole("button", { name: locale === "pl" ? "Usuń z bieżącej Strategii" : "Remove from current Strategy" }).click({ timeout: 5000 }); }
    catch (error) { process.stderr.write(`Rendered: ${await page.locator("body").innerText()}\n`); throw error; }
    await page.getByRole("heading", { name: locale === "pl" ? "Wycofanie celu" : "Retire goal" }).waitFor();
    await page.getByText("Preserved ClickUp task").last().waitFor();
    assert.equal(writes.length, 0, "preview is read only");
    await page.getByLabel(locale === "pl" ? "Powód wycofania" : "Retirement reason").fill("Fixture direction was withdrawn.");
    await page.getByLabel(locale === "pl" ? "Obecne hasło" : "Current password").fill("synthetic-password");
    await page.getByRole("button", { name: locale === "pl" ? "Potwierdź wycofanie" : "Confirm retirement" }).click();
    await page.getByRole("button", { name: locale === "pl" ? "Historia" : "History" }).waitFor();
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === (localStorage.getItem("companycoreLocale") === "pl" ? "Historia" : "History"));
    assert.equal(writes.length, 1);
    assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Historia" : "History" }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByText(title).count() > 0, true, "retired Goal remains in History");
    await page.getByRole("button", { name: locale === "pl" ? "Bieżące" : "Current" }).click();
    assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Bieżące" : "Current" }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
  }
  console.log(JSON.stringify({ locales: ["pl", "en"], widths: [390, 1440], previewReadOnly: true,
    proofBoundRetirement: true, historyNavigation: true, focusRestored: true }));
} finally {
  await browser.close();
  server.close();
}
