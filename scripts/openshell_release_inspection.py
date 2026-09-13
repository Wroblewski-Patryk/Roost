"""Verify the dated RF044 public release snapshot offline; never admit execution."""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re
from urllib.parse import parse_qs, urlparse

import openshell_nonwriting_proposal as proposal

base = proposal.base
source = proposal.source
ROOT = proposal.ROOT
MANIFEST_SHA256 = '2caaa40ec9a8a141f3b134bff441e2360ffd0acf63c29415321a3d8a69d3816a'
NO_CANDIDATE = 'OFFICIAL-RELEASE-NO-QUALIFIED-CANDIDATE'
BLOCKED = 'OFFICIAL-RELEASE-INSPECTION-BLOCKED'
API_ROOT = 'https://api.github.com/repos/NVIDIA/OpenShell/'
ASSET_FIELDS = ('id', 'name', 'state', 'size', 'content_type', 'digest',
                'created_at', 'updated_at', 'url', 'browser_download_url')


def timestamp(value):
    base.need(type(value) is str and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', value),
              'timestamp_format')
    try:
        return dt.datetime.strptime(value, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=dt.timezone.utc)
    except ValueError:
        raise base.PolicyError('timestamp_value') from None


def version(value):
    match = re.fullmatch(r'v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?', value)
    if not match:
        return None
    major, minor, patch, pre = match.groups()
    parts = () if pre is None else tuple((0, int(x)) if x.isdigit() else (1, x) for x in pre.split('.'))
    base.need(pre is None or all(x and (not x.isdigit() or x == '0' or not x.startswith('0'))
                                for x in pre.split('.')), 'invalid_version')
    return (int(major), int(minor), int(patch), pre is None, parts)


def classify_releases(rows, baseline_tag, baseline_published):
    baseline = version(baseline_tag)
    base.need(baseline is not None, 'baseline_version')
    stable, newer_stable, newer_versioned, prereleases = [], [], [], []
    ids, tags = set(), set()
    for row in rows:
        base.need(row['id'] not in ids and row['tag_name'] not in tags, 'release_duplicate')
        ids.add(row['id']); tags.add(row['tag_name'])
        base.need(type(row['draft']) is bool and type(row['prerelease']) is bool, 'release_flags')
        base.need(row['draft'] is False, 'unexpected_draft')
        published = timestamp(row['published_at'])
        semver = version(row['tag_name'])
        if row['prerelease']:
            prereleases.append(row['tag_name'])
        else:
            base.need(semver is not None and semver[3], 'unorderable_stable_release')
            stable.append((semver, row['tag_name']))
            if semver > baseline or published > timestamp(baseline_published):
                newer_stable.append(row['tag_name'])
        if semver is not None and semver > baseline:
            newer_versioned.append(row['tag_name'])
    base.need(bool(stable), 'stable_missing')
    return {'latestStable': max(stable)[1], 'newerStable': sorted(newer_stable),
            'newerVersioned': sorted(newer_versioned), 'prereleases': sorted(prereleases)}


def endpoint_allowed(url):
    if type(url) is not str or not url.startswith(API_ROOT):
        return False
    parsed = urlparse(url)
    if parsed.fragment or parsed.username or parsed.password or parsed.port:
        return False
    tail = parsed.path.removeprefix('/repos/NVIDIA/OpenShell/')
    if tail == 'releases':
        query = parse_qs(parsed.query)
        return set(query) == {'per_page', 'page'} and query['per_page'] == ['30'] and \
            len(query['page']) == 1 and query['page'][0] in [str(x) for x in range(1, 11)]
    return not parsed.query and bool(re.fullmatch(
        r'releases/latest|git/matching-refs/tags/|git/ref/tags/(?:v0\.0\.116|dev|vm-runtime|vm-runtime-capability-free)|git/(?:commits|tags)/[0-9a-f]{40}', tail))


def check_pagination(link, page, pages):
    entries = re.findall(r'<([^>]+)>;\s*rel="([^"]+)"', link or '')
    base.need(link is None or len(entries) == len(link.split(',')), 'pagination_syntax')
    relations = {}
    for url, relation in entries:
        parsed = urlparse(url)
        base.need(parsed.scheme == 'https' and parsed.netloc == 'api.github.com' and
                  parsed.path == '/repositories/1166129534/releases' and not parsed.fragment,
                  'pagination_endpoint')
        query = parse_qs(parsed.query)
        base.need(set(query) == {'per_page', 'page'} and query['per_page'] == ['30'] and
                  len(query['page']) == 1 and query['page'][0] in [str(x) for x in range(1, pages + 1)],
                  'pagination_query')
        base.need(relation in ('next', 'prev', 'last', 'first') and relation not in relations,
                  'pagination_duplicate')
        relations[relation] = int(query['page'][0])
    base.need(relations.get('next') == (page + 1 if page < pages else None), 'pagination_incomplete')
    if page < pages:
        base.need(relations.get('last') == pages, 'pagination_last')


def verified_read(root, file, count, sha, maximum):
    raw = source.regular_read(source.relative_source(root, file), maximum)
    base.need(len(raw) == count and hashlib.sha256(raw).hexdigest() == sha, 'evidence_drift')
    return raw


def verify_manifest(raw):
    manifest = proposal.load_document(raw)
    base.need(base.digest(manifest) == MANIFEST_SHA256, 'manifest_drift')
    return manifest


def fresh_at(manifest, now):
    checked, expires = timestamp(manifest['checkedAt']), timestamp(manifest['expiresAt'])
    base.need(expires - checked == dt.timedelta(seconds=3600) and
              manifest['freshnessSeconds'] == 3600, 'freshness_contract')
    base.need(now.tzinfo is not None, 'clock_unknown')
    return checked <= now < expires


def unreleased_newer_tags(refs, release_tags, baseline_tag):
    baseline = version(baseline_tag)
    return sorted(tag for tag in refs if tag not in release_tags and
                  version(tag) is not None and version(tag) > baseline)


def check_assessments(manifest, contract, spec):
    proposal.unique_ids(manifest['requirementAssessment'], proposal.REQUIREMENTS, 'requirement_closure')
    proposal.unique_ids(manifest['negativeAssessment'], proposal.NEGATIVES, 'negative_closure')
    statuses = {row['id']: row['status'] for row in manifest['requirementAssessment']}
    for row in manifest['requirementAssessment']:
        base.need(row['status'] in ('BLOCKED', 'UNPROVEN') and row['enforcementTestsRun'] is False,
                  'unearned_requirement_pass')
        references = [ref for entry in spec['sourceMap'] if entry['requirement'] == row['id']
                      for ref in entry['symbolReferences']]
        proposal.same(row['sourceReferences'], references, 'assessment_source_binding')
    cases = {row['id']: row for row in contract['negativeCases']}
    for row in manifest['negativeAssessment']:
        case = cases[row['id']]
        proposal.same(row['expectedOutcome'], case['expected'], 'negative_expected_outcome')
        base.need(row['status'] == 'UNPROVEN' and row['executed'] is False and
                  row['requirement'] == case['requirement'] and
                  row['sourceRequirementStatus'] == statuses[row['requirement']], 'unearned_negative_pass')


def verify(raw, evidence_root, upstream_root, now=None):
    manifest = verify_manifest(raw)
    documents = [source.regular_read(ROOT / 'config/openshell' / name, proposal.MAX_JSON_BYTES)
                 for name in proposal.FILES]
    source_result = proposal.verify(documents, upstream_root)
    spec, contract, _ = [proposal.load_document(value) for value in documents]
    for field, expected in zip(('proposalSha256', 'contractSha256', 'receiptSchemaSha256'), proposal.HASHES):
        proposal.same(manifest['sourceEvidence'][field], expected, 'contract_identity_drift')
    check_assessments(manifest, contract, spec)
    responses, total = {}, 0
    for entry in manifest['apiEvidence']:
        base.need(endpoint_allowed(entry['endpoint']) and entry['status'] == 200, 'api_endpoint')
        raw_response = verified_read(evidence_root, entry['file'], entry['bytes'], entry['sha256'], 2097152)
        total += len(raw_response); base.need(total <= 12582912, 'aggregate_evidence_limit')
        meta = json.loads(verified_read(evidence_root, entry['metadataFile'], entry['metadataBytes'],
                                       entry['metadataSha256'], 8192))
        for key in ('endpoint', 'status', 'bytes', 'sha256', 'link', 'checkedAt'):
            proposal.same(meta[key], entry[key], 'metadata_binding')
        responses[entry['name']] = json.loads(raw_response)
    pages = manifest['releaseInventory']['pages']
    base.need(pages == ['releases-' + str(n) for n in range(1, len(pages) + 1)] and
              0 < len(pages) <= 10, 'page_sequence')
    rows = []
    for number, name in enumerate(pages, 1):
        entries = responses[name]
        base.need(type(entries) is list and len(entries) <= 30 and
                  (number == len(pages) or len(entries) == 30), 'page_size')
        evidence = next(entry for entry in manifest['apiEvidence'] if entry['name'] == name)
        check_pagination(evidence['link'], number, len(pages))
        rows.extend(entries)
    base.need(len(rows) == manifest['releaseInventory']['totalPublicReleases'], 'release_count')
    latest = responses['latest']
    base.need(latest['tag_name'] == manifest['baseline']['tag'] and
              latest['draft'] is False and latest['prerelease'] is False, 'latest_changed')
    classified = classify_releases(rows, manifest['baseline']['tag'], latest['published_at'])
    proposal.same(classified['latestStable'], manifest['latestStable'], 'latest_list_disagreement')
    proposal.same(classified['newerStable'], manifest['newerStableReleases'], 'newer_stable_detected')
    proposal.same(classified['newerVersioned'], manifest['newerVersionedPublishedReleases'], 'newer_release_detected')
    proposal.same(len(classified['prereleases']), manifest['releaseInventory']['prereleaseCount'], 'prerelease_count')
    proposal.same(len(rows) - len(classified['prereleases']), manifest['releaseInventory']['stableCount'], 'stable_count')
    base.need(not classified['newerStable'], 'candidate_requires_new_inspection')
    refs = responses['tag-refs']
    base.need(len(refs) == manifest['releaseInventory']['tagRefCount'] and
              len({r['ref'] for r in refs}) == len(refs), 'tag_ref_count')
    refs = {row['ref'].removeprefix('refs/tags/'): row for row in refs}
    proposal.same(unreleased_newer_tags(refs, {r['tag_name'] for r in rows}, manifest['baseline']['tag']),
                  [row['tag'] for row in manifest['unreleasedVersionedTags']], 'unreleased_tag_closure')
    proposal.same(responses['baseline-ref']['object'], refs[latest['tag_name']]['object'], 'baseline_ref_drift')
    proposal.same(refs[latest['tag_name']]['object']['sha'], manifest['baseline']['commit'], 'baseline_commit_drift')
    tag_names = {'dev': 'dev-tag', 'vm-runtime-capability-free': 'vm-cap-tag',
                 'vm-runtime': 'vm-tag', 'v0.1.0-pre.1': 'pre-tag'}
    for record in manifest['releases']:
        row = next(r for r in rows if r['tag_name'] == record['tag'])
        for output, original in (('id', 'id'), ('draft', 'draft'), ('prerelease', 'prerelease'),
                                  ('publishedAt', 'published_at'), ('updatedAt', 'updated_at')):
            proposal.same(record[output], row[original], 'release_metadata_drift')
        proposal.same(record['assets'], [{key: asset[key] for key in ASSET_FIELDS} for asset in row['assets']],
                      'asset_metadata_drift')
        ref = refs[record['tag']]['object']
        base.need(record['tagObjectSha'] == ref['sha'] and record['tagObjectType'] == ref['type'], 'tag_identity')
        commit = responses[tag_names[record['tag']]]['object']['sha'] if ref['type'] == 'tag' else ref['sha']
        base.need(record['commit'] == commit and record['qualified'] is False, 'release_commit_binding')
    proposal.same([{key: asset[key] for key in ASSET_FIELDS} for asset in latest['assets']],
                  manifest['releases'][0]['assets'], 'latest_assets_disagree')
    for tag, name in tag_names.items():
        base.need(responses[name]['sha'] == refs[tag]['object']['sha'] and
                  responses[name]['object']['type'] == 'commit', 'annotated_tag_binding')
    unpublished = manifest['unreleasedVersionedTags'][0]
    base.need(unpublished['tag'] not in {r['tag_name'] for r in rows} and
              unpublished['commit'] == responses['pre-tag']['object']['sha'], 'unreleased_tag_binding')
    for entry in manifest['gitObjects']:
        raw_object = verified_read(evidence_root, entry['file'], entry['bytes'], entry['sha256'], 262144)
        sha = hashlib.sha1(entry['kind'].encode() + b' ' + str(len(raw_object)).encode() + b'\0' + raw_object).hexdigest()
        base.need(sha == entry['gitObject'] == responses[entry['name']]['sha'], 'git_object_drift')
    base.need(source_result['sourceFilesVerified'] == manifest['sourceEvidence']['sourceFileCount'] and
              source_result['sourceBytesVerified'] == manifest['sourceEvidence']['sourceBytes'], 'source_count')
    checked = timestamp(manifest['checkedAt'])
    observation_times = [timestamp(entry['checkedAt']) for entry in manifest['apiEvidence']]
    base.need(checked == max(observation_times) and timestamp(manifest['observedFrom']) == min(observation_times),
              'observation_window')
    now = dt.datetime.now(dt.timezone.utc) if now is None else now
    fresh = fresh_at(manifest, now)
    return {'verdict': NO_CANDIDATE if fresh else BLOCKED,
            'code': 'NO-NEWER-STABLE-RELEASE' if fresh else 'inspection_stale_or_future',
            'snapshotVerified': True, 'fresh': fresh, 'checkedAt': manifest['checkedAt'],
            'expiresAt': manifest['expiresAt'], 'evaluatedAt': now.isoformat(timespec='seconds'),
            'recordedVerdict': NO_CANDIDATE, 'manifestSha256': MANIFEST_SHA256,
            'latestStable': manifest['latestStable'], 'newerStableCount': 0,
            'requirementsAssessed': 16, 'negativeCasesClosed': 35,
            'implementationVerified': False, 'executionSupported': False, 'pilotReady': False,
            'liveAdmissionAllowed': False, 'runtimeEffectivePolicySha256': None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-root', type=pathlib.Path, required=True)
    parser.add_argument('--upstream-root', type=pathlib.Path, required=True)
    parser.add_argument('--manifest', type=pathlib.Path, default=ROOT / 'config/openshell/official-release-inspection.json')
    args = parser.parse_args()
    try:
        result = verify(source.regular_read(args.manifest, proposal.MAX_JSON_BYTES), args.evidence_root, args.upstream_root)
    except (OSError, KeyError, TypeError, ValueError, UnicodeError, StopIteration, base.PolicyError) as error:
        result = {'verdict': BLOCKED, 'snapshotVerified': False, 'fresh': False,
                  'code': str(error) if isinstance(error, base.PolicyError) else 'input_invalid',
                  'implementationVerified': False, 'executionSupported': False, 'pilotReady': False,
                  'liveAdmissionAllowed': False, 'runtimeEffectivePolicySha256': None}
    print(json.dumps(result, sort_keys=True))
    return 2  # No accepted candidate or execution admission in this dated snapshot.


if __name__ == '__main__':
    raise SystemExit(main())
