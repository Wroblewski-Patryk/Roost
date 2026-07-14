import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1022-clear-owner-token-proof");
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
  generatedAt: "2026-07-14T10:22:00.000Z",
  summary: {
    activeSignals: 2,
    nextActions: 1,
    routeProposals: 1
  },
  departmentSignals: [
    { key: "00-ogolny", label: "00 General", health: "ready", count: 2, href: canonicalDashboardPath }
  ],
  priorityItems: [
    {
      id: "priority-1",
      title: "Prove clearOwnerToken reset behavior",
      source: "qa",
      severity: "high",
      status: "active",
      updatedAt: "2026-07-14T10:20:00.000Z"
    }
  ],
  nextActions: [
    {
      key: "next-1",
      label: "Inspect auth reset behavior",
      target: canonicalDashboardPath,
      count: 1,
      priority: "high"
    }
  ],
  latestRouteProposals: [
    {
      id: "route-1",
      title: "Account access proof",
      status: "review",
      targetDepartmentKey: "09-technologia",
      riskLevel: "low"
    }
  ],
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

async function createLocalServer(mode, requestLog) {
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
        if (mode === "auth-reset") {
          return jsonResponse(response, 401, {
            error: {
              code: "invalid_token",
              message: "The provided bearer token is no longer valid."
            }
          });
        }
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

async function withScenario(mode, runScenario) {
  const requestLog = {
    authMeHeaders: [],
    departmentsHeaders: [],
    dashboardHeaders: []
  };
  const { server, baseUrl } = await createLocalServer(mode, requestLog);
  try {
    return await runScenario({ baseUrl, requestLog });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function run() {
  await mkdir(evidenceRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    const signOut = await withScenario("sign-out", async ({ baseUrl, requestLog }) => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1024 }
      });
      await context.addInitScript((token) => {
        if (!window.sessionStorage.getItem("companycoreProofSeeded")) {
          window.sessionStorage.setItem("companycoreOwnerToken", token);
          window.sessionStorage.setItem("companycoreProofSeeded", "1");
        }
      }, ownerToken);
      const page = await context.newPage();
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          errors.push({ scenario: "sign-out", type: message.type(), text: message.text() });
        }
      });
      page.on("pageerror", (error) => {
        errors.push({ scenario: "sign-out", type: "pageerror", text: error.message });
      });

      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.getByRole("heading", { name: "What needs attention now" }).waitFor();
      const beforeToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
      await page.locator("button[aria-label='User menu']").click();
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL(`${baseUrl}/`);
      await page.getByRole("heading", { name: "Operational center for your company" }).waitFor();
      const afterToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
      const overflow = await noHorizontalOverflow(page);
      const screenshotPath = path.join(evidenceRoot, "desktop-sign-out-cleared.png");
      await screenshot(page, screenshotPath);
      await context.close();

      return {
        baseUrl,
        requestLog,
        screenshotPath,
        assertions: {
          tokenPresentBeforeSignOut: beforeToken === ownerToken,
          tokenClearedAfterSignOut: afterToken === null,
          redirectedToPublicHome: new URL(page.url()).pathname === "/",
          publicHomeVisible: true,
          noHorizontalOverflow: overflow
        }
      };
    });

    const authReset = await withScenario("auth-reset", async ({ baseUrl, requestLog }) => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1024 }
      });
      await context.addInitScript((token) => {
        if (!window.sessionStorage.getItem("companycoreProofSeeded")) {
          window.sessionStorage.setItem("companycoreOwnerToken", token);
          window.sessionStorage.setItem("companycoreProofSeeded", "1");
        }
      }, ownerToken);
      const page = await context.newPage();
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          errors.push({ scenario: "auth-reset", type: message.type(), text: message.text() });
        }
      });
      page.on("pageerror", (error) => {
        errors.push({ scenario: "auth-reset", type: "pageerror", text: error.message });
      });

      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => window.sessionStorage.getItem("companycoreOwnerToken") === null);
      await page.getByText("Something went wrong. Try again.").first().waitFor();
      const afterResetToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Sign in" }).waitFor();
      const pendingPrivatePath = await page.evaluate(() => window.sessionStorage.getItem("companycorePendingPrivatePath"));
      const overflow = await noHorizontalOverflow(page);
      const finalUrl = page.url();
      const screenshotPath = path.join(evidenceRoot, "desktop-auth-reset-login.png");
      await screenshot(page, screenshotPath);
      await context.close();

      return {
        baseUrl,
        requestLog,
        screenshotPath,
        assertions: {
          invalidTokenRequestUsedBearerAuth: requestLog.dashboardHeaders.every((value) => value === `Bearer ${ownerToken}`),
          tokenClearedAfterAuthReset: afterResetToken === null,
          reloadOpenedLoginRoute: new URL(finalUrl).pathname === "/dashboard",
          loginSurfaceVisible: true,
          pendingPrivatePathRecorded: pendingPrivatePath === "/dashboard",
          noHorizontalOverflow: overflow
        }
      };
    });

    const report = {
      timestamp: new Date().toISOString(),
      scenarios: {
        signOut,
        authReset
      },
      errors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`LUC-1022 proof report written to ${reportPath}`);
  } finally {
    await browser.close();
  }
}

await run();
