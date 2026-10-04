"""Trusted fixed synthetic recent-activity fixture controller.

The installed adapter must bind this strict data policy to its sealed release
manifest and current observed target. This controller never selects authority.

No model/provider calls, shell, app source writes, fence changes or cadence start.
Secrets enter stdin RAM only. This module is inert when imported by unit tests.
The host wrapper verifies existing containers, then executes the fixed DB program
inside the existing app image. A returned fact is not a fresh native Job receipt.
"""
import asyncio
import base64
import hashlib
import hmac
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from uuid import UUID

SCHEMA = "roost-activity-fixture-policy-v1"
OPS = {"smoke_prepare_empty", "smoke_populate", "fixture_cleanup", "reconcile"}
SERVICES = {"app": "app", "migrate": "migration", "db": "database",
            "maintenance_cadence": "cadence", "proactive_cadence": "cadence"}
MAX_INPUT = 32768
MAX_OUTPUT = 65536


class Refusal(Exception):
    pass


def require(condition, code):
    if not condition:
        raise Refusal("release_activity_fixture_" + code)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def uuid(value):
    require(isinstance(value, str) and re.fullmatch(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", value)
            and str(UUID(value)) == value, "uuid_required")
    return value


def hexhash(value):
    require(isinstance(value, str) and re.fullmatch("[0-9a-f]{64}", value), "hash_required")
    return value


def timestamp(value):
    require(isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z", value), "utc_time_required")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate_input(value, now=None):
    require(isinstance(value, dict) and set(value) == {"operation", "policy", "seedHex"}, "input_fields")
    require(value["operation"] in OPS, "operation_scope")
    p = value["policy"]
    keys = {"schemaVersion", "kind", "targetId", "applicationId", "coolifyApplicationId", "releaseId", "operationId",
            "fixtureId", "userId", "sessionId", "eventId", "traceId", "memoryId", "markerDigest", "summaryDigest", "createdAt", "expiresAt",
            "commit", "tree", "manifestDigest", "expectedRuntime", "baseline", "controllerProgramDigest", "frontendMetaName"}
    require(isinstance(p, dict) and set(p) == keys, "policy_fields")
    require(p["schemaVersion"] == SCHEMA and p["kind"] == "synthetic_recent_activity", "fixed_fixture_kind")
    require(isinstance(p["targetId"], str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", p["targetId"]), "installation_target_identity")
    uuid(p["applicationId"])
    require(isinstance(p["coolifyApplicationId"], str) and re.fullmatch(r"[1-9][0-9]{0,9}", p["coolifyApplicationId"]), "coolify_identity")
    ids = [uuid(p[k]) for k in ("releaseId", "operationId", "fixtureId", "userId", "sessionId", "eventId", "traceId")]
    require(len(set(ids)) == len(ids), "distinct_owned_ids")
    public = public_fixture(p)
    require(type(p["memoryId"]) is int and p["memoryId"] == public["memoryId"] and p["memoryId"] < 0,
            "explicit_negative_primary_key")
    require(p["markerDigest"] == public["markerDigest"] and p["summaryDigest"] == public["summaryHash"], "sealed_fixture_marker")
    for k in ("commit", "tree"):
        require(isinstance(p[k], str) and re.fullmatch("[0-9a-f]{40}", p[k]), "git_identity")
    hexhash(p["manifestDigest"])
    hexhash(p["controllerProgramDigest"])
    require(isinstance(p["frontendMetaName"], str) and re.fullmatch(r"[A-Za-z0-9._:-]{1,80}",p["frontendMetaName"]),"frontend_meta_scope")
    created, expires = timestamp(p["createdAt"]), timestamp(p["expiresAt"])
    require(0 < (expires - created).total_seconds() <= 7200, "fixture_window")
    now = now or datetime.now(timezone.utc)
    require(created.timestamp() <= now.timestamp() + 120, "fixture_window_not_started")
    if value["operation"] not in ("fixture_cleanup", "reconcile"):
        require(now < expires, "fixture_window_expired")
    require(isinstance(value["seedHex"], str) and re.fullmatch("[0-9a-f]{64}", value["seedHex"]), "ephemeral_seed_required")
    rows = p["expectedRuntime"]
    require(isinstance(rows, list) and len(rows) == 5, "complete_service_scope")
    require({r.get("name") for r in rows if isinstance(r, dict)} == set(SERVICES), "complete_service_scope")
    require(len({r.get("containerId") for r in rows}) == 5, "distinct_containers")
    for r in rows:
        require(set(r) == {"name", "role", "containerId", "imageDigest", "mountDigest"}, "service_fields")
        require(r["role"] == SERVICES[r["name"]], "service_role")
        hexhash(r["containerId"])
        require(isinstance(r["imageDigest"], str) and re.fullmatch("sha256:[0-9a-f]{64}", r["imageDigest"]), "immutable_image")
        hexhash(r["mountDigest"])
    b = p["baseline"]
    if b is None:
        require(value["operation"] == "reconcile", "baseline_seal_required")
    else:
        require(isinstance(b, dict) and set(b) == {"releaseSchemaDigest", "releaseDataDigest", "nonOwnedDigest", "sequenceDigest", "catalogDigest"}, "baseline_fields")
        for v in b.values():
            hexhash(v)
    return value


def public_fixture(p):
    summary = "Roost controlled activity fixture " + p["fixtureId"]
    marker = {"fixtureId": p["fixtureId"], "email": "roost-fixture-" + p["fixtureId"] + "@example.invalid",
              "displayName": "Roost controlled fixture " + p["fixtureId"], "ownership": "roost-activity-fixture-v1"}
    return {"memoryId": -(1 + UUID(p["fixtureId"]).int % 2000000000),
            "email": marker["email"], "displayName": marker["displayName"], "markerDigest": digest(canonical(marker)),
            "summary": summary, "summaryHash": digest(summary.encode()),
            "payload": {"roost_fixture": p["fixtureId"], "ownership": "roost-activity-fixture-v1"}}


def fixture_values(p, seed_hex):
    seed = bytes.fromhex(seed_hex)
    def secret(label):
        message = ("roost-activity-fixture-v1/" + label + "/" + p["fixtureId"] + "/" + p["sessionId"]).encode()
        return hmac.new(seed, message, hashlib.sha256).digest()
    token = "aion_sess_" + base64.urlsafe_b64encode(secret("session")).decode().rstrip("=")
    password = base64.urlsafe_b64encode(secret("password")).decode().rstrip("=")
    salt = secret("salt")[:16]
    password_hash = "pbkdf2_sha256$200000$" + salt.hex() + "$" + hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200000).hex()
    return {**public_fixture(p), "passwordHash": password_hash, "sessionTokenHash": digest(token.encode())}


def derive_session_token(p, seed_hex):
    """Same fixed HMAC the Windows caller derives in RAM from its WCM seed."""
    message = ("roost-activity-fixture-v1/session/" + p["fixtureId"] + "/" + p["sessionId"]).encode()
    return "aion_sess_" + base64.urlsafe_b64encode(hmac.new(bytes.fromhex(seed_hex), message, hashlib.sha256).digest()).decode().rstrip("=")


def owned_state(rows, p, f):
    require(isinstance(rows, dict) and set(rows) == {"users", "sessions", "memories", "foreignRefs"}, "owned_inventory")
    require(rows["foreignRefs"] == 0, "unrecognized_owned_delta")
    users, sessions, memories = rows["users"], rows["sessions"], rows["memories"]
    require(len(users) <= 1 and len(sessions) <= 1 and len(memories) <= 1, "owned_collision")
    if users:
        u = users[0]
        require(u["id"] == p["userId"] and u["email"] == f["email"] and u["display_name"] == f["displayName"]
                and u["password_hash"] == f["passwordHash"] and u["is_active"] == 1
                and u["created_at"] == p["createdAt"] and u["updated_at"] == p["createdAt"]
                and u["last_login_at"] == p["createdAt"], "user_ownership")
    if sessions:
        s = sessions[0]
        require(users and s["id"] == p["sessionId"] and s["user_id"] == p["userId"]
                and s["session_token_hash"] == f["sessionTokenHash"] and s["expires_at"] == p["expiresAt"]
                and s["created_at"] == p["createdAt"] and s["revoked_at"] is None
                and s["user_agent"] == "Roost controlled activity fixture v1" and s["ip_address"] is None,
                "session_ownership")
        require(s["last_seen_at"] is None or timestamp(p["createdAt"]) <= timestamp(s["last_seen_at"]) <= timestamp(p["expiresAt"]), "session_touch_scope")
    if memories:
        m = memories[0]
        require(users and sessions and m["id"] == f["memoryId"] and m["user_id"] == p["userId"]
                and m["event_id"] == p["eventId"] and m["trace_id"] == p["traceId"]
                and m["source"] == "api" and m["summary"] == f["summary"] and m["payload"] == f["payload"]
                and m["importance"] == 0.125 and m["event_timestamp"] == p["createdAt"] and m["created_at"] == p["createdAt"], "memory_ownership")
    require((not users and not sessions and not memories) or (users and sessions), "partial_fixture_uncertain")
    return "populated" if memories else "empty" if users else "absent"


def parity(actual, baseline):
    require(set(actual) == {"nonOwnedDigest", "sequenceDigest", "catalogDigest", "fullDataDigest"}, "fingerprint_shape")
    for k in ("nonOwnedDigest", "sequenceDigest", "catalogDigest"):
        require(actual[k] == baseline[k], "unowned_or_schema_or_sequence_delta")


async def transact(repo, request):
    """Repo implements one bounded native transaction; unit doubles are untrusted proof."""
    p, op = request["policy"], request["operation"]
    f = fixture_values(p, request["seedHex"])
    rows = await repo.owned(p, f)
    state = owned_state(rows, p, f)
    before = await repo.fingerprint(p, f)
    baseline = p["baseline"]
    if baseline is None:
        require(state == "absent", "baseline_probe_requires_no_fixture")
        return {"phase": "needs_baseline_seal", "state": state, "observed": before, "effect": False,
                "nativeJobQualified": False, "releaseSchemaVerified": False}
    parity(before, baseline)
    effect = False
    if op == "smoke_prepare_empty":
        require(state == "absent", "reconcile_before_repeat_prepare")
        await repo.prepare(p, f)
        state, effect = "empty", True
    elif op == "smoke_populate":
        require(state == "empty", "reconcile_before_repeat_populate")
        await repo.populate(p, f)
        state, effect = "populated", True
    elif op == "fixture_cleanup":
        if state != "absent":
            await repo.cleanup(p, f)
            state, effect = "absent", True
    after_state = owned_state(await repo.owned(p, f), p, f)
    require(after_state == state, "write_readback_unproven")
    after = await repo.fingerprint(p, f)
    parity(after, baseline)
    if state == "absent":
        require(after["fullDataDigest"] == baseline["releaseDataDigest"], "full_release_data_parity_unproven")
    return {"phase": "observed", "state": state, "effect": effect, "nonOwnedUnchanged": True,
            "sequenceUnchanged": True, "catalogUnchanged": True, "fullDataParity": state == "absent",
            "before": before, "after": after, "nativeJobQualified": False, "releaseSchemaVerified": False,
            "memoryId": f["memoryId"], "summaryDigest": f["summaryHash"], "markerDigest": f["markerDigest"]}


# This program runs only inside the exact existing app container. No auth route
# import: routes loads runtime integrations. Installed models/schema stay source
# of truth; SQLAlchemy driver/DB URL already belong to this immutable app image.
APP_PROGRAM = r'''
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.engine import make_url
from html.parser import HTMLParser
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *a, **kw):
        raise Refusal("release_activity_fixture_health_redirect")

class MetaParser(HTMLParser):
    def __init__(self, name):
        super().__init__();self.matches=[];self.inert=0;self.name=name
    def handle_starttag(self, tag, attrs):
        if tag in ("script","style","template","textarea","title"):self.inert+=1
        if tag=="meta" and not self.inert:
            names=[v for k,v in attrs if k=="name"]
            if self.name in names:
                require(len(attrs)==len(dict(attrs)),"duplicate_meta_attrs")
                self.matches.append(dict(attrs).get("content"))
    def handle_endtag(self, tag):
        if tag in ("script","style","template","textarea","title"):self.inert=max(0,self.inert-1)

def health(p):
    opener=build_opener(NoRedirect())
    def read(route, kind):
        with opener.open(Request("http://127.0.0.1:8000"+route,headers={"Accept":kind,"Accept-Encoding":"identity","Cache-Control":"no-store"}),timeout=5) as r:
            require(r.status==200 and not r.headers.get("Content-Encoding") and not r.headers.get("Location"),"health_transport")
            b=r.read(131073);require(len(b)<=131072,"health_body_bound");return b.decode("utf-8")
    v=json.loads(read("/health","application/json"))
    require(v.get("status")=="ok" and v.get("deployment",{}).get("runtime_build_revision")==p["commit"]
            and v.get("release_readiness",{}).get("ready") is True
            and v.get("reflection",{}).get("deployment_readiness",{}).get("ready") is True,"exact_backend_health")
    parser=MetaParser(p["frontendMetaName"]);parser.feed(read("/","text/html"))
    require(parser.matches==[p["commit"]],"exact_frontend_health")
    require(os.environ.get("APP_BUILD_REVISION")==p["commit"],"actual_app_environment_revision")

def ident(n):
    require(isinstance(n,str) and len(n)<=128,"catalog_identifier")
    return '"'+n.replace('"','""')+'"'

def iso(v):
    if isinstance(v,datetime):return v.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00","Z")
    return v

def normalize_row(row,p):
    result={k:iso(v) for k,v in row.items()}
    # PostgreSQL stores the same timestamp with normalized fractional zeros.
    for k in ("created_at","updated_at","last_login_at","event_timestamp"):
        if result.get(k) is not None and timestamp(result[k])==timestamp(p["createdAt"]):result[k]=p["createdAt"]
    if result.get("expires_at") is not None and timestamp(result["expires_at"])==timestamp(p["expiresAt"]):result["expires_at"]=p["expiresAt"]
    return result

class SqlRepo:
    def __init__(self,c,tables):self.c=c;self.tables=tables
    async def owned(self,p,f):
        result={}
        selections={"users":("aion_auth_user","id=:user OR email=:email"),
                    "sessions":("aion_auth_session","id=:session OR user_id=:user OR session_token_hash=:token"),
                    "memories":("aion_memory","id=:memory OR user_id=:user OR event_id=:event OR trace_id=:trace")}
        bindings={"user":p["userId"],"email":f["email"],"session":p["sessionId"],"token":f["sessionTokenHash"],"memory":f["memoryId"],"event":p["eventId"],"trace":p["traceId"]}
        for key,(table,where) in selections.items():
            rows=(await self.c.execute(text("SELECT * FROM public."+ident(table)+" WHERE "+where+" LIMIT 3"),bindings)).mappings().all()
            require(len(rows)<=1,"owned_collision");result[key]=[normalize_row(dict(r),p) for r in rows]
        foreign=0
        for schema,table in self.tables:
            if schema=="public" and table in ("aion_auth_user","aion_auth_session","aion_memory"):continue
            cols=(await self.c.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema=:s AND table_name=:t AND column_name IN ('user_id','event_id','trace_id')"),{"s":schema,"t":table})).scalars().all()
            checks={"user_id":"user","event_id":"event","trace_id":"trace"}
            if cols:
                clauses=[ident(col)+"::text=:"+checks[col] for col in cols]
                foreign+=int((await self.c.execute(text("SELECT count(*) FROM "+ident(schema)+"."+ident(table)+" WHERE "+" OR ".join(clauses)),bindings)).scalar_one())
                require(foreign==0,"unrecognized_owned_delta")
        result["foreignRefs"]=foreign;return result
    async def fingerprint(self,p,f):
        lines=[];full=[]
        exclusions={"aion_auth_user":("id",p["userId"]),"aion_auth_session":("id",p["sessionId"]),"aion_memory":("id",f["memoryId"])}
        for schema,table in self.tables:
            for owned,output in ((False,full),(True,lines)):
                where="";params={}
                if owned and schema=="public" and table in exclusions:
                    col,value=exclusions[table];where=" WHERE "+ident(col)+" <> :own";params={"own":value}
                stream=await self.c.stream(text("SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS row_hash FROM "+ident(schema)+"."+ident(table)+" t"+where+" ORDER BY row_hash"),params)
                count=0;hashed=hashlib.sha256()
                async for row in stream:
                    h=row[0];hexhash(h);hashed.update(h.encode());count+=1
                await stream.close()
                # PostgreSQL's historical JSONB text serializer and sorted lines
                # keep the existing release data fingerprint byte contract.
                line=(await self.c.execute(text("SELECT jsonb_build_object('schema',cast(:s as text),'table',cast(:t as text),'count',cast(:n as bigint),'digest',cast(:d as text))::text"),{"s":schema,"t":table,"n":count,"d":hashed.hexdigest()})).scalar_one()
                output.append(line)
        seqs=(await self.c.execute(text("SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' ORDER BY n.nspname,c.relname"))).all()
        require(len(seqs)<=10000,"sequence_catalog_bound")
        sequence=[]
        for s,t in seqs:
            line=(await self.c.execute(text("SELECT jsonb_build_object('schema',cast(:s as text),'sequence',cast(:t as text),'lastValue',last_value,'isCalled',is_called)::text FROM "+ident(s)+"."+ident(t)),{"s":s,"t":t})).scalar_one()
            sequence.append(line)
        def line_digest(v):return digest(("".join(x+"\n" for x in sorted(v))).encode())
        # Catalog supplementary digest is explicit; not mislabeled pg_dump SHA.
        catalog=(await self.c.execute(text("SELECT jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'constraints',(SELECT jsonb_agg(pg_get_constraintdef(o.oid) ORDER BY o.conname) FROM pg_constraint o WHERE o.conrelid=c.oid))::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','m','S') ORDER BY n.nspname,c.relname"))).scalars().all()
        return {"nonOwnedDigest":line_digest(lines+sequence),"sequenceDigest":line_digest(sequence),"catalogDigest":line_digest(catalog),"fullDataDigest":line_digest(full+sequence)}
    async def prepare(self,p,f):
        b={"u":p["userId"],"email":f["email"],"password":f["passwordHash"],"display":f["displayName"],"t":timestamp(p["createdAt"]),"s":p["sessionId"],"token":f["sessionTokenHash"],"expiry":timestamp(p["expiresAt"])}
        await self.c.execute(text("INSERT INTO public.aion_auth_user(id,email,password_hash,display_name,is_active,last_login_at,updated_at,created_at) VALUES (:u,:email,:password,:display,1,:t,:t,:t)"),b)
        await self.c.execute(text("INSERT INTO public.aion_auth_session(id,user_id,session_token_hash,expires_at,revoked_at,last_seen_at,user_agent,ip_address,created_at) VALUES (:s,:u,:token,:expiry,NULL,NULL,'Roost controlled activity fixture v1',NULL,:t)"),b)
    async def populate(self,p,f):
        await self.c.execute(text("INSERT INTO public.aion_memory(id,event_id,trace_id,source,user_id,event_timestamp,summary,payload,importance,created_at) VALUES (:m,:event,:trace,'api',:u,:t,:summary,cast(:payload AS json),0.125,:t)"),{"m":f["memoryId"],"event":p["eventId"],"trace":p["traceId"],"u":p["userId"],"t":timestamp(p["createdAt"]),"summary":f["summary"],"payload":json.dumps(f["payload"])})
    async def cleanup(self,p,f):
        b={"m":f["memoryId"],"u":p["userId"],"s":p["sessionId"],"event":p["eventId"],"trace":p["traceId"],"summary":f["summary"],"token":f["sessionTokenHash"],"email":f["email"],"password":f["passwordHash"]}
        await self.c.execute(text("DELETE FROM public.aion_memory WHERE id=:m AND user_id=:u AND event_id=:event AND trace_id=:trace AND summary=:summary"),b)
        session=await self.c.execute(text("DELETE FROM public.aion_auth_session WHERE id=:s AND user_id=:u AND session_token_hash=:token"),b)
        user=await self.c.execute(text("DELETE FROM public.aion_auth_user WHERE id=:u AND email=:email AND password_hash=:password"),b)
        require(session.rowcount==1 and user.rowcount==1,"exact_delete_counts")

async def app_run(request):
    p=request["policy"];health(p)
    url=os.environ.get("DATABASE_URL");require(isinstance(url,str),"installed_database_url_required")
    parsed=make_url(url)
    require(parsed.drivername=="postgresql+asyncpg" and parsed.username=="aion" and parsed.database=="aion","sole_database_scope")
    engine=create_async_engine(url,echo=False,pool_size=1,max_overflow=0,pool_pre_ping=False,
        connect_args={"timeout":5,"command_timeout":30,"server_settings":{"application_name":"rf-activity-"+p["operationId"],"statement_timeout":"25000","lock_timeout":"5000","work_mem":"4MB","temp_file_limit":"512MB","max_parallel_workers_per_gather":"0","jit":"off"}})
    try:
        async with engine.connect() as c:
            c=await c.execution_options(isolation_level="SERIALIZABLE")
            async with c.begin():
                if request["operation"]=="reconcile":await c.execute(text("SET TRANSACTION READ ONLY"))
                # The DB endpoint must be the actual sealed Docker DB network IP.
                actual=(await c.execute(text("SELECT current_database(),current_user,host(inet_server_addr()),inet_server_port()"))).one()
                require(actual[0]=="aion" and actual[1]=="aion" and actual[2] in request["observedDbIps"] and actual[3]==5432,"actual_database_identity")
                tables=(await c.execute(text("SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','m') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' ORDER BY n.nspname,c.relname"))).all()
                require(3<=len(tables)<=1000 and all(("public",t) in tables for t in ("aion_auth_user","aion_auth_session","aion_memory")),"installed_catalog_scope")
                triggers=(await c.execute(text("SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.aion_auth_user'::regclass,'public.aion_auth_session'::regclass,'public.aion_memory'::regclass)"))).scalar_one()
                require(triggers==0,"unqualified_fixture_triggers")
                if request["operation"]!="reconcile":
                    require((await c.execute(text("SHOW transaction_read_only"))).scalar_one()=="off","controlled_write_window_required")
                    for s,t in tables:
                        await c.execute(text("LOCK TABLE "+ident(s)+"."+ident(t)+" IN SHARE ROW EXCLUSIVE MODE"))
                result=await transact(SqlRepo(c,tables),request)
        health(p);return result
    finally:
        await engine.dispose()

def app_main():
    raw=sys.stdin.buffer.read(MAX_INPUT+1);require(len(raw)<=MAX_INPUT,"stdin_bound")
    request=json.loads(raw);ips=request.pop("observedDbIps",None)
    validate_input(request);require(isinstance(ips,list) and 1<=len(ips)<=8 and all(isinstance(v,str) and len(v)<=45 for v in ips),"observed_db_network")
    request["observedDbIps"]=ips
    result=asyncio.run(asyncio.wait_for(app_run(request),timeout=55))
    print(json.dumps(result,separators=(",",":")))
try:
    app_main()
except BaseException as error:
    # No traceback/exception body/DB URL/SQL parameters. Uncertain effects stay
    # pending in root's durable intent and must use reconcile, never blind retry.
    code=str(error) if isinstance(error,Refusal) else "release_activity_fixture_native_unproven"
    print(json.dumps({"error":code,"uncertain":True,"nativeJobQualified":False}));sys.exit(1)
'''


def app_program_from_source(source):
    """Pure renderer; source must come from the adapter's fixed sealed file URL.

    Installation/model policy never supplies this argument. The resulting bytes
    must still match policy.controllerProgramDigest before any Docker effect.
    """
    marker = "# This program runs" + " only inside the exact existing app container."
    require(isinstance(source, str) and 5000 <= len(source.encode()) <= 131072
            and source.count(marker) == 1, "trusted_controller_source_shape")
    prefix = source.split(marker, 1)[0]
    require(prefix.startswith('"""Trusted fixed synthetic recent-activity fixture controller.')
            and "async def transact(repo, request):" in prefix, "trusted_controller_prefix_shape")
    return prefix + "\n" + APP_PROGRAM


def app_program():
    # TRUSTED_SOURCE is injected only by the source-sealed adapter renderer for
    # python3 stdin execution. It is not an accepted input/policy field.
    source = globals().get("TRUSTED_SOURCE")
    if source is None:
        from pathlib import Path
        source = Path(__file__).read_text(encoding="utf-8")
    return app_program_from_source(source)


def bounded_process(argv, payload=None, timeout=10):
    require(isinstance(argv, list) and argv[0] == "docker", "fixed_docker_executable")
    try:
        r = subprocess.run(argv, input=payload, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                           timeout=timeout, check=False, shell=False)
    except BaseException:
        raise Refusal("release_activity_fixture_transport_unproven") from None
    require(len(r.stdout) <= MAX_OUTPUT and r.returncode == 0, "native_subprocess_unproven")
    return r.stdout


INSPECT = ('{"id":{{json .Id}},"image":{{json .Image}},'
           '"state":{"Status":{{json .State.Status}},"Running":{{json .State.Running}},'
           '"Paused":{{json .State.Paused}},"ExitCode":{{json .State.ExitCode}},'
           '"Health":{{with (index .State "Health")}}{"Status":{{json .Status}}}{{else}}null{{end}}},'
           '"project":{{json (index .Config.Labels "com.docker.compose.project")}},'
           '"service":{{json (index .Config.Labels "com.docker.compose.service")}},'
           '"application":{{json (index .Config.Labels "coolify.applicationId")}},'
           '"mounts":{{json .Mounts}},"networks":{{json .NetworkSettings.Networks}}}')


def runtime_scope(p, run=None):
    run = run or bounded_process  # Source-only injection for independent tests.
    ids = run(["docker", "container", "ls", "-a", "--no-trunc", "--filter",
               "label=com.docker.compose.project=" + p["targetId"], "--format", "{{.ID}}"]).decode().split()
    require(set(ids) == {s["containerId"] for s in p["expectedRuntime"]} and len(ids) == 5, "actual_complete_container_set")
    observations = []
    for expected in sorted(p["expectedRuntime"], key=lambda v: v["name"]):
        actual = json.loads(run(["docker", "container", "inspect", "--format", INSPECT, expected["containerId"]]))
        require(actual["id"] == expected["containerId"] and actual["image"] == expected["imageDigest"]
                and actual["project"] == p["targetId"] and actual["service"] == expected["name"]
                and actual["application"] == p["coolifyApplicationId"], "actual_container_identity")
        mounts = sorted([{k: m.get(k) for k in ("Type", "Name", "Source", "Destination", "Driver", "Mode", "RW", "Propagation")}
                         for m in actual["mounts"]], key=lambda m: m["Destination"])
        # Same ordered JSON projection used by the installed Compose inspector.
        md = digest(json.dumps(mounts, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode())
        require(md == expected["mountDigest"], "actual_mount_identity")
        state = actual["state"]
        health = (state.get("Health") or {}).get("Status")
        role = expected["role"]
        if role in ("app", "database"):
            require(state.get("Status") == "running" and state.get("Running") is True
                    and state.get("Paused") is False and health == "healthy", "actual_service_health")
        elif role == "migration":
            require(state.get("Status") == "exited" and state.get("ExitCode") == 0 and not state.get("Running")
                    and not state.get("Paused") and health is None, "actual_migration_closed")
        else:
            require(health is None and ((state.get("Status") in ("created", "exited") and state.get("ExitCode") == 0 and not state.get("Running"))
                    or (state.get("Status") == "paused" and state.get("Running") is True and state.get("Paused") is True)), "cadence_must_remain_held")
        observations.append({**expected, "status": state["Status"], "paused": state.get("Paused", False), "health": health})
        if role == "database":
            ips = sorted({n["IPAddress"] for n in actual["networks"].values() if n.get("IPAddress")})
            require(1 <= len(ips) <= 8, "actual_database_network")
    return {"digest": digest(canonical(observations)), "services": observations, "dbIps": ips}


def main():
    require(len(sys.argv) == 1, "no_argv_or_cli_selectors")
    raw = sys.stdin.buffer.read(MAX_INPUT + 1)
    require(len(raw) <= MAX_INPUT, "stdin_bound")
    request = validate_input(json.loads(raw))
    p = request["policy"]
    program = app_program()
    require(digest(program.encode()) == p["controllerProgramDigest"], "sealed_program_identity")
    before = runtime_scope(p)
    app = next(s for s in p["expectedRuntime"] if s["name"] == "app")
    inner = dict(request, observedDbIps=before["dbIps"])
    result = json.loads(bounded_process(["docker", "exec", "-i", app["containerId"], "python", "-B", "-c", program],
                                       canonical(inner), timeout=65))
    db = next(s for s in p["expectedRuntime"] if s["name"] == "db")
    # Independent server read proves disposal; no credential/token enters argv.
    session_query = "SELECT count(*) FROM pg_stat_activity WHERE application_name='rf-activity-" + p["operationId"] + "'"
    remaining = bounded_process(["docker", "exec", "-i", db["containerId"], "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
                                 "-U", "aion", "-d", "aion", "-c", session_query]).decode().strip()
    require(remaining == "0", "fixture_database_sessions_not_closed")
    after = runtime_scope(p)
    require(before == after, "runtime_drift_during_fixture")
    require(isinstance(result, dict) and result.get("nativeJobQualified") is False and "error" not in result, "actual_transaction_unproven")
    proof = {"schemaVersion": "roost-activity-fixture-observation-v1", "operation": request["operation"],
             "releaseId": p["releaseId"], "operationId": p["operationId"], "manifestDigest": p["manifestDigest"],
             "targetId": p["targetId"], "commit": p["commit"], "tree": p["tree"], "fixtureId": p["fixtureId"],
             "controllerProgramDigest": p["controllerProgramDigest"], "runtimeDigest": before["digest"],
             "observedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
             "expectedTreeBoundByParentObservation": True, "providerCalls": 0, "cadenceStarted": False,
             "fenceChanged": False, "nativeJobQualified": False, "observed": result}
    proof["ownedDatabaseSessionsClosed"] = True
    print(json.dumps(proof, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        code = str(error) if isinstance(error, Refusal) else "release_activity_fixture_native_unproven"
        print(json.dumps({"error": code, "uncertain": True, "nativeJobQualified": False}));sys.exit(1)
