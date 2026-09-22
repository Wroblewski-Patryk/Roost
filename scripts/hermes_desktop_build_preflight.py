"""Offline, read-only necessary-input check; never grants build/install authority.

Only stdlib, Git blob reads and original cached ZIP bytes are used. Extracted
uv archives and installed dist-info cannot substitute for locked wheel bytes.
This deliberately does not resolve dependencies or qualify dynamic build hooks.
Run with a base Python using -I -S -B; no installed Hermes modules are imported.
"""
import argparse
import email.parser
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import time
import tomllib
from urllib.parse import urlsplit
import zipfile


class Refusal(Exception):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def source_inputs(root, contract):
    env = {k: v for k, v in os.environ.items() if not k.upper().startswith('GIT_')}
    def git(*args):
        return subprocess.check_output(['git', '-C', str(root), *args], env=env,
                                       timeout=10, stderr=subprocess.DEVNULL)
    source = contract['source']
    raw = git('cat-file', 'commit', source['commit'])
    object_hash = hashlib.sha1(b'commit ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if object_hash != source['commit'] or raw.splitlines()[0] != ('tree ' + source['tree']).encode():
        raise Refusal('source_identity_mismatch')
    values = []
    for filename, key in [('pyproject.toml', 'pyprojectSha256'), ('uv.lock', 'lockSha256')]:
        blob = git('show', source['commit'] + ':' + filename)
        if len(blob) > 2_000_000 or digest(blob) != source[key]:
            raise Refusal('source_blob_mismatch')
        values.append(tomllib.loads(blob.decode('utf-8')))
    project, lock = values
    if project['build-system'] != {'requires': ['setuptools==83.0.0', 'wheel'], 'build-backend': 'setuptools.build_meta'}:
        raise Refusal('build_requirements_changed')
    return lock


def locked_artifacts(lock, contract):
    result = []
    for expected in contract['lockedBuildInputs']:
        matches = [p for p in lock['package'] if p['name'] == expected['name'] and p['version'] == expected['version']]
        if len(matches) != 1 or matches[0].get('source') != {'registry': 'https://pypi.org/simple'}:
            raise Refusal('locked_source_invalid')
        wheels = [w for w in matches[0].get('wheels', []) if urlsplit(w['url']).path.endswith('/' + expected['filename'])]
        if len(wheels) != 1:
            raise Refusal('locked_artifact_ambiguous')
        wheel = wheels[0]
        url = urlsplit(wheel['url'])
        if (url.scheme != 'https' or url.hostname != 'files.pythonhosted.org' or
                url.username or url.password or url.port not in (None, 443) or url.query or url.fragment or
                wheel['hash'] != 'sha256:' + expected['sha256'] or
                not 0 < wheel['size'] <= 16_000_000):
            raise Refusal('locked_provenance_invalid')
        result.append({**expected, 'url': wheel['url'], 'size': wheel['size']})
    return result


def is_link(info):
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, 'st_file_attributes', 0) & 0x400)


def cached_wheel(file, artifacts):
    """Match bytes, never a cache filename or an installed metadata claim."""
    before = file.lstat()
    if is_link(before) or not stat.S_ISREG(before.st_mode):
        raise Refusal('cache_link_or_special_file')
    possible = [a for a in artifacts if a['size'] == before.st_size]
    if not possible:
        return []
    with file.open('rb') as stream:
        data = stream.read(16_000_001)
    after = file.lstat()
    stamp = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
    if stamp(before) != stamp(after):
        raise Refusal('cache_changed')
    sha = digest(data)
    matches = [a for a in possible if a['sha256'] == sha]
    if not matches:
        return []
    # Hash equality is necessary; verify ZIP identity without extraction/import.
    import io
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = [i for i in archive.infolist() if i.filename.endswith('.dist-info/METADATA')]
        if len(entries) != 1 or entries[0].file_size > 1_000_000:
            raise Refusal('wheel_metadata_invalid')
        metadata = email.parser.BytesParser().parsebytes(archive.read(entries[0]))
    for match in matches:
        if metadata.get_all('Name') != [match['name']] or metadata.get_all('Version') != [match['version']]:
            raise Refusal('wheel_identity_invalid')
    return [a['name'] for a in matches]


def inspect_caches(roots, artifacts):
    found = set()
    candidates = 0
    deadline = time.monotonic() + 45
    def unreadable(_error):
        raise Refusal('cache_unreadable')
    for root in roots:
        if not root.is_dir() or is_link(root.lstat()):
            raise Refusal('cache_root_invalid')
        for base, dirs, files in os.walk(root, followlinks=False, onerror=unreadable):
            if time.monotonic() > deadline:
                raise Refusal('cache_time_limit')
            # uv cache directory links normally point at extracted packages.
            dirs[:] = [d for d in dirs if not is_link((Path(base) / d).lstat())]
            for name in files:
                if time.monotonic() > deadline:
                    raise Refusal('cache_time_limit')
                if not name.endswith(('.whl', '.body')):
                    continue
                candidates += 1
                if candidates > 5000:
                    raise Refusal('cache_count_limit')
                found.update(cached_wheel(Path(base) / name, artifacts))
    return candidates, found


def report(artifacts, count, found):
    return {'result': 'BLOCKED', 'scope': 'necessary_build_inputs_only',
            'cacheCandidates': count,
            'lockedBuildInputs': [{**a, 'cachedExactBytes': a['name'] in found} for a in artifacts],
            'blockers': ['missing_artifact:' + a['name'] for a in artifacts if a['name'] not in found] +
                ['wheel_artifact_not_qualified', 'dynamic_build_hooks_not_qualified', 'runtime_closure_not_qualified'],
            'networkRequests': 0, 'stagingCreated': False, 'installationAuthorized': False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', type=Path, required=True)
    parser.add_argument('--cache-root', type=Path, action='append', required=True)
    args = parser.parse_args()
    try:
        contract = json.loads((Path(__file__).resolve().parent.parent / 'config/hermes/manual-desktop-build-inputs.json').read_text())
        artifacts = locked_artifacts(source_inputs(args.source_root, contract), contract)
        count, found = inspect_caches(args.cache_root, artifacts)
        print(json.dumps(report(artifacts, count, found)))
        return 2
    except Exception:
        # Private paths and upstream stderr never enter the public result.
        print(json.dumps({'result': 'BLOCKED', 'reason': 'preflight_failed_closed', 'installationAuthorized': False}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
