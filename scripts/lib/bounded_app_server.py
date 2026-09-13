"""Worker-owned Linux stdio boundary; opt-in synthetic candidate, no host wiring.

The owner supplies immutable local launch facts and a single sealed input. This
module neither selects providers nor grants authority. Process groups contain
the tested cooperative fork tree, not hostile setsid/namespace escapes.
"""
from collections import deque
from dataclasses import dataclass
import hashlib
import json
import math
import os
from pathlib import Path
import selectors
import signal
import subprocess
import threading
import time


class BoundaryError(RuntimeError):
    pass


@dataclass(frozen=True)
class Limits:
    startup: float = 15
    turn: float = 20
    stop: float = 5
    outer: float = 60
    line: int = 8192
    total: int = 32768

    def __post_init__(self):
        for name, maximum in (("startup", 15), ("turn", 20), ("stop", 5), ("outer", 60),
                              ("line", 8192), ("total", 32768)):
            value = getattr(self, name)
            if isinstance(value, bool) or not math.isfinite(value) or not 0 < value <= maximum:
                raise BoundaryError("limits_invalid")
        if not isinstance(self.line, int) or not isinstance(self.total, int):
            raise BoundaryError("limits_invalid")


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def plain_path(path):
    """Require an absolute existing path without symlink components."""
    p = Path(path)
    if not p.is_absolute() or any(x.is_symlink() for x in (p, *p.parents)):
        raise BoundaryError("path_invalid")
    if p.resolve(strict=True) != p:
        raise BoundaryError("path_invalid")
    return p


def empty_environment(root):
    root = plain_path(root)
    env = {"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8", "LC_ALL": "C.UTF-8",
           "PYTHONDONTWRITEBYTECODE": "1"}
    for key, name in (("HOME", "home"), ("XDG_CONFIG_HOME", "config"),
                      ("XDG_DATA_HOME", "data"), ("XDG_CACHE_HOME", "cache"),
                      ("XDG_STATE_HOME", "state"), ("TMPDIR", "tmp")):
        p = root / name
        p.mkdir(mode=0o700)
        env[key] = str(p)
    return tuple(sorted(env.items()))


@dataclass(frozen=True)
class Launch:
    executable: str
    executable_sha256: str
    script: str
    script_sha256: str
    arguments: tuple
    cwd: str
    environment: tuple

    def verify(self):
        if os.name != "posix" or not Path("/proc/self/stat").exists() or os.getuid() == 0:
            raise BoundaryError("linux_nonroot_required")
        for path, digest in ((self.executable, self.executable_sha256), (self.script, self.script_sha256)):
            if sha(plain_path(path)) != digest:
                raise BoundaryError("launch_drift")
        plain_path(self.cwd)
        env = dict(self.environment)
        required = {"PATH", "LANG", "LC_ALL", "PYTHONDONTWRITEBYTECODE", "HOME",
                    "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME", "XDG_STATE_HOME", "TMPDIR"}
        if len(env) != len(self.environment) or set(env) != required or env["PATH"] != "/usr/bin:/bin":
            raise BoundaryError("environment_invalid")
        if env["LANG"] != "C.UTF-8" or env["LC_ALL"] != "C.UTF-8" or env["PYTHONDONTWRITEBYTECODE"] != "1":
            raise BoundaryError("environment_invalid")
        for key in required - {"PATH", "LANG", "LC_ALL", "PYTHONDONTWRITEBYTECODE"}:
            if any(plain_path(env[key]).iterdir()):
                raise BoundaryError("environment_not_empty")
        if not isinstance(self.arguments, tuple) or not all(isinstance(x, str) for x in self.arguments):
            raise BoundaryError("argv_invalid")


@dataclass(frozen=True)
class Envelope:
    text: str
    digest: str
    model: str
    effort: str

    def verify(self):
        if not isinstance(self.text, str) or not 0 < len(self.text.encode()) <= 131072:
            raise BoundaryError("input_invalid")
        if hashlib.sha256(self.text.encode()).hexdigest() != self.digest:
            raise BoundaryError("input_drift")
        if not self.model or not self.effort:
            raise BoundaryError("model_missing")


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise BoundaryError("json_duplicate_key")
            result[key] = value
        return result
    try:
        return json.loads(raw.decode("utf-8"), object_pairs_hook=pairs,
                          parse_constant=lambda _: (_ for _ in ()).throw(BoundaryError("json_invalid")))
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise BoundaryError("json_invalid") from exc


class BoundedAppServer:
    """Single-use public client interface with independent deadline/tree owner.

    Limits count cumulative inbound wire bytes across both pipes, including bytes
    already delivered. Only bounded raw lines enter the queue. Stderr is counted
    and discarded; it is never rendered or retained as provider text.
    """
    def __init__(self, launch, envelope, *, limits=Limits(), authority=None):
        launch.verify()
        envelope.verify()
        self.launch, self.envelope, self.limits = launch, envelope, limits
        self.authority = authority if authority is not None else threading.Event()
        self.selector = selectors.DefaultSelector()
        self.buffers = {"stdout": bytearray(), "stderr": bytearray()}
        self.notes = deque()
        self.total = self.peak_queued = self.queued = self.max_line = 0
        self.phase, self.reason, self.pending, self.response = "new", None, None, None
        self.thread_id = self.turn_id = None
        self.terminal = self.consumed = self.item_seen = False
        self.started = time.monotonic()
        self.turn_started = None
        self.closed = threading.Event()
        self.stop_lock = threading.Lock()
        self.stop_seconds = None
        self.cleanup_confirmed = False
        self.pid = None
        self.proc = subprocess.Popen([launch.executable, "-I", "-B", launch.script, *launch.arguments],
                                     cwd=launch.cwd, env=dict(launch.environment), stdin=subprocess.PIPE,
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0,
                                     close_fds=True, start_new_session=True)
        self.pid = self.proc.pid  # Dedicated PGID allocated before executable runs.
        try:
            for name in self.buffers:
                stream = getattr(self.proc, name)
                os.set_blocking(stream.fileno(), False)
                self.selector.register(stream, selectors.EVENT_READ, name)
            os.set_blocking(self.proc.stdin.fileno(), False)
        except BaseException:
            self.close()
            self.selector.close()
            for stream in (self.proc.stdin, self.proc.stdout, self.proc.stderr):
                stream.close()
            raise
        self.watchdog = threading.Thread(target=self._watch, daemon=True)
        self.watchdog.start()

    def _deadline_reason(self):
        now = time.monotonic()
        if self.authority.is_set():
            return "authority_lost"
        if now - self.started >= self.limits.outer:
            return "outer_timeout"
        if self.turn_started is None and now - self.started >= self.limits.startup:
            return "startup_timeout"
        if self.turn_started is not None and now - self.turn_started >= self.limits.turn:
            return "turn_timeout"
        return None

    def _watch(self):
        while not self.closed.wait(.01):
            reason = self._deadline_reason()
            if reason:
                self.reason = self.reason or reason
                self.close()
                return

    def _check(self):
        self.reason = self.reason or self._deadline_reason()
        if self.reason:
            raise BoundaryError(self.reason)
        if self.closed.is_set():
            raise BoundaryError("transport_closed")

    def fail(self, reason):
        self.reason = self.reason or reason
        self.close()
        raise BoundaryError(self.reason)

    def _send(self, value):
        self._check()
        raw = json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode() + b"\n"
        # The separate existing input envelope limit is 128 KiB; 8 KiB is inbound.
        if len(raw) > 132096:
            self.fail("request_too_large")
        while raw:
            self._check()
            try:
                count = os.write(self.proc.stdin.fileno(), raw)
                raw = raw[count:]
            except BlockingIOError:
                self.closed.wait(.005)
            except (BrokenPipeError, OSError):
                self.fail("request_pipe_closed")

    def initialize(self, **_client_metadata):
        if self.phase != "new":
            self.fail("protocol_order")
        self.phase = "initialize"
        result = self._rpc("initialize", {"clientInfo": {"name": "worker-synthetic", "version": "1"},
                                           "capabilities": {"experimentalApi": True}}, 1)
        self._send({"jsonrpc": "2.0", "method": "initialized", "params": {}})
        self.phase = "initialized"
        return result

    def request(self, method, params=None, timeout=None):
        self._check()
        if method == "thread/start" and self.phase == "initialized" and params == {"cwd": self.launch.cwd}:
            self.phase = "thread"
            wire = {"cwd": self.launch.cwd, "model": self.envelope.model, "approvalPolicy": "never",
                    "sandbox": "read-only", "ephemeral": True, "dynamicTools": []}
            result = self._rpc(method, wire, 2)
            self.phase = "thread_ready"
            return result
        expected = {"threadId": self.thread_id, "input": [{"type": "text", "text": self.envelope.text}]}
        if method == "turn/start" and self.phase == "thread_ready" and params == expected and not self.consumed:
            self.envelope.verify()
            self.consumed = True
            self.turn_started = time.monotonic()
            self.phase = "turn"
            return self._rpc(method, {**expected, "model": self.envelope.model, "effort": self.envelope.effort}, 3)
        self.fail("request_denied")

    def _rpc(self, method, params, identity):
        self.pending, self.response = identity, None
        self._send({"jsonrpc": "2.0", "id": identity, "method": method, "params": params})
        while self.response is None:
            self._pump(.02)
        response, self.response = self.response, None
        return response

    def _accept(self, raw):
        self._check()
        msg = strict_json(raw)
        if not isinstance(msg, dict) or msg.get("jsonrpc") != "2.0":
            self.fail("protocol_invalid")
        if "id" in msg:
            if set(msg) != {"jsonrpc", "id", "result"} or type(msg["id"]) is not int or msg["id"] != self.pending:
                self.fail("response_invalid")
            result = msg["result"]
            if not isinstance(result, dict):
                self.fail("response_invalid")
            if self.pending == 2:
                thread = result.get("thread")
                if not isinstance(thread, dict):
                    self.fail("thread_missing")
                self.thread_id = thread.get("id")
                if not isinstance(self.thread_id, str) or not self.thread_id:
                    self.fail("thread_missing")
            if self.pending == 3:
                turn = result.get("turn")
                if not isinstance(turn, dict):
                    self.fail("turn_missing")
                self.turn_id = turn.get("id")
                if not isinstance(self.turn_id, str) or not self.turn_id:
                    self.fail("turn_missing")
                self.phase = "running"
            self.pending, self.response = None, result
            return
        if set(msg) != {"jsonrpc", "method", "params"} or self.phase != "running" or self.terminal:
            self.fail("protocol_order")
        params = msg["params"]
        if not isinstance(params, dict) or params.get("threadId") != self.thread_id or params.get("turnId") != self.turn_id:
            self.fail("scope_invalid")
        if msg["method"] == "turn/started":
            if getattr(self, "turn_note_seen", False) or self.item_seen:
                self.fail("protocol_order")
            self.turn_note_seen = True
        elif msg["method"] == "item/completed":
            item = params.get("item")
            if self.item_seen or not isinstance(item, dict) or item.get("type") != "agentMessage" or not isinstance(item.get("text"), str):
                self.fail("item_denied")
            self.item_seen = True
        elif msg["method"] == "item/agentMessage/delta":
            if self.item_seen or not isinstance(params.get("delta"), str):
                self.fail("item_denied")
        elif msg["method"] == "turn/completed":
            turn = params.get("turn")
            if not isinstance(turn, dict) or turn.get("id") != self.turn_id or turn.get("status") != "completed" or turn.get("error") or not self.item_seen:
                self.fail("terminal_invalid")
            self.terminal = True
        else:
            self.fail("notification_denied")
        self.notes.append(raw)
        self.queued += len(raw)
        self.peak_queued = max(self.peak_queued, self.queued)

    def _pump(self, timeout):
        self._check()
        for key, _ in self.selector.select(min(max(timeout, 0), .02)):
            # Read at most remaining budget + one sentinel byte. Sentinel is never queued.
            raw = os.read(key.fileobj.fileno(), min(1024, self.limits.total - self.total + 1,
                                                  self.limits.line - len(self.buffers[key.data]) + 1))
            if not raw:
                self.selector.unregister(key.fileobj)
                if self.buffers[key.data]:
                    self.fail("line_unterminated")
                continue
            if self.total + len(raw) > self.limits.total:
                self.fail("aggregate_overflow")
            self.total += len(raw)
            buffer = self.buffers[key.data]
            for fragment in raw.splitlines(keepends=True):
                if len(buffer) + len(fragment) > self.limits.line:
                    self.fail("line_overflow")
                buffer.extend(fragment)
                self.max_line = max(self.max_line, len(buffer))
                if buffer.endswith(b"\n"):
                    line = bytes(buffer)
                    buffer.clear()
                    if key.data == "stdout":
                        self._accept(line)
        self._check()
        if not self.selector.get_map() and not self.terminal:
            self.fail("terminal_missing")

    def take_notification(self, timeout=0):
        self._check()
        if not self.notes:
            self._pump(timeout)
        if not self.notes:
            return None
        raw = self.notes.popleft()
        self.queued -= len(raw)
        return strict_json(raw)

    def take_server_request(self, timeout=0):
        self._check()
        return None  # Server-initiated requests fail in _accept before Hermes sees them.

    def stderr_tail(self, *_args):
        return []

    def is_alive(self):
        self._check()
        # Drain pipes even after leader exit; an OS exit is never a terminal event.
        return bool(self.notes or self.selector.get_map() or not self._leader_exited())

    def _leader_exited(self):
        # Keep the unreaped leader identity reserved until the group is stopped.
        return os.waitid(os.P_PID, self.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)

    def finish(self):
        self._check()
        while self.selector.get_map() or not self._leader_exited():
            self._pump(.02)
        self._check()
        status = self._leader_exited()
        if not self.terminal or not self.consumed or status.si_code != os.CLD_EXITED or status.si_status != 0:
            self.fail("terminal_missing")
        self.close()
        if not self.cleanup_confirmed or self.reason:
            raise BoundaryError(self.reason or "cleanup_unconfirmed")

    def close(self):
        with self.stop_lock:
            if self.closed.is_set():
                return
            start = time.monotonic()
            deadline = start + self.limits.stop
            # Only the dedicated group allocated by our own Popen is signalled.
            for sig in (signal.SIGTERM, signal.SIGKILL):
                try:
                    os.killpg(self.pid, sig)
                except ProcessLookupError:
                    break
                if sig == signal.SIGTERM:
                    time.sleep(min(.05, self.limits.stop / 4))
            while time.monotonic() < deadline:
                self.proc.poll()
                try:
                    while os.waitpid(-self.pid, os.WNOHANG)[0]:
                        pass
                except ChildProcessError:
                    pass
                try:
                    os.killpg(self.pid, 0)
                except ProcessLookupError:
                    self.cleanup_confirmed = True
                    break
                time.sleep(.005)
            self.stop_seconds = time.monotonic() - start
            if not self.cleanup_confirmed:
                self.reason = self.reason or "cleanup_unconfirmed"
            self.closed.set()

    def dispose(self):
        self.close()
        if threading.current_thread() is not self.watchdog:
            self.watchdog.join(timeout=self.limits.stop)
        self.selector.close()
        for stream in (self.proc.stdin, self.proc.stdout, self.proc.stderr):
            stream.close()
