import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const id = number => `11111111-1111-4111-8111-${String(number).padStart(12, '0')}`;
const revision = '2026-10-15T12:00:00.000Z';
const row = (number, title, status = 'active') => ({
  id: id(number), title, key: `record-${number}`, recordType: 'knowledge_record', status,
  priority: 'normal', functionalState: 'unknown', verificationState: 'pending',
  source: 'import', metadata: { sourceKind: 'document_import', sourceSystem: 'fixture_system', sourceId: `source-${number}`, filePath: `folder/${number}.md` },
  updatedAt: revision, createdAt: revision, evidenceCount: 0, activeSuspensionCount: 0,
  organizationalContext: { ownerDepartment: null }
});
const firstPage = [row(1, 'Archive planning note'), ...Array.from({ length: 49 }, (_, index) => row(index + 2, `Current record ${index + 2}`))];
const secondPage = [row(51, 'Page two record 51'), row(52, 'Page two record 52')];
const historyPage = [row(90, 'Archived contract', 'archived')];
const fullRecord = reference => ({ ...reference, description: 'Full description from exact detail', businessPurpose: 'Specific owner context', acceptanceCriteria: [], implementationCoverage: null, organizationalContext: { ownerDepartment: null, relatedDepartments: [], scopes: [] } });

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
let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1280]) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    const requests = [], errors = [];
    let recoverReads = 0, releaseOld, markOldStarted;
    const oldHold = new Promise(resolve => { releaseOld = resolve; });
    const oldStarted = new Promise(resolve => { markOldStarted = resolve; });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      requests.push(`${request.method()} ${pathname}${url.search}`);
      assert.equal(request.method(), 'GET', 'the register and source audit must use reads in this test');
      if (pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaces: [{ id: 'workspace-a', active: true, role: 'owner' }] } } });
      if (pathname === '/v1/departments') return route.fulfill({ json: { data: { departments: [] } } });
      if (pathname === `/v1/company-records/${id(1)}`) return route.fulfill({ json: { data: fullRecord(firstPage[0]) } });
      if (pathname === `/v1/company-records/${id(90)}`) return route.fulfill({ json: { data: fullRecord(historyPage[0]) } });
      if (pathname === `/v1/company-records/${id(1)}/source-audit/task-options`) return route.fulfill({ json: { data: { items: [], hasMore: false } } });
      if (pathname === `/v1/company-records/${id(1)}/source-audit`) return route.fulfill({ json: { data: { currentRecord: firstPage[0], currentRevision: revision, reviews: [], reviewHistoryTruncated: false, nextBeforeOrdinal: null, history: [], nextBeforeHistoryOrdinal: null, priorBodiesAvailable: false, historyStartsAtMigration: true, overwrittenBeforeMigrationAvailable: false, eligibility: { status: 'task_required', reasons: ['task_required'], task: null, review: null } } } });
      if (pathname === '/v1/company-records/registry') {
        const params = url.searchParams;
        assert.equal(params.get('recordType'), 'knowledge_record');
        assert.equal(params.get('departmentKey'), '00-ogolny');
        assert.equal(params.get('includeCompanyWide'), 'true');
        assert.equal(params.get('pageSize'), '50');
        const scope = params.get('scope'), q = params.get('q'), currentPage = Number(params.get('page'));
        assert.ok(['current', 'history'].includes(scope));
        assert.ok(Number.isInteger(currentPage) && currentPage >= 1);
        if (q === 'old') { markOldStarted(); await oldHold; return route.fulfill({ json: { data: { items: [row(70, 'Old result')], total: 1, page: currentPage, pageSize: 50 } } }); }
        if (q === 'new') return route.fulfill({ json: { data: { items: [row(71, 'New result')], total: 1, page: currentPage, pageSize: 50 } } });
        if (q === 'none') return route.fulfill({ json: { data: { items: [], total: 0, page: currentPage, pageSize: 50 } } });
        if (q === 'recover') {
          recoverReads++;
          if (recoverReads === 1) return route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } });
          return route.fulfill({ json: { data: { items: [row(72, 'Recovered result')], total: 1, page: currentPage, pageSize: 50 } } });
        }
        if (scope === 'history') return route.fulfill({ json: { data: { items: historyPage, total: 1, page: currentPage, pageSize: 50 } } });
        if (currentPage === 2) return route.fulfill({ json: { data: { items: secondPage, total: 52, page: 2, pageSize: 50 } } });
        return route.fulfill({ json: { data: { items: firstPage, total: 52, page: 1, pageSize: 50 } } });
      }
      throw new Error(`Unexpected request: ${request.method()} ${pathname}`);
    });
    const url = `http://127.0.0.1:${server.address().port}/areas?area=00-ogolny&view=knowledge_record`;
    await page.goto(url);
    await page.getByText('Archive planning note').filter({ visible: true }).first().waitFor();
    await page.getByText(pl ? '1–50 z 52' : '1–50 of 52').first().waitFor();
    await page.getByText(pl ? 'Weryfikacja rekordu nie jest dopuszczeniem do zadania' : 'Record verification is not task eligibility').waitFor();
    assert.equal(await page.getByLabel(pl ? 'Szukaj w rejestrze' : 'Search register').count(), 1);
    const pages = page.getByRole('navigation', { name: pl ? 'Strony rejestru' : 'Register pages', exact: true });
    const topPages = page.getByRole('navigation', { name: pl ? 'Strony rejestru, góra' : 'Register pages, top' });
    if (width === 390) {
      const topBounds = await topPages.boundingBox();
      assert.ok(topBounds && topBounds.y < 900, 'mobile next-page control should be near the top of the register');
    }
    await topPages.getByRole('button', { name: pl ? 'Następna' : 'Next' }).press('Enter');
    await page.getByText('Page two record 51').filter({ visible: true }).first().waitFor();
    await page.getByText(pl ? '51–52 z 52' : '51–52 of 52').first().waitFor();
    await pages.getByRole('button', { name: pl ? 'Poprzednia' : 'Previous' }).press('Enter');
    await page.getByText('Archive planning note').filter({ visible: true }).first().waitFor();
    await page.getByRole('button', { name: `${pl ? 'Edytuj' : 'Edit'}: Archive planning note` }).filter({ visible: true }).first().click();
    const editor = page.getByRole('dialog', { name: /^(?:Edytuj|Edit) / });
    await editor.waitFor();
    assert.equal(await editor.locator('textarea').first().inputValue(), 'Full description from exact detail');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: `${pl ? 'Pochodzenie i dopuszczenie' : 'Source provenance and eligibility'}: Archive planning note` }).filter({ visible: true }).first().click();
    const audit = page.getByRole('dialog', { name: /(?:Pochodzenie i dopuszczenie źródła|Source provenance and eligibility)/ });
    await audit.waitFor();
    assert.match(page.url(), /sourceAudit=1/);
    await audit.getByText(pl ? 'Wybierz zadanie, aby sprawdzić dopuszczenie' : 'Choose a task to check eligibility').first().waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: pl ? 'Historia' : 'History' }).press('Enter');
    await page.getByText('Archived contract').filter({ visible: true }).first().waitFor();
    assert.equal(await page.getByText('Archive planning note').filter({ visible: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: pl ? 'Historia' : 'History' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: `${pl ? 'Zobacz' : 'View'}: Archived contract` }).filter({ visible: true }).first().click();
    const historyDetail = page.getByRole('dialog', { name: /^(?:Zarchiwizowany rekord|Archived record): Archived contract/ });
    await historyDetail.waitFor();
    await historyDetail.getByText('Full description from exact detail').waitFor();
    await historyDetail.getByText(pl ? 'Status: zarchiwizowany' : 'Status: archived').waitFor();
    assert.equal(await historyDetail.getByRole('button', { name: pl ? 'Źródło' : 'Source' }).count(), 1, 'owner can inspect archived source audit');
    assert.equal(await historyDetail.getByRole('button', { name: pl ? 'Zapisz' : 'Save' }).count(), 0);
    assert.equal(await historyDetail.locator('input, select, textarea').count(), 0, 'archived detail is read-only');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: pl ? 'Bieżące' : 'Current' }).press('Enter');
    await page.getByText('Archive planning note').filter({ visible: true }).first().waitFor();
    const search = page.getByLabel(pl ? 'Szukaj w rejestrze' : 'Search register');
    const emptyResponse = page.waitForResponse(response => response.url().includes('q=none'));
    await search.fill('none'); await emptyResponse;
    await page.getByText(pl ? 'Brak wyników' : 'No matching records').waitFor();
    await page.getByText(pl ? '0–0 z 0' : '0–0 of 0').first().waitFor();
    assert.equal(await pages.count(), 1, 'server navigation remains visible for an empty result');
    const errorResponse = page.waitForResponse(response => response.url().includes('q=recover'));
    await search.fill('recover'); await errorResponse;
    await page.getByText(pl ? 'Tabela nie mogła się załadować' : 'Table could not load').waitFor();
    await page.getByRole('button', { name: pl ? 'Ponów' : 'Retry' }).click();
    await page.getByText('Recovered result').filter({ visible: true }).first().waitFor();
    assert.equal(recoverReads, 2);
    if (locale === 'en' && width === 1280) {
      await search.fill('old');
      await oldStarted;
      const newResponse = page.waitForResponse(response => response.url().includes('q=new'));
      await search.fill('new'); await newResponse;
      await page.getByText('New result').filter({ visible: true }).first().waitFor();
      const oldResponse = page.waitForResponse(response => response.url().includes('q=old'));
      releaseOld(); await oldResponse;
      await page.waitForTimeout(50);
      assert.equal(await page.getByText('Old result').filter({ visible: true }).count(), 0, 'late search response must be ignored');
      await page.getByText('New result').filter({ visible: true }).first().waitFor();
      await search.fill('newer');
      const restoredQuery = page.waitForResponse(response => response.url().includes('q=new&'));
      await search.fill('new'); await restoredQuery;
      await page.getByText('New result').filter({ visible: true }).first().waitFor();
      const readsBeforeWhitespace = requests.filter(request => request.includes('/v1/company-records/registry?')).length;
      await search.fill('new ');
      await page.waitForTimeout(350);
      await page.getByText('New result').filter({ visible: true }).first().waitFor();
      assert.equal(requests.filter(request => request.includes('/v1/company-records/registry?')).length, readsBeforeWhitespace, 'whitespace does not strand loading or trigger a different search');
    }
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(dimensions.content <= dimensions.viewport + 2, `register should fit ${width}px viewport`);
    assert.deepEqual(errors, []);
    assert.ok(requests.every(request => request.startsWith('GET ')), 'no writes');
    assert.equal(requests.some(request => request.startsWith('GET /v1/company-records?')), false, 'legacy unbounded list must not load');
    await page.close();
    checks++;
  }
  for (const authMode of ['member', 'retry']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    let authReads = 0, registryReads = 0;
    const memberRequests = [];
    await page.route('**/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      memberRequests.push(`${request.method()} ${pathname}${url.search}`);
      assert.equal(request.method(), 'GET', 'member register test performs no writes');
      if (pathname === '/v1/auth/me') {
        authReads++;
        if (authMode === 'retry' && authReads === 1) return route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } });
        return route.fulfill({ json: { data: { authType: 'user', workspaces: [{ id: 'workspace-a', active: true, role: authMode === 'member' ? 'member' : 'owner' }] } } });
      }
      if (pathname === '/v1/departments') return route.fulfill({ json: { data: { departments: [] } } });
      if (pathname === '/v1/company-records/registry') {
        registryReads++;
        const params = url.searchParams;
        if (authMode === 'member' && params.get('scope') === 'history') return route.fulfill({ json: { data: { items: historyPage, total: 1, page: 1, pageSize: 50 } } });
        if (authMode === 'member' && params.get('q') === 'find') return route.fulfill({ json: { data: { items: [firstPage[0]], total: 1, page: 1, pageSize: 50 } } });
        if (authMode === 'member' && params.get('page') === '2') return route.fulfill({ json: { data: { items: secondPage, total: 52, page: 2, pageSize: 50 } } });
        return route.fulfill({ json: { data: { items: authMode === 'member' ? firstPage : [firstPage[0]], total: authMode === 'member' ? 52 : 1, page: 1, pageSize: 50 } } });
      }
      if (pathname === `/v1/company-records/${id(1)}`) return route.fulfill({ json: { data: fullRecord(firstPage[0]) } });
      if (pathname === `/v1/company-records/${id(90)}`) return route.fulfill({ json: { data: fullRecord(historyPage[0]) } });
      throw new Error(`Unexpected ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=00-ogolny&view=knowledge_record`);
    if (authMode === 'member') {
      await page.getByText('Archive planning note').filter({ visible: true }).first().waitFor();
      assert.equal(registryReads, 1, 'member should read the bounded register');
      assert.equal(await page.getByRole('button', { name: 'Source provenance and eligibility: Archive planning note' }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Create' }).count(), 1, 'member retains existing create action');
      assert.equal(await page.getByRole('button', { name: 'Edit: Archive planning note' }).count(), 1, 'member retains existing edit action');
      assert.equal(await page.getByRole('button', { name: 'Archive: Archive planning note' }).count(), 1, 'member retains existing archive action');
      const memberTopPages = page.getByRole('navigation', { name: 'Register pages, top' });
      await memberTopPages.getByRole('button', { name: 'Next' }).press('Enter');
      await page.getByText('Page two record 51').filter({ visible: true }).first().waitFor();
      await memberTopPages.getByRole('button', { name: 'Previous' }).press('Enter');
      await page.getByText('Archive planning note').filter({ visible: true }).first().waitFor();
      await page.getByLabel('Search register').fill('find');
      await page.getByText('1–1 of 1').first().waitFor();
      await page.getByRole('button', { name: 'History' }).press('Enter');
      await page.getByText('Archived contract').filter({ visible: true }).first().waitFor();
      await page.getByRole('button', { name: 'View: Archived contract' }).filter({ visible: true }).first().click();
      const memberHistory = page.getByRole('dialog', { name: 'Archived record: Archived contract' });
      await memberHistory.getByText('Full description from exact detail').waitFor();
      assert.equal(await memberHistory.getByRole('button', { name: 'Source' }).count(), 0);
      assert.equal(await memberHistory.locator('input, select, textarea').count(), 0);
      await page.keyboard.press('Escape');
      await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=00-ogolny&view=knowledge_record&recordId=${id(1)}&sourceAudit=1`);
      await page.getByText('Source audit is available only to the workspace owner.').waitFor();
      assert.equal(await page.getByRole('dialog').count(), 0, 'member deep link must not open source audit');
      assert.equal(memberRequests.some(request => request.includes('/source-audit')), false, 'member never requests source audit');
    } else {
      await page.getByText('Register permissions could not be checked.').waitFor();
      assert.equal(registryReads, 0, 'unknown auth must not request owner register');
      await page.getByRole('button', { name: 'Retry' }).click();
      await page.getByText('Archive planning note').filter({ visible: true }).first().waitFor();
      assert.equal(authReads, 2);
      assert.equal(registryReads, 1);
    }
    await page.close();
    checks++;
  }
  console.log(`Company record register UI: ${checks} PL/EN current/history, server pagination/search, source navigation, error/retry and responsive cases passed`);
} finally {
  await browser.close();
  server.close();
}
