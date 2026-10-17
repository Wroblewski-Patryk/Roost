import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";
import { validPacketFixture } from "./fixtures/execution-packet.mjs";

const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskReadinessModal}from'./web/src/features/departments/task-readiness';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskReadinessModal taskId={window.taskId} onClose={()=>window.closed=true}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
const css = await readFile(path.join("public/react/assets", cssName));
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (req.url.startsWith("/vendor/phosphor/bold/")) {
    try { const data = await readFile(path.join("node_modules/@phosphor-icons/web/src/bold", path.basename(req.url))); res.setHeader("Content-Type", "font/woff2"); return res.end(data); }
    catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
const f = validPacketFixture(), c = f.packet.contract;
const task = { id: f.claimed.taskId, title: "Task preparation draft", status: "todo", project: { id: f.taskContext.task.projectId, name: "Portal" }, goal: { id: c.objective.goalId, title: "Accessible forms" } };
const editor = {
  roleCatalog: Object.entries(f.packet.roleAuthorities).filter(([name]) => ["accountableManager", "executor", "verifier", "releaser"].includes(name)).map(([name, item]) => ({ id: item.id, revision: item.revision, label: name, type: item.type, role: item.role, competencies: item.competencies, mandates: item.authorityScope, principalKey: `${item.principal.kind}:${item.principal.id}`, eligible: true })),
  requester: { ...c.taskRoles.requester, label: "Requester" }, roleOrigin: { established: true, submissionId: f.packet.roleAuthorities.provenance.originatingSubmissionId }, excludedRolePrincipals: f.packet.roleAuthorities.provenance.authors.map(p => `${p.kind}:${p.id}`),
  taskIdentity: { contractId: c.singleTask.contractId, branch: c.singleTask.branch }, components: [{ ...c.singleTask.component, label: "Parser" }], managers: [{ ...c.singleTask.accountableManager, label: "Manager" }],
  submissionVersion: "a".repeat(64), task, agent: { ...f.taskContext.task.assignedWorkforceEntity, name: "Worker", eligible: true, competencies: ["javascript"], tools: c.access.tools, permissions: c.access.permissions },
  applications: [{ id: f.claimed.applicationId, name: "Portal" }], applicationId: f.claimed.applicationId,
  projects: [task.project], goals: [task.goal], agents: [{ id: c.assignment.agentId, name: "Worker" }], activeExecution: false, catalogTruncated: false,
  models: [{ id: "gpt-5.6-sol", efforts: ["low", "medium"] }], sources: f.packet.sources.map((item, index) => ({ id: item.id, label: `Source ${index}`, applicationId: item.applicationId, revision: item.revision })),
  procedures: [], dependencies: [], decisions: [], accepted: null, acceptance: null
};
const packet = { status: "draft", reason: "ready_pin_required", canSubmit: true, executionEnabled: false, editor };
let latest = null, failReplyOnce = false, failReadOnce = false, failEditorReadOnce = false, unlinkedApp = false, viewer = false;
const posts = [], otherWrites = [], receipts = new Map();
const url = `http://127.0.0.1:${server.address().port}`;
async function openPage(locale, width, expectEditor = true) {
  const page = await browser.newPage({ viewport: { width, height: 960 } });
  await page.addInitScript(({ taskId, locale }) => { window.taskId = taskId; localStorage.setItem("companycoreLocale", locale); }, { taskId: task.id, locale });
  await page.route("**/v1/**", async route => {
    const request = route.request(), path = request.url();
    if (path.includes("/specialist-offer")) return route.fulfill({ status: 404, json: { error: "task_specialist_offer_not_found" } });
    if (path.endsWith("/preparation-draft") && request.method() === "GET") {
      if (failReadOnce) { failReadOnce = false; return route.abort("failed"); }
      return viewer ? route.fulfill({ status: 403, json: { error: "task_draft_owner_required" } }) : route.fulfill({ json: { data: { latest } } });
    }
    if (path.endsWith("/preparation-draft") && request.method() === "POST") {
      const body = request.postDataJSON(); posts.push(body);
      if (receipts.has(body.requestId)) return route.fulfill({ json: { data: { latest: receipts.get(body.requestId), replayed: true, currentVersion: latest?.version ?? 0 } } });
      if ((latest?.version ?? 0) !== body.expectedVersion) return route.fulfill({ status: 409, json: { error: "task_draft_version_conflict" } });
      latest = { id: body.requestId, version: body.expectedVersion + 1, editorVersion: body.expectedEditorVersion, executionClass: body.executionClass,
        applicationId: body.applicationId, draft: body.draft, bodyDigest: "b".repeat(64), actorUserId: f.claimed.userId, savedAt: "2026-10-17T12:00:00Z" };
      receipts.set(body.requestId, latest);
      if (failReplyOnce) { failReplyOnce = false; return route.abort("failed"); }
      return route.fulfill({ status: 201, json: { data: { latest, replayed: false } } });
    }
    if (path.includes("execution-readiness")) {
      if (failEditorReadOnce) { failEditorReadOnce = false; return route.fulfill({ status: 500, json: { error: "temporary_failure" } }); }
      if (unlinkedApp && new URL(path).searchParams.get("applicationId") === f.claimed.applicationId)
        return route.fulfill({ status: 409, json: { error: "application_not_found" } });
      return route.fulfill({ json: { data: packet } });
    }
    if (request.method() !== "GET") { otherWrites.push({ method: request.method(), path }); return route.fulfill({ status: 500, json: { error: "unexpected_write" } }); }
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto(url);
  await page.getByRole("dialog").waitFor();
  if (expectEditor) await page.getByText(locale === "pl" ? "Status zadania:" : "Task status:", { exact: false }).waitFor();
  return page;
}
try {
  const first = await openPage("pl", 390), second = await openPage("pl", 390);
  const outcome = page => page.getByLabel(/^Oczekiwany rezultat|^Expected outcome/);
  await outcome(first).fill("Pierwszy zapis");
  await first.getByRole("button", { name: "Zapisz szkic", exact: true }).focus();
  await first.keyboard.press("Enter");
  await first.getByText("Zapisany szkic v1 · bez Ready").waitFor();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].draft.values.outcome, "Pierwszy zapis");
  assert.equal(await first.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await outcome(second).fill("Zmiana w drugiej karcie");
  await second.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
  await second.getByText("Ktoś zapisał nowszą wersję.", { exact: false }).waitFor();
  await second.waitForFunction(() => document.activeElement?.textContent?.includes("Ktoś zapisał nowszą wersję."));
  assert.equal(await outcome(second).inputValue(), "Zmiana w drugiej karcie");
  await second.getByRole("button", { name: "Sprawdź aktualną wersję i zachowaj zmiany" }).click();
  await second.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
  await second.getByText("Zapisany szkic v2 · bez Ready").waitFor();
  assert.equal(posts[2].expectedVersion, 1);
  const english = await openPage("en", 1440);
  assert.equal(await outcome(english).inputValue(), "Zmiana w drugiej karcie");
  await english.getByText("Saved draft v2 · not Ready").waitFor();
  await outcome(english).fill("Lost response edit");
  failReplyOnce = true;
  await english.getByRole("button", { name: "Save draft", exact: true }).click();
  await english.getByText("It is unclear whether the save reached the server.", { exact: false }).waitFor();
  assert.equal(await outcome(english).inputValue(), "Lost response edit");
  await english.getByRole("button", { name: "Retry the same save", exact: true }).click();
  await english.getByText("Saved draft v3 · not Ready").waitFor();
  assert.equal(posts.at(-1).requestId, posts.at(-2).requestId);
  assert.equal(posts.at(-1).expectedVersion, 2);
  assert.equal(await english.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  editor.submissionVersion = "b".repeat(64);
  const changedContext = await openPage("en", 390);
  await changedContext.getByText("Context changed since it was saved", { exact: false }).waitFor();
  assert.equal(await outcome(changedContext).inputValue(), "Lost response edit");
  await outcome(changedContext).fill("Reviewed after context change");
  assert.equal(await changedContext.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
  await changedContext.getByRole("button", { name: "Check current version and keep edits" }).click();
  await changedContext.getByRole("button", { name: "Save draft", exact: true }).click();
  await changedContext.getByText("Saved draft v4 · not Ready").waitFor();
  assert.equal(posts.at(-1).expectedEditorVersion, "b".repeat(64));
  failReadOnce = true;
  const recoveredWithoutEdits = await openPage("en", 390);
  await recoveredWithoutEdits.getByRole("button", { name: "Retry draft read" }).click();
  await recoveredWithoutEdits.getByText("A newer version was saved.", { exact: false }).waitFor();
  assert.equal(await recoveredWithoutEdits.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
  await recoveredWithoutEdits.getByRole("button", { name: "Load saved draft", exact: true }).click();
  await recoveredWithoutEdits.waitForFunction(() => [...document.querySelectorAll("input,textarea")].some(item => item.value === "Reviewed after context change"));
  assert.equal(await outcome(recoveredWithoutEdits).inputValue(), "Reviewed after context change");
  failReadOnce = true;
  const recoveredRead = await openPage("en", 390);
  await outcome(recoveredRead).fill("Local text after failed draft read");
  await recoveredRead.getByRole("button", { name: "Retry draft read" }).click();
  await recoveredRead.getByText("A newer version was saved.", { exact: false }).waitFor();
  assert.equal(await outcome(recoveredRead).inputValue(), "Local text after failed draft read");
  assert.equal(await recoveredRead.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
  await recoveredRead.getByRole("button", { name: "Check current version and keep edits" }).click();
  await recoveredRead.getByRole("button", { name: "Save draft", exact: true }).click();
  await recoveredRead.getByText("Saved draft v5 · not Ready").waitFor();
  const concurrent = await openPage("en", 1440);
  await outcome(concurrent).fill("Uncertain local text");
  failReplyOnce = true;
  await concurrent.getByRole("button", { name: "Save draft", exact: true }).click();
  await concurrent.getByText("It is unclear whether the save reached the server.", { exact: false }).waitFor();
  latest = { ...latest, id: "another-tab-save", version: latest.version + 1, draft: { ...latest.draft,
    values: { ...latest.draft.values, outcome: "Concurrent latest text" } } };
  await concurrent.getByRole("button", { name: "Retry the same save" }).click();
  await concurrent.getByText("A newer version was saved.", { exact: false }).waitFor();
  assert.equal(await outcome(concurrent).inputValue(), "Uncertain local text");
  assert.equal(await concurrent.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
  await concurrent.getByRole("button", { name: "Check current version and keep edits" }).click();
  await concurrent.getByRole("button", { name: "Save draft", exact: true }).click();
  await concurrent.getByText("Saved draft v8 · not Ready").waitFor();
  failEditorReadOnce = true;
  const transientRead = await openPage("en", 390, false);
  await transientRead.waitForLoadState("networkidle");
  assert.equal(await transientRead.getByText("The application saved in this draft is no longer linked", { exact: false }).count(), 0);
  assert.equal(await transientRead.getByText("Task status:", { exact: false }).count(), 0);
  await transientRead.getByRole("button", { name: "Try again", exact: true }).click();
  await transientRead.waitForFunction(() => [...document.querySelectorAll("input,textarea")].some(item => item.value === "Uncertain local text"));
  assert.equal(await outcome(transientRead).inputValue(), "Uncertain local text");
  assert.equal(await transientRead.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
  unlinkedApp = true;
  const previousApplication = editor.applicationId;
  editor.applicationId = "11111111-1111-4111-8111-111111111111";
  editor.applications = [{ id: editor.applicationId, name: "Replacement app" }];
  const unlinked = await openPage("en", 390);
  await unlinked.getByText("The application saved in this draft is no longer linked", { exact: false }).waitFor();
  assert.equal(await outcome(unlinked).inputValue(), "Uncertain local text");
  assert.equal(await unlinked.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
  await unlinked.getByRole("button", { name: "Discard my edits and load saved draft" }).click();
  await unlinked.getByText("The application saved in this draft is no longer linked", { exact: false }).waitFor();
  assert.equal(await outcome(unlinked).inputValue(), "Uncertain local text");
  assert.equal(await unlinked.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
  unlinkedApp = false;
  editor.applicationId = previousApplication;
  editor.applications = [{ id: previousApplication, name: "Portal" }];
  packet.status = "needs_context"; packet.reason = "submission_incomplete";
  const focusedConflict = await openPage("en", 390);
  await outcome(focusedConflict).fill("Keyboard conflict after context error");
  latest = { ...latest, id: "focus-other-tab", version: latest.version + 1 };
  await focusedConflict.getByRole("button", { name: "Save draft", exact: true }).click();
  await focusedConflict.getByText("A newer version was saved.", { exact: false }).waitFor();
  await focusedConflict.waitForFunction(() => document.activeElement?.textContent?.includes("A newer version was saved."));
  packet.status = "draft"; packet.reason = "ready_pin_required";
  viewer = true;
  const readOnly = await openPage("en", 390);
  assert.equal(await readOnly.getByRole("button", { name: "Save draft", exact: true }).count(), 0);
  await readOnly.getByText("Only the workspace owner can save working drafts").waitFor();
  viewer = false;
  packet.status = "ready"; packet.pinId = "accepted-pin"; editor.accepted = { contract: c, applicationId: f.claimed.applicationId, prompt: null, baseBranch: null };
  const accepted = await openPage("en", 1440);
  assert.equal(await accepted.getByRole("button", { name: "Save draft", exact: true }).count(), 0);
  await accepted.getByRole("button", { name: "Review or update contract" }).click();
  assert.notEqual(await outcome(accepted).inputValue(), "Reviewed after context change");
  assert.deepEqual(otherWrites, []);
  await Promise.all([first.close(), second.close(), english.close(), changedContext.close(), recoveredWithoutEdits.close(), recoveredRead.close(), concurrent.close(), transientRead.close(), unlinked.close(), focusedConflict.close(), accepted.close(), readOnly.close()]);
  process.stdout.write(JSON.stringify({ checked: "PL/EN 390/1440 restore, two-tab CAS, immutable replay, read failure, concurrent uncertain reply, unlinked application, accepted pin, owner-only, no other writes", posts: posts.length }) + "\n");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
