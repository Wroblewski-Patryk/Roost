import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const recordId = '11111111-1111-4111-8111-111111111111';
const taskA = '22222222-2222-4222-8222-222222222222';
const taskB = '33333333-3333-4333-8333-333333333333';
const revision = '2026-10-15T12:00:00.000Z';
const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {CompanyRecordsWorkbench} from './web/src/features/departments/company-records-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><CompanyRecordsWorkbench departmentKey='00-ogolny' recordType='knowledge_record' /></LanguageProvider>);", resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built web CSS is required');
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].contents); }
  if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css); }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
const record = { id: recordId, recordType: 'knowledge_record', key: 'synthetic', title: 'Synthetic import', description: 'Research note', businessPurpose: 'Scoped evidence', source: 'import', metadata: { sourceKind: 'document_import', sourceSystem: 'test_workspace', sourceId: 'source-17', filePath: 'folder/source.md' }, applicationId: null, status: 'active', functionalState: 'unknown', verificationState: 'pending', priority: 'normal', implementationCoverage: null, evidenceCount: 0, updatedAt: revision, createdAt: '2026-10-14T11:00:00.000Z' };
const reviews = {
  other: { id: 'review-a', ordinal: 3, taskId: taskA, action: 'approve', classification: 'fact', provenance: 'primary', environment: 'isolated_test', verificationMethod: 'source_check', verificationRef: 'reference-a', inclusionReason: 'Verified for another task', recordRevision: revision, validFrom: '2026-10-14T12:00:00.000Z', validUntil: '2026-10-30T12:00:00.000Z', createdAt: '2026-10-14T12:00:00.000Z', actorUserId: 'owner-a' },
  selected: { id: 'review-b', ordinal: 4, taskId: taskB, action: 'approve', classification: 'fact', provenance: 'primary', environment: 'isolated_test', verificationMethod: 'source_check', verificationRef: 'reference-b', inclusionReason: 'Verified for this task', recordRevision: revision, validFrom: '2026-10-14T12:00:00.000Z', validUntil: '2026-10-30T12:00:00.000Z', createdAt: '2026-10-15T12:00:00.000Z', actorUserId: 'owner-b' }
};

let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1280]) for (const mode of ['eligible', 'missing_review', 'withdrawn', 'task_archived']) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], requests = [];
    let taskReads = 0, auditReads = 0;
    const delayedCase = locale === 'en' && width === 1280 && mode === 'eligible';
    let releaseOlder, markOlderStarted, delayedOlder = delayedCase;
    const olderHold = new Promise(resolve => { releaseOlder = resolve; });
    const olderStarted = new Promise(resolve => { markOlderStarted = resolve; });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      requests.push(`${request.method()} ${pathname}${url.search}`);
      assert.equal(request.method(), 'GET', 'the panel must stay read-only');
      if (pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaces: [{ id: 'workspace-a', active: true, role: 'owner' }] } } });
      if (pathname === '/v1/company-records') return route.fulfill({ json: { data: [record] } });
      if (pathname === `/v1/company-records/${recordId}`) return route.fulfill({ json: { data: record } });
      if (pathname === '/v1/departments') return route.fulfill({ json: { data: { departments: [] } } });
      if (pathname === `/v1/company-records/${recordId}/source-audit/task-options`) {
        assert.ok(url.searchParams.has('q'), 'bounded task-options query is required');
        taskReads++;
        if (mode === 'missing_review' && taskReads === 1) return route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } });
        return route.fulfill({ json: { data: { items: url.searchParams.get('q') ? [{ id: taskB, title: 'Target task', status: mode === 'task_archived' ? 'archived' : 'active' }] : [{ id: taskA, title: 'Other task', status: 'active' }, { id: taskB, title: 'Target task', status: mode === 'task_archived' ? 'archived' : 'active' }], hasMore: !url.searchParams.get('q') } } });
      }
      if (pathname === `/v1/company-records/${recordId}/source-audit`) {
        auditReads++;
        assert.equal(url.searchParams.get('projection'), 'summary');
        assert.equal(url.searchParams.get('limit'), '25');
        const selected = url.searchParams.get('taskId') === taskB;
        const requestedTask = url.searchParams.get('taskId');
        const review = mode === 'missing_review' ? null : mode === 'withdrawn' ? { ...reviews.selected, action: 'withdraw' } : reviews.selected;
        const olderReviews = url.searchParams.has('beforeOrdinal');
        const olderHistory = url.searchParams.has('beforeHistoryOrdinal');
        if (olderReviews && delayedOlder) { delayedOlder = false; markOlderStarted(); await olderHold; }
        return route.fulfill({ json: { data: {
          currentRecord: record, currentRevision: revision,
          reviews: olderReviews ? [reviews.other] : [mode === 'missing_review' ? { ...reviews.other, id: 'review-other-new', ordinal: 4, inclusionReason: 'Recent review for another task' } : review], reviewHistoryTruncated: !olderReviews, nextBeforeOrdinal: olderReviews ? null : 4,
          history: olderHistory ? [{ ordinal: '6', operation: 'before_update', recordedAt: '2026-10-13T10:00:00.000Z' }] : [{ ordinal: '7', operation: 'before_update', recordedAt: '2026-10-14T10:00:00.000Z' }],
          nextBeforeHistoryOrdinal: olderHistory ? null : '7', priorBodiesAvailable: true, historyStartsAtMigration: true, overwrittenBeforeMigrationAvailable: false,
          eligibility: selected ? { status: mode === 'eligible' ? 'eligible' : 'ineligible', reasons: mode === 'eligible' ? [] : [mode], task: { id: taskB, title: 'Target task', status: mode === 'task_archived' ? 'archived' : 'active' }, review } : requestedTask === taskA ? { status: 'ineligible', reasons: ['missing_review'], task: { id: taskA, title: 'Other task', status: 'active' }, review: null } : { status: 'task_required', reasons: ['task_required'], task: null, review: null }
        } } });
      }
      throw new Error(`Unexpected request: ${request.method()} ${pathname}`);
    });
    const url = `http://127.0.0.1:${server.address().port}/areas?area=00-ogolny&view=knowledge_record`;
    await page.goto(url);
    await page.getByText('Synthetic import').filter({ visible: true }).first().waitFor();
    await page.getByRole('button', { name: `${pl ? 'Pochodzenie i dopuszczenie' : 'Source provenance and eligibility'}: Synthetic import` }).click();
    const dialog = page.getByRole('dialog', { name: /(?:Pochodzenie i dopuszczenie źródła|Source provenance and eligibility)/ });
    await dialog.waitFor();
    assert.equal(await dialog.getAttribute('aria-modal'), 'true');
    await dialog.getByText(pl ? 'Wybierz zadanie, aby sprawdzić dopuszczenie' : 'Choose a task to check eligibility').first().waitFor();
    if (mode === 'missing_review') {
      await dialog.getByText(pl ? 'Nie udało się pobrać zadań.' : 'Tasks could not be loaded.', { exact: false }).waitFor();
      await dialog.getByRole('button', { name: pl ? 'Ponów' : 'Retry' }).click();
      assert.ok(taskReads >= 2 && auditReads >= 2, 'Retry reloads tasks and audit');
    }
    assert.equal(await dialog.getByText(pl ? 'Dopuszczony do wybranego zadania' : 'Eligible for the selected task').count(), 0);
    await dialog.getByText('folder/source.md').waitFor();
    await dialog.getByText(revision, { exact: false }).first().waitFor();
    await dialog.getByText(pl ? 'Wyniki są ograniczone do 30 zadań.' : 'Results are limited to 30 tasks.', { exact: false }).waitFor();
    const select = dialog.getByLabel(pl ? 'Zadanie do sprawdzenia' : 'Task to check');
    assert.match(await select.locator(`option[value="${taskB}"]`).textContent(), /33333333/, 'task options distinguish duplicate titles by ID');
    await select.focus();
    await select.press('ArrowDown');
    await select.press('ArrowDown');
    await select.press('Enter');
    assert.equal(await select.inputValue(), taskB, 'task must be selectable by keyboard');
    await dialog.getByText(mode === 'eligible' ? pl ? 'Dopuszczony do wybranego zadania' : 'Eligible for the selected task' : pl ? 'Niedopuszczony do wybranego zadania' : 'Ineligible for the selected task').waitFor();
    if (mode === 'missing_review') await dialog.getByText(pl ? 'Brakuje wystarczającego dowodu dopuszczenia.' : 'Sufficient eligibility proof is missing.', { exact: false }).waitFor();
    if (mode === 'withdrawn') await dialog.getByText(pl ? 'Dopuszczenie zostało wycofane' : 'Approval was withdrawn').waitFor();
    if (mode === 'task_archived') await dialog.getByText(pl ? 'Zadanie zostało zarchiwizowane' : 'Task is archived').waitFor();
    await dialog.getByText(pl ? 'Izolowane testy' : 'Isolated test').first().waitFor();
    if (mode === 'withdrawn') await dialog.getByText(pl ? 'Wycofanie' : 'Withdraw').first().waitFor();
    if (mode === 'eligible') await dialog.getByText('Verified for this task').first().waitFor();
    if (delayedCase) {
      await dialog.getByRole('button', { name: 'Show older reviews' }).click();
      await olderStarted;
      await select.selectOption(taskA);
      await dialog.getByText('Ineligible for the selected task').waitFor();
      const olderReturned = page.waitForResponse(response => response.url().includes('beforeOrdinal=4'));
      releaseOlder();
      await olderReturned;
      await page.waitForTimeout(50);
      assert.equal(await dialog.getByText('Verified for another task').count(), 0, 'late page must not enter the new task audit');
      assert.equal(await dialog.getByRole('button', { name: 'Show older reviews' }).isDisabled(), false, 'task switch clears pagination loading');
      await select.selectOption(taskB);
      await dialog.getByText('Eligible for the selected task').waitFor();
    }
    if (mode === 'eligible') {
      const search = dialog.getByLabel(pl ? 'Szukaj zadania po tytule lub pełnym ID' : 'Search tasks by title or full ID');
      await search.fill('Target');
      const searched = page.waitForResponse(response => response.url().includes('/source-audit/task-options?q=Target'));
      await search.press('Enter');
      await searched;
      assert.equal(await select.inputValue(), taskB, 'selected task stays available after refining the search');
    }
    await dialog.getByRole('button', { name: pl ? 'Pokaż starsze oceny' : 'Show older reviews' }).click();
    await dialog.getByText('Verified for another task').waitFor();
    await dialog.getByRole('button', { name: pl ? 'Pokaż starsze wpisy' : 'Show older entries' }).click();
    await dialog.getByText('#6').waitFor();
    const dimensions = await dialog.evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }));
    assert.ok(dimensions.scrollWidth <= dimensions.width + 2, `dialog must fit ${width}px viewport`);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0, 'Escape closes the dialog');
    assert.deepEqual(errors, []);
    assert.ok(requests.some(request => request.includes(`taskId=${taskB}`)), 'task-scoped audit is required');
    assert.equal(requests.some(request => request.includes('/v1/tasks')), false, 'full task list must not be fetched');
    assert.ok(requests.every(request => request.startsWith('GET ')), 'no mutations');
    if (locale === 'en' && width === 1280 && mode === 'eligible') {
      await page.goto(`${url}&recordId=${recordId}&sourceAudit=1`);
      await page.getByRole('dialog', { name: /Source provenance and eligibility/ }).waitFor();
      await page.keyboard.press('Escape');
    }
    await page.close();
    checks++;
  }
  for (const locale of ['pl', 'en']) {
    const pl = locale === 'pl', requests = [];
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      requests.push(`${request.method()} ${pathname}`);
      if (pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaces: [{ id: 'workspace-a', active: true, role: 'member' }] } } });
      if (pathname === '/v1/company-records') return route.fulfill({ json: { data: [record] } });
      if (pathname === '/v1/departments') return route.fulfill({ json: { data: { departments: [] } } });
      throw new Error(`Member must not request ${request.method()} ${pathname}`);
    });
    const url = `http://127.0.0.1:${server.address().port}/areas?area=00-ogolny&view=knowledge_record`;
    await page.goto(url);
    await page.getByText('Synthetic import').filter({ visible: true }).first().waitFor();
    assert.equal(await page.getByRole('button', { name: `${pl ? 'Pochodzenie i dopuszczenie' : 'Source provenance and eligibility'}: Synthetic import` }).count(), 0);
    await page.goto(`${url}&recordId=${recordId}&sourceAudit=1`);
    await page.getByText(pl ? 'Audyt źródła jest dostępny tylko właścicielowi workspace.' : 'Source audit is available only to the workspace owner.').waitFor();
    assert.equal(await page.getByRole('dialog', { name: /(?:Pochodzenie i dopuszczenie źródła|Source provenance and eligibility)/ }).count(), 0);
    assert.equal(requests.some(request => request.includes('/source-audit')), false);
    await page.close();
    checks++;
  }
  for (const locale of ['pl', 'en']) {
    const pl = locale === 'pl', requests = [];
    let authReads = 0;
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      requests.push(`${request.method()} ${pathname}`);
      if (pathname === '/v1/auth/me') {
        authReads++;
        return authReads === 1 ? route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } }) : route.fulfill({ json: { data: { authType: 'user', workspaces: [{ id: 'workspace-a', active: true, role: 'owner' }] } } });
      }
      if (pathname === '/v1/company-records') return route.fulfill({ json: { data: [record] } });
      if (pathname === `/v1/company-records/${recordId}`) return route.fulfill({ json: { data: record } });
      if (pathname === '/v1/departments') return route.fulfill({ json: { data: { departments: [] } } });
      if (pathname === `/v1/company-records/${recordId}/source-audit/task-options`) return route.fulfill({ json: { data: { items: [], hasMore: false } } });
      if (pathname === `/v1/company-records/${recordId}/source-audit`) return route.fulfill({ json: { data: { currentRecord: record, currentRevision: revision, reviews: [], reviewHistoryTruncated: false, nextBeforeOrdinal: null, history: [], nextBeforeHistoryOrdinal: null, priorBodiesAvailable: false, historyStartsAtMigration: true, overwrittenBeforeMigrationAvailable: false, eligibility: { status: 'task_required', reasons: ['task_required'], task: null, review: null } } } });
      throw new Error(`Unexpected request: ${request.method()} ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=00-ogolny&view=knowledge_record&recordId=${recordId}&sourceAudit=1`);
    await page.getByText(pl ? 'Nie udało się sprawdzić uprawnień do audytu źródła.' : 'Source audit permissions could not be checked.').waitFor();
    assert.equal(await page.getByText(pl ? 'Audyt źródła jest dostępny tylko właścicielowi workspace.' : 'Source audit is available only to the workspace owner.').count(), 0);
    assert.equal(requests.some(request => request.includes('/source-audit')), false, 'unknown permissions must not open the audit');
    await page.getByRole('button', { name: pl ? 'Ponów' : 'Retry' }).click();
    await page.getByRole('dialog', { name: /(?:Pochodzenie i dopuszczenie źródła|Source provenance and eligibility)/ }).waitFor();
    assert.equal(authReads, 2);
    await page.close();
    checks++;
  }
  console.log(`Company source panel UI: ${checks} PL/EN, narrow/wide, eligibility/denial, keyboard, pagination and read-only cases passed`);
} finally {
  await browser.close();
  server.close();
}
