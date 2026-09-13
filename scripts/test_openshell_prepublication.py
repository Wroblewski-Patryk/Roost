"""Synthetic review gates only; no network or sandbox enforcement tests."""
import copy
import datetime as dt
import pathlib
import tempfile
import unittest
from unittest.mock import patch

import openshell_prepublication as pre


class PrepublicationTests(unittest.TestCase):
    def setUp(self):
        self.raw = (pre.ROOT / pre.PACKET).read_bytes()
        self.packet = pre.load_packet(self.raw)
        self.checked = pre.release.timestamp(self.packet['checkedAt'])

    def test_exact_text_packet_and_prior_identities(self):
        pre.check_authority(self.packet)
        self.assertEqual(pre.base.digest(self.packet), pre.PACKET_SHA256)
        title, body = pre.verify_text(self.packet)
        self.assertEqual(len(body.split()), 575)
        self.assertIn('nonwriting stdio', title)
        pre.prior.verify_documents((pre.ROOT / pre.prior.PACKET).read_bytes())

    def test_freshness_boundaries_never_grant_publication(self):
        for delta, expected in [(-1, pre.BLOCKED), (0, pre.READY),
                                (3599, pre.READY), (3600, pre.BLOCKED), (86400, pre.BLOCKED)]:
            self.assertEqual(pre.verdict_at(self.packet, self.checked + dt.timedelta(seconds=delta)), expected)
            self.assertTrue(all(v is False for v in self.packet['externalActions'].values()))
        with self.assertRaises(pre.base.PolicyError):
            pre.verdict_at(self.packet, self.checked.replace(tzinfo=None))
        self.packet['expiresAt'] = '2099-01-01T00:00:00Z'
        with self.assertRaises(pre.base.PolicyError):
            pre.verdict_at(self.packet, self.checked)

    def test_new_release_duplicate_and_private_channel_block(self):
        self.packet['releaseCheck']['newerStable'] = ['v0.0.117']
        self.assertEqual(pre.verdict_at(self.packet, self.checked), pre.NEW_RELEASE)
        self.packet['releaseCheck']['newerStable'] = []
        self.packet['search']['duplicateIds'] = ['I1']
        self.assertEqual(pre.verdict_at(self.packet, self.checked), pre.DUPLICATE)
        self.packet['search']['duplicateIds'] = []
        self.packet['channel']['publicChannelApplicable'] = False
        self.assertEqual(pre.verdict_at(self.packet, self.checked), pre.BLOCKED)

    def test_one_issue_only_and_hidden_authority(self):
        for flag in pre.FLAGS:
            candidate = copy.deepcopy(self.packet)
            candidate['externalActions'][flag] = True
            with self.subTest(flag=flag), self.assertRaises(pre.base.PolicyError):
                pre.check_authority(candidate)
        for field, value in [('maximumWrites', 2), ('appendix', 'separate-gist'),
                             ('approvalRequired', False), ('automaticRetry', True),
                             ('textChangeRequiresNewApproval', False)]:
            candidate = copy.deepcopy(self.packet); candidate['publication'][field] = value
            with self.subTest(field=field), self.assertRaises(pre.base.PolicyError):
                pre.check_authority(candidate)
        candidate = copy.deepcopy(self.packet); candidate['ownerPublicationDecision'] = 'approved'
        with self.assertRaises(pre.base.PolicyError):
            pre.check_authority(candidate)

    def test_current_template_fields_and_mutable_evidence(self):
        for i in range(6):
            candidate = copy.deepcopy(self.packet); candidate['channel']['requiredFields'].pop(i)
            with self.assertRaises(pre.base.PolicyError):
                pre.check_authority(candidate)
        for field, value in [('headCommit', pre.source.UPSTREAM_COMMIT), ('optionalFields', [])]:
            candidate = copy.deepcopy(self.packet); candidate['channel'][field] = value
            with self.assertRaises(pre.base.PolicyError):
                pre.check_authority(candidate)
        candidate = copy.deepcopy(self.packet); candidate['mutableEvidencePolicy'] = 'valid forever'
        with self.assertRaises(pre.base.PolicyError):
            pre.check_authority(candidate)

    def test_doc_drift_private_data_and_changed_hash_cannot_rebind(self):
        original = pre.source.regular_read
        target = pre.ROOT / self.packet['publication']['bodyFile']
        for suffix in (b'\nUnapproved words.\n', b'\nC:/Users/example/private.txt\n',
                       b'\noperator@example.com\n', b'\nRoost\n'):
            def altered(path, maximum):
                raw = original(path, maximum)
                return raw + suffix if pathlib.Path(path) == target else raw
            with patch.object(pre.source, 'regular_read', altered):
                with self.assertRaises(pre.base.PolicyError):
                    pre.verify_text(self.packet)
        self.packet['publication']['bodySha256'] = '0' * 64
        with self.assertRaises(pre.base.PolicyError):
            pre.verify(pre.base.canonical_bytes(self.packet), pathlib.Path('unused'))

    def test_url_scope_rejects_auth_redirect_and_unrelated_repo(self):
        for url in ('http://api.github.com/repos/NVIDIA/OpenShell',
                    'https://token@api.github.com/repos/NVIDIA/OpenShell',
                    'https://api.github.com/repos/another/project',
                    'https://api.github.com/search/issues?q=repo%3ANVIDIA%2FOpenShell+repo%3Aother%2Frepo&per_page=30&page=1',
                    'https://raw.githubusercontent.com/NVIDIA/OpenShell/main/CONTRIBUTING.md'):
            with self.subTest(url=url), self.assertRaises(pre.base.PolicyError):
                pre.allowed_url(url)
        for entry in self.packet['evidence']:
            pre.allowed_url(entry['url'])

    def synthetic_search(self):
        item = {'number': 1, 'title': 'Immutable workspace proposal', 'state': 'open',
                'html_url': 'https://github.com/NVIDIA/OpenShell/issues/1', 'labels': [],
                'created_at': '2026-09-01T00:00:00Z', 'updated_at': '2026-09-01T00:00:00Z'}
        candidate = {'id': 'I1', 'number': 1, 'kind': 'issue', 'title': item['title'],
            'state': item['state'], 'url': item['html_url'], 'labels': [],
            'createdAt': item['created_at'], 'updatedAt': item['updated_at'], 'evidenceId': 'q',
            'classification': 'RELATED', 'reason': 'Workspace packaging alone does not provide full child isolation.'}
        packet = {'search': {'queries': [{'query': 'repo:NVIDIA/OpenShell immutable',
            'kind': 'issues-pr', 'pages': ['q'], 'totalCount': 1}], 'candidateCount': 1,
            'candidates': [candidate], 'screenedOutIssueIds': [], 'screenedOutDiscussionIds': [], 'duplicateIds': []}}
        data = {'q': {'incomplete_results': False, 'total_count': 1, 'items': [item]}}
        meta = {'q': {'url': 'https://api.github.com/search/issues?q=repo%3ANVIDIA%2FOpenShell+immutable&per_page=30&page=1', 'link': None}}
        return packet, data, meta

    def test_duplicate_closure_and_search_completeness(self):
        packet, data, meta = self.synthetic_search()
        pre.check_search(packet, data, meta)
        packet['search']['candidates'][0]['classification'] = 'DUPLICATE'
        with self.assertRaises(pre.base.PolicyError):
            pre.check_search(packet, data, meta)
        packet['search']['duplicateIds'] = ['I1']
        pre.check_search(packet, data, meta)
        for change in ('incomplete', 'omitted', 'duplicate', 'pagination'):
            p, d, m = self.synthetic_search()
            if change == 'incomplete': d['q']['incomplete_results'] = True
            if change == 'omitted': p['search']['candidates'] = []; p['search']['candidateCount'] = 0
            if change == 'duplicate': d['q']['items'].append(d['q']['items'][0])
            if change == 'pagination': d['q']['total_count'] = 31; p['search']['queries'][0]['totalCount'] = 31
            with self.subTest(change=change), self.assertRaises(pre.base.PolicyError):
                pre.check_search(p, d, m)

    def test_discussion_login_or_incomplete_results_are_not_empty_success(self):
        for raw in (b'<html>Please sign in</html>',
                    b'<script type="application/json" data-target="react-app.embeddedData">'
                    b'{"payload":{"blackbirdSearchRoute":{"type":"discussions","errors":["limited"],'
                    b'"warn_limited_results":true,"logged_in":false}}}</script>'):
            with self.assertRaises(pre.base.PolicyError):
                pre.discussion_search(raw)

    def test_bounds_duplicates_and_readonly_evidence_drift(self):
        for raw in (b'', b'x' * (pre.MAX_PACKET + 1), b'{"a":1,"a":2}', b'{"a":NaN}', b'{"a":1.2}'):
            with self.assertRaises(pre.base.PolicyError):
                pre.load_packet(raw)
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            entry = copy.deepcopy(self.packet['evidence'][0])
            (root / (entry['id'] + '.raw')).write_bytes(b'drift')
            with self.assertRaises(pre.base.PolicyError):
                pre.read_evidence({'evidence': [entry]}, root)


if __name__ == '__main__':
    unittest.main()
