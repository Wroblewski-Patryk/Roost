"""Synthetic mutations only: no fixture binary, secrets, host or network access."""
import copy
import json
import pathlib
import subprocess
import sys
import unittest
import openshell_minimal_policy as guard

ROOT = pathlib.Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'config' / 'openshell'
POLICY = json.loads((FOLDER / 'synthetic-isolation-v1.policy.json').read_text())
CONTRACT = json.loads((FOLDER / 'synthetic-isolation-v1.contract.json').read_text())


def outcome(policy=POLICY, contract=CONTRACT, template=True):
    return guard.lint(guard.canonical_bytes(policy), guard.canonical_bytes(contract), template_review=template)


def at(root, path):
    for part in path:
        root = root[part]
    return root


RULE = ('network_policies', 'synthetic_probe')
ENDPOINT = (*RULE, 'endpoints', 0)
BINARY = (*RULE, 'binaries', 0)
ALLOW = (*ENDPOINT, 'rules', 0, 'allow')


class MinimalPolicyTests(unittest.TestCase):
    def blocked(self, result):
        self.assertEqual(result['verdict'], 'STATIC-MINIMAL-POLICY-BLOCKED')
        self.assertFalse(result['liveAdmissionAllowed'])

    def test_template_positive_but_never_live(self):
        result = outcome()
        self.assertEqual(result['verdict'], 'STATIC-MINIMAL-POLICY-READY')
        self.assertEqual(result['policySha256'], guard.POLICY_SHA256)
        self.assertEqual(result['contractSha256'], guard.CONTRACT_SHA256)
        for key in ('executionSupported', 'pilotReady', 'fixtureMaterialized', 'liveAdmissionAllowed', 'officialRuntimeParserExecuted'):
            self.assertFalse(result[key])

    def test_default_fails_unmaterialized_fixture(self):
        result = outcome(template=False)
        self.blocked(result)
        self.assertEqual(result['code'], 'fixture_unmaterialized')

    def test_unknown_keys_at_every_policy_object(self):
        for path in ((), ('filesystem_policy',), ('landlock',), ('process',), ('network_policies',), RULE,
                     ENDPOINT, BINARY, (*ENDPOINT, 'rules', 0), ALLOW, ('network_middlewares',)):
            with self.subTest(path=path):
                policy = copy.deepcopy(POLICY)
                at(policy, path)['unexpected'] = True
                self.blocked(outcome(policy))

    def test_missing_keys_at_every_policy_object(self):
        for path in ((), ('filesystem_policy',), ('landlock',), ('process',), RULE, ENDPOINT, BINARY, ALLOW):
            for key in at(POLICY, path):
                with self.subTest(path=path, key=key):
                    policy = copy.deepcopy(POLICY)
                    del at(policy, path)[key]
                    self.blocked(outcome(policy))

    def test_schema_types_and_landlock(self):
        changes = [((), 'version', v) for v in (2, True, '1', 1.0, None)]
        changes += [(('landlock',), 'compatibility', v) for v in ('best_effort', '', 'HARD_REQUIREMENT', None)]
        changes += [(('filesystem_policy',), 'include_workdir', v) for v in (True, 0, None)]
        changes += [(('process',), k, v) for k in ('run_as_user', 'run_as_group') for v in ('root', '0', '', None)]
        for path, key, value in changes:
            with self.subTest(path=path, key=key, value=value):
                policy = copy.deepcopy(POLICY)
                at(policy, path)[key] = value
                self.blocked(outcome(policy))

    def test_endpoint_and_binary_cardinality(self):
        for key in ('endpoints', 'binaries'):
            for value in ([], None, {}, [at(POLICY, RULE)[key][0]] * 2):
                with self.subTest(key=key, value=value):
                    policy = copy.deepcopy(POLICY)
                    at(policy, RULE)[key] = value
                    self.blocked(outcome(policy))
        for value in ({}, {'another': at(POLICY, RULE)}, {**POLICY['network_policies'], 'extra': at(POLICY, RULE)}):
            policy = copy.deepcopy(POLICY)
            policy['network_policies'] = value
            self.blocked(outcome(policy))

    def test_endpoint_is_exact_no_other_domains_ips_or_ranges(self):
        # Reserved fictional domains/documentation addresses; never resolved.
        for host in ('api.provider.example', 'registry.packages.example', 'code.example', '*.roost.test',
                     '**.test', 'fixture*.roost.test', 'fixture.roost.test.', 'FIXTURE.ROOST.TEST',
                     'localhost', 'localhost.example', '198.51.100.7', '198.51.100.0/24',
                     '127.0.0.1', '127.0.0.0/8', '169.254.169.254', '::1', '0.0.0.0/0', '', None):
            with self.subTest(host=host):
                policy = copy.deepcopy(POLICY)
                at(policy, ENDPOINT)['host'] = host
                self.blocked(outcome(policy))

    def test_no_protocol_credentials_audit_or_http_expansion(self):
        cases = [('port', 443), ('port', True), ('port', 0), ('port', 18080.0), ('protocol', 'tcp'),
                 ('enforcement', 'audit'), ('allowed_ips', ['198.51.100.7']), ('ports', [18080]),
                 ('access', 'full'), ('tls', 'skip'), ('credential_binding', {'provider': 'fictional'}),
                 ('allow_uninspected_credentials', True), ('request_body_credential_rewrite', True)]
        for key, value in cases:
            with self.subTest(key=key):
                policy = copy.deepcopy(POLICY)
                at(policy, ENDPOINT)[key] = value
                self.blocked(outcome(policy))
        for key, value in (('method', '*'), ('method', 'POST'), ('path', '/**'), ('path', '/probe?next=x'), ('path', '/probe/../admin')):
            policy = copy.deepcopy(POLICY)
            at(policy, ALLOW)[key] = value
            self.blocked(outcome(policy))

    def test_filesystem_and_process_paths_are_exact(self):
        # Generic forbidden locations and fictional paths, no operator paths/data.
        paths = ['/', '/usr', '/tmp', '/mnt/c', '/var/run/docker.sock', '/run/containerd/containerd.sock',
                 '/run/podman/podman.sock', '/run/example-gateway/admin.pem', '/home/example/.codex',
                 '/home/example/.config', '/workspaces/example-repo', '/opt/roost-fixture/**',
                 '/sandbox/roost-fixture/scratch/../escape', '/usr/bin/python', '/usr/bin/node', '/bin/sh',
                 '/usr/bin/curl', '/usr/bin/git', '/usr/bin/codex', '/usr/local/bin/claude', '/usr/bin/copilot',
                 '/usr/bin/opencode', '/usr/bin/apt-get', 'C:/Example/Project', 'relative']
        for path in paths:
            for key in ('read_only', 'read_write'):
                with self.subTest(path=path, key=key):
                    policy = copy.deepcopy(POLICY)
                    policy['filesystem_policy'][key] = [path]
                    self.blocked(outcome(policy))
            policy = copy.deepcopy(POLICY)
            at(policy, BINARY)['path'] = path
            self.blocked(outcome(policy))
        for key in ('read_only', 'read_write'):
            policy = copy.deepcopy(POLICY)
            policy['filesystem_policy'][key].append('/disposable/extra')
            self.blocked(outcome(policy))

    def test_no_inheritance_or_fake_official_hash_key(self):
        for key in ('include', 'merge', 'extends', 'inherit', 'default_policy', 'network', 'default_action'):
            policy = copy.deepcopy(POLICY)
            policy[key] = 'default'
            self.blocked(outcome(policy))
        policy = copy.deepcopy(POLICY)
        at(policy, BINARY)['sha256'] = 'a' * 64
        self.blocked(outcome(policy))

    def test_contract_boundary_mutations_and_unpinned_fixture(self):
        cases = [((), 'networkDefault', 'allow'), ((), 'replacement', 'merge'), ((), 'policyVersion', 2),
                 ((), 'policySha256', '0' * 64), ((), 'deniedResources', []), ((), 'requiredRuntimeEvidence', []),
                 ((), 'executionSupported', True), ((), 'pilotReady', True),
                 (('upstream',), 'version', 'latest'), (('upstream',), 'commit', 'main'),
                 (('fixture',), 'sha256', None), (('fixture',), 'sha256', ''), (('fixture',), 'sha256', 'a' * 64),
                 (('fixture',), 'materialized', True), (('fixture',), 'immutable', False),
                 (('fixture',), 'execOtherBinaries', True), (('fixture',), 'dynamicLibraries', ['/lib/example.so']),
                 (('fixture',), 'argv', ['/bin/sh', '-c', 'example']),
                 (('scratch',), 'mountFlags', []), (('scratch',), 'maximumBytes', 1048577),
                 (('scratch',), 'rootFilesystemReadOnly', False)]
        for path, key, value in cases:
            with self.subTest(path=path, key=key):
                contract = copy.deepcopy(CONTRACT)
                at(contract, path)[key] = value
                self.blocked(outcome(contract=contract))
        for path in ((), ('upstream',), ('fixture',), ('scratch',)):
            contract = copy.deepcopy(CONTRACT)
            at(contract, path)['unknown'] = 'new-schema'
            self.blocked(outcome(contract=contract))

    def test_parser_rejects_duplicates_yaml_aliases_secrets_and_size(self):
        for raw in (b'{"version":1,"version":1}', b'{"a":{"x":1,"x":2}}',
                    b'version: 1\na: &alias {}\nb: *alias', b'[]', b'null', b'{"a":NaN}',
                    b'{"a":1.5}', b'{"a":"password: fictional-value"}', b'{"a":"Bearer fictional-value"}',
                    b'{"a":' + b'1' * 5000 + b'}', b' ' * (guard.MAX_POLICY_BYTES + 1),
                    b'{"a":' + b'[' * 40 + b'0' + b']' * 40 + b'}'):
            with self.subTest(length=len(raw)):
                result = guard.lint(raw, guard.canonical_bytes(CONTRACT), template_review=True)
                self.blocked(result)
                self.assertNotIn('fictional-value', json.dumps(result))

    def test_immutable_hashes_and_formatting(self):
        self.assertEqual(guard.digest(POLICY), guard.POLICY_SHA256)
        self.assertEqual(guard.digest(CONTRACT), guard.CONTRACT_SHA256)
        pretty = json.dumps(POLICY, indent=4).replace('\n', '\r\n').encode()
        result = guard.lint(pretty, guard.canonical_bytes(CONTRACT), template_review=True)
        self.assertEqual(result['policySha256'], guard.POLICY_SHA256)
        contract = copy.deepcopy(CONTRACT)
        contract['upstream']['sourceSha256'][next(iter(contract['upstream']['sourceSha256']))] = 'b' * 64
        self.blocked(outcome(contract=contract))

    def test_missing_contract_fields_cannot_remove_boundary_requirements(self):
        for path in ((), ('fixture',), ('scratch',), ('upstream',), ('upstream', 'sourceSha256')):
            for key in at(CONTRACT, path):
                with self.subTest(path=path, key=key):
                    contract = copy.deepcopy(CONTRACT)
                    del at(contract, path)[key]
                    self.blocked(outcome(contract=contract))

    def test_node_string_and_contract_byte_limits_have_fixed_codes(self):
        for obj, code in (({'items': [None] * guard.MAX_NODES}, 'structure_limit'),
                          ({'text': 'x' * 513}, 'string_limit'),
                          ({'text': '\u2603'}, 'string_limit')):
            result = guard.lint(json.dumps(obj).encode(), guard.canonical_bytes(CONTRACT), template_review=True)
            self.assertEqual(result['code'], code)
        result = guard.lint(guard.canonical_bytes(POLICY), b' ' * (guard.MAX_CONTRACT_BYTES + 1), template_review=True)
        self.assertEqual(result['code'], 'input_size')

    def test_real_cli_default_blocks_and_explicit_template_reviews(self):
        # Only the trusted local Python linter runs; no OpenShell/fixture commands.
        for args, code, verdict in (([], 2, 'STATIC-MINIMAL-POLICY-BLOCKED'), (['--template'], 0, 'STATIC-MINIMAL-POLICY-READY')):
            result = subprocess.run([sys.executable, '-B', str(ROOT / 'scripts/openshell_minimal_policy.py'), *args], capture_output=True, timeout=10)
            self.assertEqual(result.returncode, code)
            self.assertEqual(result.stderr, b'')
            self.assertEqual(json.loads(result.stdout)['verdict'], verdict)


if __name__ == '__main__':
    unittest.main()
