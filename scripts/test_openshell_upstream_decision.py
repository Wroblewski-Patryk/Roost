"""Synthetic integrity tests; these do not qualify an upstream implementation."""
import copy
import pathlib
import tempfile
import unittest
from unittest.mock import patch

import openshell_upstream_decision as decision


class DecisionTests(unittest.TestCase):
    def setUp(self):
        self.raw = (decision.ROOT / decision.PACKET).read_bytes()
        self.packet = decision.proposal.load_document(self.raw)

    def reject(self, mutate, semantic=False):
        candidate = copy.deepcopy(self.packet)
        mutate(candidate)
        with self.assertRaises(decision.base.PolicyError):
            if semantic:
                decision.check_semantics(candidate)
            else:
                decision.verify_documents(decision.base.canonical_bytes(candidate))

    def test_exact_packet_and_contracts(self):
        result, documents = decision.verify_documents(self.raw)
        self.assertEqual(result['recommendedOption'], 'A')
        self.assertEqual(len(documents), 3)
        self.assertTrue(all(v is False for v in result['actions'].values()))

    def test_missing_extra_duplicate_options_and_tradeoffs(self):
        for i in range(3):
            with self.subTest(option=i):
                self.reject(lambda p: p['options'].pop(i), True)
            for field in decision.TRADEOFFS:
                with self.subTest(option=i, field=field):
                    self.reject(lambda p: p['options'][i].pop(field), True)
                    self.reject(lambda p: p['options'][i].update({field: ''}), True)
        self.reject(lambda p: p['options'].append(copy.deepcopy(p['options'][0])), True)
        self.reject(lambda p: p['options'][1].update(id='A'), True)
        for i in range(3):
            self.reject(lambda p: p['options'][i].update(recommended=not p['options'][i]['recommended']), True)

    def test_hidden_authority_and_unrequested_actions(self):
        for flag in decision.FLAGS:
            with self.subTest(flag=flag):
                self.reject(lambda p: p['actions'].update({flag: True}), True)
                self.reject(lambda p: p['actions'].update({flag: 0}), True)
        self.reject(lambda p: p['actions'].update(extraGrant=False), True)
        self.reject(lambda p: p.update(selectedOption='A'), True)
        self.reject(lambda p: p.update(ownerDecision='approved'), True)
        self.reject(lambda p: p['futureExternalWrite'].update(authorized=True), True)
        self.reject(lambda p: p['futureExternalWrite'].update(maximum=2), True)
        self.reject(lambda p: p['futureExternalWrite'].update(automaticRetry=True), True)
        self.reject(lambda p: p['prepublicationChecklist'][0].update(status='done'), True)
        self.reject(lambda p: p['options'][0].update(decision='Publish now and then implement without further owner approval.'))

    def test_unsafe_workaround_and_exact_prose_pin(self):
        for phrase in ('Use writable scratch to bypass the profile requirement.',
                       'Maintain a permanent downstream fork and silently upgrade.',
                       'Relax policy and run the agent before maintainer approval.'):
            self.reject(lambda p: p['options'][0].update(decision=phrase))
        self.reject(lambda p: p['documents'][0].update(sha256='0' * 64))
        self.reject(lambda p: p.update(unrecognized=False))

    def test_public_privacy_and_unapproved_links(self):
        for text in ('C:/Users/example/private.txt', '/home/example/private.txt',
                     'operator@example.com', 'api_key = synthetic-value',
                     '-----BEGIN PRIVATE KEY-----', 'ghp_syntheticOnly',
                     'Roost', 'RF-HOST-045', 'https://example.com/private'):
            with self.subTest(text=text), self.assertRaises(decision.base.PolicyError):
                decision.public_privacy(text)
        decision.public_privacy('Generic probe at /opt/example/bin/stdio-probe')

    def test_history_cannot_be_promoted_or_redated(self):
        self.reject(lambda p: p['historicalEvidence'].update(freshnessClaim=True), True)
        self.reject(lambda p: p['historicalEvidence'].update(use='current'), True)
        self.reject(lambda p: p['historicalEvidence'].update(refreshRequiredBeforePublication=False), True)
        self.reject(lambda p: p['historicalEvidence'].update(checkedAt='2099-01-01T00:00:00Z'))
        self.reject(lambda p: p['historicalEvidence']['requirements'].update(PASS=16), True)
        self.reject(lambda p: p['historicalEvidence']['negativeCases'].update(executed=True), True)
        # No dependency on clock freshness exists, even after the old expiry.
        with patch.object(decision.release, 'fresh_at', side_effect=AssertionError('history is not freshness')):
            decision.verify_documents(self.raw)

    def test_all_concerns_and_cases_are_required(self):
        for i, row in enumerate(self.packet['concerns']):
            self.reject(lambda p: p['concerns'].pop(i), True)
            for field in ('requirements', 'negativeCases'):
                for j in range(len(row[field])):
                    with self.subTest(group=i, field=field, index=j):
                        self.reject(lambda p: p['concerns'][i][field].pop(j), True)
        for key in decision.proposal.FILES:
            self.reject(lambda p: p['proposalBindings'].update({key: '0' * 64}), True)

    def test_document_drift_without_writing_repository(self):
        original = decision.source.regular_read
        for document in self.packet['documents']:
            target = decision.ROOT / document['path']
            def altered(path, maximum):
                raw = original(path, maximum)
                return raw + b'Unreviewed change.\n' if pathlib.Path(path) == target else raw
            with self.subTest(role=document['role']), patch.object(decision.source, 'regular_read', altered):
                with self.assertRaises(decision.base.PolicyError):
                    decision.verify_documents(self.raw)

    def test_bounds_encoding_duplicate_json_and_traversal(self):
        for raw in (b'', b'x' * 32769, b'bad\rtext\n', b'bad\0text\n', b'\xff\n'):
            with self.assertRaises(decision.base.PolicyError):
                decision.normalized_text(raw)
        self.assertEqual(decision.normalized_text(b'a\r\n'), b'a\n')
        for raw in (b'{"x":1,"x":2}', b'[]', b'{"x":NaN}'):
            with self.assertRaises(decision.base.PolicyError):
                decision.verify_documents(raw)
        with self.assertRaises(decision.base.PolicyError):
            decision.source.relative_source(decision.ROOT, '../outside')
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'oversize'
            path.write_bytes(b'x' * 32769)
            with self.assertRaises(decision.base.PolicyError):
                decision.source.regular_read(path, 32768)


if __name__ == '__main__':
    unittest.main()
