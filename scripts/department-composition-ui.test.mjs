import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";

const root = path.resolve("public");
const output = path.join(os.tmpdir(), "roost-g16b-ui");
await mkdir(output, { recursive: true });
const index = await readFile(path.join(root, "react", "index.html"));
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const requestPath = new URL(req.url || "/", "http://local.test").pathname;
  if (!requestPath.startsWith("/react/") && !requestPath.startsWith("/vendor/") && !requestPath.startsWith("/assets/")) {
    res.setHeader("Content-Type", "text/html");
    res.end(index);
    return;
  }
  const file = path.resolve(root, "." + requestPath);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

function fixture() {
  const id = "00000000-0000-4000-8000-000000000009";
  const canonical = { id: "technology.overview", label: "Technology overview", icon: "ph-gauge", sourceDepartmentKey: "09-technologia", routeView: "overview", enabled: true, href: "/areas?area=09-technologia&view=overview" };
  const shared = { id: "strategy.goals", label: "All company goals", icon: "ph-target", sourceDepartmentKey: "01-strategia", routeView: "goals", enabled: true, configurableShared: true, href: "/areas?area=09-technologia&view=goals" };
  const generalView = { id: "general.overview", label: "Company dashboard", icon: "ph-gauge", sourceDepartmentKey: "00-ogolny", routeView: "overview", enabled: true, href: "/areas?area=00-ogolny&view=overview" };
  const general = {
    id: "00000000-0000-4000-8000-000000000000", key: "00-ogolny", name: "00 General", description: "Company projection",
    icon: "ph-gauge", position: 0, isSystem: true, status: "active", compositionVersion: 1,
    linkedViews: [generalView.id, shared.id], views: [generalView, { ...shared, href: "/areas?area=00-ogolny&view=goals" }],
    href: generalView.href, updatedAt: "2026-10-11T00:00:00.000Z"
  };
  const department = {
    id, key: "09-technologia", name: "09 Technology", description: "Technical work", icon: "ph-cpu",
    position: 9, isSystem: true, status: "active", compositionVersion: 1,
    linkedViews: [canonical.id, shared.id], views: [canonical, shared],
    href: canonical.href, updatedAt: "2026-10-11T00:00:00.000Z"
  };
  let applyCount = 0;
  let previewCount = 0;
  let catalogReads = 0;
  const projectRequests = [];
  const packet = () => ({ departments: [general, department], availableViews: [generalView, canonical, shared] });
  return {
    department,
    packet,
    stats: () => ({ applyCount, previewCount, catalogReads, projectRequests }),
    async respond(route) {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (url.pathname === "/v1/auth/me") return route.fulfill({ json: { data: { authType: "user", workspaceId: "00000000-0000-4000-8000-999999999999", user: { email: "owner@example.test", name: "Synthetic Owner" }, workspaces: [{ id: "00000000-0000-4000-8000-999999999999", name: "Fixture", role: "owner", active: true }] } } });
      if (url.pathname === "/v1/departments" && method === "GET") { catalogReads++; return route.fulfill({ json: { data: packet() } }); }
      if (url.pathname === "/v1/company-intelligence/health") return route.fulfill({ json: { data: { score: 100, status: "clear", signals: {} } } });
      if (url.pathname === `/v1/departments/${id}/preview` && method === "POST") {
        previewCount++;
        const body = JSON.parse(route.request().postData() || "{}");
        assert.deepEqual(body.linkedViews, [canonical.id]);
        return route.fulfill({ json: { data: {
          department: { id, key: department.key, version: department.compositionVersion },
          before: { name: department.name, description: department.description, icon: department.icon, position: department.position, linkedViews: department.linkedViews },
          after: body, attachedViews: [], detachedViews: [shared.id],
          navigationBefore: [{ viewKey: canonical.id, href: canonical.href }, { viewKey: shared.id, href: shared.href }],
          navigationAfter: [{ viewKey: canonical.id, href: canonical.href }],
          existingRelations: [{ id: "r1", entityType: "task", entityId: "task-1", role: "owner" }],
          existingOwnerships: [], existingWorkforce: [], existingProviderMappings: [],
          preserved: { organizationalRelations: 1, accountableRelations: 1, entityOwnerships: 0, workforce: 0, providerMappings: 0, recordIdentityAndHistory: true, oldLinks: true, permissionsAndTaskScopes: true },
          changesProviderData: false, changesResponsibility: false,
          expiresAt: "2026-10-11T23:00:00.000Z", confirmationToken: "fixture-preview"
        } } });
      }
      if (url.pathname === `/v1/departments/${id}/actions/apply` && method === "POST") {
        assert.equal(JSON.parse(route.request().postData() || "{}").confirmationToken, "fixture-preview");
        applyCount++;
        department.compositionVersion++;
        department.linkedViews = [canonical.id];
        department.views = [canonical];
        return route.fulfill({ json: { data: { id, compositionVersion: department.compositionVersion, linkedViews: department.linkedViews } } });
      }
      if (url.pathname === "/v1/goals") {
        const goals = [
          { id: "goal-strategy", title: "Goal in Strategy", status: "active", priority: "normal", organizationalContext: { ownerDepartment: { key: "01-strategia" } } },
          { id: "goal-technology", title: "Goal in Technology", status: "active", priority: "normal", organizationalContext: { ownerDepartment: { key: "09-technologia" } } }
        ];
        return route.fulfill({ json: { data: url.searchParams.has("departmentKey") ? goals.filter((item) => item.organizationalContext.ownerDepartment.key === url.searchParams.get("departmentKey")) : goals } });
      }
      if (url.pathname === "/v1/projects") {
        projectRequests.push(url.search);
        const projects = [
          { id: "project-strategy", name: "Project in Strategy", status: "active", updatedAt: "2026-10-11T00:00:00.000Z", organizationalContext: { ownerDepartment: { key: "01-strategia" } } },
          { id: "project-technology", name: "Project in Technology", status: "active", updatedAt: "2026-10-11T00:00:00.000Z", organizationalContext: { ownerDepartment: { key: "09-technologia" } } }
        ];
        return route.fulfill({ json: { data: url.searchParams.has("departmentKey") ? projects.filter((item) => item.organizationalContext.ownerDepartment.key === url.searchParams.get("departmentKey")) : projects } });
      }
      return route.fulfill({ json: { data: [] } });
    }
  };
}

let checked = 0;
try {
  for (const locale of ["pl", "en"]) for (const width of [390, 1440]) {
    const f = fixture();
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript((language) => {
      sessionStorage.setItem("companycoreOwnerToken", "fixture-session");
      localStorage.setItem("companycoreLocale", language);
    }, locale);
    await page.route("**/v1/**", (route) => f.respond(route));
    await page.goto(`${base}/areas?area=09-technologia&view=goals`);
    if (width < 1024) await page.locator("button.roost-mobile-menu").click();
    await page.getByRole("navigation", { name: locale === "pl" ? "Działy" : "Departments" }).waitFor();
    await page.waitForFunction(() => new URLSearchParams(location.search).get("department") === "09-technologia");
    assert.equal(new URL(page.url()).searchParams.get("area"), "09-technologia");
    assert.equal(await page.locator('a[href*="area=09-technologia"][aria-current="page"]').count() > 0, true);
    if (width < 1024) await page.keyboard.press("Escape");
    await page.goto(`${base}/areas?area=00-ogolny&view=goals&department=00-ogolny`);
    await page.locator("strong:visible").filter({ hasText: "Goal in Strategy" }).first().waitFor();
    await page.locator("strong:visible").filter({ hasText: "Goal in Technology" }).first().waitFor();
    assert.equal(new URL(page.url()).searchParams.has("department"), false);
    assert.equal(await page.locator('nav.roost-sidebar-navigation a[href*="area=00-ogolny"][href*="view=goals"]').count(), 0);
    await page.goto(`${base}/areas?area=00-ogolny&view=projects&department=00-ogolny`);
    await page.locator("strong:visible").filter({ hasText: "Project in Strategy" }).first().waitFor();
    await page.locator("strong:visible").filter({ hasText: "Project in Technology" }).first().waitFor();
    assert.equal(new URL(page.url()).searchParams.has("department"), false);
    assert.equal(f.stats().projectRequests.every((search) => !new URLSearchParams(search).has("departmentKey")), true);
    await page.goto(`${base}/areas?area=12-zarzadzanie&view=departments`);
    await page.getByRole("button", { name: locale === "pl" ? "Edytuj" : "Edit" }).last().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("checkbox", { name: "All company goals" }).uncheck();
    await dialog.getByRole("button", { name: locale === "pl" ? "Pokaż skutki" : "Preview impact" }).click();
    await dialog.getByText(locale === "pl" ? "Obecna nawigacja" : "Current navigation").waitFor();
    assert.equal(f.stats().applyCount, 0);
    await page.screenshot({ path: path.join(output, `${locale}-preview-${width}.png`), fullPage: true });
    await dialog.getByRole("button", { name: locale === "pl" ? "Potwierdź zmianę" : "Confirm change" }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual([f.stats().previewCount, f.stats().applyCount], [1, 1]);
    await page.waitForTimeout(50);
    assert.equal(await page.locator('nav.roost-sidebar-navigation a[href*="view=goals"]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.close();
    checked++;
  }
  console.log(`G16b UI: ${checked} PL/EN narrow/wide preview-confirm-readback cases, contextual route and sidebar refresh passed.`);
} finally {
  await browser.close();
  server.close();
}
