import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicAssets = join(repositoryRoot, "web", "public");

async function renderSvg(page, sourceName, targetName, width, height) {
  const svg = await readFile(join(publicAssets, sourceName), "utf8");
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  await page.setViewportSize({ width, height });
  await page.setContent(`
    <!doctype html>
    <style>html,body{margin:0;width:${width}px;height:${height}px;background:transparent}img{display:block;width:${width}px;height:${height}px}</style>
    <img alt="" src="${dataUrl}">
  `);
  await page.locator("img").screenshot({ omitBackground: true, path: join(publicAssets, targetName) });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await renderSvg(page, "favicon.svg", "favicon-32.png", 32, 32);
  await renderSvg(page, "favicon.svg", "apple-touch-icon.png", 180, 180);
  await renderSvg(page, "favicon.svg", "icon-192.png", 192, 192);
  await renderSvg(page, "favicon.svg", "icon-512.png", 512, 512);
  await renderSvg(page, "social-card.svg", "social-card.png", 1200, 630);
} finally {
  await browser.close();
}
