"""RF009 documentary completeness/privacy checks; no acquisition or host probing."""
import json
import re
import sys

from validate_direct_codex_qualification import (
    BASE, PROFILE, SCHEMA, load, need, pairs, validate_profile,
)

CONTRACT = BASE / 'direct-codex-artifact-delivery-v1.md'
MATRIX = BASE / 'direct-codex-artifact-delivery-acceptance-v1.md'
CAS_MAP = {
    1: [1,25,26], 2: [3,26,27], 3: [3,23,27], 4: [3,10,27],
    5: [3,5,7,15], 6: [2,3,10,27], 7: [3,7,15,27],
    8: [2,13,15,24], 9: [3,7,13,23], 10: [3,7,24],
    11: [11,27,28,29], 12: [4,5,10,15,19,24],
    13: [13,15,20,23], 14: [12,20,26,27], 15: [7,15,23,25],
    16: [27,28,29,30],
}
WIRE_ROWS = {1,4,6,8,11,12,13,14,15,16}
REQUIRED_TERMS = {
    1: ['SPECIFIED', 'installation root', 'Hermes and OpenShell are not required', 'Desktop artifact'],
    2: ['publisher ownership', 'immutable release identity', '`latest`', 'Mirrors', 'BLOCKED'],
    3: ['Detached verification precedes payload download', 'Missing mandatory published metadata', 'No unsigned fallback'],
    4: ['PUBLISHER_BUNDLE', 'PINNED_GENERATOR', 'BINARY_VERIFIED_SCHEMA_PENDING', 'outside the immutable executable root', 'no-auth/no-discovery/'],
    5: ['root ownership', 'minimal Worker', 'linkCount=1', 'Writable scratch', 'global PATH'],
    6: ['rootRef, relativePath, type, size, sha256', 'ownerRef, mode, aclRef, linkCount and purpose', 'PT_INTERP/DT_NEEDED', 'incomplete inventory'],
    7: ['execveat/fexecve', 'same readable handle', 'Do not reopen an unchecked path', 'unproven race protection denies spawn'],
    8: ['networkAllowlist', 'maxMetadataBytes', 'maxDownloadBytes', 'maxUnpackedBytes', 'maxFiles', 'maxDepth', 'maxDurationSeconds', 'maxRetries', 'maxWorkspaceBytes', 'minFreeReserveBytes', 'cleanupScope', 'zero payload download'],
    9: ['non-executable', 'links, devices', 'No postinstall/hooks', 'before parsing/unpacking'],
    10: ['never overwrite', 'atomic same-filesystem', 'execute-access denial', 'never elevate implicitly'],
    11: ['No stage automatically authorizes the next', 'independent review', 'schema-only entry'],
    12: ['zero network/auth access', 'before initialization/discovery', 'No thread/start, turn/start', 'at-most-five-second'],
    13: ['at most one previous verified artifact', 'peak simultaneous copies', 'Never delete an active', 'sole evidence', 'only newly created artifacts'],
    14: ['new candidate/profile revision', 'Drain and reconcile', 'Rollback never resumes old work', 'No background updates'],
    15: ['complete receipts stay', 'raw logs', 'No real', 'Read-only Docker before/after', 'prune/reset'],
    16: ['RF008 does not select an official source', 'all B01–B09 remain open', 'RF-HERMES-010', 'RF010 is not started'],
}
MANIFEST_FIELDS = (
    'manifestVersion publisherRef sourceUrl releaseIdentity codexVersion '
    'buildIdentity platform architecture assetSize assetDigest executableIdentity '
    'verificationEvidence'
).split()
SELECTION_FIELDS = (
    'sourceRef releaseRef codexVersion buildRef artifactSha256 publisherManifestRef '
    'trustPolicyRef installationRef inventoryRef schemaRoute wireBundleRef acquisitionAuthorityRef'
).split()
GATES = (
    'acquisitionReady schemaProbeReady compatibilityProbeReady implementationReady '
    'executionSupported pilotReady liveAdmissionAllowed'
).split()


def normalized(text):
    return ' '.join(text.split()).lower()


def validate_text(contract, matrix):
    for content in (contract, matrix):
        need(len(content.encode('utf-8')) <= 65536, 'document_bound')
        need(not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/|https?://|BEGIN .*PRIVATE KEY)', content), 'document_privacy')
    headers = re.findall(r'^## CDL-R(\d{2}) — .+$', contract, re.M)
    need(headers == [f'{i:02}' for i in range(1,17)], 'requirement_ids')
    sections = re.split(r'^## CDL-R\d{2} — .+\n', contract, flags=re.M)[1:]
    for i, section in enumerate(sections,1):
        for term in REQUIRED_TERMS[i]:
            # SPECIFIED is the contract-level status, not an executable section flag.
            content = contract if i == 1 and term == 'SPECIFIED' else section
            need(normalized(term) in normalized(content), 'required_clause')
    found_fields = re.findall(r'^\| `([A-Za-z]+)` \|', sections[2], re.M)
    need(found_fields == MANIFEST_FIELDS, 'publisher_manifest_fields')
    blocks = re.findall(r'```json\n(.*?)\n```', contract, re.S)
    need(len(blocks) == 1, 'selection_record')
    selection = json.loads(blocks[0], object_pairs_hook=pairs)
    need(type(selection) is dict and set(selection) == {'contractId', *SELECTION_FIELDS, *GATES}, 'selection_shape')
    need(selection['contractId'] == 'roost-codex-artifact-delivery-v1', 'contract_identity')
    need(all(selection[k] is None for k in SELECTION_FIELDS), 'invented_selection')
    need(all(selection[k] is False for k in GATES), 'false_readiness')
    for gate in GATES:
        need(gate + '=false' in contract, 'document_gate')
    stages = re.findall(r'^\| S(\d{2}) ([a-z_]+) \|', contract, re.M)
    need(stages == list(zip([f'{i:02}' for i in range(1,11)], [
        'source_selection','detached_verification','bounded_download',
        'quarantine_static_inspection','inventory_seal','private_placement',
        'permissions_check','no_model_probe','independent_review',
        'separate_qualification_admission'])), 'stage_order')
    rows = [line for line in matrix.splitlines() if line.startswith('| CDL-T')]
    need(len(rows) == 16 and 'SPECIFIED, NOT QUALIFIED' in matrix, 'matrix_count_status')
    for i, line in enumerate(rows,1):
        cells = [c.strip() for c in line.strip('|').split('|')]
        need(len(cells) == 9, 'matrix_shape')
        test, req, decision, blockers, requirements, tests, positive, negative, levels = cells
        need(test == f'CDL-T{i:02}' and req == f'CDL-R{i:02}' and decision == 'D01', 'matrix_identity')
        need(blockers.split() == (['B01','B02'] if i in WIRE_ROWS else ['B01']), 'blocker_mapping')
        need(requirements.split() == [f'CAS-R{n:02}' for n in CAS_MAP[i]], 'cas_requirement_mapping')
        need(tests.split() == [f'CAS-T{n:02}' for n in CAS_MAP[i]], 'cas_test_mapping')
        need(len(positive) >= 50 and len(negative) >= 70, 'acceptance_cases')
        evidence = levels.split(',')
        need(evidence[0] == 'D' and len(set(evidence)) == len(evidence) and set(evidence) <= set('DSCOA'), 'evidence_levels')
    need(contract.count('Exactly one recommended next atomic task:') == 1 and '**RF-HERMES-010' in contract, 'next_task')
    return {'requirements':16, 'testFamilies':16, 'stages':10, 'unresolvedSelectionFields':len(SELECTION_FIELDS)}


def main():
    contract, matrix = CONTRACT.read_text(encoding='utf-8'), MATRIX.read_text(encoding='utf-8')
    result = validate_text(contract, matrix)
    links = 0
    for document, content in ((CONTRACT,contract),(MATRIX,matrix)):
        for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', content):
            need('://' not in target and '#' not in target, 'link_format')
            path = (document.parent / target).resolve()
            need(path.name != 'design-qa.md' and path.is_relative_to(BASE.parent.parent) and path.is_file(), 'link_scope')
            links += 1
    validate_profile(load(PROFILE), load(SCHEMA))
    cas_contract = (BASE / 'direct-codex-app-server-contract-v1.md').read_text(encoding='utf-8')
    cas_matrix = (BASE / 'direct-codex-app-server-acceptance-v1.md').read_text(encoding='utf-8')
    required_cas = {n for numbers in CAS_MAP.values() for n in numbers}
    need(required_cas <= {int(n) for n in re.findall(r'^## CAS-R(\d{2}) ', cas_contract, re.M)}, 'missing_cas_requirement')
    need(required_cas <= {int(n) for n in re.findall(r'^\| CAS-T(\d{2}) \|', cas_matrix, re.M)}, 'missing_cas_test')
    return {'result':'PASS','scope':'documentation_only',**result,'localLinks':links,
            'sourceSelected':False,'acquisitionReady':False,'runtimeQualified':False}


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except (ValueError, KeyError, TypeError, OSError, RecursionError):
        print(json.dumps({'result':'FAIL','scope':'documentation_only'}))
        sys.exit(1)
