"""RF019 static metadata checks only; no payload acquisition or candidate execution."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/architecture'
REPORT = BASE / 'direct-codex-precomputed-schema-v1.md'
LEDGER = BASE / 'codex-precomputed-schema-source-ledger-v1.json'
INVENTORY = BASE / 'codex-precomputed-schema-source-inventory-v1.json'
LEDGER_SEAL = 'c6285635e897e8557c5413b17518dfb8c713f52457b66e3ca79d06d76ab3436e'
INVENTORY_SEAL = 'e7d7e4e4c2ccde48eef460cbccf6b4c9f94a3ad166c503a8dbb3233978d31161'


def need(condition, reason):
    if not condition:
        raise ValueError(reason)


def seal(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def validate_ledger(value):
    need(value['taskId'] == 'RF-CODEX-019' and value['closed'] is True and
         value['halted'] is True and
         value['closureReason'] == 'response_limit_reached_no_more_requests', 'ledger_closed')
    need(value['budget'] == {'maxRequests': 10, 'maxTotalBytes': 1048576,
         'maxResponseBytes': 163840, 'requestTimeoutSeconds': 20, 'maxRetries': 0}, 'budget')
    rows = value['requests']
    need(len(rows) == len({r['url'] for r in rows}) == 7 and
         sum(r['bytesRead'] for r in rows) == 257953, 'accounting')
    for i, row in enumerate(rows, 1):
        need(row['ordinal'] == i and row['method'] == 'GET' and row['status'] == 200 and
             row['readInFlightMax'] == 0 and row['redirectCount'] == 0 and
             row['redirectTo'] is None and 0 <= row['elapsedMillis'] < 20000 and
             0 < row['bytesRead'] <= 163840, 'request_limit')
        url = urlsplit(row['url'])
        need(url.scheme == 'https' and url.hostname in
             ('api.github.com', 'raw.githubusercontent.com') and
             re.fullmatch('[0-9a-f]{64}', row['sha256']), 'official_source')
        if i == 7:
            need(row['outcome'] == row['limitResult'] == 'over_limit' and
                 row['complete'] is False and row['bytesRead'] == 163840 and
                 row['contentLength'] is None, 'incomplete_response')
        else:
            need(row['outcome'] == 'complete' and row['complete'] is True and
                 row['limitResult'] == 'within_limit', 'completed_response')
    need(seal(value) == LEDGER_SEAL, 'ledger_drift')


def validate_inventory(value):
    need(value['taskId'] == 'RF-CODEX-019' and
         value['schemaId'] == 'roost-precomputed-schema-source-inventory-v1', 'inventory_identity')
    for key in ('completeGitTreeInventory', 'allTreesUntruncated'):
        need(value[key] is True, 'tree_completeness')
    for key in ('fileContentsRead', 'fileSha256Verified', 'exactPEBound'):
        need(value[key] is False, 'unverified_contents')
    files = value['files']
    need(len(files) == 305 and sum(f['bytes'] for f in files) == 3492670 and
         max(f['bytes'] for f in files) == 688845, 'inventory_totals')
    paths = [f['path'] for f in files]
    need(paths == sorted(paths) and len(set(p.casefold() for p in paths)) == 305, 'path_uniqueness')
    counts = {'': 0, 'v1': 0, 'v2': 0}
    for item in files:
        need(set(item) == {'path', 'bytes', 'gitBlobSha1'}, 'metadata_only')
        path = item['path']
        parts = PurePosixPath(path).parts
        need(re.fullmatch(r'[A-Za-z0-9_.\-/]+', path) and
             all(part not in ('.', '..') for part in parts) and not path.startswith('/') and
             '/'.join(parts) == path and len(parts) in (1, 2) and path.endswith('.json'), 'relative_path')
        parent = parts[0] if len(parts) == 2 else ''
        need(parent in counts and type(item['bytes']) is int and item['bytes'] > 0 and
             re.fullmatch('[0-9a-f]{40}', item['gitBlobSha1']), 'file_metadata')
        counts[parent] += 1
    need(counts == {'': 37, 'v1': 2, 'v2': 266}, 'tree_counts')
    need(seal(value) == INVENTORY_SEAL, 'inventory_drift')


def validate_report(content, ledger):
    need(re.findall(r'^## PCS-(\d{2}) ', content, re.M) ==
         [f'{i:02}' for i in range(1, 10)], 'sections')
    need(re.findall(r'^\| S(\d{2}) \|', content, re.M) ==
         [f'{i:02}' for i in range(1, 8)], 'source_table')
    need('Verdict: **PRECOMPUTED-APP-SERVER-SCHEMA-BLOCKED**.' in content, 'verdict')
    for key in ('implementationReady', 'executionSupported', 'pilotReady', 'liveAdmissionAllowed',
                'actualProbeAuthorized', 'actualProbeStarted', 'acquisitionAuthorized', 'acquisitionReady'):
        need(key + '=false' in content and key + '=true' not in content, 'false_readiness')
    for key in ('sourceBuildBinding', 'installedCodexVersion',
                'publisherBinarySchemaManifest', 'acceptedSchemaSha256'):
        need(key + '=null' in content and key + '=true' not in content, 'unqualified_binding')
    for phrase in ('305', '3,492,670', '256-file', '257,953', 'only the delivered prefix',
                   'That response was not parsed', 'All fifteen NSP entry gates remain closed',
                   'No JSON Schema self-check was run', INVENTORY_SEAL):
        need(phrase in content, 'evidence_limits')
    need(content.count('Exactly one recommended next atomic task:') == 1 and
         '**RF-CODEX-020' in content and 'RF-CODEX-020 was not started.' in content, 'next_task')
    need(len(content.encode()) <= 32768 and not re.search(
         r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/[a-z]/|BEGIN .*PRIVATE KEY)', content), 'public_scope')
    urls = {r['url'] for r in ledger['requests']}
    for row in ledger['requests']:
        need(row['url'] in content and row['sha256'] in content, 'source_reference')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', content):
        if '://' in target:
            need(target in urls, 'unrecorded_source')
        else:
            filename, _, fragment = unquote(target).partition('#')
            path = (REPORT.parent / filename).resolve()
            need(path.is_relative_to(ROOT) and path.name != 'design-qa.md' and
                 path.is_file() and not fragment, 'local_link')


def main():
    need(LEDGER.stat().st_size <= 32768 and INVENTORY.stat().st_size <= 65536, 'metadata_size')
    ledger = json.loads(LEDGER.read_text(encoding='utf-8'))
    validate_ledger(ledger)
    validate_inventory(json.loads(INVENTORY.read_text(encoding='utf-8')))
    validate_report(REPORT.read_text(encoding='utf-8'), ledger)
    return {'result': 'PASS', 'scope': 'static_precomputed_metadata_only', 'requests': 7,
            'bodyBytes': 257953, 'sourceFiles': 305, 'schemaContentsRead': False,
            'exactPEBound': False, 'acquisitionReady': False, 'candidateExecuted': False}


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except (ValueError, KeyError, TypeError, OSError):
        print(json.dumps({'result': 'FAIL', 'scope': 'static_precomputed_metadata_only'}))
        sys.exit(1)
