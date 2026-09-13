"""In-memory checks that failed source capture never becomes evidence or authority."""
import copy
import unittest

from validate_direct_codex_source_research import OBSERVATION, load, validate_observation


class SourceDispositionTests(unittest.TestCase):
    def setUp(self):
        self.value = load(OBSERVATION)

    def test_honest_incomplete_disposition(self):
        validate_observation(self.value)

    def test_rejects_invented_evidence_accounting_and_activation(self):
        cases = [
            (('researchComplete',), True),
            (('sourceEvidenceRetained',), True),
            (('publisherEvidenceAbsent',), True),
            (('candidate',), 'invented-release'),
            (('acquisitionProposal',), 'invented-proposal'),
            (('schemaRoute',), 'PINNED_GENERATOR'),
            (('network','actualRequestCount'), 3),
            (('network','actualResponseBytes'), 0),
            (('network','redirectCount'), 0),
            (('network','budgetComplianceVerified'), True),
            (('network','redirectBodiesMetered'), True),
            (('network','budgetReset'), True),
            (('network','requestsAfterCaptureFailure'), 1),
            (('desktopComparison','releaseCandidateMatches'), True),
            (('actions','payloadDownloads'), 1),
            (('docker','unchanged'), False),
        ]
        cases.extend((('gates', key), True) for key in self.value['gates'])
        for path, replacement in cases:
            with self.subTest(path=path):
                value = copy.deepcopy(self.value)
                target = value
                for key in path[:-1]:
                    target = target[key]
                target[path[-1]] = replacement
                with self.assertRaises(ValueError):
                    validate_observation(value)

    def test_rejects_unknown_fields_and_private_url(self):
        for section in (None, 'network', 'actions'):
            with self.subTest(section=section):
                value = copy.deepcopy(self.value)
                (value if section is None else value[section])['extra'] = 'untrusted'
                with self.assertRaisesRegex(ValueError, 'closed_shape'):
                    validate_observation(value)
        value = copy.deepcopy(self.value)
        value['network']['attemptedUrls'][0] = 'https://private.example.invalid/account'
        with self.assertRaisesRegex(ValueError, 'endpoint_scope'):
            validate_observation(value)


if __name__ == '__main__':
    unittest.main()
