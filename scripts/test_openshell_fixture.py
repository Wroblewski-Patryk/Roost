"""Synthetic byte fixtures only; no compiled artifact, compiler or loader runs."""
import copy
import json
import pathlib
import struct
import unittest
from unittest import mock

import openshell_fixture as guard
import openshell_minimal_policy as base

ROOT = pathlib.Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / 'config/openshell/synthetic-isolation-v2.policy.json').read_text())
CONTRACT = json.loads((ROOT / 'config/openshell/synthetic-isolation-v2.contract.json').read_text())
SOURCE = (ROOT / 'fixtures/openshell/fake-app-server.c').read_bytes()
RECIPE = (ROOT / 'fixtures/openshell/build-fixture.sh').read_bytes()


def synthetic_elf():
    """Inert table-layout test data, not executable machine code."""
    raw = bytearray(8656)
    ident = b'\x7fELF\x02\x01\x01' + bytes(9)
    struct.pack_into('<16sHHIQQQIHHHHHH', raw, 0, ident, 2, 62, 1,
                     0x400100, 64, 512, 0, 64, 56, 2, 64, 2, 1)
    struct.pack_into('<IIQQQQQQ', raw, 64, 1, 5, 0, 0x400000, 0x400000, 300, 300, 4096)
    struct.pack_into('<IIQQQQQQ', raw, 120, 0x6474e551, 6, 0, 0, 0, 0, 0, 16)
    names = b'\0.shstrtab\0'
    raw[400:400 + len(names)] = names
    struct.pack_into('<IIQQQQIIQQ', raw, 576, 1, 3, 0, 0, 400, len(names), 0, 0, 1, 0)
    return bytes(raw)


def outcome(policy=POLICY, contract=CONTRACT, elf=None, source=SOURCE, recipe=RECIPE):
    return guard.lint(base.canonical_bytes(policy), base.canonical_bytes(contract),
                      synthetic_elf() if elf is None else elf, source, recipe)


class FixtureTests(unittest.TestCase):
    def test_static_positive_is_inert_and_not_execution_claim(self):
        result = guard.inspect_elf(synthetic_elf())
        self.assertEqual(result['format'], 'ELF64-LE-x86_64-ET_EXEC')
        self.assertFalse(result['executed'])
        self.assertFalse(result['dynamic'])

    def test_materialized_positive_with_test_only_trust_pin(self):
        # No acceptance override exists in CLI/API. Mock just this test's pin
        # so inert data exercises the exact byte/source/recipe acceptance path.
        contract = copy.deepcopy(CONTRACT)
        contract['fixture']['sha256'] = guard.sha256(synthetic_elf())
        with mock.patch.object(guard, 'CONTRACT_SHA256', base.digest(contract)):
            result = outcome(contract=contract)
        self.assertEqual(result['verdict'], 'REPRODUCIBLE-FIXTURE-READY')
        for flag in ('executionSupported', 'pilotReady', 'liveAdmissionAllowed', 'fixtureExecuted'):
            self.assertIs(result[flag], False)

    def test_real_pins_and_lf_normalization(self):
        self.assertEqual(base.digest(POLICY), guard.POLICY_SHA256)
        self.assertEqual(base.digest(CONTRACT), guard.CONTRACT_SHA256)
        for raw, name, maximum in ((SOURCE, 'sourceSha256', 32768), (RECIPE, 'recipeSha256', 8192)):
            self.assertEqual(guard.sha256(guard.source_bytes(raw, maximum)), CONTRACT['build'][name])
            self.assertEqual(guard.source_bytes(raw.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n'), maximum), guard.source_bytes(raw, maximum))

    def test_policy_scope_unchanged_except_revision_name(self):
        old = copy.deepcopy(POLICY)
        old['network_policies']['synthetic_probe']['name'] = 'synthetic-probe-v1'
        base.validate_policy(old)
        self.assertEqual(base.digest(old), base.POLICY_SHA256)

    def test_bad_elf_identity_type_architecture_and_bounds(self):
        changes = [(0, b'NOPE'), (4, b'\x01'), (5, b'\x02'),
                   (16, struct.pack('<H', 3)), (18, struct.pack('<H', 183)),
                   (54, struct.pack('<H', 55)), (56, struct.pack('<H', 65535)),
                   (40, struct.pack('<Q', 2**64 - 1)), (62, struct.pack('<H', 5))]
        for offset, value in changes:
            with self.subTest(offset=offset):
                raw = bytearray(synthetic_elf()); raw[offset:offset + len(value)] = value
                with self.assertRaises(base.PolicyError): guard.inspect_elf(bytes(raw))
        for raw in (b'', b'\x7fELF', synthetic_elf()[:600], b'x' * (guard.MAX_ELF + 1)):
            with self.assertRaises(base.PolicyError): guard.inspect_elf(raw)

    def test_interpreter_dynamic_needed_rpath_runpath_fail_closed(self):
        for segment in (2, 3):
            raw = bytearray(synthetic_elf()); struct.pack_into('<I', raw, 64, segment)
            with self.assertRaisesRegex(base.PolicyError, 'elf_dynamic_or_interpreter'):
                guard.inspect_elf(bytes(raw))
        for tag in (1, 15, 29):  # DT_NEEDED, DT_RPATH, DT_RUNPATH
            raw = bytearray(synthetic_elf())
            struct.pack_into('<I', raw, 580, 6)  # SHT_DYNAMIC: rejected entirely
            struct.pack_into('<QQ', raw, 400, tag, 1)
            with self.assertRaises(base.PolicyError): guard.inspect_elf(bytes(raw))

    def test_write_execute_stack_entry_and_memory(self):
        for offset, fmt, value in ((68, '<I', 7), (124, '<I', 7),
                                   (24, '<Q', 0), (104, '<Q', guard.MAX_ELF + 1),
                                   (72, '<Q', len(synthetic_elf()) + 1)):
            raw = bytearray(synthetic_elf()); struct.pack_into(fmt, raw, offset, value)
            with self.assertRaises(base.PolicyError): guard.inspect_elf(bytes(raw))

    def test_forbidden_markers_never_echo_input(self):
        for marker in (b'/home/example/private', b'C:\\Users\\Example', b'api.openai.test',
                       b'claude', b'copilot', b'opencode', b'password=fictional'):
            raw = bytearray(synthetic_elf()); raw[1000:1000 + len(marker)] = marker
            result = outcome(elf=bytes(raw))
            self.assertEqual(result['verdict'], 'REPRODUCIBLE-FIXTURE-BLOCKED')
            self.assertNotIn('fictional', json.dumps(result))

    def test_byte_substitution_size_source_and_recipe_changes(self):
        self.assertEqual(outcome()['code'], 'fixture_hash')
        self.assertEqual(outcome(elf=synthetic_elf() + b'\0')['code'], 'fixture_bytes')
        self.assertEqual(outcome(source=SOURCE + b'\n')['code'], 'source_hash')
        self.assertEqual(outcome(recipe=RECIPE + b'\n')['code'], 'recipe_hash')

    def test_every_nested_unknown_or_missing_key_is_rejected(self):
        def paths(value, prefix=()):
            if isinstance(value, dict):
                yield prefix
                for key, child in value.items(): yield from paths(child, prefix + (key,))
        def at(obj, path):
            for key in path: obj = obj[key]
            return obj
        for original, field in ((CONTRACT, 'contract'), (POLICY, 'policy')):
            for path in paths(original):
                altered = copy.deepcopy(original); at(altered, path)['unknown'] = True
                self.assertTrue(outcome(**{field: altered})['verdict'].endswith('BLOCKED'))
                for key in at(original, path):
                    altered = copy.deepcopy(original); del at(altered, path)[key]
                    self.assertTrue(outcome(**{field: altered})['verdict'].endswith('BLOCKED'))

    def test_placeholder_toolchain_flags_identity_and_hash_drift(self):
        for group, key, value in (('fixture', 'sha256', base.PLACEHOLDER),
                                  ('fixture', 'materialized', False), ('fixture', 'bytes', True),
                                  ('fixture', 'identity', 'other'),
                                  ('build', 'sourceSha256', '0' * 64), ('build', 'recipeSha256', '0' * 64),
                                  ('build', 'toolchainImage', 'example.invalid/base:latest')):
            altered = copy.deepcopy(CONTRACT); altered[group][key] = value
            self.assertEqual(outcome(contract=altered)['code'], 'unapproved_contract_hash')
        for flag in ('executionSupported', 'pilotReady', 'liveAdmissionAllowed'):
            altered = copy.deepcopy(CONTRACT); altered[flag] = True
            self.assertTrue(outcome(contract=altered)['verdict'].endswith('BLOCKED'))
        old = json.loads((ROOT / 'config/openshell/synthetic-isolation-v1.contract.json').read_text())
        self.assertTrue(outcome(contract=old)['verdict'].endswith('BLOCKED'))

    def test_duplicate_and_unbounded_inputs_rejected_before_identity(self):
        for raw in (b'{"version":1,"version":1}', b'{"version":NaN}', b' ' * 8193):
            result = guard.lint(raw, base.canonical_bytes(CONTRACT), synthetic_elf(), SOURCE, RECIPE)
            self.assertTrue(result['verdict'].endswith('BLOCKED'))
        for raw in (b'x' * 32769, b'\xff', b'\x00', b'line\r'):
            with self.assertRaises(base.PolicyError): guard.source_bytes(raw, 32768)


if __name__ == '__main__':
    unittest.main()
