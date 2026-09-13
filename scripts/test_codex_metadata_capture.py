"""Offline fake responses only; no network is used by these tests."""
import hashlib
import json
import pathlib
import tempfile
import unittest

from codex_metadata_capture import BUDGET, Capture
from codex_provenance_capture import ReviewCapture, PAYLOAD, PLAN

URL = 'https://learn.chatgpt.com/docs/fixture.md'


class FakeResponse:
    def __init__(self, body=b'{}', status=200, length=True, location=None, fail=False):
        self.body, self.status, self.position = body, status, 0
        self.headers = {'Content-Length':str(len(body))} if length else {}
        if location:
            self.headers['Location'] = location
        self.fail = fail
        self.reads = []

    def getheader(self, name):
        return self.headers.get(name)

    def read1(self, size):
        self.reads.append(size)
        if self.fail:
            raise OSError('synthetic')
        result = self.body[self.position:self.position+size]
        self.position += len(result)
        return result

    def close(self):
        pass


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = pathlib.Path(self.temp.name)/'ledger.json'
        self.calls = 0

    def tearDown(self):
        self.temp.cleanup()

    def capture(self, response):
        def transport(*args):
            self.calls += 1
            persisted = json.loads(self.path.read_text())
            self.assertEqual(persisted['requests'][-1]['outcome'], 'started')
            return response
        return Capture(self.path, transport)

    def test_receipt_survives_projection_failure(self):
        payload = b'x'*90000
        capture = self.capture(FakeResponse(payload))
        body, row = capture.request(URL)
        self.assertEqual(body, payload)
        self.assertEqual(row['sha256'], hashlib.sha256(payload).hexdigest())
        try:
            raise ValueError('display_projection_failed')
        except ValueError:
            restored = Capture(self.path, lambda *args: self.fail('no request'))
        self.assertEqual(restored.ledger['requests'][0]['bytesRead'], 90000)
        self.assertTrue(restored.ledger['requests'][0]['complete'])

    def test_redirect_body_is_counted_and_never_followed(self):
        capture = self.capture(FakeResponse(b'redirect metadata',302,location='https://github.com/openai/codex/releases/tag/rust-v1.2.3'))
        body, row = capture.request(URL)
        self.assertIsNone(body)
        self.assertEqual(self.calls,1)
        self.assertEqual(row['bytesRead'],17)
        self.assertEqual(row['redirectCount'],1)
        self.assertTrue(row['redirectTargetAllowed'])

    def test_payload_and_external_redirects_are_denied(self):
        for location in ('https://github.com/openai/codex/releases/download/v1/binary.tar.gz','https://untrusted.example.invalid/meta'):
            with self.subTest(location=location):
                self.path.unlink(missing_ok=True)
                capture = self.capture(FakeResponse(b'',302,location=location))
                _, row = capture.request(URL)
                self.assertEqual(row['outcome'],'redirect_denied')
                self.assertIsNone(row['redirectTo'])
                with self.assertRaises(ValueError):
                    capture.request(location)

    def test_declared_oversize_stops_without_read_or_retry(self):
        response = FakeResponse(b'x'*(BUDGET['maxResponseBytes']+1))
        capture = self.capture(response)
        body, row = capture.request(URL)
        self.assertIsNone(body)
        self.assertEqual(row['outcome'],'over_limit')
        self.assertEqual(response.reads,[])
        with self.assertRaises(ValueError):
            capture.request(URL)

    def test_unknown_length_never_reads_sentinel_past_cap(self):
        response = FakeResponse(b'x'*(BUDGET['maxResponseBytes']+1),length=False)
        _, row = self.capture(response).request(URL)
        self.assertEqual(row['bytesRead'],BUDGET['maxResponseBytes'])
        self.assertEqual(response.position,BUDGET['maxResponseBytes'])
        self.assertFalse(row['complete'])
        self.assertEqual(row['outcome'],'over_limit')

    def test_exact_limit_and_head_are_valid(self):
        _, row = self.capture(FakeResponse(b'x'*BUDGET['maxResponseBytes'])).request(URL)
        self.assertTrue(row['complete'])
        response = FakeResponse(b'x'*500000)
        _, row = self.capture(response).request(URL,method='HEAD')
        self.assertEqual(row['bytesRead'],0)
        self.assertEqual(response.reads,[])

    def test_request_and_aggregate_limits(self):
        for _ in range(12):
            _, row = self.capture(FakeResponse(b'')).request(URL)
            self.assertTrue(row['complete'])
        with self.assertRaises(ValueError):
            self.capture(FakeResponse(b'')).request(URL)
        self.path.unlink()
        for _ in range(10):
            self.capture(FakeResponse(b'x'*100000)).request(URL)
        _, row = self.capture(FakeResponse(b'x'*100000)).request(URL)
        self.assertEqual(row['outcome'],'over_limit')
        self.assertEqual(sum(r['bytesRead'] for r in json.loads(self.path.read_text())['requests']),1000000)

    def test_transport_failure_and_inflight_receipt_block_restart(self):
        capture = self.capture(FakeResponse(fail=True))
        _, row = capture.request(URL)
        self.assertEqual(row['outcome'],'transport_error')
        self.assertFalse(row['complete'])
        self.assertGreater(row['readInFlightMax'],0)
        with self.assertRaises(ValueError):
            Capture(self.path)

    def test_closed_ledger_prevents_any_transport(self):
        capture = self.capture(FakeResponse())
        capture.ledger['closed'] = True
        capture.save()
        restored = Capture(self.path, lambda *args: self.fail('closed transport'))
        with self.assertRaisesRegex(ValueError, 'budget_closed'):
            restored.request(URL)
        self.assertEqual(self.calls, 0)

    def test_review_has_separate_identity_and_head_only_payload_scope(self):
        review = ReviewCapture(self.path, transport=lambda *args: self.fail('no network'))
        self.assertEqual(review.ledger['taskId'], 'RF-HERMES-012')
        for url, method in ((PAYLOAD, 'GET'), (PLAN[0][1], 'HEAD'), ('https://untrusted.example.invalid/x', 'GET')):
            with self.subTest(url=url, method=method), self.assertRaises(ValueError):
                review.request(url, method)
        self.assertEqual(review.ledger['requests'], [])
        review.save()
        with self.assertRaisesRegex(ValueError, 'ledger_identity'):
            Capture(self.path)
        review.ledger['requests'].append({'url': PLAN[0][1], 'method': 'GET'})
        with self.assertRaisesRegex(ValueError, 'repeated_endpoint_no_retry'):
            review.request(PLAN[0][1])


if __name__ == '__main__':
    unittest.main()
