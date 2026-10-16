import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const procedureId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const roleId = '33333333-3333-4333-8333-333333333333';
const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {ProceduresWorkbench} from './web/src/features/departments/procedures-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><ProceduresWorkbench /></LanguageProvider>);", resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
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
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], writes = [];
    let activationAttempts = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    let procedure = { id: procedureId, familyId: procedureId, name: 'Fictional baseline review', purpose: 'Inspect a fictional application',
      scope: 'One selected project', expectedResult: 'Reviewable finding', requiredTools: [], requiredPermissions: [],
      status: 'draft', version: 1, process: null, ownerRole: null, updatedAt: '2026-10-16T12:00:00.000Z',
      organizationalContext: { ownerDepartment: { key: '04-operacje' }, relatedDepartments: [], applicableDepartments: [], scopes: [] },
      steps: [{ id: '44444444-4444-4444-8444-444444444444', stepOrder: 1, instruction: 'Inspect the baseline', stepType: 'manual',
        expectedInput: {}, expectedOutput: { description: 'Original finding', format: 'markdown' }, validationRule: {}, rollbackInstruction: null }] };
    await page.route('**/v1/**', route => {
      const req = route.request(), pathname = new URL(req.url()).pathname;
      if (req.method() === 'GET' && pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaces: [{ active: true, role: 'owner' }] } } });
      if (req.method() === 'GET' && pathname === '/v1/process-core/procedures') return route.fulfill({ json: { data: [procedure] } });
      if (req.method() === 'GET' && pathname === '/v1/company-os/processes') return route.fulfill({ json: { data: [] } });
      if (req.method() === 'GET' && pathname === '/v1/company-os/tool-adapters') return route.fulfill({ json: { data: [] } });
      if (req.method() === 'GET' && pathname === '/v1/company-os/integration-capabilities') return route.fulfill({ json: { data: [] } });
      if (req.method() === 'GET' && pathname === '/v1/connection') return route.fulfill({ json: { data: { capabilities: [] } } });
      if (req.method() === 'GET' && pathname === '/v1/projects') return route.fulfill({ json: { data: [{ id: projectId, name: 'Fictional application project', status: 'active' }] } });
      if (req.method() === 'GET' && pathname === '/v1/company-os/company-roles') return route.fulfill({ json: { data: [{ id: roleId, name: 'Human owner', type: 'human', permissions: ['workspace:admin', 'approval:decide'] }] } });
      if (req.method() === 'GET' && pathname === `/v1/process-core/procedures/${procedureId}/runs`) return route.fulfill({ json: { data: [] } });
      if (req.method() === 'GET' && pathname === `/v1/process-core/procedures/${procedureId}/provenance`) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
      if (req.method() === 'PATCH' && pathname === `/v1/process-core/procedures/${procedureId}`) {
        const body = req.postDataJSON(); writes.push({ kind: 'draft', body });
        procedure = { ...procedure, ...body, ownerRole: { id: roleId, name: 'Human owner' },
          organizationalContext: { ownerDepartment: { key: '04-operacje' }, relatedDepartments: [], applicableDepartments: [], scopes: body.organizationalContext.scopes },
          steps: body.steps.map((step, index) => ({ ...step, id: procedure.steps[index]?.id || crypto.randomUUID(), stepOrder: index + 1 })),
          updatedAt: '2026-10-16T12:01:00.000Z' };
        return route.fulfill({ json: { data: procedure } });
      }
      if (req.method() === 'POST' && pathname === `/v1/process-core/procedures/${procedureId}/actions/activate`) {
        const body = req.postDataJSON(); writes.push({ kind: 'activate', body });
        activationAttempts++;
        if (activationAttempts === 1) return route.fulfill({ status: 409, json: { error: 'procedure_activation_incomplete',
          errorDetails: { details: { blockers: ['step_2_success_missing'] } } } });
        procedure = { ...procedure, status: 'active', updatedAt: '2026-10-16T12:02:00.000Z' };
        return route.fulfill({ json: { data: procedure } });
      }
      throw new Error(`Unexpected ${req.method()} ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const editButton = page.getByRole('button', { name: pl ? 'Edytuj' : 'Edit' }).filter({ visible: true }).first();
    await editButton.waitFor();
    await editButton.click();
    const editor = page.getByRole('dialog', { name: /Fictional baseline review/ });
    await editor.getByRole('combobox', { name: pl ? 'Zakres uruchomienia' : 'Launch applicability' }).selectOption('project');
    await editor.getByRole('combobox', { name: pl ? 'Projekt' : 'Project' }).selectOption(projectId);
    await editor.getByRole('combobox', { name: pl ? 'Odpowiedzialna rola' : 'Accountable role' }).selectOption(roleId);
    await editor.getByRole('textbox', { name: pl ? 'Pola wejściowe kroku 1' : 'Input fields for step 1' }).fill('sourceRevision');
    await editor.getByRole('textbox', { name: pl ? 'Wynik kroku 1' : 'Output for step 1' }).fill('Dated finding with source link');
    await editor.getByRole('textbox', { name: pl ? 'Warunek sukcesu kroku 1' : 'Success condition for step 1' }).fill('The finding is independently reviewable');
    await editor.getByRole('spinbutton', { name: pl ? 'Limit prób kroku 1' : 'Attempt limit for step 1' }).fill('1');
    await editor.getByRole('textbox', { name: pl ? 'Plan awaryjny kroku 1' : 'Fallback for step 1' }).fill('Stop and ask the owner');
    await editor.getByRole('button', { name: pl ? 'Dodaj krok' : 'Add step' }).click();
    await editor.getByRole('textbox', { name: pl ? 'Instrukcja kroku 2' : 'Instruction for step 2' }).fill('Record the owner review');
    await editor.getByRole('textbox', { name: pl ? 'Wynik kroku 2' : 'Output for step 2' }).fill('Owner review note');
    await editor.getByRole('textbox', { name: pl ? 'Warunek sukcesu kroku 2' : 'Success condition for step 2' }).fill('Owner has recorded a decision');
    await editor.getByRole('spinbutton', { name: pl ? 'Limit prób kroku 2' : 'Attempt limit for step 2' }).fill('1');
    await editor.getByRole('textbox', { name: pl ? 'Plan awaryjny kroku 2' : 'Fallback for step 2' }).fill('Stop without approval');
    await editor.getByRole('button', { name: pl ? 'Zapisz szkic' : 'Save draft' }).press('Enter');
    await page.getByRole('heading', { name: 'Fictional baseline review' }).waitFor();
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].body.organizationalContext.scopes, [{ type: 'project', entityId: projectId }]);
    assert.equal(writes[0].body.ownerRoleId, roleId);
    assert.deepEqual(writes[0].body.steps[0].expectedInput, { sourceRevision: {} });
    assert.deepEqual(writes[0].body.steps[0].expectedOutput, { format: 'markdown', description: 'Dated finding with source link' });
    assert.deepEqual(writes[0].body.steps[0].validationRule, { success: 'The finding is independently reviewable', maxAttempts: 1 });
    assert.equal(writes[0].body.steps[0].rollbackInstruction, 'Stop and ask the owner');
    assert.equal(writes[0].body.steps.length, 2);
    assert.equal(writes[0].body.steps[1].instruction, 'Record the owner review');
    await page.getByRole('button', { name: pl ? 'Aktywuj' : 'Activate' }).click();
    const review = page.getByRole('dialog', { name: 'Fictional baseline review · v1', exact: true });
    await review.getByText(`project: ${projectId}`).waitFor();
    await review.getByText('The finding is independently reviewable').waitFor();
    assert.equal(writes.length, 1, 'opening review never activates');
    await page.keyboard.press('Escape');
    await review.waitFor({ state: 'detached' });
    assert.equal(await review.count(), 0, 'Escape closes the review');
    await page.getByRole('button', { name: pl ? 'Aktywuj' : 'Activate' }).click();
    await Promise.all([
      page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/v1/process-core/procedures/${procedureId}/actions/activate`),
      review.getByRole('button', { name: pl ? 'Aktywuj tę wersję' : 'Activate this version' }).press('Enter')
    ]);
    await review.getByText(pl ? 'Krok 2: brak warunku sukcesu.' : 'Step 2: success rule is missing.', { exact: false }).waitFor();
    assert.equal(writes.length, 2);
    assert.deepEqual(writes[1], { kind: 'activate', body: { expectedVersion: 1, expectedUpdatedAt: '2026-10-16T12:01:00.000Z' } });
    await review.getByRole('button', { name: pl ? 'Wróć' : 'Back' }).click();
    await review.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: pl ? 'Aktywuj' : 'Activate' }).click();
    await review.waitFor({ state: 'visible' });
    await Promise.all([
      page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/v1/process-core/procedures/${procedureId}/actions/activate`),
      review.getByRole('button', { name: pl ? 'Aktywuj tę wersję' : 'Activate this version' }).click()
    ]);
    assert.equal(writes.length, 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${locale}/${width} overflow`);
    assert.deepEqual(errors, []);
    checks++; await page.close();
  }
  console.log(`procedure editor UI: ${checks} PL/EN viewport journeys passed`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
