import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const id = '11111111-1111-4111-8111-111111111111';
const output = path.join(os.tmpdir(), 'roost-procedure-provenance-ui');
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {ProceduresWorkbench} from './web/src/features/departments/procedures-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><ProceduresWorkbench /></LanguageProvider>);", resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find((name) => /^index-.*\.css$/.test(name));
assert.ok(cssName);
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].contents); }
  if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css); }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) for (const mode of ['recorded', 'unknown', 'error', 'readonly']) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = []; let provenanceReads = 0; const writes = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem('companycoreLocale', value), locale);
    const procedure = { id, familyId: id, name: 'Synthetic procedure', purpose: 'Assess recorded purpose', scope: 'Synthetic scope', requiredTools: [], requiredPermissions: [], status: 'active', version: 1, steps: [{ id, stepOrder: 1, instruction: 'Review evidence', stepType: 'manual' }], updatedAt: '2026-10-15T13:00:00Z' };
    const link = (taskId, title, status, current) => ({ taskId, title, status, basis: 'admission', version: 1, operation: null, current, recordedAt: '2026-10-15T13:00:00Z' });
    const data = { procedure, origin: mode === 'recorded' ? { state: 'recorded', recordKind: 'audit', action: 'procedure.create_draft', recordedAt: '2026-10-15T13:00:00Z', actorType: 'user' } : { state: 'unknown' }, lifecycle: [], configuration: { process: null, ownerRole: null, stages: [{ id, name: 'Synthetic stage', status: 'active', pipeline: null }], policies: [], applications: [], capabilities: [] }, tasks: { current: [link('22222222-2222-4222-8222-222222222222', 'Current synthetic task', 'todo', true)], history: [link('33333333-3333-4333-8333-333333333333', 'Historic synthetic task', 'done', false)] } };
    await page.route('**/v1/**', async (route) => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (request.method() !== 'GET') { writes.push(pathname); return route.fulfill({ status: 405 }); }
      if (pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaces: [{ active: true, role: mode === 'readonly' ? 'viewer' : 'owner' }] } } });
      if (pathname === '/v1/projects') return route.fulfill({ json: { data: [] } });
      if (pathname === `/v1/process-core/procedures/${id}/runs`) return route.fulfill({ json: { data: [] } });
      if (pathname === '/v1/process-core/procedures') return route.fulfill({ json: { data: [procedure] } });
      if (pathname === `/v1/process-core/procedures/${id}/provenance`) { provenanceReads++; return mode === 'error' ? route.fulfill({ status: 503, json: { error: 'unavailable' } }) : route.fulfill({ json: { data } }); }
      if (pathname === '/v1/company-os/processes' || pathname === '/v1/company-os/tool-adapters' || pathname === '/v1/company-os/integration-capabilities') return route.fulfill({ json: { data: [] } });
      if (pathname === '/v1/connection') return route.fulfill({ json: { data: { capabilities: [] } } });
      throw new Error(`Unexpected GET ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByText('Synthetic procedure').filter({ visible: true }).first().waitFor();
    const open = page.getByRole('button', { name: pl ? 'Otwórz' : 'Open' }).filter({ visible: true }).first();
    await open.press('Enter');
    const panel = page.locator('[data-procedure-provenance]');
    if (mode === 'readonly') { assert.equal(await panel.count(), 0); assert.equal(provenanceReads, 0); }
    else {
      await panel.waitFor();
      if (mode === 'error') await panel.getByText(pl ? 'Nie udało się odczytać pochodzenia' : 'Could not load provenance').waitFor();
      else {
        await panel.getByText('Assess recorded purpose').waitFor();
        await panel.getByText('Synthetic stage').waitFor();
        await panel.getByRole('link', { name: 'Current synthetic task' }).waitFor();
        await panel.getByRole('link', { name: 'Historic synthetic task' }).waitFor();
        if (mode === 'unknown') await panel.getByText(pl ? /Nieustalone/ : /Unknown/).waitFor();
        else await panel.getByText(pl ? /Utworzono szkic/ : /Draft created/).waitFor();
        await panel.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${mode}.png`), fullPage: true });
      }
      assert.equal(provenanceReads, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${locale}/${width}/${mode} overflow`);
      const close = page.getByRole('button', { name: pl ? 'Zamknij procedurę' : 'Close procedure' });
      assert.equal(await close.evaluate((element) => element === document.activeElement), true, 'dialog receives keyboard focus');
      await page.keyboard.press('Shift+Tab');
      const last = page.getByRole('button', { name: pl ? 'Utwórz szkic ulepszenia' : 'Create improvement draft' });
      assert.equal(await last.evaluate((element) => element === document.activeElement), true, 'focus wraps to last dialog action');
      await page.keyboard.press('Tab');
      assert.equal(await close.evaluate((element) => element === document.activeElement), true, 'focus wraps to close');
      await page.keyboard.press('Escape');
      assert.equal(await panel.count(), 0);
      assert.equal(await open.evaluate((element) => element === document.activeElement), true, 'focus returns to the Open action');
    }
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    checks++;
    await page.close();
  }
  console.log(`procedure provenance UI: ${checks} locale / viewport / state checks passed; screenshots in ${output}`);
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
