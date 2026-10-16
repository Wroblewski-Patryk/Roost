import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const taskId = '22222222-2222-4222-8222-222222222222';
const recordId = '11111111-1111-4111-8111-111111111111';
const revision = '2026-10-16T12:00:00.000Z';
const digest = 'a'.repeat(64);
const record = { id: recordId, key: 'source-one', title: 'Synthetic owner note', recordType: 'knowledge_record',
  status: 'active', verificationState: 'pending', source: 'owner', updatedAt: revision, createdAt: revision,
  description: 'Current synthetic facts', businessPurpose: 'Task-specific context', metadata: { sourceKind: 'owner_note', sourceId: 'fixture-only' },
  applicationId: null };
const bundle = await build({ stdin: { contents: "import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {TaskPreviewModal} from './web/src/features/departments/operations-route';import {TaskCompanySourceReview} from './web/src/features/departments/task-company-source-review';function App(){const[open,setOpen]=useState(false);const item={id:'22222222-2222-4222-8222-222222222222',task:{id:'22222222-2222-4222-8222-222222222222',title:'Synthetic task',description:'Synthetic fixture',status:'todo',source:'roost',updatedAt:'2026-10-16T12:00:00.000Z'},hierarchy:{taskList:{id:'list',name:'Tasks'}}};return open?<TaskCompanySourceReview taskId={item.id} taskTitle={item.task.title} onClose={()=>setOpen(false)}/>:<TaskPreviewModal item={item} taskLists={[]} statuses={[{key:'todo',label:'To do'}]} onClose={()=>{}} onSaved={()=>{}} onReady={()=>{}} onSources={()=>setOpen(true)}/>};createRoot(document.getElementById('root')).render(<LanguageProvider><App/></LanguageProvider>);", resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'web build CSS required');
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
  for (const locale of ['pl', 'en']) for (const width of [390, 1280]) {
    const pl = locale === 'pl', page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], writes = [];
    let review = null, uncertainResponse = true;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    await page.route('**/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      if (path === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaceId: 'workspace-a',
        workspaces: [{ id: 'workspace-a', role: 'owner' }] } } });
      if (path === '/v1/company-records/task-source-options') {
        assert.equal(request.method(), 'GET');
        assert.equal(url.searchParams.get('taskId'), taskId);
        return route.fulfill({ json: { data: { items: url.searchParams.get('q') === 'Missing' ? [] : [record], hasMore: false } } });
      }
      if (path === `/v1/company-records/${recordId}/source-audit`) {
        assert.equal(request.method(), 'GET');
        assert.equal(url.searchParams.get('projection'), 'current');
        assert.equal(url.searchParams.get('taskId'), taskId);
        return route.fulfill({ json: { data: { currentRecord: record, currentRevision: revision, currentDigest: digest,
          eligibility: { status: review?.action === 'approve' && new Date(review.validUntil) > new Date() ? 'eligible' : 'ineligible',
            reasons: review?.action === 'approve' ? new Date(review.validUntil) > new Date() ? [] : ['expired'] : [review?.action === 'withdraw' ? 'withdrawn' : 'missing_review'],
            task: { id: taskId, title: 'Synthetic task', status: 'active' }, review },
          reviews: review ? [review] : [], nextBeforeOrdinal: null } } });
      }
      if (path === `/v1/company-records/${recordId}/context-reviews`) {
        assert.equal(request.method(), 'POST');
        const body = request.postDataJSON(); writes.push(body);
        assert.equal(body.taskId, taskId); assert.equal(body.expectedRevision, revision);
        if (!review || review.id !== body.requestId) review = { ...body, id: body.requestId, ordinal: writes.length,
          recordRevision: revision, contentDigest: digest, validFrom: revision, createdAt: revision, actorUserId: 'synthetic-owner' };
        if (uncertainResponse) { uncertainResponse = false; await new Promise(resolve => setTimeout(resolve, 150));
          return route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } }); }
        return route.fulfill({ status: 200, json: { data: review } });
      }
      throw new Error(`Unexpected API request ${request.method()} ${path}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('button', { name: pl ? 'Źródła zadania' : 'Task sources' }).click();
    const dialog = page.getByRole('dialog', { name: pl ? 'Źródła dla zadania: Synthetic task' : 'Task sources: Synthetic task' });
    await dialog.waitFor();
    await dialog.getByLabel(pl ? 'Szukaj po tytule, kluczu lub pełnym ID' : 'Search by title, key or full ID').fill('Missing');
    await dialog.getByRole('button', { name: pl ? 'Szukaj' : 'Search' }).click();
    await dialog.getByText(pl ? 'Brak rekordów dla tego wyszukiwania.' : 'No records match this search.').waitFor();
    await dialog.getByLabel(pl ? 'Szukaj po tytule, kluczu lub pełnym ID' : 'Search by title, key or full ID').fill('');
    await dialog.getByRole('button', { name: pl ? 'Szukaj' : 'Search' }).click();
    await dialog.locator(`#task-source-record option[value="${recordId}"]`).waitFor({ state: 'attached' });
    await dialog.getByLabel(pl ? 'Rekord do oceny' : 'Record to review').selectOption(recordId);
    await dialog.getByText('Current synthetic facts').waitFor();
    await dialog.getByText(digest).waitFor();
    assert.equal(await dialog.getByRole('button', { name: pl ? 'Zatwierdź dla tego zadania' : 'Approve for this task' }).isDisabled(), true);
    await dialog.getByLabel(pl ? 'Klasyfikacja' : 'Classification').selectOption('observation');
    await dialog.getByLabel(pl ? 'Pochodzenie' : 'Provenance').fill('Synthetic primary evidence');
    await dialog.getByLabel(pl ? 'Metoda weryfikacji' : 'Verification method').fill('Owner inspection');
    await dialog.getByLabel(pl ? 'Odnośnik dowodu' : 'Evidence reference').fill('fixture-1');
    await dialog.getByLabel(pl ? 'Powód włączenia' : 'Inclusion reason').fill('Needed only for this task');
    const tomorrow = new Date(Date.now() + 86400000);
    await dialog.getByLabel(pl ? 'Ważne do' : 'Valid until').fill(tomorrow.toISOString().slice(0, 16));
    const approve = dialog.getByRole('button', { name: pl ? 'Zatwierdź dla tego zadania' : 'Approve for this task' });
    const writeStarted = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/context-reviews'));
    const uncertainClick = approve.click();
    await writeStarted;
    const pickerLocked = await dialog.getByLabel(pl ? 'Rekord do oceny' : 'Record to review').isDisabled();
    await uncertainClick;
    assert.equal(pickerLocked, true, 'picker must be locked while a governance write is pending');
    await dialog.getByText(pl ? 'Nie udało się zapisać oceny' : 'Review could not be saved').waitFor();
    await approve.click();
    await dialog.getByText(pl ? 'Dopuszczony' : 'Eligible', { exact: true }).waitFor();
    assert.equal(writes.length, 2);
    assert.deepEqual(writes[0], writes[1], 'uncertain retry must preserve exact request ID and body');
    await dialog.getByLabel(pl ? 'Powód wycofania' : 'Withdrawal reason').fill('No longer reliable');
    await dialog.getByRole('button', { name: pl ? 'Wycofaj dla tego zadania' : 'Withdraw for this task' }).click();
    await dialog.getByText(pl ? 'Niedopuszczony' : 'Ineligible', { exact: true }).waitFor();
    assert.equal(writes[2].action, 'withdraw');
    assert.equal(writes[2].inclusionReason, 'No longer reliable');
    assert.equal(writes[2].taskId, taskId);
    review = { ...review, id: 'expired-review', ordinal: 8, action: 'approve', validUntil: '2020-01-01T00:00:00.000Z' };
    await page.reload();
    await page.getByRole('button', { name: pl ? 'Źródła zadania' : 'Task sources' }).click();
    const expiredDialog = page.getByRole('dialog', { name: pl ? 'Źródła dla zadania: Synthetic task' : 'Task sources: Synthetic task' });
    await expiredDialog.getByLabel(pl ? 'Rekord do oceny' : 'Record to review').selectOption(recordId);
    await expiredDialog.getByText(pl ? 'Okres ważności minął' : 'Validity period has expired').waitFor();
    await expiredDialog.getByLabel(pl ? 'Powód wycofania' : 'Withdrawal reason').fill('Withdraw expired attestation');
    await expiredDialog.getByRole('button', { name: pl ? 'Wycofaj dla tego zadania' : 'Withdraw for this task' }).click();
    assert.equal(writes[3].action, 'withdraw', 'an expired approval remains withdrawable with history');
    const dimensions = await dialog.evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }));
    assert.ok(dimensions.scrollWidth <= dimensions.width + 2, `dialog overflow at ${width}px`);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.deepEqual(errors, []);
    await page.close(); checks++;
  }
} finally { await browser.close(); server.close(); }
console.log(JSON.stringify({ checks, status: 'ok' }));
