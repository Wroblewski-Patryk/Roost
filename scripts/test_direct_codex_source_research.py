"""Synthetic negative fixtures: source claims cannot become acquisition authority."""
import copy
import unittest
from validate_direct_codex_source_research import OBSERVATION, LEDGER, load, validate_observation
from validate_direct_codex_qualification import PROFILE, SCHEMA, validate_profile


class SourceResearchTests(unittest.TestCase):
    def setUp(self):
        self.value = load(OBSERVATION)
        self.ledger = load(LEDGER)

    def test_complete_research_is_not_qualification(self):
        validate_observation(self.value,self.ledger)

    def test_rejects_promoted_claims_and_invented_pins(self):
        cases = [
            (('verdict',),'QUALIFIED'),
            (('priorAttempt','accountingRecovered'),True),
            (('candidate','integrity'),'sha512-AAAA'),
            (('candidate','nativeExecutableSha256'),'0'*64),
            (('candidate','nativeExecutableSize'),123),
            (('candidate','compressedSize'),123),
            (('candidate','localArtifactVerified'),True),
            (('trust','subjectSha512'),'0'*128),
            (('trust','declaredSourceCommit'),'0'*40),
            (('trust','registrySignatureVerified'),True),
            (('trust','signatureChainVerified'),True),
            (('schema','exactBuildSupportVerified'),True),
            (('schema','generated'),True),
            (('acquisitionProposal','authorized'),True),
            (('acquisitionProposal','maxDownloadBytes'),400000000),
            (('network','requests'),10),
            (('network','bytesRead'),190282),
            (('network','retries'),1),
            (('desktopComparison','sameNativeArtifact'),True),
            (('actions','payloadDownloads'),1),
            (('docker','unchanged'),False),
        ]
        cases.extend((('gates',key),True) for key in self.value['gates'])
        for path,replacement in cases:
            with self.subTest(path=path):
                value = copy.deepcopy(self.value)
                target = value
                for key in path[:-1]:
                    target = target[key]
                target[path[-1]] = replacement
                with self.assertRaises(ValueError):
                    validate_observation(value,self.ledger)

    def test_rejects_ledger_drift_and_unfinished_reads(self):
        cases = [('bytesRead',1),('readInFlightMax',16384),('complete',False),
                 ('elapsedMillis',20001),('redirectCount',1),
                 ('url',self.value['candidate']['payloadUrl']),
                 ('url','https://private.example.invalid/account')]
        for key,replacement in cases:
            with self.subTest(key=key,replacement=replacement):
                ledger = copy.deepcopy(self.ledger)
                ledger['requests'][0][key] = replacement
                with self.assertRaises(ValueError):
                    validate_observation(self.value,ledger)
        for key,replacement in [('closed',False),('halted',True)]:
            ledger = copy.deepcopy(self.ledger)
            ledger[key] = replacement
            with self.assertRaises(ValueError):
                validate_observation(self.value,ledger)
        value = copy.deepcopy(self.value)
        value['evidenceRequestOrdinals'].append(8)
        with self.assertRaises(ValueError):
            validate_observation(value,self.ledger)

    def test_unknown_fields_and_profile_activation_are_rejected(self):
        for section in (None,'candidate','trust','network','actions'):
            value = copy.deepcopy(self.value)
            (value if section is None else value[section])['extra'] = 'untrusted'
            with self.subTest(section=section), self.assertRaises(ValueError):
                validate_observation(value,self.ledger)
        profile = load(PROFILE)
        for gate in profile['gates']:
            mutated = copy.deepcopy(profile)
            mutated['gates'][gate] = True
            with self.subTest(gate=gate), self.assertRaises(ValueError):
                validate_profile(mutated,load(SCHEMA))


if __name__ == '__main__':
    unittest.main()
