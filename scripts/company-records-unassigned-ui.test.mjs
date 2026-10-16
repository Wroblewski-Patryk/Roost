import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const id = number => `22222222-2222-4222-8222-${String(number).padStart(12, '0')}`;
const row = (number, status = 'active') => ({
  id: id(number), title: number === 1 ? 'Triage legacy import' : `Triage record ${number}`,
  key: `triage-${number}`, recordType: number === 1 ? 'architecture_section' : 'requirement',
  status, source: 'documentation-import', verificationState: 'not_started',
  metadata: { sourceKind: number === 1 ? 'legacy_assumption' : 'canonical_documentation',
    sourceSystem: 'fixture-docs' }, updatedAt: '2026-10-17T10:00:00.000Z'
});
const current = Array.from({ length: 26 }, (_, index) => row(index + 1));
const historical = row(90, 'archived');
const full = record => ({ ...record, description: 'Exact private record body',
  businessPurpose: 'Owner inspection', rationale: 'Read only', acceptanceCriteria: ['Fixture criterion'],
  priority: 'high', functionalState: 'unknown', implementationCoverage: 0.25,
  dueDate: '2026-11-01T00:00:00.000Z', projectId: id(901), applicationId: id(902),
  createdAt: '2026-10-01T00:00:00.000Z', organizationalContext: { ownerDepartment: null },
  metadata: { ...record.metadata, sourceId: 'source-1', filePath: 'docs/example.md' } });
const bundle = await build({ stdin: { contents:
  "import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {CompanyRecordsWorkbench} from './web/src/features/departments/company-records-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><CompanyRecordsWorkbench departmentKey='08-zasoby' recordType='knowledge_record' /></LanguageProvider>);",
  resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built CSS required');
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
    let recoveryReads = 0, delayDetail = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      requests.push(`${request.method()} ${pathname}${url.search}`);
      assert.equal(request.method(), 'GET', 'catalog journey is read-only');
      if (pathname === '/v1/auth/me') return route.fulfill({ json: { data: {
        authType: 'user', workspaces: [{ id: 'workspace-a', active: true, role: 'owner' }] } } });
      if (pathname === '/v1/departments') return route.fulfill({ json: { data: { departments: [] } } });
      if (pathname === '/v1/company-records/registry') return route.fulfill({ json: { data: {
        items: [], total: 0, page: 1, pageSize: 50 } } });
      if (pathname === '/v1/company-records/registry/unassigned') {
        const params = url.searchParams, scope = params.get('scope'), q = params.get('q'), pageNumber = Number(params.get('page'));
        assert.equal(params.get('pageSize'), '25');
        if (q === 'recover' && ++recoveryReads === 1) return route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } });
        const matching = scope === 'history' ? [historical] : q === 'missing' ? [] : q === 'legacy' ? [current[0]]
          : q === 'recover' ? [current[0]] : current;
        return route.fulfill({ json: { data: { items: matching.slice((pageNumber - 1) * 25, pageNumber * 25),
          total: matching.length, page: pageNumber, pageSize: 25 } } });
      }
      if (pathname === `/v1/company-records/${id(1)}`) {
        if (delayDetail) await new Promise(resolve => setTimeout(resolve, 350));
        return route.fulfill({ json: { data: full(current[0]) } });
      }
      if (pathname === `/v1/company-records/${id(90)}`) return route.fulfill({ json: { data: full(historical) } });
      if (pathname === `/v1/company-records/${id(1)}/source-audit/task-options`) return route.fulfill({ json: { data: { items: [], hasMore: false } } });
      if (pathname === `/v1/company-records/${id(1)}/source-audit`) return route.fulfill({ json: { data: {
        currentRecord: current[0], currentRevision: current[0].updatedAt, reviews: [],
        reviewHistoryTruncated: false, nextBeforeOrdinal: null, history: [], nextBeforeHistoryOrdinal: null,
        priorBodiesAvailable: false, historyStartsAtMigration: true, overwrittenBeforeMigrationAvailable: false,
        eligibility: { status: 'task_required', reasons: [], task: null, review: null } } } });
      throw new Error(`Unexpected ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=08-zasoby&view=knowledge`);
    await page.getByRole('link', { name: pl ? 'Do uporządkowania' : 'To organize' }).click();
    await page.getByText('Triage legacy import').filter({ visible: true }).first().waitFor();
    assert.match(page.url(), /catalog=unassigned/);
    await page.getByText(pl ? '1–25 z 26' : '1–25 of 26').waitFor();
    await page.getByText(pl ? 'Katalog nie nadaje dopuszczenia' : 'The catalog does not grant eligibility').waitFor();
    assert.equal(await page.getByText('legacy_assumption').count() > 0, true);
    assert.equal(await page.getByText(pl ? 'Sekcja architektury' : 'Architecture section').count() > 0, true);
    if (width === 390) assert.equal(await page.getByText('Triage legacy import · triage-1').isVisible(), true);
    const pages = page.getByRole('navigation', { name: pl ? 'Strony źródeł' : 'Source pages' });
    await pages.getByRole('button', { name: pl ? 'Następna' : 'Next' }).press('Enter');
    await page.getByText('Triage record 26').filter({ visible: true }).first().waitFor();
    await pages.getByRole('button', { name: pl ? 'Poprzednia' : 'Previous' }).press('Enter');
    delayDetail = true;
    await page.getByRole('button', { name: `${pl ? 'Szczegóły' : 'Details'}: Triage legacy import` }).click();
    await page.getByRole('button', { name: `${pl ? 'Audyt źródła' : 'Source audit'}: Triage legacy import` }).click();
    await page.getByRole('dialog', { name: /(?:Pochodzenie i dopuszczenie źródła|Source provenance and eligibility)/ }).waitFor();
    await page.waitForTimeout(450);
    assert.equal(await page.getByRole('dialog').count(), 1, 'late exact read cannot stack a second dialog');
    await page.keyboard.press('Escape');
    delayDetail = false;
    await page.getByRole('button', { name: `${pl ? 'Szczegóły' : 'Details'}: Triage legacy import` }).click();
    const detail = page.getByRole('dialog', { name: 'Triage legacy import' });
    await detail.getByText('Exact private record body').waitFor();
    await detail.getByText('0.25').waitFor();
    await detail.getByText(id(902)).waitFor();
    assert.equal(await detail.locator('input, select, textarea').count(), 0);
    assert.equal(await detail.getByRole('button', { name: pl ? 'Zapisz' : 'Save' }).count(), 0);
    await detail.getByRole('button', { name: pl ? 'Audyt źródła' : 'Source audit' }).click();
    await page.getByRole('dialog', { name: /(?:Pochodzenie i dopuszczenie źródła|Source provenance and eligibility)/ }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: pl ? 'Historia' : 'History' }).press('Enter');
    await page.getByText('Triage record 90').filter({ visible: true }).first().waitFor();
    assert.equal(await page.getByText('Triage legacy import').filter({ visible: true }).count(), 0);
    await page.getByRole('button', { name: pl ? 'Bieżące' : 'Current' }).press('Enter');
    const search = page.getByLabel(pl ? 'Szukaj we wszystkich typach' : 'Search all record types');
    await search.fill('legacy');
    await page.getByText(pl ? '1–1 z 1' : '1–1 of 1').waitFor();
    await search.fill('missing');
    await page.getByText(pl ? 'Brak wyników' : 'No matching records').waitFor();
    await search.fill('recover');
    await page.getByText(pl ? 'Tabela nie mogła się załadować' : 'Table could not load').waitFor();
    await page.getByRole('button', { name: pl ? 'Ponów' : 'Retry' }).click();
    await page.getByText('Triage legacy import').filter({ visible: true }).first().waitFor();
    assert.equal(recoveryReads, 2);
    const bounds = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(bounds.content <= bounds.viewport + 2, `catalog fits ${width}px`);
    assert.deepEqual(errors, []);
    assert.ok(requests.every(request => request.startsWith('GET ')));
    await page.close();
    checks++;
  }
  const member = await browser.newPage();
  let privateReads = 0;
  await member.route('**/v1/**', route => {
    if (new URL(route.request().url()).pathname === '/v1/auth/me') return route.fulfill({ json: { data: {
      authType: 'user', workspaces: [{ id: 'workspace-a', active: true, role: 'member' }] } } });
    privateReads++;
    return route.fulfill({ status: 403, json: { error: 'forbidden' } });
  });
  await member.goto(`http://127.0.0.1:${server.address().port}/areas?area=08-zasoby&view=knowledge&catalog=unassigned`);
  await member.getByText('This view is available only to the owner.').waitFor();
  assert.equal(privateReads, 0, 'member never requests the owner catalog');
  await member.close();
  console.log(`Unassigned CompanyRecords UI: ${checks} PL/EN responsive owner journeys and member refusal passed`);
} finally {
  await browser.close();
  server.close();
}
