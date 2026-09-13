"""Offline policy denials and fake metadata scope; never imports a standard verifier."""
import copy
import pathlib
import tempfile
import unittest
from codex_standard_policy_capture import PolicyCapture
from validate_direct_codex_standard_policy import POLICY,REVIEW,LEDGER,SOURCES,load,validate_policy,validate_review,validate_network
class StandardPolicyTests(unittest.TestCase):
    def test_review_and_policy_remain_blocked(self):
        validate_review(load(REVIEW));validate_policy(load(POLICY));validate_network(load(LEDGER),load(SOURCES))
    def test_no_custom_fallback_or_early_download(self):
        original=load(POLICY)
        cases=[(('proposedVerdict',),'STANDARD-PROVENANCE-POLICY-READY'),
               (('recommendationCount',),2),
               (('semantics','customCryptoFallback'),True),
               (('semantics','subjectSha512'),'0'*128),
               (('semantics','ctLogThreshold'),0),
               (('semantics','expectedSubjectCount'),2),
               (('trust','forceCacheIsNetworkIsolation'),True),
               (('futureQuarantinePolicy','standardProvenanceBeforeDownload'),False),
               (('futureQuarantinePolicy','hashBeforeParser'),False),
               (('futureQuarantinePolicy','actualCompressedSize'),536870912),
               (('futureQuarantinePolicy','proposedMaxDownloadBytes'),0),
               (('futureQuarantinePolicy','downloadAuthorized'),True),
               (('toolchain','lockSha256'),'0'*64)]
        cases.extend((('gates',key),True) for key in original['gates'])
        for path,replacement in cases:
            value=copy.deepcopy(original);target=value
            for key in path[:-1]:target=target[key]
            target[path[-1]]=replacement
            with self.subTest(path=path),self.assertRaises(ValueError):validate_policy(value)
    def test_review_verdict_or_author_cannot_be_rewritten(self):
        for key,replacement in [('verdict','STANDARD-PROVENANCE-POLICY-READY'),('reviewerRef','main-author')]:
            value=load(REVIEW);value[key]=replacement
            with self.assertRaises(ValueError):validate_review(value)
    def test_budget_reopen_and_hidden_body_fail(self):
        for mutate in (lambda v:v.update(closed=False),lambda v:v['requests'][0].update(bytesRead=0),lambda v:v['requests'][0].update(readInFlightMax=1)):
            ledger=load(LEDGER);mutate(ledger)
            with self.assertRaises(ValueError):validate_network(ledger,load(SOURCES))
    def test_capture_denies_payload_methods_and_replay_before_transport(self):
        with tempfile.TemporaryDirectory() as directory:
            client=PolicyCapture(pathlib.Path(directory)/'ledger.json',transport=lambda *args:self.fail('no network'))
            url='https://registry.npmjs.org/sigstore/latest'
            for endpoint,method in [(url,'POST'),('https://registry.npmjs.org/sigstore/-/sigstore-5.0.0.tgz','GET'),('https://untrusted.example.invalid/meta','GET')]:
                with self.assertRaises(ValueError):client.request(endpoint,method)
            self.assertEqual(client.ledger['requests'],[])
            client.ledger['requests'].append({'url':url})
            with self.assertRaises(ValueError):client.request(url)
if __name__=='__main__':unittest.main()
