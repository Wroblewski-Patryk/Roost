import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const observedAt = '2026-10-15T12:00:00.000Z';
const provider = (name, overrides = {}) => ({
  provider: name,
  configuration: {
    state: 'configured', credentialState: name === 'clickup' ? 'stored_unverified' : 'refresh_token_unverified',
    active: true, updatedAt: observedAt, lastValidatedAt: null, reason: 'stored_active',
    ...overrides.configuration
  },
  synchronization: {
    state: name === 'clickup' ? 'unknown' : 'recent',
    latestEventType: name === 'clickup' ? null : 'google_drive_changes_reconciled',
    latestEventAt: name === 'clickup' ? null : observedAt,
    lastSuccessAt: name === 'clickup' ? null : observedAt,
    reason: name === 'clickup' ? 'no_observation' : 'latest_success_recent',
    ...overrides.synchronization
  },
  adapter: {
    present: name === 'google_drive',
    connectionStatus: name === 'google_drive' ? 'disconnected' : null,
    healthStatus: name === 'google_drive' ? 'unknown' : null,
    lastSyncAt: null, updatedAt: name === 'google_drive' ? observedAt : null, capabilitiesCount: 0,
    ...overrides.adapter
  },
  settingsHref: name === 'clickup'
    ? '/workspace/settings#workspace-integrations-clickup'
    : '/workspace/settings#workspace-integrations-google-drive'
});
const baseline = () => ({ data: { observedAt, providers: [provider('clickup'), provider('google_drive')] } });

const bundle = await build({
  stdin: {
    contents: "import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from './web/src/i18n/i18n';import {TechnologyRoute} from './web/src/features/departments/technology-route';import {WorkspaceSettingsRoute} from './web/src/features/settings/settings-routes';createRoot(document.getElementById('root')).render(<LanguageProvider>{window.location.pathname === '/workspace/settings' ? <WorkspaceSettingsRoute/> : <TechnologyRoute/>}</LanguageProvider>);",
    resolveDir: process.cwd(), loader: 'tsx'
  },
  bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' }
});
const cssName = (await readdir('public/react/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(cssName, 'built web CSS is required');
const css = await readFile(path.join('public/react/assets', cssName));
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].contents); }
  if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); return response.end(css); }
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch({ headless: true });
let checks = 0;
try {
  for (const locale of ['pl', 'en']) for (const width of [390, 1280]) {
    const pl = locale === 'pl';
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await page.addInitScript(value => localStorage.setItem('companycoreLocale', value), locale);
    const requests = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/v1/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      requests.push(`${request.method()} ${pathname}`);
      assert.equal(request.method(), 'GET', 'status and navigation proof must never write');
      if (pathname === '/v1/connection/integration-status') return route.fulfill({ json: baseline() });
      if (pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'api_key', workspaces: [{ id: 'workspace-a', active: true, role: 'owner', name: 'Test Workspace' }] } } });
      if (pathname === '/v1/connection') return route.fulfill({ json: { data: { scopeMode: 'scoped', integrations: { clickup: { configured: true, active: true }, googleDrive: { configured: true, active: true, hasRefreshToken: true } } } } });
      if (pathname === '/v1/integration-settings/clickup' || pathname === '/v1/integration-settings/google_drive') return route.fulfill({ json: { data: { configured: true, secretConfigured: true, active: true, hasRefreshToken: true, updatedAt: observedAt } } });
      throw new Error(`Unexpected request: ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=09-technologia&view=integrations`);
    await page.getByRole('heading', { name: 'ClickUp' }).waitFor();
    await page.getByRole('heading', { name: 'Google Drive' }).waitFor();
    const clickup = page.getByRole('region', { name: 'ClickUp' });
    const drive = page.getByRole('region', { name: 'Google Drive' });
    await clickup.getByText(pl ? 'Dane dostępowe zapisane; autoryzacja niepotwierdzona' : 'Credentials stored; authorization unverified').waitFor();
    await clickup.getByText(pl ? 'Brak obserwacji synchronizacji' : 'No synchronization observation').waitFor();
    await clickup.getByText(pl ? 'Brak wpisu w katalogu adapterów. Nie oznacza to rozłączenia dostawcy.' : 'No adapter catalog entry. This does not mean the provider is disconnected.').waitFor();
    await drive.getByText(pl ? 'Token odświeżania zapisany; autoryzacja niepotwierdzona' : 'Refresh token stored; authorization unverified').waitFor();
    await drive.getByText(pl ? 'Zapisany niedawny sukces' : 'Recent recorded success').waitFor();
    await drive.getByText(/disconnected/i).waitFor();
    await drive.getByText(pl ? 'Stan katalogu nie potwierdza autoryzacji dostawcy.' : 'Catalog state does not confirm provider authorization.').waitFor();
    assert.equal(await clickup.getByRole('link', { name: pl ? 'Ustawienia ClickUp' : 'ClickUp settings' }).getAttribute('href'), '/workspace/settings#workspace-integrations-clickup');
    assert.equal(await drive.getByRole('link', { name: pl ? 'Ustawienia Google Drive' : 'Google Drive settings' }).getAttribute('href'), '/workspace/settings#workspace-integrations-google-drive');
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(dimensions.content <= dimensions.viewport + 2, `integration view should fit ${width}px viewport`);
    if ((locale === 'pl' && width === 390) || (locale === 'en' && width === 1280)) {
      const targetName = pl ? 'ClickUp' : 'Google Drive';
      const link = page.getByRole('region', { name: targetName }).getByRole('link', { name: pl ? 'Ustawienia ClickUp' : 'Google Drive settings' });
      await link.focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(new RegExp(`/workspace/settings#workspace-integrations-${pl ? 'clickup' : 'google-drive'}$`));
      const target = page.locator(`#workspace-integrations-${pl ? 'clickup' : 'google-drive'}`);
      await target.waitFor();
      assert.equal(await target.getByRole('heading', { name: targetName }).count(), 1, 'hash lands on the exact provider settings row');
      const inViewport = await target.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < window.innerHeight;
      });
      assert.ok(inViewport, 'keyboard navigation must reveal the exact Settings provider row in the viewport');
      await target.getByText(pl
        ? 'Konfiguracja jest aktywna, a dane dostępowe zapisane. Bieżąca autoryzacja u dostawcy nie jest tu potwierdzona.'
        : 'Configuration is active and credentials are stored. Current provider authorization is unverified here.').waitFor();
    }
    assert.deepEqual(errors, []);
    assert.equal(requests.some(request => request.includes('/v1/company-os/tool-adapters')), false, 'Technology no longer infers provider status from adapter catalog');
    assert.ok(requests.every(request => request.startsWith('GET ')), 'browser flow remains read-only');
    await page.close();
    checks++;
  }

  for (const [kind, fixture] of [
    ['stale-failed', { data: { observedAt, providers: [
      provider('clickup', { synchronization: { state: 'stale', latestEventType: 'sync_succeeded', latestEventAt: '2026-10-10T12:00:00.000Z', lastSuccessAt: '2026-10-10T12:00:00.000Z', reason: 'latest_success_stale' } }),
      provider('google_drive', { synchronization: { state: 'failed', latestEventType: 'google_drive_maintenance_failed', latestEventAt: observedAt, lastSuccessAt: '2026-10-10T12:00:00.000Z', reason: 'latest_failed' } })
    ] } }],
    ['prior-configuration', { data: { observedAt, providers: [
      provider('clickup', { synchronization: { state: 'stale', latestEventType: 'sync_succeeded', latestEventAt: '2026-10-15T11:00:00.000Z', lastSuccessAt: '2026-10-15T11:00:00.000Z', reason: 'latest_success_before_configuration' } }),
      provider('google_drive')
    ] } }],
    ['disabled-unconfigured', { data: { observedAt, providers: [
      provider('clickup', { configuration: { state: 'disabled', credentialState: 'stored_unverified', active: false, reason: 'inactive' } }),
      provider('google_drive', { configuration: { state: 'not_configured', credentialState: 'none', active: false, reason: 'no_setting' }, synchronization: { state: 'unknown', latestEventType: null, latestEventAt: null, lastSuccessAt: null, reason: 'no_observation' }, adapter: { present: false, connectionStatus: null, healthStatus: null, updatedAt: null } })
    ] } }],
    ['incomplete-credential', { data: { observedAt, providers: [
      provider('clickup'),
      provider('google_drive', { configuration: { state: 'not_configured', credentialState: 'incomplete', active: true, reason: 'incomplete_credential' } })
    ] } }]
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const requests = [], errors = [];
    let reads = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/v1/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      requests.push(`${request.method()} ${pathname}`);
      assert.equal(request.method(), 'GET');
      assert.equal(pathname, '/v1/connection/integration-status');
      reads++;
      if (reads === 1) return route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } });
      return route.fulfill({ json: fixture });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/areas?area=09-technologia&view=integrations`);
    await page.getByText('Could not read integration status').waitFor();
    assert.equal(await page.getByRole('heading', { name: 'ClickUp' }).count(), 0, 'failed read cannot show stale provider state');
    await page.getByRole('button', { name: 'Retry' }).press('Enter');
    const clickup = page.getByRole('region', { name: 'ClickUp' });
    const drive = page.getByRole('region', { name: 'Google Drive' });
    await clickup.waitFor();
    if (kind === 'stale-failed') {
      await clickup.getByText('Synchronization evidence is stale').waitFor();
      await drive.getByText('Latest attempt failed').waitFor();
      assert.equal(await page.getByText('Connected', { exact: true }).count(), 0, 'old adapter status is not promoted to provider truth');
    } else if (kind === 'prior-configuration') {
      await clickup.getByText('The last recorded success predates the configuration change. It does not confirm synchronization with the current settings.').waitFor();
    } else if (kind === 'incomplete-credential') {
      await drive.getByText('Not configured in Roost').waitFor();
      await drive.getByText('Credentials incomplete').waitFor();
      await drive.getByText('Stored credentials are incomplete. Review provider settings.').waitFor();
    } else {
      await clickup.getByText('Disabled in Roost').waitFor();
      await drive.getByText('Not configured in Roost').waitFor();
      await drive.getByText('No synchronization observation').waitFor();
    }
    assert.equal(reads, 2);
    assert.deepEqual(errors, []);
    assert.ok(requests.every(request => request.startsWith('GET ')));
    await page.close();
    checks++;
  }

  for (const mode of ['disabled-stored', 'clickup-error', 'google-drive-error']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('companycoreLocale', 'en'));
    const requests = [], errors = [], providerReads = { clickup: 0, google_drive: 0 };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/v1/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      requests.push(`${request.method()} ${pathname}`);
      assert.equal(request.method(), 'GET', 'Settings status proof remains read-only');
      if (pathname === '/v1/auth/me') return route.fulfill({ json: { data: { authType: 'api_key', workspaces: [{ id: 'workspace-a', active: true, role: 'owner', name: 'Test Workspace' }] } } });
      if (pathname === '/v1/connection') return route.fulfill({ json: { data: { scopeMode: 'scoped', integrations: { clickup: { configured: true, active: true }, googleDrive: { configured: true, active: true, hasRefreshToken: true } } } } });
      if (pathname.startsWith('/v1/integration-settings/')) {
        const name = pathname.endsWith('/clickup') ? 'clickup' : 'google_drive';
        providerReads[name]++;
        if (mode === `${name === 'clickup' ? 'clickup' : 'google-drive'}-error` && providerReads[name] === 1) {
          return route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } });
        }
        return route.fulfill({ json: { data: { configured: true, secretConfigured: true, active: mode !== 'disabled-stored' || name !== 'clickup', hasRefreshToken: true, updatedAt: observedAt } } });
      }
      throw new Error(`Unexpected request: ${pathname}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/workspace/settings`);
    const clickup = page.locator('#workspace-integrations-clickup');
    const drive = page.locator('#workspace-integrations-google-drive');
    await clickup.waitFor();
    await drive.waitFor();
    if (mode === 'disabled-stored') {
      await clickup.getByText('configured, disabled').waitFor();
      await clickup.getByText('Credentials are stored, but this provider is disabled in Roost.').waitFor();
      assert.equal(await clickup.locator('input[type="checkbox"]').isChecked(), false);
      await drive.getByText('Configuration is active and credentials are stored. Current provider authorization is unverified here.').waitFor();
    } else {
      const failed = mode === 'clickup-error' ? clickup : drive;
      const healthy = mode === 'clickup-error' ? drive : clickup;
      await failed.getByText('status unknown').waitFor();
      await failed.getByText('Provider settings could not be read. Retry before changing this connection.').waitFor();
      assert.equal(await failed.locator('input[type="checkbox"]').count(), 0, 'failed provider read must not expose a toggle using fallback state');
      assert.equal(await page.getByText('Connections awaiting configuration:').count(), 0, 'one failed read cannot count as missing configuration');
      await healthy.getByText('Configuration is active and credentials are stored. Current provider authorization is unverified here.').waitFor();
      await failed.getByRole('button', { name: 'Retry status' }).press('Enter');
      await failed.getByText('Configuration is active and credentials are stored. Current provider authorization is unverified here.').waitFor();
      assert.ok(providerReads[mode === 'clickup-error' ? 'clickup' : 'google_drive'] >= 2, 'retry must re-read the failed provider');
    }
    assert.deepEqual(errors, []);
    assert.ok(requests.every(request => request.startsWith('GET ')));
    await page.close();
    checks++;
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
console.log(`integration-status-ui: ${checks} browser cases passed (PL/EN, 390/1280, keyboard/anchor visibility, source disagreement, unknown/stale/failed, incomplete or disabled credentials, provider read errors, retry, read-only)`);
