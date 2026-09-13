"""Offline integrity/freshness review; never publishes or admits execution."""
import argparse
import datetime as dt
import hashlib
import json
import math
import pathlib
import re
from urllib.parse import parse_qs, urlparse

import openshell_upstream_decision as prior

base, source, ROOT, release = prior.base, prior.source, prior.ROOT, prior.release
PACKET = 'config/openshell/upstream-prepublication.json'
PACKET_SHA256 = '2ead74b813afa1cb492ad0364a1512e659e5b1e956586b41c32c13d3722375d8'
HEAD = '5b9daab9351b1e053f9a5e0ce4c899f5d3f674b0'
READY = 'PREPUBLICATION-PACKET-READY'
BLOCKED = 'PREPUBLICATION-INSPECTION-BLOCKED'
NEW_RELEASE = 'PREPUBLICATION-BLOCKED-NEW-RELEASE'
DUPLICATE = 'PREPUBLICATION-DUPLICATE-FOUND'
FLAGS = ('publishAuthorized', 'issueCreateAuthorized', 'commentAuthorized', 'gistAuthorized',
         'prAuthorized', 'messageAuthorized', 'contributionAuthorized', 'forkAuthorized',
         'installAuthorized', 'runtimeAuthorized', 'automationAuthorized', 'implementationVerified',
         'executionSupported', 'pilotReady', 'liveAdmissionAllowed')
MAX_PACKET = 262144
MAX_RESPONSE = 2097152
MAX_TOTAL = 20971520
same = prior.proposal.same


def load_packet(raw):
    base.need(type(raw) is bytes and 0 < len(raw) <= MAX_PACKET, 'packet_size')
    def pairs(rows):
        result = {}
        for key, value in rows:
            base.need(key not in result, 'duplicate_key')
            result[key] = value
        return result
    def reject(_):
        raise base.PolicyError('noninteger_number')
    try:
        packet = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                            parse_float=reject, parse_constant=reject)
    except (ValueError, UnicodeError, RecursionError):
        raise base.PolicyError('json_syntax') from None
    count = 0
    def walk(value, depth):
        nonlocal count
        count += 1
        base.need(count <= 30000 and depth <= 40, 'structure_limit')
        base.need(type(value) in (dict, list, str, int, bool, type(None)), 'json_type')
        if type(value) is dict:
            for key, item in value.items():
                walk(key, depth + 1); walk(item, depth + 1)
        elif type(value) is list:
            for item in value:
                walk(item, depth + 1)
        elif type(value) is str:
            # Public upstream titles may contain Unicode. No control characters,
            # unbounded strings or arbitrary generated text can enter the packet.
            base.need(len(value) <= 4096 and all(c.isprintable() for c in value), 'string_limit')
    walk(packet, 0)
    base.need(type(packet) is dict, 'document_object')
    return packet


def check_authority(packet):
    same(packet['externalActions'], dict.fromkeys(FLAGS, False), 'external_authority')
    same(packet['ownerSelectedOption'], 'A', 'selection_scope')
    same(packet['selectionScope'], 'read-only-prepublication-inspection-and-final-text-only', 'selection_scope')
    same(packet['ownerPublicationDecision'], 'pending', 'owner_authority')
    same(packet['runtimeEffectivePolicySha256'], None, 'runtime_evidence')
    publication = packet['publication']
    for key, expected in {'kind': 'create-exactly-one-issue', 'maximumWrites': 1,
        'destination': 'https://github.com/NVIDIA/OpenShell/issues',
        'appendix': 'inline-in-same-body', 'approvalRequired': True,
        'textChangeRequiresNewApproval': True, 'automaticRetry': False}.items():
        same(publication[key], expected, 'publication_scope')
    same(packet['priorPacketSha256'], prior.PACKET_SHA256, 'prior_binding')
    same(packet['historicalReleaseManifestSha256'], release.MANIFEST_SHA256, 'historical_binding')
    same(packet['proposalBindings'], dict(zip(prior.proposal.FILES, prior.proposal.HASHES)), 'proposal_binding')
    same(packet['channel']['headCommit'], HEAD, 'current_head')
    same(packet['channel']['requiredFields'], list(prior.HEADINGS[:6]), 'template_fields')
    same(packet['channel']['optionalFields'], ['Agent Investigation'], 'template_fields')
    same(packet['channel']['checklist'], [
        {'label': "I've reviewed existing issues and the architecture docs", 'checked': True},
        {'label': 'This is a design proposal, not a "please build this" request', 'checked': True}], 'checklist')
    same(packet['mutableEvidencePolicy'],
         'dated-observation-not-permanent; recheck-before-write; expiry-never-grants-authority', 'mutable_evidence')
    same(packet['nextAction'], 'present-exact-text-to-owner-for-explicit-yes-or-no-publication-decision', 'next_action')


def verdict_at(packet, now):
    checked, expires = release.timestamp(packet['checkedAt']), release.timestamp(packet['expiresAt'])
    start = release.timestamp(packet['observedFrom'])
    base.need(now.tzinfo is not None, 'clock_unknown')
    base.need(expires - checked == dt.timedelta(hours=1) and packet['freshnessSeconds'] == 3600,
              'freshness_contract')
    base.need(dt.timedelta(0) <= checked - start <= dt.timedelta(minutes=15), 'observation_span')
    if packet['releaseCheck']['newerStable']:
        return NEW_RELEASE
    if packet['search']['duplicateIds']:
        return DUPLICATE
    if not checked <= now < expires or not packet['channel']['publicChannelApplicable']:
        return BLOCKED
    return READY


def allowed_url(url):
    u = urlparse(url)
    base.need(u.scheme == 'https' and not u.username and not u.password and
              u.port is None and not u.fragment, 'evidence_url')
    query = parse_qs(u.query)
    if u.netloc == 'raw.githubusercontent.com':
        base.need(u.path.startswith('/NVIDIA/OpenShell/' + HEAD + '/') and not query, 'source_url')
        return
    if (u.netloc, u.path) in (('api.github.com', '/search/issues'), ('github.com', '/search')):
        q = query.get('q', [''])[0]
        base.need(q.startswith('repo:NVIDIA/OpenShell ') and q.count('repo:') == 1, 'query_scope')
        expected = {'q', 'per_page', 'page'} if u.netloc == 'api.github.com' else {'q', 'type'}
        base.need(set(query) == expected and all(len(v) == 1 for v in query.values()), 'query_shape')
        if u.netloc == 'github.com':
            base.need(query['type'] == ['discussions'], 'query_type')
        return
    if u.netloc == 'github.com':
        base.need(re.fullmatch('/NVIDIA/OpenShell/discussions/[0-9]+', u.path) and not query, 'discussion_url')
        return
    base.need(u.netloc == 'api.github.com' and u.path.startswith('/repos/NVIDIA/OpenShell'), 'api_scope')
    tail = u.path.removeprefix('/repos/NVIDIA/OpenShell')
    base.need(re.fullmatch(r'(?:|/releases(?:/latest)?|/git/ref/heads/main|/git/matching-refs/tags/|'
                          r'/git/(?:commits|tags|trees)/[0-9a-f]{40}|/issues/[0-9]+)', tail), 'api_path')
    base.need(set(query) <= {'page', 'per_page', 'recursive'}, 'api_query')


def discussion_search(raw):
    match = re.search(rb'<script type="application/json" data-target="react-app.embeddedData">(.*?)</script>', raw, re.S)
    base.need(match is not None, 'discussion_search_missing')
    data = json.loads(match[1])['payload']['blackbirdSearchRoute']
    base.need(data['type'] == 'discussions' and not data['errors'] and
              data['warn_limited_results'] is False and data['logged_in'] is False, 'discussion_incomplete')
    base.need(data['page_count'] <= 1 and len(data['results']) == data['result_count'], 'discussion_pagination')
    return data


def read_evidence(packet, evidence_root):
    responses, metadata, total = {}, {}, 0
    for entry in packet['evidence']:
        eid = entry['id']
        base.need(re.fullmatch('[a-z0-9-]+', eid) and eid not in responses, 'evidence_id')
        allowed_url(entry['url'])
        raw = source.regular_read(evidence_root / (eid + '.raw'), MAX_RESPONSE)
        total += len(raw); base.need(total <= MAX_TOTAL, 'evidence_total')
        base.need(entry['status'] == 200 and len(raw) == entry['bytes'] and
                  hashlib.sha256(raw).hexdigest() == entry['sha256'], 'evidence_drift')
        meta = load_packet(source.regular_read(evidence_root / (eid + '.meta.json'), 8192))
        same(meta, entry, 'metadata_drift')
        metadata[eid] = meta
        responses[eid] = json.loads(raw) if urlparse(entry['url']).netloc == 'api.github.com' else raw
    times = [e['checkedAt'] for e in packet['evidence']]
    same(min(times), packet['observedFrom'], 'observation_start')
    same(max(times), packet['checkedAt'], 'observation_end')
    return responses, metadata, total


def check_releases(packet, data, metadata, evidence_root):
    result = packet['releaseCheck']
    rows = []
    for i, name in enumerate(result['pages'], 1):
        same(name, 'releases-' + str(i), 'release_page_order')
        release.check_pagination(metadata[name]['link'], i, len(result['pages']))
        base.need(len(data[name]) <= 30, 'release_page_size')
        rows.extend(data[name])
    same(data['latest'], data['latest-final'], 'latest_moved')
    same(data['tag-refs'], data['tag-refs-final'], 'tags_moved')
    classified = release.classify_releases(rows, 'v0.0.116', '2026-08-28T09:10:23Z')
    same(classified['latestStable'], result['latestStable'], 'latest_release')
    same(classified['newerStable'], result['newerStable'], 'new_release')
    same(classified['newerVersioned'], result['newerVersioned'], 'new_versioned_release')
    same(len(rows), result['publicReleaseCount'], 'release_count')
    same(len(classified['prereleases']), result['prereleaseCount'], 'prerelease_count')
    same(len(rows) - len(classified['prereleases']), result['stableCount'], 'stable_count')
    refs = {r['ref'].removeprefix('refs/tags/'): r['object'] for r in data['tag-refs']}
    base.need(len(refs) == len(data['tag-refs']) == result['tagCount'] and not metadata['tag-refs']['link'], 'tag_inventory')
    same(release.unreleased_newer_tags(refs, {r['tag_name'] for r in rows}, 'v0.0.116'),
         result['unreleasedNewerTags'], 'unreleased_tags')
    same(data['latest'], next(r for r in rows if r['tag_name'] == result['latestStable']), 'latest_list_disagreement')
    same(refs[result['latestStable']]['sha'], result['latestStableCommit'], 'release_commit')
    for i, record in enumerate(result['releases']):
        obj = data['release-object-' + str(i)]
        ref = refs[record['tag']]
        same(obj['sha'], ref['sha'], 'release_object_binding')
        same(ref['type'], record['refType'], 'release_ref_type')
        same(ref['sha'], record['refObject'], 'release_ref_object')
        commit = obj['object']['sha'] if ref['type'] == 'tag' else obj['sha']
        same(commit, record['commit'], 'release_resolved_commit')
        if record['publicRelease']:
            row = next(r for r in rows if r['tag_name'] == record['tag'])
            for a, b in (('draft', 'draft'), ('prerelease', 'prerelease'),
                         ('publishedAt', 'published_at'), ('updatedAt', 'updated_at')):
                same(record[a], row[b], 'release_metadata')
            assets = [{k: a[k] for k in release.ASSET_FIELDS} for a in row['assets']]
            same(len(assets), record['assetCount'], 'asset_count')
            same(base.digest(assets), record['assetMetadataSha256'], 'asset_metadata')
        else:
            base.need(record['tag'] not in {r['tag_name'] for r in rows}, 'tag_only')
        same(record['qualified'], False, 'release_qualification')
    for obj in packet['gitObjects']:
        raw = source.regular_read(source.relative_source(evidence_root, obj['file']), 262144)
        base.need(len(raw) == obj['bytes'] and hashlib.sha256(raw).hexdigest() == obj['sha256'], 'git_bytes')
        actual = hashlib.sha1(obj['kind'].encode() + b' ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        same(actual, obj['gitObject'], 'git_hash')
        same(actual, data[obj['responseId']]['sha'], 'fresh_object_binding')


def check_sources(packet, data):
    same(data['head-ref'], data['head-ref-final'], 'head_moved')
    same(data['repo']['default_branch'], 'main', 'default_branch')
    same(data['repo']['full_name'], 'NVIDIA/OpenShell', 'repository_identity')
    same(data['head-ref']['object']['sha'], HEAD, 'head_ref')
    same(data['head-commit']['sha'], HEAD, 'head_commit')
    same(data['head-tree']['sha'], data['head-commit']['tree']['sha'], 'head_tree')
    same(data['head-tree']['sha'], packet['channel']['tree'], 'packet_tree')
    same(data['head-tree']['truncated'], False, 'tree_truncated')
    tree = {r['path']: r for r in data['head-tree']['tree']}
    for entry in packet['sourceFiles']:
        blob = tree[entry['path']]
        base.need(blob['type'] == 'blob' and blob['mode'] in ('100644', '100755'), 'source_type')
        same(blob['sha'], entry['gitBlob'], 'tree_blob')
        source.verify_blob(data[entry['evidenceId']], entry)
    template = data[packet['channel']['templateSourceId']].decode('utf-8')
    same(re.findall(r'^      label: (.+)$', template, re.M), list(prior.HEADINGS), 'current_template_fields')
    same(re.findall(r'^        - label: (.+)$', template, re.M),
         [r['label'] for r in packet['channel']['checklist']], 'current_template_checkboxes')
    base.need('type: Feature\n' in template and
              b'blank_issues_enabled: false' in data[packet['channel']['configSourceId']], 'current_feature_channel')


def check_search(packet, data, metadata):
    issue_ids, discussion_ids = set(), set()
    for query in packet['search']['queries']:
        found = []
        for page, eid in enumerate(query['pages'], 1):
            params = parse_qs(urlparse(metadata[eid]['url']).query)
            same(params['q'], [query['query']], 'search_query_binding')
            if query['kind'] == 'issues-pr':
                result = data[eid]
                same(result['incomplete_results'], False, 'search_incomplete')
                same(result['total_count'], query['totalCount'], 'search_total')
                per_page = int(params['per_page'][0])
                base.need(per_page in (30, 100) and len(query['pages']) <= 5, 'search_bound')
                same(int(params['page'][0]), page, 'search_page')
                same(len(query['pages']), max(1, math.ceil(query['totalCount'] / per_page)), 'search_pages')
                has_next = 'rel="next"' in (metadata[eid]['link'] or '')
                same(has_next, page < len(query['pages']), 'search_next_link')
                found.extend('I' + str(x['number']) for x in result['items'])
            else:
                result = discussion_search(data[eid])
                same(result['result_count'], query['totalCount'], 'discussion_total')
                found.extend('D' + str(x['number']) for x in result['results'])
        base.need(len(found) == len(set(found)) == query['totalCount'], 'search_closure')
        (issue_ids if query['kind'] == 'issues-pr' else discussion_ids).update(found)
    for eid, result in data.items():
        if re.fullmatch(r'item-[0-9]+', eid):
            issue_ids.add('I' + str(result['number']))
    candidates = packet['search']['candidates']
    ids = [x['id'] for x in candidates]
    base.need(len(ids) == len(set(ids)) == packet['search']['candidateCount'], 'candidate_coverage')
    for row in candidates:
        result = data[row['evidenceId']]
        if row['kind'] == 'discussion':
            result = next(x for x in discussion_search(result)['results'] if x['number'] == row['number'])
            same(row['url'], 'https://github.com' + result['url'], 'discussion_identity')
            for a, b in (('title', 'title'), ('createdAt', 'created'), ('updatedAt', 'updated')):
                same(row[a], result[b], 'discussion_metadata')
            detail = data[row['detailEvidenceId']].decode('utf-8')
            if row['state'] == 'closed-as-resolved':
                base.need('title="Status: Closed as resolved"' in detail, 'discussion_state')
            elif row['state'] == 'unanswered':
                base.need('title="Unanswered"' in detail, 'discussion_state')
            else:
                same(row['state'], None, 'unknown_discussion_state')
            base.need(re.search(r'Labels\s*</div>\s*<div[^>]*>\s*None yet', detail), 'discussion_labels')
        else:
            if 'items' in result:
                result = next(x for x in result['items'] if x['number'] == row['number'])
            for a, b in (('title', 'title'), ('state', 'state'), ('url', 'html_url'),
                         ('createdAt', 'created_at'), ('updatedAt', 'updated_at')):
                same(row[a], result[b], 'candidate_metadata')
            same(row['labels'], [x['name'] for x in result['labels']], 'candidate_labels')
            same(row['kind'], 'pull-request' if 'pull_request' in result else 'issue', 'candidate_type')
        base.need(row['classification'] in ('DUPLICATE', 'RELATED', 'NOT-A-DUPLICATE') and
                  len(row['reason']) >= 30, 'candidate_disposition')
    expected_duplicates = [r['id'] for r in candidates if r['classification'] == 'DUPLICATE']
    same(packet['search']['duplicateIds'], expected_duplicates, 'duplicate_closure')
    for actual, key, prefix in ((issue_ids, 'screenedOutIssueIds', 'I'),
                                (discussion_ids, 'screenedOutDiscussionIds', 'D')):
        selected = {x for x in ids if x.startswith(prefix)}
        excluded = packet['search'][key]
        base.need(len(excluded) == len(set(excluded)) and not selected.intersection(excluded) and
                  selected.union(excluded) == actual, 'screening_closure')


def verify_text(packet, repository=ROOT):
    publication = packet['publication']
    raw = prior.normalized_text(source.regular_read(source.relative_source(repository, publication['bodyFile']), 32768))
    first, body = raw.decode('ascii').split('\n\n', 1)
    title = first.removeprefix('# ')
    same(title, publication['title'], 'title_drift')
    for text, field in ((title, 'title'), (body, 'body')):
        same(hashlib.sha256(text.encode()).hexdigest(), publication[field + 'Sha256'], 'text_hash')
        same(len(text.encode()), publication[field + 'Bytes'], 'text_bytes')
    same(len(body.split()), publication['bodyWords'], 'word_count')
    same(hashlib.sha256(raw).hexdigest(), publication['fileSha256'], 'file_hash')
    same(len(raw), publication['fileBytes'], 'file_bytes')
    same(base.digest({'title': title, 'body': body}), publication['payloadSha256'], 'payload_hash')
    # The exact code-owned packet/text hashes are primary privacy protection.
    base.need(not re.search(r'(?i)\broost\b|RF-HOST-\d+|\b[a-z]:[/\\]|/(?:users|home)/|'
                           r'\b(?:ghp_|github_pat_|sk-proj-)[\w-]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|'
                           r'-----BEGIN .*PRIVATE KEY', body), 'public_private_data')
    for url in re.findall(r'https?://[^\s)]+', body):
        base.need(url.startswith('https://github.com/NVIDIA/OpenShell/'), 'public_url')
    same(re.findall(r'^## (.+)$', body, re.M), list(prior.HEADINGS), 'body_template')
    for row in packet['channel']['checklist']:
        base.need('- [x] ' + row['label'] in body, 'body_checklist')
    return title, body


def verify(raw, evidence_root, repository=ROOT, now=None):
    packet = load_packet(raw)
    check_authority(packet)
    base.need(base.digest(packet) == PACKET_SHA256, 'packet_drift')
    verify_text(packet, repository)
    prior.verify_documents(source.regular_read(repository / prior.PACKET, prior.proposal.MAX_JSON_BYTES), repository)
    data, metadata, total = read_evidence(packet, evidence_root)
    check_releases(packet, data, metadata, evidence_root)
    check_sources(packet, data)
    check_search(packet, data, metadata)
    now = dt.datetime.now(dt.timezone.utc) if now is None else now
    verdict = verdict_at(packet, now)
    return {'verdict': verdict, 'packetVerified': True, 'scope': 'owner-approval-material-only',
            'fresh': verdict == READY, 'checkedAt': packet['checkedAt'], 'expiresAt': packet['expiresAt'],
            'packetSha256': PACKET_SHA256, 'payloadSha256': packet['publication']['payloadSha256'],
            'duplicateVerdict': packet['search']['verdict'], 'queries': len(packet['search']['queries']),
            'candidates': len(packet['search']['candidates']), 'evidenceRecords': len(metadata),
            'evidenceBytes': total, 'sourceFiles': len(packet['sourceFiles']),
            'latestStable': packet['releaseCheck']['latestStable'], 'currentHead': HEAD,
            'externalActions': dict.fromkeys(FLAGS, False), 'runtimeEffectivePolicySha256': None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-root', type=pathlib.Path, required=True)
    args = parser.parse_args()
    try:
        result = verify(source.regular_read(ROOT / PACKET, MAX_PACKET), args.evidence_root)
    except (OSError, ValueError, KeyError, TypeError, StopIteration, UnicodeError) as error:
        result = {'verdict': BLOCKED, 'packetVerified': False,
                  'code': str(error) if isinstance(error, base.PolicyError) else 'input_invalid',
                  'externalActions': dict.fromkeys(FLAGS, False), 'runtimeEffectivePolicySha256': None}
    print(json.dumps(result, sort_keys=True))
    return 0 if result['verdict'] == READY else 2


if __name__ == '__main__':
    raise SystemExit(main())
