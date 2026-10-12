import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { markModelRequest } from './lib/agent-host-company-information-worker.mjs';

test('a model request creates one flushed, private, non-overwriting marker', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roost-model-marker-'));
  const executionId = '00000000-0000-4000-8000-000000000001';
  try {
    markModelRequest(directory, executionId);
    const marker = path.join(directory, `information-${executionId}.model-requested`);
    assert.deepEqual(JSON.parse(await readFile(marker, 'utf8')),
      { executionId, modelRequestForwarded: true });
    assert.throws(() => markModelRequest(directory, executionId), { code: 'EEXIST' });
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});
