"""Synthetic tests: no installed Hermes imports or runtime startup."""
from pathlib import Path
import os
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hermes_backend_identity_probe import Guard


class IdentityGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name).resolve() / "source"
        self.base = Path(self.temp.name).resolve() / "python"
        self.guard = Guard(self.source, self.base)

    def test_write_network_process_native_and_unknown_events_fail_closed(self):
        for event in ("socket.connect", "socket.gethostname", "subprocess.Popen", "ctypes.dlopen",
                      "ctypes.dlsym", "os.rename", "os.remove", "os.putenv", "future.unknown"):
            with self.subTest(event=event), self.assertRaisesRegex(RuntimeError, "identity_probe_denied"):
                self.guard(event, ("never-return-this-value",))
        for flag in (os.O_WRONLY, os.O_RDWR, os.O_CREAT, os.O_TRUNC, os.O_APPEND):
            with self.assertRaises(RuntimeError):
                self.guard("open", (str(self.source / "hermes_cli/__init__.py"), "w", flag))

    def test_reads_are_narrow_and_never_include_profiles_or_site_hooks(self):
        self.guard("open", (str(self.source / "hermes_cli/__init__.py"), "r", 0))
        self.guard("open", (str(self.source / "venv/Lib/site-packages/hermes_agent-0.21.2.dist-info/METADATA"), "r", 0))
        for name in ("auth.json", "hermes_cli/main.py", "venv/Lib/site-packages/startup.pth", "profile/config.yaml"):
            with self.subTest(name=name), self.assertRaises(RuntimeError):
                self.guard("open", (str(self.source / name), "r", 0))
        with self.assertRaises(RuntimeError):
            self.guard("open", (1, "r", 0))
        with self.assertRaises(RuntimeError):
            self.guard("os.listdir", (str(self.source.parent),))

    def test_only_package_source_may_execute(self):
        self.guard("import", ("hermes_cli", None))
        self.guard("compile", (b"pass", str(self.source / "hermes_cli/__init__.py")))
        for name in ("hermes_cli.main", "hermes_cli.config", "site", "ctypes", "providers"):
            with self.subTest(name=name), self.assertRaises(RuntimeError):
                self.guard("import", (name, None))
        with self.assertRaises(RuntimeError):
            self.guard("import", ("unrelated", str(self.source / "native.pyd")))
        with self.assertRaises(RuntimeError):
            self.guard("compile", (b"pass", str(self.source / "hermes_cli/main.py")))


if __name__ == "__main__":
    unittest.main()
