"""Synthetic minimal-import cases; never imports an installed Hermes runtime."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


if len(sys.argv) > 1 and sys.argv[1] == '--fixture':
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import hermes_manual_identity
    root = Path(sys.argv[2])
    sys.executable = str(root / 'venv/Scripts/python.exe')
    sys.base_prefix = str(root / '.hermes-runtime/python')
    os.environ['HERMES_HOME'] = str(root / 'empty-home')
    sys.stdin = io.StringIO(json.dumps({'root': str(root), 'home': str(root / 'empty-home'),
        'initSha256': hashlib.sha256((root / 'hermes_cli/__init__.py').read_bytes()).hexdigest()}))
    try:
        answer = hermes_manual_identity.run()
        print(json.dumps(answer))
    except BaseException:
        print('{"result":"blocked"}')
    sys.exit(0)


class IdentityTests(unittest.TestCase):
    def probe(self, *, duplicate=False, version='0.21.3', entry='hermes_cli.main:main', body=None):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / 'empty-home').mkdir()
            (root / 'hermes_cli').mkdir()
            (root / 'hermes_cli/__init__.py').write_text(body or ('__version__ = ' + repr(version)))
            site = root / 'venv/Lib/site-packages'
            for suffix in (['one', 'two'] if duplicate else ['one']):
                dist = site / (suffix + '.dist-info')
                dist.mkdir(parents=True)
                (dist / 'METADATA').write_text('Name: hermes-agent\nVersion: 0.21.3\n')
                (dist / 'entry_points.txt').write_text('[console_scripts]\nhermes = ' + entry + '\n')
            output = subprocess.check_output([sys.executable, '-I', '-S', '-B', __file__, '--fixture', str(root)], timeout=10)
            self.assertFalse((root / 'empty-home/touched').exists())
            return json.loads(output)

    def test_minimal_source_identity(self):
        result = self.probe()
        self.assertEqual(result['version'], '0.21.3')
        self.assertFalse(result['mainImported'])
        self.assertEqual(result['distributions'], 1)

    def test_dual_distribution_and_wrong_identity(self):
        for kwargs in [{'duplicate': True}, {'version': '0.21.2'}, {'entry': 'wrong:main'}]:
            with self.subTest(kwargs=kwargs):
                self.assertEqual(self.probe(**kwargs)['result'], 'blocked')

    def test_initializer_write_is_denied(self):
        self.assertEqual(self.probe(body="import os\nopen(os.path.join(os.environ['HERMES_HOME'],'touched'),'w').write('x')\n__version__='0.21.3'")['result'], 'blocked')


if __name__ == '__main__':
    unittest.main()
