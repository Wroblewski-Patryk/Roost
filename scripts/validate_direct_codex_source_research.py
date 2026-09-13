"""Validate RF010's incomplete-research disposition; no network or installation I/O."""
import copy
import json
import re
import sys

from validate_direct_codex_artifact_preflight import shape, safe_values
from validate_direct_codex_qualification import BASE, PROFILE, SCHEMA, load, need, validate_profile

OBSERVATION = BASE / 'direct-codex-official-source-research-v1.json'
REPORT = BASE / 'direct-codex-official-source-research-v1.md'
ATTEMPTED_URLS = [
    'https://learn.chatgpt.com/docs/app-server.md',
    'https://api.github.com/repos/openai/codex/readme',
    'https://api.github.com/repos/openai/codex/releases/latest',
]


def validate_observation(value):
    shape(value, 'schemaId taskId observedDate verdict reason researchComplete candidate sourceEvidenceRetained publisherEvidenceAbsent network acquisitionProposal schemaRoute desktopComparison gates actions docker nextTask')
    network = value['network']
    shape(network, 'budget initialRequestCount actualRequestCount actualResponseBytes redirectCount budgetComplianceVerified redirectBodiesMetered requestsAfterCaptureFailure budgetReset attemptedUrls')
    need(network['attemptedUrls'] == ATTEMPTED_URLS, 'endpoint_scope')
    sanitized = copy.deepcopy(value)
    sanitized['network']['attemptedUrls'] = []
    safe_values(sanitized)
    need(value['schemaId'] == 'roost-codex-official-source-research-v1' and value['taskId'] == 'RF-HERMES-010', 'identity')
    need(value['observedDate'] == '2026-09-13', 'date')
    need(value['verdict'] == 'OFFICIAL-CODEX-SOURCE-BLOCKED' and value['reason'] == 'metadata_receipt_capture_failed', 'false_source_result')
    need(value['researchComplete'] is False and value['sourceEvidenceRetained'] is False, 'false_evidence')
    for key in ('candidate','publisherEvidenceAbsent','acquisitionProposal','schemaRoute'):
        need(value[key] is None, 'invented_source_claim')
    shape(network['budget'], 'maxRequests maxResponseBytes maxTotalBytes requestTimeoutSeconds')
    need(network['budget'] == {'maxRequests':32,'maxResponseBytes':524288,'maxTotalBytes':6291456,'requestTimeoutSeconds':20}, 'budget_changed')
    need(type(network['initialRequestCount']) is int and network['initialRequestCount'] == 3, 'initial_requests')
    for key in ('actualRequestCount','actualResponseBytes','redirectCount'):
        need(network[key] is None, 'invented_accounting')
    for key in ('budgetComplianceVerified','redirectBodiesMetered','budgetReset'):
        need(network[key] is False, 'false_budget_claim')
    need(type(network['requestsAfterCaptureFailure']) is int and network['requestsAfterCaptureFailure'] == 0, 'requests_after_failure')
    desktop = value['desktopComparison']
    shape(desktop, 'platformFamily size sha256 codexVersion releaseCandidateMatches')
    prior = load(BASE / 'direct-codex-artifact-preflight-v1.json')['candidate']
    for key in ('platformFamily','size','sha256','codexVersion'):
        need(desktop[key] == prior[key], 'desktop_observation_drift')
    need(desktop['releaseCandidateMatches'] is None, 'invented_comparison')
    shape(value['gates'], 'acquisitionReady implementationReady executionSupported pilotReady liveAdmissionAllowed')
    need(all(v is False for v in value['gates'].values()), 'activation')
    shape(value['actions'], 'payloadDownloads candidateExecutions authReads componentChanges privateReceiptsWritten')
    need(all(type(v) is int and v == 0 for v in value['actions'].values()), 'forbidden_action')
    shape(value['docker'], 'containers networks volumes images unchanged')
    need(value['docker'] == {'containers':4,'networks':5,'volumes':107,'images':16,'unchanged':True}, 'docker_continuity')
    need(value['nextTask'] == 'RF-HERMES-011', 'next_task')


def main():
    value = load(OBSERVATION)
    validate_observation(value)
    validate_profile(load(PROFILE), load(SCHEMA))
    report = REPORT.read_text(encoding='utf-8')
    need(len(report.encode()) < 32768, 'report_bound')
    need(value['reason'] in report and value['verdict'] in report, 'report_binding')
    need('unknown' in report and 'not a finding that OpenAI lacks' in report, 'uncertainty')
    need(not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/|BEGIN .*PRIVATE KEY)', report), 'privacy')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', report):
        if '://' in target:
            need(target in ATTEMPTED_URLS, 'remote_link_scope')
        else:
            dest = (REPORT.parent / target).resolve()
            need(dest.name != 'design-qa.md' and dest.is_relative_to(BASE.parent.parent) and dest.is_file(), 'local_link_scope')
    need(report.count('Exactly one recommended next atomic task:') == 1 and '**RF-HERMES-011' in report, 'report_next_task')
    return {'result':'PASS','scope':'incomplete_research_disposition_only','researchComplete':False,
            'sourceSelected':False,'actualNetworkTotalsKnown':False,'runtimeQualified':False}


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except (ValueError, KeyError, TypeError, OSError, RecursionError):
        print(json.dumps({'result':'FAIL','scope':'incomplete_research_disposition_only'}))
        sys.exit(1)
