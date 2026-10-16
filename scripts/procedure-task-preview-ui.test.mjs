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
const task = { id: taskId, title: 'Review fictional project result', status: 'done', procedureRunStep: {
  id: stepId, stepOrder: 2, stepType: 'human_review', run: { id: runId, procedureId, procedureVersion: 3, procedureName: 'Fictional procedure' }
} };
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{ProcedureTaskPreview}from'./web/src/features/departments/procedure-task-preview';const task=${JSON.stringify(task)};createRoot(document.getElementById('root')).render(<LanguageProvider><button id="origin" onClick={()=>document.getElementById('root').replaceChildren()}>Origin</button><ProcedureTaskPreview task={task} onClose={()=>{document.getElementById('root').replaceChildren();document.body.dataset.closed='yes'}}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
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
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) for (const mode of ['ready', 'stale', 'foreign', 'error']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', route => {
      const request = route.request(); requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
      assert.equal(request.method(), 'GET', 'preview performs no writes');
      assert.equal(new URL(request.url()).pathname, `/v1/process-core/procedure-runs/${runId}`);
      if (mode === 'foreign') return route.fulfill({ status: 404, json: { error: 'not_found' } });
      if (mode === 'error' && requests.length === 1) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
      return route.fulfill({ json: { data: { id: runId, procedureId, procedureVersion: 3, procedureName: 'Fictional procedure', status: 'tasks_done_evidence_pending',
        steps: [{ id: stepId, order: 2, instruction: 'Inspect the fictional result.', executor: 'human_review',
          task: { id: mode === 'stale' ? '55555555-5555-4555-8555-555555555555' : taskId, status: 'done' }, outcomeHistory: [] }] } } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    if (mode === 'ready') {
      await dialog.getByText('Inspect the fictional result.').waitFor();
      assert.equal(await dialog.getByRole('link', { name: locale === 'pl' ? 'Otwórz przebieg i ocenę' : 'Open run and assessment' }).getAttribute('href'),
        `/areas?area=04-operacje&view=procedures&procedureId=${procedureId}&runId=${runId}`);
      assert.equal(await dialog.getByRole('link', { name: locale === 'pl' ? 'Zmień status zadania' : 'Update task status' }).getAttribute('href'),
        `/areas?area=04-operacje&view=tasks&focusTaskId=${taskId}`);
      await dialog.getByRole('heading', { name: locale === 'pl' ? 'Następny ruch' : 'Next action' }).waitFor();
    } else {
      await dialog.getByText(mode === 'stale'
        ? locale === 'pl' ? 'Powiązanie zadania z przebiegiem zmieniło się.' : 'The task-to-run link changed.'
        : locale === 'pl' ? 'Nie można odczytać powiązanego przebiegu.' : 'The linked run cannot be read.').waitFor();
      assert.equal(await dialog.getByRole('link').count(), 0, 'unverified link has no action');
      if (mode === 'error') {
        await dialog.getByRole('button', { name: locale === 'pl' ? 'Spróbuj ponownie' : 'Try again' }).click();
        await dialog.getByRole('link', { name: locale === 'pl' ? 'Otwórz przebieg i ocenę' : 'Open run and assessment' }).waitFor();
      }
    }
    assert.equal(await page.locator('html').evaluate(element => element.scrollWidth <= window.innerWidth + 1), true,
      `${locale}/${width}/${mode}: horizontal overflow`);
    assert.equal(requests.length, mode === 'error' ? 2 : 1, 'one exact run read, or one explicit retry');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.body.dataset.closed === 'yes');
    assert.equal(errors.length, 0, `${locale}/${width}/${mode}: ${errors.join('; ')}`);
    checks++;
    await page.close();
  }
  console.log(`Procedure Task preview UI: ${checks} PL/EN responsive read-only journeys passed`);
} finally { await browser.close(); server.close(); }
