"""RF018 static ledger/decision validation; never launches a candidate or fetches sources."""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/architecture'
REPORT = BASE / 'direct-codex-native-outer-launch-v1.md'
LEDGER = BASE / 'codex-native-outer-launch-source-ledger-v1.json'
LEDGER_SEAL = '4db254534b068fef12d31bc9b10d268adb0c747f5a1ff3fdb6bc38fb158ac3f1'
GATES = ('argv', 'artifact', 'trust', 'closure', 'principal', 'environment', 'discovery',
         'filesystem', 'network', 'process_tree', 'budgets', 'output', 'host', 'authority', 'review')


def need(condition, reason):
    if not condition:
        raise ValueError(reason)


def validate_ledger(value):
    seal = hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    need(seal == LEDGER_SEAL, 'ledger_drift')
    need(value['taskId'] == 'RF-CODEX-018' and value['closed'] is True and
         value['halted'] is False, 'ledger_closed')
    need(value['budget'] == {'maxRequests': 8, 'maxTotalBytes': 786432,
         'maxResponseBytes': 131072, 'requestTimeoutSeconds': 20, 'maxRetries': 0}, 'budget')
    rows = value['requests']
    need(len(rows) == len({r['url'] for r in rows}) == 8 and
         sum(r['bytesRead'] for r in rows) == 185643, 'accounting')
    need(value['routeDenialContinuation'] == {'ordinal': 1,
         'reason': 'declared_length_rejected_before_body_read', 'sameUrlRetryAllowed': False,
         'remainingDistinctRequestsAllowed': True, 'limitsUnchanged': True}, 'route_denial')
    for i, row in enumerate(rows, 1):
        need(row['ordinal'] == i and row['method'] == 'GET' and row['readInFlightMax'] == 0 and
             row['redirectCount'] == 0 and row['elapsedMillis'] < 20000 and
             row['bytesRead'] <= 131072, 'request_limit')
        need(urlsplit(row['url']).hostname in ('raw.githubusercontent.com', 'learn.chatgpt.com'),
             'official_source')
        if i == 1:
            need(row['outcome'] == 'over_limit' and row['bytesRead'] == 0 and
                 row['contentLength'] == 184508 and row['complete'] is False, 'header_only_denial')
        else:
            need(row['outcome'] == ('http_error' if i == 3 else 'complete') and
                 row['complete'] is True and row['limitResult'] == 'within_limit', 'completed_route')


def validate_report(content, ledger):
    need(re.findall(r'^## NOL-(\d{2}) ', content, re.M) ==
         [f'{i:02}' for i in range(1, 10)], 'sections')
    need(tuple(re.findall(r'^\| ([a-z_]+) \|', content, re.M)) == GATES, 'gate_mapping')
    need(re.findall(r'^\| S(\d{2}) \|', content, re.M) ==
         [f'{i:02}' for i in range(1, 9)], 'source_table')
    need('Verdict: **OFFICIAL-NATIVE-SANDBOX-OUTER-LAUNCH-BLOCKED**.' in content, 'verdict')
    for key in ('implementationReady', 'executionSupported', 'pilotReady', 'liveAdmissionAllowed',
                'actualProbeAuthorized', 'actualProbeStarted', 'setupAuthorized', 'setupStarted',
                'outerLaunchReady'):
        need(key + '=false' in content and key + '=true' not in content, 'false_readiness')
    for key in ('sourceBuildBinding', 'installedCodexVersion', 'generatorArgv',
                'sandboxLauncherArgv', 'setupRevision', 'accountPolicyBinding'):
        need(key + '=null' in content, 'unqualified_binding')
    need(content.count('Exactly one recommended next atomic task:') == 1 and
         '**RF-CODEX-019' in content and 'RF-CODEX-019 was not started.' in content, 'next_task')
    need('not inspected' in content and 'route-only continuation' in content and
         '185,643' in content and 'timeout_ms=None' in content,
         'evidence_limits')
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
    raw = LEDGER.read_bytes()
    need(len(raw) <= 32768, 'ledger_size')
    ledger = json.loads(raw)
    validate_ledger(ledger)
    validate_report(REPORT.read_text(encoding='utf-8'), ledger)
    return {'result': 'PASS', 'scope': 'static_outer_launch_research_only', 'requests': 8,
            'bodyBytes': 185643, 'headerOnlyDenials': 1, 'entryGatesClosed': 15,
            'outerLaunchReady': False, 'candidateExecuted': False}


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except (ValueError, KeyError, TypeError, OSError):
        print(json.dumps({'result': 'FAIL', 'scope': 'static_outer_launch_research_only'}))
        sys.exit(1)
