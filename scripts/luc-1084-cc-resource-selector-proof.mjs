import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1084-cc-resource-selector-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const ownerToken = "luc-1084-proof-token";
const operationsPath = "/areas?area=04-operacje&view=tasks";
const assetsPath = "/areas?area=08-zasoby&view=files";

const requestLog = {
  authMeHeaders: [],
  departmentsHeaders: [],
  operationsHeaders: [],
  assetsHeaders: []
};

const departmentPacket = {
  departments: [
    {
      id: "dept-general",
      key: "00-ogolny",
      name: "00 General",
      description: "Company dashboard",
      href: "/areas?area=00-ogolny&view=overview",
      icon: "ph-squares-four",
      status: "active",
      views: [
        { id: "overview", label: "Company dashboard", href: "/areas?area=00-ogolny&view=overview", icon: "ph-layout" }
      ]
    },
    {
      id: "dept-operations",
      key: "04-operacje",
      name: "04 Operations",
      description: "Work execution",
      href: operationsPath,
      icon: "ph-kanban",
      status: "active",
      views: [
        { id: "tasks", label: "Tasks", href: operationsPath, icon: "ph-check-square" },
        { id: "calendar", label: "Calendar", href: "/areas?area=04-operacje&view=calendar", icon: "ph-calendar-blank" }
      ]
    },
    {
      id: "dept-assets",
      key: "08-zasoby",
      name: "08 Assets",
      description: "Knowledge and files",
      href: "/areas?area=08-zasoby&view=overview",
      icon: "ph-database",
      status: "active",
      views: [
        { id: "overview", label: "Assets dashboard", href: "/areas?area=08-zasoby&view=overview", icon: "ph-layout" },
        { id: "files", label: "Files and folders", href: assetsPath, icon: "ph-folder" }
      ]
    }
  ]
};

const operationsPacket = {
  summary: {
    openTasks: 3,
    activeLists: 3
  },
  departments: [
    { key: "04-operacje", backendAreaKey: "operations", position: 4, operatingArea: { id: "oa-operations", key: "operations", name: "Operations" } },
    { key: "08-zasoby", backendAreaKey: "assets", position: 8, operatingArea: { id: "oa-assets", key: "assets", name: "Assets" } }
  ],
  taskLists: [
    {
      id: "list-ops-alpha",
      name: "Alpha launch board",
      status: "active",
      source: "companycore",
      taskCount: 2,
      areaAssignment: {
        department: { key: "04-operacje", backendAreaKey: "operations", position: 4, operatingArea: { id: "oa-operations", key: "operations", name: "Operations" } },
        area: { id: "oa-operations", key: "operations", name: "Operations" }
      }
    },
    {
      id: "list-ops-beta",
      name: "Beta support queue",
      status: "active",
      source: "companycore",
      taskCount: 1,
      areaAssignment: {
        department: { key: "04-operacje", backendAreaKey: "operations", position: 4, operatingArea: { id: "oa-operations", key: "operations", name: "Operations" } },
        area: { id: "oa-operations", key: "operations", name: "Operations" }
      }
    },
    {
      id: "unassigned",
      name: "Inbox without list",
      status: "active",
      source: "companycore",
      taskCount: 1
    }
  ],
  statuses: [
    { key: "todo", label: "To do" },
    { key: "in_progress", label: "In progress" },
    { key: "done", label: "Done" }
  ],
  workItems: [
    {
      id: "work-1",
      task: { id: "task-1", title: "Prepare launch packet", status: "todo", priority: "high", dueDate: "2026-07-15T00:00:00.000Z", updatedAt: "2026-07-14T09:00:00.000Z" },
      hierarchy: { taskList: { id: "list-ops-alpha", name: "Alpha launch board", status: "active" } }
    },
    {
      id: "work-2",
      task: { id: "task-2", title: "Resolve customer callback", status: "in_progress", priority: "normal", dueDate: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-14T09:10:00.000Z" },
      hierarchy: { taskList: { id: "list-ops-beta", name: "Beta support queue", status: "active" } }
    }
  ],
  blockedActions: []
};

const assetsPacket = {
  summary: {
    totalResources: 4,
    sourceRoots: 2
  },
  resources: [
    {
      id: "root-ops",
      sourceId: "root-ops-source",
      name: "Operations Vault",
      type: "folder",
      resourceType: "folder",
      sourceModel: "GoogleDriveFile",
      source: { provider: "Google Drive", externalId: "root-ops", parentExternalId: null, isFolder: true },
      organization: { departmentCanonical: "04-operacje", knowledgeRoot: "Ops" }
    },
    {
      id: "root-assets",
      sourceId: "root-assets-source",
      name: "Brand Library",
      type: "folder",
      resourceType: "folder",
      sourceModel: "GoogleDriveFile",
      source: { provider: "Google Drive", externalId: "root-assets", parentExternalId: null, isFolder: true },
      organization: { departmentCanonical: "08-zasoby", knowledgeRoot: "Assets" }
    },
    {
      id: "asset-md",
      sourceId: "asset-md-source",
      name: "Launch brief.md",
      type: "markdown",
      resourceType: "file",
      sourceModel: "GoogleDriveFile",
      source: { provider: "Google Drive", externalId: "asset-md", parentExternalId: "root-ops", mimeType: "text/markdown", isFolder: false },
      organization: { departmentCanonical: "04-operacje" },
      aiCompatibility: {
        contentSnapshot: {
          id: "snapshot-md",
          contentKind: "markdown",
          previewText: "# Launch brief\n- Prepare routes\n- Verify proofs"
        }
      },
      freshness: { modifiedTime: "2026-07-14T08:00:00.000Z" }
    },
    {
      id: "asset-svg",
      sourceId: "asset-svg-source",
      name: "Brand mark.svg",
      type: "image",
      resourceType: "file",
      sourceModel: "GoogleDriveFile",
      source: { provider: "Google Drive", externalId: "asset-svg", parentExternalId: "root-assets", mimeType: "image/svg+xml", isFolder: false },
      organization: { departmentCanonical: "08-zasoby" },
      freshness: { modifiedTime: "2026-07-14T08:05:00.000Z" }
    }
  ],
  blockedActions: []
};

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "application/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".woff2") return "font/woff2";
  if (extension === ".woff") return "font/woff";
  return "application/octet-stream";
}

function jsonResponse(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(body)}\n`);
}

function recordHeader(list, request) {
  list.push(request.headers.authorization || null);
}

function assertWithinRoot(filePath, root) {
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    throw new Error(`Refusing to serve a path outside ${root}: ${filePath}`);
  }
}

async function serveStatic(response, filePath) {
  const buffer = await readFile(filePath);
  response.writeHead(200, { "Content-Type": contentType(filePath) });
  response.end(buffer);
}

async function createLocalServer() {
  const indexPath = path.join(reactRoot, "index.html");
  const indexHtml = await readFile(indexPath);

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");

      if (url.pathname === "/v1/auth/me") {
        recordHeader(requestLog.authMeHeaders, request);
        return jsonResponse(response, 200, {
          data: {
            authType: "user",
            userId: "owner-1",
            workspaceId: "workspace-1",
            workspaces: [{ id: "workspace-1", name: "LuckySparrow", role: "owner", active: true }]
          }
        });
      }

      if (url.pathname === "/v1/departments") {
        recordHeader(requestLog.departmentsHeaders, request);
        return jsonResponse(response, 200, { data: departmentPacket });
      }

      if (url.pathname === "/v1/operations/work-items") {
        recordHeader(requestLog.operationsHeaders, request);
        return jsonResponse(response, 200, { data: operationsPacket });
      }

      if (url.pathname === "/v1/assets/context") {
        recordHeader(requestLog.assetsHeaders, request);
        return jsonResponse(response, 200, { data: assetsPacket });
      }

      if (url.pathname.startsWith("/react/")) {
        const requested = path.join(reactRoot, url.pathname.replace(/^\/react\//, ""));
        assertWithinRoot(requested, reactRoot);
        return serveStatic(response, requested);
      }

      if (url.pathname.startsWith("/vendor/")) {
        const requested = path.join(vendorRoot, url.pathname.replace(/^\/vendor\//, ""));
        assertWithinRoot(requested, vendorRoot);
        return serveStatic(response, requested);
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(indexHtml);
    } catch (error) {
      jsonResponse(response, 500, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Local proof server did not expose a TCP port.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function runOperationsProof(page, baseUrl) {
  const selectorHeader = page.locator("[data-resource-selector]").first();
  const selector = selectorHeader.locator("xpath=ancestor::aside[1]");

  await page.goto(`${baseUrl}${operationsPath}`, { waitUntil: "domcontentloaded" });
  await selectorHeader.waitFor();
  const checkboxes = selector.locator('input[type="checkbox"]');
  await checkboxes.nth(1).waitFor();
  const initialCheckboxCount = await checkboxes.count();

  const search = selectorHeader.locator('input[type="search"]');
  await search.fill("beta");
  await page.waitForTimeout(150);
  const filteredCheckboxCount = await checkboxes.count();

  const filteredScreenshotPath = path.join(evidenceRoot, "operations-selector-filtered.png");
  await page.screenshot({ path: filteredScreenshotPath, fullPage: true });

  await search.fill("zzz");
  await selector.getByText("No matching lists", { exact: true }).waitFor();
  const emptyCheckboxCount = await checkboxes.count();
  const emptyScreenshotPath = path.join(evidenceRoot, "operations-selector-empty.png");
  await page.screenshot({ path: emptyScreenshotPath, fullPage: true });

  return {
    filteredScreenshotPath,
    emptyScreenshotPath,
    noHorizontalOverflow: await noHorizontalOverflow(page),
    initialCheckboxCount,
    filteredCheckboxCount,
    emptyCheckboxCount,
    searchReducedVisibleItems: filteredCheckboxCount < initialCheckboxCount,
    emptyStateVisible: true
  };
}

async function runAssetsProof(page, baseUrl) {
  const selectorHeader = page.locator("[data-resource-selector]").first();
  const selector = selectorHeader.locator("xpath=ancestor::aside[1]");

  await page.goto(`${baseUrl}${assetsPath}`, { waitUntil: "domcontentloaded" });
  await selectorHeader.waitFor();
  const checkboxes = selector.locator('input[type="checkbox"]');
  await checkboxes.nth(1).waitFor();
  const initialCheckboxCount = await checkboxes.count();

  const search = selectorHeader.locator('input[type="search"]');
  await search.fill("brand");
  await page.waitForTimeout(150);
  const filteredCheckboxCount = await checkboxes.count();

  const filteredScreenshotPath = path.join(evidenceRoot, "assets-selector-filtered.png");
  await page.screenshot({ path: filteredScreenshotPath, fullPage: true });

  await search.fill("zzz");
  await selector.getByText("No matching folders", { exact: true }).waitFor();
  const emptyCheckboxCount = await checkboxes.count();
  const emptyScreenshotPath = path.join(evidenceRoot, "assets-selector-empty.png");
  await page.screenshot({ path: emptyScreenshotPath, fullPage: true });

  return {
    filteredScreenshotPath,
    emptyScreenshotPath,
    noHorizontalOverflow: await noHorizontalOverflow(page),
    initialCheckboxCount,
    filteredCheckboxCount,
    emptyCheckboxCount,
    searchReducedVisibleItems: filteredCheckboxCount < initialCheckboxCount,
    emptyStateVisible: true
  };
}

async function run() {
  await mkdir(evidenceRoot, { recursive: true });

  const { server, baseUrl } = await createLocalServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1024 }
    });

    await context.addInitScript((token) => {
      window.sessionStorage.setItem("companycoreOwnerToken", token);
    }, ownerToken);

    const page = await context.newPage();
    const consoleIssues = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleIssues.push({ type: message.type(), text: message.text() });
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const operations = await runOperationsProof(page, baseUrl);
    const assets = await runAssetsProof(page, baseUrl);

    const report = {
      issue: "LUC-1084",
      status: "passed",
      generatedAt: new Date().toISOString(),
      baseUrl,
      requestCounts: {
        authMe: requestLog.authMeHeaders.length,
        departments: requestLog.departmentsHeaders.length,
        operations: requestLog.operationsHeaders.length,
        assets: requestLog.assetsHeaders.length
      },
      authHeaders: requestLog,
      operations,
      assets,
      assertions: {
        authMeUsedBearerToken: requestLog.authMeHeaders.every((value) => value === `Bearer ${ownerToken}`),
        departmentsUsedBearerToken: requestLog.departmentsHeaders.every((value) => value === `Bearer ${ownerToken}`),
        operationsUsedBearerToken: requestLog.operationsHeaders.every((value) => value === `Bearer ${ownerToken}`),
        assetsUsedBearerToken: requestLog.assetsHeaders.every((value) => value === `Bearer ${ownerToken}`),
        selectorSearchFiltersOperations: operations.searchReducedVisibleItems,
        selectorSearchFiltersAssets: assets.searchReducedVisibleItems,
        selectorEmptyStateVisible: operations.emptyStateVisible && assets.emptyStateVisible,
        noHorizontalOverflow: operations.noHorizontalOverflow && assets.noHorizontalOverflow,
        runtimeErrors: consoleIssues.length === 0 && pageErrors.length === 0
      },
      consoleIssues,
      pageErrors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await context.close();
    console.log(`LUC-1084 proof report written to ${reportPath}`);
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

await run();
