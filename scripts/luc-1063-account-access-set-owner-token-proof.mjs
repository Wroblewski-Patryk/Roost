import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1063-set-owner-token-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const loginToken = "login-proof-token";
const initialWorkspaceToken = "workspace-initial-token";
const switchedWorkspaceToken = "workspace-switched-token";
const canonicalDashboardPath = "/areas?area=00-ogolny&view=overview";

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
    }
  ]
};

function dashboardPacket(label) {
  return {
    generatedAt: "2026-07-14T13:30:00.000Z",
    summary: {
      activeSignals: 1,
      nextActions: 1,
      routeProposals: 0
    },
    departmentSignals: [
      { key: "00-ogolny", label: "00 General", health: "ready", count: 1, href: canonicalDashboardPath }
    ],
    priorityItems: [
      {
        id: `priority-${label}`,
        title: `Prove setOwnerToken ${label}`,
        source: "qa",
        severity: "high",
        status: "active",
        updatedAt: "2026-07-14T13:29:00.000Z"
      }
    ],
    nextActions: [
      {
        key: `next-${label}`,
        label: `Review ${label}`,
        target: canonicalDashboardPath,
        count: 1,
        priority: "high"
      }
    ],
    latestRouteProposals: [],
    blockedActions: [
      {
        action: "Push to production",
        reason: "This proof is local-only."
      }
    ]
  };
}

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

function jsonResponse(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(body)}\n`);
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

function activeWorkspaceForHeader(authorization) {
  if (authorization === `Bearer ${switchedWorkspaceToken}`) {
    return "workspace-2";
  }
  return "workspace-1";
}

function workspacesForHeader(authorization) {
  const activeWorkspaceId = activeWorkspaceForHeader(authorization);
  return [
    {
      id: "workspace-1",
      name: "LuckySparrow Alpha",
      role: "owner",
      active: activeWorkspaceId === "workspace-1"
    },
    {
      id: "workspace-2",
      name: "LuckySparrow Beta",
      role: "owner",
      active: activeWorkspaceId === "workspace-2"
    }
  ];
}

async function createLocalServer(requestLog) {
  const indexPath = path.join(reactRoot, "index.html");
  const indexHtml = await readFile(indexPath);

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const authorization = request.headers.authorization || null;

      if (url.pathname === "/v1/auth/login") {
        requestLog.loginBodies.push(await readRequestBody(request));
        return jsonResponse(response, 200, {
          data: {
            token: loginToken
          }
        });
      }

      if (url.pathname === "/v1/auth/me") {
        requestLog.authMeHeaders.push(authorization);
        return jsonResponse(response, 200, {
          data: {
            authType: "user",
            userId: "owner-1",
            workspaceId: activeWorkspaceForHeader(authorization),
            workspaces: workspacesForHeader(authorization)
          }
        });
      }

      if (url.pathname === "/v1/departments") {
        requestLog.departmentsHeaders.push(authorization);
        return jsonResponse(response, 200, { data: departmentPacket });
      }

      if (url.pathname === "/v1/dashboard/command") {
        requestLog.dashboardHeaders.push(authorization);
        const activeWorkspaceId = activeWorkspaceForHeader(authorization);
        return jsonResponse(response, 200, { data: dashboardPacket(activeWorkspaceId) });
      }

      if (url.pathname === "/v1/workspaces/workspace-2/actions/select") {
        requestLog.workspaceSelectHeaders.push(authorization);
        return jsonResponse(response, 200, {
          data: {
            token: switchedWorkspaceToken
          }
        });
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

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function screenshot(page, outputPath) {
  await page.screenshot({ path: outputPath, fullPage: true });
  return outputPath;
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function waitForCondition(predicate, timeoutMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function recordPageErrors(page, scenario, errors) {
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      errors.push({ scenario, type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ scenario, type: "pageerror", text: error.message });
  });
}

async function runLoginScenario(browser, baseUrl, requestLog, errors) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 }
  });
  await context.addInitScript((pendingPath) => {
    window.sessionStorage.setItem("companycorePendingPrivatePath", pendingPath);
  }, canonicalDashboardPath);
  const page = await context.newPage();
  recordPageErrors(page, "login", errors);

  await page.goto(`${baseUrl}${canonicalDashboardPath}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sign in" }).waitFor();
  await page.locator('input[name="email"]').fill("owner@example.test");
  await page.locator('input[name="password"]').fill("secret-proof-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: "What needs attention now" }).waitFor();

  const storedToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
  const pendingPrivatePath = await page.evaluate(() => window.sessionStorage.getItem("companycorePendingPrivatePath"));
  const pathname = await page.evaluate(() => window.location.pathname + window.location.search);
  const overflow = await noHorizontalOverflow(page);
  const screenshotPath = path.join(evidenceRoot, "desktop-login-set-owner-token.png");
  await screenshot(page, screenshotPath);
  await context.close();

  return {
    storedTokenMatches: storedToken === loginToken,
    canonicalPrivateRouteRendered: pathname === canonicalDashboardPath,
    pendingPrivatePathPreserved: pendingPrivatePath === canonicalDashboardPath,
    loginReturnedSingleToken: requestLog.loginBodies.length === 1,
    authMeUsedStoredBearerAuth: requestLog.authMeHeaders.some((value) => value === `Bearer ${loginToken}`),
    departmentsUsedStoredBearerAuth: requestLog.departmentsHeaders.some((value) => value === `Bearer ${loginToken}`),
    dashboardUsedStoredBearerAuth: requestLog.dashboardHeaders.some((value) => value === `Bearer ${loginToken}`),
    noHorizontalOverflow: overflow,
    screenshotPath
  };
}

async function runWorkspaceSelectionScenario(browser, baseUrl, requestLog, errors) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 }
  });
  await context.addInitScript((token) => {
    if (!window.sessionStorage.getItem("companycoreOwnerToken")) {
      window.sessionStorage.setItem("companycoreOwnerToken", token);
    }
  }, initialWorkspaceToken);
  const page = await context.newPage();
  recordPageErrors(page, "workspace-select", errors);

  await page.goto(`${baseUrl}${canonicalDashboardPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: "What needs attention now" }).waitFor();
  await page.locator('select[aria-label="Company / workspace"]').first().waitFor();

  const countsBeforeSelect = {
    authMe: requestLog.authMeHeaders.length,
    departments: requestLog.departmentsHeaders.length,
    dashboard: requestLog.dashboardHeaders.length,
    workspaceSelect: requestLog.workspaceSelectHeaders.length
  };

  await page.locator('select[aria-label="Company / workspace"]').first().selectOption("workspace-2");
  try {
    await waitForCondition(() => {
      return requestLog.workspaceSelectHeaders.length > countsBeforeSelect.workspaceSelect
        && requestLog.authMeHeaders.slice(countsBeforeSelect.authMe).some((value) => value === `Bearer ${switchedWorkspaceToken}`)
        && requestLog.dashboardHeaders.slice(countsBeforeSelect.dashboard).some((value) => value === `Bearer ${switchedWorkspaceToken}`);
    }, 30000, "workspace selection token rewrite and reload");
  } catch (error) {
    const observedToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
    const observedWorkspace = await page.locator('select[aria-label="Company / workspace"]').first().inputValue();
    throw new Error([
      error instanceof Error ? error.message : String(error),
      `observedToken=${observedToken}`,
      `observedWorkspace=${observedWorkspace}`,
      `workspaceSelectHeaders=${JSON.stringify(requestLog.workspaceSelectHeaders)}`,
      `authMeAfterSelect=${JSON.stringify(requestLog.authMeHeaders.slice(countsBeforeSelect.authMe))}`,
      `dashboardAfterSelect=${JSON.stringify(requestLog.dashboardHeaders.slice(countsBeforeSelect.dashboard))}`
    ].join(" | "));
  }
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: "What needs attention now" }).waitFor();

  const storedToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
  const activeWorkspace = await page.locator('select[aria-label="Company / workspace"]').inputValue();
  const pathname = await page.evaluate(() => window.location.pathname + window.location.search);
  const overflow = await noHorizontalOverflow(page);
  const screenshotPath = path.join(evidenceRoot, "desktop-workspace-select-set-owner-token.png");
  await screenshot(page, screenshotPath);
  await context.close();

  const authMeAfterSelect = requestLog.authMeHeaders.slice(countsBeforeSelect.authMe);
  const departmentsAfterSelect = requestLog.departmentsHeaders.slice(countsBeforeSelect.departments);
  const dashboardAfterSelect = requestLog.dashboardHeaders.slice(countsBeforeSelect.dashboard);
  const workspaceSelectHeaders = requestLog.workspaceSelectHeaders.slice(countsBeforeSelect.workspaceSelect);

  return {
    initialSessionTokenWasSeeded: true,
    storedTokenMatchesNewWorkspaceToken: storedToken === switchedWorkspaceToken,
    activeWorkspaceSwitched: activeWorkspace === "workspace-2",
    canonicalDashboardRendered: pathname === canonicalDashboardPath,
    workspaceSelectUsedCurrentBearerAuth: workspaceSelectHeaders.some((value) => value === `Bearer ${initialWorkspaceToken}`),
    authMeReloadUsedNewBearerAuth: authMeAfterSelect.some((value) => value === `Bearer ${switchedWorkspaceToken}`),
    departmentsReloadUsedNewBearerAuth: departmentsAfterSelect.some((value) => value === `Bearer ${switchedWorkspaceToken}`),
    dashboardReloadUsedNewBearerAuth: dashboardAfterSelect.some((value) => value === `Bearer ${switchedWorkspaceToken}`),
    noHorizontalOverflow: overflow,
    screenshotPath
  };
}

async function run() {
  await mkdir(evidenceRoot, { recursive: true });
  const requestLog = {
    loginBodies: [],
    authMeHeaders: [],
    departmentsHeaders: [],
    dashboardHeaders: [],
    workspaceSelectHeaders: []
  };
  const { server, baseUrl } = await createLocalServer(requestLog);
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    const login = await runLoginScenario(browser, baseUrl, requestLog, errors);
    const workspaceSelection = await runWorkspaceSelectionScenario(browser, baseUrl, requestLog, errors);

    const report = {
      timestamp: new Date().toISOString(),
      baseUrl,
      route: canonicalDashboardPath,
      assertions: {
        login,
        workspaceSelection
      },
      requestLog,
      errors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`LUC-1063 proof report written to ${reportPath}`);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

await run();
