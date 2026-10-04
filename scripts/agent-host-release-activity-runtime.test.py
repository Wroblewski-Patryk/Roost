"""Offline controller guards and finite fake-runner effects, never native proof."""
import copy
import os
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from datetime import datetime, timedelta, timezone
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("runtime_controller", Path(__file__).parent / "lib/agent-host-release-activity-runtime.py")
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)
NOW = datetime.now(timezone.utc)


def stamp(t):
    return t.isoformat().replace("+00:00", "Z")


def sample(op="read_runtime_fence"):
    roles = list(m.ROLES.items())
    behavior = m.digest(m.canonical({"entrypoint": [], "command": ["python", "-m", "example.cadence"], "workingDirectory": "/app"}))
    rows = [{"name": name, "role": role, "containerId": str(i + 1) * 64,
             "imageDigest": "sha256:" + str(i + 1) * 64, "mountDigest": m.digest(m.canonical([]))}
            for i, (name, role) in enumerate(roles)]
    rules = [["-N", "DOCKER-USER"], ["-A", "DOCKER-USER", "-j", "RETURN"]]
    p = {"schemaVersion": m.POLICY_SCHEMA, "targetId": "example-release", "coolifyApplicationId": "10",
         "releaseId": "00000000-0000-4000-8000-000000000001", "operationId": "00000000-0000-4000-8000-000000000002",
         "fixtureId": "00000000-0000-4000-8000-000000000003", "commit": "a" * 40, "tree": "b" * 40,
         "manifestDigest": "c" * 64, "controllerProgramDigest": "d" * 64,
         "createdAt": stamp(NOW - timedelta(seconds=5)), "expiresAt": stamp(NOW + timedelta(minutes=30)), "expectedRuntime": rows}
    settings = {"schemaVersion": m.SETTINGS_SCHEMA, "targetId": p["targetId"],
                "database": {"containerId": rows[2]["containerId"], "adminUser": "example_admin", "adminDatabase": "postgres",
                             "applicationUser": "example_user", "applicationDatabase": "example_db", "originalRoleConfig": ["search_path=public"]},
                "ingress": {"chain": "DOCKER-USER", "port": 8000, "protocol": "tcp", "appContainerId": rows[0]["containerId"],
                            "networkId": "9" * 64, "originalOwnedRuleAbsent": True, "originalRulesDigest": m.digest(m.canonical(rules))},
                "cadences": [{"name": r["name"], "containerId": r["containerId"], "imageDigest": r["imageDigest"],
                              "mountDigest": r["mountDigest"], "originalState": "running", "originalExitCode": 0,
                              "behavior": "restore_existing_loop", "behaviorDigest": behavior} for r in rows if r["role"] == "cadence"]}
    facts = {"ingressBlockedByRoot": True, "fixtureAbsentByRoot": True, "parityVerifiedByRoot": True,
             "proofDigest": "e" * 64, "observedAt": stamp(NOW)}
    return {"operation": op, "policy": p, "runtimeSettings": settings, "facts": facts}


class FakeRunner:
    def __init__(self, request):
        self.calls, self.effects = [], []
        self.request = request
        self.rules = [["-N", "DOCKER-USER"], ["-A", "DOCKER-USER", "-j", "RETURN"]]
        self.states = {r["name"]: ("exited" if r["role"] == "migration" else "created" if r["role"] == "cadence" else "running")
                       for r in request["policy"]["expectedRuntime"]}
        self.paused = set()
        self.role = ["search_path=public", "default_transaction_read_only=on"]
        self.others, self.owned = 0, 1
        self.image_override, self.mount_override, self.application_override = None, None, None
        self.behavior_override, self.ip_override = None, None
        self.termination_result = b"closed"
        self.tick_rows = []
        self.health_commit = request["policy"]["commit"]
        self.expectations = {}

    def owned_rule(self):
        return m.Controller(self.request, self).rule("172.20.0.11")

    def __call__(self, argv, payload=None):
        self.calls.append((argv, payload))
        if argv[:3] == ["docker", "container", "ls"]:
            return ("\n".join(r["containerId"] for r in self.request["policy"]["expectedRuntime"]) + "\n").encode()
        if argv[:3] == ["docker", "container", "inspect"]:
            row = next(r for r in self.request["policy"]["expectedRuntime"] if r["containerId"] == argv[-1])
            status = self.states[row["name"]]
            a = {"id": row["containerId"], "image": self.image_override or row["imageDigest"], "project": "example-release",
                 "service": row["name"], "application": self.application_override or "10", "mounts": self.mount_override or [],
                 "state": {"Status": status, "Running": status == "running", "Paused": row["name"] in self.paused, "ExitCode": 0,
                           "Health": {"Status": "healthy"} if row["role"] in {"app", "database"} else None},
                 "entrypoint": [], "command": self.behavior_override or ["python", "-m", "example.cadence"], "workingDirectory": "/app",
                 "networks": {"example-network": {"NetworkID": "9" * 64, "IPAddress": self.ip_override or "172.20.0.11"}}}
            return json.dumps(a).encode()
        if argv[:3] == ["sudo", "-n", "/usr/sbin/iptables"]:
            if argv[5] == "-S":
                return ("\n".join(" ".join(r) for r in self.rules) + "\n").encode()
            self.effects.append((argv, payload))
            if argv[5] == "-I":
                self.rules.insert(1, ["-A", "DOCKER-USER"] + argv[8:])
            elif argv[5] == "-D":
                self.rules.remove(["-A", "DOCKER-USER"] + argv[7:])
            else:
                raise AssertionError("unpermitted iptables effect")
            return b""
        if argv[:2] == ["docker", "exec"] and "psql" in argv:
            sql = payload.decode()
            if "ALTER ROLE" in sql:
                self.effects.append((argv, payload))
                self.role = [v for v in self.role if not v.startswith("default_transaction_read_only=")]
                if " RESET default_transaction_read_only;" in sql:
                    pass
                elif "SET default_transaction_read_only=on;" in sql:
                    self.role.append("default_transaction_read_only=on")
                elif " SET default_transaction_read_only=off;" in sql:
                    self.role.append("default_transaction_read_only=off")
                self.owned = 0
                return self.termination_result
            if "json_agg" in sql:
                return json.dumps(self.tick_rows).encode()
            return json.dumps({"roleExists": True, "databaseExists": True, "adminSuperuser": True,
                               "roleConfig": self.role, "globalRoleConfig": [], "databaseConfig": [], "serverReadOnly": "off",
                               "activeOwned": self.owned, "activeOthers": self.others}).encode()
        if argv[:2] == ["docker", "exec"] and argv[-1] == m.HEALTH_PROGRAM:
            return json.dumps({"backendCommit": self.health_commit, "frontendCommit": self.health_commit,
                               "healthy": True, "observedAt": stamp(datetime.now(timezone.utc))}).encode()
        if argv[:2] == ["docker", "exec"] and argv[-1] == m.EXPECTATION_PROGRAM:
            return json.dumps(self.expectations[json.loads(payload)["kind"]]).encode()
        if argv[:2] in (["docker", "start"], ["docker", "unpause"]):
            self.effects.append((argv, payload))
            row = next(r for r in self.request["policy"]["expectedRuntime"] if r["containerId"] == argv[-1])
            self.states[row["name"]] = "running"
            self.paused.discard(row["name"])
            return (argv[-1] + "\n").encode()
        raise AssertionError("unexpected controller command")


class Tests(unittest.TestCase):
    def test_complete_readonly_fence_settings(self):
        r = sample()
        runner = FakeRunner(r)
        o = m.Controller(r, runner).execute()
        self.assertTrue(o["databaseReadOnly"])
        self.assertTrue(o["cadencesHeld"])
        self.assertEqual(runner.effects, [])
        self.assertFalse(o["nativeJobQualified"])
        self.assertNotIn("172.20.0.11", json.dumps(o))
        self.assertNotIn("search_path", json.dumps(o))

    def test_hold_open_refence_restore_exact_existing_containers(self):
        r = sample("hold_ingress")
        run = FakeRunner(r)
        self.assertTrue(m.Controller(r, run).execute()["ingressOwnedRulePresent"])
        r["operation"] = "open_fixture_window"
        self.assertFalse(m.Controller(r, run).execute()["databaseReadOnly"])
        r["operation"] = "refence_fixture_window"
        self.assertTrue(m.Controller(r, run).execute()["databaseReadOnly"])
        r["operation"] = "restore_runtime"
        out = m.Controller(r, run).execute()
        self.assertTrue(out["originalRoleConfigMatches"])
        self.assertFalse(out["ingressOwnedRulePresent"])
        self.assertTrue(all(c["state"] == "running" for c in out["cadences"]))
        starts = [a for a, _ in run.effects if a[:2] == ["docker", "start"]]
        self.assertEqual({a[-1] for a in starts}, {c["containerId"] for c in r["runtimeSettings"]["cadences"]})
        self.assertTrue(all(a[0] in {"docker", "sudo"} for a, _ in run.calls))
        self.assertFalse(any(any(v in a for v in ["pull", "run", "create", "rm", "-F", "-N"]) for a, _ in run.effects))

    def test_paused_cadences_unpause_not_recreate(self):
        r = sample("restore_runtime")
        run = FakeRunner(r)
        run.rules.insert(1, run.owned_rule())
        for name in ("maintenance_cadence", "proactive_cadence"):
            run.states[name] = "running"
            run.paused.add(name)
        m.Controller(r, run).execute()
        self.assertEqual(len([a for a, _ in run.effects if a[:2] == ["docker", "unpause"]]), 2)
        self.assertFalse(any(a[:2] == ["docker", "start"] for a, _ in run.effects))

    def test_ingress_collision_duplicate_and_wrong_destination_refuse_without_effect(self):
        for variant in ("duplicate", "wrong_destination", "foreign_change"):
            r = sample("hold_ingress")
            run = FakeRunner(r)
            if variant == "duplicate":
                run.rules.extend([run.owned_rule(), run.owned_rule()])
            elif variant == "wrong_destination":
                rule = run.owned_rule()
                rule[3] = "172.20.0.99/32"
                run.rules.append(rule)
            else:
                run.rules.append(["-A", "DOCKER-USER", "-j", "ACCEPT"])
            with self.subTest(variant=variant), self.assertRaises(m.Refusal):
                m.Controller(r, run).execute()
            self.assertEqual(run.effects, [])

    def test_duplicate_hold_does_not_insert_again(self):
        r = sample("hold_ingress")
        run = FakeRunner(r)
        run.rules.insert(1, run.owned_rule())
        with self.assertRaisesRegex(m.Refusal, "reconcile_before_ingress_repeat"):
            m.Controller(r, run).execute()
        self.assertEqual(run.effects, [])

    def test_open_requires_actual_root_fence_fact(self):
        r = sample("open_fixture_window")
        r["facts"]["ingressBlockedByRoot"] = False
        run = FakeRunner(r)
        run.rules.insert(1, run.owned_rule())
        with self.assertRaisesRegex(m.Refusal, "external_ingress_fence"):
            m.Controller(r, run).execute()
        self.assertEqual(run.effects, [])

    def test_foreign_sessions_refuse_before_catalog_or_firewall_effect(self):
        for op in ("hold_ingress", "open_fixture_window", "refence_fixture_window", "restore_runtime"):
            r = sample(op)
            run = FakeRunner(r)
            run.others = 1
            with self.subTest(op=op), self.assertRaisesRegex(m.Refusal, "other_sessions"):
                m.Controller(r, run).execute()
            self.assertEqual(run.effects, [])

    def test_termination_sql_is_exact_user_db_ips_and_null_foreign_sessions_count(self):
        r = sample("open_fixture_window")
        run = FakeRunner(r)
        run.rules.insert(1, run.owned_rule())
        m.Controller(r, run).execute()
        sqls = [p.decode() for a, p in run.calls if "psql" in a]
        effect = next(s for s in sqls if "ALTER ROLE" in s)
        self.assertIn('ALTER ROLE "example_user" IN DATABASE "example_db"', effect)
        self.assertIn("datname='example_db' AND usename='example_user' AND client_addr::text IN ('172.20.0.11')", effect)
        self.assertIn("pid<>pg_backend_pid()", effect)
        self.assertTrue(any("NOT COALESCE((" in s for s in sqls))
        self.assertNotIn("DROP", effect)
        self.assertNotIn("ALTER DATABASE", effect)

    def test_runtime_drift_image_mount_labels_behavior_network_refuses(self):
        for attr, value in [("image_override", "sha256:" + "f" * 64), ("mount_override", [{"Destination": "/unexpected"}]),
                            ("application_override", "11"), ("behavior_override", ["other"]), ("ip_override", "127.0.0.1")]:
            r = sample("hold_ingress")
            run = FakeRunner(r)
            setattr(run, attr, value)
            with self.subTest(attr=attr), self.assertRaises(m.Refusal):
                m.Controller(r, run).execute()
            self.assertEqual(run.effects, [])

    def test_running_unpaused_cadence_refuses_window(self):
        r = sample("open_fixture_window")
        run = FakeRunner(r)
        run.states["maintenance_cadence"] = "running"
        with self.assertRaisesRegex(m.Refusal, "cadence_not_held"):
            m.Controller(r, run).execute()
        self.assertEqual(run.effects, [])

    def test_original_other_guc_preserved(self):
        r = sample("restore_runtime")
        run = FakeRunner(r)
        run.role.insert(0, "statement_timeout=1000")
        with self.assertRaisesRegex(m.Refusal, "other_role_guc_changed"):
            m.Controller(r, run).execute()
        self.assertEqual(run.effects, [])

    def test_original_role_guc_on_off_absent_exact_restoration(self):
        for config in (["search_path=public"], ["search_path=public", "default_transaction_read_only=off"],
                       ["search_path=public", "default_transaction_read_only=on"]):
            r = sample("restore_runtime")
            r["runtimeSettings"]["database"]["originalRoleConfig"] = config
            run = FakeRunner(r)
            run.rules.insert(1, run.owned_rule())
            with self.subTest(config=config):
                out = m.Controller(r, run).execute()
                self.assertEqual(run.role, config)
                self.assertTrue(out["originalRoleConfigMatches"])

    def test_restore_requires_root_fixture_absence_and_parity(self):
        for key in ("fixtureAbsentByRoot", "parityVerifiedByRoot"):
            r = sample("restore_runtime")
            r["facts"][key] = False
            run = FakeRunner(r)
            run.rules.insert(1, run.owned_rule())
            with self.subTest(key=key), self.assertRaisesRegex(m.Refusal, "restore_basis"):
                m.Controller(r, run).execute()
            self.assertEqual(run.effects, [])

    def test_failed_session_termination_stops_before_unfence_or_cadence_start(self):
        r = sample("restore_runtime")
        run = FakeRunner(r)
        run.rules.insert(1, run.owned_rule())
        run.termination_result = b"unproven"
        with self.assertRaisesRegex(m.Refusal, "scoped_sessions_closed"):
            m.Controller(r, run).execute()
        self.assertTrue(run.effects)
        self.assertTrue(run.owned_rule() in run.rules)
        self.assertFalse(any(a[:2] in (["docker", "start"], ["docker", "unpause"]) for a, _ in run.effects))

    def test_existing_chain_must_exist(self):
        r = sample("hold_ingress")
        run = FakeRunner(r)
        run.rules = []
        with self.assertRaisesRegex(m.Refusal, "existing_chain"):
            m.Controller(r, run).execute()
        self.assertEqual(run.effects, [])

    def test_settings_ephemeral_id_normalization_only(self):
        s = sample()["runtimeSettings"]
        t = copy.deepcopy(s)
        t["database"]["containerId"] = "f" * 64
        t["ingress"]["appContainerId"] = "a" * 64
        for c in t["cadences"]:
            c["containerId"] = "c" * 64
            c["imageDigest"] = "sha256:" + "d" * 64
        self.assertEqual(m.settings_digests(s), m.settings_digests(t))
        for scope, key, value in [("database", "originalRoleConfig", ["default_transaction_read_only=off"]),
                                  ("ingress", "networkId", "e" * 64), ("ingress", "originalRulesDigest", "e" * 64)]:
            t = copy.deepcopy(s)
            t[scope][key] = value
            self.assertNotEqual(m.settings_digests(s), m.settings_digests(t))
        t = copy.deepcopy(s)
        t["cadences"][0]["behaviorDigest"] = "e" * 64
        self.assertNotEqual(m.settings_digests(s), m.settings_digests(t))

    def test_policy_guard_cases(self):
        cases = [lambda r: r.update(executable="sh"), lambda r: r.update(operation="deploy"),
                 lambda r: r["runtimeSettings"]["database"].update(applicationUser="u;DROP TABLE x"),
                 lambda r: r["runtimeSettings"]["ingress"].update(chain="INPUT"),
                 lambda r: r["runtimeSettings"]["ingress"].update(port=443),
                 lambda r: r["runtimeSettings"]["ingress"].update(originalOwnedRuleAbsent=False),
                 lambda r: r["facts"].update(observedAt=stamp(NOW - timedelta(seconds=61))),
                 lambda r: r["facts"].update(observedAt=stamp(NOW + timedelta(seconds=3))),
                 lambda r: r["facts"].update(ingressBlockedByRoot="true"),
                 lambda r: r["policy"].update(expectedRuntime=r["policy"]["expectedRuntime"][:4]),
                 lambda r: r["policy"]["expectedRuntime"][0].update(role="cadence"),
                 lambda r: r["runtimeSettings"]["database"].update(originalRoleConfig=["default_transaction_read_only=invalid"])]
        for i, mutate in enumerate(cases):
            r = sample()
            mutate(r)
            with self.subTest(case=i), self.assertRaises(m.Refusal):
                m.validate_input(r, now=NOW)

    def test_source_seal_and_expiry_guards(self):
        with self.assertRaisesRegex(m.Refusal, "source_seal"):
            m.validate_input(sample(), now=NOW, source_digest="f" * 64)
        r = sample("open_fixture_window")
        r["policy"]["expiresAt"] = stamp(NOW - timedelta(seconds=1))
        with self.assertRaisesRegex(m.Refusal, "expired"):
            m.validate_input(r, now=NOW)
        r["operation"] = "refence_fixture_window"
        m.validate_input(r, now=NOW)  # Recovery remains possible after fixture expiry.

    def test_tick_freshness_semantics_and_unknown_counters(self):
        r = sample("cadence_tick_read")
        r["runtimeSettings"]["cadenceEvidence"] = {"schema": "public", "table": "example_cadence_evidence", "expectedOwner": "external_scheduler", "expectedMode": "externalized"}
        r["observation"] = {"startedAt": stamp(NOW - timedelta(seconds=20)), "observationSeconds": 10}
        m.validate_input(r, now=NOW)
        rows = [{"kind": k, "owner": "external_scheduler", "mode": "externalized", "executed": k == "maintenance",
                 "reason": "external_scheduler_owner" if k == "maintenance" else "proactive_disabled",
                 "summaryDigest": "e" * 64, "lastRunAt": stamp(NOW - timedelta(seconds=5)), "updatedAt": stamp(NOW - timedelta(seconds=4)),
                 "providerRequests": None, "externalActions": 0, "failures": 0} for k in ("maintenance", "proactive")]
        p = m.qualify_ticks(rows, r, {"runtimeDigest": "c" * 64}, now=NOW)
        self.assertEqual([x["executionState"] for x in p["cadenceEvidence"]], ["executed", "skipped"])
        self.assertTrue(all(x["providerRequests"] is None and not x["providerRequestsVerified"] for x in p["cadenceEvidence"]))
        self.assertTrue(all(x["expectedExecutionState"] is None and not x["executionExpectationVerified"] for x in p["cadenceEvidence"]))
        for key, value in [("lastRunAt", stamp(NOW - timedelta(seconds=25))), ("lastRunAt", stamp(NOW + timedelta(seconds=1))),
                           ("owner", "other"), ("executed", "false"), ("providerRequests", -1)]:
            bad = copy.deepcopy(rows)
            bad[0][key] = value
            with self.subTest(key=key), self.assertRaises(m.Refusal):
                m.qualify_ticks(bad, r, {"runtimeDigest": "c" * 64}, now=NOW)

    def test_cookie_source_ast_only_no_provider_import(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            config = b"raise RuntimeError('never import config')\nclass Settings:\n    unused_secret: str = 'not-output'\n"
            routes = b"raise RuntimeError('never import routes')\nAUTH_SESSION_COOKIE_DEFAULT = 'example_session'\n"
            (folder / "settings.py").write_bytes(config)
            (folder / "routes.py").write_bytes(routes)
            data = {"settingsSourcePath": str(folder / "settings.py"), "routesSourcePath": str(folder / "routes.py"),
                    "settingsSourceDigest": m.digest(config), "routesSourceDigest": m.digest(routes)}
            p = subprocess.run([sys.executable, "-B", "-c", m.COOKIE_PROGRAM], input=m.canonical(data), stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, shell=False, timeout=5)
            self.assertEqual(p.returncode, 0)
            result = json.loads(p.stdout)
            self.assertEqual(result["cookieName"], "example_session")
            self.assertEqual(result["source"], "route_default")
            self.assertNotIn(b"not-output", p.stdout)
            data["settingsSourceDigest"] = "a" * 64
            p = subprocess.run([sys.executable, "-B", "-c", m.COOKIE_PROGRAM], input=m.canonical(data), stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, shell=False, timeout=5)
            self.assertNotEqual(p.returncode, 0)
            self.assertEqual(json.loads(p.stdout), {"error": "fixed_auth_cookie_read_unproven"})

    def test_cookie_targeted_environment_override_actual_declared_field(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            config = b"class Settings:\n    auth_session_cookie_name: str = 'example_default'\n"
            routes = b"AUTH_SESSION_COOKIE_DEFAULT = 'example_fallback'\n"
            (folder / "settings.py").write_bytes(config)
            (folder / "routes.py").write_bytes(routes)
            data = {"settingsSourcePath": str(folder / "settings.py"), "routesSourcePath": str(folder / "routes.py"),
                    "settingsSourceDigest": m.digest(config), "routesSourceDigest": m.digest(routes)}
            import os
            env = dict(os.environ, AUTH_SESSION_COOKIE_NAME="example_override")
            p = subprocess.run([sys.executable, "-B", "-c", m.COOKIE_PROGRAM], input=m.canonical(data), env=env,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, timeout=5)
            self.assertEqual(p.returncode, 0)
            self.assertEqual(json.loads(p.stdout)["cookieName"], "example_override")
            env["AUTH_SESSION_COOKIE_NAME"] = "invalid cookie; value"
            p = subprocess.run([sys.executable, "-B", "-c", m.COOKIE_PROGRAM], input=m.canonical(data), env=env,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, shell=False, timeout=5)
            self.assertNotEqual(p.returncode, 0)
            self.assertNotIn(b"invalid cookie", p.stdout)

    def test_tick_read_pending_is_truthful_readonly_poll_not_failure_or_success(self):
        r = sample("cadence_tick_read")
        r["runtimeSettings"]["cadenceEvidence"] = {"schema": "public", "table": "example_cadence_evidence", "expectedOwner": "external_scheduler", "expectedMode": "externalized"}
        r["observation"] = {"startedAt": stamp(NOW - timedelta(seconds=10)), "observationSeconds": 1}
        run = FakeRunner(r)
        run.states["maintenance_cadence"] = run.states["proactive_cadence"] = "running"
        p = m.Controller(r, run).execute()
        self.assertEqual(p["status"], "pending")
        self.assertEqual(p["cadenceEvidence"], [])
        self.assertEqual(run.effects, [])
        self.assertNotIn("completedTicks", json.dumps(p))
        self.assertEqual(p["startedAt"], r["observation"]["startedAt"])
        m.utc(p["observedAt"])

    def test_tick_sql_only_aggregates_hashes_finite_fields_no_raw_summary_or_logs(self):
        r = sample("cadence_tick_read")
        r["runtimeSettings"]["cadenceEvidence"] = {"schema": "public", "table": "example_cadence_evidence", "expectedOwner": "external_scheduler", "expectedMode": "externalized"}
        r["observation"] = {"startedAt": stamp(NOW - timedelta(seconds=10)), "observationSeconds": 1}
        run = FakeRunner(r)
        run.states["maintenance_cadence"] = run.states["proactive_cadence"] = "running"
        m.Controller(r, run).execute()
        sql = next(p.decode() for a, p in run.calls if "psql" in a)
        self.assertIn("LIMIT 3", sql)
        self.assertIn("summary_json::jsonb->'executed'", sql)
        self.assertIn("encode(sha256", sql)
        self.assertNotIn("'summary',", sql)
        self.assertFalse(any("logs" in a for a, _ in run.calls))

    def test_fixed_privileged_transport_and_output_bounds(self):
        with patch.object(m.subprocess, "run") as run:
            run.return_value = type("Result", (), {"returncode": 0, "stdout": b"ok"})()
            m.bounded_process(["sudo", "-n", "/usr/sbin/iptables", "-w", "3", "-S", "DOCKER-USER"])
            self.assertFalse(run.call_args.kwargs["shell"])
            self.assertEqual(run.call_args.kwargs["stderr"], subprocess.DEVNULL)
            run.return_value = type("Result", (), {"returncode": 0, "stdout": b"x" * (m.MAX_OUTPUT + 1)})()
            with self.assertRaisesRegex(m.Refusal, "native_process"):
                m.bounded_process(["docker", "container", "ls"])
        for argv in (["sh", "-c", "anything"], ["iptables", "-F"], ["sudo", "-n", "/bin/sh"]):
            with self.assertRaisesRegex(m.Refusal, "fixed_executable"):
                m.bounded_process(argv)

    def health_namespace(self):
        namespace = {"__name__": "fixed_health_unit_fixture"}
        exec(m.HEALTH_PROGRAM, namespace)
        return namespace

    def test_health_fixed_docker_transport_exact_version_and_no_other_effects(self):
        r = sample("read_health")
        r["runtimeSettings"]["internalHealth"] = {"frontendMetaName": "example-build-revision"}
        run = FakeRunner(r)
        run.states["maintenance_cadence"] = run.states["proactive_cadence"] = "running"
        output = m.Controller(r, run).execute()
        self.assertEqual(output["schemaVersion"], "roost-activity-internal-health-observation-v1")
        self.assertEqual(output["backendCommit"], r["policy"]["commit"])
        self.assertEqual(output["frontendCommit"], r["policy"]["commit"])
        self.assertTrue(output["healthy"])
        self.assertEqual(run.effects, [])
        health_call = next((a, p) for a, p in run.calls if a[-1] == m.HEALTH_PROGRAM)
        self.assertEqual(health_call[0][:7], ["docker", "exec", "-i", r["policy"]["expectedRuntime"][0]["containerId"], "python", "-B", "-c"])
        self.assertEqual(json.loads(health_call[1]), {"commit": r["policy"]["commit"], "frontendMetaName": "example-build-revision"})
        self.assertFalse(any("psql" in a or a[0] == "sudo" for a, _ in run.calls))
        self.assertNotIn("example-build-revision", json.dumps(output))
        run.health_commit = "f" * 40
        with self.assertRaisesRegex(m.Refusal, "exact_internal_health"):
            m.Controller(r, run).execute()

    def test_health_backend_exact_version_both_readiness_and_json_guards(self):
        ns = self.health_namespace()
        commit = "a" * 40
        body = {"status": "ok", "deployment": {"runtime_build_revision": commit},
                "release_readiness": {"ready": True}, "reflection": {"deployment_readiness": {"ready": True}}}
        self.assertEqual(ns["backend"](json.dumps(body), commit), commit)
        cases = [lambda b: b.update(status="failed"), lambda b: b["deployment"].update(runtime_build_revision="b" * 40),
                 lambda b: b["release_readiness"].update(ready=False), lambda b: b["release_readiness"].update(ready="true"),
                 lambda b: b["reflection"]["deployment_readiness"].update(ready=False), lambda b: b.pop("reflection")]
        for i, mutate in enumerate(cases):
            changed = copy.deepcopy(body)
            mutate(changed)
            with self.subTest(case=i), self.assertRaises(Exception):
                ns["backend"](json.dumps(changed), commit)
        for text in ('{"status":"ok","status":"ok"}', '{"status":"ok","extra":NaN}'):
            with self.assertRaises(Exception):
                ns["backend"](text, commit)

    def test_health_frontend_wrong_duplicate_encoded_and_inert_meta_refused(self):
        ns = self.health_namespace()
        name, commit = "example-build-revision", "a" * 40
        meta = '<meta name="' + name + '" content="' + commit + '">'
        self.assertEqual(ns["frontend"]("<html><head>" + meta + "</head></html>", name, commit), commit)
        self.assertEqual(ns["frontend"]("<META CONTENT='" + commit + "' NAME=" + name + " />", name, commit), commit)
        cases = [meta.replace(commit, "b" * 40), meta + meta, meta.replace(name, "other"),
                 meta.replace(commit, "&#97;" + commit[1:]), meta.replace(name, "example&#45;build-revision"),
                 meta.replace('name="', 'name="other" name="'), "<!--" + meta + "-->",
                 "<script>let s='" + meta + "';</script>", "<title>" + meta + "</title>",
                 "<template><template></template>" + meta + "</template>"]
        for i, text in enumerate(cases):
            with self.subTest(case=i), self.assertRaises(Exception):
                ns["frontend"](text, name, commit)

    def test_health_fixed_http_get_body_headers_and_scope_bounds(self):
        ns = self.health_namespace()
        class Response:
            status = 200
            headers = {"Content-Type": "application/json"}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def geturl(self): return "http://127.0.0.1:8000/health"
            def read(self, bound): return self.body[:bound]
        class Opener:
            def open(self, request, timeout):
                self.request, self.timeout = request, timeout
                return self.response
        opener = Opener()
        opener.response = Response()
        opener.response.body = b"{}"
        self.assertEqual(ns["read"](opener, "/health", "application/json"), "{}")
        self.assertEqual(opener.request.get_method(), "GET")
        self.assertEqual(opener.request.full_url, "http://127.0.0.1:8000/health")
        self.assertEqual(opener.timeout, 4)
        for headers in ({"Content-Type": "application/json", "Content-Encoding": "gzip"},
                        {"Content-Type": "application/json", "Location": "/elsewhere"},
                        {"Content-Type": "text/plain"}, {"Content-Type": "application/json", "Content-Length": "131073"}):
            opener.response.headers = headers
            with self.subTest(headers=headers), self.assertRaises(Exception):
                ns["read"](opener, "/health", "application/json")
        opener.response.headers = {"Content-Type": "application/json"}
        opener.response.body = b"x" * 131073
        with self.assertRaises(Exception): ns["read"](opener, "/health", "application/json")
        opener.response.body = b"\xff"
        with self.assertRaises(Exception): ns["read"](opener, "/health", "application/json")
        with self.assertRaises(Exception): ns["read"](opener, "/arbitrary", "application/json")
        with self.assertRaises(Exception): ns["NoRedirect"]().redirect_request(None, None, None, None, None, None)
        self.assertIn("ProxyHandler({})", m.HEALTH_PROGRAM)
        self.assertIn("signal.alarm(8)", m.HEALTH_PROGRAM)

    def test_health_installation_schema_has_no_url_program_or_packet_meta_selector(self):
        r = sample("read_health")
        with self.assertRaisesRegex(m.Refusal, "health_installation_required"):
            m.validate_input(r, now=NOW)
        for value in ({"frontendMetaName": "example-build-revision", "url": "http://other"},
                      {"frontendMetaName": "bad name"}, {"frontendMetaName": "x" * 81},
                      {"frontendMetaName": "example", "requireReleaseReadiness": False}):
            r["runtimeSettings"]["internalHealth"] = value
            with self.subTest(value=value), self.assertRaises(m.Refusal):
                m.validate_input(r, now=NOW)


SETTINGS_FIXTURE = '''
raise RuntimeError('application source must never execute')
class Settings(BaseSettings):
    proactive_enabled: bool = False
    scheduler_execution_mode: str = 'externalized'
    model_config = SettingsConfigDict(case_sensitive=False)
'''
SCHEDULER_FIXTURE = '''
raise RuntimeError('provider construction forbidden')
class SchedulerWorker:
    def __init__(self, proactive_enabled):
        self.proactive_enabled = bool(proactive_enabled)
    async def run_external_maintenance_tick_once(self):
        if self.execution_mode != 'externalized':
            summary = {'executed': False, 'reason': 'external_owner_not_selected'}
            await self._record_cadence_evidence(cadence_kind='maintenance', execution_owner='in_process_scheduler', summary=summary, now=now)
            return summary
        summary = {'executed': True, 'reason': 'external_scheduler_owner'}
        await self._record_cadence_evidence(cadence_kind='maintenance', execution_owner='external_scheduler', summary=summary, now=now)
        return summary
    async def run_external_proactive_tick_once(self):
        if self.execution_mode != 'externalized':
            summary = {'executed': False, 'reason': 'external_owner_not_selected'}
            await self._record_cadence_evidence(cadence_kind='proactive', execution_owner='in_process_scheduler', summary=summary, now=now)
            return summary
        if not self.proactive_enabled:
            summary = {'executed': False, 'reason': 'proactive_disabled'}
            await self._record_cadence_evidence(cadence_kind='proactive', execution_owner='external_scheduler', summary=summary, now=now)
            return summary
        return await self._run_observer_admitted_proactive_tick(dispatch_reason='external_scheduler_owner', execution_owner='external_scheduler', external_entrypoint=True)
    async def _run_observer_admitted_proactive_tick(self):
        summary = {'executed': True, 'reason': dispatch_reason}
        await self._record_cadence_evidence(cadence_kind='proactive', execution_owner=execution_owner, summary=summary, now=now)
        return summary
'''


def expectation_fixture(folder, settings=SETTINGS_FIXTURE, scheduler=SCHEDULER_FIXTURE, entry_overrides=None):
    sources = {}
    for i, (path, seal) in enumerate(m.CADENCE_SOURCES):
        kind = 'maintenance' if i == 2 else 'proactive'
        entry = ("raise RuntimeError('never run CLI')\nasync def _run():\n"
                 "    settings = get_settings()\n"
                 "    scheduler = SchedulerWorker(execution_mode='externalized', proactive_enabled=settings.proactive_enabled)\n"
                 "    await scheduler.run_external_" + kind + "_tick_once()\n")
        content = settings if i == 0 else scheduler if i == 1 else (entry_overrides or {}).get(kind, entry)
        file = folder / (str(i) + '.py')
        file.write_text(content, encoding='utf-8')
        sources[path] = str(file)
        sources[seal] = m.digest(file.read_bytes())
    return sources


class ExpectationTests(unittest.TestCase):
    def namespace(self):
        ns = {'__name__': 'fixture'}
        exec(m.EXPECTATION_PROGRAM, ns)
        return ns

    def test_source_qualified_disabled_and_enabled_without_imports(self):
        with tempfile.TemporaryDirectory() as directory:
            sources = expectation_fixture(Path(directory))
            ns = self.namespace()
            with patch.dict(os.environ, {}, clear=True):
                disabled = ns['prove']({'sources': sources, 'kind': 'proactive'})
                maintenance = ns['prove']({'sources': sources, 'kind': 'maintenance'})
            self.assertEqual(disabled['expectedExecutionState'], 'skipped')
            self.assertEqual(disabled['expectedReason'], 'proactive_disabled')
            self.assertTrue(disabled['sourceQualified'])
            self.assertEqual(maintenance['expectedExecutionState'], 'executed')
            with patch.dict(os.environ, {'PROACTIVE_ENABLED': 'true', 'SCHEDULER_EXECUTION_MODE': 'externalized'}, clear=True):
                enabled = ns['prove']({'sources': sources, 'kind': 'proactive'})
            self.assertEqual(enabled['expectedExecutionState'], 'executed')
            self.assertNotEqual(enabled['configurationDigest'], disabled['configurationDigest'])
            self.assertEqual(enabled['sourceDigest'], disabled['sourceDigest'])

    def test_ast_semantic_drift_rejected_even_resealed(self):
        variants = [SCHEDULER_FIXTURE.replace("'proactive_disabled'", "'unrelated_reason'"),
                    SCHEDULER_FIXTURE.replace('not self.proactive_enabled', 'self.proactive_enabled'),
                    SCHEDULER_FIXTURE.replace('bool(proactive_enabled)', 'True'),
                    SCHEDULER_FIXTURE.replace("execution_owner='external_scheduler'", "execution_owner='other'")]
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True):
            for scheduler in variants:
                with self.subTest(scheduler=scheduler[-40:]), self.assertRaises(ValueError):
                    self.namespace()['prove']({'sources': expectation_fixture(Path(directory), scheduler=scheduler), 'kind': 'proactive'})
            bad_settings = SETTINGS_FIXTURE + "    def settings_customise_sources(self):\n        pass\n"
            with self.assertRaises(ValueError):
                self.namespace()['prove']({'sources': expectation_fixture(Path(directory), settings=bad_settings), 'kind': 'proactive'})

    def test_source_hash_environment_and_entrypoint_guards(self):
        with tempfile.TemporaryDirectory() as directory:
            ns = self.namespace(); sources = expectation_fixture(Path(directory))
            bad = dict(sources);bad['schedulerSourceDigest'] = 'f' * 64
            with self.assertRaises(ValueError):ns['prove']({'sources': bad, 'kind': 'proactive'})
            for env in ({'PROACTIVE_ENABLED': 'maybe'}, {'SCHEDULER_EXECUTION_MODE': 'in_process'},
                        {'PROACTIVE_ENABLED': 'false', 'proactive_enabled': 'true'}):
                with self.subTest(env=env), patch.object(os, 'environ', env), self.assertRaises(ValueError):
                    ns['prove']({'sources': sources, 'kind': 'proactive'})
            entry = "async def _run():\n    settings=get_settings()\n    scheduler=SchedulerWorker(execution_mode='in_process',proactive_enabled=settings.proactive_enabled)\n    await scheduler.run_external_proactive_tick_once()\n"
            sources = expectation_fixture(Path(directory), entry_overrides={'proactive': entry})
            with self.assertRaises(ValueError):ns['prove']({'sources': sources, 'kind': 'proactive'})

    def request_rows(self):
        r = sample('cadence_tick_read')
        sources = {key: ('/app/' + str(i) + '.py' if key == path else 'f' * 64)
                   for i, (path, seal) in enumerate(m.CADENCE_SOURCES) for key in (path, seal)}
        r['runtimeSettings']['cadenceEvidence'] = {'schema':'public','table':'example_ticks','expectedOwner':'external_scheduler','expectedMode':'externalized','expectedSources':sources}
        r['observation'] = {'startedAt':stamp(NOW-timedelta(seconds=20)), 'observationSeconds':10}
        rows = [{'kind':kind,'owner':'external_scheduler','mode':'externalized','executed':kind=='maintenance',
                 'reason':'external_scheduler_owner' if kind=='maintenance' else 'proactive_disabled',
                 'summaryDigest':'e'*64,'lastRunAt':stamp(NOW-timedelta(seconds=5)),'updatedAt':stamp(NOW-timedelta(seconds=4)),
                 'providerRequests':None,'externalActions':0,'failures':0} for kind in ('maintenance','proactive')]
        source_digest = m.digest(m.canonical({seal:sources[seal] for _,seal in m.CADENCE_SOURCES}))
        expectations = {kind:{'kind':kind,'expectedExecutionState':'executed' if kind=='maintenance' else 'skipped',
                              'expectedReason':rows[i]['reason'],'sourceDigest':source_digest,'configurationDigest':'c'*64,'sourceQualified':True}
                        for i,kind in enumerate(('maintenance','proactive'))}
        return r, rows, expectations

    def test_exact_sources_schema_and_summary_match(self):
        r, rows, expectations = self.request_rows();m.validate_input(r,now=NOW)
        result = m.qualify_ticks(rows,r,{'runtimeDigest':'c'*64},now=NOW,expectations=expectations)
        self.assertTrue(all(c['executionExpectationVerified'] for c in result['cadenceEvidence']))
        for key,value in [('executed',True),('reason','external_scheduler_owner')]:
            bad=copy.deepcopy(rows);bad[1][key]=value
            with self.assertRaisesRegex(m.Refusal,'expectation_mismatch'):
                m.qualify_ticks(bad,r,{'runtimeDigest':'c'*64},now=NOW,expectations=expectations)
        with self.assertRaisesRegex(m.Refusal,'expectation_required'):m.qualify_ticks(rows,r,{'runtimeDigest':'c'*64},now=NOW)
        for key,value in [('settingsSourcePath','/etc/settings.py'),('schedulerSourceDigest','bad')]:
            bad=copy.deepcopy(r);bad['runtimeSettings']['cadenceEvidence']['expectedSources'][key]=value
            with self.assertRaises(m.Refusal):m.validate_input(bad,now=NOW)

    def test_fixed_transport_each_cadence_and_configuration_parity(self):
        r,rows,expectations=self.request_rows();runner=FakeRunner(r);runner.tick_rows=rows;runner.expectations=expectations
        for name in ('maintenance_cadence','proactive_cadence'):runner.states[name]='running'
        result=m.Controller(r,runner).execute()
        self.assertEqual(result['status'],'observed');self.assertEqual(runner.effects,[])
        calls=[a for a,_ in runner.calls if a[-1]==m.EXPECTATION_PROGRAM]
        self.assertEqual([a[3] for a in calls],[r['runtimeSettings']['cadences'][i]['containerId'] for i in (0,1)])
        runner.expectations['proactive']['configurationDigest']='a'*64
        with self.assertRaisesRegex(m.Refusal,'configuration_parity'):m.Controller(r,runner).execute()


if __name__ == "__main__":
    unittest.main()
