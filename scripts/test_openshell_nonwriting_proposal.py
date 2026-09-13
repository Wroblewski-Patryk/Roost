"""Synthetic specification integrity tests; no upstream/runtime execution."""
import copy
import json
import pathlib
import tempfile
import unittest

import openshell_nonwriting_proposal as target


class NonwritingProposalTests(unittest.TestCase):
    def setUp(self):
        self.raw = [(target.ROOT / 'config/openshell' / name).read_bytes() for name in target.FILES]
        self.documents = [json.loads(raw) for raw in self.raw]

    def reject(self, index, value):
        raw = self.raw.copy()
        raw[index] = json.dumps(value).encode()
        with self.assertRaises(target.base.PolicyError):
            target.verify_documents(raw)

    def test_complete_specification_and_non_admitting_flags(self):
        proposal, contract, schema = target.verify_documents(self.raw)
        self.assertEqual(len(proposal['sourceFiles']), 37)
        self.assertEqual(len(contract['negativeCases']), 35)
        for flag in ('implementationVerified', 'executionSupported', 'pilotReady', 'liveAdmissionAllowed'):
            self.assertIs(proposal[flag], False)
            self.assertIs(contract[flag], False)
        self.assertIsNone(contract['v3Binding']['qualifiedFixtureImageDigest'])
        target.check_schema(schema)

    def test_each_top_level_field_is_required_and_unknown_fields_rejected(self):
        for index, document in enumerate(self.documents):
            for key in document:
                with self.subTest(document=index, removed=key):
                    changed = copy.deepcopy(document); del changed[key]
                    self.reject(index, changed)
            self.reject(index, {**document, 'callerApproved': True})

    def test_every_requirement_source_mapping_and_negative_case_is_required(self):
        for index, field in ((0, 'requirements'), (0, 'sourceMap'), (0, 'sourceFiles'), (1, 'negativeCases')):
            for position in range(len(self.documents[index][field])):
                with self.subTest(field=field, position=position):
                    changed = copy.deepcopy(self.documents[index]); changed[field].pop(position)
                    self.reject(index, changed)

    def test_each_negative_case_must_deny_exec_success_and_reuse(self):
        for position in range(len(self.documents[1]['negativeCases'])):
            for flag in ('workloadExec', 'successReceipt', 'reusePreparedAttempt'):
                changed = copy.deepcopy(self.documents[1])
                changed['negativeCases'][position]['expected'][flag] = True
                self.reject(1, changed)

    def test_schema_cannot_make_required_evidence_optional_or_open(self):
        schema = self.documents[2]
        for name in schema['$defs']['payload']['properties']:
            changed = copy.deepcopy(schema)
            changed['$defs']['payload']['required'].remove(name)
            with self.assertRaises(target.base.PolicyError):
                target.check_schema(changed)
            self.reject(2, changed)
        changed = copy.deepcopy(schema); changed['additionalProperties'] = True
        with self.assertRaises(target.base.PolicyError):
            target.check_schema(changed)
        changed = copy.deepcopy(schema); changed['properties']['payload']['$ref'] = 'https://invalid.example/schema'
        with self.assertRaises(target.base.PolicyError):
            target.check_schema(changed)

    def test_no_evidence_downgrade_or_identity_substitution(self):
        for field, replacement in (('allLevelsRequired', ['unit-property']),
                                   ('sourceReviewSufficient', True),
                                   ('advertisedCapabilitySufficient', True),
                                   ('localValidatorQualifiesImplementation', True)):
            changed = copy.deepcopy(self.documents[1]); changed['qualification'][field] = replacement
            self.reject(1, changed)
        for field in ('policySha256', 'contractSha256', 'deliveryProofSha256'):
            changed = copy.deepcopy(self.documents[1]); changed['v3Binding'][field] = '0' * 64
            self.reject(1, changed)
        changed = copy.deepcopy(self.documents[0]); changed['profile']['defaultEnabled'] = 0
        self.reject(0, changed)

    def test_repository_anchor_drift_and_missing_sources_fail_closed(self):
        with tempfile.TemporaryDirectory(prefix='roost-proposal-test-') as directory:
            root = pathlib.Path(directory)
            for stem in ('policy', 'contract', 'deliveryProof'):
                relative = self.documents[1]['v3Binding'][stem + 'File']
                path = root / relative; path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes((target.ROOT / relative).read_bytes())
            target.verify_documents(self.raw, root)
            path.write_bytes(b'{}')
            with self.assertRaisesRegex(target.base.PolicyError, 'v3_anchor_drift'):
                target.verify_documents(self.raw, root)
            with self.assertRaises(OSError):
                target.verify(self.raw, root)

    def test_json_duplicates_types_bounds_and_canonical_whitespace(self):
        for raw in (b'{"a":1,"a":2}', b'{"a":1.0}', b'{"a":NaN}', b'{"a":"\\u00e9"}',
                    b'{"a":"\\n"}', b'[]', b'{}' + b' ' * target.MAX_JSON_BYTES):
            with self.assertRaises(target.base.PolicyError):
                target.load_document(raw)
        reformatted = [json.dumps(d, sort_keys=True, indent=1).encode() for d in self.documents]
        target.verify_documents(reformatted)


if __name__ == '__main__':
    unittest.main()
