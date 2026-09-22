"""One no-tool turn through the pinned private Hermes runtime, with local-only I/O.

The fixture mode exercises the same Hermes path against an in-memory HTTP response;
it cannot reach a model. Only fixed metrics and the expected one-word verdict escape.
"""
import contextlib
import hashlib
import json
import logging
import os
from pathlib import Path
import sys
import time
import traceback
from urllib.parse import urlsplit

METRICS = {}


def request_facts(method, url, content, inference_used):
    parsed = urlsplit(str(url))
    if (parsed.scheme, parsed.hostname, parsed.port) != ('http', '127.0.0.1', 11434):
        raise PermissionError('local_endpoint_only')
    row = {'method': method, 'route': parsed.path}
    if method == 'POST' and parsed.path == '/v1/chat/completions':
        payload = json.loads(content)
        if inference_used or payload.get('model') != 'gpt-oss:20b' or payload.get('tools') or payload.get('functions'):
            raise PermissionError('single_model_no_tools')
        output = payload.get('max_tokens', payload.get('max_completion_tokens', 0))
        if not isinstance(output, int) or not 1 <= output <= 256:
            raise PermissionError('output_budget')
        context = payload.get('num_ctx', (payload.get('options') or {}).get('num_ctx', 2048))
        if not isinstance(context, int) or not 1 <= context <= 2048:
            raise PermissionError('context_budget')
        row.update(model=payload['model'], toolCount=0, stream=bool(payload.get('stream')),
                   outputLimit=output, reasoningEffort=payload.get('reasoning_effort'), contextLimit=context)
    elif not (method == 'GET' and parsed.path in {'/v1/models', '/api/tags', '/api/v1/models',
              '/v1/props', '/version', '/v1/models/gpt-oss:20b'} or method == 'POST' and parsed.path == '/api/show'):
        raise PermissionError('unexpected_local_route')
    return row


def fixture_metadata(route):
    if route == '/api/show':
        return 200, {'model_info': {'general.architecture': 'gptoss', 'gptoss.context_length': 131072},
                     'capabilities': ['completion', 'thinking'], 'parameters': ''}
    if route == '/api/tags':
        return 200, {'models': [{'name': 'gpt-oss:20b'}]}
    if route == '/v1/models':
        return 200, {'object': 'list', 'data': [{'id': 'gpt-oss:20b', 'object': 'model'}]}
    return 404, {'error': 'not found'}

def run(args):
    root = Path(args['runtime']).resolve()
    home = Path(os.environ['HERMES_HOME']).resolve()
    writable = Path(args['writable']).resolve()
    fixture = args.get('fixture') is True
    if not (sys.flags.isolated and sys.flags.no_site and sys.dont_write_bytecode):
        raise ValueError('isolated_flags')
    sys.path[:0] = [str(root), str(root / 'venv/Lib/site-packages')]
    metrics = METRICS
    metrics.update({'requests': [], 'deniedRequestReasons': {}, 'deniedNetwork': 0, 'deniedProcesses': 0,
               'deniedWrites': 0, 'fixture': fixture}
    )
    inference = 0

    def inside(file):
        try:
            return Path(file).resolve().is_relative_to(writable)
        except (TypeError, ValueError):
            return False

    def guard(event, values):
        if event in {'socket.connect', 'socket.getaddrinfo'}:
            address = values[1] if event == 'socket.connect' else values[:2]
            if fixture or not isinstance(address, tuple) or address[:2] != ('127.0.0.1', 11434):
                metrics['deniedNetwork'] += 1
                raise PermissionError('local_endpoint_only')
        if event == 'socket.sendto':
            metrics['deniedNetwork'] += 1
            raise PermissionError('datagrams_disabled')
        if event.startswith('subprocess.') or event in {'os.system', 'os.posix_spawn', 'os.exec', 'os.spawn'}:
            metrics['deniedProcesses'] += 1
            raise PermissionError('no_child_processes')
        targets = []
        if event == 'open':
            file, mode, flags = values
            if str(file).lower() in {'nul', '\\\\.\\nul'} or isinstance(file, int):
                return
            if (isinstance(mode, str) and any(c in mode for c in 'wax+')) or flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC):
                targets = [file]
        elif event in {'os.mkdir', 'os.remove', 'os.rmdir', 'os.chmod', 'os.utime'}:
            targets = [values[0]]
        elif event in {'os.rename', 'os.link', 'os.symlink'}:
            targets = values[:2]
        if any(not inside(p) for p in targets):
            metrics['deniedWrites'] += 1
            raise PermissionError('private_profile_writes_only')

    sys.addaudithook(guard)
    import httpx
    import requests
    real_send = httpx.Client.send
    real_requests_send = requests.Session.send

    def inspect(method, url, content):
        nonlocal inference
        try:
            row = request_facts(method, url, content, inference)
        except PermissionError as exc:
            metrics['deniedNetwork'] += 1
            reason = str(exc)
            metrics['deniedRequestReasons'][reason] = metrics['deniedRequestReasons'].get(reason, 0) + 1
            if fixture:
                parsed = urlsplit(str(url))
                label = parsed.path if parsed.hostname == '127.0.0.1' else 'external'
                metrics.setdefault('fixtureDeniedRoutes', []).append(label)
            raise
        if 'model' in row:
            inference += 1
        metrics['requests'].append(row)
        return row

    def send(client, request, **kwargs):
        row = inspect(request.method, request.url, request.content)
        if fixture:
            if row['route'] == '/v1/chat/completions':
                if row['stream']:
                    events = [dict(id='fixture', object='chat.completion.chunk', created=1, model='gpt-oss:20b', choices=[{'index': 0, 'delta': {'role': 'assistant', 'content': 'GOTOWE'}, 'finish_reason': None}]),
                              dict(id='fixture', object='chat.completion.chunk', created=1, model='gpt-oss:20b', choices=[{'index': 0, 'delta': {}, 'finish_reason': 'stop'}])]
                    content = ''.join('data: '+json.dumps(e)+'\n\n' for e in events)+'data: [DONE]\n\n'
                    response = httpx.Response(200, request=request, content=content, headers={'Content-Type': 'text/event-stream'})
                else:
                    response = httpx.Response(200, request=request, json={'id': 'fixture', 'object': 'chat.completion', 'created': 1, 'model': 'gpt-oss:20b', 'choices': [{'index': 0, 'message': {'role': 'assistant', 'content': 'GOTOWE'}, 'finish_reason': 'stop'}], 'usage': {'prompt_tokens': 10, 'completion_tokens': 2, 'total_tokens': 12}})
            else:
                status, payload = fixture_metadata(row['route'])
                response = httpx.Response(status, request=request, json=payload)
        else:
            response = real_send(client, request, **kwargs)
        row['status'] = response.status_code
        return response

    def requests_send(client, request, **kwargs):
        row = inspect(request.method, request.url, request.body or b'')
        if fixture:
            status, payload = fixture_metadata(row['route'])
            response = requests.Response(); response.status_code = status; response._content = json.dumps(payload).encode()
        else:
            response = real_requests_send(client, request, **kwargs)
        row['status'] = response.status_code
        return response

    async def async_send(*args, **kwargs):
        raise PermissionError('unexpected_async_request')

    httpx.Client.send = send
    httpx.AsyncClient.send = async_send
    requests.Session.send = requests_send
    logging.disable(logging.CRITICAL)
    from hermes_cli.config import load_config
    from hermes_cli.fallback_config import get_fallback_chain
    from hermes_cli.runtime_provider import resolve_runtime_provider
    from hermes_cli.tools_config import _get_platform_tools
    from run_agent import AIAgent
    cfg = load_config()
    if get_fallback_chain(cfg) or _get_platform_tools(cfg, 'cli') or cfg['compression']['enabled']:
        raise ValueError('profile_contract')
    runtime = resolve_runtime_provider(requested='custom', target_model='gpt-oss:20b')
    if runtime.get('provider') != 'custom' or runtime.get('base_url', '').rstrip('/') != 'http://127.0.0.1:11434/v1':
        raise ValueError('resolved_route')
    agent = AIAgent(api_key=runtime.get('api_key'), base_url=runtime['base_url'],
        provider='custom', requested_provider='custom', api_mode='chat_completions', model='gpt-oss:20b',
        enabled_toolsets=[], max_iterations=1, max_tokens=256, reasoning_config={'enabled': True, 'effort': 'low'},
        quiet_mode=True, save_trajectories=False, verbose_logging=False,
        skip_context_files=True, skip_memory=True, skip_background_review=True,
        session_db=None, fallback_model=None, checkpoints_enabled=False, platform='cli',
        cwd=os.getcwd(), run_budget_seconds=540)
    # Upstream's helper-agent persistence switch: keep this synthetic turn out of history.
    agent._persist_disabled = True
    agent._skip_mcp_refresh = True
    # This Hermes pin auto-detects the GGUF maximum and otherwise overrides the
    # server's smaller context. Pin the actual per-request setting for this smoke.
    agent._ollama_num_ctx = 2048
    agent.suppress_status_output = True
    if agent.tools or agent.compression_enabled:
        raise ValueError('effective_tools_or_compression')
    start = time.monotonic()
    try:
        result = agent.run_conversation('Odpowiedz dokładnie jednym słowem: GOTOWE. Bez wyjaśnień.')
    finally:
        agent.close()
    answer = str(result.get('final_response') or '').strip()
    correct_answer = answer.rstrip('.!') == 'GOTOWE'
    passed = (correct_answer and result.get('completed') is True and inference == 1
              and metrics['deniedNetwork'] == 0 and metrics['deniedWrites'] == 0)
    metrics.update(result='PASS' if passed else 'BLOCKED', completed=result.get('completed'),
        expectedResponse=correct_answer, responseSha256=hashlib.sha256(answer.encode()).hexdigest(),
        responseCharacters=len(answer), durationSeconds=round(time.monotonic()-start, 3),
        inferenceRequests=inference, tools=0, provider='custom', model='gpt-oss:20b',
        inputTokens=result.get('input_tokens'), outputTokens=result.get('output_tokens'),
        apiCalls=result.get('api_calls'), roostAuthority=False)
    return metrics


if __name__ == '__main__':
    args = json.loads(sys.stdin.read(16384))
    # Upstream startup chatter is discarded, never copied into an artifact or tool output.
    with open(os.devnull, 'w', encoding='utf-8') as sink:
        try:
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                result = run(args)
        except BaseException as exc:
            result = {**METRICS, 'result': 'BLOCKED', 'errorClass': type(exc).__name__}
            if args.get('fixture'):
                result['fixtureFrames'] = [{'file': Path(f.filename).name, 'function': f.name, 'line': f.lineno}
                                           for f in traceback.extract_tb(exc.__traceback__)[-6:]]
    print(json.dumps(result))
    sys.exit(0 if result['result'] == 'PASS' else 1)
