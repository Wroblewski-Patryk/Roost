"""Counterfactual installed command seams only, no Docker/firewall/DB effects."""
import copy
import importlib.util
import json
import subprocess
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path

spec = importlib.util.spec_from_file_location("ordinary_activity_fixture", Path(__file__).with_name("agent-host-release-activity-runtime.test.py"))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
m = base.m
guard_source = Path(__file__).parent.joinpath("lib/agent-host-release-compose-ingress-runtime.py").read_bytes()


def sample(op="read_runtime_settings"):
    v = base.sample(op)
    # This remains a historical restoration blob, intentionally unusable as a
    # current app/proxy namespace. The new independently sealed guard is used.
    v["runtimeSettings"]["ingress"].update({"chain": "INPUT", "originalRulesDigest": "8" * 64,
        "namespace": {"proxyContainerId": "e" * 64, "proxyImageDigest": "sha256:" + "e" * 64, "proxyNetworkDigest": "d" * 64}})
    policy = {"schemaVersion": "roost-compose-proxy-network-fence-policy-v1", "targetId": v["policy"]["targetId"],
        "networkId": "9" * 64, "subnet": "172.20.0.0/24", "proxyId": "f" * 64, "proxyPid": 4096,
        "namespaceDigest": m.digest(m.canonical({"proxyId": "f" * 64, "pid": 4096, "namespace": "net:[1234]"})),
        "databaseContainerId": next(r["containerId"] for r in v["policy"]["expectedRuntime"] if r["name"] == "db"),
        "databaseIpv4": "172.20.0.12", "proxyIpv4": "172.20.0.10", "ruleComment": "roost-release-hold-" + "a" * 32,
        "originalRulesDigest": m.digest(m.canonical(["-P OUTPUT ACCEPT"])), "controllerProgramDigest": m.digest(guard_source)}
    v["compatibleIngress"] = {"schemaVersion": "roost-activity-compatible-ingress-v1", "policy": policy,
                              "controllerProgramDigest": m.digest(guard_source)}
    return v


class Runner(base.FakeRunner):
    def __init__(self, request, present=True):
        super().__init__(request)
        self.present, self.proxy_pid, self.proxy_reads, self.restart_at = present, 4096, 0, None
        self.remove_timeout = False

    def rule(self):
        p = self.request["compatibleIngress"]["policy"]
        return ["-d", p["subnet"], "-p", "tcp", "--dport", "8000", "-m", "comment", "--comment", p["ruleComment"], "-j", "REJECT", "--reject-with", "tcp-reset"]

    def __call__(self, argv, payload=None):
        p = self.request["compatibleIngress"]["policy"]
        if argv[:2] == ["docker", "inspect"]:
            self.calls.append((argv, payload))
            identifier = argv[2]
            if identifier == p["proxyId"]:
                self.proxy_reads += 1
                if self.restart_at is not None and self.proxy_reads >= self.restart_at:
                    self.proxy_pid = 4097
                return json.dumps([{ "Id": identifier, "State": {"Running": True, "Pid": self.proxy_pid}}]).encode()
            r = next(r for r in self.request["policy"]["expectedRuntime"] if r["containerId"] == identifier)
            return json.dumps([{ "Id": identifier, "Config": {"Labels": {"com.docker.compose.project": p["targetId"], "com.docker.compose.service": r["name"]}},
                "HostConfig": {"PortBindings": {}}, "NetworkSettings": {"Ports": {}}}]).encode()
        if argv[:3] == ["sudo", "-n", "/usr/bin/readlink"]:
            self.calls.append((argv, payload)); return b"net:[1234]\n"
        if argv[:3] == ["docker", "network", "ls"]:
            self.calls.append((argv, payload)); return (p["networkId"] + "\n").encode()
        if argv[:3] == ["docker", "network", "inspect"]:
            self.calls.append((argv, payload))
            members = {p["proxyId"]: {"IPv4Address": p["proxyIpv4"] + "/24"}}
            for i, r in enumerate(self.request["policy"]["expectedRuntime"]):
                members[r["containerId"]] = {"IPv4Address": (p["databaseIpv4"] if r["name"] == "db" else "172.20.0." + str(20+i)) + "/24"}
            return json.dumps([{ "Id": p["networkId"], "IPAM": {"Config": [{"Subnet": p["subnet"]}]}, "Containers": members}]).encode()
        if argv[:3] == ["sudo", "-n", "/usr/bin/nsenter"]:
            self.calls.append((argv, payload))
            action = argv[9]
            if action == "-S":
                return ("-P OUTPUT ACCEPT\n" + ("-A OUTPUT " + " ".join(self.rule()) + "\n" if self.present else "")).encode()
            self.effects.append((argv, payload))
            if action == "-I":
                self.present = True
            elif action == "-D":
                self.present = False
                if self.remove_timeout:
                    raise subprocess.TimeoutExpired(argv, 12)
            else:
                raise AssertionError("unexpected guard mutation")
            return b""
        return super().__call__(argv, payload)


class CompatibleIngressTests(unittest.TestCase):
    def test_actual_source_transport_accepts_only_fixed_generated_proxy_commands(self):
        v = sample("hold_ingress"); runner = Runner(v, present=False); m.Controller(v, runner).execute()
        policy, rows = v["compatibleIngress"]["policy"], v["policy"]["expectedRuntime"]
        commands = [argv for argv, _ in runner.calls if argv[:2] == ["docker", "inspect"]
                    or argv[:2] == ["docker", "network"] or argv[:3] in (["sudo", "-n", "/usr/bin/readlink"], ["sudo", "-n", "/usr/bin/nsenter"])]
        with patch.object(m.subprocess, "run", return_value=SimpleNamespace(returncode=0, stdout=b"bounded")) as run:
            for argv in commands:
                self.assertEqual(m.bounded_compatible_process(argv, policy, rows), b"bounded")
            self.assertEqual(run.call_count, len(commands))
        prefix = ["sudo", "-n", "/usr/bin/nsenter", "-t", "4096", "-n", "/usr/sbin/iptables", "-w", "3"]
        invalid = [prefix + ["-F", "OUTPUT"], prefix + ["-S", "INPUT"],
                   ["sudo", "-n", "/usr/bin/readlink", "/proc/1/ns/net"], ["docker", "inspect", "0" * 64],
                   ["docker", "network", "inspect", "9" * 64, "9" * 64], ["bash", "-c", "arbitrary"]]
        with patch.object(m.subprocess, "run") as run:
            for argv in invalid:
                with self.assertRaises(m.Refusal): m.bounded_compatible_process(argv, policy, rows)
            run.assert_not_called()
            # Existing ordinary transport has no new OUTPUT permission.
            with self.assertRaises(m.Refusal): m.bounded_process(prefix + ["-S", "OUTPUT"])
            run.assert_not_called()

    def test_current_proxy_guard_does_not_use_dead_historical_app_namespace(self):
        v = sample(); before = copy.deepcopy(v["runtimeSettings"]); runner = Runner(v)
        result = m.Controller(v, runner).execute()
        self.assertTrue(result["ingressOwnedRulePresent"])
        self.assertEqual(v["runtimeSettings"], before)
        self.assertEqual(result["ingressSettingsDigest"], m.settings_digests(before)["ingressSettingsDigest"])
        self.assertFalse(result["compatibleIngress"]["historicalIngressRuleChecked"])
        self.assertTrue(result["compatibleIngress"]["originalIngressSettingsUnchanged"])
        self.assertEqual(runner.effects, [])
        self.assertTrue(all("INPUT" not in argv and "DOCKER-USER" not in argv for argv, _ in runner.calls))

    def test_hold_creates_only_owned_output_rule_in_current_proxy_namespace(self):
        v = sample("hold_ingress"); runner = Runner(v, present=False)
        result = m.Controller(v, runner).execute()
        self.assertTrue(result["ingressOwnedRulePresent"])
        mutations = [argv for argv, _ in runner.effects]
        self.assertEqual(len(mutations), 1)
        self.assertEqual(mutations[0][3:6], ["-t", "4096", "-n"])
        self.assertIn("OUTPUT", mutations[0]); self.assertIn(v["compatibleIngress"]["policy"]["ruleComment"], mutations[0])

    def test_proxy_restart_refuses_before_effect(self):
        v = sample("hold_ingress"); runner = Runner(v, present=False); runner.restart_at = 2
        with self.assertRaises(Exception): m.Controller(v, runner).execute()
        self.assertEqual(runner.effects, [])

    def test_removal_requires_fixture_absence_and_parity_and_database_fence(self):
        for field in ("fixtureAbsentByRoot", "parityVerifiedByRoot", "ingressBlockedByRoot"):
            v = sample("restore_runtime"); v["facts"][field] = False; runner = Runner(v)
            with self.assertRaises(m.Refusal): m.Controller(v, runner).execute()
            self.assertEqual(runner.effects, [])

    def test_remove_is_before_database_cadence_restore_and_exact_one_rule(self):
        v = sample("restore_runtime"); runner = Runner(v); before = copy.deepcopy(v["runtimeSettings"])
        result = m.Controller(v, runner).execute()
        self.assertFalse(result["ingressOwnedRulePresent"])
        self.assertFalse(result["compatibleIngress"]["receipt"]["rulePresent"])
        self.assertEqual(v["runtimeSettings"], before)
        delete_index = next(i for i, (argv, _) in enumerate(runner.effects) if "-D" in argv)
        sql_index = next(i for i, (_, payload) in enumerate(runner.effects) if payload and b"ALTER ROLE" in payload)
        self.assertLess(delete_index, sql_index)
        self.assertEqual(sum("-D" in argv for argv, _ in runner.effects), 1)

    def test_uncertain_removal_preserves_readonly_db_and_held_cadences_no_retry(self):
        v = sample("restore_runtime"); runner = Runner(v); runner.remove_timeout = True; controller = m.Controller(v, runner)
        with self.assertRaises(subprocess.TimeoutExpired): controller.execute()
        self.assertTrue(controller.effect)
        self.assertIn("default_transaction_read_only=on", runner.role)
        self.assertEqual(runner.states["maintenance_cadence"], "created")
        self.assertEqual(sum("-D" in argv for argv, _ in runner.effects), 1)

    def test_source_and_scope_cannot_select_different_code_proxy_or_db(self):
        for change in (lambda v: v["compatibleIngress"].update(controllerProgramDigest="0" * 64),
                       lambda v: v["compatibleIngress"]["policy"].update(databaseContainerId="0" * 64),
                       lambda v: v["compatibleIngress"].update(source="arbitrary code"),
                       lambda v: v["compatibleIngress"]["policy"].update(modulePath="arbitrary.py")):
            v = sample(); change(v)
            with self.assertRaises(Exception): m.validate_input(v)


if __name__ == "__main__":
    unittest.main()
