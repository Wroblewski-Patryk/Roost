"""Portable pure-contract regressions; process/installed-Hermes proof is opt-in."""
from dataclasses import FrozenInstanceError
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from bounded_app_server import BoundaryError, Envelope, Limits, strict_json
from hermes_install_attestation import verify


class BoundaryContractTests(unittest.TestCase):
    def test_limits_cannot_expand_or_disable(self):
        for name, maximum in (("startup", 15), ("turn", 20), ("stop", 5), ("outer", 60), ("line", 8192), ("total", 32768)):
            for bad in (0, -1, float("inf"), float("nan"), True, maximum + 1):
                with self.subTest(name=name, bad=bad), self.assertRaises(BoundaryError):
                    Limits(**{name: bad})
        with self.assertRaises(BoundaryError):
            Limits(line=1.5)
        self.assertEqual(Limits(outer=.3).outer, .3)
        with self.assertRaises(FrozenInstanceError):
            Limits().outer = 100

    def test_json_rejects_ambiguous_or_invalid_input(self):
        for raw in (b'{"id":1,"id":2}', b'{"x":NaN}', b'{"x":Infinity}', b'\xff', b'{', b'[' * 2000):
            with self.subTest(raw=raw[:40]), self.assertRaises(BoundaryError):
                strict_json(raw)
        self.assertEqual(strict_json(b'{"result":{"ok":true}}'), {"result": {"ok": True}})

    def test_envelope_is_byte_bound_and_immutable(self):
        text = "synthetic"
        good = hashlib.sha256(text.encode()).hexdigest()
        Envelope(text, good, "synthetic-model", "low").verify()
        for candidate in (Envelope(text, "0" * 64, "model", "low"),
                          Envelope("x" * 131073, "0" * 64, "model", "low"),
                          Envelope(text, good, "", "low")):
            with self.assertRaises(BoundaryError):
                candidate.verify()

    def test_attestation_detects_receipt_file_and_inventory_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            for name in ("source", "venv", "tools", "receipts"):
                (root / name).mkdir()
            source = root / "source" / "example.py"
            source.write_bytes(b"# synthetic\n")
            interpreter = root / "tools" / "interpreter"
            interpreter.write_bytes(b"synthetic identity only; never executed")
            digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
            data = {"commit": "939e45c91d751fadd94dcd1b873ac3cb44846213", "version": "0.21.2",
                    "interpreter": str(interpreter), "interpreterSha256": digest(interpreter),
                    "files": {"source/example.py": {"sha256": digest(source)},
                              "tools/interpreter": {"sha256": digest(interpreter)}}}
            receipt = root / "receipts" / "installation.json"
            receipt.write_text(json.dumps(data))
            expected = digest(receipt)
            self.assertEqual(verify(root, expected)["version"], "0.21.2")
            with self.assertRaisesRegex(ValueError, "receipt_drift"):
                verify(root, "0" * 64)
            source.write_bytes(b"changed")
            with self.assertRaisesRegex(ValueError, "files_drift"):
                verify(root, expected)
            source.write_bytes(b"# synthetic\n")
            (root / "source" / "unexpected.py").write_bytes(b"extra code")
            with self.assertRaisesRegex(ValueError, "files_drift"):
                verify(root, expected)


if __name__ == "__main__":
    unittest.main()
