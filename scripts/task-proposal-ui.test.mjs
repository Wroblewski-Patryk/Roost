import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const proposalId = "00000000-0000-4000-8000-000000000701";
const taskId = "00000000-0000-4000-8000-000000000702";
const proposal = {
  id: proposalId, status: "pending", title: "Review source evidence", outcome: "Record a scoped decision",
  category: "missing_assumption", priorityBand: "blocked_core_flow", priorityRationale: "The core flow has no accepted owner.",
  sourceTitle: "Governed operating rule", sourceRecordId: "00000000-0000-4000-8000-000000000703",
  sourceRevision: "revision-1", sourceTaskId: "00000000-0000-4000-8000-000000000704",
  proposerAgentId: "00000000-0000-4000-8000-000000000705", proposerLabel: "Scoped analyst",
  createdAt: "2026-10-11T12:00:00.000Z", acceptedTaskId: null, decisionReason: null, sourceCurrent: true
};
const approvedSource = {
  content: { title: "Approved operating rule", description: "Only approved source content may guide this task.", businessPurpose: "Safe company delivery" },
  provenance: { reviewId: "review-712", reviewedByUserId: "owner-713", reviewedAt: "2026-10-11T11:00:00.000Z", verificationMethod: "owner_review", verificationRef: "evidence-714", inclusionReason: "Current approved source", contentDigest: "digest-715", validUntil: "2026-10-12T11:00:00.000Z" }
};
const historicalProvenance = { historical: true, reviewId: "historical-review-716", classification: "approved", provenance: "owner_review", verificationMethod: "historical_check", verificationRef: "historical-evidence-717", inclusionReason: "Original source approval", contentDigest: "historical-digest-718", validFrom: "2026-10-10T10:00:00.000Z", validUntil: "2026-10-11T10:00:00.000Z", reviewedAt: "2026-10-10T10:00:00.000Z", reviewedByUserId: "historical-owner-719" };
const occurrences = [{ id: "00000000-0000-4000-8000-000000000720", agentId: proposal.proposerAgentId, createdAt: "2026-10-11T12:00:00.000Z", body: { priorityBand: proposal.priorityBand, priorityRationale: proposal.priorityRationale } },
  { id: "00000000-0000-4000-8000-000000000721", agentId: "00000000-0000-4000-8000-000000000722", createdAt: "2026-10-11T12:05:00.000Z", body: { priorityBand: "stability_debt", priorityRationale: "Different duplicate rationale" } }];
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
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) for (const mode of ["accept", "stale", "conflict", "forbidden"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [], writes = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    let version = "version-1", detailReads = 0, resolved = false;
    await page.route("**/v1/**", async route => {
      const request = route.request(), url = request.url(), method = request.method();
      if (url.includes("/dashboard/command")) return route.fulfill({ json: { data: { generatedAt: "2026-10-11T12:00:00Z", priorityItems: [], summary: {}, departmentSignals: [], latestRouteProposals: [] } } });
      if (url.includes("/task-proposal-mandate-candidates")) return route.fulfill({ json: { data: { items: [], truncated: false } } });
      if (url.includes("/task-proposals?") && method === "GET") {
        if (mode === "forbidden") return route.fulfill({ status: 403, json: { error: "forbidden" } });
        return route.fulfill({ json: { data: { items: resolved ? [] : [{ ...proposal, sourceCurrent: mode !== "stale" }], page: 0, hasMore: false } } });
      }
      if (url.endsWith(`/task-proposals/${proposalId}`) && method === "GET") {
        detailReads++;
        return route.fulfill({ json: { data: { ...proposal, title: version === "version-1" ? proposal.title : "Review updated evidence", sourceCurrent: mode !== "stale", source: mode === "stale" ? null : approvedSource, historicalProvenance, occurrences, occurrencesTruncated: true, expectedVersion: version } } });
      }
      if (url.includes(`/task-proposals/${proposalId}/actions/`) && method === "POST") {
        const input = JSON.parse(request.postData() || "{}");
        writes.push({ url, input });
        assert.equal(typeof input.requestId, "string");
        assert.equal(input.expectedVersion, version);
        assert.equal(input.reason, "Owner reviewed the source");
        if (mode === "conflict" && version === "version-1") {
          version = "version-2";
          return route.fulfill({ status: 409, json: { error: "proposal_changed" } });
        }
        if (url.endsWith("/accept")) {
          assert.equal(input.title, "Edited task title");
          assert.equal(input.outcome, "Edited expected outcome");
          assert.equal(input.category, "unfinished_function");
          assert.equal(input.priorityBand, "wrong_result_action");
          assert.equal(input.priorityRationale, "Owner corrected priority rationale");
          resolved = true;
          return route.fulfill({ json: { data: { record: { taskId }, taskId, replayed: false } } });
        }
        assert.ok(url.endsWith("/reject"));
        assert.equal(input.title, undefined);
        assert.equal(input.category, undefined);
        assert.equal(input.priorityRationale, undefined);
        resolved = true;
        return route.fulfill({ json: { data: { record: { taskId: null }, taskId: null, replayed: false } } });
      }
      throw new Error(`Unexpected API request ${method} ${url}`);
    });
    await page.goto(origin);
    if (mode === "forbidden") {
      await page.getByText(locale === "pl" ? "Nie masz uprawnienia do przeglądu propozycji." : "You do not have permission to review proposals.").waitFor();
      assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Przejrzyj propozycję" : "Review proposal" }).count(), 0);
    } else {
      await page.getByRole("button", { name: locale === "pl" ? "Przejrzyj propozycję" : "Review proposal" }).click();
      const dialog = page.getByRole("dialog", { name: proposal.title });
      await dialog.waitFor();
      assert.equal(detailReads, 1);
      assert.ok((await dialog.innerText()).includes(proposal.sourceRevision));
      assert.ok((await dialog.innerText()).includes(proposal.priorityRationale));
      assert.ok((await dialog.innerText()).includes(proposal.proposerLabel));
      assert.ok((await dialog.innerText()).includes(locale === "pl" ? "Nie uruchomi Workera" : "does not start the Worker"));
      const detailText = await dialog.innerText();
      assert.ok(detailText.includes(occurrences[1].agentId));
      assert.ok(detailText.includes("Different duplicate rationale"));
      assert.ok(detailText.includes(locale === "pl" ? "Pokazano tylko 50 najnowszych" : "Only the 50 most recent"));
      if (mode === "stale") {
        assert.equal(detailText.includes(approvedSource.provenance.reviewId), false);
        assert.equal(detailText.includes(approvedSource.content.description), false);
        for (const value of [historicalProvenance.reviewId, historicalProvenance.classification, historicalProvenance.provenance, historicalProvenance.verificationMethod, historicalProvenance.verificationRef, historicalProvenance.inclusionReason, historicalProvenance.contentDigest, historicalProvenance.reviewedByUserId]) {
          assert.ok(detailText.includes(value), `missing historical source provenance ${value}: ${locale}/${width}`);
        }
        assert.ok(detailText.includes(locale === "pl" ? "Treść dawnej rewizji nie jest dostępna" : "earlier revision's body is unavailable"));
      } else {
        for (const value of [approvedSource.content.title, approvedSource.content.description, approvedSource.provenance.reviewId, approvedSource.provenance.reviewedByUserId, approvedSource.provenance.verificationMethod, approvedSource.provenance.verificationRef, approvedSource.provenance.inclusionReason, approvedSource.provenance.contentDigest]) {
          assert.ok(detailText.includes(value), `missing approved source provenance ${value}: ${locale}/${mode}/${width}`);
        }
      }
      await dialog.getByRole("textbox", { name: locale === "pl" ? "Uzasadnienie decyzji właściciela" : "Owner decision reason" }).fill("Owner reviewed the source");
      if (mode === "stale") {
        assert.equal(await dialog.getByRole("button", { name: locale === "pl" ? "Przyjmij do szkicu zadania" : "Accept into task draft" }).isDisabled(), true);
        await page.waitForFunction(label => Array.from(document.querySelectorAll('[role="dialog"] button')).some(button => button.textContent?.includes(label) && !button.disabled), locale === "pl" ? "Odrzuć propozycję" : "Reject proposal");
        assert.equal(await dialog.getByRole("button", { name: locale === "pl" ? "Odrzuć propozycję" : "Reject proposal" }).isDisabled(), false, `reject should remain available for stale source: ${locale}/${width}`);
        await dialog.getByRole("button", { name: locale === "pl" ? "Odrzuć propozycję" : "Reject proposal" }).click();
        await page.getByText(locale === "pl" ? "Propozycja odrzucona." : "Proposal rejected.").waitFor();
        assert.equal(writes.length, 1);
        assert.equal(await page.getByText(locale === "pl" ? "Nie udało się zapisać decyzji." : "The decision could not be saved.").count(), 0);
      } else {
        const fill = async active => {
          const taskTitle = active.getByRole("textbox", { name: locale === "pl" ? "Tytuł zadania" : "Task title" });
          await taskTitle.fill("Edited task title");
          await taskTitle.press("Tab");
          const expectedOutcome = active.getByRole("textbox", { name: locale === "pl" ? "Oczekiwany wynik" : "Expected outcome" });
          await expectedOutcome.fill("Edited expected outcome");
          await expectedOutcome.press("Tab");
          await active.getByRole("combobox", { name: locale === "pl" ? "Kategoria zadania" : "Task category" }).selectOption("unfinished_function");
          await active.getByRole("combobox", { name: locale === "pl" ? "Priorytet zadania" : "Task priority" }).selectOption("wrong_result_action");
          const priorityRationale = active.getByRole("textbox", { name: locale === "pl" ? "Uzasadnienie priorytetu zadania" : "Task priority rationale" });
          await priorityRationale.fill("Owner corrected priority rationale");
          await priorityRationale.press("Tab");
          await active.getByRole("textbox", { name: locale === "pl" ? "Uzasadnienie decyzji właściciela" : "Owner decision reason" }).fill("Owner reviewed the source");
        };
        await fill(dialog);
        await dialog.getByRole("button", { name: locale === "pl" ? "Przyjmij do szkicu zadania" : "Accept into task draft" }).click();
        if (mode === "conflict") {
          await page.getByText(locale === "pl" ? /Propozycja lub źródło zmieniły się/ : /The proposal or source changed/).first().waitFor();
          const updated = page.getByRole("dialog", { name: "Review updated evidence" });
          await updated.waitFor();
          assert.equal(detailReads, 2);
          await fill(updated);
          await updated.getByRole("button", { name: locale === "pl" ? "Przyjmij do szkicu zadania" : "Accept into task draft" }).click();
        }
        await page.getByRole("link", { name: locale === "pl" ? "Otwórz zadanie" : "Open task" }).waitFor();
        assert.ok((await page.getByRole("link", { name: locale === "pl" ? "Otwórz zadanie" : "Open task" }).getAttribute("href"))?.includes(`taskId=${taskId}`));
        assert.equal(writes.length, mode === "conflict" ? 2 : 1);
      }
      assert.equal(writes.some(write => /submit-for-execution|executions/.test(write.url)), false);
    }
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${mode}/${width}: horizontal overflow`);
    await page.close(); checked++;
  }
  console.log(`G13 owner proposal UI: ${checked} PL/EN narrow/desktop checks passed (accept/edit, stale-source reject, version conflict, permission boundary).`);
} finally { await browser.close(); server.close(); }
