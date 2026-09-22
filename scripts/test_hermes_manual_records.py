import base64
import hashlib
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parent))
from hermes_manual_records import audit


class RecordTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.site = self.root / 'venv/Lib/site-packages'
        self.dist = self.site / 'example-1.0.dist-info'
        self.dist.mkdir(parents=True)
        (self.dist / 'METADATA').write_text('Name: example\nVersion: 1.0\n')
        (self.dist / 'LICENSE').write_text('Synthetic fixture')
        (self.site / 'example.py').write_bytes(b'x=1\n')
        value = base64.urlsafe_b64encode(hashlib.sha256(b'x=1\n').digest()).decode().rstrip('=')
        (self.dist / 'RECORD').write_text('example.py,sha256=' + value + ',4\nexample-1.0.dist-info/RECORD,,\n')

    def test_record_hash_and_license_inventory(self):
        result = audit(self.root)
        self.assertEqual(result['result'], 'PASS')
        self.assertEqual(result['recordEntries'], 2)
        self.assertEqual(len(result['packages'][0]['licenseFiles']), 1)

    def test_tampered_content_and_escape_refused(self):
        (self.site / 'example.py').write_bytes(b'x=2\n')
        with self.assertRaisesRegex(ValueError, 'record_hash'):
            audit(self.root)
        (self.dist / 'RECORD').write_text('../../../../outside,,\n')
        with self.assertRaisesRegex(ValueError, 'record_target'):
            audit(self.root)


if __name__ == '__main__':
    unittest.main()
