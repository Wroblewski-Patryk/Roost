import { buildReleaseFingerprintCommand, releaseFingerprintTimeoutSchema } from './agent-host-release-fingerprint.mjs';

const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const captureIdPattern = /^[a-f0-9]{32}$/;
const fingerprintLine = /^[a-f0-9]{64}  -\n$/;
const fingerprintBytes = 136;
const header = Buffer.from('ROOSTCAP1\n');

export function parseReleaseSnapshotCapture(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < header.length + fingerprintBytes * 2 + 5
    || !bytes.subarray(0, header.length).equals(header)) throw Error('release_backup_capture_invalid');
  const beforeStart = header.length, archiveStart = beforeStart + fingerprintBytes;
  const afterStart = bytes.length - fingerprintBytes;
  const before = bytes.subarray(beforeStart, archiveStart).toString('ascii');
  const after = bytes.subarray(afterStart).toString('ascii');
  const parse = value => {
    const lines = value.match(/.{64}  -\n/g);
    if (!lines || lines.length !== 2 || lines.join('') !== value || !lines.every(line => fingerprintLine.test(line)))
      throw Error('release_backup_capture_invalid');
    return { schemaDigest: lines[0].slice(0, 64), dataDigest: lines[1].slice(0, 64) };
  };
  const archive = bytes.subarray(archiveStart, afterStart);
  if (archive.subarray(0, 5).toString('ascii') !== 'PGDMP') throw Error('release_backup_capture_invalid');
  return { before: parse(before), archive, after: parse(after) };
}

// The exported transaction, two independent fingerprints and pg_dump live in
// one owned SSH operation. No remote archive or snapshot token is persisted.
// Rows/catalog share one snapshot; non-MVCC sequences must remain stable across
// both fingerprints and match the isolated restore or the gateway rejects it.
export function buildReleaseSnapshotCaptureScript(endpoint, timeoutMs, captureId) {
  releaseFingerprintTimeoutSchema.parse(timeoutMs);
  if (!captureIdPattern.test(captureId) || !/^[a-f0-9]{64}$/.test(endpoint.container)
    || !/^[a-zA-Z][a-zA-Z0-9_]{0,62}$/.test(endpoint.user)
    || !/^[a-zA-Z][a-zA-Z0-9_]{0,62}$/.test(endpoint.database)) throw Error('release_backup_capture_config_invalid');
  const appName = `roost_backup_capture_${captureId}`;
  const idleMs = timeoutMs * 4;
  const pgArgs = `-U ${quote(endpoint.user)} -d ${quote(endpoint.database)}`;
  const psql = `docker exec -i ${quote(endpoint.container)} psql -X -qAt -v ON_ERROR_STOP=1 ${pgArgs}`;
  const fingerprint = buildReleaseFingerprintCommand(endpoint, timeoutMs, { captureSnapshot: true });
  const dump = `docker exec -i ${quote(endpoint.container)} pg_dump --format=custom --no-owner --no-acl --snapshot="$snapshot_id" ${pgArgs}`;
  const begin = `SET application_name='${appName}'; SET idle_in_transaction_session_timeout='${idleMs}ms'; BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_backend_pid()::text || ':' || pg_export_snapshot();`;
  const inspect = `SELECT count(*) FROM pg_stat_activity WHERE pid=$snapshot_pid AND application_name='${appName}';`;
  const script = `set -e -o pipefail
snapshot_input=; snapshot_pid=; snapshot_id=
capture_fingerprint() { ${fingerprint}; }
capture_cleanup() {
  if test -n "$snapshot_input"; then printf 'ROLLBACK;\n\\q\n' >&"$snapshot_input" 2>/dev/null || true; fi
  if test -n "\${SNAPSHOT_PID:-}"; then wait "$SNAPSHOT_PID" 2>/dev/null || true; fi
}
trap capture_cleanup EXIT
coproc SNAPSHOT { ${psql}; }
snapshot_input=\${SNAPSHOT[1]}
printf '%s\n' ${quote(begin)} >&"$snapshot_input"
IFS= read -r -t ${Math.max(1, Math.min(30, Math.floor(timeoutMs / 1000)))} snapshot_result <&"\${SNAPSHOT[0]}"
[[ "$snapshot_result" =~ ^([1-9][0-9]*):([0-9A-Fa-f]{8}-[0-9A-Fa-f]{8}-[0-9A-Fa-f]{1,16})$ ]] || exit 1
snapshot_pid=\${BASH_REMATCH[1]}; snapshot_id=\${BASH_REMATCH[2]}
printf 'ROOSTCAP1\n'
capture_fingerprint
${dump}
capture_fingerprint
printf 'ROLLBACK;\n\\q\n' >&"$snapshot_input"
wait "$SNAPSHOT_PID"
snapshot_input=
test "$(${psql} <<SQL
${inspect}
SQL
)" = 0
trap - EXIT
`;
  return script;
}

export function buildReleaseSnapshotCaptureCommand(endpoint, timeoutMs, captureId) {
  return `bash -e -o pipefail -c ${quote(buildReleaseSnapshotCaptureScript(endpoint, timeoutMs, captureId))}`;
}
