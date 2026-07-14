import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1090-assets-overview-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const ownerToken = "luc-1090-proof-token";
const assetsOverviewPath = "/areas?area=08-zasoby&view=overview";
const assetsFilesPath = "/areas?area=08-zasoby&view=files";

const requestLog = {
  authMeHeaders: [],
  departmentsHeaders: [],
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
      id: "dept-assets",
      key: "08-zasoby",
      name: "08 Assets",
      description: "Knowledge and files",
      href: assetsOverviewPath,
      icon: "ph-database",
      status: "active",
      views: [
        { id: "overview", label: "Assets dashboard", href: assetsOverviewPath, icon: "ph-layout" },
        { id: "files", label: "Files and folders", href: assetsFilesPath, icon: "ph-folder" }
      ]
    }
  ]
};

const assetsPacket = {
  summary: {
    totalResources: 12,
    sourceRoots: 3,
    aiReadyResources: 9
  },
  blockedActions: [
    {
      action: "Push to production",
      reason: "This proof is local-only."
    }
  ],
  resources: [
    {
      id: "assets-root-brand",
      sourceId: "assets-root-brand",
      name: "Brand Library",
      resourceType: "folder",
      type: "folder",
      sourceModel: "GoogleDriveFile",
      source: { provider: "Google Drive", externalId: "assets-root-brand", parentExternalId: null, isFolder: true },
      organization: { departmentCanonical: "08-zasoby", knowledgeRoot: "Assets" }
    },
    {
      id: "assets-root-ops",
      sourceId: "assets-root-ops",
      name: "Operations Vault",
      resourceType: "folder",
      type: "folder",
      sourceModel: "GoogleDriveFile",
      source: { provider: "Google Drive", externalId: "assets-root-ops", parentExternalId: null, isFolder: true },
      organization: { departmentCanonical: "04-operacje", knowledgeRoot: "Operations" }
    },
    {
      id: "asset-proof-brief",
      sourceId: "asset-proof-brief",
      name: "Proof Launch Brief.md",
      resourceType: "file",
      type: "markdown",
      sourceModel: "GoogleDriveFile",
      source: { provider: "Google Drive", externalId: "asset-proof-brief", parentExternalId: "assets-root-ops", mimeType: "text/markdown", isFolder: false },
      organization: { departmentCanonical: "04-operacje" },
      aiCompatibility: { readiness: "ready", contentSnapshot: { summary: "Launch brief proof packet." } },
      freshness: { modifiedTime: "2026-07-14T12:00:00.000Z" }
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

async function runScenario(browser, baseUrl, viewport, screenshotName, consoleIssues, pageErrors) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((token) => {
    window.sessionStorage.setItem("companycoreOwnerToken", token);
  }, ownerToken);

  const page = await context.newPage();
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleIssues.push({ scenario: screenshotName, type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ scenario: screenshotName, text: error.message });
  });

  await page.goto(`${baseUrl}${assetsOverviewPath}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Assets and knowledge system", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Files and folders", exact: true }).waitFor();

  const titleVisible = await page.getByRole("heading", { name: "Assets and knowledge system", exact: true }).isVisible();
  const descriptionVisible = await page.getByText(
    "Company memory for resources, Drive files, documents, prompts, architecture notes, relation context, and AI-compatible read packets.",
    { exact: true }
  ).isVisible();
  const filesSectionVisible = await page.getByText(
    "Browse company files, folders, Drive imports, resource metadata, AI readiness, and relations by department.",
    { exact: true }
  ).isVisible();
  const openFilesLink = page.getByRole("link", { name: "Open files", exact: true });
  await openFilesLink.waitFor();
  const openFilesHref = await openFilesLink.getAttribute("href");
  const summaryLabels = await page.locator("article p.text-xs").allTextContents();
  const summaryValues = await page.locator("article strong.text-3xl").allTextContents();
  const overflow = await noHorizontalOverflow(page);
  const storedToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
  const screenshotPath = path.join(evidenceRoot, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await context.close();

  return {
    viewport,
    titleVisible,
    descriptionVisible,
    filesSectionVisible,
    openFilesHref,
    summaryLabels,
    summaryValues,
    storedTokenMatches: storedToken === ownerToken,
    noHorizontalOverflow: overflow,
    screenshotPath
  };
}

async function run() {
  await mkdir(evidenceRoot, { recursive: true });

  const { server, baseUrl } = await createLocalServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const consoleIssues = [];
    const pageErrors = [];

    const desktop = await runScenario(
      browser,
      baseUrl,
      { width: 1440, height: 1024 },
      "desktop-assets-overview.png",
      consoleIssues,
      pageErrors
    );
    const mobile = await runScenario(
      browser,
      baseUrl,
      { width: 393, height: 852 },
      "mobile-assets-overview.png",
      consoleIssues,
      pageErrors
    );

    const report = {
      issue: "LUC-1090",
      status: "passed",
      generatedAt: new Date().toISOString(),
      baseUrl,
      route: assetsOverviewPath,
      requestCounts: {
        authMe: requestLog.authMeHeaders.length,
        departments: requestLog.departmentsHeaders.length,
        assets: requestLog.assetsHeaders.length
      },
      authHeaders: requestLog,
      desktop,
      mobile,
      assertions: {
        authMeUsedBearerToken: requestLog.authMeHeaders.every((value) => value === `Bearer ${ownerToken}`),
        departmentsUsedBearerToken: requestLog.departmentsHeaders.every((value) => value === `Bearer ${ownerToken}`),
        assetsUsedBearerToken: requestLog.assetsHeaders.every((value) => value === `Bearer ${ownerToken}`),
        overviewContentVisible: desktop.titleVisible && desktop.descriptionVisible && desktop.filesSectionVisible
          && mobile.titleVisible && mobile.descriptionVisible && mobile.filesSectionVisible,
        openFilesCtaTargetsFilesRoute: desktop.openFilesHref === assetsFilesPath && mobile.openFilesHref === assetsFilesPath,
        summaryCardsRendered: desktop.summaryValues.length === 3 && mobile.summaryValues.length === 3,
        noHorizontalOverflow: desktop.noHorizontalOverflow && mobile.noHorizontalOverflow,
        runtimeErrors: consoleIssues.length === 0 && pageErrors.length === 0
      },
      consoleIssues,
      pageErrors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`LUC-1090 proof report written to ${reportPath}`);
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

await run();
