import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const snapshotId = "33333333-3333-4333-8333-333333333333";
const credentialId = "44444444-4444-4444-8444-444444444444";
const intentId = "55555555-5555-4555-8555-555555555555";
const root = `/v1/google-drive/tasks/${taskId}/docs/${fileId}/governed`;
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{GovernedDocPanel}from'./web/src/features/departments/governed-doc-panel';createRoot(document.getElementById('root')).render(<LanguageProvider><GovernedDocPanel fileId='${fileId}' snapshot={{id:'${snapshotId}',sourceRevisionId:'r1',createdAt:new Date().toISOString(),extractedText:'Original'}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName);
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
    for (const mode of ["ready", "unbound", "conflict"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await page.addInitScript(language => { localStorage.setItem("companycoreLocale", language); sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token"); }, locale);
      const writes = [];
      await page.route("**/v1/**", async route => {
        const { pathname } = new URL(route.request().url());
        const method = route.request().method();
        if (method === "POST") {
          writes.push({ path: pathname, body: route.request().postDataJSON(), headers: route.request().headers() });
          return route.fulfill({ json: { data: pathname === "/v1/auth/reauth" ? { proof: "synthetic-proof" } : { id: intentId, state: "applied" } } });
        }
        if (pathname === "/v1/tasks") return route.fulfill({ json: { data: [{ id: taskId, title: "Synthetic task" }] } });
        if (pathname === root && mode === "unbound") return route.fulfill({ status: 404, json: { error: "google_doc_mandate_required" } });
        if (pathname === `${root}/candidate`) return route.fulfill({ json: { data: { task: { id: taskId, title: "Synthetic task", assignedWorkforceEntityId: "agent" },
          file: { id: fileId, name: "Fixture Doc" }, snapshot: { id: snapshotId, sourceRevisionId: "r1", createdAt: new Date().toISOString() },
          credentials: [{ id: credentialId, keyPrefix: "fixture", expiresAt: new Date(Date.now() + 86400000).toISOString() }] } } });
        if (pathname === root) return route.fulfill({ json: { data: { status: mode, provider: mode === "ready" ? { revisionId: "r1", version: "1", actorVerification: "unverified" } : null,
          file: { name: "Fixture Doc" }, content: "Original", intent: mode === "conflict" ? { id: intentId, state: "conflict", errorCode: "google_doc_scope_changed", providerRevisionId: "r2", actorVerification: "roost_credential_bound", createdAt: new Date().toISOString() } : null } } });
        return route.fulfill({ status: 404, json: { error: "fixture_not_found" } });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.getByRole("combobox", { name: locale === "pl" ? "Zadanie dla dokumentu" : "Task for document" }).selectOption(taskId);
      if (mode === "ready") {
        await page.getByRole("textbox", { name: locale === "pl" ? "Tekst do dopisania w pierwszej karcie" : "Text to append in the first tab" }).fill("\nApproved addition");
        await page.getByRole("button", { name: locale === "pl" ? "Dopisz raz w Google Docs" : "Append once in Google Docs" }).click();
        assert.equal(writes.length, 1);
        assert.equal(writes[0].path, `${root}/append`);
        assert.equal(writes[0].body.expectedRevision, "r1");
      } else if (mode === "unbound") {
        await page.getByRole("combobox", { name: locale === "pl" ? "Poświadczenie agenta" : "Agent credential" }).selectOption(credentialId);
        await page.getByRole("textbox", { name: locale === "pl" ? "Obecne hasło właściciela" : "Current owner password" }).fill("synthetic-password");
        await page.getByRole("button", { name: locale === "pl" ? "Potwierdź i wydaj mandat" : "Confirm and issue mandate" }).click();
        await page.waitForFunction(() => document.querySelectorAll('button').length > 0 && !document.body.textContent.includes("Sprawdzam stan Google"));
        assert.deepEqual(writes.map(write => write.path), ["/v1/auth/reauth", `${root}/mandate`]);
        assert.equal(writes[1].body.sourceSnapshotId, snapshotId);
        assert.equal(writes[1].headers["x-owner-action-proof"], "synthetic-proof");
      } else {
        await page.getByRole("button", { name: locale === "pl" ? "Zamknij po ręcznym sprawdzeniu Google" : "Close after manual Google inspection" }).click();
        assert.deepEqual(writes.map(write => write.path), [`${root}/intents/${intentId}/close`]);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
      checked++;
    }
  }
  console.log(JSON.stringify({ checked }));
} finally { await browser.close(); server.close(); }
