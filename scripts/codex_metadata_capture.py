"""RF011 bounded public metadata capture. No automatic redirects, retries or payload routes."""
import hashlib
import http.client
import json
import os
import pathlib
import re
import socket
import ssl
import threading
import time
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit

BUDGET = {'maxRequests':12, 'maxTotalBytes':1048576, 'maxResponseBytes':131072,
          'requestTimeoutSeconds':20, 'maxRetries':0}
LEDGER = pathlib.Path(__file__).resolve().parents[1] / 'docs/architecture/codex-source-metadata-ledger-v1.json'


def allowed(url):
    p = urlsplit(url)
    if p.scheme != 'https' or p.username or p.password or p.fragment or p.port not in (None,443):
        return False
    path = unquote(p.path)
    if len(url) > 600 or re.search(r'[\x00-\x20\\]|(?:^|/)\.\.(?:/|$)', path):
        return False
    if re.search(r'(?i)(/releases/download/|/tarball/|/zipball/|\.tgz$|\.tar(?:\.gz|\.zst)?$|\.zip$|\.exe$)', path):
        return False
    if p.hostname in ('learn.chatgpt.com','developers.openai.com','platform.openai.com'):
        return path.startswith(('/docs/','/codex/')) and not p.query
    if p.hostname == 'github.com':
        return bool(re.fullmatch(r'/openai/codex/releases/(latest|tag/[A-Za-z0-9._-]+)',path)) and not p.query
    if p.hostname == 'raw.githubusercontent.com':
        return bool(re.fullmatch(r'/openai/codex/[A-Za-z0-9._-]+/(README\.md|codex-rs/app-server/README\.md|codex-rs/Cargo\.toml|\.github/workflows/[A-Za-z0-9._-]+\.yml)', path)) and not p.query
    if p.hostname == 'api.github.com':
        return path.startswith('/repos/openai/codex/') and not re.search(r'/contents/|/commits/.*/',path) and (not p.query or bool(re.fullmatch(r'(?:per_page=[1-9][0-9]?|page=[1-9][0-9]?)(?:&(?:per_page=[1-9][0-9]?|page=[1-9][0-9]?))*',p.query)))
    if p.hostname == 'registry.npmjs.org':
        # Package distribution is named by the official README; never allow tarballs.
        return bool(re.fullmatch(r'(?:/@openai/codex/[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?|/-/npm/v1/attestations/@openai/codex@[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?|/-/npm/v1/keys)',path)) and not p.query
    return False


class HttpResponse:
    def __init__(self, url, method, timeout):
        p = urlsplit(url)
        self.connection = http.client.HTTPSConnection(p.hostname, timeout=timeout, context=ssl.create_default_context())
        self.response = None
        self.expired = False
        self.timer = threading.Timer(timeout, self.abort)
        self.timer.daemon = True
        self.timer.start()
        try:
            target = p.path + ('?' + p.query if p.query else '')
            self.connection.request(method, target, headers={'User-Agent':'Roost-source-metadata-research','Accept':'application/vnd.github+json' if p.hostname=='api.github.com' else 'text/plain','Accept-Encoding':'identity','Connection':'close'})
            self.response = self.connection.getresponse()
            self.status = self.response.status
        except BaseException:
            self.close()
            raise

    def abort(self):
        self.expired = True
        sockets = [self.connection.sock]
        if self.response is not None:
            try:
                sockets.append(self.response.fp.raw._sock)
            except AttributeError:
                pass
        for current in sockets:
            if current is not None:
                try:
                    current.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
        self.connection.close()

    def getheader(self, name):
        return self.response.getheader(name)

    def read1(self, size):
        return self.response.read1(size)

    def close(self):
        self.timer.cancel()
        if self.response is not None:
            self.response.close()
        self.connection.close()


class Capture:
    def __init__(self, path=LEDGER, transport=HttpResponse):
        self.path, self.transport = pathlib.Path(path), transport
        if self.path.exists():
            self.ledger = json.loads(self.path.read_text(encoding='utf-8'))
            if self.ledger['taskId'] != 'RF-HERMES-011' or self.ledger['budget'] != BUDGET:
                raise ValueError('ledger_identity')
            if any(r['outcome'] in ('started','reading') or r['readInFlightMax'] for r in self.ledger['requests']):
                raise ValueError('unfinished_request_no_retry')
        else:
            self.ledger = {'schemaId':'roost-codex-source-metadata-ledger-v1','taskId':'RF-HERMES-011','budget':dict(BUDGET),'requests':[],'halted':False}

    def save(self):
        data = json.dumps(self.ledger, indent=2) + '\n'
        if len(data.encode()) > 32768:
            raise ValueError('ledger_size')
        temporary = self.path.with_suffix('.pending')
        with temporary.open('w', encoding='utf-8', newline='\n') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, self.path)

    def request(self, url, method='GET', category='metadata'):
        if not allowed(url) or method not in ('GET','HEAD') or category not in ('documentation','discovery','metadata','manifest','schema-listing'):
            raise ValueError('request_scope')
        used = sum(r['bytesRead'] for r in self.ledger['requests'])
        if self.ledger['halted'] or self.ledger.get('closed',False) or len(self.ledger['requests']) >= BUDGET['maxRequests'] or used >= BUDGET['maxTotalBytes']:
            raise ValueError('budget_closed')
        row = {'ordinal':len(self.ledger['requests'])+1,'url':url,'method':method,'category':category,
               'readAt':datetime.now(timezone.utc).isoformat(),'status':None,'redirectCount':0,
               'redirectTo':None,'redirectTargetAllowed':None,'contentLength':None,
               'bytesRead':0,'sha256':hashlib.sha256(b'').hexdigest(),'readInFlightMax':0,
               'outcome':'started','limitResult':'pending','complete':False,'elapsedMillis':None}
        self.ledger['requests'].append(row)
        self.save()  # Reserve before transport; a killed request cannot disappear.
        response, chunks, hasher = None, [], hashlib.sha256()
        started = time.monotonic()
        try:
            response = self.transport(url, method, BUDGET['requestTimeoutSeconds'])
            row['status'] = response.status
            length = response.getheader('Content-Length')
            if length is not None:
                if not re.fullmatch(r'[0-9]{1,16}', length):
                    raise ValueError('invalid_content_length')
                row['contentLength'] = int(length)
            redirect = response.status in (301,302,303,307,308)
            if redirect:
                row['redirectCount'] = 1
                target = response.getheader('Location')
                row['redirectTargetAllowed'] = bool(target and allowed(target))
                row['redirectTo'] = target if row['redirectTargetAllowed'] else None
            row['outcome'] = 'reading'
            self.save()  # Status and declared length are durable before reading.
            maximum = min(BUDGET['maxResponseBytes'], BUDGET['maxTotalBytes']-used)
            if method != 'HEAD' and row['contentLength'] is not None and row['contentLength'] > maximum:
                raise ValueError('over_limit')
            if method != 'HEAD' and response.getheader('Content-Encoding') not in (None,'identity'):
                raise ValueError('encoded_body_denied')
            if method != 'HEAD':
                while True:
                    remaining = maximum-row['bytesRead']
                    if remaining == 0:
                        if row['contentLength'] == row['bytesRead']:
                            break
                        raise ValueError('over_limit')
                    if time.monotonic()-started >= BUDGET['requestTimeoutSeconds']:
                        raise ValueError('request_timeout')
                    row['readInFlightMax'] = min(16384,remaining)
                    self.save()
                    chunk = response.read1(row['readInFlightMax'])
                    row['readInFlightMax'] = 0
                    if chunk:
                        row['bytesRead'] += len(chunk)
                        hasher.update(chunk)
                        chunks.append(chunk)
                        row['sha256'] = hasher.hexdigest()
                    self.save()  # Every delivered read is counted before parsing.
                    if not chunk:
                        break
                if row['contentLength'] is not None and row['contentLength'] != row['bytesRead']:
                    raise ValueError('incomplete_body')
            if time.monotonic()-started >= BUDGET['requestTimeoutSeconds']:
                raise ValueError('request_timeout')
            row['complete'] = True
            row['outcome'] = 'redirect' if redirect else 'complete' if response.status == 200 else 'http_error'
            row['limitResult'] = 'within_limit'
            if redirect and not row['redirectTargetAllowed']:
                row['outcome'] = 'redirect_denied'
        except Exception as error:
            row['outcome'] = str(error) if isinstance(error,ValueError) else 'transport_error'
            row['limitResult'] = 'over_limit' if row['outcome']=='over_limit' else 'failed'
            self.ledger['halted'] = True
        finally:
            if response is not None:
                response.close()
            row['elapsedMillis'] = round((time.monotonic()-started)*1000)
            self.save()
        if row['outcome'] != 'complete':
            return None, dict(row)
        return b''.join(chunks), dict(row)
