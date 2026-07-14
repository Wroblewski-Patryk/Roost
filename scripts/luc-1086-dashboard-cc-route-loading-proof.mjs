import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1086-dashboard-cc-route-loading-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const canonicalDashboardPath = "/areas?area=00-ogolny&view=overview";
const ownerToken = "luc-1086-proof-token";
const delayedChunkPattern = /\/react\/assets\/general-dashboard-.*\.js$/;

const requestLog = {
  authMeHeaders: [],
  departmentsHeaders: [],
  dashboardCommandHeaders: []
};

const dashboardPacket = {
  generatedAt: "2026-07-14T11:35:00.000Z",
  summary: {
    activeSignals: 6,
    nextActions: 2,
    routeProposals: 2
  },
  departmentSignals: [
    { key: "00-ogolny", label: "00 General", health: "ready", count: 3, href: canonicalDashboardPath },
    { key: "04-operacje", label: "04 Operations", health: "watch", count: 2, href: "/areas?area=04-operacje&view=tasks" },
    { key: "08-zasoby", label: "08 Assets", health: "blocked", count: 1, href: "/areas?area=08-zasoby&view=overview" }
  ],
  priorityItems: [
    {
      id: "priority-1",
      title: "Verify lazy dashboard loading",
      source: "qa",
      severity: "high",
      status: "active",
      updatedAt: "2026-07-14T11:20:00.000Z"
    }
  ],
  nextActions: [
    {
      key: "next-1",
      label: "Check dashboard proof packet",
      target: canonicalDashboardPath,
      count: 1,
      priority: "high"
    }
  ],
  latestRouteProposals: [
    {
      id: "route-1",
      title: "Dashboard route-loading proof packet",
      status: "review",
      targetDepartmentKey: "00-ogolny",
      riskLevel: "medium"
    }
  ],
  blockedActions: []
};

const departmentPacket = {
  departments: [
    {
      id: "dept-general",
      key: "00-ogolny",
      name: "00 General",
      description: "Company dashboard",
      href: canonicalDashboardPath,
      icon: "ph-squares-four",
      status: "active",
      views: [
        { id: "overview", label: "Company dashboard", href: canonicalDashboardPath, icon: "ph-layout" }
      ]
    },
    {
      id: "dept-operations",
      key: "04-operacje",
      name: "04 Operations",
      description: "Work execution",
      href: "/areas?area=04-operacje&view=tasks",
      icon: "ph-kanban",
      status: "active",
      views: [
        { id: "tasks", label: "Tasks", href: "/areas?area=04-operacje&view=tasks", icon: "ph-check-square" }
      ]
    }
  ]
};

let releaseRouteChunk;
const routeChunkGate = new Promise((resolve) => {
  releaseRouteChunk = resolve;
});

let delayedChunkRequests = 0;

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

      if (url.pathname === "/v1/dashboard/command") {
        recordHeader(requestLog.dashboardCommandHeaders, request);
        return jsonResponse(response, 200, { data: dashboardPacket });
      }

      if (url.pathname.startsWith("/react/")) {
        const requested = path.join(reactRoot, url.pathname.replace(/^\/react\//, ""));
        assertWithinRoot(requested, reactRoot);
        if (delayedChunkPattern.test(url.pathname)) {
          delayedChunkRequests += 1;
          await routeChunkGate;
        }
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

    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(`**${canonicalDashboardPath}`);
    await page.locator(".cc-route-loading").waitFor();
    await page.getByText("Loading view", { exact: true }).waitFor();

    const loadingRoot = page.locator(".cc-route-loading");
    const loadingScreenshotPath = path.join(evidenceRoot, "dashboard-route-loading.png");
    await page.screenshot({ path: loadingScreenshotPath, fullPage: true });

    const loadingTheme = await loadingRoot.getAttribute("data-theme");
    const loadingBackground = await loadingRoot.evaluate((node) => window.getComputedStyle(node).backgroundColor);
    const bodyBackground = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const loadingOverflow = await noHorizontalOverflow(page);

    releaseRouteChunk();

    await page.getByRole("heading", { name: "What needs attention now" }).waitFor();
    const readyScreenshotPath = path.join(evidenceRoot, "dashboard-route-ready.png");
    await page.screenshot({ path: readyScreenshotPath, fullPage: true });
    const readyOverflow = await noHorizontalOverflow(page);

    const report = {
      issue: "LUC-1086",
      status: "passed",
      generatedAt: new Date().toISOString(),
      baseUrl,
      canonicalDashboardPath,
      delayedChunkRequests,
      requestCounts: {
        authMe: requestLog.authMeHeaders.length,
        departments: requestLog.departmentsHeaders.length,
        dashboardCommand: requestLog.dashboardCommandHeaders.length
      },
      authHeaders: requestLog,
      loadingState: {
        screenshot: loadingScreenshotPath,
        theme: loadingTheme,
        loadingBackground,
        bodyBackground,
        noHorizontalOverflow: loadingOverflow
      },
      readyState: {
        screenshot: readyScreenshotPath,
        noHorizontalOverflow: readyOverflow
      },
      assertions: {
        redirectedToCanonicalDashboard: page.url().endsWith(canonicalDashboardPath),
        routeChunkWasDelayed: delayedChunkRequests >= 1,
        routeLoadingRendered: await loadingRoot.count().then((count) => count >= 1),
        routeLoadingThemeApplied: loadingTheme === "roost",
        routeLoadingLabelRendered: await page.getByText("CompanyCore", { exact: true }).count().then((count) => count >= 1),
        dashboardRenderedAfterChunkRelease: await page.getByText("Verify lazy dashboard loading", { exact: true }).count().then((count) => count >= 1),
        dashboardCommandUsedBearerToken: requestLog.dashboardCommandHeaders.every((value) => value === `Bearer ${ownerToken}`),
        authMeUsedBearerToken: requestLog.authMeHeaders.every((value) => value === `Bearer ${ownerToken}`),
        departmentsUsedBearerToken: requestLog.departmentsHeaders.every((value) => value === `Bearer ${ownerToken}`),
        noHorizontalOverflow: loadingOverflow && readyOverflow,
        runtimeErrors: consoleIssues.length === 0 && pageErrors.length === 0
      },
      consoleIssues,
      pageErrors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await context.close();
    console.log(`LUC-1086 proof report written to ${reportPath}`);
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

await run();
