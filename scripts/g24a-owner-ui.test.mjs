import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { build } from "esbuild";
import { chromium } from "playwright";

const taskId = "11111111-1111-4111-8111-111111111111";
const siteId = "22222222-2222-4222-8222-222222222222";
const revision = "2026-10-12T12:00:00.000Z";
const sitePackage = { schemaVersion: "roost-reference-site-package-v1", source: {
  provider: "openai_sites", projectId: "appgprj_1234567890abcdef",
  versionId: "appgprj_1234567890abcdef~appgver_1234567890abcdef",
  versionNumber: 1, commitSha: "a".repeat(40), archiveSha256: "b".repeat(64),
  deploymentId: "appgdep_1234567890abcdef", publishedUrl: "https://reference.example.test" },
  preparedAt: revision, observations: [{ id: "hero", category: "content", language: "en", route: "/",
    text: "Visible headline", evidence: [{ kind: "source", scope: "source_only", sha256: "c".repeat(64),
      observedAt: revision, ref: "src/App.tsx" }] }],
  unknowns: ["Contact submission was not tested."] };
const source = { url: "https://reference.example.test", providerVersion: "v1", versionStatus: "provider_saved_version",
  recordRevision: revision, sourceReviewId: "33333333-3333-4333-8333-333333333333", preparedAt: revision,
  contentDigest: "d".repeat(64), version: sitePackage.source };
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{ReferenceSiteStudy}from'./web/src/features/departments/reference-site-study';createRoot(document.getElementById('root')).render(<LanguageProvider><ReferenceSiteStudy taskId="${taskId}" taskTitle="Synthetic task" onClose={()=>{}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const operationsBundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{OperationsRoute}from'./web/src/features/departments/operations-route';createRoot(document.getElementById('root')).render(<LanguageProvider><OperationsRoute/></LanguageProvider>);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"test"' } });
const server = createServer((req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === "/operations.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(operationsBundle.outputFiles[0].contents); }
  res.setHeader("Content-Type", "text/html");
  res.end(`<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script src="${req.url?.includes("entry=operations") ? "/operations.js" : "/app.js"}"></script></body></html>`);
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ["pl", "en"]) {
    const page = await browser.newPage();
    await page.addInitScript(language => { localStorage.setItem("companycoreLocale", language); sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token"); }, locale);
    let created = false, approved = false;
    const posts = [];
    await page.route("**/v1/**", async route => {
      const { pathname } = new URL(route.request().url());
      const method = route.request().method();
      if (pathname === "/v1/company-records" && method === "POST") {
        posts.push({ path: pathname, body: route.request().postDataJSON() }); created = true;
        return route.fulfill({ json: { data: { id: siteId } } });
      }
      if (pathname === `/v1/company-records/${siteId}/context-reviews` && method === "POST") {
        posts.push({ path: pathname, body: route.request().postDataJSON() }); approved = true;
        return route.fulfill({ json: { data: { id: source.sourceReviewId } } });
      }
      if (pathname === `/v1/product-engineering/tasks/${taskId}/reference-sites` && method === "GET") return route.fulfill({ json: { data: {
        reviewEnvironment: "isolated_test", items: created ? [{ id: siteId, title: "Synthetic site", url: source.url,
          providerVersion: source.providerVersion, recordRevision: revision, packageDigest: source.contentDigest,
          versionNumber: 1, commitSha: sitePackage.source.commitSha, observationCount: 1,
          approved, sourceReviewId: approved ? source.sourceReviewId : null }] : []
      } } });
      if (pathname === `/v1/product-engineering/tasks/${taskId}/reference-sites/${siteId}/findings` && method === "GET") return route.fulfill({ json: { data: {
        items: [{ id: "44444444-4444-4444-8444-444444444444", createdAt: new Date().toISOString(), state: "observed", verification: "unverified",
          body: { title: "Synthetic observation", category: "content", language: "en", observed: "Visible headline", sourceExcerpt: "Visible headline", interpretation: "Possible pattern", uncertainty: "Needs human check", applicability: "One page", source,
            observationId: "hero", sourceLanguage: "en", evidence: sitePackage.observations[0].evidence } }], truncated: false
      } } });
      if (pathname === `/v1/product-engineering/tasks/${taskId}/reference-sites/${siteId}/package` && method === "GET") return route.fulfill({ json: { data: {
        siteId, taskId, title: "Synthetic site", package: sitePackage, status: "unverified", source
      } } });
      return route.fulfill({ status: 403, json: { error: "fixture_route_denied" } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText(locale === "pl" ? "Nie skonfigurowano żadnej z dwóch dopuszczonych stron." : "Neither of the two permitted sites is configured.").waitFor();
    await page.getByLabel(locale === "pl" ? "Nazwa źródła" : "Site name").fill("Synthetic site");
    const urlField = page.getByLabel(locale === "pl" ? "Dokładny adres HTTPS" : "Exact HTTPS URL");
    await page.getByLabel(locale === "pl" ? "Oczyszczony pakiet JSON" : "Curated JSON package").setInputFiles({
      name: "fixture-package.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sitePackage)) });
    const savePackage = page.getByRole("button", { name: locale === "pl" ? "Zapisz pakiet" : "Save package" });
    for (const invalid of ["http://reference.example.test", "https://user:pass@reference.example.test",
      "https://reference.example.test#fragment", "https://reference.example.test/", "https://other.example.test"]) {
      await urlField.fill(invalid);
      assert.equal(await savePackage.isDisabled(), true, `reject ${invalid}`);
    }
    assert.equal(posts.length, 0, "invalid URLs must not submit the package");
    await urlField.fill(source.url);
    assert.equal(await savePackage.isEnabled(), true, "exact bare HTTPS origin from the saved package must be accepted");
    await savePackage.click();
    const approveButton = page.getByRole("button", { name: locale === "pl" ? "Zatwierdź źródło" : "Approve source" });
    assert.equal(await approveButton.isDisabled(), true);
    await page.getByRole("button", { name: locale === "pl" ? "Odczytaj pakiet" : "Read package" }).click();
    await page.getByText(sitePackage.source.projectId).last().waitFor();
    await page.getByLabel(locale === "pl" ? "Pochodzenie" : "Provenance").fill("Owner site record");
    await page.getByLabel(locale === "pl" ? "Metoda weryfikacji" : "Verification method").fill("Deployment console readback");
    await page.getByLabel(locale === "pl" ? "Dowód weryfikacji" : "Verification reference").fill("fixture-ref");
    await page.getByLabel(locale === "pl" ? "Powód włączenia" : "Inclusion reason").fill("Exact task study");
    assert.equal(await approveButton.isDisabled(), false);
    await approveButton.click();
    await page.getByRole("button", { name: locale === "pl" ? "Odczytaj pakiet" : "Read package" }).click();
    await page.getByText(locale === "pl" ? "Niepotwierdzone obszary" : "Unknown areas").click();
    await page.getByText("Contact submission was not tested.").waitFor();
    await page.getByText("Synthetic observation").waitFor();
    assert.equal(posts.length, 2);
    assert.equal(posts[0].body.recordType, "reference_site");
    assert.deepEqual(posts[0].body.metadata, { referenceUrl: source.url, providerVersion: source.providerVersion,
      sourceKind: "openai_sites", sourceId: sitePackage.source.projectId, package: sitePackage });
    assert.equal(posts[1].body.taskId, taskId);
    assert.equal(posts[1].body.expectedRevision, revision);
    assert.equal(posts[1].body.environment, "isolated_test");
    assert.ok(await page.getByText(locale === "pl" ? "Niezweryfikowany" : "Unverified").count());
    await page.close();

    const operationsPage = await browser.newPage();
    await operationsPage.addInitScript(language => { localStorage.setItem("companycoreLocale", language); sessionStorage.setItem("companycoreOwnerToken", "synthetic-owner-token"); }, locale);
    await operationsPage.route("**/v1/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/v1/operations/work-items") return route.fulfill({ json: { data: {
        taskLists: [{ id: "fixture-list", name: "Fixture list" }], departments: [], statuses: [{ key: "todo", label: "To do" }, { key: "done", label: "Done" }],
        workItems: [{ id: taskId, task: { id: taskId, title: "Synthetic task", status: "todo", priority: "normal" },
          hierarchy: { taskList: { id: "fixture-list", name: "Fixture list" } },
          clickUpStatusControl: { governedList: true, directActionsDisabled: true, providerStatus: "todo", providerStatusName: "To do",
            providerUpdatedAt: null, providerMismatch: false, providerErrorCode: null, intent: null, actor: null } }]
      } } });
      if (pathname === `/v1/product-engineering/tasks/${taskId}/reference-sites`) return route.fulfill({ json: { data: {
        reviewEnvironment: "isolated_test", items: []
      } } });
      return route.fulfill({ status: 403, json: { error: "fixture_route_denied" } });
    });
    await operationsPage.goto(`http://127.0.0.1:${server.address().port}/?entry=operations&view=tasks`);
    await operationsPage.getByRole("button", { name: /Synthetic task/ }).click();
    const studyButton = operationsPage.getByRole("button", { name: locale === "pl" ? "Badanie stron" : "Site study" });
    await operationsPage.locator('select[name="clickUpStatusRequest"]').selectOption("done");
    assert.equal(await studyButton.isDisabled(), true);
    await operationsPage.locator('select[name="clickUpStatusRequest"]').selectOption("todo");
    assert.equal(await studyButton.isDisabled(), false);
    await studyButton.click();
    await operationsPage.getByText(locale === "pl" ? "Nie skonfigurowano żadnej z dwóch dopuszczonych stron." : "Neither of the two permitted sites is configured.").waitFor();
    await operationsPage.close();
  }
  console.log(JSON.stringify({ locales: ["pl", "en"], checks: "operations-entry-create-review-package-findings" }));
} finally {
  await browser.close();
  server.close();
}
