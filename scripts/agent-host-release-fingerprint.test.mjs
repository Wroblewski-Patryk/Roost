import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { buildReleaseFingerprintCommand, releaseFingerprintSql } from './lib/agent-host-release-fingerprint.mjs';

const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const unquote = value => { assert(value.startsWith("'") && value.endsWith("'")); return value.slice(1, -1).replaceAll("'\\''", "'"); };
function changeProgram(command, container, change) {
  const prefix = `docker exec -i '${container}' bash -e -o pipefail -c `;
  assert(command.startsWith(prefix));
  let supervisor = unquote(command.slice(prefix.length));
  const marker = 'bash -e -o pipefail -c ';
  const start = supervisor.indexOf(marker) + marker.length;
  const end = supervisor.indexOf(' & fingerprint_child=$!;', start); assert(end > start);
  supervisor = supervisor.slice(0, start) + quote(change(unquote(supervisor.slice(start, end)))) + supervisor.slice(end);
  return ['bash', '-e', '-o', 'pipefail', '-c', supervisor];
}

test('streaming program preserves historical oracle and fixes per-session resource bounds', () => {
  assert.equal(createHash('sha256').update(releaseFingerprintSql).digest('hex'), 'c793e0c55e221787cb92a8c631347051bbf38e9241ccddf3ab86454caf74a48f');
  const command = buildReleaseFingerprintCommand({ container: 'a'.repeat(64), user: 'fixture', database: 'fixture' }, 30000);
  for (const setting of ['work_mem=4MB', 'temp_file_limit=512MB', 'max_parallel_workers_per_gather=0', 'jit=off']) assert(command.includes(setting));
  assert(!command.includes('string_agg')); assert(!command.includes('COLLATE'));
  assert(command.includes('COPY (SELECT')); assert(command.includes('TO STDOUT'));
  assert(!command.includes('TO PROGRAM')); assert(command.includes('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'));
  assert(!command.includes('SHELL_ERROR')); assert(command.includes('fingerprint_prepared_valid'));assert(command.includes('complete.pending'));
  const prefix = "docker exec -i '" + 'a'.repeat(64) + "' bash -e -o pipefail -c ";
  const supervisor = unquote(command.slice(prefix.length));
  assert(supervisor.startsWith('set -m;'));
  const childGroup = supervisor.indexOf(' & fingerprint_child=$!;');
  const timerGroup = supervisor.indexOf(' & fingerprint_timer=$!;');
  const monitorOff = supervisor.indexOf('set +m;');
  const waitChild = supervisor.indexOf('fingerprint_status=0; wait "$fingerprint_child"');
  assert(childGroup > 0 && childGroup < timerGroup && timerGroup < monitorOff && monitorOff < waitChild);
  assert.equal(supervisor.match(/set \+m;/g)?.length, 1);
});

test('native streaming fingerprint matches historical bytes, bounds sort, fails closed and reaps actual COPY pipes', async t => {
  let container;
  try { container = execFileSync('docker', ['compose', 'ps', '--status', 'running', '-q', 'postgres'], { encoding: 'utf8', windowsHide: true, timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { t.skip('Existing local Compose PostgreSQL unavailable; no service started'); return; }
  if (!/^[a-f0-9]{64}$/.test(container)) { t.skip('Existing local Compose PostgreSQL unavailable; no service started'); return; }
  const database = `roost_fingerprint_fixture_${randomBytes(12).toString('hex')}`;
  const ownership = `roost-fingerprint-fixture:${randomUUID()}`;
  const docker = (args, input, timeout = 60000) => execFileSync('docker', ['exec', ...(input ? ['-i'] : []), container, ...args],
    { input, windowsHide: true, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  const sql = (text, db = database) => docker(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'companycore', '-d', db], text);
  const identitySql = `SELECT oid::text||':'||coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='${database}';`;
  const identity = sql(`CREATE DATABASE "${database}" TEMPLATE template0; COMMENT ON DATABASE "${database}" IS '${ownership}'; ${identitySql}`, 'postgres').trim();
  assert(new RegExp(`^[0-9]+:${ownership}$`).test(identity));
  const endpoint = { container, user: 'companycore', database };
  const args = (change = value => value, timeout = 30000) => changeProgram(buildReleaseFingerprintCommand(endpoint, timeout), container, change);
  const fingerprint = () => {
    const result = spawnSync('docker', ['exec', container, ...args()], {
      windowsHide: true, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '', 'successful fingerprint emits no Bash job notice or hidden warning');
    return result.stdout;
  };
  const historical = () => {
    const schema = docker(['bash', '-e', '-o', 'pipefail', '-c', `pg_dump --schema-only --no-owner --no-acl --quote-all-identifiers -U companycore -d ${quote(database)} | sed -e '/^\\\\restrict /d' -e '/^\\\\unrestrict /d' | sha256sum`]);
    const records = sql(releaseFingerprintSql);
    const data = docker(['bash', '-e', '-o', 'pipefail', '-c', 'LC_ALL=C sort | sha256sum'], records);
    return schema + data;
  };
  const processes = () => sql("SELECT backend_type,pid FROM pg_stat_activity WHERE backend_type IN ('checkpointer','background writer','walwriter','autovacuum launcher','logical replication launcher') ORDER BY backend_type;", 'postgres');
  const zombies = () => docker(['bash', '-c', "ps -o pid=,stat= | awk '$2 ~ /^Z/ {print $1}' | sort"]);
  const tempDirectories = () => docker(['bash', '-c', 'find /tmp -maxdepth 1 -type d -name "roost-fingerprint.*" | sort']);
  const serverStart = sql('SELECT pg_postmaster_start_time()::text;', 'postgres');
  const serverProcesses = processes(), initialZombies = zombies(), initialDirectories = tempDirectories();
  try {
    sql(`CREATE TABLE sample(body text, nested jsonb); INSERT INTO sample VALUES ('synthetic α','{"a":[1,null]}'),('quote '' and newline'||chr(10)||'row','{}'); CREATE TABLE duplicates(body text); INSERT INTO duplicates VALUES ('a'),('b'),('a'); CREATE SCHEMA business; CREATE TABLE business.empty_table(body text); CREATE TABLE partitions(id int) PARTITION BY RANGE(id); CREATE TABLE partition_one PARTITION OF partitions FOR VALUES FROM (0) TO (100); INSERT INTO partitions VALUES (42); CREATE MATERIALIZED VIEW materialized_rows AS SELECT body FROM duplicates; CREATE SEQUENCE not_called; SELECT setval('not_called',42,false); CREATE TABLE "quote '' \"\" and space"(body text); CREATE TABLE "line${'\n'}break"(body text);`);
    let oracle = historical(); assert.equal(fingerprint(), oracle);
    sql("DELETE FROM duplicates; INSERT INTO duplicates VALUES ('a'),('a'),('b');"); assert.equal(fingerprint(), oracle);
    sql("INSERT INTO duplicates VALUES ('a');"); assert.notEqual(fingerprint(), oracle); assert.equal(fingerprint(), historical());
    sql("DELETE FROM duplicates WHERE ctid=(SELECT ctid FROM duplicates WHERE body='a' LIMIT 1); SELECT setval('not_called',42,true);"); assert.notEqual(fingerprint(), oracle); assert.equal(fingerprint(), historical());
    sql("SELECT setval('not_called',42,false);"); assert.equal(fingerprint(), oracle);

    // Force a real disk sort with many projected hashes, not full business rows.
    sql('CREATE TABLE many_rows AS SELECT n AS id, repeat(md5(n::text),2) AS body FROM generate_series(1,100000) n;');
    const plan = sql("SET work_mem='4MB'; SET max_parallel_workers_per_gather=0; EXPLAIN (ANALYZE, BUFFERS) SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS row_hash FROM many_rows t ORDER BY row_hash;");
    assert.match(plan, /Sort Method: external merge/); assert(!plan.includes('Gather'));
    assert.equal(fingerprint(), historical());
    assert.throws(() => docker(args(program => program.replace('temp_file_limit=512MB', 'temp_file_limit=1kB'))));
    assert.equal(tempDirectories(), initialDirectories);
    sql('DROP TABLE many_rows;'); oracle = historical();

    // Concurrent committed row writes remain outside the one existing snapshot.
    // Snapshot semantics are exercised below through a fixed pipe pause after
    // its catalog query has established the snapshot, using stderr as readiness.
    const pausedArgs = args(program => program.replace('LC_ALL=C awk', 'echo FINGERPRINT_SNAPSHOT_READY >&2; sleep 0.5; LC_ALL=C awk'));
    let changed = false;
    const child = spawn('docker', ['exec', container, ...pausedArgs], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = ''; child.stdout.on('data', value => { out += value; });
    child.stderr.on('data', value => { err += value; if (!changed && err.includes('FINGERPRINT_SNAPSHOT_READY')) { changed = true; sql("INSERT INTO sample VALUES ('committed after snapshot','{}');"); } });
    const status = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
    assert.equal(status, 0); assert(changed); assert.equal(out, oracle); assert.notEqual(fingerprint(), oracle);
    sql("DELETE FROM sample WHERE body='committed after snapshot';"); assert.equal(fingerprint(), oracle);

    // Program failures, malformed COPY records and malformed digest read-back
    // must never produce a successful two-line fingerprint.
    for (const change of [
      program => program.replace('LC_ALL=C awk', 'false; LC_ALL=C awk'),
      program => program.replace('length($0) != 64', 'length($0) != 63'),
      program => program.replace('sha256sum >', 'false >'),
      // The second relation must not reuse the first relation's valid digest or
      // marker when its COPY consumer fails before producing a new digest.
      program => program.replace('LC_ALL=C awk', 'if test -f "$ROOST_FINGERPRINT_DIR/test-first"; then false; fi; touch "$ROOST_FINGERPRINT_DIR/test-first"; LC_ALL=C awk'),
      program => program.replace('sha256sum >', '(cat >/dev/null; echo malformed) >'),
      program => program.replace('count(*) <= 10000', 'count(*) <= 0'),
      program => program.replace('fingerprint_count :ROW_COUNT', 'fingerprint_count malformed'),
      program => program.replace('fingerprint_count :ROW_COUNT', 'fingerprint_count -1'),
      program => program.replace('fingerprint_count :ROW_COUNT', 'fingerprint_count 9223372036854775808'),
      program => program.replace('fingerprint_prepared_valid', 'fingerprint_prepared_invalid'),
      program => program.replace('printf \'\\\'\'%s\\n\'\\\'\' complete', 'false; printf \'\\\'\'%s\\n\'\\\'\' complete'),
      program => program.replace('rm -f --', 'false; rm -f --'),
      program => program.replace('complete >', 'malformed >')
    ]) {
      assert.throws(() => docker(args(change)));
      assert.equal(tempDirectories(), initialDirectories);
      assert.equal(sql(`SELECT count(*) FROM pg_stat_activity WHERE datname='${database}';`, 'postgres').trim(), '0');
    }

    // Stall a real psql pipe binary, including a leaf that ignores TERM. All
    // marked group members must be absent, not merely in zombie state.
    for (const [index, stall] of [
      program => program.replace('LC_ALL=C awk', 'sleep 20 & wait; LC_ALL=C awk'),
      program => program.replace('LC_ALL=C awk', '(trap "" TERM; exec sleep 20) & wait; LC_ALL=C awk'),
      program => program.replace('sha256sum >', '(trap "" TERM; exec sleep 20) >'),
      program => program.replace('LC_ALL=C awk \'\\\'\'NR', 'sleep 20 & wait; LC_ALL=C awk \'\\\'\'NR'),
      program => program.replace('COPY (SELECT', 'SELECT pg_sleep(20);\nCOPY (SELECT'),
      program => program.replace('statement_timeout=550', 'statement_timeout=8000').replace('COPY (SELECT', 'SELECT pg_sleep(20);\nCOPY (SELECT')
    ].entries()) {
      const change = program => `echo FINGERPRINT_GROUP=$BASHPID >&2; ${stall(program)}`;
      let failure;
      try { docker(args(change, 1000), undefined, 10000); } catch (error) { failure = error; }
      assert(failure); assert.equal(failure.status, index === 4 ? 3 : 124);
      const groups = [...failure.stderr.matchAll(/FINGERPRINT_GROUP=(\d+)/g)].map(match => match[1]); assert(groups.length);
      for (const group of groups) assert.equal(docker(['bash', '-c', `ps -o pid=,pgid= | awk -v owner=${group} '$2 == owner { print $1 }'`]).trim(), '', 'every owned process group member must be absent');
      assert.equal(zombies(), initialZombies, 'COPY pipe children must be reaped, with no new zombies');
      assert.equal(tempDirectories(), initialDirectories);
      assert.equal(sql(`SELECT count(*) FROM pg_stat_activity WHERE datname='${database}';`, 'postgres').trim(), '0');
      assert.equal(processes(), serverProcesses); assert.equal(sql('SELECT pg_postmaster_start_time()::text;', 'postgres'), serverStart);
    }
    assert.equal(fingerprint(), oracle);
    assert.equal(zombies(), initialZombies); assert.equal(tempDirectories(), initialDirectories);
  } finally {
    assert.equal(sql(identitySql, 'postgres').trim(), identity);
    assert.equal(sql(`SELECT count(*) FROM pg_stat_activity WHERE datname='${database}';`, 'postgres').trim(), '0');
    sql(`DROP DATABASE "${database}";`, 'postgres'); assert.equal(sql(identitySql, 'postgres').trim(), '');
  }
});
