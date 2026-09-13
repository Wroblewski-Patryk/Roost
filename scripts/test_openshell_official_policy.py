"""Transport guard tests; upstream semantics run separately in the real adapter."""
import hashlib
import io
import json
import pathlib
import subprocess
import unittest
from unittest import mock

import openshell_official_policy as guard
import openshell_minimal_policy as narrow


class FakeProcess:
    def __init__(self, stdout=b'{"liveAdmissionAllowed":false,"code":"test"}', stderr=b'', timeout=False):
        self.stdin = io.BytesIO()
        self.stdout = io.BytesIO(stdout)
        self.stderr = io.BytesIO(stderr)
        self.returncode = 0
        self.killed = False
        self.timeout = timeout

    def wait(self, timeout=None):
        if self.timeout and not self.killed:
            raise subprocess.TimeoutExpired('synthetic-parser', timeout)
        return self.returncode

    def kill(self):
        self.killed = True
        self.returncode = -1


class OfficialTransportTests(unittest.TestCase):
    def invoke(self, proc, raw=b'{}'):
        payload = b'synthetic parser identity'
        with mock.patch.object(narrow, 'read_bounded', return_value=payload), \
             mock.patch.object(guard, 'PARSER_SHA256', hashlib.sha256(payload).hexdigest()), \
             mock.patch.object(guard.subprocess, 'Popen', return_value=proc) as spawn:
            result = guard.invoke(pathlib.Path('/synthetic/parser'), raw)
            kwargs = spawn.call_args.kwargs
            self.assertNotIn('shell', kwargs)
            self.assertTrue(kwargs['close_fds'])
            self.assertEqual(set(kwargs['env']), {'PATH', 'HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME',
                                                  'XDG_DATA_HOME', 'XDG_STATE_HOME', 'LANG', 'LC_ALL', 'TZ'})
            return result

    def test_clean_environment_and_fixed_executable(self):
        status, value = self.invoke(FakeProcess())
        self.assertEqual(status, 0)
        self.assertIs(value['liveAdmissionAllowed'], False)

    def test_binary_hash_drift_prevents_spawn(self):
        with mock.patch.object(narrow, 'read_bounded', return_value=b'substituted'), \
             mock.patch.object(guard.subprocess, 'Popen') as spawn:
            with self.assertRaisesRegex(narrow.PolicyError, 'parser_hash'):
                guard.invoke(pathlib.Path('/synthetic/parser'), b'{}')
            spawn.assert_not_called()

    def test_input_bound_prevents_spawn(self):
        with mock.patch.object(guard.subprocess, 'Popen') as spawn:
            with self.assertRaisesRegex(narrow.PolicyError, 'input_limit'):
                guard.invoke(pathlib.Path('/synthetic/parser'), b'x' * (guard.MAX_INPUT + 2))
            spawn.assert_not_called()

    def test_output_and_stderr_bounds_kill_only_owned_producer(self):
        for proc in (FakeProcess(stdout=b'x' * (guard.MAX_OUTPUT + 1)),
                     FakeProcess(stderr=b'x' * (guard.MAX_STDERR + 1))):
            with self.assertRaisesRegex(narrow.PolicyError, 'output_limit'):
                self.invoke(proc)
            self.assertTrue(proc.killed)

    def test_timeout_stops_producer(self):
        proc = FakeProcess(timeout=True)
        with self.assertRaisesRegex(narrow.PolicyError, 'parser_timeout_or_pipe'):
            self.invoke(proc)
        self.assertTrue(proc.killed)

    def test_diagnostics_and_invalid_projection_cannot_claim_admission(self):
        for proc in (FakeProcess(stderr=b'private synthetic diagnostic'),
                     FakeProcess(stdout=b'{"liveAdmissionAllowed":true}'),
                     FakeProcess(stdout=b'{"liveAdmissionAllowed":false,"code":"x","code":"y"}')):
            with self.assertRaises(narrow.PolicyError) as caught:
                self.invoke(proc)
            self.assertNotIn('private synthetic', str(caught.exception))

    def test_cases_cover_upstream_failures_and_merge_distinction(self):
        policy = json.loads((guard.ROOT / 'config/openshell/synthetic-isolation-v2.policy.json').read_text())
        cases = {name: (payload, status, code) for name, payload, status, code in guard.cases(policy)}
        self.assertEqual(set(cases), {'replace', 'parse_failure', 'unknown_field', 'validation_failure',
                                      'unknown_envelope', 'policy_limit', 'output_limit',
                                      'merge_leaks_base', 'replace_rejects_base'})
        self.assertEqual(cases['merge_leaks_base'][0]['operation'], 'merge')
        self.assertEqual(cases['replace'][0]['operation'], 'replace')
        self.assertNotIn('base', cases['replace'][0])
        for payload, _, _ in cases.values():
            self.assertLessEqual(len(guard.canonical(payload)), guard.MAX_INPUT)


if __name__ == '__main__':
    unittest.main()
