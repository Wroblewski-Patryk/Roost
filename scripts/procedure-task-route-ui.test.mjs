import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const taskId = '11111111-1111-4111-8111-111111111111';
const procedureId = '22222222-2222-4222-8222-222222222222';
const runId = '33333333-3333-4333-8333-333333333333';
const stepId = '44444444-4444-4444-8444-444444444444';
const link = { id: stepId, stepOrder: 2, stepType: 'manual', run: { id: runId, procedureId, procedureVersion: 3, procedureName: 'Fictional procedure' } };
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{OperationsRoute}from'./web/src/features/departments/operations-route';createRoot(document.getElementById('root')).render(<LanguageProvider><OperationsRoute/></LanguageProvider>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built web CSS is required');
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].contents); }
  if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css); }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main id="root"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) for (const entry of ['link', 'board', 'calendar', 'scoped', 'status']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      requests.push(`${request.method()} ${pathname}`);
      assert.equal(request.method(), 'GET', 'navigation performs no writes');
      if (pathname === `/v1/tasks/${taskId}`) return route.fulfill({ json: { data: { id: taskId, title: 'Review fictional project result', status: 'done', procedureRunStep: link } } });
      if (pathname === `/v1/process-core/procedure-runs/${runId}`) return route.fulfill({ json: { data: { id: runId, procedureId, procedureVersion: 3,
        procedureName: 'Fictional procedure', status: 'tasks_done_evidence_pending', steps: [{ id: stepId, order: 2,
          instruction: 'Inspect the fictional result.', executor: 'manual', task: { id: taskId, status: 'done' }, outcomeHistory: [] }] } } });
      if (pathname === '/v1/operations/work-items') {
        assert.equal(new URL(request.url()).searchParams.get('taskId'), entry === 'status' ? taskId : null);
        return route.fulfill({ json: { data: { statuses: [{ key: 'done', label: 'Done' }],
        taskLists: [{ id: 'unassigned', name: 'Unassigned', status: 'active' }], departments: [], workItems: [{ id: taskId, task: { id: taskId, title: 'Review fictional project result', status: 'done' } }] } } });
      }
      return route.fulfill({ json: { data: [] } });
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const routePath = `/areas?area=04-operacje&view=${entry === 'calendar' ? 'calendar' : 'tasks'}${entry === 'link' ? `&taskId=${taskId}` : entry === 'status' ? `&focusTaskId=${taskId}` : entry === 'scoped' ? '&department=04-operacje' : ''}`;
    await page.goto(`${origin}${routePath}`);
    if (['board', 'calendar', 'scoped'].includes(entry)) await page.getByText('Review fictional project result').first().click();
    const dialog = page.getByRole('dialog');
    if (entry === 'status') {
      await dialog.getByRole('link', { name: locale === 'pl' ? 'Otwórz przebieg zadania' : 'Open task run' }).waitFor();
      assert.equal(await dialog.getByRole('link', { name: locale === 'pl' ? 'Otwórz przebieg zadania' : 'Open task run' }).getAttribute('href'),
        `/areas?area=04-operacje&view=tasks&taskId=${taskId}`);
    } else {
      await dialog.getByText('Inspect the fictional result.').waitFor();
      assert.equal(await dialog.getByRole('link', { name: locale === 'pl' ? 'Otwórz przebieg i ocenę' : 'Open run and assessment' }).getAttribute('href'),
        `/areas?area=04-operacje&view=procedures&procedureId=${procedureId}&runId=${runId}`);
    }
    assert.equal(await dialog.getByRole('button', { name: /Zapisz i przygotuj|Save and prepare/ }).count(), 0);
    assert.equal(await page.locator('html').evaluate(element => element.scrollWidth <= window.innerWidth + 1), true,
      `${locale}/${width}/${entry}: horizontal overflow`);
    assert.equal(requests.filter(request => request === `GET /v1/tasks/${taskId}`).length, 1);
    assert.equal(requests.filter(request => request === `GET /v1/process-core/procedure-runs/${runId}`).length, entry === 'status' ? 0 : 1);
    if (['board', 'calendar', 'scoped'].includes(entry)) {
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, routePath, 'close retains originating board/calendar scope');
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('Review fictional project result')), true,
        'focus returns to the triggering task');
    }
    assert.equal(errors.length, 0, `${locale}/${width}/${entry}: ${errors.join('; ')}`);
    checks++;
    await page.close();
  }
  console.log(`Procedure Task route UI: ${checks} PL/EN responsive read-only journeys passed`);
} finally { await browser.close(); server.close(); }
