import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { build } from "esbuild";
import { chromium } from "playwright";

const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskReviewModal}from'./web/src/features/departments/task-review';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskReviewModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>{}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const taskId = "00000000-0000-4000-8000-000000000001";
const proposalId = "00000000-0000-4000-8000-000000000002";
const draftId = "00000000-0000-4000-8000-000000000003";
const proposal = {
  id: proposalId, taskId, executionId: "00000000-0000-4000-8000-000000000004",
  materialVersion: "a".repeat(64), compositionSeal: "b".repeat(64), procedureId: "00000000-0000-4000-8000-000000000005",
  contractVersionId: "00000000-0000-4000-8000-000000000006", sourceStepId: "00000000-0000-4000-8000-000000000007",
  stepKey: "verify_output", step: { instruction: "Inspect output", control: { executorClass: "agent", success: "Evidence recorded", maxAttempts: 2, escalation: "Ask owner", fallback: "Stop" } },
  observation: "The output needs another check", proposedInstruction: "Inspect output and record the evidence",
  applicability: "Only this task type", rollback: "Restore the prior published procedure", author: { kind: "agent", id: "00000000-0000-4000-8000-000000000008" },
  expectedVersion: "c".repeat(64), createdAt: "2026-10-11T12:00:00Z", decision: null
};
const result = { task: { id: taskId, title: "Synthetic procedure task" }, result: { summary: "Synthetic native result", attempt: 1, completedAt: "2026-10-11T11:00:00Z", finalResponse: "Done", verification: {}, changedFiles: [] },
  materialVersion: proposal.materialVersion, canReview: false, canManage: false, history: [], suspensions: [] };
let checks = 0;
try {
  for (const language of ["pl", "en"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const pageErrors = []; page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), language);
    let current = structuredClone(proposal);
    let decisionPosts = [];
    await page.route("**/v1/agent-runtime/tasks/**", async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/review")) return route.fulfill({ json: { data: result } });
      if (url.pathname.endsWith("/procedure-improvements")) return route.fulfill({ json: { data: { taskId, canPropose: false, canDecide: true, materialVersion: proposal.materialVersion, executionId: proposal.executionId, composition: null, proposals: [current], truncated: false } } });
      if (url.pathname.endsWith(`/procedure-improvements/${proposalId}/decision`)) {
        assert.equal(route.request().method(), "POST");
        const input = route.request().postDataJSON(); decisionPosts.push(input);
        assert.deepEqual(Object.keys(input).sort(), ["applicability", "decision", "diagnosis", "expectedVersion", "requestId", "rollback"]);
        if (decisionPosts.length === 1) return route.fulfill({ status: 409, json: { error: "procedure_improvement_stale" } });
        current = { ...current, decision: { id: "00000000-0000-4000-8000-000000000009", decision: input.decision, diagnosis: input.diagnosis, applicability: input.applicability, rollback: input.rollback, reviewerUserId: "00000000-0000-4000-8000-000000000010", draftProcedureId: draftId, createdAt: "2026-10-11T13:00:00Z" } };
        return route.fulfill({ json: { data: { proposal: current } } });
      }
      throw new Error(`Unexpected API call: ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const heading = language === "pl" ? "Zmiana procedury po wyniku" : "Procedure change after a result";
    await page.getByRole("heading", { name: heading }).waitFor();
    const panel = page.getByRole("region", { name: heading });
    assert.equal(await panel.getByText(proposal.materialVersion, { exact: true }).count(), 1);
    assert.equal(await panel.getByText(proposal.contractVersionId, { exact: true }).count(), 1);
    assert.equal(await panel.getByText("verify_output", { exact: true }).count(), 1);
    assert.equal(await panel.getByText(proposal.proposedInstruction, { exact: true }).count(), 1);
    assert.equal(await panel.getByText(language === "pl" ? /tworzy tylko szkic/ : /creates only a draft/).count(), 1);
    await panel.getByRole("button", { name: language === "pl" ? "Niezależna ocena propozycji" : "Independent proposal review" }).click();
    await panel.getByLabel(language === "pl" ? /^Decyzja/ : /^Decision/).selectOption("accept");
    await panel.getByLabel(language === "pl" ? "Niezależna diagnoza przyczyny" : "Independent cause diagnosis").fill("Independent diagnosis");
    await panel.getByLabel(language === "pl" ? "Potwierdzony zakres zastosowania" : "Confirmed applicability").fill("Only this task type");
    await panel.getByLabel(language === "pl" ? "Sposób wycofania" : "Rollback method").fill("Restore prior published version");
    const save = panel.getByRole("button", { name: language === "pl" ? "Zapisz decyzję o procedurze" : "Record procedure decision" });
    await save.click();
    await panel.getByText(language === "pl" ? /Stan zmienił się/ : /The state changed/).waitFor();
    assert.equal(await panel.getByLabel(language === "pl" ? "Niezależna diagnoza przyczyny" : "Independent cause diagnosis").inputValue(), "Independent diagnosis");
    await save.click();
    await panel.getByText(language === "pl" ? "Przyjęto do szkicu" : "Accepted into draft", { exact: true }).waitFor();
    assert.equal(decisionPosts.length, 2);
    assert.equal(decisionPosts[0].requestId, decisionPosts[1].requestId, "retry uses the same requestId");
    assert.equal(decisionPosts[1].expectedVersion, proposal.expectedVersion);
    assert.equal(await panel.getByText(draftId, { exact: true }).count(), 1);
    assert.equal(await panel.getByRole("button", { name: language === "pl" ? "Zapisz decyzję o procedurze" : "Record procedure decision" }).count(), 0);
    assert.deepEqual(pageErrors, []);
    await page.close(); checks++;
  }
  const page = await browser.newPage();
  await page.route("**/v1/agent-runtime/tasks/**", route => route.fulfill({ json: { data: route.request().url().endsWith("/review") ? result : { taskId, canPropose: false, canDecide: true, materialVersion: proposal.materialVersion, executionId: proposal.executionId, composition: null, proposals: [], truncated: false } } }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByText("Synthetic native result").waitFor();
  assert.equal(await page.getByRole("heading", { name: /Procedure change after a result|Zmiana procedury po wyniku/ }).count(), 0);
  await page.close(); checks++;
  console.log(`G17 procedure owner UI: ${checks}/${checks} synthetic PL/EN and empty cases passed.`);
} finally { await browser.close(); server.close(); }
