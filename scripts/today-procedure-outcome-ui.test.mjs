import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const procedureId = '11111111-1111-4111-8111-111111111111';
const runId = '22222222-2222-4222-8222-222222222222';
const stepId = '33333333-3333-4333-8333-333333333333';
const taskId = '44444444-4444-4444-8444-444444444444';
const projectId = '55555555-5555-4555-8555-555555555555';
const title = 'Fictional review · 1. Inspect the delivered packet';
const target = `/areas?area=04-operacje&view=procedures&procedureId=${procedureId}&runId=${runId}&stepId=${stepId}&from=attention`;
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{useAppLocation,useClientNavigation}from'./web/src/app-navigation';import{GeneralDashboard}from'./web/src/features/departments/general-dashboard';import{ProceduresWorkbench}from'./web/src/features/departments/procedures-workbench';function App(){useClientNavigation();const location=useAppLocation();return location.includes('view=procedures')?<ProceduresWorkbench/>:<GeneralDashboard/>}createRoot(document.getElementById('root')).render(<LanguageProvider><App/></LanguageProvider>);`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built CSS required');
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((req, res) => {
  if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css); }
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main id="root" style="padding:12px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
const origin = `http://127.0.0.1:${server.address().port}`;
let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
    const errors = [], writes = [];
    let accepted = false, failRunListOnce = true;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    const attention = () => ({ id: stepId, kind: 'procedure_result', title, status: 'owner_review', severity: 'medium',
      reason: 'procedure_outcome_pending', responsible: 'Fictional owner', related: 'Fictional project',
      provenance: 'procedure_run', provenanceConfirmed: true, target });
    const procedure = { id: procedureId, familyId: procedureId, name: 'Fictional review', purpose: 'Inspect a fictional packet',
      status: 'active', version: 3, updatedAt: '2026-10-17T09:00:00Z', scope: 'One project', expectedResult: 'Owner assessed packet',
      requiredTools: [], requiredPermissions: [], process: null, ownerRole: { id: procedureId, name: 'Fictional owner' },
      steps: [{ id: stepId, stepOrder: 1, instruction: 'Inspect the delivered packet', stepType: 'manual', expectedInput: {},
        expectedOutput: { packet: 'Inspected' }, validationRule: { success: 'Evidence reviewed' }, rollbackInstruction: 'Return' }] };
    const run = () => ({ id: runId, procedureId, procedureVersion: 3, projectId, projectName: 'Fictional project',
      inputSnapshot: {}, createdAt: '2026-10-17T09:00:00Z', status: accepted ? 'owner_accepted' : 'tasks_done_evidence_pending',
      steps: [{ id: stepId, order: 1, instruction: 'Inspect the delivered packet', task: { id: taskId, title, status: 'done' },
        outputEvidence: accepted ? [{ id: stepId, evidence: { summary: 'The packet was inspected', references: [] }, recordedAt: '2026-10-17T10:00:00Z' }] : [],
        outcomeHistory: accepted ? [{ id: stepId, decision: 'accept', evidence: { summary: 'The packet was inspected' }, reason: null }] : [], exception: null }] });
    await page.route('**/v1/**', route => {
      const request = route.request(), url = new URL(request.url()), name = url.pathname;
      if (request.method() === 'POST') {
        writes.push({ path: name, body: request.postDataJSON() });
        if (name === `/v1/process-core/procedure-runs/${runId}/steps/${stepId}/outcomes`) {
          accepted = true; return route.fulfill({ status: 201, json: { data: { outcomeId: stepId, replayed: false } } });
        }
        return route.fulfill({ status: 405, json: { error: 'unexpected_write' } });
      }
      if (name === '/v1/dashboard/command') return route.fulfill({ json: { data: { summary: {}, departmentSignals: [], latestRouteProposals: [],
        attentionTotal: accepted ? 0 : 1, attentionHasMore: false, priorityItems: accepted ? [] : [attention()] } } });
      if (name === '/v1/dashboard/attention') return route.fulfill({ json: { data: { items: accepted ? [] : [attention()], totalCount: accepted ? 0 : 1,
        decisionCount: 0, hasMore: false, nextOffset: accepted ? 0 : 1 } } });
      if (name === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaces: [{ active: true, role: 'owner' }] } } });
      if (name === '/v1/process-core/procedures') return route.fulfill({ json: { data: [procedure] } });
      if (name === `/v1/process-core/procedures/${procedureId}/runs`) {
        if (failRunListOnce) { failRunListOnce = false; return route.fulfill({ status: 503, json: { error: 'history_unavailable' } }); }
        return route.fulfill({ json: { data: [] } });
      }
      if (name === `/v1/process-core/procedure-runs/${runId}`) return route.fulfill({ json: { data: run() } });
      if (name === `/v1/process-core/procedures/${procedureId}/provenance`) return route.fulfill({ status: 503, json: { error: 'provenance_unavailable' } });
      if (name === '/v1/projects' || name === '/v1/company-os/processes' || name === '/v1/company-os/tool-adapters'
        || name === '/v1/company-os/integration-capabilities' || name === '/v1/departments'
        || name === '/v1/agent-runtime/task-proposals' || name === '/v1/agent-runtime/task-proposal-mandate-candidates')
        return route.fulfill({ json: { data: name === '/v1/departments' ? { departments: [] }
          : name === '/v1/agent-runtime/task-proposals' ? { items: [], hasMore: false, page: 0 }
            : name === '/v1/agent-runtime/task-proposal-mandate-candidates' ? { items: [], truncated: false } : [] } });
      if (name === '/v1/connection') return route.fulfill({ json: { data: { capabilities: [] } } });
      throw new Error(`Unexpected ${request.method()} ${name}`);
    });
    await page.goto(`${origin}/areas?area=00-ogolny&view=overview`);
    const card = page.getByRole('button', { name: new RegExp('Fictional review') }).first();
    await card.waitFor(); await card.press('Enter');
    const inspector = page.locator('.roost-decision-inspector');
    await inspector.getByText('Fictional owner').waitFor();
    await inspector.getByText(pl ? /Powiązane ręczne Zadanie jest ukończone/ : /The linked manual Task is complete/).waitFor();
    const link = inspector.locator(`a[href='${target}']`);
    await link.press('Enter');
    await page.waitForURL(/stepId=/);
    assert.equal(new URL(page.url()).searchParams.get('stepId'), stepId);
    const panel = page.locator('[data-procedure-launch]');
    await panel.getByText(pl ? 'Nie udało się odświeżyć historii lub projektów' : 'Could not refresh history or projects').waitFor();
    await panel.getByText('Inspect the delivered packet').last().waitFor();
    assert.equal(await panel.getByText(pl ? 'Nie ma jeszcze przebiegów tej procedury.' : 'No runs for this procedure yet.').count(), 0,
      'the exact run survives an unavailable run list');
    await panel.getByRole('button', { name: pl ? 'Odśwież' : 'Refresh' }).click();
    const focused = panel.locator('li[tabindex="-1"]').filter({ hasText: 'Inspect the delivered packet' }).last();
    await focused.waitFor();
    assert.equal(await focused.evaluate(element => document.activeElement === element), true, 'exact step receives focus');
    await panel.getByRole('textbox', { name: pl ? 'Dowód lub opis wyniku' : 'Evidence or output summary' }).fill('The packet was inspected');
    await panel.getByRole('button', { name: pl ? 'Zapisz ocenę' : 'Record decision' }).click();
    await panel.getByText(pl ? 'Historia ocen:' : 'Decision history:').waitFor();
    await panel.getByText(pl ? /Nowa ocena zmieni bieżący wynik kroku/ : /A new assessment changes the step/).waitFor();
    await panel.getByText(pl ? 'Ten krok nie oczekuje już na ocenę w Dzisiaj.' : 'This step no longer awaits assessment in Today.').waitFor();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, `/v1/process-core/procedure-runs/${runId}/steps/${stepId}/outcomes`);
    const back = panel.getByRole('link', { name: pl ? 'Wróć do Dzisiaj' : 'Return to Today' });
    await back.press('Enter');
    await page.waitForURL(/attentionProcedureStepId=/);
    await page.getByText(pl ? 'Żadna bieżąca pozycja nie pasuje do tego linku.' : 'No current attention item matches this link.').waitFor();
    assert.equal(await page.getByRole('button', { name: new RegExp('Fictional review') }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${locale}/${width}: overflow`);
    assert.deepEqual(errors, [], `${locale}/${width}: page errors`);
    await page.close(); checks++;
  }
} finally { await browser.close(); server.close(); await once(server, 'close'); }
console.log(`Today procedure assessment UI: ${checks} PL/EN narrow/wide journeys passed`);
