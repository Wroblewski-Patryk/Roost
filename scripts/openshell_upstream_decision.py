"""Verify a local owner decision packet; no network, publication or runtime."""
import argparse
import hashlib
import json
import pathlib
import re

import openshell_nonwriting_proposal as proposal
import openshell_release_inspection as release

base, source, ROOT = proposal.base, proposal.source, proposal.ROOT
PACKET = 'config/openshell/upstream-owner-decision.json'
PACKET_SHA256 = 'ff0a22dba5855c61c1a1bf5d4e17a3d0fe3d49ed92a2c748fdbc4bb7a466137e'
READY = 'OWNER-UPSTREAM-DECISION-PACKET-READY'
BLOCKED = 'OWNER-UPSTREAM-DECISION-PACKET-BLOCKED'
FLAGS = ('networkAuthorized', 'publicationAuthorized', 'externalWriteAuthorized',
         'contributionAuthorized', 'forkAuthorized', 'installAuthorized',
         'runtimeAuthorized', 'automationAuthorized', 'implementationVerified',
         'executionSupported', 'pilotReady', 'liveAdmissionAllowed')
TRADEOFFS = ('agentHookupTiming', 'tokenAndMaintenanceCost', 'securityRisk',
            'maintainerDependence', 'reversibility')
CHECKS = ('fresh-release-evidence', 'current-channel-template', 'duplicates',
          'privacy', 'owner-exact-text', 'single-external-write')
HEADINGS = ('User Story', 'Problem Statement', 'Impact / Why This Matters',
            'Proposed Design', 'Acceptance Criteria', 'Alternatives Considered',
            'Agent Investigation', 'Checklist')
GROUPS = (
    (('negotiation', 'compatibility'), ('profile_missing', 'profile_unknown', 'unsupported_host')),
    (('root', 'mounts'), ('root_unset', 'root_false', 'child_root_rw', 'implicit_rw_mount',
                        'image_volume', 'user_mount', 'tmp_writable', 'sandbox_writable')),
    (('workspace', 'command'), ('cwd_fallback', 'workspace_probe', 'shell_entrypoint', 'secondary_exec')),
    (('artifact',), ('mutable_tag', 'digest_platform_mismatch', 'fixture_absent',
                    'fixture_hash_drift', 'fixture_symlink', 'fixture_hardlink', 'fixture_device')),
    (('isolation', 'network', 'descriptors', 'supervisor-state'), ('gpu_device', 'network_grant',
      'inherited_socket', 'inherited_token', 'inherited_fd', 'supervisor_state_visible', 'control_escape')),
    (('policy', 'receipt', 'evidence'), ('policy_merge', 'policy_fallback', 'forged_receipt', 'post_seal_change')),
    (('lifecycle', 'limits'), ('retained_restart', 'unbounded_resources')),
)


def normalized_text(raw):
    base.need(type(raw) is bytes and 0 < len(raw) <= 32768, 'text_size')
    raw = raw.replace(b'\r\n', b'\n')
    base.need(raw.isascii() and raw.endswith(b'\n') and
              all(c == 10 or 32 <= c < 127 for c in raw), 'text_encoding')
    return raw


def public_privacy(text):
    # Exact document pins remain the primary control; this is an additional
    # narrowly scoped public-text check, not a general secret detector.
    forbidden = (r'(?i)\broost\b', r'RF-HOST-\d+',
                 r'(?i)\b[a-z]:[/\\]', r'(?i)/(users|home)/', r'\\\\',
                 r'(?i)\b(?:sk-|ghp_|github_pat_)[a-z0-9_-]+',
                 r'-----BEGIN .*PRIVATE KEY', r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}',
                 r'(?i)(?:password|api[_-]?key|access[_-]?token)\s*[:=]\s*\S+')
    base.need(not any(re.search(pattern, text) for pattern in forbidden), 'public_private_data')
    for url in re.findall(r'https?://[^\s)]+', text):
        base.need(url.startswith('https://github.com/NVIDIA/OpenShell/blob/' +
                                 source.UPSTREAM_COMMIT + '/'), 'public_url')


def check_semantics(packet):
    proposal.same(packet['actions'], dict.fromkeys(FLAGS, False), 'authority_expansion')
    proposal.same(packet['ownerDecision'], 'pending', 'owner_authority')
    proposal.same(packet['selectedOption'], None, 'owner_authority')
    proposal.same(packet['runtimeEffectivePolicySha256'], None, 'runtime_evidence')
    proposal.same(packet['recommendedOption'], 'A', 'recommendation')
    proposal.same([o['id'] for o in packet['options']], ['A', 'B', 'C'], 'option_coverage')
    for option in packet['options']:
        base.need(set(option) == set(('id', 'recommended', 'decision', *TRADEOFFS)), 'option_fields')
        proposal.same(option['recommended'], option['id'] == 'A', 'recommendation')
        for field in ('decision', *TRADEOFFS):
            base.need(type(option[field]) is str and 20 <= len(option[field]) <= 1024, 'tradeoff_missing')
    historical = packet['historicalEvidence']
    proposal.same(historical['use'], 'historical-only', 'freshness_expansion')
    proposal.same(historical['freshnessClaim'], False, 'freshness_expansion')
    proposal.same(historical['refreshRequiredBeforePublication'], True, 'freshness_expansion')
    proposal.same(historical['requirements'], {'PASS': 0, 'BLOCKED': 11, 'UNPROVEN': 5}, 'historical_drift')
    proposal.same(historical['negativeCases'], {'UNPROVEN': 35, 'executed': False}, 'historical_drift')
    proposal.same([c['id'] for c in packet['prepublicationChecklist']], list(CHECKS), 'checklist_coverage')
    for check in packet['prepublicationChecklist']:
        proposal.same(check['status'], 'pending', 'checklist_authority')
    proposal.same(packet['futureExternalWrite'], {'maximum': 1, 'kind': 'issue-create-only',
        'appendix': 'inline-in-same-issue', 'authorized': False, 'automaticRetry': False}, 'external_authority')
    proposal.same(packet['nextAction'], 'present-options-to-owner-only', 'next_action')
    proposal.same(packet['upstreamCommit'], source.UPSTREAM_COMMIT, 'upstream_drift')
    proposal.same(packet['proposalBindings'], dict(zip(proposal.FILES, proposal.HASHES)), 'proposal_drift')
    base.need(len(packet['concerns']) == 7, 'concern_coverage')
    requirements, negatives = [], []
    for index, (row, (reqs, cases)) in enumerate(zip(packet['concerns'], GROUPS), 1):
        proposal.same(row['id'], index, 'concern_order')
        proposal.same(row['requirements'], list(reqs), 'concern_requirements')
        proposal.same(row['negativeCases'], list(cases), 'concern_cases')
        requirements.extend(reqs); negatives.extend(cases)
    base.need(len(requirements) == len(set(requirements)) == 16 and
              set(requirements) == proposal.REQUIREMENTS, 'requirement_coverage')
    base.need(len(negatives) == len(set(negatives)) == 35 and
              set(negatives) == proposal.NEGATIVES, 'negative_coverage')
    governance = packet['governance']
    for flag in ('currentOnlinePolicyVerified', 'contributionRightsApproved', 'vouchEligibilityVerified'):
        proposal.same(governance[flag], False, 'governance_authority')


def verify_documents(raw, repository=ROOT):
    packet = proposal.load_document(raw)
    check_semantics(packet)
    # Code-owned identity also closes unknown fields and pins all prose/options;
    # a caller cannot bless changed wording by changing its document hashes.
    base.need(base.digest(packet) == PACKET_SHA256, 'packet_drift')
    texts = {}
    for entry in packet['documents']:
        content = normalized_text(source.regular_read(source.relative_source(repository, entry['path']), 32768))
        base.need(len(content) == entry['bytes'] and hashlib.sha256(content).hexdigest() ==
                  entry['sha256'], 'document_drift')
        texts[entry['role']] = content.decode('ascii')
    for role in ('issue', 'appendix'):
        public_privacy(texts[role])
    issue = texts['issue']
    proposal.same(issue.splitlines()[0], '# ' + packet['title'], 'issue_title')
    proposal.same(re.findall(r'^## (.+)$', issue, re.M), list(HEADINGS), 'issue_template')
    proposal.same(re.findall(r'^## (.+)$', texts['appendix'], re.M),
                  [str(row['id']) + '. ' + row['heading'] for row in packet['concerns']], 'appendix_sections')
    documents = [source.regular_read(repository / 'config/openshell' / name,
                                    proposal.MAX_JSON_BYTES) for name in proposal.FILES]
    proposal.verify_documents(documents, repository)
    snapshot = release.verify_manifest(source.regular_read(repository /
        'config/openshell/official-release-inspection.json', proposal.MAX_JSON_BYTES))
    historical = packet['historicalEvidence']
    for field in ('checkedAt', 'expiresAt', 'reason'):
        proposal.same(historical[field], snapshot[field], 'historical_binding')
    proposal.same(historical['recordedVerdict'], snapshot['verdict'], 'historical_binding')
    proposal.same(historical['manifestSha256'], release.MANIFEST_SHA256, 'historical_binding')
    # Deliberately no current-clock freshness promotion; this packet always uses
    # the exact RF044 manifest as history. Publication requires new evidence.
    return packet, documents


def verify(raw, upstream_root, repository=ROOT):
    packet, documents = verify_documents(raw, repository)
    findings = proposal.verify(documents, upstream_root, repository)
    governance = packet['governance']['sourceFiles']
    count_bytes = source.verify_sources(upstream_root, governance)
    return {'verdict': READY, 'scope': 'owner-decision-material-only',
            'packetSha256': PACKET_SHA256, 'recommendedOption': 'A', 'ownerDecision': 'pending',
            'options': 3, 'concerns': 7, 'requirements': 16, 'negativeCases': 35,
            'historicalEvidenceOnly': True, 'recordedVerdict': release.NO_CANDIDATE,
            'sourceFilesVerified': findings['sourceFilesVerified'],
            'sourceBytesVerified': findings['sourceBytesVerified'],
            'governanceFilesVerified': len(governance), 'governanceBytesVerified': count_bytes,
            'actions': dict.fromkeys(FLAGS, False), 'runtimeEffectivePolicySha256': None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upstream-root', type=pathlib.Path, required=True)
    args = parser.parse_args()
    try:
        result = verify(source.regular_read(ROOT / PACKET, proposal.MAX_JSON_BYTES), args.upstream_root)
        code = 0
    except (OSError, UnicodeError, KeyError, TypeError, ValueError, base.PolicyError) as error:
        result = {'verdict': BLOCKED, 'code': str(error) if isinstance(error, base.PolicyError) else 'input_invalid',
                  'actions': dict.fromkeys(FLAGS, False), 'runtimeEffectivePolicySha256': None}
        code = 2
    print(json.dumps(result, sort_keys=True))
    return code


if __name__ == '__main__':
    raise SystemExit(main())
