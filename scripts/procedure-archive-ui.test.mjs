import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const procedureId = '11111111-1111-4111-8111-111111111111';
const familyId = '22222222-2222-4222-8222-222222222222';
const output = path.join(os.tmpdir(), 'roost-procedure-archive-ui');
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {ProceduresWorkbench} from './web/src/features/departments/procedures-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><ProceduresWorkbench /></LanguageProvider>);", resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const cssName = (await readdir('public/react/assets')).find((name) => /^index-.*\.css$/.test(name));
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
  for (const locale of ['pl', 'en']) for (const width of [390, 1440]) for (const mode of ['eligible', 'retired', 'identity', 'blocked', 'stale', 'expiredResponse', 'conflictResponse', 'readonly', 'incomplete', 'expired']) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const writes = [], errors = [];
    let reads = 0, status = mode === 'retired' ? 'retired' : 'active', digest = 'a'.repeat(64), listVersion = 3;
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem('companycoreLocale', value), locale);
    const procedure = () => ({ id: procedureId, familyId, name: 'Synthetic operating procedure', purpose: 'Synthetic context', requiredTools: [], requiredPermissions: [], status, version: listVersion, steps: [{ id: '33333333-3333-4333-8333-333333333333', stepOrder: 1, instruction: 'Inspect synthetic evidence', stepType: 'manual' }], updatedAt: '2026-10-15T13:00:00Z' });
    const preview = () => ({ procedure: { id: procedureId, familyId, name: procedure().name, version: mode === 'identity' ? 4 : listVersion, status, updatedAt: procedure().updatedAt }, impact: { steps: 1, procedureContracts: 2, procedureContractVersions: [{ id: 'contract-1', sourceVersion: 'source-a' }, { id: 'contract-2', sourceVersion: 'source-b' }], pipelineStages: [{ id: 'stage-1', status: mode === 'blocked' ? 'active' : 'archived' }], pipelineRuns: [{ id: 'run-1', status: 'completed' }], stageRuns: [], policies: [], applicationLinks: [{ applicationId: 'application-1', required: false }], capabilityLinks: [], taskAdmissions: [], activeExecutions: mode === 'blocked' ? [{ id: 'execution-1', taskId: 'task-1', status: 'running' }] : [], compositionTasks: [], protectedChecklist: false }, blockers: mode === 'blocked' ? ['active_pipeline_stage', 'active_execution'] : [], digest, previewToken: `signed-${reads}`, expiresAt: mode === 'expired' ? '2020-01-01T00:00:00Z' : '2099-01-01T00:00:00Z' });
    await page.route('**/v1/**', async (route) => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (request.method() === 'GET' && pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'user', workspaceId: 'workspace-1', workspaces: [{ id: 'workspace-1', active: true, role: mode === 'readonly' ? 'viewer' : 'owner' }] } } });
      if (request.method() === 'GET' && pathname === '/v1/process-core/procedures') { if (mode === 'identity' && reads >= 1) listVersion = 4; return route.fulfill({ json: { data: [procedure()] } }); }
      if (request.method() === 'GET' && pathname === '/v1/company-os/processes') return route.fulfill({ json: { data: [] } });
      if (request.method() === 'GET' && pathname === '/v1/company-os/tool-adapters') return route.fulfill({ json: { data: [] } });
      if (request.method() === 'GET' && pathname === '/v1/company-os/integration-capabilities') return route.fulfill({ json: { data: [] } });
      if (request.method() === 'GET' && pathname === '/v1/connection') return route.fulfill({ json: { data: { capabilities: [] } } });
      if (request.method() === 'GET' && pathname === `/v1/process-core/procedures/${procedureId}/archive-preview`) { reads++; const data = preview(); if (mode === 'incomplete') delete data.impact.pipelineRuns; return route.fulfill({ json: { data } }); }
      if (request.method() === 'POST' && pathname === `/v1/process-core/procedures/${procedureId}/actions/archive`) {
        const body = request.postDataJSON(); writes.push(body);
        if (['stale', 'expiredResponse', 'conflictResponse'].includes(mode) && writes.length === 1) { digest = 'b'.repeat(64); return route.fulfill({ status: 409, json: { error: mode === 'expiredResponse' ? 'procedure_archive_preview_expired' : mode === 'conflictResponse' ? 'procedure_archive_conflict' : 'procedure_archive_stale' } }); }
        status = 'archived'; return route.fulfill({ json: { data: { procedure: procedure(), auditLogId: 'audit-1', previewDigest: digest, replayed: false } } });
      }
      throw new Error(`Unexpected request: ${request.method()} ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    if (mode === 'retired') await page.getByRole('button', { name: pl ? 'Wszystkie' : 'All', exact: true }).click();
    await page.getByText('Synthetic operating procedure').filter({ visible: true }).first().waitFor();
    await page.getByRole('button', { name: pl ? 'Otwórz' : 'Open' }).filter({ visible: true }).first().click();
    const archiveButton = page.getByRole('button', { name: pl ? 'Archiwizuj' : 'Archive', exact: true });
    if (mode === 'readonly') { assert.equal(await archiveButton.count(), 0); assert.equal(reads, 0); assert.deepEqual(writes, []); }
    else {
      await archiveButton.press('Enter');
      const dialog = page.locator('[data-procedure-archive-dialog]'); await dialog.waitFor();
      assert.equal(await dialog.getAttribute('aria-modal'), 'true');
      assert.equal(reads, 1);
      if (mode === 'incomplete') { await dialog.getByText(pl ? 'Pełny wpływ jest niedostępny. Archiwizacja jest wyłączona.' : 'Complete impact is unavailable. Archiving is disabled.').waitFor(); assert.equal(await dialog.getByRole('button', { name: pl ? 'Archiwizuj tę wersję' : 'Archive this version' }).isDisabled(), true); }
      else {
        await dialog.getByText('application-1').waitFor();
        await dialog.getByText('run-1').waitFor();
        await dialog.getByText(digest).waitFor();
        const confirm = dialog.getByRole('button', { name: pl ? 'Archiwizuj tę wersję' : 'Archive this version' });
        assert.equal(await confirm.isDisabled(), true);
        if (mode === 'eligible' || mode === 'blocked') await page.screenshot({ path: path.join(output, `${locale}-${width}-${mode}.png`), fullPage: true });
        if (mode === 'blocked') { await dialog.getByText(pl ? 'Wykonanie jest aktywne lub przypięte do tej wersji.' : 'An execution is active or pinned to this version.').waitFor(); await dialog.getByText(pl ? 'Aktywny etap procesu używa tej wersji.' : 'An active pipeline stage uses this version.').waitFor(); assert.equal(await confirm.isDisabled(), true); }
        else if (mode === 'expired') { await dialog.getByText(pl ? 'Podgląd jest nieaktualny' : 'Preview is out of date').waitFor(); assert.equal(await confirm.isDisabled(), true); }
        else {
          if (mode === 'identity') {
            await dialog.getByText(pl ? 'Tożsamość lub wersja procedury uległa zmianie. Odśwież rekord i wpływ przed potwierdzeniem.' : 'The procedure identity or version changed. Refresh the record and impact before confirming.').waitFor();
            assert.equal(await confirm.isDisabled(), true);
            await dialog.getByRole('button', { name: pl ? 'Odśwież podgląd' : 'Refresh preview' }).click();
            await dialog.getByText(digest).waitFor();
            assert.equal(reads, 2);
          }
          if (mode === 'eligible') {
            const close = dialog.getByRole('button', { name: pl ? 'Zamknij podgląd archiwizacji' : 'Close archive preview' });
            const refresh = dialog.getByRole('button', { name: pl ? 'Odśwież podgląd' : 'Refresh preview' });
            await close.focus(); await page.keyboard.press('Shift+Tab');
            assert.equal(await refresh.evaluate((element) => element === document.activeElement), true, 'focus wraps to last enabled action');
            await page.keyboard.press('Tab');
            assert.equal(await close.evaluate((element) => element === document.activeElement), true, 'focus wraps to close action');
            await page.keyboard.press('Escape'); assert.equal(await dialog.count(), 0); assert.deepEqual(writes, []);
            await archiveButton.press('Enter'); await dialog.waitFor();
          }
          const reason = dialog.getByRole('textbox', { name: pl ? 'Powód archiwizacji' : 'Reason for archiving' });
          await reason.fill('Short');
          await dialog.getByRole('checkbox').check();
          assert.equal(await confirm.isDisabled(), true);
          await reason.fill('Synthetic owner reason for retiring this version');
          assert.equal(await confirm.isEnabled(), true);
          await confirm.press('Enter');
          if (['stale', 'expiredResponse', 'conflictResponse'].includes(mode)) {
            await dialog.getByText(pl ? 'Podgląd jest nieaktualny' : 'Preview is out of date').waitFor();
            assert.equal(await confirm.isDisabled(), true);
            assert.equal(await dialog.getByRole('heading', { name: pl ? 'Zarchiwizować tę procedurę?' : 'Archive this procedure?' }).count(), 1);
            await dialog.getByRole('button', { name: pl ? 'Odśwież podgląd' : 'Refresh preview' }).click();
            await dialog.getByText(digest).waitFor();
            assert.equal(reads, 2);
            assert.equal(await confirm.isDisabled(), true, 'new preview requires acknowledgement');
            await dialog.getByRole('checkbox').check();
            await confirm.click();
          }
          await dialog.waitFor({ state: 'detached' });
          assert.equal(status, 'archived');
          assert.equal(writes.length, ['stale', 'expiredResponse', 'conflictResponse'].includes(mode) ? 2 : 1);
          for (const body of writes) { assert.equal(body.reason, 'Synthetic owner reason for retiring this version'); assert.match(body.requestId, /^[0-9a-f-]{36}$/i); assert.ok(body.previewToken.startsWith('signed-')); }
          await page.getByText(pl ? 'Procedura zarchiwizowana; historia wersji pozostaje dostępna.' : 'Procedure archived; version history remains available.').waitFor();
        }
      }
    }
    assert.deepEqual(errors, [], `${locale}/${width}/${mode} browser errors`);
    if (!['eligible', 'retired', 'identity', 'stale', 'expiredResponse', 'conflictResponse'].includes(mode)) assert.deepEqual(writes, [], `${locale}/${width}/${mode} writes`);
    if (mode !== 'readonly') assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${locale}/${width}/${mode} horizontal overflow`);
    checks++;
    await page.close();
  }
  console.log(`procedure archive UI: ${checks} locale / viewport / state checks passed; screenshots in ${output}`);
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
