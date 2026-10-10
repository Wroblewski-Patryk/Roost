import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const cssName = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName);
const css = await readFile(path.join("public/react/assets", cssName));
const html = `<!doctype html><html data-theme="roost"><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><body><main class="roost-app-shell roost-liquid-shell" data-theme="roost"><section class="roost-app-main"><div class="roost-page-content"><div class="roost-liquid-dashboard"><div class="roost-liquid-dashboard-main"><section class="roost-owner-decisions"><header><h2>Attention</h2><span>25+ signals</span></header><div class="roost-decision-list"><button class="roost-decision-row" type="button"><span class="roost-decision-number">01</span><span class="roost-decision-copy"><strong>Decision</strong><small>Decision · pending</small></span></button></div></section></div></div></div></section></main></body></html>`;
const server = createServer((req, res) => {
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  res.setHeader("Content-Type", "text/html"); res.end(html);
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  for (const theme of ["roost", "companycore"]) {
    await page.evaluate(value => {
      document.documentElement.dataset.theme = value;
      document.querySelector(".roost-app-shell").dataset.theme = value;
    }, theme);
    for (const state of ["normal", "hover", "selected", "selected-focus"]) {
      const row = page.locator(".roost-decision-row");
      await row.evaluate((el, mode) => el.classList.toggle("is-selected", mode.startsWith("selected")), state);
      if (state === "hover") await row.hover();
      else { await page.mouse.move(1400, 850); if (state === "selected-focus") await row.focus(); }
      const values = await page.evaluate(() => {
        const parse = value => {
          const match = value.match(/rgba?\(([^)]+)\)/);
          if (!match) throw new Error(`Unsupported computed color: ${value}`);
          const parts = match[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
          return [parts[0], parts[1], parts[2], parts[3] ?? 1];
        };
        const blend = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
        const luminance = rgb => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const contrast = selector => {
          const node = document.querySelector(selector); if (!node) throw new Error(`Missing ${selector}`);
          const chain = []; for (let element = node; element; element = element.parentElement) chain.unshift(element);
          const bg = chain.reduce((color, element) => blend(parse(getComputedStyle(element).backgroundColor), color), [0, 0, 0]);
          const fg = blend(parse(getComputedStyle(node).color), bg);
          const a = luminance(fg), b = luminance(bg);
          return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
        };
        return { count: contrast(".roost-owner-decisions > header > span"), rowMeta: contrast(".roost-decision-copy small") };
      });
      assert.ok(values.count >= 4.5 && values.rowMeta >= 4.5, `${theme}/${state}: ${JSON.stringify(values)}`);
      console.log(`${theme}/${state} count=${values.count}:1 rowMeta=${values.rowMeta}:1`);
    }
  }
} finally { await browser.close(); server.close(); }
