"""Synthetic release/coverage/freshness tests; no HTTP, Docker or upstream execution."""
import copy
import datetime as dt
import hashlib
import json
import pathlib
import tempfile
import unittest

import openshell_release_inspection as target


def release(identifier, tag, prerelease=False, published='2026-08-28T09:10:23Z'):
    return {'id': identifier, 'tag_name': tag, 'draft': False,
            'prerelease': prerelease, 'published_at': published}


class ReleaseInspectionTests(unittest.TestCase):
    def setUp(self):
        self.raw = (target.ROOT / 'config/openshell/official-release-inspection.json').read_bytes()
        self.manifest = target.verify_manifest(self.raw)
        docs = [json.loads((target.ROOT / 'config/openshell' / name).read_bytes()) for name in target.proposal.FILES]
        self.spec, self.contract = docs[:2]

    def test_semantic_versions_do_not_use_lexical_order_or_admit_prerelease(self):
        self.assertGreater(target.version('v0.0.116'), target.version('v0.0.99'))
        self.assertGreater(target.version('v0.1.0-pre.1'), target.version('v0.0.116'))
        self.assertLess(target.version('v0.0.116-pre.1'), target.version('v0.0.116'))
        self.assertLess(target.version('v0.1.0-pre.2'), target.version('v0.1.0-pre.10'))
        self.assertIsNone(target.version('dev'))

    def test_latest_stable_and_all_newer_published_candidates(self):
        rows = [release(1, 'v0.0.116'), release(2, 'v0.0.117', published='2026-09-01T00:00:00Z'),
                release(3, 'v0.1.0-pre.1', True), release(4, 'dev', True)]
        actual = target.classify_releases(rows, 'v0.0.116', rows[0]['published_at'])
        self.assertEqual(actual['latestStable'], 'v0.0.117')
        self.assertEqual(actual['newerStable'], ['v0.0.117'])
        self.assertEqual(actual['newerVersioned'], ['v0.0.117', 'v0.1.0-pre.1'])
        self.assertIn('dev', actual['prereleases'])

    def test_duplicates_ambiguous_stable_and_drafts_fail_closed(self):
        first = release(1, 'v0.0.116')
        for bad in (first, release(2, 'v0.0.116'), release(2, 'floating'),
                    release(2, 'v0.1.0-pre.1'), {**release(2, 'v0.0.117'), 'draft': True}):
            with self.assertRaises(target.base.PolicyError):
                target.classify_releases([first, bad], 'v0.0.116', first['published_at'])

    def test_tag_without_release_is_informational_only(self):
        tags = {'v0.0.116': {}, 'v0.1.0-pre.1': {}, 'dev': {}}
        self.assertEqual(target.unreleased_newer_tags(tags, {'v0.0.116', 'dev'}, 'v0.0.116'), ['v0.1.0-pre.1'])
        rows = [release(1, 'v0.0.116'), release(2, 'dev', True)]
        self.assertEqual(target.classify_releases(rows, 'v0.0.116', rows[0]['published_at'])['newerStable'], [])

    def test_exact_endpoint_allowlist_rejects_binary_auth_or_other_repo(self):
        self.assertTrue(target.endpoint_allowed(target.API_ROOT + 'releases/latest'))
        self.assertTrue(target.endpoint_allowed(target.API_ROOT + 'releases?per_page=30&page=4'))
        for url in ('https://github.com/NVIDIA/OpenShell/releases/download/v0.0.116/program',
                    'https://api.github.com/repos/example/OpenShell/releases/latest',
                    target.API_ROOT + 'releases/assets/123', target.API_ROOT + 'releases?per_page=100&page=1',
                    target.API_ROOT + 'releases/latest?access_token=inert',
                    target.API_ROOT + 'releases/latest#fragment', target.API_ROOT + '../other'):
            self.assertFalse(target.endpoint_allowed(url))

    def test_pagination_missing_next_or_external_link_is_rejected(self):
        prefix = 'https://api.github.com/repositories/1166129534/releases?per_page=30&page='
        valid = '<' + prefix + '2>; rel="next", <' + prefix + '4>; rel="last"'
        target.check_pagination(valid, 1, 4)
        target.check_pagination(None, 4, 4)
        for link in (None, valid.replace('api.github.com', 'invalid.example'),
                     valid.replace('page=2', 'page=3'), valid + ', malformed'):
            with self.assertRaises(target.base.PolicyError):
                target.check_pagination(link, 1, 4)

    def test_complete_16_35_assessment_and_each_omission(self):
        target.check_assessments(self.manifest, self.contract, self.spec)
        for field in ('requirementAssessment', 'negativeAssessment'):
            for index in range(len(self.manifest[field])):
                changed = copy.deepcopy(self.manifest); changed[field].pop(index)
                with self.assertRaises(target.base.PolicyError):
                    target.check_assessments(changed, self.contract, self.spec)

    def test_no_config_or_unexecuted_case_can_be_promoted_to_pass(self):
        for field in ('requirementAssessment', 'negativeAssessment'):
            for index in range(len(self.manifest[field])):
                changed = copy.deepcopy(self.manifest); changed[field][index]['status'] = 'PASS'
                with self.assertRaises(target.base.PolicyError):
                    target.check_assessments(changed, self.contract, self.spec)
        changed = copy.deepcopy(self.manifest)
        changed['negativeAssessment'][0]['expectedOutcome']['workloadExec'] = True
        with self.assertRaises(target.base.PolicyError):
            target.check_assessments(changed, self.contract, self.spec)

    def test_manifest_identity_binds_every_top_level_field_and_cannot_refresh_time(self):
        for key in self.manifest:
            changed = copy.deepcopy(self.manifest); del changed[key]
            with self.assertRaises(target.base.PolicyError):
                target.verify_manifest(json.dumps(changed).encode())
        for field, value in (('checkedAt', '2026-09-14T00:00:00Z'), ('freshnessSeconds', 999999),
                             ('verdict', 'OFFICIAL-RELEASE-QUALIFIED-CANDIDATE'), ('liveAdmissionAllowed', True)):
            changed = {**self.manifest, field: value}
            with self.assertRaises(target.base.PolicyError):
                target.verify_manifest(json.dumps(changed).encode())

    def test_freshness_boundary_future_clock_and_expiry(self):
        checked = target.timestamp(self.manifest['checkedAt'])
        expires = target.timestamp(self.manifest['expiresAt'])
        self.assertTrue(target.fresh_at(self.manifest, checked))
        self.assertTrue(target.fresh_at(self.manifest, expires - dt.timedelta(microseconds=1)))
        self.assertFalse(target.fresh_at(self.manifest, expires))
        self.assertFalse(target.fresh_at(self.manifest, checked - dt.timedelta(seconds=1)))
        with self.assertRaises(target.base.PolicyError):
            target.fresh_at(self.manifest, checked.replace(tzinfo=None))

    def test_evidence_bytes_limits_and_path_traversal(self):
        with tempfile.TemporaryDirectory(prefix='roost-release-test-') as directory:
            path = pathlib.Path(directory) / 'inert.json'; raw = b'{"inert":true}'
            path.write_bytes(raw); sha = hashlib.sha256(raw).hexdigest()
            self.assertEqual(target.verified_read(directory, path.name, len(raw), sha, 100), raw)
            for file, count, pin, limit in ((path.name, len(raw), '0' * 64, 100),
                                          (path.name, len(raw), sha, 4), ('../inert.json', len(raw), sha, 100)):
                with self.assertRaises(target.base.PolicyError):
                    target.verified_read(directory, file, count, pin, limit)


if __name__ == '__main__':
    unittest.main()
