"""Offline examination of the pinned public client, never an inference launcher.

The Node test creates an empty temporary working directory and supplies a sealed
synthetic envelope on stdin. The executable is this interpreter, not Codex.
"""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import sys
import subprocess
import time

stage = "import"

def main():
    global stage
    checkout = sys.argv[1]
    request = json.load(sys.stdin)
    # Only the already attested checkout is added; isolated Python ignores user
    # site and PYTHONPATH. No AIAgent, session runner or tool registry is started.
    sys.path.insert(0, checkout)

    def audit(event, args):
        # platform.system() reads the local hostname; it performs no network I/O.
        if event.startswith("socket.") and event != "socket.gethostname":
            raise RuntimeError("offline_network_denied")
        if event == "subprocess.Popen":
            expected = subprocess.list2cmdline([sys.executable, "app-server"])
            if args[0] not in (None, sys.executable) or args[1] != expected:
                raise RuntimeError("offline_process_denied")
    sys.addaudithook(audit)
    from agent.transports.codex_app_server import CodexAppServerClient
    stage = "spawn"
    client = CodexAppServerClient(codex_bin=sys.executable)
    child_handle = None
    try:
        stage = "initialize"
        client.initialize(timeout=3)
        stage = "thread"
        thread = client.request("thread/start", {"ephemeral": True, "dynamicTools": [],
            "model": request["modelSelection"]["model"], "approvalPolicy": "never",
            "sandbox": "read-only"}, timeout=3)
        stage = "turn"
        result = client.request("turn/start", {"threadId": thread["thread"]["id"],
            "input": [{"type": "text", "text": request["input"]}],
            "model": request["modelSelection"]["model"],
            "effort": request["modelSelection"]["reasoningEffort"]}, timeout=3)
        assert result["turn"]["id"] == "synthetic-turn"
        stage = "probe"
        probe = client.request("boundary/probe", timeout=3)
        stage = "capture"
        notes = []
        until = time.monotonic() + 3
        while time.monotonic() < until:
            note = client.take_notification(timeout=.05)
            if note:
                notes.append(note)
            if any(n["method"] == "boundary/oversize" for n in notes) and client.stderr_tail():
                break
        oversized = next(n for n in notes if n["method"] == "boundary/oversize")
        payload_bytes = len(oversized["params"]["payload"].encode())
        stderr_bytes = sum(len(line.encode()) for line in client.stderr_tail())
        # A short-lived synthetic grandchild proves close() is not a tree fence.
        stage = "tree"
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
        kernel.OpenProcess.restype = ctypes.c_void_p
        kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        child_handle = kernel.OpenProcess(0x00100000, False, probe["descendantPid"])
        assert child_handle
        client.close()
        descendant_survived = kernel.WaitForSingleObject(child_handle, 0) == 258
        # Fixture child self-expires; no orphan is retained and no arbitrary PID
        # killing or production process enumeration is needed.
        assert kernel.WaitForSingleObject(child_handle, 6000) == 0
        stage = "wire"
        wire = json.loads(Path("wire-summary.json").read_text())
        assert wire["inputSha256"] == hashlib.sha256(request["input"].encode()).hexdigest()
        assert wire["modelSelection"] == request["modelSelection"]
        assert wire["methods"] == ["initialize", "initialized", "thread/start", "turn/start", "boundary/probe"]
        print(json.dumps({"wire": wire, "notificationPayloadBytesAccepted": payload_bytes,
            "stderrBytesRetained": stderr_bytes, "descendantSurvivedClientClose": descendant_survived,
            "descendantExitConfirmed": True, "liveInference": False}))
    finally:
        client.close()
        if child_handle:
            kernel.WaitForSingleObject(child_handle, 6000)
            kernel.CloseHandle(child_handle)


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        # Never forward an upstream traceback, local path or config to the test log.
        print(json.dumps({"error": "hermes_offline_boundary_probe_failed", "stage": stage}))
        sys.exit(1)
