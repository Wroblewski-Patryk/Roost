"""Static-only v3 validation against immutable official and source receipts.

Reads and inspects fixture bytes. Never executes an ELF, parser or runtime.
READY means conditional static grant preservation, never live admission.
"""
import argparse
import json
import pathlib

import openshell_minimal_policy as base
import openshell_fixture as fixture

ROOT = pathlib.Path(__file__).resolve().parents[1]
POLICY_ID = 'roost.synthetic-isolation.v3'
POLICY_SHA256 = '0d7ac3b0eccde457d5a77e6662a4bfb6a2f1de3e3c4147d2d49633fce6058e5b'
CONTRACT_SHA256 = 'f01133f5a240c2eb60bf2d21d121649373e6e1259f22debfe62222abba888f98'
PROOF_SHA256 = '44a0b755f9680cdbcd4c439da72eb61725ba026447c8051c2b34795f7b0551c1'
RECEIPT_SHA256 = 'ca7c4fde3692cc2a9340264336a1a9d718d0f27a578696ce31827f335676502d'
READY = 'STATIC-STDIO-POLICY-V3-READY'
BLOCKED = 'STATIC-STDIO-POLICY-V3-BLOCKED'


def blocked(code):
    return {'verdict': BLOCKED, 'code': code, 'executionSupported': False,
            'pilotReady': False, 'liveAdmissionAllowed': False,
            'runtimeEffectivePolicySha256': None, 'fixtureExecuted': False}


def lint(policy_raw, contract_raw, receipt_raw, proof_raw, fixture_raw, source_raw, recipe_raw):
    try:
        values = []
        for raw, maximum, pin, label in (
            (policy_raw, 8192, POLICY_SHA256, 'policy'),
            (contract_raw, 16384, CONTRACT_SHA256, 'contract'),
            (receipt_raw, 16384, RECEIPT_SHA256, 'official_receipt'),
            (proof_raw, 16384, PROOF_SHA256, 'source_proof'),
        ):
            value = base.load_json(raw, maximum)
            # Pins are code-owned: callers cannot add fields or refresh trust.
            base.need(base.digest(value) == pin, 'unapproved_' + label + '_hash')
            values.append(value)
        policy, contract, receipt, proof = values
        base.need(receipt['policySha256'] == POLICY_SHA256 and
                  receipt['contractSha256'] == CONTRACT_SHA256 and
                  receipt['sourceProofSha256'] == PROOF_SHA256, 'receipt_binding')
        projection = receipt['official']['sourceProjection']
        base.need(not projection.get('network_policies') and
                  not projection.get('network_middlewares') and
                  not projection['filesystem_policy'].get('read_write') and
                  projection['filesystem_policy']['read_only'] == [contract['fixture']['path']] and
                  projection['filesystem_policy']['include_workdir'] is False, 'source_grants')
        build = contract['build']
        base.need(fixture.sha256(fixture.source_bytes(source_raw, 32768)) == build['sourceSha256'], 'source_hash')
        base.need(fixture.sha256(fixture.source_bytes(recipe_raw, 8192)) == build['recipeSha256'], 'recipe_hash')
        evidence = fixture.inspect_elf(fixture_raw)
        base.need(evidence['bytes'] == contract['fixture']['bytes'], 'fixture_bytes')
        base.need(evidence['sha256'] == contract['fixture']['sha256'], 'fixture_hash')
        return {'verdict': READY, 'code': 'pinned_static_stdio_contract_valid',
                'scope': 'conditional-static-filesystem-grants-only', 'policyId': POLICY_ID,
                'policySha256': POLICY_SHA256, 'contractSha256': CONTRACT_SHA256,
                'sourceProofSha256': PROOF_SHA256, 'officialReceiptSha256': RECEIPT_SHA256,
                'fixtureSha256': evidence['sha256'], 'fixtureBytes': evidence['bytes'],
                'sourceProjectionSha256': receipt['official']['sourceProjectionSha256'],
                'runtimeEffectivePolicySha256': None, 'runtimePolicyEvaluated': False,
                'officialParserExecutedByThisLint': False, 'fixtureExecuted': False,
                'executionSupported': False, 'pilotReady': False, 'liveAdmissionAllowed': False}
    except base.PolicyError as error:
        return blocked(str(error))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name, path in (
        ('policy', 'config/openshell/synthetic-isolation-v3.policy.json'),
        ('contract', 'config/openshell/synthetic-isolation-v3.contract.json'),
        ('receipt', 'config/openshell/stdio-policy-v3.receipt.json'),
        ('proof', 'config/openshell/stdio-policy-v3.source-proof.json'),
        ('source', 'fixtures/openshell/fake-app-server.c'),
        ('recipe', 'fixtures/openshell/build-fixture.sh'),
    ):
        parser.add_argument('--' + name, type=pathlib.Path, default=ROOT / path)
    parser.add_argument('--fixture', type=pathlib.Path)
    args = parser.parse_args()
    try:
        if args.fixture is None:
            result = blocked('fixture_required')
        else:
            result = lint(*(base.read_bounded(path, bound) for path, bound in (
                (args.policy, 8192), (args.contract, 16384), (args.receipt, 16384),
                (args.proof, 16384), (args.fixture, fixture.MAX_ELF),
                (args.source, 32768), (args.recipe, 8192))))
    except OSError:
        result = blocked('input_unreadable')
    except base.PolicyError as error:
        result = blocked(str(error))
    print(json.dumps(result, sort_keys=True))
    return 0 if result['verdict'] == READY else 2


if __name__ == '__main__':
    raise SystemExit(main())
