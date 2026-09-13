"""Validate the pinned local proposal, not an OpenShell implementation or receipt.

Reads existing sources only. No network, Docker, parser or workload execution.
"""
import argparse
import json
import pathlib

import openshell_docker_delivery as source

base = source.base
ROOT = source.ROOT
FILES = ('nonwriting-stdio.proposal.json', 'nonwriting-stdio.acceptance.json',
         'nonwriting-stdio.receipt.schema.json')
HASHES = ('d0ebbdfc737fda1b9e6ab312641b0205c408295be9d773bac2ee54db57815c8e',
          '670b1930cd9db96647f808a544cb3710ba3878dbbc364f5ebda3e8e49527e659',
          '5165a152d6c3d06e1355bf13cd5d6fba693404e5dcddee7858edc0a4d81b6cf0')
REQUIREMENTS = frozenset(('negotiation', 'root', 'mounts', 'workspace', 'command',
    'artifact', 'isolation', 'network', 'descriptors', 'supervisor-state', 'policy',
    'limits', 'lifecycle', 'receipt', 'compatibility', 'evidence'))
LEVELS = ('unit-property', 'fake-daemon', 'prepared-integration', 'live-adversarial')
NEGATIVES = frozenset(('profile_missing', 'profile_unknown', 'root_unset', 'root_false',
    'child_root_rw', 'implicit_rw_mount', 'image_volume', 'user_mount', 'tmp_writable',
    'sandbox_writable', 'cwd_fallback', 'workspace_probe', 'mutable_tag',
    'digest_platform_mismatch', 'fixture_absent', 'fixture_hash_drift', 'fixture_symlink',
    'fixture_hardlink', 'fixture_device', 'shell_entrypoint', 'gpu_device', 'network_grant',
    'inherited_socket', 'inherited_token', 'inherited_fd', 'supervisor_state_visible',
    'policy_merge', 'policy_fallback', 'retained_restart', 'unsupported_host',
    'forged_receipt', 'unbounded_resources', 'post_seal_change', 'secondary_exec', 'control_escape'))
MAX_JSON_BYTES = 131072


def load_document(raw):
    base.need(type(raw) is bytes and 0 < len(raw) <= MAX_JSON_BYTES, 'input_size')
    def pairs(values):
        result = {}
        for key, value in values:
            base.need(key not in result, 'duplicate_key')
            result[key] = value
        return result
    def reject_number(_):
        raise base.PolicyError('noninteger_number')
    try:
        value = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                           parse_float=reject_number, parse_constant=reject_number)
    except base.PolicyError:
        raise
    except (ValueError, UnicodeError, RecursionError):
        raise base.PolicyError('json_syntax') from None
    count = 0
    def walk(node, depth):
        nonlocal count
        count += 1
        base.need(count <= 12000 and depth <= 40, 'structure_limit')
        base.need(type(node) in (dict, list, str, int, bool, type(None)), 'json_type')
        if type(node) is dict:
            for key, item in node.items():
                walk(key, depth + 1); walk(item, depth + 1)
        elif type(node) is list:
            for item in node:
                walk(item, depth + 1)
        elif type(node) is str:
            base.need(len(node) <= 2048 and node.isascii() and
                      all(32 <= ord(c) < 127 for c in node), 'string_limit')
    walk(value, 0)
    base.need(type(value) is dict, 'document_object')
    return value


def same(actual, expected, code):
    base.need(base.canonical_bytes(actual) == base.canonical_bytes(expected), code)


def unique_ids(rows, expected, code):
    ids = [row['id'] for row in rows]
    base.need(len(ids) == len(set(ids)) and set(ids) == set(expected), code)


def check_schema(schema):
    """Check this schema's closure/references; do not validate runtime receipts."""
    def walk(node):
        if type(node) is list:
            for child in node:
                walk(child)
        elif type(node) is dict:
            if node.get('type') == 'object':
                base.need(node.get('additionalProperties') is False, 'schema_open_object')
                names = node.get('required', [])
                base.need(len(names) == len(set(names)) and
                          set(names) == set(node.get('properties', {})), 'schema_optional_field')
            if '$ref' in node:
                reference = node['$ref']
                base.need(reference.startswith('#/$defs/') and
                          reference[8:] in schema['$defs'], 'schema_external_or_missing_ref')
            for child in node.values():
                walk(child)
    walk(schema)


def verify_documents(raw_documents, repository=ROOT):
    base.need(len(raw_documents) == 3, 'document_count')
    proposal, contract, schema = [load_document(raw) for raw in raw_documents]
    # Reject unknown/missing fields or any semantic drift, including prose, via
    # code-owned identities. Input cannot redefine the accepted specification.
    for document, expected in zip((proposal, contract, schema), HASHES):
        base.need(base.digest(document) == expected, 'document_drift')
    base.need(proposal['upstreamCommit'] == source.UPSTREAM_COMMIT, 'upstream_drift')
    same(contract['proposalSha256'], base.digest(proposal), 'proposal_binding')
    same(contract['receiptSchemaSha256'], base.digest(schema), 'schema_binding')
    same(proposal['profile'], contract['profile'], 'profile_binding')
    for document in (proposal, contract):
        for flag in ('executionSupported', 'pilotReady', 'liveAdmissionAllowed', 'implementationVerified'):
            same(document[flag], False, 'authority_expansion')
    unique_ids(proposal['requirements'], REQUIREMENTS, 'requirement_coverage')
    for requirement in proposal['requirements']:
        same(requirement['failure'], 'DENY_WORKLOAD_EXEC', 'requirement_outcome')
    unique_ids(contract['negativeCases'], NEGATIVES, 'negative_coverage')
    for case in contract['negativeCases']:
        base.need(case['requirement'] in REQUIREMENTS and case['minimumLevel'] in LEVELS,
                  'negative_reference')
        same(case['expected'], {'workloadExec': False, 'successReceipt': False,
             'outcome': 'DENIED', 'reusePreparedAttempt': False}, 'negative_outcome')
    same([level['id'] for level in contract['evidenceLevels']], list(LEVELS), 'evidence_levels')
    same(contract['qualification']['allLevelsRequired'], list(LEVELS), 'evidence_qualification')
    base.need({row['requirement'] for row in proposal['sourceMap']} == REQUIREMENTS,
              'source_map_coverage')
    paths = [entry['path'] for entry in proposal['sourceFiles']]
    base.need(len(paths) == len(set(paths)), 'duplicate_source')
    for row in proposal['sourceMap']:
        base.need(set(row['paths']) <= set(paths) and
                  row['actions'] == ['add', 'change', 'test'], 'source_map_binding')
        for reference in row['symbolReferences']:
            base.need(reference['path'] in row['paths'] and
                      reference['symbol'] in row['symbols'], 'symbol_binding')
    check_schema(schema)
    binding = contract['v3Binding']
    for stem in ('policy', 'contract', 'deliveryProof'):
        path = source.relative_source(repository, binding[stem + 'File'])
        document = load_document(source.regular_read(path, MAX_JSON_BYTES))
        same(base.digest(document), binding[stem + 'Sha256'], 'v3_anchor_drift')
        if stem == 'contract':
            v3 = document
    for key in ('identity', 'path', 'sha256', 'bytes', 'argv', 'workingDirectory', 'format'):
        same(binding['fixture'][key], v3['fixture'][key], 'fixture_binding')
    same(binding['runtimeEffectivePolicySha256'], None, 'invented_runtime_evidence')
    same(binding['qualifiedFixtureImageDigest'], None, 'invented_image_evidence')
    return proposal, contract, schema


def verify(raw_documents, upstream_root, repository=ROOT):
    proposal, contract, _ = verify_documents(raw_documents, repository)
    total = source.verify_sources(upstream_root, proposal['sourceFiles'])
    for row in proposal['sourceMap']:
        for reference in row['symbolReferences']:
            raw = source.regular_read(source.relative_source(upstream_root, reference['path']),
                                      source.MAX_SOURCE_BYTES)
            lines = raw.decode('utf-8').splitlines()
            index = reference['line'] - 1
            base.need(0 <= index < len(lines) and reference['symbol'] in lines[index], 'symbol_line_drift')
    return {'verdict': 'UPSTREAM-NONWRITING-PROFILE-PROPOSAL-READY',
            'scope': 'local-specification-completeness-only', 'proposalSha256': HASHES[0],
            'contractSha256': HASHES[1], 'receiptSchemaSha256': HASHES[2],
            'sourceFilesVerified': len(proposal['sourceFiles']), 'sourceBytesVerified': total,
            'requirements': len(REQUIREMENTS), 'negativeCases': len(NEGATIVES),
            'runtimeEffectivePolicySha256': None, 'runtimeExecuted': False,
            'implementationVerified': False, 'executionSupported': False,
            'pilotReady': False, 'liveAdmissionAllowed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upstream-root', type=pathlib.Path, required=True)
    parser.add_argument('--documents-root', type=pathlib.Path, default=ROOT / 'config/openshell')
    args = parser.parse_args()
    try:
        documents = [source.regular_read(args.documents_root / name, MAX_JSON_BYTES) for name in FILES]
        result = verify(documents, args.upstream_root)
        code = 0
    except (OSError, UnicodeError, KeyError, TypeError, ValueError, base.PolicyError) as error:
        result = {'verdict': 'UPSTREAM-NONWRITING-PROFILE-PROPOSAL-BLOCKED',
                  'code': str(error) if isinstance(error, base.PolicyError) else 'input_invalid',
                  'implementationVerified': False, 'runtimeExecuted': False,
                  'executionSupported': False, 'pilotReady': False, 'liveAdmissionAllowed': False,
                  'runtimeEffectivePolicySha256': None}
        code = 2
    print(json.dumps(result, sort_keys=True))
    return code


if __name__ == '__main__':
    raise SystemExit(main())
