"""Static RF-HERMES-006 document/schema checks; no runtime, network or auth I/O."""
import datetime
import csv
import hashlib
import json
import pathlib
import re
import sys
from urllib.parse import unquote

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/architecture'
PACKET = BASE / 'direct-codex-qualification-decisions-v1.md'
PROFILE = BASE / 'direct-codex-qualification-profile-v1.json'
SCHEMA = BASE / 'direct-codex-qualification-schema-v1.json'
OWNER_DECISIONS = ROOT / 'docs/decisions/ADR-002-codex-qualification-owner-decisions.md'


def need(condition, code):
    if not condition:
        raise ValueError(code)


def pairs(items):
    result = {}
    for key, value in items:
        need(key not in result, 'duplicate_key')
        result[key] = value
    return result


def load(path):
    need(path.stat().st_size <= 262144, 'document_size')
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite')))


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(',', ':'), allow_nan=False).encode('utf-8')


def seal(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def same(a, b):
    return canonical(a) == canonical(b)


def check_schema(value, rule, document):
    """Validate only the explicitly supported closed local JSON Schema subset."""
    supported = {'$schema', '$id', '$ref', '$defs', 'type', 'properties', 'required',
                 'additionalProperties', 'anyOf', 'enum', 'const', 'items',
                 'minItems', 'maxItems', 'uniqueItems', 'minimum', 'maximum',
                 'pattern', 'minLength', 'maxLength'}
    need(set(rule) <= supported, 'unsupported_schema_keyword')
    if '$ref' in rule:
        ref = rule['$ref']
        need(ref.startswith('#/$defs/') and ref.count('/') == 2, 'nonlocal_schema_ref')
        check_schema(value, document['$defs'][ref.split('/')[-1]], document)
    if 'anyOf' in rule:
        matched = False
        for option in rule['anyOf']:
            try:
                check_schema(value, option, document)
                matched = True
                break
            except ValueError:
                pass
        need(matched, 'no_schema_branch')
    if 'const' in rule:
        need(same(value, rule['const']), 'constant')
    if 'enum' in rule:
        need(any(same(value, v) for v in rule['enum']), 'enum')
    if 'type' in rule:
        kinds = {'object': type(value) is dict, 'array': type(value) is list,
                 'string': type(value) is str, 'integer': type(value) is int,
                 'boolean': type(value) is bool, 'null': value is None}
        need(rule['type'] in kinds and kinds[rule['type']], 'type')
    if type(value) is dict:
        properties = rule.get('properties')
        if properties is not None:
            need(set(rule.get('required', [])) <= set(value), 'required_field')
            if rule.get('additionalProperties') is False:
                need(set(value) <= set(properties), 'unknown_field')
            for key, item in value.items():
                if key in properties:
                    check_schema(item, properties[key], document)
    if type(value) is list:
        need(rule.get('minItems', 0) <= len(value) <= rule.get('maxItems', 9007199254740991), 'array_bound')
        if rule.get('uniqueItems'):
            need(len({canonical(x) for x in value}) == len(value), 'duplicate_array_item')
        if 'items' in rule:
            for item in value:
                check_schema(item, rule['items'], document)
    if type(value) is str:
        need(rule.get('minLength', 0) <= len(value) <= rule.get('maxLength', 9007199254740991), 'string_bound')
        if 'pattern' in rule:
            need(re.fullmatch(rule['pattern'], value) is not None, 'pattern')
    if type(value) is int:
        need(rule.get('minimum', -9007199254740991) <= value <= rule.get('maximum', 9007199254740991), 'integer_bound')


def machine_strings(value):
    if type(value) is dict:
        for key, child in value.items():
            need(key.isascii(), 'nonascii_key')
            machine_strings(child)
    elif type(value) is list:
        for child in value:
            machine_strings(child)
    elif type(value) is str:
        need(value.isascii(), 'nonascii_value')
        need(not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/|https?://|@)', value), 'private_machine_value')
    elif value is not None:
        need(type(value) in (bool, int), 'machine_number')


def validate_profile(profile, schema):
    check_schema(profile, schema, schema)
    machine_strings(profile)
    expected = {f'D{i:02}': 'DECIDED' if i == 7 else 'BLOCKED' for i in range(1, 8)}
    need(profile['decisionStatus'] == expected, 'current_decision_status')
    need(profile['revision'] == 3, 'preflight_revision')
    need(profile['blockers'] == [f'B{i:02}' for i in range(1, 10)], 'current_blockers')
    need(len(profile['settings']) == 75 and len(profile['research']) == 7, 'binding_count')
    for cell in profile['settings'].values():
        need(cell['classification'] != 'RESEARCH_ONLY', 'research_promoted')
        need((cell['classification'] == 'UNRESOLVED/BLOCKED') == (cell['value'] is None), 'unresolved_value')
        need(cell['sourceRefs'], 'missing_source')
    values = {k: c['value'] for k, c in profile['settings'].items()}
    need(values['stopInterruptMs'] + values['stopGraceMs'] + values['stopForceAndConfirmMs'] == values['stopMs'] == 5000, 'stop_partition')
    need(values['defaultDurationSeconds'] is None and values['turnMs'] is None, 'unapproved_long_operation_default')
    need(values['credentialChannel'] is None and values['budgetEnforcementRef'] is None, 'unproven_mechanism')
    need(values['model'] is None and values['reasoningEffort'] is None, 'unapproved_model_default')
    need(sum(v is None for v in values.values()) == 53, 'technical_nulls_preserved')
    for key in ('durationSecondsRange','credentialChannel','credentialOwnerRule','secretValuePersistence','rawLogRetentionBytes','budgetEnforcementRef'):
        need('E09' in profile['settings'][key]['sourceRefs'], 'owner_provenance')
    for key in ('installationRef','codexVersion','executableRef','executableSha256','inventorySha256','wireSchemaSha256','targetArchitecture'):
        need(values[key] is None and 'E10' in profile['settings'][key]['sourceRefs'], 'unqualified_artifact_pin')
    return values


def validate_receipt(receipt, profile, schema, expected):
    check_schema(receipt, schema['$defs']['capabilityReceipt'], schema)
    machine_strings(receipt)
    need(receipt['profileSha256'] == seal(profile) and receipt['profileRevision'] == profile['revision'], 'receipt_profile_drift')
    need(receipt['profileSchemaSha256'] == seal(schema), 'receipt_schema_drift')
    for field in ('executionRef', 'attempt', 'inputSeal', 'leaseEpochRef', 'checkpointVersion', 'inventorySha256', 'wireSchemaSha256', 'platformReceiptSha256'):
        need(receipt[field] == expected[field], 'receipt_scope_drift')
    observed = datetime.datetime.fromisoformat(receipt['observedAt'].replace('Z', '+00:00'))
    need(observed <= expected['now'], 'future_receipt')
    ids = [row['testId'] for row in receipt['testEvidence']]
    need(len(ids) == len(set(ids)), 'duplicate_test_id')
    for control in receipt['controls'].values():
        if control['status'] == 'PASS':
            need(control['effectiveSha256'] is not None and control['evidenceRefs'], 'unproved_control_pass')
    if receipt['verdict'] == 'PASS':
        need(not profile['blockers'] and all(v == 'DECIDED' for v in profile['decisionStatus'].values()), 'blocked_profile_pass')
        need(all(c['value'] is not None for c in profile['settings'].values()), 'unresolved_profile_pass')
        need(receipt['reasonCodes'] == ['qualification_pass'] and receipt['treeStopped'] and receipt['reviewerRef'] is not None, 'incomplete_pass')
        need(all(c['status'] == 'PASS' for c in receipt['controls'].values()), 'missing_control_pass')
        need(set(ids) == {f'CAS-T{i:02}' for i in range(1, 31)}, 'missing_test_pass')
        matrix = (BASE / 'direct-codex-app-server-acceptance-v1.md').read_text(encoding='utf-8')
        requirements = {}
        for line in matrix.splitlines():
            if line.startswith('| CAS-T'):
                cells = [c.strip() for c in line.strip('|').split('|')]
                requirements[cells[0]] = set(cells[4].split(','))
        for row in receipt['testEvidence']:
            need(row['result'] == 'PASS' and requirements[row['testId']] <= set(row['levels']), 'missing_test_level')
    else:
        need('qualification_pass' not in receipt['reasonCodes'], 'false_pass_reason')


def validate_documents():
    profile, schema = load(PROFILE), load(SCHEMA)
    validate_profile(profile, schema)
    packet = PACKET.read_text(encoding='utf-8')
    need(len(packet.encode()) <= 131072, 'packet_size')
    statuses = re.findall(r'^## (D0[1-7]) .* — (BLOCKED|DECIDED)$', packet, re.M)
    need(dict(statuses) == profile['decisionStatus'] and len(statuses) == 7, 'packet_status')
    need(set(re.findall(r'^\| (E(?:0[1-9]|10)) \|', packet, re.M)) == {f'E{i:02}' for i in range(1,11)}, 'source_catalog')
    need(set(re.findall(r'^\| (B0[1-9]) \|', packet, re.M)) == set(profile['blockers']), 'blocker_catalog')
    mappings = re.findall(r'^\| (D0[1-7]) \| (CAS-R[^|]+) \| (CAS-T[^|]+) \|$', packet, re.M)
    need(len(mappings) == 7 and len({row[0] for row in mappings}) == 7, 'cas_mapping_count')
    for _, requirements, tests in mappings:
        r, t = re.findall(r'CAS-R(\d{2})', requirements), re.findall(r'CAS-T(\d{2})', tests)
        need(r == t and len(r) == len(set(r)) and all(1 <= int(n) <= 30 for n in r), 'cas_mapping')
    need(packet.count('## Consolidated interview packet I01 — RESOLVED') == 1, 'interview_packet_resolved')
    need(packet.count('Exactly one recommended next atomic task:') == 1 and '**RF-CODEX-015' in packet, 'next_task')
    owners = OWNER_DECISIONS.read_text(encoding='utf-8')
    need(re.findall(r'^## (I01-[ABC]) — APPROVED:', owners, re.M) == ['I01-A','I01-B','I01-C'], 'owner_decision_status')
    need('Status: accepted' in owners and 'Date: 2026-09-13' in owners and 'I01 RESOLVED' in owners, 'owner_record')
    need('owner-interview.rf-hermes-007.i01.v1' in owners, 'owner_source')
    for letter in 'abc':
        need('owner-i01-' + letter + '-v1' in owners and 'owner-i01-' + letter + '-v1' in packet, 'owner_reference')
    with (ROOT / 'docs/decisions/decision-register.csv').open(encoding='utf-8', newline='') as stream:
        decisions = list(csv.DictReader(stream))
    records = [r for r in decisions if r['ID'] == 'ADR-002']
    need(len(records) == 1 and records[0]['Status'] == 'accepted' and records[0]['Accepted date'] == '2026-09-13', 'owner_register')
    need(records[0]['Decision file'] == OWNER_DECISIONS.relative_to(ROOT).as_posix(), 'owner_register_path')
    for key in profile['gates']:
        need(key + '=false' in packet, 'gate_documentation')
    need(not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/[a-z]/|BEGIN .*PRIVATE KEY)', packet), 'packet_privacy')
    links = 0
    for document, content in ((PACKET,packet),(OWNER_DECISIONS,owners)):
        need(not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/[a-z]/|BEGIN .*PRIVATE KEY)', content), 'owner_or_packet_privacy')
        for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', content):
            need('://' not in target, 'new_remote_link')
            filename, _, fragment = unquote(target).partition('#')
            dest = (document.parent / filename).resolve()
            need(dest.name != 'design-qa.md' and dest.is_relative_to(ROOT), 'link_scope')
            need(dest.is_file() and not fragment, 'local_link')
            links += 1
    registry = load(ROOT / 'src/modules/agent-runtime/execution-providers.json')
    need(registry['contractVersion'] == 5 and registry['requiredPilotProvider'] == 'hermes_codex' and registry['pilotReady'] is False, 'registry_changed')
    return {'result':'PASS','scope':'documentation_schema_only','profileRevision':3,'interviewStatus':'RESOLVED','ownerDecisionsApproved':3,'technicalNullsPreserved':53,'settings':75,'researchValues':7,'decided':['D07'],'blocked':[f'D{i:02}' for i in range(1,7)],'blockers':9,'casDecisionMappings':7,'localLinks':links,'profileSha256':seal(profile),'schemaSha256':seal(schema),'runtimeQualified':False}


if __name__ == '__main__':
    try:
        print(json.dumps(validate_documents()))
    except (ValueError, KeyError, TypeError, OSError, RecursionError):
        print(json.dumps({'result':'FAIL','scope':'documentation_schema_only'}))
        sys.exit(1)
