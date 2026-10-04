"""Synthetic unit support only; never native or deployed fixture proof."""
import asyncio
import copy
import importlib.util
import json
import io
import sys
from types import SimpleNamespace
from unittest.mock import patch
from pathlib import Path
import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

PATH = Path(__file__).parent / "lib" / "agent-host-release-activity-fixture.py"
spec = importlib.util.spec_from_file_location("fixture_controller", PATH)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def sample(op="reconcile", seal=True):
    now = datetime.now(timezone.utc).replace(microsecond=0)
    p = {"schemaVersion": m.SCHEMA, "kind": "synthetic_recent_activity", "targetId": "demo-compose-target", "applicationId": str(uuid4()),
         "coolifyApplicationId": "42", "commit": "a" * 40, "tree": "b" * 40,
         "manifestDigest": "c" * 64, "controllerProgramDigest": m.digest(m.app_program().encode()),
         "createdAt": now.isoformat().replace("+00:00", "Z"),
         "expiresAt": (now + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
         "expectedRuntime": [], "frontendMetaName":"fixture-revision"}
    for k in ("releaseId", "operationId", "fixtureId", "userId", "sessionId", "eventId", "traceId"):
        p[k] = str(uuid4())
    public = m.public_fixture(p)
    p.update(memoryId=public["memoryId"], markerDigest=public["markerDigest"], summaryDigest=public["summaryHash"])
    for i, (name, role) in enumerate(m.SERVICES.items()):
        p["expectedRuntime"].append({"name": name, "role": role, "containerId": str(i + 1) * 64,
            "imageDigest": "sha256:" + str(i + 1) * 64,
            "mountDigest": m.digest(json.dumps([], sort_keys=True, separators=(",", ":")).encode())})
    p["baseline"] = {k: m.digest(k.encode()) for k in ("releaseSchemaDigest", "releaseDataDigest", "nonOwnedDigest", "sequenceDigest", "catalogDigest")} if seal else None
    return {"operation": op, "policy": p, "seedHex": "d" * 64}


class FakeRepo:
    def __init__(self, p):
        self.rows = {"users": [], "sessions": [], "memories": [], "foreignRefs": 0}
        self.p = p
        self.calls = []
        self.unknown_delta = False
        self.sequence_changed = False
        self.change_on_prepare = False

    async def owned(self, p, f):
        return copy.deepcopy(self.rows)

    async def fingerprint(self, p, f):
        b = p["baseline"] or {k: m.digest(k.encode()) for k in ("releaseSchemaDigest", "releaseDataDigest", "nonOwnedDigest", "sequenceDigest", "catalogDigest")}
        return {"nonOwnedDigest": "e" * 64 if self.unknown_delta else b["nonOwnedDigest"],
                "sequenceDigest": "f" * 64 if self.sequence_changed else b["sequenceDigest"],
                "catalogDigest": b["catalogDigest"],
                "fullDataDigest": m.digest(m.canonical(self.rows)) if self.rows["users"] else b["releaseDataDigest"]}

    async def prepare(self, p, f):
        self.calls.append("prepare")
        self.rows["users"] = [{"id": p["userId"], "email": f["email"], "display_name": f["displayName"],
            "password_hash": f["passwordHash"], "is_active": 1, "created_at": p["createdAt"],
            "updated_at": p["createdAt"], "last_login_at": p["createdAt"]}]
        self.rows["sessions"] = [{"id": p["sessionId"], "user_id": p["userId"], "session_token_hash": f["sessionTokenHash"],
            "expires_at": p["expiresAt"], "created_at": p["createdAt"], "revoked_at": None,
            "user_agent": "Roost controlled activity fixture v1", "ip_address": None, "last_seen_at": None}]
        if self.change_on_prepare:
            self.unknown_delta = True

    async def populate(self, p, f):
        self.calls.append("populate")
        self.rows["memories"] = [{"id": f["memoryId"], "user_id": p["userId"], "event_id": p["eventId"], "trace_id": p["traceId"],
            "source": "api", "summary": f["summary"], "payload": f["payload"], "importance": 0.125,
            "event_timestamp": p["createdAt"], "created_at": p["createdAt"]}]

    async def cleanup(self, p, f):
        self.calls.append("cleanup")
        self.rows = {"users": [], "sessions": [], "memories": [], "foreignRefs": 0}

    def transaction(self, request):
        old = copy.deepcopy(self.rows)
        try:
            return asyncio.run(m.transact(self, m.validate_input(request)))
        except BaseException:
            self.rows = old  # Simulated transaction rollback, not a PostgreSQL claim.
            raise


class ControllerTests(unittest.TestCase):
    def test_real_supported_scope_no_import_side_effects(self):
        request = sample()
        self.assertEqual(m.validate_input(request), request)
        self.assertIn("from sqlalchemy.ext.asyncio import create_async_engine", m.app_program())
        compile(m.app_program(), "sealed-app-program", "exec")

    def test_pure_trusted_source_render_supports_stdin_without_file_selector(self):
        source = PATH.read_text(encoding="utf-8")
        program = m.app_program_from_source(source)
        self.assertEqual(program, m.app_program())
        with patch.object(m, "TRUSTED_SOURCE", source, create=True), patch.object(m, "__file__", "unavailable"):
            self.assertEqual(m.app_program(), program)
        marker = "# This program runs only inside the exact existing app container."
        for invalid in ("", source + "\n" + marker, source.replace(marker, "# removed")):
            with self.assertRaisesRegex(m.Refusal, "trusted_controller_source_shape"):
                m.app_program_from_source(invalid)

    def test_explicit_negative_primary_key_and_exact_hmac_cookie(self):
        r = sample()
        p = r["policy"]
        f = m.fixture_values(p, r["seedHex"])
        token = m.derive_session_token(p, r["seedHex"])
        self.assertRegex(token, r"^aion_sess_[A-Za-z0-9_-]{43}$")
        self.assertEqual(f["sessionTokenHash"], m.digest(token.encode()))
        self.assertEqual(f["memoryId"], p["memoryId"])
        self.assertTrue(-2000000000 <= f["memoryId"] <= -1)
        self.assertEqual(m.fixture_values(p, "e" * 64)["memoryId"], f["memoryId"])
        self.assertNotEqual(m.derive_session_token(p, "e" * 64), token)

    def test_actual_flow_empty_populated_cleanup_support_has_no_native_claim(self):
        r = sample("smoke_prepare_empty")
        db = FakeRepo(r["policy"])
        empty = db.transaction(r)
        self.assertEqual(empty["state"], "empty")
        self.assertFalse(empty["nativeJobQualified"])
        self.assertFalse(empty["fullDataParity"])
        # Actual authenticated GET may touch only this exact owned session.
        db.rows["sessions"][0]["last_seen_at"] = r["policy"]["createdAt"]
        r["operation"] = "smoke_populate"
        populated = db.transaction(r)
        self.assertEqual(populated["state"], "populated")
        self.assertEqual(len(db.rows["memories"]), 1)
        r["operation"] = "fixture_cleanup"
        clean = db.transaction(r)
        self.assertEqual(clean["state"], "absent")
        self.assertTrue(clean["fullDataParity"])
        self.assertEqual(db.calls, ["prepare", "populate", "cleanup"])

    def test_reconcile_is_readonly_and_never_repeats_prepare_or_populate(self):
        r = sample("smoke_prepare_empty")
        db = FakeRepo(r["policy"])
        db.transaction(r)
        with self.assertRaisesRegex(m.Refusal, "reconcile_before_repeat_prepare"):
            db.transaction(r)
        r["operation"] = "reconcile"
        self.assertEqual(db.transaction(r)["state"], "empty")
        self.assertEqual(db.calls, ["prepare"])
        r["operation"] = "smoke_populate"
        db.transaction(r)
        with self.assertRaisesRegex(m.Refusal, "reconcile_before_repeat_populate"):
            db.transaction(r)
        r["operation"] = "reconcile"
        self.assertEqual(db.transaction(r)["state"], "populated")
        self.assertEqual(db.calls, ["prepare", "populate"])

    def test_baseline_probe_is_truthfully_unsealed_and_readonly(self):
        r = sample(seal=False)
        db = FakeRepo(r["policy"])
        out = db.transaction(r)
        self.assertEqual(out["phase"], "needs_baseline_seal")
        self.assertFalse(out["effect"])
        self.assertFalse(out["releaseSchemaVerified"])
        r["operation"] = "smoke_prepare_empty"
        with self.assertRaisesRegex(m.Refusal, "baseline_seal_required"):
            db.transaction(r)
        self.assertEqual(db.calls, [])

    def test_owned_collision_unknown_delta_and_partial_state_refused_without_delete(self):
        for mutator in (
            lambda d: d.rows["users"][0].update(email="different@example.invalid"),
            lambda d: d.rows["sessions"].append(copy.deepcopy(d.rows["sessions"][0])),
            lambda d: d.rows.update(foreignRefs=1),
            lambda d: d.rows.update(sessions=[]),
            lambda d: d.rows["sessions"][0].update(revoked_at=d.p["createdAt"]),
        ):
            r = sample("smoke_prepare_empty")
            db = FakeRepo(r["policy"])
            db.transaction(r)
            mutator(db)
            r["operation"] = "fixture_cleanup"
            with self.assertRaises(m.Refusal):
                db.transaction(r)
            self.assertNotIn("cleanup", db.calls)

    def test_memory_exact_payload_and_summary_guard(self):
        for key, wrong in (("summary", "unowned"), ("trace_id", str(uuid4())), ("id", 1), ("payload", {}), ("importance", 0.5)):
            r = sample("smoke_prepare_empty")
            db = FakeRepo(r["policy"])
            db.transaction(r)
            r["operation"] = "smoke_populate"
            db.transaction(r)
            db.rows["memories"][0][key] = wrong
            r["operation"] = "fixture_cleanup"
            with self.assertRaisesRegex(m.Refusal, "memory_ownership"):
                db.transaction(r)
            self.assertNotIn("cleanup", db.calls)

    def test_unowned_and_sequence_changes_refuse_before_write(self):
        for field in ("unknown_delta", "sequence_changed"):
            r = sample("smoke_prepare_empty")
            db = FakeRepo(r["policy"])
            setattr(db, field, True)
            with self.assertRaisesRegex(m.Refusal, "unowned_or_schema_or_sequence_delta"):
                db.transaction(r)
            self.assertEqual(db.calls, [])

    def test_postwrite_unknown_delta_rolls_back_fixture_transaction(self):
        r = sample("smoke_prepare_empty")
        db = FakeRepo(r["policy"])
        db.change_on_prepare = True
        with self.assertRaisesRegex(m.Refusal, "unowned_or_schema_or_sequence_delta"):
            db.transaction(r)
        self.assertEqual(db.rows["users"], [])

    def test_final_full_release_data_parity_required(self):
        r = sample()
        db = FakeRepo(r["policy"])
        original = db.fingerprint
        async def wrong(p, f):
            out = await original(p, f)
            out["fullDataDigest"] = "0" * 64
            return out
        db.fingerprint = wrong
        with self.assertRaisesRegex(m.Refusal, "full_release_data_parity_unproven"):
            db.transaction(r)

    def test_result_contains_no_seed_password_token_or_business_rows(self):
        r = sample("smoke_prepare_empty")
        out = FakeRepo(r["policy"]).transaction(r)
        encoded = json.dumps(out)
        f = m.fixture_values(r["policy"], r["seedHex"])
        for private in (r["seedHex"], f["passwordHash"], f["sessionTokenHash"], m.derive_session_token(r["policy"], r["seedHex"]), f["email"]):
            self.assertNotIn(private, encoded)
        self.assertNotIn('"users"', encoded)

    def test_data_only_exact_policy_guards(self):
        mutations = [
            lambda r: r.update(script="arbitrary"),
            lambda r: r.update(operation="start_cadence"),
            lambda r: r["policy"].update(targetId="../other"),
            lambda r: r["policy"].update(applicationId="not-a-uuid"),
            lambda r: r["policy"].update(memoryId=1),
            lambda r: r["policy"].update(markerDigest="0" * 64),
            lambda r: r["policy"].update(summaryDigest="0" * 64),
            lambda r: r["policy"].update(userId=r["policy"]["fixtureId"]),
            lambda r: r["policy"].update(expectedRuntime=r["policy"]["expectedRuntime"][:-1]),
            lambda r: r["policy"]["expectedRuntime"][0].update(imageDigest="latest"),
            lambda r: r["policy"]["expectedRuntime"][0].update(role="database"),
            lambda r: r["policy"].update(baseline={}),
            lambda r: r.update(seedHex="short"),
            lambda r: r["policy"].update(expiresAt=r["policy"]["createdAt"]),
        ]
        for change in mutations:
            r = sample()
            change(r)
            with self.assertRaises(m.Refusal):
                m.validate_input(r)

    def test_runtime_real_allservice_identity_projection_support(self):
        p = sample()["policy"]
        self.assertEqual(len(m.runtime_scope(p, docker_double(p))["services"]), 5)
        for change in (
            lambda a: a.update(image="sha256:" + "0" * 64),
            lambda a: a.update(application="99"),
            lambda a: a.update(project="other"),
            lambda a: a.update(mounts=[{"Destination": "/unowned"}]),
            lambda a: a["state"].update(Health={"Status": "starting"}),
        ):
            with self.assertRaises(m.Refusal):
                m.runtime_scope(p, docker_double(p, app_change=change))

    def test_runtime_cadence_started_migrate_failed_missing_service_refused(self):
        p = sample()["policy"]
        for kind in ("cadence_started", "migrate_failed", "missing_service"):
            with self.assertRaises(m.Refusal):
                m.runtime_scope(p, docker_double(p, problem=kind))

    def test_fixed_inner_program_no_global_cleanup_or_sequence_reset_or_provider_routes(self):
        source = m.app_program()
        for forbidden in ("setval(", "nextval(", "TRUNCATE ", "DROP ", "DELETE FROM public.aion_profile", "/event", "/app/chat/message", "cleanup_runtime_data_preserving_auth", "shell=True"):
            self.assertNotIn(forbidden, source)
        self.assertIn("INSERT INTO public.aion_memory(id,event_id,trace_id", source)
        self.assertIn("SET TRANSACTION READ ONLY", source)
        self.assertIn("await engine.dispose()", source)
        self.assertNotIn(".Config.Env", m.INSPECT)
        self.assertNotIn(".State.Health.Log", m.INSPECT)

    def test_expired_session_can_be_reconciled_and_cleaned_but_not_written(self):
        r = sample("smoke_prepare_empty")
        p = r["policy"]
        now = m.timestamp(p["expiresAt"]) + timedelta(seconds=1)
        with self.assertRaisesRegex(m.Refusal, "fixture_window_expired"):
            m.validate_input(r, now=now)
        for op in ("fixture_cleanup", "reconcile"):
            r["operation"] = op
            self.assertEqual(m.validate_input(r, now=now), r)

    def test_fixed_host_composition_secrets_only_stdin_and_closed_session_readback(self):
        r = sample()
        db = FakeRepo(r["policy"])
        outcome = db.transaction(r)
        docker = docker_double(r["policy"])
        calls = []
        def fixed_run(argv, payload=None, timeout=10):
            calls.append((argv, payload))
            if argv[1:3] == ["exec", "-i"] and "python" in argv:
                actual = json.loads(payload)
                self.assertEqual(actual["seedHex"], r["seedHex"])
                self.assertEqual(actual["observedDbIps"], ["172.19.0.2"])
                self.assertEqual(argv[3], next(x["containerId"] for x in r["policy"]["expectedRuntime"] if x["name"] == "app"))
                return json.dumps(outcome).encode()
            if argv[1:3] == ["exec", "-i"] and "psql" in argv:
                self.assertIn("rf-activity-" + r["policy"]["operationId"], argv[-1])
                return b"0\n"
            return docker(argv, payload, timeout)
        output = io.StringIO()
        with patch.object(m, "bounded_process", fixed_run), patch.object(sys, "argv", ["trusted.py"]), \
             patch.object(sys, "stdin", SimpleNamespace(buffer=io.BytesIO(m.canonical(r)))), patch.object(sys, "stdout", output):
            m.main()
        proof = json.loads(output.getvalue())
        self.assertTrue(proof["ownedDatabaseSessionsClosed"])
        self.assertFalse(proof["nativeJobQualified"])
        self.assertEqual(proof["commit"], r["policy"]["commit"])
        self.assertNotIn(r["seedHex"], output.getvalue())
        for argv, payload in calls:
            self.assertNotIn(r["seedHex"], " ".join(argv))
            self.assertNotIn(m.derive_session_token(r["policy"], r["seedHex"]), " ".join(argv))
        self.assertEqual(sum("python" in argv for argv, _ in calls), 1)


def docker_double(p, app_change=None, problem=None):
    expected = {s["containerId"]: s for s in p["expectedRuntime"]}
    def run(argv, payload=None, timeout=10):
        if argv[1:3] == ["container", "ls"]:
            ids = list(expected)
            if problem == "missing_service":
                ids.pop()
            return ("\n".join(ids) + "\n").encode()
        e = expected[argv[-1]]
        state = {"Status": "running", "Running": True, "Paused": False, "ExitCode": 0, "Health": {"Status": "healthy"}}
        if e["role"] == "migration":
            state.update(Status="exited", Running=False, Health=None, ExitCode=1 if problem == "migrate_failed" else 0)
        if e["role"] == "cadence":
            state.update(Status="created", Running=False, Health=None)
            if problem == "cadence_started":
                state.update(Status="running", Running=True)
        actual = {"id": e["containerId"], "image": e["imageDigest"], "state": state, "project": p["targetId"],
                  "service": e["name"], "application": p["coolifyApplicationId"], "mounts": [],
                  "networks": {"own": {"IPAddress": "172.19.0.2"}}}
        if app_change and e["name"] == "app":
            app_change(actual)
        return json.dumps(actual).encode()
    return run


if __name__ == "__main__":
    unittest.main()
