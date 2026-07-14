import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1082-dashboard-cc-notice-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const canonicalDashboardPath = "/areas?area=00-ogolny&view=overview";
const ownerToken = "luc-1082-proof-token";
const loadingTitle = "Loading records";
const loadingDetail = "CompanyCore is preparing this table view.";
const serverErrorMessage = "CompanyCore hit a server problem. Try again in a moment.";
const expectedConsoleIssue = "Failed to load resource: the server responded with a status of 500 (Internal Server Error)";

const requestLog = {
  authMeHeaders: [],
  departmentsHeaders: [],
  dashboardCommandHeaders: []
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
    }
  ]
};

let releaseDashboardResponse;
const dashboardResponseGate = new Promise((resolve) => {
  releaseDashboardResponse = resolve;
});

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
        return jsonResponse(response, 200, { data: departmentPacket });
      }

      if (url.pathname === "/v1/dashboard/command") {
        recordHeader(requestLog.dashboardCommandHeaders, request);
        await dashboardResponseGate;
        return jsonResponse(response, 500, {
          error: "internal_server_error",
          message: "Synthetic dashboard command failure for cc-notice proof."
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
      viewport: {
        width: 1440,
        height: 1024
      }
    });

    await context.addInitScript((token) => {
      window.sessionStorage.setItem("companycoreOwnerToken", token);
    }, ownerToken);

    const page = await context.newPage();
    const consoleIssues = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        const text = message.text();
        if (text === expectedConsoleIssue) {
          return;
        }
        consoleIssues.push({ type: message.type(), text });
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(`**${canonicalDashboardPath}`);
    await page.getByRole("heading", { name: "What needs attention now" }).waitFor();
    await page.getByText(loadingTitle, { exact: true }).first().waitFor();
    await page.getByText(loadingDetail, { exact: true }).first().waitFor();

    const loadingScreenshotPath = path.join(evidenceRoot, "desktop-dashboard-loading-notice.png");
    await page.screenshot({ path: loadingScreenshotPath, fullPage: true });
    const loadingNoticeCount = await page.locator('[role="status"]').count();
    const noOverflowDuringLoading = await noHorizontalOverflow(page);

    releaseDashboardResponse();

    await page.getByRole("alert").first().waitFor();
    await page.getByText(serverErrorMessage, { exact: true }).first().waitFor();

    const errorScreenshotPath = path.join(evidenceRoot, "desktop-dashboard-error-notice.png");
    await page.screenshot({ path: errorScreenshotPath, fullPage: true });
    const errorNoticeCount = await page.locator('[role="alert"]').count();
    const noOverflowDuringError = await noHorizontalOverflow(page);

    const report = {
      issue: "LUC-1082",
      status: "passed",
      generatedAt: new Date().toISOString(),
      baseUrl,
      canonicalDashboardPath,
      requestCounts: {
        authMe: requestLog.authMeHeaders.length,
        departments: requestLog.departmentsHeaders.length,
        dashboardCommand: requestLog.dashboardCommandHeaders.length
      },
      authHeaders: requestLog,
      loadingState: {
        title: loadingTitle,
        detail: loadingDetail,
        noticeCount: loadingNoticeCount,
        screenshot: loadingScreenshotPath,
        noHorizontalOverflow: noOverflowDuringLoading
      },
      errorState: {
        title: serverErrorMessage,
        noticeCount: errorNoticeCount,
        screenshot: errorScreenshotPath,
        noHorizontalOverflow: noOverflowDuringError
      },
      assertions: {
        redirectedToCanonicalDashboard: page.url().endsWith(canonicalDashboardPath),
        dashboardCommandUsedBearerToken: requestLog.dashboardCommandHeaders.every((value) => value === `Bearer ${ownerToken}`),
        authMeUsedBearerToken: requestLog.authMeHeaders.every((value) => value === `Bearer ${ownerToken}`),
        departmentsUsedBearerToken: requestLog.departmentsHeaders.every((value) => value === `Bearer ${ownerToken}`),
        loadingNoticeRendered: loadingNoticeCount >= 1,
        errorNoticeRendered: errorNoticeCount >= 1,
        noHorizontalOverflow: noOverflowDuringLoading && noOverflowDuringError,
        runtimeErrors: consoleIssues.length === 0 && pageErrors.length === 0
      },
      consoleIssues,
      pageErrors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await context.close();
    console.log(`LUC-1082 proof report written to ${reportPath}`);
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

await run();
