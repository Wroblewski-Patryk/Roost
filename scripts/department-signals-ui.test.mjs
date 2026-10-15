import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const bundle = await build({
  stdin: {
    contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {DepartmentHealthStrip} from './web/src/features/departments/department-health-strip';createRoot(document.getElementById('root')).render(<LanguageProvider><DepartmentHealthStrip departmentKey='09-technologia'/></LanguageProvider>);",
    resolveDir: process.cwd(), loader: 'tsx'
  },
  bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' }
});
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built web CSS is required');
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].contents); }
  if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css); }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
const screenshotDir = path.join(tmpdir(), 'roost-department-signals-ui');
await mkdir(screenshotDir, { recursive: true });
let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1280]) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    let mode = 'decisions';
    let failIssues = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', async route => {
      const request = route.request(), url = new URL(request.url());
      assert.equal(request.method(), 'GET', 'department signals must be read-only');
      if (url.pathname === '/v1/company-intelligence/health') {
        if (mode === 'error') return route.fulfill({ status: 503, json: { error: 'unavailable' } });
        const signals = mode === 'empty' ? {} : mode === 'decisions'
          ? { decisionsRequiringReview: 3, activeRisks: 1, openTasks: 2, functionalStates: {} }
          : { blockedTasks: 2, overdueTasks: 1, decisionsRequiringReview: 3, activeRisks: 1, technicalIncidents: 1, operationalIssues: 1, staleOrRejectedEvidence: 1, openTasks: 2, functionalStates: { broken: 1, missing: 1 } };
        return route.fulfill({ json: { data: { interpretation: 'tracked_signals_only', signals } } });
      }
      if (url.pathname === '/v1/company-intelligence/health/signal-records') {
        assert.equal(url.searchParams.get('departmentKey'), '09-technologia');
        if (failIssues) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
        const signal = url.searchParams.get('signal');
        const entityType = signal === 'decisionsRequiringReview' ? 'decision' : signal === 'activeRisks' ? 'risk' : 'company_record';
        const title = entityType === 'decision' ? 'Pending record' : entityType === 'risk' ? 'Risk record' : 'Affected record';
        return route.fulfill({ json: { data: { signal, page: 1, hasMore: false, items: [{ id: '00000000-0000-4000-8000-000000000001', title, state: 'broken', entityType }] } } });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=09-technologia&view=overview`);
    const region = page.getByRole('region', { name: pl ? 'Sygnały działu' : 'Department signals' });
    await region.getByText(pl ? 'Sygnały do sprawdzenia' : 'Tracked signals to inspect').waitFor();
    await region.getByRole('button', { name: /decyzje|decisions/i }).click();
    const pending = region.getByRole('link', { name: 'Pending record' });
    await pending.waitFor();
    assert.equal(await pending.getAttribute('href'), '/areas?area=01-strategia&view=decisions&department=09-technologia&decisionId=00000000-0000-4000-8000-000000000001');
    await region.getByRole('button', { name: /ryzyka|risks/i }).click();
    assert.equal(await region.getByRole('link', { name: 'Risk record' }).getAttribute('href'), '/areas?area=12-zarzadzanie&view=risks&department=09-technologia&riskId=00000000-0000-4000-8000-000000000001');
    assert.ok(!(await region.innerText()).includes('100%'));
    assert.ok(!(await region.innerText()).includes('Brak aktywnych blokad'));
    await region.getByText(pl ? 'Co jest liczone' : 'What is counted').click();
    await region.getByText(pl ? /Kategorie mogą się nakładać/ : /Categories can overlap/).waitFor();
    mode = 'all';
    await page.reload();
    await region.getByRole('button', { name: /dowody|evidence/i }).waitFor();
    assert.equal(await region.getByRole('button').count(), 10, 'all positive signals remain visible');
    failIssues = true;
    await region.getByRole('button', { name: /rekordy|records/i }).first().focus();
    await page.keyboard.press('Enter');
    await region.getByRole('alert').waitFor();
    failIssues = false;
    await region.getByRole('button', { name: pl ? 'Spróbuj ponownie' : 'Try again' }).click();
    const exact = region.getByRole('link', { name: /Affected record/ });
    await exact.waitFor();
    assert.equal(await exact.getAttribute('href'), '/areas?area=00-ogolny&view=entity&type=company_record&id=00000000-0000-4000-8000-000000000001');
    if (pl) assert.ok(!(await region.innerText()).includes('broken'), 'raw backend state is not shown in Polish');
    const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(size.content <= size.viewport + 2, `signals should fit ${width}px viewport: ${JSON.stringify(size)}`);
    if (locale === 'pl' && width === 390) await page.screenshot({ path: path.join(screenshotDir, 'pl-mobile.png'), fullPage: true });
    if (locale === 'en' && width === 1280) await page.screenshot({ path: path.join(screenshotDir, 'en-desktop.png'), fullPage: true });
    mode = 'empty';
    await page.reload();
    await region.getByText(pl ? 'Brak monitorowanych wyjątków' : 'No tracked exception signals', { exact: true }).waitFor();
    mode = 'error';
    await page.reload();
    await region.getByText(pl ? 'Sygnały działu są niedostępne' : 'Department signals unavailable').waitFor();
    mode = 'decisions';
    await region.getByRole('button', { name: pl ? 'Spróbuj ponownie' : 'Try again' }).click();
    await region.getByText(pl ? 'Sygnały do sprawdzenia' : 'Tracked signals to inspect').waitFor();
    assert.deepEqual(errors, []);
    checks++;
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`Department signals UI: ${checks}/4 PL/EN responsive, keyboard, scope, empty/error checks passed. Screenshots: ${screenshotDir}`);
