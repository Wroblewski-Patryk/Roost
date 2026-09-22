"""Read-only distribution RECORD/license inventory; imports no installed package."""
import base64
import csv
import email.parser
import hashlib
import json
from pathlib import Path
import sys


def audit(root):
    root = Path(root).resolve()
    site = root / 'venv/Lib/site-packages'
    packages, names, checked, unhashed = [], set(), 0, 0
    for dist in sorted(site.glob('*.dist-info')):
        if len(packages) >= 500:
            raise ValueError('distribution_budget')
        metadata = email.parser.BytesParser().parsebytes((dist / 'METADATA').read_bytes())
        name = metadata['Name'].lower().replace('_', '-').replace('.', '-')
        if name in names:
            raise ValueError('duplicate_distribution')
        names.add(name)
        records = dist / 'RECORD'
        with records.open(encoding='utf-8', newline='') as stream:
            for rel, expected, size in csv.reader(stream):
                checked += 1
                if checked > 200000:
                    raise ValueError('record_budget')
                target = (site / rel).resolve()
                if not target.is_relative_to(root) or not target.is_file():
                    raise ValueError('record_target')
                if size and target.stat().st_size != int(size):
                    raise ValueError('record_size')
                if expected:
                    algo, value = expected.split('=', 1)
                    if algo not in ('sha256', 'sha384', 'sha512'):
                        raise ValueError('record_algorithm')
                    with target.open('rb') as file:
                        digest = hashlib.file_digest(file, algo).digest()
                    if base64.urlsafe_b64encode(digest).decode().rstrip('=') != value:
                        raise ValueError('record_hash')
                else:
                    unhashed += 1
        license_paths = [str(f.relative_to(root)).replace('\\', '/') for f in dist.rglob('*')
                         if f.is_file() and ('license' in f.name.lower() or 'licenses' in f.parts)]
        packages.append({'name': name, 'version': metadata['Version'],
                         'licenseFiles': license_paths, 'record': str(records.relative_to(root)).replace('\\', '/')})
    if not packages:
        raise ValueError('no_distributions')
    return {'result': 'PASS', 'packages': packages, 'recordEntries': checked, 'unhashedEntries': unhashed}


if __name__ == '__main__':
    try:
        print(json.dumps(audit(sys.argv[1])))
    except Exception:
        print('{"result":"RECORD_AUDIT_FAILED"}')
        sys.exit(1)
