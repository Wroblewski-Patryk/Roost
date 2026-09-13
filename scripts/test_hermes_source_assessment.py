"""Synthetic integrity checks; never import or execute upstream/provider code."""
import copy
import json
import pathlib
import tempfile
import unittest

import hermes_source_assessment as audit


class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.raw = (audit.ROOT / audit.MANIFEST).read_bytes()
        self.packet = audit.load(self.raw)

    def assert_blocked(self, packet, code):
        with self.assertRaisesRegex(audit.AssessmentError, '^' + code + '$'):
            audit.verify(audit.canonical(packet), pathlib.Path('unused-evidence'))

    def test_complete_static_assessment_never_grants_execution(self):
        audit.check_shape(self.packet)
        self.assertEqual(audit.sha256(audit.canonical(self.packet)), audit.MANIFEST_SHA256)
        self.assertFalse(any(self.packet['authority'].values()))
        self.assertEqual(len(self.packet['requirements']), 14)

    def test_missing_and_duplicate_requirements_fail(self):
        packet = copy.deepcopy(self.packet)
        packet['requirements'].pop()
        self.assert_blocked(packet, 'requirement_coverage')
        packet = copy.deepcopy(self.packet)
        packet['requirements'][1] = packet['requirements'][0]
        self.assert_blocked(packet, 'requirement_coverage')

    def test_source_and_response_omissions_fail(self):
        packet = copy.deepcopy(self.packet)
        packet['sources'].pop()
        self.assert_blocked(packet, 'source_coverage')
        packet = copy.deepcopy(self.packet)
        packet['responses'][1] = packet['responses'][0]
        self.assert_blocked(packet, 'response_coverage')

    def test_authority_expansion_fails(self):
        for key in audit.FLAGS:
            packet = copy.deepcopy(self.packet)
            packet['authority'][key] = True
            self.assert_blocked(packet, 'authority')

    def test_status_and_pin_drift_fail_before_evidence(self):
        packet = copy.deepcopy(self.packet)
        packet['requirements'][0]['appServer'] = 'PASS'
        self.assert_blocked(packet, 'manifest_drift')
        packet = copy.deepcopy(self.packet)
        packet['identity']['commit'] = '0' * 40
        self.assert_blocked(packet, 'manifest_drift')

    def test_unknown_evidence_and_source_domains_fail(self):
        packet = copy.deepcopy(self.packet)
        packet['requirements'][0]['evidence'] = ['invented']
        self.assert_blocked(packet, 'requirement_evidence')
        packet = copy.deepcopy(self.packet)
        packet['responses'][0]['url'] = 'https://example.com/untrusted'
        self.assert_blocked(packet, 'source_scope')

    def test_strict_json_and_manifest_bounds(self):
        for raw in (b'{"a":1,"a":2}', b'{"a":NaN}', b'{"a":1.2}',
                    b'[]', b'\xff', b'{' * 4000, b' ' * 262145):
            with self.assertRaises(audit.AssessmentError):
                audit.load(raw)

    def test_response_content_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / 'sample.raw').write_bytes(b'changed')
            packet = {'responses': [{'id': 'sample', 'bytes': 7,
                                     'sha256': audit.sha256(b'original')}]}
            with self.assertRaisesRegex(audit.AssessmentError, '^response_drift$'):
                audit.verify_evidence(packet, root)

    def test_git_tree_integrity_and_completeness(self):
        blob = audit.git_hash('blob', b'content')
        raw = b'100644 example.txt\0' + bytes.fromhex(blob)
        tree = {'sha': audit.git_hash('tree', raw), 'truncated': False,
                'tree': [{'path': 'example.txt', 'type': 'blob', 'mode': '100644',
                          'sha': blob, 'size': 7}]}
        self.assertEqual(audit.check_tree(tree)['example.txt']['sha'], blob)
        changed = copy.deepcopy(tree)
        changed['tree'][0]['path'] = 'substituted.txt'
        with self.assertRaisesRegex(audit.AssessmentError, '^tree_hash$'):
            audit.check_tree(changed)
        tree['truncated'] = True
        with self.assertRaisesRegex(audit.AssessmentError, '^tree_incomplete$'):
            audit.check_tree(tree)

    def test_report_drift_blocks_before_private_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            report = root / self.packet['report']['path']
            report.parent.mkdir(parents=True)
            report.write_text('Altered assessment')
            with self.assertRaisesRegex(audit.AssessmentError, '^local_document_drift$'):
                audit.verify(self.raw, root, repository=root)

    def test_path_escape_and_missing_evidence_fail(self):
        for relative in ('../outside', '/absolute', 'C:/absolute', 'a//b', 'a/./b', 'a\\b'):
            with self.assertRaisesRegex(audit.AssessmentError, '^relative_path$'):
                audit.read(audit.ROOT, relative)
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(audit.AssessmentError, '^evidence_unavailable$'):
                audit.verify(self.raw, pathlib.Path(tmp))


if __name__ == '__main__':
    unittest.main()
