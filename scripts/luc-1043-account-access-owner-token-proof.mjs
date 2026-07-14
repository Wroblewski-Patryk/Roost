import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const repositoryRoot = path.resolve(".");
const reactRoot = path.join(repositoryRoot, "public", "react");
const vendorRoot = path.join(repositoryRoot, "public", "vendor");
const evidenceRoot = path.join(repositoryRoot, "docs", "ux", "evidence", "luc-1043-owner-token-proof");
const reportPath = path.join(evidenceRoot, "report.json");
const ownerToken = "proof-token";
const assetsRoute = "/areas?area=08-zasoby&view=files";
const previewPath = "/v1/assets/files/proof-image/preview";
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4e8AAAAASUVORK5CYII=",
  "base64"
);

const departmentPacket = {
  departments: [
    {
      id: "dept-assets",
      key: "08-zasoby",
      name: "08 Assets",
      description: "Files and folders",
      href: assetsRoute,
      icon: "ph-folders",
      status: "active",
      views: [
        { id: "overview", label: "Overview", href: "/areas?area=08-zasoby&view=overview", icon: "ph-layout" },
        { id: "files", label: "Files and folders", href: assetsRoute, icon: "ph-folders" }
      ]
    }
  ]
};

const assetsPacket = {
  department: {
    canonicalKey: "08-zasoby",
    backendAreaKey: "08-zasoby",
    name: "08 Assets",
    purpose: "Proof route"
  },
  summary: {
    totalResources: 1,
    files: 1,
    folders: 0
  },
  folders: [],
  knowledgeRoots: [],
  knowledgeItems: [],
  blockedActions: [
    {
      action: "Push to production",
      reason: "This proof is local-only."
    }
  ],
  agentPacket: {
    mode: "review",
    allowedActions: ["read"],
    blockedActions: ["write"]
  },
  resources: [
    {
      id: "resource-proof-image",
      sourceModel: "GoogleDriveFile",
      sourceId: "proof-image",
      name: "Proof Preview.png",
      resourceType: "image",
      type: "image",
      source: {
        provider: "Google Drive",
        externalId: "proof-image",
        parentExternalId: null,
        webViewLink: "https://example.test/proof-image",
        webContentLink: previewPath,
        thumbnailLink: previewPath,
        mimeType: "image/png",
        isFolder: false
      },
      organization: {
        departmentCanonical: "08-zasoby",
        department: "08-zasoby",
        status: "ready"
      },
      aiCompatibility: {
        readiness: "ready",
        contentSnapshot: {
          summary: "Authenticated preview proof image."
        }
      },
      freshness: {
        modifiedTime: "2026-07-14T12:43:00.000Z",
        syncStatus: "current"
      }
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

      if (url.pathname === "/v1/assets/context") {
        requestLog.assetsContextHeaders.push(authorization);
        return jsonResponse(response, 200, { data: assetsPacket });
      }

      if (url.pathname === previewPath) {
        requestLog.previewHeaders.push(authorization);
        response.writeHead(200, { "Content-Type": "image/png" });
        response.end(tinyPng);
        return;
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

async function runScenario(browser, baseUrl, requestLog, viewport, screenshotName, errors) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((token) => {
    window.sessionStorage.setItem("companycoreOwnerToken", token);
  }, ownerToken);
  const page = await context.newPage();

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      errors.push({ scenario: screenshotName, type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ scenario: screenshotName, type: "pageerror", text: error.message });
  });

  await page.goto(`${baseUrl}${assetsRoute}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.locator('img[alt="Proof Preview.png"]').waitFor();

  const imageSrc = await page.locator('img[alt="Proof Preview.png"]').getAttribute("src");
  const storedToken = await page.evaluate(() => window.sessionStorage.getItem("companycoreOwnerToken"));
  const overflow = await noHorizontalOverflow(page);
  const screenshotPath = path.join(evidenceRoot, screenshotName);
  await screenshot(page, screenshotPath);
  await context.close();

  return {
    viewport,
    storedTokenMatches: storedToken === ownerToken,
    assetsContextUsedBearerAuth: requestLog.assetsContextHeaders.some((value) => value === `Bearer ${ownerToken}`),
    authMeUsedBearerAuth: requestLog.authMeHeaders.some((value) => value === `Bearer ${ownerToken}`),
    departmentsUsedBearerAuth: requestLog.departmentsHeaders.some((value) => value === `Bearer ${ownerToken}`),
    previewUsedBearerAuth: requestLog.previewHeaders.some((value) => value === `Bearer ${ownerToken}`),
    renderedBlobPreview: typeof imageSrc === "string" && imageSrc.startsWith("blob:"),
    noHorizontalOverflow: overflow,
    screenshotPath
  };
}

async function run() {
  await mkdir(evidenceRoot, { recursive: true });
  const requestLog = {
    authMeHeaders: [],
    departmentsHeaders: [],
    assetsContextHeaders: [],
    previewHeaders: []
  };
  const { server, baseUrl } = await createLocalServer(requestLog);
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    const desktop = await runScenario(
      browser,
      baseUrl,
      requestLog,
      { width: 1440, height: 1024 },
      "desktop-owner-token-assets.png",
      errors
    );
    const mobile = await runScenario(
      browser,
      baseUrl,
      requestLog,
      { width: 393, height: 852 },
      "mobile-owner-token-assets.png",
      errors
    );

    const report = {
      timestamp: new Date().toISOString(),
      baseUrl,
      route: assetsRoute,
      assertions: {
        desktop,
        mobile,
        previewRequestCount: requestLog.previewHeaders.length,
        assetsContextRequestCount: requestLog.assetsContextHeaders.length
      },
      requestLog,
      errors
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`LUC-1043 proof report written to ${reportPath}`);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

await run();
