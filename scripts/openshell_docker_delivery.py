"""Verify source-bound RF-HOST-042 findings without executing upstream code.

Exact blobs pin the reviewed HostConfig, mounts, workspace and delivery paths.
Verification success preserves BLOCKED; it never implies runtime readiness.
"""
import argparse
import hashlib
import json
import pathlib
import stat

import openshell_minimal_policy as base

ROOT = pathlib.Path(__file__).resolve().parents[1]
PROOF_SHA256 = '84010b83f421468c0244fb08f2339a518e48d87d28b193a9eccc020b9651e645'
UPSTREAM_COMMIT = 'd1155aa70042d3e2ee49dbfa15346b108b7c1d92'
VERDICT = 'PINNED-DOCKER-V3-DELIVERY-BLOCKED'
MAX_SOURCE_BYTES = 2097152
MAX_TOTAL_BYTES = 8388608


def regular_read(path, maximum):
    path = pathlib.Path(path)
    # Reject symlinks and Windows junction/reparse components before reading.
    for part in (path, *path.parents):
        info = part.lstat()
        base.need(not stat.S_ISLNK(info.st_mode) and
                  not getattr(info, 'st_file_attributes', 0) & 0x400, 'reparse_input')
    base.need(stat.S_ISREG(path.stat().st_mode), 'regular_file_required')
    raw = base.read_bounded(path, maximum)
    base.need(len(raw) <= maximum, 'file_size_limit')
    return raw


def relative_source(root, relative):
    base.need(type(relative) is str and '\\' not in relative and ':' not in relative,
              'source_path')
    parts = relative.split('/')
    base.need(all(part not in ('', '.', '..') for part in parts), 'source_path')
    return pathlib.Path(root).joinpath(*parts)


def verify_blob(raw, entry):
    base.need(len(raw) == entry['bytes'], 'source_size_drift')
    base.need(hashlib.sha256(raw).hexdigest() == entry['sha256'], 'source_sha256_drift')
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()
    base.need(blob == entry['gitBlob'], 'source_git_blob_drift')


def verify_sources(root, entries):
    total = 0
    for entry in entries:
        raw = regular_read(relative_source(root, entry['path']), MAX_SOURCE_BYTES)
        total += len(raw)
        base.need(total <= MAX_TOTAL_BYTES, 'source_total_limit')
        verify_blob(raw, entry)
    return total


def verify(proof_raw, upstream_root, image_audit, repository=ROOT):
    proof = base.load_json(proof_raw, 32768)
    base.need(base.digest(proof) == PROOF_SHA256, 'proof_drift')
    base.need(proof['upstreamCommit'] == UPSTREAM_COMMIT, 'upstream_commit')
    total = verify_sources(upstream_root, proof['sourceFiles'])
    for entry in proof['repositoryAnchors']:
        raw = regular_read(relative_source(repository, entry['path']), 65536)
        if entry['normalization'] == 'canonical-json':
            raw = base.canonical_bytes(base.load_json(raw, 16384))
        else:
            raw = raw.replace(b'\r\n', b'\n')
            base.need(raw.isascii() and b'\r' not in raw, 'anchor_encoding')
        base.need(hashlib.sha256(raw).hexdigest() == entry['sha256'], 'repository_anchor_drift')
    evidence = proof['imageEvidence']
    raw = regular_read(image_audit, 524288)
    base.need(len(raw) == evidence['receiptBytes'] and
              hashlib.sha256(raw).hexdigest() == evidence['receiptSha256'], 'image_receipt_drift')
    # Parse only after authenticating this exact private historical receipt.
    # Never emit its workload names, locations or other installation data.
    audit = json.loads(raw)['audit']
    base.need(audit['complete'] is True and audit['manifestVerified'] is True and
              audit['finalMetadataSha256'] == evidence['finalMetadataSha256'] and
              audit['finalPaths'] == evidence['finalPaths'] and
              audit['expectedDigest'] == evidence['manifestDigest'] and
              audit['configDigest'] == evidence['configDigest'], 'image_evidence_binding')
    return {'verdict': VERDICT, 'proofVerified': True, 'code': 'pinned_source_findings_verified',
            'requirements': proof['requirements'], 'reasons': proof['reasons'],
            'sourceFilesVerified': len(proof['sourceFiles']), 'sourceBytesVerified': total,
            'upstreamCommit': UPSTREAM_COMMIT, 'proofSha256': PROOF_SHA256,
            'fixturePathPresence': 'UNPROVEN', 'fixturePathAbsence': 'UNPROVEN',
            'runtimeEffectivePolicySha256': None, 'runtimeExecuted': False,
            'executionSupported': False, 'pilotReady': False, 'liveAdmissionAllowed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upstream-root', type=pathlib.Path, required=True)
    parser.add_argument('--image-audit', type=pathlib.Path, required=True)
    parser.add_argument('--proof', type=pathlib.Path,
                        default=ROOT / 'config/openshell/docker-v3-delivery-proof.json')
    args = parser.parse_args()
    try:
        result = verify(regular_read(args.proof, 32768), args.upstream_root, args.image_audit)
    except (OSError, base.PolicyError) as error:
        code = str(error) if isinstance(error, base.PolicyError) else 'input_unreadable'
        result = {'verdict': VERDICT, 'proofVerified': False, 'code': code,
                  'executionSupported': False, 'pilotReady': False, 'liveAdmissionAllowed': False,
                  'runtimeEffectivePolicySha256': None, 'runtimeExecuted': False}
    print(json.dumps(result, sort_keys=True))
    # This pinned implementation cannot meet v3, even with a valid source proof.
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
