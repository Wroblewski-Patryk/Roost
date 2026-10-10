import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const database = new URL(process.env.DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1");
assert.match(database.pathname, /^\/companycore_test_g6a_[a-f0-9]{16}$/);
assert.equal(process.env.COMPANYCORE_SKIP_DOTENV, "1");
const require = createRequire(import.meta.url);
const { createApp } = require("../dist/app.js");
const { prisma } = require("../dist/db/prisma.js");

test("G7 isolated owner attention to information review", { timeout: 120000 }, async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const output = path.join(os.tmpdir(), "roost-g7-owner-review-qa");
  await mkdir(output, { recursive: true });
  async function request(path, token, body) {
    const response = await fetch(base + path, { method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }
  try {
    const owner = await request("/auth/register", null, { email: `g7-owner-${randomUUID()}@example.test`,
      password: "synthetic-test-password-only", name: "Synthetic G7 owner", workspaceName: "Synthetic G7" });
    assert.equal(owner.status, 201);
    const token = owner.body.data.token, workspaceId = owner.body.data.workspace.id;
    const ownerUserId = (await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).ownerUserId;
    const source = await prisma.companyRecord.create({ data: { workspaceId, recordType: "requirement", key: "g7-owner-review",
      title: "Synthetic company source", description: "A bounded result may be accepted or returned by the owner." } });
    const host = await prisma.agentHost.create({ data: { workspaceId, name: "Synthetic reviewed host", slug: `g7-${randomUUID()}`, platform: "win32" } });
    const admittedDigest = "a".repeat(64), inputSeal = "b".repeat(64);
    async function fixture(decision) {
      const task = await prisma.task.create({ data: { workspaceId, title: `Synthetic ${decision} result` } });
      await prisma.task.update({ where: { id: task.id }, data: { executionReadiness: {
        status: "draft", contract: { executionClass: "roost-company-information-runtime-v1" } } } });
      const executionId = randomUUID(), now = new Date();
      const execution = await prisma.agentExecution.create({ data: { id: executionId, workspaceId, taskId: task.id,
        applicationId: null, baseBranch: null, agentHostId: host.id, requestedByType: "user", requestedById: ownerUserId,
        status: "completed", attempt: 1, startedAt: now, completedAt: now, summary: "Synthetic source summarized.",
        finalResponse: "The synthetic source describes a bounded owner review.", changedFiles: [],
        metadata: { executionContract: { executionClass: "roost-company-information-runtime-v1",
          context: { company: [{ id: source.id, revision: source.updatedAt.toISOString() }] },
          budgets: { maxAttempts: 1, maxDurationSeconds: 600, maxOutputTokens: 1200 },
          modelSelection: { model: "gpt-5.6-sol", reasoningEffort: "low" } },
          readyContextPin: { preparationOnly: false, modelExecutionQualified: true } },
        verification: { informationRuntime: { schemaVersion: "roost-company-information-runtime-verification-v1",
          executionId, nativeTools: [], admissionDigest: admittedDigest, inputSeal, ownedJob: true },
          ownedTreeReceipt: { version: "roost-windows-job-v2", attempt: executionId,
            cleanup: true, jobClosed: true, activeProcesses: 0, rootExit: 0 } } } });
      await prisma.agentExecutionEvent.create({ data: { workspaceId, executionId, type: "information_admitted",
        message: "Synthetic isolated review fixture", payload: { admissionDigest: admittedDigest, inputSeal } } });
      return { task, execution };
    }
    for (const decision of ["accept", "return"]) {
      const { task, execution } = await fixture(decision);
      const target = `/areas?area=04-operacje&view=tasks&taskId=${task.id}&from=attention`;
      const attention = await request("/v1/dashboard/command", token);
      assert.equal(attention.status, 200);
      assert.ok(attention.body.data.priorityItems.some(item => item.kind === "result" && item.id === task.id && item.target === target));
      const resultRoute = `/v1/agent-runtime/tasks/${task.id}/information-result`;
      const result = await request(resultRoute, token);
      assert.equal(result.status, 200); assert.equal(result.body.data.canReview, true);
      const stale = await request(`${resultRoute.replace("/information-result", "")}/actions/review-information`, token,
        { requestId: randomUUID(), executionId: execution.id, materialVersion: "0".repeat(64), decision, summary: "Synthetic owner review" });
      assert.equal(stale.status, 409);
      assert.equal(await prisma.agentExecutionEvent.count({ where: { executionId: execution.id, type: "information_review" } }), 0);
      const page = await browser.newPage({ viewport: { width: decision === "accept" ? 390 : 834, height: 900 } });
      await page.addInitScript(value => { sessionStorage.setItem("companycoreOwnerToken", value.token);
        localStorage.setItem("companycoreLocale", value.locale); }, { token, locale: decision === "accept" ? "pl" : "en" });
      await page.goto(`${base}/areas?area=00-ogolny&view=overview`);
      const attentionRow = page.getByRole("button", { name: new RegExp(task.title) });
      await attentionRow.waitFor(); await attentionRow.click();
      const link = page.locator(`a[href='${target}']`); await link.waitFor();
      await link.click();
      await page.getByRole("region", { name: decision === "accept" ? "Wynik zadania informacyjnego" : "Information task result" }).waitFor({ timeout: 5000 }).catch(async error => {
        console.log(`G7 review navigation ${decision}: ${page.url()} ${(await page.locator("body").innerText()).slice(0, 2200)}`);
        throw error;
      });
      await page.getByRole("textbox", { name: decision === "accept" ? "Uzasadnienie odbioru" : "Review explanation" }).fill("Synthetic owner review of the exact result.");
      await page.getByRole("button", { name: decision === "accept" ? "Przyjmij wynik informacyjny" : "Return information result" }).click();
      await page.getByText(decision === "accept" ? "Wynik informacyjny przyjęty." : "Information result returned.").waitFor();
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: path.join(output, `${decision}-reviewed.png`), fullPage: true });
      const reviewed = await request(resultRoute, token);
      assert.equal(reviewed.body.data.review.decision, decision);
      assert.equal(reviewed.body.data.canReview, false);
      assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, decision === "accept" ? "done" : "todo");
      assert.equal(await prisma.agentExecutionEvent.count({ where: { executionId: execution.id, type: "information_review" } }), 1);
      await page.close();
    }
    console.log(`G7 isolated review: exact attention links, stale refusal, PL accept, EN return, persisted read-back; synthetic completion fixture, no Worker/model call. Screenshots: ${output}`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
});
