import { z } from 'zod';

export const releaseFingerprintDefaultTimeoutMs = 5 * 60 * 1000;
export const releaseFingerprintTimeoutSchema = z.number().int().min(1000).max(30 * 60 * 1000);
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;

// Historical backup/release digest contract. Keep row multiplicity, ordering,
// all business tables and sequence state identical across both gateways.
export const releaseFingerprintSql = `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT format('SELECT jsonb_build_object(''schema'',%L,''table'',%L,''count'',count(*),''digest'',encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex''),'''' ORDER BY encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'')),''''),''UTF8'')),''hex''))::text FROM %I.%I t;', n.nspname,c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p','m') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY n.nspname,c.relname
\\gexec
SELECT format('SELECT jsonb_build_object(''schema'',%L,''sequence'',%L,''lastValue'',last_value,''isCalled'',is_called)::text FROM %I.%I;',n.nspname,c.relname,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' ORDER BY n.nspname,c.relname
\\gexec
COMMIT;
`;

export function releaseFingerprintDeadlines(timeoutMs) {
  releaseFingerprintTimeoutSchema.parse(timeoutMs);
  const cleanupMs = Math.min(2000, Math.floor(timeoutMs / 10));
  const transportMarginMs = Math.min(15000, Math.floor(timeoutMs / 4));
  const remoteMs = timeoutMs - transportMarginMs - cleanupMs;
  const statementMs = remoteMs - cleanupMs;
  return { remoteMs, cleanupMs, statementMs, lockMs: Math.min(10000, statementMs) };
}

// Supervision runs inside the immutable container. Bash job control assigns
// separate groups to the fixed program and its timer. Both are reaped before
// exit; there is no detached timeout watchdog that can outlive its target PID.
// Server deadlines also bound a statement after transport loss. No rows leave PG.
export function buildReleaseFingerprintCommand(endpoint, timeoutMs) {
  const { remoteMs, cleanupMs, statementMs, lockMs } = releaseFingerprintDeadlines(timeoutMs);
  const pgArgs = `-U ${quote(endpoint.user)} -d ${quote(endpoint.database)}`;
  const options = `-c statement_timeout=${statementMs} -c lock_timeout=${lockMs}`;
  const schema = `pg_dump --schema-only --no-owner --no-acl --quote-all-identifiers --lock-wait-timeout=${lockMs}ms ${pgArgs} | sed -e '/^\\\\restrict /d' -e '/^\\\\unrestrict /d' | sha256sum`;
  const rows = `printf %s ${quote(releaseFingerprintSql)} | psql -X -qAt -v ON_ERROR_STOP=1 ${pgArgs} | LC_ALL=C sort | sha256sum`;
  // PostgreSQL may be container PID 1: never orphan signaled grandchildren into
  // its wait loop. Program/timer shells catch termination and reap children.
  // Capture a finite list once. Bare wait-all in a signal trap can revisit a
  // cached non-child Bash job indefinitely; explicit PID waits each run once.
  const reapOnSignal = `trap '' TERM HUP INT; fingerprint_jobs=$(jobs -p); for fingerprint_job in $fingerprint_jobs; do wait "$fingerprint_job" 2>/dev/null || true; done; exit 124`;
  const script = `trap ${quote(reapOnSignal)} TERM HUP INT; export PGOPTIONS=${quote(options)}; ${schema}; ${rows}`;
  // Escalation targets only direct binary children in the owned program group;
  // its Bash parent remains alive to reap them. Never KILL the whole group.
  const leaves = `ps -o pid,ppid,pgid | awk -v owner="$fingerprint_child" ${quote('$2 == owner && $3 == owner { print $1 }')}`;
  const stopGroup = `trap '' ALRM TERM HUP INT; if test -n "$fingerprint_child"; then kill -TERM -- -"$fingerprint_child" 2>/dev/null || true; sleep ${cleanupMs / 2000}; for fingerprint_leaf in $(${leaves}); do kill -KILL -- "$fingerprint_leaf" 2>/dev/null || true; done; wait "$fingerprint_child" 2>/dev/null || true; fi; if test -n "$fingerprint_timer"; then kill -TERM -- -"$fingerprint_timer" 2>/dev/null || true; wait "$fingerprint_timer" 2>/dev/null || true; fi; exit 124`;
  // Fresh Bash avoids an asynchronous subshell inheriting the supervisor's
  // other jobs. Signal traps set a flag; only ordinary code waits for sleep.
  const timer = `fingerprint_timer_stopped=0; trap 'fingerprint_timer_stopped=1' TERM HUP INT; sleep ${remoteMs / 1000} & fingerprint_sleep=$!; wait "$fingerprint_sleep" || { wait "$fingerprint_sleep" 2>/dev/null || true; exit 124; }; if test "$fingerprint_timer_stopped" = 1; then exit 124; fi; kill -ALRM "$1"`;
  const supervisor = `set -m; fingerprint_owner=$BASHPID; fingerprint_child=; fingerprint_timer=; trap ${quote(stopGroup)} ALRM TERM HUP INT; bash -e -o pipefail -c ${quote(script)} & fingerprint_child=$!; bash -e -o pipefail -c ${quote(timer)} fingerprint-timer "$fingerprint_owner" & fingerprint_timer=$!; fingerprint_status=0; wait "$fingerprint_child" || fingerprint_status=$?; kill -TERM -- -"$fingerprint_timer" 2>/dev/null || true; wait "$fingerprint_timer" 2>/dev/null || true; exit "$fingerprint_status"`;
  return `docker exec -i ${quote(endpoint.container)} bash -e -o pipefail -c ${quote(supervisor)}`;
}
