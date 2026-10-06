"""Supporting fixed-controller tests. Every command uses a finite fake runner."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("activity_test_fixture", Path(__file__).with_name("agent-host-release-activity-runtime.test.py"))
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
m = fixture.m
source = (Path(__file__).parent / "lib/agent-host-release-compose-ingress-runtime.py").read_text()
m.TRUSTED_COMPATIBLE_INGRESS_SOURCE = source


def sample(operation="open_candidate_ingress"):
    r = fixture.sample(operation)
    r["runtimeSettings"]["internalHealth"] = {"frontendMetaName": "example-revision"}
    p = {"schemaVersion": "roost-compose-proxy-network-fence-policy-v1", "targetId": "example-release",
         "networkId": "9" * 64, "subnet": "172.20.0.0/24", "proxyId": "8" * 64, "proxyPid": 1234,
         "namespaceDigest": "7" * 64, "databaseContainerId": "3" * 64,
         "databaseIpv4": "172.20.0.2", "proxyIpv4": "172.20.0.6",
         "ruleComment": "roost-release-hold-" + "1" * 32, "originalRulesDigest": "0" * 64,
         "controllerProgramDigest": m.digest(source.encode())}
    r["compatibleIngress"] = {"schemaVersion": "roost-activity-compatible-ingress-v1", "policy": p,
                              "controllerProgramDigest": p["controllerProgramDigest"]}
    return r


class Runner(fixture.FakeRunner):
    def __init__(self, request):
        super().__init__(request)
        self.transactions = 0
        self.app_health = "healthy"

    def __call__(self, argv, payload=None):
        if argv[:2] == ["docker", "exec"] and "psql" in argv and "SELECT count(*) FROM pg_stat_activity" in payload.decode() and "json_build_object" not in payload.decode():
            self.calls.append((argv, payload))
            return str(self.transactions).encode()
        result = super().__call__(argv, payload)
        if argv[:3] == ["docker", "container", "inspect"]:
            row = json.loads(result)
            if row["service"] == "app":
                row["state"]["Health"]["Status"] = self.app_health
            return json.dumps(row).encode()
        return result


class Controller(m.Controller):
    # The actual public guard has its own source/namespace/command tests. This
    # finite boundary double records only the exact requested guard operation.
    def __init__(self, request, runner):
        super().__init__(request, runner)
        self.rule_present = request["operation"] != "hold_candidate_ingress"
        self.guard_effects = []
        self.fail_after_remove = False

    def compatible_ingress(self, operation="read"):
        if operation in {"remove", "apply"}:
            self.guard_effects.append(operation)
            self.rule_present = operation == "apply"
            if operation == "remove" and self.fail_after_remove:
                raise m.Refusal("release_activity_runtime_uncertain_fixed_guard")
        p = self.r["compatibleIngress"]["policy"]
        self.compatible_receipt = {**p, "rulePresent": self.rule_present}
        return {"receipt": self.compatible_receipt, "effects": int(operation != "read"),
                "removed": operation == "remove" and not self.rule_present}


class Tests(unittest.TestCase):
    def test_open_removes_only_guard_leaves_database_and_cadences(self):
        r = sample()
        runner = Runner(r)
        controller = Controller(r, runner)
        before_role, before_states = copy.deepcopy(runner.role), copy.deepcopy(runner.states)
        output = controller.execute()
        self.assertEqual(controller.guard_effects, ["remove"])
        self.assertFalse(output["ingressOwnedRulePresent"])
        self.assertTrue(output["databaseReadOnly"])
        self.assertTrue(output["cadencesHeld"])
        self.assertTrue(output["effect"])
        self.assertEqual(runner.role, before_role)
        self.assertEqual(runner.states, before_states)
        self.assertEqual(runner.effects, [])
        self.assertTrue(any(argv[-1] == m.HEALTH_PROGRAM for argv, _ in runner.calls))

    def test_open_requires_all_root_and_database_basis(self):
        changes = [lambda r, run: r["facts"].update(parityVerifiedByRoot=False),
                   lambda r, run: r["facts"].update(fixtureAbsentByRoot=False),
                   lambda r, run: r["facts"].update(ingressBlockedByRoot=False),
                   lambda r, run: setattr(run, "transactions", 1),
                   lambda r, run: setattr(run, "others", 1),
                   lambda r, run: setattr(run, "health_commit", "f" * 40),
                   lambda r, run: setattr(run, "app_health", "unhealthy"),
                   lambda r, run: run.states.update(maintenance_cadence="running")]
        for change in changes:
            r = sample()
            runner = Runner(r)
            change(r, runner)
            controller = Controller(r, runner)
            with self.assertRaises(m.Refusal):
                controller.execute()
            self.assertEqual(controller.guard_effects, [])
            self.assertEqual(runner.effects, [])

    def test_no_compatible_scope_or_expired_policy(self):
        for operation in ("open_candidate_ingress", "hold_candidate_ingress"):
            r = fixture.sample(operation)
            with self.assertRaisesRegex(m.Refusal, "candidate_compatible_only"):
                m.validate_input(r)
            r = sample(operation)
            r["policy"]["expiresAt"] = r["policy"]["createdAt"]
            with self.assertRaises(m.Refusal):
                m.validate_input(r)

    def test_lost_removal_reply_is_an_effect_uncertainty_not_a_repeat(self):
        r = sample()
        controller = Controller(r, Runner(r))
        controller.fail_after_remove = True
        with self.assertRaisesRegex(m.Refusal, "uncertain"):
            controller.execute()
        self.assertEqual(controller.guard_effects, ["remove"])
        self.assertTrue(controller.effect)
        self.assertFalse(controller.rule_present)

    def test_failure_hold_accepts_only_app_health_change_and_leaves_other_state(self):
        r = sample("hold_candidate_ingress")
        runner = Runner(r)
        runner.app_health = "unhealthy"
        controller = Controller(r, runner)
        role, states = copy.deepcopy(runner.role), copy.deepcopy(runner.states)
        output = controller.execute()
        self.assertEqual(controller.guard_effects, ["apply"])
        self.assertTrue(output["ingressOwnedRulePresent"])
        self.assertTrue(output["databaseReadOnly"])
        self.assertEqual(role, runner.role)
        self.assertEqual(states, runner.states)
        self.assertEqual(runner.effects, [])

    def test_failure_hold_never_repeats_or_accepts_changed_source(self):
        for change in (lambda c, run: setattr(c, "rule_present", True),
                       lambda c, run: setattr(run, "image_override", "sha256:" + "f" * 64),
                       lambda c, run: setattr(run, "transactions", 1),
                       lambda c, run: run.states.update(proactive_cadence="running")):
            r = sample("hold_candidate_ingress")
            runner = Runner(r)
            controller = Controller(r, runner)
            change(controller, runner)
            with self.assertRaises(m.Refusal):
                controller.execute()
            self.assertEqual(controller.guard_effects, [])


if __name__ == "__main__":
    unittest.main()
