"""Synthetic rejection regressions; real private ELF is checked separately.

The one successful unit case mocks only ELF inspection with the pinned receipt,
not upstream parsing. No executable fixture or generated artifact lives here.
"""
import copy
import json
import pathlib
import subprocess
import sys
import unittest
from unittest.mock import patch

import openshell_stdio_policy as target

ROOT = pathlib.Path(__file__).resolve().parents[1]


class StdioPolicyTests(unittest.TestCase):
    def setUp(self):
        self.inputs = [(ROOT / p).read_bytes() for p in (
            'config/openshell/synthetic-isolation-v3.policy.json',
            'config/openshell/synthetic-isolation-v3.contract.json',
            'config/openshell/stdio-policy-v3.receipt.json',
            'config/openshell/stdio-policy-v3.source-proof.json')]
        self.inputs += [b'inert', (ROOT / 'fixtures/openshell/fake-app-server.c').read_bytes(),
                        (ROOT / 'fixtures/openshell/build-fixture.sh').read_bytes()]

    def reject(self, inputs, code=None):
        result = target.lint(*inputs)
        self.assertEqual(result['verdict'], target.BLOCKED)
        self.assertFalse(result['liveAdmissionAllowed'])
        if code:
            self.assertEqual(result['code'], code)

    def test_pinned_static_result_is_never_runtime_admission(self):
        contract = json.loads(self.inputs[1])
        with patch.object(target.fixture, 'inspect_elf', return_value={
            'bytes': contract['fixture']['bytes'], 'sha256': contract['fixture']['sha256']}):
            result = target.lint(*self.inputs)
        self.assertEqual(result['verdict'], target.READY)
        for key in ('liveAdmissionAllowed', 'executionSupported', 'pilotReady', 'fixtureExecuted',
                    'runtimePolicyEvaluated', 'officialParserExecutedByThisLint'):
            self.assertIs(result[key], False)
        self.assertIsNone(result['runtimeEffectivePolicySha256'])

    def test_historical_revisions_fail_default_trust(self):
        for revision in (1, 2):
            values = self.inputs.copy()
            for i, suffix in enumerate(('policy', 'contract')):
                values[i] = (ROOT / f'config/openshell/synthetic-isolation-v{revision}.{suffix}.json').read_bytes()
            self.reject(values, 'unapproved_policy_hash')

    def test_network_rw_extra_ro_and_workdir_rejected(self):
        policy = json.loads(self.inputs[0])
        changes = [
            ('network_policies', {'extra': {'endpoints': [{'host': 'blocked.example.test', 'port': 443}]}}),
            ('filesystem_policy', {**policy['filesystem_policy'], 'read_write': ['/tmp']}),
            ('filesystem_policy', {**policy['filesystem_policy'], 'read_only': ['/usr']}),
            ('filesystem_policy', {**policy['filesystem_policy'], 'include_workdir': True}),
            ('network_middlewares', {'extra': {}}), ('merge', True),
        ]
        for key, value in changes:
            with self.subTest(key=key, value=value):
                values = self.inputs.copy(); changed = copy.deepcopy(policy); changed[key] = value
                values[0] = json.dumps(changed).encode(); self.reject(values, 'unapproved_policy_hash')

    def test_runtime_enrichment_mount_scratch_and_admission_rejected(self):
        contract = json.loads(self.inputs[1])
        changes = [('gpuEnabled', True), ('gpuDevices', ['/dev/dxg']),
                   ('deviceRequests', [{'count': 1}]), ('gpuEnvironment', {'NVIDIA_VISIBLE_DEVICES': 'all'}),
                   ('gpuProbePathsAbsent', []), ('workdirGrant', True), ('incrementalMerge', True),
                   ('globalPolicy', True), ('providerLayers', ['extra']), ('localPolicyOverrides', True),
                   ('diskDiscovery', True), ('fallbackPolicy', True), ('policyUpdates', True),
                   ('userBindMounts', True), ('userVolumes', True), ('imageDeclaredVolumes', True),
                   ('scratch', True), ('rootFilesystemReadOnly', False), ('shellAdmission', True),
                   ('agentAdmission', True), ('inferenceConfigured', True), ('invented', False)]
        for key, value in changes:
            with self.subTest(key=key):
                values = self.inputs.copy(); changed = copy.deepcopy(contract)
                changed['runtimeContract'][key] = value; values[1] = json.dumps(changed).encode()
                self.reject(values, 'unapproved_contract_hash')
        for flag in ('executionSupported', 'pilotReady', 'liveAdmissionAllowed'):
            changed = copy.deepcopy(contract); changed[flag] = True
            values = self.inputs.copy(); values[1] = json.dumps(changed).encode()
            self.reject(values, 'unapproved_contract_hash')

    def test_missing_forged_receipt_or_proof_rejected(self):
        for index, name in ((2, 'official_receipt'), (3, 'source_proof')):
            for raw in (b'', b'{}'):
                values = self.inputs.copy(); values[index] = raw; self.reject(values)
            changed = json.loads(self.inputs[index]); changed['liveAdmissionAllowed'] = True
            values = self.inputs.copy(); values[index] = json.dumps(changed).encode()
            self.reject(values, 'unapproved_' + name + '_hash')

    def test_artifact_and_build_drift_rejected(self):
        self.reject(self.inputs, 'elf_size')
        for i, code in ((5, 'source_hash'), (6, 'recipe_hash')):
            values = self.inputs.copy(); values[i] += b'\n'; self.reject(values, code)
        for evidence, code in (({'bytes': 8655, 'sha256': '0' * 64}, 'fixture_bytes'),
                               ({'bytes': 8656, 'sha256': '0' * 64}, 'fixture_hash')):
            with patch.object(target.fixture, 'inspect_elf', return_value=evidence):
                self.reject(self.inputs, code)

    def test_unknown_duplicate_and_input_limits_rejected(self):
        for i in range(4):
            values = self.inputs.copy(); values[i] = b'{"a":1,"a":2}'; self.reject(values)
            values[i] = b' ' * 16385; self.reject(values)
            changed = json.loads(self.inputs[i]); changed['invented'] = False
            values[i] = json.dumps(changed).encode(); self.reject(values)

    def test_cli_requires_fixture_and_receipt_without_execution_switch(self):
        command = [sys.executable, '-B', str(ROOT / 'scripts/openshell_minimal_policy.py')]
        result = subprocess.run(command, capture_output=True, check=False, timeout=5)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)['code'], 'fixture_required')
        result = subprocess.run(command + ['--execute'], capture_output=True, check=False, timeout=5)
        self.assertEqual(result.returncode, 2)


if __name__ == '__main__':
    unittest.main()
