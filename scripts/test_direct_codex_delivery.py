"""In-memory document mutation tests; never read an installation or execute an artifact."""
import unittest

from validate_direct_codex_delivery import CONTRACT, MATRIX, GATES, validate_text


class DeliveryDocumentTests(unittest.TestCase):
    def setUp(self):
        self.contract = CONTRACT.read_text(encoding='utf-8')
        self.matrix = MATRIX.read_text(encoding='utf-8')

    def test_complete_blocked_contract(self):
        result = validate_text(self.contract, self.matrix)
        self.assertEqual(result['requirements'], 16)
        self.assertEqual(result['stages'], 10)

    def test_required_contract_boundaries(self):
        changes = [
            ('## CDL-R03', '## CDL-R02'),
            ('| S02 detached_verification |', '| S11 detached_verification |'),
            ('| `assetSize` |', '| `guessedSize` |'),
            ('Missing mandatory published metadata', 'Optional metadata'),
            ('PUBLISHER_BUNDLE', 'UNREVIEWED_BUNDLE'),
            ('outside the immutable executable root', 'inside any root'),
            ('No stage automatically authorizes the next', 'Every stage authorizes the next'),
            ('"sourceRef": null', '"sourceRef": "guessed-source"'),
            ('"schemaRoute": null', '"schemaRoute": "PINNED_GENERATOR"'),
            ('"sourceRef": null', '"sourceRef": null, "extra": null'),
            ('"sourceRef": null', '"sourceRef": null, "sourceRef": null'),
        ]
        changes.extend((f'"{gate}": false', f'"{gate}": true') for gate in GATES)
        for before, after in changes:
            with self.subTest(change=before):
                self.assertIn(before, self.contract)
                changed = self.contract.replace(before, after)
                with self.assertRaises(ValueError):
                    validate_text(changed, self.matrix)

    def test_missing_or_inconsistent_acceptance(self):
        rows = [line for line in self.matrix.splitlines() if line.startswith('| CDL-T')]
        bad_matrices = [
            self.matrix.replace(rows[0] + '\n', ''),
            self.matrix.replace('CDL-T02', 'CDL-T01'),
            self.matrix.replace('CAS-T03 CAS-T26 CAS-T27', 'CAS-T03 CAS-T27'),
            self.matrix.replace('D01 | B01 B02', 'D01 | B01'),
            self.matrix.replace('SPECIFIED, NOT QUALIFIED', 'QUALIFIED'),
        ]
        for matrix in bad_matrices:
            with self.subTest(matrixCase=bad_matrices.index(matrix)):
                with self.assertRaises(ValueError):
                    validate_text(self.contract, matrix)

    def test_private_path_rejected(self):
        for path in ('/home/example/installation', 'Z:\\private\\installation'):
            with self.subTest(path=path):
                with self.assertRaisesRegex(ValueError, 'document_privacy'):
                    validate_text(self.contract + '\n' + path, self.matrix)


if __name__ == '__main__':
    unittest.main()
