"""Portable guard/privacy regressions. Installed-import evidence stays separate."""
import os
from pathlib import Path
import tempfile
import unittest

from hermes_clean_import_audit import Denied, ImportGuard, module_category


class ImportGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.guard = ImportGuard(self.root, (self.root,))

    def test_write_and_mutation_events_are_denied_before_work(self):
        target = str(self.root / "must-not-exist")
        for event in self.guard.MUTATIONS:
            with self.subTest(event=event), self.assertRaises(Denied):
                self.guard(event, (target,))
        for flags in (os.O_WRONLY, os.O_RDWR, os.O_CREAT, os.O_TRUNC, os.O_APPEND):
            with self.assertRaisesRegex(Denied, "filesystem_write"):
                self.guard("open", (target, "w", flags))
        self.assertFalse(Path(target).exists())

    def test_descriptors_are_not_misreported_as_filesystem_paths(self):
        with self.assertRaisesRegex(Denied, "descriptor_write_open"):
            self.guard("open", (1, "w", os.O_WRONLY))
        self.assertEqual(self.guard.summary()[0]["path"], "not-a-path")

    def test_network_process_and_environment_are_denied(self):
        for event in self.guard.PROCESSES | {"socket.__new__", "socket.connect", "socket.getaddrinfo", "os.putenv", "os.unsetenv"}:
            with self.subTest(event=event), self.assertRaises(Denied):
                self.guard(event, ("DO_NOT_RECORD",))
        self.assertNotIn("DO_NOT_RECORD", str(self.guard.summary()))

    def test_reads_and_enumeration_require_allowlisted_paths(self):
        target = self.root / "existing"
        target.write_bytes(b"synthetic")
        self.guard("open", (str(target), "r", os.O_RDONLY))
        self.guard("os.listdir", (str(self.root),))
        outside = self.root.parent / "never-open-this-sentinel"
        for event, values in (("open", (str(outside), "r", os.O_RDONLY)), ("os.scandir", (str(outside),))):
            with self.assertRaises(Denied):
                self.guard(event, values)
        self.assertTrue(all(row["path"] == "outside-synthetic" for row in self.guard.summary()))
        self.assertNotIn(str(self.root.parent), str(self.guard.summary()))

    def test_event_budget_and_synthetic_path_normalization(self):
        for i in range(48):
            with self.assertRaises(Denied):
                self.guard("os.mkdir", (str(self.root / str(i)),))
        with self.assertRaisesRegex(Denied, "audit_event_cap"):
            self.guard("os.mkdir", (str(self.root / "overflow"),))
        self.assertEqual(len(self.guard.summary()), 48)
        self.assertTrue(all(row["path"].startswith("synthetic/") for row in self.guard.summary()))
        self.assertEqual(self.guard.normalized_path(str(self.root / ".." / "outside")), "outside-synthetic")

    def test_clean_helpers_are_not_misclassified_as_complete_api(self):
        self.assertIsNone(module_category("agent.transports.codex_event_projector"))
        self.assertIsNone(module_category("agent.codex_runtime"))
        self.assertEqual(module_category("hermes_cli.config"), "configuration")
        self.assertEqual(module_category("hermes_cli.auth_codex"), "auth_definitions")
        self.assertEqual(module_category("providers"), "provider_definitions")
        self.assertEqual(module_category("hermes_cli.plugins_loader"), "plugin_code")


if __name__ == "__main__":
    unittest.main()
