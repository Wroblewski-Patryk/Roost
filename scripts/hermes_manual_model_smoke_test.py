import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).with_name('hermes_manual_model_smoke.py'))
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class RequestBoundary(unittest.TestCase):
    endpoint = 'http://127.0.0.1:11434/v1/chat/completions'
    payload = {'model': 'gpt-oss:20b', 'max_tokens': 256, 'messages': [], 'reasoning_effort': 'low'}

    def call(self, payload=None, url=None, used=0):
        return smoke.request_facts('POST', url or self.endpoint, json.dumps(payload or self.payload), used)

    def test_one_bounded_local_no_tool_request(self):
        self.assertEqual(self.call()['toolCount'], 0)
        self.assertEqual(self.call()['contextLimit'], 2048)
        with self.assertRaises(PermissionError):
            self.call(used=1)

    def test_local_metadata_remains_available(self):
        for method, route in [('GET', '/v1/models'), ('GET', '/api/tags'), ('POST', '/api/show'),
                              ('GET', '/api/v1/models'), ('GET', '/v1/props'), ('GET', '/version'),
                              ('GET', '/v1/models/gpt-oss:20b')]:
            facts = smoke.request_facts(method, 'http://127.0.0.1:11434'+route, b'{}', 0)
            self.assertEqual(facts['route'], route)
            self.assertNotIn('model', facts)

    def test_foreign_endpoint_route_model_and_tools_refuse(self):
        for url in ['https://example.invalid/v1/chat/completions', 'http://127.0.0.1:11435/v1/chat/completions',
                    'http://127.0.0.1:11434/api/generate']:
            with self.subTest(url=url), self.assertRaises(PermissionError):
                self.call(url=url)
        for changes in [{'model': 'other'}, {'tools': [{'type': 'function'}]}, {'functions': [{'name': 'shell'}]}]:
            with self.subTest(changes=changes), self.assertRaises(PermissionError):
                self.call({**self.payload, **changes})

    def test_output_and_context_cannot_exceed_budget(self):
        for changes in [{'max_tokens': 257}, {'max_tokens': 0}, {'options': {'num_ctx': 4096}}, {'num_ctx': 131072}]:
            with self.subTest(changes=changes), self.assertRaises(PermissionError):
                self.call({**self.payload, **changes})

    def test_fixture_advertises_large_model_window(self):
        status, metadata = smoke.fixture_metadata('/api/show')
        self.assertEqual(status, 200)
        self.assertEqual(metadata['model_info']['gptoss.context_length'], 131072)


if __name__ == '__main__':
    unittest.main()
