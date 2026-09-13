"""In-memory negative fixtures for privacy and unsupported RF008 qualification claims."""
import copy
import unittest

from validate_direct_codex_artifact_preflight import OBSERVATION, load, validate_observation


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.observation = load(OBSERVATION)

    def test_dated_blocked_observation(self):
        validate_observation(self.observation)

    def test_rejects_private_paths_and_identifiers(self):
        for bad in ('/private/installation/codex', 'Z:\\private\\codex', '../codex', 'account@example.invalid'):
            with self.subTest(value=bad):
                value = copy.deepcopy(self.observation)
                value['candidate']['relativePath'] = bad
                with self.assertRaisesRegex(ValueError, 'private_value'):
                    validate_observation(value)

    def test_rejects_unsupported_claims(self):
        cases = [
            (('verdict',), 'EXACT-CODEX-ARTIFACT-PREFLIGHT-READY'),
            (('candidate','codexVersion'), '1.2.3'),
            (('candidate','linuxExecuteAccess'), True),
            (('candidate','hostWideUniquenessProven'), True),
            (('candidate','sha256'), '0' * 64),
            (('provenance','signatureTrustVerified'), True),
            (('provenance','exactCodexVersionBound'), True),
            (('inventory','closed'), True),
            (('inventory','launchClosureProven'), True),
            (('inventory','immutabilityProven'), True),
            (('inventory','manifestPersisted'), True),
            (('inventory','blockmapMissingFileCount'), 0),
            (('discovery','versionBoundWireBundleFound'), True),
            (('actions','candidateExecutions'), 1),
            (('actions','networkRequests'), True),
            (('docker','after','containers'), 0),
            (('nextTask',), 'RF-HERMES-010'),
        ]
        for key in self.observation['gates']:
            cases.append((('gates',key), True))
        for path, replacement in cases:
            with self.subTest(path=path):
                value = copy.deepcopy(self.observation)
                parent = value
                for key in path[:-1]:
                    parent = parent[key]
                parent[path[-1]] = replacement
                with self.assertRaises(ValueError):
                    validate_observation(value)

    def test_rejects_unknown_fields_and_missing_blockers(self):
        for section in (None, 'candidate', 'provenance', 'inventory', 'docker'):
            with self.subTest(section=section):
                value = copy.deepcopy(self.observation)
                (value if section is None else value[section])['extra'] = 'untrusted'
                with self.assertRaisesRegex(ValueError, 'closed_shape'):
                    validate_observation(value)
        value = copy.deepcopy(self.observation)
        value['blockers'].pop()
        with self.assertRaisesRegex(ValueError, 'missing_blocker'):
            validate_observation(value)


if __name__ == '__main__':
    unittest.main()
