import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "00000000-0000-4000-8000-000000000801";
const sourceId = "00000000-0000-4000-8000-000000000802";
const credentialId = "00000000-0000-4000-8000-000000000803";
const mandateId = "00000000-0000-4000-8000-000000000804";
const candidate = { taskId, title: "Review governed context", agent: { id: "00000000-0000-4000-8000-000000000805", label: "Scoped analyst" }, credential: { id: credentialId, keyPrefix: "fixture-prefix" }, sources: [{ id: sourceId, title: "Governed operating rule", revision: "revision-1", reviewId: "00000000-0000-4000-8000-000000000806" }] };
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{GeneralDashboard}from'./web/src/features/departments/general-dashboard';createRoot(document.getElementById('root')).render(<LanguageProvider><GeneralDashboard/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const css = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(css, "Build the web app before this UI test");
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(await readFile(path.join("public/react/assets", css))); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main id="root"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
let checked = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [], writes = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    let mandate = null, prepared = null, candidateEligible = true;
    await page.route("**/v1/**", async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (url.pathname === "/v1/dashboard/command") return route.fulfill({ json: { data: { generatedAt: "2026-10-11T12:00:00Z", priorityItems: [], summary: {}, departmentSignals: [], latestRouteProposals: [] } } });
      if (url.pathname === "/v1/agent-runtime/task-proposals") return route.fulfill({ json: { data: { items: [], page: 0, hasMore: false } } });
      if (url.pathname === "/v1/agent-runtime/task-proposal-mandate-candidates") return route.fulfill({ json: { data: { items: candidateEligible ? [candidate] : [], mandateTasks: mandate ? [{ taskId, title: candidate.title }] : [], truncated: false, historyTruncated: false } } });
      if (url.pathname === `/v1/agent-runtime/tasks/${taskId}/proposal-mandates` && method === "GET") return route.fulfill({ json: { data: { items: mandate ? [mandate] : [], hasMore: false } } });
      if (url.pathname === "/v1/auth/reauth" && method === "POST") {
        const input = JSON.parse(request.postData() || "{}");
        assert.ok(prepared);
        assert.equal(input.method, "POST");
        assert.equal(input.path, prepared.path);
        assert.equal(input.bodyDigest, createHash("sha256").update(JSON.stringify(JSON.parse(prepared.body))).digest("hex"));
        assert.equal(input.password, "fixture-password");
        return route.fulfill({ json: { data: { proof: "fixture-proof" } } });
      }
      if (url.pathname === `/v1/agent-runtime/tasks/${taskId}/proposal-mandates` && method === "POST" || url.pathname === `/v1/agent-runtime/tasks/${taskId}/proposal-mandates/${mandateId}/actions/revoke` && method === "POST") {
        const body = request.postData() || "{}", input = JSON.parse(body);
        writes.push({ path: url.pathname, input });
        if (!request.headers()["x-owner-action-proof"]) { prepared = { path: url.pathname, body }; return route.fulfill({ status: 403, json: { error: "task_proposal_fresh_owner_required" } }); }
        assert.equal(request.headers()["x-owner-action-proof"], "fixture-proof");
        assert.equal(body, prepared.body);
        assert.equal(input.requestId, writes.at(-2).input.requestId);
        if (url.pathname.endsWith("/actions/revoke")) {
          assert.equal(input.reason, "Mandate no longer needed");
          mandate = { ...mandate, status: "revoked", revokedAt: "2026-10-11T13:00:00Z" };
          return route.fulfill({ json: { data: { record: mandate, replayed: false } } });
        }
        assert.equal(input.credentialId, credentialId);
        assert.equal(input.sourceRecordId, sourceId);
        assert.equal(input.expectedSourceRevision, "revision-1");
        assert.equal(input.reason, "Owner authorizes one proposal");
        assert.ok(Date.parse(input.validUntil) > Date.now());
        mandate = { id: mandateId, status: "active", sourceTitle: "Governed operating rule", sourceRecordId: sourceId, sourceRevision: "revision-1", validUntil: input.validUntil, revokedAt: null, reason: input.reason, credentialId, keyPrefix: "fixture-prefix", usedProposalId: null };
        candidateEligible = false;
        return route.fulfill({ json: { data: { record: mandate, replayed: false } } });
      }
      throw new Error(`Unexpected API request ${method} ${url.pathname}`);
    });
    await page.goto(origin);
    const section = page.getByRole("region", { name: locale === "pl" ? "Mandat do proponowania zadania" : "Task proposal mandate" });
    await section.getByRole("combobox", { name: locale === "pl" ? "Zadanie źródłowe" : "Source task" }).selectOption(taskId);
    await section.getByRole("combobox", { name: locale === "pl" ? "Zatwierdzone źródło" : "Approved source" }).selectOption(sourceId);
    assert.ok((await section.innerText()).includes(candidate.agent.label));
    assert.ok((await section.innerText()).includes(candidate.credential.keyPrefix));
    await section.getByRole("textbox", { name: locale === "pl" ? "Powód wydania" : "Issue reason" }).fill("Owner authorizes one proposal");
    await section.getByRole("button", { name: locale === "pl" ? "Wydaj mandat" : "Issue mandate" }).click();
    const auth = page.getByRole("dialog", { name: locale === "pl" ? "Wydaj mandat" : "Issue mandate" });
    await auth.getByRole("textbox", { name: locale === "pl" ? "Obecne hasło" : "Current password" }).fill("fixture-password");
    await auth.getByRole("button", { name: locale === "pl" ? "Potwierdź i kontynuuj" : "Confirm and continue" }).click();
    await section.getByText(locale === "pl" ? "Mandat wydany." : "Mandate issued.").waitFor();
    await section.getByText(locale === "pl" ? /To zadanie nie spełnia obecnie warunków/ : /This task is no longer eligible/).waitFor();
    const historicalStatus = ["used", "stale", "expired", "active"][checked];
    mandate = { ...mandate, status: historicalStatus, usedProposalId: historicalStatus === "used" ? "00000000-0000-4000-8000-000000000807" : null };
    await section.getByRole("button", { name: locale === "pl" ? "Odśwież" : "Refresh" }).click();
    await section.getByText(({ used: locale === "pl" ? "Wykorzystany" : "Used", stale: locale === "pl" ? "Nieaktualny" : "Stale", expired: locale === "pl" ? "Wygasły" : "Expired", active: locale === "pl" ? "Aktywny" : "Active" })[historicalStatus]).waitFor();
    assert.equal(await section.getByRole("button", { name: locale === "pl" ? "Cofnij mandat" : "Revoke mandate" }).count(), 1, `revoke action missing for ${historicalStatus}`);
    await section.getByRole("button", { name: locale === "pl" ? "Cofnij mandat" : "Revoke mandate" }).click();
    await section.getByRole("textbox", { name: locale === "pl" ? "Powód cofnięcia" : "Revocation reason" }).fill("Mandate no longer needed");
    await section.getByRole("button", { name: locale === "pl" ? "Cofnij mandat" : "Revoke mandate" }).click();
    const revokeAuth = page.getByRole("dialog", { name: locale === "pl" ? "Cofnij mandat" : "Revoke mandate" });
    await revokeAuth.getByRole("textbox", { name: locale === "pl" ? "Obecne hasło" : "Current password" }).fill("fixture-password");
    await revokeAuth.getByRole("button", { name: locale === "pl" ? "Potwierdź i kontynuuj" : "Confirm and continue" }).click();
    await section.getByText(locale === "pl" ? "Mandat cofnięty." : "Mandate revoked.", { exact: true }).waitFor();
    assert.equal(writes.length, 4);
    assert.equal(writes.some(write => /submit-for-execution|executions/.test(write.path)), false);
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${width}: horizontal overflow`);
    await page.close(); checked++;
  }
  console.log(`G13 owner mandate UI: ${checked} PL/EN narrow/desktop issue-revoke checks passed with exact prepared-request proof and no Worker start.`);
} finally { await browser.close(); server.close(); }
