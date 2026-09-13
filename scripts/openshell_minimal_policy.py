"""Narrow offline Roost template guard; not the OpenShell parser or admission.

Only explicit template review can pass the unmaterialized fixture marker.
Default invocation fails closed. No fixture, network, Docker or WSL execution.
"""
import argparse
import hashlib
import json
import pathlib
import re

POLICY_ID = 'roost.synthetic-isolation.v1'
POLICY_VERSION = 1
UPSTREAM_VERSION = '0.0.116'
UPSTREAM_COMMIT = 'd1155aa70042d3e2ee49dbfa15346b108b7c1d92'
FIXTURE = '/opt/roost-fixture/bin/fake-app-server'
SCRATCH = '/sandbox/roost-fixture/scratch'
ENDPOINT = 'fixture.roost.test'
PLACEHOLDER = 'UNMATERIALIZED_FIXTURE_SHA256'
MAX_POLICY_BYTES = 8192
MAX_CONTRACT_BYTES = 16384
MAX_NODES = 512
MAX_DEPTH = 12
POLICY_SHA256 = 'f975cd82cf69b06813f3f7086cc7d0215b3affd57efef75ce7a1001b0012a512'
CONTRACT_SHA256 = '35c60e554191d34a3e83e4c9ef9772674a3b721c0706b04fc03f1b90cec36f33'


class PolicyError(ValueError):
    """Fixed diagnostic code only; never includes supplied keys or values."""


def need(condition, code):
    if not condition:
        raise PolicyError(code)


def canonical_bytes(value):
    # Restricted JSON: no floats, Unicode strings, aliases or duplicate keys.
    # The hash covers these exact UTF-8 bytes with no trailing newline.
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode('ascii')


def digest(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def load_json(raw, maximum):
    need(type(raw) is bytes and 0 < len(raw) <= maximum, 'input_size')
    def pairs(values):
        result = {}
        for key, value in values:
            need(key not in result, 'duplicate_key')
            result[key] = value
        return result
    try:
        obj = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                         parse_constant=lambda _: (_ for _ in ()).throw(PolicyError('nonfinite_number')))
    except PolicyError:
        raise
    except (UnicodeError, ValueError, RecursionError):
        raise PolicyError('json_syntax') from None
    count = 0
    def walk(value, depth):
        nonlocal count
        count += 1
        need(count <= MAX_NODES and depth <= MAX_DEPTH, 'structure_limit')
        need(type(value) in (dict, list, str, bool, int, type(None)), 'json_type')
        if type(value) is dict:
            for key, item in value.items():
                walk(key, depth + 1)
                walk(item, depth + 1)
        elif type(value) is list:
            for item in value:
                walk(item, depth + 1)
        elif type(value) is str:
            need(len(value) <= 512 and value.isascii() and not any(ord(c) < 32 or ord(c) == 127 for c in value), 'string_limit')
            need(not re.search(r'(?i)(?:private.key|bearer\s|(?:token|password|api.key|secret)\s*[:=])', value), 'potential_secret')
            need(not re.search(r'(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]{16,}', value), 'potential_secret')
    walk(obj, 0)
    return obj


def keys(value, expected, code='unknown_or_missing_key'):
    need(type(value) is dict and set(value) == set(expected), code)


def only(value, code):
    need(type(value) is list and len(value) == 1, code)
    return value[0]


def exact(value, expected, code):
    need(type(value) is type(expected) and value == expected, code)


def validate_policy(policy):
    keys(policy, ('version', 'filesystem_policy', 'landlock', 'process', 'network_policies', 'network_middlewares'))
    exact(policy['version'], 1, 'schema_version')
    fs = policy['filesystem_policy']
    keys(fs, ('include_workdir', 'read_only', 'read_write'))
    exact(fs['include_workdir'], False, 'implicit_workdir')
    exact(only(fs['read_only'], 'read_only_count'), FIXTURE, 'read_only_scope')
    exact(only(fs['read_write'], 'read_write_count'), SCRATCH, 'read_write_scope')
    keys(policy['landlock'], ('compatibility',))
    exact(policy['landlock']['compatibility'], 'hard_requirement', 'landlock_downgrade')
    keys(policy['process'], ('run_as_user', 'run_as_group'))
    for value in policy['process'].values():
        exact(value, 'sandbox', 'process_identity')
    keys(policy['network_policies'], ('synthetic_probe',), 'network_rule_count')
    rule = policy['network_policies']['synthetic_probe']
    keys(rule, ('name', 'endpoints', 'binaries'))
    exact(rule['name'], 'synthetic-probe-v1', 'network_rule_identity')
    endpoint = only(rule['endpoints'], 'endpoint_count')
    keys(endpoint, ('host', 'port', 'protocol', 'enforcement', 'rules'))
    exact(endpoint['host'], ENDPOINT, 'endpoint_scope')
    exact(endpoint['port'], 18080, 'endpoint_port')
    exact(endpoint['protocol'], 'rest', 'endpoint_protocol')
    exact(endpoint['enforcement'], 'enforce', 'endpoint_audit_mode')
    allow = only(endpoint['rules'], 'allow_rule_count')
    keys(allow, ('allow',))
    keys(allow['allow'], ('method', 'path'))
    exact(allow['allow']['method'], 'GET', 'http_method')
    exact(allow['allow']['path'], '/probe', 'http_path')
    binary = only(rule['binaries'], 'binary_count')
    keys(binary, ('path',))
    exact(binary['path'], FIXTURE, 'binary_scope')
    exact(policy['network_middlewares'], {}, 'middleware_forbidden')


def validate_contract(contract, policy_hash):
    keys(contract, ('schemaVersion', 'policyId', 'policyVersion', 'policySha256', 'canonicalization',
                    'upstream', 'replacement', 'networkDefault', 'fixture', 'scratch',
                    'deniedResources', 'requiredRuntimeEvidence', 'executionSupported', 'pilotReady'))
    exact(contract['schemaVersion'], 1, 'contract_schema')
    exact(contract['policyId'], POLICY_ID, 'policy_identity')
    exact(contract['policyVersion'], POLICY_VERSION, 'policy_revision')
    exact(contract['canonicalization'], 'roost-ascii-json-sorted-compact-v1', 'canonicalization')
    exact(contract['policySha256'], policy_hash, 'contract_policy_hash')
    upstream = contract['upstream']
    keys(upstream, ('version', 'commit', 'sourceSha256'))
    exact(upstream['version'], UPSTREAM_VERSION, 'upstream_version')
    exact(upstream['commit'], UPSTREAM_COMMIT, 'upstream_commit')
    need(type(upstream['sourceSha256']) is dict and bool(upstream['sourceSha256']), 'source_pins')
    # The final immutable contract hash pins the complete path/hash map.
    for value in upstream['sourceSha256'].values():
        need(type(value) is str and re.fullmatch('[0-9a-f]{64}', value), 'source_pins')
    exact(contract['replacement'], 'full-explicit-no-inheritance', 'policy_inheritance')
    exact(contract['networkDefault'], 'deny', 'default_deny_missing')
    fixture = contract['fixture']
    keys(fixture, ('path', 'sha256', 'materialized', 'format', 'maximumBytes', 'dynamicLibraries',
                   'argv', 'workingDirectory', 'immutable', 'execOtherBinaries'))
    exact(fixture['path'], FIXTURE, 'fixture_path')
    exact(fixture['sha256'], PLACEHOLDER, 'fixture_pin_requires_new_approved_revision')
    exact(fixture['materialized'], False, 'fixture_materialization_claim')
    exact(fixture['format'], 'static-linux-amd64-elf', 'fixture_format')
    exact(fixture['maximumBytes'], 4194304, 'fixture_size')
    exact(fixture['dynamicLibraries'], [], 'fixture_libraries')
    exact(fixture['argv'], [FIXTURE], 'fixture_command')
    exact(fixture['workingDirectory'], SCRATCH, 'fixture_workdir')
    exact(fixture['immutable'], True, 'fixture_mutability')
    exact(fixture['execOtherBinaries'], False, 'fixture_process_scope')
    scratch = contract['scratch']
    keys(scratch, ('path', 'maximumBytes', 'mountFlags', 'rootFilesystemReadOnly'))
    exact(scratch['path'], SCRATCH, 'scratch_path')
    exact(scratch['maximumBytes'], 1048576, 'scratch_size')
    exact(scratch['mountFlags'], ['nodev', 'noexec', 'nosuid'], 'scratch_flags')
    exact(scratch['rootFilesystemReadOnly'], True, 'root_filesystem_writable')
    need(type(contract['deniedResources']) is list and type(contract['requiredRuntimeEvidence']) is list, 'boundary_contract')
    exact(contract['executionSupported'], False, 'execution_activation')
    exact(contract['pilotReady'], False, 'pilot_activation')


def lint(policy_raw, contract_raw, *, template_review=False):
    try:
        need(type(template_review) is bool, 'review_mode')
        policy = load_json(policy_raw, MAX_POLICY_BYTES)
        contract = load_json(contract_raw, MAX_CONTRACT_BYTES)
        validate_policy(policy)
        policy_hash = digest(policy)
        validate_contract(contract, policy_hash)
        need(policy_hash == POLICY_SHA256, 'unapproved_policy_hash')
        contract_hash = digest(contract)
        need(contract_hash == CONTRACT_SHA256, 'unapproved_contract_hash')
        # This release intentionally accepts no materialized execution bundle.
        need(template_review, 'fixture_unmaterialized')
        return {'verdict': 'STATIC-MINIMAL-POLICY-READY', 'code': 'template_contract_valid',
                'policyId': POLICY_ID, 'policyVersion': POLICY_VERSION, 'policySha256': policy_hash,
                'contractSha256': contract_hash, 'fixtureMaterialized': False,
                'officialRuntimeParserExecuted': False, 'liveAdmissionAllowed': False,
                'executionSupported': False, 'pilotReady': False}
    except PolicyError as error:
        return {'verdict': 'STATIC-MINIMAL-POLICY-BLOCKED', 'code': str(error),
                'liveAdmissionAllowed': False, 'executionSupported': False, 'pilotReady': False}


def read_bounded(path, maximum):
    with pathlib.Path(path).open('rb') as handle:
        return handle.read(maximum + 1)


def main():
    folder = pathlib.Path(__file__).resolve().parents[1] / 'config' / 'openshell'
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--policy', type=pathlib.Path, default=folder / 'synthetic-isolation-v1.policy.json')
    parser.add_argument('--contract', type=pathlib.Path, default=folder / 'synthetic-isolation-v1.contract.json')
    parser.add_argument('--template', action='store_true', help='Review the unmaterialized template; never admit execution')
    args = parser.parse_args()
    try:
        result = lint(read_bounded(args.policy, MAX_POLICY_BYTES), read_bounded(args.contract, MAX_CONTRACT_BYTES), template_review=args.template)
    except OSError:
        result = {'verdict': 'STATIC-MINIMAL-POLICY-BLOCKED', 'code': 'input_unreadable', 'liveAdmissionAllowed': False}
    print(json.dumps(result, sort_keys=True))
    return 0 if result['verdict'] == 'STATIC-MINIMAL-POLICY-READY' else 2


if __name__ == '__main__':
    import sys
    if '--template' in sys.argv[1:]:
        raise SystemExit(main())
    # Historical template review is explicit; default requires pinned v3 bytes
    # and official/source receipts. Neither route grants runtime admission.
    from openshell_stdio_policy import main as stdio_main
    raise SystemExit(stdio_main())
