import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Reuse the existing local Roost database container. Create one uniquely owned
// disposable database; never reset a pre-existing database or start Desktop.
const installation = {}; config({ processEnv: installation, quiet: true });
const suffix = randomBytes(8).toString('hex');
const database = `companycore_test_g6a_${suffix}`, role = `roost_g6a_${suffix}`, password = randomBytes(32).toString('hex');
const proofLabel = process.env.ROOST_G9_FULL_SOURCE === '1' || process.env.ROOST_G9_API_SUITE === '1' ? 'G9' : process.env.ROOST_G9_SOURCE_READ_ONLY === '1' ? 'G9a' : process.env.ROOST_G7_REVIEW_ONLY === '1' ? 'G7' : 'G6a';
const port = process.env.ROOST_POSTGRES_PORT ?? installation.ROOST_POSTGRES_PORT ?? '55432';
const admin = new PrismaClient({ datasources: { db: { url: `postgresql://companycore:${encodeURIComponent(installation.SERVICE_PASSWORD_POSTGRES ?? 'companycore')}@127.0.0.1:${port}/postgres` } } });
const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(PATH|PATHEXT|SYSTEMROOT|COMSPEC|TEMP|TMP|APPDATA|LOCALAPPDATA)$/i.test(name)));
Object.assign(environment, { DATABASE_URL: `postgresql://${role}:${password}@127.0.0.1:${port}/${database}?schema=public`, NODE_ENV: 'test', COMPANYCORE_SKIP_DOTENV: '1', DOTENV_CONFIG_QUIET: 'true', GOOGLE_OAUTH_CLIENT_ID: 'dev-fixture-client-id', GOOGLE_OAUTH_CLIENT_SECRET: 'dev-fixture-client-secret' });
if (process.env.ROOST_G11_REVIEW_ACTION) environment.ROOST_G11_REVIEW_ACTION = process.env.ROOST_G11_REVIEW_ACTION;
if (process.env.ROOST_G22_NATIVE_RUNTIME === '1') {
  if (!/^sha256:[a-f0-9]{64}$/.test(process.env.ROOST_G22_MODEL_DIGEST ?? '')) throw Error('g22_model_digest_required');
  environment.ROOST_G22_NATIVE_RUNTIME = '1';
  environment.ROOST_G22_MODEL_DIGEST = process.env.ROOST_G22_MODEL_DIGEST;
  environment.ROOST_G11_REVIEW_ACTION = 'local-approve';
}
if (process.env.ROOST_G23_POLICY_ONLY === '1') environment.ROOST_G23_POLICY_ONLY = '1';
if (process.env.ROOST_G24C_PACKET_ONLY === '1') environment.ROOST_G24C_PACKET_ONLY = '1';
if (process.env.ROOST_G24C_VERIFIER_QUALIFICATION === '1') environment.ROOST_G24C_VERIFIER_QUALIFICATION = '1';
if (process.env.ROOST_G24C_HOST_INPUT === '1') environment.ROOST_G24C_HOST_INPUT = '1';
if (process.env.ROOST_G23_COMPARISON === '1') {
  if (!['plain_status', 'unsupported_readiness_claim'].includes(process.env.ROOST_G23_CASE)
    || !['local', 'codex'].includes(process.env.ROOST_G23_BACKEND)
    || !process.env.ROOST_G23_EVIDENCE_DIR
    || !path.isAbsolute(process.env.ROOST_G23_EVIDENCE_DIR)
    || !path.relative(process.cwd(), process.env.ROOST_G23_EVIDENCE_DIR).startsWith('..'))
    throw Error('g23_comparison_configuration_invalid');
  environment.ROOST_G23_COMPARISON = '1';
  for (const key of ['ROOST_G23_CASE', 'ROOST_G23_BACKEND', 'ROOST_G23_EVIDENCE_DIR']) environment[key] = process.env[key];
}
if (process.env.ROOST_G12_CONTINUATION === '1') environment.ROOST_G12_CONTINUATION = '1';
if ((process.env.ROOST_G6_NATIVE_RUNTIME === '1' || process.env.ROOST_G22_NATIVE_RUNTIME === '1') && process.env.ROOST_G7_REVIEW_ONLY !== '1') {
  if (!process.env.ROOST_G6_NATIVE_HOST_CONFIG) throw Error('native_host_config_required');
  if (process.env.ROOST_G6_NATIVE_RUNTIME === '1') environment.ROOST_G6_NATIVE_RUNTIME = '1';
  environment.ROOST_G6_NATIVE_HOST_CONFIG = process.env.ROOST_G6_NATIVE_HOST_CONFIG;
  for (const name of ['USERPROFILE', 'HOME', 'HOMEDRIVE', 'HOMEPATH', 'SYSTEMDRIVE']) if (process.env[name]) environment[name] = process.env[name];
}
const run = (command, args, env = process.env, timeout = 60000) => spawnSync(command, args, { env, windowsHide: true, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024 });
let wasRunning = false, started = false, roleCreated = false, databaseCreated = false, stage = 'engine';
try {
  if (run('docker', ['info', '--format', '{{.ServerVersion}}'], process.env, 10000).status !== 0) throw new Error();
  const inventory = run('docker', ['inspect', '--format', '{{.State.Running}}', 'roost-postgres-1'], process.env, 10000);
  if (inventory.status !== 0) throw new Error(); // no additional container
  wasRunning = inventory.stdout.trim() === 'true';
  if (!wasRunning) { stage = 'start_existing_postgres'; if (run('docker', ['start', 'roost-postgres-1']).status !== 0) throw new Error(); started = true; }
  stage = 'postgres_ready';
  for (let i = 0; i < 20; i++) {
    if (run('docker', ['exec', 'roost-postgres-1', 'pg_isready', '-U', 'companycore'], process.env, 5000).status === 0) break;
    if (i === 19) throw new Error();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  stage = 'create_owned_database';
  await admin.$executeRawUnsafe(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'`); roleCreated = true;
  await admin.$executeRawUnsafe(`CREATE DATABASE ${database} OWNER ${role}`); databaseCreated = true;
  stage = 'migrate';
  const migration = run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], environment, 120000);
  if (migration.status !== 0) { process.stdout.write(migration.stdout.slice(-4000)); process.stderr.write(migration.stderr.slice(-2000)); throw new Error(); }
  process.stdout.write(`${proofLabel} fresh database: all migrations applied\n`);
  stage = 'native_http_worker_proof';
  if (process.env.ROOST_G9_API_SUITE === '1') {
    const pattern = process.env.ROOST_G9_API_PATTERN;
    const proof = run(process.execPath, ['--test', ...(pattern ? ['--test-name-pattern', pattern] : []),
      'dist/tests/api.test.js'], environment, 600000);
    process.stdout.write(proof.stdout); process.stderr.write(proof.stderr);
    if (proof.status !== 0) throw new Error();
  } else if (process.env.ROOST_G9_FULL_SOURCE === '1') {
    const proof = run(process.execPath, ['--test', '--test-concurrency=1', 'scripts/company-source-read-native.test.mjs',
      'scripts/task-source-read-native.test.mjs'], environment, 180000);
    process.stdout.write(proof.stdout); process.stderr.write(proof.stderr);
    if (proof.status !== 0) throw new Error();
  } else if (process.env.ROOST_G9_SOURCE_READ_ONLY === '1') {
    const proof = run(process.execPath, ['--test', 'scripts/company-source-read-native.test.mjs'], environment, 300000);
    process.stdout.write(proof.stdout); process.stderr.write(proof.stderr);
    if (proof.status !== 0) throw new Error();
  } else if (process.env.ROOST_G7_REVIEW_ONLY === '1') {
    const proof = run(process.execPath, ['--test', 'scripts/g7-owner-review-native.test.mjs'], environment, 180000);
    process.stdout.write(proof.stdout); process.stderr.write(proof.stderr);
    if (proof.status !== 0) throw new Error();
  } else if (process.env.ROOST_G6_CONSOLE_RECOVERY === '1') {
    const bridge = await mkdtemp(path.join(os.tmpdir(), 'roost-g6-console-'));
    try {
      environment.ROOST_G6_CONSOLE_RECOVERY_DIR = bridge;
      process.stdout.write(`G6 console recovery bridge: ${bridge}\n`);
      const proof = spawn(process.execPath, ['--test', 'scripts/company-information-native.test.mjs'], {
        env: environment, windowsHide: true, stdio: 'inherit' });
      const code = await new Promise((resolve, reject) => {
        proof.once('error', reject);
        proof.once('exit', resolve);
      });
      if (code !== 0) throw new Error();
    } finally {
      if (path.dirname(bridge) === os.tmpdir() && path.basename(bridge).startsWith('roost-g6-console-'))
        await rm(bridge, { recursive: true, force: false });
    }
  } else {
    const proof = run(process.execPath, ['--test', 'scripts/company-information-native.test.mjs'], environment,
      environment.ROOST_G22_NATIVE_RUNTIME === '1' ? 900000 : environment.ROOST_G6_NATIVE_RUNTIME === '1' ? 600000 : environment.ROOST_G12_CONTINUATION === '1' ? 360000 : 180000);
    process.stdout.write(proof.stdout); process.stderr.write(proof.stderr);
    if (proof.status !== 0) throw new Error();
  }
  stage = 'passed';
} catch { process.stderr.write(`${proofLabel} native proof failed at ${stage}\n`); process.exitCode = 1; }
finally {
  try {
    if (databaseCreated) { await admin.$executeRawUnsafe(`DROP DATABASE ${database} WITH (FORCE)`); databaseCreated = false; }
    if (roleCreated) { await admin.$executeRawUnsafe(`DROP ROLE ${role}`); roleCreated = false; }
    const remaining = await admin.$queryRawUnsafe(`SELECT datname FROM pg_database WHERE datname='${database}' UNION ALL SELECT rolname FROM pg_roles WHERE rolname='${role}'`);
    if (remaining.length) throw new Error();
    process.stdout.write(`${proofLabel} cleanup: owned database and role absent\n`);
  } catch { process.stderr.write(`${proofLabel} cleanup verification failed\n`); process.exitCode = 1; }
  await admin.$disconnect();
  if (started) {
    const stopped = run('docker', ['stop', 'roost-postgres-1'], process.env, 30000);
    const state = run('docker', ['inspect', '--format', '{{.State.Running}}', 'roost-postgres-1'], process.env, 10000);
    if (stopped.status !== 0 || state.stdout.trim() !== 'false') process.exitCode = 1;
    else process.stdout.write(`${proofLabel} cleanup: prior stopped container state restored\n`);
  }
}
