"""Bounded, offline Docker-save/OCI inventory. Never extracts or executes files.

Library only: the caller supplies a binary stream and the expected manifest digest.
No Docker, subprocess, network or filesystem mutation capability is implemented.
"""
import gzip
import hashlib
import json
import posixpath
import re
import tarfile
from dataclasses import dataclass, asdict


class AuditError(ValueError):
    pass


@dataclass(frozen=True)
class Limits:
    stream_bytes: int = 6 * 1024**3
    expanded_bytes: int = 10 * 1024**3
    file_bytes: int = 1024**3
    entries: int = 300000
    metadata_bytes: int = 192 * 1024**2
    outer_entries: int = 512
    layers: int = 64
    json_bytes: int = 1024**2
    extension_bytes: int = 65536
    path_bytes: int = 4096
    text_file_bytes: int = 32768
    text_total_bytes: int = 512 * 1024
    findings: int = 12000
    link_hops: int = 40


def require(condition, reason):
    if not condition:
        raise AuditError(reason)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def clean_path(name, limit=4096, root_ok=False):
    require(isinstance(name, str) and len(name.encode('utf-8')) <= limit,
            'path limit')
    require(not any(ord(c) < 32 or ord(c) == 127 for c in name), 'control in path')
    require(not name.startswith('/') and '\\' not in name and not re.match(r'^[A-Za-z]:', name),
            'absolute or non-POSIX path: ' + repr(name[:160]))
    parts = name.split('/')
    require('..' not in parts, 'path traversal')
    result = '/'.join(p for p in parts if p and p != '.')
    require(result or root_ok, 'empty path')
    return result


def link_path(path, target, hard=False, limit=4096):
    require(isinstance(target, str) and len(target.encode()) <= limit,
            'link path limit')
    require(target and '\\' not in target and not re.match(r'^[A-Za-z]:', target) and
            not any(ord(c) < 32 or ord(c) == 127 for c in target), 'unsafe link')
    if hard:
        return clean_path(target, limit)
    # Absolute symlinks are anchored to the virtual image root, never the host.
    parts = [] if target.startswith('/') else path.split('/')[:-1]
    for part in target.split('/'):
        if part in ('', '.'):
            continue
        if part == '..':
            require(bool(parts), 'link escapes virtual root')
            parts.pop()
        else:
            parts.append(part)
    return '/'.join(parts)


class Reader:
    def __init__(self, source, limit, budget=None):
        self.source, self.limit, self.budget = source, limit, budget
        self.count = 0
        self.hash = hashlib.sha256()

    def read(self, size=-1):
        require(size >= 0, 'unbounded read')
        data = self.source.read(min(size, 1024 * 1024))
        self.count += len(data)
        require(self.count <= self.limit, 'byte limit')
        if self.budget is not None:
            self.budget['expanded'] += len(data)
            require(self.budget['expanded'] <= self.budget['max_expanded'],
                    'aggregate expanded limit')
        self.hash.update(data)
        return data

    def drain(self, zero_only=False):
        while data := self.read(1024 * 1024):
            require(not zero_only or not any(data), 'nonzero trailing tar data')


class PrefixReader:
    def __init__(self, prefix, source):
        self.prefix, self.source = prefix, source

    def read(self, size=-1):
        require(size >= 0, 'unbounded prefix read')
        if self.prefix:
            part, self.prefix = self.prefix[:size], self.prefix[size:]
            return part
        return self.source.read(size)


def archive(source, limits):
    class Header(tarfile.TarInfo):
        def _proc_pax(self, tf):
            require(self.size <= limits.extension_bytes, 'PAX limit')
            return super()._proc_pax(tf)

        def _proc_gnulong(self, tf):
            require(self.size <= limits.extension_bytes, 'GNU extension limit')
            return super()._proc_gnulong(tf)

        def _proc_sparse(self, tf):
            raise AuditError('sparse archive unsupported')

    return tarfile.open(fileobj=source, mode='r|', tarinfo=Header)


CONTROL = set('docker dockerd docker-compose compose podman podman-remote nerdctl ctr crictl kubectl containerd runc crun buildctl buildkitd'.split())
SYSTEM = set('mount umount nsenter unshare chroot sudo su runuser setpriv capsh getcap setcap ip ifconfig route ss iptables ip6tables nft firewall-cmd ufw apt apt-get apt-cache dpkg apk yum dnf rpm pacman zypper snap ssh sshd ssh-keygen ssh-agent scp sftp systemctl service reboot shutdown busybox'.split())
AGENT = set('codex claude gemini opencode aider goose hermes cursor-agent qwen copilot'.split())
DEV = set('python python3 python3.14 node nodejs npm npx pip pip3 uv uvx git gh curl wget bash sh make gcc cc rustc cargo go'.split())
RELATED_CONTROL = re.compile(r'(^|[/_.-])(docker|dockerd|docker-compose|podman|nerdctl|containerd|crictl|kubectl|buildkit)([/_.-]|$)', re.I)
RELATED_AGENT = re.compile(r'(^|/)(@openai/codex[^/]*|@github/copilot[^/]*|@anthropic-ai/claude-code|@google/gemini-cli|opencode[^/]*|aider[^/]*|hermes[^/]*)(/|$)', re.I)


def policy_candidate(path):
    low = path.lower()
    # /sandbox is the image's workdir, not evidence that all Python libraries
    # below it are security configuration.
    semantic_path = low.removeprefix('sandbox/')
    return (bool(re.search(r'(^|/)(openshell|polic(?:y|ies))([/_.-]|$)', semantic_path))
            or bool(re.search(r'(^|/)(sandbox|agent|network)[^/]*\.(yaml|yml|toml|json|conf)$', semantic_path))
            or low in ('etc/sudoers', 'etc/ssh/sshd_config')
            or low.startswith(('etc/sudoers.d/', 'etc/ssh/sshd_config.d/'))
            or (low.startswith(('etc/', 'opt/', 'home/', 'root/')) and
                bool(re.search(r'(network|agent)[^/]*\.(yaml|yml|toml|json|conf)$', low))))


def text_candidate(path):
    return ((policy_candidate(path) and (path.startswith(('etc/', 'opt/openshell/', 'home/', 'root/'))
                                        or path.endswith(('.yaml', '.yml', '.toml', '.conf'))))
            or (path.startswith('etc/') and RELATED_CONTROL.search(path)))


def categories(path, entry):
    base = posixpath.basename(path)
    result = []
    if base in CONTROL or RELATED_CONTROL.search(path) or RELATED_CONTROL.search(entry.get('target', '')) or base in ('docker.sock', 'containerd.sock', 'podman.sock'):
        result.append('container_control')
    if base in SYSTEM or ('libcap' in base and '.so' in base):
        result.append('system_control')
    if base in AGENT or (RELATED_AGENT.search(path) and entry['kind'] != 'directory' and
                        (entry['mode'] & 0o111 or base in ('package.json', 'cli.js'))):
        result.append('agent')
    if base in DEV and entry['kind'] != 'directory':
        result.append('development')
    if policy_candidate(path):
        result.append('policy_config')
    if entry['mode'] & 0o6000:
        result.append('setuid_setgid')
    if entry.get('capabilityXattr'):
        result.append('file_capability')
    return result


def redact(text):
    text = re.sub(r'(?is)-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----', '[REDACTED PRIVATE KEY]', text)
    text = re.sub(r'(?i)(\b(?:api[_-]?key|token|password|secret|authorization)\b\s*[:=]\s*)[^\r\n]+', r'\1[REDACTED]', text)
    text = re.sub(r'\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]{16,}', '[REDACTED]', text)
    text = re.sub(r'(https?://)[^/\s:@]+:[^/\s@]+@', r'\1[REDACTED]@', text)
    return text


class Audit:
    def __init__(self, limits=Limits()):
        self.limits = limits
        self.budget = {'expanded': 0, 'max_expanded': limits.expanded_bytes,
                       'entries': 0, 'metadata': 0, 'text': 0}
        self.layers = {}
        self.blobs = {}
        self.jsons = {}

    def layer(self, source):
        l = self.limits
        reader = Reader(source, l.expanded_bytes, self.budget)
        entries, whiteouts, opaque = {}, [], []
        with archive(reader, l) as tf:
            for member in tf:
                tf.members.clear()
                self.budget['entries'] += 1
                require(self.budget['entries'] <= l.entries, 'entry limit')
                path = clean_path(member.name, l.path_bytes, root_ok=member.isdir())
                require(not member.sparse and not any('sparse' in k.lower() for k in member.pax_headers), 'sparse unsupported')
                require(0 <= member.size <= l.file_bytes, 'file size limit')
                if not path:
                    continue
                base = posixpath.basename(path)
                if base.startswith('.wh.'):
                    require(member.isreg() and member.size == 0, 'invalid whiteout')
                    if base == '.wh..wh..opq':
                        opaque.append(posixpath.dirname(path))
                    else:
                        target = base[4:]
                        require(target not in ('', '.', '..') and not target.startswith('.wh.'), 'invalid whiteout target')
                        whiteouts.append(posixpath.join(posixpath.dirname(path), target))
                    self.budget['metadata'] += len(path.encode()) + 256
                    require(self.budget['metadata'] <= l.metadata_bytes, 'whiteout metadata limit')
                    continue
                require(path not in entries or (member.isdir() and entries[path]['kind'] == 'directory'), 'duplicate layer path')
                e = {'kind': '', 'mode': member.mode, 'uid': member.uid, 'gid': member.gid, 'size': member.size}
                if member.isdir():
                    e['kind'] = 'directory'
                elif member.issym() or member.islnk():
                    e['kind'] = 'symlink' if member.issym() else 'hardlink'
                    e['target'] = member.linkname
                    e['virtualTarget'] = link_path(path, member.linkname, member.islnk(), l.path_bytes)
                    e['linkSha256'] = sha(member.linkname.encode())
                elif member.isreg():
                    e['kind'] = 'file'
                    content = tf.extractfile(member)  # read stream only; never extract()
                    digest = hashlib.sha256()
                    package = bool(RELATED_AGENT.search(path)) and base == 'package.json'
                    capture = (text_candidate(path) or package) and member.size <= l.text_file_bytes
                    if capture:
                        self.budget['text'] += member.size
                        require(self.budget['text'] <= l.text_total_bytes, 'text aggregate limit')
                    chunks, magic, total = [], b'', 0
                    while block := content.read(1024 * 1024):
                        digest.update(block)
                        total += len(block)
                        if not magic:
                            magic = block[:4]
                        if capture:
                            chunks.append(block)
                    require(total == member.size, 'truncated member')
                    e['sha256'] = digest.hexdigest()
                    e['format'] = 'ELF' if magic == b'\x7fELF' else 'script' if magic[:2] == b'#!' else 'other'
                    if capture:
                        raw = b''.join(chunks)
                        try:
                            text = raw.decode('utf-8')
                            if '\x00' not in text:
                                if package:
                                    data = json.loads(text)
                                    e['packageMetadata'] = safe_value({k: data[k] for k in ('name', 'version', 'bin') if k in data})
                                else:
                                    e['text'] = redact(text)
                        except UnicodeDecodeError:
                            pass
                elif member.ischr() or member.isblk() or member.isfifo():
                    # Inert metadata, never mknod/open/follow on the host.
                    e['kind'] = 'char_device' if member.ischr() else 'block_device' if member.isblk() else 'fifo'
                    e['device'] = [member.devmajor, member.devminor]
                else:
                    raise AuditError('unsupported member type')
                caps = {k: sha(v.encode()) for k, v in member.pax_headers.items() if 'security.capability' in k}
                if caps:
                    e['capabilityXattr'] = caps
                entries[path] = e
                self.budget['metadata'] += len(path.encode()) + len(json.dumps(e).encode()) + 256
                require(self.budget['metadata'] <= l.metadata_bytes, 'metadata limit')
            require(not any(tf.fileobj.buf), 'nonzero buffered trailing tar data')
        reader.drain(zero_only=True)
        return {'diffId': 'sha256:' + reader.hash.hexdigest(), 'bytes': reader.count,
                'entries': entries, 'whiteouts': sorted(set(whiteouts)), 'opaque': sorted(set(opaque))}

    def read(self, source, expected_digest):
        l = self.limits
        reader = Reader(source, l.stream_bytes)
        seen = set()
        with archive(reader, l) as tf:
            for member in tf:
                tf.members.clear()
                name = clean_path(member.name, l.path_bytes, member.isdir())
                require(len(seen) < l.outer_entries, 'outer entry limit')
                require(name not in seen, 'duplicate outer member')
                seen.add(name)
                if member.isdir():
                    continue
                require(member.isreg() and not member.sparse, 'outer link/device/sparse')
                require(0 <= member.size <= l.stream_bytes, 'outer size limit')
                raw = Reader(tf.extractfile(member), l.stream_bytes)
                prefix = raw.read(min(512, member.size))
                stream = PrefixReader(prefix, raw)
                if prefix.startswith((b'{', b'[')) and member.size <= l.json_bytes:
                    chunks = []
                    while block := stream.read(l.json_bytes):
                        chunks.append(block)
                    obj = json.loads(b''.join(chunks))
                    self.jsons[name] = obj
                else:
                    require(prefix[:2] == b'\x1f\x8b' or prefix[257:262] == b'ustar' or
                            (prefix and not any(prefix)), 'unknown blob format')
                    require(len(self.layers) < l.layers, 'layer count limit')
                    decoded = gzip.GzipFile(fileobj=stream) if prefix[:2] == b'\x1f\x8b' else stream
                    self.layers[name] = self.layer(decoded)
                raw.drain()
                require(raw.count == member.size, 'truncated outer member')
                digest = 'sha256:' + raw.hash.hexdigest()
                if name.startswith('blobs/sha256/'):
                    require(name == 'blobs/sha256/' + digest[7:], 'blob digest mismatch')
                self.blobs[name] = {'digest': digest, 'size': raw.count}
            require(not any(tf.fileobj.buf), 'nonzero buffered outer trailing data')
        reader.drain(zero_only=True)
        manifest_name = 'blobs/sha256/' + expected_digest.removeprefix('sha256:')
        require(manifest_name in self.jsons, 'pinned manifest missing')
        manifest = self.jsons[manifest_name]
        require(self.blobs[manifest_name]['digest'] == expected_digest, 'manifest mismatch')
        require(manifest.get('schemaVersion') == 2, 'unsupported manifest')
        def descriptor(d):
            require(re.fullmatch(r'sha256:[0-9a-f]{64}', d.get('digest', '')), 'bad descriptor digest')
            n = 'blobs/sha256/' + d['digest'][7:]
            require(n in self.blobs and self.blobs[n] == {'digest': d['digest'], 'size': d['size']}, 'descriptor mismatch')
            return n
        config = self.jsons[descriptor(manifest['config'])]
        require(config.get('os') == 'linux' and config.get('architecture') == 'amd64', 'platform mismatch')
        names = [descriptor(d) for d in manifest['layers']]
        require(len(names) == len(set(names)) and set(names) == set(self.layers), 'unexpected or duplicate layers')
        require(config.get('rootfs', {}).get('type') == 'layers', 'rootfs type')
        require(config['rootfs']['diff_ids'] == [self.layers[n]['diffId'] for n in names], 'diff ID mismatch')
        view = {}
        for index, name in enumerate(names):
            apply_layer(view, self.layers[name], index, l)
        result = inventory(view, l)
        c = config.get('config', {})
        result.update({'expectedDigest': expected_digest, 'manifestVerified': True,
                       'configDigest': manifest['config']['digest'], 'platform': 'linux/amd64',
                       'layers': [{**self.blobs[n], 'diffId': self.layers[n]['diffId'],
                                   'expandedBytes': self.layers[n]['bytes'], 'entries': len(self.layers[n]['entries']),
                                   'whiteouts': len(self.layers[n]['whiteouts']), 'opaque': len(self.layers[n]['opaque'])} for n in names],
                       'imageConfig': {'user': c.get('User'), 'entrypoint': safe_value(c.get('Entrypoint')),
                                       'cmd': safe_value(c.get('Cmd')), 'envNames': sorted(x.split('=', 1)[0] for x in c.get('Env', [])),
                                       'workingDir': c.get('WorkingDir'), 'labels': safe_value(c.get('Labels', {})),
                                       'volumes': sorted((c.get('Volumes') or {}).keys()),
                                       'ports': sorted((c.get('ExposedPorts') or {}).keys()), 'rootfsDiffIds': config['rootfs']['diff_ids']},
                       'limits': asdict(l), 'usage': {**self.budget, 'streamBytes': reader.count},
                       'streamSha256': reader.hash.hexdigest(), 'complete': True})
        return result


def safe_value(value):
    if isinstance(value, str):
        return redact(value)
    if isinstance(value, list):
        return [safe_value(v) for v in value]
    if isinstance(value, dict):
        return {k: '[REDACTED]' if re.search(r'token|secret|password|credential|api.?key', k, re.I) else safe_value(v) for k, v in sorted(value.items())}
    return value


def apply_layer(view, layer, index=0, limits=Limits()):
    lower = dict(view)
    # Whiteouts only remove lower-layer entries, regardless of tar member order.
    for target in layer['whiteouts'] + layer['opaque']:
        parts = target.split('/')
        for end in range(1, len(parts)):
            parent = '/'.join(parts[:end])
            require(parent not in lower or lower[parent]['kind'] == 'directory', 'whiteout through non-directory/link parent')
    for target in layer['whiteouts']:
        for p in list(view):
            if p == target or p.startswith(target + '/'):
                del view[p]
    for target in layer['opaque']:
        for p in list(view):
            if (not target or p.startswith(target + '/')) and p in lower:
                del view[p]
    for path, original in layer['entries'].items():
        e = dict(original, layer=index)
        parts = path.split('/')
        for end in range(1, len(parts)):
            parent = '/'.join(parts[:end])
            require(parent not in view or view[parent]['kind'] == 'directory', 'write through non-directory/link parent')
            if parent not in view:
                view[parent] = {'kind': 'directory', 'mode': 0, 'uid': 0, 'gid': 0, 'size': 0, 'layer': index, 'implicit': True}
        if path in view and view[path]['kind'] == 'directory' and e['kind'] != 'directory':
            for p in list(view):
                if p.startswith(path + '/'):
                    del view[p]
        if e['kind'] == 'hardlink':
            target = view.get(e['virtualTarget'])
            require(target is not None and target['kind'] in ('file', 'hardlink'), 'unresolved/nonregular hardlink')
            e.update({k: v for k, v in target.items() if k in ('sha256', 'size', 'format', 'text', 'mode', 'uid', 'gid', 'capabilityXattr')})
        view[path] = e
        require(len(view) <= limits.entries, 'final path limit')


def resolve(view, path, hops=40):
    visited = set()
    for _ in range(hops):
        require(path not in visited, 'symlink cycle')
        visited.add(path)
        parts = path.split('/') if path else []
        for end in range(1, len(parts) + 1):
            key = '/'.join(parts[:end])
            e = view.get(key)
            if e and e['kind'] == 'symlink':
                path = '/'.join(p for p in (e['virtualTarget'], '/'.join(parts[end:])) if p)
                break
        else:
            return path, view.get(path)
    raise AuditError('symlink hop limit')


def inventory(view, limits):
    findings, texts, kinds, path_hasher = [], [], {}, hashlib.sha256()
    for path, entry in sorted(view.items()):
        kinds[entry['kind']] = kinds.get(entry['kind'], 0) + 1
        public = {k: v for k, v in entry.items() if k != 'text'}
        path_hasher.update((json.dumps([path, public], sort_keys=True, separators=(',', ':')) + '\n').encode())
        cats = categories(path, entry)
        if cats:
            require(len(findings) < limits.findings, 'finding limit')
            item = {'path': '/' + path, 'categories': cats, **public}
            if entry['kind'] == 'symlink':
                try:
                    resolved, target = resolve(view, path, limits.link_hops)
                    item['resolvedPath'] = '/' + resolved
                    item['resolvedKind'] = target['kind'] if target else 'missing'
                    item['resolvedSha256'] = target.get('sha256') if target else None
                except AuditError as error:
                    item['resolutionError'] = str(error)
            findings.append(item)
            if 'text' in entry:
                texts.append({'path': '/' + path, 'sha256': entry['sha256'], 'text': entry['text']})
    probes = {}
    for command in sorted(CONTROL | SYSTEM | AGENT | DEV):
        exact = ['/' + p for p, e in sorted(view.items()) if posixpath.basename(p) == command and e['kind'] != 'directory']
        probes[command] = {'presentBasenames': exact, 'executableCandidates': [p for p in exact if view[p[1:]]['mode'] & 0o111 or view[p[1:]]['kind'] == 'symlink'],
                           'absenceScope': 'exact basename in reconstructed filesystem; not renamed/embedded/dynamic functionality' if not exact else None}
    socket_probes = {}
    for path in ('var/run/docker.sock', 'run/docker.sock', 'run/containerd/containerd.sock', 'run/podman/podman.sock'):
        resolved, target = resolve(view, path, limits.link_hops)
        socket_probes['/' + path] = {'resolvedPath': '/' + resolved, 'kind': target['kind'] if target else 'missing'}
    return {'finalPaths': len(view), 'kinds': kinds, 'finalMetadataSha256': path_hasher.hexdigest(),
            'findings': findings, 'texts': texts, 'commandProbes': probes,
            'socketPathProbes': socket_probes,
            'specialNodes': [{'path': '/' + p, **e} for p, e in sorted(view.items()) if e['kind'] in ('char_device', 'block_device', 'fifo')]}
