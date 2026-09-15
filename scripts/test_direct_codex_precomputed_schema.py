"""Negative metadata/admission checks; no network, payloads or system fixtures."""
import copy
import json
import unittest

import validate_direct_codex_precomputed_schema as v


class PrecomputedMetadataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ledger = json.loads(v.LEDGER.read_text(encoding='utf-8'))
        cls.inventory = json.loads(v.INVENTORY.read_text(encoding='utf-8'))
        cls.report = v.REPORT.read_text(encoding='utf-8')

    def rejected(self, source, mutate, validate, reason):
        value = copy.deepcopy(source)
        mutate(value)
        with self.assertRaisesRegex(ValueError, '^' + reason + '$'):
            validate(value)

    def test_reopened_or_unhalted_capture(self):
        for key in ('closed', 'halted'):
            with self.subTest(key=key):
                self.rejected(self.ledger, lambda x: x.update({key: False}),
                              v.validate_ledger, 'ledger_closed')

    def test_missing_partial_bytes(self):
        self.rejected(self.ledger, lambda x: x['requests'][-1].update(bytesRead=0),
                      v.validate_ledger, 'accounting')

    def test_partial_response_promoted(self):
        self.rejected(self.ledger, lambda x: x['requests'][-1].update(complete=True),
                      v.validate_ledger, 'incomplete_response')

    def test_request_after_halt(self):
        self.rejected(self.ledger, lambda x: x['requests'].append(copy.deepcopy(x['requests'][0])),
                      v.validate_ledger, 'accounting')

    def test_unverified_evidence_promoted(self):
        for key in ('fileContentsRead', 'fileSha256Verified', 'exactPEBound'):
            with self.subTest(key=key):
                self.rejected(self.inventory, lambda x: x.update({key: True}),
                              v.validate_inventory, 'unverified_contents')

    def test_missing_source_file(self):
        self.rejected(self.inventory, lambda x: x['files'].pop(),
                      v.validate_inventory, 'inventory_totals')

    def test_unsafe_path(self):
        self.rejected(self.inventory, lambda x: x['files'][0].update(path='../escape.json'),
                      v.validate_inventory, 'relative_path')

    def test_git_id_relabelled_as_sha256(self):
        self.rejected(self.inventory, lambda x: x['files'][0].update(sha256='a' * 64),
                      v.validate_inventory, 'metadata_only')

    def test_source_digest_drift(self):
        self.rejected(self.inventory, lambda x: x['files'][0].update(gitBlobSha1='a' * 40),
                      v.validate_inventory, 'inventory_drift')

    def test_readiness_promotion(self):
        for key in ('acquisitionReady', 'actualProbeStarted', 'executionSupported'):
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, '^false_readiness$'):
                v.validate_report(self.report.replace(key + '=false', key + '=true'), self.ledger)

    def test_partial_body_claimed_parsed(self):
        with self.assertRaisesRegex(ValueError, '^evidence_limits$'):
            v.validate_report(self.report.replace('That response was not parsed',
                                                 'That response was parsed'), self.ledger)

    def test_positive_metadata(self):
        self.assertEqual(v.main()['result'], 'PASS')

    def test_windows_round_reopened(self):
        ledger = json.loads(v.WINDOWS_LEDGER.read_text(encoding='utf-8'))
        content = v.WINDOWS_REPORT.read_text(encoding='utf-8')
        self.rejected(ledger, lambda x: x.update(closed=False),
                      lambda x: v.validate_windows_binding(x, content), 'windows_closed')

    def test_windows_error_promoted(self):
        ledger = json.loads(v.WINDOWS_LEDGER.read_text(encoding='utf-8'))
        content = v.WINDOWS_REPORT.read_text(encoding='utf-8')
        self.rejected(ledger, lambda x: x['requests'][-1].update(status=200),
                      lambda x: v.validate_windows_binding(x, content), 'windows_response')

    def test_windows_binding_or_readiness_promoted(self):
        ledger = json.loads(v.WINDOWS_LEDGER.read_text(encoding='utf-8'))
        content = v.WINDOWS_REPORT.read_text(encoding='utf-8')
        for old, new, reason in (
            ('sourceBuildBinding=null', 'sourceBuildBinding=verified', 'windows_binding_unproven'),
            ('acquisitionReady=false', 'acquisitionReady=true', 'windows_readiness'),
            ('publisherMetadataRouteClosed=true', 'publisherMetadataRouteClosed=false', 'windows_verdict'),
        ):
            with self.subTest(field=old), self.assertRaisesRegex(ValueError, '^' + reason + '$'):
                v.validate_windows_binding(ledger, content.replace(old, new))


if __name__ == '__main__':
    unittest.main()
