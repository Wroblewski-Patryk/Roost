import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const bundle = await build({
  stdin: {
    contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import {LanguageProvider} from './web/src/i18n/i18n'; import {AgentExecutionsRoute} from './web/src/features/departments/agent-executions-route'; createRoot(document.getElementById('root')).render(<LanguageProvider><AgentExecutionsRoute /></LanguageProvider>);",
    resolveDir: process.cwd(), loader: "tsx"
  },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
});
const stylesheet = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(stylesheet, "build:web stylesheet is required for viewport checks");
const server = createServer(async (request, response) => {
  if (request.url === "/app.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(bundle.outputFiles[0].text);
    return;
  }
  if (request.url === "/style.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(await readFile(path.join("public/react/assets", stylesheet)));
    return;
  }
  response.setHeader("Content-Type", "text/html");
  response.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main id="root"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const executionId = "11111111-1111-4111-8111-111111111111";
const incidentId = "22222222-2222-4222-8222-222222222222";
const incomingId = "33333333-3333-4333-8333-333333333333";

try {
  for (const [locale, width] of [["pl", 390], ["en", 1440]]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const pageErrors = [];
    const commandBodies = [];
    let requestedDigest = null;
    let requestState = null;
    let incumbentStatus = "running";
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const execution = () => ({ id: executionId, status: incumbentStatus, attempt: 0,
      task: { id: "44444444-4444-4444-8444-444444444444", title: "Current governed work" },
      application: { id: "55555555-5555-4555-8555-555555555555", slug: "example", name: "Example" },
      agentHost: { id: "66666666-6666-4666-8666-666666666666", name: "Laptop", applicationSlugs: ["example"] },
      createdAt: "2026-10-11T10:00:00Z", startedAt: "2026-10-11T10:01:00Z", cancelRequestedAt: requestState ? "2026-10-11T10:02:00Z" : null,
      checkpoint: { stage: "running" }, checkpointVersion: 3, changedFiles: [], verification: {}, usage: {}, events: [] });
    await page.route("**/v1/**", async route => {
      const url = route.request().url();
      if (url.endsWith("/critical-preemption-candidates")) return route.fulfill({ json: { data: {
        canRequest: !requestState, expectedVersion: 3,
        incidents: requestState ? [] : [{ id: incidentId, title: "Critical service outage", updatedAt: "2026-10-11T10:00:00Z" }],
        incoming: requestState ? [] : [{ id: incomingId, createdAt: "2026-10-11T10:00:00Z", task: { id: "77777777-7777-4777-8777-777777777777", title: "Restore service", priority: "critical" } }],
        request: requestState ? { id: "88888888-8888-4888-8888-888888888888", status: requestState,
          incidentRecordId: incidentId, incomingExecutionId: incomingId, incidentTitleCurrent: "Critical service outage",
          incomingTaskTitleCurrent: "Restore service", requestedAt: "2026-10-11T10:02:00Z",
          stoppedAt: requestState === "stopped" ? "2026-10-11T10:03:00Z" : null } : null
      } } });
      if (url.endsWith("/v1/auth/reauth")) {
        assert.equal(route.request().method(), "POST");
        const proofInput = route.request().postDataJSON();
        assert.equal(proofInput.password, "fixture-password");
        assert.equal(proofInput.path, `/v1/agent-runtime/executions/${executionId}/actions/request-critical-preemption`);
        requestedDigest = proofInput.bodyDigest;
        return route.fulfill({ json: { data: { proof: "fixture-owner-proof" } } });
      }
      if (url.endsWith("/actions/request-critical-preemption")) {
        assert.equal(route.request().headers()["x-owner-action-proof"], "fixture-owner-proof");
        const body = route.request().postData() ?? "";
        commandBodies.push(JSON.parse(body));
        assert.equal(commandBodies.at(-1).incidentRecordId, incidentId);
        assert.equal(commandBodies.at(-1).incidentRevision, "2026-10-11T10:00:00Z");
        assert.equal(commandBodies.at(-1).incomingExecutionId, incomingId);
        assert.equal(commandBodies.at(-1).expectedVersion, 3);
        assert.equal(route.request().postDataJSON().reason, "Service is unavailable to customers.");
        assert.equal(requestedDigest, createHash("sha256").update(JSON.stringify(commandBodies.at(-1))).digest("hex"));
        requestState = "requested";
        return route.fulfill({ status: 201, json: { data: { id: "88888888-8888-4888-8888-888888888888" } } });
      }
      assert.equal(route.request().method(), "GET");
      if (url.includes("/executions?")) return route.fulfill({ json: { data: [execution()] } });
      if (url.includes(`/executions/${executionId}?`)) return route.fulfill({ json: { data: execution() } });
      if (url.endsWith("/readiness")) return route.fulfill({ json: { data: { executionEnabled: true, mode: "managed", applications: [], activationRequirements: [] } } });
      if (url.includes("/execution-readiness")) return route.fulfill({ status: 503, json: { error: "fixture_read_unavailable" } });
      return route.fulfill({ json: { data: [] } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Open execution" }).first().click();
    const detail = page.getByRole("dialog", { name: "Codex execution details" });
    await detail.getByLabel(locale === "pl" ? "Potwierdzany incydent" : "Incident to confirm").selectOption(incidentId);
    await detail.getByLabel(locale === "pl" ? "Oczekujące zadanie critical" : "Queued critical task").selectOption(incomingId);
    await detail.getByLabel(locale === "pl" ? "Uzasadnienie decyzji" : "Decision reason").fill("Service is unavailable to customers.");
    assert.equal(commandBodies.length, 0);
    await detail.getByRole("button", { name: locale === "pl" ? "Przejrzyj wyparcie" : "Review preemption" }).click();
    const confirm = page.getByRole("dialog", { name: locale === "pl" ? "Potwierdź wyparcie" : "Confirm preemption" });
    await confirm.getByText("Critical service outage").waitFor();
    await confirm.getByText("Restore service").waitFor();
    assert.equal(commandBodies.length, 0);
    await confirm.getByLabel(locale === "pl" ? "Obecne hasło" : "Current password").fill("fixture-password");
    await confirm.getByRole("button", { name: locale === "pl" ? "Potwierdź i zażądaj stopu" : "Confirm and request stop" }).click();
    await detail.getByText(locale === "pl" ? "Żądanie wyparcia oczekuje na potwierdzony stop" : "Preemption request awaits confirmed stop").waitFor();
    assert.equal(commandBodies.length, 1);
    assert.equal(await detail.getByRole("button", { name: locale === "pl" ? "Anuluj" : "Cancel", exact: true }).count(), 0);
    requestState = "stopped"; incumbentStatus = "cancelled";
    await detail.getByRole("button", { name: locale === "pl" ? "Odśwież stan" : "Refresh status" }).click();
    await detail.getByText(locale === "pl" ? "Natywne zatrzymanie i checkpoint potwierdzone" : "Native stop and checkpoint confirmed").waitFor();
    assert.equal(commandBodies.length, 1);
    assert.deepEqual(pageErrors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
  }
  process.stdout.write("G14 owner preemption UI: 2 locale/viewport journeys passed\n");
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
