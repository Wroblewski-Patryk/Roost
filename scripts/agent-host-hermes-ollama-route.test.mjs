import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { renderLocalHermesProfile, localHermesProfileVersion } from './lib/agent-host-hermes-local-profile.mjs';
import { hermesStartupEnvironment } from './lib/agent-host-hermes-startup.mjs';
import { startOllamaObserver } from './lib/agent-host-ollama-observer.mjs';

const MODEL = 'gpt-oss:20b';
const DIGEST = `sha256:${'a'.repeat(64)}`;
const ANSWER = 'Synthetic local fixture answer.';

test('installed Hermes reaches only the selected model through the observer', {
  skip: process.platform !== 'win32' || process.env.ROOST_G22_HERMES_FIXTURE !== '1'
}, async () => {
  const config = JSON.parse(await readFile(process.env.ROOST_G6_NATIVE_HOST_CONFIG, 'utf8'));
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roost-g22-hermes-fixture-'));
  const profilePath = path.join(directory, 'config.yaml');
  let upstream, observer, child;
  try {
    await writeFile(profilePath, renderLocalHermesProfile(), { flag: 'wx', mode: 0o600 });
    let modelBodies = 0;
    const metadata = [];
    upstream = http.createServer((request, response) => {
      if (request.url === '/api/tags' || request.url === '/api/ps') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ models: [{ name: MODEL, model: MODEL, digest: DIGEST, size: 13_000_000_000 }] }));
        return;
      }
      if (request.url !== '/v1/chat/completions' || request.method !== 'POST') {
        response.writeHead(404).end(); return;
      }
      const chunks = [];
      request.on('data', chunk => chunks.push(chunk));
      request.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        assert.equal(body.model, MODEL);
        modelBodies += 1;
        response.writeHead(200, { 'Content-Type': body.stream ? 'text/event-stream' : 'application/json' });
        if (body.stream) {
          response.end(`data: ${JSON.stringify({ id: 'fixture', object: 'chat.completion.chunk', model: MODEL,
            choices: [{ index: 0, delta: { content: ANSWER }, finish_reason: null }] })}\n\n`
            + `data: ${JSON.stringify({ id: 'fixture', object: 'chat.completion.chunk', model: MODEL,
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
              usage: { prompt_tokens: 4, completion_tokens: 5, total_tokens: 9 } })}\n\n`
            + 'data: [DONE]\n\n');
        } else response.end(JSON.stringify({ id: 'fixture', object: 'chat.completion', model: MODEL,
          choices: [{ index: 0, message: { role: 'assistant', content: ANSWER }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 4, completion_tokens: 5, total_tokens: 9 } }));
      });
    });
    const upstreamPort = await new Promise((resolve, reject) => {
      upstream.once('error', reject); upstream.listen(0, '127.0.0.1', () => resolve(upstream.address().port));
    });
    process.env.ROOST_OLLAMA_OBSERVER_TEST = '1';
    observer = await startOllamaObserver({ model: MODEL, digest: DIGEST, timeoutMs: 60_000,
      assertAuthority: () => true, testFreeMemoryBytes: 8 * 1024 ** 3,
      testRequestMetadata: value => metadata.push(value),
      testPorts: { upstream: upstreamPort, observer: 11435 } });
    const environment = hermesStartupEnvironment({ schemaVersion: localHermesProfileVersion, profilePath }, process.env, directory);
    const argv = ['chat', '--cli', '--oneshot', '--quiet', '--query-file', '-', '--provider', 'ollama', '--model', MODEL,
      '--reasoning', 'low', '--toolsets', 'bot_room', '--max-turns', '1', '--run-budget', '40'];
    child = spawn(config.executionProvider.executablePath, argv, { cwd: directory, env: environment,
      windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.end('Synthetic route check only.');
    child.stdout.resume(); child.stderr.resume();
    let timer;
    const exit = await Promise.race([new Promise(resolve => child.once('exit', code => resolve(code))),
      new Promise(resolve => { timer = setTimeout(() => { child.kill(); resolve(null); }, 55_000); })]);
    clearTimeout(timer);
    assert.equal(exit, 0);
    const receipt = await observer.finish().catch(error => {
      throw Object.assign(error, { message: `${error.message}: ${JSON.stringify({ metadata, modelBodies })}` });
    });
    assert.equal(receipt.requestCount, 1);
    assert.equal(receipt.responseModel, MODEL);
    assert.equal(modelBodies, 1);
  } finally {
    if (child?.exitCode === null) child.kill();
    await observer?.close();
    upstream?.closeAllConnections();
    if (upstream) await new Promise(resolve => upstream.close(resolve));
    delete process.env.ROOST_OLLAMA_OBSERVER_TEST;
    const base = path.resolve(os.tmpdir());
    const target = path.resolve(directory);
    if (path.dirname(target) === base && path.basename(target).startsWith('roost-g22-hermes-fixture-'))
      await rm(target, { recursive: true, force: false });
  }
});
