"""Opt-in, read-only audit of public imports in one attested Hermes installation.

Run each case in a fresh non-root Linux Python -I -S -B process. This is an audit,
not an adapter, upstream patch, worker entry point, or production admission gate.
"""
import argparse
from collections import Counter
import importlib
import json
import os
from pathlib import Path
import signal
import sys

PIN = "939e45c91d751fadd94dcd1b873ac3cb44846213"
CASES = ("types", "projector", "registry", "responses", "runtime", "client", "client_init",
         "session", "session_init", "guard_write", "guard_network", "guard_process", "guard_read")
BASE_ENV = {"HOME", "PATH", "LANG", "LC_ALL", "PYTHONDONTWRITEBYTECODE", "TMPDIR",
            "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME"}
MODULES = {"types": "agent.transports.types", "projector": "agent.transports.codex_event_projector",
           "registry": "agent.transports", "responses": "agent.transports.codex", "runtime": "agent.codex_runtime",
           "client": "agent.transports.codex_app_server", "client_init": "agent.transports.codex_app_server",
           "session": "agent.transports.codex_app_server_session", "session_init": "agent.transports.codex_app_server_session"}


class Denied(RuntimeError):
    pass


def module_category(name):
    if name.startswith("hermes_cli.auth"):
        return "auth_definitions"
    if name.startswith(("providers", "plugins.model_providers", "hermes_cli.providers")):
        return "provider_definitions"
    if name.startswith(("plugins", "hermes_cli.plugin", "hermes_cli.relay_plugin")):
        return "plugin_code"
    if name.startswith("hermes_cli.config"):
        return "configuration"
    if name.startswith(("run_agent", "gateway", "model_tools")):
        return "agent_or_gateway"
    if name.startswith("tools.environments"):
        return "local_tool_environment"
    return None


class ImportGuard:
    """Python audit hook; a controlled-code probe, not an OS/native-code sandbox."""
    MUTATIONS = {"os.mkdir", "os.remove", "os.rmdir", "os.rename", "os.chmod", "os.chown",
                 "os.link", "os.symlink", "os.truncate", "os.utime", "os.setxattr", "os.removexattr"}
    PROCESSES = {"subprocess.Popen", "os.system", "os.fork", "os.forkpty", "os.exec", "os.posix_spawn",
                 "os.spawn", "pty.spawn", "os.kill", "os.killpg"}

    def __init__(self, synthetic, read_roots):
        self.synthetic = Path(synthetic)
        self.read_roots = tuple(Path(p) for p in read_roots)
        self.phase = "import"
        self.events = Counter()
        self.calls = Counter()

    def normalized_path(self, value):
        if isinstance(value, int) or not isinstance(value, (str, bytes, os.PathLike)):
            return "not-a-path"
        path = Path(os.path.abspath(os.fsdecode(value)))
        if path.is_relative_to(self.synthetic):
            relative = path.relative_to(self.synthetic).as_posix()
            # Only fixture-relative paths survive; never capture outside names.
            if len(relative) <= 200 and all(c.isalnum() or c in "/._-" for c in relative):
                return "synthetic/" + relative
        return "outside-synthetic"

    def reject(self, category, value=None):
        key = (self.phase, category, self.normalized_path(value))
        if key not in self.events and len(self.events) >= 48:
            raise Denied("audit_event_cap")
        self.events[key] += 1
        raise Denied(category)

    def readable(self, value):
        if isinstance(value, int):
            return False
        path = Path(os.path.abspath(os.fsdecode(value)))
        # Existing installation links are attested before the hook is installed.
        resolved = path.resolve()
        return any(resolved.is_relative_to(root) for root in self.read_roots)

    def __call__(self, event, values):
        if event in self.MUTATIONS:
            self.reject("filesystem_" + event.split(".")[-1], values[0])
        if event in self.PROCESSES:
            self.reject("process")
        if event in {"os.putenv", "os.unsetenv"}:
            self.reject("environment_mutation")
        if event.startswith("socket.") and event != "socket.gethostname":
            self.reject("network")
        if event == "open":
            flags = values[2]
            if flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND):
                if isinstance(values[0], int):
                    self.reject("descriptor_write_open")
                self.reject("filesystem_write", values[0])
            if not self.readable(values[0]):
                self.reject("read_outside_allowlist", values[0])
        if event in {"os.listdir", "os.scandir"} and not self.readable(values[0] or os.getcwd()):
            self.reject("enumeration_outside_allowlist", values[0])

    def profile(self, frame, event, _arg):
        if event != "call":
            return
        module = frame.f_globals.get("__name__", "")
        name = frame.f_code.co_name
        if module.startswith("hermes_cli.config") and name in {"load_config", "ensure_hermes_home", "_inject_profile_env_vars", "_inject_platform_plugin_env_vars"}:
            self.calls[(self.phase, "configuration_initialization")] += 1
        if module == "providers" and name in {"list_providers", "_discover_providers", "_import_plugin_dir"}:
            self.calls[(self.phase, "provider_discovery")] += 1
        if module.startswith("hermes_cli.plugin") and ("discover" in name or "load_plugin" in name):
            self.calls[(self.phase, "plugin_discovery")] += 1
        if module.startswith("hermes_cli.auth") and name in {"resolve_provider", "_load_auth_store", "_save_auth_store", "resolve_codex_runtime_credentials", "_read_codex_tokens", "_import_codex_cli_tokens"}:
            self.calls[(self.phase, "auth_resolution")] += 1

    def summary(self):
        return [{"phase": phase, "category": category, "path": path, "count": count}
                for (phase, category, path), count in sorted(self.events.items())]


def run(args):
    if os.name != "posix" or os.getuid() == 0 or not sys.flags.isolated or not sys.flags.no_site or not sys.dont_write_bytecode:
        raise ValueError("isolated_nonroot_python_required")
    root = args.synthetic.resolve(strict=True)
    if args.synthetic != root or any(p.is_symlink() for p in (root, *root.parents)):
        raise ValueError("synthetic_path_invalid")
    expected = BASE_ENV | ({"HERMES_HOME"} if args.explicit_home else set())
    if set(os.environ) != expected or os.environ["PATH"] != "/usr/bin:/bin":
        raise ValueError("environment_invalid")
    for key in expected - {"PATH", "LANG", "LC_ALL", "PYTHONDONTWRITEBYTECODE"}:
        path = Path(os.environ[key])
        if not path.resolve().is_relative_to(root) or path.is_symlink() or any(path.iterdir()):
            raise ValueError("synthetic_home_not_empty")
    if os.getcwd() != str(root):
        raise ValueError("synthetic_cwd_required")
    sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
    from hermes_install_attestation import verify
    installed = verify(args.installation, args.receipt_sha256)
    if installed["commit"] != PIN:
        raise ValueError("pin_drift")
    source = args.installation / "source"
    site = args.installation / "venv/lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages"
    guard = ImportGuard(root, (root, source, site, Path(__file__).resolve().parent,
                              Path("/usr/lib"), Path("/usr/local/lib")))
    before_modules = set(sys.modules)
    before_files = sorted(p.relative_to(root).as_posix() for p in root.rglob("*"))
    env_before = dict(os.environ)
    sys.path.extend([str(site), str(source)])
    signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(Denied("deadline")))
    signal.alarm(10)
    sys.addaudithook(guard)
    sys.setprofile(guard.profile)
    success = False
    error = None
    initialization = None
    contract = {}
    try:
        if args.case.startswith("guard_"):
            guard.phase = "control"
            if args.case == "guard_write":
                (root / "must-not-exist").write_text("synthetic")
            elif args.case == "guard_read":
                # Nonexistent sentinel outside every read root: no real user file.
                open("/audit-nonexistent-outside-sentinel", "rb")
            elif args.case == "guard_network":
                import socket
                socket.socket()  # Denied at socket creation, before connect/DNS.
            elif args.case == "guard_process":
                import subprocess
                subprocess.Popen([str(root / "never-execute")])
        else:
            module = importlib.import_module(MODULES[args.case])
            success = True
            guard.phase = "initialization"
            if args.case == "types":
                assert module.Usage().total_tokens == 0
                initialization = "pure_value"
            elif args.case == "projector":
                projected = module.CodexEventProjector().project({"method": "item/completed", "params": {
                    "item": {"type": "agentMessage", "id": "synthetic-item", "text": "synthetic"}}})
                assert projected.final_text == "synthetic" and not projected.is_tool_iteration
                initialization = "pure_projection"
            elif args.case == "client_init":
                module.CodexAppServerClient(codex_bin=str(root / "never-execute"), env=dict(os.environ),
                                           extra_args=["--synthetic-audit-only"])
            elif args.case == "session_init":
                class RecordingClient:
                    def initialize(self, **kwargs):
                        contract["initializeKeys"] = sorted(kwargs)
                        return {}

                    def request(self, method, params, timeout):
                        assert method == "thread/start" and params == {"cwd": str(root)}
                        contract["threadStartKeys"] = sorted(params)
                        return {"thread": {"id": "synthetic-thread"}}

                def factory(**kwargs):
                    contract["factoryKeys"] = sorted(kwargs)
                    return RecordingClient()

                session = module.CodexAppServerSession(cwd=str(root), codex_bin=str(root / "never-execute"),
                    permission_profile="read-only", approval_callback=lambda **_: "decline",
                    on_event=lambda _: None, client_factory=factory)
                assert session.ensure_started() == "synthetic-thread"
                initialization = "in_memory_factory_only"
    except BaseException as exc:
        error = str(exc) if isinstance(exc, Denied) else type(exc).__name__
    finally:
        sys.setprofile(None)
        signal.alarm(0)
    categories = Counter(filter(None, (module_category(name) for name in set(sys.modules) - before_modules)))
    unchanged = before_files == sorted(p.relative_to(root).as_posix() for p in root.rglob("*")) and env_before == dict(os.environ)
    clean = success and not error and not guard.events and not guard.calls and not categories and unchanged
    return {"case": args.case, "homeMode": "explicit" if args.explicit_home else "default", "importReturned": success,
            "initialization": initialization, "errorCategory": error, "cleanProbe": clean,
            "forbiddenModuleCategories": dict(sorted(categories.items())), "deniedOperations": guard.summary(),
            "observedCalls": [{"phase": p, "category": c, "count": n} for (p, c), n in sorted(guard.calls.items())],
            "syntheticUnchanged": unchanged, "contractKeys": contract, "executionSupported": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--installation", type=Path, required=True)
    parser.add_argument("--receipt-sha256", required=True)
    parser.add_argument("--synthetic", type=Path, required=True)
    parser.add_argument("--case", choices=CASES, required=True)
    parser.add_argument("--explicit-home", action="store_true")
    try:
        print(json.dumps(run(parser.parse_args()), separators=(",", ":")), flush=True)
    except BaseException as exc:
        print(json.dumps({"probeFailed": True, "errorCategory": type(exc).__name__}), flush=True)
        sys.exit(1)
