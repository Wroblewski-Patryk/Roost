"""Opt-in exact-pin config-loader probe; never a Hermes runtime entry point.

Run with the installed Python -I -S -B, synthetic homes and the native owned Job.
The audit hook observes reviewed Python code, not a general OS security sandbox.
Only fixed categories leave the process. No CLI, authentication or model imports.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import threading

PIN = "939e45c91d751fadd94dcd1b873ac3cb44846213"
VERSION = "roost-hermes-effective-config-v1"
PHASE = "import"
DENIED = None


def run():
    global PHASE
    args = json.loads(sys.stdin.read(8192))
    source = Path(args["sourceRoot"]).resolve()
    synthetic = Path(args["syntheticRoot"]).resolve()
    site = source / "venv" / "Lib" / "site-packages"
    config = synthetic / "profile" / "config.yaml"
    raw = config.read_bytes()
    expected = json.loads(raw)
    digest = hashlib.sha256(raw).hexdigest()
    if digest != args["configDigest"] or os.environ.get("HERMES_HOME") != str(config.parent):
        raise ValueError("probe_input_invalid")
    # -S excludes .pth/site startup; only explicitly attested source/dependencies.
    sys.path[:0] = [str(source), str(site)]
    read_roots = (source, Path(sys.base_prefix).resolve(), synthetic)
    counts = {"network": 0, "process": 0, "credential": 0, "outsideRead": 0, "outsideWrite": 0, "syntheticWrites": 0, "localMetadata": 0}

    def deny(category):
        global DENIED
        DENIED = category
        counts[category] += 1
        raise RuntimeError("probe_operation_denied")

    def location(value):
        if not isinstance(value, (str, bytes, os.PathLike)):
            deny("outsideRead")
        return Path(os.fsdecode(value)).absolute().resolve()

    def audit(event, values):
        # platform.system() calls platform.uname() -> socket.gethostname() on
        # this installed Windows Python. This is local metadata, not transport;
        # its value is neither captured nor returned.
        if event == "socket.gethostname":
            counts["localMetadata"] += 1
            return
        if event.startswith("socket."):
            deny("network")
        if event.startswith(("subprocess.", "os.exec", "os.spawn", "os.posix_spawn")) or event in {"os.system", "os.fork", "os.kill"}:
            deny("process")
        if event == "import" and str(values[0]).startswith(("hermes_cli.auth", "hermes_cli.env_loader", "hermes_cli.main", "hermes_cli.plugins", "agent.", "tools.", "gateway.", "run_agent", "cli")):
            deny("credential")
        if event == "open":
            target = location(values[0])
            if target.name.lower() in {"auth.json", ".env", ".op.env", "cookies", "credentials"}:
                deny("credential")
            writing = values[2] & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND)
            if writing:
                if not target.is_relative_to(synthetic):
                    deny("outsideWrite")
                counts["syntheticWrites"] += 1
            elif not any(target.is_relative_to(root) for root in read_roots):
                deny("outsideRead")
            elif not target.is_relative_to(synthetic) and target.suffix.lower() not in {".py", ".pyc", ".pyd", ".dll", ".zip"}:
                deny("outsideRead")
        if event in {"os.mkdir", "os.chmod", "os.remove", "os.rmdir", "os.rename", "os.link", "os.symlink", "os.truncate", "os.utime"}:
            for value in values[:2] if event in {"os.rename", "os.link", "os.symlink"} else values[:1]:
                if not location(value).is_relative_to(synthetic):
                    deny("outsideWrite")
            counts["syntheticWrites"] += 1

    sys.addaudithook(audit)
    from hermes_cli import __version__
    from hermes_cli.config import load_config, get_config_path
    PHASE = "load"
    effective = load_config()
    PHASE = "compare"
    checks = {"selectedProfile": get_config_path().resolve() == config.resolve(), "version": __version__ == "0.21.2"}

    def compare(required, actual, prefix=""):
        for key, value in required.items():
            label = prefix + key
            observed = actual.get(key) if isinstance(actual, dict) else None
            if isinstance(value, dict) and value:
                compare(value, observed, label + ".")
            else:
                checks[label] = type(value) is type(observed) and value == observed

    compare(expected, effective)
    checks["configUnchanged"] = config.read_bytes() == raw
    checks["noBackgroundThreads"] = threading.active_count() == 1
    # Loading merged data cannot prove the consumers' runtime behavior. Preserve
    # that gap even when every explicit override is observed exactly.
    return {"schemaVersion": VERSION, "hermesVersion": __version__, "hermesCommit": PIN,
            "configDigest": digest, "mechanism": "exact_pin_official_loader",
            "result": "blocked", "checks": checks, "audit": counts,
            "blockers": ["startup_consumers_unqualified", "credential_rotation_unqualified", "native_tool_surface_unqualified"]}


if __name__ == "__main__":
    try:
        result = run()
    except BaseException as error:
        # Never emit a traceback, path, exception text or upstream raw output.
        result = {"schemaVersion": VERSION, "result": "blocked", "reason": "probe_failed_closed", "phase": PHASE, "denied": DENIED,
                  "errorClass": type(error).__name__ if isinstance(error, (ImportError, RuntimeError, OSError, ValueError)) else "other"}
    print(json.dumps(result, separators=(",", ":"), sort_keys=True))
