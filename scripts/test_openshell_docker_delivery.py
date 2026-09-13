"""Synthetic drift tests; no Docker, network, fixture or upstream execution."""
import hashlib
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

import openshell_docker_delivery as target
import openshell_static_audit as image_audit


def entry(raw, path='driver.rs'):
    return {'path': path, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'gitBlob': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()}


class DockerDeliveryProofTests(unittest.TestCase):
    def test_exact_git_and_sha256_binding(self):
        raw = b'HostConfig { readonly_rootfs: None, mounts: [] }'
        target.verify_blob(raw, entry(raw))
        for key in ('sha256', 'gitBlob'):
            bad = entry(raw); bad[key] = '0' * len(bad[key])
            with self.assertRaises(target.base.PolicyError):
                target.verify_blob(raw, bad)

    def test_host_config_mount_workspace_delivery_drift_fails_closed(self):
        raw = b'HostConfig: default; Mounts: none; Tmpfs: none; workspace: writable; delivery: image'
        for old, new in ((b'HostConfig', b'HostConfig2'), (b'Mounts', b'mounts'),
                         (b'Tmpfs', b'tmpfs'), (b'writable', b'readonly'), (b'image', b'cache')):
            with self.subTest(field=old):
                with self.assertRaises(target.base.PolicyError):
                    target.verify_blob(raw.replace(old, new), entry(raw))

    def test_read_only_tree_verification_and_missing_file(self):
        with tempfile.TemporaryDirectory(prefix='roost-source-proof-') as directory:
            root = pathlib.Path(directory); raw = b'inert reviewed source'
            (root / 'driver.rs').write_bytes(raw)
            self.assertEqual(target.verify_sources(root, [entry(raw)]), len(raw))
            self.assertEqual((root / 'driver.rs').read_bytes(), raw)
            with self.assertRaises(OSError):
                target.verify_sources(root, [entry(raw, 'missing.rs')])

    def test_source_limits_and_path_escape_rejected(self):
        for path in ('../driver.rs', '/driver.rs', 'a//b', 'a/./b', 'C:/driver.rs', 'a\\b'):
            with self.assertRaises(target.base.PolicyError):
                target.relative_source(pathlib.Path.cwd(), path)
        with tempfile.TemporaryDirectory(prefix='roost-source-proof-') as directory:
            root = pathlib.Path(directory); (root / 'driver.rs').write_bytes(b'abcdef')
            with patch.object(target, 'MAX_SOURCE_BYTES', 5):
                with self.assertRaises(target.base.PolicyError):
                    target.verify_sources(root, [entry(b'abcdef')])
            with patch.object(target, 'MAX_TOTAL_BYTES', 5):
                with self.assertRaises(target.base.PolicyError):
                    target.verify_sources(root, [entry(b'abcdef')])

    def test_manifest_cannot_refresh_trust_or_admit_execution(self):
        raw = (target.ROOT / 'config/openshell/docker-v3-delivery-proof.json').read_bytes()
        manifest = json.loads(raw)
        self.assertEqual(target.base.digest(manifest), target.PROOF_SHA256)
        for key, value in (('requirements', {'a': 'PASS', 'b': 'PASS', 'c': 'PASS'}),
                           ('liveAdmissionAllowed', True), ('sourceFiles', []),
                           ('imageEvidence', {}), ('invented', True)):
            changed = {**manifest, key: value}
            with self.assertRaisesRegex(target.base.PolicyError, 'proof_drift'):
                target.verify(json.dumps(changed).encode(), None, None)

    def test_selected_image_findings_cannot_prove_fixture_absence(self):
        # A complete virtual view containing the fixture can still omit it from
        # RF037's selected findings and command probes. Its digest is opaque.
        path = 'opt/roost-fixture/bin/fake-app-server'
        view = {path: {'kind': 'file', 'mode': 0o555, 'uid': 0, 'gid': 0,
                       'size': 1, 'sha256': '0' * 64, 'layer': 0}}
        result = image_audit.inventory(view, image_audit.Limits())
        self.assertEqual(result['finalPaths'], 1)
        self.assertFalse(any(row['path'] == '/' + path for row in result['findings']))
        self.assertNotIn('fake-app-server', result['commandProbes'])
        self.assertNotIn('filesystem', result)

    def test_reparse_component_rejected(self):
        class Reparse:
            st_mode = 0o100644
            st_file_attributes = 0x400
        with patch.object(pathlib.Path, 'lstat', return_value=Reparse()):
            with self.assertRaisesRegex(target.base.PolicyError, 'reparse_input'):
                target.regular_read(pathlib.Path('inert'), 10)


if __name__ == '__main__':
    unittest.main()
