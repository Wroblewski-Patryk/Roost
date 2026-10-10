import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const taskId = '00000000-0000-4000-8000-000000000002';
const oldId = '00000000-0000-4000-8000-000000000003';
const approval = { schemaVersion: 'roost-managed-runtime-approval-v1', taskId, applicationId: null,
  executionClass: 'roost-company-information-runtime-v1', installationId: '00000000-0000-4000-8000-000000000004',
  selectionDigest: 'a'.repeat(64), backend: 'codex_responses', riskClass: 'low', mode: 'trusted_provider_pilot',
  residualRiskAccepted: true, acknowledgement: 'windows_account_authority_not_os_isolation' };
const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{CompanyInformationAuthorization}from'./web/src/features/departments/company-information-authorization';createRoot(document.getElementById('root')).render(<LanguageProvider><CompanyInformationAuthorization taskId='${taskId}' taskTitle='Selected source summary' onClose={()=>{}}/></LanguageProvider>);`,
  resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' } });
const server = createServer((req, res) => {
  if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].text); }
  res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><meta charset="utf-8"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true }); let checks = 0;
try {
  for (const previous of [null, { id: oldId, decision: 'Authorize the previous single attempt.' }]) {
    const page = await browser.newPage(); const writes = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('companycoreLocale', 'en'));
    await page.route('**/v1/**', route => {
      const url = route.request().url();
      if (route.request().method() === 'POST') {
        writes.push(route.request().postDataJSON());
        return route.fulfill({ json: { data: { record: { id: oldId } } } });
      }
      if (url.includes('information-approval-candidate')) return route.fulfill({ json: { data: {
        approval, model: 'gpt-5.6-sol', reasoningEffort: 'low', maxDurationSeconds: 600,
        maxOutputTokensIntent: 1200, previousDecision: previous } } });
      return route.fulfill({ json: { data: { expectedVersion: 'b'.repeat(64), canWrite: true,
        authorityCatalog: { workforce: [], departments: [] }, catalog: [], revisions: [], deferrals: [], truncated: false } } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByText('gpt-5.6-sol').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Record proposal' }).isDisabled(), true);
    await page.getByRole('checkbox').check();
    const response = page.waitForResponse(r => r.url().endsWith('/v1/decisions/governance/proposals') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Record proposal' }).click(); await response;
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].managedRuntimeApproval, approval);
    assert.deepEqual(writes[0].scope, [{ type: 'task', id: taskId }]);
    assert.equal(writes[0].supersedesId, previous?.id ?? null);
    if (previous) {
      assert.equal(writes[0].conflicts[0].oldProvision, previous.decision);
      assert.equal(writes[0].conflicts[0].newProvision, writes[0].decision);
      assert.match(writes[0].decision, /one additional/);
    } else assert.deepEqual(writes[0].conflicts, []);
    assert.deepEqual(errors, []); checks += 6;
    await page.close();
  }
  console.log(`Company information authorization UI: ${checks} checks passed`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
