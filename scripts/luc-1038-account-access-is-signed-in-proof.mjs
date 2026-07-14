import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1038-is-signed-in-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const ownerToken = "proof-token";
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

const dashboardPacket = {
  generatedAt: "2026-07-14T12:10:00.000Z",
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
      id: "priority-1",
      title: "Prove isSignedIn route gating",
      source: "qa",
      severity: "high",
      status: "active",
      updatedAt: "2026-07-14T12:09:00.000Z"
    }
  ],
  nextActions: [
    {
      key: "next-1",
      label: "Verify private route gating",
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

async function createLocalServer(requestLog) {
  const indexPath = path.join(reactRoot, "index.html");
  const indexHtml = await readFile(indexPath);

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const authorization = request.headers.authorization || null;

      if (url.pathname === "/v1/auth/me") {
        requestLog.authMeHeaders.push(authorization);
        return jsonResponse(response, 200, {
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
        requestLog.departmentsHeaders.push(authorization);
        return jsonResponse(response, 200, { data: departmentPacket });
      }

      if (url.pathname === "/v1/dashboard/command") {
        requestLog.dashboardHeaders.push(authorization);
        return jsonResponse(response, 200, { data: dashboardPacket });
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

async function screenshot(page, outputPath) {
  await page.screenshot({ path: outputPath, fullPage: true });
  return outputPath;
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function run() {
  await mkdir(evidenceRoot, { recursive: true });
  const requestLog = {
    authMeHeaders: [],
    departmentsHeaders: [],
    dashboardHeaders: []
  };
  const { server, baseUrl } = await createLocalServer(requestLog);
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    const signedInContext = await browser.newContext({
      viewport: { width: 1440, height: 1024 }
    });
    await signedInContext.addInitScript((token) => {
      window.sessionStorage.setItem("companycoreOwnerToken", token);
    }, ownerToken);
    const signedInPage = await signedInContext.newPage();
    signedInPage.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        errors.push({ scenario: "signed-in", type: message.type(), text: message.text() });
      }
    });
    signedInPage.on("pageerror", (error) => {
      errors.push({ scenario: "signed-in", type: "pageerror", text: error.message });
    });
    await signedInPage.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await signedInPage.waitForLoadState("networkidle");
    await signedInPage.getByRole("heading", { name: "What needs attention now" }).waitFor();
    const signedInToken = await signedInPage.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
    const signedInPendingPath = await signedInPage.evaluate(() => window.sessionStorage.getItem("companycorePendingPrivatePath"));
    const signedInOverflow = await noHorizontalOverflow(signedInPage);
    const signedInPathname = await signedInPage.evaluate(() => window.location.pathname + window.location.search);
    const signedInScreenshotPath = path.join(evidenceRoot, "desktop-signed-in-dashboard.png");
    await screenshot(signedInPage, signedInScreenshotPath);
    await signedInContext.close();

    const signedOutContext = await browser.newContext({
      viewport: { width: 1440, height: 1024 }
    });
    const signedOutPage = await signedOutContext.newPage();
    signedOutPage.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        errors.push({ scenario: "signed-out", type: message.type(), text: message.text() });
      }
    });
    signedOutPage.on("pageerror", (error) => {
      errors.push({ scenario: "signed-out", type: "pageerror", text: error.message });
    });
    await signedOutPage.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await signedOutPage.waitForLoadState("networkidle");
    await signedOutPage.getByRole("button", { name: "Sign in" }).waitFor();
    const signedOutToken = await signedOutPage.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
    const signedOutPendingPath = await signedOutPage.evaluate(() => window.sessionStorage.getItem("companycorePendingPrivatePath"));
    const signedOutOverflow = await noHorizontalOverflow(signedOutPage);
    const signedOutPathname = await signedOutPage.evaluate(() => window.location.pathname + window.location.search);
    const signedOutScreenshotPath = path.join(evidenceRoot, "desktop-signed-out-login.png");
    await screenshot(signedOutPage, signedOutScreenshotPath);
    await signedOutContext.close();

    const report = {
      timestamp: new Date().toISOString(),
      baseUrl,
      assertions: {
        signedIn: {
          tokenPresent: signedInToken === ownerToken,
          dashboardRequestUsedBearerAuth: requestLog.dashboardHeaders.includes(`Bearer ${ownerToken}`),
          authMeRequestUsedBearerAuth: requestLog.authMeHeaders.includes(`Bearer ${ownerToken}`),
          departmentsRequestUsedBearerAuth: requestLog.departmentsHeaders.includes(`Bearer ${ownerToken}`),
          pendingPrivatePathNotSet: signedInPendingPath === null,
          canonicalPrivateRouteRendered: signedInPathname === canonicalDashboardPath,
          noHorizontalOverflow: signedInOverflow
        },
        signedOut: {
          tokenMissing: signedOutToken === null,
          loginSurfaceVisible: true,
          pendingPrivatePathRecorded: signedOutPendingPath === canonicalDashboardPath,
          privateRouteStayedOnRequestedPath: signedOutPathname === canonicalDashboardPath,
          noHorizontalOverflow: signedOutOverflow
        }
      },
      requestLog,
      screenshots: {
        signedIn: signedInScreenshotPath,
        signedOut: signedOutScreenshotPath
      },
      errors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`LUC-1038 proof report written to ${reportPath}`);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

await run();
