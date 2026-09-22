"""Offline parser/structure check. No provider resolution, entrypoint or client."""
import ast
import copy
from dataclasses import dataclass
import json
import os
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple

refused = []


def run():
    args = json.loads(sys.stdin.read(16384))
    root, home = Path(args['runtime']).resolve(), Path(args['home']).resolve()
    if not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode):
        raise ValueError('flags')
    raw_bytes = (home / 'config.yaml').read_bytes()
    sys.path[:0] = [str(root), str(root / 'venv/Lib/site-packages')]

    def guard(event, values):
        deny = (event.startswith(('socket.', 'subprocess.')) and event != 'socket.gethostname') or event in {
            'os.system', 'os.posix_spawn', 'os.exec', 'os.spawn', 'os.mkdir',
            'os.remove', 'os.rmdir', 'os.rename', 'os.link', 'os.symlink', 'os.chmod'}
        if event == 'open':
            mode, flags = values[1:3]
            deny = bool((isinstance(mode, str) and any(c in mode for c in 'wax+'))
                        or (isinstance(flags, int) and flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC)))
            # Rich's import-time terminal detection opens the Windows null
            # device. This discards output; it is not a filesystem mutation.
            if str(values[0]).lower() in {'nul', '\\\\.\\nul'}:
                deny = False
        if event == 'import' and values[0].split('.')[0] in {'openai', 'anthropic', 'cli', 'run_agent'}:
            deny = True
        if deny:
            refused.append(event)
            raise RuntimeError('offline_effect_denied')

    sys.addaudithook(guard)
    import yaml
    from hermes_cli.config_defaults import DEFAULT_CONFIG
    from hermes_cli.fallback_config import get_fallback_chain
    # Importing all of config.py triggers Windows terminal/platform subprocess
    # discovery. Execute only its exact, pinned structure-validation functions
    # and constants, plus its pure default merge; never import that startup wall.
    source = ast.parse((root / 'hermes_cli/config.py').read_text(encoding='utf-8'))
    start = next(i for i, node in enumerate(source.body) if isinstance(node, ast.Assign)
                 and any(isinstance(t, ast.Name) and t.id == '_EXTRA_KNOWN_ROOT_KEYS' for t in node.targets))
    end = next(i for i, node in enumerate(source.body) if isinstance(node, ast.FunctionDef)
               and node.name == 'validate_config_structure')
    merge = next(n for n in source.body if isinstance(n, ast.FunctionDef) and n.name == '_deep_merge')
    body = ast.parse('from __future__ import annotations').body + source.body[start:end + 1] + [merge]
    scope = {**globals(), 'DEFAULT_CONFIG': DEFAULT_CONFIG}
    exec(compile(ast.Module(body=body, type_ignores=[]), 'pinned_config_validation', 'exec'), scope)
    raw = yaml.safe_load(raw_bytes)
    issues = scope['validate_config_structure'](raw)
    effective = scope['_deep_merge'](copy.deepcopy(DEFAULT_CONFIG), raw)
    if issues or refused or get_fallback_chain(effective):
        raise ValueError('config_validation')
    expected = {'provider': 'custom', 'default': 'gpt-oss:20b',
                'base_url': 'http://127.0.0.1:11434/v1', 'api_mode': 'chat_completions'}
    if any(effective['model'].get(k) != v for k, v in expected.items()):
        raise ValueError('model_route')
    if effective['platform_toolsets']['cli'] != [] or effective['toolsets'] != []:
        raise ValueError('tools')
    if effective['compression']['enabled'] or effective['auth']['adopt_external_logins']:
        raise ValueError('automatic_behavior')
    if effective['auxiliary']['background_review']['enabled'] or effective['auxiliary']['title_generation']['enabled']:
        raise ValueError('auxiliary_behavior')
    if any('provider' in block or 'api_key' in block or 'model' in block
           for block in raw['auxiliary'].values()):
        raise ValueError('auxiliary_route')
    return {'result': 'PASS', 'parser': 'Hermes 0.21.3 pinned structure functions/default merge',
            'provider': 'custom', 'model': 'gpt-oss:20b', 'fallbacks': 0,
            'configuredToolsets': 0, 'externalLoginAdoption': False,
            'networkRequests': 0, 'providerStarted': False, 'blockedEffects': len(refused)}


if __name__ == '__main__':
    try:
        print(json.dumps(run()))
    except BaseException as exc:
        # Fixed class only; never emit upstream tracebacks or private config paths.
        print(json.dumps({'result': 'BLOCKED', 'errorClass': type(exc).__name__, 'blockedEffects': sorted(set(refused))}))
        sys.exit(1)
