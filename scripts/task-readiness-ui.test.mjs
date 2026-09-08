import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";

const output = process.env.ROOST_QA_OUTPUT || path.join(os.tmpdir(), "roost-ready-workbench-qa");
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TasksWorkbench}from'./web/src/features/departments/tasks-workbench';import{TaskPreviewModal}from'./web/src/features/departments/operations-route';createRoot(document.getElementById('root')).render(<LanguageProvider>{window.readyPreview ? <TaskPreviewModal item={window.readyPreview} taskLists={[]} statuses={[]} onSaved={()=>window.readySaved=true} onClose={()=>{}} onReady={id=>window.readyOpened=id}/> : <TasksWorkbench departmentKey="04-operacje" canonical/>}</LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
const css = await readFile(path.join("public/react/assets", cssName));
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url.startsWith("/vendor/phosphor/bold/")) {
    const name = path.basename(req.url);
    try { const data = await readFile(path.join("node_modules/@phosphor-icons/web/src/bold", name)); res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "font/woff2"); return res.end(data); } catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
let checked = 0;
function fixture(mode) {
  const f = validPacketFixture(), c = f.packet.contract;
  const task = { id: f.claimed.taskId, title: "Poprawa formularza zgłoszeń", status: "todo", project: { id: f.taskContext.task.projectId, name: "Portal obsługi klienta" }, goal: { id: c.objective.goalId, title: "Czytelne zgłoszenia bez barier" } };
  const e = { roleCatalog: Object.entries(f.packet.roleAuthorities).filter(([name]) => ["accountableManager","executor","verifier","releaser"].includes(name)).map(([name, item]) => ({ id: item.id, revision: item.revision, label: name === "verifier" ? "Review Worker" : name === "releaser" ? "Release Worker" : name, type: item.type, role: item.role, competencies: item.competencies, mandates: item.authorityScope, principalKey: `${item.principal.kind}:${item.principal.id}`, eligible: true })), requester: { ...c.taskRoles.requester, label: "Requesting Member" }, roleOrigin: { established: true, submissionId: f.packet.roleAuthorities.provenance.originatingSubmissionId }, excludedRolePrincipals: f.packet.roleAuthorities.provenance.authors.map(p => `${p.kind}:${p.id}`), taskIdentity: { contractId: c.singleTask.contractId, branch: c.singleTask.branch }, components: [{ ...c.singleTask.component, label: "Parser formularza" }], managers: [{ ...c.singleTask.accountableManager, label: "Aleksandra Nowak" }], submissionVersion: "a".repeat(64), task, agent: { ...f.taskContext.task.assignedWorkforceEntity, name: "Marta · Quality Engineer", eligible: true, competencies: ["javascript"], tools: c.access.tools, permissions: c.access.permissions }, applications: [{ id: f.claimed.applicationId, name: "Portal obsługi klienta" }], applicationId: f.claimed.applicationId,
    projects: [task.project], goals: [task.goal], agents: [{ id: c.assignment.agentId, name: "Marta · Quality Engineer" }], activeExecution: mode === "blocked", catalogTruncated: false,
    models: [{ id: "gpt-5.6-sol", efforts: ["low", "medium", "high"] }],
    sources: f.packet.sources.map((item, i) => ({ id: item.id, label: ["Zasady firmy", "Wymagania portalu", "Architektura formularza"][i], applicationId: item.applicationId, revision: item.revision })), procedures: [], dependencies: [], decisions: [],
    accepted: { contract: c, applicationId: f.claimed.applicationId, prompt: null, baseBranch: null }, acceptance: { validatedAt: "2026-09-06T10:00:00Z", authorName: "Aleksandra Nowak", authorType: "user" } };
  if (mode === "empty") { e.task.goal = null; e.agent = null; e.applications = []; e.applicationId = null; e.accepted = null; e.acceptance = null; }
  const packet = { status: ["ready", "viewer", "blocked", "scope_exception"].includes(mode) ? "ready" : mode === "empty" ? "draft" : ["needs_context", "needs_decision"].includes(mode) ? mode : "needs_revalidation", reason: mode === "empty" ? "ready_pin_required" : "context_changed", revision: "a".repeat(64), validationRevision: "a".repeat(64), pinId: "accepted-fixture", canSubmit: mode !== "viewer", executionEnabled: false, editor: e };
  if (["needs_context", "needs_decision"].includes(mode)) { packet.reason = "submission_incomplete"; packet.issues = [{ field: mode === "needs_decision" ? "contract.decisions" : "contract.context.company", reason: "missing" }]; }
  if (["empty", "needs_context", "needs_decision"].includes(mode)) { delete packet.revision; delete packet.validationRevision; }
  if (mode === "changed") packet.changedSources = [
    { table: "company_records", id: f.packet.sources[0].id, label: "Zasady akceptacji zmian i potwierdzania aktualności dokumentacji technicznej", operation: "update", changedAt: "2026-09-07T20:00:00Z" },
    { table: "application_repositories", id: "00000000-0000-4000-8000-000000000123", label: "application_repositories", operation: "delete", changedAt: "2026-09-07T20:01:00Z" }
  ];
  if (mode === "scope_exception") {
    c.singleTask.problems[0].causalLink = "The parser removes the required token from input";
    c.singleTask.problems.push({ ...c.singleTask.problems[0], statement: "Preview rejects the same input", causalLink: "The same parser supplies the preview result" });
    c.singleTask.commonCause = { mechanism: "One parser drops a required token", inseparability: "Both symptoms exercise the same shared parser correction", evidence: { ...c.context.technical[0] } };
  }
  if (mode === "scope_split") { packet.status = "needs_context"; packet.reason = "submission_incomplete"; packet.issues = [{ field: "contract.singleTask.problems", reason: "split_required" }]; delete packet.revision; }
  return { f, packet };
}
try {
  for (const locale of process.env.ROOST_QA_INTERACTION_ONLY === "1" ? [] : ["pl", "en"]) for (const width of [390, 834, 1440]) for (const mode of ["ready", "changed", "empty", "viewer", "blocked", "needs_context", "needs_decision", "scope_exception", "scope_split", "error", "loading"]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const { packet } = fixture(mode); let failedRead = mode === "error", releaseRead;
    await page.route("**/v1/**", async route => {
      const url = route.request().url();
      if (url.includes("execution-readiness")) {
        if (failedRead) { failedRead = false; return route.fulfill({ status: 503, json: { error: "SYNTHETIC_SECRET_SERVER" } }); }
        if (mode === "loading" && !releaseRead) await new Promise(resolve => { releaseRead = resolve; });
        return route.fulfill({ json: { data: packet } });
      }
      assert.equal(route.request().method(), "GET");
      return route.fulfill({ json: { data: url.includes("/v1/tasks?") ? [{ ...packet.editor.task, description: "Zweryfikuj dostępność formularza i komunikaty walidacji.", priority: "normal" }] : { departments: [] } } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator("strong:visible").filter({ hasText: "Poprawa formularza zgłoszeń" }).first().waitFor();
    await page.locator("button:visible").filter({ hasText: locale === "pl" ? "Przygotuj wykonanie" : "Prepare execution" }).first().click();
    await page.getByRole("dialog").waitFor();
    if (!["loading", "error"].includes(mode)) await page.getByText(locale === "pl" ? "Status zadania:" : "Task status:", { exact: false }).waitFor();
    else await page.getByText(locale === "pl" ? mode === "loading" ? "Sprawdzanie kontekstu i zaakceptowanej rewizji…" : "Nie udało się potwierdzić żądania." : mode === "loading" ? "Checking context and accepted revision…" : "The request could not be confirmed.", { exact: false }).waitFor();
    if (["viewer", "blocked"].includes(mode)) assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Przekaż do wykonania" : "Submit for execution", exact: true }).count(), 0);
    if (mode === "ready") assert.equal(await page.getByRole("button", { name: locale === "pl" ? "Dodaj zaakceptowane zadanie do kolejki" : "Queue accepted task", exact: true }).isDisabled(), true);
    if (mode === "changed") {
      await page.getByText(locale === "pl" ? "Zmienione źródła (2)" : "Changed sources (2)", { exact: true }).waitFor();
      assert.equal(await page.getByText("application_repositories", { exact: true }).count(), 0);
    }
    assert.equal((await page.locator("body").innerText()).includes("SYNTHETIC_SECRET"), false);
    await page.screenshot({ path: path.join(output, `${locale}-${mode}-${width}.png`), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}/${mode}/${width}`);
    assert.deepEqual(errors, []); releaseRead?.(); await page.close(); checked++;
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => localStorage.setItem("companycoreLocale", "en"));
  const { f, packet } = fixture("changed"); let submitCount = 0;
  await page.route("**/v1/**", async route => {
    const url = route.request().url();
    if (url.includes("execution-readiness")) return route.fulfill({ json: { data: packet } });
    if (url.includes("submit-for-execution")) {
      const input = route.request().postDataJSON(); assert.deepEqual(Object.keys(input).sort(), ["applicationId", "baseBranch", "contract", "expectedVersion", "prompt", "requestId"]);
      f.packet.contract = input.contract; sealPacket(f.packet); validateExecutionPacket(f.packet, f.claimed, f.taskContext, f.applicationContext); submitCount++;
      if (submitCount === 1) { packet.status = "needs_context"; packet.reason = "submission_incomplete"; packet.editor.submissionVersion = "b".repeat(64); return route.fulfill({ status: 409, json: { error: "task_execution_contract_invalid", message: "SYNTHETIC_SECRET", errorDetails: { details: { issues: [{ field: "contract.context.company", reason: "stale" }, { field: "SYNTHETIC_SECRET", reason: "SYNTHETIC_SECRET" }] } } } }); }
      packet.status = "ready"; delete packet.reason; packet.revision = "b".repeat(64); packet.validationRevision = packet.revision;
      return route.fulfill({ json: { data: { readiness: packet } } });
    }
    return route.fulfill({ json: { data: url.includes("/v1/tasks?") ? [{ ...packet.editor.task, priority: "normal" }] : { departments: [] } } });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator("button:visible").filter({ hasText: "Prepare execution" }).first().click();
  await page.getByLabel(/^Company context/).click();
  await page.getByRole("searchbox").last().waitFor();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.getByRole("button", { name: "Done", exact: true }).evaluate(node => node === document.activeElement), true);
  await page.keyboard.press("Tab");
  assert.equal(await page.getByRole("searchbox").last().evaluate(node => node === document.activeElement), true);
  await page.screenshot({ path: path.join(output, "en-source-picker-1440.png"), fullPage: true });
  await page.keyboard.press("Escape"); assert.equal(await page.getByRole("dialog").count(), 1);
  await page.getByRole("button", { name: "Submit for execution", exact: true }).click();
  await page.getByText("Choose at least one current company source with usable content.").first().waitFor();
  assert.equal((await page.locator("body").innerText()).includes("SYNTHETIC_SECRET"), false);
  assert.equal(await page.getByLabel(/^Expected outcome/).inputValue(), f.packet.contract.objective.outcome);
  await page.screenshot({ path: path.join(output, "en-validation-error-1440.png"), fullPage: true });
  await page.getByRole("button", { name: "Submit for execution", exact: true }).click();
  await page.getByText("The current contract was validated and accepted.", { exact: true }).waitFor();
  assert.equal(submitCount, 2);
  await page.getByRole("button", { name: "Review or update contract" }).last().click();
  await page.getByLabel(/^Expected outcome/).fill("Changed unaccepted outcome");
  await page.getByLabel(/^Rollback instructions/).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, "en-contract-bottom-1440.png"), fullPage: true });
  await page.keyboard.press("Escape"); await page.getByRole("heading", { name: "Discard unaccepted edits?" }).waitFor();
  await page.getByRole("button", { name: "Keep editing", exact: true }).last().click();
  assert.equal(await page.getByLabel(/^Expected outcome/).inputValue(), "Changed unaccepted outcome");
  await page.setViewportSize({ width: 720, height: 500 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(output, "en-reflow-720.png"), fullPage: true });
  await page.close(); checked++;
  const preview = await browser.newPage({ viewport: { width: 834, height: 1000 } });
  await preview.addInitScript(task => { localStorage.setItem("companycoreLocale", "en"); window.readyPreview = { id: task.id, task: { ...task, description: "Original description", priority: "normal" } }; }, packet.editor.task);
  let savedTitle;
  await preview.route("**/v1/**", async route => {
    assert.equal(route.request().method(), "PATCH"); savedTitle = route.request().postDataJSON().title;
    return route.fulfill({ json: { data: {} } });
  });
  await preview.goto(`http://127.0.0.1:${server.address().port}`);
  await preview.locator('input[name="title"]').fill("Saved before Ready");
  await preview.getByRole("button", { name: "Save and prepare execution", exact: true }).click();
  await preview.waitForFunction(() => window.readyOpened && window.readySaved);
  assert.equal(savedTitle, "Saved before Ready");
  assert.equal(await preview.evaluate(() => window.readyOpened), packet.editor.task.id);
  await preview.close(); checked++;
  for (const locale of ["en", "pl"]) {
    const retryPage = await browser.newPage({ viewport: { width: 834, height: 960 } });
    await retryPage.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const { packet: retryPacket } = fixture("changed"); const attempts = [];
    await retryPage.route("**/v1/**", async route => {
      const url = route.request().url();
      if (url.includes("execution-readiness")) return route.fulfill({ json: { data: retryPacket } });
      if (url.includes("submit-for-execution")) {
        attempts.push(route.request().postDataJSON());
        if (attempts.length === 1) return route.abort("failed"); // ambiguous ACK; keep the same command identity
        assert.deepEqual(attempts[1], attempts[0]); assert.match(attempts[0].requestId, /^[a-f0-9-]{36}$/);
        assert.equal(attempts[0].expectedVersion, retryPacket.editor.submissionVersion);
        retryPacket.status = "ready";
        return route.fulfill({ json: { data: { readiness: retryPacket } } });
      }
      assert.equal(route.request().method(), "GET");
      return route.fulfill({ json: { data: url.includes("/v1/tasks?") ? [{ ...retryPacket.editor.task, priority: "normal" }] : { departments: [] } } });
    });
    await retryPage.goto(`http://127.0.0.1:${server.address().port}`);
    await retryPage.locator("button:visible").filter({ hasText: locale === "pl" ? "Przygotuj wykonanie" : "Prepare execution" }).first().click();
    const submit = retryPage.getByRole("button", { name: locale === "pl" ? "Przekaż do wykonania" : "Submit for execution", exact: true });
    await submit.click();
    await retryPage.getByText(locale === "pl" ? "Nie udało się potwierdzić żądania." : "The request could not be confirmed.", { exact: false }).waitFor();
    await submit.focus(); await retryPage.keyboard.press("Enter");
    await retryPage.getByText(locale === "pl" ? "Bieżący kontrakt został sprawdzony i zaakceptowany." : "The current contract was validated and accepted.", { exact: true }).waitFor();
    assert.equal(attempts.length, 2); await retryPage.close(); checked++;
  }
  for (const locale of ["en", "pl"]) {
    const scopePage = await browser.newPage({ viewport: { width: 834, height: 960 } });
    await scopePage.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const { f: scopeFixture, packet: scopePacket } = fixture("changed"); let scopeSubmits = 0;
    await scopePage.route("**/v1/**", async route => {
      const url = route.request().url();
      if (url.includes("execution-readiness")) return route.fulfill({ json: { data: scopePacket } });
      if (url.includes("submit-for-execution")) {
        const input = route.request().postDataJSON(); scopeSubmits++;
        scopeFixture.packet.contract = input.contract; sealPacket(scopeFixture.packet);
        if (scopeSubmits === 1) {
          assert.throws(() => validateExecutionPacket(scopeFixture.packet, scopeFixture.claimed, scopeFixture.taskContext, scopeFixture.applicationContext));
          scopePacket.status = "needs_context"; scopePacket.reason = "submission_incomplete"; scopePacket.editor.submissionVersion = "b".repeat(64);
          return route.fulfill({ status: 409, json: { error: "task_execution_contract_invalid", errorDetails: { details: { issues: [{ field: "contract.singleTask.problems", reason: "split_required" }] } } } });
        }
        validateExecutionPacket(scopeFixture.packet, scopeFixture.claimed, scopeFixture.taskContext, scopeFixture.applicationContext);
        assert.equal(input.contract.singleTask.problems.length, 2);
        assert.equal(input.contract.singleTask.commonCause.evidence.id, scopeFixture.packet.sources[2].id);
        scopePacket.status = "ready"; scopePacket.editor.accepted.contract = input.contract;
        return route.fulfill({ json: { data: { readiness: scopePacket } } });
      }
      assert.equal(route.request().method(), "GET", "scope editing must not create child tasks");
      return route.fulfill({ json: { data: url.includes("/v1/tasks?") ? [{ ...scopePacket.editor.task, priority: "normal" }] : { departments: [] } } });
    });
    await scopePage.goto(`http://127.0.0.1:${server.address().port}`);
    await scopePage.locator("button:visible").filter({ hasText: locale === "pl" ? "Przygotuj wykonanie" : "Prepare execution" }).first().click();
    await scopePage.getByLabel(locale === "pl" ? /^Docelowy komponent/ : /^Target component/).selectOption(scopeFixture.packet.contract.singleTask.component.id);
    await scopePage.getByLabel(/^Accountable manager/).selectOption(scopeFixture.packet.contract.singleTask.accountableManager.id);
    const outcome = scopePage.getByLabel(locale === "pl" ? /^Oczekiwany rezultat/ : /^Expected outcome/);
    const originalOutcome = await outcome.inputValue();
    await outcome.fill(locale === "pl" ? "Napraw logowanie oraz dodaj płatności" : "Fix login and add billing");
    const submit = scopePage.getByRole("button", { name: locale === "pl" ? "Przekaż do wykonania" : "Submit for execution", exact: true });
    await submit.click();
    await scopePage.getByText(locale === "pl" ? /^Zachowaj jedną aplikację/ : /^Keep one application/).first().waitFor();
    await outcome.fill(originalOutcome);
    await scopePage.getByRole("button", { name: locale === "pl" ? "Dodaj symptom tej samej przyczyny" : "Add a symptom of the same cause", exact: true }).click();
    await scopePage.getByLabel(locale === "pl" ? /^Problem lub symptom 2/ : /^Problem or symptom 2/).fill("Preview rejects valid input");
    const causalLinks = scopePage.getByLabel(locale === "pl" ? /^Jak symptom wynika/ : /^How this symptom follows/);
    await causalLinks.nth(0).fill("The shared parser removes the required token");
    await causalLinks.nth(1).fill("The preview uses the same parser result");
    await scopePage.getByLabel(locale === "pl" ? /^Jeden wspólny mechanizm/ : /^One common mechanism/).fill("The shared parser removes a required input token");
    await scopePage.getByLabel(locale === "pl" ? /^Dlaczego nie można/ : /^Why the fixes cannot/).fill("Both symptoms are caused by one shared parser correction");
    await scopePage.getByLabel(locale === "pl" ? /^Źródło techniczne potwierdzające/ : /^Technical source supporting/).selectOption(scopeFixture.packet.sources[2].id);
    await scopePage.screenshot({ path: path.join(output, `${locale}-scope-authoring-834.png`), fullPage: true });
    await submit.click();
    await scopePage.getByText(locale === "pl" ? "Bieżący kontrakt został sprawdzony i zaakceptowany." : "The current contract was validated and accepted.", { exact: true }).waitFor();
    await scopePage.getByText(locale === "pl" ? "Wyjątek wspólnej przyczyny" : "Shared-cause exception", { exact: true }).waitFor();
    assert.equal(scopeSubmits, 2);
    await scopePage.getByText(locale === "pl" ? "Wyjątek wspólnej przyczyny" : "Shared-cause exception", { exact: true }).click();
    await scopePage.screenshot({ path: path.join(output, `${locale}-scope-exception-expanded-834.png`), fullPage: true });
    await scopePage.getByRole("button", { name: locale === "pl" ? "Sprawdź lub zmień kontrakt" : "Review or update contract", exact: true }).click();
    for (const width of [390, 1440]) {
      await scopePage.setViewportSize({ width, height: 960 });
      await scopePage.getByLabel(locale === "pl" ? /^Docelowy komponent/ : /^Target component/).scrollIntoViewIfNeeded();
      await scopePage.screenshot({ path: path.join(output, `${locale}-scope-fields-${width}.png`), fullPage: true });
      assert.equal(await scopePage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await scopePage.close(); checked++;
  }
  for (const locale of ["en", "pl"]) {
    const rolePage = await browser.newPage({ viewport: { width: 834, height: 960 } });
    await rolePage.addInitScript(value => localStorage.setItem("companycoreLocale", value), locale);
    const { f: roleFixture, packet: rolePacket } = fixture("changed"), savedRoles = roleFixture.packet.contract.taskRoles;
    delete rolePacket.editor.accepted.contract.taskRoles; let submissions = 0;
    await rolePage.route("**/v1/**", async route => {
      const url = route.request().url();
      if (url.includes("execution-readiness")) return route.fulfill({ json: { data: rolePacket } });
      if (url.includes("submit-for-execution")) {
        const input = route.request().postDataJSON(); submissions++;
        assert.equal("roleProvenance" in input, false); assert.equal("roleProvenance" in input.contract, false);
        roleFixture.packet.contract = input.contract; sealPacket(roleFixture.packet);
        const badRole = submissions === 1 ? "verifier" : "releaser";
        roleFixture.packet.roleAuthorities.verifier = submissions === 1 ? roleFixture.packet.roleAuthorities.executor : roleFixture.packet.roleAuthorities.verifier;
        // Resolve the selected fixture identity as the API does; restore independent authority on correction.
        for (const name of ["verifier", "releaser"]) roleFixture.packet.roleAuthorities[name] = input.contract.taskRoles[name].id === savedRoles.executor.id
          ? { ...roleFixture.packet.roleAuthorities.executor }
          : { id: savedRoles[name].id, workspaceId: roleFixture.claimed.workspaceId, type: "agent", status: "active", revision: savedRoles[name].revision, role: "engineer", competencies: ["javascript"], authorityScope: [name === "verifier" ? "task_verification" : "release_authorization"], principal: { kind: "agent", id: savedRoles[name].id }, membership: null };
        sealPacket(roleFixture.packet);
        if (submissions < 3) {
          assert.throws(() => validateExecutionPacket(roleFixture.packet, roleFixture.claimed, roleFixture.taskContext, roleFixture.applicationContext));
          rolePacket.status = "needs_context"; rolePacket.reason = "submission_incomplete";
          return route.fulfill({ status: 409, json: { error: "task_execution_contract_invalid", errorDetails: { details: { issues: [{ field: `contract.taskRoles.${badRole}`, reason: "independence_required" }] } } } });
        }
        validateExecutionPacket(roleFixture.packet, roleFixture.claimed, roleFixture.taskContext, roleFixture.applicationContext);
        rolePacket.editor.accepted.contract = input.contract; rolePacket.status = "ready"; delete rolePacket.changedSources;
        return route.fulfill({ json: { data: { readiness: rolePacket } } });
      }
      assert.equal(route.request().method(), "GET");
      return route.fulfill({ json: { data: url.includes("/v1/tasks?") ? [{ ...rolePacket.editor.task, priority: "normal" }] : { departments: [] } } });
    });
    await rolePage.goto(`http://127.0.0.1:${server.address().port}`);
    await rolePage.locator("button:visible").filter({ hasText: locale === "pl" ? "Przygotuj wykonanie" : "Prepare execution" }).first().click();
    await rolePage.getByRole("button", { name: locale === "pl" ? "Potwierdź bieżące odwołanie" : "Confirm current reference", exact: true }).click();
    const verifier = rolePage.getByLabel(locale === "pl" ? /^Niezależny weryfikator/ : /^Independent verifier/), releaser = rolePage.getByLabel(locale === "pl" ? /^Zatwierdzający wydanie/ : /^Release authorizer/);
    await verifier.selectOption(savedRoles.executor.id); await releaser.selectOption(savedRoles.releaser.id);
    await rolePage.getByText(locale === "pl" ? /^Ta tożsamość jest autorem/ : /^This identity authored/).waitFor();
    for (const width of [390, 834, 1440]) {
      await rolePage.setViewportSize({ width, height: 960 }); await verifier.scrollIntoViewIfNeeded();
      await rolePage.screenshot({ path: path.join(output, `${locale}-role-conflict-${width}.png`), fullPage: true });
      assert.equal(await rolePage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    const submit = rolePage.getByRole("button", { name: locale === "pl" ? "Przekaż do wykonania" : "Submit for execution", exact: true });
    await submit.click(); await rolePage.getByText(locale === "pl" ? /^Sprawdź wszystkie pięć ról/ : /^Review all five roles/).waitFor();
    await verifier.selectOption(savedRoles.verifier.id); await releaser.selectOption(savedRoles.executor.id);
    await submit.click(); await rolePage.getByText(locale === "pl" ? /^Sprawdź wszystkie pięć ról/ : /^Review all five roles/).waitFor();
    await releaser.selectOption(savedRoles.releaser.id); await submit.click();
    await rolePage.getByText(locale === "pl" ? "Bieżący kontrakt został sprawdzony i zaakceptowany." : "The current contract was validated and accepted.", { exact: true }).waitFor();
    assert.equal(submissions, 3); await rolePage.getByText("Review Worker", { exact: true }).waitFor();
    await rolePage.screenshot({ path: path.join(output, `${locale}-roles-accepted.png`), fullPage: true });
    await rolePage.close(); checked++;
  }
  console.log(JSON.stringify({ checked, output }));
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
