import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = (
  process.env.COMPANYCORE_BASE_URL
  || process.env.ROOST_PROD_BASE_URL
  || "http://localhost:3001"
).replace(/\/+$/, "");
const ownerEmail = process.env.COMPANYCORE_OWNER_EMAIL
  || process.env.ROOST_PROD_TEST_EMAIL
  || process.env.SEED_OWNER_EMAIL
  || "owner@example.com";
const ownerPassword = process.env.COMPANYCORE_OWNER_PASSWORD
  || process.env.ROOST_PROD_TEST_PASSWORD
  || process.env.SEED_OWNER_PASSWORD
  || "change-me-local-password";
const outputRoot = process.env.COMPANYCORE_UX_ARTIFACT_DIR
  || path.join(os.tmpdir(), "companycore-ux-smoke", new Date().toISOString().replace(/[:.]/g, "-"));

const defaultRoutes = [
  "/areas?area=00-ogolny&view=overview",
  "/areas?area=04-operacje&view=tasks",
  "/areas?area=08-zasoby&view=overview",
  "/areas?area=08-zasoby&view=files",
  "/areas?area=09-technologia&view=overview",
  "/workspace/settings",
  "/account/settings"
];

const routes = (process.env.COMPANYCORE_UX_ROUTES || "")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
if (routes.length === 0) {
  routes.push(...defaultRoutes);
}

const defaultViewports = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 }
];

function parseJsonEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${name} must be valid JSON. ${error.message}`);
  }
}

const viewports = parseJsonEnv("COMPANYCORE_UX_VIEWPORTS_JSON", defaultViewports);
const requiredTextByRoute = parseJsonEnv("COMPANYCORE_UX_REQUIRED_TEXT_JSON", {});
const fullPageScreenshots = process.env.COMPANYCORE_UX_FULL_PAGE === "1";
const networkIdleTimeoutMs = Number(process.env.COMPANYCORE_UX_NETWORK_IDLE_TIMEOUT_MS || 3000);

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = typeof body?.error === "string"
      ? body.error
      : body?.error?.code || body?.error?.message || response.statusText;
    throw new Error(`${options.method || "GET"} ${pathname} failed: ${response.status} ${error}`);
  }

  return body;
}

function slug(input) {
  return input.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
}

function redactEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!name || !domain) {
    return "redacted";
  }
  return `${name.slice(0, 2)}***@${domain}`;
}

async function waitForConsoleHydration(page) {
  await page.waitForSelector("body", { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: networkIdleTimeoutMs }).catch(() => {});
  await page.waitForTimeout(450);
}

async function screenshot(page, fileName) {
  const filePath = path.join(outputRoot, fileName);
  await page.screenshot({ path: filePath, fullPage: fullPageScreenshots });
  return filePath;
}

async function anyVisible(locators) {
  for (const locator of locators) {
    if (await locator.first().isVisible().catch(() => false)) {
      return true;
    }
  }
  return false;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });

  const health = await request("/health");
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: ownerEmail,
      password: ownerPassword
    })
  });
  const token = login.data?.token;
  if (!token) {
    throw new Error("Login response did not include an owner token.");
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    throw new Error(
      `Playwright Chromium could not start. Install the browser with npx playwright install chromium. ${error.message}`
    );
  }
  const screenshots = [];
  const consoleIssues = [];
  const assertions = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: {
          width: viewport.width,
          height: viewport.height
        }
      });
      await context.addInitScript((ownerToken) => {
        window.sessionStorage.setItem("companycoreOwnerToken", ownerToken);
      }, token);

      const page = await context.newPage();
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) {
          consoleIssues.push({
            viewport: viewport.name,
            type: message.type(),
            text: message.text()
          });
        }
      });
      page.on("pageerror", (error) => {
        consoleIssues.push({
          viewport: viewport.name,
          type: "pageerror",
          text: error.message
        });
      });

      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        await waitForConsoleHydration(page);
        const routeTitle = await page.locator("#routeTitle").innerText({ timeout: 1000 }).catch(() => "");
        const bodyRoute = await page.locator("body").getAttribute("data-route");
        const signedIn = await page.evaluate(() => Boolean(window.sessionStorage.getItem("companycoreOwnerToken")));
        assertions.push({
          viewport: viewport.name,
          route,
          renderedRoute: bodyRoute,
          routeTitle,
          signedIn
        });
        const requiredTexts = requiredTextByRoute[route] || requiredTextByRoute["*"] || [];
        for (const text of requiredTexts) {
          assertions.push({
            viewport: viewport.name,
            route,
            requiredText: text,
            requiredTextPresent: await page.getByText(text, { exact: false }).count().then((count) => count > 0).catch(() => false)
          });
        }
        screenshots.push({
          viewport: viewport.name,
          route,
          file: await screenshot(page, `${viewport.name}-${slug(route)}.png`)
        });
      }

      if (viewport.name === "desktop" && routes.includes("/areas?area=00-ogolny&view=overview")) {
        await page.goto(`${baseUrl}/areas?area=00-ogolny&view=overview`, { waitUntil: "domcontentloaded" });
        await waitForConsoleHydration(page);
        await page.getByRole("searchbox", { name: /search/i }).first().fill("api");
        await page.waitForTimeout(250);
        screenshots.push({
          viewport: viewport.name,
          route: "/areas?area=00-ogolny&view=overview",
          interaction: "dashboard proposal table search for api",
          file: await screenshot(page, "desktop-dashboard-search-api.png")
        });
      }

      if (viewport.name === "desktop" && routes.includes("/areas?area=04-operacje&view=tasks")) {
        await page.goto(`${baseUrl}/areas?area=04-operacje&view=tasks`, { waitUntil: "domcontentloaded" });
        await waitForConsoleHydration(page);
        await page.getByRole("searchbox", { name: /search/i }).first().fill("tasks");
        await page.waitForTimeout(250);
        screenshots.push({
          viewport: viewport.name,
          route: "/areas?area=04-operacje&view=tasks",
          interaction: "operations task table search for tasks",
          file: await screenshot(page, "desktop-operations-search-tasks.png")
        });
      }

      if (viewport.name === "desktop" && routes.includes("/areas?area=08-zasoby&view=files")) {
        await page.goto(`${baseUrl}/areas?area=08-zasoby&view=files`, { waitUntil: "domcontentloaded" });
        await waitForConsoleHydration(page);
        await page.getByRole("searchbox", { name: /search/i }).first().fill("drive");
        await page.waitForTimeout(250);
        screenshots.push({
          viewport: viewport.name,
          route: "/areas?area=08-zasoby&view=files",
          interaction: "asset files table search for drive",
          file: await screenshot(page, "desktop-assets-files-search-drive.png")
        });
      }

      if (viewport.name === "desktop" && routes.includes("/workspace/settings")) {
        await page.goto(`${baseUrl}/workspace/settings`, { waitUntil: "domcontentloaded" });
        await waitForConsoleHydration(page);
        const integrationStatusVisible = await anyVisible([
          page.getByRole("heading", { name: /google drive/i }),
          page.getByRole("heading", { name: /integrations and api/i }),
          page.getByRole("button", { name: /integrations and api/i })
        ]);
        assertions.push({
          viewport: viewport.name,
          route: "/workspace/settings",
          control: "workspaceIntegrationStatus",
          visible: integrationStatusVisible
        });
        screenshots.push({
          viewport: viewport.name,
          route: "/workspace/settings",
          interaction: "redacted provider setup status",
          file: await screenshot(page, "desktop-workspace-settings-drive-status.png")
        });
        const agentSetupButton = page.getByRole("button", { name: /configure api and mcp|skonfiguruj api i mcp/i }).first();
        const agentSetupVisible = await agentSetupButton.isVisible().catch(() => false);
        assertions.push({
          viewport: viewport.name,
          route: "/workspace/settings",
          control: "agentConnectionSetup",
          visible: agentSetupVisible
        });
        if (agentSetupVisible) {
          await agentSetupButton.click();
          await page.waitForTimeout(250);
          const secretForwardingVisible = await page.getByText("env_vars = [\"COMPANYCORE_API_KEY\"]", { exact: false }).count().then((count) => count > 0).catch(() => false);
          assertions.push({
            viewport: viewport.name,
            route: "/workspace/settings",
            control: "agentConnectionSecretForwarding",
            visible: secretForwardingVisible
          });
          screenshots.push({
            viewport: viewport.name,
            route: "/workspace/settings",
            interaction: "agent connection setup",
            file: await screenshot(page, "desktop-workspace-settings-agent-connection-setup.png")
          });
          await page.keyboard.press("Escape");
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const report = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    health: health.data || health,
    ownerEmail: redactEmail(ownerEmail),
    routes,
    viewports,
    networkIdleTimeoutMs,
    screenshots,
    assertions,
    consoleIssues
  };
  const reportPath = path.join(outputRoot, "report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const failedAssertions = assertions.filter((assertion) => assertion.signedIn === false || assertion.visible === false || assertion.requiredTextPresent === false);
  if (consoleIssues.length > 0 || failedAssertions.length > 0) {
    console.error(`CompanyCore owner-console UX smoke failed. Artifacts: ${outputRoot}`);
    console.error(JSON.stringify({ consoleIssues, failedAssertions }, null, 2));
    process.exit(1);
  }

  console.log(`CompanyCore owner-console UX smoke passed. Artifacts: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
