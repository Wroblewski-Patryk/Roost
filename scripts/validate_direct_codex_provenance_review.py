"""RF012 local review/evidence integrity checks, not publisher or runtime admission."""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from codex_metadata_capture import BUDGET
from codex_provenance_capture import PLAN
from validate_direct_codex_qualification import BASE, PROFILE, SCHEMA, load, need, validate_profile

ROOT=BASE.parent.parent
REVIEW=BASE/'direct-codex-provenance-review-v1.json'
LEDGER=BASE/'codex-provenance-metadata-ledger-v1.json'
INPUTS=BASE/'codex-provenance-verification-inputs-v1.json'
CRYPTO=BASE/'codex-provenance-crypto-observation-v1.json'
REPORT=BASE/'direct-codex-provenance-review-v1.md'
REVIEW_SEAL='ef34cae38b6a1fe40cf484fb6106cf3a37f05437e389af6a7d71a1fdcb8bb3ad'
ENTRY='f42307b65d30a8fce7257ff43d1466c2cd38f264'
INTEGRATION={
 # RF015 updates current architecture; review remains bound to exact entry bytes.
 'docs/architecture/architecture-source-of-truth.md',
 'docs/architecture/local-codex-agent-runtime.md',
 'docs/architecture/direct-codex-artifact-delivery-v1.md',
 'docs/architecture/direct-codex-artifact-delivery-acceptance-v1.md',
 'docs/architecture/direct-codex-official-source-research-v1.md',
 'docs/architecture/direct-codex-qualification-decisions-v1.md',
}
# Exact reviewed mixed-EOL bytes were reconstructed before recording these two
# LF Git-blob equivalents in RF015. Neither reviewer hash/record is rewritten.
MIXED_EOL_SNAPSHOTS={
 'b25e704f0e8370eb2852a126ead7291dd5252518ee9b5c3e9e9244e0272e586b':'c905689ab1592a13b0c2c667edeca90cf3f7f5f31ca8eeff82f8c36c9fc92cf6',
 '46fa8dfda10e1d200d3dc67d5caa70090107c1eaeaec5f6c6f7cd85fd3da0b0a':'0475ce595976c2f3b07e2791081d9040c5eb7714b690acfca761a7b300dc69dc',
}
def digest(data):
    return hashlib.sha256(data).hexdigest()

def validate_review(value):
    # Reviewer confirmed this canonical seal independently; it is not a signature.
    need(digest(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode())==REVIEW_SEAL,'reviewer_record_changed')
    need(value['verdict']=='DETACHED-PROVENANCE-BLOCKED' and value['reviewerRef']=='codex-separate-agent.rf012_security_review','review_identity')
    need(value['snapshot']['entryCommit']==ENTRY,'entry_revision')
    need(value['attribution']['independentAssessmentPerformed'] is True and value['attribution']['runtimeCasAcceptance'] is False,'independence_scope')
    need([q['id'] for q in value['policyChecks']]==[f'Q{i:02}' for i in range(1,11)],'policy_coverage')
    need(value['contractDecision']['operativeChangePermittedNow'] is False and all(v is False for v in value['gates'].values()),'false_admission')
    need(value['nextTask']['taskId']=='RF-HERMES-013','next_task')

def validate_ledger(ledger):
    need(ledger['taskId']=='RF-HERMES-012' and ledger['budget']==BUDGET and ledger['closed'] is True and ledger['halted'] is False,'ledger_identity')
    rows=ledger['requests']
    need(len(rows)==8 and [(r['url'],r['method']) for r in rows]==[(p[1],p[2]) for p in PLAN],'endpoint_method_scope')
    need([r['bytesRead'] for r in rows]==[3521,3372,14643,580,127,343,655,0],'body_accounting')
    need(sum(r['bytesRead'] for r in rows)==23241,'aggregate_accounting')
    for i,row in enumerate(rows,1):
        need(row['ordinal']==i and row['complete'] is True and row['readInFlightMax']==0,'unfinished_receipt')
        need(row['limitResult']=='within_limit' and 0<=row['elapsedMillis']<20000,'request_limit')
        need(row['status']==(404 if i==5 else 200) and row['redirectCount']==0 and row['redirectTo'] is None,'http_outcome')
    need(rows[-1]['contentLength'] is None,'invented_compressed_size')

def validate_bindings(value):
    need(len(value['reviewedSha256'])==25,'evidence_count')
    for name,expected in value['reviewedSha256'].items():
        path=(ROOT/name).resolve()
        need(path.is_relative_to(ROOT) and path.name!='design-qa.md' and re.fullmatch(r'[0-9a-f]{64}',expected),'evidence_scope')
        current=path.read_bytes()
        if digest(current)==expected:
            continue
        need(name in INTEGRATION,'reviewed_bytes_drift')
        entry=subprocess.check_output(['git','show',ENTRY+':'+name],cwd=ROOT)
        # Git stores LF; reconstruct either exact entry workspace representation.
        need(expected in (digest(entry),digest(entry.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n'))) or MIXED_EOL_SNAPSHOTS.get(expected)==digest(entry),'entry_snapshot_drift')
    contract=ROOT/'docs/architecture/direct-codex-artifact-delivery-v1.md'
    old=subprocess.check_output(['git','show',ENTRY+':'+contract.relative_to(ROOT).as_posix()],cwd=ROOT).decode().replace('\r\n','\n')
    new=contract.read_text(encoding='utf-8')
    need(old[old.index('## CDL-R01'):]==new[new.index('## CDL-R01'):],'operative_contract_changed')
    matrix=ROOT/'docs/architecture/direct-codex-artifact-delivery-acceptance-v1.md'
    old=subprocess.check_output(['git','show',ENTRY+':'+matrix.relative_to(ROOT).as_posix()],cwd=ROOT).decode()
    need([s for s in old.splitlines() if s.startswith('| CDL-T')]==[s for s in matrix.read_text().splitlines() if s.startswith('| CDL-T')],'operative_acceptance_changed')

def main():
    review,ledger=load(REVIEW),load(LEDGER)
    validate_review(review)
    validate_ledger(ledger)
    validate_bindings(review)
    validate_profile(load(PROFILE),load(SCHEMA))
    actual=json.loads(subprocess.check_output(['node','scripts/verify_codex_provenance.mjs'],cwd=ROOT,timeout=15))
    need(actual==load(CRYPTO),'crypto_observation_drift')
    need(actual['inputsSha256']==digest(INPUTS.read_bytes()),'crypto_input_binding')
    sources=load(INPUTS)['sources']
    for source in sources.values():
        row=ledger['requests'][source['requestOrdinal']-1]
        need(source=={'requestOrdinal':row['ordinal'],'url':row['url'],'responseSha256':row['sha256'],'bytesRead':row['bytesRead'],'status':row['status']},'projection_receipt_binding')
    report=REPORT.read_text(encoding='utf-8')
    need('DETACHED-PROVENANCE-BLOCKED' in report and 'non-operative' in report,'report_disposition')
    need(report.count('Exactly one recommended next atomic task:')==1 and '**RF-HERMES-013' in report,'report_next_task')
    for path in (REVIEW,LEDGER,INPUTS,CRYPTO,REPORT):
        content=path.read_text(encoding='utf-8-sig')
        need(len(content.encode())<32768 and not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/|BEGIN .*PRIVATE KEY)',content),'public_evidence_scope')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)',report):
        if '://' in target:
            need(target in {p[1] for p in PLAN},'report_remote_link')
        else:
            dest=(BASE/target).resolve()
            need(dest.is_relative_to(ROOT) and dest.name!='design-qa.md' and dest.is_file(),'report_local_link')
    return {'result':'PASS','scope':'review_and_math_consistency_only','reviewedFiles':25,'policyQuestions':10,
            'requests':8,'bodyBytes':23241,'operativeContractChanged':False,'acquisitionReady':False}

if __name__=='__main__':
    try:
        print(json.dumps(main()))
    except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError):
        print(json.dumps({'result':'FAIL','scope':'review_and_math_consistency_only'}))
        sys.exit(1)
