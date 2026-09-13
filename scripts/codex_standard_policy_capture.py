"""RF013 bounded official documentation/metadata capture, no verifier or package execution."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit
from codex_metadata_capture import Capture

BASE=Path(__file__).resolve().parents[1]/'docs/architecture'
LEDGER=BASE/'codex-standard-policy-metadata-ledger-v1.json'
EVIDENCE=BASE/'codex-standard-policy-sources-v1.json'
PACKAGES={'npm','sigstore','@sigstore/verify','@sigstore/tuf','pacote'}
def allowed(url):
    p=urlsplit(url)
    if p.scheme!='https' or p.username or p.password or p.query or p.fragment or p.port not in (None,443):
        return False
    if p.hostname=='registry.npmjs.org':
        return any(p.path=='/'+name+'/latest' for name in PACKAGES)
    if p.hostname=='raw.githubusercontent.com':
        return bool(re.fullmatch(r'/(?:sigstore/sigstore-js|npm/pacote|npm/cli)/[A-Za-z0-9._-]+/(?:README\.md|packages/(?:sigstore|client|verify|tuf)/README\.md|docs/lib/content/commands/npm-audit\.md)',p.path))
    return False

class PolicyCapture(Capture):
    def __init__(self,path=LEDGER,**kwargs):
        super().__init__(path,task_id='RF-HERMES-013',url_policy=allowed,**kwargs)
    def request(self,url,method='GET',category='metadata'):
        if method!='GET' or any(r['url']==url for r in self.ledger['requests']):
            raise ValueError('fixed_method_no_retry')
        return super().request(url,method,category)

def project(value):
    return {**{k:value.get(k) for k in ('name','version','gitHead','repository','engines','os','cpu','bin','scripts','dependencies','optionalDependencies')},
            'dist':{k:value.get('dist',{}).get(k) for k in ('integrity','tarball','unpackedSize','fileCount','signatures')}}
def run(name,url):
    client=PolicyCapture()
    if name=='close':
        client.ledger['closed']=True
        client.ledger['closureReason']='standard_policy_research_complete'
        client.save()
        print(json.dumps({'closed':True,'requests':len(client.ledger['requests']),'bodyBytes':sum(r['bytesRead'] for r in client.ledger['requests'])}))
        return
    if not re.fullmatch(r'[a-z][a-zA-Z0-9]{0,30}',name):raise ValueError('source_id')
    evidence=json.loads(EVIDENCE.read_text(encoding='utf-8')) if EVIDENCE.exists() else {'schemaId':'roost-codex-standard-policy-sources-v1','taskId':'RF-HERMES-013','sources':{}}
    if name in evidence['sources']:raise ValueError('source_id_no_retry')
    body,row=client.request(url,category='metadata' if 'registry.npmjs.org' in url else 'documentation')
    item={'requestOrdinal':row['ordinal'],'url':url,'responseSha256':row['sha256'],'bodyBytes':row['bytesRead'],'status':row['status'],'outcome':row['outcome']}
    if row['outcome']=='complete':
        if 'registry.npmjs.org' in url:
            item['package']=project(json.loads(body))
        else:
            lines=body.decode('utf-8').splitlines()
            # Only selected policy/API paragraphs with original line locations.
            pattern=r'(?i)(verif|trust|root|TUF|offline|online|cache|retry|issuer|identity|signature|provenance|attestation|integrity|node|engine|platform|policy|certificate|transparency|checkpoint|timestamp|keySelector|keyid|throw|error|return|endpoint|https://|npm audit|artifact)'
            indexes=set()
            for i,line in enumerate(lines):
                if re.search(pattern,line):
                    indexes.update(range(max(0,i-1),min(len(lines),i+4)))
            selected=[{'line':i+1,'text':lines[i]} for i in sorted(indexes) if '.slack.com' not in lines[i]]
            encoded=json.dumps(selected).encode()
            if len(encoded)>40000:raise ValueError('projection_too_large')
            item['selectedLines']=selected
            item['completeDocumentRetained']=False
    evidence['sources'][name]=item
    EVIDENCE.write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(item))

if __name__=='__main__':
    run(sys.argv[1],sys.argv[2] if len(sys.argv)>2 else '')
