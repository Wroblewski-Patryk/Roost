"""Synthetic archive/provenance checks. No installed runtime or network."""
import copy
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hermes_desktop_build_preflight as probe


class BuildPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as archive:
            archive.writestr('example-1.0.dist-info/METADATA', 'Name: example\nVersion: 1.0\n')
        self.data = output.getvalue()
        self.artifact = {'name': 'example', 'version': '1.0', 'filename': 'example-1.0-py3-none-any.whl',
                         'sha256': probe.digest(self.data), 'size': len(self.data),
                         'url': 'https://files.pythonhosted.org/packages/example-1.0-py3-none-any.whl'}

    def lock(self):
        a = self.artifact
        return {'package': [{'name': a['name'], 'version': a['version'],
                             'source': {'registry': 'https://pypi.org/simple'},
                             'wheels': [{'url': a['url'], 'hash': 'sha256:' + a['sha256'], 'size': a['size']}]}]}

    def test_only_locked_official_artifact_is_selected(self):
        contract = {'lockedBuildInputs': [self.artifact]}
        self.assertEqual(probe.locked_artifacts(self.lock(), contract), [self.artifact])
        for url in ['http://files.pythonhosted.org/packages/example-1.0-py3-none-any.whl',
                    'https://untrusted.invalid/example-1.0-py3-none-any.whl',
                    'https://user@files.pythonhosted.org/packages/example-1.0-py3-none-any.whl']:
            lock = self.lock()
            lock['package'][0]['wheels'][0]['url'] = url
            with self.assertRaises(probe.Refusal):
                probe.locked_artifacts(lock, contract)
        lock = self.lock()
        lock['package'][0]['wheels'].append(copy.deepcopy(lock['package'][0]['wheels'][0]))
        with self.assertRaises(probe.Refusal):
            probe.locked_artifacts(lock, contract)
        for change in ['hash', 'registry']:
            lock = self.lock()
            if change == 'hash':
                lock['package'][0]['wheels'][0]['hash'] = 'sha256:' + '0' * 64
            else:
                lock['package'][0]['source']['registry'] = 'https://untrusted.invalid/simple'
            with self.assertRaises(probe.Refusal):
                probe.locked_artifacts(lock, contract)

    def test_original_bytes_match_even_under_opaque_cache_name(self):
        file = self.root / 'opaque.body'
        file.write_bytes(self.data)
        before = file.stat()
        self.assertEqual(probe.inspect_caches([self.root], [self.artifact]), (1, {'example'}))
        self.assertEqual(file.read_bytes(), self.data)
        self.assertEqual(file.stat().st_mtime_ns, before.st_mtime_ns)
        self.assertEqual(list(self.root.iterdir()), [file])

    def test_filename_installed_metadata_and_same_size_tamper_are_not_proof(self):
        file = self.root / self.artifact['filename']
        file.write_bytes(b'X' * len(self.data))
        (self.root / 'example-1.0.dist-info').mkdir()
        (self.root / 'example-1.0.dist-info/METADATA').write_text('Name: example\nVersion: 1.0\n')
        self.assertEqual(probe.inspect_caches([self.root], [self.artifact]), (1, set()))

    def test_matching_hash_cannot_hide_wrong_distribution_identity(self):
        file = self.root / 'opaque.body'
        file.write_bytes(self.data)
        with self.assertRaisesRegex(probe.Refusal, 'wheel_identity_invalid'):
            probe.cached_wheel(file, [{**self.artifact, 'version': '2.0'}])

    def test_partial_inputs_never_authorize_staging_or_install(self):
        for found in [set(), {'example'}]:
            result = probe.report([self.artifact], 1, found)
            self.assertEqual(result['result'], 'BLOCKED')
            self.assertFalse(result['installationAuthorized'])
            self.assertFalse(result['stagingCreated'])
            self.assertEqual(result['networkRequests'], 0)
            self.assertIn('runtime_closure_not_qualified', result['blockers'])
        self.assertIn('missing_artifact:example', probe.report([self.artifact], 1, set())['blockers'])

    def test_source_pin_drift_stops_before_cache_use(self):
        contract = {'source': {'commit': '0' * 40, 'tree': '1' * 40}}
        with patch.object(probe.subprocess, 'check_output', return_value=b'tree wrong\n'), self.assertRaisesRegex(probe.Refusal, 'source_identity_mismatch'):
            probe.source_inputs(self.root, contract)


if __name__ == '__main__':
    unittest.main()
