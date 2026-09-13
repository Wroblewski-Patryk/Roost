"""Offline v3 official parser checks; use only in an authorized isolated container.

This module never invokes a fixture, supervisor, loader, gateway or agent.
It reuses RF-HOST-040's unchanged, byte-pinned official parser transport.
"""
import copy
import json

import openshell_minimal_policy as base
from openshell_official_policy import canonical, invoke, PARSER_SHA256


def evaluate(binary, policy):
    encoded = json.dumps(policy)
    liberal = copy.deepcopy(policy)
    liberal['filesystem_policy']['read_write'] = ['/tmp']
    liberal['network_policies'] = {'synthetic_extra': {
        'name': 'synthetic-extra', 'endpoints': [{'host': 'blocked.example.test', 'port': 443}],
        'binaries': [{'path': '/usr/bin/sh'}]}}
    unknown = copy.deepcopy(policy)
    unknown['invented'] = True
    invalid = copy.deepcopy(policy)
    invalid['process']['run_as_user'] = 'root'
    cases = [
        ('replace', {'operation': 'replace', 'policy': encoded}, 0, 'upstream_valid'),
        ('unknown', {'operation': 'replace', 'policy': json.dumps(unknown)}, 2, 'parse_failure'),
        ('root', {'operation': 'replace', 'policy': json.dumps(invalid)}, 2, 'validation_failure'),
        ('parse', {'operation': 'replace', 'policy': '[broken'}, 2, 'parse_failure'),
        ('replacement_base', {'operation': 'replace', 'policy': encoded, 'base': json.dumps(liberal)}, 2, 'operation_invalid'),
        ('merge_retains_base', {'operation': 'merge', 'policy': encoded, 'base': json.dumps(liberal)}, 0, 'upstream_valid'),
    ]
    results = {}
    for name, payload, code, diagnostic in cases:
        status, result = invoke(binary, canonical(payload))
        base.need(status == code and result.get('code') == diagnostic, 'official_case_failed')
        results[name] = result
    projection = results['replace']['projection']
    expected = copy.deepcopy(policy)
    # Official serialization omits empty maps/lists; it does not add grants.
    del expected['network_policies']
    del expected['network_middlewares']
    del expected['filesystem_policy']['read_write']
    base.need(canonical(projection) == canonical(expected), 'source_projection_drift')
    merged = results['merge_retains_base']['projection']
    base.need(merged['filesystem_policy']['read_write'] == ['/tmp'], 'merge_semantics')
    base.need(set(merged['network_policies']) == {'synthetic_extra'}, 'merge_semantics')
    return {'upstreamParseValidation': 'passed', 'upstreamCasesPassed': len(cases),
            'parserSha256': PARSER_SHA256, 'operation': 'replace',
            'upstreamCommit': results['replace']['upstreamCommit'],
            'sourceProjection': projection, 'sourceProjectionSha256': base.digest(projection),
            'sourceProjectionBytes': len(canonical(projection)),
            'scope': 'source-policy-composition-only', 'postLoaderCodeExecuted': False,
            'runtimeEffectivePolicySha256': None, 'runtimePolicyEvaluated': False,
            'fixtureExecuted': False, 'executionSupported': False,
            'pilotReady': False, 'liveAdmissionAllowed': False}
