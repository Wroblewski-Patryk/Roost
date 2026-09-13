"""RF013 static policy/reviewer/evidence checks; never executes any crypto verifier."""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from codex_metadata_capture import BUDGET
from codex_standard_policy_capture import allowed
from validate_direct_codex_qualification import BASE,PROFILE,SCHEMA,load,need,validate_profile

ROOT=BASE.parent.parent
POLICY=BASE/'direct-codex-standard-provenance-policy-v1.json'
REVIEW=BASE/'direct-codex-standard-provenance-review-v1.json'
SOURCES=BASE/'codex-standard-policy-sources-v1.json'
LEDGER=BASE/'codex-standard-policy-metadata-ledger-v1.json'
REPORT=BASE/'direct-codex-standard-provenance-policy-v1.md'
ENTRY='f9eedc8b3e5284489dafb9de7f6726c6b9c4fcf6'
REVIEW_SEAL='d7b87e571b91b84356b0828fdeb73029eecc11baa7d26c671515bf95919e98e6'
POLICY_SEAL='3add9923737e6ce02e7e8472f5d9b94387e33d0e452aea98e5fdb02ca1de7d34'
INTEGRATION={'docs/architecture/direct-codex-artifact-delivery-v1.md','docs/architecture/direct-codex-qualification-decisions-v1.md'}
def digest(b):return hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()
def validate_review(v):
    need(digest(canonical(v))==REVIEW_SEAL,'reviewer_record_changed')
    need(v['verdict']=='STANDARD-PROVENANCE-POLICY-BLOCKED' and v['reviewerRef']=='codex-separate-agent.rf013_standard_policy_review','review_identity')
    need(v['independence']['freshIndependentAssessment'] is True and v['independence']['authoredRf012'] is False,'independence')
    need(all(x is False for x in v['gates'].values()) and v['contractDecision']['operativeChangePermittedNow'] is False,'review_admission')
    need(v['nextTask']['taskId']=='RF-HERMES-014','next_task')
def validate_policy(v):
    need(v['schemaId']=='roost-codex-standard-provenance-policy-v1' and v['policyVersion']==1,'policy_identity')
    need(v['proposedVerdict']=='STANDARD-PROVENANCE-POLICY-BLOCKED' and v['status']=='CANDIDATE_NOT_ADMITTED','policy_disposition')
    need(v['recommendedOption']=='sigstore-js-client' and v['recommendationCount']==1 and sum(o['selected'] is True for o in v['options'])==1,'one_option')
    need([o['pin']['version'] for o in v['options']]==['12.0.2','22.0.0','5.0.0'],'exact_versions')
    need(v['toolchain']['client']['version']=='5.0.0' and not v['toolchain']['transitiveDependenciesFullyPinned'],'toolchain_unqualified')
    need(all(v['toolchain'][k] is None for k in ('lockSha256','nodeRuntimePin','embeddedBootstrapSha256','trustedTargetSha256')),'invented_pin')
    prior=load(BASE/'direct-codex-official-source-research-v1.json')
    s=v['semantics']
    need(s['subjectSha512']==prior['candidate']['packageSha512'] and s['packageIntegrity']==prior['candidate']['integrity'],'package_binding')
    need(s['sourceCommit']==prior['sourceIdentity']['commitSha'] and s['tagObjectSha']==prior['sourceIdentity']['tagObjectSha'],'source_binding')
    need(s['packageName']=='@openai/codex' and s['packageVersion']=='0.154.0-linux-x64' and s['expectedSubjectCount']==1,'exact_subject')
    need(list(s['expectedStatementCountByPredicate'].values())==[1,1] and s['ctLogThreshold']==s['tlogThreshold']==1,'thresholds')
    need(s['unsignedFallback'] is False and s['customCryptoFallback'] is False and s['semanticChecksOnlyAfterStandardCrypto'] is True,'custom_fallback')
    need(v['trust']['forceCacheIsNetworkIsolation'] is False and v['trust']['npmKeyTrustProviderQualified'] is False,'trust_gap')
    q=v['futureQuarantinePolicy']
    need(q['operative'] is False and q['downloadAuthorized'] is False and q['splitApprovedForUse'] is False,'quarantine_not_authorized')
    need(q['standardProvenanceBeforeDownload'] is True and q['hashBeforeParser'] is True and q['standardProvenanceBeforePlacement'] is True,'verification_order')
    need(q['actualCompressedSize'] is None and q['proposedMaxDownloadBytes']==536870912 and q['maxRetries']==0,'bounded_unknown_size')
    need(q['nativeSize'] is None and q['nativeSha256'] is None and not q['schemaExecutionAuthorized'],'native_schema_gap')
    need(not v['bundleInput']['rf012ProjectionDirectlyUsable'] and not v['receiptContract']['fieldTypingAndExecutableSchemaQualified'],'unproven_input')
    need(all(x is False for x in v['gates'].values()) and all(type(x)is int and x==0 for x in v['actions'].values()),'policy_activation')
    need(v['nextTask']=='RF-HERMES-014','policy_next')
def validate_network(ledger,sources):
    need(ledger['taskId']=='RF-HERMES-013' and ledger['budget']==BUDGET and ledger['closed'] is True and ledger['halted'] is False,'ledger_identity')
    rows=ledger['requests']
    need(len(rows)==12 and sum(r['bytesRead'] for r in rows)==116644,'accounting')
    need([r['bytesRead'] for r in rows]==[66824,2113,2978,14,621,3682,2813,9496,12984,11094,2068,1957],'response_sizes')
    need(len(set((r['url'],r['method']) for r in rows))==12,'no_retry')
    for i,r in enumerate(rows,1):
        need(r['ordinal']==i and r['method']=='GET' and allowed(r['url']),'endpoint_scope')
        need(r['status']==(404 if i==4 else 200) and r['complete'] is True and r['readInFlightMax']==0,'response_completion')
        need(r['redirectCount']==0 and r['limitResult']=='within_limit' and 0<=r['elapsedMillis']<20000,'limits')
    need(len(sources['sources'])==12,'source_count')
    for item in sources['sources'].values():
        row=rows[item['requestOrdinal']-1]
        need(item['url']==row['url'] and item['responseSha256']==row['sha256'] and item['bodyBytes']==row['bytesRead'] and item['status']==row['status'],'source_receipt')
        if 'selectedLines' in item:
            need(item['completeDocumentRetained'] is False and all(type(x['line'])is int and x['line']>0 for x in item['selectedLines']),'projection')
def validate_bindings(review):
    need(len(review['reviewedSha256'])==22,'review_scope')
    for name,expected in review['reviewedSha256'].items():
        p=(ROOT/name).resolve()
        need(p.is_relative_to(ROOT) and p.name!='design-qa.md','file_scope')
        if digest(p.read_bytes())==expected:continue
        need(name in INTEGRATION,'reviewed_bytes_drift')
        old=subprocess.check_output(['git','show',ENTRY+':'+name],cwd=ROOT)
        need(expected in (digest(old),digest(old.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n'))),'snapshot_drift')
    need(digest(POLICY.read_bytes())==POLICY_SEAL,'policy_review_seal')
    path='docs/architecture/direct-codex-artifact-delivery-v1.md'
    old=subprocess.check_output(['git','show',ENTRY+':'+path],cwd=ROOT).decode().replace('\r\n','\n')
    new=(ROOT/path).read_text(encoding='utf-8')
    need(old[old.index('## CDL-R01'):]==new[new.index('## CDL-R01'):],'operative_contract')
    for path in ('scripts/verify_codex_provenance.mjs','scripts/test_codex_provenance.mjs','docs/architecture/direct-codex-artifact-delivery-acceptance-v1.md'):
        old=subprocess.check_output(['git','show',ENTRY+':'+path],cwd=ROOT).decode().replace('\r\n','\n')
        need((ROOT/path).read_text(encoding='utf-8')==old,'custom_crypto_or_acceptance_changed')
def main():
    review,policy=load(REVIEW),load(POLICY)
    validate_review(review);validate_policy(policy);validate_network(load(LEDGER),load(SOURCES));validate_bindings(review)
    validate_profile(load(PROFILE),load(SCHEMA))
    report=REPORT.read_text(encoding='utf-8')
    need('STANDARD-PROVENANCE-POLICY-BLOCKED' in report and report.count('Exactly one recommended next atomic task:')==1 and '**RF-HERMES-014' in report,'report_binding')
    for p in (POLICY,REVIEW,LEDGER,SOURCES,REPORT):
        text=p.read_text(encoding='utf-8-sig')
        need(len(text.encode())<=65536 and not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/|BEGIN .*PRIVATE KEY|join\.slack\.com)',text),'artifact_scope')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',report):
        if '://' in target:need(target in {s['url'] for s in load(SOURCES)['sources'].values()},'link_source')
        else:
            p=(BASE/target).resolve();need(p.is_relative_to(ROOT) and p.name!='design-qa.md' and p.is_file(),'local_link')
    return {'result':'PASS','scope':'standard_policy_static_only','reviewedFiles':22,'options':3,'recommendations':1,'requests':12,'bodyBytes':116644,'customCryptoExecuted':False,'policyReady':False}
if __name__=='__main__':
    try:print(json.dumps(main()))
    except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError):
        print(json.dumps({'result':'FAIL','scope':'standard_policy_static_only'}));sys.exit(1)
