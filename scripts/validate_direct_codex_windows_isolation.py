"""Static RF017/RF021 checks; no network, setup or process launch."""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/architecture'
REPORT = BASE / 'direct-codex-windows-standard-isolation-v1.md'
LEDGER = BASE / 'codex-windows-isolation-source-ledger-v1.json'
ADMISSION = BASE / 'direct-codex-native-setup-admission-v1.md'
ADMISSION_LEDGER = BASE / 'codex-native-setup-admission-source-ledger-v1.json'
ADMISSION_SEAL = 'af196a02623f036a7a00fabb68b3d4045e8b73f405735037c24b0f0fa75d4302'
BUDGET = {'maxRequests': 8, 'maxTotalBytes': 786432, 'maxResponseBytes': 131072,
          'requestTimeoutSeconds': 20, 'maxRetries': 0}
PINS = (
    ("https://learn.chatgpt.com/docs/windows/windows-sandbox.md", 200, 11206, "294f0c8de1d2201ba562ccb88367a21bce2f2472f65f4dc8486b7c0b2e3f3efc"),
    ("https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/README.md", 404, 14, "d5558cd419c8d46bdc958064cb97f963d1ea793866414c025906ec15033512ed"),
    ("https://api.github.com/repos/openai/codex/contents/codex-rs/windows-sandbox-rs?ref=6b9826e3aa83b1a5947db50f4332cb9c65f1b340", 200, 7268, "496f40bb0136ebe2721553d2183c8a8b3b18314ab2f5b1727a401bdaff819006"),
    ("https://raw.githubusercontent.com/openai/codex/6b9826e3aa83b1a5947db50f4332cb9c65f1b340/codex-rs/windows-sandbox-rs/src/setup.rs", 200, 90820, "14ca824808b74a43f5aa8cd64f5804c31f97720ea5a4470debdf2a739de02bc4"),
    ("https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation", 200, 5325, "dedac3be2cf79b0bd12a6992ca707b4db33037f92670ef96ec599479d24d0bb4"),
    ("https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-createrestrictedtoken", 200, 14159, "52c554e392f151d359a87a3b56340d67f576c451dd993cb486f28e3992c67b0f"),
    ("https://learn.microsoft.com/en-us/windows/win32/fwp/filtering-condition-identifiers-", 200, 37266, "f08d37d292b672779f01a381fc00ac61f1b125d1e30435cebb43c6e53bcae57f"),
    ("https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview", 301, 0, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
)


def need(condition, reason):
    if not condition:
        raise ValueError(reason)


def validate_ledger(value):
    need(value['schemaId'] == 'roost-codex-source-metadata-ledger-v1' and
         value['taskId'] == 'RF-CODEX-017' and value['budget'] == BUDGET, 'ledger_identity')
    need(value['closed'] is True and value['halted'] is False and
         value['closureReason'] == 'authorized_request_budget_complete', 'ledger_closed')
    rows = value['requests']
    need(len(rows) == 8 and len({row['url'] for row in rows}) == 8, 'request_count_or_retry')
    need(sum(row['bytesRead'] for row in rows) == 166058, 'body_accounting')
    for i, (row, pin) in enumerate(zip(rows, PINS), 1):
        need((row['url'], row['status'], row['bytesRead'], row['sha256']) == pin, 'source_binding')
        need(row['ordinal'] == i and row['method'] == 'GET' and
             row['category'] == 'documentation', 'request_scope')
        need(row['complete'] is True and row['readInFlightMax'] == 0 and
             row['limitResult'] == 'within_limit' and
             type(row['elapsedMillis']) is int and 0 <= row['elapsedMillis'] < 20000,
             'unfinished_or_expired')
        need(row['contentLength'] in (None, row['bytesRead']) and
             row['bytesRead'] <= BUDGET['maxResponseBytes'], 'body_limit')
        need(row['redirectCount'] == (1 if i == 8 else 0) and
             row['redirectTo'] is None and
             row['redirectTargetAllowed'] is (False if i == 8 else None), 'redirect_policy')
        need(row['outcome'] == ('http_error' if i == 2 else
             'redirect_denied' if i == 8 else 'complete'), 'outcome')


def validate_report(content):
    need(re.findall(r'^## WSI-(\d{2}) ', content, re.M) ==
         [f'{i:02}' for i in range(1, 14)], 'decision_sections')
    need(re.findall(r'^\| WSI-T(\d{2}) \|', content, re.M) ==
         [f'{i:02}' for i in range(1, 6)], 'acceptance_cases')
    need(re.findall(r'^\| (S\d{2}) \|', content, re.M) ==
         [f'S{i:02}' for i in range(1, 9)], 'source_rows')
    need(re.findall(r'^\| ([ABCD]):', content, re.M) == list('ABCD'), 'alternatives')
    need('Verdict: **WINDOWS-STANDARD-ISOLATION-BLOCKED**.' in content, 'disposition')
    for key in ('implementationReady', 'executionSupported', 'pilotReady', 'liveAdmissionAllowed',
                'actualProbeAuthorized', 'actualProbeStarted', 'setupAuthorized',
                'setupStarted', 'setupContractReady'):
        need(key + '=false' in content and key + '=true' not in content, 'gate_promotion')
    for key in ('generatorArgv', 'sourceBuildBinding', 'sandboxLauncherArgv',
                'setupArgv', 'mutationManifest', 'rollbackPlan', 'setupMaxDurationSeconds'):
        need(key + '=null' in content, 'unqualified_value')
    need(content.count('Exactly one recommended next atomic task:') == 1 and
         '**RF-CODEX-018' in content and 'RF-CODEX-018 was not started.' in content,
         'next_task')
    need('NOT RUN' in content and '166,058' in content, 'evidence_classification')
    need(len(content.encode()) <= 32768 and
         not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/[a-z]/|BEGIN .*PRIVATE KEY)', content),
         'public_scope')
    urls = {row[0] for row in PINS}
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', content):
        if '://' in target:
            need(target in urls, 'unrecorded_remote_source')
        else:
            filename, _, fragment = unquote(target).partition('#')
            path = (REPORT.parent / filename).resolve()
            need(path.is_relative_to(ROOT) and path.name != 'design-qa.md' and
                 path.is_file() and not fragment, 'local_link')
    for url, status, size, digest in PINS:
        need(url in content and digest in content, 'report_source_digest')


def validate_setup_admission(ledger, content):
    need(ledger['taskId'] == 'RF-CODEX-021' and ledger['closed'] is True and
         ledger['halted'] is False and ledger['closureReason'] ==
         'source_round_complete_no_more_requests', 'admission_closed')
    need(ledger['budget'] == {'maxRequests': 8, 'maxTotalBytes': 1048576,
         'maxResponseBytes': 163840, 'requestTimeoutSeconds': 20, 'maxRetries': 0}, 'admission_budget')
    rows = ledger['requests']
    need(len(rows) == len({r['url'] for r in rows}) == 8 and
         sum(r['bytesRead'] for r in rows) == 185705, 'admission_accounting')
    for i, row in enumerate(rows, 1):
        need(row['ordinal'] == i and row['status'] == 200 and row['complete'] is True and
             row['outcome'] == 'complete' and row['limitResult'] == 'within_limit' and
             row['readInFlightMax'] == 0 and row['redirectCount'] == 0 and
             0 < row['bytesRead'] <= 163840 and 0 <= row['elapsedMillis'] < 20000,
             'admission_response')
        need(row['url'] in content and row['sha256'] in content, 'admission_source')
    digest = hashlib.sha256(json.dumps(ledger, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    need(digest == ADMISSION_SEAL, 'admission_ledger_drift')
    need(re.findall(r'^## NSA-(\d{2}) ', content, re.M) == [f'{i:02}' for i in range(1, 7)], 'admission_sections')
    need(tuple(re.findall(r'^\| ([a-z_]+) \|', content, re.M)) ==
         ('argv', 'artifact', 'trust', 'closure', 'principal', 'environment', 'discovery',
          'filesystem', 'network', 'process_tree', 'budgets', 'output', 'host', 'authority', 'review'),
         'admission_gates')
    need('Verdict: **NATIVE-SCHEMA-SETUP-ADMISSION-BLOCKED**.' in content, 'admission_verdict')
    for key in ('setupContractReady', 'setupAuthorized', 'setupStarted', 'outerLaunchReady',
                'actualProbeAuthorized', 'actualProbeStarted', 'implementationReady',
                'executionSupported', 'pilotReady', 'liveAdmissionAllowed'):
        need(key + '=false' in content and key + '=true' not in content, 'admission_promotion')
    for key in ('setupArgv', 'setupRevision', 'generatorArgv', 'runnerArgv', 'sourceBuildBinding',
                'mutationManifest', 'rollbackPlan', 'setupMaxDurationSeconds'):
        need(key + '=null' in content, 'admission_unknown')
    need(content.count('Exactly one recommended next atomic task:') == 1 and
         '**RF-CODEX-022' in content and 'RF-CODEX-022 was not started.' in content and
         content.count('draft architecture question') == 1, 'admission_next_decision')
    need(all(term in content for term in ('preserve_descendants', 'lpApplicationName',
         'IPC_PROTOCOL_VERSION=6', 'INFINITE', 'blocked delta worksheet',
         'Independent review has not run', 'All fifteen NSP entry gates remain closed')),
         'admission_limits')
    need(len(content.encode()) <= 32768 and not re.search(
         r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/[a-z]/|BEGIN .*PRIVATE KEY)', content), 'admission_public_scope')
    urls = {r['url'] for r in rows}
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', content):
        if '://' in target:
            need(target in urls, 'admission_unrecorded_source')
        else:
            path = (BASE / unquote(target)).resolve()
            need(path.is_relative_to(ROOT) and path.name != 'design-qa.md' and path.is_file(), 'admission_link')


def main():
    raw = LEDGER.read_bytes()
    need(len(raw) <= 32768, 'ledger_size')
    validate_ledger(json.loads(raw))
    validate_report(REPORT.read_text(encoding='utf-8'))
    need(ADMISSION_LEDGER.stat().st_size <= 32768, 'admission_ledger_size')
    validate_setup_admission(json.loads(ADMISSION_LEDGER.read_text(encoding='utf-8')),
                             ADMISSION.read_text(encoding='utf-8'))
    return {'result': 'PASS', 'scope': 'static_isolation_research_only',
            'requests': 8, 'bodyBytes': 166058, 'alternatives': 4, 'acceptanceCases': 5,
            'setupAdmissionRequests': 8, 'setupAdmissionBodyBytes': 185705,
            'setupReady': False, 'effectiveIsolationQualified': False,
            'codexExecuted': False}


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except (ValueError, KeyError, TypeError, OSError):
        print(json.dumps({'result': 'FAIL', 'scope': 'static_isolation_research_only'}))
        sys.exit(1)
