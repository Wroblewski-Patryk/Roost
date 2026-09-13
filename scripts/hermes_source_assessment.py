"""Verify a dated, static source assessment. No network, subprocess or admission."""
import argparse
import hashlib
import json
import pathlib
import re
import stat
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = 'config/hermes/source-assessment.json'
MANIFEST_SHA256 = 'ad264486fb80318ea98b413eeae547c51b3a5f7edd8382190b20f560c0b69fcb'
VERDICT = 'OPENSHELL-NOT-REQUIRED-FOR-CODEX-RUNTIME-CANDIDATE'
REQUIREMENTS = ('repository', 'filesystem', 'network', 'host-lifecycle',
                'credentials', 'mcp-plugins', 'process-tree', 'budgets', 'retries',
                'session', 'context', 'windows', 'audit', 'release-authority')
FLAGS = ('installAuthorized', 'executionSupported', 'pilotReady',
         'liveAdmissionAllowed', 'externalWriteAuthorized', 'nextTaskStarted')
MAX_FILE = 4 * 1024 * 1024
MAX_TOTAL = 32 * 1024 * 1024


class AssessmentError(ValueError):
    pass


def need(ok, code):
    if not ok:
        raise AssessmentError(code)


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'),
                      ensure_ascii=True, allow_nan=False).encode('ascii')


def load(raw):
    need(type(raw) is bytes and 0 < len(raw) <= 262144, 'manifest_size')
    def pairs(rows):
        out = {}
        for key, value in rows:
            need(key not in out, 'duplicate_key')
            out[key] = value
        return out
    def reject(_):
        raise AssessmentError('noninteger_number')
    try:
        value = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                           parse_float=reject, parse_constant=reject)
        need(type(value) is dict, 'manifest_object')
        return value
    except (UnicodeError, RecursionError, json.JSONDecodeError):
        raise AssessmentError('manifest_syntax') from None


def read(root, relative, maximum=MAX_FILE):
    need(type(relative) is str and re.fullmatch(r'[A-Za-z0-9_./-]+', relative)
         and not relative.startswith('/')
         and all(p not in ('', '.', '..') for p in relative.split('/')), 'relative_path')
    path = pathlib.Path(root).absolute() / relative
    try:
        for parent in (path, *path.parents):
            info = parent.lstat()
            need(not stat.S_ISLNK(info.st_mode)
                 and not getattr(info, 'st_file_attributes', 0) & 0x400, 'reparse_path')
        info = path.stat()
        need(stat.S_ISREG(info.st_mode) and 0 < info.st_size <= maximum, 'file_size')
        with path.open('rb') as stream:
            raw = stream.read(maximum + 1)
        need(len(raw) == info.st_size and len(raw) <= maximum, 'read_changed')
        return raw
    except OSError:
        raise AssessmentError('evidence_unavailable') from None


def allowed_url(url):
    u = urlparse(url)
    if u.scheme != 'https' or u.username or u.password or u.fragment:
        return False
    if u.netloc == 'api.github.com':
        return any(u.path == '/repos/' + name or u.path.startswith('/repos/' + name + '/')
                   for name in ('NousResearch/hermes-agent', 'hermes-agent-org/hermes'))
    if u.netloc == 'raw.githubusercontent.com':
        return u.path.startswith('/NousResearch/hermes-agent/939e45c91d751fadd94dcd1b873ac3cb44846213/')
    if u.netloc == 'hermes-agent.nousresearch.com':
        return u.path == '/' and not u.query
    if u.netloc == 'learn.chatgpt.com':
        return u.path.startswith('/docs/') and u.path.endswith('.md') and not u.query
    return u.netloc == 'registry.npmjs.org' and u.path in (
        '/@openai%2Fcodex/latest', '/@openai%2Fcodex/0.154.0-win32-x64') and not u.query


def check_shape(packet):
    need(set(packet) == {'schemaVersion', 'assessmentId', 'verdict', 'scope', 'observedFrom',
                        'checkedAt', 'identity', 'codex', 'authority', 'responses', 'sources',
                        'objects', 'localBindings', 'report', 'requirements', 'mainComparison'}, 'fields')
    need(packet['schemaVersion'] == 1 and packet['assessmentId'] == 'hermes.source-assessment.v1', 'identity')
    need(packet['verdict'] == VERDICT and packet['scope'] == 'static-only-no-runtime-proof', 'scope')
    need(set(packet['authority']) == set(FLAGS)
         and all(packet['authority'][key] is False for key in FLAGS), 'authority')
    need([r['id'] for r in packet['requirements']] == list(REQUIREMENTS), 'requirement_coverage')
    sources = packet['sources']
    need(len(sources) == 29 and len({r['path'] for r in sources}) == 29, 'source_coverage')
    ids = [r['id'] for r in packet['responses']]
    need(len(ids) == 53 and len(set(ids)) == 53, 'response_coverage')
    need(all(allowed_url(r['url']) for r in packet['responses']), 'source_scope')
    need(sum(r['bytes'] for r in packet['responses']) <= MAX_TOTAL, 'aggregate_size')
    for row in packet['requirements']:
        need(set(row) == {'id', 'provider', 'appServer', 'evidence', 'reason'}, 'requirement_fields')
        need(row['provider'] in ('PASS', 'BLOCKED', 'UNPROVEN')
             and row['appServer'] in ('PASS', 'BLOCKED', 'UNPROVEN'), 'requirement_status')
        need(row['evidence'] and set(row['evidence']) <= set(ids), 'requirement_evidence')
        need(type(row['reason']) is str and 20 <= len(row['reason']) <= 600, 'requirement_reason')


def git_hash(kind, raw):
    return hashlib.sha1(kind.encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()


def check_tree(document):
    need(document.get('truncated') is False and 0 < len(document['tree']) <= 30000, 'tree_incomplete')
    entries, children = {}, {}
    for row in document['tree']:
        path = row['path']
        need(path not in entries and not path.startswith('/')
             and not any(p in ('', '.', '..') for p in path.split('/')), 'tree_path')
        need(row['mode'] in ('040000', '100644', '100755', '120000', '160000')
             and re.fullmatch('[a-f0-9]{40}', row['sha']), 'tree_entry')
        entries[path] = row
        parent, _, name = path.rpartition('/')
        children.setdefault(parent, []).append((name, row))
    roots = {'': document['sha'], **{p: r['sha'] for p, r in entries.items() if r['type'] == 'tree'}}
    for parent, expected in roots.items():
        rows = children.get(parent, [])
        rows.sort(key=lambda pair: (pair[0] + ('/' if pair[1]['type'] == 'tree' else '')).encode('utf-8'))
        raw = b''.join(r['mode'].lstrip('0').encode() + b' ' + name.encode('utf-8')
                       + b'\0' + bytes.fromhex(r['sha']) for name, r in rows)
        need(git_hash('tree', raw) == expected, 'tree_hash')
    need(set(children) <= set(roots), 'tree_parent')
    return entries


def verify_evidence(packet, evidence_root):
    documents = {}
    for row in packet['responses']:
        raw = read(evidence_root, row['id'] + '.raw')
        need(len(raw) == row['bytes'] and sha256(raw) == row['sha256'], 'response_drift')
        meta = json.loads(read(evidence_root, row['id'] + '.meta.json', 8192))
        need(meta == row, 'response_metadata_drift')
        documents[row['id']] = raw
    obj = lambda name: json.loads(documents[name])
    identity = packet['identity']
    need(obj('old-repo')['id'] == identity['repositoryId']
         and obj('old-repo')['full_name'] == identity['repository'], 'repository_identity')
    need(obj('repo')['id'] == identity['excludedRepositoryId']
         and obj('repo')['id'] != obj('old-repo')['id'], 'lineage')
    need(b'https://github.com/NousResearch/hermes-agent' in documents['official-home'], 'official_link')
    for key in ('hermes-latest', 'hermes-latest-final'):
        value = obj(key)
        need(value['tag_name'] == identity['release'] and value['published_at'] == identity['publishedAt']
             and value['draft'] is False and value['prerelease'] is False, 'release_identity')
    refs = [r for r in obj('hermes-tags') if r['ref'] == 'refs/tags/' + identity['release']]
    need(len(refs) == 1 and refs[0]['object']['sha'] == identity['tagObject'], 'tag_ref')
    need(obj('stable-object')['object']['sha'] == identity['commit']
         and obj('stable-commit')['tree']['sha'] == identity['tree'], 'release_chain')
    stable = check_tree(obj('stable-tree'))
    main = check_tree(obj('main-tree'))
    need(obj('stable-tree')['sha'] == identity['tree'], 'stable_tree')
    comparison = packet['mainComparison']
    need(obj('main-commit')['sha'] == comparison['head']
         and obj('main-commit')['tree']['sha'] == obj('main-tree')['sha'] == comparison['tree'], 'main_tree')
    for name in ('hermes-head', 'hermes-head-final'):
        need(obj(name)['object']['sha'] == comparison['head'], 'main_ref')
    changed = []
    for row in packet['sources']:
        raw = documents[row['id']]
        need(stable[row['path']]['sha'] == row['gitBlob'] == git_hash('blob', raw)
             and sha256(raw) == row['sha256'] and len(raw) == row['bytes']
             == stable[row['path']]['size'], 'source_blob')
        if main[row['path']]['sha'] != row['gitBlob']:
            changed.append(row['path'])
    need(changed == comparison['changedSelectedPaths'], 'main_comparison')
    for row in packet['objects']:
        raw = read(evidence_root, row['id'] + '.git-object', 16384)
        need(git_hash(row['type'], raw) == row['sha1'] == obj(row['id'])['sha']
             and sha256(raw) == row['sha256'] and len(raw) == row['bytes'], 'git_object')
    for key, name in (('codex-package', 'package'), ('codex-windows-package', 'windowsPackage')):
        value, expected = obj(key), packet['codex'][name]
        need(value['name'] == '@openai/codex' and value['version'] == expected['version']
             and value['dist']['integrity'] == expected['integrity'], 'codex_metadata')


def verify(raw, evidence_root, repository=ROOT):
    packet = load(raw)
    check_shape(packet)
    need(sha256(canonical(packet)) == MANIFEST_SHA256, 'manifest_drift')
    for row in [packet['report'], *packet['localBindings']]:
        content = read(repository, row['path'])
        # Text files are checkout-normalized; historical JSON byte continuity is separate.
        normalized = content.replace(b'\r\n', b'\n')
        need(sha256(normalized) == row['sha256'], 'local_document_drift')
    verify_evidence(packet, evidence_root)
    return {'verdict': VERDICT, 'assessmentValid': True, 'runtimeProof': False,
            'executionSupported': False, 'checkedAt': packet['checkedAt'],
            'sources': len(packet['sources']), 'requirements': len(packet['requirements'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-root', type=pathlib.Path, required=True)
    args = parser.parse_args()
    try:
        result = verify(read(ROOT, MANIFEST, 262144), args.evidence_root)
    except (AssessmentError, KeyError, TypeError, ValueError) as error:
        print(json.dumps({'assessmentValid': False, 'reason': str(error) if isinstance(error, AssessmentError)
                          else 'invalid_evidence', 'executionSupported': False}))
        return 2
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
