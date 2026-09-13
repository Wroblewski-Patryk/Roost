"""Run only the pinned official parser adapter; never launch OpenShell runtime.

Run inside an independently verified network-none validation container.
The returned BLOCKED verdict preserves the known supervisor enrichment gate.
"""
import argparse
import copy
import hashlib
import json
import pathlib
import subprocess
import threading

import openshell_minimal_policy as narrow
import openshell_fixture as materialized

PARSER_SHA256 = '1547f375cdf3748c6e754fb84c2d728c149b7ea80268a51e884d75b2fb5d8a13'
MAX_BINARY = 33554432
MAX_INPUT = 32768
MAX_OUTPUT = 16384
MAX_STDERR = 4096
ROOT = pathlib.Path(__file__).resolve().parents[1]


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode('ascii')


def invoke(binary, raw, timeout=5):
    narrow.need(type(raw) is bytes and len(raw) <= MAX_INPUT + 1, 'input_limit')
    # Binary is a parser adapter, never the synthetic fake App Server.
    data = narrow.read_bounded(binary, MAX_BINARY)
    narrow.need(hashlib.sha256(data).hexdigest() == PARSER_SHA256, 'parser_hash')
    proc = subprocess.Popen([str(binary)], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, env={'PATH': '/usr/bin:/bin', 'HOME': '/build/home',
                            'XDG_CONFIG_HOME': '/build/home/config', 'XDG_CACHE_HOME': '/build/home/cache',
                            'XDG_DATA_HOME': '/build/home/data', 'XDG_STATE_HOME': '/build/home/state',
                            'LANG': 'C', 'LC_ALL': 'C', 'TZ': 'UTC'}, close_fds=True)
    captured = [bytearray(), bytearray()]
    exceeded = threading.Event()

    def drain(stream, target, maximum):
        while True:
            block = stream.read(4096)
            if not block:
                break
            if len(captured[target]) + len(block) > maximum:
                exceeded.set()
                proc.kill()
                break
            captured[target].extend(block)

    readers = [threading.Thread(target=drain, args=(proc.stdout, 0, MAX_OUTPUT)),
               threading.Thread(target=drain, args=(proc.stderr, 1, MAX_STDERR))]
    def feed():
        try:
            proc.stdin.write(raw)
            proc.stdin.close()
        except BrokenPipeError:
            pass
    feeder = threading.Thread(target=feed)
    for reader in readers:
        reader.start()
    feeder.start()
    try:
        proc.wait(timeout=timeout)
    except (subprocess.TimeoutExpired, BrokenPipeError):
        proc.kill()
        proc.wait(timeout=2)
        raise narrow.PolicyError('parser_timeout_or_pipe') from None
    finally:
        for reader in readers + [feeder]:
            reader.join(timeout=2)
        proc.stdout.close()
        proc.stderr.close()
    narrow.need(not exceeded.is_set() and not any(r.is_alive() for r in readers + [feeder]), 'output_limit')
    narrow.need(not captured[1], 'unexpected_stderr')
    value = narrow.load_json(bytes(captured[0]), MAX_OUTPUT)
    narrow.need(type(value) is dict and value.get('liveAdmissionAllowed') is False, 'output_contract')
    return proc.returncode, value


def cases(policy):
    encoded = json.dumps(policy)
    yield 'replace', {'operation': 'replace', 'policy': encoded}, 0, 'upstream_valid'
    yield 'parse_failure', {'operation': 'replace', 'policy': '[broken'}, 2, 'parse_failure'
    unknown = copy.deepcopy(policy); unknown['invented'] = True
    yield 'unknown_field', {'operation': 'replace', 'policy': json.dumps(unknown)}, 2, 'parse_failure'
    invalid = copy.deepcopy(policy); invalid['process']['run_as_user'] = 'root'
    yield 'validation_failure', {'operation': 'replace', 'policy': json.dumps(invalid)}, 2, 'validation_failure'
    yield 'unknown_envelope', {'operation': 'replace', 'policy': encoded, 'extra': True}, 2, 'envelope_invalid'
    yield 'policy_limit', {'operation': 'replace', 'policy': ' ' * 8193}, 2, 'policy_input_limit_or_marker'
    expanded = 'version: 1\nfilesystem_policy:\n  read_only:\n    - &p /synthetic/' + 'x' * 300 + '\n'
    expanded += '    - *p\n' * 59
    yield 'output_limit', {'operation': 'replace', 'policy': expanded}, 2, 'output_limit'
    liberal = copy.deepcopy(policy)
    liberal['filesystem_policy']['read_only'] = ['/usr', '/etc']
    liberal['filesystem_policy']['read_write'] = ['/tmp']
    rule = liberal['network_policies'].pop('synthetic_probe')
    rule['name'] = 'liberal-test-base'
    rule['endpoints'][0]['host'] = 'packages.example.test'
    rule['binaries'] = [{'path': '/usr/bin/sh'}]
    liberal['network_policies']['liberal_test_base'] = rule
    yield 'merge_leaks_base', {'operation': 'merge', 'policy': encoded, 'base': json.dumps(liberal)}, 0, 'upstream_valid'
    yield 'replace_rejects_base', {'operation': 'replace', 'policy': encoded, 'base': json.dumps(liberal)}, 2, 'operation_invalid'


def evaluate(binary):
    policy = narrow.load_json(narrow.read_bounded(ROOT / 'config/openshell/synthetic-isolation-v2.policy.json', 8192), 8192)
    narrow.need(narrow.digest(policy) == materialized.POLICY_SHA256, 'policy_hash')
    results = {}
    for name, payload, code, diagnostic in cases(policy):
        status, result = invoke(binary, canonical(payload))
        narrow.need(status == code and result.get('code') == diagnostic, 'upstream_case_failed')
        results[name] = result
    status, result = invoke(binary, b' ' * (MAX_INPUT + 1))
    narrow.need(status == 2 and result.get('code') == 'input_limit', 'input_limit_case_failed')
    results['envelope_limit'] = result
    projection = results['replace']['projection']
    merged = results['merge_leaks_base']['projection']
    narrow.need(set(projection['network_policies']) == {'synthetic_probe'}, 'base_network_leak')
    narrow.need(projection['filesystem_policy'] == policy['filesystem_policy'], 'source_filesystem_drift')
    narrow.need(set(merged['network_policies']) == {'synthetic_probe', 'liberal_test_base'}, 'merge_semantics')
    narrow.need(merged['filesystem_policy']['read_write'] == ['/tmp'], 'merge_filesystem_semantics')
    return {'verdict': 'OFFICIAL-OFFLINE-POLICY-VALIDATION-BLOCKED',
            'reason': 'supervisor_baseline_enrichment_violates_v2',
            'upstreamParseValidation': 'passed', 'upstreamCasesPassed': len(results),
            'parserSha256': PARSER_SHA256, 'sourceProjection': projection,
            'canonicalSourceProjectionSha256': hashlib.sha256(canonical(projection)).hexdigest(),
            'canonicalEffectivePolicySha256': None, 'runtimePolicyEvaluated': False,
            'executionSupported': False, 'pilotReady': False, 'liveAdmissionAllowed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--parser', type=pathlib.Path, required=True)
    args = parser.parse_args()
    try:
        result = evaluate(args.parser)
    except (OSError, narrow.PolicyError):
        result = {'verdict': 'OFFICIAL-OFFLINE-POLICY-VALIDATION-BLOCKED',
                  'reason': 'adapter_check_failed', 'liveAdmissionAllowed': False}
    print(canonical(result).decode('ascii'))
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
