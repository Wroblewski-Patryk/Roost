"""RF012 fixed-endpoint public metadata capture; never downloads a package body."""
import base64
import hashlib
import json
from pathlib import Path
from codex_metadata_capture import Capture

BASE = Path(__file__).resolve().parents[1] / 'docs/architecture'
LEDGER = BASE / 'codex-provenance-metadata-ledger-v1.json'
INPUTS = BASE / 'codex-provenance-verification-inputs-v1.json'
VERSION = '0.154.0-linux-x64'
PAYLOAD = 'https://registry.npmjs.org/@openai/codex/-/codex-'+VERSION+'.tgz'
PLAN = [
 ('rootPackage','https://registry.npmjs.org/@openai/codex/0.154.0','GET'),
 ('platformPackage','https://registry.npmjs.org/@openai/codex/'+VERSION,'GET'),
 ('attestations','https://registry.npmjs.org/-/npm/v1/attestations/@openai%2fcodex@'+VERSION,'GET'),
 ('registryKeys','https://registry.npmjs.org/-/npm/v1/keys','GET'),
 ('observedSigstoreRoot','https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json','GET'),
 ('tagRef','https://api.github.com/repos/openai/codex/git/ref/tags/rust-v0.154.0','GET'),
 ('tagObject','https://api.github.com/repos/openai/codex/git/tags/36eab01061df3cde5f95ec20a526777b430091ba','GET'),
 ('archiveHead',PAYLOAD,'HEAD'),
]


class ReviewCapture(Capture):
    def __init__(self,path=LEDGER,**kwargs):
        super().__init__(path,task_id='RF-HERMES-012',url_policy=lambda u:u in {p[1] for p in PLAN},**kwargs)

    def request(self,url,method='GET',category='metadata'):
        if (url,method) not in {(p[1],p[2]) for p in PLAN}:
            raise ValueError('fixed_endpoint_method_scope')
        if any(row['url']==url and row['method']==method for row in self.ledger['requests']):
            raise ValueError('repeated_endpoint_no_retry')
        return super().request(url,method,category)


def project(name,value):
    if name in ('rootPackage','platformPackage'):
        return {**{k:value.get(k) for k in ('name','version','bin','files','scripts','os','cpu','dependencies','optionalDependencies')},
                'dist':{k:value.get('dist',{}).get(k) for k in ('tarball','integrity','shasum','unpackedSize','fileCount','signatures')}}
    if name == 'registryKeys':
        return {'keys':[{k:key.get(k) for k in ('keyid','keytype','scheme','key','expires')} for key in value['keys']]}
    if name in ('tagRef','tagObject'):
        return {k:value.get(k) for k in ('ref','tag','sha','object','verification')}
    if name == 'observedSigstoreRoot':
        # Public root certificates/log keys only; omit timestamp-authority material not verified here.
        return {k:value.get(k) for k in ('mediaType','certificateAuthorities','tlogs','ctlogs')}
    if name == 'attestations':
        out=[]
        for attestation in value['attestations']:
            bundle=attestation['bundle']
            env=bundle['dsseEnvelope']
            statement=base64.b64decode(env['payload'],validate=True)
            material=bundle['verificationMaterial']
            out.append({'predicateType':attestation.get('predicateType'),
                        'statementSha256':hashlib.sha256(statement).hexdigest(),
                        'dsseEnvelope':env,
                        'verificationMaterial':{k:material[k] for k in ('certificate','x509CertificateChain','publicKey','tlogEntries') if k in material}})
        return out
    raise ValueError('unknown_projection')


def capture():
    client=ReviewCapture()
    if client.ledger['requests']:
        raise ValueError('existing_review_capture_no_retry')
    result={'schemaId':'roost-codex-provenance-verification-inputs-v1','taskId':'RF-HERMES-012',
            'scope':'selected_public_verification_material_only','sources':{},'metadata':{},
            'rootTrust':'OBSERVED_HTTPS_NOT_BOOTSTRAPPED_TUF','fullResponsesPersisted':False}
    for name,url,method in PLAN:
        body,row=client.request(url,method)
        result['sources'][name]={'requestOrdinal':row['ordinal'],'url':url,'responseSha256':row['sha256'],'bytesRead':row['bytesRead'],'status':row['status']}
        if row['outcome'] == 'complete':
            if method == 'HEAD':
                result['metadata'][name]={'contentLength':row['contentLength'],'bodyBytesRead':row['bytesRead'],'authenticatedSizeClaim':False}
            else:
                result['metadata'][name]=project(name,json.loads(body))
        INPUTS.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'name':name,'request':row['ordinal'],'status':row['status'],'bytes':row['bytesRead'],'outcome':row['outcome']}),flush=True)
        if client.ledger['halted'] or row['outcome'] not in ('complete','http_error'):
            break
    client.ledger['closed']=True
    client.ledger['closureReason']='bounded_review_metadata_complete'
    client.save()
    print(json.dumps({'closed':True,'requests':len(client.ledger['requests']),'bytesRead':sum(r['bytesRead'] for r in client.ledger['requests'])}),flush=True)


if __name__ == '__main__':
    capture()
