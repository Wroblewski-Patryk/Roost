"""Offline RF011 consistency checks; no network or cryptographic trust verification."""
import base64
import json
import re
import sys
from codex_metadata_capture import BUDGET, allowed
from validate_direct_codex_artifact_preflight import shape
from validate_direct_codex_qualification import BASE, PROFILE, SCHEMA, load, need, validate_profile

OBSERVATION = BASE / 'direct-codex-official-source-research-v1.json'
REPORT = BASE / 'direct-codex-official-source-research-v1.md'
LEDGER = BASE / 'codex-source-metadata-ledger-v1.json'
VERSION = '0.154.0-linux-x64'
COMMIT = '6b9826e3aa83b1a5947db50f4332cb9c65f1b340'
TAG_OBJECT = '36eab01061df3cde5f95ec20a526777b430091ba'
PACKAGE_SHA512 = '6b8148dc0f2c1adc06aceaa5b6b3dbad2da16a3ac7406e7dd44c2645f891a0b31bd74571741b54196e20bba20955810d898180ee4dcfe239511c4a02654fecf5'
URLS = [
    'https://raw.githubusercontent.com/openai/codex/main/README.md',
    'https://github.com/openai/codex/releases/latest',
    'https://raw.githubusercontent.com/openai/codex/rust-v0.154.0/.github/workflows/rust-release.yml',
    'https://api.github.com/repos/openai/codex/git/ref/tags/rust-v0.154.0',
    'https://registry.npmjs.org/@openai/codex/0.154.0',
    'https://api.github.com/repos/openai/codex/git/tags/' + TAG_OBJECT,
    'https://registry.npmjs.org/@openai/codex/' + VERSION,
    'https://raw.githubusercontent.com/openai/codex/e5e098f0/codex-rs/app-server/README.md',
    'https://raw.githubusercontent.com/openai/codex/' + COMMIT + '/codex-rs/app-server/README.md',
    'https://registry.npmjs.org/-/npm/v1/attestations/@openai%2fcodex@' + VERSION,
    'https://learn.chatgpt.com/docs/app-server.md',
]


def validate_ledger(ledger):
    shape(ledger, 'schemaId taskId budget requests halted closed closureReason')
    need(ledger['schemaId'] == 'roost-codex-source-metadata-ledger-v1' and ledger['taskId'] == 'RF-HERMES-011', 'ledger_identity')
    need(ledger['budget'] == BUDGET and ledger['closed'] is True and ledger['halted'] is False, 'ledger_budget')
    need(ledger['closureReason'] == 'research_blockers_established', 'ledger_closure')
    rows = ledger['requests']
    need(len(rows) == 11 and len(rows) <= BUDGET['maxRequests'], 'request_count')
    need([r['url'] for r in rows] == URLS, 'endpoint_scope')
    sizes = [3334,0,64917,343,3521,655,3372,14,14,14643,99470]
    for index, row in enumerate(rows, 1):
        shape(row, 'ordinal url method category readAt status redirectCount redirectTo redirectTargetAllowed contentLength bytesRead sha256 readInFlightMax outcome limitResult complete elapsedMillis')
        need(row['ordinal'] == index and allowed(row['url']), 'request_identity')
        status = 302 if index == 2 else 404 if index in (8,9) else 200
        need(row['status'] == status and row['method'] == ('HEAD' if index == 2 else 'GET'), 'http_result')
        need(type(row['bytesRead']) is int and row['bytesRead'] == sizes[index-1] <= BUDGET['maxResponseBytes'], 'body_accounting')
        need(row['contentLength'] in (None,row['bytesRead']), 'content_length')
        need(row['complete'] is True and row['readInFlightMax'] == 0 and row['limitResult'] == 'within_limit', 'unfinished_request')
        need(row['outcome'] == ('redirect' if status == 302 else 'http_error' if status == 404 else 'complete'), 'request_outcome')
        need(type(row['elapsedMillis']) is int and 0 <= row['elapsedMillis'] < BUDGET['requestTimeoutSeconds']*1000, 'request_duration')
        need(bool(re.fullmatch(r'[0-9a-f]{64}',row['sha256'])) and row['readAt'].startswith('2026-09-13T'), 'receipt_format')
        need(row['redirectCount'] == int(index == 2), 'redirect_accounting')
        if index == 2:
            need(row['redirectTo'] == 'https://github.com/openai/codex/releases/tag/rust-v0.154.0' and row['redirectTargetAllowed'] is True, 'redirect_scope')
        else:
            need(row['redirectTo'] is None and row['redirectTargetAllowed'] is None, 'unexpected_redirect')
    need(sum(r['bytesRead'] for r in rows) == 190283 <= BUDGET['maxTotalBytes'], 'total_bytes')


def validate_observation(value, ledger=None):
    validate_ledger(load(LEDGER) if ledger is None else ledger)
    shape(value, 'schemaId revision taskId originalTaskId observedDate verdict reason researchComplete priorAttempt network evidenceRequestOrdinals discoveryRequestOrdinal discardedRequestOrdinals candidate sourceIdentity trust packageBehavior schema acquisitionProposal desktopComparison blockers gates actions docker nextTask')
    need(value['schemaId'] == 'roost-codex-official-source-research-v1' and value['revision'] == 2 and value['taskId'] == 'RF-HERMES-011' and value['originalTaskId'] == 'RF-HERMES-010', 'identity')
    need(value['observedDate'] == '2026-09-13' and value['researchComplete'] is True, 'research_disposition')
    need(value['verdict'] == 'OFFICIAL-CODEX-SOURCE-BLOCKED' and value['reason'] == 'publisher_member_identity_and_trust_unverified', 'false_qualification')
    need(value['priorAttempt'] == {'taskId':'RF-HERMES-010','reason':'metadata_receipt_capture_failed','accountingRecovered':False}, 'prior_accounting')
    need(value['network'] == {'ledgerRef':LEDGER.name,'requests':11,'bytesRead':190283,'redirectResponses':1,'httpErrors':2,'transportErrors':0,'overLimitResponses':0,'retries':0,'budgetComplianceVerified':True,'closed':True}, 'network_summary')
    need(value['evidenceRequestOrdinals'] == [1,3,4,5,6,7,10,11] and value['discoveryRequestOrdinal'] == 2 and value['discardedRequestOrdinals'] == [8,9], 'evidence_selection')
    c = value['candidate']
    shape(c, 'channel packageName packageVersion codexReleaseVersion platformFamily assetName metadataUrl payloadUrl integrity packageSha512 legacyShasum compressedSize unpackedSize fileCount nativeExecutableSha256 nativeExecutableSize localArtifactVerified')
    need(c['channel'] == 'official-npm-platform-package' and c['packageName'] == '@openai/codex' and c['packageVersion'] == VERSION and c['codexReleaseVersion'] == '0.154.0' and c['platformFamily'] == 'linux-x86_64', 'candidate_identity')
    need(c['metadataUrl'] == URLS[6] and c['assetName'] == 'codex-'+VERSION+'.tgz' and c['payloadUrl'] == 'https://registry.npmjs.org/@openai/codex/-/'+c['assetName'], 'candidate_url')
    need(c['integrity'].startswith('sha512-') and base64.b64decode(c['integrity'][7:],validate=True).hex() == c['packageSha512'] == PACKAGE_SHA512, 'package_integrity')
    need(c['legacyShasum'] == '9e93bbf0906338c2d1ebbeb9de3b0a4ef7123e55' and c['unpackedSize'] == 339130586 and c['fileCount'] == 8, 'package_metadata')
    need(all(c[k] is None for k in ('compressedSize','nativeExecutableSha256','nativeExecutableSize')) and c['localArtifactVerified'] is False, 'invented_native_pin')
    need(value['sourceIdentity'] == {'tag':'rust-v0.154.0','tagObjectSha':TAG_OBJECT,'commitSha':COMMIT,'tagVerified':False,'tagVerificationReason':'unsigned','githubReleaseId':None,'releaseIdRequiredForChosenRegistryChannel':False}, 'source_identity')
    t = value['trust']
    shape(t, 'registrySignatureCount registrySignatureKeyId registrySignatureVerified attestationUrl attestationCount publishStatementPresent slsaProvenancePresent subjectDigestMatchesIntegrity declaredSourceCommitMatchesTag workflowPath certificateMaterialPresent transparencyMaterialPresent timestampMaterialPresent signatureChainVerified publishStatementSha256 provenanceStatementSha256 sbom publisherNativeMemberManifest subjectName subjectSha512 declaredSourceCommit')
    need(t['registrySignatureCount'] == 2 and t['attestationCount'] == 2 and t['attestationUrl'] == URLS[9], 'attestation_metadata')
    need(t['registrySignatureKeyId'] == 'SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U' and t['workflowPath'] == '.github/workflows/rust-release.yml', 'publisher_metadata')
    need(t['registrySignatureVerified'] is False and t['signatureChainVerified'] is False, 'unverified_trust')
    need(all(t[k] is True for k in ('publishStatementPresent','slsaProvenancePresent','subjectDigestMatchesIntegrity','declaredSourceCommitMatchesTag','certificateMaterialPresent','transparencyMaterialPresent','timestampMaterialPresent')), 'published_claims')
    need(t['subjectName'] == 'pkg:npm/%40openai/codex@'+VERSION and t['subjectSha512'] == c['packageSha512'] and t['declaredSourceCommit'] == value['sourceIdentity']['commitSha'], 'claim_consistency')
    need(t['publishStatementSha256'] == '9aea1394cf1bb3c3c6a643489c9f3ea073d6a7a3855ca6b7d17d1e23c0d25fb1' and t['provenanceStatementSha256'] == '575c0f1640330bcca139d937f9479b60027681f5608112791215ab3084e193b8', 'statement_receipt')
    need(t['sbom'] == t['publisherNativeMemberManifest'] == 'NOT_ESTABLISHED', 'publisher_gap')
    need(value['packageBehavior'] == {'rootPackageRequiresNodeWrapper':True,'rootPackagePlatformAliasObserved':True,'platformPackageBin':None,'platformPackageScripts':None,'platformPackageDependencies':None,'platformPackageOptionalDependencies':None,'lifecycleExecutionAllowed':False,'payloadContentsInspected':False}, 'package_behavior')
    need(value['schema'] == {'route':'PINNED_GENERATOR_CANDIDATE','documentationUrl':URLS[10],'defaultStdioDocumented':True,'jsonSchemaGeneratorDocumented':True,'typescriptGeneratorDocumented':True,'exactBuildSupportVerified':False,'publisherBundle':'NOT_ESTABLISHED','generated':False}, 'schema_candidate_only')
    need(value['acquisitionProposal'] == {'authorized':False,'hostAllowlist':['registry.npmjs.org'],'payloadPath':'/@openai/codex/-/'+c['assetName'],'maxDownloadBytes':339130586,'maxUnpackedBytes':339130586,'maxRegularFiles':8,'maxMetadataBytes':65536,'peakCandidateBytes':2*339130586+65536,'maxRetries':0,'maxDurationSeconds':None,'maxDepth':None,'minFreeReserveBytes':None,'installationRef':None,'limitsAreProvisional':True}, 'acquisition_not_authorized')
    prior = load(BASE / 'direct-codex-artifact-preflight-v1.json')['candidate']
    need(value['desktopComparison'] == {'platformComparable':True,'desktopCodexVersion':prior['codexVersion'],'desktopSize':prior['size'],'desktopSha256':prior['sha256'],'sameNativeArtifact':None,'reason':'archive_integrity_is_not_native_executable_identity'}, 'desktop_comparison')
    need(value['blockers'] == ['native_member_identity_not_established','compressed_asset_size_not_established','detached_trust_not_verified','version_bound_wire_not_established','placement_and_complete_acquisition_authority_missing'], 'blocker_coverage')
    shape(value['gates'], 'acquisitionReady implementationReady executionSupported pilotReady liveAdmissionAllowed')
    need(all(v is False for v in value['gates'].values()), 'activation')
    shape(value['actions'], 'payloadDownloads candidateExecutions authReads componentChanges fullResponsesPersisted')
    need(all(type(v) is int and v == 0 for v in value['actions'].values()), 'forbidden_action')
    need(value['docker'] == {'containers':4,'networks':5,'volumes':107,'images':16,'unchanged':True}, 'docker_continuity')
    need(value['nextTask'] == 'RF-HERMES-012', 'next_task')


def main():
    value, ledger = load(OBSERVATION), load(LEDGER)
    validate_observation(value, ledger)
    validate_profile(load(PROFILE), load(SCHEMA))
    report = REPORT.read_text(encoding='utf-8')
    need(len(report.encode()) < 32768 and value['verdict'] in report and 'researchComplete=true' in report, 'report_binding')
    for content in (report,json.dumps(value),json.dumps(ledger)):
        need(not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/|BEGIN .*PRIVATE KEY)',content), 'privacy')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',report):
        if '://' in target:
            need(target in [URLS[i-1] for i in value['evidenceRequestOrdinals']] or target == ledger['requests'][1]['redirectTo'], 'remote_link_scope')
        else:
            dest = (REPORT.parent / target).resolve()
            need(dest.name != 'design-qa.md' and dest.is_relative_to(BASE.parent.parent) and dest.is_file(), 'local_link_scope')
    need(report.count('Exactly one recommended next atomic task:') == 1 and '**RF-HERMES-012' in report, 'report_next_task')
    return {'result':'PASS','scope':'research_consistency_only','researchComplete':True,
            'requests':11,'bytesRead':190283,'provenanceAuthenticated':False,'runtimeQualified':False}


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except (ValueError,KeyError,TypeError,OSError,RecursionError):
        print(json.dumps({'result':'FAIL','scope':'research_consistency_only'}))
        sys.exit(1)
