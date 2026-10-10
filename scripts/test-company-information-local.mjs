import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Reuse the existing local Roost database container. Create one uniquely owned
// disposable database; never reset a pre-existing database or start Desktop.
const installation = {}; config({ processEnv: installation, quiet: true });
const suffix = randomBytes(8).toString('hex');
const database = `companycore_test_g6a_${suffix}`, role = `roost_g6a_${suffix}`, password = randomBytes(32).toString('hex');
const port = process.env.ROOST_POSTGRES_PORT ?? installation.ROOST_POSTGRES_PORT ?? '55432';
const admin = new PrismaClient({ datasources: { db: { url: `postgresql://companycore:${encodeURIComponent(installation.SERVICE_PASSWORD_POSTGRES ?? 'companycore')}@127.0.0.1:${port}/postgres` } } });
const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(PATH|PATHEXT|SYSTEMROOT|COMSPEC|TEMP|TMP|APPDATA|LOCALAPPDATA)$/i.test(name)));
Object.assign(environment, { DATABASE_URL: `postgresql://${role}:${password}@127.0.0.1:${port}/${database}?schema=public`, NODE_ENV: 'test', COMPANYCORE_SKIP_DOTENV: '1', DOTENV_CONFIG_QUIET: 'true', GOOGLE_OAUTH_CLIENT_ID: 'dev-fixture-client-id', GOOGLE_OAUTH_CLIENT_SECRET: 'dev-fixture-client-secret' });
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
  process.stdout.write('G6a fresh database: all migrations applied\n');
  stage = 'native_http_worker_proof';
  const proof = run(process.execPath, ['--test', 'scripts/company-information-native.test.mjs'], environment, 180000);
  process.stdout.write(proof.stdout); process.stderr.write(proof.stderr);
  if (proof.status !== 0) throw new Error();
  stage = 'passed';
} catch { process.stderr.write(`G6a native proof failed at ${stage}\n`); process.exitCode = 1; }
finally {
  try {
    if (databaseCreated) { await admin.$executeRawUnsafe(`DROP DATABASE ${database} WITH (FORCE)`); databaseCreated = false; }
    if (roleCreated) { await admin.$executeRawUnsafe(`DROP ROLE ${role}`); roleCreated = false; }
    const remaining = await admin.$queryRawUnsafe(`SELECT datname FROM pg_database WHERE datname='${database}' UNION ALL SELECT rolname FROM pg_roles WHERE rolname='${role}'`);
    if (remaining.length) throw new Error();
    process.stdout.write('G6a cleanup: owned database and role absent\n');
  } catch { process.stderr.write('G6a cleanup verification failed\n'); process.exitCode = 1; }
  await admin.$disconnect();
  if (started) {
    const stopped = run('docker', ['stop', 'roost-postgres-1'], process.env, 30000);
    const state = run('docker', ['inspect', '--format', '{{.State.Running}}', 'roost-postgres-1'], process.env, 10000);
    if (stopped.status !== 0 || state.stdout.trim() !== 'false') process.exitCode = 1;
    else process.stdout.write('G6a cleanup: prior stopped container state restored\n');
  }
}
