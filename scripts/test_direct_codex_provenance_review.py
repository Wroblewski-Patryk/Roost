"""Reject review promotion, false accounting and evidence drift with local fixtures."""
import copy
import unittest
from validate_direct_codex_provenance_review import REVIEW,LEDGER,load,validate_review,validate_ledger,validate_bindings

class ProvenanceReviewTests(unittest.TestCase):
    def test_reviewer_record_preserved(self):
        validate_review(load(REVIEW))
        validate_ledger(load(LEDGER))

    def test_reviewer_verdict_trust_gates_and_policy_cannot_be_promoted(self):
        original=load(REVIEW)
        cases=[(('verdict',),'DETACHED-PROVENANCE-ACQUISITION-READY'),
               (('reviewerRef',),'main-author'),
               (('contractDecision','operativeChangePermittedNow'),True),
               (('independentChecks','fullSigstoreVerificationPerformed'),True),
               (('networkReview','recordedBodyBytes'),0)]
        cases.extend((('gates',key),True) for key in original['gates'])
        for path,replacement in cases:
            value=copy.deepcopy(original);target=value
            for key in path[:-1]:target=target[key]
            target[path[-1]]=replacement
            with self.subTest(path=path),self.assertRaises(ValueError):
                validate_review(value)

    def test_payload_get_reopen_missing_read_and_invented_size_fail(self):
        original=load(LEDGER)
        mutations=[lambda x:x.update(closed=False),
                   lambda x:x['requests'][-1].update(method='GET'),
                   lambda x:x['requests'][-1].update(contentLength=123),
                   lambda x:x['requests'][0].update(bytesRead=0),
                   lambda x:x['requests'][0].update(readInFlightMax=1),
                   lambda x:x['requests'][0].update(elapsedMillis=20000)]
        for mutate in mutations:
            value=copy.deepcopy(original);mutate(value)
            with self.assertRaises(ValueError):validate_ledger(value)

    def test_verification_input_drift_is_not_an_integration_edit(self):
        value=load(REVIEW)
        value['reviewedSha256']['docs/architecture/codex-provenance-verification-inputs-v1.json']='0'*64
        with self.assertRaisesRegex(ValueError,'reviewed_bytes_drift'):
            validate_bindings(value)

if __name__=='__main__':
    unittest.main()
