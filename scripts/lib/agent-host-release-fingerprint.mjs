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

// Only fixed scripts run in the container. COPY streams hex row hashes, never
// business rows. PostgreSQL still renders the historical JSON and retains its
// original collation and repeatable-read snapshot. No aggregate grows with rows.
const hashProgram = `set -e -o pipefail
trap 'trap "" TERM HUP INT; for child in $(jobs -p); do wait "$child" 2>/dev/null || true; done; exit 124' TERM HUP INT
LC_ALL=C awk 'length($0) != 64 || $0 !~ /^[0-9a-f]+$/ { exit 1 } { printf "%s", $0 }' | sha256sum > "$ROOST_FINGERPRINT_DIR/digest"
`;
const readDigestProgram = `set -e -o pipefail
trap 'trap "" TERM HUP INT; for child in $(jobs -p); do wait "$child" 2>/dev/null || true; done; exit 124' TERM HUP INT
LC_ALL=C awk 'NR != 1 || NF != 2 || length($1) != 64 || $1 !~ /^[0-9a-f]+$/ || $2 != "-" { bad=1; exit 1 } END { if (bad || NR != 1) exit 1; print $1 }' "$ROOST_FINGERPRINT_DIR/digest"
`;
const streamingSql = `\\getenv fingerprint_dir ROOST_FINGERPRINT_DIR
\\set fingerprint_script :fingerprint_dir '/relations.sql'
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT count(*) <= 10000 AS fingerprint_catalog_bounded FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (c.relkind IN ('r','p','m') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%') OR c.relkind='S'
\\gset
\\if :fingerprint_catalog_bounded
\\else
SELECT 'release_fingerprint_catalog_capacity_exceeded'::integer;
\\endif
SELECT format($fingerprint$
COPY (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS row_hash FROM %I.%I t ORDER BY row_hash) TO STDOUT
\\g | exec bash "$ROOST_FINGERPRINT_DIR/hash.sh"
\\set fingerprint_count :ROW_COUNT
\\if :{?SHELL_ERROR}
\\else
SELECT 'release_fingerprint_client_capability_unproven'::integer;
\\endif
\\if :SHELL_ERROR
SELECT 'release_fingerprint_pipeline_unproven'::integer;
\\endif
\\set fingerprint_digest \`exec bash "$ROOST_FINGERPRINT_DIR/read-digest.sh"\`
\\if :SHELL_ERROR
SELECT 'release_fingerprint_digest_unproven'::integer;
\\endif
SELECT :'fingerprint_count' ~ '^(0|[1-9][0-9]*)$' AS fingerprint_count_valid
\\gset
\\if :fingerprint_count_valid
\\else
SELECT 'release_fingerprint_count_unproven'::integer;
\\endif
SELECT jsonb_build_object('schema',%L,'table',%L,'count',:'fingerprint_count'::bigint,'digest',:'fingerprint_digest')::text;
$fingerprint$,n.nspname,c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p','m') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY n.nspname,c.relname
\\g :fingerprint_script
\\i :fingerprint_script
SELECT format('SELECT jsonb_build_object(''schema'',%L,''sequence'',%L,''lastValue'',last_value,''isCalled'',is_called)::text FROM %I.%I;',n.nspname,c.relname,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' ORDER BY n.nspname,c.relname
\\gexec
COMMIT;
`;

// Supervision runs inside the immutable container. Bash job control assigns
// separate groups to the fixed program and its timer. Both are reaped before
// exit; there is no detached timeout watchdog that can outlive its target PID.
// Server deadlines also bound a statement after transport loss. Business rows
// stay in PostgreSQL; their hashes and bounded metadata stay in the container.
export function buildReleaseFingerprintCommand(endpoint, timeoutMs) {
  const { remoteMs, cleanupMs, statementMs, lockMs } = releaseFingerprintDeadlines(timeoutMs);
  const pgArgs = `-U ${quote(endpoint.user)} -d ${quote(endpoint.database)}`;
  const options = `-c statement_timeout=${statementMs} -c lock_timeout=${lockMs} -c work_mem=4MB -c temp_file_limit=512MB -c max_parallel_workers_per_gather=0 -c jit=off`;
  const schema = `pg_dump --schema-only --no-owner --no-acl --quote-all-identifiers --lock-wait-timeout=${lockMs}ms ${pgArgs} | sed -e '/^\\\\restrict /d' -e '/^\\\\unrestrict /d' | sha256sum`;
  const rows = `printf %s ${quote(streamingSql)} | psql -X -qAt -v ON_ERROR_STOP=1 ${pgArgs} | LC_ALL=C sort | sha256sum`;
  // PostgreSQL may be container PID 1: never orphan signaled grandchildren into
  // its wait loop. Program/timer shells catch termination and reap children.
  // Capture a finite list once. Bare wait-all in a signal trap can revisit a
  // cached non-child Bash job indefinitely; explicit PID waits each run once.
  const reapOnSignal = `trap '' TERM HUP INT; fingerprint_jobs=$(jobs -p); for fingerprint_job in $fingerprint_jobs; do wait "$fingerprint_job" 2>/dev/null || true; done; exit 124`;
  const cleanup = `if test -n "$ROOST_FINGERPRINT_DIR"; then case "$ROOST_FINGERPRINT_DIR" in /tmp/roost-fingerprint.????????????) rm -rf -- "$ROOST_FINGERPRINT_DIR";; *) exit 1;; esac; fi`;
  const script = `trap ${quote(reapOnSignal)} TERM HUP INT; ROOST_FINGERPRINT_DIR=; trap ${quote(cleanup)} EXIT; export PGOPTIONS=${quote(options)}; umask 077; ulimit -f 65536; ROOST_FINGERPRINT_DIR=$(mktemp -d /tmp/roost-fingerprint.XXXXXXXXXXXX); export ROOST_FINGERPRINT_DIR; printf %s ${quote(hashProgram)} > "$ROOST_FINGERPRINT_DIR/hash.sh"; printf %s ${quote(readDigestProgram)} > "$ROOST_FINGERPRINT_DIR/read-digest.sh"; ${schema}; ${rows}`;
  // Escalation targets only binary leaves in the owned program group. Their
  // Bash/psql parents stay alive to reap them. Never KILL the whole group.
  const ownedProcesses = `ps -o pid=,ppid=,pgid=,comm=`;
  const leaves = `${ownedProcesses} | awk -v owner="$fingerprint_child" ${quote('$3 == owner { parent[$1]=$2; name[$1]=$4; children[$2]=1 } END { for (pid in parent) if (!children[pid] && name[pid] != "bash" && name[pid] != "psql") print pid }')}`;
  // Preserve the client while its exec-Bash pipe reaper closes. A whole-group
  // TERM would orphan that pipe under a postmaster which does not reap it.
  const terminate = `fingerprint_members=$(${ownedProcesses} | awk -v owner="$fingerprint_child" ${quote('$3 == owner {print $1 " " $4}')}); if printf '%s\\n' "$fingerprint_members" | grep -q ' psql$'; then while read -r fingerprint_pid fingerprint_name; do if test "$fingerprint_name" = psql; then kill -INT -- "$fingerprint_pid" 2>/dev/null || true; else kill -TERM -- "$fingerprint_pid" 2>/dev/null || true; fi; done <<< "$fingerprint_members"; else kill -TERM -- -"$fingerprint_child" 2>/dev/null || true; fi`;
  const stopGroup = `trap '' ALRM TERM HUP INT; if test -n "$fingerprint_child"; then ${terminate}; sleep ${cleanupMs / 2000}; for fingerprint_pass in 1 2 3 4; do for fingerprint_leaf in $(${leaves}); do kill -KILL -- "$fingerprint_leaf" 2>/dev/null || true; done; sleep ${cleanupMs / 8000}; done; wait "$fingerprint_child" 2>/dev/null || true; fi; if test -n "$fingerprint_timer"; then kill -TERM -- -"$fingerprint_timer" 2>/dev/null || true; wait "$fingerprint_timer" 2>/dev/null || true; fi; exit 124`;
  // Fresh Bash avoids an asynchronous subshell inheriting the supervisor's
  // other jobs. Signal traps set a flag; only ordinary code waits for sleep.
  const timer = `fingerprint_timer_stopped=0; trap 'fingerprint_timer_stopped=1' TERM HUP INT; sleep ${remoteMs / 1000} & fingerprint_sleep=$!; wait "$fingerprint_sleep" || { wait "$fingerprint_sleep" 2>/dev/null || true; exit 124; }; if test "$fingerprint_timer_stopped" = 1; then exit 124; fi; kill -ALRM "$1"`;
  const supervisor = `set -m; fingerprint_owner=$BASHPID; fingerprint_child=; fingerprint_timer=; trap ${quote(stopGroup)} ALRM TERM HUP INT; bash -e -o pipefail -c ${quote(script)} & fingerprint_child=$!; bash -e -o pipefail -c ${quote(timer)} fingerprint-timer "$fingerprint_owner" & fingerprint_timer=$!; fingerprint_status=0; wait "$fingerprint_child" || fingerprint_status=$?; kill -TERM -- -"$fingerprint_timer" 2>/dev/null || true; wait "$fingerprint_timer" 2>/dev/null || true; exit "$fingerprint_status"`;
  return `docker exec -i ${quote(endpoint.container)} bash -e -o pipefail -c ${quote(supervisor)}`;
}
