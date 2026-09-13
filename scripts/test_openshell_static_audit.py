"""Synthetic in-memory layers only; no Docker or real image fixtures."""
import gzip
import io
import json
import tarfile
import unittest
from dataclasses import replace
from openshell_static_audit import Audit, AuditError, Limits, apply_layer, resolve, sha, policy_candidate


def tar(entries):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w') as archive:
        for name, content, kind, target in entries:
            item = tarfile.TarInfo(name)
            item.type, item.linkname = kind, target
            item.mode = 0o755
            item.size = len(content) if kind == tarfile.REGTYPE else 0
            archive.addfile(item, io.BytesIO(content) if item.size else None)
    return out.getvalue()


def file(name, body=b'x'):
    return name, body, tarfile.REGTYPE, ''


def node(name, kind, target=''):
    return name, b'', kind, target


def merged(*layers):
    audit, view = Audit(), {}
    for index, layer in enumerate(layers):
        apply_layer(view, audit.layer(io.BytesIO(tar(layer))), index)
    return view


def save_fixture():
    layer = tar([file('usr/bin/docker', b'fixture'), file('etc/openshell/policy.yaml', b'network: deny\n')])
    compressed = gzip.compress(layer, mtime=0)
    config = json.dumps({'architecture': 'amd64', 'os': 'linux', 'rootfs': {'type': 'layers', 'diff_ids': ['sha256:' + sha(layer)]},
                         'config': {'User': 'sandbox', 'Env': ['TOKEN=private-value', 'PATH=/bin']}}).encode()
    descriptor = lambda b: {'digest': 'sha256:' + sha(b), 'size': len(b)}
    manifest = json.dumps({'schemaVersion': 2, 'config': descriptor(config), 'layers': [descriptor(compressed)]}).encode()
    blob = lambda b: file('blobs/sha256/' + sha(b), b)
    # Deliberately different from manifest order: the reader must bind by digest.
    return tar([blob(compressed), blob(manifest), blob(config)]), 'sha256:' + sha(manifest)


class StaticAuditTests(unittest.TestCase):
    def test_whiteout_keeps_same_layer_replacement_regardless_of_order(self):
        view = merged([file('a/old'), file('a/keep')], [file('a/old', b'new'), file('a/.wh.old', b'')])
        self.assertEqual(view['a/old']['sha256'], sha(b'new'))
        self.assertIn('a/keep', view)

    def test_whiteout_removes_subtree(self):
        view = merged([file('a/old'), file('keep')], [file('.wh.a', b'')])
        self.assertNotIn('a', view)
        self.assertNotIn('a/old', view)

    def test_opaque_removes_only_lower_children(self):
        view = merged([file('d/old'), file('keep')], [file('d/new'), file('d/.wh..wh..opq', b'')])
        self.assertNotIn('d/old', view)
        self.assertIn('d/new', view)
        self.assertIn('keep', view)

    def test_root_opaque(self):
        self.assertEqual(set(merged([file('old')], [file('.wh..wh..opq', b''), file('new')])), {'new'})

    def test_directory_replaced_by_file(self):
        view = merged([file('d/old')], [file('d')])
        self.assertNotIn('d/old', view)

    def test_traversal_absolute_and_windows_paths(self):
        for path in ('../escape', '/absolute', 'x/../escape', 'C:/escape', 'x\\escape'):
            with self.subTest(path=path), self.assertRaises(AuditError):
                merged([file(path)])

    def test_virtual_absolute_and_relative_links(self):
        view = merged([file('usr/bin/tool'), node('bin', tarfile.SYMTYPE, '/usr/bin'), node('usr/bin/alias', tarfile.SYMTYPE, 'tool')])
        self.assertEqual(resolve(view, 'bin/alias')[0], 'usr/bin/tool')

    def test_posix_package_architecture_colon_is_safe(self):
        path = 'var/lib/dpkg/info/example:amd64.list'
        self.assertIn(path, merged([file(path)]))

    def test_escaping_link_and_symlink_parent_rejected(self):
        with self.assertRaises(AuditError):
            merged([node('a', tarfile.SYMTYPE, '../outside')])
        with self.assertRaises(AuditError):
            merged([node('d', tarfile.SYMTYPE, '/safe'), file('d/payload')])

    def test_hardlink_captures_original_inode(self):
        view = merged([file('a', b'old'), node('b', tarfile.LNKTYPE, 'a')], [file('a', b'new')])
        self.assertEqual(view['b']['sha256'], sha(b'old'))

    def test_invalid_hardlink_rejected(self):
        with self.assertRaises(AuditError):
            merged([node('a', tarfile.LNKTYPE, 'absent')])

    def test_devices_are_inert_metadata_and_not_link_targets(self):
        view = merged([node('dev/null', tarfile.CHRTYPE)])
        self.assertEqual(view['dev/null']['kind'], 'char_device')
        with self.assertRaises(AuditError):
            merged([node('dev/null', tarfile.CHRTYPE), node('alias', tarfile.LNKTYPE, 'dev/null')])

    def test_cycles_fail_resolution(self):
        view = merged([node('a', tarfile.SYMTYPE, 'b'), node('b', tarfile.SYMTYPE, 'a')])
        with self.assertRaises(AuditError):
            resolve(view, 'a')

    def test_invalid_whiteout_and_duplicates(self):
        for entries in ([file('.wh.x', b'nonempty')], [file('x'), file('x')]):
            with self.assertRaises(AuditError):
                merged(entries)

    def test_size_entry_metadata_and_expansion_limits(self):
        for overrides in ({'file_bytes': 0}, {'entries': 0}, {'metadata_bytes': 1}, {'expanded_bytes': 1}):
            with self.subTest(overrides=overrides), self.assertRaises(AuditError):
                Audit(replace(Limits(), **overrides)).layer(io.BytesIO(tar([file('x')])))

    def test_text_limit_and_redaction(self):
        payload = tar([file('etc/openshell/policy.yaml', b'token: private-value\nnetwork: deny\n')])
        with self.assertRaises(AuditError):
            Audit(replace(Limits(), text_total_bytes=1)).layer(io.BytesIO(payload))
        text = Audit().layer(io.BytesIO(payload))['entries']['etc/openshell/policy.yaml']['text']
        self.assertNotIn('private-value', text)

    def test_workdir_is_not_policy_category(self):
        self.assertFalse(policy_candidate('sandbox/.venv/lib/python3.14/site.py'))
        self.assertTrue(policy_candidate('sandbox/.config/agent.toml'))

    def test_whiteout_metadata_and_implicit_directory_limits(self):
        with self.assertRaises(AuditError):
            Audit(replace(Limits(), metadata_bytes=1)).layer(io.BytesIO(tar([file('.wh.x', b'')])))
        layer = Audit().layer(io.BytesIO(tar([file('a/b/c')])))
        with self.assertRaises(AuditError):
            apply_layer({}, layer, limits=replace(Limits(), entries=2))

    def test_whiteout_does_not_follow_lower_symlink(self):
        with self.assertRaises(AuditError):
            merged([node('d', tarfile.SYMTYPE, '/safe')], [file('d/.wh.x', b'')])

    def test_pax_extension_limit(self):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w', format=tarfile.PAX_FORMAT) as archive:
            item = tarfile.TarInfo('x')
            item.pax_headers = {'comment': 'x' * 100}
            archive.addfile(item)
        with self.assertRaises(AuditError):
            Audit(replace(Limits(), extension_bytes=16)).layer(io.BytesIO(stream.getvalue()))

    def test_outer_size_and_finding_limits(self):
        payload, digest = save_fixture()
        for overrides in ({'stream_bytes': 10}, {'findings': 0}, {'outer_entries': 1}):
            with self.subTest(overrides=overrides), self.assertRaises(AuditError):
                Audit(replace(Limits(), **overrides)).read(io.BytesIO(payload), digest)

    def test_oci_binding_gzip_diff_ids_and_determinism(self):
        payload, digest = save_fixture()
        first = Audit().read(io.BytesIO(payload), digest)
        self.assertEqual(first, Audit().read(io.BytesIO(payload), digest))
        self.assertEqual(first['imageConfig']['envNames'], ['PATH', 'TOKEN'])
        self.assertNotIn('private-value', json.dumps(first))
        self.assertEqual(first['commandProbes']['docker']['presentBasenames'], ['/usr/bin/docker'])

    def test_manifest_mismatch(self):
        payload, _ = save_fixture()
        with self.assertRaises(AuditError):
            Audit().read(io.BytesIO(payload), 'sha256:' + '0' * 64)

    def test_blob_hash_mismatch(self):
        payload = tar([file('blobs/sha256/' + '0' * 64, b'{"schemaVersion":2}')])
        with self.assertRaisesRegex(AuditError, 'blob digest mismatch'):
            Audit().read(io.BytesIO(payload), 'sha256:' + '0' * 64)

    def test_layer_order_and_diff_id_binding(self):
        first = tar([file('removed'), file('kept')])
        second = tar([file('.wh.removed', b''), file('new')])
        layers = [gzip.compress(b, mtime=0) for b in (first, second)]
        descriptor = lambda b: {'digest': 'sha256:' + sha(b), 'size': len(b)}
        blob = lambda b: file('blobs/sha256/' + sha(b), b)
        for mismatch in (False, True):
            config = json.dumps({'os': 'linux', 'architecture': 'amd64', 'rootfs': {'type': 'layers', 'diff_ids':
                                ['sha256:' + sha(first), 'sha256:' + (sha(second) if not mismatch else '0' * 64)]}}).encode()
            manifest = json.dumps({'schemaVersion': 2, 'config': descriptor(config), 'layers': list(map(descriptor, layers))}).encode()
            payload = tar([blob(layers[1]), blob(config), blob(layers[0]), blob(manifest)])
            if mismatch:
                with self.assertRaisesRegex(AuditError, 'diff ID mismatch'):
                    Audit().read(io.BytesIO(payload), 'sha256:' + sha(manifest))
            else:
                result = Audit().read(io.BytesIO(payload), 'sha256:' + sha(manifest))
                self.assertEqual(result['finalPaths'], 2)
                self.assertEqual(result['layers'][1]['whiteouts'], 1)

    def test_outer_device_and_trailing_data_rejected(self):
        with self.assertRaises(AuditError):
            Audit().read(io.BytesIO(tar([node('device', tarfile.CHRTYPE)])), 'sha256:' + '0' * 64)
        with self.assertRaises(AuditError):
            Audit().layer(io.BytesIO(tar([file('x')]) + b'nonzero'))


if __name__ == '__main__':
    unittest.main()
