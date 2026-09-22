"""Minimal offline source import; no main, site startup, provider or profile."""
import configparser
import email.parser
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys


def run():
    if not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode):
        raise ValueError('flags')
    args = json.loads(sys.stdin.read(8192))
    root = Path(args['root']).resolve()
    home = Path(args['home']).resolve()
    if list(home.iterdir()) or Path(os.environ['HERMES_HOME']).resolve() != home:
        raise ValueError('home')
    if Path(sys.executable).resolve() != root / 'venv/Scripts/python.exe':
        raise ValueError('interpreter')
    if not Path(sys.base_prefix).resolve().is_relative_to(root / '.hermes-runtime'):
        raise ValueError('python_base')
    site = root / 'venv/Lib/site-packages'
    distributions = []
    for file in site.glob('*.dist-info/METADATA'):
        parsed = email.parser.BytesParser().parsebytes(file.read_bytes())
        if parsed.get('Name', '').lower().replace('_', '-') == 'hermes-agent':
            distributions.append((file.parent, parsed['Version']))
    if len(distributions) != 1 or distributions[0][1] != '0.21.3':
        raise ValueError('distribution')
    entry = configparser.ConfigParser()
    entry.read(distributions[0][0] / 'entry_points.txt')
    if entry.get('console_scripts', 'hermes') != 'hermes_cli.main:main':
        raise ValueError('entrypoint')
    init = root / 'hermes_cli/__init__.py'
    data = init.read_bytes()
    if hashlib.sha256(data).hexdigest() != args['initSha256']:
        raise ValueError('source_hash')
    spec = importlib.util.spec_from_file_location('hermes_cli', init, submodule_search_locations=[str(init.parent)])
    module = importlib.util.module_from_spec(spec)
    code = compile(data, str(init), 'exec')
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    def guard(event, values):
        if event == 'exec' and values[0] is code:
            return
        if event in ('sys._getframe', 'object.__getattr__', 'builtins.id'):
            return
        raise RuntimeError('identity_effect_denied')
    sys.addaudithook(guard)
    sys.modules['hermes_cli'] = module
    exec(code, module.__dict__)
    if module.__version__ != '0.21.3' or 'hermes_cli.main' in sys.modules:
        raise ValueError('version')
    return {'version': module.__version__, 'origin': 'hermes_cli/__init__.py',
            'entrypoint': 'hermes_cli.main:main', 'distributions': 1,
            'mechanism': 'isolated_source_import_no_site', 'mainImported': False,
            'pythonVersion': '.'.join(map(str, sys.version_info[:3]))}


if __name__ == '__main__':
    try:
        result = run()
        print(json.dumps(result))
    except BaseException:
        print('{"result":"identity_failed_closed"}')
        sys.exit(1)
