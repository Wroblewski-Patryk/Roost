import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "11111111-1111-4111-8111-111111111111";
const executionId = "22222222-2222-4222-8222-222222222222";
const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskWorkRoute}from'./web/src/features/departments/task-work-route';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskWorkRoute taskId="${taskId}"/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
});
const cssName = (await readdir("public/react/assets")).find((name) => /^index-.*\.css$/.test(name));
assert.ok(cssName, "built owner-console CSS required");
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
let checked = 0;
try {
  for (const [locale, width] of [["pl", 390], ["en", 1440]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.addInitScript((language) => {
      localStorage.setItem("companycoreLocale", language);
      sessionStorage.setItem("companycoreOwnerToken", "synthetic-scoped-token");
    }, locale);
    let saved = false;
    const paths = [];
    const posts = [];
    await page.route("**/v1/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      paths.push(pathname);
      if (pathname === "/v1/auth/me") return route.fulfill({ json: { data: { taskScopeId: taskId } } });
      if (pathname === `/v1/tasks/${taskId}`) return route.fulfill({ json: { data: { id: taskId, title: "Exact synthetic task", description: "Bounded fixture", status: "active" } } });
      if (pathname === `/v1/agent-runtime/tasks/${taskId}/review` && route.request().method() === "GET") return route.fulfill({ json: { data: {
        task: { id: taskId, title: "Exact synthetic task" }, canReview: !saved, expectedVersion: "ready-v2", materialVersion: "material-v3", informationTask: false,
        approvalCommit: "a".repeat(40), result: { executionId, attempt: 1, summary: "Synthetic result", finalResponse: "Completed synthetic work" },
        ...(saved ? { decision: { id: "33333333-3333-4333-8333-333333333333", decision: "approve", evidence: { summary: "Independent check passed" } } } : {})
      } } });
      if (pathname === `/v1/agent-runtime/tasks/${taskId}/actions/review` && route.request().method() === "POST") {
        posts.push(route.request().postDataJSON()); saved = true; return route.fulfill({ json: { data: {} } });
      }
      return route.fulfill({ status: 403, json: { error: "task_scope_forbidden" } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/task-work/${taskId}`);
    await page.getByRole("heading", { name: "Exact synthetic task" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const labels = locale === "pl"
      ? { decision: "Decyzja oceny", summary: "Uzasadnienie oceny", reference: "Odnośnik do dowodu lub testu", result: "Wynik dowodu lub testu", save: "Zapisz decyzję oceny", success: "Decyzja została zapisana w historii zadania." }
      : { decision: "Review decision", summary: "Assessment", reference: "Evidence or test reference", result: "Evidence or test result", save: "Record review decision", success: "Decision recorded in task history." };
    await page.getByLabel(labels.decision, { exact: true }).selectOption("approve");
    await page.getByLabel(labels.summary).fill("Independent check passed");
    await page.getByLabel(labels.reference).fill("fixture test");
    await page.getByLabel(labels.result).fill("pass");
    await page.getByRole("button", { name: labels.save }).click();
    await page.getByText(labels.success, { exact: true }).waitFor();
    assert.equal(posts.length, 1);
    assert.deepEqual({ decision: posts[0].decision, executionId: posts[0].executionId, expectedVersion: posts[0].expectedVersion,
      materialVersion: posts[0].materialVersion, reviewedCommit: posts[0].reviewedCommit },
    { decision: "approve", executionId, expectedVersion: "ready-v2", materialVersion: "material-v3", reviewedCommit: "a".repeat(40) });
    assert.ok(paths.every((entry) => entry === "/v1/auth/me" || entry.startsWith(`/v1/tasks/${taskId}`) || entry.startsWith(`/v1/agent-runtime/tasks/${taskId}/`)));
    await page.close(); checked++;
  }
  console.log(JSON.stringify({ checked }));
} finally {
  await browser.close(); server.close();
}
