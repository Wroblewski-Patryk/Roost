import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const taskId = '00000000-0000-4000-8000-000000000101';
const executionId = '00000000-0000-4000-8000-000000000102';
const laterExecutionId = '00000000-0000-4000-8000-000000000103';
const target = `/areas?area=04-operacje&view=tasks&taskId=${taskId}&executionId=${executionId}&from=attention`;
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{GeneralDashboard}from'./web/src/features/departments/general-dashboard';import{OperationsRoute}from'./web/src/features/departments/operations-route';import{todayReturnPath}from'./web/src/owner-record-navigation';const area=new URLSearchParams(location.search).get('area');if(area==='00-ogolny'){const path=todayReturnPath(location.search,'/areas?area=00-ogolny&view=overview');history.replaceState(null,'',path);}createRoot(document.getElementById('root')).render(<LanguageProvider>{area==='04-operacje'?<OperationsRoute/>:<GeneralDashboard/>}</LanguageProvider>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built web CSS is required');
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((req, res) => {
  if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css); }
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main id="root"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
const origin = `http://127.0.0.1:${server.address().port}`;
let checked = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) for (const mode of ['failed', 'other_failure', 'completed', 'stale', 'foreign', 'error', 'paginated', 'reviewed', 'closed']) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', route => {
      assert.equal(route.request().method(), 'GET');
      const url = route.request().url();
      const attentionItem = { id: taskId, kind: 'result', title: 'Review fictional Worker finding', status: mode === 'completed' ? 'review' : 'failed',
        reason: mode === 'completed' ? 'result_review' : 'result_failed', responsible: 'Fictional manager', target };
      if (url.includes('/v1/dashboard/command')) return route.fulfill({ json: { data: {
        generatedAt: new Date().toISOString(), summary: {}, departmentSignals: [], latestRouteProposals: [], attentionTotal: mode === 'paginated' ? 26 : ['reviewed', 'closed'].includes(mode) ? 0 : 1,
        attentionHasMore: mode === 'paginated', attentionNextOffset: mode === 'paginated' ? 25 : 1,
        priorityItems: ['paginated', 'reviewed', 'closed'].includes(mode) ? [] : [attentionItem] } } });
      if (url.includes('/v1/dashboard/attention')) return route.fulfill({ json: { data: { items: [attentionItem], hasMore: false, nextOffset: 26 } } });
      if (url.includes(`/v1/agent-runtime/tasks/${taskId}/information-result`)) {
        if (mode === 'error') return route.fulfill({ status: 503, json: { error: 'unavailable' } });
        return route.fulfill({ json: { data: {
          status: mode === 'completed' ? 'completed' : 'failed', executionId: mode === 'stale' ? laterExecutionId : executionId,
          summary: mode === 'completed' ? 'Fictional source summary.' : null, finalResponse: mode === 'completed' ? 'Reviewed fictional evidence.' : null,
          reason: mode === 'completed' ? null : mode === 'other_failure' ? 'provider_timeout' : 'information_lease_lost', nextResponsible: { role: mode === 'completed' ? 'verifier' : 'manager', name: mode === 'completed' ? 'Fictional verifier' : 'Fictional manager' },
          sources: [{ id: taskId, title: 'Fictional source', revision: '2026-10-16T00:00:00Z' }],
          budget: { maxAttempts: 1, maxDurationSeconds: 600, maxOutputTokensIntent: 1200, tokenCostEnforcement: 'unavailable' },
          execution: { attempt: 1, checkpoint: 'claimed', startedAt: null, completedAt: null, events: [], eventsTruncated: false }, review: mode === 'reviewed' ? { decision: 'accept', summary: 'Already reviewed' } : null } } });
      }
      if (url.includes(`/v1/tasks/${taskId}`)) return route.fulfill(mode === 'foreign'
        ? { status: 404, json: { error: 'not_found' } }
        : { json: { data: { id: taskId, title: 'Review fictional Worker finding', status: mode === 'closed' ? 'done' : 'todo' } } });
      if (url.includes('/v1/tasks?')) return route.fulfill({ json: { data: [] } });
      if (url.includes('/v1/departments')) return route.fulfill({ json: { data: { departments: [] } } });
      if (url.includes('/v1/task-proposals')) return route.fulfill({ json: { data: { items: [], page: 0, hasMore: false } } });
      return route.fulfill({ json: { data: {} } });
    });
    if (['paginated', 'reviewed', 'closed'].includes(mode)) await page.goto(`${origin}${target}`);
    else {
      await page.goto(`${origin}/areas?area=00-ogolny&view=overview`);
      await page.getByRole('button', { name: /Review fictional Worker finding/ }).first().click();
      await page.locator(`a[href="${target}"]`).click();
    }
    await page.getByRole('dialog').waitFor();
    if (['stale', 'reviewed', 'closed'].includes(mode)) {
      await page.getByText(locale === 'pl' ? 'Karta Today jest nieaktualna.' : 'This Today card is out of date.').waitFor();
      assert.equal(await page.getByText('Fictional source').count(), 0);
    } else if (mode === 'foreign' || mode === 'error') {
      await page.getByText(locale === 'pl' ? 'Nie można odczytać zadania lub wyniku w tym workspace.' : 'The task or result cannot be read in this workspace.').waitFor();
      assert.equal(await page.getByText('Fictional source').count(), 0);
    } else {
      await page.getByText(mode === 'completed' ? 'Fictional source summary.' : mode === 'other_failure' ? locale === 'pl' ? /Próba zakończyła się bez potwierdzonego wyniku/ : /The attempt stopped without a verified result/ : locale === 'pl' ? /Worker utracił dzierżawę wykonania/ : /Worker lost its execution lease/).waitFor();
      await page.getByText('Fictional source', { exact: false }).last().waitFor();
      await page.getByText(mode === 'completed' ? 'Fictional verifier' : 'Fictional manager').last().waitFor();
      await page.getByText(locale === 'pl' ? 'Bezpieczny następny krok' : 'Safe next step').waitFor();
      assert.equal(await page.getByRole('button', { name: /Autoryzuj|Authorize|Retry|Ponów/ }).count(), 0);
    }
    assert.equal(await page.locator('html').evaluate(element => element.scrollWidth <= window.innerWidth + 1), true, `${locale}/${width}/${mode}: horizontal overflow`);
    await page.keyboard.press('Escape');
    await page.waitForURL(/attentionTaskId=/);
    if (['reviewed', 'closed'].includes(mode)) assert.equal(await page.locator('.roost-decision-inspector').count(), 0);
    else {
      await page.locator('.roost-decision-inspector').waitFor();
      await page.waitForFunction(() => document.activeElement === document.querySelector('.roost-decision-inspector button'));
      assert.equal(await page.locator('.roost-decision-inspector button').first().evaluate(element => element === document.activeElement), true, `${locale}/${width}/${mode}: inspector focus`);
      await page.locator('.roost-decision-inspector button').first().click();
      assert.equal(await page.locator(`[data-attention-key="result:${taskId}"]`).evaluate(element => element === document.activeElement), true, `${locale}/${width}/${mode}: restored card focus`);
    }
    assert.equal(errors.length, 0, `${locale}/${width}/${mode}: ${errors.join('; ')}`);
    checked++;
    await page.close();
  }
  console.log(`Today failed/result UI: ${checked} PL/EN responsive read-only journeys passed`);
} finally { await browser.close(); server.close(); }
