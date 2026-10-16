import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const procedureId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const procedure = { id: procedureId, name: 'Synthetic review procedure', version: 3, status: 'active', updatedAt: '2026-10-16T12:00:00.000Z',
  steps: [{ expectedInput: { brief: 'Brief' } }] };
const bundle = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {ProcedureLaunchPanel} from './web/src/features/departments/procedure-launch-panel';const procedure=${JSON.stringify(procedure)};createRoot(document.getElementById('root')).render(<LanguageProvider><ProcedureLaunchPanel procedure={procedure}/></LanguageProvider>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built app CSS is required');
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].contents); }
  if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css); }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><main class="mx-auto max-w-5xl p-3" id="root"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) for (const mode of ['eligible', 'blocked']) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const writes = [], errors = [];
    let previewReads = 0, launched = false, failHistoryRead = false, outcomeWrites = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', route => {
      const req = route.request(), pathname = new URL(req.url()).pathname;
      if (req.method() === 'GET' && pathname === '/v1/projects') return route.fulfill({ json: { data: [{ id: projectId, name: 'Fictional project', status: 'active' }] } });
      if (req.method() === 'GET' && pathname === `/v1/process-core/procedures/${procedureId}/runs`) {
        if (failHistoryRead) return route.fulfill({ status: 500, json: { error: { code: 'history_unavailable' } } });
        return route.fulfill({ json: { data: launched ? [{ id: 'run-1', procedureVersion: 3, projectId, projectName: 'Fictional project',
          inputSnapshot: { brief: 'Changed input' }, createdAt: '2026-10-16T12:00:00.000Z', status: 'tasks_done_evidence_pending',
          steps: [{ id: 'step-1', order: 1, task: { id: 'task-1', title: 'Review the brief', status: 'done' },
            outputEvidence: [], outcomeHistory: [{ id: 'outcome-1', decision: 'exception', evidence: { summary: 'Earlier owner exception' }, reason: 'Earlier reason' }], exception: null }] }] : [] } });
      }
      if (req.method() === 'POST' && pathname === `/v1/process-core/procedures/${procedureId}/launch-preview`) {
        previewReads++;
        const body = req.postDataJSON();
        assert.equal(body.projectId, projectId);
        return route.fulfill({ json: { data: { procedure: { ...procedure, purpose: 'Review a fictional packet', scope: 'One project', expectedResult: 'Accepted packet' },
          project: { id: projectId, name: 'Fictional project', status: 'active' }, ownerRole: { name: 'Human owner', escalation: 'Manager' },
          taskAssigneeUserId: '33333333-3333-4333-8333-333333333333', taskAssigneeLabel: 'Fictional owner', applicability: [{ type: 'company', entityId: null }],
          inputs: body.inputs, steps: [{ id: 'step-1', order: 1, instruction: 'Review the brief', executor: 'manual',
            expectedInput: { brief: 'Brief' }, expectedOutput: { packet: 'Accepted packet' }, validationRule: { success: 'Packet exists', maxAttempts: 2 },
            rollbackInstruction: 'Return to owner', taskTitle: 'Synthetic review procedure · 1. Review the brief' }],
          blockers: mode === 'blocked' ? ['procedure_origin_unverified', 'step_1_executor_unsupported', 'input_missing:context'] : [], digest: 'a'.repeat(64), previewToken: mode === 'blocked' ? null : 'signed-preview',
          expiresAt: '2099-01-01T00:00:00.000Z', effects: { roostNativeTasks: 1, externalWrites: 0, agentExecutions: 0 } } } });
      }
      if (req.method() === 'POST' && pathname === `/v1/process-core/procedures/${procedureId}/actions/launch`) {
        writes.push(req.postDataJSON());
        launched = true;
        return route.fulfill({ status: 201, json: { data: { replayed: false, run: { id: 'run-1', procedureVersion: 3, projectName: 'Fictional project', createdAt: '2026-10-16T12:00:00.000Z', status: 'tasks_open', steps: [] } } } });
      }
      if (req.method() === 'POST' && pathname === '/v1/process-core/procedure-runs/run-1/steps/step-1/outcomes') {
        outcomeWrites++; failHistoryRead = true;
        return route.fulfill({ status: 201, json: { data: { outcomeId: 'outcome-2', replayed: false } } });
      }
      throw new Error(`Unexpected ${req.method()} ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const panel = page.locator('[data-procedure-launch]');
    await panel.getByRole('option', { name: /Fictional project/ }).waitFor({ state: 'attached' });
    const confirm = panel.getByRole('button', { name: pl ? 'Potwierdź i utwórz zadania' : 'Confirm and create tasks' });
    assert.equal(await confirm.count(), 0, 'confirmation is absent before preview');
    await panel.getByRole('combobox').selectOption(projectId);
    await panel.getByRole('textbox', { name: 'brief' }).fill('Synthetic owner input');
    const previewButton = panel.getByRole('button', { name: pl ? 'Pokaż podgląd' : 'Preview launch' });
    await previewButton.press('Enter');
    await confirm.waitFor();
    assert.equal(previewReads, 1);
    await panel.getByText('Human owner').waitFor();
    await panel.getByText('Accepted packet').first().waitFor();
    assert.equal(await confirm.isDisabled(), mode === 'blocked');
    if (mode === 'eligible') {
      await panel.getByRole('textbox', { name: 'brief' }).fill('Changed input');
      assert.equal(await confirm.count(), 0, 'changed input removes stale preview');
      await previewButton.click(); await confirm.waitFor();
      await confirm.press('Enter');
      await panel.getByText(pl ? 'Przebieg i zadania zapisane' : 'Run and tasks saved').waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('tabindex')), '-1', 'focus moves to saved result');
      assert.equal(writes.length, 1);
      assert.equal(writes[0].inputs.brief, 'Changed input');
      assert.match(writes[0].requestId, /^[0-9a-f-]{36}$/i);
      await panel.getByText(projectId, { exact: true }).last().waitFor();
      await panel.getByText(pl ? 'Wyjątek: Earlier owner exception' : 'Exception: Earlier owner exception').waitFor();
      const inputsDetails = panel.getByText(pl ? 'Dane wejściowe przebiegu (tylko właściciel)' : 'Run inputs (owner only)');
      await inputsDetails.click();
      await panel.getByText(/"brief": "Changed input"/).waitFor();
      await panel.getByRole('textbox', { name: pl ? 'Dowód lub opis wyniku' : 'Evidence or output summary' }).fill('Reviewed synthetic output');
      await panel.getByRole('button', { name: pl ? 'Zapisz ocenę' : 'Record decision' }).click();
      await panel.getByText(pl ? 'Ocena zapisana' : 'Decision saved').waitFor();
      await panel.getByText(pl ? 'Nie udało się odświeżyć historii lub projektów' : 'Could not refresh history or projects').waitFor();
      assert.equal(outcomeWrites, 1);
    } else {
      await panel.getByText(pl ? 'Krok 1: typ wykonawcy nie jest obsługiwany.' : 'Step 1: executor type is unsupported.').waitFor();
      await panel.getByText(pl ? 'Uzupełnij dane: context.' : 'Provide input: context.').waitFor();
      assert.deepEqual(writes, []);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${locale}/${width}/${mode} overflow`);
    assert.deepEqual(errors, []);
    checks++; await page.close();
  }
  console.log(`procedure launch UI: ${checks} locale / viewport / state checks passed`);
} finally { await browser.close(); server.close(); }
