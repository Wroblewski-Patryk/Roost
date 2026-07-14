import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-998-dashboard-public-home-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const canonicalDashboardPath = "/areas?area=00-ogolny&view=overview";
const ownerToken = "proof-token";

const viewports = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "mobile", width: 390, height: 844 }
];

const requestLog = {
  authMeHeaders: [],
  departmentsHeaders: [],
  dashboardCommandHeaders: []
};

const dashboardPacket = {
  generatedAt: "2026-07-14T09:30:00.000Z",
  summary: {
    activeSignals: 7,
    nextActions: 3,
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
      title: "Local proof dashboard repair",
      source: "frontend",
      severity: "high",
      status: "active",
      updatedAt: "2026-07-14T09:10:00.000Z"
    },
    {
      id: "priority-2",
      title: "Route evidence packet pending writeback",
      source: "qa",
      severity: "medium",
      status: "watch",
      updatedAt: "2026-07-14T09:12:00.000Z"
    }
  ],
  nextActions: [
    {
      key: "next-1",
      label: "Review dashboard proof packet",
      target: "/areas?area=04-operacje&view=tasks",
      count: 2,
      priority: "high"
    },
    {
      key: "next-2",
      label: "Check route proposal queue",
      target: canonicalDashboardPath,
      count: 1,
      priority: "normal"
    }
  ],
  latestRouteProposals: [
    {
      id: "route-1",
      title: "Proof packet for public home",
      status: "review",
      targetDepartmentKey: "09-technologia",
      riskLevel: "low"
    },
    {
      id: "route-2",
      title: "Proof packet for dashboard overview",
      status: "accepted",
      targetDepartmentKey: "04-operacje",
      riskLevel: "medium"
    }
  ],
  blockedActions: [
    {
      action: "Push to production",
      reason: "Route proof stays local in this lane."
    }
  ]
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
        { id: "overview", label: "Company dashboard", href: canonicalDashboardPath, icon: "ph-layout" },
        { id: "routing", label: "Routing proposals", href: `${canonicalDashboardPath.replace("overview", "routing")}`, icon: "ph-signpost" }
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
        { id: "files", label: "Files and folders", href: "/areas?area=08-zasoby&view=files", icon: "ph-folder" }
      ]
    }
  ]
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

function jsonResponse(response, body) {
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
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
        return jsonResponse(response, {
          data: {
            authType: "user",
            userId: "owner-1",
            workspaceId: "workspace-1",
            workspaces: [
              {
                id: "workspace-1",
                name: "LuckySparrow",
                role: "owner",
                active: true
              }
            ]
          }
        });
      }

      if (url.pathname === "/v1/departments") {
        recordHeader(requestLog.departmentsHeaders, request);
        return jsonResponse(response, { data: departmentPacket });
      }

      if (url.pathname === "/v1/dashboard/command") {
        recordHeader(requestLog.dashboardCommandHeaders, request);
        return jsonResponse(response, { data: dashboardPacket });
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
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
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

async function screenshot(page, outputPath) {
  await page.screenshot({ path: outputPath, fullPage: true });
  return outputPath;
}

async function run() {
  await mkdir(evidenceRoot, { recursive: true });

  const { server, baseUrl } = await createLocalServer();
  let browser;
  const errors = [];
  const surfaces = [];

  try {
    browser = await chromium.launch({ headless: true });

    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: {
          width: viewport.width,
          height: viewport.height
        }
      });

      await context.addInitScript((token) => {
        window.sessionStorage.setItem("companycoreOwnerToken", token);
      }, ownerToken);

      const page = await context.newPage();
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          errors.push({ surface: viewport.name, type: message.type(), text: message.text() });
        }
      });
      page.on("pageerror", (error) => {
        errors.push({ surface: viewport.name, type: "pageerror", text: error.message });
      });

      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.getByRole("heading", { name: "Roost" }).waitFor();
      await page.getByRole("heading", { name: "Operational center for your company" }).waitFor();
      const publicOverflow = await noHorizontalOverflow(page);
      const publicPath = path.join(evidenceRoot, `${viewport.name}-public-home.png`);
      await screenshot(page, publicPath);
      surfaces.push({
        name: `${viewport.name}-public-home`,
        route: "/",
        finalUrl: new URL(page.url()).pathname + new URL(page.url()).search,
        screenshotPath: publicPath,
        overflow: publicOverflow,
        assertions: {
          heroTitle: await page.getByText("Operational center", { exact: false }).count().then((count) => count > 0),
          enterRoostCta: await page.getByRole("link", { name: "Enter Roost" }).count().then((count) => count > 0),
          footerLanguageSelector: await page.getByLabel("Language").count().then((count) => count > 0)
        }
      });

      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.getByRole("heading", { name: "What needs attention now" }).waitFor();
      const dashboardOverflow = await noHorizontalOverflow(page);
      const dashboardPath = path.join(evidenceRoot, `${viewport.name}-dashboard-overview.png`);
      await screenshot(page, dashboardPath);
      surfaces.push({
        name: `${viewport.name}-dashboard-overview`,
        route: "/dashboard",
        finalUrl: new URL(page.url()).pathname + new URL(page.url()).search,
        screenshotPath: dashboardPath,
        overflow: dashboardOverflow,
        assertions: {
          canonicalDashboardRedirect: new URL(page.url()).pathname + new URL(page.url()).search === canonicalDashboardPath,
          commandPacketVisible: await page.getByText("Command packet", { exact: true }).count().then((count) => count > 0),
          priorityPanelVisible: await page.getByRole("heading", { name: "What needs attention now" }).count().then((count) => count > 0),
          nextActionsVisible: await page.getByRole("heading", { name: "Next actions" }).count().then((count) => count > 0),
          mockedPriorityItemVisible: await page.getByText("Local proof dashboard repair", { exact: true }).count().then((count) => count > 0),
          mockedRouteProposalVisible: await page.getByText("Proof packet for dashboard overview", { exact: true }).count().then((count) => count > 0)
        }
      });

      await context.close();
    }
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl,
    requestCounts: {
      authMe: requestLog.authMeHeaders.length,
      departments: requestLog.departmentsHeaders.length,
      dashboardCommand: requestLog.dashboardCommandHeaders.length
    },
    authHeaders: requestLog,
    surfaces,
    assertions: {
      publicHomeDidNotCallDashboardCommand: requestLog.dashboardCommandHeaders.length === viewports.length,
      dashboardRequestsUsedBearerToken: requestLog.dashboardCommandHeaders.every((value) => value === `Bearer ${ownerToken}`)
        && requestLog.authMeHeaders.every((value) => value === `Bearer ${ownerToken}`)
        && requestLog.departmentsHeaders.every((value) => value === `Bearer ${ownerToken}`),
      allSurfacesNoHorizontalOverflow: surfaces.every((surface) => surface.overflow === true),
      runtimeErrors: errors.length === 0,
      canonicalDashboardRedirect: surfaces
        .filter((surface) => surface.route === "/dashboard")
        .every((surface) => surface.finalUrl === canonicalDashboardPath)
    },
    errors
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`LUC-998 proof report written to ${reportPath}`);
}

await run();
