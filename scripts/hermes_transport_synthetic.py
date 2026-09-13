"""Explicit Linux/non-root offline acceptance suite; never registered as a runner.

Launch with the system interpreter's -I -S -B flags. An operator supplies a private
installation receipt hash and fresh owned run directory. No install/reseal mode.
"""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import sys
import threading
import time

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from bounded_app_server import BoundedAppServer, BoundaryError, Envelope, Launch, Limits, empty_environment, plain_path, sha
from hermes_install_attestation import verify


EXPECTED = {
    "positive": "pass", "line_overflow": "line_overflow", "aggregate_overflow": "aggregate_overflow",
    "notification_flood": "aggregate_overflow", "stderr_flood": "aggregate_overflow",
    "malformed_json": "json_invalid", "wrong_order": "protocol_order", "unknown_terminal": "terminal_invalid",
    "missing_status": "terminal_invalid", "two_completions": "protocol_order", "startup_hang": "startup_timeout",
    "turn_hang": "turn_timeout", "outer_hang": "outer_timeout", "descendant": "authority_lost",
    "missing_terminal": "terminal_missing", "late_terminal": "authority_lost", "server_request": "response_invalid",
    "wrong_scope": "scope_invalid", "nonzero_exit": "terminal_missing", "truncated_line": "line_unterminated",
    "duplicate_key": "json_duplicate_key", "duplicate_consumption": "request_denied", "policy_drift": "request_denied",
    "stalled_callback": "outer_timeout", "input_drift": "input_drift", "executable_drift": "launch_drift",
    "script_drift": "launch_drift", "environment_drift": "environment_invalid", "no_read": "startup_timeout",
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--installation", required=True, type=Path)
    parser.add_argument("--receipt-sha256", required=True)
    parser.add_argument("--run-root", required=True, type=Path)
    parser.add_argument("--case", choices=tuple(EXPECTED))
    parser.add_argument("--boundary-only", action="store_true",
                        help="Test the independent Worker transport without importing Hermes; cannot produce Hermes READY")
    args = parser.parse_args()
    if not sys.flags.isolated or not sys.flags.no_site or not sys.dont_write_bytecode or os.getuid() == 0:
        raise RuntimeError("isolated_nonroot_interpreter_required")
    run_root = plain_path(args.run_root)
    installation = plain_path(args.installation)
    if run_root.parent != installation / "runs" or not run_root.name.startswith("synthetic-"):
        raise RuntimeError("owned_run_root_required")
    # No user home or inherited provider variables are permitted in this process.
    expected_env_names = {"HOME", "PATH", "LANG", "LC_ALL", "PYTHONDONTWRITEBYTECODE", "XDG_CONFIG_HOME",
                          "XDG_DATA_HOME", "XDG_CACHE_HOME", "XDG_STATE_HOME", "TMPDIR"}
    if set(os.environ) != expected_env_names:
        raise RuntimeError("harness_environment_invalid")
    for key in expected_env_names - {"PATH", "LANG", "LC_ALL", "PYTHONDONTWRITEBYTECODE"}:
        path = plain_path(os.environ[key])
        if not path.is_relative_to(run_root) or any(path.iterdir()):
            raise RuntimeError("harness_home_not_fresh")
    installed = verify(installation, args.receipt_sha256)
    # Linux subreaper is local to this disposable harness process. No services or
    # global process settings. Adopt/reap only our own fixed fake's fork child.
    if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0):
        raise RuntimeError("subreaper_unavailable")

    permitted_spawn = None
    audit_denials = []
    import_writes = []
    importing = True
    module_before = set(sys.modules)

    def audit(event, values):
        nonlocal permitted_spawn
        if event.startswith("socket.") and event != "socket.gethostname":
            audit_denials.append("network")
            raise RuntimeError("offline_network_denied")
        if event == "subprocess.Popen":
            executable, argv, cwd, env = values
            if permitted_spawn != (executable, argv, cwd, env):
                audit_denials.append("process")
                raise RuntimeError("unowned_process_denied")
            permitted_spawn = None
        if event == "open" and not isinstance(values[0], int):
            path = Path(os.fsdecode(values[0])).absolute()
            flags = values[2]
            writing = bool(flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND))
            if writing and importing:
                import_writes.append("write")
                raise RuntimeError("import_write_denied")
            if not (path.is_relative_to(installation / "source") or path.is_relative_to(installation / "venv")
                    or path.is_relative_to(run_root) or path.is_relative_to(Path("/usr"))
                    or path.is_relative_to(Path(__file__).resolve().parent) or str(path) in {"/etc/os-release", "/dev/null"}):
                audit_denials.append("file")
                raise RuntimeError("unapproved_read_denied")
        if importing and event in {"os.mkdir", "os.remove", "os.rename", "os.rmdir"}:
            import_writes.append("mutation")
            raise RuntimeError("import_mutation_denied")

    sys.addaudithook(audit)
    # Verified editable source + installed dependencies, without running .pth or
    # sitecustomize code. No upstream source patch, shim module or private API.
    site = installation / "venv" / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages"
    if not args.boundary_only:
        sys.path.extend([str(site), str(installation / "source")])
        signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(RuntimeError("import_timeout")))
        signal.alarm(15)
        try:
            from agent.transports.codex_app_server_session import CodexAppServerSession
            from importlib.metadata import version
            if version("hermes-agent") != "0.21.2":
                raise RuntimeError("installed_version_drift")
        finally:
            signal.alarm(0)
    importing = False
    imported = sorted(name for name in set(sys.modules) - module_before
                      if name.startswith(("agent", "hermes", "tools", "gateway", "run_agent")))
    if audit_denials or import_writes or "run_agent" in sys.modules or "tools.registry" in sys.modules:
        print(json.dumps({"stage": "import", "auditDenials": audit_denials, "importWrites": import_writes,
                          "importedModules": imported}), flush=True)
        raise RuntimeError("import_surface_blocked")

    script = plain_path(Path(__file__).resolve().parent / "fixtures" / "bounded_fake_app_server.py")
    interpreter = installed["interpreter"]
    text = "SYNTHETIC ENVELOPE"
    envelope = Envelope(text, hashlib.sha256(text.encode()).hexdigest(), "synthetic-model", "low")
    results = []
    for name in ([args.case] if args.case else EXPECTED):
        case_root = run_root / name
        case_root.mkdir(mode=0o700)
        env = empty_environment(case_root)
        cwd = case_root / "repo"
        cwd.mkdir(mode=0o700)
        # Minimal empty Git repository, no clone, hooks, worktree, or Git process.
        (cwd / ".git" / "objects").mkdir(parents=True)
        (cwd / ".git" / "refs" / "heads").mkdir(parents=True)
        (cwd / ".git" / "HEAD").write_text("ref: refs/heads/synthetic\n")
        launch = Launch(interpreter, installed["interpreterSha256"], str(script), sha(script),
                        (name if name in {"positive", *EXPECTED.keys()} - {"duplicate_consumption", "policy_drift", "stalled_callback", "input_drift", "executable_drift", "script_drift", "environment_drift"} else "positive",), str(cwd), env)
        limits = Limits(outer=.3) if name in {"outer_hang", "stalled_callback"} else Limits()
        if name == "no_read":
            limits = Limits(startup=.3)
        authority = threading.Event()
        client = None
        session = None
        probe = None
        child_seen = False
        begin = time.monotonic()
        outcome = "pass"
        preflight = name in {"input_drift", "executable_drift", "script_drift", "environment_drift"}
        try:
            from dataclasses import replace
            task_input = envelope
            if name == "input_drift":
                task_input = replace(envelope, digest="0" * 64)
            if name == "executable_drift":
                launch = replace(launch, executable_sha256="0" * 64)
            if name == "script_drift":
                launch = replace(launch, script_sha256="0" * 64)
            if name == "environment_drift":
                launch = replace(launch, environment=(*env, ("UNAPPROVED_NAME", "synthetic")))
            permitted_spawn = (launch.executable, [launch.executable, "-I", "-B", launch.script, *launch.arguments],
                               launch.cwd, dict(launch.environment))
            client = BoundedAppServer(launch, task_input, limits=limits, authority=authority)
            original_initialize = client.initialize

            # Adapter uses the upstream public client_factory surface only.
            # This local subclass avoids changing any upstream implementation.
            class SessionClient:
                def __getattr__(self, attr):
                    return getattr(client, attr)

                def initialize(self, **kwargs):
                    nonlocal probe
                    probe = original_initialize(**kwargs)
                    assert probe["environmentNames"] == sorted(dict(env))
                    assert probe["cwdSha256"] == hashlib.sha256(str(cwd).encode()).hexdigest()
                    return probe

            def on_event(note):
                nonlocal child_seen
                if name == "descendant" and note["method"] == "item/agentMessage/delta":
                    child = int(note["params"]["itemId"])
                    assert os.getpgid(child) == client.pid
                    child_seen = True
                    authority.set()
                if name == "late_terminal" and note["method"] == "item/completed":
                    authority.set()
                if name == "stalled_callback":
                    time.sleep(.5)

            factory_used = False

            def factory(**_kwargs):
                nonlocal factory_used
                if factory_used:
                    raise BoundaryError("factory_reuse_denied")
                factory_used = True
                return SessionClient()

            if args.boundary_only:
                bridge = factory()
                bridge.initialize()
                bridge.request("thread/start", {"cwd": str(cwd)})
                if name == "policy_drift":
                    bridge.request("thread/start", {"cwd": str(cwd), "sandbox": "danger-full-access"})
                bridge.request("turn/start", {"threadId": client.thread_id, "input": [{"type": "text", "text": text}]})
                final = None
                while True:
                    note = bridge.take_notification(timeout=.01)
                    if note:
                        on_event(note)
                        if note["method"] == "item/completed":
                            final = note["params"]["item"]["text"]
                        if note["method"] == "turn/completed":
                            break
                assert final == "SYNTHETIC OK"
            else:
                session = CodexAppServerSession(cwd=str(cwd), client_factory=factory, on_event=on_event)
                if name == "policy_drift":
                    session.ensure_started()
                    client.request("thread/start", {"cwd": str(cwd), "sandbox": "danger-full-access"})
                result = session.run_turn(text, turn_timeout=20, notification_poll_timeout=.01)
            if name == "duplicate_consumption":
                client.request("turn/start", {"threadId": client.thread_id, "input": [{"type": "text", "text": text}]})
            client.finish()
            if not args.boundary_only:
                assert result.final_text == "SYNTHETIC OK" and not result.error and not result.interrupted
                assert result.tool_iterations == 0 and result.submitted_user_text == text
        except BoundaryError as exc:
            outcome = str(exc)
        finally:
            permitted_spawn = None
            if client:
                client.dispose()
            if session:
                session.close()
        if client:
            assert client.cleanup_confirmed and client.stop_seconds <= 5
            assert client.total <= 32768 and client.peak_queued <= 32768 and client.max_line <= 8192
            if name == "descendant":
                assert child_seen
        else:
            assert preflight
        assert outcome == EXPECTED[name], (name, outcome, EXPECTED[name])
        # The fixture must leave the empty repository exactly as created.
        assert sorted(p.relative_to(cwd).as_posix() for p in cwd.rglob("*") if p.is_file()) == [".git/HEAD"]
        assert (cwd / ".git/HEAD").read_text() == "ref: refs/heads/synthetic\n"
        if any(p.is_symlink() for p in case_root.rglob("*")) or case_root.resolve().parent != run_root:
            raise RuntimeError("cleanup_path_invalid")
        shutil.rmtree(case_root)
        row = {"case": name, "outcome": outcome, "seconds": round(time.monotonic() - begin, 3),
               "capturedBytes": client.total if client else 0, "peakQueuedBytes": client.peak_queued if client else 0,
               "maxLineBytes": client.max_line if client else 0, "stopSeconds": round(client.stop_seconds, 4) if client else 0,
               "treeStopped": client.cleanup_confirmed if client else True, "repoRemoved": not case_root.exists(),
               "probeVerified": probe is not None, "spawned": client is not None}
        results.append(row)
        print(json.dumps(row), flush=True)
    if audit_denials or import_writes:
        raise RuntimeError("audit_denial_recorded")
    verdict = ("WORKER-TRANSPORT-SYNTHETIC-PASS" if args.boundary_only else
               "HERMES-TRANSPORT-SYNTHETIC-PARTIAL" if args.case else "HERMES-TRANSPORT-SYNTHETIC-READY")
    print(json.dumps({"verdict": verdict, "cases": len(results),
                      "importedModules": imported, "auditDenials": audit_denials, "importWrites": import_writes,
                      "environmentNames": sorted(os.environ), "executionSupported": False,
                      "pilotReady": False, "liveAdmissionAllowed": False}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        # Fixed diagnostic only: no provider traceback, paths, environment values.
        print(json.dumps({"verdict": "HERMES-TRANSPORT-SYNTHETIC-BLOCKED", "errorType": type(exc).__name__,
                          "reason": str(exc) if str(exc).replace("_", "").isalnum() else "suite_assertion_failed"}), flush=True)
        sys.exit(1)
