import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "11111111-1111-4111-8111-111111111111";
const intentId = "22222222-2222-4222-8222-222222222222";
const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskPreviewModal}from'./web/src/features/departments/operations-route';const outside=new URLSearchParams(location.search).has('outside');const control={governedList:!outside,directActionsDisabled:true,providerStatus:outside?'done':'todo',providerStatusName:outside?'done':'to do',providerUpdatedAt:null,providerMismatch:outside,providerErrorCode:outside?'provider_task_left_selected_list':null,intent:outside?{id:'${intentId}',requestedStatus:'done',baseStatus:'todo',state:'conflict',commentId:'comment-one',createdAt:new Date().toISOString(),errorCode:'provider_task_left_selected_list'}:null,actor:null};const item={id:'${taskId}',task:{id:'${taskId}',title:'Synthetic ClickUp task',description:'Synthetic fixture',status:'todo',source:'clickup',updatedAt:new Date().toISOString()},hierarchy:{taskList:{id:'list',name:outside?'Other':'Selected'}},clickUpStatusControl:control};createRoot(document.getElementById('root')).render(<LanguageProvider><TaskPreviewModal item={item} taskLists={[]} statuses={[{key:'todo',label:'To do'},{key:'done',label:'Done'}]} onClose={()=>{}} onSaved={()=>{}} onReady={()=>{}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' }
});
const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, "Built owner-console CSS required");
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
    for (const outside of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await page.addInitScript(language => {
        localStorage.setItem("companycoreLocale", language);
        sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token");
      }, locale);
      const writes = [];
      await page.route("**/v1/**", async route => {
        const { pathname } = new URL(route.request().url());
        if (pathname === "/v1/auth/me") return route.fulfill({ json: { data: { authType: "user", workspaceId: "workspace-one", workspaces: [{ id: "workspace-one", role: "owner" }] } } });
        if (route.request().method() === "PATCH" || route.request().method() === "POST") {
          writes.push({ path: pathname, body: route.request().postDataJSON() });
          return route.fulfill({ json: { data: { id: taskId } } });
        }
        return route.fulfill({ status: 404, json: { error: "fixture_not_found" } });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/?${outside ? "outside=1" : ""}`);
      await page.getByText("Synthetic ClickUp task").first().waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (outside) {
        assert.equal(await page.locator('select[name="clickUpStatusRequest"]').count(), 0);
        await page.getByRole("button", { name: locale === "pl" ? "Zamknij prośbę bez zmiany w ClickUp" : "Close request without changing ClickUp" }).click();
        assert.deepEqual(writes.map(write => write.path), [`/v1/tasks/${taskId}/clickup/status-intents/${intentId}/close`]);
      } else {
        await page.locator('select[name="clickUpStatusRequest"]').selectOption("done");
        await page.getByRole("button", { name: locale === "pl" ? "Wyślij prośbę do ClickUp" : "Send status request to ClickUp" }).click();
        assert.deepEqual(writes, [{ path: `/v1/operations/work-items/${taskId}`, body: { status: "done" } }]);
      }
      await page.close();
      checked++;
    }
  }
  console.log(JSON.stringify({ checked }));
} finally {
  await browser.close();
  server.close();
}
